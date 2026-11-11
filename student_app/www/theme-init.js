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
      dbScript.src = isStandalone ? 'mobile-db.js?v=9.0' : '/static/mobile-db.js?v=9.0';
      document.head.appendChild(dbScript);
    }

    if (typeof document !== 'undefined') {
      if (!document.querySelector('link[rel="manifest"]')) {
        var manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/static/manifest.json';
        document.head.appendChild(manifestLink);
      }
      if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/static/sw.js').catch(function() {});
        });
      }
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
  window.albayanHandleBack = function() {
    try {
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
          if (el && el.offsetParent !== null && window.getComputedStyle(el).display !== 'none') {
            if (typeof window.closeModal === 'function' && el.id) {
              window.closeModal(el.id);
              return true;
            }
            if (typeof window.hidePopover === 'function' && el.id === 'cellPopover') {
              window.hidePopover();
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
            el.style.display = 'none';
            return true;
          }
        }
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

  // Cordova / Capacitor event listener
  if (typeof document !== 'undefined') {
    document.addEventListener('backbutton', function(e) {
      if (window.albayanHandleBack && window.albayanHandleBack()) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      }
    }, false);
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
})();

