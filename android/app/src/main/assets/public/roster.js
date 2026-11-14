/**
 * ALBAYAN QURAN SCHOOL - DEDICATED STUDENT ROSTER & GRADES ENGINE (roster.js)
 * High-performance standalone roster manager with offline-first support.
 */

let activeCircleId = null;
let currentPeriodType = "monthly";
let currentRecordDate = "";

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.showYearlyRecordNotice = function() {
  showNotice("🎓 سجل نهاية السنة هو محصلة سنوية تجميعية محسوبة تلقائياً من كافة شهور وفصول السنة. لتعديل الدرجات مباشرة، يرجى اختيار الشهر أو الفصل المطلوب من الفلتر.");
};

let quranSurahs = DEFAULT_QURAN_SURAHS;
let cachedStudents = [];
let circlesList = [];
let currentUserData = null;

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
  const headers = Object.assign({ "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() }, extra);
  const token = localStorage.getItem("albayan_saved_token");
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = "Bearer " + token;
    headers["X-Albayan-Token"] = token;
  }
  return headers;
}

function safeCreateIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch (e) {}
  }
}

function showNotice(msg, isOk = true) {
  const box = document.getElementById("alertBox");
  if (!box) return;
  box.textContent = msg;
  box.className = `alert-box ${isOk ? "ok" : "err"}`;
  box.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => { box.style.display = "none"; }, 4000);
}

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

document.addEventListener("DOMContentLoaded", () => {
  safeCreateIcons();
  setupDesktopTableScroll();

  // Handle URL query param circle_id immediately
  let paramCid = null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    paramCid = urlParams.get("circle_id");
  } catch(e) {}

  if (!paramCid) {
    try {
      paramCid = localStorage.getItem("albayan_active_circle_id");
    } catch(e) {}
  }

  if (paramCid) {
    activeCircleId = normalizeCircleId(paramCid);
    try {
      localStorage.setItem("albayan_active_circle_id", activeCircleId);
    } catch(e) {}
  }

  // 1. 0ms FAST SYNCHRONOUS LOCAL-FIRST RESTORE
  try {
    const cachedCircles = (window.CirclesService && typeof window.CirclesService.getCachedCircles === 'function')
      ? window.CirclesService.getCachedCircles()
      : JSON.parse(localStorage.getItem("albayan_cached_circles") || "[]");
    if (Array.isArray(cachedCircles) && cachedCircles.length > 0) {
      circlesList = sortRosterCircles(cachedCircles);
      if (!activeCircleId) {
        activeCircleId = normalizeCircleId(circlesList[0].id);
      }
      populateCircleSelect(circlesList);
    }
  } catch (e) {}

  // 0ms Instant render of period-isolated cached students if available
  if (activeCircleId && window.AlbayanStateStore && typeof window.AlbayanStateStore.getRoster === 'function') {
    try {
      const p = getPeriodFilterPayload();
      const s = window.AlbayanStateStore.getRoster(activeCircleId, p);
      if (Array.isArray(s) && s.length > 0) {
        cachedStudents = s;
        renderStudentsRows(s);
      }
    } catch (e) {}
  }

  // 2. Parallel non-blocking background initialization
  loadSurahs().catch(() => {});
  checkAuth().catch(() => {});
  loadCirclesDropdown().then(() => {
    if (activeCircleId) {
      loadStudents().catch(() => {});
    } else {
      renderEmptyState("يرجى اختيار حلقة قرآنية لعرض سجل طلابها.");
    }
  }).catch(() => {
    if (activeCircleId) loadStudents().catch(() => {});
  });

  window.addEventListener('albayan:firebase-ready', () => {
    loadCirclesDropdown(true).then(() => {
      if (activeCircleId) loadStudents(true).catch(() => {});
    }).catch(() => {});
  });

  // Close popover when clicking outside
  document.addEventListener("click", (e) => {
    const popover = document.getElementById("cellPopover");
    if (popover && popover.style.display !== "none" && !popover.contains(e.target) && !e.target.closest(".interactive-cell") && !e.target.closest(".date-filter-box")) {
      hidePopover();
    }
  });

  // Keyboard listener for ESC key to cleanly close popover
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      const popover = document.getElementById("cellPopover");
      if (popover && popover.style.display !== "none") {
        hidePopover();
        e.preventDefault();
      }
    }
  });
});

function setupDesktopTableScroll() {
  const container = document.querySelector(".table-scroll-container");
  if (!container) return;

  // 1. Mouse wheel horizontal scrolling when scrolling over table
  container.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > 0) return; // Allow natural trackpad horizontal scroll

    if (e.deltaY !== 0 && (container.scrollWidth > container.clientWidth)) {
      const hasVerticalOverflow = container.scrollHeight > container.clientHeight;
      if (e.shiftKey || !hasVerticalOverflow) {
        e.preventDefault();
        const isRtl = document.documentElement.dir === "rtl" || getComputedStyle(container).direction === "rtl";
        const factor = isRtl ? -1 : 1;
        container.scrollLeft += (e.deltaY > 0 ? 90 : -90) * factor;
      }
    }
  }, { passive: false });

  // 2. Mouse drag to scroll
  let isDown = false;
  let startX = 0;
  let initialScrollLeft = 0;

  container.addEventListener("mousedown", (e) => {
    if (e.target.closest("input, select, button, a, .interactive-cell, .badge, [onclick]")) return;
    isDown = true;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
    startX = e.pageX - container.offsetLeft;
    initialScrollLeft = container.scrollLeft;
  });

  const stopDrag = () => {
    if (isDown) {
      isDown = false;
      container.style.cursor = "";
      container.style.userSelect = "";
    }
  };

  window.addEventListener("mouseup", stopDrag);
  container.addEventListener("mouseleave", stopDrag);

  container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.4;
    const isRtl = document.documentElement.dir === "rtl" || getComputedStyle(container).direction === "rtl";
    container.scrollLeft = isRtl ? (initialScrollLeft + walk) : (initialScrollLeft - walk);
  });
}

async function checkAuth() {
  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) {
      currentUserData = JSON.parse(cached);
      const userElem = document.getElementById("loggedUsername");
      const roleElem = document.getElementById("loggedRole");
      if (userElem && currentUserData.student_name) userElem.textContent = currentUserData.student_name;
      else if (userElem && currentUserData.username) userElem.textContent = currentUserData.username;
      if (roleElem && currentUserData.role) {
        roleElem.textContent = currentUserData.role === 'admin' ? 'مدير المنظومة' : 'معلم قرآن كريم';
      }
    }
  } catch (e) {}
}

async function loadSurahs() {
  try {
    const res = await fetch("/api/quran/surahs");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        quranSurahs = data;
      }
    }
  } catch (err) {
    // Offline fallback: already set to DEFAULT_QURAN_SURAHS (114 surahs)
  }
}

function sortRosterCircles(list) {
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

async function loadCirclesDropdown(forceRemote = false) {
  window.loadCirclesDropdown = loadCirclesDropdown;
  const selectElem = document.getElementById("rosterCircleSelect");

  function updateActiveCircleTitle() {
    if (!activeCircleId) return;
    const normActiveId = normalizeCircleId(activeCircleId);
    const currentCircle = circlesList.find(c => String(normalizeCircleId(c.id)) === String(normActiveId));
    const titleEl = document.getElementById("currentCircleTitle");
    if (titleEl && currentCircle) {
      titleEl.textContent = currentCircle.name || "الحلقة القرآنية";
      titleEl.title = currentCircle.name || "سجل الطلاب";
    }
  }

  // 1. FAST LOCAL-FIRST (0ms from StateStore/localStorage & <10ms IndexedDB)
  try {
    const rawList = (window.CirclesService && typeof window.CirclesService.getCachedCircles === 'function')
      ? window.CirclesService.getCachedCircles()
      : JSON.parse(localStorage.getItem("albayan_cached_circles") || localStorage.getItem("cached_circles_list") || "[]");
    if (Array.isArray(rawList) && rawList.length > 0) {
      circlesList = sortRosterCircles(rawList);
      if (selectElem) populateCircleSelect(circlesList);
      updateActiveCircleTitle();
    }
  } catch (e) {}

  if ((!circlesList || circlesList.length === 0) && window.AlbayanLocalDB) {
    try {
      const getFunc = window.AlbayanLocalDB.getLocalCircles || window.AlbayanLocalDB.getCircles;
      if (typeof getFunc === 'function') {
        const cached = await getFunc();
        if (Array.isArray(cached) && cached.length > 0) {
          circlesList = sortRosterCircles(cached);
          if (selectElem) populateCircleSelect(circlesList);
          updateActiveCircleTitle();
        }
      }
    } catch (e) {}
  }

  // 2. Unified Cloud pull via CirclesService
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
      const fb = await window.pullCirclesFromFirebase(forceRemote);
      if (Array.isArray(fb)) {
        freshCircles = fb;
      }
    } catch (fbErr) {}
  }

  if (Array.isArray(freshCircles) && freshCircles.length > 0) {
    circlesList = sortRosterCircles(freshCircles);
    if (selectElem) {
      populateCircleSelect(circlesList);
    }

    if (!activeCircleId && circlesList.length > 0) {
      activeCircleId = normalizeCircleId(circlesList[0].id);
      try { localStorage.setItem("albayan_active_circle_id", activeCircleId); } catch (e) {}
    }

    updateActiveCircleTitle();
  }
}

