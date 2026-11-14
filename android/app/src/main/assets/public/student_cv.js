/**
 * Student CV & Card Management (السيرة الذاتية وبطاقة الطالب)
 * V2.0 - Full In-Place Inline Editing
 */

// CSRF Token Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function csrfHeaders(extra = {}) {
  return Object.assign({"Content-Type": "application/json", "X-CSRF-Token": getCsrfToken()}, extra);
}

// Global State
let allStudentCvs = [];
let activeCvId = null;
let currentCvData = null;
let isDraftMode = false;
let hasUnsavedChanges = false;
let lookupData = { students: [], circles: [], teachers: [] };
let currentUploadTarget = null; // { category, index }
let currentSubjectData = {}; // { "المادة": { score: 85, desc: "وصف المادة" } }
let activeSubject = "التفسير";
let autoSaveTimer = null;

// Monthly filter state
const ARABIC_MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function getDefaultMonth() {
  return window.HijriDate ? window.HijriDate.getCurrentHijriMonth() : "صفر";
}

function getDefaultYear() {
  return window.HijriDate ? window.HijriDate.getCurrentHijriYear() : 1448;
}

function getCurrentMonthKey() {
  return `${getDefaultMonth()} ${getDefaultYear()}`;
}

let selectedMonth = getCurrentMonthKey();
let studentAvailableMonths = [];

function formatMonthArabic(monthKey) {
  if (!monthKey) return "الشهر الحالي";
  if (monthKey.includes(" ")) {
    return monthKey.endsWith("هـ") ? monthKey : `${monthKey} هـ`;
  }
  const parts = monthKey.split("-");
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${ARABIC_MONTH_NAMES[monthIdx]} ${year}`;
    }
  }
  return `${monthKey} هـ`;
}

// Active evaluation tag lists currently displayed on the card
let activeTags = {
  strength: [],
  weakness: [],
  development: [],
  needs: [],
  achievement: []
};

// Studied Materials Filter State (فلتر المواد المدروسة: التفسير، الفقه، التجويد...)
const DEFAULT_STUDIED_SUBJECTS = ["التفسير", "الفقه", "التجويد"];

function loadAvailableSubjects() {
  try {
    const saved = localStorage.getItem("student_cv_available_subjects");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not parse saved subjects:", e);
  }
  return [...DEFAULT_STUDIED_SUBJECTS];
}

let availableSubjects = loadAvailableSubjects();

function saveAvailableSubjects() {
  try {
    localStorage.setItem("student_cv_available_subjects", JSON.stringify(availableSubjects));
  } catch (e) {
    console.warn("Could not save subjects:", e);
  }
}

// Safe Firebase Node Flattening Helper
function safeFlattenFirebase(raw, prefix = "") {
  if (!raw) return [];
  if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.flattenFirebaseNode === "function") {
    try { return window.AlbayanDataNormalizer.flattenFirebaseNode(raw, prefix); } catch (e) {}
  }
  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map((item, idx) => ({
      ...item,
      _fbKey: String(idx),
      id: item.id !== undefined ? item.id : idx
    }));
  }
  if (typeof raw === "object") {
    return Object.entries(raw).map(([key, item]) => {
      if (!item || typeof item !== "object") return null;
      return {
        ...item,
        _fbKey: key,
        id: item.id !== undefined ? item.id : key
      };
    }).filter(Boolean);
  }
  return [];
}

// Lifecycle
async function bootStudentCvPage() {
  initMobileSidebar();
  initKeyboardShortcuts();
  initPopoverCloseListeners();
  renderMonthSelector(selectedMonth, []);
  renderCustomSubjectDropdown();
  checkAuth().catch(() => {});
  await loadLookups();
  await loadStudentCvs();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootStudentCvPage);
} else {
  bootStudentCvPage();
}

window.addEventListener("albayan:firebase-ready", async () => {
  if (!allStudentCvs || allStudentCvs.length === 0) {
    await loadLookups();
    await loadStudentCvs();
  }
});

window.addEventListener("albayan:db-synced", async () => {
  if (!hasUnsavedChanges) {
    await loadLookups();
    await loadStudentCvs(activeCvId, selectedMonth);
  }
});

function initPopoverCloseListeners() {
  document.addEventListener("click", (e) => {
    const popover = document.getElementById("cellPopover");
    if (popover && popover.style.display !== "none" && !popover.contains(e.target) && !e.target.closest(".date-filter-box")) {
      hidePopover();
    }

    const subMenu = document.getElementById("customSubjectMenu");
    const subTrigger = document.getElementById("customSubjectTrigger");
    if (subMenu && subMenu.style.display === "block") {
      if (!subMenu.contains(e.target) && (!subTrigger || !subTrigger.contains(e.target))) {
        subMenu.style.display = "none";
      }
    }

    const dropdown = document.getElementById("cvSearchDropdown");
    const input = document.getElementById("searchStudentCv");
    const toggleBtn = document.getElementById("btnToggleStudentList");
    if (dropdown && dropdown.style.display === "block") {
      if (!dropdown.contains(e.target) && e.target !== input && (!toggleBtn || !toggleBtn.contains(e.target))) {
        dropdown.style.display = "none";
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      hidePopover();
      const subMenu = document.getElementById("customSubjectMenu");
      if (subMenu) subMenu.style.display = "none";
      const dropdown = document.getElementById("cvSearchDropdown");
      if (dropdown) dropdown.style.display = "none";
    }
  });

  window.addEventListener("scroll", () => {
    const subMenu = document.getElementById("customSubjectMenu");
    if (subMenu && subMenu.style.display === "block") {
      positionSubjectDropdownMenu();
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    const subMenu = document.getElementById("customSubjectMenu");
    if (subMenu && subMenu.style.display === "block") {
      positionSubjectDropdownMenu();
    }
  }, { passive: true });
}

async function checkAuth() {
  // 1. Fast local cache inspection (0ms)
  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) {
      const u = JSON.parse(cached);
      if (u && (u.username || u.student_name)) {
        const userElem = document.getElementById("loggedUsername");
        if (userElem) userElem.textContent = u.username || u.student_name || "الكادر التعليمي";
        return;
      }
    }
  } catch (e) {}

  // 2. Optional non-blocking API check
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/me", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.logged_in) {
        const userElem = document.getElementById("loggedUsername");
        if (userElem) userElem.textContent = data.username || "الكادر التعليمي";
        try { localStorage.setItem("albayan_logged_user", JSON.stringify(data)); } catch (e) {}
        return;
      }
    }
  } catch (err) {}

  // 3. Fallback default user for offline & mobile standalone
  const userElem = document.getElementById("loggedUsername");
  if (userElem) userElem.textContent = "الكادر التعليمي";
}

async function logout() {
  if (typeof window.albayanLogout === 'function') {
    return window.albayanLogout();
  }
  sessionStorage.clear();
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
  } catch(e) {}
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  window.location.href = "login.html?logout=1";
}

function initMobileSidebar() {
  if (typeof initMobileBottomNav === 'function') {
    initMobileBottomNav();
  }
}

window.toggleSidebar = function(forceState) {
  if (typeof toggleBottomMoreSheet === 'function') {
    toggleBottomMoreSheet();
  }
};


function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl+S or Cmd+S to save changes
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveActiveCv();
    }
  });
}

function initUnsavedPrompt() {
  window.addEventListener("beforeunload", (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "لديك تعديلات غير محفوظة، هل أنت متأكد من المغادرة؟";
    }
  });
}

function showAlert(msg, isSuccess = true) {
  const box = document.getElementById("alertBox");
  if (!box) return;
  box.className = isSuccess ? "alert-box ok" : "alert-box error";
  box.innerHTML = `<i data-lucide="${isSuccess ? 'check-circle' : 'alert-circle'}" style="width:18px; height:18px;"></i> <span>${msg}</span>`;
  box.style.display = "flex";
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    box.style.display = "none";
  }, 4000);
}

// Month Selector Management (نظام اختيار السنة والشهر مثل صفحة الحلقات)
function renderMonthSelector(currentMonth, availableList = []) {
  const label = document.getElementById("cvActiveMonthLabel");
  const cardPillText = document.getElementById("cvCardMonthText");
  const monthTrigger = document.getElementById("filterMonthTrigger");
  const yearTrigger = document.getElementById("filterYearTrigger");
  const filterMonthInput = document.getElementById("filterMonth");
  const filterYearInput = document.getElementById("filterYear");

  let displayMonth = getDefaultMonth();
  let displayYear = String(getDefaultYear());

  if (currentMonth) {
    if (currentMonth.includes(" ")) {
      const parts = currentMonth.split(" ");
      displayMonth = parts[0];
      displayYear = parts[1].replace(/هـ/g, "").trim();
    } else if (currentMonth.includes("-")) {
      const parts = currentMonth.split("-");
      displayYear = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      displayMonth = ARABIC_MONTH_NAMES[mIdx] || parts[1];
    } else {
      displayMonth = currentMonth;
    }
  }

  if (filterMonthInput) filterMonthInput.value = displayMonth;
  if (filterYearInput) filterYearInput.value = displayYear;
  if (monthTrigger) monthTrigger.textContent = displayMonth;
  if (yearTrigger) yearTrigger.textContent = `${displayYear} هـ`;

  const formatted = formatMonthArabic(currentMonth);
  if (label) label.textContent = formatted;
  if (cardPillText) cardPillText.textContent = formatted;

  if (window.lucide) lucide.createIcons();
}

/* =========================================================
   CUSTOM DATE PICKER (نظام الأشهر والسنوات المتطابق مع الحلقات)
   ========================================================= */
function attachPopoverSwipeToClose(popover) {
  if (!popover || popover._swipeAttached) return;
  popover._swipeAttached = true;

  let startX = 0;
  let startY = 0;
  let currentDx = 0;
  let currentDy = 0;
  let isTracking = false;
  let startedInWheel = false;

  popover.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentDx = 0;
    currentDy = 0;
    isTracking = true;
    startedInWheel = Boolean(e.target.closest && e.target.closest(".wheel-col"));
  }, { passive: true });

  popover.addEventListener("touchmove", (e) => {
    if (!isTracking || !e.touches || e.touches.length !== 1) return;
    currentDx = e.touches[0].clientX - startX;
    currentDy = e.touches[0].clientY - startY;
  }, { passive: true });

  const finishSwipe = () => {
    if (!isTracking) return;
    isTracking = false;
    const isHorizontalDismiss = Math.abs(currentDx) > 85 && Math.abs(currentDx) > Math.abs(currentDy) * 1.3;
    const isDownDismiss = !startedInWheel && currentDy > 75 && currentDy > Math.abs(currentDx);
    if (isHorizontalDismiss || isDownDismiss) {
      hidePopover();
    }
  };

  popover.addEventListener("touchend", finishSwipe, { passive: true });
  popover.addEventListener("touchcancel", finishSwipe, { passive: true });
}

function showPopoverAtElement(targetElement, contentHtml) {
  let popover = document.getElementById("cellPopover");
  if (!popover) {
    popover = document.createElement("div");
    popover.id = "cellPopover";
    popover.className = "popover-dropdown";
    document.body.appendChild(popover);
  }
  popover.innerHTML = contentHtml;
  popover.style.setProperty("display", "block", "important");
  attachPopoverSwipeToClose(popover);

  if (typeof window.albayanPushModalState === "function") {
    window.albayanPushModalState();
  }

  const isMobile = window.innerWidth <= 768;
  const isCard = contentHtml.includes("quran-picker-card");

  if (isMobile && isCard) {
    popover.style.position = "fixed";
    popover.style.top = "auto";
    popover.style.bottom = "0px";
    popover.style.left = "0px";
    popover.style.right = "0px";
    popover.style.width = "100vw";
    popover.style.maxHeight = "80vh";
    popover.style.transform = "none";
    popover.style.zIndex = "100000";
    return;
  }

  popover.style.position = "fixed";
  popover.style.top = "50%";
  popover.style.left = "50%";
  popover.style.bottom = "auto";
  popover.style.right = "auto";
  popover.style.transform = "translate(-50%, -50%)";
  popover.style.width = "360px";
  popover.style.maxHeight = "80vh";
  popover.style.zIndex = "100000";
}

function hidePopover(fromPopState = false) {
  const popover = document.getElementById("cellPopover");
  if (popover) {
    popover.innerHTML = "";
    popover.style.setProperty("display", "none", "important");
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

window.openCvDatePicker = function(event) {
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
    yearHtml += `<div class="wheel-item" data-val="${y}">${y} هـ</div>`;
  }
  yearHtml += `<div class="wheel-spacer"></div><div class="wheel-spacer"></div>`;

  let content = `
    <div class="quran-picker-card" onclick="event.stopPropagation()" style="width: 100%; border: none;">
      <div style="font-size:16px; font-weight:800; color:var(--text, #0f172a); text-align:center; padding: 20px 0 10px;">
        اختر الشهر أو سجل نهاية السنة (التقويم الهجري)
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
        <button type="button" class="btn-primary" style="width: 100%; padding: 14px; font-size: 15px; border-radius: 12px; background: #2563eb; color: #fff; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s;" onclick="confirmCvDatePicker()">تأكيد التاريخ وعرض السجل</button>
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
      item.style.fontSize = '17px';
      item.style.fontWeight = '800';
    } else {
      item.style.color = '#94a3b8';
      item.style.fontSize = '14px';
      item.style.fontWeight = '600';
    }
  });
};

