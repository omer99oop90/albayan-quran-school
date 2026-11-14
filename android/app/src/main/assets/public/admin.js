// CSRF Token Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  let t = meta ? meta.getAttribute("content") : "";
  if (!t) {
    t = sessionStorage.getItem("albayan_csrf_token") || localStorage.getItem("albayan_csrf_token") || "";
  }
  return t;
}
function csrfHeaders(extra = {}) {
  const headers = Object.assign({"Content-Type": "application/json", "X-CSRF-Token": getCsrfToken()}, extra);
  const token = localStorage.getItem("albayan_saved_token");
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = "Bearer " + token;
    headers["X-Albayan-Token"] = token;
  }
  return headers;
}

const DEFAULT_QUESTIONS_BANK = {
  choice: [
    { id: "c1", file: "اسئلة", type: "choice", question: "عاصمة السعودية؟", options: ["الرياض", "جدة", "مكة", "الدمام"], answer: 0 },
    { id: "c2", file: "اسئلة", type: "choice", question: "كم يساوي 2 + 2؟", options: ["3", "4", "5", "6"], answer: 1 },
    { id: "c3", file: "اسئلة", type: "choice", question: "ما أكبر كوكب في المجموعة الشمسية؟", options: ["الأرض", "المريخ", "المشتري", "زحل"], answer: 2 },
    { id: "c4", file: "اسئلة", type: "choice", question: "ما لون السماء في يوم صافٍ؟", options: ["أحمر", "أزرق", "أصفر", "أسود"], answer: 1 },
    { id: "c5", file: "اسئلة", type: "choice", question: "كم عدد قارات العالم؟", options: ["5", "6", "7", "8"], answer: 2 }
  ],
  true_false: [
    { id: "tf1", file: "اسئلة", type: "true_false", question: "القمر جسم سماوي.", answer: true },
    { id: "tf2", file: "اسئلة", type: "true_false", question: "الثلج يصبح سائلاً عند التسخين.", answer: true },
    { id: "tf3", file: "اسئلة", type: "true_false", question: "الشمس تدور حول الأرض.", answer: false },
    { id: "tf4", file: "اسئلة", type: "true_false", question: "الزرافة أطول من الفيل.", answer: true },
    { id: "tf5", file: "اسئلة", type: "true_false", question: "السماء في الليل تكون بيضاء.", answer: false }
  ],
  matching: [
    {
      id: "match_q1",
      type: "matching",
      question: "صل بين السور القرآنية وعدد آياتها",
      instructions: "اضغط على اسم السورة ثم اضغط على عدد آياتها لتوصيلهما معاً",
      leftItems: [
        { id: "L1", text: "سورة الفاتحة" },
        { id: "L2", text: "سورة الإخلاص" },
        { id: "L3", text: "سورة الفلق" },
        { id: "L4", text: "سورة الكوثر" }
      ],
      rightItems: [
        { id: "R1", text: "4 آيات" },
        { id: "R2", text: "7 آيات" },
        { id: "R3", text: "3 آيات" },
        { id: "R4", text: "5 آيات" }
      ],
      correctPairs: [
        { leftId: "L1", rightId: "R2" },
        { leftId: "L2", rightId: "R1" },
        { leftId: "L3", rightId: "R4" },
        { leftId: "L4", rightId: "R3" }
      ],
      points: 4,
      left: ["سورة الفاتحة", "سورة الإخلاص", "سورة الفلق", "سورة الكوثر"],
      right: ["4 آيات", "7 آيات", "3 آيات", "5 آيات"],
      answer: [1, 0, 3, 2]
    }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initMobileSidebar === "function") {
    try { initMobileSidebar(); } catch (e) {}
  }
  // Run immediately and concurrently for instant zero-latency UI rendering
  loadExams().catch(e => console.error("loadExams error:", e));
  checkAuth().catch(e => console.error("checkAuth error:", e));
  loadQuestionsPreview().catch(e => console.error("loadQuestionsPreview error:", e));
});

async function checkAuth() {
  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/me", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (!data.logged_in) {
        if (!isStandalone) {
          window.location.href = "login.html";
          return;
        }
      } else {
        const userElem = document.getElementById("loggedUsername");
        if (userElem) userElem.textContent = data.username;
        const canAccessCv = data.is_superadmin === 1 || data.role === "admin" || data.role === "supervisor" || (Array.isArray(data.permissions) && data.permissions.includes("student_cv"));
        const cvLink = document.getElementById("studentCvMenuLink");
        if (cvLink) cvLink.style.display = canAccessCv ? "flex" : "none";

        const canAccessUsers = data.is_superadmin === 1 || data.role === "admin" || (Array.isArray(data.permissions) && data.permissions.includes("users"));
        const usersLink = document.getElementById("usersMenuLink");
        if (usersLink) usersLink.style.display = canAccessUsers ? "flex" : "none";
        return;
      }
    }
  } catch (err) {
    // Offline / standalone: keep supervisor access
  }

  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) {
      const u = JSON.parse(cached);
      const userElem = document.getElementById("loggedUsername");
      if (userElem && u && u.username) {
        userElem.textContent = u.username;
        return;
      }
    }
  } catch(e) {}

  // If unauthenticated, redirect to login.html
  window.location.href = "login.html";
}

function showAlert(msg, isOk = true) {
  const box = document.getElementById("alertMsg");
  box.textContent = msg;
  box.className = `alert-box ${isOk ? "ok" : "err"}`;
  box.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    box.style.display = "none";
  }, 4000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "flex";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("createExamModal");
  }
});

async function logout() {
  if (typeof window.albayanLogout === 'function') {
    return window.albayanLogout();
  }
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
    sessionStorage.clear();
  } catch(e) {}
  await fetch("/api/logout", { method: "POST", headers: csrfHeaders() }).catch(() => {});
  window.location.href = "login.html?logout=1";
}

/* Exams List Dashboard */

async function loadExams() {
  const container = document.getElementById("examsGrid");
  let exams = [];
  let fetched = false;

  // 0. Instant Server Preloaded Data (0ms)
  if (Array.isArray(window.SERVER_EXAMS_PRELOAD) && window.SERVER_EXAMS_PRELOAD.length > 0) {
    exams = window.SERVER_EXAMS_PRELOAD.filter(e => e && typeof e === "object");
    renderExamsCards(exams);
  }

  // 1. Instant Cache from localStorage / IndexedDB (<50ms)
  try {
    const cachedStr = localStorage.getItem("cached_exams_list");
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed) && parsed.length > 0 && (!exams || exams.length === 0)) {
        exams = parsed.filter(e => e && typeof e === "object");
        renderExamsCards(exams);
      }
    }
  } catch (e) {}

  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalExams === "function") {
    try {
      const dbPromise = window.AlbayanLocalDB.getLocalExams();
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 600));
      const localDbExams = await Promise.race([dbPromise, timeoutPromise]);
      if (Array.isArray(localDbExams) && localDbExams.length > 0) {
        exams = localDbExams.filter(e => e && typeof e === "object");
        renderExamsCards(exams);
      }
    } catch (e) {}
  }

  // 2. Try local server with fast responsive timeout (6 seconds)
  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch("/api/exams?_t=" + Date.now(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.status === 401 || res.status === 403) {
      if (container && (!exams || exams.length === 0)) {
        container.innerHTML = `
          <div class="loading-box" style="grid-column:1/-1; color:#ef4444; background:#fef2f2; border:1px solid #fecaca;">
            ⚠️ انتهت جلسة الدخول الخاصة بالمشرف. 
            <br><a href="login.html" style="color:#2563eb; font-weight:800; text-decoration:underline; margin-top:8px; display:inline-block;">انقر هنا لتسجيل الدخول مجدداً</a>
          </div>`;
      }
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
      return;
    }
    if (res.ok) {
      const liveExams = await res.json();
      if (Array.isArray(liveExams)) {
        exams = liveExams.filter(e => e && typeof e === "object");
        fetched = true;
        try { localStorage.setItem("cached_exams_list", JSON.stringify(exams)); } catch(e) {}
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheExams === "function") {
          window.AlbayanLocalDB.cacheExams(exams).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("Local /api/exams fetch notice:", err);
  }

  // 3. Fallback to Firebase RTDB if local server was unreachable
  if (!fetched) {
    if (typeof window.pullExamsFromFirebase === "function") {
      try {
        const fbExams = await window.pullExamsFromFirebase();
        if (Array.isArray(fbExams) && fbExams.length > 0) {
          exams = fbExams.filter(e => e && typeof e === "object");
          fetched = true;
          try { localStorage.setItem("cached_exams_list", JSON.stringify(exams)); } catch(e) {}
        }
      } catch(e) {}
    }

    if (!fetched) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const fbRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/exams.json", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData && typeof fbData === "object") {
            const list = [];
            Object.entries(fbData).forEach(([k, v]) => {
              if (v && typeof v === "object") {
                const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1], 10) : parseInt(k, 10) || k);
                list.push({ ...v, id });
              }
            });
            if (list.length > 0) {
              exams = list.filter(e => e && typeof e === "object");
              fetched = true;
              try { localStorage.setItem("cached_exams_list", JSON.stringify(exams)); } catch(e) {}
            }
          }
        }
      } catch(e) {}
    }
  }

  renderExamsCards(exams);
}

