// CSRF Token Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function csrfHeaders(extra = {}) {
  return Object.assign({ "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() }, extra);
}

// Safe Lucide icon renderer
function safeCreateIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn("Lucide createIcons warning:", e);
    }
  }
}

let currentUserData = null;

// Draft state inside the Quranic Cycle modal before pressing "حفظ وتطبيق النظام"
let draftCycleConfig = null;

document.addEventListener("DOMContentLoaded", async () => {
  initAppTheme();
  initViewModeSettings();
  initFontSettings();
  initLastBackupInfo();
  initToggles();
  initRecordPeriodSettings();
  safeCreateIcons();

  try {
    await loadUserProfile();
  } catch (err) {
    console.warn("Profile load fallback:", err);
  }

  // Silent background Firebase sync (no UI settings shown)
  runBackgroundCloudSync();

  window.addEventListener("albayan:cycle-updated", () => {
    refreshRecordPeriodBadgesAndDraft(false);
  });

  window.addEventListener("albayan:cycle-archived", () => {
    refreshRecordPeriodBadgesAndDraft(true);
    renderCycleArchivesPreview();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllSheets();
    }
  });

  safeCreateIcons();
});

function runBackgroundCloudSync() {
  try {
    if (window.AlbayanCycleEngine && typeof window.AlbayanCycleEngine.pullFromCloud === "function") {
      window.AlbayanCycleEngine.pullFromCloud().then(() => {
        refreshRecordPeriodBadgesAndDraft(false);
        renderCycleArchivesPreview();
      }).catch(() => {});
    }
    if (typeof window.flushPendingQueueToFirebase === "function") {
      window.flushPendingQueueToFirebase().catch(() => {});
    }
  } catch (e) {}
}

/* =========================================================================
   1. Bottom Sheets & Modals Controller
   ========================================================================= */
function openSheet(sheetId) {
  closeAllSheets();
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById("sheetBackdrop");
  if (!sheet) return;

  sheet.classList.add("active");
  if (backdrop) backdrop.classList.add("active");
  document.body.style.overflow = "hidden";
  safeCreateIcons();
}

function closeSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById("sheetBackdrop");
  if (sheet) sheet.classList.remove("active");

  const anyActive = document.querySelector(".bottom-sheet.active");
  if (!anyActive) {
    if (backdrop) backdrop.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function closeAllSheets() {
  document.querySelectorAll(".bottom-sheet").forEach(sheet => {
    sheet.classList.remove("active");
  });
  const backdrop = document.getElementById("sheetBackdrop");
  if (backdrop) backdrop.classList.remove("active");
  document.body.style.overflow = "";
}

window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.closeAllSheets = closeAllSheets;

/* =========================================================================
   2. Alert Toast Banner
   ========================================================================= */
function showAlert(msg, isOk = true) {
  const box = document.getElementById("alertMsg");
  if (!box) return;
  box.textContent = msg;
  box.className = `alert-box ${isOk ? "ok" : "err"}`;
  box.style.display = "block";
  clearTimeout(showAlert._timer);
  showAlert._timer = setTimeout(() => {
    box.style.display = "none";
  }, 3800);
}

/* =========================================================================
   3. Toggles & Theme Switcher (Dark / Light Mode)
   ========================================================================= */
function initToggles() {
  const notifToggle = document.getElementById("notificationsToggle");
  if (notifToggle) {
    notifToggle.checked = localStorage.getItem("appNotifications") !== "false";
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const savedTheme = localStorage.getItem("appTheme") || "light";
    themeToggle.checked = (savedTheme === "dark");
  }
}

function handleNotificationsToggle(input) {
  const enabled = input.checked;
  localStorage.setItem("appNotifications", enabled ? "true" : "false");
  showAlert(enabled ? "تم تفعيل الإشعارات والتنبيهات" : "تم كتم الإشعارات مؤقتاً", true);
}

function handleThemeToggle(input) {
  setAppTheme(input.checked ? "dark" : "light");
}

function initAppTheme() {
  const savedTheme = localStorage.getItem("appTheme") || "light";
  applyTheme(savedTheme, false);
}

function setAppTheme(theme) {
  applyTheme(theme, true);
}

function applyTheme(theme, notify = true) {
  localStorage.setItem("appTheme", theme);
  document.documentElement.setAttribute("data-theme", theme);

  if (theme === "dark") {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
    document.body.classList.remove("dark-theme");
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) themeToggle.checked = (theme === "dark");

  const themeIcon = document.getElementById("themeRowIcon");
  if (themeIcon) {
    themeIcon.setAttribute("data-lucide", theme === "dark" ? "moon" : "sun");
  }

  safeCreateIcons();
  if (typeof window.albayanSyncStatusBar === "function") {
    window.albayanSyncStatusBar(theme);
  }

  if (notify) {
    showAlert(theme === "dark" ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري", true);
  }
}

window.handleNotificationsToggle = handleNotificationsToggle;
window.handleThemeToggle = handleThemeToggle;
window.setAppTheme = setAppTheme;

/* =========================================================================
   4. Circles View Mode Settings
   ========================================================================= */
function getViewModeLabel(mode) {
  if (mode === "grid") return "شبكة مضغوطة";
  if (mode === "details") return "قائمة صفوف";
  return "لوحات تفصيلية";
}

function initViewModeSettings() {
  const currentMode = localStorage.getItem("circlesViewMode") || "boards";
  document.querySelectorAll('input[name="circles_view"]').forEach(r => {
    const card = r.closest(".view-mode-card");
    const active = (r.value === currentMode);
    r.checked = active;
    if (card) card.classList.toggle("active", active);
  });
  const badge = document.getElementById("currentViewModeBadge");
  if (badge) badge.textContent = getViewModeLabel(currentMode);
}

window.saveViewMode = function(mode) {
  localStorage.setItem("circlesViewMode", mode);
  document.querySelectorAll('input[name="circles_view"]').forEach(r => {
    const card = r.closest(".view-mode-card");
    const active = (r.value === mode);
    r.checked = active;
    if (card) card.classList.toggle("active", active);
  });
  const badge = document.getElementById("currentViewModeBadge");
  if (badge) badge.textContent = getViewModeLabel(mode);

  showAlert("تم حفظ طريقة عرض الحلقات بنجاح", true);
  setTimeout(() => closeSheet("sheet-view-mode"), 450);
};

/* =========================================================================
   5. Typography & Font System Handlers
   ========================================================================= */
function initFontSettings() {
  const currentFont = localStorage.getItem("appFontFamily") || "Cairo";
  updateFontBadgeUI(currentFont);
  updateFontCardsUI(currentFont);
  updateCustomFontStatusUI();
}

function updateFontBadgeUI(fontKey) {
  const badge = document.getElementById("currentFontFamilyBadge");
  if (!badge) return;
  const map = {
    "Cairo": "خط كايرو",
    "Tajawal": "خط تجوال",
    "Alexandria": "خط الإسكندرية",
    "Amiri": "خط أميري",
    "Almarai": "خط المراعي",
    "custom": "خط مخصص"
  };
  badge.textContent = map[fontKey] || fontKey;
}

function updateFontCardsUI(fontKey) {
  document.querySelectorAll(".font-select-card").forEach(card => {
    const key = card.dataset.font;
    const radio = card.querySelector('input[type="radio"]');
    const isMatch = (key === fontKey);
    card.classList.toggle("active", isMatch);
    if (radio) radio.checked = isMatch;
  });
}

function formatCustomFontDisplayName(rawName) {
  const withoutExt = String(rawName || "").replace(/\.(ttf|otf|woff2?)$/i, "").trim();
  const arabicOnly = withoutExt.replace(/[a-zA-Z0-9_\-\.]+/g, " ").replace(/\s+/g, " ").trim();
  return arabicOnly || "خط مخصص من الجهاز";
}

function updateCustomFontStatusUI() {
  const customData = localStorage.getItem("appCustomFontData");
  const customName = formatCustomFontDisplayName(localStorage.getItem("appCustomFontName"));
  const customSize = localStorage.getItem("appCustomFontSize") || "";
  const customContainer = document.getElementById("customFontActiveBox");
  const emptyContainer = document.getElementById("customFontEmptyBox");
  const customCard = document.getElementById("customFontSelectCard");

  if (customData) {
    if (customContainer) customContainer.style.display = "flex";
    if (emptyContainer) emptyContainer.style.display = "none";
    if (customCard) customCard.style.display = "flex";

    const nameEl = document.getElementById("customFontFileName");
    if (nameEl) nameEl.textContent = customName;
    const sizeEl = document.getElementById("customFontFileSize");
    if (sizeEl) sizeEl.textContent = customSize;
    const badgeNameEl = document.getElementById("customFontBadgeName");
    if (badgeNameEl) badgeNameEl.textContent = customName;
  } else {
    if (customContainer) customContainer.style.display = "none";
    if (emptyContainer) emptyContainer.style.display = "block";
    if (customCard) customCard.style.display = "none";
  }
}

window.selectAppFont = function(fontKey) {
  if (typeof window.applyAppFont === "function") {
    window.applyAppFont(fontKey);
  } else {
    localStorage.setItem("appFontFamily", fontKey);
  }
  updateFontBadgeUI(fontKey);
  updateFontCardsUI(fontKey);

  const fontNames = {
    "Cairo": "خط كايرو",
    "Tajawal": "خط تجوال",
    "Alexandria": "خط الإسكندرية",
    "Amiri": "خط أميري",
    "Almarai": "خط المراعي",
    "custom": "الخط المخصص"
  };
  showAlert(`تم تفعيل ${fontNames[fontKey] || fontKey} عبر المنظومة`, true);
};

window.handleCustomFontUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (file.size > 4 * 1024 * 1024) {
    showAlert("حجم ملف الخط يتجاوز 4 ميغابايت، يرجى اختيار ملف أصغر.", false);
    return;
  }

  const ext = file.name.split('.').pop().toLowerCase();
  let format = 'truetype';
  if (ext === 'otf') format = 'opentype';
  else if (ext === 'woff') format = 'woff';
  else if (ext === 'woff2') format = 'woff2';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const dataUrl = e.target.result;
      const sizeStr = (file.size / 1024).toFixed(1) + " كيلوبايت";
      localStorage.setItem("appCustomFontData", dataUrl);
      localStorage.setItem("appCustomFontName", file.name);
      localStorage.setItem("appCustomFontFormat", format);
      localStorage.setItem("appCustomFontSize", sizeStr);

      if (typeof window.registerCustomFontFace === "function") {
        window.registerCustomFontFace(dataUrl, format);
      }

      window.selectAppFont("custom");
      updateCustomFontStatusUI();
    } catch (err) {
      showAlert("تعذر حفظ الخط في الجهاز.", false);
    }
  };
  reader.readAsDataURL(file);
};