function populateCircleSelect(circles) {
  const selectElem = document.getElementById("rosterCircleSelect");
  if (!selectElem) return;

  if (selectElem.tagName !== "SELECT") {
    if (activeCircleId) {
      selectElem.value = String(activeCircleId);
    }
    return;
  }

  if (!circles || circles.length === 0) {
    selectElem.innerHTML = `<option value="">-- لا توجد حلقات مضافة --</option>`;
    return;
  }

  const sorted = sortRosterCircles(circles);

  selectElem.innerHTML = sorted.map(c => {
    const isSelected = String(normalizeCircleId(activeCircleId)) === String(normalizeCircleId(c.id));
    return `
      <option value="${c.id}" ${isSelected ? 'selected' : ''}>
        ${c.name} (${c.student_count || 0} طلاب) - الأستاذ: ${c.teacher_name || 'إدارة عامة'}
      </option>
    `;
  }).join("");

  if (activeCircleId) {
    const norm = String(normalizeCircleId(activeCircleId));
    const matchingOption = Array.from(selectElem.options).find(opt => String(normalizeCircleId(opt.value)) === norm);
    if (matchingOption) {
      selectElem.value = matchingOption.value;
    }
  }
}

function switchCircleFromSelect(circleId) {
  if (!circleId) return;
  activeCircleId = normalizeCircleId(circleId);
  cachedStudents = [];
  try {
    localStorage.setItem("albayan_active_circle_id", activeCircleId);
  } catch (e) {}
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("circle_id", activeCircleId);
    window.history.replaceState({}, "", url.toString());
  } catch (err) {
    console.warn("History replaceState skipped:", err);
  }
  loadStudents();
}

function getPeriodFilterPayload() {
  const filterYear = document.getElementById("filterYear")?.value || "1448";
  const filterMonth = document.getElementById("filterMonth")?.value || "صفر";
  return {
    period_type: currentPeriodType,
    record_date: currentRecordDate,
    year: filterYear,
    month: filterMonth
  };
}

async function loadStudents(forceRemote = false) {
  if (!activeCircleId) return;
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;

  const normActiveId = normalizeCircleId(activeCircleId);
  const currentCircle = circlesList.find(c => String(normalizeCircleId(c.id)) === String(normActiveId));
  const titleEl = document.getElementById("currentCircleTitle");
  if (titleEl && currentCircle) {
    titleEl.textContent = currentCircle.name || "الحلقة القرآنية";
    titleEl.title = currentCircle.name || "سجل الطلاب";
  }

  const p = getPeriodFilterPayload();
  const isYearly = (p.month === "سجل نهاية السنة" || p.month === "نهاية السنة" || p.month === "المحصلة السنوية");

  const banner = document.getElementById("yearlySummaryBanner");
  if (banner) banner.style.display = isYearly ? "flex" : "none";

  // 1. FAST PERIOD-ISOLATED LOCAL RENDER (0ms from StateStore & <10ms from IndexedDB)
  let foundLocalForPeriod = false;
  if (window.AlbayanStateStore && typeof window.AlbayanStateStore.getRoster === 'function') {
    const stateRoster = window.AlbayanStateStore.getRoster(normActiveId, p);
    if (Array.isArray(stateRoster) && stateRoster.length > 0) {
      cachedStudents = stateRoster;
      renderStudentsRows(stateRoster);
      foundLocalForPeriod = true;
    }
  }

  if (!foundLocalForPeriod && window.AlbayanLocalDB) {
    try {
      const getFunc = window.AlbayanLocalDB.getLocalStudents || window.AlbayanLocalDB.getStudents;
      if (typeof getFunc === 'function') {
        const local = await getFunc(normActiveId, p);
        if (Array.isArray(local) && local.length > 0) {
          cachedStudents = local;
          renderStudentsRows(local);
          foundLocalForPeriod = true;
        }
      }
    } catch (e) {}
  }

  if (!foundLocalForPeriod) {
    cachedStudents = [];
    tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; padding:30px; color:var(--muted);"><i data-lucide="loader" style="animation:spin 1s linear infinite; width:22px; height:22px; vertical-align:-5px;"></i> جارٍ تحميل كشف الطلاب والدرجات...</td></tr>`;
    safeCreateIcons();
  }

  // 2. Unified Cloud Fetch via RosterService (sequence-guarded & period-isolated)
  if (window.RosterService && typeof window.RosterService.fetchRoster === 'function') {
    try {
      const res = await window.RosterService.fetchRoster(normActiveId, p, { forceRefresh: !!forceRemote });
      if (res && !res.superseded && String(normalizeCircleId(activeCircleId)) === String(normActiveId)) {
        cachedStudents = Array.isArray(res.students) ? res.students : [];
        if (cachedStudents.length > 0) {
          renderStudentsRows(cachedStudents);
        } else {
          renderEmptyState("لا يوجد طلاب مضافين في هذه الحلقة حتى الآن.");
        }
        if (circlesList && circlesList.length > 0) {
          const cObj = circlesList.find(c => String(normalizeCircleId(c.id)) === String(normActiveId));
          if (cObj) cObj.student_count = cachedStudents.length;
          populateCircleSelect(circlesList);
        }
      }
      return;
    } catch (err) {}
  }

  // Fallback if RosterService is not loaded
  if (typeof window.pullStudentsFromFirebase === 'function') {
    try {
      const fb = await window.pullStudentsFromFirebase(normActiveId, p, forceRemote);
      if (Array.isArray(fb) && String(normalizeCircleId(activeCircleId)) === String(normActiveId)) {
        cachedStudents = fb;
        if (cachedStudents.length > 0) {
          renderStudentsRows(cachedStudents);
        } else {
          renderEmptyState("لا يوجد طلاب مضافين في هذه الحلقة حتى الآن.");
        }
      }
    } catch (fbErr) {}
  }
}