function renderExamsCards(exams) {
  const container = document.getElementById("examsGrid");
  if (!container) return;

  try {
    const rawList = Array.isArray(exams) ? exams : [];
    const validExams = rawList.filter(e => e && typeof e === "object" && e.id !== undefined && e.id !== null);

    const kpiTotal = document.getElementById("kpiTotalExams");
    const kpiTitle = document.getElementById("kpiActiveExamTitle");
    const kpiDuration = document.getElementById("kpiActiveExamDuration");
    const kpiQuestions = document.getElementById("kpiQuestionsCount");

    if (kpiTotal) kpiTotal.textContent = validExams.length;

    if (validExams.length === 0) {
      container.innerHTML = `<div class="loading-box" style="grid-column:1/-1;">لا يوجد اختبارات في النظام حالياً. انقر على "إنشاء اختبار جديد" للبدء.</div>`;
      if (kpiTitle) { kpiTitle.textContent = "لا يوجد"; kpiTitle.title = "لا يوجد"; }
      if (kpiDuration) kpiDuration.textContent = "0 دقيقة";
      if (kpiQuestions) kpiQuestions.textContent = "0 أسئلة";
      return;
    }

    const activeExam = validExams.find(e => Number(e.is_active) === 1);
    const soonExam = validExams.find(e => Number(e.is_active) === 2);

    if (activeExam) {
      if (kpiTitle) {
        kpiTitle.innerHTML = `<span class="kpi-status-badge">🟢 مفتوح</span> ${escapeHtml(activeExam.title || 'اختبار')}`;
        kpiTitle.title = activeExam.title || '';
      }
      if (kpiDuration) kpiDuration.textContent = `${activeExam.duration_minutes || 20} دقيقة`;
      if (kpiQuestions) kpiQuestions.textContent = `${activeExam.question_count || 0} أسئلة`;
    } else if (soonExam) {
      if (kpiTitle) {
        kpiTitle.innerHTML = `<span class="kpi-status-badge" style="background:#fef3c7; color:#b45309;">🟡 قريباً</span> ${escapeHtml(soonExam.title || 'اختبار')}`;
        kpiTitle.title = soonExam.title || '';
      }
      if (kpiDuration) kpiDuration.textContent = `${soonExam.duration_minutes || 20} دقيقة`;
      if (kpiQuestions) kpiQuestions.textContent = `${soonExam.question_count || 0} أسئلة`;
    } else {
      if (kpiTitle) {
        kpiTitle.innerHTML = `<span style="color:var(--admin-text-muted);">لا يوجد اختبار نشط</span>`;
        kpiTitle.title = "لا يوجد اختبار نشط";
      }
      if (kpiDuration) kpiDuration.textContent = "—";
      if (kpiQuestions) kpiQuestions.textContent = "—";
    }

    const svgLockIcon = `<svg class="lock-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 10V7.5A5 5 0 0 1 17 7.5V10"/>
      <rect x="5" y="10" width="14" height="11" rx="2.5"/>
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>
      <path d="M12 16.7V18"/>
    </svg>`;

    const svgCheckIcon = `<svg class="option-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;

    const svgClockIcon = `<svg class="option-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`;

    const svgHelpIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`;

    const svgSlidersIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14"></line>
      <line x1="4" y1="10" x2="4" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12" y2="3"></line>
      <line x1="20" y1="21" x2="20" y2="16"></line>
      <line x1="20" y1="12" x2="20" y2="3"></line>
      <line x1="1" y1="14" x2="7" y2="14"></line>
      <line x1="9" y1="8" x2="15" y2="8"></line>
      <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>`;

    const svgPlayIcon = `<svg class="option-svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" aria-hidden="true">
      <polygon points="6 4 20 12 6 20 6 4"></polygon>
    </svg>`;

    const svgEditIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>`;

    container.innerHTML = validExams.map(ex => {
      const eid = ex.id;
      const titleStr = String(ex.title || "اختبار بدون عنوان");
      const durationNum = Number(ex.duration_minutes) || 20;
      const statusNum = Number(ex.is_active) || 0;
      const qCount = Number(ex.question_count) || 0;

      const isOpen = statusNum === 1;
      const isSoon = statusNum === 2;
      const isClosed = statusNum === 0;

      let badgeClass = "status-closed";
      let badgeIcon = svgLockIcon;
      let badgeText = "مغلق";

      if (isOpen) {
        badgeClass = "status-open";
        badgeIcon = svgCheckIcon;
        badgeText = "مفتوح";
      } else if (isSoon) {
        badgeClass = "status-soon";
        badgeIcon = svgClockIcon;
        badgeText = "قريبًا";
      }

      const escapedTitle = titleStr.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const displayTitle = escapeHtml(titleStr);

      return `
        <article class="exam-card ${isOpen ? 'active-exam' : (isSoon ? 'soon-exam' : 'closed-exam')}">
          <section class="top">
            <div class="icon-box" aria-hidden="true">
              <div class="exam-icon" aria-hidden="true">
                <span class="paper"></span>
                <span class="check">${svgCheckIcon}</span>
              </div>
            </div>

            <div class="head">
              <div class="head-top-row">
                <div class="badge ${badgeClass}" id="topStatusBadge-${eid}">
                  <span class="status-icon">${badgeIcon}</span>
                  <span class="status-text">${badgeText}</span>
                </div>

                <div class="card-dropdown-wrap">
                  <button type="button" class="three-dots-btn" onclick="toggleExamDropdown(event, '${eid}')" title="خيارات الاختبار" aria-label="خيارات الاختبار" style="background:transparent; border:none; box-shadow:none; padding:2px; cursor:pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="display:block; margin:auto;">
                      <circle cx="12" cy="12" r="2.2"></circle>
                      <circle cx="12" cy="5" r="2.2"></circle>
                      <circle cx="12" cy="19" r="2.2"></circle>
                    </svg>
                  </button>
                  <div id="examDropdown-${eid}" class="exam-dropdown-menu">
                    <a href="/analytics?exam_id=${eid}" class="dropdown-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                      <span>الإحصائيات والنتائج</span>
                    </a>
                    <button type="button" class="dropdown-item danger" onclick="deleteExam('${eid}')">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      <span>حذف الاختبار</span>
                    </button>
                  </div>
                </div>
              </div>

              <h3 class="exam-title-text" title="${displayTitle}">${displayTitle}</h3>
              <p class="subtitle">اختبر معلوماتك في القرآن الكريم والتربية الإسلامية</p>
            </div>
          </section>

          <div class="divider"></div>

          <section class="stats">
            <div class="stat">
              <div class="stat-icon">${svgHelpIcon}</div>
              <div class="stat-text">
                <div class="stat-label">الأسئلة</div>
                <div class="stat-value">${qCount} سؤال</div>
              </div>
            </div>

            <div class="stat">
              <div class="stat-icon">${svgClockIcon}</div>
              <div class="stat-text">
                <div class="stat-label">المدة</div>
                <div class="stat-value">${durationNum} دقيقة</div>
              </div>
            </div>
          </section>

          <section class="status">
            <div class="status-title">
              <span class="sliders">${svgSlidersIcon}</span>
              <span>حالة الاختبار</span>
            </div>

            <div class="options">
              <button type="button" class="option ${isClosed ? 'selected' : ''}" onclick="setExamStatus('${eid}', 0)" title="إغلاق الاختبار">
                <span>مغلق</span>
                <span class="option-icon lock-option">${svgLockIcon}</span>
              </button>
              <button type="button" class="option ${isSoon ? 'selected' : ''}" onclick="setExamStatus('${eid}', 2)" title="وضع الاختبار في حالة قريباً">
                <span>قريبًا</span>
                <span class="option-icon">${svgClockIcon}</span>
              </button>
              <button type="button" class="option ${isOpen ? 'selected' : ''}" onclick="setExamStatus('${eid}', 1)" title="تفعيل الاختبار ليصبح مفتوحاً ومتاحاً للطلاب">
                <span>مفتوح</span>
                <span class="option-icon">${svgPlayIcon}</span>
              </button>
            </div>
          </section>

          <button type="button" class="cta" onclick="openExamEditor('${eid}', '${escapedTitle}', ${durationNum})">
            <span class="edit-icon">${svgEditIcon}</span>
            <span>إدارة وتحرير الأسئلة</span>
          </button>
        </article>
      `;
    }).join("");
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons({ root: container }); } catch(e) {}
    }
  } catch (err) {
    console.error("renderExamsCards error:", err);
    container.innerHTML = `<div class="loading-box" style="grid-column:1/-1;">تعذر تحميل بطاقات الاختبارات. يرجى تحديث الصفحة.</div>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toggleExamDropdown(e, examId) {
  e.stopPropagation();
  document.querySelectorAll(".exam-dropdown-menu").forEach(menu => {
    if (menu.id !== `examDropdown-${examId}`) {
      menu.classList.remove("show");
    }
  });

  const menu = document.getElementById(`examDropdown-${examId}`);
  if (menu) {
    menu.classList.toggle("show");
  }
}

document.addEventListener("click", () => {
  document.querySelectorAll(".exam-dropdown-menu").forEach(menu => {
    menu.classList.remove("show");
  });
});

window.toggleExamDropdown = toggleExamDropdown;

function openCreateExamModal() {
  document.getElementById("newExamTitle").value = "";
  document.getElementById("newExamDuration").value = "20";
  document.getElementById("createExamModal").style.display = "flex";
}

async function saveNewExam(e) {
  e.preventDefault();
  const title = document.getElementById("newExamTitle").value.trim();
  const duration_minutes = parseInt(document.getElementById("newExamDuration").value, 10) || 20;

  try {
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ title, duration_minutes })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeModal("createExamModal");
      await loadExams();
      showAlert("تم إنشاء الاختبار بنجاح.", true);
      return;
    }
  } catch (err) {}

  // Direct Serverless Firebase RTDB fallback
  try {
    const examId = Date.now();
    const newExam = {
      id: examId,
      local_id: examId,
      cloud_id: `exams_${examId}`,
      title: title,
      duration_minutes: duration_minutes,
      is_active: 0,
      questions: [],
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
    await Promise.all([
      fetch(`${fbBase}/exams/${examId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExam)
      }).catch(() => null),
      fetch(`${fbBase}/exams/exams_${examId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExam)
      }).catch(() => null)
    ]);
    closeModal("createExamModal");
    await loadExams();
    showAlert("تم إنشاء الاختبار بنجاح في السحابة.", true);
  } catch (err) {
    showAlert("تعذر حفظ الاختبار في قاعدة البيانات السحابية.", false);
  }
}

