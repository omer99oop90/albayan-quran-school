/**
 * ============================================================================
 * ALBAYAN AI — CHAT INTERFACE & INTERACTIVE CONTROLLER (albayan_ai.js)
 * ============================================================================
 */
(function () {
  'use strict';

  let conversations = [];
  let activeConvId = null;
  let activeAbortController = null;
  let isGenerating = false;
  let partialStreamedText = '';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatInlineMarkdown(txt) {
    let safe = escapeHtml(txt);
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    return safe
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function isMarkdownTableSeparator(line) {
    return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
  }

  function splitMarkdownTableRow(line) {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split('|').map(c => c.trim());
  }

  function renderSafeMarkdown(raw) {
    const src = String(raw || '').replace(/\r\n/g, '\n');
    const codeBlocks = [];
    const withPlaceholders = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, _lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
      return `\n@@CODE_BLOCK_${idx}@@\n`;
    });

    const lines = withPlaceholders.split('\n');
    const out = [];
    let listTag = null;

    const closeLists = () => {
      if (listTag) {
        out.push(`</${listTag}>`);
        listTag = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const cbMatch = line.match(/^@@CODE_BLOCK_(\d+)@@$/);
      if (cbMatch) {
        closeLists();
        out.push(codeBlocks[Number(cbMatch[1])] || '');
        continue;
      }
      if (!line) {
        closeLists();
        continue;
      }

      // Markdown table detection: header line with pipes followed by separator line
      if (line.includes('|') && i + 1 < lines.length && isMarkdownTableSeparator(lines[i + 1])) {
        closeLists();
        const headers = splitMarkdownTableRow(line);
        i += 2;
        const bodyRows = [];
        while (i < lines.length && lines[i].trim().includes('|') && !isMarkdownTableSeparator(lines[i])) {
          bodyRows.push(splitMarkdownTableRow(lines[i]));
          i++;
        }
        i--; // step back so outer loop increments accurately
        const ths = headers.map(h => `<th>${formatInlineMarkdown(h)}</th>`).join('');
        const trs = bodyRows.map(row => `<tr>${headers.map((_, idx) => `<td>${formatInlineMarkdown(row[idx] || '')}</td>`).join('')}</tr>`).join('');
        out.push(`<div class="ai-table-block"><div class="ai-table-scroll"><table class="ai-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div></div>`);
        continue;
      }

      if (line.startsWith('#### ')) {
        closeLists();
        out.push(`<h4>${formatInlineMarkdown(line.slice(5))}</h4>`);
      } else if (line.startsWith('### ')) {
        closeLists();
        out.push(`<h3>${formatInlineMarkdown(line.slice(4))}</h3>`);
      } else if (line.startsWith('## ')) {
        closeLists();
        out.push(`<h2>${formatInlineMarkdown(line.slice(3))}</h2>`);
      } else if (line.startsWith('> ')) {
        closeLists();
        out.push(`<blockquote>${formatInlineMarkdown(line.slice(2))}</blockquote>`);
      } else if (/^[-•*]\s+/.test(line)) {
        if (listTag !== 'ul') {
          closeLists();
          out.push('<ul>');
          listTag = 'ul';
        }
        out.push(`<li>${formatInlineMarkdown(line.replace(/^[-•*]\s+/, ''))}</li>`);
      } else if (/^\d+\.\s+/.test(line)) {
        if (listTag !== 'ol') {
          closeLists();
          out.push('<ol>');
          listTag = 'ol';
        }
        out.push(`<li>${formatInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`);
      } else {
        closeLists();
        out.push(`<p>${formatInlineMarkdown(line)}</p>`);
      }
    }
    closeLists();
    return out.join('');
  }

  function formatTimeShort(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function getActiveConversation() {
    return conversations.find(c => c.id === activeConvId) || null;
  }

  async function saveConversationsState() {
    if (window.AlbayanAI && window.AlbayanAI.Memory) {
      conversations = await window.AlbayanAI.Memory.saveAll(conversations);
    }
  }

  function scrollChatToBottom() {
    const scroller = document.getElementById('aiChatScroll');
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }

  async function updateStatusHeader() {
    const dot = document.getElementById('aiStatusDot');
    const txt = document.getElementById('aiStatusText');
    if (!window.AlbayanAI || !txt) return;

    const cfg = await window.AlbayanAI.Providers.loadConfig();
    const cat = window.AlbayanAI.CATALOG[cfg.provider] || window.AlbayanAI.CATALOG.builtin;
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (cfg.provider === 'builtin') {
      if (dot) dot.className = 'ai-status-dot local';
      txt.textContent = 'محرك محلي • بدون نموذج سحابي';
      return;
    }

    const keyStat = await window.AlbayanAI.Security.getApiKeyStatus(cfg.provider);
    const modelLabel = cfg.model || cat.defaultModel;

    if (cat.requiresKey && !keyStat.configured) {
      if (dot) dot.className = 'ai-status-dot offline';
      txt.textContent = `${cat.shortLabel} • بانتظار مفتاح API`;
      return;
    }

    if (cfg.provider === 'custom' && (!cfg.customEndpoint || !cfg.customEndpoint.trim())) {
      if (dot) dot.className = 'ai-status-dot error';
      txt.textContent = `${cat.shortLabel} • ينقص رابط API`;
      return;
    }

    if (!online) {
      if (dot) dot.className = 'ai-status-dot offline';
      txt.textContent = `غير متصل بالإنترنت • ${cat.shortLabel}`;
      return;
    }

    const conn = window.AlbayanAI.Providers.getConnectionState(cfg);
    if (conn.state === 'connected') {
      if (dot) dot.className = 'ai-status-dot';
      txt.textContent = `متصل • ${modelLabel}`;
    } else if (conn.state === 'auth_error') {
      if (dot) dot.className = 'ai-status-dot error';
      txt.textContent = `خطأ مصادقة • ${cat.shortLabel}`;
    } else if (conn.state === 'model_error') {
      if (dot) dot.className = 'ai-status-dot error';
      txt.textContent = `خطأ في النموذج • ${modelLabel}`;
    } else if (conn.state === 'rate_limit') {
      if (dot) dot.className = 'ai-status-dot error';
      txt.textContent = `تجاوز الحصة • ${cat.shortLabel}`;
    } else if (conn.state === 'network_error') {
      if (dot) dot.className = 'ai-status-dot error';
      txt.textContent = `تعذر الاتصال • ${cat.shortLabel}`;
    } else {
      if (dot) dot.className = 'ai-status-dot offline';
      txt.textContent = `غير مختبر • ${modelLabel}`;
    }
  }

  function renderTablesHtml(tables) {
    if (!Array.isArray(tables) || tables.length === 0) return '';
    return tables.map(tbl => {
      const headersHtml = (tbl.headers || []).map(h => `<th>${escapeHtml(h)}</th>`).join('');
      const rowsHtml = (tbl.rows || []).map(row => {
        return `<tr>${(Array.isArray(row) ? row : []).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
      }).join('');
      return `
        <div class="ai-table-block">
          ${tbl.title ? `<div class="ai-table-title">${escapeHtml(tbl.title)}</div>` : ''}
          <div class="ai-table-scroll">
            <table class="ai-table">
              <thead><tr>${headersHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderOperationCardsHtml(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return '';
    return cards.map(card => {
      const diffRows = (card.changes || []).map(ch => `
        <div class="ai-op-diff-row">
          <strong>${escapeHtml(ch.field)}:</strong>
          <span class="ai-op-diff-old">${escapeHtml(ch.before)}</span>
          <span aria-hidden="true">←</span>
          <span class="ai-op-diff-new">${escapeHtml(ch.after)}</span>
        </div>
      `).join('');
      const undoBtn = (card.reversible && card.auditId && !card.undone)
        ? `<button type="button" class="ai-btn-mini ai-undo-op-btn" data-audit-id="${escapeHtml(card.auditId)}">تراجع</button>`
        : (card.undone ? `<span style="font-size:11.5px; color:var(--ai-muted);">تم التراجع ✓</span>` : '');
      return `
        <div class="ai-op-card">
          <div class="ai-op-card-header">
            <div class="ai-op-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${escapeHtml(card.title || 'تم التنفيذ بنجاح')}</span>
            </div>
            ${undoBtn}
          </div>
          <div class="ai-op-entity">${escapeHtml(card.entity || '')} <small style="font-weight:500; color:var(--ai-muted);">(${card.synced ? 'محفوظ سحابياً ومحلياً' : 'محفوظ محلياً'})</small></div>
          ${diffRows}
        </div>
      `;
    }).join('');
  }

  function renderConfirmationsHtml(confirmations, msgIdx) {
    if (!Array.isArray(confirmations) || confirmations.length === 0) return '';
    return confirmations.map((conf, cIdx) => {
      if (conf.resolvedStatus === 'confirmed') {
        return `<div class="ai-op-card"><div class="ai-op-card-title">تم تأكيد العملية وتنفيذها: ${escapeHtml(conf.operationTitle)}</div></div>`;
      }
      if (conf.resolvedStatus === 'cancelled') {
        return `<div class="ai-confirm-card"><div class="ai-confirm-meta" style="margin:0;">تم إلغاء العملية: ${escapeHtml(conf.operationTitle)}</div></div>`;
      }
      const oldEntries = Object.entries(conf.oldValues || {}).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`).join('');
      const newEntries = Object.entries(conf.newValues || {}).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`).join('');
      return `
        <div class="ai-confirm-card">
          <div class="ai-confirm-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>تأكيد عملية حساسة: ${escapeHtml(conf.operationTitle)}</span>
          </div>
          <div class="ai-confirm-meta">
            <div><strong>المستهدف:</strong> ${escapeHtml(conf.targetSummary)}</div>
            ${oldEntries}
            ${newEntries}
            <div style="color:var(--ai-danger-fg); margin-top:4px; font-weight:600;">${escapeHtml(conf.impactWarning)}</div>
          </div>
          <div class="ai-confirm-actions">
            <button type="button" class="ai-btn-danger ai-confirm-exec-btn" data-msg-idx="${msgIdx}" data-conf-idx="${cIdx}">تأكيد التنفيذ</button>
            <button type="button" class="ai-btn-secondary ai-confirm-cancel-btn" data-msg-idx="${msgIdx}" data-conf-idx="${cIdx}">إلغاء</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderMessages() {
    const conv = getActiveConversation();
    const welcome = document.getElementById('aiWelcomeScreen');
    const container = document.getElementById('aiMessagesContainer');
    if (!container || !welcome) return;

    const msgs = (conv && Array.isArray(conv.messages)) ? conv.messages : [];
    if (msgs.length === 0) {
      welcome.style.display = 'flex';
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    welcome.style.display = 'none';
    container.style.display = 'flex';

    container.innerHTML = msgs.map((m, idx) => {
      if (m.role === 'user') {
        return `
          <div class="ai-msg-row user">
            <div class="ai-bubble">${escapeHtml(m.content).replace(/\n/g, '<br>')}</div>
            <div class="ai-msg-actions">
              <span class="ai-msg-time">${formatTimeShort(m.timestamp)}</span>
              <button type="button" class="ai-btn-mini ai-copy-msg-btn" data-msg-idx="${idx}">نسخ</button>
              <button type="button" class="ai-btn-mini ai-retry-msg-btn" data-msg-idx="${idx}">إعادة إرسال</button>
            </div>
          </div>
        `;
      }

      const fallbackHtml = m.fallbackNotice
        ? `<div class="ai-fallback-banner">${escapeHtml(m.fallbackNotice)}</div>`
        : '';

      const toolsHtml = (Array.isArray(m.executedTools) && m.executedTools.length > 0)
        ? `<div class="ai-tools-strip">${m.executedTools.map(t => {
            const st = t.status || (t.ok ? 'ok' : 'fail');
            const cls = st === 'pending' ? 'pending' : (st === 'fail' ? 'fail' : '');
            const icon = st === 'pending' ? '!' : (st === 'fail' ? '✕' : '✓');
            const titleAttr = t.error ? ` title="${escapeHtml(t.error)}"` : '';
            return `<span class="ai-tool-chip ${cls}"${titleAttr}>${icon} ${escapeHtml(t.label || t.name)}</span>`;
          }).join('')}</div>`
        : '';

      const tablesHtml = renderTablesHtml(m.tables);
      const cardsHtml = renderOperationCardsHtml(m.operationCards);
      const confirmsHtml = renderConfirmationsHtml(m.confirmations, idx);
      const usageNote = (m.usage && m.usage.totalTokens)
        ? ` • ${m.usage.totalTokens} رمز`
        : '';

      const bodyHtml = m.isError
        ? `<div class="ai-error-card">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             <div class="ai-markdown">${renderSafeMarkdown(m.content)}</div>
           </div>`
        : `<div class="ai-markdown">${renderSafeMarkdown(m.content)}</div>`;

      return `
        <div class="ai-msg-row assistant ${m.isError ? 'is-error' : ''}">
          <div class="ai-assistant-sender">
            <span class="ai-assistant-badge" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path></svg>
            </span>
            <span>مساعد البيان</span>
          </div>
          <div class="ai-bubble">
            ${fallbackHtml}
            ${toolsHtml}
            ${bodyHtml}
            ${tablesHtml}
            ${cardsHtml}
            ${confirmsHtml}
          </div>
          <div class="ai-msg-actions">
            <span class="ai-msg-time">${formatTimeShort(m.timestamp)}${escapeHtml(usageNote)}</span>
            <button type="button" class="ai-btn-mini ai-copy-msg-btn" data-msg-idx="${idx}">نسخ</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind dynamic buttons
    container.querySelectorAll('.ai-copy-msg-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const msg = msgs[Number(btn.dataset.msgIdx)];
        if (msg && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(msg.content || '');
            btn.textContent = 'تم النسخ ✓';
            setTimeout(() => { btn.textContent = 'نسخ'; }, 1200);
          } catch (e) {}
        }
      });
    });

    container.querySelectorAll('.ai-retry-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = msgs[Number(btn.dataset.msgIdx)];
        if (msg && msg.content && !isGenerating) {
          handleUserSend(msg.content);
        }
      });
    });

    container.querySelectorAll('.ai-undo-op-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const auditId = btn.dataset.auditId;
        btn.disabled = true;
        btn.textContent = 'جاري التراجع...';
        const res = await window.AlbayanAI.Audit.undoAuditAction(auditId);
        if (res && res.ok) {
          msgs.forEach(m => {
            (m.operationCards || []).forEach(c => {
              if (c.auditId === auditId) c.undone = true;
            });
          });
          const curConv = getActiveConversation();
          if (curConv) {
            curConv.messages.push({
              role: 'assistant',
              content: res.message,
              timestamp: new Date().toISOString()
            });
            curConv.updatedAt = new Date().toISOString();
          }
          await saveConversationsState();
          renderMessages();
          scrollChatToBottom();
        } else {
          btn.disabled = false;
          btn.textContent = 'تراجع';
          if (window.AlbayanDialog) window.AlbayanDialog.alert((res && res.message) || 'تعذر التراجع عن العملية.', 'تنبيه', 'warning');
        }
      });
    });

    container.querySelectorAll('.ai-confirm-exec-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mIdx = Number(btn.dataset.msgIdx);
        const cIdx = Number(btn.dataset.confIdx);
        const targetMsg = msgs[mIdx];
        const conf = targetMsg && targetMsg.confirmations && targetMsg.confirmations[cIdx];
        if (!conf) return;
        btn.disabled = true;
        btn.textContent = 'جاري التنفيذ...';
        const res = await window.AlbayanAI.Tools.execute(
          conf.toolName,
          { ...(conf.argsSnapshot || {}), confirm_token: conf.token },
          { user: window.AlbayanAI.Security.getCurrentUser(), conversationId: activeConvId }
        );
        conf.resolvedStatus = res.ok ? 'confirmed' : 'cancelled';
        const curConv = getActiveConversation();
        if (curConv) {
          curConv.messages.push({
            role: 'assistant',
            isError: !res.ok,
            content: res.ok ? `تم تنفيذ العملية بنجاح: **${conf.operationTitle}**` : (res.error || res.message || 'تعذر تنفيذ العملية المؤكدة.'),
            operationCards: res.operationCard ? [res.operationCard] : [],
            timestamp: new Date().toISOString()
          });
          curConv.updatedAt = new Date().toISOString();
        }
        await saveConversationsState();
        renderMessages();
        scrollChatToBottom();
      });
    });

    container.querySelectorAll('.ai-confirm-cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mIdx = Number(btn.dataset.msgIdx);
        const cIdx = Number(btn.dataset.confIdx);
        const targetMsg = msgs[mIdx];
        const conf = targetMsg && targetMsg.confirmations && targetMsg.confirmations[cIdx];
        if (!conf) return;
        conf.resolvedStatus = 'cancelled';
        await saveConversationsState();
        renderMessages();
      });
    });

    scrollChatToBottom();
  }

  function showThinkingIndicator(statusLabel, streamText = '') {
    const container = document.getElementById('aiMessagesContainer');
    const welcome = document.getElementById('aiWelcomeScreen');
    if (!container) return;
    if (welcome) welcome.style.display = 'none';
    container.style.display = 'flex';

    let el = document.getElementById('aiActiveThinkingRow');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aiActiveThinkingRow';
      el.className = 'ai-thinking-bar';
      el.innerHTML = `
        <div class="ai-thinking-head">
          <div class="ai-pulse-dots"><span></span><span></span><span></span></div>
          <span id="aiThinkingLabel"></span>
        </div>
        <div id="aiStreamPreview" class="ai-stream-preview ai-markdown" style="display:none;"></div>
      `;
      container.appendChild(el);
    }
    const labelEl = document.getElementById('aiThinkingLabel');
    if (labelEl && statusLabel) labelEl.textContent = statusLabel;
    const previewEl = document.getElementById('aiStreamPreview');
    if (previewEl) {
      if (streamText) {
        previewEl.style.display = 'block';
        previewEl.innerHTML = renderSafeMarkdown(streamText);
      } else {
        previewEl.style.display = 'none';
        previewEl.innerHTML = '';
      }
    }
    scrollChatToBottom();
  }

  function removeThinkingIndicator() {
    const el = document.getElementById('aiActiveThinkingRow');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function syncSendBtnState() {
    const input = document.getElementById('aiPromptInput');
    const sendBtn = document.getElementById('aiSendBtn');
    if (sendBtn && input) {
      sendBtn.disabled = isGenerating || input.value.trim().length === 0;
    }
  }

  function setGeneratingUI(active) {
    isGenerating = active;
    const sendBtn = document.getElementById('aiSendBtn');
    const stopBtn = document.getElementById('aiStopBtn');
    const input = document.getElementById('aiPromptInput');
    if (sendBtn) sendBtn.style.display = active ? 'none' : 'inline-flex';
    if (stopBtn) stopBtn.style.display = active ? 'inline-flex' : 'none';
    if (input && !active) input.disabled = false;
    syncSendBtnState();
  }

  async function handleUserSend(explicitText = null) {
    if (isGenerating) return;
    const input = document.getElementById('aiPromptInput');
    const rawText = explicitText !== null ? String(explicitText) : (input ? input.value : '');
    const prompt = rawText.trim();
    if (!prompt) return;

    if (explicitText === null && input) {
      input.value = '';
      input.style.height = 'auto';
    }

    let conv = getActiveConversation();
    if (!conv) {
      conv = window.AlbayanAI.Memory.createConversation(prompt.slice(0, 42));
      conversations.unshift(conv);
      activeConvId = conv.id;
    } else if (conv.messages.length === 0 || conv.title === 'محادثة جديدة') {
      conv.title = prompt.slice(0, 42);
    }

    conv.messages.push({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    });
    conv.updatedAt = new Date().toISOString();
    renderMessages();
    renderHistoryDrawer();

    activeAbortController = new AbortController();
    partialStreamedText = '';
    setGeneratingUI(true);
    showThinkingIndicator('جاري معالجة الطلب...');

    try {
      const priorMsgs = window.AlbayanAI.Memory.compressHistoryForModel({
        ...conv,
        messages: conv.messages.slice(0, -1)
      });

      const response = await window.AlbayanAI.Providers.sendPrompt(priorMsgs, prompt, {
        conversationId: conv.id,
        signal: activeAbortController.signal,
        onProgress: (stepText) => showThinkingIndicator(stepText, partialStreamedText),
        onStreamDelta: (fullText) => {
          partialStreamedText = fullText;
          showThinkingIndicator('جاري كتابة الرد...', partialStreamedText);
        }
      });

      removeThinkingIndicator();
      conv.messages.push({
        role: 'assistant',
        content: response.text || 'تم التنفيذ.',
        executedTools: response.executedTools || [],
        tables: response.tables || [],
        operationCards: response.operationCards || [],
        confirmations: response.confirmations || [],
        fallbackNotice: response.fallbackNotice || '',
        usage: response.usage || null,
        timestamp: new Date().toISOString()
      });
      conv.updatedAt = new Date().toISOString();
      await saveConversationsState();
      renderMessages();
      await updateStatusHeader();
    } catch (err) {
      removeThinkingIndicator();
      const aborted = err && (err.category === 'aborted' || err.message === 'ABORTED' || err.name === 'AbortError');
      const content = aborted
        ? (partialStreamedText ? `${partialStreamedText}\n\n*(تم إيقاف التوليد بناءً على طلبك)*` : 'تم إيقاف التوليد بناءً على طلبك.')
        : ((err && err.message) || 'تعذر إتمام الطلب بسبب خطأ غير متوقع في الاتصال.');

      conv.messages.push({
        role: 'assistant',
        isError: !aborted,
        content,
        timestamp: new Date().toISOString()
      });
      conv.updatedAt = new Date().toISOString();
      await saveConversationsState();
      renderMessages();
      await updateStatusHeader();
    } finally {
      activeAbortController = null;
      partialStreamedText = '';
      setGeneratingUI(false);
    }
  }

  function startNewConversation() {
    if (isGenerating) return;
    const conv = window.AlbayanAI.Memory.createConversation('محادثة جديدة');
    conversations.unshift(conv);
    activeConvId = conv.id;
    saveConversationsState();
    renderMessages();
    renderHistoryDrawer();
    closeHistoryDrawer();
    const input = document.getElementById('aiPromptInput');
    if (input) input.focus();
  }

  function renderHistoryDrawer() {
    const listEl = document.getElementById('aiHistoryList');
    if (!listEl) return;
    if (conversations.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--ai-muted); font-size:13px;">لا توجد محادثات محفوظة بعد.</div>`;
      return;
    }

    listEl.innerHTML = conversations.map(c => `
      <div class="ai-history-item ${c.id === activeConvId ? 'active' : ''}" data-conv-id="${escapeHtml(c.id)}">
        <div class="ai-history-meta">
          <div class="ai-history-title">${escapeHtml(c.title || 'محادثة جديدة')}</div>
          <div class="ai-history-date">${escapeHtml((c.updatedAt || '').slice(0, 10))} • ${(c.messages || []).length} رسائل</div>
        </div>
        <div class="ai-history-item-actions" onclick="event.stopPropagation()">
          <button type="button" class="ai-btn-mini ai-rename-conv-btn" data-conv-id="${escapeHtml(c.id)}" title="إعادة تسمية">تسمية</button>
          <button type="button" class="ai-btn-mini ai-delete-conv-btn" data-conv-id="${escapeHtml(c.id)}" title="حذف">حذف</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.ai-history-item').forEach(row => {
      row.addEventListener('click', () => {
        activeConvId = row.dataset.convId;
        renderMessages();
        renderHistoryDrawer();
        closeHistoryDrawer();
      });
    });

    listEl.querySelectorAll('.ai-rename-conv-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.convId;
        const target = conversations.find(x => x.id === cid);
        if (!target) return;
        const nextTitle = window.AlbayanDialog
          ? await window.AlbayanDialog.prompt('أدخل الاسم الجديد للمحادثة:', target.title || '', 'تسمية المحادثة')
          : null;
        if (typeof nextTitle === 'string' && nextTitle.trim()) {
          target.title = nextTitle.trim().slice(0, 60);
          target.updatedAt = new Date().toISOString();
          await saveConversationsState();
          renderHistoryDrawer();
        }
      });
    });

    listEl.querySelectorAll('.ai-delete-conv-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.convId;
        const confirmed = window.AlbayanDialog
          ? await window.AlbayanDialog.confirm('هل تريد حذف هذه المحادثة نهائياً؟', 'حذف المحادثة', { isDestructive: true, confirmText: 'نعم، حذف' })
          : false;
        if (!confirmed) return;
        conversations = conversations.filter(x => x.id !== cid);
        if (activeConvId === cid) {
          activeConvId = conversations[0] ? conversations[0].id : null;
        }
        await saveConversationsState();
        renderHistoryDrawer();
        renderMessages();
      });
    });
  }

  function openHistoryDrawer() {
    renderHistoryDrawer();
    document.getElementById('aiHistoryBackdrop')?.classList.add('open');
    document.getElementById('aiHistoryDrawer')?.classList.add('open');
    if (typeof window.albayanPushOverlayHistory === 'function') window.albayanPushOverlayHistory();
  }

  function closeHistoryDrawer() {
    document.getElementById('aiHistoryBackdrop')?.classList.remove('open');
    document.getElementById('aiHistoryDrawer')?.classList.remove('open');
  }
  window.closeAiHistoryDrawer = closeHistoryDrawer;

  // Provider Settings Modal Logic
  function syncModelOptions(providerId, selectedModel = '') {
    const sel = document.getElementById('aiCfgModelSelect');
    const customInput = document.getElementById('aiCfgModelCustom');
    const cat = window.AlbayanAI.CATALOG[providerId] || window.AlbayanAI.CATALOG.builtin;
    if (!sel) return;

    sel.innerHTML = cat.models.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.label)}</option>`).join('');
    const matched = cat.models.some(m => m.id === selectedModel);
    if (matched) {
      sel.value = selectedModel;
      if (customInput) customInput.value = '';
    } else if (selectedModel && providerId !== 'builtin') {
      sel.value = cat.defaultModel;
      if (customInput) customInput.value = selectedModel;
    } else {
      sel.value = cat.defaultModel;
      if (customInput) customInput.value = '';
    }

    const isLocal = providerId === 'builtin';
    const showKey = !isLocal;
    const showEndpoint = !isLocal;
    const keyGroup = document.getElementById('aiCfgKeyGroup');
    if (keyGroup) keyGroup.style.display = showKey ? 'block' : 'none';
    const epGroup = document.getElementById('aiCfgEndpointGroup');
    if (epGroup) epGroup.style.display = showEndpoint ? 'block' : 'none';
    const localHint = document.getElementById('aiLocalProviderHint');
    if (localHint) localHint.style.display = isLocal ? 'block' : 'none';
    const customModelEl = document.getElementById('aiCfgModelCustom');
    if (customModelEl) customModelEl.style.display = isLocal ? 'none' : 'block';
    const r1 = document.getElementById('aiCfgParamsRow1');
    if (r1) r1.style.display = isLocal ? 'none' : 'grid';
    const r2 = document.getElementById('aiCfgParamsRow2');
    if (r2) r2.style.display = isLocal ? 'none' : 'grid';
    const fbGrp = document.getElementById('aiCfgFallbackGroup');
    if (fbGrp) fbGrp.style.display = isLocal ? 'none' : 'flex';
  }

  async function refreshKeyStatusLabel(providerId) {
    const lbl = document.getElementById('aiCfgKeyStatusLabel');
    if (!lbl) return;
    if (providerId === 'builtin') {
      lbl.textContent = '';
      return;
    }
    const stat = await window.AlbayanAI.Security.getApiKeyStatus(providerId);
    lbl.textContent = stat.configured ? `(محفوظ بأمان: ${stat.maskedKey})` : '(غير مهيأ بعد)';
  }

  async function openProviderSettingsModal() {
    const modal = document.getElementById('aiProviderSettingsModal');
    if (!modal) return;

    const canEdit = window.AlbayanAI.Security.canConfigureProvider();
    const cfg = await window.AlbayanAI.Providers.loadConfig();
    const usage = await window.AlbayanAI.Providers.loadUsageStats();

    const usageBox = document.getElementById('aiUsageBox');
    const costWrap = document.getElementById('aiUsageCostWrap');
    if (usageBox) {
      if (usage.requestsCount > 0 && usage.totalTokens > 0) {
        usageBox.style.display = 'flex';
        document.getElementById('aiUsageTokens').textContent = usage.totalTokens.toLocaleString();
        document.getElementById('aiUsageCount').textContent = String(usage.requestsCount);
        if (costWrap) {
          costWrap.style.display = usage.hasKnownCost ? 'inline' : 'none';
          document.getElementById('aiUsageCost').textContent = `$${Number(usage.estimatedCostUsd || 0).toFixed(4)}`;
        }
      } else {
        usageBox.style.display = 'none';
      }
    }

    const pSel = document.getElementById('aiCfgProvider');
    const tempEl = document.getElementById('aiCfgTemp');
    const thinkEl = document.getElementById('aiCfgThinking');
    const maxEl = document.getElementById('aiCfgMaxTokens');
    const limitEl = document.getElementById('aiCfgDailyLimit');
    const epEl = document.getElementById('aiCfgEndpoint');
    const fbEl = document.getElementById('aiCfgFallbackBuiltin');
    const keyInput = document.getElementById('aiCfgApiKey');
    const nonAdminNotice = document.getElementById('aiNonAdminNotice');
    const saveBtn = document.getElementById('aiSaveCfgBtn');
    const testBtn = document.getElementById('aiTestConnBtn');
    const resBox = document.getElementById('aiTestResultBox');

    if (pSel) pSel.value = cfg.provider;
    syncModelOptions(cfg.provider, cfg.model);
    if (epEl) epEl.value = cfg.customEndpoint || '';
    if (tempEl) tempEl.value = cfg.temperature ?? 0.2;
    if (thinkEl) thinkEl.value = cfg.thinkingBudget ?? 1024;
    if (maxEl) maxEl.value = cfg.maxTokens ?? 2048;
    if (limitEl) limitEl.value = cfg.dailyTokenLimit ?? 250000;
    if (fbEl) fbEl.checked = !!cfg.fallbackToBuiltin;
    if (keyInput) keyInput.value = '';
    if (resBox) resBox.style.display = 'none';

    await refreshKeyStatusLabel(cfg.provider);

    if (nonAdminNotice) nonAdminNotice.style.display = canEdit ? 'none' : 'block';
    ['aiCfgProvider', 'aiCfgModelSelect', 'aiCfgModelCustom', 'aiCfgApiKey', 'aiCfgEndpoint', 'aiCfgTemp', 'aiCfgThinking', 'aiCfgMaxTokens', 'aiCfgDailyLimit', 'aiCfgFallbackBuiltin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !canEdit;
    });
    if (saveBtn) saveBtn.style.display = canEdit ? 'inline-flex' : 'none';
    if (testBtn) testBtn.style.display = canEdit ? 'inline-flex' : 'none';

    modal.style.display = 'flex';
    if (typeof window.albayanPushOverlayHistory === 'function') window.albayanPushOverlayHistory();
  }

  function closeProviderSettingsModal() {
    const modal = document.getElementById('aiProviderSettingsModal');
    if (modal) modal.style.display = 'none';
  }
  window.closeAiProviderSettingsModal = closeProviderSettingsModal;

  document.addEventListener('DOMContentLoaded', async () => {
    const user = window.AlbayanAI && window.AlbayanAI.Security.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    conversations = await window.AlbayanAI.Memory.loadAll();
    if (conversations.length > 0) {
      activeConvId = conversations[0].id;
    }
    renderMessages();
    renderHistoryDrawer();
    await updateStatusHeader();

    const promptInput = document.getElementById('aiPromptInput');
    if (promptInput) {
      promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + 'px';
        syncSendBtnState();
      });
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
          e.preventDefault();
          handleUserSend();
        }
      });
      promptInput.addEventListener('focus', () => {
        setTimeout(scrollChatToBottom, 180);
      });
    }

    document.getElementById('aiSendBtn')?.addEventListener('click', () => handleUserSend());
    document.getElementById('aiStopBtn')?.addEventListener('click', () => {
      if (activeAbortController) activeAbortController.abort('USER_STOPPED');
    });
    document.getElementById('aiNewChatBtn')?.addEventListener('click', startNewConversation);
    document.getElementById('aiDrawerNewChatBtn')?.addEventListener('click', startNewConversation);
    document.getElementById('aiOpenHistoryBtn')?.addEventListener('click', openHistoryDrawer);
    document.getElementById('aiCloseHistoryBtn')?.addEventListener('click', closeHistoryDrawer);
    document.getElementById('aiHistoryBackdrop')?.addEventListener('click', closeHistoryDrawer);
    document.getElementById('aiOpenSettingsBtn')?.addEventListener('click', openProviderSettingsModal);
    document.getElementById('aiCloseSettingsBtn')?.addEventListener('click', closeProviderSettingsModal);
    document.getElementById('aiProviderSettingsModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'aiProviderSettingsModal') closeProviderSettingsModal();
    });

    document.querySelectorAll('#aiSuggestionsGrid .ai-suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const p = card.dataset.prompt;
        if (p) handleUserSend(p);
      });
    });

    document.getElementById('aiCfgProvider')?.addEventListener('change', async (e) => {
      const p = e.target.value;
      syncModelOptions(p);
      await refreshKeyStatusLabel(p);
      const resBox = document.getElementById('aiTestResultBox');
      if (resBox) resBox.style.display = 'none';
    });

    const readModalConfig = () => {
      const p = document.getElementById('aiCfgProvider')?.value || 'builtin';
      const selModel = document.getElementById('aiCfgModelSelect')?.value || '';
      const customModel = document.getElementById('aiCfgModelCustom')?.value.trim() || '';
      return {
        provider: p,
        model: customModel || selModel,
        customEndpoint: document.getElementById('aiCfgEndpoint')?.value.trim() || '',
        temperature: Number(document.getElementById('aiCfgTemp')?.value ?? 0.2),
        thinkingBudget: Number(document.getElementById('aiCfgThinking')?.value ?? 1024),
        maxTokens: Number(document.getElementById('aiCfgMaxTokens')?.value ?? 2048),
        dailyTokenLimit: Number(document.getElementById('aiCfgDailyLimit')?.value ?? 250000),
        fallbackToBuiltin: !!document.getElementById('aiCfgFallbackBuiltin')?.checked
      };
    };

    document.getElementById('aiTestConnBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('aiTestConnBtn');
      const resBox = document.getElementById('aiTestResultBox');
      const rawKey = document.getElementById('aiCfgApiKey')?.value.trim() || '';
      btn.disabled = true;
      btn.textContent = 'جاري الاختبار...';
      const res = await window.AlbayanAI.Providers.testConnection(readModalConfig(), rawKey);
      btn.disabled = false;
      btn.textContent = 'اختبار الاتصال';
      if (resBox) {
        resBox.style.display = 'block';
        resBox.style.background = res.ok ? 'var(--ai-ok-bg)' : 'var(--ai-danger-bg)';
        resBox.style.color = res.ok ? 'var(--ai-ok-fg)' : 'var(--ai-danger-fg)';
        resBox.textContent = res.message;
      }
      await updateStatusHeader();
    });

    document.getElementById('aiSaveCfgBtn')?.addEventListener('click', async () => {
      try {
        const nextCfg = readModalConfig();
        const rawKey = document.getElementById('aiCfgApiKey')?.value.trim() || '';
        if (rawKey && nextCfg.provider !== 'builtin') {
          await window.AlbayanAI.Security.saveApiKey(nextCfg.provider, rawKey);
        }
        await window.AlbayanAI.Providers.saveConfig(nextCfg);
        await updateStatusHeader();
        closeProviderSettingsModal();
        if (window.AlbayanDialog && typeof window.AlbayanDialog.toast === 'function') {
          window.AlbayanDialog.toast(
            nextCfg.provider === 'builtin'
              ? 'تم حفظ الإعدادات (المحرك المحلي)'
              : 'تم حفظ الإعدادات — استخدم "اختبار الاتصال" للتحقق من المزود',
            'info'
          );
        }
      } catch (err) {
        if (window.AlbayanDialog) window.AlbayanDialog.alert((err && err.message) || 'تعذر حفظ إعدادات المزود.', 'خطأ', 'danger');
      }
    });

    window.addEventListener('online', updateStatusHeader);
    window.addEventListener('offline', updateStatusHeader);

    if (window.visualViewport) {
      const syncViewport = () => {
        const shell = document.getElementById('aiAppShell');
        if (shell) shell.style.height = `${window.visualViewport.height}px`;
        if (window.scrollY !== 0) window.scrollTo(0, 0);
        scrollChatToBottom();
      };
      window.visualViewport.addEventListener('resize', syncViewport);
      window.visualViewport.addEventListener('scroll', syncViewport);
    }

    syncSendBtnState();
  });
})();
