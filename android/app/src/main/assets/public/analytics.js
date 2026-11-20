// CSRF Token Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}
function csrfHeaders(extra = {}) {
  return Object.assign({"Content-Type": "application/json", "X-CSRF-Token": getCsrfToken()}, extra);
}

// Shared Helpers (XSS, ID Normalization, Grade Categorization, Exam Status)
function escapeHtml(val) {
  return String(val == null ? "" : val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEntityId(val, prefix = "") {
  if (val === undefined || val === null) return "";
  let s = String(val).trim();
  if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length);
  return s;
}

function normalizeArabicSearch(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, " ");
}

function getDefaultAcademicYear() {
  if (window.HijriDate && typeof window.HijriDate.getCurrentHijriYear === "function") {
    const hy = window.HijriDate.getCurrentHijriYear();
    if (hy) return String(hy);
  }
  return "1448";
}

function getPreferredCurrentPeriodValue(selectEl) {
  if (window.HijriDate && typeof window.HijriDate.getCurrentHijriMonth === "function") {
    const hm = window.HijriDate.getCurrentHijriMonth();
    if (hm && selectEl && Array.from(selectEl.options).some(o => o.value === hm)) {
      return hm;
    }
  }
  if (selectEl && Array.from(selectEl.options).some(o => o.value === "active_cycle")) {
    return "active_cycle";
  }
  return "all";
}

function categorizeGrade(grade, maxMark = 40) {
  if (grade === undefined || grade === null || grade === "" || grade === 0 || grade === "0") {
    return "غير محدد";
  }
  const g = String(grade).trim();
  const num = Number(g);
  if (g !== "" && !Number.isNaN(num)) {
    const effectiveMax = Number(maxMark) > 0 ? Number(maxMark) : 40;
    const pct = (num / effectiveMax) * 100;
    if (pct >= 90) return "ممتاز";
    if (pct >= 80) return "جيد جداً";
    if (pct >= 65) return "جيد";
    if (pct >= 50) return "مقبول";
    return "يحتاج متابعة";
  }
  const norm = normalizeArabicSearch(g);
  if (["ممتاز", "ممتازه", "ممتاز مرتفع"].includes(norm)) return "ممتاز";
  if (["جيد جدا"].includes(norm)) return "جيد جداً";
  if (norm === "جيد") return "جيد";
  if (norm === "مقبول") return "مقبول";
  if (["ضعيف", "يحتاج متابعه", "يحتاج الي متابعه", "متابعه"].includes(norm)) return "يحتاج متابعة";
  return "غير محدد";
}

function getGradeBadgeClass(gradeCat) {
  if (gradeCat === "ممتاز") return "badge-star";
  if (gradeCat === "جيد جداً") return "badge-blue";
  if (gradeCat === "جيد") return "badge-yellow";
  if (gradeCat === "مقبول" || gradeCat === "يحتاج متابعة") return "badge-red";
  return "badge-blue";
}

function getExamResultTotalQuestions(r) {
  if (!r || typeof r !== "object") return 0;
  const raw = Number(r.total_questions != null ? r.total_questions : (r.total != null ? r.total : (Array.isArray(r.answers) ? r.answers.length : 0)));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function getExamResultPercentage(r) {
  if (!r || typeof r !== "object") return 0;
  if (r.percentage !== undefined && r.percentage !== null && r.percentage !== "") {
    const p = Number(r.percentage);
    if (Number.isFinite(p)) return Math.round(p);
  }
  const sc = Number(r.score) || 0;
  const tot = getExamResultTotalQuestions(r);
  return tot > 0 ? Math.round((sc / tot) * 100) : 0;
}

function isExamResultPassed(r) {
  if (!r || typeof r !== "object") return false;
  if (r.passed === 1 || r.passed === true || String(r.passed) === "1") return true;
  if (r.passed === 0 || r.passed === false || String(r.passed) === "0") return false;
  return getExamResultPercentage(r) >= 50;
}

function getCurrentAnalyticsUser() {
  if (window.AlbayanPermissions && typeof window.AlbayanPermissions.getCurrentUser === "function") {
    const u = window.AlbayanPermissions.getCurrentUser();
    if (u) return u;
  }
  if (_analyticsAuthUser) return _analyticsAuthUser;
  try {
    const raw = localStorage.getItem("albayan_logged_user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function filterCirclesByPermission(circlesList, usersList = []) {
  if (!Array.isArray(circlesList)) return [];
  const u = getCurrentAnalyticsUser();
  if (!u) return circlesList;
  const canAll = window.AlbayanPermissions
    ? window.AlbayanPermissions.hasPermission("all_circles", u)
    : (u.is_superadmin === 1 || u.role === "admin" || (Array.isArray(u.permissions) && u.permissions.includes("all_circles")));
  if (canAll) return circlesList;

  const myId = normalizeEntityId(u.id, "users_");
  const myName = normalizeArabicSearch(u.username || u.display_name || "");
  const usersMap = new Map();
  (usersList || []).forEach(usr => {
    if (!usr) return;
    const uid = normalizeEntityId(usr.id, "users_");
    if (uid) usersMap.set(uid, usr);
  });

  return circlesList.filter(c => {
    if (!c) return false;
    const tid = normalizeEntityId(c.teacher_id, "users_");
    if (myId && tid && tid === myId) return true;
    const userObj = tid ? usersMap.get(tid) : null;
    const resolvedTeacher = normalizeArabicSearch(c.teacher_name || c.teacher || (userObj && (userObj.username || userObj.display_name)) || "");
    return Boolean(myName && resolvedTeacher === myName);
  });
}

// Back-to-Top Button Logic
function initBackToTop() {
  const btn = document.getElementById("backTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.style.opacity = window.scrollY > 300 ? "1" : "0";
    btn.style.pointerEvents = window.scrollY > 300 ? "auto" : "none";
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

let analyticsCache = null;
let currentFilteredExamStudents = [];
let currentFilteredCircleStudents = [];
let currentAnalyticsView = "circles";
let _analyticsAuthUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  initMobileSidebar();
  initBackToTop();
  await checkAuth();

  // Check if opened with exam_id parameter or view request
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("exam_id") || urlParams.get("view") === "exams") {
    switchAnalyticsView("exams");
  } else if (urlParams.get("view") === "students") {
    switchAnalyticsView("students");
  }

  const defaultYear = getDefaultAcademicYear();
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");

  if (cy && !cy.value) cy.value = defaultYear;
  if (sy && !sy.value) sy.value = defaultYear;
  if (cm) cm.value = "all";
  if (sm) sm.value = "all";

  adaptAnalyticsFilters({});
  loadAnalyticsData();

  window.addEventListener("albayan:record-period-updated", () => {
    lastAdaptedSignature = "";
    loadAnalyticsData();
  });
  window.addEventListener("albayan:cycle-updated", () => {
    lastAdaptedSignature = "";
    loadAnalyticsData();
  });
  window.addEventListener("albayan:cycle-archived", () => {
    lastAdaptedSignature = "";
    loadAnalyticsData();
  });
});

function isStandaloneRuntime() {
  const loc = window.location || {};
  return Boolean(
    window.IS_CAPACITOR_APP ||
    loc.protocol === "file:" ||
    String(loc.origin || "").includes("capacitor://") ||
    (loc.hostname === "localhost" && (!loc.port || loc.port === "80"))
  );
}

async function checkAuth() {
  const isStandalone = isStandaloneRuntime();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/me", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Auth check failed");

    const data = await res.json();
    if (!data.logged_in) {
      if (!isStandalone) {
        window.location.href = "login.html";
        return;
      }
    } else {
      _analyticsAuthUser = data;
      const userElem = document.getElementById("loggedUsername");
      if (userElem) userElem.textContent = data.username || "الكادر التعليمي";
    }
    const canAccessCv = window.AlbayanPermissions
      ? window.AlbayanPermissions.hasPermission("student_cv", data)
      : (data.is_superadmin === 1 || data.role === "admin" || (Array.isArray(data.permissions) && data.permissions.includes("student_cv")));
    const cvLink = document.getElementById("studentCvMenuLink");
    if (cvLink) cvLink.style.display = canAccessCv ? "flex" : "none";

    const canAccessUsers = window.AlbayanPermissions
      ? window.AlbayanPermissions.hasPermission("users", data)
      : (data.is_superadmin === 1 || data.role === "admin" || (Array.isArray(data.permissions) && data.permissions.includes("users")));
    const usersLink = document.getElementById("usersMenuLink");
    if (usersLink) usersLink.style.display = canAccessUsers ? "flex" : "none";
    if (window.AlbayanPermissions) {
      window.AlbayanPermissions.applyNavPermissions(data);
      window.AlbayanPermissions.enforcePageAccess(data);
    }
  } catch (err) {
    let username = "الكادر التعليمي";
    try {
      const cached = localStorage.getItem("albayan_logged_user");
      if (cached) {
        const u = JSON.parse(cached);
        _analyticsAuthUser = u;
        if (u && u.username) username = u.username;
        if (u && window.AlbayanPermissions) {
          window.AlbayanPermissions.applyNavPermissions(u);
          window.AlbayanPermissions.enforcePageAccess(u);
        }
      }
    } catch(e) {}
    const userElem = document.getElementById("loggedUsername");
    if (userElem) userElem.textContent = username;
  }
}

function switchAnalyticsView(viewType) {
  currentAnalyticsView = viewType || "circles";
  const circlesSec = document.getElementById("viewCirclesAnalytics");
  const studentsSec = document.getElementById("viewStudentsAnalytics");
  const examsSec = document.getElementById("viewExamsAnalytics");
  const btnCircles = document.getElementById("tabBtnCircles");
  const btnStudents = document.getElementById("tabBtnStudents");
  const btnExams = document.getElementById("tabBtnExams");

  if (circlesSec) circlesSec.style.display = "none";
  if (studentsSec) studentsSec.style.display = "none";
  if (examsSec) examsSec.style.display = "none";
  if (btnCircles) btnCircles.classList.remove("active");
  if (btnStudents) btnStudents.classList.remove("active");
  if (btnExams) btnExams.classList.remove("active");

  if (viewType === "exams") {
    if (examsSec) examsSec.style.display = "block";
    if (btnExams) btnExams.classList.add("active");
  } else if (viewType === "students") {
    if (studentsSec) studentsSec.style.display = "block";
    if (btnStudents) btnStudents.classList.add("active");
  } else {
    if (circlesSec) circlesSec.style.display = "block";
    if (btnCircles) btnCircles.classList.add("active");
  }

  if (window.lucide) lucide.createIcons();
}

window.switchAnalyticsView = switchAnalyticsView;