async function setExamStatus(examId, statusCode) {
  try {
    const res = await fetch(`/api/exams/${examId}/status`, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ is_active: statusCode })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showAlert(data.message, true);
      await loadExams();
      return;
    }
  } catch (err) {}

  // Direct Serverless Firebase synchronization
  try {
    const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
    
    // 1. Fetch current exams to update active flags across all exams
    let allExams = {};
    try {
      const eRes = await fetch(`${fbBase}/exams.json`);
      if (eRes.ok) allExams = await eRes.json() || {};
    } catch(e) {}

    let targetExam = null;
    const patchPromises = [];

    // Find target exam and set others inactive if activating
    Object.entries(allExams).forEach(([k, ex]) => {
      if (!ex || typeof ex !== "object") return;
      const isTarget = String(ex.id) === String(examId) || String(ex.local_id) === String(examId) || k === String(examId) || k === `exams_${examId}`;
      if (isTarget) {
        targetExam = { ...ex, id: examId, is_active: statusCode };
        patchPromises.push(
          fetch(`${fbBase}/exams/${k}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: statusCode })
          }).catch(() => null)
        );
      } else if (statusCode === 1 && (ex.is_active === 1 || ex.is_active === "1")) {
        patchPromises.push(
          fetch(`${fbBase}/exams/${k}.json`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: 0 })
          }).catch(() => null)
        );
      }
    });

    // Also explicitly ensure both key patterns are patched
    patchPromises.push(
      fetch(`${fbBase}/exams/${examId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: statusCode })
      }).catch(() => null),
      fetch(`${fbBase}/exams/exams_${examId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: statusCode })
      }).catch(() => null)
    );

    // 2. Synchronize active_exam.json, settings.json, and questions.json for students
    if (statusCode === 1) {
      const examTitle = targetExam?.title || "اختبار مدرسة البيان";
      const examDuration = targetExam?.duration_minutes || 20;
      const examQuestions = targetExam?.questions || [];

      patchPromises.push(
        fetch(`${fbBase}/settings.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            active_exam_id: Number(examId) || examId,
            duration_minutes: examDuration,
            exam_status: "open",
            exam_title: examTitle,
            is_active: 1
          })
        }).catch(() => null),
        fetch(`${fbBase}/active_exam.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: Number(examId) || examId,
            cloud_id: `exams_${examId}`,
            title: examTitle,
            duration_minutes: examDuration,
            is_active: 1,
            status: "open",
            questions: examQuestions,
            updated_at: new Date().toISOString()
          })
        }).catch(() => null),
        fetch(`${fbBase}/questions.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(examQuestions)
        }).catch(() => null)
      );
    } else {
      patchPromises.push(
        fetch(`${fbBase}/settings.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_active: 0,
            exam_status: "closed"
          })
        }).catch(() => null),
        fetch(`${fbBase}/active_exam.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_active: 0,
            status: "closed"
          })
        }).catch(() => null)
      );
    }

    await Promise.all(patchPromises);
    showAlert(statusCode === 1 ? "تم تفعيل الاختبار للطلاب ومزامنته سحابياً بنجاح." : "تم تعطيل الاختبار.", true);
    await loadExams();
  } catch (err) {
    console.error("setExamStatus error:", err);
    showAlert("فشل تغيير حالة الاختبار.", false);
  }
}

async function activateExam(examId) {
  return setExamStatus(examId, 1);
}

async function deactivateExam(examId) {
  return setExamStatus(examId, 0);
}

async function deleteExam(examId) {
  const ok = window.AlbayanDialog
    ? await AlbayanDialog.confirm("هل أنت متأكد من رغبتك في حذف هذا الاختبار نهائياً؟", "حذف الاختبار", { isDestructive: true })
    : confirm("هل أنت تأكد من رغبتك في حذف هذا الاختبار؟");
  if (!ok) return;

  try {
    const res = await fetch(`/api/exams/${examId}`, { method: "DELETE", headers: csrfHeaders() });
    const data = await res.json();
    if (res.ok && data.success) {
      showAlert(data.message, true);
      await loadExams();
      return;
    }
  } catch (err) {}

  // Direct Serverless Firebase fallback
  try {
    const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
    await Promise.all([
      fetch(`${fbBase}/exams/${examId}.json`, { method: "DELETE" }).catch(() => null),
      fetch(`${fbBase}/exams/exams_${examId}.json`, { method: "DELETE" }).catch(() => null)
    ]);
    showAlert("تم حذف الاختبار بنجاح من السحابة.", true);
    await loadExams();
  } catch (err) {
    showAlert("فشل الحذف.", false);
  }
}

window.setExamStatus = setExamStatus;
window.activateExam = activateExam;
window.deactivateExam = deactivateExam;
window.deleteExam = deleteExam;

/* Exam Editor & Questions Injection Section */

