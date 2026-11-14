/**
 * Shared Student Portal Utilities
 * مدرسة البيان لتعليم القرآن الكريم
 */

/**
 * Normalize an Arabic name for tolerant comparison (removes harakat, tatweel,
 * unifies alef/taa-marbuta/yaa variants, and normalizes spacing).
 */
function normalizeArabicName(name) {
  if (!name) return "";
  let s = String(name).trim();
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
  s = s.replace(/[أإآٱ]/g, "ا");
  s = s.replace(/[ةه]/g, "ه");
  s = s.replace(/[ىي]/g, "ي");
  s = s.replace(/[ؤ]/g, "و");
  s = s.replace(/[ئ]/g, "ي");
  s = s.replace(/\bعبد\s+/g, "عبد");
  s = s.replace(/\bال\s+/g, "ال");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, "");
  return s.split(/\s+/).join(" ").toLowerCase();
}

/**
 * Compare two Arabic student names using normalized exact or substring match.
 */
function isNameMatch(n1, n2) {
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  const a = normalizeArabicName(n1);
  const b = normalizeArabicName(n2);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.length >= 4 && (a.includes(b) || b.includes(a));
}

/**
 * Format a date string into dual Hijri/Gregorian representation via hijri_date.js.
 */
function getFormattedDualDate(dateStr) {
  if (window.HijriDate && typeof window.HijriDate.formatDualDate === "function") {
    const dual = window.HijriDate.formatDualDate(dateStr);
    if (dual && typeof dual === "object") {
      return dual.combined || dual.hijri || dateStr || "—";
    }
    return dual || dateStr || "—";
  }
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString("ar-SA") + " هـ / " + d.toLocaleDateString("ar-EG") + " م";
  } catch (e) {
    return dateStr || "—";
  }
}

/**
 * Confirm and log out the current student, clearing local session keys.
 */
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
    if (!window.IS_CAPACITOR_APP) {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    }
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    try {
      localStorage.removeItem("albayan_logged_user");
      localStorage.removeItem("albayan_saved_token");
    } catch (e) {}
    window.location.href = "login.html";
  }
}