async function buildServerlessAnalytics(year, month, requestedExamId) {
  const rtdbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
  const normalizer = window.AlbayanDataNormalizer || null;

  // 1. Parallel fetch from Firebase RTDB (with fast timeout)
  let rawCircles = null;
  let rawStudents = null;
  let rawRecords = null;
  let rawExams = null;
  let rawResults = null;
  let rawSettings = null;
  let rawUsers = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const [cRes, sRes, recRes, eRes, rRes, setRes, uRes] = await Promise.all([
      fetch(`${rtdbBase}/circles.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/students.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/student_records.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/exams.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/results.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/settings.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/users.json`, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    if (cRes && cRes.ok) rawCircles = await cRes.json().catch(() => null);
    if (sRes && sRes.ok) rawStudents = await sRes.json().catch(() => null);
    if (recRes && recRes.ok) rawRecords = await recRes.json().catch(() => null);
    if (eRes && eRes.ok) rawExams = await eRes.json().catch(() => null);
    if (rRes && rRes.ok) rawResults = await rRes.json().catch(() => null);
    if (setRes && setRes.ok) rawSettings = await setRes.json().catch(() => null);
    if (uRes && uRes.ok) rawUsers = await uRes.json().catch(() => null);
  } catch (err) {}

  let deletedCircles = [];
  let deletedStudents = [];
  try { deletedCircles = JSON.parse(localStorage.getItem("deleted_circles") || "[]").map(id => normalizeEntityId(id, "circles_")); } catch (e) {}
  try { deletedStudents = JSON.parse(localStorage.getItem("deleted_students") || "[]").map(id => normalizeEntityId(id, "students_")); } catch (e) {}

  // Users lookup (for resolving circle teacher_name)
  let usersList = [];
  if (rawUsers) {
    usersList = normalizer && normalizer.normalizeCollectionEntries
      ? normalizer.normalizeCollectionEntries(rawUsers, { idPrefix: "users_" })
      : (Array.isArray(rawUsers) ? rawUsers.filter(Boolean) : Object.values(rawUsers));
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getUsers === "function") {
    try { usersList = await window.AlbayanLocalDB.getUsers(); } catch (e) {}
  }
  if (!usersList || usersList.length === 0) {
    try {
      const rawU = localStorage.getItem("cached_users_list");
      if (rawU) usersList = JSON.parse(rawU);
    } catch (e) {}
  }
  const userById = new Map();
  (usersList || []).forEach(u => {
    if (!u || u.deleted) return;
    const uid = normalizeEntityId(u.id, "users_");
    if (uid) userById.set(uid, u);
  });

  // 2. Circles with normalizer & LocalDB/localStorage fallbacks
  let circles = [];
  if (rawCircles) {
    circles = normalizer && normalizer.resolveCircles
      ? (normalizer.resolveCircles(rawCircles).circles || [])
      : (Array.isArray(rawCircles) ? rawCircles.filter(Boolean) : Object.values(rawCircles));
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === "function") {
    try { circles = await window.AlbayanLocalDB.getLocalCircles(); } catch(e) {}
  }
  if (!circles || circles.length === 0) {
    try {
      const raw = localStorage.getItem("albayan_cached_circles") || localStorage.getItem("cached_circles_list");
      if (raw) circles = JSON.parse(raw);
    } catch(e) {}
  }

  circles = (circles || [])
    .filter(c => c && !c.deleted && c.is_deleted !== 1 && c.is_deleted !== true)
    .map((c, idx) => {
      const normId = normalizeEntityId(c.id !== undefined ? c.id : idx + 1, "circles_");
      const tid = normalizeEntityId(c.teacher_id, "users_");
      const teacherObj = tid ? userById.get(tid) : null;
      return {
        ...c,
        id: normId || String(idx + 1),
        name: c.name || `حلقة ${idx + 1}`,
        teacher_name: c.teacher_name || c.teacher || (teacherObj && (teacherObj.username || teacherObj.display_name)) || "كادر تعليمي"
      };
    })
    .filter(c => !deletedCircles.includes(String(c.id)));

  // Scope circles by user permissions (teachers without all_circles see their own circles)
  circles = filterCirclesByPermission(circles, usersList);
  const allowedCircleIds = new Set(circles.map(c => String(c.id)));
  const allowedCircleNames = new Set(circles.map(c => normalizeArabicSearch(c.name)));
  const circleById = new Map();
  const circleByName = new Map();
  circles.forEach(c => {
    circleById.set(String(c.id), c);
    circleByName.set(normalizeArabicSearch(c.name), c);
  });

  // Students with normalizer & per-circle LocalDB fallback
  let students = [];
  if (rawStudents) {
    students = normalizer && normalizer.resolveStudents
      ? (normalizer.resolveStudents(rawStudents).students || [])
      : (Array.isArray(rawStudents) ? rawStudents.filter(Boolean) : Object.values(rawStudents));
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalStudents === "function" && circles.length > 0) {
    try {
      const perCircle = await Promise.all(
        circles.map(c => window.AlbayanLocalDB.getLocalStudents(c.id, { month: month || "all", year: year || "" }).catch(() => []))
      );
      students = perCircle.flat();
    } catch(e) {}
  }
  if (!students || students.length === 0) {
    try {
      const raw = localStorage.getItem("cached_students_full");
      if (raw) students = JSON.parse(raw);
    } catch(e) {}
  }

  let exams = [];
  if (rawExams) {
    exams = normalizer && normalizer.normalizeCollectionEntries
      ? normalizer.normalizeCollectionEntries(rawExams, { idPrefix: "exams_" })
      : (Array.isArray(rawExams) ? rawExams.filter(Boolean) : Object.values(rawExams));
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalExams === "function") {
    try { exams = await window.AlbayanLocalDB.getLocalExams(); } catch(e) {}
  }
  if (!exams || exams.length === 0) {
    try {
      const raw = localStorage.getItem("cached_exams_list");
      if (raw) exams = JSON.parse(raw);
    } catch(e) {}
  }

  let results = [];
  if (rawResults) {
    results = normalizer && normalizer.normalizeCollectionEntries
      ? normalizer.normalizeCollectionEntries(rawResults, { idPrefix: "results_" })
      : (Array.isArray(rawResults) ? rawResults.filter(Boolean) : Object.values(rawResults));
  } else {
    try {
      const raw = localStorage.getItem("cached_results_list") || localStorage.getItem("albayan_cached_results");
      if (raw) results = JSON.parse(raw);
    } catch(e) {}
  }

  // Normalize & enrich Students, Exams, Results
  const canAllCircles = (() => {
    const u = getCurrentAnalyticsUser();
    if (!u) return true;
    return window.AlbayanPermissions
      ? window.AlbayanPermissions.hasPermission("all_circles", u)
      : (u.is_superadmin === 1 || u.role === "admin" || (Array.isArray(u.permissions) && u.permissions.includes("all_circles")));
  })();

  students = (students || [])
    .filter(s => s && !s.deleted && s.is_deleted !== 1 && s.is_deleted !== true)
    .map((s, idx) => {
      const sid = normalizeEntityId(s.id !== undefined ? s.id : (s.student_id !== undefined ? s.student_id : idx + 1), "students_");
      const cid = normalizeEntityId(s.circle_id, "circles_");
      const matchedCircle = (cid && circleById.get(cid)) || (s.circle_name && circleByName.get(normalizeArabicSearch(s.circle_name))) || null;
      return {
        ...s,
        id: sid || String(idx + 1),
        circle_id: matchedCircle ? matchedCircle.id : cid,
        circle_name: s.circle_name || (matchedCircle && matchedCircle.name) || "حلقة عامة",
        teacher_name: s.teacher_name || (matchedCircle && matchedCircle.teacher_name) || "كادر تعليمي",
        name: s.name || `طالب ${idx + 1}`
      };
    })
    .filter(s => {
      if (deletedStudents.includes(String(s.id))) return false;
      if (!canAllCircles) {
        return allowedCircleIds.has(String(s.circle_id)) || allowedCircleNames.has(normalizeArabicSearch(s.circle_name));
      }
      return true;
    });

  exams = (exams || [])
    .filter(e => e && !e.deleted && e.is_deleted !== 1 && e.is_deleted !== true)
    .map((e, idx) => ({
      ...e,
      id: normalizeEntityId(e.id !== undefined ? e.id : idx + 1, "exams_") || String(idx + 1),
      title: e.title || `اختبار ${idx + 1}`
    }));

  results = (results || [])
    .filter(r => r && !r.deleted && r.is_deleted !== 1 && r.is_deleted !== true)
    .map((r, idx) => {
      const totalQ = getExamResultTotalQuestions(r);
      const pct = getExamResultPercentage(r);
      const pass = isExamResultPassed(r) ? 1 : 0;
      return {
        ...r,
        id: r.id !== undefined ? r.id : idx + 1,
        student_name: r.student_name || r.name || "طالب غير معروف",
        score: Number(r.score) || 0,
        total_questions: totalQ,
        percentage: pct,
        passed: pass
      };
    });

  // Cycle & Record Filtering Integration (AlbayanCycleEngine)
  const cycleEngine = window.AlbayanCycleEngine || null;
  const activeCycleCfg = cycleEngine ? cycleEngine.getConfig() : null;
  const activeArchives = cycleEngine ? cycleEngine.getArchives() : [];
  const cleanYear = year ? String(year).trim() : "";

  if (month && String(month).startsWith("archive:") && activeArchives.length > 0) {
    const arcId = String(month).slice("archive:".length);
    const matchedArchive = activeArchives.find(a => a && a.id === arcId);
    if (matchedArchive && Array.isArray(matchedArchive.studentSnapshots)) {
      students = matchedArchive.studentSnapshots
        .map((snap, idx) => {
          const cid = normalizeEntityId(snap.circle_id, "circles_");
          const matchedCircle = (cid && circleById.get(cid)) || (snap.circle_name && circleByName.get(normalizeArabicSearch(snap.circle_name))) || null;
          return {
            id: normalizeEntityId(snap.student_id || idx + 1, "students_"),
            name: snap.name || `طالب ${idx + 1}`,
            circle_id: matchedCircle ? matchedCircle.id : cid,
            circle_name: snap.circle_name || (matchedCircle && matchedCircle.name) || "حلقة عامة",
            teacher_name: snap.teacher_name || (matchedCircle && matchedCircle.teacher_name) || "كادر تعليمي",
            from_surah: snap.from_surah || "",
            to_surah: snap.to_surah || "",
            memo_pages: Number(snap.memo_pages) || 0,
            rev_pages: Number(snap.sard_pages != null ? snap.sard_pages : snap.rev_pages) || 0,
            sard_pages: Number(snap.sard_pages != null ? snap.sard_pages : snap.rev_pages) || 0,
            memo_grade: snap.memo_grade || "",
            rev_grade: snap.rev_grade || "",
            absent_days: Number(snap.absent_days) || 0,
            record_month: matchedArchive.periodLabel || "الأرشيف"
          };
        })
        .filter(s => canAllCircles || allowedCircleIds.has(String(s.circle_id)) || allowedCircleNames.has(normalizeArabicSearch(s.circle_name)));
    }
  } else {
    let recList = [];
    if (rawRecords) {
      recList = normalizer && normalizer.normalizeCollectionEntries
        ? normalizer.normalizeCollectionEntries(rawRecords, {})
        : (Array.isArray(rawRecords) ? rawRecords.filter(Boolean) : Object.values(rawRecords));
    }
    if (recList.length > 0) {
      let filteredRecs = recList.filter(r => r && !r.deleted && r.is_deleted !== 1 && r.is_deleted !== true);
      if (month === "active_cycle" && cycleEngine) {
        filteredRecs = cycleEngine.filterRecordsByActiveCycle(filteredRecs, activeCycleCfg);
      } else if (month && month !== "all" && month !== "active_cycle") {
        filteredRecs = filteredRecs.filter(r => {
          const yearMatches = !cleanYear || !r.year || String(r.year).trim() === cleanYear;
          if (!yearMatches) return false;
          if (normalizer && r.month) {
            return normalizer.isSameMonth(r.month, month);
          }
          return String(r.month || "").trim() === String(month).trim();
        });
      } else if (cleanYear) {
        // Cumulative mode ("all"): respect year filter when records carry an explicit year
        filteredRecs = filteredRecs.filter(r => !r.year || String(r.year).trim() === cleanYear);
      }

      const recByStudent = new Map();
      filteredRecs.forEach(r => {
        const sid = normalizeEntityId(r.student_id, "students_");
        if (!sid) return;
        const prev = recByStudent.get(sid);
        const sCurr = (normalizer && normalizer.scoreRecordCompleteness) ? normalizer.scoreRecordCompleteness(r) : 0;
        const sPrev = (prev && normalizer && normalizer.scoreRecordCompleteness) ? normalizer.scoreRecordCompleteness(prev) : -1;
        if (!prev || sCurr > sPrev) {
          recByStudent.set(sid, r);
        } else if (sCurr === sPrev) {
          const tCurr = new Date(r.updated_at || r.created_at || 0).getTime() || 0;
          const tPrev = new Date(prev.updated_at || prev.created_at || 0).getTime() || 0;
          if (tCurr >= tPrev) recByStudent.set(sid, r);
        }
      });

      const isSpecificMonthFilter = Boolean(month && month !== "all" && month !== "active_cycle");
      students = students.map(s => {
        const sid = normalizeEntityId(s.id, "students_");
        const r = recByStudent.get(sid);
        if (!r) {
          return isSpecificMonthFilter
            ? { ...s, from_surah: "", to_surah: "", rev_from_surah: "", rev_to_surah: "", memo_pages: 0, rev_pages: 0, sard_pages: 0, absent_days: 0, memo_grade: "", rev_grade: "", record_month: month }
            : s;
        }
        return {
          ...s,
          from_surah: r.from_surah || s.from_surah || "",
          to_surah: r.to_surah || s.to_surah || "",
          rev_from_surah: r.rev_from_surah || s.rev_from_surah || "",
          rev_to_surah: r.rev_to_surah || s.rev_to_surah || "",
          memo_pages: r.memo_pages !== undefined ? r.memo_pages : (s.memo_pages || 0),
          rev_pages: r.sard_pages !== undefined ? r.sard_pages : (r.rev_pages !== undefined ? r.rev_pages : (s.sard_pages || s.rev_pages || 0)),
          sard_pages: r.sard_pages !== undefined ? r.sard_pages : (s.sard_pages || 0),
          memo_grade: r.memo_grade !== undefined ? r.memo_grade : (s.memo_grade || ""),
          rev_grade: r.rev_grade !== undefined ? r.rev_grade : (s.rev_grade || ""),
          absent_days: r.absent_days !== undefined ? r.absent_days : (s.absent_days || 0),
          exam_grade: r.exam_grade !== undefined ? r.exam_grade : (s.exam_grade || ""),
          record_month: r.month || s.record_month || ""
        };
      });
    }
  }

  // Enrich students with latest online exam result if available
  const latestResultByStudentId = new Map();
  const latestResultByName = new Map();
  results.forEach(r => {
    const rsid = normalizeEntityId(r.student_id, "students_");
    const rname = normalizeArabicSearch(r.student_name);
    if (rsid) latestResultByStudentId.set(rsid, r);
    if (rname) latestResultByName.set(rname, r);
  });
  students = students.map(s => {
    const matchedRes = latestResultByStudentId.get(String(s.id)) || latestResultByName.get(normalizeArabicSearch(s.name));
    if (!matchedRes || s.online_exam_score) return s;
    const scoreTxt = matchedRes.total_questions > 0
      ? `${matchedRes.score}/${matchedRes.total_questions} (${matchedRes.percentage}%)`
      : `${matchedRes.percentage}%`;
    return {
      ...s,
      online_exam_score: scoreTxt,
      online_exam_title: matchedRes.exam_title || "اختبار إلكتروني"
    };
  });

  // Filter exams list
  const examsList = exams.map(e => ({
    id: e.id,
    title: e.title,
    duration_minutes: e.duration_minutes || 20,
    is_active: e.is_active != null ? Number(e.is_active) : 1,
    question_count: Array.isArray(e.questions) ? e.questions.length : (e.question_count || 0)
  }));

  // Selected Exam
  let selectedExam = null;
  let selectedExamId = null;
  if (requestedExamId && requestedExamId !== "all") {
    const cleanReqExam = normalizeEntityId(requestedExamId, "exams_");
    selectedExam = examsList.find(e => String(e.id) === String(requestedExamId) || String(e.id) === cleanReqExam) || null;
    if (selectedExam) selectedExamId = selectedExam.id;
  }

  // Filter results for selected exam
  let filteredResults = results;
  if (selectedExam) {
    filteredResults = results.filter(r =>
      normalizeEntityId(r.exam_id, "exams_") === String(selectedExam.id) ||
      (r.exam_title && r.exam_title.trim() === selectedExam.title.trim())
    );
  }

  // Online Exams Statistics
  const totalExamsStudents = filteredResults.length;
  let passedCount = 0;
  let totalScoreSum = 0;
  let totalPercentSum = 0;
  let maxScore = 0;
  let minScore = totalExamsStudents > 0 ? 9999 : 0;

  filteredResults.forEach(r => {
    const sc = Number(r.score) || 0;
    const pct = getExamResultPercentage(r);
    if (isExamResultPassed(r)) passedCount++;
    totalScoreSum += sc;
    totalPercentSum += pct;
    if (sc > maxScore) maxScore = sc;
    if (sc < minScore) minScore = sc;
  });
  if (minScore === 9999) minScore = 0;

  const failedCount = totalExamsStudents - passedCount;
  const avgScore = totalExamsStudents > 0 ? (totalScoreSum / totalExamsStudents).toFixed(1) : 0;
  const avgPercent = totalExamsStudents > 0 ? Math.round(totalPercentSum / totalExamsStudents) : 0;
  const passRate = totalExamsStudents > 0 ? ((passedCount / totalExamsStudents) * 100).toFixed(1) : 0;
  const failRate = totalExamsStudents > 0 ? ((failedCount / totalExamsStudents) * 100).toFixed(1) : 0;

  // Question stats breakdown
  const questionMap = {};
  filteredResults.forEach(r => {
    const answers = Array.isArray(r.answers) ? r.answers : [];
    answers.forEach(a => {
      if (!a) return;
      const qText = (a.question_text || a.title || "").trim();
      if (!qText) return;
      if (!questionMap[qText]) {
        questionMap[qText] = {
          question_text: qText,
          question_type: a.question_type || "choice",
          total_attempts: 0,
          correct_count: 0
        };
      }
      questionMap[qText].total_attempts++;
      if (a.is_correct === 1 || a.is_correct === true) {
        questionMap[qText].correct_count++;
      }
    });
  });

  const questionStats = Object.values(questionMap).map((q, idx) => {
    const tot = q.total_attempts;
    const corr = q.correct_count;
    const acc = tot > 0 ? Math.round((corr / tot) * 100) : 0;
    return {
      id: idx + 1,
      question_text: q.question_text,
      question_type: q.question_type,
      total_attempts: tot,
      correct_count: corr,
      wrong_count: Math.max(0, tot - corr),
      accuracy: acc
    };
  });

  let hardestQuestion = null;
  let easiestQuestion = null;
  if (questionStats.length > 0) {
    const sorted = [...questionStats].sort((a, b) => a.accuracy - b.accuracy);
    hardestQuestion = sorted[0];
    easiestQuestion = sorted[sorted.length - 1];
  }

  // CIRCLES ANALYTICS & STUDENT STATS
  const totalCircles = circles.length;
  const totalStudents = students.length;
  const avgStudentsPerCircle = totalCircles > 0 ? (totalStudents / totalCircles).toFixed(1) : 0;

  let totalAbsentDays = 0;
  let excellentMemoCount = 0;

  const memoCounts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "يحتاج متابعة": 0, "غير محدد": 0 };
  const revCounts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "يحتاج متابعة": 0, "غير محدد": 0 };

  // Group students by normalized circle id & normalized circle name
  const circleStudentsById = {};
  const circleStudentsByName = {};
  circles.forEach(c => {
    const arr = [];
    circleStudentsById[String(c.id)] = arr;
    circleStudentsByName[normalizeArabicSearch(c.name)] = arr;
  });

  students.forEach(s => {
    const abs = Number(s.absent_days) || 0;
    totalAbsentDays += abs;

    const rawMgCat = categorizeGrade(s.memo_grade, 40);
    const rawRgCat = categorizeGrade(s.rev_grade, 30);
    const mgBucket = rawMgCat === "مقبول" ? "يحتاج متابعة" : rawMgCat;
    const rgBucket = rawRgCat === "مقبول" ? "يحتاج متابعة" : rawRgCat;
    memoCounts[mgBucket] = (memoCounts[mgBucket] || 0) + 1;
    revCounts[rgBucket] = (revCounts[rgBucket] || 0) + 1;

    if (rawMgCat === "ممتاز") excellentMemoCount++;

    const normCid = normalizeEntityId(s.circle_id, "circles_");
    const cTarget = circleStudentsById[normCid] || circleStudentsByName[normalizeArabicSearch(s.circle_name)];
    if (cTarget) {
      cTarget.push(s);
    }
  });

  const attendanceRate = totalStudents > 0
    ? Math.max(0, Math.min(100, Math.round(100 - (totalAbsentDays / (totalStudents * 30)) * 100)))
    : 100;

  const buildBreakdown = (countsObj) => {
    const res = {};
    const gradesOrder = ["ممتاز", "جيد جداً", "جيد", "يحتاج متابعة", "غير محدد"];
    gradesOrder.forEach(g => {
      const cnt = countsObj[g] || 0;
      const pct = totalStudents > 0 ? Math.round((cnt / totalStudents) * 100) : 0;
      res[g] = { count: cnt, percent: pct };
    });
    return res;
  };

  const memoBreakdown = buildBreakdown(memoCounts);
  const revBreakdown = buildBreakdown(revCounts);

  // Circle Rankings
  const circleRankings = circles.map(c => {
    const cStudents = circleStudentsById[String(c.id)] || [];
    const count = cStudents.length;
    const cAbsent = cStudents.reduce((acc, st) => acc + (Number(st.absent_days) || 0), 0);
    const cAvgAbsent = count > 0 ? (cAbsent / count).toFixed(1) : 0;
    const cTotalMemoPages = cStudents.reduce((acc, st) => acc + (Number(st.memo_pages) || 0), 0);
    const cTotalRevPages = cStudents.reduce((acc, st) => acc + (Number(st.rev_pages) || 0), 0);
    const cExcellentCount = cStudents.filter(st => categorizeGrade(st.memo_grade, 40) === "ممتاز").length;
    const cMemoIndex = count > 0 ? Math.round((cExcellentCount / count) * 100) : 0;

    let statusBadge = "🌟 حلقة متميزة";
    let statusClass = "pass";
    if (count > 0 && cMemoIndex >= 80 && Number(cAvgAbsent) <= 1) {
      statusBadge = "🏆 الصدارة الذهبية";
      statusClass = "platinum";
    } else if (cMemoIndex >= 50) {
      statusBadge = "⭐ أداء ممتاز";
      statusClass = "gold";
    } else if (Number(cAvgAbsent) > 3) {
      statusBadge = "⚠️ بحاجة لمتابعة";
      statusClass = "danger";
    } else {
      statusBadge = "🔹 أداء منتظم";
      statusClass = "neutral";
    }

    return {
      id: c.id,
      name: c.name,
      teacher_name: c.teacher_name || c.teacher || "كادر تعليمي",
      student_count: count,
      total_absent: cAbsent,
      avg_absent: cAvgAbsent,
      total_memo_pages: cTotalMemoPages,
      total_rev_pages: cTotalRevPages,
      excellent_count: cExcellentCount,
      memo_index: cMemoIndex,
      status_badge: statusBadge,
      status_class: statusClass,
      students: cStudents
    };
  }).sort((a, b) => b.student_count - a.student_count || b.memo_index - a.memo_index);

  // Top Insights
  const topCircle = circleRankings[0] || null;
  const mostDisciplinedCircle = [...circleRankings].sort((a, b) => Number(a.avg_absent) - Number(b.avg_absent))[0] || null;
  const topMemoCircle = [...circleRankings].sort((a, b) => b.memo_index - a.memo_index)[0] || null;

  // Top Students Achievers
  const topMemoStudent = [...students].sort((a, b) => (Number(b.memo_pages) || 0) - (Number(a.memo_pages) || 0))[0] || null;
  const topRevStudent = [...students].sort((a, b) => (Number(b.rev_pages) || 0) - (Number(a.rev_pages) || 0))[0] || null;
  const topMasteryStudent = students.find(s => categorizeGrade(s.memo_grade, 40) === "ممتاز") || students[0] || null;
  const mostDisciplinedStudent = [...students].sort((a, b) => (Number(a.absent_days) || 0) - (Number(b.absent_days) || 0))[0] || null;

  // Honor Board (Students with 'ممتاز' and absent <= 1)
  const honorBoard = students.filter(s => categorizeGrade(s.memo_grade, 40) === "ممتاز" && (Number(s.absent_days) || 0) <= 1).slice(0, 15);

  // Followup List (Students with absent >= 3 or 'يحتاج متابعة'/'مقبول')
  const followupList = students.filter(s => {
    const mg = categorizeGrade(s.memo_grade, 40);
    return (Number(s.absent_days) || 0) >= 3 || mg === "يحتاج متابعة" || mg === "مقبول";
  }).slice(0, 15);

  return {
    exams_list: examsList,
    selected_exam: selectedExam,
    selected_exam_id: selectedExamId,
    summary: {
      total_students: totalExamsStudents,
      passed_count: passedCount,
      failed_count: failedCount,
      avg_score: avgScore,
      avg_percent: avgPercent,
      max_score: maxScore,
      min_score: minScore,
      pass_rate: passRate,
      fail_rate: failRate
    },
    students: filteredResults,
    question_stats: questionStats,
    hardest_question: hardestQuestion,
    easiest_question: easiestQuestion,
    circles_analytics: {
      summary: {
        total_circles: totalCircles,
        total_students: totalStudents,
        avg_students_per_circle: avgStudentsPerCircle,
        excellent_memo_count: excellentMemoCount,
        attendance_rate: attendanceRate,
        total_absent_days: totalAbsentDays
      },
      insights: {
        top_circle: topCircle,
        most_disciplined: mostDisciplinedCircle,
        top_memo: topMemoCircle
      },
      top_students: {
        top_memo: topMemoStudent ? { name: topMemoStudent.name, pages: topMemoStudent.memo_pages || 0, circle_name: topMemoStudent.circle_name, teacher_name: topMemoStudent.teacher_name } : null,
        top_rev: topRevStudent ? { name: topRevStudent.name, pages: topRevStudent.rev_pages || 0, circle_name: topRevStudent.circle_name, teacher_name: topRevStudent.teacher_name } : null,
        top_mastery: topMasteryStudent ? { name: topMasteryStudent.name, grade: topMasteryStudent.memo_grade || "ممتاز", circle_name: topMasteryStudent.circle_name, score_text: "إتقان ممتاز" } : null,
        most_disciplined: mostDisciplinedStudent ? { name: mostDisciplinedStudent.name, absent_days: mostDisciplinedStudent.absent_days || 0, circle_name: mostDisciplinedStudent.circle_name } : null
      },
      memo_breakdown: memoBreakdown,
      rev_breakdown: revBreakdown,
      honor_board: honorBoard,
      followup_list: followupList,
      all_students: students
    },
    circle_rankings: circleRankings,
    circle_students: students,
    settings: rawSettings
  };
}

