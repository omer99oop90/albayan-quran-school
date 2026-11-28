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
  if (val === undefined || val === null || val === "") return "";
  if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.normalizeEntityId === "function") {
    const cleanPrefix = String(prefix || "").replace(/_+$/, "");
    const res = window.AlbayanDataNormalizer.normalizeEntityId(val, cleanPrefix);
    return res === null || res === undefined ? "" : String(res);
  }
  let s = String(val).trim();
  if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length);
  s = s.replace(/^(circles_|students_|student_|users_|exams_|results_|rec_|student_records_)/i, "").trim();
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
  const cycEng = window.AlbayanCycleEngine || null;
  if (cycEng) {
    const cfg = cycEng.getConfig();
    const pType = cfg ? (cfg.mode || cfg.periodType || "monthly") : "monthly";
    if (pType !== "monthly" && selectEl && Array.from(selectEl.options).some(o => o.value === "active_cycle")) {
      return "active_cycle";
    }
    if (typeof cycEng.getActivePeriodKey === "function") {
      const activeKey = cycEng.getActivePeriodKey(cfg);
      if (activeKey && selectEl && Array.from(selectEl.options).some(o => o.value === activeKey)) {
        return activeKey;
      }
    }
  }
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

function refreshAnalyticsIcons() {
  if (typeof window.safeCreateIcons === "function") {
    window.safeCreateIcons();
  } else if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function categorizeGrade(grade, maxMark = 40) {
  if (grade === undefined || grade === null) {
    return "غير محدد";
  }
  const g = String(grade).trim();
  if (g === "" || g === "غير محدد" || g === "—") {
    return "غير محدد";
  }
  const num = Number(g);
  if (!Number.isNaN(num)) {
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
  if (["ضعيف", "يحتاج متابعه", "يحتاج الي متابعه", "متابعه", "يحتاج مراجعه"].includes(norm)) return "يحتاج متابعة";
  return "غير محدد";
}

function getGradeBadgeClass(gradeCat) {
  if (gradeCat === "ممتاز") return "badge-star";
  if (gradeCat === "جيد جداً") return "badge-blue";
  if (gradeCat === "جيد") return "badge-yellow";
  if (gradeCat === "مقبول") return "badge-orange";
  if (gradeCat === "يحتاج متابعة") return "badge-red";
  return "badge-neutral";
}

function computeAttendanceMarkFromAbsent(absentDays) {
  const abs = Math.max(0, Number(absentDays) || 0);
  return Math.max(0, Math.round((30 - abs * 0.5) * 10) / 10);
}

function computeStudentTotalAndPct(rec) {
  if (!rec) return { total: 0, pct: 0 };
  const n = (v) => {
    const p = parseFloat(v);
    return (!Number.isNaN(p) && p > 0) ? p : 0;
  };
  const att = rec.attendance_mark !== undefined && rec.attendance_mark !== "" && !Number.isNaN(Number(rec.attendance_mark))
    ? Math.max(0, Math.min(30, Number(rec.attendance_mark)))
    : computeAttendanceMarkFromAbsent(rec.absent_days);
  const total = n(rec.memo_grade) + n(rec.rev_grade) + att + n(rec.activity_mark) + n(rec.fiqh) + n(rec.tafsir) + n(rec.adhkar) + n(rec.seerah);
  const roundedTotal = Math.round(total * 10) / 10;
  const pct = Math.round((roundedTotal / 200) * 1000) / 10;
  return { total: roundedTotal, pct };
}

function isYearlySummaryLabel(monthVal) {
  const m = String(monthVal || "").trim();
  return m === "سجل نهاية السنة" || m === "نهاية السنة" || m === "المحصلة السنوية" || m === "المحصلة السنوية الشاملة";
}

function resolveRecordPages(rec, isRevision = false) {
  if (!rec) return 0;
  const explicit = isRevision
    ? Number(rec.sard_pages !== undefined ? rec.sard_pages : (rec.rev_pages || 0))
    : Number(rec.memo_pages || 0);
  if (explicit > 0) return explicit;
  const fs = isRevision ? rec.rev_from_surah : rec.from_surah;
  const fa = isRevision ? rec.rev_from_ayah : rec.from_ayah;
  const ts = isRevision ? rec.rev_to_surah : rec.to_surah;
  const ta = isRevision ? rec.rev_to_ayah : rec.to_ayah;
  if (fs && ts && window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.calcQuranPages === "function") {
    return window.AlbayanDataNormalizer.calcQuranPages(fs, fa || 1, ts, ta || 0) || 0;
  }
  return 0;
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
  if (window.AlbayanPermissions && typeof window.AlbayanPermissions.filterCirclesForUser === "function") {
    return window.AlbayanPermissions.filterCirclesForUser(circlesList, u, usersList);
  }
  const canAll = window.AlbayanPermissions
    ? window.AlbayanPermissions.hasPermission("all_circles", u)
    : (u.is_superadmin === 1 || u.role === "admin" || (Array.isArray(u.permissions) && u.permissions.includes("all_circles")));
  if (canAll) return circlesList;

  let myId = normalizeEntityId(u.id, "users_");
  const myNames = [normalizeArabicSearch(u.username || ""), normalizeArabicSearch(u.display_name || "")].filter(Boolean);
  const usersMap = new Map();
  (usersList || []).forEach(usr => {
    if (!usr || usr.deleted) return;
    const uid = normalizeEntityId(usr.id, "users_");
    if (uid) usersMap.set(uid, usr);
    if (!myId && myNames.length > 0) {
      const uname = normalizeArabicSearch(usr.username || usr.display_name || "");
      if (uname && myNames.includes(uname)) myId = uid;
    }
  });

  return circlesList.filter(c => {
    if (!c) return false;
    const tid = normalizeEntityId(c.teacher_id, "users_");
    if (myId && tid && tid === myId) return true;
    const userObj = tid ? usersMap.get(tid) : null;
    const candidates = [
      normalizeArabicSearch(c.teacher_name || ""),
      normalizeArabicSearch(c.teacher || ""),
      normalizeArabicSearch((userObj && userObj.username) || ""),
      normalizeArabicSearch((userObj && userObj.display_name) || "")
    ].filter(Boolean);
    return myNames.some(nm => candidates.includes(nm));
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
let analyticsRequestSeq = 0;
let activeAnalyticsAbort = null;
let showAllHonorBoard = false;
let showAllFollowupBoard = false;
let studentsAnalyticsPage = 1;
const STUDENTS_ANALYTICS_PAGE_SIZE = 25;

function syncAnalyticsUrlParams() {
  try {
    if (!window.location || !window.location.href || !window.history || typeof window.history.replaceState !== "function") return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", currentAnalyticsView || "circles");
    const useStudents = currentAnalyticsView === "students";
    const yearEl = document.getElementById(useStudents ? "filterStudentsYear" : "filterCirclesYear")
      || document.getElementById("filterCirclesYear");
    const monthEl = document.getElementById(useStudents ? "filterStudentsMonth" : "filterCirclesMonth")
      || document.getElementById("filterCirclesMonth");
    if (yearEl && yearEl.value) url.searchParams.set("year", yearEl.value);
    if (monthEl && monthEl.value) url.searchParams.set("month", monthEl.value);
    const examSelect = document.getElementById("filterAnalyticsExamSelect");
    if (examSelect && examSelect.value && examSelect.value !== "all") {
      url.searchParams.set("exam_id", examSelect.value);
    } else if (!url.searchParams.get("exam_id")) {
      url.searchParams.delete("exam_id");
    }
    window.history.replaceState({}, "", url.toString());
  } catch (e) {}
}

function closeTopAnalyticsModal() {
  const modalIds = ["studentRecordModal", "circleRosterModal", "studentModal"];
  for (const id of modalIds) {
    const m = document.getElementById(id);
    if (m && m.style.display && m.style.display !== "none") {
      m.style.display = "none";
      return true;
    }
  }
  return false;
}

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
  const initYear = urlParams.get("year") || defaultYear;
  const initMonth = urlParams.get("month") || "all";

  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");

  if (cy) cy.value = initYear;
  if (sy) sy.value = initYear;

  adaptAnalyticsFilters({});

  if (cm) {
    cm.value = Array.from(cm.options).some(o => o.value === initMonth) ? initMonth : "all";
  }
  if (sm) {
    sm.value = Array.from(sm.options).some(o => o.value === initMonth) ? initMonth : "all";
  }

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
  window.addEventListener("albayan:permissions-updated", (e) => {
    if (e && e.detail) _analyticsAuthUser = e.detail;
    loadAnalyticsData();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTopAnalyticsModal();
  });
  document.addEventListener("backbutton", (e) => {
    if (closeTopAnalyticsModal()) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    }
  }, true);
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
  let cachedUser = null;
  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) cachedUser = JSON.parse(cached);
  } catch (e) {}

  const applyAnalyticsUserUI = (u) => {
    if (!u) return;
    _analyticsAuthUser = u;
    const userElem = document.getElementById("loggedUsername");
    if (userElem) userElem.textContent = u.username || "الكادر التعليمي";
    const roleElem = document.getElementById("loggedRole");
    if (roleElem && u.role) {
      if (u.is_superadmin === 1) roleElem.textContent = "المسؤول الأول";
      else if (u.role === "admin") roleElem.textContent = "مسؤول النظام";
      else if (u.role === "supervisor") roleElem.textContent = "مشرف تعليمي";
      else roleElem.textContent = "معلم حلقة";
    }

    const canAccessCv = window.AlbayanPermissions
      ? window.AlbayanPermissions.hasPermission("student_cv", u)
      : (u.is_superadmin === 1 || u.role === "admin" || (Array.isArray(u.permissions) && u.permissions.includes("student_cv")));
    const cvLink = document.getElementById("studentCvMenuLink");
    if (cvLink) cvLink.style.display = canAccessCv ? "flex" : "none";

    const canAccessUsers = window.AlbayanPermissions
      ? window.AlbayanPermissions.hasPermission("users", u)
      : (u.is_superadmin === 1 || u.role === "admin" || (Array.isArray(u.permissions) && u.permissions.includes("users")));
    const usersLink = document.getElementById("usersMenuLink");
    if (usersLink) usersLink.style.display = canAccessUsers ? "flex" : "none";

    if (window.AlbayanPermissions) {
      window.AlbayanPermissions.applyNavPermissions(u);
      window.AlbayanPermissions.enforcePageAccess(u);
    }
  };

  if (cachedUser && cachedUser.username) {
    applyAnalyticsUserUI(cachedUser);
    if (isStandalone) return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    const res = await fetch("/api/me", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.logged_in) {
        applyAnalyticsUserUI(data);
        return;
      }
      if (!isStandalone && !cachedUser) {
        window.location.href = "login.html";
        return;
      }
    }
  } catch (err) {}

  if (cachedUser && cachedUser.username) {
    return;
  }

  window.location.href = "login.html";
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
    if (analyticsCache && analyticsCache.circles_analytics) {
      renderAnalyticsCharts(analyticsCache.circles_analytics, analyticsCache.circle_rankings || []);
    }
  }

  if (analyticsCache) updatePrintReportHeader(analyticsCache);
  syncAnalyticsUrlParams();
  refreshAnalyticsIcons();
}

window.switchAnalyticsView = switchAnalyticsView;

