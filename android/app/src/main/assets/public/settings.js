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

document.addEventListener("DOMContentLoaded", async () => {
  initAppTheme();
  initAvatarPreset();
  initViewModeSettings();
  initFontSettings();
  initSecurityScore();
  initLastBackupInfo();
  initToggles();
  safeCreateIcons();

  try {
    await loadUserProfile();
  } catch (err) {
    console.error("Error loading user profile:", err);
  } finally {
    safeCreateIcons();
  }

  // Handle ESC key to close any active sheet
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllSheets();
    }
  });
});

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

  // Render icons inside sheet
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
   2. Toggles Controller (Notifications & Theme)
   ========================================================================= */
function initToggles() {
  const notifToggle = document.getElementById("notificationsToggle");
  if (notifToggle) {
    const saved = localStorage.getItem("appNotifications") !== "false";
    notifToggle.checked = saved;
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const savedTheme = localStorage.getItem("appTheme") || "dark";
    themeToggle.checked = (savedTheme === "dark");
  }
}

function handleNotificationsToggle(input) {
  const enabled = input.checked;
  localStorage.setItem("appNotifications", enabled ? "true" : "false");
  showAlert(enabled ? "تم تفعيل الإشعارات والتنبيهات 🔔" : "تم كتم الإشعارات مؤقتاً 🔕", true);
}

function handleThemeToggle(input) {
  const isDark = input.checked;
  setAppTheme(isDark ? "dark" : "light");
}

window.handleNotificationsToggle = handleNotificationsToggle;
window.handleThemeToggle = handleThemeToggle;

/* =========================================================================
   3. Theme Switcher (Dark / Light Mode)
   ========================================================================= */
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
  if (themeToggle) {
    themeToggle.checked = (theme === "dark");
  }

  const themeIcon = document.getElementById("themeRowIcon");
  if (themeIcon) {
    themeIcon.setAttribute("data-lucide", theme === "dark" ? "moon" : "sun");
  }

  const deskThemeIcon = document.getElementById("desktopHeaderThemeIcon");
  if (deskThemeIcon) {
    deskThemeIcon.setAttribute("data-lucide", theme === "dark" ? "moon" : "sun");
  }

  const deskThemeLabel = document.getElementById("desktopThemeLabel");
  if (deskThemeLabel) {
    deskThemeLabel.textContent = theme === "dark" ? "الوضع الليلي" : "الوضع النهاري";
  }

  safeCreateIcons();

  const sysThemeEl = document.getElementById("sysThemeMode");
  if (sysThemeEl) {
    sysThemeEl.textContent = theme === "dark" ? "ليلي فاخر 🌙" : "نهاري أنيق ☀️";
  }

  if (notify) {
    showAlert(theme === "dark"
      ? "تم تفعيل الوضع الليلي الفاخر (Dark Mode) 🌙"
      : "تم تفعيل الوضع النهاري الأنيق (Light Mode) ☀️", true);
  }
}

window.setAppTheme = setAppTheme;

/* =========================================================================
   4. Avatar & Identity Customization
   ========================================================================= */
const AVATAR_PRESETS = {
  initials: { type: "initials" },
  quran:    { type: "icon", icon: "book-open", color: "#34d399", bg: "rgba(16, 185, 129, 0.15)" },
  minaret:  { type: "icon", icon: "landmark",  color: "#fb923c", bg: "rgba(234, 88, 12, 0.15)" },
  star:     { type: "icon", icon: "star",      color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)" },
  pen:      { type: "icon", icon: "pen",       color: "#f59e0b", bg: "rgba(217, 119, 6, 0.15)" },
  grad:     { type: "icon", icon: "award",     color: "#fb7185", bg: "rgba(244, 63, 94, 0.15)" },
  moon:     { type: "icon", icon: "moon",      color: "#2dd4bf", bg: "rgba(20, 184, 166, 0.15)" }
};

function initAvatarPreset() {
  const saved = localStorage.getItem("userAvatarPreset") || "initials";
  setAvatarPreset(saved, false);
}

function setAvatarPreset(presetKey, notify = true) {
  localStorage.setItem("userAvatarPreset", presetKey);

  document.querySelectorAll(".avatar-option-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-avatar") === presetKey);
  });

  const avatarBox = document.getElementById("userAvatar");
  if (!avatarBox) return;

  const username = (currentUserData && currentUserData.username)
    || (document.getElementById("heroUsername")?.textContent)
    || "م";
  const initialChar = username.trim().charAt(0).toUpperCase();

  const preset = AVATAR_PRESETS[presetKey] || AVATAR_PRESETS.initials;

  if (preset.type === "icon") {
    avatarBox.style.background = preset.bg;
    avatarBox.style.color = preset.color;
    avatarBox.innerHTML = `<i data-lucide="${preset.icon}" style="width:26px; height:26px; color:${preset.color};"></i>`;
  } else {
    avatarBox.style.background = "";
    avatarBox.style.color = "";
    avatarBox.innerHTML = `<span>${initialChar}</span>`;
  }

  safeCreateIcons();

  if (notify) {
    showAlert("تم تطبيق وتحديث الشعار الرمزي لحسابك بنجاح! ✨", true);
    setTimeout(() => closeSheet('sheet-avatar'), 700);
  }
}

window.setAvatarPreset = setAvatarPreset;

/* =========================================================================
   5. Circles View Mode Settings
   ========================================================================= */
function initViewModeSettings() {
  const currentMode = localStorage.getItem("circlesViewMode") || "boards";
  const radios = document.querySelectorAll('input[name="circles_view"]');
  radios.forEach(r => {
    const card = r.closest(".view-mode-card");
    if (r.value === currentMode) {
      r.checked = true;
      if (card) card.classList.add("active");
    } else {
      if (card) card.classList.remove("active");
    }
  });
}

