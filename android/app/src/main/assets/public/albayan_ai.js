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

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderSafeMarkdown(raw) {
    const src = String(raw || '').replace(/\r\n/g, '\n');
    const codeBlocks = [];
    const withPlaceholders = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
      return `\n@@CODE_BLOCK_${idx}@@\n`;
    });

    const lines = withPlaceholders.split('\n');
    const out = [];
    let inUl = false;

    const closeLists = () => {
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
    };

    const formatInline = (txt) => {
      return escapeHtml(txt)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
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
      if (line.startsWith('#### ')) {
        closeLists();
        out.push(`<h4>${formatInline(line.slice(5))}</h4>`);
      } else if (line.startsWith('### ') || line.startsWith('## ')) {
        closeLists();
        out.push(`<h3>${formatInline(line.replace(/^#{2,3}\s+/, ''))}</h3>`);
      } else if (line.startsWith('> ')) {
        closeLists();
        out.push(`<blockquote>${formatInline(line.slice(2))}</blockquote>`);
      } else if (/^[-•*]\s+/.test(line)) {
        if (!inUl) {
          out.push('<ul>');
          inUl = true;
        }
        out.push(`<li>${formatInline(line.replace(/^[-•*]\s+/, ''))}</li>`);
      } else if (/^\d+\.\s+/.test(line)) {
        if (!inUl) {
          out.push('<ul>');
          inUl = true;
        }
        out.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      } else {
        closeLists();
        out.push(`<p>${formatInline(line)}</p>`);
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
    const online = navigator.onLine;

    if (cfg.provider === 'builtin') {
      if (dot) dot.className = 'ai-status-dot';
      txt.textContent = `متصل • ${cat.label}`;
    } else {
      const keyStat = await window.AlbayanAI.Security.getApiKeyStatus(cfg.provider);
      if (!keyStat.configured) {
        if (dot) dot.className = 'ai-status-dot offline';
        txt.textContent = `${cat.label} (بدون مفتاح — يعمل الاحتياطي المدمج)`;
      } else if (!online) {
        if (dot) dot.className = 'ai-status-dot offline';
        txt.textContent = `بدون إنترنت — يعمل المحرك المحلي`;
      } else {
        if (dot) dot.className = 'ai-status-dot';
        txt.textContent = `متصل • ${cfg.model || cat.defaultModel}`;
      }
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
        ? `<button type="button" class="ai-btn-mini ai-undo-op-btn" data-audit-id="${escapeHtml(card.auditId)}">تراجع عن التعديل</button>`
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
        ? `<div class="ai-tools-strip">${m.executedTools.map(t => `<span class="ai-tool-chip ${t.ok ? '' : 'fail'}">${t.ok ? '✓' : '!'} ${escapeHtml(t.label || t.name)}</span>`).join('')}</div>`
        : '';

      const tablesHtml = renderTablesHtml(m.tables);
      const cardsHtml = renderOperationCardsHtml(m.operationCards);
      const confirmsHtml = renderConfirmationsHtml(m.confirmations, idx);
      const usageNote = (m.usage && m.usage.totalTokens)
        ? ` • ${m.usage.totalTokens} رمز`
        : '';

      return `
        <div class="ai-msg-row assistant">
          <div class="ai-bubble">
            ${fallbackHtml}
            ${toolsHtml}
            <div class="ai-markdown">${renderSafeMarkdown(m.content)}</div>
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
          btn.textContent = 'تراجع عن التعديل';
          alert((res && res.message) || 'تعذر التراجع عن العملية.');
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

  function showThinkingIndicator(statusLabel) {
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
      el.innerHTML = `<div class="ai-pulse-dots"><span></span><span></span><span></span></div><span id="aiThinkingLabel"></span>`;
      container.appendChild(el);
    }
    const labelEl = document.getElementById('aiThinkingLabel');
    if (labelEl) labelEl.textContent = statusLabel || 'جاري التفكير والتحقق من البيانات...';
    scrollChatToBottom();
  }

  function removeThinkingIndicator() {
    const el = document.getElementById('aiActiveThinkingRow');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function setGeneratingUI(active) {
    isGenerating = active;
    const sendBtn = document.getElementById('aiSendBtn');
    const stopBtn = document.getElementById('aiStopBtn');
    const input = document.getElementById('aiPromptInput');
    if (sendBtn) sendBtn.style.display = active ? 'none' : 'inline-flex';
    if (stopBtn) stopBtn.style.display = active ? 'inline-flex' : 'none';
    if (input && !active) input.disabled = false;
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
    setGeneratingUI(true);
    showThinkingIndicator('جاري قراءة سياق المدرسة والبدء...');

    try {
      const priorMsgs = window.AlbayanAI.Memory.compressHistoryForModel({
        ...conv,
        messages: conv.messages.slice(0, -1)
      });

      const response = await window.AlbayanAI.Providers.sendPrompt(priorMsgs, prompt, {
        conversationId: conv.id,
        signal: activeAbortController.signal,
        onProgress: (stepText) => showThinkingIndicator(stepText)
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
      updateStatusHeader();
    } catch (err) {
      removeThinkingIndicator();
      const aborted = err && (err.message === 'ABORTED' || err.name === 'AbortError');
      conv.messages.push({
        role: 'assistant',
        content: aborted
          ? 'تم إيقاف التوليد بناءً على طلبك.'
          : `تعذر إتمام الطلب: **${(err && err.message) || 'خطأ غير متوقع في الاتصال'}**\nيمكنك إعادة المحاولة أو مراجعة إعدادات المزود.`,
        timestamp: new Date().toISOString()
      });
      conv.updatedAt = new Date().toISOString();
      await saveConversationsState();
      renderMessages();
    } finally {
      activeAbortController = null;
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
        const nextTitle = window.prompt('أدخل الاسم الجديد للمحادثة:', target.title || '');
        if (nextTitle && nextTitle.trim()) {
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
        if (!window.confirm('هل تريد حذف هذه المحادثة نهائياً؟')) return;
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
    } else if (selectedModel) {
      sel.value = cat.defaultModel;
      if (customInput) customInput.value = selectedModel;
    } else {
      sel.value = cat.defaultModel;
      if (customInput) customInput.value = '';
    }

    const keyGroup = document.getElementById('aiCfgKeyGroup');
    if (keyGroup) keyGroup.style.display = providerId === 'builtin' ? 'none' : 'block';
    const epGroup = document.getElementById('aiCfgEndpointGroup');
    if (epGroup) epGroup.style.display = (providerId === 'builtin') ? 'none' : 'block';
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

    document.getElementById('aiUsageTokens').textContent = (usage.totalTokens || 0).toLocaleString();
    document.getElementById('aiUsageCost').textContent = `$${Number(usage.estimatedCostUsd || 0).toFixed(4)}`;
    document.getElementById('aiUsageCount').textContent = String(usage.requestsCount || 0);

    const pSel = document.getElementById('aiCfgProvider');
    const tempEl = document.getElementById('aiCfgTemp');
    const thinkEl = document.getElementById('aiCfgThinking');
    const maxEl = document.getElementById('aiCfgMaxTokens');
    const limitEl = document.getElementById('aiCfgDailyLimit');
    const epEl = document.getElementById('aiCfgEndpoint');
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
    if (keyInput) keyInput.value = '';
    if (resBox) resBox.style.display = 'none';

    await refreshKeyStatusLabel(cfg.provider);

    if (nonAdminNotice) nonAdminNotice.style.display = canEdit ? 'none' : 'block';
    ['aiCfgProvider', 'aiCfgModelSelect', 'aiCfgModelCustom', 'aiCfgApiKey', 'aiCfgEndpoint', 'aiCfgTemp', 'aiCfgThinking', 'aiCfgMaxTokens', 'aiCfgDailyLimit'].forEach(id => {
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
    updateStatusHeader();

    const promptInput = document.getElementById('aiPromptInput');
    if (promptInput) {
      promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + 'px';
      });
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
          e.preventDefault();
          handleUserSend();
        }
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
        dailyTokenLimit: Number(document.getElementById('aiCfgDailyLimit')?.value ?? 250000)
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
      } catch (err) {
        alert((err && err.message) || 'تعذر حفظ إعدادات المزود.');
      }
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const shell = document.getElementById('aiAppShell');
        if (shell) shell.style.height = `${window.visualViewport.height}px`;
        scrollChatToBottom();
      });
    }
  });
})();
