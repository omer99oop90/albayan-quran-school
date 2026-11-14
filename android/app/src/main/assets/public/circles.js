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

const DEFAULT_QURAN_SURAHS = [
  {"id": 1, "name": "الفاتحة", "ayahs": 7},
  {"id": 2, "name": "البقرة", "ayahs": 286},
  {"id": 3, "name": "آل عمران", "ayahs": 200},
  {"id": 4, "name": "النساء", "ayahs": 176},
  {"id": 5, "name": "المائدة", "ayahs": 120},
  {"id": 6, "name": "الأنعام", "ayahs": 165},
  {"id": 7, "name": "الأعراف", "ayahs": 206},
  {"id": 8, "name": "الأنفال", "ayahs": 75},
  {"id": 9, "name": "التوبة", "ayahs": 129},
  {"id": 10, "name": "يونس", "ayahs": 109},
  {"id": 11, "name": "هود", "ayahs": 123},
  {"id": 12, "name": "يوسف", "ayahs": 111},
  {"id": 13, "name": "الرعد", "ayahs": 43},
  {"id": 14, "name": "إبراهيم", "ayahs": 52},
  {"id": 15, "name": "الحجر", "ayahs": 99},
  {"id": 16, "name": "النحل", "ayahs": 128},
  {"id": 17, "name": "الإسراء", "ayahs": 111},
  {"id": 18, "name": "الكهف", "ayahs": 110},
  {"id": 19, "name": "مريم", "ayahs": 98},
  {"id": 20, "name": "طه", "ayahs": 135},
  {"id": 21, "name": "الأنبياء", "ayahs": 112},
  {"id": 22, "name": "الحج", "ayahs": 78},
  {"id": 23, "name": "المؤمنون", "ayahs": 118},
  {"id": 24, "name": "النور", "ayahs": 64},
  {"id": 25, "name": "الفرقان", "ayahs": 77},
  {"id": 26, "name": "الشعراء", "ayahs": 227},
  {"id": 27, "name": "النمل", "ayahs": 93},
  {"id": 28, "name": "القصص", "ayahs": 88},
  {"id": 29, "name": "العنكبوت", "ayahs": 69},
  {"id": 30, "name": "الروم", "ayahs": 60},
  {"id": 31, "name": "لقمان", "ayahs": 34},
  {"id": 32, "name": "السجدة", "ayahs": 30},
  {"id": 33, "name": "الأحزاب", "ayahs": 73},
  {"id": 34, "name": "سبأ", "ayahs": 54},
  {"id": 35, "name": "فاطر", "ayahs": 45},
  {"id": 36, "name": "يس", "ayahs": 83},
  {"id": 37, "name": "الصافات", "ayahs": 182},
  {"id": 38, "name": "ص", "ayahs": 88},
  {"id": 39, "name": "الزمر", "ayahs": 75},
  {"id": 40, "name": "غافر", "ayahs": 85},
  {"id": 41, "name": "فصلت", "ayahs": 54},
  {"id": 42, "name": "الشورى", "ayahs": 53},
  {"id": 43, "name": "الزخرف", "ayahs": 89},
  {"id": 44, "name": "الدخان", "ayahs": 59},
  {"id": 45, "name": "الجاثية", "ayahs": 37},
  {"id": 46, "name": "الأحقاف", "ayahs": 35},
  {"id": 47, "name": "محمد", "ayahs": 38},
  {"id": 48, "name": "الفتح", "ayahs": 29},
  {"id": 49, "name": "الحجرات", "ayahs": 18},
  {"id": 50, "name": "ق", "ayahs": 45},
  {"id": 51, "name": "الذاريات", "ayahs": 60},
  {"id": 52, "name": "الطور", "ayahs": 49},
  {"id": 53, "name": "النجم", "ayahs": 62},
  {"id": 54, "name": "القمر", "ayahs": 55},
  {"id": 55, "name": "الرحمن", "ayahs": 78},
  {"id": 56, "name": "الواقعة", "ayahs": 96},
  {"id": 57, "name": "الحديد", "ayahs": 29},
  {"id": 58, "name": "المجادلة", "ayahs": 22},
  {"id": 59, "name": "الحشر", "ayahs": 24},
  {"id": 60, "name": "الممتحنة", "ayahs": 13},
  {"id": 61, "name": "الصف", "ayahs": 14},
  {"id": 62, "name": "الجمعة", "ayahs": 11},
  {"id": 63, "name": "المنافقون", "ayahs": 11},
  {"id": 64, "name": "التغابن", "ayahs": 18},
  {"id": 65, "name": "الطلاق", "ayahs": 12},
  {"id": 66, "name": "التحريم", "ayahs": 12},
  {"id": 67, "name": "الملك", "ayahs": 30},
  {"id": 68, "name": "القلم", "ayahs": 52},
  {"id": 69, "name": "الحاقة", "ayahs": 52},
  {"id": 70, "name": "المعارج", "ayahs": 44},
  {"id": 71, "name": "نوح", "ayahs": 28},
  {"id": 72, "name": "الجن", "ayahs": 28},
  {"id": 73, "name": "المزمل", "ayahs": 20},
  {"id": 74, "name": "المدثر", "ayahs": 56},
  {"id": 75, "name": "القيامة", "ayahs": 40},
  {"id": 76, "name": "الإنسان", "ayahs": 31},
  {"id": 77, "name": "المرسلات", "ayahs": 50},
  {"id": 78, "name": "النبأ", "ayahs": 40},
  {"id": 79, "name": "النازعات", "ayahs": 46},
  {"id": 80, "name": "عبس", "ayahs": 42},
  {"id": 81, "name": "التكوير", "ayahs": 29},
  {"id": 82, "name": "الانفطار", "ayahs": 19},
  {"id": 83, "name": "المطففين", "ayahs": 36},
  {"id": 84, "name": "الانشقاق", "ayahs": 25},
  {"id": 85, "name": "البروج", "ayahs": 22},
  {"id": 86, "name": "الطارق", "ayahs": 17},
  {"id": 87, "name": "الأعلى", "ayahs": 19},
  {"id": 88, "name": "الغاشية", "ayahs": 26},
  {"id": 89, "name": "الفجر", "ayahs": 30},
  {"id": 90, "name": "البلد", "ayahs": 20},
  {"id": 91, "name": "الشمس", "ayahs": 15},
  {"id": 92, "name": "الليل", "ayahs": 21},
  {"id": 93, "name": "الضحى", "ayahs": 11},
  {"id": 94, "name": "الشرح", "ayahs": 8},
  {"id": 95, "name": "التين", "ayahs": 8},
  {"id": 96, "name": "العلق", "ayahs": 19},
  {"id": 97, "name": "القدر", "ayahs": 5},
  {"id": 98, "name": "البينة", "ayahs": 8},
  {"id": 99, "name": "الزلزلة", "ayahs": 8},
  {"id": 100, "name": "العاديات", "ayahs": 11},
  {"id": 101, "name": "القارعة", "ayahs": 11},
  {"id": 102, "name": "التكاثر", "ayahs": 8},
  {"id": 103, "name": "العصر", "ayahs": 3},
  {"id": 104, "name": "الهمزة", "ayahs": 9},
  {"id": 105, "name": "الفيل", "ayahs": 5},
  {"id": 106, "name": "قريش", "ayahs": 4},
  {"id": 107, "name": "الماعون", "ayahs": 7},
  {"id": 108, "name": "الكوثر", "ayahs": 3},
  {"id": 109, "name": "الكافرون", "ayahs": 6},
  {"id": 110, "name": "النصر", "ayahs": 3},
  {"id": 111, "name": "المسد", "ayahs": 5},
  {"id": 112, "name": "الإخلاص", "ayahs": 4},
  {"id": 113, "name": "الفلق", "ayahs": 5},
  {"id": 114, "name": "الناس", "ayahs": 6}
];
let quranSurahs = DEFAULT_QURAN_SURAHS;
let activeCircleId = null;
let cachedStudents = [];
let currentUserData = null;

function showNotice(message, isSuccess = false, duration = 3000) {
  let toast = document.getElementById("cleanNoticeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cleanNoticeToast";
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: ${isSuccess ? '#ecfdf5' : '#fef2f2'};
      color: ${isSuccess ? '#065f46' : '#991b1b'};
      border: 1.5px solid ${isSuccess ? '#6ee7b7' : '#fca5a5'};
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      font-family: inherit;
      text-align: center;
    `;
    document.body.appendChild(toast);
  }

  toast.style.background = isSuccess ? '#ecfdf5' : '#fef2f2';
  toast.style.color = isSuccess ? '#065f46' : '#991b1b';
  toast.style.borderColor = isSuccess ? '#6ee7b7' : '#fca5a5';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isSuccess ? '#059669' : '#dc2626'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span></span>
  `;
  toast.lastElementChild.textContent = String(message ?? '');
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";

  if (window.noticeTimeout) clearTimeout(window.noticeTimeout);
  window.noticeTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-10px)";
  }, Math.max(0, Number(duration) || 0));
}
window.showNotice = showNotice;

function normalizeCircleId(id) {
  if (id === null || id === undefined) return null;
  const s = String(id).replace(/^circles_/, '').trim();
  const num = parseInt(s, 10);
  return isNaN(num) ? s : num;
}

function normalizeStudentId(id) {
  if (id === null || id === undefined) return null;
  const s = String(id).replace(/^students_/, '').replace(/^student_/, '').trim();
  const num = parseInt(s, 10);
  return isNaN(num) ? s : num;
}

async function updateStudentRecord(studentId, fields) {
  const p = getPeriodFilterPayload();
  const targetCid = normalizeCircleId(activeCircleId);
  const cleanSid = normalizeStudentId(studentId);

  const numericZeroFields = new Set([
    "from_ayah", "to_ayah", "memo_pages",
    "rev_from_ayah", "rev_to_ayah", "sard_pages", "absent_days"
  ]);
  const normalizedFields = {};
  Object.keys(fields || {}).forEach(k => {
    const v = fields[k];
    if (v === null || v === undefined || v === "") {
      normalizedFields[k] = numericZeroFields.has(k) ? 0 : "";
    } else {
      normalizedFields[k] = v;
    }
  });

  // 1. Update in-memory cachedStudents array immediately for instant visual feedback
  let st = null;
  if (Array.isArray(cachedStudents)) {
    st = cachedStudents.find(s => String(s.id) === String(cleanSid));
    if (st) {
      Object.assign(st, normalizedFields);
      const calcFn = (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.calcQuranPages === "function")
        ? window.AlbayanDataNormalizer.calcQuranPages
        : (typeof calcClientQuranPages === "function" ? calcClientQuranPages : null);
      if ("from_surah" in normalizedFields || "to_surah" in normalizedFields || "from_ayah" in normalizedFields || "to_ayah" in normalizedFields) {
        if (st.from_surah && st.to_surah && Number(st.to_ayah) > 0 && calcFn) {
          st.memo_pages = calcFn(st.from_surah, st.from_ayah, st.to_surah, st.to_ayah);
        } else {
          st.memo_pages = 0;
        }
      }
      if (typeof patchStudentRow === "function") {
        patchStudentRow(st, true);
      } else if (typeof renderStudentsRows === "function") {
        renderStudentsRows(cachedStudents);
      }
    }
  }

  // 2. Delegate to unified RosterService (handles StateStore, IndexedDB, Outbox & verified Firebase write)
  if (window.RosterService && typeof window.RosterService.updateStudentRecord === "function") {
    try {
      const res = await window.RosterService.updateStudentRecord(targetCid, cleanSid, p, normalizedFields, st);
      if (res && res.student) {
        if (st) {
          Object.assign(st, res.student);
          if (typeof patchStudentRow === "function") patchStudentRow(st, true);
        } else if (typeof patchStudentRow === "function") {
          patchStudentRow(res.student, true);
        }
      }
      if (!res || !res.synced) {
        if (typeof showNotice === "function") {
          showNotice("تم حفظ التعديل محلياً، وسيتم رفعه إلى السحابة فور توفر الاتصال بالشبكة.", false);
        }
      }
      return res;
    } catch (e) {
      if (typeof showNotice === "function") {
        showNotice("تعذر حفظ التعديل في السحابة حالياً. تم حفظه محلياً.", false);
      }
    }
  }

  // Fallback if RosterService is not loaded
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.updateLocalStudentRecord === "function") {
    try {
      await window.AlbayanLocalDB.updateLocalStudentRecord(targetCid, cleanSid, normalizedFields, p);
    } catch (e) {}
  }
  if (typeof window.triggerInstantSync === "function") {
    window.triggerInstantSync();
  }
}
window.updateStudentRecord = updateStudentRecord;

async function clearInlineField(studentId, fieldName, emptyValue = "") {
  hidePopover();
  await updateStudentRecord(studentId, { [fieldName]: emptyValue });
}
window.clearInlineField = clearInlineField;

let currentPeriodType = localStorage.getItem("record_period_type") || "monthly"; // "monthly" | "daily" | "custom"
let customPeriodMonths = parseInt(localStorage.getItem("custom_period_months") || 6);

const SURAH_START_PAGES = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208,
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
  411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
  520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
  595, 595, 596, 596, 597, 597, 598, 598, 599, 599,
  600, 600, 601, 601, 601, 602, 602, 602, 603, 603,
  603, 604, 604, 604
];

function calcClientQuranPages(fromSurah, fromAyah, toSurah, toAyah) {
  if (!fromSurah || !toSurah || !quranSurahs || quranSurahs.length === 0) return 0;
  let fromIdx = quranSurahs.findIndex(s => s.name === fromSurah);
  let toIdx = quranSurahs.findIndex(s => s.name === toSurah);
  if (fromIdx === -1 || toIdx === -1) return 0;

  let fa = parseInt(fromAyah) || 1;
  let ta = parseInt(toAyah) || 1;
  if (fromIdx > toIdx || (fromIdx === toIdx && fa > ta)) {
    [fromIdx, toIdx] = [toIdx, fromIdx];
    [fa, ta] = [ta, fa];
  }

  const getPage = (idx, ayah) => {
    const startP = SURAH_START_PAGES[idx];
    const endP = (idx + 1 < SURAH_START_PAGES.length) ? SURAH_START_PAGES[idx + 1] : 604;
    const ayahsCount = quranSurahs[idx]?.ayahs || 1;
    if (endP <= startP) return startP;
    const fraction = (Math.max(1, ayah) - 1) / Math.max(1, ayahsCount);
    const offset = Math.floor(fraction * (endP - startP + 1));
    return Math.min(endP, startP + offset);
  };

  const pFrom = getPage(fromIdx, fa);
  const pTo = getPage(toIdx, ta);
  return Math.max(1, pTo - pFrom + 1);
}
let currentRecordDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

function getDefaultMonth() {
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return months[new Date().getMonth()];
}

function getPeriodFilterPayload() {
  const filterYear = document.getElementById("filterYear")?.value || new Date().getFullYear();
  const filterMonth = document.getElementById("filterMonth")?.value || getDefaultMonth();
  return {
    period_type: currentPeriodType,
    record_date: currentRecordDate,
    year: filterYear,
    month: filterMonth
  };
}

async function initPeriodSystem() {
  const savedType = localStorage.getItem("record_period_type");
  const savedMonths = localStorage.getItem("custom_period_months");
  if (savedType) currentPeriodType = savedType;
  if (savedMonths) customPeriodMonths = parseInt(savedMonths);
  updatePeriodUI();

  try {
    const res = await fetch("/api/account/profile");
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        currentPeriodType = data.settings.record_period_type || "monthly";
        customPeriodMonths = parseInt(data.settings.custom_period_months || 6);
        localStorage.setItem("record_period_type", currentPeriodType);
        localStorage.setItem("custom_period_months", customPeriodMonths.toString());
        updatePeriodUI();
      }
    }
  } catch (err) {
    console.warn("Could not load system settings:", err);
  }
}

function updateDailyDateUI() {
  const monthTrigger = document.getElementById("filterMonthTrigger");
  const yearTrigger = document.getElementById("filterYearTrigger");
  const filterRecordDateInput = document.getElementById("filterRecordDate");
  const filterMonthInput = document.getElementById("filterMonth");

  if (filterRecordDateInput) filterRecordDateInput.value = currentRecordDate;
  if (filterMonthInput) filterMonthInput.value = currentRecordDate;

  if (monthTrigger) {
    if (window.HijriDate) {
      const dual = window.HijriDate.formatDualDate(currentRecordDate);
      monthTrigger.innerHTML = `<span>${dual.hijri}</span> <small style="font-size:11px; opacity:0.8;">(${currentRecordDate})</small>`;
    } else {
      monthTrigger.textContent = currentRecordDate;
    }
  }
}

function updatePeriodUI() {
  const periodIconBox = document.getElementById("periodIconContainer");
  const monthTrigger = document.getElementById("filterMonthTrigger");
  const yearTrigger = document.getElementById("filterYearTrigger");
  const sep = document.getElementById("dateFilterSep");
  const filterPeriodTypeInput = document.getElementById("filterPeriodType");
  const filterMonthInput = document.getElementById("filterMonth");

  if (filterPeriodTypeInput) filterPeriodTypeInput.value = currentPeriodType;

  const calendarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

  if (periodIconBox) {
    periodIconBox.innerHTML = calendarSvg;
  }
  if (sep) sep.style.display = "none";
  if (yearTrigger) yearTrigger.style.display = "none";

  if (currentPeriodType === "daily") {
    updateDailyDateUI();
  } else if (currentPeriodType === "custom") {
    const customLabel = `الفصل 1 (${customPeriodMonths} أشهر)`;
    if (filterMonthInput && !filterMonthInput.value) filterMonthInput.value = customLabel;
    if (monthTrigger) monthTrigger.textContent = filterMonthInput?.value || customLabel;
  } else {
    // monthly
    if (monthTrigger && filterMonthInput) {
      monthTrigger.textContent = filterMonthInput.value || "صفر";
    }
  }
}