function buildOfflineAnalyticsData() {
  let cachedExams = [];
  try {
    const raw = localStorage.getItem("cached_exams_list");
    if (raw) cachedExams = JSON.parse(raw);
  } catch(e) {}

  return {
    exams_list: cachedExams.map(e => ({ id: e.id, title: e.title })),
    selected_exam: cachedExams[0] || null,
    summary: {
      total_students: 0,
      passed_count: 0,
      failed_count: 0,
      avg_score: 0,
      max_score: 0,
      pass_rate: 0
    },
    students: [],
    question_stats: [],
    circles_analytics: {
      summary: { total_circles: 0, total_students: 0, avg_attendance: 0, avg_memorization: 0 },
      insights: [],
      top_students: [],
      memo_breakdown: {},
      rev_breakdown: {},
      honor_board: [],
      followup_list: []
    }
  };
}

async function loadAnalyticsData() {
  try {
    const useStudentsFilter = currentAnalyticsView === "students";
    const yearEl = (useStudentsFilter ? document.getElementById("filterStudentsYear") : document.getElementById("filterCirclesYear"))
      || document.getElementById("filterCirclesYear")
      || document.getElementById("filterStudentsYear");
    const monthEl = (useStudentsFilter ? document.getElementById("filterStudentsMonth") : document.getElementById("filterCirclesMonth"))
      || document.getElementById("filterCirclesMonth")
      || document.getElementById("filterStudentsMonth");
    const examSelect = document.getElementById("filterAnalyticsExamSelect");

    // Keep synced inputs aligned with active tab before reading
    if (yearEl && monthEl) {
      const otherYear = document.getElementById(useStudentsFilter ? "filterCirclesYear" : "filterStudentsYear");
      const otherMonth = document.getElementById(useStudentsFilter ? "filterCirclesMonth" : "filterStudentsMonth");
      if (otherYear) otherYear.value = yearEl.value;
      if (otherMonth && Array.from(otherMonth.options).some(o => o.value === monthEl.value)) {
        otherMonth.value = monthEl.value;
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    let requestedExamId = urlParams.get("exam_id");
    if (examSelect && examSelect.value && examSelect.value !== "all") {
      requestedExamId = examSelect.value;
    }

    let url = "/api/analytics";
    const params = new URLSearchParams();
    if (yearEl && yearEl.value) params.append("year", yearEl.value);
    if (monthEl && monthEl.value && monthEl.value !== "all") params.append("month", monthEl.value);
    if (requestedExamId && requestedExamId !== "all") params.append("exam_id", requestedExamId);

    if (params.toString()) url += "?" + params.toString();

    let fetched = false;
    let data = null;
    const isStandalone = isStandaloneRuntime();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.status === 401 && !isStandalone) {
        window.location.href = "login.html";
        return;
      }
      if (res.ok) {
        data = await res.json();
        if (data && !data.error) fetched = true;
      }
    } catch (err) {}

    if (!fetched) {
      data = await buildServerlessAnalytics(yearEl ? yearEl.value : null, monthEl ? monthEl.value : null, requestedExamId);
    }

    analyticsCache = data;

    adaptAnalyticsFilters(data.settings || {});

    // Populate Exam Select Options
    if (data.exams_list && Array.isArray(data.exams_list)) {
      populateAnalyticsExamsList(data.exams_list, data.selected_exam_id);
    }

    // Update Exam Status Meta Badge
    updateExamMetaBadge(data.selected_exam, data.summary);

    try { if (data.summary && typeof renderKPISummary === "function") renderKPISummary(data.summary, data.selected_exam); } catch (e) { console.error("Error in renderKPISummary:", e); }
    try { if (typeof renderSmartInsights === "function") renderSmartInsights(data); } catch (e) { console.error("Error in renderSmartInsights:", e); }
    try { if (data.question_stats && typeof renderQuestionAccuracyList === "function") renderQuestionAccuracyList(data.question_stats); } catch (e) { console.error("Error in renderQuestionAccuracyList:", e); }
    try { if (data.students && typeof renderStudentsTable === "function") renderStudentsTable(data.students); } catch (e) { console.error("Error in renderStudentsTable:", e); }

    if (data.circles_analytics) {
      try { if (typeof renderCirclesSummary === "function") renderCirclesSummary(data.circles_analytics.summary); } catch (e) { console.error("Error in renderCirclesSummary:", e); }
      try { if (typeof renderCirclesInsights === "function") renderCirclesInsights(data.circles_analytics.insights, data.circles_analytics.top_students); } catch (e) { console.error("Error in renderCirclesInsights:", e); }
      try { if (typeof renderGradeBreakdowns === "function") renderGradeBreakdowns(data.circles_analytics.memo_breakdown, data.circles_analytics.rev_breakdown); } catch (e) { console.error("Error in renderGradeBreakdowns:", e); }
      try { if (typeof renderHonorAndFollowupBoards === "function") renderHonorAndFollowupBoards(data.circles_analytics.honor_board, data.circles_analytics.followup_list); } catch (e) { console.error("Error in renderHonorAndFollowupBoards:", e); }
    }
    try { if (data.circle_rankings && typeof renderCircleRankings === "function") renderCircleRankings(data.circle_rankings); } catch (e) { console.error("Error in renderCircleRankings:", e); }
    try { if (typeof initStudentStatisticsView === "function") initStudentStatisticsView(data); } catch (e) { console.error("Error in initStudentStatisticsView:", e); }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Failed to load analytics:", err);
  }
}