async function loadJsonBoxQuestions(qtype, examId = null) {
  if (!examId) {
    examId = document.getElementById("editingExamId")?.value;
  }
  const textarea = document.getElementById(`code-${qtype}`);
  if (!textarea) return;

  let questions = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const url = examId ? `/api/admin/questions/${qtype}?exam_id=${examId}` : `/api/admin/questions/${qtype}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) questions = data;
    }
  } catch (err) {}

  // 1. Check window.loadedExamQuestionsCache
  if (!questions || questions.length === 0) {
    if (Array.isArray(window.loadedExamQuestionsCache) && window.loadedExamQuestionsCache.length > 0) {
      const filtered = window.loadedExamQuestionsCache.filter(q => q && q.type === qtype);
      if (filtered.length > 0) questions = filtered;
    }
  }

  // 2. Fetch specific exam from Firebase RTDB
  if (!questions || questions.length === 0) {
    if (examId) {
      try {
        const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const fbRes = await fetch(`${fbBase}/exams/${examId}.json`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (fbRes.ok) {
          const exData = await fbRes.json();
          if (exData && Array.isArray(exData.questions)) {
            const filtered = exData.questions.filter(q => q && q.type === qtype);
            if (filtered.length > 0) questions = filtered;
          }
        }
      } catch(e) {}
    }
  }

  // 3. Fallback: Firebase questions.json
  if (!questions || questions.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const fbRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/questions.json", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (fbRes.ok) {
        const raw = await fbRes.json();
        if (Array.isArray(raw)) {
          const filtered = raw.filter(q => q && q.type === qtype);
          if (filtered.length > 0) questions = filtered;
        } else if (raw && typeof raw === "object") {
          const list = Object.values(raw).filter(q => q && typeof q === "object" && q.type === qtype);
          if (list.length > 0) questions = list;
        }
      }
    } catch(e) {}
  }

  if (!questions || questions.length === 0) {
    questions = DEFAULT_QUESTIONS_BANK[qtype] || [];
  }

  textarea.value = JSON.stringify(questions, null, 2);
}

async function loadAllJsonBoxes(examId = null) {
  await Promise.all([
    loadJsonBoxQuestions('choice', examId),
    loadJsonBoxQuestions('true_false', examId),
    loadJsonBoxQuestions('matching', examId)
  ]);
}

window.loadJsonBoxQuestions = loadJsonBoxQuestions;
window.loadAllJsonBoxes = loadAllJsonBoxes;

async function openExamEditor(examId, title, duration) {
  document.getElementById("editingExamId").value = examId;
  document.getElementById("examTitle").value = title;
  document.getElementById("durationMinutes").value = duration;
  document.getElementById("editingExamHeaderTitle").innerHTML = `<i data-lucide="edit-3" style="width:22px; height:22px; vertical-align:-3px;"></i> تعديل: ${title}`;

  const section = document.getElementById("examEditorSection");
  section.style.display = "block";

  // Hide questions preview by default until clicked
  const previewContainer = document.getElementById("questionsPreviewContainer");
  const previewIcon = document.getElementById("previewToggleIcon");
  if (previewContainer) previewContainer.style.display = "none";
  if (previewIcon) previewIcon.style.transform = "rotate(0deg)";

  // Automatically load existing questions and JSON into all boxes
  await loadQuestionsPreview(examId);
  await loadAllJsonBoxes(examId);

  if (window.lucide) lucide.createIcons();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeExamEditor() {
  document.getElementById("examEditorSection").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function autoSaveExamSettings() {
  const examId = document.getElementById("editingExamId")?.value;
  const title = document.getElementById("examTitle")?.value.trim();
  const duration_minutes = parseInt(document.getElementById("durationMinutes")?.value, 10);
  if (!examId || !title || !duration_minutes) return;

  const updateUI = () => {
    const headerTitle = document.getElementById("editingExamHeaderTitle");
    if (headerTitle) {
      headerTitle.innerHTML = `<i data-lucide="edit-3" style="width:22px; height:22px; vertical-align:-3px;"></i> تعديل: ${escapeHtml(title)}`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons({ root: headerTitle }); } catch(e) {}
      }
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`/api/exams/${examId}`, {
      method: "PUT",
      headers: csrfHeaders(),
      body: JSON.stringify({ title, duration_minutes }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) {
      updateUI();
      await loadExams();
      return;
    }
  } catch (err) {}

  // Direct Firebase RTDB fallback
  try {
    const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
    await Promise.all([
      fetch(`${fbBase}/exams/${examId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, duration_minutes })
      }).catch(() => null),
      fetch(`${fbBase}/exams/exams_${examId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, duration_minutes })
      }).catch(() => null)
    ]);

    // If active exam, also patch settings.json and active_exam.json
    try {
      const sRes = await fetch(`${fbBase}/settings.json`);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData && String(sData.active_exam_id) === String(examId)) {
          await Promise.all([
            fetch(`${fbBase}/settings.json`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ exam_title: title, duration_minutes: duration_minutes })
            }).catch(() => null),
            fetch(`${fbBase}/active_exam.json`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, duration_minutes })
            }).catch(() => null)
          ]);
        }
      }
    } catch(e) {}

    updateUI();
    await loadExams();
  } catch (err) {
    console.error("autoSaveExamSettings error:", err);
  }
}

async function saveExamSettings(e) {
  if (e && e.preventDefault) e.preventDefault();
  await autoSaveExamSettings();
}

function switchQTab(qtype) {
  document.querySelectorAll(".qtype-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".qtype-box").forEach(box => box.style.display = "none");

  const activeBox = document.getElementById(`box-${qtype}`);
  if (activeBox) activeBox.style.display = "grid";

  const activeTabBtn = Array.from(document.querySelectorAll(".qtype-tab")).find(btn => btn.getAttribute("onclick")?.includes(`'${qtype}'`));
  if (activeTabBtn) activeTabBtn.classList.add("active");

  const examId = document.getElementById("editingExamId")?.value;
  const textarea = document.getElementById(`code-${qtype}`);
  if (textarea && (!textarea.value || textarea.value.trim() === "" || textarea.value.trim() === "[]")) {
    loadJsonBoxQuestions(qtype, examId);
  }
}

function toggleQuestionsPreview() {
  const container = document.getElementById("questionsPreviewContainer");
  const icon = document.getElementById("previewToggleIcon");
  
  if (container.style.display === "none" || !container.style.display) {
    container.style.display = "block";
    if (icon) icon.style.transform = "rotate(180deg)";
    loadQuestionsPreview();
  } else {
    container.style.display = "none";
    if (icon) icon.style.transform = "rotate(0deg)";
  }
}

window.toggleQuestionsPreview = toggleQuestionsPreview;

window.loadedExamQuestionsCache = [];

async function loadQuestionsPreview(examId = null) {
  if (!examId) {
    examId = document.getElementById("editingExamId")?.value;
  }
  const container = document.getElementById("questionsPreview");
  const badge = document.getElementById("previewCountBadge");
  const kpiCount = document.getElementById("kpiQuestionsCount");

  try {
    let data = null;

    // 1. Try local server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const url = examId ? `/api/admin/questions?exam_id=${examId}` : "/api/admin/questions";
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        data = await res.json();
        if (Array.isArray(data)) {
          try { localStorage.setItem(`cached_questions_${examId || 'all'}`, JSON.stringify(data)); } catch(e) {}
        }
      }
    } catch (err) {}

    // 2. Direct Firebase RTDB fallback
    if (!data && examId) {
      try {
        const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
        const cleanId = String(examId).replace(/^exams_/, '');
        
        // Check both exam keys
        const [res1, res2] = await Promise.all([
          fetch(`${fbBase}/exams/${cleanId}.json`).catch(() => null),
          fetch(`${fbBase}/exams/exams_${cleanId}.json`).catch(() => null)
        ]);
        
        let exData = null;
        if (res1 && res1.ok) exData = await res1.json();
        if (!exData && res2 && res2.ok) exData = await res2.json();

        if (exData && exData.questions) {
          if (Array.isArray(exData.questions)) {
            data = exData.questions;
          } else if (typeof exData.questions === "object") {
            data = Object.values(exData.questions);
          }
        }

        // If not found in exam object, check active_exam if this is active
        if (!data) {
          const actRes = await fetch(`${fbBase}/active_exam.json`).catch(() => null);
          if (actRes && actRes.ok) {
            const actData = await actRes.json();
            if (actData && (String(actData.id) === String(cleanId) || String(actData.id) === `exams_${cleanId}`)) {
              if (Array.isArray(actData.questions)) {
                data = actData.questions;
              } else if (actData.questions && typeof actData.questions === "object") {
                data = Object.values(actData.questions);
              }
            }
          }
        }

        // Also check questions.json if still null
        if (!data) {
          const qRes = await fetch(`${fbBase}/questions.json`).catch(() => null);
          if (qRes && qRes.ok) {
            const raw = await qRes.json();
            if (Array.isArray(raw)) {
              const matched = raw.filter(q => q && (String(q.exam_id) === String(cleanId) || String(q.exam_id) === String(examId)));
              if (matched.length > 0) data = matched;
            } else if (raw && typeof raw === "object") {
              const matched = Object.values(raw).filter(q => q && (String(q.exam_id) === String(cleanId) || String(q.exam_id) === String(examId)));
              if (matched.length > 0) data = matched;
            }
          }
        }

        if (Array.isArray(data)) {
          try { localStorage.setItem(`cached_questions_${examId || 'all'}`, JSON.stringify(data)); } catch(e) {}
        }
      } catch(e) {}
    }

    // 3. Fallback: localStorage
    if (!data) {
      try {
        const cached = localStorage.getItem(`cached_questions_${examId || 'all'}`);
        if (cached) data = JSON.parse(cached);
      } catch(e) {}
    }

    if (!data) {
      data = [];
    }

    window.loadedExamQuestionsCache = data || [];

    const totalCount = data ? data.length : 0;
    if (badge) badge.textContent = `${totalCount} أسئلة`;
    if (kpiCount) kpiCount.textContent = `${totalCount} أسئلة`;

    if (!container) return;

    const addNewQuestionCardHtml = `
      <div class="preview-item-card" onclick="openVisualQuestionModal(-1)" style="background:#f8fafc; border:2px dashed #93c5fd; border-radius:14px; padding:20px; box-shadow:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; min-height:110px; text-align:center; transition:all 0.2s ease;" onmouseover="this.style.borderColor='var(--admin-primary)'; this.style.background='#eff6ff';" onmouseout="this.style.borderColor='#93c5fd'; this.style.background='#f8fafc';">
        <div style="width:38px; height:38px; border-radius:10px; background:#eff6ff; color:var(--admin-primary); display:flex; align-items:center; justify-content:center;">
          <i data-lucide="plus-circle" style="width:22px; height:22px;"></i>
        </div>
        <div style="font-size:14px; font-weight:800; color:var(--admin-primary);">إضافة سؤال جديد</div>
        <div style="font-size:12px; color:var(--admin-text-muted); font-weight:600;">انقر هنا لإنشاء وتخصيص سؤال جديد لهذا الاختبار</div>
      </div>
    `;

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 16px; color: var(--admin-text-muted); grid-column: 1/-1;">لا يوجد أسئلة حالياً لهذا الاختبار.</div>
        ${addNewQuestionCardHtml}
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons({ root: container }); } catch(e) {}
      }
      return;
    }

    container.innerHTML = data.map((q, i) => {
      let typeLabel = "اختيار من متعدد";
      let typeBadgeCss = "background:#eff6ff; color:#2563eb;";
      if (q.type === "true_false") {
        typeLabel = "صح وخطأ";
        typeBadgeCss = "background:#f0fdf4; color:#16a34a;";
      } else if (q.type === "matching") {
        typeLabel = "توصيل الكلمات";
        typeBadgeCss = "background:#fefce8; color:#ca8a04;";
      }

      let detailHtml = "";
      if (q.type === "choice" && Array.isArray(q.options)) {
        detailHtml = `
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
            ${q.options.map((opt, idx) => {
              const isCorrect = (q.answer === idx);
              return `<span style="font-size:12px; padding:3px 10px; border-radius:6px; border:1px solid ${isCorrect ? '#86efac' : '#e2e8f0'}; background:${isCorrect ? '#dcfce7' : '#f8fafc'}; color:${isCorrect ? '#15803d' : '#475569'}; font-weight:${isCorrect ? '800' : '600'};">${idx + 1}. ${opt} ${isCorrect ? '✓' : ''}</span>`;
            }).join('')}
          </div>
        `;
      } else if (q.type === "true_false") {
        const isTrue = q.answer === true || q.answer === "true" || q.answer === 1;
        detailHtml = `
          <div style="margin-top:6px; font-size:13px; font-weight:700; color:${isTrue ? '#16a34a' : '#dc2626'};">
            الإجابة الصحيحة: ${isTrue ? '🟢 صح (True)' : '🔴 خطأ (False)'}
          </div>
        `;
      } else if (q.type === "matching") {
        const leftItems = q.leftItems || (q.left ? q.left.map((t, idx) => ({ id: `L_${idx}`, text: t })) : []);
        const rightItems = q.rightItems || (q.right ? q.right.map((t, idx) => ({ id: `R_${idx}`, text: t })) : []);
        const rightMap = new Map(rightItems.map(r => [r.id, r.text]));
        const correctMap = new Map();

        if (Array.isArray(q.correctPairs)) {
          q.correctPairs.forEach(p => correctMap.set(p.leftId, p.rightId));
        } else if (Array.isArray(q.answer)) {
          q.answer.forEach((rIdx, lIdx) => correctMap.set(`L_${lIdx}`, `R_${rIdx}`));
        }

        detailHtml = `
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:12px; color:var(--admin-text-muted); font-weight:700;">
              عدد الأزواج: ${leftItems.length} أزواج
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${leftItems.map((lItem, idx) => {
                const rId = correctMap.get(lItem.id) || `R_${idx}`;
                const rText = rightMap.get(rId) || (q.right ? q.right[idx] : '—');
                return `<span style="font-size:12px; padding:3px 10px; border-radius:6px; background:#fefce8; border:1px solid #fef08a; color:#854d0e; font-weight:700;">${lItem.text} ↔ ${rText}</span>`;
              }).join('')}
            </div>
          </div>
        `;
      }

      return `
        <div class="preview-item-card" style="background:#fff; border:1px solid var(--admin-border); border-radius:14px; padding:14px 16px; box-shadow:none; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:6px;">
              <div style="font-size:14px; font-weight:700; color:#0f172a; flex:1;">
                <span style="color:var(--admin-primary); font-weight:800; margin-left:4px;">#${i + 1}</span> ${q.question}
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <button type="button" onclick="editSingleQuestion(${i})" style="background:transparent; border:none; box-shadow:none; color:var(--admin-primary); cursor:pointer; padding:4px; display:inline-flex; align-items:center; justify-content:center;" title="تعديل"><i data-lucide="edit-2" style="width:16px; height:16px;"></i></button>
                <button type="button" onclick="deleteSingleQuestion(${i})" style="background:transparent; border:none; box-shadow:none; color:#ef4444; cursor:pointer; padding:4px; display:inline-flex; align-items:center; justify-content:center;" title="حذف السؤال"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>
              </div>
            </div>
            ${detailHtml}
          </div>
          <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:6px;">
            <span style="font-size:11px; font-weight:800; padding:3px 10px; border-radius:6px; ${typeBadgeCss}">${typeLabel}</span>
          </div>
        </div>
      `;
    }).join("") + addNewQuestionCardHtml;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons({ root: container }); } catch(e) {}
    }

  } catch (err) {
    console.error("loadQuestionsPreview error:", err);
    if (container) {
      container.innerHTML = `<div style="color:var(--admin-danger); text-align:center; grid-column:1/-1;">فشل تحميل المعاينة.</div>`;
    }
  }
}

/* Matching Pairs Builder for Admin Visual Modal */

function renderVqMatchingPairs(pairs = []) {
  const container = document.getElementById("vqMatchingPairsList");
  if (!container) return;
  container.innerHTML = "";

  if (!pairs || pairs.length === 0) {
    pairs = [
      { leftText: "", rightText: "" },
      { leftText: "", rightText: "" },
      { leftText: "", rightText: "" }
    ];
  }

  pairs.forEach((pair, idx) => {
    addVqMatchingPairRow(pair.leftText || "", pair.rightText || "", idx + 1);
  });

  if (window.lucide) lucide.createIcons({ root: container });
}

function addVqMatchingPair(leftText = "", rightText = "") {
  const container = document.getElementById("vqMatchingPairsList");
  if (!container) return;
  const currentCount = container.querySelectorAll(".vq-matching-pair-row").length;
  addVqMatchingPairRow(leftText, rightText, currentCount + 1);
  if (window.lucide) lucide.createIcons({ root: container });
}

function addVqMatchingPairRow(leftText, rightText, rowNum) {
  const container = document.getElementById("vqMatchingPairsList");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "vq-matching-pair-row";
  row.style.cssText = "display:flex; align-items:center; gap:8px; background:#f8fafc; padding:8px 10px; border-radius:10px; border:1px solid var(--admin-border);";
  row.innerHTML = `
    <span class="vq-pair-num" style="width:24px; height:24px; border-radius:6px; background:#e2e8f0; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; color:#475569; flex-shrink:0;">${rowNum}</span>
    <input type="text" class="vq-match-left" placeholder="العنصر في العمود الأول" value="${escapeHtmlAttr(leftText)}" required style="flex:1; padding:7px 10px; border-radius:8px; border:1px solid var(--admin-border); font-size:13px; font-weight:600;">
    <span style="font-weight:900; color:#6366f1; font-size:15px;">↔</span>
    <input type="text" class="vq-match-right" placeholder="المقابل في العمود الثاني" value="${escapeHtmlAttr(rightText)}" required style="flex:1; padding:7px 10px; border-radius:8px; border:1px solid var(--admin-border); font-size:13px; font-weight:600;">
    <button type="button" onclick="removeVqMatchingPairRow(this)" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center;" title="حذف هذا الزوج">
      <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
    </button>
  `;
  container.appendChild(row);
}

function removeVqMatchingPairRow(btn) {
  const container = document.getElementById("vqMatchingPairsList");
  if (!container) return;
  const rows = container.querySelectorAll(".vq-matching-pair-row");
  if (rows.length <= 2) {
    showAlert("يجب الإبقاء على زوجين على الأقل لسؤال التوصيل.", false);
    return;
  }
  const row = btn.closest(".vq-matching-pair-row");
  if (row) row.remove();

  // Renumber remaining rows
  container.querySelectorAll(".vq-matching-pair-row").forEach((r, idx) => {
    const numTag = r.querySelector(".vq-pair-num");
    if (numTag) numTag.textContent = idx + 1;
  });
}

function getVqMatchingPairs() {
  const container = document.getElementById("vqMatchingPairsList");
  if (!container) return [];
  const rows = container.querySelectorAll(".vq-matching-pair-row");
  const pairs = [];
  rows.forEach(row => {
    const leftText = row.querySelector(".vq-match-left")?.value?.trim() || "";
    const rightText = row.querySelector(".vq-match-right")?.value?.trim() || "";
    pairs.push({ leftText, rightText });
  });
  return pairs;
}

function escapeHtmlAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

/* Single Question Visual Builder Handlers */

function openVisualQuestionModal(editIndex = -1) {
  document.getElementById("vqEditIndex").value = editIndex;
  document.getElementById("vqQuestionText").value = "";
  if (document.getElementById("vqInstructions")) document.getElementById("vqInstructions").value = "";
  document.getElementById("vqOpt0").value = "";
  document.getElementById("vqOpt1").value = "";
  document.getElementById("vqOpt2").value = "";
  document.getElementById("vqOpt3").value = "";
  document.querySelector('input[name="vqCorrectChoice"][value="0"]').checked = true;
  document.querySelector('input[name="vqTfAnswer"][value="true"]').checked = true;

  if (editIndex >= 0 && window.loadedExamQuestionsCache[editIndex]) {
    const q = window.loadedExamQuestionsCache[editIndex];
    document.getElementById("questionModalTitle").textContent = "تعديل السؤال الحالي";
    document.getElementById("vqType").value = q.type || "choice";
    document.getElementById("vqQuestionText").value = q.question || q.title || "";
    onVqTypeChange();

    if (q.type === "choice" && Array.isArray(q.options)) {
      if (q.options[0]) document.getElementById("vqOpt0").value = q.options[0];
      if (q.options[1]) document.getElementById("vqOpt1").value = q.options[1];
      if (q.options[2]) document.getElementById("vqOpt2").value = q.options[2];
      if (q.options[3]) document.getElementById("vqOpt3").value = q.options[3];
      const ansRad = document.querySelector(`input[name="vqCorrectChoice"][value="${q.answer || 0}"]`);
      if (ansRad) ansRad.checked = true;
    } else if (q.type === "true_false") {
      const isTrue = q.answer === true || q.answer === "true" || q.answer === 1;
      const tfRad = document.querySelector(`input[name="vqTfAnswer"][value="${isTrue ? 'true' : 'false'}"]`);
      if (tfRad) tfRad.checked = true;
    } else if (q.type === "matching") {
      if (document.getElementById("vqInstructions")) {
        document.getElementById("vqInstructions").value = q.instructions || "";
      }
      const pairs = [];
      if (Array.isArray(q.leftItems) && Array.isArray(q.rightItems)) {
        const rightMap = new Map(q.rightItems.map(r => [r.id, r.text]));
        const correctMap = new Map();
        if (Array.isArray(q.correctPairs)) {
          q.correctPairs.forEach(p => correctMap.set(p.leftId, p.rightId));
        }
        q.leftItems.forEach((lItem, idx) => {
          const rId = correctMap.get(lItem.id) || (q.rightItems[idx] ? q.rightItems[idx].id : '');
          const rText = rightMap.get(rId) || (q.rightItems[idx] ? q.rightItems[idx].text : '');
          pairs.push({ leftText: lItem.text, rightText: rText });
        });
      } else if (Array.isArray(q.left) && Array.isArray(q.right)) {
        q.left.forEach((lText, idx) => {
          const rIdx = Array.isArray(q.answer) ? q.answer[idx] : idx;
          const rText = (rIdx !== undefined && q.right[rIdx] !== undefined) ? q.right[rIdx] : (q.right[idx] || '');
          pairs.push({ leftText: lText, rightText: rText });
        });
      }
      renderVqMatchingPairs(pairs);
    }
  } else {
    document.getElementById("questionModalTitle").textContent = "إضافة سؤال جديد بصرياً";
    document.getElementById("vqType").value = "choice";
    onVqTypeChange();
  }

  document.getElementById("singleQuestionModal").style.display = "flex";
}

function onVqTypeChange() {
  const type = document.getElementById("vqType").value;
  const choiceArea = document.getElementById("vqChoiceArea");
  const tfArea = document.getElementById("vqTrueFalseArea");
  const matchArea = document.getElementById("vqMatchingArea");
  const instructionsArea = document.getElementById("vqInstructionsArea");

  if (type === "true_false") {
    choiceArea.style.display = "none";
    tfArea.style.display = "flex";
    if (matchArea) matchArea.style.display = "none";
    if (instructionsArea) instructionsArea.style.display = "none";
    document.getElementById("vqOpt0").required = false;
    document.getElementById("vqOpt1").required = false;
  } else if (type === "matching") {
    choiceArea.style.display = "none";
    tfArea.style.display = "none";
    if (matchArea) matchArea.style.display = "flex";
    if (instructionsArea) instructionsArea.style.display = "block";
    document.getElementById("vqOpt0").required = false;
    document.getElementById("vqOpt1").required = false;

    // Initialize pair rows if empty
    const pairsContainer = document.getElementById("vqMatchingPairsList");
    if (pairsContainer && pairsContainer.children.length === 0) {
      renderVqMatchingPairs([]);
    }
  } else {
    choiceArea.style.display = "flex";
    tfArea.style.display = "none";
    if (matchArea) matchArea.style.display = "none";
    if (instructionsArea) instructionsArea.style.display = "none";
    document.getElementById("vqOpt0").required = true;
    document.getElementById("vqOpt1").required = true;
  }
}

async function saveSingleQuestion(e) {
  e.preventDefault();
  const examId = document.getElementById("editingExamId")?.value;
  const editIndex = parseInt(document.getElementById("vqEditIndex").value, 10);
  const qtype = document.getElementById("vqType").value;
  const questionText = document.getElementById("vqQuestionText").value.trim();

  if (!examId) {
    showAlert("يرجى تحديد الاختبار أولاً.", false);
    return;
  }

  if (!questionText) {
    showAlert("الرجاء كتابة نص السؤال.", false);
    return;
  }

  let question_data = {
    type: qtype,
    question: questionText,
    exam_id: examId
  };

  if (qtype === "choice") {
    const opt0 = document.getElementById("vqOpt0").value.trim();
    const opt1 = document.getElementById("vqOpt1").value.trim();
    const opt2 = document.getElementById("vqOpt2").value.trim();
    const opt3 = document.getElementById("vqOpt3").value.trim();

    const options = [opt0, opt1];
    if (opt2) options.push(opt2);
    if (opt3) options.push(opt3);

    const checkedChoice = document.querySelector('input[name="vqCorrectChoice"]:checked');
    const answer = checkedChoice ? parseInt(checkedChoice.value, 10) : 0;

    question_data.options = options;
    question_data.answer = answer;
  } else if (qtype === "true_false") {
    const checkedTf = document.querySelector('input[name="vqTfAnswer"]:checked');
    const tfVal = checkedTf ? checkedTf.value : "true";
    question_data.options = ["صح", "خطأ"];
    question_data.answer = (tfVal === "true");
  } else if (qtype === "matching") {
    const pairs = getVqMatchingPairs();
    if (pairs.length < 2) {
      showAlert("يجب إضافة زوجين على الأقل لسؤال التوصيل.", false);
      return;
    }
    const hasEmpty = pairs.some(p => !p.leftText || !p.rightText);
    if (hasEmpty) {
      showAlert("يرجى تعبئة كافة حقول أزواج التوصيل بدون ترك حقول فارغة.", false);
      return;
    }

    const instructionsText = document.getElementById("vqInstructions")?.value?.trim() || "اضغط على الكلمة في العمود الأول ثم اضغط على ما يناسبها في العمود الثاني للتوصيل بينهما.";
    const leftItems = [];
    const rightItems = [];
    const correctPairs = [];

    pairs.forEach((p, idx) => {
      const lId = `L_${idx + 1}`;
      const rId = `R_${idx + 1}`;
      leftItems.push({ id: lId, text: p.leftText });
      rightItems.push({ id: rId, text: p.rightText });
      correctPairs.push({ leftId: lId, rightId: rId });
    });

    question_data = {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: "matching",
      question: questionText,
      instructions: instructionsText,
      leftItems: leftItems,
      rightItems: rightItems,
      correctPairs: correctPairs,
      points: leftItems.length,
      left: leftItems.map(x => x.text),
      right: rightItems.map(x => x.text),
      answer: leftItems.map((_, i) => i),
      exam_id: examId
    };
  }

  let savedOk = false;

  // 1. Try local server API
  try {
    let url = "/api/admin/questions/single";
    let method = "POST";
    let bodyData = { exam_id: examId, type: qtype, question_data };

    if (editIndex >= 0) {
      url = `/api/admin/questions/single/${editIndex}`;
      method = "PUT";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(url, {
      method,
      headers: csrfHeaders(),
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) {
      savedOk = true;
    }
  } catch (err) {}

  // 2. Direct Firebase RTDB fallback
  if (!savedOk) {
    try {
      const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
      const cleanExamId = String(examId).replace(/^exams_/, '');
      
      let currentQuestions = Array.isArray(window.loadedExamQuestionsCache) 
        ? [...window.loadedExamQuestionsCache] 
        : [];

      if (currentQuestions.length === 0) {
        try {
          const curRes = await fetch(`${fbBase}/exams/${cleanExamId}.json`);
          if (curRes.ok) {
            const curData = await curRes.json();
            if (curData && curData.questions) {
              currentQuestions = Array.isArray(curData.questions) ? curData.questions : Object.values(curData.questions);
            }
          }
        } catch(e) {}
      }

      if (editIndex >= 0 && editIndex < currentQuestions.length) {
        currentQuestions[editIndex] = question_data;
      } else {
        currentQuestions.push(question_data);
      }

      // Save to both exam keys
      await Promise.all([
        fetch(`${fbBase}/exams/${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: currentQuestions })
        }).catch(() => null),
        fetch(`${fbBase}/exams/exams_${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: currentQuestions })
        }).catch(() => null)
      ]);

      // If active exam, also sync active_exam.json & questions.json
      try {
        const sRes = await fetch(`${fbBase}/settings.json`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData && (String(sData.active_exam_id) === String(cleanExamId) || String(sData.active_exam_id) === String(examId))) {
            await Promise.all([
              fetch(`${fbBase}/active_exam.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: currentQuestions })
              }).catch(() => null),
              fetch(`${fbBase}/questions.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentQuestions)
              }).catch(() => null)
            ]);
          }
        }
      } catch(e) {}

      window.loadedExamQuestionsCache = currentQuestions;
      try { localStorage.setItem(`cached_questions_${cleanExamId}`, JSON.stringify(currentQuestions)); } catch(e) {}
      savedOk = true;
    } catch(fbErr) {
      console.error("Firebase save question failed:", fbErr);
    }
  }

  if (savedOk) {
    closeModal("singleQuestionModal");
    showAlert("تم حفظ السؤال بنجاح.", true);
    await loadQuestionsPreview(examId);
    await loadAllJsonBoxes(examId);
    await loadExams();
  } else {
    showAlert("فشل حفظ السؤال. تعذر الاتصال بالسحابة أو الخادم.", false);
  }
}

/* Interactive Preview Functions */

function previewCurrentVqQuestion() {
  const qtype = document.getElementById("vqType").value;
  const questionText = document.getElementById("vqQuestionText").value.trim() || "سؤال تجريبي";

  let sampleQ = {
    type: qtype,
    question: questionText
  };

  if (qtype === "choice") {
    const opt0 = document.getElementById("vqOpt0").value.trim() || "الخيار الأول";
    const opt1 = document.getElementById("vqOpt1").value.trim() || "الخيار الثاني";
    const opt2 = document.getElementById("vqOpt2").value.trim();
    const opt3 = document.getElementById("vqOpt3").value.trim();
    const options = [opt0, opt1];
    if (opt2) options.push(opt2);
    if (opt3) options.push(opt3);
    sampleQ.options = options;
  } else if (qtype === "true_false") {
    sampleQ.options = ["صح", "خطأ"];
  } else if (qtype === "matching") {
    const pairs = getVqMatchingPairs();
    const leftItems = [];
    const rightItems = [];
    const correctPairs = [];

    (pairs.length >= 2 ? pairs : [
      { leftText: "Apple", rightText: "تفاحة" },
      { leftText: "Cat", rightText: "قطة" },
      { leftText: "Book", rightText: "كتاب" }
    ]).forEach((p, idx) => {
      const lId = `L_${idx + 1}`;
      const rId = `R_${idx + 1}`;
      leftItems.push({ id: lId, text: p.leftText || `عنصر ${idx + 1}` });
      rightItems.push({ id: rId, text: p.rightText || `معنى ${idx + 1}` });
      correctPairs.push({ leftId: lId, rightId: rId });
    });

    sampleQ.instructions = document.getElementById("vqInstructions")?.value?.trim() || "اضغط على الكلمة في العمود الأول ثم اضغط على ما يناسبها في العمود الثاني للتوصيل بينهما.";
    sampleQ.leftItems = leftItems;
    sampleQ.rightItems = rightItems;
    sampleQ.correctPairs = correctPairs;
  }

  renderInteractivePreviewModal(sampleQ);
}

function previewQuestionByIndex(index) {
  if (window.loadedExamQuestionsCache && window.loadedExamQuestionsCache[index]) {
    renderInteractivePreviewModal(window.loadedExamQuestionsCache[index]);
  }
}

function renderInteractivePreviewModal(q) {
  const container = document.getElementById("previewModalContainer");
  const modal = document.getElementById("questionPreviewModal");
  if (!container || !modal) return;

  container.innerHTML = "";

  if (q.type === "matching") {
    const engineHost = document.createElement("div");
    engineHost.id = "adminPreviewEngineHost";
    container.appendChild(engineHost);

    modal.style.display = "flex";

    // Initialize matching engine for live testing
    setTimeout(() => {
      new MatchingQuestionEngine({
        container: engineHost,
        question: q,
        questionIndex: 999
      });
      if (window.lucide) lucide.createIcons({ root: container });
    }, 50);
  } else if (q.type === "choice") {
    container.innerHTML = `
      <div style="font-size:16px; font-weight:800; margin-bottom:12px; color:#0f172a;">${q.question}</div>
      <div style="display:grid; gap:8px;">
        ${(q.options || []).map((opt, idx) => `
          <label style="display:flex; align-items:center; gap:8px; padding:10px 14px; border:2px solid #e2e8f0; border-radius:12px; background:#fff; cursor:pointer; font-weight:700; font-size:14px;">
            <input type="radio" name="preview_choice" value="${idx}">
            <span>${opt}</span>
          </label>
        `).join('')}
      </div>
    `;
    modal.style.display = "flex";
  } else if (q.type === "true_false") {
    container.innerHTML = `
      <div style="font-size:16px; font-weight:800; margin-bottom:12px; color:#0f172a;">${q.question}</div>
      <div style="display:flex; gap:12px;">
        <label style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border:2px solid #e2e8f0; border-radius:12px; background:#fff; cursor:pointer; font-weight:800; color:#16a34a;">
          <input type="radio" name="preview_tf" value="true"> 🟢 صح (True)
        </label>
        <label style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border:2px solid #e2e8f0; border-radius:12px; background:#fff; cursor:pointer; font-weight:800; color:#dc2626;">
          <input type="radio" name="preview_tf" value="false"> 🔴 خطأ (False)
        </label>
      </div>
    `;
    modal.style.display = "flex";
  }

  if (window.lucide) lucide.createIcons({ root: container });
}

window.addVqMatchingPair = addVqMatchingPair;
window.removeVqMatchingPairRow = removeVqMatchingPairRow;
window.previewCurrentVqQuestion = previewCurrentVqQuestion;
window.previewQuestionByIndex = previewQuestionByIndex;

async function editSingleQuestion(index) {
  openVisualQuestionModal(index);
}

async function deleteSingleQuestion(index) {
  const examId = document.getElementById("editingExamId")?.value;
  if (!examId) return;

  const confirmed = window.AlbayanDialog
    ? await AlbayanDialog.confirm(`هل أنت متأكد من رغبتك في حذف السؤال رقم #${index + 1}؟`, "تأكيد حذف السؤال", { confirmText: "حذف السؤال", danger: true })
    : confirm(`هل أنت متأكد من رغبتك في حذف السؤال رقم #${index + 1}؟`);
  
  if (!confirmed) return;

  let deletedOk = false;

  // 1. Try local server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`/api/admin/questions/single/${index}`, {
      method: "DELETE",
      headers: csrfHeaders(),
      body: JSON.stringify({ exam_id: examId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) deletedOk = true;
  } catch (err) {}

  // 2. Direct Firebase RTDB fallback
  if (!deletedOk) {
    try {
      const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
      const cleanExamId = String(examId).replace(/^exams_/, '');
      let currentQuestions = Array.isArray(window.loadedExamQuestionsCache) 
        ? [...window.loadedExamQuestionsCache] 
        : [];

      if (index >= 0 && index < currentQuestions.length) {
        currentQuestions.splice(index, 1);
      }

      await Promise.all([
        fetch(`${fbBase}/exams/${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: currentQuestions })
        }).catch(() => null),
        fetch(`${fbBase}/exams/exams_${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: currentQuestions })
        }).catch(() => null)
      ]);

      // If active exam, also sync
      try {
        const sRes = await fetch(`${fbBase}/settings.json`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData && (String(sData.active_exam_id) === String(cleanExamId) || String(sData.active_exam_id) === String(examId))) {
            await Promise.all([
              fetch(`${fbBase}/active_exam.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: currentQuestions })
              }).catch(() => null),
              fetch(`${fbBase}/questions.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentQuestions)
              }).catch(() => null)
            ]);
          }
        }
      } catch(e) {}

      window.loadedExamQuestionsCache = currentQuestions;
      try { localStorage.setItem(`cached_questions_${cleanExamId}`, JSON.stringify(currentQuestions)); } catch(e) {}
      deletedOk = true;
    } catch (fbErr) {
      console.error("Firebase delete question error:", fbErr);
    }
  }

  if (deletedOk) {
    showAlert("تم حذف السؤال بنجاح.", true);
    await loadQuestionsPreview(examId);
    await loadAllJsonBoxes(examId);
    await loadExams();
  } else {
    showAlert("فشل حذف السؤال.", false);
  }
}