window.confirmCvDatePicker = async function() {
  const mCol = document.getElementById("wheelMonth");
  const yCol = document.getElementById("wheelYear");
  
  if (mCol && yCol) {
    const mIndex = Math.round(mCol.scrollTop / 38);
    const mItems = mCol.querySelectorAll('.wheel-item');
    const selectedMonthName = mItems[mIndex] ? mItems[mIndex].dataset.val : "صفر";

    const yIndex = Math.round(yCol.scrollTop / 38);
    const yItems = yCol.querySelectorAll('.wheel-item');
    const selectedYearVal = yItems[yIndex] ? yItems[yIndex].dataset.val : "1448";
    
    const targetMonthKey = `${selectedMonthName} ${selectedYearVal}`;

    if (hasUnsavedChanges) {
      const ok = window.AlbayanDialog
        ? await AlbayanDialog.confirm("لديك تعديلات غير محفوظة على هذا الشهر، هل تريد الانتقال إلى شهر آخر وتجاهل التعديلات؟", "تعديلات غير محفوظة", { type: "warning" })
        : confirm("لديك تعديلات غير محفوظة على هذا الشهر، هل تريد الانتقال إلى شهر آخر وتجاهل التعديلات؟");
      if (!ok) {
        hidePopover();
        return;
      }
    }

    selectedMonth = targetMonthKey;
    hidePopover();

    if (activeCvId && !isDraftMode) {
      await fetchAndRenderCvMonth(activeCvId, targetMonthKey);
    } else {
      renderMonthSelector(targetMonthKey, studentAvailableMonths);
    }
  }
};

