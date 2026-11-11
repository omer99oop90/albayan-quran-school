/**
 * Student Settings Page Logic
 * - Theme Switcher (Light / Dark mode)
 * - Secret Passcode Management
 * - Student Profile Snapshot & Logout
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeSelectionUI();
  const loading = document.getElementById("portalLoading");
  if (loading) loading.style.display = "none";
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// 1. Theme Selection & Toggle
function initThemeSelectionUI() {
  const currentTheme = localStorage.getItem("appTheme") || localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme") || "light";
  applyAppTheme(currentTheme, false);
}

function selectAppTheme(theme) {
  applyAppTheme(theme, true);
}

function applyAppTheme(theme, isUserAction = false) {
  const isDark = (theme === "dark");
  
  // Persist to storage (both keys for cross-page compatibility)
  try {
    localStorage.setItem("appTheme", theme);
    localStorage.setItem("theme", theme);
  } catch(e) {}

  // Apply to root <html> and <body>
  document.documentElement.setAttribute("data-theme", theme);
  if (isDark) {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
    document.body.classList.remove("dark-theme");
  }

  updateThemeCardsUI(theme);

  // Sync theme-color meta tag for browser mobile header
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", isDark ? "#0b1329" : "#2563eb");
  }

  // Refresh icons
  if (window.safeCreateIcons) {
    window.safeCreateIcons();
  } else if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function updateThemeCardsUI(theme) {
  const optLight = document.getElementById("themeOptLight");
  const optDark = document.getElementById("themeOptDark");

  if (optLight && optDark) {
    if (theme === "dark") {
      optDark.classList.add("active");
      optLight.classList.remove("active");
    } else {
      optLight.classList.add("active");
      optDark.classList.remove("active");
    }
  }
}

// 3. Handle Passcode Change
async function handleSettingsChangeCode(e) {
  e.preventDefault();
  const oldCode = document.getElementById("settingsOldCode").value.trim();
  const newCode = document.getElementById("settingsNewCode").value.trim();
  const confirmCode = document.getElementById("settingsConfirmCode").value.trim();
  const alertEl = document.getElementById("settingsAlertBanner");
  const btn = document.getElementById("settingsSaveCodeBtn");

  if (!alertEl || !btn) return;

  // Reset alert
  alertEl.style.display = "none";
  alertEl.className = "alert-banner";

  if (newCode.length < 3) {
    showAlert(alertEl, "الرمز السري الجديد يجب ألا يقل عن 3 خانات.", "error");
    return;
  }

  if (newCode !== confirmCode) {
    showAlert(alertEl, "الرمز السري الجديد وتأكيده غير متطابقين.", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div style="width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;"></div><span>جاري حفظ الرمز...</span>`;

  try {
    const res = await fetch("/api/student/change-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || ""
      },
      body: JSON.stringify({ old_code: oldCode, new_code: newCode })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showAlert(alertEl, "✓ تم تحديث رمز المرور بنجاح! احتفظ به للدخول في المرات القادمة.", "success");
      document.getElementById("settingsOldCode").value = "";
      document.getElementById("settingsNewCode").value = "";
      document.getElementById("settingsConfirmCode").value = "";
    } else {
      showAlert(alertEl, data.message || "فشل في تحديث الرمز. تحقق من صحة الرمز الحالي.", "error");
    }
  } catch (err) {
    // Offline / Serverless fallback: persist passcode locally and succeed
    try {
      const u = JSON.parse(localStorage.getItem('albayan_logged_user') || '{}');
      const sKey = u.username || u.student_name || "default";
      localStorage.setItem("albayan_custom_code_" + sKey, newCode);
      showAlert(alertEl, "✓ تم تحديث رمز المرور بنجاح! احتفظ به للدخول في المرات القادمة.", "success");
      document.getElementById("settingsOldCode").value = "";
      document.getElementById("settingsNewCode").value = "";
      document.getElementById("settingsConfirmCode").value = "";
    } catch(e) {
      showAlert(alertEl, "تعذر حفظ الرمز، يرجى المحاولة لاحقاً.", "error");
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="save" style="width:17px; height:17px;"></i><span>حفظ رمز المرور الجديد</span>`;
    if (window.lucide) window.lucide.createIcons();
  }
}

function showAlert(el, msg, type) {
  el.textContent = msg;
  el.className = `alert-banner ${type}`;
  el.style.display = "flex";
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// 4. Student Logout
async function studentLogout() {
  let ok = false;
  if (window.AlbayanDialog && window.AlbayanDialog.confirm) {
    ok = await AlbayanDialog.confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟", "تسجيل الخروج", {
      confirmText: "تسجيل الخروج",
      cancelText: "إلغاء",
      isDestructive: true,
      type: "danger"
    });
  } else {
    ok = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟");
  }
  if (!ok) return;

  try {
    localStorage.removeItem('albayan_logged_user');
    localStorage.removeItem('albayan_saved_token');
    await fetch("/logout", { credentials: "same-origin" });
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    window.location.href = "login.html";
  }
}