function unwrapFirebaseCollection(raw, prefix = "") {
  if (!raw) return [];
  const normalizer = window.AlbayanDataNormalizer || null;
  if (normalizer && typeof normalizer.flattenFirebaseNode === "function") {
    return normalizer.flattenFirebaseNode(raw, prefix.replace(/_+$/, ""));
  }
  if (normalizer && typeof normalizer.normalizeCollectionEntries === "function") {
    return normalizer.normalizeCollectionEntries(raw).map(([k, v]) => (
      v && typeof v === "object"
        ? { ...v, _fbKey: k, id: v.id !== undefined ? v.id : normalizeEntityId(k, prefix) }
        : null
    )).filter(Boolean);
  }
  if (Array.isArray(raw)) return raw.filter(v => v && typeof v === "object");
  if (typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => (
      v && typeof v === "object"
        ? { ...v, _fbKey: k, id: v.id !== undefined ? v.id : normalizeEntityId(k, prefix) }
        : null
    )).filter(Boolean);
  }
  return [];
}

async function buildServerlessAnalytics(year, month, requestedExamId, externalSignal = null) {
  const rtdbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
  const normalizer = window.AlbayanDataNormalizer || null;

  // 1. Parallel fetch from Firebase RTDB (skip immediately if offline for 0ms fallback)
  let rawCircles = null;
  let rawStudents = null;
  let rawRecords = null;
  let rawExams = null;
  let rawResults = null;
  let rawSettings = null;
  let rawUsers = null;

  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  if (isOnline) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3200);
      const onExternalAbort = () => controller.abort();
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }

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
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);

      if (cRes && cRes.ok) rawCircles = await cRes.json().catch(() => null);
      if (sRes && sRes.ok) rawStudents = await sRes.json().catch(() => null);
      if (recRes && recRes.ok) rawRecords = await recRes.json().catch(() => null);
      if (eRes && eRes.ok) rawExams = await eRes.json().catch(() => null);
      if (rRes && rRes.ok) rawResults = await rRes.json().catch(() => null);
      if (setRes && setRes.ok) rawSettings = await setRes.json().catch(() => null);
      if (uRes && uRes.ok) rawUsers = await uRes.json().catch(() => null);
    } catch (err) {}
  }

  let deletedCircles = [];
  let deletedStudents = [];
  try { deletedCircles = JSON.parse(localStorage.getItem("deleted_circles") || "[]").map(id => normalizeEntityId(id, "circles_")); } catch (e) {}
  try { deletedStudents = JSON.parse(localStorage.getItem("deleted_students") || "[]").map(id => normalizeEntityId(id, "students_")); } catch (e) {}

  // Users lookup (for resolving circle teacher_name)
  let usersList = [];
  if (rawUsers) {
    usersList = unwrapFirebaseCollection(rawUsers, "users_");
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
    exams = unwrapFirebaseCollection(rawExams, "exams_");
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
    results = unwrapFirebaseCollection(rawResults, "results_");
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
  const allowedYearRecords = [];
  if (rawRecords) {
    const allRecsRaw = unwrapFirebaseCollection(rawRecords, "");
    const allowedStudentIdSet = new Set(students.map(s => String(normalizeEntityId(s.id, "students_") || s.id)));
    allRecsRaw.forEach(r => {
      if (!r || r.deleted || r.is_deleted === 1 || r.is_deleted === true) return;
      if (isYearlySummaryLabel(r.month)) return;
      const yearMatches = !cleanYear || !r.year || String(r.year).trim() === cleanYear;
      if (!yearMatches) return;
      const sid = normalizeEntityId(r.student_id, "students_");
      if (!sid || (!canAllCircles && !allowedStudentIdSet.has(String(sid)))) return;
      allowedYearRecords.push(r);
    });
  }

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
      recList = unwrapFirebaseCollection(rawRecords, "");
    }
    if (recList.length > 0) {
      let filteredRecs = recList.filter(r => r && !r.deleted && r.is_deleted !== 1 && r.is_deleted !== true);
      if (month === "active_cycle" && cycleEngine) {
        filteredRecs = cycleEngine.filterRecordsByActiveCycle(filteredRecs, activeCycleCfg);
      } else if (month && month !== "all" && month !== "active_cycle") {
        const wantYearlyRec = isYearlySummaryLabel(month);
        filteredRecs = filteredRecs.filter(r => {
          const yearMatches = !cleanYear || !r.year || String(r.year).trim() === cleanYear;
          if (!yearMatches) return false;
          if (wantYearlyRec) {
            return isYearlySummaryLabel(r.month);
          }
          if (isYearlySummaryLabel(r.month)) return false;
          if (normalizer && r.month) {
            return normalizer.isSameMonth(r.month, month);
          }
          return String(r.month || "").trim() === String(month).trim();
        });
      } else {
        // Cumulative mode ("all"): exclude summary records & respect year filter
        filteredRecs = filteredRecs.filter(r => !isYearlySummaryLabel(r.month) && (!cleanYear || !r.year || String(r.year).trim() === cleanYear));
      }

      const isSpecificMonthFilter = Boolean(month && month !== "all" && month !== "active_cycle");
      const isCumulativeAggregation = !isSpecificMonthFilter || isYearlySummaryLabel(month);
      if (isYearlySummaryLabel(month) && filteredRecs.length === 0) {
        // Fallback to aggregating all non-yearly records for the requested year if explicit yearly snapshot does not exist
        filteredRecs = recList.filter(r => r && !r.deleted && r.is_deleted !== 1 && r.is_deleted !== true && !isYearlySummaryLabel(r.month) && (!cleanYear || !r.year || String(r.year).trim() === cleanYear));
      }

      // Deduplicate records per (student_id, period_key) so duplicate cloud keys never double-count
      const dedupByStudentPeriod = new Map();
      filteredRecs.forEach(r => {
        const sid = normalizeEntityId(r.student_id, "students_");
        if (!sid) return;
        const pKey = (normalizer && typeof normalizer.normalizeMonthComparisonKey === "function")
          ? `${normalizeEntityId(r.period_type || "monthly")}_${String(r.year || cleanYear || "1448")}_${normalizer.normalizeMonthComparisonKey(r.month || r.record_date || "default")}`
          : `${String(r.period_type || "monthly")}_${String(r.year || cleanYear || "1448")}_${String(r.month || r.record_date || "default").trim()}`;
        const mapKey = `${sid}::${pKey}`;
        const prev = dedupByStudentPeriod.get(mapKey);
        const sCurr = (normalizer && normalizer.scoreRecordCompleteness) ? normalizer.scoreRecordCompleteness(r) : 0;
        const sPrev = (prev && normalizer && normalizer.scoreRecordCompleteness) ? normalizer.scoreRecordCompleteness(prev) : -1;
        if (!prev || sCurr > sPrev) {
          dedupByStudentPeriod.set(mapKey, r);
        } else if (sCurr === sPrev) {
          const tCurr = new Date(r.updated_at || r.created_at || 0).getTime() || 0;
          const tPrev = new Date(prev.updated_at || prev.created_at || 0).getTime() || 0;
          if (tCurr >= tPrev) dedupByStudentPeriod.set(mapKey, r);
        }
      });

      const recsByStudent = new Map();
      dedupByStudentPeriod.forEach(r => {
        const sid = normalizeEntityId(r.student_id, "students_");
        if (!sid) return;
        if (!recsByStudent.has(sid)) recsByStudent.set(sid, []);
        recsByStudent.get(sid).push(r);
      });

      students = students.map(s => {
        const sid = normalizeEntityId(s.id, "students_");
        const stuRecs = recsByStudent.get(sid) || [];
        if (stuRecs.length === 0) {
          if (isSpecificMonthFilter) {
            return {
              ...s,
              from_surah: "", to_surah: "", rev_from_surah: "", rev_to_surah: "",
              memo_pages: 0, rev_pages: 0, sard_pages: 0, absent_days: 0,
              attendance_mark: 30, memo_grade: "", rev_grade: "",
              activity_mark: "", fiqh: "", tafsir: "", adhkar: "", seerah: "",
              total_mark: 0, total_percent: 0, has_record: false, periods_count: 0,
              record_month: month
            };
          }
          const baseAtt = computeAttendanceMarkFromAbsent(s.absent_days);
          const hasLegacy = Boolean(s.memo_grade || s.rev_grade || s.from_surah || Number(s.memo_pages) > 0 || Number(s.absent_days) > 0);
          const baseTotals = computeStudentTotalAndPct({ ...s, attendance_mark: baseAtt });
          return {
            ...s,
            memo_pages: resolveRecordPages(s, false),
            rev_pages: resolveRecordPages(s, true),
            sard_pages: resolveRecordPages(s, true),
            attendance_mark: baseAtt,
            total_mark: baseTotals.total,
            total_percent: baseTotals.pct,
            has_record: hasLegacy,
            periods_count: hasLegacy ? 1 : 0
          };
        }

        if (!isCumulativeAggregation && stuRecs.length === 1) {
          const r = stuRecs[0];
          const abs = Number(r.absent_days) || 0;
          const attMark = computeAttendanceMarkFromAbsent(abs);
          const mp = resolveRecordPages(r, false);
          const sp = resolveRecordPages(r, true);
          const mergedRec = {
            ...s,
            from_surah: r.from_surah || "",
            from_ayah: r.from_ayah || 1,
            to_surah: r.to_surah || "",
            to_ayah: r.to_ayah || 1,
            rev_from_surah: r.rev_from_surah || "",
            rev_from_ayah: r.rev_from_ayah || 1,
            rev_to_surah: r.rev_to_surah || "",
            rev_to_ayah: r.rev_to_ayah || 1,
            memo_pages: mp,
            rev_pages: sp,
            sard_pages: sp,
            memo_grade: r.memo_grade !== undefined ? r.memo_grade : "",
            rev_grade: r.rev_grade !== undefined ? r.rev_grade : "",
            absent_days: abs,
            attendance_mark: attMark,
            activity_mark: r.activity_mark !== undefined ? r.activity_mark : "",
            fiqh: r.fiqh !== undefined ? r.fiqh : "",
            tafsir: r.tafsir !== undefined ? r.tafsir : "",
            adhkar: r.adhkar !== undefined ? r.adhkar : "",
            seerah: r.seerah !== undefined ? r.seerah : "",
            exam_grade: r.exam_grade !== undefined ? r.exam_grade : "",
            record_month: r.month || month || "",
            has_record: true,
            periods_count: 1
          };
          const totals = computeStudentTotalAndPct(mergedRec);
          return { ...mergedRec, total_mark: totals.total, total_percent: totals.pct };
        }

        // Cumulative multi-period aggregation (sum pages & absences, average grades & 30-pt attendance mark)
        const sortedRecs = [...stuRecs].sort((a, b) => {
          const tA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
          const tB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
          return tA - tB;
        });

        let sumMemoPages = 0;
        let sumSardPages = 0;
        let sumAbsentDays = 0;
        let sumAttMarks = 0;
        const avgFields = ["memo_grade", "rev_grade", "activity_mark", "fiqh", "tafsir", "adhkar", "seerah"];
        const sums = {};
        const counts = {};
        const lastQual = {};
        avgFields.forEach(f => { sums[f] = 0; counts[f] = 0; lastQual[f] = ""; });

        let firstFromSurah = "", firstFromAyah = 1, lastToSurah = "", lastToAyah = 1;
        let firstRevFromSurah = "", firstRevFromAyah = 1, lastRevToSurah = "", lastRevToAyah = 1;
        let latestExamGrade = "";

        sortedRecs.forEach(r => {
          sumMemoPages += resolveRecordPages(r, false);
          sumSardPages += resolveRecordPages(r, true);
          const abs = Number(r.absent_days) || 0;
          sumAbsentDays += abs;
          sumAttMarks += computeAttendanceMarkFromAbsent(abs);

          if (r.from_surah && !firstFromSurah) {
            firstFromSurah = r.from_surah;
            firstFromAyah = r.from_ayah || 1;
          }
          if (r.to_surah) {
            lastToSurah = r.to_surah;
            lastToAyah = r.to_ayah || 1;
          }
          if (r.rev_from_surah && !firstRevFromSurah) {
            firstRevFromSurah = r.rev_from_surah;
            firstRevFromAyah = r.rev_from_ayah || 1;
          }
          if (r.rev_to_surah) {
            lastRevToSurah = r.rev_to_surah;
            lastRevToAyah = r.rev_to_ayah || 1;
          }
          if (r.exam_grade && r.exam_grade !== "لم يختبر بعد") {
            latestExamGrade = r.exam_grade;
          }

          avgFields.forEach(f => {
            const rawVal = r[f];
            if (rawVal === undefined || rawVal === null) return;
            const strVal = String(rawVal).trim();
            if (!strVal || strVal === "غير محدد" || strVal === "—") return;
            const num = Number(strVal);
            if (!Number.isNaN(num)) {
              sums[f] += num;
              counts[f] += 1;
            } else {
              lastQual[f] = strVal;
            }
          });
        });

        const avgAttMark = Math.round((sumAttMarks / sortedRecs.length) * 10) / 10;
        const aggObj = {
          ...s,
          from_surah: firstFromSurah,
          from_ayah: firstFromAyah,
          to_surah: lastToSurah,
          to_ayah: lastToAyah,
          rev_from_surah: firstRevFromSurah,
          rev_from_ayah: firstRevFromAyah,
          rev_to_surah: lastRevToSurah,
          rev_to_ayah: lastRevToAyah,
          memo_pages: Math.round(sumMemoPages * 10) / 10,
          rev_pages: Math.round(sumSardPages * 10) / 10,
          sard_pages: Math.round(sumSardPages * 10) / 10,
          absent_days: sumAbsentDays,
          attendance_mark: avgAttMark,
          exam_grade: latestExamGrade || "",
          record_month: isYearlySummaryLabel(month) ? "سجل نهاية السنة" : `تراكمي (${sortedRecs.length} فترات)`,
          has_record: true,
          periods_count: sortedRecs.length
        };
        avgFields.forEach(f => {
          aggObj[f] = counts[f] > 0 ? Math.round((sums[f] / counts[f]) * 10) / 10 : lastQual[f];
        });
        const totals = computeStudentTotalAndPct(aggObj);
        return { ...aggObj, total_mark: totals.total, total_percent: totals.pct };
      });
    } else {
      students = students.map(s => {
        const baseAtt = computeAttendanceMarkFromAbsent(s.absent_days);
        const hasLegacy = Boolean(s.memo_grade || s.rev_grade || s.from_surah || Number(s.memo_pages) > 0 || Number(s.absent_days) > 0);
        const baseTotals = computeStudentTotalAndPct({ ...s, attendance_mark: baseAtt });
        return {
          ...s,
          memo_pages: resolveRecordPages(s, false),
          rev_pages: resolveRecordPages(s, true),
          sard_pages: resolveRecordPages(s, true),
          attendance_mark: baseAtt,
          total_mark: baseTotals.total,
          total_percent: baseTotals.pct,
          has_record: hasLegacy,
          periods_count: hasLegacy ? 1 : 0
        };
      });
    }
  }

  // Scope online exam results to allowed circles/students when user lacks all_circles
  if (!canAllCircles) {
    const allowedStudentIds = new Set(students.map(s => String(normalizeEntityId(s.id, "students_") || s.id)));
    const allowedStudentNames = new Set(students.map(s => normalizeArabicSearch(s.name)).filter(Boolean));
    results = results.filter(r => {
      const rCid = normalizeEntityId(r.circle_id, "circles_");
      if (rCid && allowedCircleIds.has(String(rCid))) return true;
      const rSid = normalizeEntityId(r.student_id, "students_");
      if (rSid && allowedStudentIds.has(String(rSid))) return true;
      const rName = normalizeArabicSearch(r.student_name);
      return Boolean(rName && allowedStudentNames.has(rName));
    });
  }

  // Enrich students with latest online exam result chronologically
  const sortedResultsChron = [...results].sort((a, b) => {
    const tA = new Date(a.created_at || a.updated_at || 0).getTime() || 0;
    const tB = new Date(b.created_at || b.updated_at || 0).getTime() || 0;
    return tA - tB;
  });
  const latestResultByStudentId = new Map();
  const latestResultByName = new Map();
  sortedResultsChron.forEach(r => {
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

  // Question stats breakdown (keyed per exam when viewing all exams so identical prompts don't collide)
  const questionMap = {};
  filteredResults.forEach(r => {
    const answers = Array.isArray(r.answers) ? r.answers : [];
    const examTag = normalizeEntityId(r.exam_id, "exams_") || String(r.exam_title || "general").trim();
    answers.forEach(a => {
      if (!a) return;
      const qText = (a.question_text || a.title || "").trim();
      if (!qText) return;
      const qKey = selectedExam ? qText : `${examTag}::${qText}`;
      if (!questionMap[qKey]) {
        questionMap[qKey] = {
          question_text: selectedExam || !r.exam_title ? qText : `${qText} — (${r.exam_title})`,
          question_type: a.question_type || "choice",
          total_attempts: 0,
          correct_count: 0
        };
      }
      questionMap[qKey].total_attempts++;
      if (a.is_correct === 1 || a.is_correct === true) {
        questionMap[qKey].correct_count++;
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
  let totalAttendanceMarks = 0;
  let excellentMemoCount = 0;

  const memoCounts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "مقبول": 0, "يحتاج متابعة": 0, "غير محدد": 0 };
  const revCounts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "مقبول": 0, "يحتاج متابعة": 0, "غير محدد": 0 };

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
    const attMark = (s.attendance_mark !== undefined && s.attendance_mark !== "")
      ? Number(s.attendance_mark)
      : computeAttendanceMarkFromAbsent(abs);
    totalAttendanceMarks += Number.isFinite(attMark) ? attMark : 30;

    const mgCat = categorizeGrade(s.memo_grade, 40);
    const rgCat = categorizeGrade(s.rev_grade, 30);
    memoCounts[mgCat] = (memoCounts[mgCat] || 0) + 1;
    revCounts[rgCat] = (revCounts[rgCat] || 0) + 1;

    if (mgCat === "ممتاز") excellentMemoCount++;

    const normCid = normalizeEntityId(s.circle_id, "circles_");
    const cTarget = circleStudentsById[normCid] || circleStudentsByName[normalizeArabicSearch(s.circle_name)];
    if (cTarget) {
      cTarget.push(s);
    }
  });

  // Attendance indicator linked directly to the 30-point rubric (0.5 deduction per absent day)
  const attendanceRate = totalStudents > 0
    ? Math.max(0, Math.min(100, Math.round((totalAttendanceMarks / (totalStudents * 30)) * 1000) / 10))
    : 100;

  const buildBreakdown = (countsObj) => {
    const res = {};
    const gradesOrder = ["ممتاز", "جيد جداً", "جيد", "مقبول", "يحتاج متابعة", "غير محدد"];
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
    const recordedCount = cStudents.filter(st => st.has_record).length;
    const cAbsent = cStudents.reduce((acc, st) => acc + (Number(st.absent_days) || 0), 0);
    const cAvgAbsent = count > 0 ? (cAbsent / count).toFixed(1) : 0;
    const cAttMarksSum = cStudents.reduce((acc, st) => {
      const mark = (st.attendance_mark !== undefined && st.attendance_mark !== "")
        ? Number(st.attendance_mark)
        : computeAttendanceMarkFromAbsent(st.absent_days);
      return acc + (Number.isFinite(mark) ? mark : 30);
    }, 0);
    const cAttendanceRate = count > 0
      ? Math.max(0, Math.min(100, Math.round((cAttMarksSum / (count * 30)) * 1000) / 10))
      : 0;
    const cTotalMemoPages = Math.round(cStudents.reduce((acc, st) => acc + (Number(st.memo_pages) || 0), 0) * 10) / 10;
    const cTotalRevPages = Math.round(cStudents.reduce((acc, st) => acc + (Number(st.rev_pages) || 0), 0) * 10) / 10;
    const cExcellentCount = cStudents.filter(st => categorizeGrade(st.memo_grade, 40) === "ممتاز").length;
    const cMemoIndex = count > 0 ? Math.round((cExcellentCount / count) * 100) : 0;

    let statusBadge = "حلقة متميزة";
    let statusClass = "pass";
    if (count === 0) {
      statusBadge = "بدون طلاب";
      statusClass = "neutral";
    } else if (cMemoIndex >= 80 && Number(cAvgAbsent) <= 1) {
      statusBadge = "الصدارة الذهبية";
      statusClass = "platinum";
    } else if (cMemoIndex >= 50) {
      statusBadge = "أداء ممتاز";
      statusClass = "gold";
    } else if (Number(cAvgAbsent) > 3) {
      statusBadge = "بحاجة لمتابعة";
      statusClass = "danger";
    } else {
      statusBadge = "أداء منتظم";
      statusClass = "neutral";
    }

    return {
      id: c.id,
      name: c.name,
      teacher_name: c.teacher_name || c.teacher || "كادر تعليمي",
      student_count: count,
      recorded_count: recordedCount,
      total_absent: cAbsent,
      avg_absent: cAvgAbsent,
      attendance_rate: cAttendanceRate,
      total_memo_pages: cTotalMemoPages,
      total_rev_pages: cTotalRevPages,
      excellent_count: cExcellentCount,
      memo_index: cMemoIndex,
      status_badge: statusBadge,
      status_class: statusClass,
      students: cStudents
    };
  }).sort((a, b) => b.student_count - a.student_count || b.memo_index - a.memo_index);

  // Top Insights (exclude empty circles from mastery & discipline winners)
  const nonEmptyCircles = circleRankings.filter(c => c.student_count > 0);
  const recordedCircles = nonEmptyCircles.filter(c => c.recorded_count > 0);
  const disciplinePool = recordedCircles.length > 0 ? recordedCircles : nonEmptyCircles;

  const topCircle = nonEmptyCircles[0] || circleRankings[0] || null;
  const mostDisciplinedCircle = [...disciplinePool].sort((a, b) => Number(a.avg_absent) - Number(b.avg_absent) || b.memo_index - a.memo_index)[0] || null;
  const topMemoCircle = [...nonEmptyCircles].sort((a, b) => b.memo_index - a.memo_index || b.total_memo_pages - a.total_memo_pages)[0] || null;

  // Top Students Achievers (prefer students with actual records)
  const recordedStudents = students.filter(s => s.has_record);
  const achieversPool = recordedStudents.length > 0 ? recordedStudents : students;

  const topMemoStudent = [...achieversPool].sort((a, b) => (Number(b.memo_pages) || 0) - (Number(a.memo_pages) || 0))[0] || null;
  const topRevStudent = [...achieversPool].sort((a, b) => (Number(b.rev_pages) || 0) - (Number(a.rev_pages) || 0))[0] || null;
  const topMasteryStudent = [...achieversPool].sort((a, b) => {
    const tDiff = (Number(b.total_mark) || 0) - (Number(a.total_mark) || 0);
    if (tDiff !== 0) return tDiff;
    return (Number(b.memo_pages) || 0) - (Number(a.memo_pages) || 0);
  })[0] || null;
  const mostDisciplinedStudent = [...achieversPool].sort((a, b) => {
    const aDiff = (Number(a.absent_days) || 0) - (Number(b.absent_days) || 0);
    if (aDiff !== 0) return aDiff;
    return (Number(b.total_mark) || 0) - (Number(a.total_mark) || 0);
  })[0] || null;

  const masteryCat = topMasteryStudent ? categorizeGrade(topMasteryStudent.memo_grade, 40) : "غير محدد";
  const topMasteryScoreText = topMasteryStudent
    ? (topMasteryStudent.total_mark > 0 ? `المحصلة ${topMasteryStudent.total_mark} / 200` : masteryCat)
    : "غير محدد";

  // Honor Board (all qualifying students; UI handles progressive expand/collapse)
  const honorBoard = students.filter(s => categorizeGrade(s.memo_grade, 40) === "ممتاز" && (Number(s.absent_days) || 0) <= 1);

  // Followup List (all students with absent >= 3 or weak/acceptable in memorization OR revision)
  const followupList = students.filter(s => {
    const mg = categorizeGrade(s.memo_grade, 40);
    const rg = categorizeGrade(s.rev_grade, 30);
    return (Number(s.absent_days) || 0) >= 3 || mg === "يحتاج متابعة" || mg === "مقبول" || rg === "يحتاج متابعة" || rg === "مقبول";
  });

  // Period Trends & Temporal Comparison Deltas across recorded periods
  const hijriOrderNames = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  const resolveMonthSortOrder = (rawLabel) => {
    const lbl = String(rawLabel || "").trim();
    const num = parseInt(lbl, 10);
    if (!Number.isNaN(num) && String(num) === lbl) return num;
    const norm = normalizeArabicSearch(lbl);
    for (let i = 0; i < hijriOrderNames.length; i++) {
      if (norm.includes(normalizeArabicSearch(hijriOrderNames[i]))) return i + 1;
    }
    const wk = lbl.match(/\d+/);
    return wk ? 100 + parseInt(wk[0], 10) : 999;
  };
  const resolvePeriodDisplayLabel = (rawLabel) => {
    const lbl = String(rawLabel || "").trim();
    const num = parseInt(lbl, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 12 && String(num) === lbl) {
      return hijriOrderNames[num - 1];
    }
    return lbl || "فترة";
  };

  const periodBuckets = new Map();
  const dedupTrendByStudentPeriod = new Map();
  allowedYearRecords.forEach(r => {
    const sid = normalizeEntityId(r.student_id, "students_");
    const rawM = String(r.month || "").trim();
    if (!sid || !rawM) return;
    const pKey = (normalizer && typeof normalizer.normalizeMonthComparisonKey === "function")
      ? normalizer.normalizeMonthComparisonKey(rawM)
      : normalizeArabicSearch(rawM);
    const dedupKey = `${sid}::${pKey}`;
    const prev = dedupTrendByStudentPeriod.get(dedupKey);
    const sCurr = (normalizer && normalizer.scoreRecordCompleteness) ? normalizer.scoreRecordCompleteness(r) : 0;
    const sPrev = (prev && normalizer && normalizer.scoreRecordCompleteness) ? normalizer.scoreRecordCompleteness(prev) : -1;
    if (!prev || sCurr >= sPrev) {
      dedupTrendByStudentPeriod.set(dedupKey, r);
    }
  });

  dedupTrendByStudentPeriod.forEach(r => {
    const rawM = String(r.month || "").trim();
    const pKey = (normalizer && typeof normalizer.normalizeMonthComparisonKey === "function")
      ? normalizer.normalizeMonthComparisonKey(rawM)
      : normalizeArabicSearch(rawM);
    if (!periodBuckets.has(pKey)) {
      periodBuckets.set(pKey, {
        key: pKey,
        rawMonth: rawM,
        label: resolvePeriodDisplayLabel(rawM),
        sortOrder: resolveMonthSortOrder(rawM),
        firstTs: new Date(r.updated_at || r.created_at || 0).getTime() || 0,
        memoPages: 0,
        revPages: 0,
        attSum: 0,
        excellentCount: 0,
        absentDays: 0,
        count: 0
      });
    }
    const b = periodBuckets.get(pKey);
    b.memoPages += resolveRecordPages(r, false);
    b.revPages += resolveRecordPages(r, true);
    const abs = Number(r.absent_days) || 0;
    b.absentDays += abs;
    b.attSum += computeAttendanceMarkFromAbsent(abs);
    if (categorizeGrade(r.memo_grade, 40) === "ممتاز") b.excellentCount += 1;
    b.count += 1;
  });

  const periodTrends = Array.from(periodBuckets.values())
    .sort((a, b) => a.sortOrder - b.sortOrder || a.firstTs - b.firstTs)
    .map(b => ({
      key: b.key,
      raw_month: b.rawMonth,
      label: b.label,
      memo_pages: Math.round(b.memoPages * 10) / 10,
      rev_pages: Math.round(b.revPages * 10) / 10,
      absent_days: b.absentDays,
      records_count: b.count,
      excellent_rate: b.count > 0 ? Math.round((b.excellentCount / b.count) * 1000) / 10 : 0,
      attendance_rate: b.count > 0 ? Math.max(0, Math.min(100, Math.round((b.attSum / (b.count * 30)) * 1000) / 10)) : 100
    }));

  let trendDeltas = { hasComparison: false };
  if (periodTrends.length >= 2) {
    let currIdx = periodTrends.length - 1;
    if (month && month !== "all" && month !== "active_cycle" && !isYearlySummaryLabel(month)) {
      const targetKey = (normalizer && typeof normalizer.normalizeMonthComparisonKey === "function")
        ? normalizer.normalizeMonthComparisonKey(month)
        : normalizeArabicSearch(month);
      const foundIdx = periodTrends.findIndex(pt =>
        pt.key === targetKey ||
        pt.raw_month === String(month).trim() ||
        (normalizer && typeof normalizer.isSameMonth === "function" && normalizer.isSameMonth(pt.raw_month, month))
      );
      if (foundIdx >= 0) currIdx = foundIdx;
    }
    if (currIdx > 0) {
      const currP = periodTrends[currIdx];
      const prevP = periodTrends[currIdx - 1];
      const memoDeltaPct = prevP.memo_pages > 0
        ? Math.round(((currP.memo_pages - prevP.memo_pages) / prevP.memo_pages) * 1000) / 10
        : (currP.memo_pages > 0 ? 100 : 0);
      trendDeltas = {
        hasComparison: true,
        current_label: currP.label,
        previous_label: prevP.label,
        memo_pages_delta_pct: memoDeltaPct,
        attendance_rate_delta: Math.round((currP.attendance_rate - prevP.attendance_rate) * 10) / 10,
        excellent_rate_delta: Math.round((currP.excellent_rate - prevP.excellent_rate) * 10) / 10,
        absent_days_delta: currP.absent_days - prevP.absent_days
      };
    }
  }

  const totalMemoPagesAll = Math.round(students.reduce((acc, st) => acc + (Number(st.memo_pages) || 0), 0) * 10) / 10;

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
        total_absent_days: totalAbsentDays,
        total_memo_pages: totalMemoPagesAll
      },
      insights: {
        top_circle: topCircle,
        most_disciplined: mostDisciplinedCircle,
        top_memo: topMemoCircle
      },
      top_students: {
        top_memo: topMemoStudent ? { name: topMemoStudent.name, pages: topMemoStudent.memo_pages || 0, circle_name: topMemoStudent.circle_name, teacher_name: topMemoStudent.teacher_name } : null,
        top_rev: topRevStudent ? { name: topRevStudent.name, pages: topRevStudent.rev_pages || 0, circle_name: topRevStudent.circle_name, teacher_name: topRevStudent.teacher_name } : null,
        top_mastery: topMasteryStudent ? { name: topMasteryStudent.name, grade: topMasteryStudent.memo_grade || masteryCat, circle_name: topMasteryStudent.circle_name, score_text: topMasteryScoreText } : null,
        most_disciplined: mostDisciplinedStudent ? { name: mostDisciplinedStudent.name, absent_days: mostDisciplinedStudent.absent_days || 0, circle_name: mostDisciplinedStudent.circle_name } : null
      },
      memo_breakdown: memoBreakdown,
      rev_breakdown: revBreakdown,
      honor_board: honorBoard,
      followup_list: followupList,
      period_trends: periodTrends,
      trend_deltas: trendDeltas,
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

function showAnalyticsSkeletons(isLoading) {
  if (!isLoading) return;
  const skHtml = `<div class="an-skeleton-block"><div class="an-skeleton-line"></div><div class="an-skeleton-line short"></div></div>`;
  ["periodTrendChartWrap", "circleComparisonChartWrap", "memoBreakdownBars", "revBreakdownBars"].forEach(id => {
    const el = document.getElementById(id);
    if (el && !analyticsCache) el.innerHTML = skHtml;
  });
}

async function loadAnalyticsData() {
  const reqSeq = ++analyticsRequestSeq;
  if (activeAnalyticsAbort) {
    try { activeAnalyticsAbort.abort(); } catch (e) {}
  }
  activeAnalyticsAbort = new AbortController();
  const signal = activeAnalyticsAbort.signal;
  showAnalyticsSkeletons(true);

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

    if (!isStandalone) {
      try {
        const timeoutId = setTimeout(() => {
          try { activeAnalyticsAbort && activeAnalyticsAbort.abort(); } catch (e) {}
        }, 1500);
        const res = await fetch(url, { signal });
        clearTimeout(timeoutId);
        if (res.status === 401) {
          let hasLocalStaffSession = false;
          try {
            const rawU = localStorage.getItem("albayan_logged_user");
            const parsedU = rawU ? JSON.parse(rawU) : null;
            hasLocalStaffSession = Boolean(parsedU && parsedU.username && parsedU.role !== "student");
          } catch (e) {}
          if (!hasLocalStaffSession) {
            window.location.href = "login.html";
            return;
          }
        }
        if (res.ok) {
          data = await res.json();
          if (data && !data.error) fetched = true;
        }
      } catch (err) {}
    }

    if (reqSeq !== analyticsRequestSeq) return;

    if (!fetched) {
      data = await buildServerlessAnalytics(yearEl ? yearEl.value : null, monthEl ? monthEl.value : null, requestedExamId, signal);
    }

    if (reqSeq !== analyticsRequestSeq) return;
    if (!data) data = buildOfflineAnalyticsData();

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
      try { if (typeof renderCirclesSummary === "function") renderCirclesSummary(data.circles_analytics.summary, data.circles_analytics.trend_deltas); } catch (e) { console.error("Error in renderCirclesSummary:", e); }
      try { if (typeof renderCirclesInsights === "function") renderCirclesInsights(data.circles_analytics.insights, data.circles_analytics.top_students); } catch (e) { console.error("Error in renderCirclesInsights:", e); }
      try { if (typeof renderAnalyticsCharts === "function") renderAnalyticsCharts(data.circles_analytics, data.circle_rankings || []); } catch (e) { console.error("Error in renderAnalyticsCharts:", e); }
      try { if (typeof renderGradeBreakdowns === "function") renderGradeBreakdowns(data.circles_analytics.memo_breakdown, data.circles_analytics.rev_breakdown); } catch (e) { console.error("Error in renderGradeBreakdowns:", e); }
      try { if (typeof renderHonorAndFollowupBoards === "function") renderHonorAndFollowupBoards(data.circles_analytics.honor_board, data.circles_analytics.followup_list); } catch (e) { console.error("Error in renderHonorAndFollowupBoards:", e); }
    }
    try { if (data.circle_rankings && typeof renderCircleRankings === "function") renderCircleRankings(data.circle_rankings); } catch (e) { console.error("Error in renderCircleRankings:", e); }
    try { if (typeof initStudentStatisticsView === "function") initStudentStatisticsView(data); } catch (e) { console.error("Error in initStudentStatisticsView:", e); }
    try { updatePrintReportHeader(data); } catch (e) {}
    syncAnalyticsUrlParams();

    refreshAnalyticsIcons();
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

  badge.classList.remove("active");
  if (selectedExam) {
    const isAct = selectedExam.is_active === 1 ? "نشط للطلاب" : (selectedExam.is_active === 2 ? "قريباً" : "مغلق");
    const iconName = selectedExam.is_active === 1 ? "check-circle-2" : "file-text";
    if (selectedExam.is_active === 1) badge.classList.add("active");
    badge.innerHTML = `<i data-lucide="${iconName}" class="inline-row-icon"></i> ${escapeHtml(selectedExam.title)} | ${isAct} (${Number(selectedExam.duration_minutes) || 20} دقيقة)`;
  } else {
    badge.innerHTML = `<i data-lucide="bar-chart-3" class="inline-row-icon"></i> تقرير شامل لكافة الاختبارات`;
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
      banner.className = "analytics-cycle-banner";
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

function setDeltaPill(elId, delta, suffix, invertPositive = false, prevLabel = "") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.remove("up", "down", "neutral");
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) {
    el.classList.add("neutral");
    el.textContent = prevLabel || "بيانات أساسية";
    return;
  }
  const num = Math.round(Number(delta) * 10) / 10;
  if (num === 0) {
    el.classList.add("neutral");
    el.textContent = `ثابت مقارنة بـ ${prevLabel || "السابق"}`;
    return;
  }
  const isGood = invertPositive ? num < 0 : num > 0;
  el.classList.add(isGood ? "up" : "down");
  const sign = num > 0 ? "+" : "";
  el.textContent = `${sign}${num}${suffix} عن ${prevLabel || "الفترة السابقة"}`;
}