window.openVisualQuestionModal = openVisualQuestionModal;
window.onVqTypeChange = onVqTypeChange;
window.saveSingleQuestion = saveSingleQuestion;
window.editSingleQuestion = editSingleQuestion;
window.deleteSingleQuestion = deleteSingleQuestion;


function readJsonFile(event, targetTextareaId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById(targetTextareaId).value = e.target.result;
    showAlert("تم قراءة ملف JSON بنجاح ووضعه في مربع النص.", true);
  };
  reader.readAsText(file, "UTF-8");
}

function handleFileSelect(event, qtype) {
  readJsonFile(event, `code-${qtype}`);
}

async function injectByType(qtype) {
  const textarea = document.getElementById(`code-${qtype}`);
  const rawCode = textarea.value.trim();
  const examId = document.getElementById("editingExamId")?.value;
  const title = document.getElementById("examTitle")?.value.trim();
  const duration_minutes = parseInt(document.getElementById("durationMinutes")?.value, 10);

  // 1. Save Exam Settings (Title & Duration) automatically if present
  if (examId && title && duration_minutes) {
    await autoSaveExamSettings();
  }

  // If no new JSON question code provided, just save settings and notify user
  if (!rawCode) {
    showAlert("تم حفظ بيانات الاختبار بنجاح.", true);
    return;
  }

  let questionsParsed;
  try {
    questionsParsed = JSON.parse(rawCode);
    if (!Array.isArray(questionsParsed)) {
      questionsParsed = [questionsParsed];
    }
    questionsParsed.forEach(q => {
      if (q && typeof q === 'object') {
        q.type = qtype;
        q.exam_id = examId;
      }
    });
  } catch (err) {
    showAlert("كود JSON غير صالح. الرجاء التأكد من التنسيق الصحيح.", false);
    return;
  }

  let injectedOk = false;

  // 1. Try local server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/admin/questions/inject", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ qtype, questions: questionsParsed, exam_id: examId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) injectedOk = true;
  } catch (err) {}

  // 2. Direct Firebase RTDB fallback
  if (!injectedOk) {
    try {
      const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
      const cleanExamId = String(examId).replace(/^exams_/, '');
      
      let existingQuestions = Array.isArray(window.loadedExamQuestionsCache) 
        ? [...window.loadedExamQuestionsCache] 
        : [];

      const otherQuestions = existingQuestions.filter(q => q && q.type !== qtype);
      const updatedQuestions = [...otherQuestions, ...questionsParsed];

      await Promise.all([
        fetch(`${fbBase}/exams/${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: updatedQuestions })
        }).catch(() => null),
        fetch(`${fbBase}/exams/exams_${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: updatedQuestions })
        }).catch(() => null)
      ]);

      // If active exam, also sync
      try {
        const sRes = await fetch(`${fbBase}/settings.json`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData && (String(sData.active_exam_id) === String(cleanExamId) || String(sData.active_exam_id) === String(examId))) {
            await Promise.all([
              fetch(`${fbBase}/active_exam.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: updatedQuestions })
              }).catch(() => null),
              fetch(`${fbBase}/questions.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedQuestions)
              }).catch(() => null)
            ]);
          }
        }
      } catch(e) {}

      window.loadedExamQuestionsCache = updatedQuestions;
      try { localStorage.setItem(`cached_questions_${cleanExamId}`, JSON.stringify(updatedQuestions)); } catch(e) {}
      injectedOk = true;
    } catch(fbErr) {
      console.error("Firebase inject questions failed:", fbErr);
    }
  }

  if (injectedOk) {
    showAlert("تم حفظ البيانات والأسئلة بنجاح في السحابة.", true);
    textarea.value = JSON.stringify(questionsParsed, null, 2);
    await loadQuestionsPreview(examId);
    await loadExams();
  } else {
    showAlert("فشل حفظ الأسئلة.", false);
  }
}