function populateAnalyticsExamsList(examsList, selectedExamId) {
  const select = document.getElementById("filterAnalyticsExamSelect");
  if (!select) return;

  const currentVal = select.value;
  let optionsHtml = `<option value="all">📊 جميع الاختبارات (تقرير تراكمي شامل)</option>`;
  
  examsList.forEach(e => {
    const isAct = e.is_active === 1 ? " (مفعل حالياً)" : "";
    const qCount = e.question_count ? ` - ${e.question_count} أسئلة` : "";
    optionsHtml += `<option value="${e.id}">📝 ${e.title} (${e.duration_minutes || 20} دقيقة${qCount})${isAct}</option>`;
  });
  
  select.innerHTML = optionsHtml;

  if (selectedExamId) {
    select.value = String(selectedExamId);
  } else if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
}

function updateExamMetaBadge(selectedExam, summary) {
  const badge = document.getElementById("selectedExamStatusBadge");
  if (!badge) return;

  if (selectedExam) {
    const isAct = selectedExam.is_active === 1 ? "🟢 نشط للطلاب" : (selectedExam.is_active === 2 ? "⏳ قريباً" : "⚪ مغلق");
    badge.textContent = `📋 ${selectedExam.title} | ${isAct} (${selectedExam.duration_minutes || 20} دقيقة)`;
    badge.style.background = selectedExam.is_active === 1 ? "#dcfce7" : "#eff6ff";
    badge.style.color = selectedExam.is_active === 1 ? "#15803d" : "#1d4ed8";
  } else {
    badge.textContent = `📊 تقرير شامل لكافة الاختبارات`;
    badge.style.background = "#eff6ff";
    badge.style.color = "#1d4ed8";
  }
}

function onAnalyticsExamChange(newExamId) {
  const url = new URL(window.location.href);
  if (newExamId && newExamId !== "all") {
    url.searchParams.set("exam_id", newExamId);
  } else {
    url.searchParams.delete("exam_id");
  }
  window.history.replaceState({}, "", url.toString());
  loadAnalyticsData();
}

window.onAnalyticsExamChange = onAnalyticsExamChange;

let lastAdaptedSignature = "";
function adaptAnalyticsFilters(settings) {
  const cycEng = window.AlbayanCycleEngine || null;
  const cfg = cycEng ? cycEng.getConfig() : null;
  const stats = cycEng ? cycEng.computeCycleStats(cfg) : null;
  const archives = cycEng ? cycEng.getArchives() : [];

  const periodType = cfg ? (cfg.mode || cfg.periodType || "monthly") : ((settings && settings.record_period_type) || "monthly");
  const termMonths = (cfg && cfg.termMonths) || (settings && settings.custom_period_months) || 3;
  const sig = `${periodType}|${termMonths}|${cfg ? (cfg.yearNumber || cfg.cycleIndex || 1) : 1}|${archives.length}`;
  if (lastAdaptedSignature === sig) return;
  lastAdaptedSignature = sig;

  // Inject subtle Year Cycle Banner inside #viewCirclesAnalytics (Blue brand palette)
  const circlesSec = document.getElementById("viewCirclesAnalytics");
  if (circlesSec && stats) {
    let banner = document.getElementById("analyticsCycleStatusBanner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "analyticsCycleStatusBanner";
      banner.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding:11px 16px; border-radius:14px; background:#EFF6FF; border:1px solid rgba(37,99,235,0.28); color:#1D4ED8; font-size:13px; font-weight:700; margin-bottom:16px;";
      circlesSec.insertBefore(banner, circlesSec.firstChild);
    }
    const modeTitle = (stats.config.periodType === "term" || stats.config.mode === "term")
      ? `فصلي (${stats.config.termMonths || 3} أشهر)`
      : stats.meta.label;
    banner.innerHTML = `
      <span>النظام المعتمد: <strong>${escapeHtml(modeTitle)}</strong> (السنة الحالية #${stats.config.yearNumber || stats.config.cycleIndex || 1})</span>
      <span>متبقي ${stats.remainingDays} يوماً • سنوات مؤرشفة: ${archives.length}</span>
    `;
  }

  const periodData = (cycEng && typeof cycEng.buildPeriodOptionsList === "function")
    ? cycEng.buildPeriodOptionsList(cfg)
    : {
        options: [
          "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
          "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
        ].map(m => ({ value: m, label: `شهر ${m}`, isYearly: false }))
      };

  const monthSelects = [
    document.getElementById("filterCirclesMonth"),
    document.getElementById("filterStudentsMonth")
  ];

  monthSelects.forEach(select => {
    if (!select) return;
    const currentVal = select.value || "all";

    let optionsHtml = `<option value="all">جميع الفترات (السجل التراكمي)</option>`;
    if (cfg) {
      optionsHtml += `<option value="active_cycle" data-cycle-opt="1">${escapeHtml(`السنة الحالية (#${cfg.yearNumber || cfg.cycleIndex || 1} - ${stats ? stats.meta.badge : 'الحالية'})`)}</option>`;
    }

    (periodData.options || []).forEach(opt => {
      optionsHtml += `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`;
    });

    if (archives.length > 0) {
      archives.slice(0, 12).forEach(arc => {
        if (!arc || !arc.id) return;
        const label = `أرشيف ${arc.periodLabel || ('السنة #' + arc.cycleNumber)} (${arc.startDate || ''})`;
        optionsHtml += `<option value="${escapeHtml(`archive:${arc.id}`)}" data-cycle-opt="1">${escapeHtml(label)}</option>`;
      });
    }

    select.innerHTML = optionsHtml;

    const labelEl = select.previousElementSibling;
    if (labelEl) {
      const labelTitle = periodType === "term" || periodType === "custom"
        ? "الفصل التقييمي"
        : (periodType === "weekly" ? "الأسبوع التقييمي" : (periodType === "yearly" ? "الفترة السنوية" : "شهر / فترة التقييم"));
      labelEl.innerHTML = `<i data-lucide="clock" style="width:14px; height:14px;"></i> ${labelTitle}`;
    }

    if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
      select.value = currentVal;
    } else {
      select.value = "all";
    }
  });
}