window.removeCustomFont = function() {
  if (!confirm("هل تريد حذف الخط المخصص والعودة للخط الافتراضي؟")) return;
  localStorage.removeItem("appCustomFontData");
  localStorage.removeItem("appCustomFontName");
  localStorage.removeItem("appCustomFontFormat");
  localStorage.removeItem("appCustomFontSize");

  const customStyle = document.getElementById("albayan-custom-font-style");
  if (customStyle) customStyle.remove();

  window.selectAppFont("Cairo");
  updateCustomFontStatusUI();
};

/* =========================================================================
   6. User Profile Loading & Clean Email/Meta Display
   ========================================================================= */
function isValidFullEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(val || "").trim());
}

async function loadUserProfile() {
  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://') || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));
  let fetchedData = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    const res = await fetch("/api/account/profile", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      if (res.status === 401 && !isStandalone) {
        window.location.href = "login.html";
        return;
      }
      throw new Error("Local profile unavailable");
    }
    fetchedData = await res.json();
    currentUserData = fetchedData.user;
  } catch (err) {
    let username = "مسؤول النظام";
    let role = "admin";
    let email = "";
    try {
      const cached = localStorage.getItem("albayan_logged_user");
      if (cached) {
        const u = JSON.parse(cached);
        if (u && u.username) username = u.username;
        if (u && u.role) role = u.role;
        if (u && u.email) email = u.email;
      }
    } catch (e) {}
    currentUserData = {
      username,
      role,
      email,
      is_superadmin: role === "admin" ? 1 : 0
    };
  }

  const username = (currentUserData && currentUserData.username) || "مسؤول النظام";
  const heroUser = document.getElementById("heroUsername");
  const userInput = document.getElementById("usernameInput");
  const initialsEl = document.getElementById("profileInitials");
  const metaEl = document.getElementById("heroUserMeta");

  if (heroUser) heroUser.textContent = username;
  if (userInput) userInput.value = username;
  if (initialsEl) initialsEl.textContent = username.trim().charAt(0).toUpperCase() || "م";

  // Hide incomplete email/handle like "admin@" or "@admin" unless it is a valid full email
  if (metaEl) {
    const candidateEmail = currentUserData && currentUserData.email;
    if (isValidFullEmail(candidateEmail)) {
      metaEl.textContent = candidateEmail.trim();
      metaEl.style.display = "block";
    } else {
      metaEl.textContent = "";
      metaEl.style.display = "none";
    }
  }

  const isSuper = currentUserData.is_superadmin === 1;
  const role = currentUserData.role || "teacher";
  let roleText = "معلم قرآن كريم";
  if (isSuper) {
    roleText = "مدير النظام";
  } else if (role === "admin") {
    roleText = "مشرف وإدارة";
  } else if (role === "supervisor") {
    roleText = "مشرف تربوي";
  }

  const badgeEl = document.getElementById("heroRoleBadge");
  if (badgeEl) {
    badgeEl.textContent = roleText;
    badgeEl.className = "profile-role-pill";
  }

  if (fetchedData && fetchedData.settings && window.AlbayanCycleEngine) {
    const remoteType = fetchedData.settings.record_period_type;
    if (remoteType) {
      await window.AlbayanCycleEngine.saveConfig({
        periodType: window.AlbayanCycleEngine.normalizePeriodType(remoteType)
      }, { localOnly: true });
    }
  }
  refreshRecordPeriodBadgesAndDraft(false);
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const btn = document.getElementById("btnSaveProfile");
  const username = (document.getElementById("usernameInput")?.value || "").trim();
  if (!username) {
    showAlert("يرجى كتابة الاسم المطلوب.", false);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px;"></i><span>جاري الحفظ...</span>`;
  safeCreateIcons();

  let savedRemote = false;
  try {
    const res = await fetch("/api/account/update-profile", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (res.ok && data.success) savedRemote = true;
  } catch (err) {}

  // Always update local session cache seamlessly for offline/Capacitor mode
  try {
    const cachedRaw = localStorage.getItem("albayan_logged_user");
    const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
    cached.username = username;
    localStorage.setItem("albayan_logged_user", JSON.stringify(cached));
  } catch (e) {}

  if (currentUserData) currentUserData.username = username;
  const heroUser = document.getElementById("heroUsername");
  const initialsEl = document.getElementById("profileInitials");
  if (heroUser) heroUser.textContent = username;
  if (initialsEl) initialsEl.textContent = username.charAt(0).toUpperCase() || "م";

  showAlert(savedRemote ? "تم تحديث الاسم الشخصي بنجاح" : "تم حفظ الاسم الشخصي بنجاح", true);
  setTimeout(() => closeSheet("sheet-profile"), 550);

  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="check" style="width:17px; height:17px;"></i><span>حفظ وتحديث الاسم</span>`;
  safeCreateIcons();
}

window.handleUpdateProfile = handleUpdateProfile;

/* =========================================================================
   7. Password / Passcode Updates & Visibility
   ========================================================================= */
function checkPasswordMatch() {
  const newPass = document.getElementById("newCodeInput")?.value || "";
  const confirmPass = document.getElementById("confirmCodeInput")?.value || "";
  const msg = document.getElementById("matchMessage");
  if (!msg) return;

  if (!confirmPass) {
    msg.style.display = "none";
    return;
  }

  msg.style.display = "block";
  if (newPass === confirmPass) {
    msg.innerHTML = `<span style="color:#2563EB; font-weight:700;">✓ الرمزان متطابقان</span>`;
  } else {
    msg.innerHTML = `<span style="color:#DC2626; font-weight:700;">الرمزان غير متطابقين</span>`;
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<i data-lucide="eye-off" style="width:17px; height:17px;"></i>';
  } else {
    input.type = "password";
    btn.innerHTML = '<i data-lucide="eye" style="width:17px; height:17px;"></i>';
  }
  safeCreateIcons();
}

async function handleChangeCode(e) {
  e.preventDefault();
  const btn = document.getElementById("btnSaveCode");
  const current_code = (document.getElementById("currentCodeInput")?.value || "").trim();
  const new_code = (document.getElementById("newCodeInput")?.value || "").trim();
  const confirm_code = (document.getElementById("confirmCodeInput")?.value || "").trim();

  if (!current_code || !new_code || !confirm_code) {
    showAlert("يرجى تعبئة كافة الحقول.", false);
    return;
  }
  if (new_code !== confirm_code) {
    showAlert("الرمز الجديد وتأكيده غير متطابقين.", false);
    return;
  }
  if (new_code.length < 4) {
    showAlert("يجب أن لا يقل الرمز عن 4 خانات.", false);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px;"></i><span>جاري التحديث...</span>`;
  safeCreateIcons();

  let updated = false;
  try {
    const res = await fetch("/api/account/change-code", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ current_code, new_code, confirm_code })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      updated = true;
    } else if (data && data.message) {
      showAlert(data.message, false);
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="lock" style="width:17px; height:17px;"></i><span>تحديث الرمز السرّي</span>`;
      safeCreateIcons();
      return;
    }
  } catch (err) {
    // Offline/Cloud fallback via AlbayanFirebaseDAL for matching current user
    try {
      const cachedRaw = localStorage.getItem("albayan_logged_user");
      const cachedUser = cachedRaw ? JSON.parse(cachedRaw) : null;
      if (cachedUser && cachedUser.id && window.AlbayanFirebaseDAL) {
        const uRes = await window.AlbayanFirebaseDAL.get(`users/${cachedUser.id}`);
        if (uRes && uRes.ok && uRes.data) {
          const cloudUser = uRes.data;
          if (!cloudUser.passcode || String(cloudUser.passcode) === current_code || String(cloudUser.password || "") === current_code) {
            await window.AlbayanFirebaseDAL.put(`users/${cachedUser.id}/passcode`, new_code);
            updated = true;
          } else {
            showAlert("الرمز السرّي الحالي غير صحيح.", false);
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="lock" style="width:17px; height:17px;"></i><span>تحديث الرمز السرّي</span>`;
            safeCreateIcons();
            return;
          }
        }
      }
    } catch (fbErr) {}
  }

  if (updated) {
    localStorage.setItem("hasChangedPassword", "true");
    document.getElementById("currentCodeInput").value = "";
    document.getElementById("newCodeInput").value = "";
    document.getElementById("confirmCodeInput").value = "";
    const msg = document.getElementById("matchMessage");
    if (msg) msg.style.display = "none";
    showAlert("تم تحديث الرمز السرّي بنجاح", true);
    setTimeout(() => closeSheet("sheet-password"), 650);
  } else {
    showAlert("تعذر التحقق من الخادم لتحديث الرمز حالياً.", false);
  }

  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="lock" style="width:17px; height:17px;"></i><span>تحديث الرمز السرّي</span>`;
  safeCreateIcons();
}

window.checkPasswordMatch = checkPasswordMatch;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleChangeCode = handleChangeCode;

/* =========================================================================
   8. Quranic Record Cycle Configuration (مدة ونظام السجل القرآني)
   ========================================================================= */
function getCycleEngineSafe() {
  return window.AlbayanCycleEngine || null;
}

function initRecordPeriodSettings() {
  refreshRecordPeriodBadgesAndDraft(true);
  renderCycleArchivesPreview();
}

function refreshRecordPeriodBadgesAndDraft(resetDraft = false) {
  const eng = getCycleEngineSafe();
  if (!eng) return;
  const cfg = eng.getConfig();
  if (!draftCycleConfig || resetDraft) {
    draftCycleConfig = { ...cfg };
  }
  const stats = eng.computeCycleStats(cfg);

  const badge = document.getElementById("currentRecordPeriodBadge");
  if (badge) {
    badge.textContent = stats.config.periodType === "term"
      ? `فصلي (${stats.config.termMonths || 3} أشهر)`
      : stats.meta.badge;
  }
  const subtitle = document.getElementById("recordPeriodSubtitle");
  if (subtitle) {
    subtitle.textContent = `السنة الحالية #${cfg.yearNumber || cfg.cycleIndex || 1} • متبقي ${stats.remainingDays} يوماً`;
  }

  renderCycleSheetUI(draftCycleConfig);
}