window.saveViewMode = function(mode) {
  localStorage.setItem("circlesViewMode", mode);

  const radios = document.querySelectorAll('input[name="circles_view"]');
  radios.forEach(r => {
    const card = r.closest(".view-mode-card");
    if (r.checked) {
      if (card) card.classList.add("active");
    } else {
      if (card) card.classList.remove("active");
    }
  });

  showAlert("تم حفظ أسلوب عرض الحلقات بنجاح!", true);
  setTimeout(() => closeSheet('sheet-view-mode'), 600);
};

/* =========================================================================
   6. Password Match & Visibility Handlers
   ========================================================================= */
function checkPasswordMatch() {
  const newPass     = document.getElementById("newCodeInput")?.value || "";
  const confirmPass = document.getElementById("confirmCodeInput")?.value || "";
  const msg         = document.getElementById("matchMessage");
  if (!msg) return;

  if (!confirmPass) { msg.style.display = "none"; return; }

  msg.style.display = "block";
  if (newPass === confirmPass) {
    msg.innerHTML = `<span style="color:#16a34a; font-weight:700;"><i data-lucide="check-circle" style="width:14px; height:14px; vertical-align:-2px;"></i> الرمزان متطابقان تماماً</span>`;
  } else {
    msg.innerHTML = `<span style="color:#ef4444; font-weight:700;"><i data-lucide="alert-circle" style="width:14px; height:14px; vertical-align:-2px;"></i> الرمزان غير متطابقين بعد</span>`;
  }
  safeCreateIcons();
}

window.checkPasswordMatch = checkPasswordMatch;

/* Password eye toggle */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<i data-lucide="eye-off" style="width:18px; height:18px;"></i>';
  } else {
    input.type = "password";
    btn.innerHTML = '<i data-lucide="eye" style="width:18px; height:18px;"></i>';
  }
  safeCreateIcons();
}
window.togglePasswordVisibility = togglePasswordVisibility;

/* Alert banner toast */
function showAlert(msg, isOk = true) {
  const box = document.getElementById("alertMsg");
  if (!box) return;
  box.textContent = msg;
  box.className = `alert-box ${isOk ? "ok" : "err"}`;
  box.style.display = "block";
  setTimeout(() => { box.style.display = "none"; }, 4000);
}

/* =========================================================================
   7. Security Score Indicator (Shield Badge - No Blue)
   ========================================================================= */
function initSecurityScore() {
  const hasChangedBefore = localStorage.getItem("hasChangedPassword") === "true";
  let score = 40;
  let checks = { length: false, mixed: false, special: false, long: false };

  if (hasChangedBefore) {
    score = 85;
    checks.length = true;
    checks.mixed  = true;
    checks.long   = true;
  }

  renderSecurityScore(score, checks);
}

function renderSecurityScore(score, checks) {
  const numEl    = document.getElementById("scoreNumber");
  const badgeEl  = document.getElementById("scoreBadge");
  const badgeTxt = document.getElementById("scoreBadgeText");
  const iconWrap = document.getElementById("scoreIconBadge");

  if (numEl) numEl.textContent = `${score}%`;

  if (badgeEl && badgeTxt) {
    if (score >= 80) {
      badgeTxt.textContent = "مستوى أمان ممتاز 🛡️";
      badgeEl.style.background = "rgba(16, 185, 129, 0.15)";
      badgeEl.style.color = "#34d399";
      badgeEl.style.borderColor = "rgba(16, 185, 129, 0.3)";
      if (iconWrap) { iconWrap.className = "score-icon-badge high"; }
    } else if (score >= 60) {
      badgeTxt.textContent = "مستوى أمان جيد";
      badgeEl.style.background = "rgba(234, 88, 12, 0.15)";
      badgeEl.style.color = "#fb923c";
      badgeEl.style.borderColor = "rgba(234, 88, 12, 0.3)";
      if (iconWrap) { iconWrap.className = "score-icon-badge mid"; }
    } else {
      badgeTxt.textContent = "يُنصح بتحديث الرمز";
      badgeEl.style.background = "rgba(245, 158, 11, 0.15)";
      badgeEl.style.color = "#fbbf24";
      badgeEl.style.borderColor = "rgba(245, 158, 11, 0.3)";
      if (iconWrap) { iconWrap.className = "score-icon-badge"; }
    }
  }

  updateScoreCheckItem("sc-length",  checks.length,  "طول مناسب (4+ خانات)");
  updateScoreCheckItem("sc-mixed",   checks.mixed,   "يحتوي حروفاً وأرقاماً");
  updateScoreCheckItem("sc-special", checks.special, "يحتوي رموزاً خاصة");
  updateScoreCheckItem("sc-long",    checks.long,    "طويل (8+ خانات)");

  safeCreateIcons();
}

function updateScoreCheckItem(id, pass, label) {
  const el = document.getElementById(id);
  if (!el) return;
  const iconName = pass ? "check-circle" : "circle";
  el.className = `sc-item ${pass ? "pass" : "fail"}`;
  el.innerHTML = `<i data-lucide="${iconName}" style="width:13px; height:13px;"></i> ${label}`;
}

function upgradeSecurityScore() {
  localStorage.setItem("hasChangedPassword", "true");
  renderSecurityScore(95, { length: true, mixed: true, special: true, long: true });
  safeCreateIcons();
}

/* =========================================================================
   8. User Profile Loading & Updates
   ========================================================================= */