function renderCirclesSummary(summary) {
  if (!summary) return;
  const elTotalCircles = document.getElementById("kpiTotalCircles");
  if (elTotalCircles) elTotalCircles.textContent = summary.total_circles || 0;
  
  const elAvgStudents = document.getElementById("kpiAvgStudentsPerCircle");
  if (elAvgStudents) elAvgStudents.textContent = `${summary.avg_students_per_circle || 0} متوسط الطلاب/حلقة`;
  
  const elTotalQuran = document.getElementById("kpiTotalQuranStudents");
  if (elTotalQuran) elTotalQuran.textContent = summary.total_students || 0;
  
  const elExcCount = document.getElementById("kpiExcellentMemoCount");
  if (elExcCount) elExcCount.textContent = summary.excellent_memo_count || 0;
  
  const excRate = summary.total_students > 0 ? ((summary.excellent_memo_count / summary.total_students) * 100).toFixed(1) : 0;
  const elExcRate = document.getElementById("kpiExcellentMemoRate");
  if (elExcRate) elExcRate.textContent = `${excRate}% من إجمالي الطلاب`;
  
  const elAttRate = document.getElementById("kpiAttendanceRate");
  if (elAttRate) elAttRate.textContent = `${summary.attendance_rate || 100}%`;
  
  const elTotalAbsent = document.getElementById("kpiTotalAbsentDays");
  if (elTotalAbsent) elTotalAbsent.textContent = `${summary.total_absent_days || 0} إجمالي أيام الغياب`;
}

function renderCirclesInsights(insights, topStudents) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  if (insights && insights.top_circle) {
    setText("topCircleName", `🕌 ${insights.top_circle.name}`);
    setText("topCircleSub", `الأستاذ: ${insights.top_circle.teacher_name || 'غير محدد'} | عدد الطلاب: ${insights.top_circle.student_count || 0}`);
    setText("topCircleBadge", `${insights.top_circle.memo_index || 0}% إتقان`);
  } else {
    setText("topCircleName", "لا توجد بيانات كافية");
    setText("topCircleSub", "الأستاذ: -- | عدد الطلاب: 0");
    setText("topCircleBadge", "0% إتقان");
  }

  if (insights && insights.most_disciplined) {
    setText("disciplinedCircleName", `🕌 ${insights.most_disciplined.name}`);
    setText("disciplinedCircleSub", `الأستاذ: ${insights.most_disciplined.teacher_name || 'غير محدد'} | غياب: ${insights.most_disciplined.total_absent || 0} يوم`);
    setText("disciplinedCircleBadge", `${insights.most_disciplined.avg_absent || 0} متوسط/طالب`);
  } else {
    setText("disciplinedCircleName", "لا توجد بيانات كافية");
    setText("disciplinedCircleSub", "الأستاذ: -- | غياب: 0 يوم");
    setText("disciplinedCircleBadge", "0 متوسط/طالب");
  }

  if (insights && insights.top_memo) {
    setText("topMemoCircleName", `🕌 ${insights.top_memo.name}`);
    setText("topMemoCircleSub", `الأستاذ: ${insights.top_memo.teacher_name || 'غير محدد'} | المتميزون: ${insights.top_memo.excellent_count || 0} طالب`);
    setText("topMemoCircleBadge", `${insights.top_memo.memo_index || 0}% إتقان`);
  } else {
    setText("topMemoCircleName", "لا توجد بيانات كافية");
    setText("topMemoCircleSub", "الأستاذ: -- | المتميزون: 0 طالب");
    setText("topMemoCircleBadge", "0% إتقان");
  }

  // Render Top 4 Student Achievers Cards
  if (topStudents && topStudents.top_memo) {
    setText("topMemoStudentName", `👤 ${topStudents.top_memo.name || 'غير محدد'}`);
    const pages = Math.round(Number(topStudents.top_memo.pages || 0));
    setText("topMemoStudentPages", pages > 0 ? `${pages} وجه` : `0 وجه`);
    setText("topMemoStudentSub", `الحلقة: ${topStudents.top_memo.circle_name || 'عامة'} | المعلم: ${topStudents.top_memo.teacher_name || 'غير محدد'}`);
  } else {
    setText("topMemoStudentName", "لا توجد بيانات كافية");
    setText("topMemoStudentPages", "0 وجه");
    setText("topMemoStudentSub", "الحلقة: -- | المعلم: --");
  }

  if (topStudents && topStudents.top_rev) {
    setText("topRevStudentName", `👤 ${topStudents.top_rev.name || 'غير محدد'}`);
    const pages = Math.round(Number(topStudents.top_rev.pages || 0));
    setText("topRevStudentPages", pages > 0 ? `${pages} وجه` : `0 وجه`);
    setText("topRevStudentSub", `الحلقة: ${topStudents.top_rev.circle_name || 'عامة'} | المعلم: ${topStudents.top_rev.teacher_name || 'غير محدد'}`);
  } else {
    setText("topRevStudentName", "لا توجد بيانات كافية");
    setText("topRevStudentPages", "0 وجه");
    setText("topRevStudentSub", "الحلقة: -- | المعلم: --");
  }

  if (topStudents && topStudents.top_mastery) {
    setText("topMasteryStudentName", `👤 ${topStudents.top_mastery.name || 'غير محدد'}`);
    setText("topMasteryStudentBadge", `${topStudents.top_mastery.grade || 'ممتاز'}`);
    setText("topMasteryStudentSub", `الحلقة: ${topStudents.top_mastery.circle_name || 'عامة'} | التقييم: ${topStudents.top_mastery.score_text || 'ممتاز'}`);
  } else {
    setText("topMasteryStudentName", "لا توجد بيانات كافية");
    setText("topMasteryStudentBadge", "ممتاز");
    setText("topMasteryStudentSub", "الحلقة: -- | التقييم: --");
  }

  if (topStudents && topStudents.most_disciplined) {
    setText("mostDisciplinedStudentName", `👤 ${topStudents.most_disciplined.name || 'غير محدد'}`);
    setText("mostDisciplinedStudentBadge", `${topStudents.most_disciplined.absent_days || 0} أيام غياب`);
    setText("mostDisciplinedStudentSub", `الحلقة: ${topStudents.most_disciplined.circle_name || 'عامة'} | انضباط تام`);
  } else {
    setText("mostDisciplinedStudentName", "لا توجد بيانات كافية");
    setText("mostDisciplinedStudentBadge", "0 أيام غياب");
    setText("mostDisciplinedStudentSub", "الحلقة: -- | انضباط تام");
  }
}

function renderGradeBreakdowns(memoBreakdown, revBreakdown) {
  const renderBars = (breakdownObj, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!breakdownObj) {
      container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--muted)">لا توجد بيانات كافية بعد.</div>`;
      return;
    }
    
    const gradesOrder = [
      { name: "ممتاز", color: "#16a34a", bg: "#dcfce7" },
      { name: "جيد جداً", color: "#2563eb", bg: "#dbeafe" },
      { name: "جيد", color: "#0d9488", bg: "#ccfbf1" },
      { name: "يحتاج متابعة", color: "#dc2626", bg: "#fee2e2" },
      { name: "غير محدد", color: "#64748b", bg: "#f1f5f9" }
    ];
    
    container.innerHTML = gradesOrder.map(g => {
      const item = breakdownObj[g.name] || { count: 0, percent: 0 };
      return `
        <div class="accuracy-item">
          <div class="acc-item-head">
            <span style="display:flex; align-items:center; gap:8px;">
              <span style="width:12px; height:12px; border-radius:50%; background:${g.color}; display:inline-block;"></span>
              تقدير: ${g.name}
            </span>
            <span style="font-weight:800; color:${g.color};">${item.percent}% (${item.count} طالب)</span>
          </div>
          <div class="acc-bar-wrap" style="background:${g.bg};">
            <div class="acc-bar-fill" style="width: ${item.percent}%; background:${g.color};"></div>
          </div>
        </div>
      `;
    }).join("");
  };

  renderBars(memoBreakdown, "memoBreakdownBars");
  renderBars(revBreakdown, "revBreakdownBars");
}

function renderKPISummary(summary, selectedExam) {
  if (!summary) return;

  const elTotal = document.getElementById("kpiTotalStudents");
  if (elTotal) elTotal.textContent = summary.total_students || 0;
  
  const elQCount = document.getElementById("kpiExamQuestionsCount");
  if (elQCount) {
    if (selectedExam && selectedExam.question_count !== undefined) {
      elQCount.textContent = `${selectedExam.question_count} أسئلة بالاختبار`;
    } else {
      elQCount.textContent = `مسجلين بالنظام`;
    }
  }

  const elAvg = document.getElementById("kpiAvgScore");
  if (elAvg) elAvg.textContent = `${summary.avg_score || 0} (${summary.avg_percent || 0}%)`;

  const elScoreRange = document.getElementById("kpiScoreRange");
  if (elScoreRange) {
    if (summary.total_students > 0) {
      elScoreRange.textContent = `أعلى: ${summary.max_score || 0} | أدنى: ${summary.min_score || 0}`;
    } else {
      elScoreRange.textContent = `أعلى: 0 | أدنى: 0`;
    }
  }

  const elPassRate = document.getElementById("kpiPassRate");
  if (elPassRate) elPassRate.textContent = `${summary.pass_rate || 0}%`;
  const elPassCount = document.getElementById("kpiPassCount");
  if (elPassCount) elPassCount.textContent = `${summary.passed_count || 0} طلاب ناجحين`;
  const elFailRate = document.getElementById("kpiFailRate");
  if (elFailRate) elFailRate.textContent = `${summary.fail_rate || 0}%`;
  const elFailCount = document.getElementById("kpiFailCount");
  if (elFailCount) elFailCount.textContent = `${summary.failed_count || 0} طلاب راسبين`;
}