function renderEmptyState(msg) {
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="18" style="text-align:center; padding:24px; color:var(--muted); font-size:14px;">${msg}</td>
    </tr>
    <tr>
      <td colspan="18" onclick="openQuickAddStudentModal()" style="text-align:center; padding:16px; color:#2563eb; font-weight:700; font-size:15px; background:#eff6ff; border:2px dashed #93c5fd; cursor:pointer; border-radius:12px;">
        <i data-lucide="user-plus" style="width:20px; height:20px; vertical-align:-5px; margin-left:6px;"></i> إضافة طالب جديد للحلقة
      </td>
    </tr>
  `;
  safeCreateIcons();
}

function generateRosterRowHTML(s, idx, isYearly) {
  const memoMark = (s.memo_grade !== undefined && s.memo_grade !== null && s.memo_grade !== "" && s.memo_grade !== "غير محدد" && parseFloat(s.memo_grade) > 0) ? parseFloat(s.memo_grade) : "";
  const revMark = (s.rev_grade !== undefined && s.rev_grade !== null && s.rev_grade !== "" && s.rev_grade !== "غير محدد" && parseFloat(s.rev_grade) > 0) ? parseFloat(s.rev_grade) : "";
  const sardPages = (s.sard_pages !== undefined && s.sard_pages !== null && parseFloat(s.sard_pages) > 0) ? parseFloat(s.sard_pages) : 0;
  const absentDays = s.absent_days !== undefined ? s.absent_days : 0;
  const attendanceMark = Math.max(0, 30 - (absentDays * 0.5));
  const activityMark = (s.activity_mark !== undefined && s.activity_mark !== null && s.activity_mark !== "" && parseFloat(s.activity_mark) > 0) ? parseFloat(s.activity_mark) : "";

  function parseMark(val) {
    if (val === undefined || val === null || val === "" || val === "-" || val === 0 || val === "0") return "";
    const p = parseFloat(val);
    return isNaN(p) || p <= 0 ? "" : p;
  }

  const fiqh = parseMark(s.fiqh);
  const tafsir = parseMark(s.tafsir);
  const adhkar = parseMark(s.adhkar);
  const seerah = parseMark(s.seerah);

  let totalScore = 0;
  if (memoMark !== "") totalScore += parseFloat(memoMark);
  if (revMark !== "") totalScore += parseFloat(revMark);
  totalScore += attendanceMark;
  if (activityMark !== "") totalScore += parseFloat(activityMark);
  if (fiqh !== "") totalScore += parseFloat(fiqh);
  if (tafsir !== "") totalScore += parseFloat(tafsir);
  if (adhkar !== "") totalScore += parseFloat(adhkar);
  if (seerah !== "") totalScore += parseFloat(seerah);

  totalScore = Math.round(totalScore * 10) / 10;
  const percentage = Math.round((totalScore / 200) * 1000) / 10;

  let pctBadgeStyle = "background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe;";
  if (percentage >= 90) pctBadgeStyle = "background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;";
  else if (percentage >= 50) pctBadgeStyle = "background:#fffbeb; color:#b45309; border:1px solid #fde68a;";
  else pctBadgeStyle = "background:#fff1f2; color:#e11d48; border:1px solid #fecdd3;";

  const fromSurah = s.from_surah || "";
  const fromAyah = s.from_ayah || 0;
  const toSurah = s.to_surah || "";
  const toAyah = s.to_ayah || 0;

  const revFromSurah = s.rev_from_surah || "";
  const revFromAyah = s.rev_from_ayah || 0;
  const revToSurah = s.rev_to_surah || "";
  const revToAyah = s.rev_to_ayah || 0;

  const onCellClick = (fnStr) => isYearly ? `showYearlyRecordNotice()` : fnStr;

  const memoPages = (s.memo_pages !== undefined && s.memo_pages !== null && s.memo_pages > 0)
    ? s.memo_pages
    : ((fromSurah && toSurah && toAyah > 0) ? calcClientQuranPages(fromSurah, fromAyah, toSurah, toAyah) : 0);

  const memoText = (fromSurah && toSurah && toAyah > 0)
    ? `من سورة ${fromSurah} (${fromAyah}) إلى ${toSurah} (${toAyah})`
    : (fromSurah ? `من سورة ${fromSurah} (${fromAyah})` : `<span style="color:var(--muted)">-</span>`);

  const revText = (revFromSurah && revToSurah && revToAyah > 0)
    ? `من سورة ${revFromSurah} (${revFromAyah}) إلى ${revToSurah} (${revToAyah})`
    : (revFromSurah ? `من سورة ${revFromSurah} (${revFromAyah})` : `<span style="color:var(--muted)">-</span>`);

  return `
    <tr id="roster-student-row-${s.id}" data-student-id="${s.id}">
      <td data-field="index" onclick="handleStudentRowDoubleClick(event, ${s.id})" ondblclick="event.preventDefault(); event.stopPropagation();" style="cursor:pointer; user-select:none;">${idx + 1}</td>
      <td data-field="name" class="student-name-cell" onclick="handleStudentRowDoubleClick(event, ${s.id})" ondblclick="event.preventDefault(); event.stopPropagation();" style="cursor:pointer; user-select:none;">
        <div class="student-name-text" style="font-weight:800; font-size:14.5px; color:var(--text); cursor:pointer;">${s.name}</div>
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
      <td data-field="total_score" style="text-align:center; font-weight:900; color:var(--primary); font-size:15px; white-space:nowrap;">
        ${totalScore} / 200
      </td>
      <td data-field="percentage" style="text-align:center; white-space:nowrap;">
        <span style="${pctBadgeStyle} font-size:13px; font-weight:800; padding:4px 10px; border-radius:8px; display:inline-block;">
          ${percentage}%
        </span>
      </td>
      <td data-field="actions">
        <div style="display:flex; gap:6px; justify-content:center;">
          <button type="button" class="btn-circle-edit" style="width:32px; height:32px;" onclick="openTransferModal(${s.id}, '${escapeHtml(s.name)}')" title="نقل الطالب لحلقة أخرى">
            <i data-lucide="arrow-right-left" style="width:15px; height:15px;"></i>
          </button>
          <button type="button" class="btn-circle-edit" style="width:32px; height:32px; color:#ef4444;" onclick="deleteStudent(${s.id}, '${escapeHtml(s.name)}')" title="حذف الطالب">
            <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}
window.generateRosterRowHTML = generateRosterRowHTML;

function patchRosterCell(studentId, field, value) {
  if (!studentId || !field) return;
  const row = document.getElementById("roster-student-row-" + studentId);
  if (!row) return;
  const cell = row.querySelector(`td[data-field="${field}"]`);
  if (cell) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT") && cell.contains(activeEl)) return;
    const target = cell.querySelector('strong') || cell.querySelector('span') || cell;
    target.textContent = value;
  }
}
window.patchRosterCell = patchRosterCell;

function patchRosterRow(s, force = false) {
  if (!s || !s.id) return;
  const row = document.getElementById("roster-student-row-" + s.id);
  const activeEl = document.activeElement;
  if (!force && row && activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT") && row.contains(activeEl)) {
    // Active form input inside this row; do not destroy DOM to prevent focus loss!
    return;
  }

  const p = getPeriodFilterPayload();
  const isYearly = (p.month === "سجل نهاية السنة" || p.month === "نهاية السنة" || p.month === "المحصلة السنوية");

  let idx = 0;
  if (Array.isArray(cachedStudents)) {
    const fIdx = cachedStudents.findIndex(item => String(item.id) === String(s.id));
    if (fIdx >= 0) idx = fIdx;
  }

  const newHtml = generateRosterRowHTML(s, idx, isYearly);

  if (row) {
    const temp = document.createElement("tbody");
    temp.innerHTML = newHtml;
    const newRow = temp.firstElementChild;
    if (newRow) {
      row.replaceWith(newRow);
      safeCreateIcons();
    }
  } else {
    const tb = document.getElementById("studentsTableBody");
    if (!tb) return;
    const temp = document.createElement("tbody");
    temp.innerHTML = newHtml;
    const newRow = temp.firstElementChild;
    if (newRow) {
      tb.appendChild(newRow);
      safeCreateIcons();
    }
  }
}
window.patchRosterRow = patchRosterRow;