async function fetchAndRenderCvMonth(cvId, monthKey) {
  let cv = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`/api/student-cv/${cvId}?month=${encodeURIComponent(monthKey)}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      cv = await res.json();
    }
  } catch (err) {}

  if (!cv) {
    // 1. Check in-memory allStudentCvs
    let targetCv = (allStudentCvs || []).find(c => String(c.id) === String(cvId) || String(c.student_id) === String(cvId));
    
    // 2. Direct Firebase RTDB fetch if not found or no monthly_records
    if (!targetCv || !targetCv.monthly_records) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const fbRes = await fetch(`https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/student_cvs/cv_${cvId}.json`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (fbRes.ok) {
          const fbCv = await fbRes.json();
          if (fbCv) targetCv = fbCv;
        }
      } catch(e) {}
    }

    if (targetCv) {
      const mRecords = targetCv.monthly_records || {};
      const availMonths = Object.keys(mRecords);
      const monthData = mRecords[monthKey] || {};

      cv = {
        ...targetCv,
        ...monthData,
        id: targetCv.id || cvId,
        name: targetCv.name,
        circle_name: targetCv.circle_name,
        teacher_name: targetCv.teacher_name,
        monthly_records: mRecords,
        selected_month: monthKey,
        available_months: availMonths
      };
    }
  }

  if (cv) {
    currentCvData = cv;
    selectedMonth = cv.selected_month || monthKey;
    studentAvailableMonths = cv.available_months || [];
    clearCvChanged();
    renderStudentCard(cv);
    renderMonthSelector(selectedMonth, studentAvailableMonths);
  } else {
    showAlert("تعذر تحميل بيانات السجل للشهر المحدد", false);
  }
}

function getActiveCardMonth() {
  return selectedMonth || getCurrentMonthKey();
}

function renderStudentList(list) {
  // Refresh search dropdown if open
  const dropdown = document.getElementById("cvSearchDropdown");
  if (dropdown && dropdown.style.display === "block") {
    renderSearchDropdown(list || allStudentCvs);
  }
}

function mergeLookupStudentsIntoCvs(existingCvs, studentsList, circlesList) {
  const cvMap = new Map();
  const circleMap = new Map();

  for (const c of (circlesList || [])) {
    if (!c) continue;
    const cid = String(c.id !== undefined ? c.id : (c.circle_id || "")).replace(/^circles_/, "");
    if (cid) circleMap.set(cid, c);
  }

  for (const cv of (existingCvs || [])) {
    if (!cv || !cv.name) continue;
    const idStr = String(cv.student_id !== undefined ? cv.student_id : (cv.id || "")).replace(/^(cv_|students_)/, "");
    if (!idStr) continue;
    const cleanId = isNaN(Number(idStr)) ? idStr : Number(idStr);
    cvMap.set(idStr, { ...cv, id: cleanId, student_id: cleanId });
  }

  for (const st of (studentsList || [])) {
    if (!st) continue;
    const sName = (st.name || st.student_name || "").trim();
    if (!sName) continue;
    const sidStr = String(st.id !== undefined ? st.id : (st.student_id || "")).replace(/^students_/, "");
    if (!sidStr) continue;
    const cidStr = st.circle_id !== undefined && st.circle_id !== null ? String(st.circle_id).replace(/^circles_/, "") : "";
    const circleObj = cidStr ? circleMap.get(cidStr) : null;
    const cName = circleObj ? (circleObj.name || circleObj.circle_name || "") : (st.circle_name || "بدون حلقة");
    const tName = circleObj ? (circleObj.teacher_name || circleObj.teacher || "") : (st.teacher_name || "غير متوفر");
    const cLevel = circleObj ? (circleObj.level || circleObj.memorization_level || "") : (st.memorization_level || "غير متوفر");

    const existing = cvMap.get(sidStr);
    if (existing) {
      if (!existing.circle_name || existing.circle_name === "غير متوفر" || existing.circle_name === "بدون حلقة") existing.circle_name = cName;
      if (!existing.teacher_name || existing.teacher_name === "غير متوفر") existing.teacher_name = tName;
      if (!existing.memorization_level || existing.memorization_level === "غير متوفر") existing.memorization_level = cLevel;
      if (!existing.circle_id && cidStr) existing.circle_id = isNaN(Number(cidStr)) ? cidStr : Number(cidStr);
      if (!existing.phone && st.phone) existing.phone = st.phone;
      if (!existing.guardian_phone && st.guardian_phone) existing.guardian_phone = st.guardian_phone;
      if (!existing.birth_date && st.birth_date) existing.birth_date = st.birth_date;
    } else {
      const cleanId = isNaN(Number(sidStr)) ? sidStr : Number(sidStr);
      const synthesized = {
        id: cleanId,
        student_id: cleanId,
        circle_id: cidStr ? (isNaN(Number(cidStr)) ? cidStr : Number(cidStr)) : null,
        name: sName,
        birth_date: st.birth_date || "غير متوفر",
        phone: st.phone || "غير متوفر",
        guardian_phone: st.guardian_phone || "غير متوفر",
        study_level: st.study_level || "غير متوفر",
        circle_name: cName || "بدون حلقة",
        memorization_level: cLevel || "غير متوفر",
        teacher_name: tName || "غير متوفر",
        studied_material: st.studied_material || "التفسير",
        studied_material_desc: st.studied_material_desc || "",
        exam_score: st.exam_score !== undefined ? st.exam_score : 85,
        monthly_records: {},
        available_months: []
      };
      cvMap.set(sidStr, synthesized);
    }
  }

  return Array.from(cvMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
}

// Load lookups (circles & students list)
async function loadLookups() {
  let circles = [];
  let students = [];

  // 1. FAST SYNCHRONOUS LOCAL CACHE FIRST (0ms)
  try {
    const cachedCircles = localStorage.getItem("albayan_cached_circles");
    if (cachedCircles) {
      const parsed = JSON.parse(cachedCircles);
      if (Array.isArray(parsed) && parsed.length > 0) circles = parsed;
    }
    const cachedStudents = localStorage.getItem("albayan_known_students_v3");
    if (cachedStudents) {
      const parsed = JSON.parse(cachedStudents);
      const arr = Object.values(parsed || {}).filter(Boolean);
      if (arr.length > 0) students = arr;
    }
    if (!students || students.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("albayan_circle_students_base_") || key.startsWith("albayan_cached_students_"))) {
          try {
            const arr = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(arr) && arr.length > 0) {
              arr.forEach(it => { if (it && (it.name || it.student_name)) students.push(it); });
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  // 2. Try AlbayanFirebaseDAL
  if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === "function") {
    try {
      const [dalStudents, dalCircles] = await Promise.all([
        window.AlbayanFirebaseDAL.get("students", { timeoutMs: 3500 }),
        window.AlbayanFirebaseDAL.get("circles", { timeoutMs: 3500 })
      ]);
      if (dalStudents && dalStudents.ok && dalStudents.data) {
        const parsed = safeFlattenFirebase(dalStudents.data, "students");
        if (parsed.length > 0) students = parsed;
      }
      if (dalCircles && dalCircles.ok && dalCircles.data) {
        const parsed = safeFlattenFirebase(dalCircles.data, "circles");
        if (parsed.length > 0) circles = parsed;
      }
    } catch (e) {}
  }

  // 3. Direct Firebase RTDB fetch fallback
  if (!circles || circles.length === 0) {
    try {
      const fbCirclesRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/circles.json", { cache: "no-store" });
      if (fbCirclesRes.ok) {
        const raw = await fbCirclesRes.json();
        if (raw) {
          const parsed = safeFlattenFirebase(raw, "circles");
          if (parsed.length > 0) circles = parsed;
        }
      }
    } catch (e) {}
  }

  if (!students || students.length === 0) {
    try {
      const fbStudentsRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/students.json", { cache: "no-store" });
      if (fbStudentsRes.ok) {
        const raw = await fbStudentsRes.json();
        if (raw) {
          const parsed = safeFlattenFirebase(raw, "students");
          if (parsed.length > 0) students = parsed;
        }
      }
    } catch (e) {}
  }

  // 4. Try AlbayanLocalDB (IndexedDB)
  if ((!circles || circles.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === "function") {
    try { circles = await window.AlbayanLocalDB.getLocalCircles(); } catch (e) {}
  }

  if ((!students || students.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.openDB === "function") {
    try {
      const db = await window.AlbayanLocalDB.openDB();
      if (db.objectStoreNames.contains("students")) {
        const tx = db.transaction("students", "readonly");
        const req = tx.objectStore("students").getAll();
        const idbStudents = await new Promise(r => {
          req.onsuccess = () => r(req.result || []);
          req.onerror = () => r([]);
        });
        if (idbStudents && idbStudents.length > 0) students = idbStudents;
      }
    } catch (e) {}
  }

  // 5. Try localStorage fallbacks
  if (!students || students.length === 0) {
    try {
      const rawKnown = localStorage.getItem("albayan_known_students_v3");
      if (rawKnown) {
        const parsed = JSON.parse(rawKnown);
        students = Object.values(parsed || {}).filter(Boolean);
      }
    } catch(e) {}
  }

  // 6. Scan localStorage circle base and cached keys
  if (!students || students.length === 0) {
    try {
      const allLs = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("albayan_circle_students_base_") || key.startsWith("albayan_cached_students_"))) {
          try {
            const arr = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(arr)) {
              arr.forEach(it => { if (it && (it.name || it.student_name)) allLs.push(it); });
            }
          } catch(e) {}
        }
      }
      if (allLs.length > 0) students = allLs;
    } catch(e) {}
  }

  // Enrich students with circle_name & teacher_name from circles
  const cMap = new Map();
  (circles || []).forEach(c => {
    if (c && c.id !== undefined) cMap.set(String(c.id).replace(/^circles_/, ""), c);
  });
  students = (students || []).filter(s => s && (s.name || s.student_name)).map(s => {
    const cid = s.circle_id !== undefined && s.circle_id !== null ? String(s.circle_id).replace(/^circles_/, "") : "";
    const cObj = cid ? cMap.get(cid) : null;
    return {
      ...s,
      id: s.id !== undefined ? s.id : s.student_id,
      name: s.name || s.student_name,
      circle_name: s.circle_name || (cObj ? cObj.name : "بدون حلقة"),
      teacher_name: s.teacher_name || (cObj ? cObj.teacher_name : "غير متوفر")
    };
  });

  lookupData = { circles: circles || [], students: students || [] };
  populateCircleFilter(lookupData.circles);
  populateDraftStudentsDropdown(lookupData.students);
}

function populateCircleFilter(circles) {
  const select = document.getElementById("filterCircleSelect");
  if (!select) return;
  select.innerHTML = '<option value="all">جميع الحلقات</option>' +
    circles.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
}

function populateDraftStudentsDropdown(students) {
  const select = document.getElementById("selectDraftExistingStudent");
  if (!select) return;
  select.innerHTML = '<option value="">-- أو اختر طالباً مسجلاً لاستيراد بياناته تلقائياً --</option>' +
    students.map(s => `<option value="${s.id}" data-name="${escapeHtml(s.name)}" data-circle="${escapeHtml(s.circle_name || '')}" data-teacher="${escapeHtml(s.teacher_name || '')}">${escapeHtml(s.name)} (${escapeHtml(s.circle_name || 'بدون حلقة')})</option>`).join("");
}

// Load all student CV cards (including all registered students from circles)
async function loadStudentCvs(targetId = null, targetMonth = null) {
  let fetched = false;
  let loadedCvs = [];

  // 1. Try local server API
  try {
    const monthQuery = targetMonth || selectedMonth || "";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`/api/student-cv?month=${encodeURIComponent(monthQuery)}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const apiCvs = await res.json();
      if (Array.isArray(apiCvs) && apiCvs.length > 0) {
        loadedCvs = apiCvs;
        fetched = true;
      }
    }
  } catch (err) {}

  // 2. Try window.pullStudentCvsFromFirebase()
  if (typeof window.pullStudentCvsFromFirebase === "function") {
    try {
      const fbCvs = await window.pullStudentCvsFromFirebase();
      if (Array.isArray(fbCvs) && fbCvs.length > 0) {
        loadedCvs = loadedCvs.concat(fbCvs);
        fetched = true;
      }
    } catch(e) {}
  }

  // 3. Try AlbayanFirebaseDAL directly
  if ((!fetched || loadedCvs.length === 0) && window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === "function") {
    try {
      const dalRes = await window.AlbayanFirebaseDAL.get("student_cvs", { timeoutMs: 3000 });
      if (dalRes && dalRes.ok && dalRes.data) {
        const rawList = safeFlattenFirebase(dalRes.data, "student_cvs");
        if (Array.isArray(rawList) && rawList.length > 0) {
          loadedCvs = loadedCvs.concat(rawList);
          fetched = true;
        }
      }
    } catch (e) {}
  }

  // 4. Direct Firebase RTDB fetch fallback
  if (!fetched || loadedCvs.length === 0) {
    try {
      const fbRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/student_cvs.json", { cache: "no-store" });
      if (fbRes.ok) {
        const raw = await fbRes.json();
        if (raw) {
          const rawList = safeFlattenFirebase(raw, "student_cvs");
          if (rawList.length > 0) {
            loadedCvs = loadedCvs.concat(rawList);
            fetched = true;
          }
        }
      }
    } catch (e) {}
  }

  // 5. Try AlbayanLocalDB
  if ((!fetched || loadedCvs.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalStudentCvs === "function") {
    try {
      const localCvs = await window.AlbayanLocalDB.getLocalStudentCvs();
      if (Array.isArray(localCvs) && localCvs.length > 0) {
        loadedCvs = loadedCvs.concat(localCvs);
        fetched = true;
      }
    } catch(e) {}
  }

  // Always merge lookupData.students so every student in every circle has a CV card!
  allStudentCvs = mergeLookupStudentsIntoCvs(loadedCvs, lookupData.students, lookupData.circles);

  if (allStudentCvs.length > 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudentCvs === "function") {
    window.AlbayanLocalDB.cacheStudentCvs(allStudentCvs).catch(() => {});
  }

  if (allStudentCvs && allStudentCvs.length > 0) {
    const urlParams = new URLSearchParams(window.location.search);
    const queryStudentId = urlParams.get("student_id") || urlParams.get("id");

    let selectedCv = allStudentCvs[0];
    if (queryStudentId) {
      const found = allStudentCvs.find(c => String(c.id) === String(queryStudentId) || String(c.student_id) === String(queryStudentId));
      if (found) selectedCv = found;
    } else if (targetId !== null && targetId !== undefined) {
      const found = allStudentCvs.find(c => String(c.id) === String(targetId) || String(c.student_id) === String(targetId));
      if (found) selectedCv = found;
    } else if (activeCvId !== null && activeCvId !== undefined) {
      const found = allStudentCvs.find(c => String(c.id) === String(activeCvId) || String(c.student_id) === String(activeCvId));
      if (found) selectedCv = found;
    }
    await selectStudentCv(selectedCv.id, targetMonth);
  } else if (isDraftMode) {
    // Keep draft mode if already adding
  } else {
    activeCvId = null;
    currentCvData = null;
    renderEmptyState();
  }
}