function renderCircleRankings(rankings) {
  const tbody = document.getElementById("circlesRankTableBody");
  if (!tbody) return;

  if (!rankings || rankings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:16px; color:var(--muted)">لا تتوفر معلومات الحلقات بعد.</td></tr>`;
    return;
  }

  tbody.innerHTML = rankings.map((c, i) => {
    let rankBadge = `<strong>#${i + 1}</strong>`;
    if (i === 0) rankBadge = `<span style="font-size:18px;" title="المركز الأول">🥇 #1</span>`;
    else if (i === 1) rankBadge = `<span style="font-size:18px;" title="المركز الثاني">🥈 #2</span>`;
    else if (i === 2) rankBadge = `<span style="font-size:18px;" title="المركز الثالث">🥉 #3</span>`;

    const statusBadge = c.status_badge || "🌟 حلقة متميزة";
    const statusClass = c.status_class || "pass";
    let badgeCss = "background:#dcfce7; color:#166534;";
    if (statusClass === "platinum") badgeCss = "background:#fef3c7; color:#92400e; border:1px solid #f59e0b;";
    else if (statusClass === "gold") badgeCss = "background:#dbeafe; color:#1e40af;";
    else if (statusClass === "danger") badgeCss = "background:#fee2e2; color:#991b1b;";
    else if (statusClass === "neutral") badgeCss = "background:#f1f5f9; color:#475569;";

    return `
      <tr>
        <td>${rankBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:15px; color:var(--text);">🕌 ${escapeHtml(c.name)}</strong>
            <small style="color:var(--muted); font-size:12px;"><i data-lucide="user" style="width:12px; height:12px; vertical-align:-1px;"></i> الأستاذ: ${escapeHtml(c.teacher_name || 'غير محدد')}</small>
          </div>
        </td>
        <td><span style="background:var(--surface, #f8fafc); padding:4px 10px; border-radius:8px; border:1px solid var(--line); font-weight:700;">${c.student_count || 0} طلاب</span></td>
        <td><strong>${c.total_memo_pages || 0}</strong> <span style="font-size:11px; color:var(--muted);">وجه</span></td>
        <td><strong>${c.total_rev_pages || 0}</strong> <span style="font-size:11px; color:var(--muted);">وجه</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:50px; height:6px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
              <div style="width:${c.memo_index || 0}%; height:100%; background:var(--primary);"></div>
            </div>
            <strong style="color:var(--primary);">${c.memo_index || 0}%</strong>
          </div>
        </td>
        <td>
          <div style="font-size:13px;">
            <strong>${c.total_absent || 0} يوم</strong>
            <small style="color:var(--muted); display:block;">(${c.avg_absent || 0} متوسط/طالب)</small>
          </div>
        </td>
        <td>
          <span style="padding:6px 12px; border-radius:999px; font-size:13px; font-weight:800; display:inline-block; ${badgeCss}">
            ${escapeHtml(statusBadge)}
          </span>
        </td>
        <td>
          <button type="button" class="btn-secondary" style="padding:6px 12px; font-size:13px;" onclick="openCircleRosterModal(${i})">
            <i data-lucide="eye" style="width:14px; height:14px;"></i> طلاب الحلقة
          </button>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function renderHonorAndFollowupBoards(honorBoard, followupList) {
  const honorContainer = document.getElementById("honorBoardList");
  const followContainer = document.getElementById("followupBoardList");

  if (honorContainer) {
    if (!honorBoard || honorBoard.length === 0) {
      honorContainer.innerHTML = `<div style="text-align:center; padding:24px; color:var(--muted);">لا توجد قائمة شرف مسجلة حالياً.</div>`;
    } else {
      honorContainer.innerHTML = honorBoard.map(s => `
        <div style="border:1px solid #fde68a; background:var(--card-bg, #ffffff); padding:12px 16px; border-radius:14px; display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; box-shadow:none !important;">
          <div>
            <strong style="font-size:15px; color:var(--text, #1e293b); display:block;">🌟 ${escapeHtml(s.name)}</strong>
            <small style="color:var(--muted); font-size:12px;">🕌 ${escapeHtml(s.circle_name || 'حلقة قرآنية')} | الأستاذ: ${escapeHtml(s.teacher_name || '--')}</small>
            <div style="font-size:12px; color:#0f766e; margin-top:4px;">📖 حفظ: من ${escapeHtml(s.from_surah || '--')} إلى ${escapeHtml(s.to_surah || '--')}</div>
          </div>
          <div style="text-align:left;">
            <span style="background:#dcfce7; color:#15803d; font-weight:800; padding:4px 10px; border-radius:8px; font-size:12px; display:block; margin-bottom:4px;">حفظ: ${escapeHtml(s.memo_grade || 'ممتاز')}</span>
            <small style="color:var(--muted, #64748b); font-size:11px;">غياب: ${s.absent_days || 0} أيام</small>
          </div>
        </div>
      `).join("");
    }
  }

  if (followContainer) {
    if (!followupList || followupList.length === 0) {
      followContainer.innerHTML = `
        <div class="followup-empty-box">
          <span style="font-size:28px; display:block; margin-bottom:6px;">✅</span>
          <strong style="font-size:14.5px; color:#15803d; display:block;">رائع! جميع الطلاب بأداء جيد ومواظبة عالية.</strong>
          <small style="color:#166534; font-size:11.5px; margin-top:2px; display:block;">لا توجد تنبيهات غياب متكرر أو ضعف بالتقييمات حالياً.</small>
        </div>
      `;
    } else {
      followContainer.innerHTML = followupList.map(s => `
        <div class="followup-student-item">
          <div class="followup-student-info">
            <strong class="followup-student-name">⚠️ ${escapeHtml(s.name)}</strong>
            <small class="followup-student-meta">🕌 ${escapeHtml(s.circle_name || 'حلقة قرآنية')} | الأستاذ: ${escapeHtml(s.teacher_name || '--')}</small>
            <div class="followup-absence-tag">سجل الغياب: ${s.absent_days || 0} يوم غياب متكرر</div>
          </div>
          <div class="followup-student-badges">
            <span class="badge-grade-memo">حفظ: ${escapeHtml(s.memo_grade || 'يحتاج متابعة')}</span>
            <span class="badge-grade-rev">مراجعة: ${escapeHtml(s.rev_grade || 'غير محدد')}</span>
          </div>
        </div>
      `).join("");
    }
  }
}

function openCircleRosterModal(index) {
  if (!analyticsCache || !analyticsCache.circle_rankings || !analyticsCache.circle_rankings[index]) return;
  const circle = analyticsCache.circle_rankings[index];
  
  const elTitle = document.getElementById("modalCircleTitle");
  if (elTitle) elTitle.textContent = `طلاب حلقة: ${circle.name}`;
  
  const elMeta = document.getElementById("modalCircleMeta");
  if (elMeta) elMeta.textContent = `الأستاذ المسؤول: ${circle.teacher_name || 'غير محدد'} | إجمالي الطلاب: ${circle.student_count || 0} طالب`;

  const container = document.getElementById("modalCircleStudentsList");
  if (container) {
    if (!circle.students || circle.students.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:24px; color:var(--muted);">لا يوجد طلاب مسجلين في هذه الحلقة حالياً.</div>`;
    } else {
      container.innerHTML = `
        <table class="analytics-table" style="margin:0; width:100%;">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الطالب</th>
              <th>درجة الحفظ</th>
              <th>درجة المراجعة</th>
              <th>أيام الغياب</th>
            </tr>
          </thead>
          <tbody>
            ${circle.students.map((st, idx) => `
              <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><strong>${st.name}</strong></td>
                <td><span style="background:#f0fdf4; color:#15803d; padding:4px 8px; border-radius:6px; font-weight:700;">${st.memo_grade || 'غير محدد'}</span></td>
                <td><span style="background:#eff6ff; color:#1d4ed8; padding:4px 8px; border-radius:6px; font-weight:700;">${st.rev_grade || 'غير محدد'}</span></td>
                <td><strong>${st.absent_days || 0} يوم</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }
  }

  const modal = document.getElementById("circleRosterModal");
  if (modal) modal.style.display = "flex";
}

function closeCircleRosterModal(event) {
  if (event && event.target.id !== "circleRosterModal" && !event.target.closest(".close-modal-btn")) {
    return;
  }
  const modal = document.getElementById("circleRosterModal");
  if (modal) modal.style.display = "none";
}

window.openCircleRosterModal = openCircleRosterModal;
window.closeCircleRosterModal = closeCircleRosterModal;

function renderSmartInsights(data) {
  const hardest = data.hardest_question;
  const easiest = data.easiest_question;

  const elHardText = document.getElementById("hardestQuestionText");
  const elHardRate = document.getElementById("hardestErrorRate");
  const elHardSub = document.getElementById("hardestSubText");

  if (hardest && hardest.total_attempts > 0) {
    if (elHardText) elHardText.textContent = hardest.question_text || "غير محدد";
    const failRate = (100 - (hardest.accuracy || 0)).toFixed(1);
    const wrongCount = hardest.wrong_count !== undefined ? hardest.wrong_count : ((hardest.total_attempts || 0) - (hardest.correct_count || 0));
    if (elHardRate) elHardRate.textContent = `⚠️ ${failRate}% نسبة الخطأ (${wrongCount} إجابة خاطئة)`;
    if (elHardSub) elHardSub.textContent = `إجمالي المحاولات: ${hardest.total_attempts || 0} طالب | نوع السؤال: ${getTypeName(hardest.question_type)}`;
  } else {
    if (elHardText) elHardText.textContent = "لا توجد إجابات مسجلة لهذا الاختبار بعد";
    if (elHardRate) elHardRate.textContent = `0% نسبة الخطأ`;
    if (elHardSub) elHardSub.textContent = `ستظهر الإحصائيات الدقيقة فور إجابة الطلاب`;
  }

  const elEasyText = document.getElementById("easiestQuestionText");
  const elEasyRate = document.getElementById("easiestSuccessRate");
  const elEasySub = document.getElementById("easiestSubText");

  if (easiest && easiest.total_attempts > 0) {
    if (elEasyText) elEasyText.textContent = easiest.question_text || "غير محدد";
    if (elEasyRate) elEasyRate.textContent = `🌟 ${easiest.accuracy || 0}% نسبة الإجابة الصحيحة (${easiest.correct_count || 0} إجابة صحيحة)`;
    if (elEasySub) elEasySub.textContent = `إجمالي المحاولات: ${easiest.total_attempts || 0} طالب | نوع السؤال: ${getTypeName(easiest.question_type)}`;
  } else {
    if (elEasyText) elEasyText.textContent = "لا توجد إجابات مسجلة لهذا الاختبار بعد";
    if (elEasyRate) elEasyRate.textContent = `0% نسبة الصواب`;
    if (elEasySub) elEasySub.textContent = `ستظهر الإحصائيات الدقيقة فور إجابة الطلاب`;
  }
}

function getTypeName(qtype) {
  if (qtype === "choice") return "اختيار من متعدد";
  if (qtype === "true_false") return "صح وخطأ";
  if (qtype === "matching") return "توصيل الكلمات";
  return "عام";
}