function stepDailyDate(delta) {
  const d = new Date(currentRecordDate);
  d.setDate(d.getDate() + delta);
  currentRecordDate = d.toISOString().split("T")[0];
  updateDailyDateUI();
  if (activeCircleId !== null) {
    loadStudents();
  }
}
window.stepDailyDate = stepDailyDate;

let cachedCircles = [];

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initMobileSidebar === "function") {
    try { initMobileSidebar(); } catch (e) {}
  }
  
  // Apply the saved view mode from settings
  const viewMode = localStorage.getItem("circlesViewMode") || "boards";
  const grid = document.getElementById("circlesGrid");
  if (grid) {
    grid.className = `circles-grid view-${viewMode}`;
  }

  // 0ms INSTANT SYNCHRONOUS RENDER (Local-First)
  try {
    const memCache = localStorage.getItem('albayan_cached_circles');
    if (memCache) {
      const c = JSON.parse(memCache);
      if (Array.isArray(c) && c.length > 0) {
        cachedCircles = c;
        renderCirclesGrid(c);
      }
    }
  } catch(e) {}

  // Non-blocking parallel background initialization
  window.loadCircles = loadCircles;
  checkAuth().catch(() => {});
  initPeriodSystem().catch(() => {});
  loadSurahs().catch(() => {});
  loadCircles().catch(() => {});

  window.addEventListener('albayan:firebase-ready', () => {
    loadCircles(true).catch(() => {});
  });

  // Close popover when clicking outside
  document.addEventListener("click", (e) => {
    const popover = document.getElementById("cellPopover");
    if (popover && !popover.contains(e.target) && !e.target.closest(".interactive-cell") && !e.target.closest(".date-filter-box")) {
      popover.style.display = "none";
    }
  });
});


function applyUserData(data) {
  if (!data) return;
  const uEl = document.getElementById("loggedUsername");
  const rEl = document.getElementById("loggedRole");
  if (uEl) uEl.textContent = data.username || "كادر تعليمي";
  if (rEl) rEl.textContent = data.role === "admin" ? "مسؤول النظام" : "كادر تعليمي";

  const canAccessCv = data.is_superadmin === 1 || data.role === "admin" || data.role === "supervisor" || (Array.isArray(data.permissions) && data.permissions.includes("student_cv"));
  const cvLink = document.getElementById("studentCvMenuLink");
  if (cvLink) cvLink.style.display = canAccessCv ? "flex" : "none";

  const canAccessUsers = data.is_superadmin === 1 || data.role === "admin" || (Array.isArray(data.permissions) && data.permissions.includes("users"));
  const usersLink = document.getElementById("usersMenuLink");
  if (usersLink) usersLink.style.display = canAccessUsers ? "flex" : "none";
}

async function checkAuth() {
  // 1. FAST SYNCHRONOUS LOCAL CACHE FIRST (0ms)
  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) {
      const u = JSON.parse(cached);
      if (u && (u.username || u.student_name)) {
        currentUserData = {
          logged_in: true,
          username: u.username || "معلم",
          role: u.role || "teacher",
          is_superadmin: u.role === "admin" ? 1 : 0,
          permissions: u.permissions || ["all_circles"]
        };
        applyUserData(currentUserData);
      }
    }
  } catch(e) {}

  const isCap = window.IS_CAPACITOR_APP || 
                window.location.protocol === 'file:' || 
                window.location.origin.includes('capacitor://') || 
                (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

  if (isCap && currentUserData && currentUserData.logged_in) {
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/me", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.logged_in) {
        currentUserData = data;
        try { localStorage.setItem("albayan_logged_user", JSON.stringify(data)); } catch(e) {}
        applyUserData(data);
        return;
      }
    }
  } catch (err) {
    // Offline notice
  }

  // Fallback to local session cache (works offline or when opening without local server)
  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) {
      const u = JSON.parse(cached);
      if (u && (u.username || u.student_name)) {
        currentUserData = {
          logged_in: true,
          username: u.username || "معلم",
          role: u.role || "teacher",
          is_superadmin: u.role === "admin" ? 1 : 0,
          permissions: u.permissions || ["all_circles"]
        };
        applyUserData(currentUserData);
        return;
      }
    }
  } catch(e) {}

  // If unauthenticated on web, redirect to login page
  if (!isCap && (!currentUserData || !currentUserData.logged_in)) {
    window.location.href = "login.html";
  }
}

async function logout() {
  if (typeof window.albayanLogout === 'function') {
    return window.albayanLogout();
  }
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
    sessionStorage.clear();
  } catch(e) {}
  fetch("/api/logout", { method: "POST" }).catch(() => {});
  const isCap = window.IS_CAPACITOR_APP || 
                window.location.protocol === 'file:' || 
                window.location.origin.includes('capacitor://') || 
                (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));
  window.location.href = "login.html?logout=1";
}
window.logout = logout;

async function loadSurahs() {
  try {
    const res = await fetch("/api/quran/surahs");
    quranSurahs = await res.json();
  } catch (err) {
    console.error("Failed to load Quran surahs:", err);
  }
}

function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let initialCircleAutoSelected = false;