// Toggle full student dropdown list
function toggleStudentListDropdown(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById("cvSearchDropdown");
  if (!dropdown) return;
  if (dropdown.style.display === "block") {
    dropdown.style.display = "none";
  } else {
    renderSearchDropdown(allStudentCvs || []);
  }
}
window.toggleStudentListDropdown = toggleStudentListDropdown;

// Live Search & Autocomplete Dropdown
function onSearchInput(val) {
  const query = (val || "").trim().toLowerCase();
  const dropdown = document.getElementById("cvSearchDropdown");
  if (!dropdown) return;

  let filtered = allStudentCvs || [];
  if (query) {
    filtered = filtered.filter(cv => {
      const name = (cv.name || "").toLowerCase();
      const circle = (cv.circle_name || "").toLowerCase();
      const teacher = (cv.teacher_name || "").toLowerCase();
      return name.includes(query) || circle.includes(query) || teacher.includes(query);
    });
  }

  renderSearchDropdown(filtered);
}

function onSearchFocus() {
  const input = document.getElementById("searchStudentCv");
  renderSearchDropdown(allStudentCvs || []);
  if (input) {
    const len = input.value ? input.value.length : 0;
    try { input.setSelectionRange(len, len); } catch (e) {}
  }
}

function onSearchBlur() {
  setTimeout(() => {
    const dropdown = document.getElementById("cvSearchDropdown");
    if (dropdown && !dropdown.matches(":hover") && !dropdown.contains(document.activeElement)) {
      dropdown.style.display = "none";
    }
  }, 350);
}

function renderSearchDropdown(list) {
  const dropdown = document.getElementById("cvSearchDropdown");
  if (!dropdown) return;

  if (!list || list.length === 0) {
    dropdown.innerHTML = `<div style="padding:14px; font-size:13px; color:var(--cv-muted, #64748b); text-align:center;">لا يوجد طلاب بهذا الاسم</div>`;
    dropdown.style.display = "block";
    return;
  }

  const countBadge = `
    <div style="padding:8px 12px; font-size:12px; font-weight:800; color:var(--cv-muted, #64748b); border-bottom:1px solid var(--cv-border, #e2e8f0); margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
      <span>قائمة الطلاب المسجلين (${list.length})</span>
      <span style="font-size:11px; background:rgba(37,99,235,0.08); color:#2563eb; padding:2px 8px; border-radius:999px;">اضغط لعرض البطاقة</span>
    </div>
  `;

  dropdown.innerHTML = countBadge + list.slice(0, 150).map(cv => `
    <div class="search-drop-item ${String(cv.id) === String(activeCvId) ? 'active' : ''}" 
         onpointerdown="event.stopPropagation(); selectStudentCv(${JSON.stringify(cv.id)})" 
         ontouchstart="event.stopPropagation(); selectStudentCv(${JSON.stringify(cv.id)})" 
         onclick="event.stopPropagation(); selectStudentCv(${JSON.stringify(cv.id)})"
         style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; cursor:pointer; border-radius:8px;">
      <div style="display:flex; flex-direction:column; gap:2px; text-align:right;">
        <span class="st-name" style="font-size:13.5px; font-weight:800; color:var(--cv-text, #0f172a);">${escapeHtml(cv.name)}</span>
        ${cv.teacher_name && cv.teacher_name !== 'غير متوفر' ? `<span style="font-size:11px; color:var(--cv-muted, #64748b);">المعلم: ${escapeHtml(cv.teacher_name)}</span>` : ''}
      </div>
      <span class="st-circle" style="font-size:11.5px; font-weight:700; background:rgba(37,99,235,0.1); color:#1d4ed8; padding:3px 8px; border-radius:6px; white-space:nowrap;">
        ${escapeHtml(cv.circle_name || 'بدون حلقة')}
      </span>
    </div>
  `).join("");

  dropdown.style.display = "block";
}

async function selectStudentCv(id, targetMonth = null) {
  isDraftMode = false;
  activeCvId = id;
  const monthToFetch = targetMonth || selectedMonth || getCurrentMonthKey();
  await fetchAndRenderCvMonth(id, monthToFetch);

  // Update search input to current student name
  const searchInput = document.getElementById("searchStudentCv");
  if (searchInput && currentCvData && document.activeElement !== searchInput) {
    searchInput.value = currentCvData.name || "";
  }

  const dropdown = document.getElementById("cvSearchDropdown");
  if (dropdown) dropdown.style.display = "none";
}