function renderQuestionAccuracyList(questionStats) {
  const container = document.getElementById("questionAccuracyList");
  if (!questionStats || questionStats.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--muted)">لا تتوفر إحصائيات أسئلة تفصيلية بعد.</div>`;
    return;
  }

  container.innerHTML = questionStats.map((q, i) => {
    const accuracy = q.accuracy || 0;
    return `
      <div class="accuracy-item">
        <div class="acc-item-head">
          <span>${i + 1}. ${q.question_text} (${getTypeName(q.question_type)})</span>
          <span>${accuracy}% إجابات صحيحة (${q.correct_count} / ${q.total_attempts})</span>
        </div>
        <div class="acc-bar-wrap">
          <div class="acc-bar-fill" style="width: ${accuracy}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function toggleQuestionAccuracy() {
  const container = document.getElementById("questionAccuracyList");
  const btn = document.getElementById("btnToggleAccuracy");
  if (!container || !btn) return;
  
  if (container.classList.contains("hidden-by-default")) {
    container.classList.remove("hidden-by-default");
    btn.innerHTML = `<i data-lucide="chevron-up" style="width:24px; height:24px;"></i>`;
  } else {
    container.classList.add("hidden-by-default");
    btn.innerHTML = `<i data-lucide="chevron-down" style="width:24px; height:24px;"></i>`;
  }
  if (window.lucide) lucide.createIcons();
}

window.toggleQuestionAccuracy = toggleQuestionAccuracy;

function renderStudentsTable(students) {
  const tbody = document.getElementById("studentsTableBody");
  const badge = document.getElementById("studentCountBadge");
  if (!tbody) return;

  const list = Array.isArray(students) ? students : [];
  currentFilteredExamStudents = list;

  if (list.length === 0) {
    if (badge) badge.textContent = "0 طالب";
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">لا توجد نتائج مسجلة في قاعدة البيانات حتى الآن.</td></tr>`;
    return;
  }

  if (badge) badge.textContent = `${list.length} طالب ممتحن`;

  tbody.innerHTML = list.map((s, idx) => {
    const isPassed = isExamResultPassed(s);
    const totalQ = getExamResultTotalQuestions(s);
    const pct = getExamResultPercentage(s);
    const scoreVal = Number(s.score) || 0;
    const displayName = s.student_name || s.name || "طالب غير معروف";
    let dateFormattedHtml = "--";
    if (s.created_at) {
      if (window.HijriDate) {
        const dual = window.HijriDate.formatDualDate(s.created_at);
        dateFormattedHtml = `<div class="dual-date-wrap"><strong class="date-hijri">${dual.hijri}</strong><small class="date-gregorian">(${dual.gregorian})</small></div>`;
      } else {
        dateFormattedHtml = new Date(s.created_at).toLocaleString("ar-SA");
      }
    }

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(displayName)}</strong></td>
        <td>${scoreVal} / ${totalQ}</td>
        <td><strong>${pct}%</strong></td>
        <td>
          <span class="status-badge ${isPassed ? 'pass' : 'fail'}">
            ${isPassed ? '🟢 ناجح' : '🔴 راسب'}
          </span>
        </td>
        <td style="white-space: nowrap;">${dateFormattedHtml}</td>
        <td class="no-print">
          <button type="button" class="btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="openStudentModal(${idx})">عرض التفاصيل 👁️</button>
        </td>
      </tr>
    `;
  }).join("");
}

function filterStudentsTable() {
  if (!analyticsCache || !analyticsCache.students) return;

  const query = normalizeArabicSearch(document.getElementById("searchStudent")?.value || "");
  const statusFilter = document.getElementById("filterStatus")?.value || "all";

  const filtered = analyticsCache.students.filter(s => {
    const matchesName = !query || normalizeArabicSearch(s.student_name || s.name || "").includes(query);
    let matchesStatus = true;
    const passed = isExamResultPassed(s);
    if (statusFilter === "passed") matchesStatus = passed;
    if (statusFilter === "failed") matchesStatus = !passed;

    return matchesName && matchesStatus;
  });

  renderStudentsTable(filtered);
}

function openStudentModal(studentIdx) {
  const sourceList = (currentFilteredExamStudents && currentFilteredExamStudents.length > 0)
    ? currentFilteredExamStudents
    : (analyticsCache && analyticsCache.students ? analyticsCache.students : []);
  const s = sourceList[studentIdx];
  if (!s) return;

  const displayName = s.student_name || s.name || "طالب غير معروف";
  const totalQ = getExamResultTotalQuestions(s);
  const pct = getExamResultPercentage(s);
  const passed = isExamResultPassed(s);

  document.getElementById("modalStudentName").textContent = `تفاصيل إجابات الطالب: ${displayName}`;
  document.getElementById("modalStudentMeta").textContent = `الدرجة: ${Number(s.score) || 0} من ${totalQ} (${pct}%) | الحالة: ${passed ? 'ناجح ✅' : 'راسب ❌'}`;

  const container = document.getElementById("modalAnswersList");
  const answers = Array.isArray(s.answers) ? s.answers : [];
  if (answers.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted)">لا توجد إجابات تفصيلية مسجلة.</div>`;
  } else {
    container.innerHTML = answers.map((a, i) => {
      const isCorrect = a && (a.is_correct === 1 || a.is_correct === true);
      return `
        <div class="modal-answer-item ${isCorrect ? 'correct' : 'wrong'}">
          <div><strong>س${i + 1}: ${escapeHtml(a?.question_text || a?.title || "--")}</strong></div>
          <div>إجابة الطالب: <span>${escapeHtml(a?.selected_text || "--")}</span></div>
          <div>الإجابة الصحيحة: <strong>${escapeHtml(a?.correct_text || "--")}</strong></div>
        </div>
      `;
    }).join("");
  }

  document.getElementById("studentModal").style.display = "flex";
}

function closeStudentModal(event) {
  if (event && event.target !== event.currentTarget && !event.target.closest(".close-modal-btn")) {
    return;
  }
  const modal = document.getElementById("studentModal");
  if (modal) modal.style.display = "none";
}

/* Mobile Sidebar Drawer Controller */
function initMobileSidebar() {
  if (typeof initMobileBottomNav === 'function') {
    initMobileBottomNav();
  }
}

window.toggleSidebar = function() {
  if (typeof toggleBottomMoreSheet === 'function') {
    toggleBottomMoreSheet();
  }
};



/* =========================================
   STUDENT STATISTICS VIEW CONTROLLER
   ========================================= */
function initStudentStatisticsView(data) {
  const students = data.circle_students || (data.circles_analytics && data.circles_analytics.all_students) || [];
  const circles = data.circle_rankings || [];

  // Populate circle dropdown filter
  const selectCircle = document.getElementById("filterStudentCircle");
  if (selectCircle) {
    const currentVal = selectCircle.value;
    let optionsHtml = `<option value="all">جميع الحالات والحلقات (${students.length} طالب)</option>`;
    circles.forEach(c => {
      optionsHtml += `<option value="${c.name}">🕌 ${c.name} (${c.student_count || 0} طلاب)</option>`;
    });
    selectCircle.innerHTML = optionsHtml;
    if (currentVal && Array.from(selectCircle.options).some(o => o.value === currentVal)) {
      selectCircle.value = currentVal;
    }
  }

  filterAndRenderStudentAnalytics();
}

function filterAndRenderStudentAnalytics() {
  if (!analyticsCache) return;
  const allStudents = analyticsCache.circle_students || (analyticsCache.circles_analytics && analyticsCache.circles_analytics.all_students) || [];
  const circles = analyticsCache.circle_rankings || [];

  const nameQuery = normalizeArabicSearch(document.getElementById("filterStudentName")?.value || "");
  const circleVal = document.getElementById("filterStudentCircle")?.value || "all";
  const memoVal = document.getElementById("filterStudentMemo")?.value || "all";
  const attendanceVal = document.getElementById("filterStudentAttendance")?.value || "all";

  const filtered = allStudents.filter(s => {
    const matchesName = !nameQuery || normalizeArabicSearch(s.name || "").includes(nameQuery) || normalizeArabicSearch(s.circle_name || "").includes(nameQuery);
    const matchesCircle = circleVal === "all" || s.circle_name === circleVal;

    let matchesMemo = true;
    if (memoVal !== "all") {
      const mgCat = categorizeGrade(s.memo_grade, 40);
      if (memoVal === "ممتاز") matchesMemo = mgCat === "ممتاز";
      else if (memoVal === "جيد جداً") matchesMemo = mgCat === "جيد جداً";
      else if (memoVal === "جيد") matchesMemo = mgCat === "جيد";
      else if (memoVal === "مقبول") matchesMemo = mgCat === "مقبول";
      else if (memoVal === "يحتاج متابعة") matchesMemo = (mgCat === "يحتاج متابعة" || mgCat === "غير محدد");
      else matchesMemo = mgCat === memoVal;
    }

    let matchesAttendance = true;
    const abs = Number(s.absent_days) || 0;
    if (attendanceVal === "perfect") matchesAttendance = abs === 0;
    else if (attendanceVal === "light") matchesAttendance = abs >= 1 && abs <= 2;
    else if (attendanceVal === "heavy") matchesAttendance = abs >= 3;

    return matchesName && matchesCircle && matchesMemo && matchesAttendance;
  });

  renderStudentKPIs(filtered, circles.length);
  renderStudentHonorBoard(filtered);
  renderStudentGradesDistribution(filtered);
  renderCircleStudentsTable(filtered);

  if (window.lucide) lucide.createIcons();
}

function syncAndLoadAnalytics(source) {
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");

  if (source === "circles") {
    if (sy && cy) sy.value = cy.value;
    if (sm && cm && Array.from(sm.options).some(o => o.value === cm.value)) sm.value = cm.value;
  } else if (source === "students") {
    if (cy && sy) cy.value = sy.value;
    if (cm && sm && Array.from(cm.options).some(o => o.value === sm.value)) cm.value = sm.value;
  }
  loadAnalyticsData();
}

function resetCirclesDateFilter() {
  const defaultYear = getDefaultAcademicYear();
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");
  const targetPeriod = getPreferredCurrentPeriodValue(cm || sm);

  if (cy) cy.value = defaultYear;
  if (sy) sy.value = defaultYear;
  if (cm && Array.from(cm.options).some(o => o.value === targetPeriod)) cm.value = targetPeriod;
  if (sm && Array.from(sm.options).some(o => o.value === targetPeriod)) sm.value = targetPeriod;

  loadAnalyticsData();
}

window.syncAndLoadAnalytics = syncAndLoadAnalytics;
window.resetCirclesDateFilter = resetCirclesDateFilter;

function resetStudentFilters() {
  const elName = document.getElementById("filterStudentName");
  const elCircle = document.getElementById("filterStudentCircle");
  const elMemo = document.getElementById("filterStudentMemo");
  const elAtt = document.getElementById("filterStudentAttendance");

  if (elName) elName.value = "";
  if (elCircle) elCircle.value = "all";
  if (elMemo) elMemo.value = "all";
  if (elAtt) elAtt.value = "all";

  const defaultYear = getDefaultAcademicYear();
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");

  if (sy) sy.value = defaultYear;
  if (cy) cy.value = defaultYear;
  if (sm) sm.value = "all";
  if (cm) cm.value = "all";

  loadAnalyticsData();
}

function renderStudentKPIs(students, totalCirclesCount) {
  const elTotal = document.getElementById("studentKpiTotal");
  const elCirclesCount = document.getElementById("studentKpiCirclesCount");
  if (elTotal) elTotal.textContent = students.length;
  if (elCirclesCount) {
    const uniqueCircles = new Set(students.map(s => s.circle_name).filter(Boolean));
    elCirclesCount.textContent = `موزعين على ${uniqueCircles.size || totalCirclesCount || 0} حلقة قرآنية`;
  }

  let excCount = 0;
  let perfectCount = 0;
  let totalAbsent = 0;
  let attentionCount = 0;

  students.forEach(s => {
    const mgCat = categorizeGrade(s.memo_grade, 40);
    if (mgCat === "ممتاز" || mgCat === "جيد جداً") {
      excCount++;
    }
    const abs = Number(s.absent_days) || 0;
    totalAbsent += abs;
    if (abs === 0) perfectCount++;
    if (abs >= 3 || mgCat === "يحتاج متابعة" || mgCat === "مقبول") {
      attentionCount++;
    }
  });

  const excRate = students.length > 0 ? ((excCount / students.length) * 100).toFixed(1) : 0;
  const avgAbsent = students.length > 0 ? (totalAbsent / students.length).toFixed(1) : 0;

  const elExcRate = document.getElementById("studentKpiExcellenceRate");
  const elExcCount = document.getElementById("studentKpiExcellenceCount");
  if (elExcRate) elExcRate.textContent = `${excRate}%`;
  if (elExcCount) elExcCount.textContent = `${excCount} طالب متميز بالتقدير العالي`;

  const elAvgAbs = document.getElementById("studentKpiAvgAbsent");
  const elPerfCount = document.getElementById("studentKpiPerfectCount");
  if (elAvgAbs) elAvgAbs.textContent = `${avgAbsent} يوم غياب`;
  if (elPerfCount) elPerfCount.textContent = `${perfectCount} طالب منتظم بدون أي غياب`;

  const elAtt = document.getElementById("studentKpiNeedsAttention");
  if (elAtt) elAtt.textContent = `${attentionCount} طلاب`;
}

