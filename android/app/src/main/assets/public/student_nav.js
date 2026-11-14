/**
 * Albayan Quran School - Student Exclusive Navigation Engine
 * مدرسة البيان لتعليم القرآن الكريم - شريط تنقل بوابة الطالب
 */

(function () {
  function injectNavStyles() {
    if (document.getElementById("studentNavStyles")) return;
    var style = document.createElement("style");
    style.id = "studentNavStyles";
    style.textContent = `
      #studentBottomNav {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        height: 60px !important;
        max-height: 60px !important;
        background: rgba(255, 255, 255, 0.96) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border-top: 1px solid rgba(226, 232, 240, 0.85) !important;
        box-shadow: none !important;
        z-index: 99999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        direction: rtl !important;
      }
      html[data-theme="dark"] #studentBottomNav {
        background: rgba(15, 23, 42, 0.96) !important;
        border-top: 1px solid rgba(51, 65, 85, 0.85) !important;
        box-shadow: none !important;
      }
      #studentBottomNav .student-nav-inner {
        width: 100% !important;
        max-width: 540px !important;
        height: 100% !important;
        margin: 0 auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-around !important;
        padding: 0 4px !important;
        box-sizing: border-box !important;
      }
      #studentBottomNav .bottom-nav-item {
        flex: 1 !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 3px !important;
        padding: 4px 2px !important;
        color: #64748b !important;
        text-decoration: none !important;
        border-radius: 12px !important;
        background: transparent !important;
        font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.1 !important;
        border: none !important;
        outline: none !important;
        box-sizing: border-box !important;
        cursor: pointer !important;
        -webkit-tap-highlight-color: transparent !important;
        transition: color 0.2s ease, transform 0.15s ease !important;
      }
      #studentBottomNav .bottom-nav-item:active {
        transform: scale(0.92) !important;
      }
      #studentBottomNav .bottom-nav-item.active {
        color: #2563eb !important;
      }
      html[data-theme="dark"] #studentBottomNav .bottom-nav-item {
        color: #94a3b8 !important;
      }
      html[data-theme="dark"] #studentBottomNav .bottom-nav-item.active {
        color: #60a5fa !important;
      }
      #studentBottomNav .nav-icon-wrap,
      #studentBottomNav .bottom-nav-icon {
        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
        min-height: 28px !important;
        max-width: 28px !important;
        max-height: 28px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        border-radius: 10px !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        transition: background 0.2s ease !important;
      }
      #studentBottomNav .bottom-nav-item.active .nav-icon-wrap,
      #studentBottomNav .bottom-nav-item.active .bottom-nav-icon {
        background: rgba(37, 99, 235, 0.1) !important;
      }
      html[data-theme="dark"] #studentBottomNav .bottom-nav-item.active .nav-icon-wrap,
      html[data-theme="dark"] #studentBottomNav .bottom-nav-item.active .bottom-nav-icon {
        background: rgba(96, 165, 250, 0.15) !important;
      }
      #studentBottomNav .nav-icon-wrap svg,
      #studentBottomNav .nav-icon-wrap i,
      #studentBottomNav .bottom-nav-icon svg,
      #studentBottomNav .bottom-nav-icon i,
      #studentBottomNav svg.lucide {
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        min-height: 20px !important;
        max-width: 20px !important;
        max-height: 20px !important;
        stroke-width: 2.2px !important;
        stroke: currentColor !important;
        display: block !important;
        flex-shrink: 0 !important;
      }
      #studentBottomNav span {
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.1 !important;
        white-space: nowrap !important;
        text-align: center !important;
      }
    `;
    document.head.appendChild(style);
  }

  function renderStudentNav() {
    if (document.getElementById("studentBottomNav")) return;
    injectNavStyles();

    var path = window.location.pathname || "";
    var isStandalone = window.location.protocol === "file:" || (window.location.hostname === "localhost" && !window.location.port) || window.Capacitor;

    var current = "mymark";
    if (path.includes("about_me") || path.includes("about-me")) {
      current = "about_me";
    } else if (path.includes("student_settings") || path.includes("student-settings")) {
      current = "settings";
    } else if (path.includes("exam") || path.includes("index.html") || (path.endsWith("/") && !path.includes("mymark"))) {
      current = "exam";
    } else if (path.includes("mymark")) {
      current = "mymark";
    }

    var mymarkUrl = isStandalone ? "mymark.html" : "/mymark";
    var aboutMeUrl = isStandalone ? "about_me.html" : "/about_me";
    var examUrl = isStandalone ? "exam.html" : "/";
    var settingsUrl = isStandalone ? "student_settings.html" : "/student_settings";

    var nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav";
    nav.id = "studentBottomNav";
    nav.setAttribute("aria-label", "شريط تنقل بوابة الطالب");
    nav.innerHTML = `
      <div class="student-nav-inner">
        <a href="${mymarkUrl}" class="bottom-nav-item ${current === 'mymark' ? 'active' : ''}" id="studentNavMymark">
          <div class="nav-icon-wrap bottom-nav-icon">
            <i data-lucide="award" style="width:20px; height:20px;"></i>
          </div>
          <span>درجاتي</span>
        </a>
        <a href="${aboutMeUrl}" class="bottom-nav-item ${current === 'about_me' ? 'active' : ''}" id="studentNavAboutMe">
          <div class="nav-icon-wrap bottom-nav-icon">
            <i data-lucide="book-open" style="width:20px; height:20px;"></i>
          </div>
          <span>سجلي</span>
        </a>
        <a href="${examUrl}" class="bottom-nav-item ${current === 'exam' ? 'active' : ''}" id="studentNavExam">
          <div class="nav-icon-wrap bottom-nav-icon">
            <i data-lucide="file-check-2" style="width:20px; height:20px;"></i>
          </div>
          <span>الاختبار</span>
        </a>
        <a href="${settingsUrl}" class="bottom-nav-item ${current === 'settings' ? 'active' : ''}" id="studentNavSettings">
          <div class="nav-icon-wrap bottom-nav-icon">
            <i data-lucide="settings" style="width:20px; height:20px;"></i>
          </div>
          <span>إعداداتي</span>
        </a>
      </div>
    `;

    document.body.appendChild(nav);

    if (window.lucide && typeof lucide.createIcons === "function") {
      try { lucide.createIcons({ root: nav }); } catch (e) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderStudentNav);
  } else {
    renderStudentNav();
  }
})();
