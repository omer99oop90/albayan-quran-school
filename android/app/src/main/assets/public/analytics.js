// CSRF Token Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}
function csrfHeaders(extra = {}) {
  return Object.assign({"Content-Type": "application/json", "X-CSRF-Token": getCsrfToken()}, extra);
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

document.addEventListener("DOMContentLoaded", async () => {
  initMobileSidebar();
  initBackToTop();
  await checkAuth();
  // Check if opened with exam_id parameter or exams tab request
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("exam_id") || urlParams.get("view") === "exams") {
    switchAnalyticsView("exams");
  } else if (urlParams.get("view") === "students") {
    switchAnalyticsView("students");
  }

  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear().toString();
  
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");
  
  if (cy) cy.value = currentYear;
  if (sy) sy.value = currentYear;
  if (cm) cm.value = "all";
  if (sm) sm.value = "all";

  loadAnalyticsData();
});

async function checkAuth() {
  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://') || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

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
      const userElem = document.getElementById("loggedUsername");
      if (userElem) userElem.textContent = data.username;
    }
    const canAccessCv = data.is_superadmin === 1 || data.role === "admin" || data.role === "supervisor" || (Array.isArray(data.permissions) && data.permissions.includes("student_cv"));
    const cvLink = document.getElementById("studentCvMenuLink");
    if (cvLink) cvLink.style.display = canAccessCv ? "flex" : "none";

    const canAccessUsers = data.is_superadmin === 1 || data.role === "admin" || (Array.isArray(data.permissions) && data.permissions.includes("users"));
    const usersLink = document.getElementById("usersMenuLink");
    if (usersLink) usersLink.style.display = canAccessUsers ? "flex" : "none";
  } catch (err) {
    let username = "الكادر التعليمي";
    try {
      const cached = localStorage.getItem("albayan_logged_user");
      if (cached) {
        const u = JSON.parse(cached);
        if (u && u.username) username = u.username;
      }
    } catch(e) {}
    const userElem = document.getElementById("loggedUsername");
    if (userElem) userElem.textContent = username;
  }
}


function syncAndLoadAnalytics(source) {
  loadAnalyticsData();
}

function resetCirclesDateFilter() {
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  if (cy) cy.value = new Date().getFullYear().toString();
  if (cm) cm.value = "all";
  loadAnalyticsData();
}

window.syncAndLoadAnalytics = syncAndLoadAnalytics;
window.resetCirclesDateFilter = resetCirclesDateFilter;