async function clearByType(qtype) {
  const examId = document.getElementById("editingExamId")?.value;
  if (!examId) return;

  let typeLabel = "اختيار من متعدد";
  if (qtype === "true_false") typeLabel = "صح وخطأ";
  if (qtype === "matching") typeLabel = "توصيل";

  const confirmed = window.AlbayanDialog
    ? await AlbayanDialog.confirm(`هل أنت متأكد من رغبتك في تفريغ ومحو أسئلة (${typeLabel}) فقط لهذا الاختبار؟`, "تفريغ نوع أسئلة", { confirmText: "تفريغ الأسئلة", danger: true })
    : confirm(`هل أنت متأكد من رغبتك في تفريغ ومحو أسئلة (${typeLabel}) فقط لهذا الاختبار؟`);

  if (!confirmed) return;

  let clearedOk = false;

  // 1. Try local server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/admin/questions/clear", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ qtype, exam_id: examId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) clearedOk = true;
  } catch (err) {}

  // 2. Direct Firebase RTDB fallback
  if (!clearedOk) {
    try {
      const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
      const cleanExamId = String(examId).replace(/^exams_/, '');
      let existingQuestions = Array.isArray(window.loadedExamQuestionsCache) 
        ? [...window.loadedExamQuestionsCache] 
        : [];

      const remainingQuestions = existingQuestions.filter(q => q && q.type !== qtype);

      await Promise.all([
        fetch(`${fbBase}/exams/${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: remainingQuestions })
        }).catch(() => null),
        fetch(`${fbBase}/exams/exams_${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: remainingQuestions })
        }).catch(() => null)
      ]);

      // If active exam, sync
      try {
        const sRes = await fetch(`${fbBase}/settings.json`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData && (String(sData.active_exam_id) === String(cleanExamId) || String(sData.active_exam_id) === String(examId))) {
            await Promise.all([
              fetch(`${fbBase}/active_exam.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: remainingQuestions })
              }).catch(() => null),
              fetch(`${fbBase}/questions.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(remainingQuestions)
              }).catch(() => null)
            ]);
          }
        }
      } catch(e) {}

      window.loadedExamQuestionsCache = remainingQuestions;
      try { localStorage.setItem(`cached_questions_${cleanExamId}`, JSON.stringify(remainingQuestions)); } catch(e) {}
      clearedOk = true;
    } catch(fbErr) {
      console.error("Firebase clearByType error:", fbErr);
    }
  }

  if (clearedOk) {
    showAlert(`تم تفريغ أسئلة (${typeLabel}) بنجاح.`, true);
    const textarea = document.getElementById(`code-${qtype}`);
    if (textarea) textarea.value = "[]";
    await loadQuestionsPreview(examId);
    await loadExams();
  } else {
    showAlert("فشل تفريغ الأسئلة.", false);
  }
}