function renderCirclesSummary(summary, trendDeltas) {
  if (!summary) return;
  const elTotalCircles = document.getElementById("kpiTotalCircles");
  if (elTotalCircles) elTotalCircles.textContent = summary.total_circles || 0;
  
  const elAvgStudents = document.getElementById("kpiAvgStudentsPerCircle");
  if (elAvgStudents) elAvgStudents.textContent = `${summary.avg_students_per_circle || 0} متوسط الطلاب/حلقة`;
  
  const elTotalQuran = document.getElementById("kpiTotalQuranStudents");
  if (elTotalQuran) elTotalQuran.textContent = summary.total_students || 0;

  const elMemoSub = document.getElementById("kpiTotalMemoPagesSub");
  if (elMemoSub) elMemoSub.textContent = `${summary.total_memo_pages || 0} وجه حفظ منجز`;
  
  const elExcCount = document.getElementById("kpiExcellentMemoCount");
  if (elExcCount) elExcCount.textContent = summary.excellent_memo_count || 0;
  
  const excRate = summary.total_students > 0 ? ((summary.excellent_memo_count / summary.total_students) * 100).toFixed(1) : 0;
  const elExcRate = document.getElementById("kpiExcellentMemoRate");
  if (elExcRate) elExcRate.textContent = `${excRate}% من إجمالي الطلاب`;
  
  const elAttRate = document.getElementById("kpiAttendanceRate");
  if (elAttRate) elAttRate.textContent = `${summary.attendance_rate != null ? summary.attendance_rate : 100}%`;
  
  const elTotalAbsent = document.getElementById("kpiTotalAbsentDays");
  if (elTotalAbsent) elTotalAbsent.textContent = `${summary.total_absent_days || 0} إجمالي أيام الغياب`;

  const elDeltaCircles = document.getElementById("kpiDeltaCircles");
  if (elDeltaCircles) {
    elDeltaCircles.classList.remove("up", "down");
    elDeltaCircles.classList.add("neutral");
    elDeltaCircles.textContent = `${summary.total_circles || 0} حلقة نشطة بالمنظومة`;
  }

  if (trendDeltas && trendDeltas.hasComparison) {
    const prev = trendDeltas.previous_label || "الفترة السابقة";
    setDeltaPill("kpiDeltaMemoPages", trendDeltas.memo_pages_delta_pct, "% أوجه الحفظ", false, prev);
    setDeltaPill("kpiDeltaExcellence", trendDeltas.excellent_rate_delta, "% التميز", false, prev);
    setDeltaPill("kpiDeltaAttendance", trendDeltas.attendance_rate_delta, "% الحضور", false, prev);
  } else {
    setDeltaPill("kpiDeltaMemoPages", null, "", false, "لا توجد فترة سابقة للمقارنة");
    setDeltaPill("kpiDeltaExcellence", null, "", false, "أول فترة مسجلة");
    setDeltaPill("kpiDeltaAttendance", null, "", false, "أول فترة مسجلة");
  }
}