function openRecordPeriodSheet() {
  const eng = getCycleEngineSafe();
  if (eng) {
    draftCycleConfig = { ...eng.getConfig() };
    renderCycleSheetUI(draftCycleConfig);
    renderCycleArchivesPreview();
  }
  openSheet("sheet-record-period");
}

function formatArabicTermMonthsLabel(m) {
  return m === 2 ? "شهران (2)" : `${m} أشهر`;
}

function renderCycleSheetUI(cfg) {
  const eng = getCycleEngineSafe();
  if (!eng || !cfg) return;
  const stats = eng.computeCycleStats(cfg);
  const yearNum = stats.config.yearNumber || stats.config.cycleIndex || 1;
  const termMonths = stats.config.termMonths || 3;

  // Duration option buttons
  document.querySelectorAll("#cycleDurationGrid .cycle-duration-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.period === stats.config.periodType);
  });

  // Dynamic Custom Semester Month Count (shown when فصلي / term is selected)
  const termBlock = document.getElementById("termMonthsControlBlock");
  if (termBlock) {
    termBlock.style.display = (stats.config.periodType === "term") ? "block" : "none";
  }
  const termLabel = document.getElementById("termMonthsValueLabel");
  if (termLabel) {
    termLabel.textContent = formatArabicTermMonthsLabel(termMonths);
  }
  document.querySelectorAll(".term-month-chip").forEach(chip => {
    chip.classList.toggle("active", Number(chip.dataset.months) === termMonths);
  });

  // Start Date picker & Hijri preview
  const dateInput = document.getElementById("cycleStartDateInput");
  if (dateInput && dateInput.value !== stats.startDate) {
    dateInput.value = stats.startDate;
  }

  const hijriHint = document.getElementById("cycleHijriStartHint");
  if (hijriHint) {
    if (window.HijriDate && typeof window.HijriDate.formatDualDate === "function") {
      const dual = window.HijriDate.formatDualDate(stats.startDate);
      hijriHint.textContent = dual.hijri || "";
    } else {
      hijriHint.textContent = stats.startDate;
    }
  }

  // Live progress bar & labels
  const modeLabel = stats.config.periodType === "term"
    ? `فصلي (${termMonths} أشهر)`
    : stats.meta.badge;
  const pTitle = document.getElementById("cycleProgressTitle");
  if (pTitle) pTitle.textContent = `السنة الحالية #${yearNum} • ${modeLabel}`;

  const remPill = document.getElementById("cycleRemainingBadge");
  if (remPill) {
    remPill.textContent = stats.remainingDays === 0
      ? "انتهت مدة السنة"
      : (stats.remainingDays === 1 ? "متبقي يوم واحد" : `متبقي ${stats.remainingDays} يوماً`);
  }

  const pFill = document.getElementById("cycleProgressFill");
  if (pFill) pFill.style.width = `${stats.progressPct}%`;

  const startTxt = document.getElementById("cycleDatesStartText");
  const endTxt = document.getElementById("cycleDatesEndText");
  if (startTxt) startTxt.textContent = `البداية: ${stats.startDate}`;
  if (endTxt) endTxt.textContent = `النهاية: ${stats.endDate} (${stats.elapsedDays}/${stats.totalDays} يوم)`;
}