async function clearAllQuestions() {
  const examId = document.getElementById("editingExamId")?.value;
  if (!examId) return;

  const confirmed = window.AlbayanDialog
    ? await AlbayanDialog.confirm("⚠️ هل أنت متأكد تماماً من رغبتك في تفريغ ومحو جميع أسئلة هذا الاختبار كلياً؟", "تفريغ كافة الأسئلة", { confirmText: "نعم، حذف الكل", danger: true })
    : confirm("⚠️ هل أنت متأكد تماماً من رغبتك في تفريغ ومحو جميع أسئلة هذا الاختبار كلياً؟");

  if (!confirmed) return;

  let clearedOk = false;

  // 1. Try local server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/admin/questions/clear_all", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ exam_id: examId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) clearedOk = true;
  } catch (err) {}

  // 2. Direct Firebase RTDB fallback
  if (!clearedOk) {
    try {
      const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
      const cleanExamId = String(examId).replace(/^exams_/, '');
      const emptyQuestions = [];

      await Promise.all([
        fetch(`${fbBase}/exams/${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: emptyQuestions })
        }).catch(() => null),
        fetch(`${fbBase}/exams/exams_${cleanExamId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: emptyQuestions })
        }).catch(() => null)
      ]);

      // If active exam, sync
      try {
        const sRes = await fetch(`${fbBase}/settings.json`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData && (String(sData.active_exam_id) === String(cleanExamId) || String(sData.active_exam_id) === String(examId))) {
            await Promise.all([
              fetch(`${fbBase}/active_exam.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: emptyQuestions })
              }).catch(() => null),
              fetch(`${fbBase}/questions.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(emptyQuestions)
              }).catch(() => null)
            ]);
          }
        }
      } catch(e) {}

      window.loadedExamQuestionsCache = emptyQuestions;
      try { localStorage.setItem(`cached_questions_${cleanExamId}`, JSON.stringify(emptyQuestions)); } catch(e) {}
      clearedOk = true;
    } catch(fbErr) {
      console.error("Firebase clearAllQuestions error:", fbErr);
    }
  }

  if (clearedOk) {
    showAlert("تم محو كافة أسئلة الاختبار بنجاح.", true);
    await loadQuestionsPreview(examId);
    await loadAllJsonBoxes(examId);
    await loadExams();
  } else {
    showAlert("فشل تفريغ جميع الأسئلة.", false);
  }
}

