/* ====================================================
   STUDENT EXAM APP - MAIN COORDINATOR (منسق الاختبار)
   يربط بين الوحدات البرمجية المتخصصة:
   - exam_sound.js: المؤثرات الصوتية الفورية
   - exam_timer.js: عداد الوقت وتنبيهات الشاشة
   - exam_questions.js: بناء وتتبع وإدارة الأسئلة
   - exam_sync.js: المزامنة السحابية وبنك الأسئلة والتصحيح
==================================================== */

/* ====================================================
   THEME TOGGLER (DARK / LIGHT MODE)
==================================================== */
function initExamTheme() {
  const currentTheme = localStorage.getItem("appTheme") || localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme") || "light";
  applyExamTheme(currentTheme);
}

function toggleExamTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyExamTheme(next);
}

function applyExamTheme(theme) {
  const isDark = (theme === "dark");
  try {
    localStorage.setItem("appTheme", theme);
    localStorage.setItem("theme", theme);
  } catch(e) {}

  document.documentElement.setAttribute("data-theme", theme);
  if (isDark) {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
    document.body.classList.remove("dark-theme");
  }

  const icon = document.getElementById("examThemeIcon");
  const text = document.getElementById("examThemeText");
  const btn = document.getElementById("examThemeToggleBtn");

  if (icon) icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
  if (text) text.textContent = isDark ? "نهاري" : "ليلي";
  if (btn) {
    btn.title = isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي";
    btn.setAttribute("aria-label", btn.title);
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", isDark ? "#0b1329" : "#2563eb");
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

window.initExamTheme = initExamTheme;
window.toggleExamTheme = toggleExamTheme;
window.applyExamTheme = applyExamTheme;

/* ====================================================
   APP INITIALIZATION (بدء تشغيل الاختبار فوراً)
==================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    initExamTheme();

    // 1. عرض فوري بدون أي تأخير (0ms): أسئلة بنك القرآن المدمج
    if (typeof getCuratedDefaultQuestions === "function" && typeof buildQuestions === "function") {
      const instantBank = getCuratedDefaultQuestions();
      buildQuestions(instantBank);
    }

    // 2. الملء التلقائي لاسم الطالب من الجلسة أو الذاكرة المحلية
    const studentInput = document.getElementById("studentInput");
    if (studentInput) {
      try {
        const localUser = JSON.parse(localStorage.getItem('albayan_logged_user') || '{}');
        const localName = localUser.student_name || localUser.username || "";
        if (localName) {
          studentInput.value = localName;
          if (typeof onNameInput === "function") onNameInput(true);
        } else {
          // فحص الجلسة السحابية مع مهلة سريعة (800ms)
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 800);
          const prefillRes = await fetch("/api/student/exam-prefill", { signal: ctrl.signal });
          clearTimeout(tid);
          if (prefillRes.ok) {
            const prefillData = await prefillRes.json();
            if (prefillData.logged_in && prefillData.student_name) {
              studentInput.value = prefillData.student_name;
              if (typeof onNameInput === "function") onNameInput(true);
            }
          }
        }
      } catch (e) {}
    }

    // 3. قراءة إعدادات الاختبار النشط إن وجدت (مع دعم السحابة المباشر للجوال)
    try {
      let settings = null;
      try {
        const sCtrl = new AbortController();
        const sTid = setTimeout(() => sCtrl.abort(), 800);
        const settingsRes = await fetch("/api/settings", { signal: sCtrl.signal });
        clearTimeout(sTid);
        if (settingsRes.ok) {
          settings = await settingsRes.json();
        }
      } catch (e) {}

      // Fallback for mobile app from Firebase RTDB settings.json
      if (!settings) {
        try {
          const fbCtrl = new AbortController();
          const fbTid = setTimeout(() => fbCtrl.abort(), 1500);
          const fbSetRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/settings.json", { signal: fbCtrl.signal });
          clearTimeout(fbTid);
          if (fbSetRes.ok) {
            settings = await fbSetRes.json();
          }
        } catch (e) {}
      }

      if (settings) {
        if (settings.exam_title) {
          const titleElem = document.getElementById("examTitleDisplay");
          if (titleElem) titleElem.textContent = settings.exam_title;
        }
        if (settings.duration_minutes) {
          const duration = parseInt(settings.duration_minutes, 10);
          if (duration > 0 && !window.examTimer) {
            window.timeLeft = duration * 60;
            window.totalDurationSeconds = duration * 60;
            const timerDisplay = document.getElementById("timerDisplay");
            if (timerDisplay) {
              const minutes = Math.floor(window.timeLeft / 60);
              const seconds = window.timeLeft % 60;
              timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
          }
        }
      }
    } catch(e) {}

    // 4. المزامنة في الخلفية مع فايربيس / الخادم لتحديث أي أسئلة جديدة
    try {
      if (typeof fetchExamQuestionsWithFallback === "function") {
        const remoteData = await fetchExamQuestionsWithFallback();
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          // تحديث الأسئلة فقط إذا لم يبدأ الطالب بالإجابة لحماية اختياراته
          if (window.answeredCount === 0 && typeof buildQuestions === "function") {
            buildQuestions(remoteData);
            if (studentInput && studentInput.value && typeof onNameInput === "function") {
              onNameInput(true);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Background questions sync:", e);
    }
  } catch (err) {
    console.error("Failed to initialize exam:", err);
  }
});

// Retain student progress and exam state when returning to the app without reloading
document.addEventListener("visibilitychange", () => {
  // Never reload questions or reset state on visibilitychange to prevent loss of focus or delay
});