function renderCirclesGrid(circles) {
  const container = document.getElementById("circlesGrid");
  if (!container) return;

  // Strict deduplication by ID
  const circleMap = new Map();
  (circles || []).forEach(c => {
    if (!c) return;
    const rawId = c.id !== undefined ? c.id : c.local_id;
    const cleanId = String(rawId || '').replace(/^circles_/, '').trim();
    const id = Number(cleanId) || cleanId;
    if (!id) return;
    if (!circleMap.has(id)) {
      circleMap.set(id, { ...c, id });
    }
  });
  const uniqueCircles = Array.from(circleMap.values());

  if (uniqueCircles.length === 0) {
    container.innerHTML = `<div class="loading-box" style="grid-column:1/-1;">لا توجد حلقات قرآنية مضافة بعد. انقر على "إضافة حلقة قرآنية جديدة" للبدء.</div>`;
    return;
  }

  const viewMode = localStorage.getItem("circlesViewMode") || "boards";

  container.innerHTML = uniqueCircles.map(c => {
    const escapedName = escapeHtmlAttr(c.name);
    const escapedDesc = escapeHtmlAttr(c.description || '');
    const studentCount = c.student_count || 0;
    let teacherName = c.teacher_name || '';
    if (!teacherName && c.teacher_id) {
      try {
        const cachedUsers = JSON.parse(localStorage.getItem("cached_users_list") || "[]");
        const u = cachedUsers.find(user => String(user.id).replace(/^users_/, '') === String(c.teacher_id).replace(/^users_/, ''));
        if (u && u.username) teacherName = u.username;
      } catch(e) {}
    }
    if (!teacherName) teacherName = 'إدارة عامة';

    const emblemSvg = `
      <svg style="width:22px; height:22px; fill:currentColor;" viewBox="0 0 100 100">
        <circle cx="50" cy="22" r="14"/>
        <path d="M30 40 c-7 0 -12 6 -12 14 v16 c0 4 3 7 7 7 h4 v-20 c0 -4 3 -7 7 -7 h28 c4 0 7 3 7 7 v20 h4 c4 0 7 -3 7 -7 v-16 c0 -8 -5 -14 -12 -14 Z"/>
        <path d="M18 82 l32 -26 l32 26 M18 56 l32 26 l32 -26" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
    
    if (viewMode === "details") {
      return `
        <div class="circle-card" onclick="selectCircle(${c.id}, '${escapedName}')" style="padding:12px 18px; display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:16px; min-height:auto;">
          <div style="display:flex; align-items:center; gap:14px; flex:1;">
            <div class="circle-icon-emblem" style="width:38px; height:38px; border-radius:12px;">${emblemSvg}</div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <h3 style="margin:0; font-size:16px; color:#0f172a; font-weight:800;">${c.name}</h3>
              <span style="font-size:12px; color:var(--muted);">${studentCount} طلاب • الأستاذ: ${teacherName}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;" onclick="event.stopPropagation()">
            <button type="button" class="btn-circle-edit" onclick="openEditCircleModal(event, ${c.id}, '${escapedName}', '${escapedDesc}', ${c.teacher_id || 'null'})" title="تعديل أو حذف الحلقة">
              <i data-lucide="edit-3" style="width:17px; height:17px;"></i>
            </button>
          </div>
        </div>
      `;
    } else if (viewMode === "small_icons") {
      return `
        <div class="circle-card" onclick="selectCircle(${c.id}, '${escapedName}')" style="padding:16px 12px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px;">
          <div style="position:absolute; top:8px; left:8px;" onclick="event.stopPropagation()">
            <button type="button" class="btn-circle-edit" style="width:30px; height:30px; min-width:30px; min-height:30px;" onclick="openEditCircleModal(event, ${c.id}, '${escapedName}', '${escapedDesc}', ${c.teacher_id || 'null'})" title="تعديل أو حذف الحلقة">
              <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
            </button>
          </div>
          <div class="circle-icon-emblem" style="width:40px; height:40px;">${emblemSvg}</div>
          <h3 style="margin:0; font-size:14.5px; font-weight:800; color:#0f172a; line-height:1.3;">${c.name}</h3>
          <span class="student-count-badge" style="font-size:10.5px; padding:2px 8px;">${studentCount} طلاب</span>
        </div>
      `;
    } else if (viewMode === "large_icons") {
      return `
        <div class="circle-card" onclick="selectCircle(${c.id}, '${escapedName}')" style="padding:28px 18px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px;">
          <div style="position:absolute; top:12px; left:12px;" onclick="event.stopPropagation()">
            <button type="button" class="btn-circle-edit" onclick="openEditCircleModal(event, ${c.id}, '${escapedName}', '${escapedDesc}', ${c.teacher_id || 'null'})" title="تعديل أو حذف الحلقة">
              <i data-lucide="edit-3" style="width:18px; height:18px;"></i>
            </button>
          </div>
          <div class="circle-icon-emblem" style="width:58px; height:58px; border-radius:18px;">${emblemSvg}</div>
          <h3 style="margin:0; font-size:18px; font-weight:800; color:#0f172a;">${c.name}</h3>
          <span class="student-count-badge" style="font-size:12px; padding:4px 12px;">${studentCount} طالباً</span>
          <div class="circle-teacher-pill" style="font-size:12px;">
            <i data-lucide="user-check" style="width:14px; height:14px;"></i> ${teacherName}
          </div>
        </div>
      `;
    } else {
      // Default "boards" - High-End UI/UX Pro Max Card
      return `
        <div class="circle-card" onclick="selectCircle(${c.id}, '${escapedName}')">
          <div class="circle-card-top">
            <div class="circle-card-title-group">
              <div class="circle-icon-emblem">
                ${emblemSvg}
              </div>
              <div class="circle-card-title-text">
                <h3>${c.name}</h3>
                <span class="student-count-badge">
                  <i data-lucide="users" style="width:13px; height:13px;"></i>
                  ${studentCount} طلاب
                </span>
              </div>
            </div>
            <button type="button" class="btn-circle-edit" onclick="openEditCircleModal(event, ${c.id}, '${escapedName}', '${escapedDesc}', ${c.teacher_id || 'null'})" title="تعديل أو حذف الحلقة">
              <i data-lucide="edit-3" style="width:18px; height:18px;"></i>
            </button>
          </div>

          <div class="circle-teacher-pill">
            <i data-lucide="user-check" style="width:15px; height:15px;"></i>
            الأستاذ: ${teacherName}
          </div>

          <p class="circle-desc">${c.description || 'حلقة قرآنية تعليمية لمتابعة الحفظ والمراجعة والسرد.'}</p>

          <div class="circle-card-footer">
            <div class="circle-enter-cue">
              <span>دخول لسجل طلاب الحلقة</span>
              <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>
            </div>
          </div>
        </div>
      `;
    }
  }).join("");
  
  if (window.lucide) lucide.createIcons();

  // Teacher role handling: "حلقتي" (single circle) vs "حلقاتي" (multiple circles)
  const isTeacher = currentUserData && (currentUserData.role === "teacher" || currentUserData.role === "معلم");
  
  if (isTeacher && circles.length === 1) {
    const single = circles[0];
    const navLabel = document.querySelector('#mobileNavCircles .bottom-nav-label, .bottom-nav-item[data-page="circles"] .bottom-nav-label');
    if (navLabel) navLabel.textContent = "حلقتي";

    const sidebarCircleLink = document.querySelector('.sidebar-menu a[href="/circles"], aside a[href="/circles"]');
    if (sidebarCircleLink) {
      sidebarCircleLink.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent.includes('الحلقات') || node.textContent.includes('حلقاتي'))) {
          node.textContent = ' حلقتي';
        }
      });
    }

    if (!initialCircleAutoSelected) {
      initialCircleAutoSelected = true;
      selectCircle(single.id, single.name);
    }
  } else if (isTeacher && circles.length > 1) {
    const navLabel = document.querySelector('#mobileNavCircles .bottom-nav-label, .bottom-nav-item[data-page="circles"] .bottom-nav-label');
    if (navLabel) navLabel.textContent = "حلقاتي";

    const sidebarCircleLink = document.querySelector('.sidebar-menu a[href="/circles"], aside a[href="/circles"]');
    if (sidebarCircleLink) {
      sidebarCircleLink.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('الحلقات')) {
          node.textContent = ' حلقاتي';
        }
      });
    }

    const mainHeading = document.querySelector('.content-header h1');
    if (mainHeading) {
      mainHeading.textContent = "حلقاتي القرآنية وسجلات الطلاب";
    }
  }

  // Query parameter support: ?circle_id=...
  if (!initialCircleAutoSelected) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramCircleId = urlParams.get("circle_id");
    if (paramCircleId) {
      const matched = circles.find(c => String(c.id) === String(paramCircleId));
      if (matched) {
        initialCircleAutoSelected = true;
        selectCircle(matched.id, matched.name);
      }
    }
  }
}

function sortCirclesByCreatedAt(list) {
  if (typeof window.sortCirclesByCreationDate === 'function') {
    return window.sortCirclesByCreationDate(list);
  }
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : (typeof a.id === 'number' ? a.id : (a.timestamp || 0));
    const tB = b.created_at ? new Date(b.created_at).getTime() : (typeof b.id === 'number' ? b.id : (b.timestamp || 0));
    if (isNaN(tA) || isNaN(tB) || tA === tB) return 0;
    return tB - tA;
  });
}

async function loadCircles(forceRemote = false) {
  window.loadCircles = loadCircles;
  const container = document.getElementById("circlesGrid");
  let circles = [];

  // 1. FAST LOCAL-FIRST RENDER (0ms from StateStore/localStorage & <10ms from IndexedDB)
  try {
    if (window.CirclesService && typeof window.CirclesService.getCachedCircles === 'function') {
      const stateCircles = window.CirclesService.getCachedCircles();
      if (Array.isArray(stateCircles) && stateCircles.length > 0) {
        circles = sortCirclesByCreatedAt(stateCircles);
        cachedCircles = circles;
        renderCirclesGrid(circles);
      }
    } else {
      const localCached = localStorage.getItem("albayan_cached_circles") || localStorage.getItem("cached_circles_list");
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          circles = sortCirclesByCreatedAt(parsed);
          cachedCircles = circles;
          renderCirclesGrid(circles);
        }
      }
    }
  } catch (e) {}

  if ((!circles || circles.length === 0) && window.AlbayanLocalDB) {
    try {
      const dbCircles = await AlbayanLocalDB.getLocalCircles();
      if (Array.isArray(dbCircles) && dbCircles.length > 0) {
        circles = sortCirclesByCreatedAt(dbCircles);
        cachedCircles = circles;
        renderCirclesGrid(circles);
      }
    } catch (e) {}
  }

  // 2. Unified Cloud Fetch via CirclesService
  let freshCircles = null;
  if (window.CirclesService && typeof window.CirclesService.fetchCircles === 'function') {
    try {
      const res = await window.CirclesService.fetchCircles({ forceRefresh: !!forceRemote });
      if (res && Array.isArray(res.circles)) {
        freshCircles = res.circles;
      }
    } catch (err) {}
  } else if (typeof window.pullCirclesFromFirebase === 'function') {
    try {
      const fbCircles = await window.pullCirclesFromFirebase(forceRemote);
      if (Array.isArray(fbCircles)) {
        freshCircles = fbCircles;
      }
    } catch (fbErr) {}
  }

  if (Array.isArray(freshCircles)) {
    freshCircles = sortCirclesByCreatedAt(freshCircles);
    circles = freshCircles;
    cachedCircles = circles;

    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
    const isModalOpen = document.querySelector('.modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"]');
    if (!isTyping && !isModalOpen) {
      renderCirclesGrid(circles);
    }
  } else if (!circles || circles.length === 0) {
    cachedCircles = [];
    renderCirclesGrid([]);
  }
}

function selectCircle(circleId, circleName) {
  try {
    localStorage.setItem("albayan_active_circle_id", circleId);
  } catch(e) {}
  window.location.href = `roster.html?circle_id=${circleId}`;
}
window.selectCircle = selectCircle;

function closeCircleRoster() {
  const isTeacher = currentUserData && (currentUserData.role === "teacher" || currentUserData.role === "معلم");
  const isSingle = isTeacher && currentUserData.teacher_circles_count === 1;
  if (isSingle) return; // Keep teacher inside their circle

  const section = document.getElementById("circleRosterSection");
  if (section) {
    section.style.display = "none";
  }
  document.body.classList.remove('fullscreen-mode');
  activeCircleId = null;
  hidePopover();
}
window.closeCircleRoster = closeCircleRoster;

function normalizeCircleId(id) {
  if (id === null || id === undefined) return null;
  const s = String(id).replace(/^circles_/, '').trim();
  const num = parseInt(s, 10);
  return isNaN(num) ? s : num;
}
window.normalizeCircleId = normalizeCircleId;

function generateStudentRowHTML(s, idx, isYearly) {
    const fromSurah = s.from_surah || "";
    const fromAyah = s.from_ayah || 0;
    const toSurah = s.to_surah || "";
    const toAyah = s.to_ayah || 0;

    const revFromSurah = s.rev_from_surah || "";
    const revFromAyah = s.rev_from_ayah || 0;
    const revToSurah = s.rev_to_surah || "";
    const revToAyah = s.rev_to_ayah || 0;

    const memoMark = (s.memo_grade !== undefined && s.memo_grade !== null && s.memo_grade !== "" && s.memo_grade !== "غير محدد" && s.memo_grade !== "0" && s.memo_grade !== 0 && parseFloat(s.memo_grade) > 0) ? parseFloat(s.memo_grade) : "";
    const revMark = (s.rev_grade !== undefined && s.rev_grade !== null && s.rev_grade !== "" && s.rev_grade !== "غير محدد" && s.rev_grade !== "0" && s.rev_grade !== 0 && parseFloat(s.rev_grade) > 0) ? parseFloat(s.rev_grade) : "";
    const sardPages = (s.sard_pages !== undefined && s.sard_pages !== null && parseFloat(s.sard_pages) > 0) ? parseFloat(s.sard_pages) : 0;
    const absentDays = s.absent_days !== undefined ? s.absent_days : 0;
    const attendanceMark = Math.max(0, 30 - (absentDays * 0.5));
    const activityMark = (s.activity_mark !== undefined && s.activity_mark !== null && s.activity_mark !== "" && s.activity_mark !== "0" && s.activity_mark !== 0 && parseFloat(s.activity_mark) > 0) ? parseFloat(s.activity_mark) : "";

    function formatAccompanyingMark(val) {
      if (val === undefined || val === null || val === "" || val === "غير محدد" || val === "-" || val === 0 || val === "0" || val === "0.0" || val === "0 / 20") {
        return "";
      }
      const parsed = parseFloat(val);
      if (isNaN(parsed) || parsed <= 0) {
        return "";
      }
      return parsed;
    }

    const fiqh = formatAccompanyingMark(s.fiqh);
    const tafsir = formatAccompanyingMark(s.tafsir);
    const adhkar = formatAccompanyingMark(s.adhkar);
    const seerah = formatAccompanyingMark(s.seerah);

    let totalScore = 0;
    if (memoMark !== "" && !isNaN(parseFloat(memoMark))) totalScore += parseFloat(memoMark);
    if (revMark !== "" && !isNaN(parseFloat(revMark))) totalScore += parseFloat(revMark);
    totalScore += attendanceMark;
    if (activityMark !== "" && !isNaN(parseFloat(activityMark))) totalScore += parseFloat(activityMark);
    if (fiqh !== "" && !isNaN(parseFloat(fiqh))) totalScore += parseFloat(fiqh);
    if (tafsir !== "" && !isNaN(parseFloat(tafsir))) totalScore += parseFloat(tafsir);
    if (adhkar !== "" && !isNaN(parseFloat(adhkar))) totalScore += parseFloat(adhkar);
    if (seerah !== "" && !isNaN(parseFloat(seerah))) totalScore += parseFloat(seerah);

    totalScore = Math.round(totalScore * 10) / 10;
    const percentage = Math.round((totalScore / 200) * 1000) / 10;
    let pctBadgeStyle = "background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;";
    if (percentage >= 90) {
      pctBadgeStyle = "background:rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.25);";
    } else if (percentage >= 80) {
      pctBadgeStyle = "background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;";
    } else if (percentage >= 65) {
      pctBadgeStyle = "background:#fffbeb; color:#b45309; border:1px solid #fde68a;";
    } else if (percentage >= 50) {
      pctBadgeStyle = "background:#fff7ed; color:#c2410c; border:1px solid #fed7aa;";
    } else {
      pctBadgeStyle = "background:#fff1f2; color:#e11d48; border:1px solid #fecdd3;";
    }

    const memoText = (fromSurah && toSurah && toAyah > 0) 
      ? `من سورة ${fromSurah} (${fromAyah}) إلى ${toSurah} (${toAyah})` 
      : (fromSurah ? `من سورة ${fromSurah} (${fromAyah}) <span style="font-size:11px; color:var(--primary); font-weight:700;">(انقر لتحديد إلى)</span>` : `<span style="color:var(--muted)">غير محدد</span>`);

    const memoPages = (s.memo_pages !== undefined && s.memo_pages !== null && s.memo_pages > 0)
      ? s.memo_pages
      : ((fromSurah && toSurah && toAyah > 0) ? calcClientQuranPages(fromSurah, fromAyah, toSurah, toAyah) : 0);

    const revText = (revFromSurah && revToSurah && revToAyah > 0) 
      ? `من سورة ${revFromSurah} (${revFromAyah}) إلى ${revToSurah} (${revToAyah})` 
      : (revFromSurah ? `من سورة ${revFromSurah} (${revFromAyah}) <span style="font-size:11px; color:var(--primary); font-weight:700;">(انقر لتحديد إلى)</span>` : `<span style="color:var(--muted)">غير محدد</span>`);

    const onCellClick = (fnStr) => isYearly ? `showYearlyRecordNotice()` : fnStr;

    return `
      <tr id="student-row-${s.id}" data-student-id="${s.id}">
        <td data-field="index" onclick="handleStudentRowDoubleClick(event, ${s.id})" ondblclick="event.preventDefault(); event.stopPropagation();" style="cursor:pointer; user-select:none;">${idx + 1}</td>
        <td data-field="name" class="student-name-cell" onclick="handleStudentRowDoubleClick(event, ${s.id})" ondblclick="event.preventDefault(); event.stopPropagation();" style="cursor:pointer; user-select:none;">
          <strong class="student-name-text" style="cursor:pointer; display:inline-block;">${s.name}</strong>
        </td>
        
        <td data-field="memo" class="interactive-cell surah-cell" onclick="${onCellClick(`openInlineSurahAyahDropdown(event, ${s.id}, 'memo', '${fromSurah}', ${fromAyah}, '${toSurah}', ${toAyah})`)}">
          <span>${memoText}</span>
        </td>

        <td data-field="memo_pages" style="text-align:center; font-weight:800; color:#475569; font-size:13.5px; white-space:nowrap;">
          <span>${memoPages > 0 ? memoPages + ' <span style="font-size:11px; font-weight:normal; color:var(--muted);">وجه' + (isYearly ? ' (إجمالي)' : '') + '</span>' : '-'}</span>
        </td>

        <td data-field="memo_grade" class="interactive-cell" onclick="${onCellClick(`openInlineMemoMarkDropdown(event, ${s.id}, '${memoMark}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${memoMark !== "" ? memoMark + ' / 40' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>

        <td data-field="rev" class="interactive-cell surah-cell" onclick="${onCellClick(`openInlineSurahAyahDropdown(event, ${s.id}, 'rev', '${revFromSurah}', ${revFromAyah}, '${revToSurah}', ${revToAyah})`)}">
          <span>${revText}</span>
        </td>

        <td data-field="sard_pages" class="interactive-cell" onclick="${onCellClick(`openInlineSardPagesDropdown(event, ${s.id}, '${sardPages}')`)}">
          <span style="font-weight:800; color:#475569; font-size:13.5px;">${sardPages > 0 ? sardPages + ' <span style="font-size:11px; font-weight:normal; color:var(--muted);">وجه' + (isYearly ? ' (إجمالي)' : '') + '</span>' : '-'}</span>
        </td>

        <td data-field="rev_grade" class="interactive-cell" onclick="${onCellClick(`openInlineRevMarkDropdown(event, ${s.id}, '${revMark}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${revMark !== "" ? revMark + ' / 30' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>

        <td data-field="absent_days" class="interactive-cell" onclick="${onCellClick(`openInlineAbsentDropdown(event, ${s.id}, '${absentDays}')`)}">
          <span><strong>${absentDays} أيام${isYearly ? ' <small style="font-size:10px; color:#dc2626;">(إجمالي)</small>' : ''}</strong></span>
        </td>

        <td data-field="attendance_mark" style="text-align:center; font-weight:800; color:#475569; font-size:13.5px; white-space:nowrap;">
          <span><strong style="color:#475569;">${attendanceMark} / 30${isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : ''}</strong></span>
        </td>

        <td data-field="activity_mark" class="interactive-cell" onclick="${onCellClick(`openInlineActivityMarkDropdown(event, ${s.id}, '${activityMark}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${activityMark !== "" ? activityMark + ' / 20' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>

        <td data-field="fiqh" class="interactive-cell" onclick="${onCellClick(`openInlineAccompanyingMarkDropdown(event, ${s.id}, 'fiqh', '${fiqh}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${fiqh !== "" ? fiqh + ' / 20' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>
        <td data-field="tafsir" class="interactive-cell" onclick="${onCellClick(`openInlineAccompanyingMarkDropdown(event, ${s.id}, 'tafsir', '${tafsir}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${tafsir !== "" ? tafsir + ' / 20' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>
        <td data-field="adhkar" class="interactive-cell" onclick="${onCellClick(`openInlineAccompanyingMarkDropdown(event, ${s.id}, 'adhkar', '${adhkar}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${adhkar !== "" ? adhkar + ' / 20' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>
        <td data-field="seerah" class="interactive-cell" onclick="${onCellClick(`openInlineAccompanyingMarkDropdown(event, ${s.id}, 'seerah', '${seerah}')`)}">
          <span><strong style="color:#475569; font-size:13.5px;">${seerah !== "" ? seerah + ' / 20' + (isYearly ? ' <small style="font-size:10px; color:#059669;">(متوسط)</small>' : '') : '-'}</strong></span>
        </td>

        <td data-field="total_score" style="text-align:center; white-space:nowrap;">
          <strong style="color:var(--primary, #2563eb); font-size:14.5px; font-weight:900;">${totalScore} / 200</strong>
        </td>

        <td data-field="percentage" style="text-align:center; white-space:nowrap;">
          <span style="${pctBadgeStyle} font-size:13px; font-weight:800; padding:4px 10px; border-radius:8px; display:inline-block;">
            ${percentage}%
          </span>
        </td>

        <td data-field="actions" class="actions-cell">
          <div class="actions-cell-wrapper">
            <button type="button" class="action-icon-btn btn-action-history" onclick="openStudentHistory(${s.id}, '${escapeSingleQuotes(s.name)}')" title="عرض السجل التراكمي ومتابعة الحفظ">
              <i data-lucide="history" style="width:17px; height:17px;"></i>
            </button>
            <button type="button" class="action-icon-btn btn-action-delete" onclick="deleteStudent(${s.id}, '${escapeSingleQuotes(s.name)}')" title="حذف بيانات الطالب">
              <i data-lucide="trash-2" style="width:17px; height:17px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  window.generateStudentRowHTML = generateStudentRowHTML;

  function patchStudentCell(studentId, field, value) {
    if (!studentId || !field) return;
    const row = document.getElementById("student-row-" + studentId);
    if (!row) return;
    const cell = row.querySelector(`td[data-field="${field}"]`);
    if (cell) {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT") && cell.contains(activeEl)) return;
      const span = cell.querySelector('span') || cell;
      span.textContent = value;
    }
  }
  window.patchStudentCell = patchStudentCell;

  function patchStudentRow(s, force = false) {
    if (!s || !s.id) return;
    const row = document.getElementById("student-row-" + s.id);
    const activeEl = document.activeElement;
    if (!force && row && activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT") && row.contains(activeEl)) {
      // Input inside this row is currently focused; do not destroy DOM to prevent focus loss!
      return;
    }

    const filterMonthVal = document.getElementById("filterMonth")?.value || "";
    const isYearlyFlag = (filterMonthVal === "سجل نهاية السنة" || filterMonthVal === "نهاية السنة" || filterMonthVal === "المحصلة السنوية" || filterMonthVal === "المحصلة السنوية الشاملة");

    let idx = 0;
    if (Array.isArray(cachedStudents)) {
      const fIdx = cachedStudents.findIndex(item => String(item.id) === String(s.id));
      if (fIdx >= 0) idx = fIdx;
    }

    const newHtml = generateStudentRowHTML(s, idx, isYearlyFlag);

    if (row) {
      const temp = document.createElement("tbody");
      temp.innerHTML = newHtml;
      const newRow = temp.firstElementChild;
      if (newRow) {
        row.replaceWith(newRow);
        if (window.lucide) lucide.createIcons();
      }
    } else {
      const tb = document.getElementById("studentsTableBody");
      if (!tb) return;
      const addRow = tb.querySelector("tr:last-child");
      const temp = document.createElement("tbody");
      temp.innerHTML = newHtml;
      const newRow = temp.firstElementChild;
      if (newRow) {
        if (addRow) {
          tb.insertBefore(newRow, addRow);
        } else {
          tb.appendChild(newRow);
        }
        if (window.lucide) lucide.createIcons();
      }
    }
  }
  window.patchStudentRow = patchStudentRow;

  function deleteStudentRow(studentId) {
    const row = document.getElementById("student-row-" + studentId);
    if (!row) return;
    row.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    row.style.opacity = "0";
    row.style.transform = "translateX(20px)";
    setTimeout(() => {
      row.remove();
      const rows = document.querySelectorAll("#studentsTableBody tr[data-student-id]");
      rows.forEach((r, i) => {
        const idxCell = r.querySelector('td[data-field="index"]');
        if (idxCell) idxCell.textContent = (i + 1);
      });
    }, 250);
  }
  window.deleteStudentRow = deleteStudentRow;

  function renderStudentsRows(list) {
    const tbody = document.getElementById("studentsTableBody");
    if (!tbody) return;

    const p = typeof getPeriodFilterPayload === "function" ? getPeriodFilterPayload() : { month: "" };
    const isYearly = (p.month === "سجل نهاية السنة" || p.month === "نهاية السنة" || p.month === "المحصلة السنوية" || p.month === "المحصلة السنوية الشاملة");

    try {
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; padding:20px; color:var(--muted)">لا يوجد طلاب مضافين في هذه الحلقة حتى الآن. انقر على "إضافة طالب جديد بالاسم" للبدء.</td></tr>
          <tr>
            <td colspan="18" class="interactive-cell" onclick="openQuickAddStudentModal()" style="text-align:center; padding:16px; color:#2563eb; font-weight:700; font-size:15px; background:#eff6ff; border:2px dashed #93c5fd; cursor:pointer;">
              <i data-lucide="user-plus" style="width:20px; height:20px; vertical-align:-5px; margin-left:6px;"></i> إضافة طالب جديد للحلقة
            </td>
          </tr>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      // Remove any stale non-student placeholder rows (e.g. loader or empty state)
      const placeholderRows = tbody.querySelectorAll("tr:not([data-student-id])");
      placeholderRows.forEach(r => r.remove());

      // If rows already exist in DOM, perform non-destructive incremental reconciliation
      const existingRows = tbody.querySelectorAll("tr[data-student-id]");
      if (existingRows && existingRows.length > 0) {
        const studentMap = new Map();
        list.forEach(s => studentMap.set(String(s.id), s));

        // Update or remove existing rows
        existingRows.forEach(r => {
          const sid = r.getAttribute("data-student-id");
          if (!studentMap.has(sid)) {
            r.remove();
          } else {
            patchStudentRow(studentMap.get(sid));
          }
        });

        // Add any newly arrived students
        list.forEach((s) => {
          if (!document.getElementById("student-row-" + s.id)) {
            patchStudentRow(s);
          }
        });

        // Re-index rows
        const currentRows = tbody.querySelectorAll("tr[data-student-id]");
        currentRows.forEach((r, i) => {
          const idxCell = r.querySelector('td[data-field="index"]');
          if (idxCell) idxCell.textContent = (i + 1);
        });
        return;
      }

      // Initial clean render when table is empty
      tbody.innerHTML = list.map((s, idx) => generateStudentRowHTML(s, idx, isYearly)).join("") + `
        <tr>
          <td colspan="18" class="interactive-cell" onclick="openQuickAddStudentModal()" style="text-align:center; padding:16px; color:#2563eb; font-weight:700; font-size:15px; background:#eff6ff; border:2px dashed #93c5fd; cursor:pointer;">
            <i data-lucide="user-plus" style="width:20px; height:20px; vertical-align:-5px; margin-left:6px;"></i> إضافة طالب جديد للحلقة
          </td>
        </tr>
      `;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; color:var(--danger)">تعذر جلب الطلاب.</td></tr>`;
    }
  }
  window.renderStudentsRows = renderStudentsRows;

async function loadStudents(forceRemote = false) {
  if (activeCircleId === null || activeCircleId === undefined) return;

  const rawFilterYear = document.getElementById("filterYear")?.value || new Date().getFullYear();
  const filterYear = String(rawFilterYear).replace(/\D/g, '') || "1448";
  const filterMonth = String(document.getElementById("filterMonth")?.value || getDefaultMonth()).trim();

  const isYearly = (filterMonth === "سجل نهاية السنة" || filterMonth === "نهاية السنة" || filterMonth === "المحصلة السنوية" || filterMonth === "المحصلة السنوية الشاملة");

  const banner = document.getElementById("yearlySummaryBanner");
  const bannerText = document.getElementById("yearlySummaryBannerText");
  if (banner) {
    banner.style.display = isYearly ? "flex" : "none";
    if (isYearly && bannerText) {
      bannerText.textContent = `سجل نهاية السنة (${filterYear} هـ): كشف المحصلة الشاملة لجميع الفصول والأشهر (مجموع أوجه الحفظ والسرد ومتوسطات العلامات).`;
    }
  }

  const periodPayload = {
    period_type: currentPeriodType,
    record_date: currentRecordDate,
    year: filterYear,
    month: filterMonth
  };

  const targetCid = normalizeCircleId(activeCircleId);

  // 1. Fast Period-Isolated Local Render (0ms from StateStore & <15ms from IndexedDB)
  let renderedLocal = false;
  if (window.AlbayanStateStore && typeof window.AlbayanStateStore.getRoster === 'function') {
    const stateRoster = window.AlbayanStateStore.getRoster(targetCid, periodPayload);
    if (Array.isArray(stateRoster) && stateRoster.length > 0) {
      cachedStudents = stateRoster;
      renderStudentsRows(cachedStudents);
      renderedLocal = true;
    }
  }

  if (!renderedLocal && window.AlbayanLocalDB) {
    try {
      const localStudents = await AlbayanLocalDB.getLocalStudents(targetCid, periodPayload);
      if (Array.isArray(localStudents) && localStudents.length > 0) {
        cachedStudents = localStudents;
        renderStudentsRows(cachedStudents);
      }
    } catch (dbErr) {}
  }

  // 2. Unified Cloud Fetch via RosterService (strictly period-isolated & sequence-guarded)
  if (window.RosterService && typeof window.RosterService.fetchRoster === 'function') {
    try {
      const res = await window.RosterService.fetchRoster(targetCid, periodPayload, { forceRefresh: !!forceRemote });
      if (res && !res.superseded && String(normalizeCircleId(activeCircleId)) === String(targetCid)) {
        cachedStudents = Array.isArray(res.students) ? res.students : [];
        renderStudentsRows(cachedStudents);
      }
      return;
    } catch (err) {}
  }

  // Fallback if RosterService is not loaded
  if (typeof window.pullStudentsFromFirebase === "function") {
    try {
      const fbStudents = await window.pullStudentsFromFirebase(targetCid, periodPayload, forceRemote);
      if (Array.isArray(fbStudents) && String(normalizeCircleId(activeCircleId)) === String(targetCid)) {
        cachedStudents = fbStudents;
        renderStudentsRows(cachedStudents);
      }
    } catch (fbErr) {}
  }
}

window.showYearlyRecordNotice = function() {
  showNotice("🎓 سجل نهاية السنة هو محصلة سنوية تجميعية محسوبة تلقائياً من كافة شهور وفصول السنة. لتعديل الدرجات مباشرة، يرجى اختيار الشهر أو الفصل المطلوب من الفلتر.");
};

// 6. Inline Accompanying Subjects Dropdown (العلامة من 20)
function openInlineAccompanyingMarkDropdown(event, studentId, subject, currentMark) {
  event.stopPropagation();
  let subjectName = "";
  if(subject === 'fiqh') subjectName = "الفقه";
  else if(subject === 'tafsir') subjectName = "التفسير";
  else if(subject === 'adhkar') subjectName = "الأذكار";
  else if(subject === 'seerah') subjectName = "السيرة";

  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML(`رصد علامة ${subjectName} (من 20)`)}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" id="popAccompanyingInput" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
        <span style="font-size:16px; font-weight:800; color:var(--muted, #64748b);">/ 20</span>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn-primary" style="width:100%; justify-content:center; padding:8px 12px; min-height:38px; height:38px; font-size:14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:none;" onclick="saveInlineAccompanyingMark(${studentId}, '${subject}')">
          تأكيد <i data-lucide="check" style="width:15px; height:15px;"></i>
        </button>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

async function saveInlineAccompanyingMark(studentId, subject) {
  const inputVal = (document.getElementById("popAccompanyingInput")?.value || "").trim();
  hidePopover();

  let subjectName = "";
  if(subject === 'fiqh') subjectName = "الفقه";
  else if(subject === 'tafsir') subjectName = "التفسير";
  else if(subject === 'adhkar') subjectName = "الأذكار";
  else if(subject === 'seerah') subjectName = "السيرة";

  if (inputVal === "") {
    await postAccompanyingMark(studentId, subject, "");
    return;
  }

  const mark = parseLocalizedNumber(inputVal);
  if (isNaN(mark)) {
    showNotice(`الرجاء إدخال علامة رقمية صحيحة لمادة ${subjectName}.`);
    return;
  }
  if (mark < 0 || mark > 20) {
    showNotice(`العلامة المدخلة غير صحيحة، يجب أن تكون علامة ${subjectName} بين 0 و 20.`);
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await postAccompanyingMark(studentId, subject, finalMark);
}

async function postAccompanyingMark(studentId, subject, markValue) {
  await updateStudentRecord(studentId, { [subject]: markValue });
  try {
    const p = getPeriodFilterPayload();
    fetch(`/api/students/${studentId}/accompanying`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ 
        subject: subject, 
        value: markValue,
        period_type: p.period_type,
        record_date: p.record_date,
        year: p.year,
        month: p.month
      })
    }).catch(() => {});
  } catch (err) {}
}
window.openInlineAccompanyingMarkDropdown = openInlineAccompanyingMarkDropdown;
window.saveInlineAccompanyingMark = saveInlineAccompanyingMark;

/* Modals & Popovers Management */

function closeModal(modalId) {
  if (typeof modalId === "string") {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.setProperty("display", "none", "important");
      modal.classList.remove("active");
    }
  } else if (modalId && modalId.target) {
    const modal = modalId.target.closest(".modal-overlay, .bottom-sheet");
    if (modal) {
      modal.style.setProperty("display", "none", "important");
      modal.classList.remove("active");
    }
  }
}
window.closeModal = closeModal;