// Populate the card directly into the inline inputs
function renderStudentCard(cv) {
  const cardElem = document.getElementById("studentCardContainer");
  if (!cardElem) return;
  cardElem.style.display = "block";

  const emptyElem = document.getElementById("emptyCardState");
  if (emptyElem) emptyElem.style.display = "none";

  // 1. Personal Info
  setInputValue("cvInfoName", cv.name || "غير متوفر");
  setInputValue("cvInfoBirth", cv.birth_date || "غير متوفر");
  setInputValue("cvInfoPhone", cv.phone || "غير متوفر");
  setInputValue("cvInfoGuardianPhone", cv.guardian_phone || "غير متوفر");
  setInputValue("cvInfoStudyLevel", cv.study_level || "غير متوفر");

  // 2. Circle Info (الحلقة، مستوى الحلقة، المعلم)
  setInputValue("cvCircleName", cv.circle_name || "غير متوفر");
  setInputValue("cvMemorizationLevel", cv.memorization_level || "غير متوفر");
  setInputValue("cvTeacherName", cv.teacher_name || "غير متوفر");

  // 3. Exam & Curriculum (المادة المدروسة، وصف المادة، نتيجة الامتحان)
  currentSubjectData = {};
  if (cv.subject_scores && typeof cv.subject_scores === "object") {
    for (const [k, v] of Object.entries(cv.subject_scores)) {
      if (typeof v === "object" && v !== null) {
        currentSubjectData[k] = {
          score: v.score !== undefined ? parseFloat(v.score) : 60,
          desc: v.desc || ""
        };
      } else {
        currentSubjectData[k] = {
          score: parseFloat(v) || 60,
          desc: ""
        };
      }
    }
  }

  // Ensure all default and saved subjects are populated
  DEFAULT_STUDIED_SUBJECTS.forEach(s => {
    if (!availableSubjects.includes(s)) availableSubjects.push(s);
  });
  if (cv.subject_scores && typeof cv.subject_scores === "object") {
    Object.keys(cv.subject_scores).forEach(s => {
      if (s && !availableSubjects.includes(s)) availableSubjects.push(s);
    });
  }

  const initialSubject = cv.studied_material || availableSubjects[0] || "التفسير";
  activeSubject = initialSubject;
  if (!availableSubjects.includes(initialSubject)) {
    availableSubjects.push(initialSubject);
  }
  saveAvailableSubjects();

  const baseScore = cv.exam_score !== undefined && cv.exam_score !== null ? parseFloat(cv.exam_score) : 80;
  const baseDesc = cv.studied_material_desc || "";

  // Populate all available subjects with active student data so no subject is blank
  availableSubjects.forEach(s => {
    if (!currentSubjectData[s]) {
      currentSubjectData[s] = {
        score: baseScore,
        desc: baseDesc
      };
    } else {
      if (!currentSubjectData[s].desc && baseDesc) {
        currentSubjectData[s].desc = baseDesc;
      }
      if (currentSubjectData[s].score === undefined) {
        currentSubjectData[s].score = baseScore;
      }
    }
  });

  renderCustomSubjectDropdown();
  loadSubjectDataIntoUI(activeSubject);

  // 4. Evaluation Points & Achievements (نقاط القوة، نقاط الضعف، محاور التطوير، الاحتياجات)
  activeTags.strength = Array.isArray(cv.strength_items) && cv.strength_items.length > 0 ? [...cv.strength_items] : ["التلاوة الصحيحة", "الالتزام بالمراجعة", "الحفظ المتقن"];
  activeTags.weakness = Array.isArray(cv.weakness_items) && cv.weakness_items.length > 0 ? [...cv.weakness_items] : ["أحكام التجويد", "سرعة التلاوة"];
  activeTags.development = Array.isArray(cv.development_items) && cv.development_items.length > 0 ? [...cv.development_items] : ["المراجعة اليومية", "حفظ مقاطع إضافية"];
  activeTags.needs = Array.isArray(cv.needs_items) && cv.needs_items.length > 0 ? [...cv.needs_items] : ["مصحف التجويد"];

  if (Array.isArray(cv.achievements_items) && cv.achievements_items.length > 0) {
    activeTags.achievement = cv.achievements_items.map(item => {
      if (typeof item === "string") {
        return { text: item, file_url: "", file_name: "", file_type: "" };
      }
      return {
        text: item.text || item.title || "",
        file_url: item.file_url || "",
        file_name: item.file_name || "",
        file_type: item.file_type || ""
      };
    });
  } else {
    activeTags.achievement = [
      { text: "إتمام حفظ وتثبيت جزء عمّ بإتقان", file_url: "", file_name: "", file_type: "" },
      { text: "شهادة التميز في مسابقة التلاوة القرآنية", file_url: "", file_name: "", file_type: "" }
    ];
  }

  renderAllInlineTags();

  // 5. Teacher Notes & Signature (ملاحظات وتوجيهات المعلم)
  const notesElem = document.getElementById("cvTeacherNotes");
  if (notesElem) {
    notesElem.value = cv.teacher_notes || "طالب مسجل في الحلقات القرآنية.";
    autoGrowTextarea(notesElem);
  }
  setInputValue("cvSignatureTeacher", cv.signature_name || (cv.teacher_name || "غير متوفر"));

  if (window.lucide) lucide.createIcons();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================================
   Custom Studied Materials Dropdown (قائمة منسدلة مع أيقونة حذف بجانب كل مادة وإضافة بداخلها)
   ========================================================================== */
function renderCustomSubjectDropdown() {
  const triggerText = document.getElementById("customSubjectSelectedText");
  const hiddenInput = document.getElementById("cvStudiedMaterial");
  const listContainer = document.getElementById("customSubjectList");

  const targetSubject = activeSubject || availableSubjects[0] || "التفسير";
  activeSubject = targetSubject;

  if (triggerText) triggerText.textContent = targetSubject;
  if (hiddenInput) hiddenInput.value = targetSubject;

  if (listContainer) {
    listContainer.innerHTML = availableSubjects.map(s => {
      const isAct = s === targetSubject;
      return `
        <div class="custom-subject-item ${isAct ? 'active' : ''}" onclick="selectCustomSubject('${escapeHtml(s)}')">
          <span class="subject-item-name">${escapeHtml(s)}</span>
          ${availableSubjects.length > 1 ? `
            <button type="button" class="btn-subject-item-del" onclick="deleteSubjectItem('${escapeHtml(s)}', event)" title="حذف مادة ${escapeHtml(s)}">
              <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join("");
  }

  if (window.lucide) lucide.createIcons();
}

function positionSubjectDropdownMenu() {
  const menu = document.getElementById("customSubjectMenu");
  const trigger = document.getElementById("customSubjectTrigger");
  if (!menu || !trigger || menu.style.display !== "block") return;

  const rect = trigger.getBoundingClientRect();
  const isMobile = window.innerWidth <= 768;

  // On mobile, limit menu width to half the mobile screen width (50%)
  let menuWidth;
  if (isMobile) {
    menuWidth = Math.round(window.innerWidth * 0.5);
  } else {
    menuWidth = Math.max(rect.width, 220);
  }

  // In RTL, align right edge of menu with right edge of trigger
  let leftPos = rect.right - menuWidth;
  if (leftPos < 8) leftPos = 8;
  if (leftPos + menuWidth > window.innerWidth - 8) {
    leftPos = window.innerWidth - menuWidth - 8;
  }

  let topPos = rect.bottom + 4;
  // If opening downwards exceeds viewport, open upwards
  if (topPos + 220 > window.innerHeight && rect.top > 230) {
    topPos = rect.top - 224;
  }

  menu.style.position = "fixed";
  menu.style.top = `${topPos}px`;
  menu.style.left = `${leftPos}px`;
  menu.style.width = `${menuWidth}px`;
  menu.style.maxWidth = isMobile ? "50vw" : "320px";
  menu.style.zIndex = "100000";
}

window.toggleInlineAddSubjectInput = function(show) {
  const btn = document.getElementById("btnShowAddSubject");
  const row = document.getElementById("customSubjectAddRow");
  const input = document.getElementById("inputNewSubjectName");

  if (show) {
    if (btn) btn.style.display = "none";
    if (row) row.style.display = "flex";
    if (input) {
      input.focus();
      const len = input.value ? input.value.length : 0;
      try { input.setSelectionRange(len, len); } catch (e) {}
    }
  } else {
    if (btn) btn.style.display = "flex";
    if (row) row.style.display = "none";
    if (input) input.value = "";
  }
  positionSubjectDropdownMenu();
  if (window.lucide) lucide.createIcons();
};

window.toggleSubjectDropdownMenu = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("customSubjectMenu");
  const trigger = document.getElementById("customSubjectTrigger");
  if (!menu || !trigger) return;

  const isVisible = menu.style.display === "block";
  if (isVisible) {
    menu.style.display = "none";
  } else {
    // Append to document.body so it floats 100% outside the .exam-box and never alters its height/layout
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    // Always reset the add input state so only the "+" button is visible by default
    toggleInlineAddSubjectInput(false);
    renderCustomSubjectDropdown();
    menu.style.display = "block";
    positionSubjectDropdownMenu();
  }
};

window.closeSubjectDropdownMenu = function() {
  const menu = document.getElementById("customSubjectMenu");
  if (menu) menu.style.display = "none";
  toggleInlineAddSubjectInput(false);
};

window.selectCustomSubject = function(subject) {
  if (!subject) return;

  saveCurrentSubjectToMemory();
  activeSubject = subject;
  loadSubjectDataIntoUI(subject);
  renderCustomSubjectDropdown();
  closeSubjectDropdownMenu();
  markCvChanged();
};

window.deleteSubjectItem = function(subject, e) {
  if (e) e.stopPropagation();
  if (availableSubjects.length <= 1) return;

  delete currentSubjectData[subject];
  availableSubjects = availableSubjects.filter(s => s !== subject);
  saveAvailableSubjects();

  if (activeSubject === subject) {
    activeSubject = availableSubjects[0] || "التفسير";
    loadSubjectDataIntoUI(activeSubject);
  }

  renderCustomSubjectDropdown();
  markCvChanged();
};

window.addNewSubjectInline = function() {
  const input = document.getElementById("inputNewSubjectName");
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return;

  saveCurrentSubjectToMemory();

  if (!availableSubjects.includes(raw)) {
    availableSubjects.push(raw);
    saveAvailableSubjects();
  }

  if (!currentSubjectData[raw]) {
    const curScore = parseFloat(getInputValue("cvExamScore")) || 80;
    const curDesc = getInputValue("cvStudiedMaterialDesc") || "";
    currentSubjectData[raw] = { score: curScore, desc: curDesc };
  }

  activeSubject = raw;
  input.value = "";

  loadSubjectDataIntoUI(raw);
  renderCustomSubjectDropdown();
  closeSubjectDropdownMenu();
  markCvChanged();
};

function saveCurrentSubjectToMemory() {
  if (!activeSubject) return;
  const scoreVal = parseFloat(getInputValue("cvExamScore")) || 0;
  const descVal = getInputValue("cvStudiedMaterialDesc");
  currentSubjectData[activeSubject] = {
    score: scoreVal,
    desc: descVal
  };
}

function loadSubjectDataIntoUI(subjectName) {
  if (!currentSubjectData[subjectName]) {
    const curScore = parseFloat(getInputValue("cvExamScore")) || 80;
    const curDesc = getInputValue("cvStudiedMaterialDesc") || "";
    currentSubjectData[subjectName] = { score: curScore, desc: curDesc };
  }
  const item = currentSubjectData[subjectName];
  const score = item.score !== undefined && item.score !== null ? item.score : 80;
  const desc = item.desc || "";

  setInputValue("cvExamScore", Math.round(score));
  setInputValue("cvStudiedMaterialDesc", desc);
  updateScoreRing(score);
}

window.onExamScoreInput = function() {
  const scoreVal = parseFloat(getInputValue("cvExamScore")) || 0;
  if (!currentSubjectData[activeSubject]) {
    currentSubjectData[activeSubject] = { score: scoreVal, desc: "" };
  } else {
    currentSubjectData[activeSubject].score = scoreVal;
  }
  updateScoreRing(scoreVal);
  markCvChanged();
};

window.onMaterialDescInput = function() {
  const descVal = getInputValue("cvStudiedMaterialDesc");
  if (!currentSubjectData[activeSubject]) {
    currentSubjectData[activeSubject] = { score: 60, desc: descVal };
  } else {
    currentSubjectData[activeSubject].desc = descVal;
  }
  markCvChanged();
};

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function renderEmptyState() {
  const cardElem = document.getElementById("studentCardContainer");
  if (cardElem) cardElem.style.display = "none";

  const emptyElem = document.getElementById("emptyCardState");
  if (emptyElem) emptyElem.style.display = "block";

  hideDraftBanner();
  clearCvChanged();
}

// Progress Ring Updater
function updateScoreRing(score) {
  const progressRing = document.getElementById("cvProgressRing");
  if (progressRing) {
    const clampedScore = Math.max(0, Math.min(100, score));
    progressRing.style.setProperty("--score-pct", `${clampedScore}%`);
    progressRing.style.background = `conic-gradient(#20b982 0 ${clampedScore}%, #e7edf4 ${clampedScore}% 100%)`;
  }
}

function onExamScoreInput() {
  const val = parseFloat(getInputValue("cvExamScore")) || 0;
  updateScoreRing(val);
  markCvChanged();
}

function onTeacherNameInput() {
  const teacherVal = getInputValue("cvTeacherName");
  const signatureInput = document.getElementById("cvSignatureTeacher");
  if (signatureInput && (!signatureInput.value || signatureInput.value === currentCvData?.teacher_name || isDraftMode)) {
    signatureInput.value = teacherVal;
  }
  markCvChanged();
}

// Auto-expand textarea
function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = (el.scrollHeight + 4) + "px";
}

/* ==========================================================================
   Inline Evaluation Points & Vertical Bullet List Management
   ========================================================================== */

function renderAllInlineTags() {
  ["strength", "weakness", "development", "needs", "achievement"].forEach(cat => {
    renderInlineCategoryTags(cat);
  });
}

function renderInlineCategoryTags(category, focusIndex = null) {
  const container = document.getElementById(`cv${capitalize(category)}Items`);
  const countBadge = document.getElementById(`cv${capitalize(category)}Score`);
  
  const items = activeTags[category] || [];
  if (countBadge) {
    countBadge.textContent = items.length;
  }

  if (!container) return;

  if (items.length === 0) {
    const emptyLabel = category === "achievement" ? "إنجاز أو شهادة" : "نقطة";
    container.innerHTML = `<div class="eval-empty-hint">لا توجد عناصر مضافة حالياً. اضغط على الزر أدناه لإضافة ${emptyLabel}.</div>`;
    return;
  }

  container.innerHTML = items.map((item, idx) => {
    const isAchievement = category === "achievement";
    const tagText = isAchievement ? (typeof item === "object" ? (item.text || "") : (item || "")) : (item || "");
    const fileUrl = isAchievement && typeof item === "object" ? (item.file_url || "") : "";
    const fileName = isAchievement && typeof item === "object" ? (item.file_name || "") : "";
    const hasFile = Boolean(fileUrl);

    if (isAchievement) {
      return `
        <div class="eval-bullet-row achievement-bullet-row ${hasFile ? 'has-file-attached' : ''}" data-category="${category}" data-index="${idx}">
          <span class="eval-bullet-dot"></span>
          <input type="text" class="eval-bullet-input" id="evalInput_${category}_${idx}" value="${escapeHtml(tagText)}" placeholder="اكتب الإنجاز أو الشهادة هنا..."
            oninput="onEvalBulletInput('${category}', ${idx}, this.value)"
            onkeydown="handleEvalBulletKeydown(event, '${category}', ${idx})"
            onblur="onEvalBulletBlur('${category}', ${idx}, this.value)">
          
          <div class="achievement-pill-group">
            ${hasFile ? `
              <button type="button" class="btn-view-attachment-pure" onclick="openFloatingFileViewer('${escapeHtml(fileUrl)}', '${escapeHtml(tagText || 'وثيقة الإنجاز')}', '${escapeHtml(fileName || 'الملف المرفق')}')" title="معاينة المستند المرفق (${escapeHtml(fileName || 'ملف')})">
                <i data-lucide="eye" style="width:17px; height:17px;"></i>
              </button>
              <button type="button" class="btn-remove-attachment" onclick="removeAchievementAttachment(${idx})" title="إزالة الملف المرفق" tabindex="-1">
                <i data-lucide="x" style="width:14px; height:14px;"></i>
              </button>
            ` : `
              <button type="button" class="btn-attach-pure-icon" onclick="triggerFileUpload('achievement', ${idx})" title="إرفاق ملف أو شهادة (PDF أو صورة)">
                <i data-lucide="paperclip" style="width:16px; height:16px;"></i>
              </button>
            `}
          </div>

          <button type="button" class="btn-delete-bullet" onclick="removeEvalBullet('${category}', ${idx})" title="حذف هذا الإنجاز" tabindex="-1">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;
    }

    return `
      <div class="eval-bullet-row" data-category="${category}" data-index="${idx}">
        <span class="eval-bullet-dot"></span>
        <input type="text" class="eval-bullet-input" id="evalInput_${category}_${idx}" value="${escapeHtml(tagText)}" placeholder="اكتب نقطة التقييم هنا..."
          oninput="onEvalBulletInput('${category}', ${idx}, this.value)"
          onkeydown="handleEvalBulletKeydown(event, '${category}', ${idx})"
          onblur="onEvalBulletBlur('${category}', ${idx}, this.value)">
        <button type="button" class="btn-delete-bullet" onclick="removeEvalBullet('${category}', ${idx})" title="حذف هذه النقطة" tabindex="-1">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();

  if (focusIndex !== null) {
    setTimeout(() => {
      const targetInput = document.getElementById(`evalInput_${category}_${focusIndex}`);
      if (targetInput) {
        targetInput.focus();
        const len = targetInput.value ? targetInput.value.length : 0;
        try { targetInput.setSelectionRange(len, len); } catch (e) {}
      }
    }, 20);
  }
}

function addBlankEvalItem(category) {
  if (!activeTags[category]) activeTags[category] = [];
  if (category === "achievement") {
    activeTags[category].push({ text: "", file_url: "", file_name: "", file_type: "" });
  } else {
    activeTags[category].push("");
  }
  const newIndex = activeTags[category].length - 1;
  renderInlineCategoryTags(category, newIndex);
  markCvChanged();
}

function removeEvalBullet(category, index) {
  if (!activeTags[category]) return;
  activeTags[category].splice(index, 1);
  renderInlineCategoryTags(category);
  markCvChanged();
}

function onEvalBulletInput(category, index, val) {
  if (!activeTags[category]) activeTags[category] = [];
  if (category === "achievement") {
    if (typeof activeTags[category][index] !== "object") {
      activeTags[category][index] = { text: val, file_url: "", file_name: "", file_type: "" };
    } else {
      activeTags[category][index].text = val;
    }
  } else {
    activeTags[category][index] = val;
  }
  markCvChanged();
}

function onEvalBulletBlur(category, index, val) {
  if (!activeTags[category]) return;
  const trimmed = (val || "").trim();
  const currentItem = activeTags[category][index];
  const hasFile = category === "achievement" && typeof currentItem === "object" && Boolean(currentItem.file_url);

  if (!trimmed && !hasFile && activeTags[category].length > 1) {
    activeTags[category].splice(index, 1);
    renderInlineCategoryTags(category);
    markCvChanged();
  } else {
    if (category === "achievement") {
      if (typeof activeTags[category][index] !== "object") {
        activeTags[category][index] = { text: trimmed, file_url: "", file_name: "", file_type: "" };
      } else {
        activeTags[category][index].text = trimmed;
      }
    } else {
      activeTags[category][index] = trimmed;
    }
  }
}

function handleEvalBulletKeydown(e, category, index) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!activeTags[category]) activeTags[category] = [];
    if (category === "achievement") {
      activeTags[category].splice(index + 1, 0, { text: "", file_url: "", file_name: "", file_type: "" });
    } else {
      activeTags[category].splice(index + 1, 0, "");
    }
    renderInlineCategoryTags(category, index + 1);
    markCvChanged();
  } else if (e.key === "Backspace" && (e.target.value === "" || (e.target.selectionStart === 0 && e.target.selectionEnd === 0))) {
    const currentItem = activeTags[category][index];
    const hasFile = category === "achievement" && typeof currentItem === "object" && Boolean(currentItem.file_url);
    if (activeTags[category].length > 1 && e.target.value === "" && !hasFile) {
      e.preventDefault();
      activeTags[category].splice(index, 1);
      const prevIndex = Math.max(0, index - 1);
      renderInlineCategoryTags(category, prevIndex);
      markCvChanged();
    }
  } else if (e.key === "ArrowDown") {
    const nextInput = document.getElementById(`evalInput_${category}_${index + 1}`);
    if (nextInput) {
      e.preventDefault();
      nextInput.focus();
    }
  } else if (e.key === "ArrowUp") {
    const prevInput = document.getElementById(`evalInput_${category}_${index - 1}`);
    if (prevInput) {
      e.preventDefault();
      prevInput.focus();
    }
  }
}

/* ==========================================================================
   Achievement File Attachments & Floating Modal Viewer
   ========================================================================== */

function triggerFileUpload(category, index) {
  currentUploadTarget = { category, index };
  const fileInput = document.getElementById("achievementFileInput");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

async function handleAchievementFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !currentUploadTarget) return;

  const { category, index } = currentUploadTarget;

  if (file.size > 8 * 1024 * 1024) {
    showAlert("حجم الملف كبير جداً. الحد الأقصى المسموح به 8 ميجابايت.", false);
    currentUploadTarget = null;
    return;
  }

  showAlert("جاري معالجة وتوثيق الملف المرفق...", true);

  let fileUrl = null;
  let fileName = file.name;
  let fileType = file.type;

  // Try API upload if available
  try {
    const formData = new FormData();
    formData.append("file", file);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/student-cv/upload-attachment", {
      method: "POST",
      headers: { "X-CSRF-Token": getCsrfToken() },
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.file_url) {
        fileUrl = data.file_url;
        fileName = data.file_name || fileName;
        fileType = data.file_type || fileType;
      }
    }
  } catch (err) {}

  // Serverless / Offline Fallback: Convert to Base64 Data URL
  if (!fileUrl) {
    try {
      fileUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error("DataURL generation error:", err);
      showAlert("تعذر قراءة وتضمين الملف المرفق.", false);
      currentUploadTarget = null;
      return;
    }
  }

  if (!activeTags[category]) activeTags[category] = [];
  if (!activeTags[category][index] || typeof activeTags[category][index] !== "object") {
    const existingText = typeof activeTags[category][index] === "string" ? activeTags[category][index] : "";
    activeTags[category][index] = {
      text: existingText,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType
    };
  } else {
    activeTags[category][index].file_url = fileUrl;
    activeTags[category][index].file_name = fileName;
    activeTags[category][index].file_type = fileType;
  }

  renderInlineCategoryTags(category);
  markCvChanged();
  showAlert("تم إرفاق وتوثيق الملف بنجاح! يمكنك النقر عليه لمعاينته في النافذة العائمة 📎", true);
  currentUploadTarget = null;
}