function renderCirclesInsights(insights, topStudents) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  if (insights && insights.top_circle) {
    setText("topCircleName", insights.top_circle.name);
    setText("topCircleSub", `الأستاذ: ${insights.top_circle.teacher_name || 'غير محدد'} | عدد الطلاب: ${insights.top_circle.student_count || 0}`);
    setText("topCircleBadge", `${insights.top_circle.memo_index || 0}% إتقان`);
  } else {
    setText("topCircleName", "لا توجد بيانات كافية");
    setText("topCircleSub", "الأستاذ: -- | عدد الطلاب: 0");
    setText("topCircleBadge", "0% إتقان");
  }

  if (insights && insights.most_disciplined) {
    setText("disciplinedCircleName", insights.most_disciplined.name);
    setText("disciplinedCircleSub", `الأستاذ: ${insights.most_disciplined.teacher_name || 'غير محدد'} | غياب: ${insights.most_disciplined.total_absent || 0} يوم`);
    setText("disciplinedCircleBadge", `${insights.most_disciplined.avg_absent || 0} متوسط/طالب`);
  } else {
    setText("disciplinedCircleName", "لا توجد بيانات كافية");
    setText("disciplinedCircleSub", "الأستاذ: -- | غياب: 0 يوم");
    setText("disciplinedCircleBadge", "0 متوسط/طالب");
  }

  if (insights && insights.top_memo) {
    setText("topMemoCircleName", insights.top_memo.name);
    setText("topMemoCircleSub", `الأستاذ: ${insights.top_memo.teacher_name || 'غير محدد'} | المتميزون: ${insights.top_memo.excellent_count || 0} طالب`);
    setText("topMemoCircleBadge", `${insights.top_memo.memo_index || 0}% إتقان`);
  } else {
    setText("topMemoCircleName", "لا توجد بيانات كافية");
    setText("topMemoCircleSub", "الأستاذ: -- | المتميزون: 0 طالب");
    setText("topMemoCircleBadge", "0% إتقان");
  }

  // Render Top 4 Student Achievers Cards
  if (topStudents && topStudents.top_memo) {
    setText("topMemoStudentName", topStudents.top_memo.name || 'غير محدد');
    const pages = Math.round(Number(topStudents.top_memo.pages || 0));
    setText("topMemoStudentPages", pages > 0 ? `${pages} وجه` : `0 وجه`);
    setText("topMemoStudentSub", `الحلقة: ${topStudents.top_memo.circle_name || 'عامة'} | المعلم: ${topStudents.top_memo.teacher_name || 'غير محدد'}`);
  } else {
    setText("topMemoStudentName", "لا توجد بيانات كافية");
    setText("topMemoStudentPages", "0 وجه");
    setText("topMemoStudentSub", "الحلقة: -- | المعلم: --");
  }

  if (topStudents && topStudents.top_rev) {
    setText("topRevStudentName", topStudents.top_rev.name || 'غير محدد');
    const pages = Math.round(Number(topStudents.top_rev.pages || 0));
    setText("topRevStudentPages", pages > 0 ? `${pages} وجه` : `0 وجه`);
    setText("topRevStudentSub", `الحلقة: ${topStudents.top_rev.circle_name || 'عامة'} | المعلم: ${topStudents.top_rev.teacher_name || 'غير محدد'}`);
  } else {
    setText("topRevStudentName", "لا توجد بيانات كافية");
    setText("topRevStudentPages", "0 وجه");
    setText("topRevStudentSub", "الحلقة: -- | المعلم: --");
  }

  if (topStudents && topStudents.top_mastery) {
    setText("topMasteryStudentName", topStudents.top_mastery.name || 'غير محدد');
    setText("topMasteryStudentBadge", `${topStudents.top_mastery.grade || 'ممتاز'}`);
    setText("topMasteryStudentSub", `الحلقة: ${topStudents.top_mastery.circle_name || 'عامة'} | التقييم: ${topStudents.top_mastery.score_text || 'ممتاز'}`);
  } else {
    setText("topMasteryStudentName", "لا توجد بيانات كافية");
    setText("topMasteryStudentBadge", "ممتاز");
    setText("topMasteryStudentSub", "الحلقة: -- | التقييم: --");
  }

  if (topStudents && topStudents.most_disciplined) {
    setText("mostDisciplinedStudentName", topStudents.most_disciplined.name || 'غير محدد');
    setText("mostDisciplinedStudentBadge", `${topStudents.most_disciplined.absent_days || 0} أيام غياب`);
    setText("mostDisciplinedStudentSub", `الحلقة: ${topStudents.most_disciplined.circle_name || 'عامة'} | انضباط تام`);
  } else {
    setText("mostDisciplinedStudentName", "لا توجد بيانات كافية");
    setText("mostDisciplinedStudentBadge", "0 أيام غياب");
    setText("mostDisciplinedStudentSub", "الحلقة: -- | انضباط تام");
  }
}