async function populateTeachersDropdown(selectedTeacherId) {
  const tField = document.getElementById("teacherSelectField");
  const tSelect = document.getElementById("circleTeacher");
  if (!tSelect) return;

  function renderOptions(usersList) {
    if (!Array.isArray(usersList) || usersList.length === 0) return;
    if (tField) tField.style.display = "block";
    const cleanSel = selectedTeacherId !== null && selectedTeacherId !== undefined ? String(selectedTeacherId).replace(/^users_/, '').trim() : '';
    tSelect.innerHTML = `<option value="">-- بدون تحديد / إدارة عامة --</option>` +
      usersList.map(u => {
        const uId = String(u.id !== undefined ? u.id : (u.local_id || '')).replace(/^users_/, '').trim();
        const isSel = cleanSel && uId === cleanSel;
        const roleLabel = u.role === 'admin' ? 'مسؤول' : u.role === 'supervisor' ? 'مشرف' : 'معلم';
        return `<option value="${uId}" ${isSel ? 'selected' : ''}>${u.username || 'مستخدم ' + uId} (${roleLabel})</option>`;
      }).join("");
  }

  // 1. Instant local render (0ms from cache)
  let foundLocal = false;
  try {
    const cachedUsers = JSON.parse(localStorage.getItem("cached_users_list") || "[]");
    if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
      renderOptions(cachedUsers);
      foundLocal = true;
    }
  } catch (e) {}

  if (!foundLocal && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getUsers === "function") {
    try {
      const dbUsers = await window.AlbayanLocalDB.getUsers();
      if (Array.isArray(dbUsers) && dbUsers.length > 0) {
        renderOptions(dbUsers);
        foundLocal = true;
      }
    } catch (e) {}
  }

  // 2. Fetch fresh users from LAN server if reachable
  let freshUsers = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch("/api/users", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const users = await res.json();
      if (Array.isArray(users) && users.length > 0) {
        freshUsers = users;
      }
    }
  } catch (err) {}

  // 3. Fallback directly to Firebase pullUsersFromFirebase (Serverless Mode)
  if (!freshUsers && typeof window.pullUsersFromFirebase === "function") {
    try {
      const fbUsers = await window.pullUsersFromFirebase();
      if (Array.isArray(fbUsers) && fbUsers.length > 0) {
        freshUsers = fbUsers;
      }
    } catch (fbErr) {}
  }

  if (Array.isArray(freshUsers) && freshUsers.length > 0) {
    try { localStorage.setItem("cached_users_list", JSON.stringify(freshUsers)); } catch(e) {}
    renderOptions(freshUsers);
  }
}

async function openCreateCircleModal() {
  const modal = document.getElementById("circleModal") || document.getElementById("createCircleModal");
  if (modal) modal.style.display = "flex";

  document.getElementById("circleIdInput").value = "";
  document.getElementById("circleName").value = "";
  document.getElementById("circleDescription").value = "";
  
  const titleElem = document.getElementById("modalCircleHeaderTitle");
  if (titleElem) titleElem.textContent = "إنشاء حلقة قرآنية جديدة";
  
  const submitBtn = document.getElementById("btnSubmitCircle");
  if (submitBtn) submitBtn.innerHTML = `حفظ وإنشاء الحلقة <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>`;
  
  const delBtn = document.getElementById("btnDeleteCircle");
  if (delBtn) delBtn.style.display = "none";

  if (window.lucide) lucide.createIcons();
  populateTeachersDropdown(null).catch(() => {});
}

async function openEditCircleModal(event, circleId, circleName, circleDescription, teacherId) {
  if (event) event.stopPropagation();

  const cleanCid = normalizeCircleId(circleId);
  const c = (Array.isArray(cachedCircles) && cachedCircles.find(item => String(normalizeCircleId(item.id)) === String(cleanCid))) || {};
  const cName = circleName || c.name || "";
  const cDesc = circleDescription !== undefined && circleDescription !== null ? circleDescription : (c.description || "");
  const tId = teacherId !== undefined && teacherId !== null ? teacherId : (c.teacher_id || null);

  const modal = document.getElementById("circleModal") || document.getElementById("createCircleModal");
  if (modal) modal.style.display = "flex";
  
  document.getElementById("circleIdInput").value = cleanCid;
  document.getElementById("circleName").value = cName;
  document.getElementById("circleDescription").value = cDesc;
  
  const titleElem = document.getElementById("modalCircleHeaderTitle");
  if (titleElem) titleElem.textContent = `تعديل حلقة: ${cName}`;
  
  const submitBtn = document.getElementById("btnSubmitCircle");
  if (submitBtn) submitBtn.innerHTML = `حفظ التعديلات <i data-lucide="check" style="width:16px; height:16px;"></i>`;
  
  const delBtn = document.getElementById("btnDeleteCircle");
  if (delBtn) delBtn.style.display = "inline-flex";

  if (window.lucide) lucide.createIcons();
  populateTeachersDropdown(tId).catch(() => {});
}

async function saveCircleForm(e) {
  e.preventDefault();
  const circleId = document.getElementById("circleIdInput").value;
  const name = document.getElementById("circleName").value.trim();
  const description = document.getElementById("circleDescription").value.trim();
  const teacher_id = document.getElementById("circleTeacher")?.value || null;

  if (!name) {
    alert("الرجاء إدخال اسم الحلقة.");
    return;
  }

  const isEdit = !!circleId;
  const cleanCid = isEdit ? normalizeCircleId(circleId) : Date.now();
  const teacherInt = teacher_id ? parseInt(teacher_id, 10) : null;
  const teacherSelect = document.getElementById("circleTeacher");
  let teacherName = teacherSelect ? (teacherSelect.selectedOptions[0]?.text?.replace(/^--.*--$/, '') || "") : "";
  teacherName = teacherName.replace(/\s*\([^)]*\)\s*$/, '').trim();

  const existingCircle = (Array.isArray(cachedCircles) && cachedCircles.find(c => String(normalizeCircleId(c.id)) === String(cleanCid))) || {};

  const circleData = {
    id: cleanCid,
    local_id: cleanCid,
    name: name,
    description: description,
    teacher_id: teacherInt,
    teacher_name: teacherName || existingCircle.teacher_name || '',
    student_count: existingCircle.student_count || 0,
    created_at: isEdit ? (existingCircle.created_at || new Date().toISOString()) : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  closeModal("circleModal");
  closeModal("createCircleModal");

  if (window.CirclesService && typeof window.CirclesService.saveCircle === 'function') {
    const res = await window.CirclesService.saveCircle(circleData, { isEdit });
    cachedCircles = window.CirclesService.getCachedCircles();
    renderCirclesGrid(cachedCircles);
    if (res && res.synced) {
      showNotice(isEdit ? "تم تحديث الحلقة وحفظها سحابياً بنجاح ☁️✓" : "تمت إضافة الحلقة وحفظها سحابياً بنجاح ☁️✓", true);
    } else {
      showNotice(isEdit ? "تم تحديث الحلقة محلياً وستتم مزامنتها تلقائياً ✓" : "تمت إضافة الحلقة محلياً وستتم مزامنتها تلقائياً ✓", true);
    }
    return;
  }

  // Fallback if CirclesService is not loaded
  if (!Array.isArray(cachedCircles)) cachedCircles = [];
  const existingIdx = cachedCircles.findIndex(c => String(normalizeCircleId(c.id)) === String(circleData.id));
  if (existingIdx >= 0) {
    cachedCircles[existingIdx] = { ...cachedCircles[existingIdx], ...circleData };
  } else {
    cachedCircles.unshift(circleData);
  }
  renderCirclesGrid(cachedCircles);
  if (typeof window.saveCircleToFirebase === 'function') {
    await window.saveCircleToFirebase(circleData);
  }
  showNotice(isEdit ? "تم تحديث بيانات الحلقة القرآنية بنجاح ✓" : "تمت إضافة الحلقة القرآنية بنجاح ✓", true);
}

async function confirmDeleteCurrentCircle() {
  const rawCircleId = document.getElementById("circleIdInput").value;
  const circleName = document.getElementById("circleName").value;
  if (!rawCircleId) return;

  if (!confirm(`هل أنت متأكد من رغبتك في حذف حلقة "${circleName}" بالكامل؟\n\nتنبيه: سيتم حذف جميع بيانات وسجلات طلاب هذه الحلقة نهائياً ولا يمكن التراجع.`)) {
    return;
  }

  const circleId = normalizeCircleId(rawCircleId);

  closeModal("circleModal");
  closeModal("createCircleModal");
  if (String(normalizeCircleId(activeCircleId)) === String(circleId)) {
    closeCircleRoster();
  }

  if (window.CirclesService && typeof window.CirclesService.deleteCircle === 'function') {
    await window.CirclesService.deleteCircle(circleId);
    cachedCircles = window.CirclesService.getCachedCircles();
    renderCirclesGrid(cachedCircles);
    showNotice(`تم حذف حلقة "${circleName}" بنجاح ✓`, true);
    return;
  }

  cachedCircles = (cachedCircles || []).filter(c => String(normalizeCircleId(c.id)) !== String(circleId));
  renderCirclesGrid(cachedCircles);
  if (typeof window.deleteCircleFromFirebase === 'function') {
    await window.deleteCircleFromFirebase(circleId);
  }
  showNotice(`تم حذف حلقة "${circleName}" بنجاح ✓`, true);
}

// Fallback alias for older references
async function saveNewCircle(e) {
  return saveCircleForm(e);
}

function openQuickAddStudentModal() {
  if (activeCircleId === null || activeCircleId === undefined) {
    if (window.AlbayanDialog) {
      AlbayanDialog.alert("الرجاء اختيار حلقة قرآنية أولاً.", "تنبيه");
    } else {
      alert("الرجاء اختيار حلقة قرآنية أولاً.");
    }
    return;
  }
  const modal = document.getElementById("quickAddStudentModal");
  if (modal) modal.style.setProperty("display", "flex", "important");
  const input = document.getElementById("quickStudentName");
  if (input) {
    input.value = "";
    setTimeout(() => {
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }, 120);
  }
}

window.openCreateCircleModal = openCreateCircleModal;
window.openEditCircleModal = openEditCircleModal;
window.saveCircleForm = saveCircleForm;
window.confirmDeleteCurrentCircle = confirmDeleteCurrentCircle;
window.openQuickAddStudentModal = openQuickAddStudentModal;

async function pasteToInput(inputId) {
  // Deprecated paste button removed
}
window.pasteToInput = pasteToInput;

async function saveQuickStudent(e) {
  e.preventDefault();
  if (activeCircleId === null || activeCircleId === undefined) return;

  const nameInput = document.getElementById("quickStudentName");
  const name = nameInput ? nameInput.value.trim() : "";
  if (!name) return;

  closeModal("quickAddStudentModal");

  const targetCid = normalizeCircleId(activeCircleId);
  const p = getPeriodFilterPayload();

  if (window.RosterService && typeof window.RosterService.addStudent === 'function') {
    const res = await window.RosterService.addStudent(targetCid, name, p);
    if (res && res.student) {
      cachedStudents = window.AlbayanStateStore
        ? (window.AlbayanStateStore.getRoster(targetCid, p) || cachedStudents)
        : cachedStudents;
      renderStudentsRows(cachedStudents);
      if (typeof loadCircles === "function") loadCircles();
      if (res.synced) {
        showNotice("تم إضافة الطالب وحفظه سحابياً بنجاح! ☁️✨", true);
      } else {
        showNotice("تم حفظ الطالب محلياً وسيتم رفعه للسحابة تلقائياً! ✨", true);
      }
      return;
    }
  }

  // Fallback if RosterService is not loaded
  const tempId = Date.now();
  const newStudent = {
    id: tempId,
    circle_id: targetCid,
    name: name,
    month: p.month,
    year: p.year,
    period_type: p.period_type,
    record_date: p.record_date
  };
  cachedStudents.push(newStudent);
  renderStudentsRows(cachedStudents);
  if (typeof window.saveStudentToFirebase === "function") {
    await window.saveStudentToFirebase(newStudent, p);
  }
  showNotice("تم إضافة الطالب بنجاح! ✨", true);
}

/* Smart Fixed Popover Positioning with Auto Scroll & Mobile Centering */