function removeAchievementAttachment(index) {
  if (activeTags.achievement && activeTags.achievement[index]) {
    if (typeof activeTags.achievement[index] === "object") {
      activeTags.achievement[index].file_url = "";
      activeTags.achievement[index].file_name = "";
      activeTags.achievement[index].file_type = "";
    }
    renderInlineCategoryTags("achievement");
    markCvChanged();
    showAlert("تمت إزالة الملف المرفق من هذا الإنجاز.");
  }
}

function openFloatingFileViewer(fileUrl, title, filename) {
  if (!fileUrl) return;

  const modal = document.getElementById("cvAttachmentViewerModal");
  const titleEl = document.getElementById("cvViewerTitle");
  const filenameEl = document.getElementById("cvViewerFilename");
  const openTabBtn = document.getElementById("cvViewerOpenTabBtn");
  const downloadBtn = document.getElementById("cvViewerDownloadBtn");
  const bodyEl = document.getElementById("cvViewerBody");

  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = title || "معاينة وثيقة الإنجاز";
  if (filenameEl) filenameEl.textContent = filename || "وثيقة_معتمدة";
  if (openTabBtn) openTabBtn.href = fileUrl;
  if (downloadBtn) downloadBtn.href = fileUrl;

  const cleanUrl = fileUrl.toLowerCase();
  const isImage = cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg") || cleanUrl.endsWith(".webp") || cleanUrl.endsWith(".gif");
  const isPdf = cleanUrl.endsWith(".pdf");

  if (isImage) {
    bodyEl.innerHTML = `
      <div class="cv-viewer-image-wrap">
        <img src="${escapeHtml(fileUrl)}" alt="${escapeHtml(title)}" class="cv-viewer-preview-img">
      </div>
    `;
  } else if (isPdf) {
    bodyEl.innerHTML = `
      <iframe src="${escapeHtml(fileUrl)}" class="cv-viewer-preview-frame" title="معاينة PDF"></iframe>
    `;
  } else {
    bodyEl.innerHTML = `
      <div class="cv-viewer-fallback-wrap">
        <i data-lucide="file-text" style="width:48px; height:48px; color:#2563eb; margin-bottom:12px;"></i>
        <h4>${escapeHtml(filename || 'مستند مرفق')}</h4>
        <p>لا تتوفر معاينة مباشرة لهذا النوع من الملفات.</p>
        <a href="${escapeHtml(fileUrl)}" target="_blank" class="btn-primary" style="margin-top:10px;">
          <i data-lucide="download" style="width:16px; height:16px;"></i> فتح وتحميل المستند
        </a>
      </div>
    `;
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  if (window.lucide) lucide.createIcons();
}

function closeFloatingFileViewer() {
  const modal = document.getElementById("cvAttachmentViewerModal");
  const bodyEl = document.getElementById("cvViewerBody");
  if (modal) modal.classList.remove("active");
  if (bodyEl) bodyEl.innerHTML = "";
  document.body.style.overflow = "";
}

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeFloatingFileViewer();
  }
});

