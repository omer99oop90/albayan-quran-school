// theme-init.js — يُشغَّل فوراً في <head> لتطبيق الثيم والخطوط قبل عرض الصفحة وتوفير مشغل الأيقونات الموحد
(function() {
  // 1. Theme Initialization
  try {
    var theme = localStorage.getItem('appTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    }
  } catch(e) {}

  // 2. Typography & Font System Initialization
  var FONT_MAP = {
    'Cairo': { name: 'كايرو', stack: "'Cairo', system-ui, -apple-system, sans-serif" },
    'Tajawal': { name: 'تجوال', stack: "'Tajawal', 'Cairo', system-ui, -apple-system, sans-serif" },
    'Alexandria': { name: 'الإسكندرية', stack: "'Alexandria', 'Cairo', system-ui, -apple-system, sans-serif" },
    'Amiri': { name: 'أميري', stack: "'Amiri', 'Cairo', serif" },
    'Almarai': { name: 'المراعي', stack: "'Almarai', 'Cairo', system-ui, -apple-system, sans-serif" },
    'custom': { name: 'خط مخصص', stack: "'CustomUserFont', 'Cairo', system-ui, -apple-system, sans-serif" }
  };
  window.APP_FONT_MAP = FONT_MAP;

  // Preload Google Fonts Bundle for the 5 Curated Typefaces
  try {
    if (!document.getElementById('albayan-google-fonts-bundle')) {
      var preconnect1 = document.createElement('link');
      preconnect1.rel = 'preconnect';
      preconnect1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(preconnect1);

      var preconnect2 = document.createElement('link');
      preconnect2.rel = 'preconnect';
      preconnect2.href = 'https://fonts.gstatic.com';
      preconnect2.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect2);

      var fontLink = document.createElement('link');
      fontLink.id = 'albayan-google-fonts-bundle';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Alexandria:wght@400;500;600;700;800&family=Almarai:wght@400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap';
      document.head.appendChild(fontLink);
    }
  } catch(e) {}

  // Preload Albayan Mobile DB for offline-first capabilities
  try {
    if (!window.AlbayanLocalDB && typeof document !== 'undefined' && !document.getElementById('albayan-mobile-db-script')) {
      var isStandalone = window.location.protocol === 'file:' || 
                          window.location.origin.includes('capacitor://') || 
                          (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));
      var dbScript = document.createElement('script');
      dbScript.id = 'albayan-mobile-db-script';
      dbScript.src = isStandalone ? 'mobile-db.js?v=3.0' : '/static/mobile-db.js?v=3.0';
      document.head.appendChild(dbScript);
    }

    // Unregister any stale Service Workers and clear old caches so updated APK assets load immediately
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (var i = 0; i < registrations.length; i++) {
          registrations[i].unregister().catch(function() {});
        }
      }).catch(function() {});
    }
    if (typeof window !== 'undefined' && 'caches' in window) {
      window.caches.keys().then(function(keys) {
        for (var j = 0; j < keys.length; j++) {
          window.caches.delete(keys[j]).catch(function() {});
        }
      }).catch(function() {});
    }
  } catch(e) {}

  // Function to register custom uploaded font via @font-face
  function registerCustomFontFace(fontDataUrl, fontFormat) {
    var styleId = 'albayan-custom-font-style';
    var existing = document.getElementById(styleId);
    if (!existing) {
      existing = document.createElement('style');
      existing.id = styleId;
      document.head.appendChild(existing);
    }
    var formatStr = fontFormat ? " format('" + fontFormat + "')" : "";
    existing.textContent = "@font-face { font-family: 'CustomUserFont'; src: url('" + fontDataUrl + "')" + formatStr + "; font-display: swap; }";
  }
  window.registerCustomFontFace = registerCustomFontFace;

  // Check and apply stored custom font if any
  try {
    var storedCustomData = localStorage.getItem('appCustomFontData');
    var storedCustomFormat = localStorage.getItem('appCustomFontFormat');
    if (storedCustomData) {
      registerCustomFontFace(storedCustomData, storedCustomFormat);
    }
  } catch(e) {}

  // Apply Font globally across document
  function applyAppFont(fontKey) {
    var fontInfo = FONT_MAP[fontKey] || FONT_MAP['Cairo'];
    var fontStack = fontInfo.stack;

    document.documentElement.style.setProperty('--app-font-family', fontStack);
    document.documentElement.style.setProperty('--font-cairo', fontStack);

    var overrideStyle = document.getElementById('albayan-active-font-override');
    if (!overrideStyle) {
      overrideStyle = document.createElement('style');
      overrideStyle.id = 'albayan-active-font-override';
      document.head.appendChild(overrideStyle);
    }
    overrideStyle.textContent = "body, button, input, select, textarea, table, .roster-table, .circle-card, .sidebar-menu, .content-header h1, h1, h2, h3, h4, h5, h6, span, p, a, div { font-family: " + fontStack + " !important; } .lucide, .nav-svg, svg, i[data-lucide] { font-family: inherit !important; }";

    try {
      localStorage.setItem('appFontFamily', fontKey);
    } catch(e) {}
  }
  window.applyAppFont = applyAppFont;

  // Initial Font Application on Page Load
  try {
    var savedFont = localStorage.getItem('appFontFamily') || 'Cairo';
    applyAppFont(savedFont);
  } catch(e) {}

  // 3. Global Safe Lucide Icon Renderer
  window.safeCreateIcons = function(options) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons(options);
      } catch (e) {
        console.warn("Lucide render error:", e);
      }
    }
  };

  // 3.5 Global High-Responsiveness Input Optimizer
  // Ensures zero-delay typing, instant Backspace deletion, and prevents Android IME composition traps
  function optimizeInputsProjectWide(root) {
    try {
      var scope = root || document;
      if (!scope.querySelectorAll) return;
      var inputs = scope.querySelectorAll("input:not([type='file']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']):not([type='hidden']), textarea");
      for (var i = 0; i < inputs.length; i++) {
        var inp = inputs[i];
        if (!inp.getAttribute('autocomplete') || inp.getAttribute('autocomplete') === 'on' || inp.getAttribute('autocomplete') === 'username' || inp.getAttribute('autocomplete') === 'name') {
          inp.setAttribute('autocomplete', 'off');
        }
        if (!inp.getAttribute('autocorrect')) inp.setAttribute('autocorrect', 'off');
        if (!inp.getAttribute('autocapitalize')) inp.setAttribute('autocapitalize', 'none');
        if (!inp.getAttribute('spellcheck')) inp.setAttribute('spellcheck', 'false');
        inp.style.touchAction = 'auto';
        inp.style.webkitUserSelect = 'text';
        inp.style.userSelect = 'text';
      }
    } catch (e) {}
  }
  window.optimizeInputsProjectWide = optimizeInputsProjectWide;

  // Automatic triggers on page lifecycle
  if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", function() {
      // Re-apply font to ensure newly rendered elements inherit it
      try {
        var currentFont = localStorage.getItem('appFontFamily') || 'Cairo';
        applyAppFont(currentFont);
      } catch(e) {}

      optimizeInputsProjectWide();

      window.safeCreateIcons();
      setTimeout(window.safeCreateIcons, 60);
      setTimeout(window.safeCreateIcons, 300);
      setTimeout(window.safeCreateIcons, 1000);

      // Mutation Observer to auto-render dynamic icons and optimize newly added inputs injected into DOM
      try {
        var debounceTimer = null;
        var observer = new MutationObserver(function(mutations) {
          var hasLucide = false;
          var hasInputs = false;
          for (var i = 0; i < mutations.length; i++) {
            var mut = mutations[i];
            if (mut.addedNodes && mut.addedNodes.length > 0) {
              for (var j = 0; j < mut.addedNodes.length; j++) {
                var node = mut.addedNodes[j];
                if (node.nodeType === 1) { // ELEMENT_NODE
                  if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || (node.querySelector && node.querySelector('input, textarea'))) {
                    hasInputs = true;
                  }
                  if (node.hasAttribute && node.hasAttribute('data-lucide')) {
                    hasLucide = true;
                  }
                  if (node.querySelector && node.querySelector('[data-lucide]')) {
                    hasLucide = true;
                  }
                }
              }
            }
          }
          if (hasInputs) {
            optimizeInputsProjectWide();
          }
          if (hasLucide) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(window.safeCreateIcons, 20);
          }
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      } catch(err) {}
    });

    window.addEventListener("load", function() {
      optimizeInputsProjectWide();
      window.safeCreateIcons();
    });
  }

  // 4. Mobile Environment & Universal API / Routing Proxy
  (function() {
    var isCapacitor = (typeof window.Capacitor !== 'undefined') ||
                      window.location.protocol === 'file:' || 
                      window.location.origin.includes('capacitor://') || 
                      (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80') && typeof window.navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(window.navigator.userAgent));

    window.IS_CAPACITOR_APP = isCapacitor;

    // Fetch CSRF token dynamically if missing
    if (typeof document !== 'undefined') {
      try {
        var metaCsrf = document.querySelector('meta[name="csrf-token"]');
        var curToken = metaCsrf ? metaCsrf.getAttribute('content') : '';
        if (!curToken && typeof window.fetch === 'function') {
          window.fetch('/api/csrf-token')
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (d && d.csrf_token) {
                if (metaCsrf) metaCsrf.setAttribute('content', d.csrf_token);
                try {
                  sessionStorage.setItem('albayan_csrf_token', d.csrf_token);
                  localStorage.setItem('albayan_csrf_token', d.csrf_token);
                } catch(e) {}
              }
            })
            .catch(function() {});
        }
      } catch(e) {}
    }

    // A. Intercept fetch for mobile LAN server routing & universal auth token injection
    if (typeof window.fetch === 'function') {
      var originalFetch = window.fetch;
      window.fetch = function(resource, init) {
        var url = resource;
        init = init || {};
        var isApi = (typeof resource === 'string' && resource.startsWith('/api/'));

        if (isApi) {
          var server = localStorage.getItem('albayan_server_url');
          if (server && isCapacitor) {
            url = server.replace(/\/$/, '') + resource;
          }

          // Inject Mobile Authentication Headers automatically
          var headers = init.headers ? new Headers(init.headers) : new Headers();
          var token = localStorage.getItem('albayan_saved_token');
          var userRaw = localStorage.getItem('albayan_logged_user');

          if (token && !headers.has('Authorization')) {
            headers.set('Authorization', 'Bearer ' + token);
            headers.set('X-Albayan-Token', token);
          }
          if (userRaw) {
            try {
              var u = JSON.parse(userRaw);
              if (u && u.username && !headers.has('X-Albayan-User')) {
                headers.set('X-Albayan-User', u.username);
              }
            } catch(e) {}
          }
          init.headers = headers;
          if (isCapacitor && server) {
            init.credentials = 'include';
          }
        }
        return originalFetch.call(this, url, init);
      };
    }

    // B. Route mapper for mobile standalone pages
    if (typeof document !== 'undefined') {
      document.addEventListener('click', function(e) {
        var link = e.target.closest('a');
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('http')) return;

        if (isCapacitor) {
          var routeMap = {
            '/': 'circles.html',
            '/circles': 'circles.html',
            '/roster': 'roster.html',
            '/admin': 'admin.html',
            '/analytics': 'analytics.html',
            '/certificates': 'certificates.html',
            '/users': 'users.html',
            '/more': 'more.html',
            '/settings': 'settings.html',
            '/student_cv': 'student_cv.html',
            '/mymark': 'mymark.html',
            '/about_me': 'about_me.html',
            '/about-me': 'about_me.html',
            '/exam': 'exam.html',
            '/student_settings': 'student_settings.html',
            '/student-settings': 'student_settings.html',
            '/login': 'login.html'
          };
          try {
            var u = JSON.parse(localStorage.getItem('albayan_logged_user') || '{}');
            if (u && u.role === 'student') {
              routeMap['/'] = 'mymark.html';
              routeMap['/circles'] = 'mymark.html';
              routeMap['/roster'] = 'mymark.html';
            }
          } catch(e) {}
          var cleanHref = href.split('?')[0];
          var query = href.includes('?') ? '?' + href.split('?')[1] : '';
          if (routeMap[cleanHref]) {
            e.preventDefault();
            var target = routeMap[cleanHref];
            // If already on the same page, don't re-navigate
            if (window.location.pathname.endsWith(target) || window.location.href.includes(target)) {
              if (target === 'circles.html' && typeof window.closeCircleRoster === 'function') {
                window.closeCircleRoster();
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
            window.location.href = target + query;
          }
        }
      }, true);
    }
  })();

  // 5. Intelligent Mobile Hardware & Gesture Back Button Handling
  window._albayanOverlayHistoryPushed = false;
  window.albayanPushModalState = function() {
    try {
      if (!window._albayanOverlayHistoryPushed && window.history && typeof window.history.pushState === 'function') {
        window._albayanOverlayHistoryPushed = true;
        window.history.pushState({ albayanOverlayOpen: true }, '');
      }
    } catch (e) {}
  };

  window.albayanHasOpenOverlay = function() {
    try {
      var selectSheet = document.getElementById('albayanSelectSheet');
      if (selectSheet && selectSheet.classList.contains('active')) return true;
      var modalSelectors = [
        '#cvAttachmentViewerModal.active',
        '#cellPopover',
        '.swal2-container',
        '.modal.show',
        '.modal.active',
        '.modal[style*="display: block"]',
        '.modal[style*="display: flex"]',
        '.dialog-overlay.active',
        '.bottom-sheet.active',
        '#moreBottomNavSheet.active',
        '#periodFilterDropdown',
        '#createCircleModal',
        '#addStudentModal',
        '#studentDetailsModal',
        '#floatingAuthModal',
        '#bulkAccompanyingSelectModal'
      ];
      for (var i = 0; i < modalSelectors.length; i++) {
        var elements = document.querySelectorAll(modalSelectors[i]);
        for (var j = elements.length - 1; j >= 0; j--) {
          var el = elements[j];
          if (el) {
            var style = window.getComputedStyle(el);
            var isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            if (isVisible) return true;
          }
        }
      }
    } catch (e) {}
    return false;
  };

  window.albayanHandleBack = function(fromPopState) {
    try {
      if (window.AlbayanBottomSheetSelect && window.AlbayanBottomSheetSelect.isOpen && window.AlbayanBottomSheetSelect.isOpen()) {
        window.AlbayanBottomSheetSelect.close();
        return true;
      }
      var cvModal = document.getElementById('cvAttachmentViewerModal');
      if (cvModal && cvModal.classList.contains('active')) {
        if (typeof window.closeFloatingFileViewer === 'function') window.closeFloatingFileViewer();
        else cvModal.classList.remove('active');
        return true;
      }
      // A. Check for open modals, dialogs, bottom sheets, or overlays
      var modalSelectors = [
        '#cellPopover',
        '.swal2-container',
        '.modal.show',
        '.modal.active',
        '.modal[style*="display: block"]',
        '.modal[style*="display: flex"]',
        '.dialog-overlay.active',
        '.bottom-sheet.active',
        '#moreBottomNavSheet.active',
        '#periodFilterDropdown',
        '#createCircleModal',
        '#addStudentModal',
        '#studentDetailsModal',
        '#floatingAuthModal',
        '#bulkAccompanyingSelectModal'
      ];

      for (var i = 0; i < modalSelectors.length; i++) {
        var elements = document.querySelectorAll(modalSelectors[i]);
        for (var j = elements.length - 1; j >= 0; j--) {
          var el = elements[j];
          if (el) {
            var style = window.getComputedStyle(el);
            var isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            if (isVisible) {
              if ((el.id === 'cellPopover' || el.id === 'cellPopoverBackdrop') && typeof window.hidePopover === 'function') {
                window.hidePopover(true);
                return true;
              }
              if (typeof window.closeModal === 'function' && el.id) {
                window.closeModal(el.id);
                return true;
              }
              if (el.classList.contains('swal2-container') && window.Swal) {
                window.Swal.close();
                return true;
              }
              var closeBtn = el.querySelector('.btn-close, .close-modal, [data-dismiss="modal"], .modal-close');
              if (closeBtn) {
                closeBtn.click();
                return true;
              }
              el.classList.remove('show', 'active');
              el.style.setProperty('display', 'none', 'important');
              return true;
            }
          }
        }
      }

      if (fromPopState) {
        return false;
      }

      // B. In circles.html, check if circle roster section is visible
      var rosterSection = document.getElementById('circleRosterSection');
      if (rosterSection && rosterSection.style.display !== 'none' && rosterSection.style.display !== '') {
        var isSingleTeacher = window.currentUserData && 
                              (window.currentUserData.role === 'teacher' || window.currentUserData.role === 'معلم') && 
                              window.currentUserData.teacher_circles_count === 1;
        if (!isSingleTeacher && typeof window.closeCircleRoster === 'function') {
          window.closeCircleRoster();
          return true;
        }
      }

      // C. Sub-pages back navigation to previous page or circles.html
      var path = (window.location.pathname || '').toLowerCase();
      var isRoot = path.endsWith('circles.html') ||
                   path.endsWith('login.html') ||
                   path.endsWith('/public/index.html') ||
                   path.endsWith('/index.html') ||
                   path === '/' ||
                   path === '';

      if (!isRoot) {
        if (window.history.length > 1) {
          window.history.back();
          return true;
        } else {
          window.location.href = 'circles.html';
          return true;
        }
      }

      // On root page with nothing open -> return false (allows Android to handle double-back exit)
      return false;
    } catch(err) {
      console.warn("albayanHandleBack error:", err);
      return false;
    }
  };

  // Cordova / Capacitor hardware back button & mobile edge-swipe gesture (popstate) listener
  if (typeof document !== 'undefined') {
    document.addEventListener('backbutton', function(e) {
      if (window.albayanHandleBack && window.albayanHandleBack(false)) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      }
    }, false);
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('popstate', function(e) {
      window._albayanOverlayHistoryPushed = false;
      if (window.albayanHasOpenOverlay && window.albayanHasOpenOverlay()) {
        window.albayanHandleBack(true);
      }
    });
  }

  // 6. Universal Clean Logout Handler
  window.albayanLogout = async function() {
    try {
      localStorage.removeItem('albayan_logged_user');
      localStorage.removeItem('albayan_saved_token');
      sessionStorage.clear();
    } catch(e) {}

    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch(e) {}

    var isCap = window.IS_CAPACITOR_APP || 
                window.location.protocol === 'file:' || 
                window.location.origin.includes('capacitor://') || 
                (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

    window.location.href = isCap ? 'login.html?logout=1' : '/login?logout=1';
  };
  window.logout = window.albayanLogout;
  window.confirmLogout = window.albayanLogout;

  // 7. Global Custom Bottom Sheet Picker (Replaces ALL native Android <select> popups)
  (function initGlobalBottomSheetSelect() {
    if (typeof document === 'undefined') return;

    var activeSelectEl = null;
    var SHEET_TITLES = {
      filterMonth: 'اختر الفترة',
      rosterCircleSelect: 'اختر الحلقة القرآنية',
      transferTargetCircle: 'نقل الطالب إلى حلقة',
      circleSelect: 'اختر الحلقة القرآنية',
      studentSelect: 'اختر الطالب',
      studentGradeRecordSelect: 'سجل الدرجات المرتبط',
      timeframeSelect: 'النطاق الزمني للتفوق',
      monthSelect: 'اختر الشهر',
      yearSelect: 'اختر السنة',
      limitSelect: 'العدد الأقصى',
      exportFormatSelect: 'صيغة التصدير',
      filterCirclesMonth: 'فترة تقييم الحلقات',
      filterStudentsMonth: 'فترة تقييم الطلاب',
      filterStudentCircle: 'تصفية حسب الحلقة',
      filterStudentMemo: 'تصفية حسب تقدير الحفظ',
      filterStudentAttendance: 'تصفية حسب الحضور',
      filterAnalyticsExamSelect: 'اختر الاختبار',
      filterStatus: 'تصفية حسب النتيجة',
      circleTeacher: 'تعيين معلم الحلقة',
      modalBulkExamTitleSelect: 'اختر الاختبار الشهري',
      modalBulkAccompanyingExamSelect: 'اختر الاختبار الشهري',
      popExamTitleSelect: 'اختر الاختبار',
      vqType: 'نوع السؤال',
      filterStudentCircleSelect: 'تصفية حسب الحلقة',
      userRole: 'الدور والصلاحيات',
      userActiveStatus: 'حالة الحساب',
      studentCircleSelect: 'الحلقة الدراسية',
      customPeriodYearSelect: 'اختر السنة'
    };

    var ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    var ICON_CALENDAR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    var ICON_BOOK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
    var ICON_LIST = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12h6"/></svg>';
    var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function injectSelectSheetStyles() {
      if (document.getElementById('albayan-bottom-sheet-select-css')) return;
      var style = document.createElement('style');
      style.id = 'albayan-bottom-sheet-select-css';
      style.textContent = [
        'select { -webkit-tap-highlight-color: transparent; cursor: pointer; }',
        '.ab-select-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000010; opacity: 0; visibility: hidden; transition: opacity 0.2s ease, visibility 0.2s ease; }',
        '.ab-select-backdrop.active { opacity: 1; visibility: visible; }',
        '.ab-select-sheet { position: fixed; left: 0; right: 0; bottom: 0; margin: 0 auto; max-width: 560px; max-height: 82vh; background: #FFFFFF; border-top: 1px solid rgba(15, 23, 42, 0.08); border-radius: 20px 20px 0 0; z-index: 1000015; transform: translateY(105%); transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1); display: flex; flex-direction: column; overflow: hidden; box-shadow: none !important; direction: rtl; font-family: inherit; }',
        '.ab-select-sheet.active { transform: translateY(0); }',
        '@media (min-width: 768px) { .ab-select-sheet { bottom: 20px; border-radius: 20px; border: 1px solid rgba(15, 23, 42, 0.1); max-height: 75vh; } }',
        '.ab-select-handle { width: 40px; height: 4px; border-radius: 99px; background: #CBD5E1; margin: 10px auto 4px; flex-shrink: 0; }',
        '.ab-select-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px 14px; border-bottom: 1px solid #E2E8F0; flex-shrink: 0; }',
        '.ab-select-header-text { flex: 1; min-width: 0; }',
        '.ab-select-title { margin: 0; font-size: 16px; font-weight: 800; color: #0F172A; line-height: 1.35; }',
        '.ab-select-subtitle { margin: 3px 0 0; font-size: 12.5px; font-weight: 600; color: #2563EB; line-height: 1.35; }',
        '.ab-select-close { width: 34px; height: 34px; min-height: 34px !important; padding: 0 !important; border-radius: 10px !important; background: #F8FAFC !important; background-image: none !important; border: 1px solid #E2E8F0 !important; color: #64748B !important; display: inline-flex !important; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; box-shadow: none !important; }',
        '.ab-select-close:hover { background: #F1F5F9 !important; color: #0F172A !important; transform: none !important; }',
        '.ab-select-close svg { margin: 0 !important; display: block; }',
        '.ab-select-list { padding: 12px 16px calc(18px + env(safe-area-inset-bottom, 0px)); overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 8px; }',
        '.ab-sheet-opt { width: 100%; min-height: 50px !important; padding: 12px 16px !important; border-radius: 12px !important; background: #FFFFFF !important; background-image: none !important; border: 1px solid #E2E8F0 !important; color: #0F172A !important; font-family: inherit; font-size: 14px; font-weight: 600; text-align: right; display: flex !important; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-shadow: none !important; transition: background-color 0.14s ease, border-color 0.14s ease; }',
        '.ab-sheet-opt:hover { transform: none !important; background: #F8FAFC !important; border-color: rgba(37, 99, 235, 0.35) !important; }',
        '.ab-sheet-opt.selected { background: #EFF6FF !important; border: 1.5px solid #2563EB !important; color: #1D4ED8 !important; font-weight: 800; }',
        '.ab-sheet-opt:disabled { opacity: 0.45; cursor: not-allowed; }',
        '.ab-sheet-opt-main { display: flex; align-items: center; gap: 11px; flex: 1; min-width: 0; }',
        '.ab-sheet-opt-icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; color: #64748B; flex-shrink: 0; }',
        '.ab-sheet-opt.selected .ab-sheet-opt-icon { color: #2563EB; }',
        '.ab-sheet-opt-icon svg, .ab-sheet-opt-check svg { margin: 0 !important; display: block; }',
        '.ab-sheet-opt-label { flex: 1; min-width: 0; line-height: 1.4; word-break: break-word; }',
        '.ab-sheet-opt-check { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; color: #2563EB; flex-shrink: 0; }',
        'html[data-theme="dark"] .ab-select-backdrop { background: rgba(2, 6, 23, 0.72); }',
        'html[data-theme="dark"] .ab-select-sheet { background: #1E293B; border-color: rgba(255, 255, 255, 0.08); }',
        'html[data-theme="dark"] .ab-select-handle { background: rgba(255, 255, 255, 0.22); }',
        'html[data-theme="dark"] .ab-select-header { border-bottom-color: rgba(255, 255, 255, 0.08); }',
        'html[data-theme="dark"] .ab-select-title { color: #F8FAFC; }',
        'html[data-theme="dark"] .ab-select-subtitle { color: #60A5FA; }',
        'html[data-theme="dark"] .ab-select-close { background: #0F172A !important; border-color: #334155 !important; color: #94A3B8 !important; }',
        'html[data-theme="dark"] .ab-sheet-opt { background: #0F172A !important; border-color: #334155 !important; color: #F1F5F9 !important; }',
        'html[data-theme="dark"] .ab-sheet-opt:hover { background: rgba(255, 255, 255, 0.04) !important; border-color: rgba(96, 165, 250, 0.4) !important; }',
        'html[data-theme="dark"] .ab-sheet-opt.selected { background: rgba(37, 99, 235, 0.18) !important; border-color: #3B82F6 !important; color: #60A5FA !important; }',
        'html[data-theme="dark"] .ab-sheet-opt-icon { color: #94A3B8; }',
        'html[data-theme="dark"] .ab-sheet-opt.selected .ab-sheet-opt-icon, html[data-theme="dark"] .ab-sheet-opt-check { color: #60A5FA; }'
      ].join('\n');
      (document.head || document.documentElement).appendChild(style);
    }

    function stripEmojis(text) {
      return String(text || '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function ensureDom() {
      injectSelectSheetStyles();
      var backdrop = document.getElementById('albayanSelectSheetBackdrop');
      var sheet = document.getElementById('albayanSelectSheet');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'albayanSelectSheetBackdrop';
        backdrop.className = 'ab-select-backdrop';
        backdrop.addEventListener('click', function(e) {
          e.stopPropagation();
          closeSelectSheet();
        });
        document.body.appendChild(backdrop);
      }
      if (!sheet) {
        sheet = document.createElement('div');
        sheet.id = 'albayanSelectSheet';
        sheet.className = 'ab-select-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.addEventListener('click', function(e) { e.stopPropagation(); });
        sheet.innerHTML =
          '<div class="ab-select-handle"></div>' +
          '<div class="ab-select-header">' +
            '<div class="ab-select-header-text">' +
              '<h3 class="ab-select-title" id="abSelectSheetTitle">اختر من القائمة</h3>' +
              '<p class="ab-select-subtitle" id="abSelectSheetSubtitle" style="display:none;"></p>' +
            '</div>' +
            '<button type="button" class="ab-select-close" id="abSelectSheetCloseBtn" aria-label="إغلاق">' + ICON_CLOSE + '</button>' +
          '</div>' +
          '<div class="ab-select-list" id="abSelectSheetList"></div>';
        document.body.appendChild(sheet);
        sheet.querySelector('#abSelectSheetCloseBtn').onclick = function(e) {
          e.stopPropagation();
          closeSelectSheet();
        };
      }
      return { backdrop: backdrop, sheet: sheet };
    }

    function resolveTitleAndSubtitle(selectEl) {
      var id = selectEl.id || '';
      var title = (selectEl.dataset && selectEl.dataset.sheetTitle) || SHEET_TITLES[id] || '';
      if (!title) {
        var group = selectEl.closest('.field, .form-group, .filter-item, .period-badge-group, .timeframe-row');
        var lbl = group ? group.querySelector('label, .form-label-sm, .section-label, .period-badge-label') : null;
        if (lbl) title = stripEmojis(lbl.textContent).replace(/[:*]+/g, '').trim();
      }
      if (!title) title = 'اختر من القائمة';

      var subtitle = (selectEl.dataset && selectEl.dataset.sheetSubtitle) || '';
      if (!subtitle && id === 'filterMonth' && window.AlbayanCycleEngine && typeof window.AlbayanCycleEngine.getConfig === 'function') {
        var cfg = window.AlbayanCycleEngine.getConfig();
        if (cfg.mode === 'term' || cfg.periodType === 'term') {
          var tm = cfg.termMonths || 3;
          subtitle = 'النظام الفصلي • ' + (tm === 2 ? 'شهران لكل فصل' : (tm + ' أشهر لكل فصل'));
        } else if (cfg.mode === 'weekly' || cfg.periodType === 'weekly') {
          subtitle = 'النظام الأسبوعي • 7 أيام لكل أسبوع';
        } else if (cfg.mode === 'yearly' || cfg.periodType === 'yearly') {
          subtitle = 'النظام السنوي الشامل';
        } else {
          subtitle = 'النظام الشهري • الأشهر الهجرية';
        }
      }
      return { title: title, subtitle: subtitle };
    }

    function resolveRowIcon(selectEl, optValue) {
      var id = (selectEl && selectEl.id) || '';
      if (id === 'filterMonth' || id === 'monthSelect' || id === 'yearSelect' || id === 'timeframeSelect' || id.indexOf('Month') !== -1) {
        return ICON_CALENDAR;
      }
      if (id.indexOf('Circle') !== -1 || id.indexOf('circle') !== -1 || String(optValue).indexOf('سجل') !== -1) {
        return ICON_BOOK;
      }
      return ICON_LIST;
    }

    function openForSelect(selectEl) {
      if (!selectEl || selectEl.disabled) return;
      var dom = ensureDom();
      activeSelectEl = selectEl;

      var meta = resolveTitleAndSubtitle(selectEl);
      var titleEl = document.getElementById('abSelectSheetTitle');
      var subEl = document.getElementById('abSelectSheetSubtitle');
      var listEl = document.getElementById('abSelectSheetList');

      if (titleEl) titleEl.textContent = meta.title;
      if (subEl) {
        if (meta.subtitle) {
          subEl.textContent = meta.subtitle;
          subEl.style.display = 'block';
        } else {
          subEl.textContent = '';
          subEl.style.display = 'none';
        }
      }

      if (listEl) {
        listEl.innerHTML = '';
        var opts = Array.from(selectEl.options || []);
        var currentVal = selectEl.value;

        opts.forEach(function(opt, idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          var isSelected = opt.value === currentVal || (idx === selectEl.selectedIndex && currentVal === opt.value);
          btn.className = 'ab-sheet-opt' + (isSelected ? ' selected' : '');
          btn.disabled = !!opt.disabled;

          var cleanText = stripEmojis(opt.textContent || opt.label || opt.value);
          var iconSvg = resolveRowIcon(selectEl, opt.value);

          var mainSpan = document.createElement('span');
          mainSpan.className = 'ab-sheet-opt-main';

          var iconSpan = document.createElement('span');
          iconSpan.className = 'ab-sheet-opt-icon';
          iconSpan.innerHTML = iconSvg;

          var labelSpan = document.createElement('span');
          labelSpan.className = 'ab-sheet-opt-label';
          labelSpan.textContent = cleanText;

          mainSpan.appendChild(iconSpan);
          mainSpan.appendChild(labelSpan);
          btn.appendChild(mainSpan);

          if (isSelected) {
            var chkSpan = document.createElement('span');
            chkSpan.className = 'ab-sheet-opt-check';
            chkSpan.innerHTML = ICON_CHECK;
            btn.appendChild(chkSpan);
          }

          btn.onclick = function() {
            if (opt.disabled) return;
            var changed = (selectEl.value !== opt.value);
            selectEl.value = opt.value;
            selectEl.selectedIndex = idx;
            closeSelectSheet();
            if (changed) {
              selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          };

          listEl.appendChild(btn);
        });
      }

      if (typeof window.albayanPushModalState === 'function') {
        window.albayanPushModalState();
      }
      dom.backdrop.classList.add('active');
      dom.sheet.classList.add('active');
      document.body.style.overflow = 'hidden';

      var activeBtn = listEl ? listEl.querySelector('.ab-sheet-opt.selected') : null;
      if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
        setTimeout(function() { activeBtn.scrollIntoView({ block: 'nearest' }); }, 60);
      }
    }

    function closeSelectSheet() {
      var backdrop = document.getElementById('albayanSelectSheetBackdrop');
      var sheet = document.getElementById('albayanSelectSheet');
      if (backdrop) backdrop.classList.remove('active');
      if (sheet) sheet.classList.remove('active');
      activeSelectEl = null;
      if (!document.querySelector('.bottom-sheet.active, .cv-viewer-overlay.active')) {
        document.body.style.overflow = '';
      }
    }

    function interceptSelectEvent(e) {
      var target = e.target;
      if (!target || target.tagName !== 'SELECT') return;
      if (target.disabled || target.multiple || target.hasAttribute('data-native-select')) return;
      if (e.type === 'keydown') {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          openForSelect(target);
        }
        return;
      }
      e.preventDefault();
      if (e.type === 'click') {
        e.stopPropagation();
        try { target.blur(); } catch (err) {}
        openForSelect(target);
      }
    }

    document.addEventListener('mousedown', interceptSelectEvent, true);
    document.addEventListener('pointerdown', interceptSelectEvent, true);
    document.addEventListener('click', interceptSelectEvent, true);
    document.addEventListener('keydown', interceptSelectEvent, true);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('albayanSelectSheet')?.classList.contains('active')) {
        closeSelectSheet();
      }
    });

    window.AlbayanBottomSheetSelect = {
      openForSelect: openForSelect,
      close: closeSelectSheet,
      isOpen: function() {
        var s = document.getElementById('albayanSelectSheet');
        return !!(s && s.classList.contains('active'));
      }
    };
  })();
})();