function attachPopoverSwipeToClose(popover) {
  if (!popover || popover._swipeAttached) return;
  popover._swipeAttached = true;

  let startX = 0;
  let startY = 0;
  let currentDx = 0;
  let currentDy = 0;
  let isTracking = false;
  let startedInScrollList = false;

  popover.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentDx = 0;
    currentDy = 0;
    isTracking = true;
    const scrollEl = e.target.closest ? e.target.closest(".quran-surah-scroll-list, .wheel-col") : null;
    startedInScrollList = Boolean(scrollEl && scrollEl.scrollTop > 2);
  }, { passive: true });

  popover.addEventListener("touchmove", (e) => {
    if (!isTracking || !e.touches || e.touches.length !== 1) return;
    currentDx = e.touches[0].clientX - startX;
    currentDy = e.touches[0].clientY - startY;
  }, { passive: true });

  const finishSwipe = () => {
    if (!isTracking) return;
    isTracking = false;
    const isHorizontalDismiss = Math.abs(currentDx) > 85 && Math.abs(currentDx) > Math.abs(currentDy) * 1.4;
    const isDownDismiss = !startedInScrollList && currentDy > 80 && currentDy > Math.abs(currentDx) * 1.2;
    if (isHorizontalDismiss || isDownDismiss) {
      hidePopover();
    }
  };

  popover.addEventListener("touchend", finishSwipe, { passive: true });
  popover.addEventListener("touchcancel", finishSwipe, { passive: true });
}

/* =========================================================================
   POPOVER ZOOM CONTROLLER & ZERO-SHADOW ACTION BUTTONS
   ========================================================================= */
let _currentPopoverScale = 1.0;

function zoomPopover(delta) {
  const popover = document.getElementById("cellPopover");
  if (!popover || popover.style.display === "none") return;
  _currentPopoverScale = Math.min(1.5, Math.max(0.55, Math.round((_currentPopoverScale + delta) * 100) / 100));
  applyPopoverScale();
}
window.zoomPopover = zoomPopover;

function applyPopoverScale() {
  const popover = document.getElementById("cellPopover");
  if (!popover) return;
  popover.style.transformOrigin = "top center";
  const isQuranPicker = popover.innerHTML.includes("quran-picker-card");
  if (isQuranPicker) {
    const isMob = window.innerWidth <= 768;
    if (isMob) {
      popover.style.transform = `translateX(-50%) scale(${_currentPopoverScale})`;
    } else {
      popover.style.transform = `translate(-50%, -50%) scale(${_currentPopoverScale})`;
    }
  } else {
    popover.style.transform = _currentPopoverScale === 1.0 ? "none" : `scale(${_currentPopoverScale})`;
  }
}
window.applyPopoverScale = applyPopoverScale;

