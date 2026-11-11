/**
 * ALBAYAN UI DIALOG & TOAST ENGINE
 * محرك الحوارات والتنبيهات الموحد لمدرسة البيان لتعليم القرآن الكريم
 * متطابق 100% مع تصميم ونظام مدرسة البيان في المتصفح والتطبيق (Modal System & Design Tokens)
 */

(function(window) {
  'use strict';

  // SVG Icons for High-Resolution Vector Rendering (No emojis)
  const ICONS = {
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    danger: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    prompt: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  };

  // 1. Inject Styles matching Albayan design language
  function injectStyles() {
    if (document.getElementById('albayan-dialog-styles')) return;
    const style = document.createElement('style');
    style.id = 'albayan-dialog-styles';
    style.textContent = `
      .albayan-dialog-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 100000 !important;
        background: rgba(15, 23, 42, 0.65) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 16px !important;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.22s ease, visibility 0.22s ease;
        direction: rtl !important;
        font-family: var(--app-font-family, 'Cairo', 'Segoe UI', Tahoma, sans-serif) !important;
      }

      .albayan-dialog-overlay.active {
        opacity: 1 !important;
        visibility: visible !important;
      }

      .albayan-dialog-card {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 24px !important;
        width: 100% !important;
        max-width: 440px !important;
        box-shadow: 0 25px 60px -10px rgba(15, 23, 42, 0.3) !important;
        color: #0f172a !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        transform: scale(0.92) translateY(12px);
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .albayan-dialog-overlay.active .albayan-dialog-card {
        transform: scale(1) translateY(0) !important;
      }

      /* Dark Theme Support */
      html[data-theme="dark"] .albayan-dialog-card {
        background: #131f37 !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7) !important;
        color: #f8fafc !important;
      }

      .albayan-dialog-header {
        padding: 16px 20px !important;
        border-bottom: 1px solid #e2e8f0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: #f8fafc !important;
      }

      html[data-theme="dark"] .albayan-dialog-header {
        background: #0f172a !important;
        border-bottom-color: rgba(255, 255, 255, 0.08) !important;
      }

      .albayan-dialog-header-right {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }

      .albayan-dialog-icon-badge {
        width: 36px !important;
        height: 36px !important;
        border-radius: 10px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      .albayan-dialog-icon-badge.info {
        background: rgba(37, 99, 235, 0.1) !important;
        color: #2563eb !important;
      }
      .albayan-dialog-icon-badge.warning {
        background: rgba(245, 158, 11, 0.12) !important;
        color: #d97706 !important;
      }
      .albayan-dialog-icon-badge.danger {
        background: rgba(239, 68, 68, 0.12) !important;
        color: #dc2626 !important;
      }
      .albayan-dialog-icon-badge.success {
        background: rgba(16, 185, 129, 0.12) !important;
        color: #059669 !important;
      }
      .albayan-dialog-icon-badge.prompt {
        background: rgba(37, 99, 235, 0.1) !important;
        color: #2563eb !important;
      }

      .albayan-dialog-title {
        margin: 0 !important;
        font-size: 16.5px !important;
        font-weight: 800 !important;
        color: #0f172a !important;
        line-height: 1.3 !important;
      }

      html[data-theme="dark"] .albayan-dialog-title {
        color: #f8fafc !important;
      }

      .albayan-dialog-close-btn {
        background: rgba(0, 0, 0, 0.04) !important;
        border: none !important;
        border-radius: 50% !important;
        width: 32px !important;
        height: 32px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        color: #64748b !important;
        transition: all 0.2s ease !important;
        outline: none !important;
      }

      .albayan-dialog-close-btn:hover {
        background: rgba(239, 68, 68, 0.15) !important;
        color: #ef4444 !important;
      }

      html[data-theme="dark"] .albayan-dialog-close-btn {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #94a3b8 !important;
      }

      .albayan-dialog-body {
        padding: 20px 22px !important;
        box-sizing: border-box !important;
      }

      .albayan-dialog-message {
        font-size: 14.5px !important;
        color: #475569 !important;
        margin: 0 0 16px 0 !important;
        line-height: 1.6 !important;
        word-break: break-word !important;
      }

      html[data-theme="dark"] .albayan-dialog-message {
        color: #cbd5e1 !important;
      }

      .albayan-dialog-input-wrap {
        margin: 0 0 18px 0 !important;
        text-align: right !important;
      }

      .albayan-dialog-input {
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 12px 14px !important;
        border: 1.5px solid #cbd5e1 !important;
        border-radius: 12px !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        font-family: inherit !important;
        outline: none !important;
        transition: all 0.2s ease !important;
        background: #f8fafc !important;
        color: #0f172a !important;
      }

      .albayan-dialog-input:focus {
        border-color: #2563eb !important;
        background: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
      }

      html[data-theme="dark"] .albayan-dialog-input {
        background: #0b1329 !important;
        border-color: #334155 !important;
        color: #f8fafc !important;
      }

      html[data-theme="dark"] .albayan-dialog-input:focus {
        border-color: #60a5fa !important;
        background: #0f172a !important;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2) !important;
      }

      .albayan-dialog-actions {
        display: flex !important;
        gap: 10px !important;
        justify-content: flex-end !important;
        margin-top: 20px !important;
      }

      .albayan-dialog-btn {
        height: 44px !important;
        border-radius: 12px !important;
        font-size: 13.5px !important;
        font-weight: 800 !important;
        font-family: inherit !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        border: none !important;
        outline: none !important;
        transition: all 0.18s ease !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      .albayan-dialog-btn:active {
        transform: scale(0.97) !important;
      }

      .albayan-dialog-btn.confirm-primary {
        background: #2563eb !important;
        color: #ffffff !important;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3) !important;
        padding: 0 20px !important;
      }

      .albayan-dialog-btn.confirm-danger {
        background: #ef4444 !important;
        color: #ffffff !important;
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3) !important;
        padding: 0 20px !important;
      }

      .albayan-dialog-btn.cancel-btn {
        background: #f1f5f9 !important;
        color: #475569 !important;
        border: 1px solid #cbd5e1 !important;
        padding: 0 16px !important;
      }

      html[data-theme="dark"] .albayan-dialog-btn.cancel-btn {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #cbd5e1 !important;
        border-color: rgba(255, 255, 255, 0.12) !important;
      }

      /* Toasts / SnackBar */
      .albayan-toast-container {
        position: fixed !important;
        top: 24px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 100001 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        pointer-events: none !important;
        max-width: 90vw !important;
      }

      .albayan-toast-item {
        background: rgba(15, 23, 42, 0.94) !important;
        color: #ffffff !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        padding: 11px 20px !important;
        border-radius: 30px !important;
        font-size: 13.5px !important;
        font-weight: 700 !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25) !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        pointer-events: auto !important;
        opacity: 0;
        transform: translateY(-12px) scale(0.96);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        direction: rtl !important;
      }

      .albayan-toast-item.show {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }

      .albayan-toast-item.success { border-right: 3.5px solid #10b981 !important; }
      .albayan-toast-item.danger  { border-right: 3.5px solid #ef4444 !important; }
      .albayan-toast-item.warning { border-right: 3.5px solid #f59e0b !important; }
      .albayan-toast-item.info    { border-right: 3.5px solid #3b82f6 !important; }
    `;
    document.head.appendChild(style);
  }

  // 2. Core Dialog Function (Promise based)
  function showDialog(options) {
    injectStyles();
    return new Promise((resolve) => {
      const {
        title = "تنبيه",
        message = "",
        type = "info", // "info", "warning", "danger", "success", "prompt"
        confirmText = "موافق",
        cancelText = null,
        isDestructive = false,
        hasInput = false,
        inputValue = "",
        inputPlaceholder = "",
        inputType = "text",
        inputMin = null,
        inputMax = null,
        inputStep = null
      } = options;

      const iconSvg = ICONS[type] || ICONS.info;

      const overlay = document.createElement("div");
      overlay.className = "albayan-dialog-overlay";

      let inputHtml = "";
      if (hasInput) {
        const minAttr = inputMin !== null ? `min="${inputMin}"` : "";
        const maxAttr = inputMax !== null ? `max="${inputMax}"` : "";
        const stepAttr = inputStep !== null ? `step="${inputStep}"` : "";
        inputHtml = `
          <div class="albayan-dialog-input-wrap">
            <input type="${inputType}" class="albayan-dialog-input" id="albayanDialogInput" value="${escapeText(inputValue)}" placeholder="${escapeText(inputPlaceholder)}" ${minAttr} ${maxAttr} ${stepAttr} autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" />
          </div>
        `;
      }

      overlay.innerHTML = `
        <div class="modal-card albayan-dialog-card" role="dialog" aria-modal="true">
          <div class="albayan-dialog-header">
            <div class="albayan-dialog-header-right">
              <div class="albayan-dialog-icon-badge ${type}">${iconSvg}</div>
              <h3 class="albayan-dialog-title">${escapeText(title)}</h3>
            </div>
            <button type="button" class="albayan-dialog-close-btn" id="albayanDialogCloseBtn" aria-label="إغلاق">
              ${ICONS.close}
            </button>
          </div>
          <div class="albayan-dialog-body">
            ${message ? `<p class="albayan-dialog-message">${escapeText(message)}</p>` : ''}
            ${inputHtml}
            <div class="albayan-dialog-actions">
              ${cancelText ? `<button type="button" class="albayan-dialog-btn cancel-btn" id="albayanDialogCancel" style="flex:1;">${escapeText(cancelText)}</button>` : ''}
              <button type="button" class="albayan-dialog-btn ${isDestructive ? 'confirm-danger' : 'confirm-primary'}" id="albayanDialogConfirm" style="flex:${cancelText ? '1.4' : '1'};">
                ${ICONS.check} ${escapeText(confirmText)}
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Smooth entrance
      requestAnimationFrame(() => {
        overlay.classList.add("active");
      });

      const confirmBtn = overlay.querySelector("#albayanDialogConfirm");
      const cancelBtn = overlay.querySelector("#albayanDialogCancel");
      const closeBtn = overlay.querySelector("#albayanDialogCloseBtn");
      const inputEl = overlay.querySelector("#albayanDialogInput");

      function cleanUp(result) {
        overlay.classList.remove("active");
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 250);
        resolve(result);
      }

      if (confirmBtn) {
        confirmBtn.onclick = () => {
          if (hasInput) {
            cleanUp(inputEl ? inputEl.value : "");
          } else {
            cleanUp(true);
          }
        };
      }

      if (cancelBtn) {
        cancelBtn.onclick = () => {
          cleanUp(hasInput ? null : false);
        };
      }

      if (closeBtn) {
        closeBtn.onclick = () => {
          cleanUp(hasInput ? null : false);
        };
      }

      if (inputEl) {
        setTimeout(() => {
          inputEl.focus();
          const len = inputEl.value ? inputEl.value.length : 0;
          try { inputEl.setSelectionRange(len, len); } catch (e) {}
        }, 80);

        inputEl.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmBtn.click();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cleanUp(hasInput ? null : false);
          }
        };
      } else if (confirmBtn) {
        confirmBtn.focus();
      }

      // Close on backdrop tap
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanUp(hasInput ? null : false);
        }
      };
    });
  }

  // 3. Toast Function
  function showToast(message, type = "info", duration = 3000) {
    injectStyles();
    let container = document.getElementById("albayanToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "albayanToastContainer";
      container.className = "albayan-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `albayan-toast-item ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, duration);
  }

  function escapeText(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 4. Public API
  const AlbayanDialog = {
    alert: function(message, title = "تنبيه", type = "info") {
      return showDialog({ title, message, type, confirmText: "حسناً" });
    },
    confirm: function(message, title = "تأكيد", options = {}) {
      return showDialog({
        title,
        message,
        type: options.type || (options.isDestructive ? "danger" : "warning"),
        confirmText: options.confirmText || "نعم، تأكيد",
        cancelText: options.cancelText || "إلغاء",
        isDestructive: options.isDestructive || false
      });
    },
    prompt: function(message, defaultValue = "", title = "إدخال بيانات", options = {}) {
      return showDialog({
        title,
        message,
        type: options.type || "prompt",
        confirmText: options.confirmText || "تأكيد",
        cancelText: options.cancelText || "إلغاء",
        hasInput: true,
        inputValue: defaultValue || "",
        inputPlaceholder: options.placeholder || "",
        inputType: options.inputType || "text",
        inputMin: options.min !== undefined ? options.min : null,
        inputMax: options.max !== undefined ? options.max : null,
        inputStep: options.step !== undefined ? options.step : null
      });
    },
    toast: showToast
  };

  // Safe Global Overrides for native Android dialogs
  // Prevents Capacitor WebView from opening the native grey Android AlertDialog
  try {
    window.alert = function(msg) {
      AlbayanDialog.alert(String(msg || ""));
    };

    window.prompt = function(msg, def) {
      console.warn("Native prompt called, using AlbayanDialog.prompt:", msg);
      return AlbayanDialog.prompt(msg, def);
    };
  } catch(e) {}

  window.AlbayanDialog = AlbayanDialog;

  // Auto-inject styles
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectStyles);
  } else {
    injectStyles();
  }

})(window);