function selectCyclePeriodType(periodType) {
  if (!draftCycleConfig) {
    const eng = getCycleEngineSafe();
    draftCycleConfig = eng ? { ...eng.getConfig() } : { mode: "monthly", periodType: "monthly", termMonths: 3, startDate: "", endAction: "archive_reset" };
  }
  draftCycleConfig.mode = periodType;
  draftCycleConfig.periodType = periodType;
  renderCycleSheetUI(draftCycleConfig);
}

function stepTermMonths(delta) {
  if (!draftCycleConfig) {
    const eng = getCycleEngineSafe();
    draftCycleConfig = eng ? { ...eng.getConfig() } : { mode: "term", periodType: "term", termMonths: 3 };
  }
  const curr = parseInt(draftCycleConfig.termMonths || 3, 10) || 3;
  draftCycleConfig.termMonths = Math.max(2, Math.min(6, curr + delta));
  renderCycleSheetUI(draftCycleConfig);
}

function setTermMonths(months) {
  if (!draftCycleConfig) {
    const eng = getCycleEngineSafe();
    draftCycleConfig = eng ? { ...eng.getConfig() } : { mode: "term", periodType: "term", termMonths: 3 };
  }
  draftCycleConfig.termMonths = Math.max(2, Math.min(6, parseInt(months, 10) || 3));
  renderCycleSheetUI(draftCycleConfig);
}