function switchAnalyticsView(viewType) {
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
  
  // 1. Parallel fetch from Firebase RTDB (with fast timeout)
  let rawCircles = null;
  let rawStudents = null;
  let rawExams = null;
  let rawResults = null;
  let rawSettings = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const [cRes, sRes, eRes, rRes, setRes] = await Promise.all([
      fetch(`${rtdbBase}/circles.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/students.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/exams.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/results.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/settings.json`, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    if (cRes && cRes.ok) rawCircles = await cRes.json().catch(() => null);
    if (sRes && sRes.ok) rawStudents = await sRes.json().catch(() => null);
    if (eRes && eRes.ok) rawExams = await eRes.json().catch(() => null);
    if (rRes && rRes.ok) rawResults = await rRes.json().catch(() => null);
    if (setRes && setRes.ok) rawSettings = await setRes.json().catch(() => null);
  } catch (err) {}

  // 2. Fallbacks from AlbayanLocalDB & localStorage
  let circles = [];
  if (rawCircles) {
    circles = Array.isArray(rawCircles) ? rawCircles.filter(Boolean) : Object.values(rawCircles);
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === "function") {
    try { circles = await window.AlbayanLocalDB.getLocalCircles(); } catch(e) {}
  }
  if (!circles || circles.length === 0) {
    try {
      const raw = localStorage.getItem("albayan_cached_circles") || localStorage.getItem("cached_circles_list");
      if (raw) circles = JSON.parse(raw);
    } catch(e) {}
  }

  let students = [];
  if (rawStudents) {
    students = Array.isArray(rawStudents) ? rawStudents.filter(Boolean) : Object.values(rawStudents);
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalStudents === "function") {
    try { students = await window.AlbayanLocalDB.getLocalStudents(); } catch(e) {}
  }
  if (!students || students.length === 0) {
    try {
      const raw = localStorage.getItem("cached_students_full");
      if (raw) students = JSON.parse(raw);
    } catch(e) {}
  }

  let exams = [];
  if (rawExams) {
    exams = Array.isArray(rawExams) ? rawExams.filter(Boolean) : Object.values(rawExams);
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
    results = Array.isArray(rawResults) ? rawResults.filter(Boolean) : Object.values(rawResults);
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalResults === "function") {
    try { results = await window.AlbayanLocalDB.getLocalResults(); } catch(e) {}
  }
  if (!results || results.length === 0) {
    try {
      const raw = localStorage.getItem("cached_results_list");
      if (raw) results = JSON.parse(raw);
    } catch(e) {}
  }

  // Normalize ID and structures
  circles = (circles || []).map((c, idx) => ({ ...c, id: c.id !== undefined ? c.id : idx + 1, name: c.name || `حلقة ${idx + 1}` }));
  students = (students || []).map((s, idx) => ({ ...s, id: s.id !== undefined ? s.id : idx + 1, name: s.name || `طالب ${idx + 1}` }));
  exams = (exams || []).map((e, idx) => ({ ...e, id: e.id !== undefined ? e.id : idx + 1, title: e.title || `اختبار ${idx + 1}` }));
  results = (results || []).map((r, idx) => ({ ...r, id: r.id !== undefined ? r.id : idx + 1 }));

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
    selectedExam = examsList.find(e => String(e.id) === String(requestedExamId)) || null;
    if (selectedExam) selectedExamId = selectedExam.id;
  }

  // Filter results for selected exam
  let filteredResults = results;
  if (selectedExam) {
    filteredResults = results.filter(r => String(r.exam_id) === String(selectedExam.id) || (r.exam_title && r.exam_title.trim() === selectedExam.title.trim()));
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
    const pct = Number(r.percentage) || (r.total_questions ? Math.round((sc / r.total_questions) * 100) : 0);
    const pass = (r.passed === 1 || r.passed === true || pct >= 50);
    if (pass) passedCount++;
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
    const answers = r.answers || [];
    answers.forEach(a => {
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

  const categorizeGrade = (grade) => {
    if (!grade || grade === "0" || grade === 0) return "غير محدد";
    const g = String(grade).trim();
    const num = parseFloat(g);
    if (!isNaN(num)) {
      if (num >= 36) return "ممتاز";
      if (num >= 30) return "جيد جداً";
      if (num >= 24) return "جيد";
      return "يحتاج متابعة";
    }
    if (["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(g)) return "ممتاز";
    if (["جيد جدا", "جيد جداً"].includes(g)) return "جيد جداً";
    if (["جيد"].includes(g)) return "جيد";
    if (["ضعيف", "مقبول", "يحتاج متابعة"].includes(g)) return "يحتاج متابعة";
    return "غير محدد";
  };

  // Group students by circle
  const circleStudentsMap = {};
  circles.forEach(c => {
    circleStudentsMap[c.id] = [];
    circleStudentsMap[c.name] = circleStudentsMap[c.id];
  });

  students.forEach(s => {
    const abs = Number(s.absent_days) || 0;
    totalAbsentDays += abs;

    const mgCat = categorizeGrade(s.memo_grade);
    const rgCat = categorizeGrade(s.rev_grade);
    memoCounts[mgCat] = (memoCounts[mgCat] || 0) + 1;
    revCounts[rgCat] = (revCounts[rgCat] || 0) + 1;

    if (mgCat === "ممتاز") excellentMemoCount++;

    const cTarget = circleStudentsMap[s.circle_id] || circleStudentsMap[s.circle_name];
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
    const cStudents = circleStudentsMap[c.id] || [];
    const count = cStudents.length;
    const cAbsent = cStudents.reduce((acc, st) => acc + (Number(st.absent_days) || 0), 0);
    const cAvgAbsent = count > 0 ? (cAbsent / count).toFixed(1) : 0;
    const cTotalMemoPages = cStudents.reduce((acc, st) => acc + (Number(st.memo_pages) || 0), 0);
    const cTotalRevPages = cStudents.reduce((acc, st) => acc + (Number(st.rev_pages) || 0), 0);
    const cExcellentCount = cStudents.filter(st => categorizeGrade(st.memo_grade) === "ممتاز").length;
    const cMemoIndex = count > 0 ? Math.round((cExcellentCount / count) * 100) : 0;

    let statusBadge = "🌟 حلقة متميزة";
    let statusClass = "pass";
    if (cMemoIndex >= 80 && cAvgAbsent <= 1) {
      statusBadge = "🏆 الصدارة الذهبية";
      statusClass = "platinum";
    } else if (cMemoIndex >= 50) {
      statusBadge = "⭐ أداء ممتاز";
      statusClass = "gold";
    } else if (cAvgAbsent > 3) {
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
  const mostDisciplinedCircle = [...circleRankings].sort((a, b) => a.avg_absent - b.avg_absent)[0] || null;
  const topMemoCircle = [...circleRankings].sort((a, b) => b.memo_index - a.memo_index)[0] || null;

  // Top Students Achievers
  const topMemoStudent = [...students].sort((a, b) => (Number(b.memo_pages) || 0) - (Number(a.memo_pages) || 0))[0] || null;
  const topRevStudent = [...students].sort((a, b) => (Number(b.rev_pages) || 0) - (Number(a.rev_pages) || 0))[0] || null;
  const topMasteryStudent = students.find(s => categorizeGrade(s.memo_grade) === "ممتاز") || students[0] || null;
  const mostDisciplinedStudent = [...students].sort((a, b) => (Number(a.absent_days) || 0) - (Number(b.absent_days) || 0))[0] || null;

  // Honor Board (Students with 'ممتاز' and absent <= 1)
  const honorBoard = students.filter(s => categorizeGrade(s.memo_grade) === "ممتاز" && (Number(s.absent_days) || 0) <= 1).slice(0, 15);

  // Followup List (Students with absent >= 3 or 'يحتاج متابعة')
  const followupList = students.filter(s => (Number(s.absent_days) || 0) >= 3 || categorizeGrade(s.memo_grade) === "يحتاج متابعة").slice(0, 15);

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
    const yearEl = document.getElementById("filterCirclesYear") || document.getElementById("filterStudentsYear");
    const monthEl = document.getElementById("filterCirclesMonth") || document.getElementById("filterStudentsMonth");
    const examSelect = document.getElementById("filterAnalyticsExamSelect");
    
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
    const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://') || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

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

    if (data.settings) {
      adaptAnalyticsFilters(data.settings);
    }

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

let hasAdaptedFilters = false;
function adaptAnalyticsFilters(settings) {
  if (!settings || hasAdaptedFilters) return;
  hasAdaptedFilters = true;
  const isCustom = settings.record_period_type === "custom";
  const monthsCount = settings.custom_period_months || 6;
  const totalTerms = Math.max(1, Math.floor(12 / monthsCount));

  const monthSelects = [
    document.getElementById("filterCirclesMonth"),
    document.getElementById("filterStudentsMonth")
  ];

  monthSelects.forEach(select => {
    if (!select) return;
    const currentVal = select.value;
    if (isCustom) {
      let optionsHtml = `<option value="all">جميع الفصول (السجل التراكمي)</option>`;
      for (let i = 1; i <= totalTerms; i++) {
        optionsHtml += `<option value="الفصل ${i} (${monthsCount} أشهر)">الفصل ${i} (${monthsCount} أشهر)</option>`;
      }
      select.innerHTML = optionsHtml;
      const label = select.previousElementSibling;
      if (label) label.innerHTML = `<i data-lucide="clock" style="width:14px; height:14px;"></i> الفصل المخصص`;
    }
    if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
      select.value = currentVal;
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
  if (insights) {
    if (insights.top_circle) {
      const elName = document.getElementById("topCircleName");
      if (elName) elName.textContent = `🕌 ${insights.top_circle.name}`;
      const elSub = document.getElementById("topCircleSub");
      if (elSub) elSub.textContent = `الأستاذ: ${insights.top_circle.teacher_name || 'غير محدد'} | عدد الطلاب: ${insights.top_circle.student_count || 0}`;
      const elBadge = document.getElementById("topCircleBadge");
      if (elBadge) elBadge.textContent = `${insights.top_circle.memo_index || 0}% إتقان`;
    }
    
    if (insights.most_disciplined) {
      const elName = document.getElementById("disciplinedCircleName");
      if (elName) elName.textContent = `🕌 ${insights.most_disciplined.name}`;
      const elSub = document.getElementById("disciplinedCircleSub");
      if (elSub) elSub.textContent = `الأستاذ: ${insights.most_disciplined.teacher_name || 'غير محدد'} | غياب: ${insights.most_disciplined.total_absent || 0} يوم`;
      const elBadge = document.getElementById("disciplinedCircleBadge");
      if (elBadge) elBadge.textContent = `${insights.most_disciplined.avg_absent || 0} متوسط/طالب`;
    }
    
    if (insights.top_memo) {
      const elName = document.getElementById("topMemoCircleName");
      if (elName) elName.textContent = `🕌 ${insights.top_memo.name}`;
      const elSub = document.getElementById("topMemoCircleSub");
      if (elSub) elSub.textContent = `الأستاذ: ${insights.top_memo.teacher_name || 'غير محدد'} | المتميزون: ${insights.top_memo.excellent_count || 0} طالب`;
      const elBadge = document.getElementById("topMemoCircleBadge");
      if (elBadge) elBadge.textContent = `${insights.top_memo.memo_index || 0}% إتقان`;
    }
  }

  // Render Top 4 Student Achievers Cards
  if (topStudents) {
    // 1. Top Memo
    if (topStudents.top_memo) {
      const elName = document.getElementById("topMemoStudentName");
      if (elName) elName.textContent = `👤 ${topStudents.top_memo.name || 'غير محدد'}`;
      const elPages = document.getElementById("topMemoStudentPages");
      if (elPages) {
        const pages = Math.round(Number(topStudents.top_memo.pages || 0));
        elPages.textContent = pages > 0 ? `${pages} وجه` : `0 وجه`;
      }
      const elSub = document.getElementById("topMemoStudentSub");
      if (elSub) elSub.textContent = `الحلقة: ${topStudents.top_memo.circle_name || 'عامة'} | المعلم: ${topStudents.top_memo.teacher_name || 'غير محدد'}`;
    }

    // 2. Top Rev
    if (topStudents.top_rev) {
      const elName = document.getElementById("topRevStudentName");
      if (elName) elName.textContent = `👤 ${topStudents.top_rev.name || 'غير محدد'}`;
      const elPages = document.getElementById("topRevStudentPages");
      if (elPages) {
        const pages = Math.round(Number(topStudents.top_rev.pages || 0));
        elPages.textContent = pages > 0 ? `${pages} وجه` : `0 وجه`;
      }
      const elSub = document.getElementById("topRevStudentSub");
      if (elSub) elSub.textContent = `الحلقة: ${topStudents.top_rev.circle_name || 'عامة'} | المعلم: ${topStudents.top_rev.teacher_name || 'غير محدد'}`;
    }

    // 3. Top Mastery
    if (topStudents.top_mastery) {
      const elName = document.getElementById("topMasteryStudentName");
      if (elName) elName.textContent = `👤 ${topStudents.top_mastery.name || 'غير محدد'}`;
      const elBadge = document.getElementById("topMasteryStudentBadge");
      if (elBadge) elBadge.textContent = `${topStudents.top_mastery.grade || 'ممتاز'}`;
      const elSub = document.getElementById("topMasteryStudentSub");
      if (elSub) elSub.textContent = `الحلقة: ${topStudents.top_mastery.circle_name || 'عامة'} | التقييم: ${topStudents.top_mastery.score_text || 'ممتاز'}`;
    }

    // 4. Most Disciplined Student
    if (topStudents.most_disciplined) {
      const elName = document.getElementById("mostDisciplinedStudentName");
      if (elName) elName.textContent = `👤 ${topStudents.most_disciplined.name || 'غير محدد'}`;
      const elBadge = document.getElementById("mostDisciplinedStudentBadge");
      if (elBadge) elBadge.textContent = `${topStudents.most_disciplined.absent_days || 0} أيام غياب`;
      const elSub = document.getElementById("mostDisciplinedStudentSub");
      if (elSub) elSub.textContent = `الحلقة: ${topStudents.most_disciplined.circle_name || 'عامة'} | انضباط تام`;
    }
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
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--muted)">لا تتوفر معلومات الحلقات بعد.</td></tr>`;
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
            <strong style="font-size:15px; color:var(--text);">🕌 ${c.name}</strong>
            <small style="color:var(--muted); font-size:12px;"><i data-lucide="user" style="width:12px; height:12px; vertical-align:-1px;"></i> الأستاذ: ${c.teacher_name || 'غير محدد'}</small>
          </div>
        </td>
        <td><span style="background:#f8fafc; padding:4px 10px; border-radius:8px; border:1px solid var(--line); font-weight:700;">${c.student_count || 0} طلاب</span></td>
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
            ${statusBadge}
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
        <div style="border:1px solid #fde68a; background:#ffffff; padding:12px 16px; border-radius:14px; display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; box-shadow:0 2px 8px rgba(245, 158, 11, 0.05);">
          <div>
            <strong style="font-size:15px; color:#1e293b; display:block;">🌟 ${s.name}</strong>
            <small style="color:var(--muted); font-size:12px;">🕌 ${s.circle_name || 'حلقة قرآنية'} | الأستاذ: ${s.teacher_name || '--'}</small>
            <div style="font-size:12px; color:#0f766e; margin-top:4px;">📖 حفظ: من ${s.from_surah || '--'} إلى ${s.to_surah || '--'}</div>
          </div>
          <div style="text-align:left;">
            <span style="background:#dcfce7; color:#15803d; font-weight:800; padding:4px 10px; border-radius:8px; font-size:12px; display:block; margin-bottom:4px;">حفظ: ${s.memo_grade || 'ممتاز'}</span>
            <small style="color:#64748b; font-size:11px;">غياب: ${s.absent_days || 0} أيام</small>
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
            <strong class="followup-student-name">⚠️ ${s.name}</strong>
            <small class="followup-student-meta">🕌 ${s.circle_name || 'حلقة قرآنية'} | الأستاذ: ${s.teacher_name || '--'}</small>
            <div class="followup-absence-tag">سجل الغياب: ${s.absent_days || 0} يوم غياب متكرر</div>
          </div>
          <div class="followup-student-badges">
            <span class="badge-grade-memo">حفظ: ${s.memo_grade || 'ضعيف'}</span>
            <span class="badge-grade-rev">مراجعة: ${s.rev_grade || 'ضعيف'}</span>
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

  if (!students || students.length === 0) {
    if (badge) badge.textContent = "0 طالب";
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">لا توجد نتائج مسجلة في قاعدة البيانات حتى الآن.</td></tr>`;
    return;
  }

  if (badge) badge.textContent = `${students.length} طالب ممتحن`;

  tbody.innerHTML = students.map((s, idx) => {
    const isPassed = s.passed === 1;
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
        <td><strong>${s.student_name}</strong></td>
        <td>${s.score} / ${s.total_questions}</td>
        <td><strong>${s.percentage}%</strong></td>
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

  const query = document.getElementById("searchStudent").value.trim().toLowerCase();
  const statusFilter = document.getElementById("filterStatus").value;

  const filtered = analyticsCache.students.filter(s => {
    const matchesName = s.student_name.toLowerCase().includes(query);
    let matchesStatus = true;
    if (statusFilter === "passed") matchesStatus = (s.passed === 1);
    if (statusFilter === "failed") matchesStatus = (s.passed === 0);

    return matchesName && matchesStatus;
  });

  renderStudentsTable(filtered);
}

function openStudentModal(studentIdx) {
  if (!analyticsCache || !analyticsCache.students[studentIdx]) return;
  const s = analyticsCache.students[studentIdx];

  document.getElementById("modalStudentName").textContent = `تفاصيل إجابات الطالب: ${s.student_name}`;
  document.getElementById("modalStudentMeta").textContent = `الدرجة: ${s.score} من ${s.total_questions} (${s.percentage}%) | الحالة: ${s.passed === 1 ? 'ناجح ✅' : 'راسب ❌'}`;

  const container = document.getElementById("modalAnswersList");
  if (!s.answers || s.answers.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted)">لا توجد إجابات تفصيلية مسجلة.</div>`;
  } else {
    container.innerHTML = s.answers.map((a, i) => {
      const isCorrect = a.is_correct === 1;
      return `
        <div class="modal-answer-item ${isCorrect ? 'correct' : 'wrong'}">
          <div><strong>س${i + 1}: ${a.question_text}</strong></div>
          <div>إجابة الطالب: <span>${a.selected_text}</span></div>
          <div>الإجابة الصحيحة: <strong>${a.correct_text}</strong></div>
        </div>
      `;
    }).join("");
  }

  document.getElementById("studentModal").style.display = "flex";
}

function closeStudentModal(event) {
  document.getElementById("studentModal").style.display = "none";
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

  const nameQuery = (document.getElementById("filterStudentName")?.value || "").trim().toLowerCase();
  const circleVal = document.getElementById("filterStudentCircle")?.value || "all";
  const memoVal = document.getElementById("filterStudentMemo")?.value || "all";
  const attendanceVal = document.getElementById("filterStudentAttendance")?.value || "all";

  const filtered = allStudents.filter(s => {
    const matchesName = !nameQuery || (s.name || "").toLowerCase().includes(nameQuery) || (s.circle_name || "").toLowerCase().includes(nameQuery);
    const matchesCircle = circleVal === "all" || s.circle_name === circleVal;
    
    let matchesMemo = true;
    if (memoVal !== "all") {
      const mg = (s.memo_grade || "").trim();
      if (memoVal === "ممتاز") matchesMemo = ["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(mg);
      else if (memoVal === "جيد جداً") matchesMemo = ["جيد جدا", "جيد جداً"].includes(mg);
      else if (memoVal === "جيد") matchesMemo = ["جيد"].includes(mg);
      else if (memoVal === "مقبول") matchesMemo = ["مقبول"].includes(mg);
      else if (memoVal === "يحتاج متابعة") matchesMemo = ["ضعيف", "يحتاج متابعة", "غير محدد", ""].includes(mg);
      else matchesMemo = mg === memoVal;
    }

    let matchesAttendance = true;
    const abs = s.absent_days || 0;
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
    if (sm && cm) sm.value = cm.value;
  } else if (source === "students") {
    if (cy && sy) cy.value = sy.value;
    if (cm && sm) cm.value = sm.value;
  }
  loadAnalyticsData();
}

function resetCirclesDateFilter() {
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear().toString();
  
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");
  
  if (cy) cy.value = currentYear;
  if (sy) sy.value = currentYear;
  if (cm) cm.value = currentMonth;
  if (sm) sm.value = currentMonth;
  
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

  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear().toString();
  
  const sy = document.getElementById("filterStudentsYear");
  const sm = document.getElementById("filterStudentsMonth");
  const cy = document.getElementById("filterCirclesYear");
  const cm = document.getElementById("filterCirclesMonth");
  
  if (sy) sy.value = currentYear;
  if (cy) cy.value = currentYear;
  if (sm) sm.value = currentMonth;
  if (cm) cm.value = currentMonth;

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
    const mg = (s.memo_grade || "").trim();
    if (["ممتاز", "ممتازة", "ممتاز مرتفع", "جيد جدا", "جيد جداً"].includes(mg)) {
      excCount++;
    }
    const abs = s.absent_days || 0;
    totalAbsent += abs;
    if (abs === 0) perfectCount++;
    if (abs >= 3 || ["ضعيف", "يحتاج متابعة"].includes(mg)) {
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

  // Score student for honor board
  const scoredStudents = students.map(s => {
    let score = 0;
    const mg = (s.memo_grade || "").trim();
    const rg = (s.rev_grade || "").trim();
    const abs = s.absent_days || 0;

    if (["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(mg)) score += 50;
    else if (["جيد جدا", "جيد جداً"].includes(mg)) score += 35;
    else if (mg === "جيد") score += 20;

    if (["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(rg)) score += 30;
    else if (["جيد جدا", "جيد جداً"].includes(rg)) score += 20;

    score -= (abs * 5);
    if (s.online_exam_score) score += 20;

    return { ...s, honorScore: score };
  }).sort((a, b) => b.honorScore - a.honorScore);

  const topStudent = scoredStudents[0];
  const avatarChar = topStudent.name ? topStudent.name.charAt(0) : "🌟";
  const memoText = (topStudent.from_surah && topStudent.to_surah) ? `من سورة ${topStudent.from_surah} إلى ${topStudent.to_surah}` : "مقرر الحفظ الشهري";

  container.innerHTML = `
    <div class="student-honor-item">
      <div class="honor-badge-tag">🏆 الطالب المثالي</div>
      <div class="honor-body">
        <div class="honor-avatar">${avatarChar}</div>
        <div class="honor-details">
          <h4>🌟 ${topStudent.name}</h4>
          <p class="honor-info-line"><strong>🕌 الحلقة:</strong> ${topStudent.circle_name || "حلقة عامة"}</p>
          <p class="honor-info-line"><strong>📖 إنجاز الحفظ:</strong> ${memoText} (${topStudent.memo_grade || "ممتاز"})</p>
          <div class="honor-tags">
            <span class="honor-tag">✨ حفظ: ${topStudent.memo_grade || "ممتاز"}</span>
            <span class="honor-tag">🔄 مراجعة: ${topStudent.rev_grade || "ممتاز"}</span>
            <span class="honor-tag">📅 غياب: ${topStudent.absent_days || 0} أيام</span>
            ${topStudent.online_exam_score ? `<span class="honor-tag tag-exam" style="background:#dcfce7; color:#166534; border-color:#86efac;">📝 التقييم: ${topStudent.online_exam_score}</span>` : ""}
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
    const mg = (s.memo_grade || "").trim();
    if (["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(mg)) counts["ممتاز"]++;
    else if (["جيد جدا", "جيد جداً"].includes(mg)) counts["جيد جداً"]++;
    else if (mg === "جيد") counts["جيد"]++;
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

  if (!students || students.length === 0) {
    badge.textContent = "0 طالب";
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: var(--muted);">لا توجد نتائج مسجلة تطابق خيارات التصفية الحالية.</td></tr>`;
    return;
  }

  badge.textContent = `${students.length} طالب`;

  tbody.innerHTML = students.map((s, idx) => {
    const mg = (s.memo_grade || "غير محدد").trim();
    const rg = (s.rev_grade || "غير محدد").trim();
    const abs = s.absent_days || 0;

    let memoBadgeClass = "badge-blue";
    if (["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(mg)) memoBadgeClass = "badge-star";
    else if (["جيد جدا", "جيد جداً"].includes(mg)) memoBadgeClass = "badge-blue";
    else if (mg === "جيد") memoBadgeClass = "badge-yellow";
    else if (["ضعيف", "يحتاج متابعة", "مقبول"].includes(mg)) memoBadgeClass = "badge-red";

    let revBadgeClass = "badge-blue";
    if (["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(rg)) revBadgeClass = "badge-star";
    else if (["جيد جدا", "جيد جداً"].includes(rg)) revBadgeClass = "badge-blue";
    else if (rg === "جيد") revBadgeClass = "badge-yellow";
    else if (["ضعيف", "يحتاج متابعة", "مقبول"].includes(rg)) revBadgeClass = "badge-red";

    let attBadgeHtml = `<span class="badge-star" style="background:#dcfce7; color:#15803d; border-color:#86efac;">🟢 ملتزم (0 غياب)</span>`;
    if (abs >= 1 && abs <= 2) attBadgeHtml = `<span class="badge-yellow">🟡 غياب محدود (${abs} أيام)</span>`;
    else if (abs >= 3) attBadgeHtml = `<span class="badge-red">🔴 غياب متكرر (${abs} أيام)</span>`;

    const memoRangeText = (s.from_surah && s.to_surah) ? `من ${s.from_surah} إلى ${s.to_surah}` : "مقرر الحفظ الشهري";
    const revRangeText = (s.rev_from_surah && s.rev_to_surah) ? `من ${s.rev_from_surah} إلى ${s.rev_to_surah}` : "مقرر المراجعة";

    const examDisplay = s.online_exam_score ? `<strong style="color:#16a34a;">${s.online_exam_score}</strong>` : `<span style="color:var(--muted);">${s.exam_grade || "لم يختبر بعد"}</span>`;

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#eff6ff; color:#1d4ed8; width:32px; height:32px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">${s.name ? s.name.charAt(0) : "👤"}</span>
            <strong>${s.name}</strong>
          </div>
        </td>
        <td><strong>🕌 ${s.circle_name || "حلقة عامة"}</strong></td>
        <td>
          <div style="font-size:13px; font-weight:700; margin-bottom:4px;">📖 ${memoRangeText}</div>
          <span class="${memoBadgeClass}">${mg}</span>
        </td>
        <td>
          <div style="font-size:13px; font-weight:700; margin-bottom:4px;">🔄 ${revRangeText}</div>
          <span class="${revBadgeClass}">${rg}</span>
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
  if (!analyticsCache) return;
  const allStudents = analyticsCache.circle_students || (analyticsCache.circles_analytics && analyticsCache.circles_analytics.all_students) || [];
  
  const elName = (document.getElementById("filterStudentName")?.value || "").trim().toLowerCase();
  const circleVal = document.getElementById("filterStudentCircle")?.value || "all";
  const memoVal = document.getElementById("filterStudentMemo")?.value || "all";
  const attendanceVal = document.getElementById("filterStudentAttendance")?.value || "all";

  const filtered = allStudents.filter(s => {
    const matchesName = !elName || (s.name || "").toLowerCase().includes(elName) || (s.circle_name || "").toLowerCase().includes(elName);
    const matchesCircle = circleVal === "all" || s.circle_name === circleVal;
    let matchesMemo = true;
    if (memoVal !== "all") {
      const mg = (s.memo_grade || "").trim();
      if (memoVal === "ممتاز") matchesMemo = ["ممتاز", "ممتازة", "ممتاز مرتفع"].includes(mg);
      else if (memoVal === "جيد جداً") matchesMemo = ["جيد جدا", "جيد جداً"].includes(mg);
      else if (memoVal === "جيد") matchesMemo = ["جيد"].includes(mg);
      else if (memoVal === "مقبول") matchesMemo = ["مقبول"].includes(mg);
      else if (memoVal === "يحتاج متابعة") matchesMemo = ["ضعيف", "يحتاج متابعة", "غير محدد", ""].includes(mg);
      else matchesMemo = mg === memoVal;
    }
    let matchesAtt = true;
    const abs = s.absent_days || 0;
    if (attendanceVal === "perfect") matchesAtt = abs === 0;
    else if (attendanceVal === "light") matchesAtt = abs >= 1 && abs <= 2;
    else if (attendanceVal === "heavy") matchesAtt = abs >= 3;
    return matchesName && matchesCircle && matchesMemo && matchesAtt;
  });

  const s = filtered[idx];
  if (!s) return;

  document.getElementById("recordModalStudentName").textContent = `المستند الإحصائي للطالب: ${s.name}`;
  document.getElementById("recordModalStudentMeta").textContent = `الحلقة: ${s.circle_name || "حلقة عامة"} | المعلم المشرف: ${s.teacher_name || "كادر تعليمي"}`;

  const memoText = (s.from_surah && s.to_surah) ? `من سورة ${s.from_surah} (آية ${s.from_ayah || 1}) إلى سورة ${s.to_surah} (آية ${s.to_ayah || 1})` : "مقرر الحفظ الشهري";
  const revText = (s.rev_from_surah && s.rev_to_surah) ? `من سورة ${s.rev_from_surah} (آية ${s.rev_from_ayah || 1}) إلى سورة ${s.rev_to_surah} (آية ${s.rev_to_ayah || 1})` : "مقرر المراجعة الشهري";

  const abs = s.absent_days || 0;
  let attStatus = "🟢 التزام ممتاز بالحضور";
  if (abs >= 1 && abs <= 2) attStatus = "🟡 غياب محدود يحتاج تنبيه بسيط";
  else if (abs >= 3) attStatus = "🔴 غياب متكرر يستدعي التواصل مع ولي الأمر";

  const examContent = s.online_exam_score ? `
    <div style="background:#f0fdf4; border:1px solid #86efac; padding:16px; border-radius:16px;">
      <h4 style="margin:0 0 8px; color:#166534; display:flex; align-items:center; gap:6px;"><i data-lucide="check-circle" style="width:18px; height:18px;"></i> النتيجة الدقيقة للاختبار الإلكتروني</h4>
      <p style="margin:0; font-size:16px; color:#15803d; font-weight:800;">${s.online_exam_score} (${s.online_exam_title || "اختبار تقييمي"})</p>
    </div>
  ` : `
    <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:16px; border-radius:16px;">
      <h4 style="margin:0 0 8px; color:#334155;">📝 التقييم الشهري للاختبارات</h4>
      <p style="margin:0; color:#64748b; font-weight:700;">${s.exam_grade || "لم يجرِ الطالب اختباراً إلكترونياً بعد"}</p>
    </div>
  `;

  const container = document.getElementById("recordModalContent");
  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
      <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:16px; border-radius:16px;">
        <small style="color:#1e40af; font-weight:700;">📖 مقرر وتقدير الحفظ</small>
        <div style="font-size:15px; font-weight:800; color:#1e3a8a; margin:6px 0;">${memoText}</div>
        <span class="badge-star" style="background:#ffffff; font-size:14px;">التقدير: ${s.memo_grade || "غير محدد"}</span>
      </div>
      <div style="background:#fef9c3; border:1px solid #fde047; padding:16px; border-radius:16px;">
        <small style="color:#854d0e; font-weight:700;">🔄 مقرر وتقدير المراجعة</small>
        <div style="font-size:15px; font-weight:800; color:#713f12; margin:6px 0;">${revText}</div>
        <span class="badge-yellow" style="background:#ffffff; font-size:14px;">التقدير: ${s.rev_grade || "غير محدد"}</span>
      </div>
    </div>
    <div style="background:#f1f5f9; border:1px solid #cbd5e1; padding:16px; border-radius:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0 0 4px; color:#0f172a;">📅 سجل الالتزام والحضور الشهر (${s.record_month || "الشهر الحالي"})</h4>
          <span style="font-weight:700; color:#475569;">${attStatus}</span>
        </div>
        <div style="background:#ffffff; border:2px solid #cbd5e1; padding:8px 16px; border-radius:12px; text-align:center;">
          <small style="display:block; color:#64748b; font-size:11px;">أيام الغياب</small>
          <strong style="font-size:20px; color:#0f172a;">${abs}</strong>
        </div>
      </div>
    </div>
    ${examContent}
  `;

  document.getElementById("studentRecordModal").style.display = "flex";
  if (window.lucide) lucide.createIcons();
}

function closeStudentRecordModal(event) {
  document.getElementById("studentRecordModal").style.display = "none";
}