/* =========================================
   ZERO-DEPENDENCY INTERACTIVE SVG CHARTS
   ========================================= */
function renderAnalyticsCharts(circlesAnalytics, circleRankings) {
  renderPeriodTrendSvgChart((circlesAnalytics && circlesAnalytics.period_trends) || []);
  renderCircleComparisonSvgChart(circleRankings || []);
}

function renderPeriodTrendSvgChart(trends) {
  const wrap = document.getElementById("periodTrendChartWrap");
  if (!wrap) return;
  if (!Array.isArray(trends) || trends.length === 0) {
    wrap.innerHTML = `<div class="an-empty-state"><i data-lucide="line-chart" style="width:28px;height:28px;color:var(--muted);"></i><strong>لا توجد فترات مسجلة كافية لعرض المنحنى</strong><small>بمجرد رصد سجلات الحفظ والغياب لعدة فترات سيظهر اتجاه الأداء تلقائياً.</small></div>`;
    return;
  }

  const pts = trends.slice(-8);
  const w = 520;
  const h = 210;
  const padL = 36;
  const padR = 24;
  const padT = 22;
  const padB = 42;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const maxPages = Math.max(10, ...pts.map(p => Math.max(Number(p.memo_pages) || 0, Number(p.rev_pages) || 0)));
  const slotW = plotW / pts.length;
  const barW = Math.min(18, Math.max(8, slotW * 0.24));

  let gridLines = "";
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH * i) / 4;
    const val = Math.round(maxPages * (1 - i / 4));
    gridLines += `<line class="an-svg-grid" x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" />`;
    gridLines += `<text class="an-svg-label" x="${padL - 6}" y="${y + 4}" text-anchor="end">${val}</text>`;
  }

  const attPoints = [];
  let barsSvg = "";
  pts.forEach((p, idx) => {
    const cx = padL + slotW * idx + slotW / 2;
    const memoH = Math.max(2, ((Number(p.memo_pages) || 0) / maxPages) * plotH);
    const revH = Math.max(2, ((Number(p.rev_pages) || 0) / maxPages) * plotH);
    const memoY = padT + plotH - memoH;
    const revY = padT + plotH - revH;
    const attY = padT + plotH - ((Math.max(0, Math.min(100, Number(p.attendance_rate) || 0)) / 100) * plotH);
    attPoints.push({ cx, cy: attY, val: p.attendance_rate, label: p.label });

    barsSvg += `<g>
      <rect x="${cx - barW - 2}" y="${memoY}" width="${barW}" height="${memoH}" rx="4" fill="#2563eb"><title>${escapeHtml(p.label)} — الحفظ: ${p.memo_pages} وجه</title></rect>
      <rect x="${cx + 2}" y="${revY}" width="${barW}" height="${revH}" rx="4" fill="#0d9488"><title>${escapeHtml(p.label)} — المراجعة: ${p.rev_pages} وجه</title></rect>
      <text class="an-svg-label" x="${cx}" y="${h - 16}" text-anchor="middle">${escapeHtml(p.label.slice(0, 10))}</text>
    </g>`;
  });

  const polyStr = attPoints.map(pt => `${pt.cx.toFixed(1)},${pt.cy.toFixed(1)}`).join(" ");
  const lineSvg = attPoints.length > 1
    ? `<polyline fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polyStr}" />`
    : "";
  const dotsSvg = attPoints.map(pt =>
    `<g><circle cx="${pt.cx}" cy="${pt.cy}" r="4" fill="#d97706" stroke="#ffffff" stroke-width="1.5"><title>${escapeHtml(pt.label)} — الحضور: ${pt.val}%</title></circle><text class="an-svg-value" x="${pt.cx}" y="${Math.max(12, pt.cy - 8)}" text-anchor="middle">${pt.val}%</text></g>`
  ).join("");

  wrap.innerHTML = `<svg class="an-svg-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="منحنى اتجاه الأداء عبر الفترات">${gridLines}${barsSvg}${lineSvg}${dotsSvg}</svg>`;
}