function onCycleStartDateChange(dateStr) {
  if (!dateStr) return;
  if (!draftCycleConfig) {
    const eng = getCycleEngineSafe();
    draftCycleConfig = eng ? { ...eng.getConfig() } : {};
  }
  draftCycleConfig.startDate = dateStr;
  renderCycleSheetUI(draftCycleConfig);
}

async function saveRecordPeriodSettings() {
  const btn = document.getElementById("btnSaveRecordPeriod");
  const eng = getCycleEngineSafe();
  if (!eng) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px;"></i><span>جاري الحفظ...</span>`;
    safeCreateIcons();
  }

  try {
    const payload = {
      ...(draftCycleConfig || eng.getConfig()),
      mode: (draftCycleConfig && (draftCycleConfig.mode || draftCycleConfig.periodType)) || "monthly",
      periodType: (draftCycleConfig && (draftCycleConfig.periodType || draftCycleConfig.mode)) || "monthly",
      endAction: "archive_reset"
    };
    const saved = await eng.saveConfig(payload);
    draftCycleConfig = { ...saved };
    refreshRecordPeriodBadgesAndDraft(true);
    if (typeof window.renderRosterPeriodSelector === "function") {
      window.renderRosterPeriodSelector(saved);
    }
    showAlert("تم حفظ وتطبيق مدة السجل بنجاح", true);
    setTimeout(() => closeSheet("sheet-record-period"), 550);
  } catch (err) {
    showAlert("حدث خطأ أثناء حفظ إعدادات السجل.", false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check" style="width:17px; height:17px;"></i><span>حفظ وتطبيق النظام</span>`;
      safeCreateIcons();
    }
  }
}