function renderStudentHonorBoard(students) {
  const container = document.getElementById("studentHonorBoardContent");
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:24px; color:var(--muted)">لا توجد بيانات طلاب مطابقة للتصفية حالياً.</div>`;
    return;
  }

  // Score student for honor board using unified memo (40) & rev (30) grade categorization
  const scoredStudents = students.map(s => {
    let score = 0;
    const mgCat = categorizeGrade(s.memo_grade, 40);
    const rgCat = categorizeGrade(s.rev_grade, 30);
    const abs = Number(s.absent_days) || 0;

    if (mgCat === "ممتاز") score += 50;
    else if (mgCat === "جيد جداً") score += 35;
    else if (mgCat === "جيد") score += 20;
    else if (mgCat === "مقبول") score += 10;

    if (rgCat === "ممتاز") score += 30;
    else if (rgCat === "جيد جداً") score += 20;
    else if (rgCat === "جيد") score += 10;

    score -= (abs * 5);
    if (s.online_exam_score) score += 20;

    return { ...s, honorScore: score };
  }).sort((a, b) => b.honorScore - a.honorScore);

  const topStudent = scoredStudents[0];
  const avatarChar = topStudent.name ? topStudent.name.charAt(0) : "🌟";
  const memoText = (topStudent.from_surah && topStudent.to_surah)
    ? `من سورة ${escapeHtml(topStudent.from_surah)} إلى ${escapeHtml(topStudent.to_surah)}`
    : "مقرر الحفظ الشهري";

  container.innerHTML = `
    <div class="student-honor-item">
      <div class="honor-badge-tag">🏆 الطالب المثالي</div>
      <div class="honor-body">
        <div class="honor-avatar">${escapeHtml(avatarChar)}</div>
        <div class="honor-details">
          <h4>🌟 ${escapeHtml(topStudent.name)}</h4>
          <p class="honor-info-line"><strong>🕌 الحلقة:</strong> ${escapeHtml(topStudent.circle_name || "حلقة عامة")}</p>
          <p class="honor-info-line"><strong>📖 إنجاز الحفظ:</strong> ${memoText} (${escapeHtml(topStudent.memo_grade || "غير محدد")})</p>
          <div class="honor-tags">
            <span class="honor-tag">✨ حفظ: ${escapeHtml(topStudent.memo_grade || "غير محدد")}</span>
            <span class="honor-tag">🔄 مراجعة: ${escapeHtml(topStudent.rev_grade || "غير محدد")}</span>
            <span class="honor-tag">📅 غياب: ${topStudent.absent_days || 0} أيام</span>
            ${topStudent.online_exam_score ? `<span class="honor-tag tag-exam" style="background:#dcfce7; color:#166534; border-color:#86efac;">📝 التقييم: ${escapeHtml(topStudent.online_exam_score)}</span>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStudentGradesDistribution(students) {
  const container = document.getElementById("studentGradesDistContent");
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:24px; color:var(--muted)">لا تتوفر إحصائيات لتقديرات الطلاب.</div>`;
    return;
  }

  const counts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "يحتاج متابعة": 0 };
  students.forEach(s => {
    const mgCat = categorizeGrade(s.memo_grade, 40);
    if (mgCat === "ممتاز") counts["ممتاز"]++;
    else if (mgCat === "جيد جداً") counts["جيد جداً"]++;
    else if (mgCat === "جيد") counts["جيد"]++;
    else counts["يحتاج متابعة"]++;
  });

  const total = students.length;
  const bars = [
    { label: "🌟 ممتاز (حفظ متقن ومتميز)", count: counts["ممتاز"], fillClass: "fill-green", color: "#10b981" },
    { label: "👍 جيد جداً (أداء ثابت ومتقدم)", count: counts["جيد جداً"], fillClass: "fill-blue", color: "#3b82f6" },
    { label: "👌 جيد (مستوى متوسط ومقبول)", count: counts["جيد"], fillClass: "fill-yellow", color: "#f59e0b" },
    { label: "🔴 يحتاج متابعة (بحاجة لتنبيه وتقوية)", count: counts["يحتاج متابعة"], fillClass: "fill-red", color: "#ef4444" }
  ];

  container.innerHTML = bars.map(b => {
    const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : 0;
    return `
      <div class="grade-bar-item">
        <div class="grade-bar-head">
          <span style="color:${b.color}; font-weight:800;">${b.label}</span>
          <span><strong>${b.count}</strong> طالب (${pct}%)</span>
        </div>
        <div class="grade-bar-track">
          <div class="grade-bar-fill ${b.fillClass}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCircleStudentsTable(students) {
  const tbody = document.getElementById("circleStudentsTableBody");
  const badge = document.getElementById("filteredStudentsBadge");
  if (!tbody || !badge) return;

  const list = Array.isArray(students) ? students : [];
  currentFilteredCircleStudents = list;

  if (list.length === 0) {
    badge.textContent = "0 طالب";
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: var(--muted);">لا توجد نتائج مسجلة تطابق خيارات التصفية الحالية.</td></tr>`;
    return;
  }

  badge.textContent = `${list.length} طالب`;

  tbody.innerHTML = list.map((s, idx) => {
    const mg = s.memo_grade !== undefined && s.memo_grade !== null && String(s.memo_grade).trim() !== "" ? String(s.memo_grade).trim() : "غير محدد";
    const rg = s.rev_grade !== undefined && s.rev_grade !== null && String(s.rev_grade).trim() !== "" ? String(s.rev_grade).trim() : "غير محدد";
    const abs = Number(s.absent_days) || 0;

    const memoBadgeClass = getGradeBadgeClass(categorizeGrade(s.memo_grade, 40));
    const revBadgeClass = getGradeBadgeClass(categorizeGrade(s.rev_grade, 30));

    let attBadgeHtml = `<span class="badge-star" style="background:#dcfce7; color:#15803d; border-color:#86efac;">🟢 ملتزم (0 غياب)</span>`;
    if (abs >= 1 && abs <= 2) attBadgeHtml = `<span class="badge-yellow">🟡 غياب محدود (${abs} أيام)</span>`;
    else if (abs >= 3) attBadgeHtml = `<span class="badge-red">🔴 غياب متكرر (${abs} أيام)</span>`;

    const memoRangeText = (s.from_surah && s.to_surah) ? `من ${escapeHtml(s.from_surah)} إلى ${escapeHtml(s.to_surah)}` : "مقرر الحفظ الشهري";
    const revRangeText = (s.rev_from_surah && s.rev_to_surah) ? `من ${escapeHtml(s.rev_from_surah)} إلى ${escapeHtml(s.rev_to_surah)}` : "مقرر المراجعة";

    const examDisplay = s.online_exam_score
      ? `<strong style="color:#16a34a;">${escapeHtml(s.online_exam_score)}</strong>`
      : `<span style="color:var(--muted);">${escapeHtml(s.exam_grade || "لم يختبر بعد")}</span>`;

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#eff6ff; color:#1d4ed8; width:32px; height:32px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">${s.name ? escapeHtml(s.name.charAt(0)) : "👤"}</span>
            <strong>${escapeHtml(s.name)}</strong>
          </div>
        </td>
        <td><strong>🕌 ${escapeHtml(s.circle_name || "حلقة عامة")}</strong></td>
        <td>
          <div style="font-size:13px; font-weight:700; margin-bottom:4px;">📖 ${memoRangeText}</div>
          <span class="${memoBadgeClass}">${escapeHtml(mg)}</span>
        </td>
        <td>
          <div style="font-size:13px; font-weight:700; margin-bottom:4px;">🔄 ${revRangeText}</div>
          <span class="${revBadgeClass}">${escapeHtml(rg)}</span>
        </td>
        <td>${attBadgeHtml}</td>
        <td>${examDisplay}</td>
        <td class="no-print">
          <button type="button" class="btn-secondary" style="padding:6px 12px; font-size:12px; display:inline-flex; align-items:center; gap:4px;" onclick="openStudentRecordModal(${idx})"><i data-lucide="eye" style="width:14px; height:14px;"></i> عرض السجل</button>
        </td>
      </tr>
    `;
  }).join("");
}

function openStudentRecordModal(idx) {
  const sourceList = (currentFilteredCircleStudents && currentFilteredCircleStudents.length > 0)
    ? currentFilteredCircleStudents
    : (analyticsCache ? (analyticsCache.circle_students || (analyticsCache.circles_analytics && analyticsCache.circles_analytics.all_students) || []) : []);
  const s = sourceList[idx];
  if (!s) return;

  document.getElementById("recordModalStudentName").textContent = `المستند الإحصائي للطالب: ${s.name}`;
  document.getElementById("recordModalStudentMeta").textContent = `الحلقة: ${s.circle_name || "حلقة عامة"} | المعلم المشرف: ${s.teacher_name || "كادر تعليمي"}`;

  const memoText = (s.from_surah && s.to_surah)
    ? `من سورة ${escapeHtml(s.from_surah)} (آية ${escapeHtml(s.from_ayah || 1)}) إلى سورة ${escapeHtml(s.to_surah)} (آية ${escapeHtml(s.to_ayah || 1)})`
    : "مقرر الحفظ الشهري";
  const revText = (s.rev_from_surah && s.rev_to_surah)
    ? `من سورة ${escapeHtml(s.rev_from_surah)} (آية ${escapeHtml(s.rev_from_ayah || 1)}) إلى سورة ${escapeHtml(s.rev_to_surah)} (آية ${escapeHtml(s.rev_to_ayah || 1)})`
    : "مقرر المراجعة الشهري";

  const abs = Number(s.absent_days) || 0;
  let attStatus = "🟢 التزام ممتاز بالحضور";
  if (abs >= 1 && abs <= 2) attStatus = "🟡 غياب محدود يحتاج تنبيه بسيط";
  else if (abs >= 3) attStatus = "🔴 غياب متكرر يستدعي التواصل مع ولي الأمر";

  const examContent = s.online_exam_score ? `
    <div style="background:#f0fdf4; border:1px solid #86efac; padding:16px; border-radius:16px;">
      <h4 style="margin:0 0 8px; color:#166534; display:flex; align-items:center; gap:6px;"><i data-lucide="check-circle" style="width:18px; height:18px;"></i> النتيجة الدقيقة للاختبار الإلكتروني</h4>
      <p style="margin:0; font-size:16px; color:#15803d; font-weight:800;">${escapeHtml(s.online_exam_score)} (${escapeHtml(s.online_exam_title || "اختبار تقييمي")})</p>
    </div>
  ` : `
    <div style="background:var(--surface, #f8fafc); border:1px solid var(--line, #cbd5e1); padding:16px; border-radius:16px;">
      <h4 style="margin:0 0 8px; color:var(--text, #334155);">📝 التقييم الشهري للاختبارات</h4>
      <p style="margin:0; color:var(--muted, #64748b); font-weight:700;">${escapeHtml(s.exam_grade || "لم يجرِ الطالب اختباراً إلكترونياً بعد")}</p>
    </div>
  `;

  const container = document.getElementById("recordModalContent");
  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
      <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:16px; border-radius:16px;">
        <small style="color:#1e40af; font-weight:700;">📖 مقرر وتقدير الحفظ</small>
        <div style="font-size:15px; font-weight:800; color:#1e3a8a; margin:6px 0;">${memoText}</div>
        <span class="badge-star" style="background:#ffffff; font-size:14px;">التقدير: ${escapeHtml(s.memo_grade || "غير محدد")}</span>
      </div>
      <div style="background:#fef9c3; border:1px solid #fde047; padding:16px; border-radius:16px;">
        <small style="color:#854d0e; font-weight:700;">🔄 مقرر وتقدير المراجعة</small>
        <div style="font-size:15px; font-weight:800; color:#713f12; margin:6px 0;">${revText}</div>
        <span class="badge-yellow" style="background:#ffffff; font-size:14px;">التقدير: ${escapeHtml(s.rev_grade || "غير محدد")}</span>
      </div>
    </div>
    <div style="background:var(--surface, #f1f5f9); border:1px solid var(--line, #cbd5e1); padding:16px; border-radius:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h4 style="margin:0 0 4px; color:var(--text, #0f172a);">📅 سجل الالتزام والحضور (${escapeHtml(s.record_month || "الشهر الحالي")})</h4>
          <span style="font-weight:700; color:var(--muted, #475569);">${attStatus}</span>
        </div>
        <div style="background:var(--card-bg, #ffffff); border:2px solid var(--line, #cbd5e1); padding:8px 16px; border-radius:12px; text-align:center;">
          <small style="display:block; color:var(--muted, #64748b); font-size:11px;">أيام الغياب</small>
          <strong style="font-size:20px; color:var(--text, #0f172a);">${abs}</strong>
        </div>
      </div>
    </div>
    ${examContent}
  `;

  document.getElementById("studentRecordModal").style.display = "flex";
  if (window.lucide) lucide.createIcons();
}

function closeStudentRecordModal(event) {
  if (event && event.target !== event.currentTarget && !event.target.closest(".close-modal-btn")) {
    return;
  }
  const modal = document.getElementById("studentRecordModal");
  if (modal) modal.style.display = "none";
}