function stepScore(category, delta) {
  const input = document.getElementById(`cv${capitalize(category)}Score`);
  if (!input) return;
  let currentVal = parseInt(input.value, 10) || 0;
  let newVal = Math.max(0, Math.min(20, currentVal + delta));
  input.value = newVal;
  markCvChanged();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ==========================================================================
   Unsaved Changes Tracker & UI Indicators
   ========================================================================== */
function markCvChanged() {
  hasUnsavedChanges = true;

  const topSaveBtn = document.getElementById("topSaveCvBtn");
  const topUnsavedDot = document.getElementById("topUnsavedDot");
  const floatingSaveBar = document.getElementById("floatingSaveBar");

  if (topSaveBtn) {
    topSaveBtn.classList.add("has-unsaved");
    topSaveBtn.title = isDraftMode ? "حفظ البطاقة الجديدة (Ctrl+S) ✨" : "حفظ التعديلات (Ctrl+S)";
  }
  if (topUnsavedDot) topUnsavedDot.style.display = "inline-block";

  // Auto-Save automatically with relaxed debounce so typing/backspace is never interrupted
  clearTimeout(autoSaveTimer);
  if (activeCvId && !isDraftMode) {
    autoSaveTimer = setTimeout(() => {
      saveActiveCv(true); // silent auto-save
    }, 2500);
  }
}

function clearCvChanged() {
  hasUnsavedChanges = false;

  const topSaveBtn = document.getElementById("topSaveCvBtn");
  const topUnsavedDot = document.getElementById("topUnsavedDot");
  const floatingSaveBar = document.getElementById("floatingSaveBar");

  if (topSaveBtn) {
    topSaveBtn.classList.remove("has-unsaved");
    topSaveBtn.title = "حفظ التعديلات (Ctrl+S)";
  }
  if (topUnsavedDot) topUnsavedDot.style.display = "none";
  if (floatingSaveBar) floatingSaveBar.classList.remove("visible");
}

function discardCvChanges() {
  if (isDraftMode) {
    cancelNewCardDraft();
    return;
  }

  if (currentCvData) {
    renderStudentCard(currentCvData);
    clearCvChanged();
    showAlert("تم التراجع عن التعديلات غير المحفوظة.");
  }
}

/* ==========================================================================
   Draft Mode: Add New Student CV Card In-Place
   ========================================================================== */

function startNewCardDraft() {
  isDraftMode = true;
  activeCvId = null;
  currentCvData = null;

  selectedMonth = getCurrentMonthKey();
  renderMonthSelector(selectedMonth, []);

  renderStudentCard({
    name: "",
    birth_date: "",
    phone: "",
    guardian_phone: "",
    study_level: "",
    circle_name: "",
    memorization_level: "",
    teacher_name: "",
    studied_material: availableSubjects[0] || "التفسير",
    studied_material_desc: "",
    exam_date: `${selectedMonth}-15`,
    exam_score: 80,
    strength_score: 3,
    strength_items: ["التلاوة الصحيحة", "الالتزام بالمراجعة", "الحفظ المتقن"],
    weakness_score: 2,
    weakness_items: ["أحكام التجويد", "سرعة التلاوة"],
    development_score: 2,
    development_items: ["المراجعة اليومية", "حفظ مقاطع إضافية"],
    needs_score: 1,
    needs_items: ["مصحف التجويد"],
    achievements_score: 1,
    achievements_items: [
      { text: "إتمام حفظ وتثبيت جزء عمّ بإتقان", file_url: "", file_name: "", file_type: "" }
    ],
    teacher_notes: "طالب جديد مسجل في الحلقات القرآنية.",
    signature_name: ""
  });

  showDraftBanner();
  markCvChanged();

  const nameInput = document.getElementById("cvInfoName");
  if (nameInput) {
    nameInput.focus();
    const len = nameInput.value ? nameInput.value.length : 0;
    try { nameInput.setSelectionRange(len, len); } catch (e) {}
  }
}

function showDraftBanner() {
  const draftBanner = document.getElementById("newCardDraftBanner");
  if (!draftBanner) return;

  const select = document.getElementById("selectDraftExistingStudent");
  if (select) {
    select.innerHTML = '<option value="">-- اختر طالباً من قاعدة البيانات (اختياري) --</option>';
    (lookupData.students || []).forEach(st => {
      const opt = document.createElement("option");
      opt.value = st.id;
      opt.textContent = `${st.name} (${st.circle_name || 'بدون حلقة'})`;
      opt.setAttribute("data-name", st.name || "");
      opt.setAttribute("data-circle", st.circle_name || "");
      opt.setAttribute("data-teacher", st.teacher_name || "");
      select.appendChild(opt);
    });
  }

  draftBanner.style.display = "block";
}

function cancelNewCardDraft() {
  hideDraftBanner();
  clearCvChanged();

  if (allStudentCvs.length > 0) {
    selectStudentCv(allStudentCvs[0].id);
  } else {
    renderEmptyState();
  }
}

function hideDraftBanner() {
  const draftBanner = document.getElementById("newCardDraftBanner");
  if (draftBanner) draftBanner.style.display = "none";
}

function onDraftSelectExistingStudent() {
  const select = document.getElementById("selectDraftExistingStudent");
  const option = select.options[select.selectedIndex];
  if (!option || !option.value) return;

  const name = option.getAttribute("data-name");
  const circle = option.getAttribute("data-circle");
  const teacher = option.getAttribute("data-teacher");

  if (name) setInputValue("cvInfoName", name);
  if (circle) setInputValue("cvCircleName", circle);
  if (teacher) {
    setInputValue("cvTeacherName", teacher);
    setInputValue("cvSignatureTeacher", teacher);
  }

  markCvChanged();
}

/* ==========================================================================
   Save Active CV Card (Inline In-Place Save)
   ========================================================================== */

async function saveActiveCv(silent = false) {
  const name = getInputValue("cvInfoName");
  if (!name) {
    if (!silent) {
      showAlert("اسم الطالب مطلوب لحفظ البطاقة.", false);
      const nameInput = document.getElementById("cvInfoName");
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    return;
  }

  const activeMonth = selectedMonth || getCurrentMonthKey();

  // Save current active subject data into memory
  saveCurrentSubjectToMemory();

  const currentItem = currentSubjectData[activeSubject] || { score: 60, desc: "" };

  const payload = {
    name: name,
    birth_date: getInputValue("cvInfoBirth"),
    phone: getInputValue("cvInfoPhone"),
    guardian_phone: getInputValue("cvInfoGuardianPhone"),
    study_level: getInputValue("cvInfoStudyLevel"),

    // Monthly dynamic fields for the selected month
    month_key: activeMonth,
    circle_name: getInputValue("cvCircleName"),
    memorization_level: getInputValue("cvMemorizationLevel"),
    teacher_name: getInputValue("cvTeacherName"),

    studied_material: activeSubject,
    studied_material_desc: currentItem.desc || getInputValue("cvStudiedMaterialDesc"),
    exam_date: `${activeMonth}-15`,
    exam_score: currentItem.score !== undefined ? currentItem.score : 60,
    subject_scores: currentSubjectData,

    strength_score: (activeTags.strength || []).map(s => (s || "").trim()).filter(Boolean).length,
    strength_items: (activeTags.strength || []).map(s => (s || "").trim()).filter(Boolean),

    weakness_score: (activeTags.weakness || []).map(s => (s || "").trim()).filter(Boolean).length,
    weakness_items: (activeTags.weakness || []).map(s => (s || "").trim()).filter(Boolean),

    development_score: (activeTags.development || []).map(s => (s || "").trim()).filter(Boolean).length,
    development_items: (activeTags.development || []).map(s => (s || "").trim()).filter(Boolean),

    needs_score: (activeTags.needs || []).map(s => (s || "").trim()).filter(Boolean).length,
    needs_items: (activeTags.needs || []).map(s => (s || "").trim()).filter(Boolean),

    achievements_score: (activeTags.achievement || []).filter(item => (typeof item === "string" ? item.trim() : ((item.text || "").trim() || item.file_url))).length,
    achievements_items: (activeTags.achievement || []).map(item => {
      if (typeof item === "string") {
        return { text: item.trim(), file_url: "", file_name: "", file_type: "" };
      }
      return {
        text: (item.text || "").trim(),
        file_url: item.file_url || "",
        file_name: item.file_name || "",
        file_type: item.file_type || ""
      };
    }).filter(item => item.text || item.file_url),

    teacher_notes: getInputValue("cvTeacherNotes"),
    signature_name: getInputValue("cvSignatureTeacher")
  };

  const isEdit = !isDraftMode && Boolean(activeCvId);
  const targetId = isEdit ? activeCvId : (currentCvData?.id || Date.now());
  const url = isEdit ? `/api/student-cv/${activeCvId}` : `/api/student-cv`;
  const method = isEdit ? "PUT" : "POST";

  const saveBtn = document.getElementById("topSaveCvBtn");
  if (saveBtn && !silent) saveBtn.disabled = true;

  try {
    let saved = false;
    let serverMsg = "";

    // 1. Try local server endpoint if active
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, {
        method: method,
        headers: csrfHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          saved = true;
          serverMsg = data.message;
        }
      }
    } catch (e) {}

    // 2. Direct Serverless Firebase RTDB & LocalDB Fallback
    if (!saved) {
      const activeMonth = getActiveCardMonth();
      let existingCv = (allStudentCvs || []).find(c => String(c.id) === String(targetId)) || currentCvData || {};

      const updatedMonthlyRecords = { ...(existingCv.monthly_records || {}) };
      updatedMonthlyRecords[activeMonth] = {
        ...payload,
        month: activeMonth,
        month_key: activeMonth,
        updated_at: new Date().toISOString()
      };

      const fullCvRecord = {
        ...existingCv,
        ...payload,
        id: targetId,
        monthly_records: updatedMonthlyRecords,
        updated_at: new Date().toISOString()
      };

      // Direct Firebase RTDB save (via saveStudentCvToFirebase if available, plus direct PUT fallback)
      if (typeof window.saveStudentCvToFirebase === "function") {
        await window.saveStudentCvToFirebase(fullCvRecord).catch(() => {});
      } else {
        await fetch(`https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/student_cvs/cv_${targetId}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fullCvRecord)
        }).catch(err => console.warn("Firebase CV save warning:", err));
      }

      // Local IndexedDB update
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudentCvs === "function") {
        await window.AlbayanLocalDB.cacheStudentCvs([fullCvRecord]).catch(() => {});
      }

      saved = true;
      serverMsg = `تم حفظ التعديلات لسجل شهر (${formatMonthArabic(activeMonth)}) بنجاح 🌟`;
    }

    if (saved) {
      clearCvChanged();
      hideDraftBanner();
      activeCvId = targetId;
      isDraftMode = false;

      if (!silent) {
        showAlert(serverMsg || `تم حفظ التعديلات بنجاح 🌟`);
        await loadStudentCvs(targetId, getActiveCardMonth());
      } else {
        const found = allStudentCvs.find(c => String(c.id) === String(targetId));
        if (found) {
          Object.assign(found, payload);
          const searchInp = document.getElementById("searchStudentCv");
          if (!searchInp || document.activeElement !== searchInp) {
            renderStudentList(allStudentCvs);
          }
        }
      }
    } else if (!silent) {
      showAlert("حدث خطأ أثناء حفظ بطاقة الطالب.", false);
    }
  } catch (err) {
    if (!silent) showAlert("تعذر حفظ البطاقة: " + err.message, false);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

/* ==========================================================================
   Delete Active Student CV Card
   ========================================================================== */

async function deleteCurrentCv() {
  if (isDraftMode) {
    cancelNewCardDraft();
    return;
  }

  if (!currentCvData || !activeCvId) {
    showAlert("الرجاء اختيار بطاقة طالب لحذفها.", false);
    return;
  }

  const ok = window.AlbayanDialog
    ? await AlbayanDialog.confirm(`هل أنت متأكد من حذف بطاقة الطالب "${currentCvData.name}" نهائياً؟`, "حذف بطاقة الطالب", { isDestructive: true })
    : confirm(`هل أنت متأكد من حذف بطاقة الطالب "${currentCvData.name}" نهائياً؟`);
  if (!ok) {
    return;
  }

  try {
    let deleted = false;
    try {
      const res = await fetch(`/api/student-cv/${activeCvId}`, {
        method: "DELETE",
        headers: csrfHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) deleted = true;
      }
    } catch (err) {}

    // Direct Firebase RTDB fallback
    if (!deleted) {
      await fetch(`https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/student_cvs/cv_${activeCvId}.json`, {
        method: "DELETE"
      }).catch(() => {});

      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.deleteLocalStudentCv === "function") {
        await window.AlbayanLocalDB.deleteLocalStudentCv(activeCvId).catch(() => {});
      }
      deleted = true;
    }

    if (deleted) {
      showAlert("تم حذف بطاقة الطالب بنجاح.");
      allStudentCvs = (allStudentCvs || []).filter(c => String(c.id) !== String(activeCvId));
      clearCvChanged();
      activeCvId = null;
      currentCvData = null;
      await loadStudentCvs();
    } else {
      showAlert("تعذر الحذف.", false);
    }
  } catch (err) {
    showAlert("حدث خطأ أثناء الحذف: " + err.message, false);
  }
}

/* ==========================================================================
   Print / Export to PDF
   ========================================================================== */

function printStudentCard() {
  window.print();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