function renderCircleComparisonSvgChart(circleRankings) {
  const wrap = document.getElementById("circleComparisonChartWrap");
  if (!wrap) return;
  const active = (circleRankings || []).filter(c => (c.student_count || 0) > 0).slice(0, 6);
  if (active.length === 0) {
    wrap.innerHTML = `<div class="an-empty-state"><i data-lucide="bar-chart-2" style="width:28px;height:28px;color:var(--muted);"></i><strong>لا توجد حلقات بها طلاب لعرض المقارنة</strong></div>`;
    return;
  }

  const w = 520;
  const h = 210;
  const padL = 32;
  const padR = 16;
  const padT = 24;
  const padB = 46;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const slotW = plotW / active.length;
  const barW = Math.min(20, Math.max(9, slotW * 0.28));

  let gridLines = "";
  [0, 50, 100].forEach(pct => {
    const y = padT + plotH * (1 - pct / 100);
    gridLines += `<line class="an-svg-grid" x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" />`;
    gridLines += `<text class="an-svg-label" x="${padL - 5}" y="${y + 4}" text-anchor="end">${pct}%</text>`;
  });

  const barsSvg = active.map((c, idx) => {
    const cx = padL + slotW * idx + slotW / 2;
    const mastery = Math.max(0, Math.min(100, Number(c.memo_index) || 0));
    const att = Math.max(0, Math.min(100, Number(c.attendance_rate != null ? c.attendance_rate : 100)));
    const mH = Math.max(2, (mastery / 100) * plotH);
    const aH = Math.max(2, (att / 100) * plotH);
    const mY = padT + plotH - mH;
    const aY = padT + plotH - aH;
    const shortName = String(c.name || "").replace(/^حلقة\s+/, "").slice(0, 10);
    return `<g>
      <rect x="${cx - barW - 2}" y="${mY}" width="${barW}" height="${mH}" rx="4" fill="#2563eb"><title>${escapeHtml(c.name)} — الإتقان: ${mastery}%</title></rect>
      <text class="an-svg-value" x="${cx - barW / 2 - 2}" y="${Math.max(12, mY - 5)}" text-anchor="middle">${mastery}%</text>
      <rect x="${cx + 2}" y="${aY}" width="${barW}" height="${aH}" rx="4" fill="#16a34a"><title>${escapeHtml(c.name)} — الحضور: ${att}%</title></rect>
      <text class="an-svg-value" x="${cx + barW / 2 + 2}" y="${Math.max(12, aY - 5)}" text-anchor="middle">${att}%</text>
      <text class="an-svg-label" x="${cx}" y="${h - 18}" text-anchor="middle">${escapeHtml(shortName)}</text>
    </g>`;
  }).join("");

  wrap.innerHTML = `<svg class="an-svg-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="مقارنة الحلقات في الإتقان والحضور">${gridLines}${barsSvg}</svg>`;
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
      { name: "ممتاز", color: "#16a34a", cls: "fill-green" },
      { name: "جيد جداً", color: "#2563eb", cls: "fill-blue" },
      { name: "جيد", color: "#0d9488", cls: "fill-teal" },
      { name: "مقبول", color: "#d97706", cls: "fill-yellow" },
      { name: "يحتاج متابعة", color: "#dc2626", cls: "fill-red" },
      { name: "غير محدد", color: "#64748b", cls: "fill-gray" }
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
          <div class="acc-bar-wrap">
            <div class="acc-bar-fill ${g.cls}" style="width: ${item.percent}%; background:${g.color};"></div>
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
  if (elAvg) {
    if (selectedExam) {
      elAvg.textContent = `${summary.avg_score || 0} (${summary.avg_percent || 0}%)`;
    } else {
      elAvg.textContent = `${summary.avg_percent || 0}%`;
    }
  }

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

function sortCircleRankingsList(rankings, sortKey) {
  const list = Array.isArray(rankings) ? [...rankings] : [];
  if (sortKey === "memo_pages") return list.sort((a, b) => (b.total_memo_pages || 0) - (a.total_memo_pages || 0));
  if (sortKey === "rev_pages") return list.sort((a, b) => (b.total_rev_pages || 0) - (a.total_rev_pages || 0));
  if (sortKey === "memo_index") return list.sort((a, b) => (b.memo_index || 0) - (a.memo_index || 0));
  if (sortKey === "absent_asc") return list.sort((a, b) => Number(a.avg_absent || 0) - Number(b.avg_absent || 0));
  if (sortKey === "absent_desc") return list.sort((a, b) => Number(b.avg_absent || 0) - Number(a.avg_absent || 0));
  if (sortKey === "students") return list.sort((a, b) => (b.student_count || 0) - (a.student_count || 0));
  if (sortKey === "name") return list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));
  return list;
}

function renderCircleRankings(rankings) {
  const tbody = document.getElementById("circlesRankTableBody");
  if (!tbody) return;

  if (!rankings || rankings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="an-empty-state"><i data-lucide="building-2" style="width:28px;height:28px;color:var(--muted);"></i><strong>لا تتوفر حلقات قرآنية مطابقة للفترة الحالية</strong><small>تأكد من إضافة حلقات نشطة أو أعد ضبط الفلاتر لعرض جميع السجلات.</small><button type="button" class="btn-secondary-outline" onclick="resetCirclesDateFilter()">عرض الفترة الحالية</button></div></td></tr>`;
    refreshAnalyticsIcons();
    return;
  }

  const sortKey = document.getElementById("circlesSortSelect")?.value || "rank";
  const indexed = rankings.map((c, origIdx) => ({ c, origIdx }));
  const sortedCircles = sortCircleRankingsList(rankings, sortKey);
  const indexById = new Map(indexed.map(item => [String(item.c.id), item.origIdx]));

  tbody.innerHTML = sortedCircles.map((c, i) => {
    const origIdx = indexById.get(String(c.id)) !== undefined ? indexById.get(String(c.id)) : i;
    let rankBadge = `<strong>#${i + 1}</strong>`;
    if (i < 3) {
      const medalColors = ["#d97706", "#64748b", "#b45309"];
      rankBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:900;color:${medalColors[i]};"><i data-lucide="award" class="inline-row-icon"></i> #${i + 1}</span>`;
    }

    const statusBadge = c.status_badge || "حلقة متميزة";
    const statusClass = c.status_class || "pass";
    let statusPillCls = "rank-status-pass";
    if (statusClass === "platinum") statusPillCls = "rank-status-platinum";
    else if (statusClass === "gold") statusPillCls = "rank-status-gold";
    else if (statusClass === "danger") statusPillCls = "rank-status-danger";
    else if (statusClass === "neutral") statusPillCls = "rank-status-neutral";

    return `
      <tr>
        <td>${rankBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:15px; color:var(--text); display:inline-flex; align-items:center; gap:5px;"><i data-lucide="building-2" class="inline-row-icon" style="color:var(--primary);"></i> ${escapeHtml(c.name)}</strong>
            <small style="color:var(--muted); font-size:12px;"><i data-lucide="user" style="width:12px; height:12px; vertical-align:-1px;"></i> الأستاذ: ${escapeHtml(c.teacher_name || 'غير محدد')}</small>
          </div>
        </td>
        <td><span class="circle-count-chip">${c.student_count || 0} طلاب</span></td>
        <td><strong>${c.total_memo_pages || 0}</strong> <span style="font-size:11px; color:var(--muted);">وجه</span></td>
        <td><strong>${c.total_rev_pages || 0}</strong> <span style="font-size:11px; color:var(--muted);">وجه</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px; justify-content:center;">
            <div class="mini-progress-track">
              <div class="mini-progress-fill" style="width:${c.memo_index || 0}%;"></div>
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
          <span class="rank-status-pill ${statusPillCls}">
            ${escapeHtml(statusBadge)}
          </span>
        </td>
        <td class="no-print">
          <button type="button" class="btn-secondary" style="padding:6px 12px; font-size:13px;" onclick="openCircleRosterModal(${origIdx})">
            <i data-lucide="eye" style="width:14px; height:14px;"></i> طلاب الحلقة
          </button>
        </td>
      </tr>
    `;
  }).join("");

  refreshAnalyticsIcons();
}

function toggleHonorBoardExpand() {
  showAllHonorBoard = !showAllHonorBoard;
  if (analyticsCache && analyticsCache.circles_analytics) {
    renderHonorAndFollowupBoards(analyticsCache.circles_analytics.honor_board, analyticsCache.circles_analytics.followup_list);
    refreshAnalyticsIcons();
  }
}

function toggleFollowupBoardExpand() {
  showAllFollowupBoard = !showAllFollowupBoard;
  if (analyticsCache && analyticsCache.circles_analytics) {
    renderHonorAndFollowupBoards(analyticsCache.circles_analytics.honor_board, analyticsCache.circles_analytics.followup_list);
    refreshAnalyticsIcons();
  }
}

window.toggleHonorBoardExpand = toggleHonorBoardExpand;
window.toggleFollowupBoardExpand = toggleFollowupBoardExpand;