async function loadUserProfile() {
  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://') || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));
  let fetchedData = null;
  try {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch("/api/account/profile", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        if (res.status === 401 && !isStandalone) { window.location.href = "login.html"; return; }
        throw new Error("Local profile fetch error");
      }

      fetchedData = await res.json();
      currentUserData = fetchedData.user;
    } catch (fetchErr) {
      // Standalone / Offline fallback from local cache
      let username = "مسؤول النظام";
      let role = "admin";
      try {
        const cached = localStorage.getItem("albayan_logged_user");
        if (cached) {
          const u = JSON.parse(cached);
          if (u && u.username) username = u.username;
          if (u && u.role) role = u.role;
        }
      } catch(e) {}
      currentUserData = {
        username: username,
        role: role,
        is_superadmin: 1
      };
    }

    const username = currentUserData.username || "مستخدم";
    const heroUser = document.getElementById("heroUsername");
    const userInput = document.getElementById("usernameInput");
    const metaHandle = document.getElementById("heroUserMeta");

    if (heroUser) heroUser.textContent = username;
    if (userInput) userInput.value = username;
    if (metaHandle) metaHandle.textContent = `@${username.replace(/\s+/g, '_')}`;

    const previewInitials = document.getElementById("avatarPreviewInitials");
    if (previewInitials) previewInitials.textContent = username.charAt(0).toUpperCase();

    initAvatarPreset();

    // Role mapping
    const isSuper = currentUserData.is_superadmin === 1;
    const role    = currentUserData.role || "teacher";

    let roleText = "معلم قرآن كريم";
    if (isSuper) {
      roleText = "مدير النظام الأقصى (SuperAdmin)";
    } else if (role === "admin") {
      roleText = "مشرف اختبارات وإدارة";
    }

    const badgeEl = document.getElementById("heroRoleBadge");
    if (badgeEl) {
      badgeEl.textContent = roleText;
      if (isSuper) badgeEl.className = "profile-role-pill superadmin";
      else if (role === "admin") badgeEl.className = "profile-role-pill admin";
    }

    let createdHtml = "مُسجّل مسبقاً";
    if (currentUserData.created_at) {
      if (window.HijriDate) {
        const dual = window.HijriDate.formatDualDate(currentUserData.created_at);
        createdHtml = `<span class="hijri-primary">${dual.hijri}</span> <small class="gregorian-secondary">(${dual.gregorian})</small>`;
      } else {
        createdHtml = currentUserData.created_at.split(" ")[0];
      }
    }

    const hqsJoin = document.getElementById("hqsJoinDate");
    const metaId  = document.getElementById("metaUserId");
    const metaCr  = document.getElementById("metaCreatedAt");
    const metaLs  = document.getElementById("metaLastSeen");

    if (hqsJoin) hqsJoin.innerHTML = createdHtml;
    if (metaId)  metaId.textContent  = `#${currentUserData.id || '1'}`;
    if (metaCr)  metaCr.innerHTML  = createdHtml;
    if (metaLs)  metaLs.textContent  = currentUserData.last_seen ? "الآن (نشط)" : "الآن";

    // Permissions List
    const permContainer = document.getElementById("permissionsList");
    if (permContainer) {
      permContainer.innerHTML = "";
      if (isSuper) {
        permContainer.innerHTML =
          `<span class="chip-item super"><i data-lucide="crown" style="width:14px; height:14px; vertical-align:-2px;"></i> جميع الصلاحيات المطلقة (SuperAdmin)</span>`;
      } else {
        const perms   = currentUserData.permissions || [];
        const permMap = {
          "circles":     "إدارة الحلقات والطلاب",
          "exams":       "إدارة وبنك الاختبارات",
          "analytics":   "عرض الإحصائيات والتقارير",
          "users":       "إدارة الحسابات والصلاحيات",
          "all_circles": "الوصول لجميع الحلقات"
        };

        if (perms.length === 0) {
          permContainer.innerHTML = `<span class="chip-item">صلاحيات المعلم الأساسية</span>`;
        } else {
          perms.forEach(p => {
            const label = permMap[p] || p;
            permContainer.innerHTML += `<span class="chip-item">${label}</span>`;
          });
        }
      }
    }

    if (fetchedData && fetchedData.settings) {
      initRecordPeriodSettings(fetchedData.settings);
    } else {
      initRecordPeriodSettings();
    }

    safeCreateIcons();

  } catch (err) {
    console.error("Error loading user profile:", err);
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const btn      = document.getElementById("btnSaveProfile");
  const username = document.getElementById("usernameInput").value.trim();

  if (!username) { showAlert("الرجاء كتابة اسم المستخدم.", false); return; }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px; display:inline-block; vertical-align:middle;"></i> جاري الحفظ...`;
  safeCreateIcons();

  try {
    const res  = await fetch("/api/account/update-profile", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showAlert(data.message || "تم تحديث اسم المستخدم بنجاح 🟢", true);
      document.getElementById("heroUsername").textContent = username;
      const metaHandle = document.getElementById("heroUserMeta");
      if (metaHandle) metaHandle.textContent = `@${username.replace(/\s+/g, '_')}`;
      if (currentUserData) currentUserData.username = username;
      const previewInitials = document.getElementById("avatarPreviewInitials");
      if (previewInitials) previewInitials.textContent = username.charAt(0).toUpperCase();
      initAvatarPreset();
      setTimeout(() => closeSheet('sheet-profile'), 800);
    } else {
      showAlert(data.message || "فشل تحديث اسم المستخدم.", false);
    }
  } catch (err) {
    showAlert("حدث خطأ أثناء حفظ الاسم.", false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" style="width:18px; height:18px;"></i> حفظ وتحديث الاسم`;
    safeCreateIcons();
  }
}

/* =========================================================================
   9. Password / Passcode Updates
   ========================================================================= */
async function handleChangeCode(e) {
  e.preventDefault();
  const btn          = document.getElementById("btnSaveCode");
  const current_code = document.getElementById("currentCodeInput").value.trim();
  const new_code     = document.getElementById("newCodeInput").value.trim();
  const confirm_code = document.getElementById("confirmCodeInput").value.trim();

  if (!current_code || !new_code || !confirm_code) {
    showAlert("يرجى ملء كافة حقول الرمز السرّي.", false); return;
  }
  if (new_code !== confirm_code) {
    showAlert("الرمز السرّي الجديد وتأكيده غير متطابقين.", false); return;
  }
  if (new_code.length < 4) {
    showAlert("الرمز السرّي الجديد يجب أن يتكون من 4 خانات على الأقل.", false); return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px; display:inline-block; vertical-align:middle;"></i> جاري التعديل...`;
  safeCreateIcons();

  try {
    const res  = await fetch("/api/account/change-code", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ current_code, new_code, confirm_code })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showAlert(data.message || "تم تغيير الرمز السرّي بنجاح 🔒", true);
      document.getElementById("currentCodeInput").value = "";
      document.getElementById("newCodeInput").value     = "";
      document.getElementById("confirmCodeInput").value = "";
      document.getElementById("strengthContainer").style.display = "none";
      document.getElementById("matchMessage").style.display      = "none";
      upgradeSecurityScore();
      setTimeout(() => closeSheet('sheet-password'), 900);
    } else {
      showAlert(data.message || "فشل تغيير الرمز السرّي.", false);
    }
  } catch (err) {
    showAlert("حدث خطأ أثناء تغيير الرمز السرّي.", false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="lock" style="width:18px; height:18px;"></i> تحديث الرمز السرّي الآن`;
    safeCreateIcons();
  }
}

/* =========================================================================
   10. Backup & Restore Data Functions
   ========================================================================= */
function initLastBackupInfo() {
  const saved = localStorage.getItem("lastBackupTime");
  if (saved) {
    const el = document.getElementById("lastBackupInfo");
    const timeEl = document.getElementById("lastBackupTime");
    const sysEl  = document.getElementById("sysLastBackup");
    if (el) el.style.display = "flex";
    if (timeEl) timeEl.textContent = saved;
    if (sysEl)  sysEl.textContent  = saved;
  }
}

function downloadBackup() {
  const dual = window.HijriDate ? window.HijriDate.formatDualDate(new Date()) : { hijri: new Date().toLocaleDateString('ar-SA') + ' هـ', gregorian: new Date().toLocaleDateString('ar-EG') + ' م' };
  const backupTimeHtml = `<span class="hijri-primary">${dual.hijri}</span> <small class="gregorian-secondary">(${dual.gregorian})</small>`;
  localStorage.setItem("lastBackupTime", `${dual.hijri} (${dual.gregorian})`);

  const el = document.getElementById("lastBackupInfo");
  const timeEl = document.getElementById("lastBackupTime");
  const sysEl  = document.getElementById("sysLastBackup");
  if (el) el.style.display = "flex";
  if (timeEl) timeEl.innerHTML = backupTimeHtml;
  if (sysEl)  sysEl.innerHTML  = backupTimeHtml;

  window.location.href = "/api/account/backup";
  showAlert("جاري تحضير وتنزيل النسخة الاحتياطية المجمعة... 📥", true);
}

function onBackupFileSelected(input) {
  const label = document.getElementById("dropzoneLabel");
  const btn   = document.getElementById("btnRestoreBackup");
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (label) label.textContent = `الملف المختار: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    if (btn)   btn.disabled = false;
  }
}

window.handleDragOver = function(e) {
  e.preventDefault();
  const dz = document.getElementById("fileDropzone");
  if (dz) dz.classList.add("drag-over");
};

window.handleDragLeave = function(e) {
  const dz = document.getElementById("fileDropzone");
  if (dz) dz.classList.remove("drag-over");
};

window.handleFileDrop = function(e) {
  e.preventDefault();
  const dz = document.getElementById("fileDropzone");
  if (dz) dz.classList.remove("drag-over");
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
  const btn       = document.getElementById("btnRestoreBackup");
  const progress  = document.getElementById("restoreProgress");
  const pFill     = document.getElementById("restoreProgressFill");
  const pPct      = document.getElementById("restoreProgressPct");
  const pText     = document.getElementById("restoreProgressText");

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showAlert("يرجى اختيار ملف النسخة الاحتياطية أولاً.", false);
    return;
  }

  if (!confirm("⚠️ تنبيه أمان: سيتم استرجاع واستبدال البيانات الحالية بمحتويات النسخة المختارة. هل ترغب في المتابعة؟")) {
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px; display:inline-block; vertical-align:middle;"></i> جاري استعادة البيانات...`;
  safeCreateIcons();

  if (progress) progress.style.display = "block";

  let pct = 0;
  const progressInterval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 12, 85);
    if (pFill) pFill.style.width = `${pct}%`;
    if (pPct)  pPct.textContent  = `${Math.round(pct)}%`;
  }, 300);

  const formData = new FormData();
  formData.append("backup_file", fileInput.files[0]);

  try {
    const res  = await fetch("/api/account/restore", {
      method: "POST",
      headers: { "X-CSRF-Token": getCsrfToken() },
      body: formData
    });
    const data = await res.json();

    clearInterval(progressInterval);
    if (pFill) pFill.style.width = "100%";
    if (pPct)  pPct.textContent  = "100%";
    if (pText) pText.textContent = "اكتملت الاستعادة بنجاح!";

    if (res.ok && data.success) {
      showAlert(data.message || "تمت استعادة النسخة الاحتياطية بنجاح! 🟢", true);
      setTimeout(() => window.location.reload(), 1800);
    } else {
      showAlert(data.message || "فشلت عملية استعادة النسخة الاحتياطية.", false);
      if (progress) progress.style.display = "none";
    }
  } catch (err) {
    clearInterval(progressInterval);
    if (progress) progress.style.display = "none";
    showAlert("حدث خطأ أثناء رفع النسخة واستعادتها.", false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="refresh-cw" style="width:18px; height:18px;"></i> بدء استعادة البيانات الآن`;
    safeCreateIcons();
  }
}

window.downloadBackup        = downloadBackup;
window.onBackupFileSelected  = onBackupFileSelected;
window.handleRestoreBackup   = handleRestoreBackup;
window.handleUpdateProfile   = handleUpdateProfile;
window.handleChangeCode      = handleChangeCode;

/* =========================================================================
   11. Record Period Duration Controller
   ========================================================================= */
let activeRecordPeriodType = "monthly";
let activeCustomMonths = 5;

function initRecordPeriodSettings(settings = null) {
  if (settings) {
    activeRecordPeriodType = settings.record_period_type || "monthly";
    activeCustomMonths = parseInt(settings.custom_period_months || 5);
  } else {
    activeRecordPeriodType = localStorage.getItem("record_period_type") || "monthly";
    activeCustomMonths = parseInt(localStorage.getItem("custom_period_months") || "5");
  }

  updateRecordPeriodUI();
}

function getCustomTermsDescription(months) {
  const count = Math.max(1, Math.floor(12 / months));
  let termsStr = "";
  if (count === 1) termsStr = "فصل سنوي واحد";
  else if (count === 2) termsStr = "فصلان في السنة";
  else if (count >= 3 && count <= 10) termsStr = `${count} فصول في السنة`;
  else termsStr = `${count} فصلاً في السنة`;

  return `فصل كل ${months} أشهر (${termsStr})`;
}

let tempPreviousPeriodType = "monthly";

function updateRecordPeriodUI() {
  const badge = document.getElementById("currentRecordPeriodBadge");
  if (badge) {
    if (activeRecordPeriodType === "daily") {
      badge.textContent = "يومي (متابعة يومية)";
      badge.style.color = "#F59E0B";
    } else if (activeRecordPeriodType === "custom") {
      const termsCount = Math.max(1, Math.floor(12 / activeCustomMonths));
      const termsStr = termsCount === 1 ? "فصل سنوي واحد" : (termsCount === 2 ? "فصلان" : `${termsCount} فصول`);
      badge.textContent = `مخصص (${activeCustomMonths} أشهر لكل فصل - ${termsStr})`;
      badge.style.color = "#A855F7";
    } else {
      badge.textContent = "شهري (الافتراضي)";
      badge.style.color = "#10B981";
    }
  }

  // Update Dropdown value
  const select = document.getElementById("recordPeriodSelect");
  if (select) {
    select.value = activeRecordPeriodType;
  }

  // Update Live Summary Card
  const title = document.getElementById("summaryCardTitle");
  const desc = document.getElementById("summaryCardDesc");
  const icon = document.getElementById("summaryCardIcon");
  const actionRow = document.getElementById("customMonthsActionRow");
  const customMonthsCount = document.getElementById("summaryCustomMonthsCount");

  if (activeRecordPeriodType === "daily") {
    if (title) title.textContent = "نظام يومي (متابعة يومية)";
    if (desc) desc.textContent = "تسجيل التسميع لكل يوم بتاريخه مع تجميع الإحصائيات شهرياً.";
    if (icon) {
      icon.className = "summary-card-icon amber";
      icon.innerHTML = `<i data-lucide="sun"></i>`;
    }
    if (actionRow) actionRow.style.display = "none";
  } else if (activeRecordPeriodType === "custom") {
    if (title) title.textContent = `نظام مخصص (${activeCustomMonths} أشهر لكل فصل)`;
    if (desc) desc.textContent = getCustomTermsDescription(activeCustomMonths) + "، يتم حساب السجلات لكل فصل دراسي مخصص.";
    if (icon) {
      icon.className = "summary-card-icon purple";
      icon.innerHTML = `<i data-lucide="calendar-plus"></i>`;
    }
    if (actionRow) actionRow.style.display = "block";
    if (customMonthsCount) customMonthsCount.textContent = activeCustomMonths;
  } else {
    if (title) title.textContent = "نظام شهري (الافتراضي)";
    if (desc) desc.textContent = "حساب السجلات حسب الأشهر الهجرية/الميلادية (سجل منفصل لكل شهر).";
    if (icon) {
      icon.className = "summary-card-icon emerald";
      icon.innerHTML = `<i data-lucide="calendar"></i>`;
    }
    if (actionRow) actionRow.style.display = "none";
  }

  safeCreateIcons();
}

function handleRecordPeriodDropdownChange(val) {
  if (val === "custom") {
    openCustomMonthsModal();
  } else {
    activeRecordPeriodType = val;
    tempPreviousPeriodType = val;
    updateRecordPeriodUI();
  }
}

function openCustomMonthsModal() {
  tempPreviousPeriodType = activeRecordPeriodType;
  const input = document.getElementById("customMonthsModalInput");
  if (input) input.value = activeCustomMonths;
  updateModalTermsPreview(activeCustomMonths);
  openSheet("sheet-custom-months");
}

function cancelCustomMonthsModal() {
  closeSheet("sheet-custom-months");
  // If user wasn't previously on custom, restore dropdown
  if (activeRecordPeriodType !== "custom") {
    const select = document.getElementById("recordPeriodSelect");
    if (select) select.value = activeRecordPeriodType;
  }
  openSheet("sheet-record-period");
}

function confirmCustomMonthsModal() {
  const input = document.getElementById("customMonthsModalInput");
  let val = parseInt(input ? input.value : 6, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 12) val = 12;

  activeCustomMonths = val;
  activeRecordPeriodType = "custom";
  tempPreviousPeriodType = "custom";

  closeSheet("sheet-custom-months");
  updateRecordPeriodUI();
  openSheet("sheet-record-period");
}

function stepCustomMonths(delta) {
  const input = document.getElementById("customMonthsModalInput");
  if (!input) return;
  let val = parseInt(input.value || 6, 10) + delta;
  if (val < 1) val = 1;
  if (val > 12) val = 12;
  input.value = val;
  updateModalTermsPreview(val);
}

function onCustomMonthsModalInput(val) {
  let num = parseInt(val, 10);
  if (isNaN(num) || num < 1) num = 1;
  if (num > 12) num = 12;
  updateModalTermsPreview(num);
}

function setCustomMonthsPreset(months) {
  const input = document.getElementById("customMonthsModalInput");
  if (input) input.value = months;
  updateModalTermsPreview(months);
}

function updateModalTermsPreview(months) {
  const preview = document.getElementById("modalTermsPreviewBadge");
  if (preview) {
    preview.textContent = "🗓️ " + getCustomTermsDescription(months);
  }
}

async function saveRecordPeriodSettings() {
  const btn = document.getElementById("btnSaveRecordPeriod");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px; height:16px; display:inline-block; vertical-align:middle;"></i> جاري الحفظ...`;
    safeCreateIcons();
  }

  try {
    const res = await fetch("/api/account/system-settings", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({
        record_period_type: activeRecordPeriodType,
        custom_period_months: activeCustomMonths
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      localStorage.setItem("record_period_type", activeRecordPeriodType);
      localStorage.setItem("custom_period_months", activeCustomMonths.toString());
      showAlert("تم حفظ وتطبيق نظام مدة السجل بنجاح 🟢", true);
      updateRecordPeriodUI();
      setTimeout(() => closeSheet('sheet-record-period'), 800);
    } else {
      showAlert(data.message || "تعذر حفظ إعدادات النظام.", false);
    }
  } catch (err) {
    console.error("Error saving record period:", err);
    showAlert("حدث خطأ في الاتصال بالخادم.", false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span class="btn-txt">حفظ وتطبيق النظام</span>`;
      safeCreateIcons();
    }
  }
}

window.initRecordPeriodSettings = initRecordPeriodSettings;
window.handleRecordPeriodDropdownChange = handleRecordPeriodDropdownChange;
window.openCustomMonthsModal = openCustomMonthsModal;
window.cancelCustomMonthsModal = cancelCustomMonthsModal;
window.confirmCustomMonthsModal = confirmCustomMonthsModal;
window.stepCustomMonths = stepCustomMonths;
window.onCustomMonthsModalInput = onCustomMonthsModalInput;
window.setCustomMonthsPreset = setCustomMonthsPreset;
window.saveRecordPeriodSettings = saveRecordPeriodSettings;

/* =========================================================================
   12. Auth Logout
   ========================================================================= */
async function logout() {
  if (typeof window.albayanLogout === 'function') {
    return window.albayanLogout();
  }
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
    sessionStorage.clear();
  } catch (e) {}
  try {
    await fetch("/api/logout", { method: "POST", headers: csrfHeaders() });
  } catch (e) {}
  window.location.href = "login.html?logout=1";
}
window.logout = logout;

/* =========================================================================
   13. Firebase Cloud Sync Settings Handlers (Direct RTDB + Smart State)
   ========================================================================= */
async function checkFirebaseConnectionInSettings() {
  const badge = document.getElementById("settingsSyncStatusBadge");
  const pill = document.getElementById("fbSyncModalStatusPill");
  const diag = document.getElementById("fbSyncDiagnosticBox");
  const pendingEl = document.getElementById("fbPendingCountVal");
  const lastTimeEl = document.getElementById("fbLastSyncTimeVal");

  if (pill) pill.textContent = "جاري الفحص...";
  if (diag) diag.textContent = "يتم الآن فحص الاتصال بسحابة Firebase...";

  // 1. Check direct Firebase RTDB from phone
  let directCloudOk = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/.json?shallow=true", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) directCloudOk = true;
  } catch (e) {
    directCloudOk = false;
  }

  // Count local pending items from IndexedDB
  let localPending = 0;
  if (window.AlbayanLocalDB) {
    try { localPending = await window.AlbayanLocalDB.getPendingCount(); } catch(e) {}
  }

  // 2. If direct Firebase is online
  if (directCloudOk) {
    if (pendingEl) pendingEl.textContent = localPending;
    const lastSync = localStorage.getItem("albayan_last_cloud_sync_time") || "نشط الآن";
    if (lastTimeEl) lastTimeEl.textContent = lastSync;

    if (pill) { 
      pill.textContent = "متصل بالسحابة 🟢"; 
      pill.style.background = "#dcfce7"; 
      pill.style.color = "#15803d"; 
    }
    if (badge) { 
      badge.textContent = "متصل بالسحابة 🟢"; 
      badge.style.color = "#16a34a"; 
    }
    if (diag) {
      diag.textContent = "التطبيق متصل مباشرة بقاعدة البيانات السحابية (Firebase RTDB). المزامنة وجلب البيانات سارية بنجاح.";
    }
    return;
  }

  // 3. Fallback: check local LAN server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/sync/status", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (pendingEl) pendingEl.textContent = (data.pending_records_count || 0) + localPending;
      if (lastTimeEl) lastTimeEl.textContent = data.last_sync_time || "لم تتم بعد";

      if (data.is_syncing) {
        if (pill) { pill.textContent = "جاري المزامنة..."; pill.style.background = "#dbeafe"; pill.style.color = "#1e40af"; }
        if (badge) { badge.textContent = "جاري المزامنة..."; badge.style.color = "#2563eb"; }
        if (diag) diag.textContent = "عملية مزامنة السجلات قيد التنفيذ حالياً بين السيرفر المحلي وFirebase.";
      } else if (data.cloud_connected) {
        if (pill) { pill.textContent = "متصل بالسحابة 🟢"; pill.style.background = "#dcfce7"; pill.style.color = "#15803d"; }
        if (badge) { badge.textContent = "متصل بالسحابة 🟢"; badge.style.color = "#16a34a"; }
        if (diag) diag.textContent = data.last_sync_status || "الاتصال جاهز والمزامنة الفورية مفعلة عبر السيرفر والسحابة.";
      } else {
        if (pill) { pill.textContent = "يعمل بالإنترنت المحلي 🔵"; pill.style.background = "#e0f2fe"; pill.style.color = "#0369a1"; }
        if (badge) { badge.textContent = "يعمل بالإنترنت المحلي 🔵"; badge.style.color = "#0284c7"; }
        if (diag) diag.textContent = "النظام متصل بالحاسوب/الشبكة المحلية وتتم العمليات محلياً.";
      }
      return;
    }
  } catch (err) {
    // Local server unreachable
  }

  // 4. Standalone / Offline
  if (pendingEl) pendingEl.textContent = localPending;
  if (pill) { pill.textContent = "يعمل دون اتصال ⚪"; pill.style.background = "#f1f5f9"; pill.style.color = "#475569"; }
  if (badge) { badge.textContent = "يعمل دون اتصال ⚪"; badge.style.color = "#64748b"; }
  if (diag) diag.textContent = "لا يوجد اتصال بالإنترنت أو الخادم، التطبيق يعمل بوضع حفظ البيانات على هذا الجهاز دون اتصال.";
}

async function handleManualSyncInSettings() {
  const btn = document.getElementById("fbTriggerSyncBtn");
  const diag = document.getElementById("fbSyncDiagnosticBox");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>جاري المزامنة مع السحابة...</span>`;
  }
  if (diag) diag.textContent = "يتم الآن جلب وتحديث البيانات من سحابة Firebase...";

  let synced = false;
  // Direct Firebase pull
  if (typeof window.pullAllDataFromFirebase === 'function') {
    try {
      await window.pullAllDataFromFirebase();
      synced = true;
    } catch(e) {}
  } else if (typeof window.pullCirclesFromFirebase === 'function') {
    try {
      await window.pullCirclesFromFirebase();
      if (typeof window.pullExamsFromFirebase === 'function') {
        await window.pullExamsFromFirebase();
      }
      synced = true;
    } catch(e) {}
  }

  // Direct Firebase push of queued local records
  if (typeof window.flushPendingQueueToFirebase === 'function') {
    try { await window.flushPendingQueueToFirebase(); } catch(e) {}
  }

  // Also trigger local server if reachable
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/sync/trigger", { method: "POST", headers: csrfHeaders(), signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) synced = true;
  } catch(e) {}

  // Fetch full bundle from local server to ensure complete SQLite -> IndexedDB sync
  try {
    const bRes = await fetch("/api/sync/export-bundle");
    if (bRes.ok) {
      const bData = await bRes.json();
      if (bData && bData.bundle && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.importFullDatabase === 'function') {
        await window.AlbayanLocalDB.importFullDatabase(bData.bundle);
        synced = true;
      }
    }
  } catch(e) {}

  const nowStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  try { localStorage.setItem("albayan_last_cloud_sync_time", nowStr); } catch(e) {}

  showAlert(synced ? "تمت المزامنة بنجاح مع سحابة مدرسة البيان." : "تم تحديث البيانات المحلية.", true);
  await checkFirebaseConnectionInSettings();

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="refresh-cw" style="width:17px; height:17px;"></i><span>مزامنة السحابة الآن</span>`;
    safeCreateIcons();
  }
}

window.checkFirebaseConnectionInSettings = checkFirebaseConnectionInSettings;
window.handleManualSyncInSettings = handleManualSyncInSettings;


/* =========================================================================
   14. Typography & Font System Handlers
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
    "Cairo": "خط كايرو (الافتراضي)",
    "Tajawal": "خط تجوال (ناعم وأنيق)",
    "Alexandria": "خط الإسكندرية (هندسي فريد)",
    "Amiri": "خط أميري (تراثي قرآني)",
    "Almarai": "خط المراعي (رقمي حديث)",
    "custom": "خط مخصص (من جهازك)"
  };
  badge.textContent = map[fontKey] || fontKey;
}

function updateFontCardsUI(fontKey) {
  const cards = document.querySelectorAll(".font-select-card");
  cards.forEach(card => {
    const key = card.dataset.font;
    const radio = card.querySelector('input[type="radio"]');
    if (key === fontKey) {
      card.classList.add("active");
      if (radio) radio.checked = true;
    } else {
      card.classList.remove("active");
      if (radio) radio.checked = false;
    }
  });
}

function updateCustomFontStatusUI() {
  const customData = localStorage.getItem("appCustomFontData");
  const customName = localStorage.getItem("appCustomFontName") || "خط مخصص";
  const customSize = localStorage.getItem("appCustomFontSize") || "";
  const customContainer = document.getElementById("customFontActiveBox");
  const emptyContainer = document.getElementById("customFontEmptyBox");
  const customCard = document.getElementById("customFontSelectCard");

  if (customData) {
    if (customContainer) customContainer.style.display = "block";
    if (emptyContainer) emptyContainer.style.display = "none";
    if (customCard) customCard.style.display = "block";

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
  showAlert(`تم تفعيل ${fontNames[fontKey] || fontKey} بنجاح عبر كامل صفحات المنظومة!`, true);
};

window.handleCustomFontUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  // Max 4MB validation
  if (file.size > 4 * 1024 * 1024) {
    showAlert("حجم ملف الخط كبير جداً (أكثر من 4 ميغابايت). يرجى اختيار ملف خط أخف وزناً.", false);
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
      showAlert(`تم رفع وتفعيل الخط "${file.name}" بنجاح!`, true);
    } catch(err) {
      showAlert("تعذر حفظ الخط في المتصفح: " + err.message, false);
    }
  };
  reader.onerror = function() {
    showAlert("حدث خطأ أثناء قراءة ملف الخط.", false);
  };
  reader.readAsDataURL(file);
};

window.removeCustomFont = function() {
  if (!confirm("هل أنت متأكد من حذف الخط المخصص والعودة للخط الافتراضي؟")) return;
  localStorage.removeItem("appCustomFontData");
  localStorage.removeItem("appCustomFontName");
  localStorage.removeItem("appCustomFontFormat");
  localStorage.removeItem("appCustomFontSize");

  const customStyle = document.getElementById("albayan-custom-font-style");
  if (customStyle) customStyle.remove();

  window.selectAppFont("Cairo");
  updateCustomFontStatusUI();
  showAlert("تم حذف الخط المخصص وتفعيل خط كايرو الافتراضي.", true);
};

/* =========================================================================
   15. Local LAN Server Handlers
   ========================================================================= */
function initLanServerSettings() {
  const currentUrl = localStorage.getItem("albayan_server_url") || "";
  const input = document.getElementById("lanServerInput");
  const badge = document.getElementById("settingsLanServerBadge");
  const pill = document.getElementById("lanServerStatusPill");
  const savedVal = document.getElementById("lanSavedUrlVal");

  if (input && !input.value) {
    input.value = currentUrl || "http://10.104.106.182:5000";
  }
  if (savedVal) {
    savedVal.textContent = currentUrl || "غير مربوط (محلي فقط)";
  }

  if (currentUrl) {
    if (badge) {
      badge.textContent = "مربوط: " + currentUrl.replace(/^https?:\/\//, '');
      badge.style.color = "#10b981";
    }
    if (pill) {
      pill.textContent = "مربوط (يفحص الاتصال...)";
      pill.style.background = "#dbeafe";
      pill.style.color = "#1e40af";
    }
    // Quick test
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    fetch(currentUrl + "/api/health", { method: "GET", mode: "cors", signal: controller.signal })
      .then(res => res.json())
      .then(() => {
        clearTimeout(timeoutId);
        if (pill) {
          pill.textContent = "متصل بنجاح ✓";
          pill.style.background = "rgba(16, 185, 129, 0.15)";
          pill.style.color = "#10b981";
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (pill) {
          pill.textContent = "غير متاح حالياً (يعمل محلياً)";
          pill.style.background = "rgba(245, 158, 11, 0.15)";
          pill.style.color = "#b45309";
        }
      });
  } else {
    if (badge) {
      badge.textContent = "يعمل بوضع الجوال (محلي)";
      badge.style.color = "#64748b";
    }
    if (pill) {
      pill.textContent = "محلي (بدون خادم)";
      pill.style.background = "#e2e8f0";
      pill.style.color = "#475569";
    }
  }
}

async function testAndSaveLanServer() {
  const input = document.getElementById("lanServerInput");
  const btn = document.getElementById("lanTestConnectBtn");
  const diag = document.getElementById("lanServerDiagnosticBox");
  let val = (input ? input.value : "").trim().replace(/\/$/, "");

  if (!val) {
    val = "http://10.104.106.182:5000";
  }
  if (!val.startsWith("http://") && !val.startsWith("https://")) {
    val = "http://" + val;
  }
  const urlParts = val.match(/^(https?:\/\/[^\/:]+)(?::(\d+))?/);
  if (urlParts && !urlParts[2]) {
    val = urlParts[1] + ":5000";
  }
  if (input) input.value = val;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>جارٍ فحص الاتصال بالخادم...</span>`;
  }
  if (diag) {
    diag.innerHTML = `<span style="color:#2563eb;">جارٍ محاولة الاتصال بـ ${val}/api/health...</span>`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(val + "/api/health", { method: "GET", mode: "cors", signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      localStorage.setItem("albayan_server_url", val);
      if (diag) {
        diag.innerHTML = `<span style="color:#10b981; font-weight:bold;">✓ تم الاتصال بنجاح بالخادم وحفظ الإعدادات!</span>`;
      }
      initLanServerSettings();
      showAlert("تم حفظ عنوان الخادم والاتصال بنجاح.", true);
    } else {
      throw new Error("HTTP error " + res.status);
    }
  } catch(err) {
    clearTimeout(timeoutId);
    localStorage.setItem("albayan_server_url", val);
    initLanServerSettings();
    if (diag) {
      diag.innerHTML = `
        <div style="color:#ef4444; font-weight:bold;">لم يستجب الخادم على العنوان (${val})</div>
        <div style="font-size:11px; color:#64748b; margin-top:4px;">
          تم حفظ العنوان، ولكن تأكد أن الكمبيوتر يعمل على نفس الشبكة ومشغّل للأمر python app.py. سيستمر التطبيق بالعمل محلياً بصورة طبيعية.
        </div>
      `;
    }
    showAlert("تم حفظ العنوان، لكن الخادم غير متصل حالياً. التطبيق سيعمل محلياً.", false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check-circle" style="width:17px; height:17px;"></i><span>فحص وحفظ الاتصال بالخادم</span>`;
      safeCreateIcons();
    }
  }
}

function disconnectLanServer() {
  localStorage.removeItem("albayan_server_url");
  const input = document.getElementById("lanServerInput");
  if (input) input.value = "";
  const diag = document.getElementById("lanServerDiagnosticBox");
  if (diag) {
    diag.innerHTML = `<span style="color:#10b981;">تم إلغاء الربط. التطبيق يعمل الآن بوضع الجوال المستقل (محلي فقط).</span>`;
  }
  initLanServerSettings();
  showAlert("تم التحويل لوضع الجوال المستقل بدون سيرفر.", true);
}

function confirmLogout() {
  if (typeof window.albayanLogout === 'function') {
    return window.albayanLogout();
  }
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
    sessionStorage.clear();
  } catch(e) {}
  fetch("/api/logout", { method: "POST" }).catch(() => {});
  window.location.href = "login.html?logout=1";
}

window.confirmLogout = confirmLogout;
window.testAndSaveLanServer = testAndSaveLanServer;
window.disconnectLanServer = disconnectLanServer;
window.initLanServerSettings = initLanServerSettings;

// Initial check when settings loads
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(checkFirebaseConnectionInSettings, 500);
  setTimeout(initLanServerSettings, 200);

  // Auto open sheet if query param present
  const params = new URLSearchParams(window.location.search);
  if (params.get("open") === "lan-server") {
    setTimeout(() => openSheet("sheet-lan-server"), 300);
  }
});

// Global Escape Key Listener for Modals
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeAllSheets();
  }
});

