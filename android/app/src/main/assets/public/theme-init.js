// theme-init.js — يُشغَّل فوراً في <head> لتطبيق الثيم والخطوط قبل عرض الصفحة وتوفير مشغل الأيقونات الموحد
(function() {
  // 1. Theme & Android Status Bar Synchronization
  window.albayanSyncStatusBar = function(activeTheme) {
    try {
      var resolved = activeTheme || document.documentElement.getAttribute('data-theme') || localStorage.getItem('appTheme') || 'light';
      var isDark = (resolved === 'dark');
      var barColor = isDark ? '#0F172A' : '#FFFFFF';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta && document.head) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      if (meta) {
        meta.setAttribute('content', barColor);
      }
      var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AlbayanExport;
      if (plugin && typeof plugin.setStatusBar === 'function') {
        plugin.setStatusBar({ color: barColor, darkIcons: !isDark }).catch(function() {});
      }
    } catch(e) {}
  };

  try {
    var theme = localStorage.getItem('appTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    }
    window.albayanSyncStatusBar(theme);
    document.addEventListener('DOMContentLoaded', function() {
      window.albayanSyncStatusBar(localStorage.getItem('appTheme') || 'light');
    });
  } catch(e) {}

  // 1b. Mobile Device Detection (persists across portrait & landscape rotation)
  window.albayanUpdateMobileClass = function() {
    try {
      var w = window.innerWidth || document.documentElement.clientWidth || 9999;
      var h = window.innerHeight || document.documentElement.clientHeight || 9999;
      var minDim = Math.min(w, h);
      var isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
                    ('ontouchstart' in window && navigator.maxTouchPoints > 0);
      var isMobileUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
      var isMobile = (w <= 768) || (isTouch && minDim <= 560) || (isMobileUA && minDim <= 600);
      if (isMobile) {
        document.documentElement.classList.add('is-mobile-device');
      } else {
        document.documentElement.classList.remove('is-mobile-device');
      }
    } catch(e) {}
  };
  window.albayanUpdateMobileClass();
  window.addEventListener('resize', window.albayanUpdateMobileClass);
  window.addEventListener('orientationchange', function() {
    setTimeout(window.albayanUpdateMobileClass, 60);
  });

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
  window.albayanPushOverlayHistory = window.albayanPushModalState;

  window.albayanHasOpenOverlay = function() {
    try {
      var selectSheet = document.getElementById('albayanSelectSheet');
      if (selectSheet && selectSheet.classList.contains('active')) return true;
      var moreMenu = document.getElementById('circlesMoreMenuDropdown');
      if (moreMenu && moreMenu.classList.contains('open')) return true;
      var aiHistoryDrawer = document.getElementById('aiHistoryDrawer');
      if (aiHistoryDrawer && aiHistoryDrawer.classList.contains('open')) return true;
      var aiSettingsModal = document.getElementById('aiProviderSettingsModal');
      if (aiSettingsModal && window.getComputedStyle(aiSettingsModal).display !== 'none') return true;
      var modalSelectors = [
        '#cvAttachmentViewerModal.active',
        '#cellPopover',
        '.swal2-container',
        '.modal.show',
        '.modal.active',
        '.modal[style*="display: block"]',
        '.modal[style*="display: flex"]',
        '.modal-overlay.show',
        '.modal-overlay.active',
        '.modal-overlay[style*="display: block"]',
        '.modal-overlay[style*="display: flex"]',
        '.dialog-overlay.active',
        '.bottom-sheet.active',
        '#moreBottomNavSheet.active',
        '#periodFilterDropdown',
        '#circleModal',
        '#createCircleModal',
        '#quickAddStudentModal',
        '#studentHistoryModal',
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
      var moreMenu = document.getElementById('circlesMoreMenuDropdown');
      if (moreMenu && moreMenu.classList.contains('open')) {
        if (typeof window.closeCirclesMoreMenu === 'function') window.closeCirclesMoreMenu();
        else moreMenu.classList.remove('open');
        return true;
      }
      var aiHistoryDrawer = document.getElementById('aiHistoryDrawer');
      if (aiHistoryDrawer && aiHistoryDrawer.classList.contains('open')) {
        if (typeof window.closeAiHistoryDrawer === 'function') window.closeAiHistoryDrawer();
        else aiHistoryDrawer.classList.remove('open');
        return true;
      }
      var aiSettingsModal = document.getElementById('aiProviderSettingsModal');
      if (aiSettingsModal && window.getComputedStyle(aiSettingsModal).display !== 'none') {
        if (typeof window.closeAiProviderSettingsModal === 'function') window.closeAiProviderSettingsModal();
        else aiSettingsModal.style.display = 'none';
        return true;
      }
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
        '.modal-overlay.show',
        '.modal-overlay.active',
        '.modal-overlay[style*="display: block"]',
        '.modal-overlay[style*="display: flex"]',
        '.dialog-overlay.active',
        '.bottom-sheet.active',
        '#moreBottomNavSheet.active',
        '#periodFilterDropdown',
        '#circleModal',
        '#createCircleModal',
        '#quickAddStudentModal',
        '#studentHistoryModal',
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
      localStorage.removeItem('albayan_active_circle_id');
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

  // 7. Global Centered 1-Column Floating Select Menu (Zero Scroll, Options Only)
  (function initGlobalBottomSheetSelect() {
    if (typeof document === 'undefined') return;

    var activeSelectEl = null;
    var ICON_CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    function injectSelectSheetStyles() {
      if (document.getElementById('albayan-bottom-sheet-select-css')) return;
      var style = document.createElement('style');
      style.id = 'albayan-bottom-sheet-select-css';
      style.textContent = [
        'select { -webkit-tap-highlight-color: transparent; cursor: pointer; }',
        '.ab-select-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.42); z-index: 1000010; display: none; }',
        '.ab-select-backdrop.active { display: block; }',
        '.ab-select-sheet { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.97); width: min(88vw, 330px); overflow: visible; max-height: none; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 18px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18); z-index: 1000015; display: none; direction: rtl; font-family: inherit; opacity: 0; transition: opacity 0.16s ease, transform 0.16s ease; }',
        '.ab-select-sheet.active { display: block; opacity: 1; transform: translate(-50%, -50%) scale(1); }',
        '.ab-select-list { display: flex; flex-direction: column; width: 100%; padding: 10px; gap: 5px; box-sizing: border-box; }',
        '.ab-select-list.ab-dense-list { padding: 8px; gap: 3px; }',
        '.ab-sheet-opt { width: 100%; height: 42px !important; min-height: 42px !important; max-height: 42px !important; padding: 0 14px !important; margin: 0 !important; border-radius: 10px !important; background: transparent !important; background-image: none !important; border: none !important; color: #0F172A !important; font-family: inherit; font-size: 14px !important; font-weight: 600; text-align: right; display: flex !important; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; box-shadow: none !important; transition: background-color 0.12s ease, color 0.12s ease; }',
        '.ab-select-list.ab-dense-list .ab-sheet-opt { height: 34px !important; min-height: 34px !important; max-height: 34px !important; padding: 0 12px !important; font-size: 13px !important; border-radius: 9px !important; }',
        '.ab-sheet-opt:hover { transform: none !important; background: #F8FAFC !important; color: #0F172A !important; }',
        '.ab-sheet-opt.selected { background: #EFF6FF !important; color: #1D4ED8 !important; font-weight: 700 !important; }',
        '.ab-sheet-opt:disabled { opacity: 0.45; cursor: not-allowed; }',
        '.ab-sheet-opt-label { flex: 1; min-width: 0; white-space: nowrap; overflow: visible; line-height: 1.3; text-align: right; }',
        '.ab-sheet-opt-check { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; color: #2563EB; flex-shrink: 0; }',
        '.ab-sheet-opt-check svg { margin: 0 !important; display: block; }',
        'html[data-theme="dark"] .ab-select-backdrop { background: rgba(2, 6, 23, 0.56); }',
        'html[data-theme="dark"] .ab-select-sheet { background: #1E293B; border-color: #334155; box-shadow: 0 18px 44px rgba(0, 0, 0, 0.48); }',
        'html[data-theme="dark"] .ab-sheet-opt { color: #F1F5F9 !important; }',
        'html[data-theme="dark"] .ab-sheet-opt:hover { background: rgba(255, 255, 255, 0.06) !important; color: #F8FAFC !important; }',
        'html[data-theme="dark"] .ab-sheet-opt.selected { background: rgba(37, 99, 235, 0.22) !important; color: #60A5FA !important; }',
        'html[data-theme="dark"] .ab-sheet-opt-check { color: #60A5FA; }'
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
        sheet.setAttribute('role', 'listbox');
        sheet.addEventListener('click', function(e) { e.stopPropagation(); });
        sheet.innerHTML = '<div class="ab-select-list" id="abSelectSheetList"></div>';
        document.body.appendChild(sheet);
      }
      return { backdrop: backdrop, sheet: sheet };
    }

    function openForSelect(selectEl) {
      if (!selectEl || selectEl.disabled) return;
      var dom = ensureDom();
      activeSelectEl = selectEl;

      var listEl = document.getElementById('abSelectSheetList');
      var opts = Array.from(selectEl.options || []);
      var isDense = opts.length > 6;

      if (listEl) {
        listEl.innerHTML = '';
        listEl.className = isDense ? 'ab-select-list ab-dense-list' : 'ab-select-list';
        var currentVal = selectEl.value;

        opts.forEach(function(opt, idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          var isSelected = opt.value === currentVal || (idx === selectEl.selectedIndex && currentVal === opt.value);
          btn.className = 'ab-sheet-opt' + (isSelected ? ' selected' : '');
          btn.disabled = !!opt.disabled;

          var cleanText = stripEmojis(opt.textContent || opt.label || opt.value);
          var labelSpan = document.createElement('span');
          labelSpan.className = 'ab-sheet-opt-label';
          labelSpan.textContent = cleanText;
          btn.appendChild(labelSpan);

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
    }

    function closeSelectSheet() {
      var backdrop = document.getElementById('albayanSelectSheetBackdrop');
      var sheet = document.getElementById('albayanSelectSheet');
      if (backdrop) backdrop.classList.remove('active');
      if (sheet) sheet.classList.remove('active');
      activeSelectEl = null;
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

  // 8. Global Real-Time RBAC Permissions Engine (Web + Capacitor APK + Firebase)
  (function initAlbayanPermissions() {
    var FB_USERS_URL = 'https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';

    function normName(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function parsePermissions(raw) {
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string' && raw.trim()) {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch (e) {
          return raw.split(',').map(function(x) { return x.trim(); }).filter(Boolean);
        }
      }
      return null;
    }

    function getCurrentUser() {
      try {
        var raw = localStorage.getItem('albayan_logged_user');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    function isStaffPage() {
      var p = (window.location.pathname || window.location.href || '').toLowerCase();
      if (p.indexOf('login') !== -1 || p.indexOf('mymark') !== -1 || p.indexOf('about_me') !== -1 ||
          p.indexOf('about-me') !== -1 || p.indexOf('exam.html') !== -1 || p.indexOf('student_settings') !== -1 ||
          p.endsWith('/index.html') || p === '/' || p === '') {
        return false;
      }
      return true;
    }

    function hasPermission(permKey, userObj) {
      var u = userObj || getCurrentUser();
      if (!u) return false;
      if (u.role === 'student') return false;
      var isSuper = Number(u.is_superadmin) === 1 || u.is_superadmin === true;
      if (isSuper) return true;

      var perms = parsePermissions(u.permissions);
      if (u.role === 'admin' && perms === null) return true;
      if (perms !== null) {
        return perms.indexOf(permKey) !== -1;
      }

      // Legacy fallback if permissions field was never set
      if (u.role === 'supervisor') {
        return ['circles', 'all_circles', 'exams', 'analytics', 'student_cv'].indexOf(permKey) !== -1;
      }
      return ['circles', 'exams', 'analytics', 'student_cv'].indexOf(permKey) !== -1;
    }

    function setElVisible(el, visible, displayVal) {
      if (!el) return;
      if (visible) {
        if (el.getAttribute('data-rbac-hidden') === '1') {
          el.removeAttribute('data-rbac-hidden');
          el.style.removeProperty('display');
          if (displayVal) el.style.display = displayVal;
        }
      } else {
        el.setAttribute('data-rbac-hidden', '1');
        el.style.setProperty('display', 'none', 'important');
      }
    }

    function isAdminUser(userObj) {
      var u = userObj || getCurrentUser();
      if (!u) return false;
      return u.role === 'admin' || Number(u.is_superadmin) === 1 || u.is_superadmin === true;
    }

    function canManageCircles(userObj) {
      var u = userObj || getCurrentUser();
      if (!u || u.role === 'student') return false;
      if (isAdminUser(u)) return true;
      return u.role === 'supervisor' || hasPermission('all_circles', u) || hasPermission('users', u);
    }

    function normalizeEntityUid(val) {
      if (val === undefined || val === null || val === '') return '';
      return String(val).replace(/^users_/i, '').trim();
    }

    function filterCirclesForUser(circlesList, userObj, usersList) {
      if (!Array.isArray(circlesList)) return [];
      var u = userObj || getCurrentUser();
      if (!u) return circlesList;
      if (hasPermission('all_circles', u)) return circlesList;

      var cachedUsers = Array.isArray(usersList) ? usersList : [];
      if (cachedUsers.length === 0) {
        try { cachedUsers = JSON.parse(localStorage.getItem('cached_users_list') || '[]'); } catch (e) {}
      }

      var myId = normalizeEntityUid(u.id);
      var myNames = [];
      if (u.username) myNames.push(normName(u.username));
      if (u.display_name && normName(u.display_name) !== normName(u.username)) {
        myNames.push(normName(u.display_name));
      }

      if (!myId && myNames.length > 0 && cachedUsers.length > 0) {
        for (var k = 0; k < cachedUsers.length; k++) {
          var cu = cachedUsers[k];
          if (!cu || cu.deleted) continue;
          var cuName = normName(cu.username || cu.display_name || cu.name);
          if (cuName && myNames.indexOf(cuName) !== -1) {
            myId = normalizeEntityUid(cu.id !== undefined ? cu.id : cu.local_id);
            break;
          }
        }
      }

      var userMap = {};
      for (var m = 0; m < cachedUsers.length; m++) {
        var usr = cachedUsers[m];
        if (!usr || usr.deleted) continue;
        var uid = normalizeEntityUid(usr.id !== undefined ? usr.id : usr.local_id);
        if (uid) userMap[uid] = usr;
      }

      return circlesList.filter(function(c) {
        if (!c || c.deleted || c.is_deleted === 1 || c.is_deleted === true) return false;
        var tid = normalizeEntityUid(c.teacher_id);
        if (myId && tid && tid === myId) return true;
        var teacherObj = tid ? userMap[tid] : null;
        var teacherUserNames = [];
        if (c.teacher_name) teacherUserNames.push(normName(c.teacher_name));
        if (c.teacher) teacherUserNames.push(normName(c.teacher));
        if (teacherObj) {
          if (teacherObj.username) teacherUserNames.push(normName(teacherObj.username));
          if (teacherObj.display_name) teacherUserNames.push(normName(teacherObj.display_name));
        }
        for (var n = 0; n < myNames.length; n++) {
          if (myNames[n] && teacherUserNames.indexOf(myNames[n]) !== -1) return true;
        }
        return false;
      });
    }

    function applyNavPermissions(userObj) {
      if (typeof document === 'undefined' || !isStaffPage()) return;
      var u = userObj || getCurrentUser();
      if (!u || u.role === 'student') return;

      var canCircles = hasPermission('circles', u);
      var canExams = hasPermission('exams', u);
      var canAnalytics = hasPermission('analytics', u);
      var canCv = hasPermission('student_cv', u);
      var canUsers = hasPermission('users', u);
      var canManageC = canManageCircles(u);

      // Student CV links (Sidebar + Bottom Nav + Mobile Nav)
      var cvSelectors = '#studentCvMenuLink, #mobileNavStudentCv, a[href*="student_cv"], a[href*="/student-cv"]';
      var cvLinks = document.querySelectorAll(cvSelectors);
      for (var i = 0; i < cvLinks.length; i++) {
        setElVisible(cvLinks[i], canCv);
      }

      // Users Management links (Sidebar + More Page + Bottom Nav)
      var usersSelectors = '#usersMenuLink, #moreUsersLink, #linkUsers, a[href*="users.html"], a[href="/users"]';
      var usersLinks = document.querySelectorAll(usersSelectors);
      for (var j = 0; j < usersLinks.length; j++) {
        setElVisible(usersLinks[j], canUsers);
      }

      // Exams links
      var examSelectors = 'a[href*="admin.html"], a[href="/admin"], .bottom-nav-item[data-page="admin"]';
      var examLinks = document.querySelectorAll(examSelectors);
      for (var k = 0; k < examLinks.length; k++) {
        setElVisible(examLinks[k], canExams);
      }

      // Analytics links (Sidebar + Bottom Nav + Circles 3-dot Menu)
      var analyticsSelectors = 'a[href*="analytics.html"], a[href="/analytics"], .bottom-nav-item[data-page="analytics"], #menuItemCircleStats, #menuItemStudentStats';
      var analyticsLinks = document.querySelectorAll(analyticsSelectors);
      for (var m = 0; m < analyticsLinks.length; m++) {
        setElVisible(analyticsLinks[m], canAnalytics);
      }

      // Circles links
      var circleSelectors = '#mobileNavCircles, .bottom-nav-item[data-page="circles"], .sidebar-menu a[href*="circles.html"], .sidebar-menu a[href="/circles"], .sidebar-nav a[href*="circles.html"]';
      var circleLinks = document.querySelectorAll(circleSelectors);
      for (var n = 0; n < circleLinks.length; n++) {
        setElVisible(circleLinks[n], canCircles);
      }

      // Circle management (Create / Edit / Delete circles) restricted to Admin / Supervisor / all_circles / users
      var addCircleBtn = document.getElementById('menuItemAddCircle');
      if (addCircleBtn) {
        setElVisible(addCircleBtn, canManageC);
      }
      var moreMenuWrap = document.getElementById('circlesMoreMenuWrap');
      if (moreMenuWrap) {
        setElVisible(moreMenuWrap, canManageC || canAnalytics);
      }
    }

    function getFallbackPage(u) {
      if (hasPermission('circles', u)) return 'circles.html';
      if (hasPermission('exams', u)) return 'admin.html';
      if (hasPermission('analytics', u)) return 'analytics.html';
      if (hasPermission('student_cv', u)) return 'student_cv.html';
      if (hasPermission('users', u)) return 'users.html';
      return 'more.html';
    }

    function enforcePageAccess(userObj) {
      if (typeof window === 'undefined' || !isStaffPage()) return true;
      var u = userObj || getCurrentUser();
      if (!u || (!u.username && !u.student_name && !u.role)) {
        window.location.replace('login.html');
        return false;
      }
      if (u.role === 'student') {
        window.location.replace('mymark.html');
        return false;
      }

      var path = (window.location.pathname || window.location.href || '').toLowerCase();
      var denied = false;
      if (path.indexOf('student_cv') !== -1 || path.indexOf('student-cv') !== -1) {
        denied = !hasPermission('student_cv', u);
      } else if (path.indexOf('admin.html') !== -1 || path.endsWith('/admin')) {
        denied = !hasPermission('exams', u);
      } else if (path.indexOf('analytics.html') !== -1 || path.endsWith('/analytics')) {
        denied = !hasPermission('analytics', u);
      } else if (path.indexOf('users.html') !== -1 || path.endsWith('/users')) {
        denied = !hasPermission('users', u);
      } else if ((path.indexOf('circles.html') !== -1 || path.endsWith('/circles') || path.indexOf('roster.html') !== -1 || path.endsWith('/roster')) && !hasPermission('circles', u)) {
        denied = true;
      }

      if (denied) {
        var target = getFallbackPage(u);
        if (path.indexOf(target) === -1) {
          window.location.replace(target);
        }
        return false;
      }
      return true;
    }

    async function refreshFromCloud() {
      if (!isStaffPage()) return;
      var u = getCurrentUser();
      if (!u || u.role === 'student' || !u.username) return;

      // 1. Try local server /api/me first if reachable
      try {
        var c1 = new AbortController();
        var t1 = setTimeout(function() { c1.abort(); }, 1500);
        var r1 = await fetch('/api/me', { signal: c1.signal });
        clearTimeout(t1);
        if (r1.ok) {
          var me = await r1.json();
          if (me && me.logged_in) {
            var parsedApiPerms = parsePermissions(me.permissions);
            var mergedApi = Object.assign({}, u, me, {
              permissions: parsedApiPerms !== null ? parsedApiPerms : u.permissions
            });
            try { localStorage.setItem('albayan_logged_user', JSON.stringify(mergedApi)); } catch (e) {}
            applyNavPermissions(mergedApi);
            enforcePageAccess(mergedApi);
            window.dispatchEvent(new CustomEvent('albayan:permissions-updated', { detail: mergedApi }));
            return;
          }
        }
      } catch (e) {}

      // 2. Sync live from Firebase RTDB /users.json
      try {
        var c2 = new AbortController();
        var t2 = setTimeout(function() { c2.abort(); }, 3500);
        var r2 = await fetch(FB_USERS_URL, { signal: c2.signal, cache: 'no-store' });
        clearTimeout(t2);
        if (!r2.ok) return;
        var raw = await r2.json();
        if (!raw || typeof raw !== 'object') return;
        var rawEntries = Array.isArray(raw)
          ? raw.map(function(item, idx) { return [String(idx), item]; })
          : Object.entries(raw);
        var targetUid = normalizeEntityUid(u.id);
        var targetNorm = normName(u.username);
        var targetDisplayNorm = normName(u.display_name);
        var matched = null;
        for (var i = 0; i < rawEntries.length; i++) {
          var k = rawEntries[i][0];
          var cand = rawEntries[i][1];
          if (!cand || typeof cand !== 'object') continue;
          if (cand.deleted || cand.is_deleted === 1 || cand.is_deleted === '1' || cand.is_deleted === true) continue;
          var candUid = normalizeEntityUid(cand.id !== undefined ? cand.id : (cand.local_id !== undefined ? cand.local_id : k));
          if (targetUid && candUid && candUid === targetUid) {
            matched = Object.assign({}, cand, { id: cand.id !== undefined ? cand.id : candUid });
            break;
          }
          var candName = normName(cand.username || cand.display_name || cand.name);
          var candDisp = normName(cand.display_name || cand.username || cand.name);
          if ((targetNorm && (candName === targetNorm || candDisp === targetNorm)) ||
              (targetDisplayNorm && (candName === targetDisplayNorm || candDisp === targetDisplayNorm))) {
            matched = Object.assign({}, cand, { id: cand.id !== undefined ? cand.id : candUid });
          }
        }
        if (!matched) return;

        if (matched.is_active === 0 || matched.is_active === '0' || matched.is_active === false) {
          if (typeof window.albayanLogout === 'function') {
            window.albayanLogout();
          }
          return;
        }

        var nextPerms = parsePermissions(matched.permissions);
        var resolvedId = normalizeEntityUid(matched.id !== undefined ? matched.id : u.id);
        var numId = Number(resolvedId);
        var finalId = (resolvedId && !Number.isNaN(numId) && String(numId) === resolvedId) ? numId : (resolvedId || u.id);
        var updatedUser = Object.assign({}, u, {
          id: finalId,
          username: matched.username || u.username,
          display_name: matched.display_name || matched.username || u.display_name,
          role: matched.role || u.role,
          is_superadmin: (matched.is_superadmin === 1 || matched.is_superadmin === '1' || matched.is_superadmin === true) ? 1 : 0,
          permissions: nextPerms !== null ? nextPerms : u.permissions
        });
        try {
          localStorage.setItem('albayan_logged_user', JSON.stringify(updatedUser));
          sessionStorage.setItem('albayan_me_cache', JSON.stringify(updatedUser));
        } catch (e) {}

        applyNavPermissions(updatedUser);
        enforcePageAccess(updatedUser);
        window.dispatchEvent(new CustomEvent('albayan:permissions-updated', { detail: updatedUser }));
      } catch (e) {}
    }

    window.AlbayanPermissions = {
      parsePermissions: parsePermissions,
      getCurrentUser: getCurrentUser,
      isAdminUser: isAdminUser,
      canManageCircles: canManageCircles,
      filterCirclesForUser: filterCirclesForUser,
      hasPermission: hasPermission,
      applyNavPermissions: applyNavPermissions,
      enforcePageAccess: enforcePageAccess,
      refreshFromCloud: refreshFromCloud
    };

    // Enforce immediately before page content flashes
    enforcePageAccess();

    if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', function() {
        applyNavPermissions();
        enforcePageAccess();
        refreshFromCloud();
      });
    }
  })();
})();