/* Mobile Sidebar Drawer Controller */
function initMobileSidebar() {
  if (typeof initMobileBottomNav === 'function') {
    initMobileBottomNav();
  }
}

// Global Window Exports for inline HTML onclick/onsubmit handlers
window.getCsrfToken = getCsrfToken;
window.csrfHeaders = csrfHeaders;
window.checkAuth = checkAuth;
window.showAlert = showAlert;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.loadExams = loadExams;
window.renderExamsCards = renderExamsCards;
window.escapeHtml = escapeHtml;
window.toggleExamDropdown = toggleExamDropdown;
window.openCreateExamModal = openCreateExamModal;
window.saveNewExam = saveNewExam;
window.setExamStatus = setExamStatus;
window.activateExam = activateExam;
window.deactivateExam = deactivateExam;
window.deleteExam = deleteExam;
window.loadJsonBoxQuestions = loadJsonBoxQuestions;
window.loadAllJsonBoxes = loadAllJsonBoxes;
window.openExamEditor = openExamEditor;
window.closeExamEditor = closeExamEditor;
window.saveExamSettings = saveExamSettings;
window.autoSaveExamSettings = autoSaveExamSettings;
window.switchQTab = switchQTab;
window.toggleQuestionsPreview = toggleQuestionsPreview;
window.loadQuestionsPreview = loadQuestionsPreview;
window.renderVqMatchingPairs = renderVqMatchingPairs;
window.addVqMatchingPair = addVqMatchingPair;
window.addVqMatchingPairRow = addVqMatchingPairRow;
window.removeVqMatchingPairRow = removeVqMatchingPairRow;
window.getVqMatchingPairs = getVqMatchingPairs;
window.openVisualQuestionModal = openVisualQuestionModal;
window.onVqTypeChange = onVqTypeChange;
window.saveSingleQuestion = saveSingleQuestion;
window.previewCurrentVqQuestion = previewCurrentVqQuestion;
window.previewQuestionByIndex = previewQuestionByIndex;
window.renderInteractivePreviewModal = renderInteractivePreviewModal;
window.editSingleQuestion = editSingleQuestion;
window.deleteSingleQuestion = deleteSingleQuestion;
window.readJsonFile = readJsonFile;
window.handleFileSelect = handleFileSelect;
window.injectByType = injectByType;
window.clearByType = clearByType;
window.clearAllQuestions = clearAllQuestions;
window.initMobileSidebar = initMobileSidebar;