function renderHonorAndFollowupBoards(honorBoard, followupList) {
  const honorContainer = document.getElementById("honorBoardList");
  const honorToggleWrap = document.getElementById("honorBoardToggleWrap");
  const followContainer = document.getElementById("followupBoardList");
  const followToggleWrap = document.getElementById("followupBoardToggleWrap");
  const INITIAL_LIMIT = 8;

  if (honorContainer) {
    if (!honorBoard || honorBoard.length === 0) {
      honorContainer.innerHTML = `<div class="an-empty-state"><i data-lucide="crown" style="width:26px;height:26px;color:var(--muted);"></i><strong>لا توجد قائمة شرف مسجلة حالياً</strong><small>يُدرج هنا الطلاب الحاصلون على تقدير ممتاز بغياب لا يتجاوز يوماً واحداً.</small></div>`;
      if (honorToggleWrap) honorToggleWrap.style.display = "none";
    } else {
      const visibleHonor = showAllHonorBoard ? honorBoard : honorBoard.slice(0, INITIAL_LIMIT);
      honorContainer.innerHTML = visibleHonor.map(s => `
        <div class="honor-board-item">
          <div>
            <strong class="honor-board-item-name"><i data-lucide="award" class="inline-row-icon" style="color:#d97706;"></i> ${escapeHtml(s.name)}</strong>
            <small class="honor-board-item-meta">${escapeHtml(s.circle_name || 'حلقة قرآنية')} | الأستاذ: ${escapeHtml(s.teacher_name || '--')}</small>
            <div class="honor-board-item-surah"><i data-lucide="book-open" class="inline-row-icon"></i> حفظ: من ${escapeHtml(s.from_surah || '--')} إلى ${escapeHtml(s.to_surah || '--')}</div>
          </div>
          <div style="text-align:left;">
            <span class="honor-board-item-grade">حفظ: ${escapeHtml(s.memo_grade || 'ممتاز')}</span>
            <small class="honor-board-item-absent">غياب: ${Number(s.absent_days) || 0} أيام</small>
          </div>
        </div>
      `).join("");
      if (honorToggleWrap) {
        if (honorBoard.length > INITIAL_LIMIT) {
          honorToggleWrap.style.display = "flex";
          honorToggleWrap.innerHTML = `<button type="button" class="btn-secondary-outline" onclick="toggleHonorBoardExpand()">${showAllHonorBoard ? "طي القائمة" : `عرض جميع الحالات (${honorBoard.length})`}</button>`;
        } else {
          honorToggleWrap.style.display = "none";
        }
      }
    }
  }

  if (followContainer) {
    if (!followupList || followupList.length === 0) {
      followContainer.innerHTML = `
        <div class="followup-empty-box">
          <i data-lucide="check-circle-2" style="width:28px; height:28px; color:#15803d; display:block; margin:0 auto 6px;"></i>
          <strong style="font-size:14.5px; color:#15803d; display:block;">رائع! جميع الطلاب بأداء جيد ومواظبة عالية.</strong>
          <small style="color:#166534; font-size:11.5px; margin-top:2px; display:block;">لا توجد تنبيهات غياب متكرر أو ضعف بالتقييمات حالياً.</small>
        </div>
      `;
      if (followToggleWrap) followToggleWrap.style.display = "none";
    } else {
      const visibleFollow = showAllFollowupBoard ? followupList : followupList.slice(0, INITIAL_LIMIT);
      followContainer.innerHTML = visibleFollow.map(s => `
        <div class="followup-student-item">
          <div class="followup-student-info">
            <strong class="followup-student-name"><i data-lucide="alert-triangle" class="inline-row-icon" style="color:#dc2626;"></i> ${escapeHtml(s.name)}</strong>
            <small class="followup-student-meta">${escapeHtml(s.circle_name || 'حلقة قرآنية')} | الأستاذ: ${escapeHtml(s.teacher_name || '--')}</small>
            <div class="followup-absence-tag">سجل الغياب: ${Number(s.absent_days) || 0} يوم غياب</div>
          </div>
          <div class="followup-student-badges">
            <span class="badge-grade-memo">حفظ: ${escapeHtml(s.memo_grade || 'يحتاج متابعة')}</span>
            <span class="badge-grade-rev">مراجعة: ${escapeHtml(s.rev_grade || 'غير محدد')}</span>
          </div>
        </div>
      `).join("");
      if (followToggleWrap) {
        if (followupList.length > INITIAL_LIMIT) {
          followToggleWrap.style.display = "flex";
          followToggleWrap.innerHTML = `<button type="button" class="btn-secondary-outline" onclick="toggleFollowupBoardExpand()">${showAllFollowupBoard ? "طي القائمة" : `عرض جميع الحالات (${followupList.length})`}</button>`;
        } else {
          followToggleWrap.style.display = "none";
        }
      }
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
                <td><strong>${escapeHtml(st.name)}</strong></td>
                <td><span class="${getGradeBadgeClass(categorizeGrade(st.memo_grade, 40))}">${escapeHtml(st.memo_grade || 'غير محدد')}</span></td>
                <td><span class="${getGradeBadgeClass(categorizeGrade(st.rev_grade, 30))}">${escapeHtml(st.rev_grade || 'غير محدد')}</span></td>
                <td><strong>${Number(st.absent_days) || 0} يوم</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }
  }

  const modal = document.getElementById("circleRosterModal");
  if (modal) {
    if (typeof window.albayanPushModalState === "function") window.albayanPushModalState();
    modal.style.display = "flex";
  }
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
          <span>${i + 1}. ${escapeHtml(q.question_text)} (${escapeHtml(getTypeName(q.question_type))})</span>
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
            ${isPassed ? 'ناجح' : 'راسب'}
          </span>
        </td>
        <td style="white-space: nowrap;">${dateFormattedHtml}</td>
        <td class="no-print">
          <button type="button" class="btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="openStudentModal(${idx})"><i data-lucide="eye" style="width:14px;height:14px;"></i> عرض التفاصيل</button>
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

  if (typeof window.albayanPushModalState === "function") window.albayanPushModalState();
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
      optionsHtml += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${c.student_count || 0} طلاب)</option>`;
    });
    selectCircle.innerHTML = optionsHtml;
    if (currentVal && Array.from(selectCircle.options).some(o => o.value === currentVal)) {
      selectCircle.value = currentVal;
    }
  }

  studentsAnalyticsPage = 1;
  filterAndRenderStudentAnalytics();
}

function resetStudentsPageAndRender() {
  studentsAnalyticsPage = 1;
  filterAndRenderStudentAnalytics();
}
window.resetStudentsPageAndRender = resetStudentsPageAndRender;

function setStudentsAnalyticsPage(page) {
  const target = Math.max(1, Number(page) || 1);
  studentsAnalyticsPage = target;
  renderCircleStudentsTable(currentFilteredCircleStudents);
  refreshAnalyticsIcons();
}
window.setStudentsAnalyticsPage = setStudentsAnalyticsPage;

function sortStudentsAnalyticsList(list, sortKey) {
  const arr = Array.isArray(list) ? [...list] : [];
  if (sortKey === "memo_pages_desc") return arr.sort((a, b) => (Number(b.memo_pages) || 0) - (Number(a.memo_pages) || 0));
  if (sortKey === "total_mark_desc") return arr.sort((a, b) => (Number(b.total_mark) || 0) - (Number(a.total_mark) || 0));
  if (sortKey === "absent_desc") return arr.sort((a, b) => (Number(b.absent_days) || 0) - (Number(a.absent_days) || 0));
  if (sortKey === "absent_asc") return arr.sort((a, b) => (Number(a.absent_days) || 0) - (Number(b.absent_days) || 0));
  if (sortKey === "name_asc") return arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));
  return arr;
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
      else if (memoVal === "يحتاج متابعة") matchesMemo = (mgCat === "يحتاج متابعة");
      else matchesMemo = mgCat === memoVal;
    }

    let matchesAttendance = true;
    const abs = Number(s.absent_days) || 0;
    if (attendanceVal === "perfect") matchesAttendance = abs === 0;
    else if (attendanceVal === "light") matchesAttendance = abs >= 1 && abs <= 2;
    else if (attendanceVal === "heavy") matchesAttendance = abs >= 3;

    return matchesName && matchesCircle && matchesMemo && matchesAttendance;
  });

  const sortKey = document.getElementById("studentsAnalyticsSortSelect")?.value || "default";
  const sortedFiltered = sortStudentsAnalyticsList(filtered, sortKey);

  renderStudentKPIs(sortedFiltered, circles.length);
  renderStudentHonorBoard(sortedFiltered);
  renderStudentGradesDistribution(sortedFiltered);
  renderCircleStudentsTable(sortedFiltered);

  refreshAnalyticsIcons();
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
    const rgCat = categorizeGrade(s.rev_grade, 30);
    if (mgCat === "ممتاز" || mgCat === "جيد جداً") {
      excCount++;
    }
    const abs = Number(s.absent_days) || 0;
    totalAbsent += abs;
    if (abs === 0) perfectCount++;
    if (abs >= 3 || mgCat === "يحتاج متابعة" || mgCat === "مقبول" || rgCat === "يحتاج متابعة" || rgCat === "مقبول") {
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
      <div class="honor-badge-tag"><i data-lucide="award" class="inline-row-icon"></i> الطالب المثالي</div>
      <div class="honor-body">
        <div class="honor-avatar">${escapeHtml(avatarChar)}</div>
        <div class="honor-details">
          <h4>${escapeHtml(topStudent.name)}</h4>
          <p class="honor-info-line"><strong>الحلقة:</strong> ${escapeHtml(topStudent.circle_name || "حلقة عامة")}</p>
          <p class="honor-info-line"><strong>إنجاز الحفظ:</strong> ${memoText} (${escapeHtml(topStudent.memo_grade || "غير محدد")})</p>
          <div class="honor-tags">
            <span class="honor-tag">حفظ: ${escapeHtml(topStudent.memo_grade || "غير محدد")}</span>
            <span class="honor-tag">مراجعة: ${escapeHtml(topStudent.rev_grade || "غير محدد")}</span>
            <span class="honor-tag">غياب: ${Number(topStudent.absent_days) || 0} أيام</span>
            ${topStudent.online_exam_score ? `<span class="honor-tag tag-exam" style="background:#dcfce7; color:#166534; border-color:#86efac;">التقييم: ${escapeHtml(topStudent.online_exam_score)}</span>` : ""}
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

  const counts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "مقبول": 0, "يحتاج متابعة": 0, "غير محدد": 0 };
  students.forEach(s => {
    const mgCat = categorizeGrade(s.memo_grade, 40);
    counts[mgCat] = (counts[mgCat] || 0) + 1;
  });

  const total = students.length;
  const bars = [
    { label: "ممتاز (حفظ متقن ومتميز)", count: counts["ممتاز"], fillClass: "fill-green", color: "#10b981" },
    { label: "جيد جداً (أداء ثابت ومتقدم)", count: counts["جيد جداً"], fillClass: "fill-blue", color: "#3b82f6" },
    { label: "جيد (مستوى متوسط ومقبول)", count: counts["جيد"], fillClass: "fill-teal", color: "#0d9488" },
    { label: "مقبول (بحاجة لتحسين ومراجعة)", count: counts["مقبول"], fillClass: "fill-yellow", color: "#f59e0b" },
    { label: "يحتاج متابعة (تنبيه وتقوية)", count: counts["يحتاج متابعة"], fillClass: "fill-red", color: "#ef4444" },
    { label: "غير محدد (لم يُرصد بعد)", count: counts["غير محدد"], fillClass: "fill-gray", color: "#64748b" }
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
  const pagEl = document.getElementById("circleStudentsPagination");
  if (!tbody || !badge) return;

  const list = Array.isArray(students) ? students : [];
  currentFilteredCircleStudents = list;

  if (list.length === 0) {
    badge.textContent = "0 طالب";
    if (pagEl) pagEl.style.display = "none";
    tbody.innerHTML = `<tr><td colspan="8"><div class="an-empty-state"><i data-lucide="search-x" style="width:28px;height:28px;color:var(--muted);"></i><strong>لا توجد سجلات تطابق خيارات التصفية الحالية</strong><small>جرّب مسح البحث أو اختيار جميع التقديرات والحلقات.</small><button type="button" class="btn-secondary-outline" onclick="resetStudentFilters()">إعادة ضبط الفلاتر</button></div></td></tr>`;
    return;
  }

  badge.textContent = `${list.length} طالب`;

  const totalPages = Math.max(1, Math.ceil(list.length / STUDENTS_ANALYTICS_PAGE_SIZE));
  if (studentsAnalyticsPage > totalPages) studentsAnalyticsPage = totalPages;
  const startIdx = (studentsAnalyticsPage - 1) * STUDENTS_ANALYTICS_PAGE_SIZE;
  const pageItems = list.slice(startIdx, startIdx + STUDENTS_ANALYTICS_PAGE_SIZE);

  tbody.innerHTML = pageItems.map((s, pageOffset) => {
    const idx = startIdx + pageOffset;
    const mg = s.memo_grade !== undefined && s.memo_grade !== null && String(s.memo_grade).trim() !== "" ? String(s.memo_grade).trim() : "غير محدد";
    const rg = s.rev_grade !== undefined && s.rev_grade !== null && String(s.rev_grade).trim() !== "" ? String(s.rev_grade).trim() : "غير محدد";
    const abs = Number(s.absent_days) || 0;

    const memoBadgeClass = getGradeBadgeClass(categorizeGrade(s.memo_grade, 40));
    const revBadgeClass = getGradeBadgeClass(categorizeGrade(s.rev_grade, 30));

    let attBadgeHtml = `<span class="badge-star">ملتزم (0 غياب)</span>`;
    if (abs >= 1 && abs <= 2) attBadgeHtml = `<span class="badge-yellow">غياب محدود (${abs} أيام)</span>`;
    else if (abs >= 3) attBadgeHtml = `<span class="badge-red">غياب متكرر (${abs} أيام)</span>`;

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
            <span class="avatar-lucide-circle">${s.name ? escapeHtml(s.name.charAt(0)) : "<i data-lucide=\"user\" style=\"width:15px;height:15px;\"></i>"}</span>
            <strong>${escapeHtml(s.name)}</strong>
          </div>
        </td>
        <td><strong style="display:inline-flex;align-items:center;gap:5px;"><i data-lucide="building-2" class="inline-row-icon" style="color:var(--primary);"></i> ${escapeHtml(s.circle_name || "حلقة عامة")}</strong></td>
        <td>
          <div style="font-size:13px; font-weight:700; margin-bottom:4px;">${memoRangeText}</div>
          <span class="${memoBadgeClass}">${escapeHtml(mg)}</span>
        </td>
        <td>
          <div style="font-size:13px; font-weight:700; margin-bottom:4px;">${revRangeText}</div>
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

  if (pagEl) {
    if (totalPages <= 1) {
      pagEl.style.display = "none";
    } else {
      pagEl.style.display = "flex";
      const endIdx = Math.min(list.length, startIdx + pageItems.length);
      pagEl.innerHTML = `
        <span class="an-pagination-info">عرض ${startIdx + 1}–${endIdx} من أصل ${list.length} طالب (صفحة ${studentsAnalyticsPage} من ${totalPages})</span>
        <div class="an-pagination-btns">
          <button type="button" class="an-page-btn" ${studentsAnalyticsPage <= 1 ? "disabled" : ""} onclick="setStudentsAnalyticsPage(${studentsAnalyticsPage - 1})">السابق</button>
          <button type="button" class="an-page-btn" ${studentsAnalyticsPage >= totalPages ? "disabled" : ""} onclick="setStudentsAnalyticsPage(${studentsAnalyticsPage + 1})">التالي</button>
        </div>
      `;
    }
  }
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
    <div class="record-modal-box record-modal-exam-ok">
      <h4 style="margin:0 0 8px; display:flex; align-items:center; gap:6px;"><i data-lucide="check-circle" style="width:18px; height:18px;"></i> النتيجة الدقيقة للاختبار الإلكتروني</h4>
      <p style="margin:0; font-size:16px; font-weight:800;">${escapeHtml(s.online_exam_score)} (${escapeHtml(s.online_exam_title || "اختبار تقييمي")})</p>
    </div>
  ` : `
    <div class="record-modal-box record-modal-neutral">
      <h4 style="margin:0 0 8px;">التقييم الشهري للاختبارات</h4>
      <p style="margin:0; font-weight:700;">${escapeHtml(s.exam_grade || "لم يجرِ الطالب اختباراً إلكترونياً بعد")}</p>
    </div>
  `;

  const container = document.getElementById("recordModalContent");
  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
      <div class="record-modal-box record-modal-memo">
        <small class="record-modal-label">مقرر وتقدير الحفظ</small>
        <div class="record-modal-range">${memoText}</div>
        <span class="${getGradeBadgeClass(categorizeGrade(s.memo_grade, 40))}" style="font-size:13px;">التقدير: ${escapeHtml(s.memo_grade || "غير محدد")}</span>
      </div>
      <div class="record-modal-box record-modal-rev">
        <small class="record-modal-label">مقرر وتقدير المراجعة</small>
        <div class="record-modal-range">${revText}</div>
        <span class="${getGradeBadgeClass(categorizeGrade(s.rev_grade, 30))}" style="font-size:13px;">التقدير: ${escapeHtml(s.rev_grade || "غير محدد")}</span>
      </div>
    </div>
    <div class="record-modal-box record-modal-neutral">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h4 style="margin:0 0 4px;">سجل الالتزام والحضور (${escapeHtml(s.record_month || "الفترة الحالية")})</h4>
          <span class="record-modal-att-sub">${attStatus}</span>
        </div>
        <div class="record-modal-abs-pill">
          <small>أيام الغياب</small>
          <strong>${abs}</strong>
        </div>
      </div>
    </div>
    ${examContent}
  `;

  if (typeof window.albayanPushModalState === "function") window.albayanPushModalState();
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

/* =========================================
   PHASE 5: CSV EXPORT (UTF-8 BOM) & PRINT HEADER
   ========================================= */
function buildCsvContent(headers, rows) {
  const escCsv = (val) => {
    const s = String(val == null ? "" : val).replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [headers.map(escCsv).join(",")];
  (rows || []).forEach(row => {
    lines.push(row.map(escCsv).join(","));
  });
  return "\uFEFF" + lines.join("\r\n");
}

function triggerCsvDownload(filename, csvString) {
  if (typeof Blob === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    return csvString;
  }
  try {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    if (document.body && typeof document.body.appendChild === "function") {
      document.body.appendChild(a);
    }
    if (typeof a.click === "function") a.click();
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 500);
  } catch (e) {
    console.warn("CSV download fallback:", e);
  }
  return csvString;
}

function exportAnalyticsCsv(kind) {
  if (!analyticsCache) return "";
  const target = kind || currentAnalyticsView || "circles";
  const yearVal = document.getElementById("filterCirclesYear")?.value || getDefaultAcademicYear();
  const monthVal = document.getElementById("filterCirclesMonth")?.value || "all";
  let csv = "";
  let filename = `albayan_analytics_${target}_${yearVal}_${monthVal}.csv`;

  if (target === "students") {
    const list = (currentFilteredCircleStudents && currentFilteredCircleStudents.length > 0)
      ? currentFilteredCircleStudents
      : (analyticsCache.circle_students || []);
    const headers = ["#", "اسم الطالب", "الحلقة", "أوجه الحفظ", "تقدير الحفظ", "أوجه المراجعة", "تقدير المراجعة", "أيام الغياب", "درجة الحضور (30)", "الاختبار الإلكتروني"];
    const rows = list.map((s, i) => [
      i + 1,
      s.name || "",
      s.circle_name || "",
      s.memo_pages || 0,
      s.memo_grade || "غير محدد",
      s.rev_pages || 0,
      s.rev_grade || "غير محدد",
      Number(s.absent_days) || 0,
      s.attendance_mark != null ? s.attendance_mark : computeAttendanceMarkFromAbsent(s.absent_days),
      s.online_exam_score || s.exam_grade || "لم يختبر بعد"
    ]);
    csv = buildCsvContent(headers, rows);
  } else if (target === "exams") {
    const list = (currentFilteredExamStudents && currentFilteredExamStudents.length > 0)
      ? currentFilteredExamStudents
      : (analyticsCache.students || []);
    const headers = ["#", "اسم الطالب", "الاختبار", "الدرجة", "إجمالي الأسئلة", "النسبة %", "الحالة", "التاريخ"];
    const rows = list.map((s, i) => [
      i + 1,
      s.student_name || s.name || "",
      s.exam_title || (analyticsCache.selected_exam && analyticsCache.selected_exam.title) || "اختبار",
      Number(s.score) || 0,
      getExamResultTotalQuestions(s),
      getExamResultPercentage(s),
      isExamResultPassed(s) ? "ناجح" : "راسب",
      s.created_at || ""
    ]);
    csv = buildCsvContent(headers, rows);
  } else {
    const sortKey = document.getElementById("circlesSortSelect")?.value || "rank";
    const list = sortCircleRankingsList(analyticsCache.circle_rankings || [], sortKey);
    const headers = ["الترتيب", "الحلقة", "الأستاذ المسؤول", "عدد الطلاب", "أوجه الحفظ", "أوجه المراجعة", "مؤشر الإتقان %", "نسبة الحضور %", "إجمالي الغياب", "التقييم"];
    const rows = list.map((c, i) => [
      i + 1,
      c.name || "",
      c.teacher_name || "",
      c.student_count || 0,
      c.total_memo_pages || 0,
      c.total_rev_pages || 0,
      c.memo_index || 0,
      c.attendance_rate != null ? c.attendance_rate : 100,
      c.total_absent || 0,
      c.status_badge || ""
    ]);
    csv = buildCsvContent(headers, rows);
  }

  return triggerCsvDownload(filename, csv);
}

function exportActiveViewCsv() {
  return exportAnalyticsCsv(currentAnalyticsView || "circles");
}

window.buildCsvContent = buildCsvContent;
window.exportAnalyticsCsv = exportAnalyticsCsv;
window.exportActiveViewCsv = exportActiveViewCsv;

function updatePrintReportHeader(data) {
  const subEl = document.getElementById("printReportSubtitle");
  const dateEl = document.getElementById("printReportDate");
  const filterEl = document.getElementById("printReportFilters");
  const authorEl = document.getElementById("printReportAuthor");
  if (!subEl && !dateEl && !filterEl && !authorEl) return;

  const viewTitles = {
    circles: "تقرير أداء وترتيب الحلقات القرآنية",
    students: "تقرير سجلات وأداء طلاب الحلقات",
    exams: "تقرير نتائج وتحليل الاختبارات الإلكترونية"
  };
  if (subEl) subEl.textContent = viewTitles[currentAnalyticsView] || viewTitles.circles;

  if (dateEl) {
    if (window.HijriDate && typeof window.HijriDate.formatDualDate === "function") {
      const dual = window.HijriDate.formatDualDate(new Date().toISOString());
      dateEl.textContent = `تاريخ الطباعة: ${dual.hijri} (${dual.gregorian})`;
    } else {
      dateEl.textContent = `تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}`;
    }
  }

  if (filterEl) {
    const yr = document.getElementById("filterCirclesYear")?.value || getDefaultAcademicYear();
    const mEl = document.getElementById("filterCirclesMonth");
    const mLabel = mEl && mEl.options && mEl.selectedIndex >= 0 && mEl.options[mEl.selectedIndex]
      ? mEl.options[mEl.selectedIndex].textContent
      : (mEl ? mEl.value : "الكل");
    const exTitle = data && data.selected_exam ? ` | الاختبار: ${data.selected_exam.title}` : "";
    filterEl.textContent = `السنة: ${yr} | الفترة: ${mLabel}${exTitle}`;
  }

  if (authorEl) {
    const uname = (_analyticsAuthUser && (_analyticsAuthUser.username || _analyticsAuthUser.display_name)) || "الإدارة والمشرفون";
    authorEl.textContent = `المُعِد: ${uname}`;
  }
}