async function handleArchiveCurrentCycleNow() {
  const eng = getCycleEngineSafe();
  const btn = document.getElementById("btnArchiveCycleNow");
  if (!eng) return;

  if (!confirm("سيتم أرشفة درجات الحفظ والمراجعة والحضور للسنة الحالية وبدء سنة جديدة. هل ترغب في المتابعة؟")) {
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px;"></i><span>جاري الأرشفة وبدء السنة الجديدة...</span>`;
    safeCreateIcons();
  }

  try {
    if (draftCycleConfig) {
      await eng.saveConfig(draftCycleConfig);
    }
    const res = await eng.archiveCurrentCycle({ manual: true, resetCounters: true });
    if (res && res.ok) {
      draftCycleConfig = { ...res.config };
      refreshRecordPeriodBadgesAndDraft(true);
      renderCycleArchivesPreview();
      showAlert(`تم إغلاق وأرشفة السنة #${res.archive.cycleNumber} بنجاح وبدأت السنة الجديدة`, true);
    } else {
      showAlert("تعذر إتمام الأرشفة، يرجى المحاولة مجدداً.", false);
    }
  } catch (err) {
    showAlert("حدث خطأ أثناء أرشفة السنة.", false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="archive" style="width:17px; height:17px;"></i><span>إغلاق السنة الحالية وأرشفتها الآن</span>`;
      safeCreateIcons();
    }
  }
}

function renderCycleArchivesPreview() {
  const eng = getCycleEngineSafe();
  const box = document.getElementById("cycleArchivesPreviewBox");
  const listEl = document.getElementById("cycleArchivesList");
  const countEl = document.getElementById("cycleArchivesCountBadge");
  if (!eng || !box || !listEl) return;

  const archives = eng.getArchives();
  if (!archives || archives.length === 0) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  if (countEl) countEl.textContent = `${archives.length} سنوات`;

  listEl.innerHTML = archives.slice(0, 4).map(a => {
    const s = a.summary || {};
    return `
      <div class="cycle-archive-item">
        <div>
          <strong style="display:block; color:var(--st-text);">${a.periodLabel || ('السنة #' + a.cycleNumber)}</strong>
          <small style="color:var(--st-muted);">${a.startDate || ''} → ${a.endDate || ''}</small>
        </div>
        <span class="row-badge-pill neutral">${s.totalStudents || 0} طالب • ${s.totalMemoPages || 0} وجه</span>
      </div>
    `;
  }).join("");
}

window.initRecordPeriodSettings = initRecordPeriodSettings;
window.openRecordPeriodSheet = openRecordPeriodSheet;
window.selectCyclePeriodType = selectCyclePeriodType;
window.stepTermMonths = stepTermMonths;
window.setTermMonths = setTermMonths;
window.onCycleStartDateChange = onCycleStartDateChange;
window.saveRecordPeriodSettings = saveRecordPeriodSettings;
window.handleArchiveCurrentCycleNow = handleArchiveCurrentCycleNow;

/* =========================================================================
   9. Backup & Restore Data Functions (Desktop API + Offline Bundle Fallback)
   ========================================================================= */
function initLastBackupInfo() {
  const saved = localStorage.getItem("lastBackupTime");
  const sub = document.getElementById("lastBackupSubtitle");
  if (saved && sub) {
    sub.textContent = `آخر نسخة: ${saved}`;
  }
}

async function downloadBackup() {
  const dual = window.HijriDate
    ? window.HijriDate.formatDualDate(new Date())
    : { hijri: new Date().toLocaleDateString('ar-SA'), gregorian: new Date().toISOString().slice(0, 10) };

  localStorage.setItem("lastBackupTime", `${dual.hijri} (${dual.gregorian})`);
  initLastBackupInfo();

  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://');
  if (!isStandalone) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 1500);
      const ping = await fetch("/api/account/profile", { signal: controller.signal });
      clearTimeout(tid);
      if (ping.ok) {
        window.location.href = "/api/account/backup";
        showAlert("جاري تنزيل ملف النسخة الاحتياطية (ZIP)...", true);
        return;
      }
    } catch (e) {}
  }

  // Client-side full backup bundle fallback for Capacitor / Offline
  try {
    const bundle = {
      exportedAt: new Date().toISOString(),
      app: "AlBayanQuranSchool",
      cycleConfig: window.AlbayanCycleEngine ? window.AlbayanCycleEngine.getConfig() : null,
      cycleArchives: window.AlbayanCycleEngine ? window.AlbayanCycleEngine.getArchives() : [],
      localData: {}
    };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !k.startsWith("appCustomFontData")) {
        bundle.localData[k] = localStorage.getItem(k);
      }
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `albayan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
    showAlert("تم تصدير ملف النسخة الاحتياطية بنجاح", true);
  } catch (err) {
    showAlert("تعذر إنشاء النسخة الاحتياطية.", false);
  }
}

function onBackupFileSelected(input) {
  const label = document.getElementById("dropzoneLabel");
  const btn = document.getElementById("btnRestoreBackup");
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (label) label.textContent = `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
    if (btn) btn.disabled = false;
  }
}

window.handleDragOver = function(e) {
  e.preventDefault();
  document.getElementById("fileDropzone")?.classList.add("drag-over");
};

window.handleDragLeave = function() {
  document.getElementById("fileDropzone")?.classList.remove("drag-over");
};

window.handleFileDrop = function(e) {
  e.preventDefault();
  document.getElementById("fileDropzone")?.classList.remove("drag-over");
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const fakeInput = document.getElementById("backupFileInput");
    if (fakeInput) {
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      fakeInput.files = dt.files;
      onBackupFileSelected(fakeInput);
    }
  }
};

async function handleRestoreBackup(e) {
  e.preventDefault();
  const fileInput = document.getElementById("backupFileInput");
  const btn = document.getElementById("btnRestoreBackup");
  const progress = document.getElementById("restoreProgress");
  const pFill = document.getElementById("restoreProgressFill");
  const pPct = document.getElementById("restoreProgressPct");
  const pText = document.getElementById("restoreProgressText");

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showAlert("يرجى اختيار ملف النسخة الاحتياطية أولاً.", false);
    return;
  }

  const file = fileInput.files[0];
  if (!confirm("سيتم استعادة البيانات من الملف المختار. هل ترغب بالمتابعة؟")) return;

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px;"></i><span>جاري الاستعادة...</span>`;
  safeCreateIcons();
  if (progress) progress.style.display = "block";

  if (file.name.toLowerCase().endsWith(".json")) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed && parsed.localData && typeof parsed.localData === "object") {
        Object.entries(parsed.localData).forEach(([k, v]) => {
          localStorage.setItem(k, v);
        });
      }
      if (pFill) pFill.style.width = "100%";
      if (pPct) pPct.textContent = "100%";
      if (pText) pText.textContent = "اكتملت الاستعادة!";
      showAlert("تمت استعادة النسخة الاحتياطية بنجاح", true);
      setTimeout(() => window.location.reload(), 900);
      return;
    } catch (jsonErr) {
      if (progress) progress.style.display = "none";
      showAlert("ملف JSON غير صالح.", false);
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="refresh-cw" style="width:17px; height:17px;"></i><span>بدء استعادة البيانات الآن</span>`;
      safeCreateIcons();
      return;
    }
  }

  let pct = 10;
  const progressInterval = setInterval(() => {
    pct = Math.min(pct + 12, 85);
    if (pFill) pFill.style.width = `${pct}%`;
    if (pPct) pPct.textContent = `${Math.round(pct)}%`;
  }, 250);

  const formData = new FormData();
  formData.append("backup_file", file);

  try {
    const res = await fetch("/api/account/restore", {
      method: "POST",
      headers: { "X-CSRF-Token": getCsrfToken() },
      body: formData
    });
    const data = await res.json();
    clearInterval(progressInterval);
    if (res.ok && data.success) {
      if (pFill) pFill.style.width = "100%";
      if (pPct) pPct.textContent = "100%";
      if (pText) pText.textContent = "اكتملت الاستعادة!";
      showAlert(data.message || "تمت استعادة النسخة الاحتياطية بنجاح", true);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      if (progress) progress.style.display = "none";
      showAlert(data.message || "فشلت عملية استعادة النسخة.", false);
    }
  } catch (err) {
    clearInterval(progressInterval);
    if (progress) progress.style.display = "none";
    showAlert("تعذّر استعادة الملف، يرجى التأكد من صيغته.", false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="refresh-cw" style="width:17px; height:17px;"></i><span>بدء استعادة البيانات الآن</span>`;
    safeCreateIcons();
  }
}

window.downloadBackup = downloadBackup;
window.onBackupFileSelected = onBackupFileSelected;
window.handleRestoreBackup = handleRestoreBackup;

/* =========================================================================
   10. Auth Logout
   ========================================================================= */
function confirmLogout() {
  if (typeof window.albayanLogout === 'function') {
    return window.albayanLogout();
  }
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
    sessionStorage.clear();
  } catch (e) {}
  fetch("/api/logout", { method: "POST" }).catch(() => {});
  window.location.href = "login.html?logout=1";
}

window.confirmLogout = confirmLogout;
window.logout = confirmLogout;