function renderPopoverHeaderHTML(title) {
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line, #e2e8f0); padding-bottom:8px; margin-bottom:8px; gap:8px;">
      <span style="font-size:14px; font-weight:800; color:var(--text, #0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</span>
      <div style="display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">
        <button type="button" class="popover-action-btn" onclick="zoomPopover(-0.15)" onpointerdown="event.stopPropagation(); zoomPopover(-0.15);" ontouchstart="event.stopPropagation(); zoomPopover(-0.15);" title="تبعيد" aria-label="تبعيد">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <button type="button" class="popover-action-btn" onclick="zoomPopover(0.15)" onpointerdown="event.stopPropagation(); zoomPopover(0.15);" ontouchstart="event.stopPropagation(); zoomPopover(0.15);" title="تقريب" aria-label="تقريب">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <button type="button" class="popover-action-btn popover-close-btn" onclick="hidePopover()" onpointerdown="event.stopPropagation(); hidePopover();" ontouchstart="event.stopPropagation(); hidePopover();" title="إغلاق" aria-label="إغلاق">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  `;
}
window.renderPopoverHeaderHTML = renderPopoverHeaderHTML;

function showPopoverAtElement(targetElement, contentHtml) {
  _currentPopoverScale = 1.0;
  let popover = document.getElementById("cellPopover");
  if (!popover) {
    popover = document.createElement("div");
    popover.id = "cellPopover";
    popover.className = "popover-dropdown";
    document.body.appendChild(popover);
  }
  popover.innerHTML = contentHtml;
  popover.style.opacity = "1";
  attachPopoverSwipeToClose(popover);

  if (typeof window.albayanPushModalState === "function") {
    window.albayanPushModalState();
  }

  // Ensure Backdrop Overlay exists
  let backdrop = document.getElementById("cellPopoverBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "cellPopoverBackdrop";
    backdrop.className = "modal-overlay";
    backdrop.style.display = "none";
    backdrop.style.zIndex = "99999";
    backdrop.onclick = () => hidePopover();
    document.body.appendChild(backdrop);
  }

  const isQuranPicker = contentHtml.includes("quran-picker-card");
  const isMobile = window.innerWidth <= 768;

  if (isQuranPicker) {
    backdrop.style.display = "flex";
    popover.style.position = "fixed";
    if (isMobile) {
      popover.style.top = "8px";
      popover.style.left = "50%";
      popover.style.bottom = "auto";
      popover.style.right = "auto";
      popover.style.transform = "translateX(-50%)";
      popover.style.width = "95vw";
      popover.style.height = "auto";
      const availH = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 16;
      popover.style.maxHeight = `${Math.max(260, availH)}px`;
    } else {
      popover.style.top = "50%";
      popover.style.left = "50%";
      popover.style.bottom = "auto";
      popover.style.right = "auto";
      popover.style.transform = "translate(-50%, -50%)";
      popover.style.width = "min(540px, 94vw)";
      popover.style.height = "auto";
      popover.style.maxHeight = "min(560px, 86vh)";
    }
    popover.style.borderRadius = "20px";
    popover.style.zIndex = "100000";
    popover.style.boxShadow = "none";
    popover.style.setProperty("display", "flex", "important");
    popover.style.flexDirection = "column";
    popover.style.overflow = "hidden";

    // software keyboard dynamic resize listener for mobile
    if (window.visualViewport) {
      if (window._quranVisualResize) {
        window.visualViewport.removeEventListener("resize", window._quranVisualResize);
        window.visualViewport.removeEventListener("scroll", window._quranVisualResize);
      }
      window._quranVisualResize = () => {
        if (popover && popover.style.display !== "none" && popover.innerHTML.includes("quran-picker-card")) {
          const avail = window.visualViewport.height - 16;
          popover.style.maxHeight = `${Math.max(240, avail)}px`;
          if (window.innerWidth <= 768) {
            popover.style.top = "8px";
            popover.style.transform = "translateX(-50%)";
          }
        }
      };
      window.visualViewport.addEventListener("resize", window._quranVisualResize);
      window.visualViewport.addEventListener("scroll", window._quranVisualResize);
    }
  } else {
    // Do NOT show blurred backdrop on numeric inputs or dropdowns!
    backdrop.style.setProperty("display", "none", "important");
    popover.style.setProperty("display", "block", "important");
    popover.style.transform = "none";
    popover.style.width = "";
    popover.style.height = "";
    popover.style.maxHeight = "";
    popover.style.boxShadow = "none";

    const rect = targetElement ? targetElement.getBoundingClientRect() : { bottom: window.innerHeight / 2, left: Math.max(10, (window.innerWidth - 260) / 2), top: window.innerHeight / 2 };
    const popoverHeight = popover.offsetHeight || 220;
    const popoverWidth = popover.offsetWidth || 240;

    const vv = window.visualViewport;
    const vTop = vv ? (vv.offsetTop || 0) : 0;
    const vHeight = vv ? vv.height : window.innerHeight;
    const vBottom = vTop + vHeight;

    let top = rect.bottom + 6;
    let left = Math.max(10, rect.left);

    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popoverWidth - 10);
    }

    if (top + popoverHeight > vBottom - 10) {
      top = Math.max(vTop + 10, Math.min(rect.top - popoverHeight - 6, vBottom - popoverHeight - 10));
    }

    popover.style.position = "fixed";
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.bottom = "auto";
    popover.style.right = "auto";
    popover.style.zIndex = "100000";

    // When mobile keyboard slides up, raise the input box ONLY so its bottom sits right above the keyboard
    if (window.visualViewport) {
      if (window._quranVisualResize) {
        window.visualViewport.removeEventListener("resize", window._quranVisualResize);
        window.visualViewport.removeEventListener("scroll", window._quranVisualResize);
      }
      window._quranVisualResize = () => {
        if (popover && popover.style.display !== "none" && !popover.innerHTML.includes("quran-picker-card")) {
          const curVv = window.visualViewport;
          const curTop = curVv.offsetTop || 0;
          const curBottom = curTop + curVv.height;
          const pHeight = popover.offsetHeight || 200;
          const currentPopoverTop = parseFloat(popover.style.top) || top;
          if (currentPopoverTop + pHeight > curBottom - 8) {
            popover.style.top = `${Math.max(curTop + 8, curBottom - pHeight - 8)}px`;
          }
        }
      };
      window.visualViewport.addEventListener("resize", window._quranVisualResize);
      window.visualViewport.addEventListener("scroll", window._quranVisualResize);
    }
  }

  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e) {}
  }

  // Auto-focus input & attach Enter/Esc handlers
  setTimeout(() => {
    const isMob = window.innerWidth <= 768;
    const inp = popover.querySelector("input[type='number'], input[type='text'], input[type='search']");
    if (inp) {
      if (!(isMob && isQuranPicker && inp.id === "quranSurahSearchInput")) {
        inp.focus();
      }
      // DO NOT call select() on mobile or search inputs! It breaks mobile Arabic keyboard backspace/deletion.
      if (!isMob && inp.type === "number") {
        try { inp.select(); } catch(e) {}
      } else {
        const len = inp.value ? inp.value.length : 0;
        try { inp.setSelectionRange(len, len); } catch(e) {}
      }
      inp.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const btn = popover.querySelector("button.btn-primary");
          if (btn) btn.click();
        } else if (e.key === "Escape") {
          e.preventDefault();
          hidePopover();
        }
      };
    }
  }, 40);
}

function hidePopover(fromPopState = false) {
  _currentPopoverScale = 1.0;
  if (window.visualViewport && window._quranVisualResize) {
    window.visualViewport.removeEventListener("resize", window._quranVisualResize);
    window.visualViewport.removeEventListener("scroll", window._quranVisualResize);
    window._quranVisualResize = null;
  }
  const popover = document.getElementById("cellPopover");
  if (popover) {
    const activeInput = popover.querySelector("input, select, textarea");
    if (activeInput && typeof activeInput.blur === "function") {
      try { activeInput.blur(); } catch (e) {}
    }
    popover.innerHTML = "";
    popover.style.setProperty("display", "none", "important");
    popover.classList.remove("floating-month-picker");
    popover.style.transform = "none";
    popover.style.opacity = "1";
    popover.style.width = "";
    popover.style.height = "";
    popover.style.maxHeight = "";
    popover.style.padding = "";
  }
  const backdrop = document.getElementById("cellPopoverBackdrop");
  if (backdrop) {
    backdrop.style.setProperty("display", "none", "important");
  }
  if (!fromPopState && window._albayanOverlayHistoryPushed) {
    window._albayanOverlayHistoryPushed = false;
    try {
      if (window.history && window.history.state && window.history.state.albayanOverlayOpen) {
        window.history.back();
      }
    } catch (e) {}
  }
}
window.hidePopover = hidePopover;

/* 1. Inline Grade Dropdown */

function openInlineGradeDropdown(event, studentId, targetType, currentGrade) {
  event.stopPropagation();
  const grades = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];

  const content = `
    <div class="popover-menu-list">
      <div style="font-size:12px; font-weight:800; color:var(--muted); margin-bottom:4px;">
        اختر ${targetType === 'memo' ? 'تقدير الحفظ' : 'تقدير المراجعة'}:
      </div>
      ${grades.map(g => `
        <div class="popover-menu-item ${g === currentGrade ? 'active-item' : ''}" onclick="selectGradeValue(${studentId}, '${targetType}', '${g}')">
          ${g}
        </div>
      `).join("")}
    </div>
  `;

  showPopoverAtElement(event.currentTarget, content);
}

async function selectGradeValue(studentId, targetType, gradeValue) {
  hidePopover();
  const field = targetType === "memo" ? "memo_grade" : "rev_grade";
  await updateStudentRecord(studentId, { [field]: gradeValue });
}

/* 2. Inline Surah & Ayah Dropdown */

let quranPickerState = {
  studentId: null,
  targetType: 'memo',
  activeTab: 'from', // 'from' | 'to'
  fromSurah: 'الفاتحة',
  fromAyah: 1,
  toSurah: 'الفاتحة',
  toAyah: 1,
  fromView: 'surah', // 'surah' | 'ayah'
  toView: 'surah'    // 'surah' | 'ayah'
};

function getQuranSurahPosition(surahName) {
  if (!surahName || !Array.isArray(quranSurahs)) return 1;
  const clean = String(surahName).trim();
  const found = quranSurahs.find(s => s.name === clean);
  return found ? (Number(found.id) || 1) : 1;
}

function isAyahBeforeStart(surahName, ayahNum) {
  const fromPos = getQuranSurahPosition(quranPickerState.fromSurah);
  const toPos = getQuranSurahPosition(surahName);
  if (toPos < fromPos) return true;
  if (toPos === fromPos && Number(ayahNum) < Number(quranPickerState.fromAyah || 1)) return true;
  return false;
}

function openInlineSurahAyahDropdown(event, studentId, targetType, fromSurah, fromAyah, toSurah, toAyah) {
  event.stopPropagation();

  const hasValidFrom = Boolean(fromSurah && fromSurah !== 'null' && fromSurah !== 'undefined');
  const validFromSurah = hasValidFrom ? fromSurah : "الفاتحة";
  const validToSurah = (toSurah && toSurah !== 'null' && toSurah !== 'undefined') ? toSurah : validFromSurah;
  const parsedFromAyah = parseInt(fromAyah, 10) || 1;
  const parsedToAyah = parseInt(toAyah, 10) || parsedFromAyah;

  quranPickerState = {
    studentId: studentId,
    targetType: targetType,
    activeTab: 'from',
    fromSurah: validFromSurah,
    fromAyah: parsedFromAyah,
    toSurah: validToSurah,
    toAyah: parsedToAyah,
    fromView: 'surah',
    toView: 'surah',
    hasExistingPassage: hasValidFrom
  };

  renderQuranSurahPicker(event.currentTarget);
}

// Arabic text normalizer for fast, accurate Quran Surah search
function normalizeArabicText(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel/harakat
    .replace(/[أإآٱ]/g, "ا") // normalize alifs
    .replace(/ة/g, "ه") // taa marbouta to haa
    .replace(/ى/g, "ي") // alif maqsoora to yaa
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)) // Arabic-Indic digits (٠-٩) to standard (0-9)
    .replace(/ـ/g, "") // remove tatweel
    .trim()
    .toLowerCase();
}
window.normalizeArabicText = normalizeArabicText;

function clearQuranSearch() {
  const inp = document.getElementById("quranSurahSearchInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  const clearBtn = document.getElementById("clearQuranSearchBtn");
  if (clearBtn) clearBtn.style.display = "none";
  filterSurahList("");
}
window.clearQuranSearch = clearQuranSearch;

async function clearQuranPassage() {
  const { studentId, targetType } = quranPickerState;
  hidePopover();
  if (targetType === "memo") {
    await updateStudentRecord(studentId, {
      from_surah: "",
      from_ayah: 0,
      to_surah: "",
      to_ayah: 0,
      memo_pages: 0
    });
  } else {
    await updateStudentRecord(studentId, {
      rev_from_surah: "",
      rev_from_ayah: 0,
      rev_to_surah: "",
      rev_to_ayah: 0
    });
  }
}
window.clearQuranPassage = clearQuranPassage;

function renderQuranSurahPicker(targetElement = null) {
  const activeTab = quranPickerState.activeTab;
  const currentSurah = activeTab === 'from' ? quranPickerState.fromSurah : quranPickerState.toSurah;
  const currentAyah = activeTab === 'from' ? quranPickerState.fromAyah : quranPickerState.toAyah;
  const currentView = activeTab === 'from' ? quranPickerState.fromView : quranPickerState.toView;

  let viewContent = '';

  if (currentView === 'surah') {
    viewContent = `
      <div class="quran-search-box" style="position:relative; display:flex; align-items:center; padding:10px 14px 6px; background:#f8fafc; border-bottom:1px solid #e2e8f0; flex-shrink:0;">
        <input type="search" id="quranSurahSearchInput" class="quran-search-input" 
               placeholder="ابحث عن اسم السورة أو رقمها..." 
               oninput="filterSurahList(this.value)" 
               onkeyup="filterSurahList(this.value)"
               autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
               style="padding-left:36px; -webkit-appearance:none; font-size:13.5px;">
        <button type="button" id="clearQuranSearchBtn" onclick="clearQuranSearch()" aria-label="مسح البحث"
                style="display:none; position:absolute; left:22px; top:50%; transform:translateY(-50%); background:rgba(100,116,139,0.18); border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; align-items:center; justify-content:center; padding:0; color:#475569;">
          <i data-lucide="x" style="width:13px; height:13px;"></i>
        </button>
      </div>
      <div class="quran-surah-scroll-list" id="quranSurahsListContainer">
        ${renderSurahListItems(currentSurah)}
      </div>
    `;
  } else {
    // Ayah selection list
    const surahObj = (quranSurahs || []).find(s => s.name === currentSurah);
    const totalAyahs = surahObj ? (surahObj.ayahs || surahObj.ayah_count || 7) : 7;

    viewContent = `
      <div class="quran-surah-scroll-list" id="quranAyahsListContainer">
        ${Array.from({length: totalAyahs}, (_, i) => i + 1)
          .map(num => `
          <div class="quran-surah-item ${num === currentAyah ? 'selected' : ''}" onclick="selectPickerAyah(${num})">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="quran-surah-badge">${num}</span>
              <strong class="quran-surah-title">الآية ${num}</strong>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  const clearPassageFooter = quranPickerState.hasExistingPassage ? `
    <div style="padding:8px 14px; border-top:1px solid #e2e8f0; background:#f8fafc; display:flex; justify-content:flex-end; flex-shrink:0;">
      <button type="button" onclick="clearQuranPassage()" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; padding:5px 12px; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
        <i data-lucide="trash-2" style="width:13px; height:13px;"></i> محو المقطع
      </button>
    </div>
  ` : '';

  const content = `
    <div class="quran-picker-card" onclick="event.stopPropagation()">
      <div class="quran-tabs-bar">
        <button type="button" class="quran-tab-btn ${activeTab === 'from' ? 'active' : ''}" onclick="switchQuranPickerTab('from')">
          <i data-lucide="map-pin" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-left:4px;"></i> من: ${quranPickerState.fromSurah} (${quranPickerState.fromAyah})
        </button>
        <button type="button" class="quran-tab-btn ${activeTab === 'to' ? 'active' : ''}" onclick="switchQuranPickerTab('to')">
          <i data-lucide="flag" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-left:4px;"></i> إلى: ${quranPickerState.toSurah} (${quranPickerState.toAyah})
        </button>
      </div>
      ${viewContent}
      ${clearPassageFooter}
    </div>
  `;

  if (targetElement) {
    showPopoverAtElement(targetElement, content);
  } else {
    const popover = document.getElementById("cellPopover");
    if (popover) popover.innerHTML = content;
  }

  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 10);
  }
}

function renderSurahListItems(selectedSurahName) {
  if (!quranSurahs || quranSurahs.length === 0) {
    return `<div style="text-align:center; padding:20px; color:#94a3b8;">جاري تحميل أسماء السور...</div>`;
  }

  return quranSurahs.map(s => `
    <div class="quran-surah-item ${s.name === selectedSurahName ? 'selected' : ''}" onclick="selectPickerSurah('${escapeHtml(s.name)}')">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="quran-surah-badge">${s.id}</span>
        <strong class="quran-surah-title">سورة ${s.name}</strong>
      </div>
      <span class="quran-surah-count">${s.ayahs || s.ayah_count || 0} آية</span>
    </div>
  `).join("");
}

function filterSurahList(query) {
  const container = document.getElementById("quranSurahsListContainer");
  if (!container) return;

  const currentSurah = quranPickerState.activeTab === 'from' ? quranPickerState.fromSurah : quranPickerState.toSurah;
  const rawQ = (query || "").trim();
  const cleanQ = normalizeArabicText(rawQ).replace(/^سوره\s*/, "").replace(/^سورة\s*/, "");

  const clearBtn = document.getElementById("clearQuranSearchBtn");
  if (clearBtn) {
    clearBtn.style.display = rawQ ? "flex" : "none";
  }

  if (!cleanQ) {
    container.innerHTML = renderSurahListItems(currentSurah);
    return;
  }

  const cleanQNoAl = cleanQ.replace(/^ال/, "");

  const filtered = (quranSurahs || []).filter(s => {
    const sIdStr = String(s.id);
    const normName = normalizeArabicText(s.name);
    const normNameNoAl = normName.replace(/^ال/, "");
    return sIdStr === cleanQ ||
           normName.includes(cleanQ) ||
           normNameNoAl.includes(cleanQ) ||
           (cleanQNoAl && normNameNoAl.includes(cleanQNoAl));
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:24px 16px; font-size:13.5px; font-weight:700; color:var(--muted, #64748b);">لم يتم العثور على سورة بهذا الاسم</div>`;
    return;
  }

  container.innerHTML = filtered.map(s => `
    <div class="quran-surah-item ${s.name === currentSurah ? 'selected' : ''}" onclick="selectPickerSurah('${escapeHtml(s.name)}')">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="quran-surah-badge">${s.id}</span>
        <strong class="quran-surah-title">سورة ${s.name}</strong>
      </div>
      <span class="quran-surah-count">${s.ayahs || s.ayah_count || 0} آية</span>
    </div>
  `).join("");
}

function switchQuranPickerTab(tab) {
  quranPickerState.activeTab = tab;
  if (tab === 'from') {
    quranPickerState.fromView = 'surah';
  } else {
    quranPickerState.toView = 'surah';
  }
  renderQuranSurahPicker();
}

function switchPickerView(view) {
  if (quranPickerState.activeTab === 'from') {
    quranPickerState.fromView = view;
  } else {
    quranPickerState.toView = view;
  }
  renderQuranSurahPicker();
}

function selectPickerSurah(surahName) {
  if (quranPickerState.activeTab === 'from') {
    quranPickerState.fromSurah = surahName;
    quranPickerState.fromAyah = 1;
    quranPickerState.fromView = 'ayah';
    quranPickerState.toSurah = surahName;
    quranPickerState.toAyah = 1;
    quranPickerState.toView = 'surah';
  } else {
    quranPickerState.toSurah = surahName;
    quranPickerState.toAyah = (surahName === quranPickerState.fromSurah) ? Math.max(1, quranPickerState.fromAyah) : 1;
    quranPickerState.toView = 'ayah';
  }
  renderQuranSurahPicker();
}

function selectPickerAyah(ayahNum) {
  const cleanAyah = parseInt(ayahNum, 10) || 1;
  if (quranPickerState.activeTab === 'from') {
    // 1. Set start in "من"
    quranPickerState.fromAyah = cleanAyah;
    // 2. Automatically advance to "إلى" showing the Surah list first
    quranPickerState.activeTab = 'to';
    if (getQuranSurahPosition(quranPickerState.toSurah) < getQuranSurahPosition(quranPickerState.fromSurah)) {
      quranPickerState.toSurah = quranPickerState.fromSurah;
      quranPickerState.toAyah = cleanAyah;
    } else if (quranPickerState.toSurah === quranPickerState.fromSurah && quranPickerState.toAyah < cleanAyah) {
      quranPickerState.toAyah = cleanAyah;
    }
    quranPickerState.toView = 'surah';
    renderQuranSurahPicker();
  } else {
    quranPickerState.toAyah = cleanAyah;
    // 3. Finalize & close automatically
    return saveQuranPickerSurahAyah();
  }
}

async function saveQuranPickerSurahAyah() {
  let { studentId, targetType, fromSurah, fromAyah, toSurah, toAyah } = quranPickerState;

  const fromPos = getQuranSurahPosition(fromSurah);
  const toPos = getQuranSurahPosition(toSurah);
  if (toPos < fromPos) {
    [fromSurah, toSurah] = [toSurah, fromSurah];
    [fromAyah, toAyah] = [toAyah, fromAyah];
  } else if (toPos === fromPos && Number(toAyah) < Number(fromAyah)) {
    [fromAyah, toAyah] = [toAyah, fromAyah];
  }

  hidePopover();

  const payload = {};
  if (targetType === "memo") {
    payload.from_surah = fromSurah;
    payload.from_ayah = fromAyah;
    payload.to_surah = toSurah;
    payload.to_ayah = toAyah;
    const calcFn = (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.calcQuranPages === "function")
      ? window.AlbayanDataNormalizer.calcQuranPages
      : (typeof calcClientQuranPages === "function" ? calcClientQuranPages : null);
    if (calcFn) {
      payload.memo_pages = calcFn(fromSurah, fromAyah, toSurah, toAyah);
    }
  } else {
    payload.rev_from_surah = fromSurah;
    payload.rev_from_ayah = fromAyah;
    payload.rev_to_surah = toSurah;
    payload.rev_to_ayah = toAyah;
  }

  await updateStudentRecord(studentId, payload);
}

/* 3. Inline Student Exam Results Dropdown */

async function openInlineExamResultsDropdown(event, studentId, studentName) {
  event.stopPropagation();
  const targetElement = event.currentTarget;

  showPopoverAtElement(targetElement, `<div style="padding:10px; font-size:12px; text-align:center;">جارٍ جلب الاختبارات...</div>`);

  try {
    const [examsRes, resultsRes] = await Promise.all([
      getExamsResiliently(),
      fetch(`/api/students/${studentId}/exam_results`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    let optionsHtml = `<option value="">-- اختر اختباراً من القائمة --</option>`;
    
    if (examsRes && examsRes.length > 0) {
      optionsHtml += `<optgroup label="📋 جميع اختبارات النظام المسجلة">` +
        examsRes.map(e => `<option value="${e.title}" data-score="">${e.title} (${e.duration_minutes} دقيقة)</option>`).join("") +
        `</optgroup>`;
    }

    let resultsHtml = '';
    if (resultsRes && resultsRes.length > 0) {
      resultsHtml = `
        <div style="font-size:11px; font-weight:800; color:var(--primary); margin:8px 0 4px;">نتائج الطالب السابقة:</div>
        <div style="display:flex; flex-direction:column; gap:4px; max-height:120px; overflow-y:auto; margin-bottom:8px;">
          ${resultsRes.map(r => `
            <div class="popover-menu-item" style="font-size:12px; padding:6px 8px; justify-content:space-between;" onclick="selectStudentExamScore(${studentId}, '${r.exam_title || 'اختبار'}: ${r.score} / ${r.total_questions} (${r.percentage}%)')">
              <span>${r.exam_title || 'اختبار'}</span>
              <strong style="color:var(--primary)">${r.score}/${r.total_questions} (${r.percentage}%)</strong>
            </div>
          `).join("")}
        </div>
      `;
    }

    const contentHtml = `
      <div class="popover-form" onclick="event.stopPropagation()" style="min-width:260px;">
        <div style="font-size:12px; font-weight:800; color:var(--text); margin-bottom:6px;">رصد اختبار للطالب (${studentName}):</div>
        
        <select id="popExamTitleSelect" onchange="onPopExamSelectChange(this)" style="width:100%; padding:6px; border-radius:6px; border:1px solid var(--line); font-size:12px; margin-bottom:6px; background:var(--card); color:var(--text);">
          ${optionsHtml}
        </select>

        <div style="display:flex; gap:6px; margin-bottom:6px;">
          <input type="text" id="popExamTitleCustom" placeholder="اسم الاختبار" style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--line); font-size:12px;">
          <input type="text" id="popExamScoreInput" placeholder="الدرجة (مثال: 95%)" style="width:110px; padding:6px; border-radius:6px; border:1px solid var(--line); font-size:12px;">
        </div>

        <div style="display:flex; gap:6px; margin-bottom:6px;">
          <button type="button" class="btn-primary" style="flex:1; padding:6px; font-size:12px;" onclick="saveSelectedExamResult(${studentId})">حفظ العلامة</button>
          <button type="button" class="btn-secondary" style="padding:6px; font-size:12px;" onclick="selectStudentExamScore(${studentId}, 'لم يختبر بعد')">لم يختبر</button>
        </div>

        ${resultsHtml}
      </div>
    `;

    showPopoverAtElement(targetElement, contentHtml);

  } catch (err) {
    showPopoverAtElement(targetElement, `<div style="padding:10px; font-size:12px; color:var(--danger);">تعذر جلب بيانات الاختبار.</div>`);
  }
}

function onPopExamSelectChange(selectElem) {
  const customInput = document.getElementById("popExamTitleCustom");
  if (customInput) {
    customInput.value = selectElem.value;
  }
}

async function saveSelectedExamResult(studentId) {
  const examTitle = (document.getElementById("popExamTitleCustom")?.value || "").trim();
  const examScore = (document.getElementById("popExamScoreInput")?.value || "").trim();

  let finalGradeText = "لم يختبر بعد";
  if (examScore) {
    finalGradeText = examTitle ? `${examTitle}: ${examScore}` : examScore;
  } else if (examTitle) {
    finalGradeText = examTitle;
  }

  await selectStudentExamScore(studentId, finalGradeText);
}

async function selectStudentExamScore(studentId, scoreText) {
  hidePopover();
  await updateStudentRecord(studentId, { exam_grade: scoreText });
}

window.openInlineExamResultsDropdown = openInlineExamResultsDropdown;
window.onPopExamSelectChange = onPopExamSelectChange;
window.saveSelectedExamResult = saveSelectedExamResult;

async function getExamsResiliently() {
  // 1. Local server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("/api/exams", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}

  // 2. Firebase client helper
  if (typeof window.pullExamsFromFirebase === 'function') {
    try {
      const fbExams = await window.pullExamsFromFirebase();
      if (Array.isArray(fbExams) && fbExams.length > 0) return fbExams;
    } catch (e) {}
  }

  // 3. Local IndexedDB
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalExams === 'function') {
    try {
      const localEx = await window.AlbayanLocalDB.getLocalExams();
      if (Array.isArray(localEx) && localEx.length > 0) return localEx;
    } catch (e) {}
  }

  // 5. LocalStorage
  try {
    const cached = localStorage.getItem("cached_exams_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [
    { id: 1, title: "اختبار مادة القران والتربية الإسلامية", duration_minutes: 20, is_active: 1, question_count: 15 },
    { id: 2, title: "اختبار أحكام التجويد ومخارج الحروف", duration_minutes: 15, is_active: 2, question_count: 10 }
  ];
}

async function openBulkExamSelectModal(event) {
  if (event) event.stopPropagation();
  hidePopover();
  if (activeCircleId === null || activeCircleId === undefined) {
    alert("الرجاء اختيار حلقة قرآنية أولاً.");
    return;
  }
  if (!cachedStudents || cachedStudents.length === 0) {
    alert("لا يوجد طلاب في هذه الحلقة ليتم رصد الدرجات لهم.");
    return;
  }

  const select = document.getElementById("modalBulkExamTitleSelect");
  if (select) {
    select.innerHTML = `<option value="">جاري تحميل الاختبارات...</option>`;
  }

  const modal = document.getElementById("bulkExamSelectModal");
  if (modal) {
    modal.style.display = "flex";
  }

  try {
    const examsRes = await getExamsResiliently();

    let optionsHtml = `<option value="">-- حدد الاختبار --</option>`;
    if (examsRes && examsRes.length > 0) {
      optionsHtml += examsRes.map(e => `<option value="${e.title}">${e.title} (${e.duration_minutes} دقيقة - ${e.question_count || 0} أسئلة)</option>`).join("");
    } else {
      optionsHtml += `<option value="" disabled>لا توجد اختبارات مسجلة في نظام المدرسة بعد</option>`;
    }

    if (select) select.innerHTML = optionsHtml;
  } catch (err) {
    if (select) select.innerHTML = `<option value="" disabled>تعذر جلب الاختبارات</option>`;
  }
}

async function applyBulkExamGrades() {
  const select = document.getElementById("modalBulkExamTitleSelect");
  if (!select || !select.value) {
    alert("الرجاء اختيار اختبار من القائمة أولاً.");
    return;
  }
  const examTitle = select.value;
  closeModal('bulkExamSelectModal');

  const p = getPeriodFilterPayload();

  const tbody = document.getElementById("studentsTableBody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:30px; font-size:15px; font-weight:700; color:var(--primary);"><div class="loading-spinner" style="margin:0 auto 10px;"></div>جارٍ الرصد التلقائي لدرجات (${examTitle}) لجميع طلاب الحلقة...</td></tr>`;
  }

  try {
    const res = await fetch(`/api/circles/${activeCircleId}/apply_exam_grades`, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({
        period_type: p.period_type,
        record_date: p.record_date,
        year: p.year,
        month: p.month,
        exam_title: examTitle
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadStudents();
      setTimeout(() => alert(data.message), 100);
    } else {
      alert(data.message || "حدث خطأ أثناء رصد الدرجات تلقائياً.");
      await loadStudents();
    }
  } catch (err) {
    console.error("Bulk exam assign error:", err);
    alert("حدث خطأ في الاتصال بالخادم أثناء الرصد التلقائي.");
    await loadStudents();
  }
}

window.openBulkExamSelectModal = openBulkExamSelectModal;
window.applyBulkExamGrades = applyBulkExamGrades;

// Bulk Accompanying Subjects Auto-Marking
async function openBulkAccompanyingExamModal(event, subjectKey, subjectName) {
  if (event) event.stopPropagation();
  hidePopover();
  if (activeCircleId === null || activeCircleId === undefined) {
    alert("الرجاء اختيار حلقة قرآنية أولاً.");
    return;
  }
  if (!cachedStudents || cachedStudents.length === 0) {
    alert("لا يوجد طلاب في هذه الحلقة ليتم رصد الدرجات لهم.");
    return;
  }

  const select = document.getElementById("modalBulkAccompanyingExamSelect");
  if (select) {
    select.innerHTML = `<option value="">جاري تحميل الاختبارات...</option>`;
  }

  document.getElementById("modalAccompanyingSubjectName").innerText = subjectName;
  document.getElementById("modalAccompanyingSubjectName2").innerText = subjectName;
  document.getElementById("modalBulkAccompanyingSubjectKey").value = subjectKey;

  const modal = document.getElementById("bulkAccompanyingSelectModal");
  if (modal) {
    modal.style.display = "flex";
  }

  try {
    const examsRes = await getExamsResiliently();

    let optionsHtml = `<option value="">-- حدد الاختبار --</option>`;
    if (examsRes && examsRes.length > 0) {
      optionsHtml += examsRes.map(e => `<option value="${e.title}">${e.title} (${e.duration_minutes} دقيقة - ${e.question_count || 0} أسئلة)</option>`).join("");
    } else {
      optionsHtml += `<option value="" disabled>لا توجد اختبارات مسجلة في نظام المدرسة بعد</option>`;
    }

    if (select) select.innerHTML = optionsHtml;
  } catch (err) {
    if (select) select.innerHTML = `<option value="" disabled>تعذر جلب الاختبارات</option>`;
  }
}

async function applyBulkAccompanyingExamGrades() {
  const select = document.getElementById("modalBulkAccompanyingExamSelect");
  const subjectKey = document.getElementById("modalBulkAccompanyingSubjectKey").value;
  const subjectName = document.getElementById("modalAccompanyingSubjectName").innerText;

  if (!select || !select.value) {
    alert("الرجاء اختيار اختبار من القائمة أولاً.");
    return;
  }
  const examTitle = select.value;
  closeModal('bulkAccompanyingSelectModal');

  const p = getPeriodFilterPayload();

  const tbody = document.getElementById("studentsTableBody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:30px; font-size:15px; font-weight:700; color:var(--primary);"><div class="loading-spinner" style="margin:0 auto 10px;"></div>جارٍ الرصد التلقائي لدرجات (${examTitle}) لقسم ${subjectName}...</td></tr>`;
  }

  try {
    const res = await fetch(`/api/circles/${activeCircleId}/apply_exam_grades`, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({
        period_type: p.period_type,
        record_date: p.record_date,
        year: p.year,
        month: p.month,
        exam_title: examTitle,
        target_subject: subjectKey
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadStudents();
      setTimeout(() => alert(data.message), 100);
    } else {
      alert(data.message || "حدث خطأ أثناء رصد الدرجات تلقائياً.");
      await loadStudents();
    }
  } catch (err) {
    console.error("Bulk exam assign error:", err);
    alert("حدث خطأ في الاتصال بالخادم أثناء الرصد التلقائي.");
    await loadStudents();
  }
}

window.openBulkAccompanyingExamModal = openBulkAccompanyingExamModal;
window.applyBulkAccompanyingExamGrades = applyBulkAccompanyingExamGrades;

/* 4. Inline Absent Days Dropdown */

function openInlineAbsentDropdown(event, studentId, currentDays) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentDays);
  const val = (!isNaN(parsed) && parsed > 0) ? Math.round(parsed) : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("تعديل عدد أيام الغياب")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="numeric" pattern="[0-9]*" dir="ltr" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" id="popAbsentInput" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
        <span style="font-size:16px; font-weight:800; color:var(--muted, #64748b);">أيام</span>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn-primary" style="width:100%; justify-content:center; padding:8px 12px; min-height:38px; height:38px; font-size:14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:none;" onclick="saveInlineAbsent(${studentId})">
          تأكيد <i data-lucide="check" style="width:15px; height:15px;"></i>
        </button>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

async function saveInlineAbsent(studentId) {
  const raw = (document.getElementById("popAbsentInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { absent_days: 0 });
    return;
  }
  const days = Math.round(parseLocalizedNumber(raw));
  if (isNaN(days) || days < 0) {
    showNotice("أدخل عدد أيام غياب صحيحاً غير سالب.");
    return;
  }
  await updateStudentRecord(studentId, { absent_days: days });
}

// Localized Number Normalizer & Stepper Helpers (guarantees number keypad & flawless parsing)
function parseLocalizedNumber(val) {
  if (val === undefined || val === null) return NaN;
  let s = String(val).trim();
  if (!s) return NaN;
  s = s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  s = s.replace(/[\u066B\u060C,]/g, ".");
  const parsed = Number(s);
  return Number.isFinite(parsed) ? parsed : NaN;
}
window.parseLocalizedNumber = parseLocalizedNumber;

function adjustPopoverNumber(inputId, delta, minVal = 0, maxVal = Infinity) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  let cur = parseLocalizedNumber(inp.value);
  if (isNaN(cur)) cur = (delta > 0) ? minVal : maxVal;
  let next = Math.round((cur + delta) * 10) / 10;
  if (next < minVal) next = minVal;
  if (next > maxVal) next = maxVal;
  inp.value = next;
  inp.focus();
}
window.adjustPopoverNumber = adjustPopoverNumber;

function setPopoverNumber(inputId, val) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.value = val;
  inp.focus();
}
window.setPopoverNumber = setPopoverNumber;

/* 5. Inline Revision Mark Dropdown (العلامة من 30) */

function openInlineRevMarkDropdown(event, studentId, currentMark) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("رصد علامة المراجعة (من 30)")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" id="popRevMarkInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
        <span style="font-size:16px; font-weight:800; color:var(--muted, #64748b);">/ 30</span>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn-primary" style="width:100%; justify-content:center; padding:8px 12px; min-height:38px; height:38px; font-size:14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:none;" onclick="saveInlineRevMark(${studentId})">
          تأكيد <i data-lucide="check" style="width:15px; height:15px;"></i>
        </button>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

async function saveInlineRevMark(studentId) {
  const raw = (document.getElementById("popRevMarkInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { rev_grade: "" });
    return;
  }

  const mark = parseLocalizedNumber(raw);
  if (isNaN(mark)) {
    showNotice("الرجاء إدخال علامة رقمية صحيحة للمراجعة.");
    return;
  }

  if (mark < 0 || mark > 30) {
    showNotice("العلامة المدخلة غير صحيحة، يجب أن تكون علامة المراجعة بين 0 و 30.");
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await updateStudentRecord(studentId, { rev_grade: finalMark });
}

window.openInlineRevMarkDropdown = openInlineRevMarkDropdown;
window.saveInlineRevMark = saveInlineRevMark;

/* 5.1 Inline Memorization Mark Dropdown (العلامة من 40) */

function openInlineMemoMarkDropdown(event, studentId, currentMark) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("رصد علامة الحفظ (من 40)")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" id="popMemoMarkInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
        <span style="font-size:16px; font-weight:800; color:var(--muted, #64748b);">/ 40</span>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn-primary" style="width:100%; justify-content:center; padding:8px 12px; min-height:38px; height:38px; font-size:14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:none;" onclick="saveInlineMemoMark(${studentId})">
          تأكيد <i data-lucide="check" style="width:15px; height:15px;"></i>
        </button>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

async function saveInlineMemoMark(studentId) {
  const raw = (document.getElementById("popMemoMarkInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { memo_grade: "" });
    return;
  }

  const mark = parseLocalizedNumber(raw);
  if (isNaN(mark)) {
    showNotice("الرجاء إدخال علامة رقمية صحيحة للحفظ.");
    return;
  }

  if (mark < 0 || mark > 40) {
    showNotice("العلامة المدخلة غير صحيحة، يجب أن تكون علامة الحفظ بين 0 و 40.");
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await updateStudentRecord(studentId, { memo_grade: finalMark });
}

window.openInlineMemoMarkDropdown = openInlineMemoMarkDropdown;
window.saveInlineMemoMark = saveInlineMemoMark;

/* 5.2 Inline Sard Pages Dropdown (أوجه السرد) */

function openInlineSardPagesDropdown(event, studentId, currentPages) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentPages);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("تعديل أوجه السرد")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" id="popSardPagesInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
        <span style="font-size:16px; font-weight:800; color:var(--muted, #64748b);">وجه</span>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn-primary" style="width:100%; justify-content:center; padding:8px 12px; min-height:38px; height:38px; font-size:14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:none;" onclick="saveInlineSardPages(${studentId})">
          تأكيد <i data-lucide="check" style="width:15px; height:15px;"></i>
        </button>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

async function saveInlineSardPages(studentId) {
  const raw = (document.getElementById("popSardPagesInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { sard_pages: 0 });
    return;
  }

  const pages = parseLocalizedNumber(raw);
  if (isNaN(pages) || pages < 0) {
    showNotice("عدد أوجه السرد لا يمكن أن يكون سالباً.");
    return;
  }

  await updateStudentRecord(studentId, { sard_pages: pages });
}

window.openInlineSardPagesDropdown = openInlineSardPagesDropdown;
window.saveInlineSardPages = saveInlineSardPages;

/* 6. Inline Activity Mark Dropdown (العلامة من 20) */

function openInlineActivityMarkDropdown(event, studentId, currentMark) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("رصد علامة النشاط (من 20)")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" id="popActivityInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
        <span style="font-size:16px; font-weight:800; color:var(--muted, #64748b);">/ 20</span>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn-primary" style="width:100%; justify-content:center; padding:8px 12px; min-height:38px; height:38px; font-size:14px; border-radius:10px; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:none;" onclick="saveInlineActivityMark(${studentId})">
          تأكيد <i data-lucide="check" style="width:15px; height:15px;"></i>
        </button>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

async function saveInlineActivityMark(studentId) {
  const raw = (document.getElementById("popActivityInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { activity_mark: "" });
    return;
  }

  const mark = parseLocalizedNumber(raw);
  if (isNaN(mark)) {
    showNotice("الرجاء إدخال علامة رقمية صحيحة للنشاط.");
    return;
  }

  if (mark < 0 || mark > 20) {
    showNotice("العلامة المدخلة غير صحيحة، يجب أن تكون علامة النشاط بين 0 و 20.");
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await updateStudentRecord(studentId, { activity_mark: finalMark });
}

window.openInlineActivityMarkDropdown = openInlineActivityMarkDropdown;
window.saveInlineActivityMark = saveInlineActivityMark;

/* Student History Modal */
async function openStudentHistory(studentId, studentName) {
  document.getElementById("historyStudentNameTitle").textContent = `السجل التراكمي للطالب: ${studentName}`;
  document.getElementById("studentHistoryModal").style.display = "flex";
  
  const tbody = document.getElementById("studentHistoryTableBody");
  tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:var(--muted);">جارٍ جلب السجل...</td></tr>`;
  
  try {
    let records = [];
    if (window.RosterService && typeof window.RosterService.fetchStudentHistory === "function") {
      records = await window.RosterService.fetchStudentHistory(studentId);
    } else {
      const res = await fetch(`/api/students/${studentId}/history`);
      records = await res.json();
    }
    
    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:var(--muted);">لا يوجد سجل تراكمي متاح لهذا الطالب.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = records.map(r => {
      let periodBadge = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#059669; font-size:11px; font-weight:700;">📅 شهري</span>`;
      let periodText = `${r.month} ${r.year}`;

      if (r.period_type === "daily") {
        periodBadge = `<span class="badge" style="background:rgba(245,158,11,0.15); color:#D97706; font-size:11px; font-weight:700;">☀️ يومي</span>`;
        periodText = r.record_date || r.month;
      } else if (r.period_type === "custom") {
        periodBadge = `<span class="badge" style="background:rgba(168,85,247,0.15); color:#9333EA; font-size:11px; font-weight:700;">⏳ مخصص</span>`;
        periodText = `${r.month} ${r.year}`;
      }

      const memoText = r.from_surah ? `من سورة ${r.from_surah} (${r.from_ayah || 1}) إلى ${r.to_surah} (${r.to_ayah || 1})` : "غير محدد";
      const historyMemoPages = (r.from_surah && r.to_surah && (r.to_ayah || 0) > 0) ? calcClientQuranPages(r.from_surah, r.from_ayah, r.to_surah, r.to_ayah) : 0;
      const historyMemoMark = (r.memo_grade !== undefined && r.memo_grade !== null && r.memo_grade !== "" && r.memo_grade !== "غير محدد" && parseFloat(r.memo_grade) > 0) ? parseFloat(r.memo_grade) : null;
      
      const revText = r.rev_from_surah ? `من سورة ${r.rev_from_surah} (${r.rev_from_ayah || 1}) إلى ${r.rev_to_surah} (${r.rev_to_ayah || 1})` : "غير محدد";
      const historySardPages = (r.sard_pages !== undefined && r.sard_pages !== null && parseFloat(r.sard_pages) > 0) ? parseFloat(r.sard_pages) : 0;
      const historyRevMark = (r.rev_grade !== undefined && r.rev_grade !== null && r.rev_grade !== '' && r.rev_grade !== 'غير محدد' && parseFloat(r.rev_grade) > 0) ? parseFloat(r.rev_grade) : null;
      
      const absDays = r.absent_days || 0;
      const attMark = Math.max(0, 30 - (absDays * 0.5));
      const actMark = (r.activity_mark !== undefined && r.activity_mark !== null && parseFloat(r.activity_mark) > 0) ? parseFloat(r.activity_mark) : 0;

      // Accompanying
      const f = (r.fiqh !== undefined && r.fiqh !== null && !isNaN(parseFloat(r.fiqh)) && parseFloat(r.fiqh) > 0) ? parseFloat(r.fiqh) : 0;
      const t = (r.tafsir !== undefined && r.tafsir !== null && !isNaN(parseFloat(r.tafsir)) && parseFloat(r.tafsir) > 0) ? parseFloat(r.tafsir) : 0;
      const a = (r.adhkar !== undefined && r.adhkar !== null && !isNaN(parseFloat(r.adhkar)) && parseFloat(r.adhkar) > 0) ? parseFloat(r.adhkar) : 0;
      const s = (r.seerah !== undefined && r.seerah !== null && !isNaN(parseFloat(r.seerah)) && parseFloat(r.seerah) > 0) ? parseFloat(r.seerah) : 0;

      let histTotal = 0;
      if (historyMemoMark !== null) histTotal += historyMemoMark;
      if (historyRevMark !== null) histTotal += historyRevMark;
      histTotal += attMark;
      if (actMark > 0) histTotal += actMark;
      histTotal += f + t + a + s;
      histTotal = Math.round(histTotal * 10) / 10;
      
      const histPercentage = Math.round((histTotal / 200) * 1000) / 10;
      let histPctStyle = "background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;";
      if (histPercentage >= 90) {
        histPctStyle = "background:rgba(16,185,129,0.12); color:#059669; border:1px solid rgba(16,185,129,0.25);";
      } else if (histPercentage >= 80) {
        histPctStyle = "background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;";
      } else if (histPercentage >= 65) {
        histPctStyle = "background:#fffbeb; color:#b45309; border:1px solid #fde68a;";
      } else if (histPercentage >= 50) {
        histPctStyle = "background:#fff7ed; color:#c2410c; border:1px solid #fed7aa;";
      } else {
        histPctStyle = "background:#fff1f2; color:#e11d48; border:1px solid #fecdd3;";
      }

      return `
        <tr>
          <td><strong style="color:var(--primary)">${periodText}</strong></td>
          <td>${periodBadge}</td>
          <td style="font-size:13px;">${memoText}</td>
          <td style="text-align:center; font-weight:800; color:#475569; font-size:13px; white-space:nowrap;">
            ${historyMemoPages > 0 ? historyMemoPages + ' <span style="font-size:11px; font-weight:normal; color:var(--muted);">وجه</span>' : '-'}
          </td>
          <td><strong>${historyMemoMark !== null ? historyMemoMark + ' / 40' : '-'}</strong></td>
          <td style="font-size:13px;">${revText}</td>
          <td style="text-align:center; font-weight:800; color:#475569; font-size:13px; white-space:nowrap;">
            ${historySardPages > 0 ? historySardPages + ' <span style="font-size:11px; font-weight:normal; color:var(--muted);">وجه</span>' : '-'}
          </td>
          <td><strong>${historyRevMark !== null ? historyRevMark + ' / 30' : '-'}</strong></td>
          <td><strong>${absDays} أيام</strong></td>
          <td><strong>${attMark} / 30</strong></td>
          <td><strong style="color:var(--primary);">${actMark > 0 ? actMark + ' / 20' : '-'}</strong></td>
          <td><strong style="color:var(--primary); font-size:13.5px;">${histTotal} / 200</strong></td>
          <td style="text-align:center; white-space:nowrap;">
            <span style="${histPctStyle} font-size:12.5px; font-weight:800; padding:3px 8px; border-radius:6px; display:inline-block;">
              ${histPercentage}%
            </span>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:var(--danger);">تعذر جلب السجل التراكمي.</td></tr>`;
  }
}


async function deleteStudent(studentId, studentName) {
  const name = studentName || "هذا الطالب";
  const ok = window.AlbayanDialog
    ? await AlbayanDialog.confirm(`هل أنت متأكد من رغبتك في حذف الطالب (${name}) من الحلقة؟`, "حذف الطالب", { isDestructive: true })
    : confirm(`هل أنت متأكد من رغبتك في حذف الطالب (${name}) من الحلقة؟`);
  if (!ok) return;
  try {
    deleteStudentRow(studentId);
    if (Array.isArray(cachedStudents)) {
      cachedStudents = cachedStudents.filter(s => String(s.id) !== String(studentId));
    }
    let synced = false;
    if (window.RosterService && typeof window.RosterService.deleteStudent === "function") {
      const res = await window.RosterService.deleteStudent(activeCircleId, studentId);
      synced = !!(res && res.synced);
      if (typeof loadCircles === "function") loadCircles();
      showNotice(synced ? "تم حذف الطالب سحابياً ومحلياً بنجاح." : "تم حذف الطالب بنجاح ✓", true);
      return;
    }
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.deleteLocalStudent === "function") {
      await window.AlbayanLocalDB.deleteLocalStudent(studentId, activeCircleId);
    }
    if (typeof window.triggerInstantSync === "function") window.triggerInstantSync();
    showNotice("تم حذف الطالب محلياً بنجاح.", true);
  } catch (err) {
    console.error("Delete error:", err);
  }
}
window.deleteStudent = deleteStudent;

/* Student Row Selection Controller (Double Click / Double Tap - Exactly 2 Clicks) */
let _circleRowTapState = {};
function handleStudentRowDoubleClick(event, studentId) {
  if (event) {
    if (typeof event.stopPropagation === "function") event.stopPropagation();
  }
  const now = Date.now();
  const state = _circleRowTapState[studentId] || { lastTime: 0 };
  const diff = now - state.lastTime;

  // Exactly 2 clicks/taps within 450ms
  if (diff > 20 && diff < 450) {
    _circleRowTapState[studentId] = { lastTime: 0 };
    toggleStudentRowSelection(event, studentId);
  } else {
    _circleRowTapState[studentId] = { lastTime: now };
  }
}
window.handleStudentRowDoubleClick = handleStudentRowDoubleClick;
window.handleStudentNameTap = handleStudentRowDoubleClick;

function toggleStudentRowSelection(event, studentId) {
  if (event && typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
  const row = document.getElementById(`student-row-${studentId}`) ||
              document.getElementById(`roster-student-row-${studentId}`);
  if (row) {
    row.classList.toggle("student-row-selected");
  }
}
window.toggleStudentRowSelection = toggleStudentRowSelection;

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


/* =========================================================
   CUSTOM DATE & PERIOD PICKERS
   ========================================================= */
window.openPeriodPicker = function(event) {
  if (currentPeriodType === "daily") {
    openDailyDatePicker(event);
  } else if (currentPeriodType === "custom") {
    openCustomPeriodPicker(event);
  } else {
    openDatePicker(event);
  }
};

function openDailyDatePicker(event) {
  event.stopPropagation();
  const content = `
    <div class="quran-picker-card" onclick="event.stopPropagation()" style="width: 100%; border: none; padding: 16px;">
      <div style="font-size:15px; font-weight:800; color:var(--text); text-align:center; margin-bottom: 12px;">
        ☀️ اختيار تاريخ المتابعة اليومية
      </div>
      <div style="margin-bottom: 14px;">
        <label style="font-size:12px; font-weight:700; color:var(--muted); display:block; margin-bottom:6px;">اختر اليوم:</label>
        <input type="date" id="dailyPickerDateInput" value="${currentRecordDate}" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid var(--line); font-size: 14px; font-weight: 700; font-family: inherit; background: var(--card); color: var(--text);">
      </div>
      <div style="display:flex; gap:6px; margin-bottom:14px;">
        <button type="button" class="btn-ghost" style="flex:1; padding:6px; font-size:11px; border:1px solid var(--line); border-radius:6px;" onclick="setQuickDailyDate(0)">اليوم</button>
        <button type="button" class="btn-ghost" style="flex:1; padding:6px; font-size:11px; border:1px solid var(--line); border-radius:6px;" onclick="setQuickDailyDate(-1)">أمس</button>
        <button type="button" class="btn-ghost" style="flex:1; padding:6px; font-size:11px; border:1px solid var(--line); border-radius:6px;" onclick="setQuickDailyDate(-2)">قبل يومين</button>
      </div>
      <button type="button" class="btn-primary" style="width: 100%; padding: 10px; font-size: 14px;" onclick="confirmDailyDatePicker()">تأكيد التاريخ وعرض السجل</button>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

function setQuickDailyDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dateStr = d.toISOString().split("T")[0];
  const input = document.getElementById("dailyPickerDateInput");
  if (input) input.value = dateStr;
}

function confirmDailyDatePicker() {
  const input = document.getElementById("dailyPickerDateInput");
  if (input && input.value) {
    currentRecordDate = input.value;
    updateDailyDateUI();
    hidePopover();
    if (activeCircleId !== null) {
      loadStudents();
    }
  }
}

function openCustomPeriodPicker(event) {
  event.stopPropagation();
  const currentMonthVal = document.getElementById("filterMonth")?.value || `الفصل 1 (${customPeriodMonths} أشهر)`;
  const currentYearVal = document.getElementById("filterYear")?.value || new Date().getFullYear();

  // حساب عدد الفصول في السنة بناء على عدد الأشهر المحددة (السنة = 12 شهر)
  const totalTerms = Math.max(1, Math.floor(12 / (customPeriodMonths || 6)));

  let periodsHtml = "";
  for (let i = 1; i <= totalTerms; i++) {
    const label = `الفصل ${i} (${customPeriodMonths} أشهر)`;
    const isSel = (label === currentMonthVal || currentMonthVal.includes(` ${i} `) || currentMonthVal.startsWith(`الفترة ${i}`));
    periodsHtml += `
      <div class="popover-menu-item ${isSel ? 'active-item' : ''}" onclick="selectCustomPeriod('${label}')" style="padding:10px 14px; cursor:pointer; font-weight:700; font-size:13px;">
        ⏳ ${label}
      </div>
    `;
  }

  // إضافة خيار سجل نهاية السنة الشامل
  const isYearlySelected = (currentMonthVal === "سجل نهاية السنة" || currentMonthVal === "المحصلة السنوية" || currentMonthVal === "نهاية السنة");
  periodsHtml += `
    <div class="popover-menu-item ${isYearlySelected ? 'active-item' : ''}" onclick="selectCustomPeriod('سجل نهاية السنة')" style="padding:11px 14px; cursor:pointer; font-weight:800; font-size:13px; color:#1e40af; background:#eff6ff; border-radius:10px; margin-top:6px; border:1.5px dashed #93c5fd; display:flex; align-items:center; gap:8px;">
      <span>🎓</span>
      <span>سجل نهاية السنة (المحصلة الشاملة)</span>
    </div>
  `;

  const content = `
    <div class="quran-picker-card" onclick="event.stopPropagation()" style="width: 100%; border: none; padding: 16px;">
      <div style="font-size:15px; font-weight:800; color:var(--text); text-align:center; margin-bottom: 12px;">
        ⏳ اختيار الفصل أو سجل نهاية السنة
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; max-height:240px; overflow-y:auto; margin-bottom:12px;">
        ${periodsHtml}
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; padding-top:8px; border-top:1px solid var(--line);">
        <span style="font-size:12px; font-weight:700; color:var(--muted);">السنة:</span>
        <select id="customPeriodYearSelect" style="padding:6px 10px; border-radius:8px; border:1px solid var(--line); font-size:13px; font-weight:700; background:var(--card); color:var(--text);">
          <option value="1448" ${currentYearVal == '1448' ? 'selected' : ''}>1448 هـ</option>
          <option value="1447" ${currentYearVal == '1447' ? 'selected' : ''}>1447 هـ</option>
          <option value="1446" ${currentYearVal == '1446' ? 'selected' : ''}>1446 هـ</option>
          <option value="2026" ${currentYearVal == '2026' ? 'selected' : ''}>2026 م</option>
          <option value="2025" ${currentYearVal == '2025' ? 'selected' : ''}>2025 م</option>
        </select>
      </div>
    </div>
  `;
  showPopoverAtElement(event.currentTarget, content);
}

function selectCustomPeriod(periodLabel) {
  const yearSelect = document.getElementById("customPeriodYearSelect");
  const yearVal = yearSelect ? yearSelect.value : (document.getElementById("filterYear")?.value || "1448");
  
  document.getElementById("filterMonth").value = periodLabel;
  const monthTrigger = document.getElementById("filterMonthTrigger");
  if (monthTrigger) monthTrigger.textContent = periodLabel;

  document.getElementById("filterYear").value = yearVal;
  const yearTrigger = document.getElementById("filterYearTrigger");
  if (yearTrigger) yearTrigger.textContent = `${yearVal} هـ`;

  hidePopover();
  if (activeCircleId !== null) {
    loadStudents();
  }
}

window.openDatePicker = function(event) {
  event.stopPropagation();
  const baseHijriMonths = (window.HijriDate && window.HijriDate.HIJRI_MONTHS) || [
    "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
    "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
  ];
  const hijriMonths = [...baseHijriMonths, "سجل نهاية السنة"];
  const gregorianMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const filterMonthInput = document.getElementById("filterMonth");
  const filterYearInput = document.getElementById("filterYear");
  const currentMonth = filterMonthInput ? filterMonthInput.value : (window.HijriDate ? window.HijriDate.getCurrentHijriMonth() : "صفر");
  const currentYear = filterYearInput ? (parseInt(filterYearInput.value, 10) || (window.HijriDate ? window.HijriDate.getCurrentHijriYear() : 1448)) : 1448;

  // Month list: Hijri months + سجل نهاية السنة
  let monthHtml = `<div class="wheel-spacer"></div><div class="wheel-spacer"></div>`;
  hijriMonths.forEach(m => {
    monthHtml += `<div class="wheel-item" data-val="${m}">${m === "سجل نهاية السنة" ? "🎓 " + m : m}</div>`;
  });
  monthHtml += `<div class="wheel-spacer"></div><div class="wheel-spacer"></div>`;

  // Year list: Hijri years 1440 to 1460 (e.g. 1448 هـ)
  let yearHtml = `<div class="wheel-spacer"></div><div class="wheel-spacer"></div>`;
  for(let y = 1440; y <= 1460; y++) {
    const gregEquiv = y + 578; // Approx mapping
    yearHtml += `<div class="wheel-item" data-val="${y}">${y} هـ</div>`;
  }
  yearHtml += `<div class="wheel-spacer"></div><div class="wheel-spacer"></div>`;

  let content = `
    <style>
      .wheel-picker-container { display: flex; justify-content: space-around; padding: 10px; background: #fff; position: relative; height: 190px; }
      .wheel-col { height: 190px; overflow-y: auto; scroll-snap-type: y mandatory; position: relative; width: 145px; -webkit-overflow-scrolling: touch; }
      .wheel-col::-webkit-scrollbar { display: none; }
      .wheel-item { height: 38px; display: flex; align-items: center; justify-content: center; scroll-snap-align: center; font-size: 15px; font-weight: 700; color: #94a3b8; transition: all 0.2s; white-space: nowrap; }
      .wheel-spacer { height: 38px; scroll-snap-align: none; }
      .wheel-highlight { position: absolute; top: 86px; left: 10px; right: 10px; height: 38px; background: rgba(37,99,235,0.05); border-radius: 10px; border: 1px solid rgba(37,99,235,0.2); pointer-events: none; }
      @media (max-width: 768px) {
        #cellPopover.floating-month-picker {
          top: auto !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          transform: translateY(0) !important;
          width: 100% !important;
          max-width: 100% !important;
          border-radius: 24px 24px 0 0 !important;
          padding: 0 !important;
          animation: slideUpBottomSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
          background: transparent !important;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.2) !important;
          height: auto !important;
          max-height: 95vh !important;
        }
        #cellPopover.floating-month-picker .quran-picker-card {
          height: auto !important;
          max-height: 95vh !important;
          border-radius: 24px 24px 0 0 !important;
        }
        #cellPopover.floating-month-picker::before { display: none !important; }
      }
    </style>
    <div class="quran-picker-card" onclick="event.stopPropagation()" style="width: 100%; border: none;">
      <div style="font-size:16px; font-weight:800; color:var(--text); text-align:center; padding: 20px 0 10px;">
        اختر الشهر أو سجل نهاية السنة
      </div>
      
      <div class="wheel-picker-container">
        <div class="wheel-highlight"></div>
        <div class="wheel-col" id="wheelMonth" onscroll="updateWheelStyle(this)">
          ${monthHtml}
        </div>
        <div class="wheel-col" id="wheelYear" onscroll="updateWheelStyle(this)">
          ${yearHtml}
        </div>
      </div>
      
      <div style="padding: 16px;">
        <button type="button" class="btn-primary" style="width: 100%; padding: 14px; font-size: 15px;" onclick="confirmDatePicker()">تأكيد التاريخ وعرض السجل</button>
      </div>
    </div>
  `;

  const popover = document.getElementById("cellPopover");
  if (popover) {
    popover.classList.add("floating-month-picker");
    popover.style.padding = "0"; 
  }
  
  showPopoverAtElement(event.currentTarget, content);

  setTimeout(() => {
    let monthIndex = hijriMonths.indexOf(currentMonth);
    if (monthIndex === -1) monthIndex = gregorianMonths.indexOf(currentMonth);
    const mCol = document.getElementById("wheelMonth");
    if (mCol && monthIndex > -1) {
      mCol.scrollTop = monthIndex * 38;
      updateWheelStyle(mCol);
    }
    const yCol = document.getElementById("wheelYear");
    if (yCol) {
      const yearIdx = currentYear >= 1440 ? currentYear - 1440 : 8;
      yCol.scrollTop = yearIdx * 38;
      updateWheelStyle(yCol);
    }
  }, 50);
};

window.updateWheelStyle = function(col) {
  const centerPos = col.scrollTop;
  const index = Math.round(centerPos / 38);
  const items = col.querySelectorAll('.wheel-item');
  items.forEach((item, i) => {
    if (i === index) {
      item.style.color = '#2563eb';
      item.style.fontSize = '16px';
      item.style.fontWeight = '800';
    } else {
      item.style.color = '#94a3b8';
      item.style.fontSize = '14px';
      item.style.fontWeight = '600';
    }
  });
};

window.confirmDatePicker = function() {
  const mCol = document.getElementById("wheelMonth");
  const yCol = document.getElementById("wheelYear");
  
  if (mCol && yCol) {
    const mIndex = Math.round(mCol.scrollTop / 38);
    const mItems = mCol.querySelectorAll('.wheel-item');
    const selectedMonth = mItems[mIndex] ? mItems[mIndex].dataset.val : "صفر";

    const yIndex = Math.round(yCol.scrollTop / 38);
    const yItems = yCol.querySelectorAll('.wheel-item');
    const selectedYear = yItems[yIndex] ? yItems[yIndex].dataset.val : "1448";
    
    document.getElementById("filterMonth").value = selectedMonth;
    const filterMonthTrigger = document.getElementById("filterMonthTrigger");
    if (filterMonthTrigger) filterMonthTrigger.innerText = selectedMonth;
    
    document.getElementById("filterYear").value = selectedYear;
    const filterYearTrigger = document.getElementById("filterYearTrigger");
    if (filterYearTrigger) filterYearTrigger.innerText = `${selectedYear} هـ`;
    
    hidePopover();
    loadStudents();
  }
};

// Keyboard listener for ESC key to cleanly close popovers, modals, or exit circle view
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Esc") {
    // 1. If an inline popover is open, close it first
    const popover = document.getElementById("cellPopover");
    if (popover && popover.style.display !== "none") {
      hidePopover();
      return;
    }
    // 2. If a modal overlay is open, close modal
    const openModals = document.querySelectorAll(".modal-overlay");
    let modalClosed = false;
    openModals.forEach(m => {
      if (m.style.display && m.style.display !== "none") {
        m.style.display = "none";
        modalClosed = true;
      }
    });
    if (modalClosed) return;

    // 3. If circle roster is open, close it
    const rosterSection = document.getElementById("circleRosterSection");
    if (rosterSection && rosterSection.style.display !== "none") {
      closeCircleRoster();
    }
  }
});

// Delta Sync Reactive Listener - applies remote incremental changes in real-time
window.addEventListener("albayan:delta_sync", (evt) => {
  const detail = evt.detail || {};
  if (!activeCircleId) return;

  // 1. Handle Full Baseline Reset
  if (detail.baselineReset) {
    if (String(detail.circle_id) === String(activeCircleId)) {
      console.log(`[DeltaSync] Baseline reset triggered for active circle ${activeCircleId}, reconciling rows...`);
      if (typeof loadStudents === "function") {
        loadStudents();
      }
    }
    return;
  }

  // 2. Handle Incremental Changes
  const changes = detail.changes || [];
  if (!Array.isArray(changes) || changes.length === 0) return;

  changes.forEach(change => {
    const sId = change.entity_id || change.student_id || change.id || (change.record && change.record.student_id);
    if (!sId) return;

    const cCircleId = change.circle_id || (change.record && change.record.circle_id) || (change.data && change.data.circle_id);
    const oldCircleId = change.old_circle_id || (change.record && change.record.old_circle_id) || (change.data && change.data.old_circle_id);

    // TRANSFER handling
    if (change.action === "TRANSFER") {
      if (oldCircleId && String(oldCircleId) === String(activeCircleId) && String(cCircleId) !== String(activeCircleId)) {
        // Transferred out of current circle
        if (Array.isArray(cachedStudents)) {
          cachedStudents = cachedStudents.filter(s => String(s.id) !== String(sId));
        }
        if (typeof deleteStudentRow === "function") deleteStudentRow(sId);
        return;
      }
      if (cCircleId && String(cCircleId) === String(activeCircleId)) {
        // Transferred into current circle
        if (typeof loadStudents === "function") loadStudents();
        return;
      }
      return;
    }

    // Must be for current circle
    if (cCircleId && String(cCircleId) !== String(activeCircleId)) return;

    // DELETE handling
    if (change.action === "DELETE" || change.action === "DELETE_STUDENT" || change.is_deleted === 1) {
      if (Array.isArray(cachedStudents)) {
        cachedStudents = cachedStudents.filter(s => String(s.id) !== String(sId));
      }
      if (typeof deleteStudentRow === "function") deleteStudentRow(sId);
      return;
    }

    // INSERT / UPDATE handling
    const data = change.data || change.record || change.changed_fields || change;
    if (Array.isArray(cachedStudents)) {
      const found = cachedStudents.find(s => String(s.id) === String(sId));
      if (found) {
        if (typeof data === "object") Object.assign(found, data);
        
        // Granular cell patching if changed_fields is an array and cells exist
        if (Array.isArray(change.changed_fields) && change.changed_fields.length > 0 && typeof patchStudentCell === "function") {
          let allPatched = true;
          change.changed_fields.forEach(field => {
            const val = (data && data[field] !== undefined) ? data[field] : found[field];
            const cell = document.querySelector(`#student-row-${sId} td[data-field="${field}"]`);
            if (cell) {
              patchStudentCell(sId, field, val);
            } else {
              allPatched = false;
            }
          });
          if (!allPatched && typeof patchStudentRow === "function") {
            patchStudentRow(found);
          }
        } else if (typeof patchStudentRow === "function") {
          patchStudentRow(found);
        }
      } else if (data && data.name) {
        cachedStudents.push({ ...data, id: sId });
        if (typeof patchStudentRow === "function") patchStudentRow({ ...data, id: sId });
      } else if (change.action === "INSERT") {
        if (typeof loadStudents === "function") loadStudents();
      }
    }
  });
});

// Auto-refresh circles UI and active students when background reconciliation with Firebase completes
const handleCirclesSyncRefresh = () => {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
  const isModalOpen = document.querySelector('.modal.show, .modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"], #cellPopover[style*="display: block"], #circleModal[style*="display: flex"]');
  if (isTyping || isModalOpen) {
    return; // Skip re-rendering while user is interacting
  }

  if (typeof loadCircles === "function") {
    loadCircles().catch(() => {});
  }
  if (activeCircleId !== null && activeCircleId !== undefined && typeof loadStudents === "function") {
    loadStudents().catch(() => {});
  }
};

window.addEventListener("albayan:db-synced", handleCirclesSyncRefresh);
window.addEventListener("albayan:cloud_updated", handleCirclesSyncRefresh);