function deleteRosterRow(studentId) {
  const row = document.getElementById("roster-student-row-" + studentId);
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
window.deleteRosterRow = deleteRosterRow;

function renderStudentsRows(list) {
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;

  const p = getPeriodFilterPayload();
  const isYearly = (p.month === "سجل نهاية السنة" || p.month === "نهاية السنة" || p.month === "المحصلة السنوية");

  if (!list || list.length === 0) {
    renderEmptyState("لا يوجد طلاب مضافين في هذه الحلقة حتى الآن.");
    return;
  }

  // Remove any stale non-student placeholder rows (e.g. loader or empty state)
  const placeholderRows = tbody.querySelectorAll("tr:not([data-student-id])");
  placeholderRows.forEach(r => r.remove());

  // Non-destructive incremental reconciliation if rows already exist
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
        patchRosterRow(studentMap.get(sid));
      }
    });

    // Add any newly arrived students
    list.forEach(s => {
      if (!document.getElementById("roster-student-row-" + s.id)) {
        patchRosterRow(s);
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

  // Initial full render
  tbody.innerHTML = list.map((s, idx) => generateRosterRowHTML(s, idx, isYearly)).join("");
  safeCreateIcons();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

/* Modals & Grade Prompt Handlers */
function promptGrade(studentId, fieldKey, title, maxVal, currentVal) {
  const modal = document.getElementById("gradeEditModal");
  if (!modal) {
    if (window.AlbayanDialog && window.AlbayanDialog.prompt) {
      AlbayanDialog.prompt(`أدخل علامة ${title} (بين 0 و ${maxVal}):`, currentVal || "", `رصد ${title}`, { inputType: "number", min: 0, max: maxVal, step: 0.5 }).then(input => {
        if (input === null) return;
        const num = parseFloat(String(input).trim());
        if (isNaN(num) || num < 0 || num > maxVal) {
          if (String(input).trim() === "") updateStudentField(studentId, fieldKey, null);
          return;
        }
        updateStudentField(studentId, fieldKey, num);
      });
    }
    return;
  }

  document.getElementById("gradeEditStudentId").value = studentId;
  document.getElementById("gradeEditFieldKey").value = fieldKey;
  document.getElementById("gradeEditMaxVal").value = maxVal;
  document.getElementById("gradeEditTitle").textContent = `رصد ${title}`;
  document.getElementById("gradeEditMaxLabel").textContent = `/ ${maxVal}`;
  const inputEl = document.getElementById("gradeEditInput");
  inputEl.max = maxVal;
  inputEl.value = (currentVal !== undefined && currentVal !== null && currentVal !== "") ? currentVal : "";
  modal.style.display = "flex";
  safeCreateIcons();
  setTimeout(() => {
    inputEl.focus();
    const len = inputEl.value ? inputEl.value.length : 0;
    try { inputEl.setSelectionRange(len, len); } catch (e) {}
  }, 100);
}

async function confirmGradeEdit(e) {
  e.preventDefault();
  const studentId = parseInt(document.getElementById("gradeEditStudentId").value, 10);
  const fieldKey = document.getElementById("gradeEditFieldKey").value;
  const maxVal = parseFloat(document.getElementById("gradeEditMaxVal").value) || 40;
  const raw = document.getElementById("gradeEditInput").value.trim();
  closeModal("gradeEditModal");

  if (raw === "") {
    await updateStudentField(studentId, fieldKey, null);
    return;
  }
  const num = parseFloat(raw);
  if (isNaN(num) || num < 0 || num > maxVal) {
    showNotice(`الرجاء إدخال رقم صحيح بين 0 و ${maxVal}`, false);
    return;
  }
  await updateStudentField(studentId, fieldKey, num);
}
window.confirmGradeEdit = confirmGradeEdit;

function promptAccompanying(studentId, subject, subjectTitle, currentVal) {
  promptGrade(studentId, subject, subjectTitle, 20, currentVal);
}

function promptMemoSurah(studentId) {
  openSurahModal(studentId, "memo", "نطاق الحفظ الجديد");
}

function promptRevSurah(studentId) {
  openSurahModal(studentId, "rev", "نطاق المراجعة");
}

function openSurahModal(studentId, kind, title) {
  const modal = document.getElementById("surahEditModal");
  if (!modal) {
    const found = (cachedStudents && cachedStudents.find(s => s.id === studentId)) || {};
    const prefix = kind === "rev" ? "rev_" : "";
    const fs = found[`${prefix}from_surah`] || (kind === "rev" ? "الناس" : "الفاتحة");
    const fa = found[`${prefix}from_ayah`] || 1;
    const ts = found[`${prefix}to_surah`] || (kind === "rev" ? "الناس" : "الفاتحة");
    const ta = found[`${prefix}to_ayah`] || (kind === "rev" ? 6 : 7);
    if (typeof openInlineSurahAyahDropdown === "function") {
      openInlineSurahAyahDropdown({ stopPropagation: () => {} }, studentId, kind, fs, fa, ts, ta);
    }
    return;
  }

  document.getElementById("surahEditStudentId").value = studentId;
  document.getElementById("surahEditKind").value = kind;
  document.getElementById("surahEditTitle").textContent = title;

  const found = cachedStudents.find(s => s.id === studentId) || {};
  const prefix = kind === "rev" ? "rev_" : "";
  document.getElementById("surahEditFromSurah").value = found[`${prefix}from_surah`] || (kind === "rev" ? "الناس" : "الفاتحة");
  document.getElementById("surahEditFromAyah").value = found[`${prefix}from_ayah`] || 1;
  document.getElementById("surahEditToSurah").value = found[`${prefix}to_surah`] || (kind === "rev" ? "الناس" : "الفاتحة");
  document.getElementById("surahEditToAyah").value = found[`${prefix}to_ayah`] || (kind === "rev" ? 6 : 7);

  modal.style.display = "flex";
  safeCreateIcons();
}

async function confirmSurahEdit(e) {
  e.preventDefault();
  const studentId = parseInt(document.getElementById("surahEditStudentId").value, 10);
  const kind = document.getElementById("surahEditKind").value;
  const fromSurah = document.getElementById("surahEditFromSurah").value.trim();
  const fromAyah = parseInt(document.getElementById("surahEditFromAyah").value, 10) || 1;
  const toSurah = document.getElementById("surahEditToSurah").value.trim();
  const toAyah = parseInt(document.getElementById("surahEditToAyah").value, 10) || 1;
  closeModal("surahEditModal");

  if (!fromSurah || !toSurah) return;
  await updateStudentSurah(studentId, kind, fromSurah, fromAyah, toSurah, toAyah);
}
window.confirmSurahEdit = confirmSurahEdit;

async function updateStudentSurah(studentId, kind, fSurah, fAyah, tSurah, tAyah) {
  const fields = {
    [`${kind === 'rev' ? 'rev_' : ''}from_surah`]: fSurah,
    [`${kind === 'rev' ? 'rev_' : ''}from_ayah`]: fAyah,
    [`${kind === 'rev' ? 'rev_' : ''}to_surah`]: tSurah,
    [`${kind === 'rev' ? 'rev_' : ''}to_ayah`]: tAyah
  };
  await updateStudentRecord(studentId, fields);
}

async function updateStudentField(studentId, fieldKey, value) {
  await updateStudentRecord(studentId, { [fieldKey]: value });
}

/* =========================================================================
   SMART FLOATING POPOVER & INLINE DROPDOWN ENGINE (RESTORED & ENHANCED)
   ========================================================================= */

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

  // Push modal history state so mobile back-swipe gesture closes the popover instead of leaving the page
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

    // If popover goes below the visible area (or above the keyboard), place it just above the keyboard / cell
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

  safeCreateIcons();

  // Auto-focus input & attach Enter/Esc handlers
  setTimeout(() => {
    const isMob = window.innerWidth <= 768;
    const inp = popover.querySelector("input[type='number'], input[type='text'], input[type='search']");
    if (inp) {
      // Do not auto-focus the Surah search box on mobile when opening the Surah picker unless tapped
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
window.showPopoverAtElement = showPopoverAtElement;

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

/* Unified Student Record Updater */
async function updateStudentRecord(studentId, fields) {
  const p = getPeriodFilterPayload();
  const cleanSid = normalizeStudentId(studentId);
  const cleanCid = normalizeCircleId(activeCircleId);

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

  // 1. Instant in-memory and UI update
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
      if ("rev_from_surah" in normalizedFields || "rev_to_surah" in normalizedFields || "rev_from_ayah" in normalizedFields || "rev_to_ayah" in normalizedFields) {
        if (st.rev_from_surah && st.rev_to_surah && Number(st.rev_to_ayah) > 0 && calcFn) {
          st.rev_pages = calcFn(st.rev_from_surah, st.rev_from_ayah, st.rev_to_surah, st.rev_to_ayah);
        } else {
          st.rev_pages = 0;
        }
      }
      if (typeof patchRosterRow === "function") {
        patchRosterRow(st, true);
      } else if (typeof renderStudentsRows === "function") {
        renderStudentsRows(cachedStudents);
      }
    }
  }

  // 2. Persist via RosterService (updates IndexedDB period-isolated cache + canonical Firebase RTDB record)
  if (window.RosterService && typeof window.RosterService.updateStudentRecord === "function") {
    try {
      const res = await window.RosterService.updateStudentRecord(cleanCid, cleanSid, p, normalizedFields, st);
      if (res && res.student) {
        if (st) {
          Object.assign(st, res.student);
          if (typeof patchRosterRow === "function") patchRosterRow(st, true);
        } else if (typeof patchRosterRow === "function") {
          patchRosterRow(res.student, true);
        }
      }
      if (!res || !res.synced) {
        if (typeof showNotice === "function") {
          showNotice("تم حفظ التعديل محلياً، وسيتم رفعه إلى السحابة فور توفر الاتصال بالشبكة.", false);
        }
      }
      return res;
    } catch (e) {
      console.warn("[Roster] RosterService.updateStudentRecord notice:", e);
      if (typeof showNotice === "function") {
        showNotice("تعذر حفظ التعديل في السحابة حالياً. تم حفظه محلياً.", false);
      }
    }
  }

  // Fallback to AlbayanLocalDB if RosterService is unavailable
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.updateLocalStudentRecord === "function") {
    try {
      await window.AlbayanLocalDB.updateLocalStudentRecord(cleanCid, cleanSid, normalizedFields, p);
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

/* 1. Inline Quran Surah & Ayah Picker */
let quranPickerState = {
  studentId: null,
  targetType: 'memo',
  activeTab: 'from',
  fromSurah: 'الفاتحة',
  fromAyah: 1,
  toSurah: 'الفاتحة',
  toAyah: 1,
  fromView: 'surah',
  toView: 'surah',
  hasExistingPassage: false
};

function getQuranSurahOrderIndex(surahName) {
  if (!surahName || !Array.isArray(quranSurahs)) return -1;
  return quranSurahs.findIndex(s => s.name === surahName);
}

function openInlineSurahAyahDropdown(event, studentId, targetType, fromSurah, fromAyah, toSurah, toAyah) {
  event.stopPropagation();

  const hasValidFrom = Boolean(fromSurah && fromSurah !== 'null' && fromSurah !== 'undefined');
  const validFromSurah = hasValidFrom ? fromSurah : "الفاتحة";
  const validToSurah = (toSurah && toSurah !== 'null' && toSurah !== 'undefined') ? toSurah : validFromSurah;
  const parsedFromAyah = parseInt(fromAyah, 10) || 1;
  let parsedToAyah = parseInt(toAyah, 10) || parsedFromAyah;

  const fromIdx = getQuranSurahOrderIndex(validFromSurah);
  const toIdx = getQuranSurahOrderIndex(validToSurah);
  let normalizedToSurah = validToSurah;
  if (fromIdx !== -1 && toIdx !== -1 && toIdx < fromIdx) {
    normalizedToSurah = validFromSurah;
    parsedToAyah = parsedFromAyah;
  } else if (normalizedToSurah === validFromSurah && parsedToAyah < parsedFromAyah) {
    parsedToAyah = parsedFromAyah;
  }

  quranPickerState = {
    studentId: studentId,
    targetType: targetType,
    activeTab: 'from',
    fromSurah: validFromSurah,
    fromAyah: parsedFromAyah,
    toSurah: normalizedToSurah,
    toAyah: parsedToAyah,
    fromView: 'surah',
    toView: 'surah',
    hasExistingPassage: hasValidFrom
  };

  renderQuranSurahPicker(event.currentTarget);
}
window.openInlineSurahAyahDropdown = openInlineSurahAyahDropdown;

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

  const surahObj = (quranSurahs || []).find(s => s.name === currentSurah);
  const totalAyahs = surahObj ? (surahObj.ayahs || surahObj.ayah_count || 7) : 7;

  let listContent = '';

  if (currentView === 'surah') {
    listContent = `
      <div class="quran-search-box" style="padding:10px 14px 6px; background:#f8fafc; border-bottom:1px solid #e2e8f0; flex-shrink:0;">
        <div style="position:relative; display:flex; align-items:center;">
          <input type="search" id="quranSurahSearchInput" class="quran-search-input" 
                 placeholder="ابحث عن اسم السورة أو رقمها..." 
                 oninput="filterSurahList(this.value)" 
                 onkeyup="filterSurahList(this.value)"
                 autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                 style="padding-left:36px; -webkit-appearance:none; font-size:13.5px;">
          <button type="button" id="clearQuranSearchBtn" onclick="clearQuranSearch()" aria-label="مسح البحث"
                  style="display:none; position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(100,116,139,0.18); border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; align-items:center; justify-content:center; padding:0; color:#475569;">
            <i data-lucide="x" style="width:13px; height:13px;"></i>
          </button>
        </div>
      </div>
      <div class="quran-surah-scroll-list" id="quranSurahsListContainer">
        ${renderSurahListItems(currentSurah)}
      </div>
    `;
  } else {
    listContent = `
      <div class="quran-surah-scroll-list" id="quranAyahsListContainer">
        ${Array.from({length: totalAyahs}, (_, i) => i + 1).map(num => `
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
      ${listContent}
      ${clearPassageFooter}
    </div>
  `;

  if (targetElement) {
    showPopoverAtElement(targetElement, content);
  } else {
    const popover = document.getElementById("cellPopover");
    if (popover) popover.innerHTML = content;
  }

  safeCreateIcons();
}
window.renderQuranSurahPicker = renderQuranSurahPicker;

function renderSurahListItems(selectedSurahName, listToRender = null) {
  const sourceList = listToRender || quranSurahs;
  if (!sourceList || sourceList.length === 0) {
    return `<div style="text-align:center; padding:20px; color:#94a3b8;">جاري تحميل أسماء السور...</div>`;
  }

  return sourceList.map(s => `
    <div class="quran-surah-item ${s.name === selectedSurahName ? 'selected' : ''}"
         onclick="selectPickerSurah('${escapeHtml(s.name)}')">
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
    container.innerHTML = `<div style="text-align:center; padding:24px 16px; font-size:13.5px; font-weight:700; color:var(--muted, #64748b);">لم يتم العثور على سورة مطابقة للبحث</div>`;
    return;
  }

  container.innerHTML = renderSurahListItems(currentSurah, filtered);
}
window.filterSurahList = filterSurahList;

function switchQuranPickerTab(tab) {
  quranPickerState.activeTab = tab;
  if (tab === 'from') {
    quranPickerState.fromView = 'surah';
  } else {
    quranPickerState.toView = 'surah';
  }
  renderQuranSurahPicker();
}
window.switchQuranPickerTab = switchQuranPickerTab;

function switchPickerView(view) {
  if (quranPickerState.activeTab === 'from') {
    quranPickerState.fromView = view;
  } else {
    quranPickerState.toView = view;
  }
  renderQuranSurahPicker();
}
window.switchPickerView = switchPickerView;

function selectPickerSurah(surahName) {
  if (quranPickerState.activeTab === 'from') {
    quranPickerState.fromSurah = surahName;
    quranPickerState.fromAyah = 1;
    quranPickerState.fromView = 'ayah';
    // Keep "toSurah" synced to the chosen "fromSurah" by default
    quranPickerState.toSurah = surahName;
    quranPickerState.toAyah = 1;
    quranPickerState.toView = 'surah';
  } else {
    quranPickerState.toSurah = surahName;
    quranPickerState.toAyah = (surahName === quranPickerState.fromSurah) ? (quranPickerState.fromAyah || 1) : 1;
    quranPickerState.toView = 'ayah';
  }
  renderQuranSurahPicker();
}
window.selectPickerSurah = selectPickerSurah;

function selectPickerAyah(ayahNum) {
  const num = parseInt(ayahNum, 10) || 1;
  if (quranPickerState.activeTab === 'from') {
    // 1. Set start Ayah directly in "from" («من»)
    quranPickerState.fromAyah = num;

    // 2. Sync default "to" («إلى») so it is ready
    const fromIdx = getQuranSurahOrderIndex(quranPickerState.fromSurah);
    const toIdx = getQuranSurahOrderIndex(quranPickerState.toSurah);
    if (fromIdx !== -1 && (toIdx === -1 || toIdx < fromIdx)) {
      quranPickerState.toSurah = quranPickerState.fromSurah;
      quranPickerState.toAyah = num;
    } else if (quranPickerState.toSurah === quranPickerState.fromSurah && quranPickerState.toAyah < num) {
      quranPickerState.toAyah = num;
    }

    // 3. Automatically transition to the "to" («إلى») stage showing the Surah list first
    quranPickerState.activeTab = 'to';
    quranPickerState.toView = 'surah';
    renderQuranSurahPicker();
  } else {
    // 4. Finalize selection in "to" («إلى») and close the popover automatically
    quranPickerState.toAyah = num;
    return saveQuranPickerSurahAyah();
  }
}
window.selectPickerAyah = selectPickerAyah;

async function saveQuranPickerSurahAyah() {
  let { studentId, targetType, fromSurah, fromAyah, toSurah, toAyah } = quranPickerState;

  const fromIdx = getQuranSurahOrderIndex(fromSurah);
  const toIdx = getQuranSurahOrderIndex(toSurah);
  if (fromIdx !== -1 && toIdx !== -1) {
    if (toIdx < fromIdx) {
      // Swap Surahs if user picked a reverse range so saving always succeeds cleanly
      [fromSurah, toSurah] = [toSurah, fromSurah];
      [fromAyah, toAyah] = [toAyah, fromAyah];
    } else if (toIdx === fromIdx && toAyah < fromAyah) {
      [fromAyah, toAyah] = [toAyah, fromAyah];
    }
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
window.saveQuranPickerSurahAyah = saveQuranPickerSurahAyah;

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

/* 2. Inline Memorization Mark Dropdown (العلامة من 40) */
function openInlineMemoMarkDropdown(event, studentId, currentMark) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("رصد علامة الحفظ (من 40)")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" id="popMemoMarkInput" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
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
window.openInlineMemoMarkDropdown = openInlineMemoMarkDropdown;

async function saveInlineMemoMark(studentId) {
  const raw = (document.getElementById("popMemoMarkInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { memo_grade: "" });
    return;
  }

  const mark = parseLocalizedNumber(raw);
  if (isNaN(mark)) {
    showNotice("الرجاء إدخال علامة رقمية صحيحة للحفظ.", false);
    return;
  }

  if (mark < 0 || mark > 40) {
    showNotice("العلامة المدخلة غير صحيحة، يجب أن تكون علامة الحفظ بين 0 و 40.", false);
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await updateStudentRecord(studentId, { memo_grade: finalMark });
}
window.saveInlineMemoMark = saveInlineMemoMark;

/* 3. Inline Sard Pages Dropdown (أوجه السرد) */
function openInlineSardPagesDropdown(event, studentId, currentPages) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentPages);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("تعديل أوجه السرد")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" id="popSardPagesInput" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
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
window.openInlineSardPagesDropdown = openInlineSardPagesDropdown;

async function saveInlineSardPages(studentId) {
  const raw = (document.getElementById("popSardPagesInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { sard_pages: 0 });
    return;
  }

  const pages = parseLocalizedNumber(raw);
  if (isNaN(pages) || pages < 0) {
    showNotice("عدد أوجه السرد لا يمكن أن يكون سالباً.", false);
    return;
  }

  await updateStudentRecord(studentId, { sard_pages: pages });
}
window.saveInlineSardPages = saveInlineSardPages;

/* 4. Inline Revision Mark Dropdown (العلامة من 30) */
function openInlineRevMarkDropdown(event, studentId, currentMark) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("رصد علامة المراجعة (من 30)")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" id="popRevMarkInput" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
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
window.openInlineRevMarkDropdown = openInlineRevMarkDropdown;

async function saveInlineRevMark(studentId) {
  const raw = (document.getElementById("popRevMarkInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { rev_grade: "" });
    return;
  }

  const mark = parseLocalizedNumber(raw);
  if (isNaN(mark)) {
    showNotice("الرجاء إدخال علامة رقمية صحيحة للمراجعة.", false);
    return;
  }

  if (mark < 0 || mark > 30) {
    showNotice("العلامة المدخلة غير صحيحة، يجب أن تكون علامة المراجعة بين 0 و 30.", false);
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await updateStudentRecord(studentId, { rev_grade: finalMark });
}
window.saveInlineRevMark = saveInlineRevMark;

/* 5. Inline Absent Days Dropdown */
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
window.openInlineAbsentDropdown = openInlineAbsentDropdown;

async function saveInlineAbsent(studentId) {
  const raw = (document.getElementById("popAbsentInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { absent_days: 0 });
    return;
  }
  const days = Math.round(parseLocalizedNumber(raw));
  if (isNaN(days) || days < 0) {
    showNotice("عدد أيام الغياب لا يمكن أن يكون سالباً.", false);
    return;
  }
  await updateStudentRecord(studentId, { absent_days: days });
}
window.saveInlineAbsent = saveInlineAbsent;

/* 6. Inline Activity Mark Dropdown (العلامة من 20) */
function openInlineActivityMarkDropdown(event, studentId, currentMark) {
  event.stopPropagation();
  const parsed = parseLocalizedNumber(currentMark);
  const val = (!isNaN(parsed) && parsed > 0) ? parsed : "";
  const content = `
    <div class="popover-form" onclick="event.stopPropagation()">
      ${renderPopoverHeaderHTML("رصد علامة النشاط (من 20)")}
      <div style="display:flex; gap:10px; align-items:center; justify-content:center; margin:10px 0;">
        <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" dir="ltr" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" id="popActivityInput" placeholder="0" value="${val}" style="font-weight:900; font-size:24px; text-align:center; width:110px; padding:8px; border-radius:12px; border:2px solid var(--primary, #2563eb); background:var(--bg, #f8fafc); color:var(--text, #0f172a); outline:none; box-shadow:none;">
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
window.openInlineActivityMarkDropdown = openInlineActivityMarkDropdown;

async function saveInlineActivityMark(studentId) {
  const raw = (document.getElementById("popActivityInput")?.value || "").trim();
  hidePopover();

  if (raw === "") {
    await updateStudentRecord(studentId, { activity_mark: "" });
    return;
  }

  const mark = parseLocalizedNumber(raw);
  if (isNaN(mark)) {
    showNotice("الرجاء إدخال علامة رقمية صحيحة للنشاط.", false);
    return;
  }

  if (mark < 0 || mark > 20) {
    showNotice("العلامة المدخلة غير صحيحة، يجب أن تكون علامة النشاط بين 0 و 20.", false);
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await updateStudentRecord(studentId, { activity_mark: finalMark });
}
window.saveInlineActivityMark = saveInlineActivityMark;

/* 7. Inline Accompanying Subjects Dropdown (العلامة من 20) */
function openInlineAccompanyingMarkDropdown(event, studentId, subject, currentMark) {
  event.stopPropagation();
  let subjectName = "";
  if (subject === 'fiqh') subjectName = "الفقه";
  else if (subject === 'tafsir') subjectName = "التفسير";
  else if (subject === 'adhkar') subjectName = "الأذكار";
  else if (subject === 'seerah') subjectName = "السيرة";

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
window.openInlineAccompanyingMarkDropdown = openInlineAccompanyingMarkDropdown;

async function saveInlineAccompanyingMark(studentId, subject) {
  const inputVal = (document.getElementById("popAccompanyingInput")?.value || "").trim();
  hidePopover();

  let subjectName = "";
  if (subject === 'fiqh') subjectName = "الفقه";
  else if (subject === 'tafsir') subjectName = "التفسير";
  else if (subject === 'adhkar') subjectName = "الأذكار";
  else if (subject === 'seerah') subjectName = "السيرة";

  if (inputVal === "") {
    await postAccompanyingMark(studentId, subject, "");
    return;
  }

  const mark = parseLocalizedNumber(inputVal);
  if (isNaN(mark)) {
    showNotice(`الرجاء إدخال علامة رقمية صحيحة لمادة ${subjectName}.`, false);
    return;
  }

  if (mark < 0 || mark > 20) {
    showNotice(`العلامة المدخلة غير صحيحة، يجب أن تكون علامة ${subjectName} بين 0 و 20.`, false);
    return;
  }

  const finalMark = (mark === 0) ? "" : mark;
  await postAccompanyingMark(studentId, subject, finalMark);
}
window.saveInlineAccompanyingMark = saveInlineAccompanyingMark;

async function postAccompanyingMark(studentId, subject, markValue) {
  await updateStudentRecord(studentId, { [subject]: markValue });
}
window.postAccompanyingMark = postAccompanyingMark;

/* 8. Generic Inline Grade Dropdown */
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
window.openInlineGradeDropdown = openInlineGradeDropdown;

async function selectGradeValue(studentId, targetType, gradeValue) {
  hidePopover();
  const field = targetType === "memo" ? "memo_grade" : "rev_grade";
  await updateStudentRecord(studentId, { [field]: gradeValue });
}
window.selectGradeValue = selectGradeValue;

/* 9. Inline Exam Results Dropdown */
async function openInlineExamResultsDropdown(event, studentId, studentName) {
  event.stopPropagation();
  const targetElement = event.currentTarget;

  showPopoverAtElement(targetElement, `<div style="padding:10px; font-size:12px; text-align:center;">جارٍ جلب الاختبارات...</div>`);

  try {
    const examsRes = await getExamsResiliently();
    let resultsRes = [];
    if (window.AlbayanFirebaseDAL) {
      try {
        const rawRes = await window.AlbayanFirebaseDAL.get("results", { timeoutMs: 4000 });
        if (rawRes && typeof rawRes === "object") {
          const allRes = Array.isArray(rawRes) ? rawRes.filter(Boolean) : Object.values(rawRes).filter(Boolean);
          resultsRes = allRes.filter(r => String(r.student_id) === String(studentId));
        }
      } catch (e) {}
    }

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
        ${renderPopoverHeaderHTML(`رصد اختبار (${studentName})`)}
        
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
window.openInlineExamResultsDropdown = openInlineExamResultsDropdown;

function onPopExamSelectChange(selectElem) {
  const customInput = document.getElementById("popExamTitleCustom");
  if (customInput) {
    customInput.value = selectElem.value;
  }
}
window.onPopExamSelectChange = onPopExamSelectChange;

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
window.saveSelectedExamResult = saveSelectedExamResult;

async function selectStudentExamScore(studentId, scoreText) {
  hidePopover();
  await updateStudentRecord(studentId, { exam_grade: scoreText });
}
window.selectStudentExamScore = selectStudentExamScore;

async function getExamsResiliently() {
  if (typeof window.pullExamsFromFirebase === 'function') {
    try {
      const fbExams = await window.pullExamsFromFirebase();
      if (Array.isArray(fbExams) && fbExams.length > 0) return fbExams;
    } catch (e) {}
  }

  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalExams === 'function') {
    try {
      const localEx = await window.AlbayanLocalDB.getLocalExams();
      if (Array.isArray(localEx) && localEx.length > 0) return localEx;
    } catch (e) {}
  }

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
window.getExamsResiliently = getExamsResiliently;

/* Quick Add Student Modal */
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
  safeCreateIcons();
  const input = document.getElementById("quickStudentName");
  if (input) {
    input.value = "";
    setTimeout(() => {
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }, 120);
  }
}
window.openQuickAddStudentModal = openQuickAddStudentModal;

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.setProperty("display", "flex", "important");
    safeCreateIcons();
  }
}
window.openModal = openModal;

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

async function pasteToInput(inputId) {
  // Deprecated paste button removed
}
window.pasteToInput = pasteToInput;

/* Student Row Selection Controller (Double Click / Double Tap - Exactly 2 Clicks) */
let _studentRowTapState = {};
function handleStudentRowDoubleClick(event, studentId) {
  if (event) {
    if (typeof event.stopPropagation === "function") event.stopPropagation();
  }
  const now = Date.now();
  const state = _studentRowTapState[studentId] || { lastTime: 0 };
  const diff = now - state.lastTime;

  // Exactly 2 clicks/taps within 450ms
  if (diff > 20 && diff < 450) {
    _studentRowTapState[studentId] = { lastTime: 0 };
    toggleStudentRowSelection(event, studentId);
  } else {
    _studentRowTapState[studentId] = { lastTime: now };
  }
}
window.handleStudentRowDoubleClick = handleStudentRowDoubleClick;
window.handleStudentNameTap = handleStudentRowDoubleClick;

function toggleStudentRowSelection(event, studentId) {
  if (event && typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
  const row = document.getElementById(`roster-student-row-${studentId}`) ||
              document.getElementById(`student-row-${studentId}`);
  if (row) {
    row.classList.toggle("student-row-selected");
  }
}
window.toggleStudentRowSelection = toggleStudentRowSelection;

async function saveQuickStudent(e) {
  e.preventDefault();
  const input = document.getElementById("quickStudentName");
  const name = input ? input.value.trim() : "";
  if (!name || !activeCircleId) return;

  closeModal("quickAddStudentModal");

  const normCid = normalizeCircleId(activeCircleId);
  const p = getPeriodFilterPayload();
  const tempId = Date.now();
  const newStudent = {
    id: tempId,
    circle_id: normCid,
    name: name,
    from_surah: "",
    from_ayah: 0,
    to_surah: "",
    to_ayah: 0,
    rev_from_surah: "",
    rev_from_ayah: 0,
    rev_to_surah: "",
    rev_to_ayah: 0,
    memo_grade: "",
    rev_grade: "",
    sard_pages: 0,
    absent_days: 0,
    activity_mark: "",
    fiqh: "",
    tafsir: "",
    adhkar: "",
    seerah: "",
    exam_grade: "لم يختبر بعد",
    exam_title: "",
    month: p.month,
    year: p.year,
    period_type: p.period_type,
    record_date: p.record_date
  };

  // 1. Instant local render
  cachedStudents.push(newStudent);
  renderStudentsRows(cachedStudents);
  if (typeof safeCreateIcons === "function") safeCreateIcons();

  // 2. Persist via RosterService
  let savedOnFirebase = false;
  if (window.RosterService && typeof window.RosterService.addStudent === "function") {
    try {
      const res = await window.RosterService.addStudent(normCid, newStudent, p);
      if (res && res.synced) savedOnFirebase = true;
      if (window.AlbayanStateStore && typeof window.AlbayanStateStore.getRoster === "function") {
        const storedRoster = window.AlbayanStateStore.getRoster(normCid, p);
        if (Array.isArray(storedRoster) && storedRoster.length > 0) {
          cachedStudents = storedRoster;
        }
      }
    } catch (err) {
      console.warn("[Roster] RosterService.addStudent warning:", err);
    }
  } else if (typeof window.saveStudentToFirebase === "function") {
    try {
      const fbRes = await window.saveStudentToFirebase(newStudent, p);
      if (fbRes === true || (fbRes && fbRes.success)) savedOnFirebase = true;
    } catch (fbErr) {}
  }

  renderStudentsRows(cachedStudents);
  await loadCirclesDropdown();

  if (savedOnFirebase) {
    showNotice("تم إضافة الطالب وحفظه سحابياً بنجاح! ☁️✨", true);
  } else {
    showNotice("تم حفظ الطالب محلياً، وستتم المزامنة عند توفر الشبكة.", true);
  }
}

async function deleteStudent(studentId, studentName) {
  const ok = window.AlbayanDialog
    ? await AlbayanDialog.confirm(`هل أنت متأكد من حذف الطالب (${studentName}) من هذه الحلقة؟`, "حذف الطالب", { isDestructive: true })
    : confirm(`هل أنت متأكد من حذف الطالب (${studentName}) من هذه الحلقة؟`);
  if (!ok) return;

  const cleanSid = normalizeStudentId(studentId);
  const cleanCid = normalizeCircleId(activeCircleId);

  deleteRosterRow(cleanSid);
  cachedStudents = cachedStudents.filter(s => String(normalizeStudentId(s.id)) !== String(cleanSid));

  let synced = false;
  if (window.RosterService && typeof window.RosterService.deleteStudent === "function") {
    try {
      const res = await window.RosterService.deleteStudent(cleanCid, cleanSid);
      synced = !!(res && res.synced);
    } catch (e) {}
  } else if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.deleteLocalStudent === "function") {
    await window.AlbayanLocalDB.deleteLocalStudent(cleanSid, cleanCid);
  }

  await loadCirclesDropdown();
  showNotice(synced ? "تم حذف الطالب سحابياً ومحلياً بنجاح." : "تم حذف الطالب محلياً بنجاح.", true);
}

function openTransferModal(studentId, studentName) {
  const modal = document.getElementById("transferStudentModal");
  if (!modal) return;
  document.getElementById("transferStudentId").value = studentId;
  document.getElementById("transferStudentName").textContent = studentName;

  const selectEl = document.getElementById("transferTargetCircle");
  if (selectEl) {
    selectEl.innerHTML = circlesList
      .filter(c => String(normalizeCircleId(c.id)) !== String(normalizeCircleId(activeCircleId)))
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join("");
  }
  modal.style.display = "flex";
  safeCreateIcons();
}

async function saveTransferStudent(e) {
  e.preventDefault();
  const sId = normalizeStudentId(document.getElementById("transferStudentId").value);
  const targetCid = normalizeCircleId(document.getElementById("transferTargetCircle").value);
  const fromCid = normalizeCircleId(activeCircleId);
  if (!sId || !targetCid) return;

  closeModal("transferStudentModal");

  deleteRosterRow(sId);
  cachedStudents = cachedStudents.filter(s => String(normalizeStudentId(s.id)) !== String(sId));
  renderStudentsRows(cachedStudents);

  if (window.RosterService && typeof window.RosterService.transferStudent === "function") {
    try {
      const res = await window.RosterService.transferStudent(sId, fromCid, targetCid);
      await loadCirclesDropdown();
      await loadStudents({ forceRefresh: true });
      if (res && res.synced) {
        showNotice("تم نقل الطالب للحلقة الجديدة سحابياً بنجاح! 🔄☁️", true);
      } else {
        showNotice("تم نقل الطالب محلياً وستتم مزامنته عند توفر الشبكة! 🔄", true);
      }
      return;
    } catch (err) {
      console.warn("[Roster] Transfer warning:", err);
    }
  }

  showNotice("تعذر نقل الطالب، تأكد من الاتصال بالشبكة.", false);
}

function printRoster() {
  window.print();
}

function exportToExcel() {
  const currentCircle = circlesList.find(c => c.id === activeCircleId);
  const p = getPeriodFilterPayload();
  const circleName = currentCircle ? currentCircle.name : "الحلقة";
  
  let csv = "\uFEFF"; // UTF-8 BOM
  csv += `سجل درجات: ${circleName} - ${p.month} ${p.year}\n`;
  csv += "#,اسم الطالب,مقدار الحفظ,أوجه الحفظ,علامة الحفظ,مقدار المراجعة,أوجه السرد,علامة المراجعة,أيام الغياب,علامة الحضور,النشاط,الفقه,التفسير,الأذكار,السيرة,المجموع,النسبة\n";

  cachedStudents.forEach((s, idx) => {
    const memo = s.from_surah ? `من ${s.from_surah} إلى ${s.to_surah || ''}` : "-";
    const rev = s.rev_from_surah ? `من ${s.rev_from_surah} إلى ${s.rev_to_surah || ''}` : "-";
    const total = ((parseFloat(s.memo_grade) || 0) + (parseFloat(s.rev_grade) || 0) + Math.max(0, 30 - ((s.absent_days || 0) * 0.5)) + (parseFloat(s.activity_mark) || 0) + (parseFloat(s.fiqh) || 0) + (parseFloat(s.tafsir) || 0) + (parseFloat(s.adhkar) || 0) + (parseFloat(s.seerah) || 0)).toFixed(1);
    const pct = ((total / 200) * 100).toFixed(1);

    csv += `"${idx + 1}","${s.name}","${memo}","${s.memo_pages || 0}","${s.memo_grade || 0}","${rev}","${s.sard_pages || 0}","${s.rev_grade || 0}","${s.absent_days || 0}","${Math.max(0, 30 - ((s.absent_days || 0) * 0.5))}","${s.activity_mark || 0}","${s.fiqh || 0}","${s.tafsir || 0}","${s.adhkar || 0}","${s.seerah || 0}","${total}","${pct}%"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `سجل_${circleName}_${p.month}_${p.year}.csv`;
  link.click();
}

window.switchCircleFromSelect = switchCircleFromSelect;
window.openQuickAddStudentModal = openQuickAddStudentModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveQuickStudent = saveQuickStudent;
window.openTransferModal = openTransferModal;
window.saveTransferStudent = saveTransferStudent;
window.deleteStudent = deleteStudent;
window.exportToExcel = exportToExcel;
window.printRoster = printRoster;
window.showPopoverAtElement = showPopoverAtElement;
window.hidePopover = hidePopover;
window.openInlineSurahAyahDropdown = openInlineSurahAyahDropdown;
window.openInlineMemoMarkDropdown = openInlineMemoMarkDropdown;
window.saveInlineMemoMark = saveInlineMemoMark;
window.openInlineRevMarkDropdown = openInlineRevMarkDropdown;
window.saveInlineRevMark = saveInlineRevMark;
window.openInlineSardPagesDropdown = openInlineSardPagesDropdown;
window.saveInlineSardPages = saveInlineSardPages;
window.openInlineAbsentDropdown = openInlineAbsentDropdown;
window.saveInlineAbsent = saveInlineAbsent;
window.openInlineActivityMarkDropdown = openInlineActivityMarkDropdown;
window.saveInlineActivityMark = saveInlineActivityMark;
window.openInlineAccompanyingMarkDropdown = openInlineAccompanyingMarkDropdown;
window.saveInlineAccompanyingMark = saveInlineAccompanyingMark;
window.openInlineGradeDropdown = openInlineGradeDropdown;
window.openInlineExamResultsDropdown = openInlineExamResultsDropdown;
window.updateStudentRecord = updateStudentRecord;
window.confirmGradeEdit = function(e) { if (e) e.preventDefault(); closeModal('gradeEditModal'); };
window.confirmSurahEdit = function(e) { if (e) e.preventDefault(); closeModal('surahEditModal'); };

// Delta Sync Reactive Listener - applies remote incremental changes in real-time
window.addEventListener("albayan:delta_sync", (evt) => {
  const detail = evt.detail || {};
  if (!activeCircleId) return;

  // 1. Handle Full Baseline Reset
  if (detail.baselineReset) {
    if (String(detail.circle_id) === String(activeCircleId)) {
      console.log(`[DeltaSync:Roster] Baseline reset triggered for circle ${activeCircleId}, reconciling rows...`);
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
        if (typeof deleteRosterRow === "function") deleteRosterRow(sId);
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
      if (typeof deleteRosterRow === "function") deleteRosterRow(sId);
      return;
    }

    // INSERT / UPDATE handling
    const data = change.data || change.record || change.changed_fields || change;
    if (Array.isArray(cachedStudents)) {
      const found = cachedStudents.find(s => String(s.id) === String(sId));
      if (found) {
        if (typeof data === "object") Object.assign(found, data);
        
        // Granular cell patching if changed_fields is an array
        if (Array.isArray(change.changed_fields) && change.changed_fields.length > 0 && typeof patchRosterCell === "function") {
          let allPatched = true;
          change.changed_fields.forEach(field => {
            const val = (data && data[field] !== undefined) ? data[field] : found[field];
            const cell = document.querySelector(`#roster-student-row-${sId} td[data-field="${field}"]`);
            if (cell) {
              patchRosterCell(sId, field, val);
            } else {
              allPatched = false;
            }
          });
          if (!allPatched && typeof patchRosterRow === "function") {
            patchRosterRow(found);
          }
        } else if (typeof patchRosterRow === "function") {
          patchRosterRow(found);
        }
      } else if (data && data.name) {
        cachedStudents.push({ ...data, id: sId });
        if (typeof patchRosterRow === "function") patchRosterRow({ ...data, id: sId });
      } else if (change.action === "INSERT") {
        if (typeof loadStudents === "function") loadStudents();
      }
    }
  });
});

// Auto-refresh roster UI when background reconciliation with Firebase completes (with input & modal protection)
const handleRosterSyncRefresh = () => {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
  const isModalOpen = document.querySelector('.modal.show, .modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"], #cellPopover[style*="display: block"], #quickAddStudentModal[style*="display: flex"]');
  if (isTyping || isModalOpen) {
    return; // Skip re-rendering while user is typing or modal is open
  }

  if (typeof loadCirclesDropdown === "function") {
    loadCirclesDropdown().then(() => {
      if (typeof loadStudents === "function" && activeCircleId) {
        loadStudents().catch(() => {});
      }
    }).catch(() => {});
  }
};

window.addEventListener("albayan:db-synced", handleRosterSyncRefresh);
window.addEventListener("albayan:cloud_updated", handleRosterSyncRefresh);
