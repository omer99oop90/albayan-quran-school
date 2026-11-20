/**
 * Users and Accounts Management Script (إدارة المستخدمين وحسابات الطلاب)
 * WhatsApp UI Style – Blue Edition with Full Offline/Firebase/Server CRUD
 */

const FB_RTDB_BASE = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";

// CSRF & Auth Headers Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return (meta ? meta.getAttribute("content") : "") ||
    sessionStorage.getItem("albayan_csrf_token") ||
    localStorage.getItem("albayan_csrf_token") || "";
}

function csrfHeaders(extra = {}) {
  const headers = Object.assign({
    "Content-Type": "application/json",
    "X-CSRF-Token": getCsrfToken()
  }, extra);
  const token = localStorage.getItem("albayan_saved_token");
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = "Bearer " + token;
    headers["X-Albayan-Token"] = token;
  }
  return headers;
}

// Global State
let currentActiveSection = "staff";
let allUsersData = [];
let activeRoleFilter = "all";

let allStudentsData = [];
let allCirclesData = [];
let activeStudentStatusFilter = "all";
let activeStudentCircleFilter = "all";
let alertTimeoutHandle = null;
let showStatsStrip = true;

try {
  showStatsStrip = localStorage.getItem("albayan_users_show_stats") !== "0";
} catch (e) {}

// ==============================================
// INITIALIZATION
// ==============================================
document.addEventListener("DOMContentLoaded", async () => {
  initMobileSidebar();
  initOverflowMenu();
  applyStatsStripVisibility();
  await checkAuth();
  await refreshAllAccounts(false);

  // Re-sync automatically when global background sync finishes
  window.addEventListener("albayan:db-synced", () => {
    refreshAllAccounts(false).catch(() => {});
  });
});

async function refreshAllAccounts(isManual = false) {
  const syncBtn = document.getElementById("btnSyncUsers");
  if (syncBtn) syncBtn.classList.add("spinning");

  try {
    await loadUsers();
    await loadStudents();
    if (isManual) {
      showAlert("تم تحديث ومزامنة حسابات الكادر والطلاب بنجاح.", "ok");
    }
  } finally {
    if (syncBtn) syncBtn.classList.remove("spinning");
  }
}

// ==============================================
// HELPERS: NORMALIZATION, DIALOGS, CLIPBOARD
// ==============================================
function normalizeArabicSearch(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEntityId(rawId, prefix = "") {
  if (rawId === null || rawId === undefined) return null;
  let s = String(rawId).trim();
  if (prefix) {
    s = s.replace(new RegExp(`^${prefix}_`, "i"), "");
  }
  s = s.replace(/^(users_|students_|student_|circles_)/i, "").trim();
  if (!s) return null;
  const num = Number(s);
  return (!Number.isNaN(num) && String(num) === s) ? num : s;
}

function parsePermissions(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
      return raw.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function getDeletedSet(storageKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch (e) {
    return new Set();
  }
}

function addDeletedTombstone(storageKey, id) {
  try {
    const set = getDeletedSet(storageKey);
    set.add(String(id));
    localStorage.setItem(storageKey, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

async function confirmAction(message, title = "تأكيد الإجراء", isDestructive = true) {
  if (window.AlbayanDialog && typeof window.AlbayanDialog.confirm === "function") {
    return await window.AlbayanDialog.confirm(message, title, {
      isDestructive,
      confirmText: isDestructive ? "نعم، تأكيد" : "تأكيد",
      cancelText: "إلغاء"
    });
  }
  return window.confirm(message);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsArg(str) {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, " ");
}

function formatDualDateShort(rawDate) {
  if (!rawDate) return "";
  try {
    if (window.HijriDate && typeof window.HijriDate.formatDualDate === "function") {
      const dual = window.HijriDate.formatDualDate(rawDate);
      if (dual && dual.hijri) return dual.hijri;
    }
  } catch (e) {}
  return String(rawDate).slice(0, 10);
}

// ==============================================
// AUTHENTICATION & ACCESS CONTROL
// ==============================================
async function checkAuth() {
  const isStandalone = window.IS_CAPACITOR_APP ||
    typeof window.Capacitor !== "undefined" ||
    window.location.protocol === "file:" ||
    window.location.origin.includes("capacitor://") ||
    (window.location.hostname === "localhost" && (!window.location.port || window.location.port === "80"));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    const res = await fetch("/api/me", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Auth request failed");

    const data = await res.json();
    if (!data.logged_in) {
      if (!isStandalone) {
        window.location.href = "login.html";
        return;
      }
      useCachedUserAuth();
      return;
    }

    const perms = parsePermissions(data.permissions);
    const isSuper = data.is_superadmin === 1 || data.is_superadmin === "1";
    if (data.role !== "admin" && !isSuper && !perms.includes("users")) {
      if (!isStandalone) {
        window.location.href = "circles.html";
        return;
      }
    }

    document.getElementById("loggedUsername").textContent = data.username || "مسؤول النظام";
    const roleBadge = document.getElementById("loggedRoleBadge");
    if (roleBadge) {
      if (isSuper) roleBadge.textContent = "المسؤول الأول";
      else if (data.role === "admin") roleBadge.textContent = "مسؤول نظام";
      else if (data.role === "supervisor") roleBadge.textContent = "مشرف تعليمي";
      else roleBadge.textContent = "معلم حلقة";
    }

    window.currentUserIsAdmin = (isSuper || data.role === "admin" || isStandalone);
    const canAccessCv = isSuper || data.role === "admin" || data.role === "supervisor" || perms.includes("student_cv");
    const cvLink = document.getElementById("studentCvMenuLink");
    if (cvLink) cvLink.style.display = canAccessCv ? "flex" : "none";
  } catch (err) {
    useCachedUserAuth();
  }
}

function useCachedUserAuth() {
  let user = null;
  try {
    const cached = localStorage.getItem("albayan_logged_user");
    if (cached) user = JSON.parse(cached);
  } catch (e) {}

  if (!user || (!user.username && !user.student_name)) {
    window.location.href = "login.html";
    return;
  }

  const perms = parsePermissions(user.permissions);
  const isSuper = user.is_superadmin === 1 || user.is_superadmin === "1";
  const username = user.username || "مسؤول النظام";
  const userEl = document.getElementById("loggedUsername");
  if (userEl) userEl.textContent = username;
  const roleBadge = document.getElementById("loggedRoleBadge");
  if (roleBadge) {
    if (isSuper) roleBadge.textContent = "المسؤول الأول";
    else if (user.role === "admin") roleBadge.textContent = "مسؤول نظام";
    else if (user.role === "supervisor") roleBadge.textContent = "مشرف تعليمي";
    else roleBadge.textContent = "كادر تعليمي";
  }
  window.currentUserIsAdmin = (user.role === "admin" || isSuper || perms.includes("users"));
}

async function logout() {
  if (typeof window.albayanLogout === "function") {
    return window.albayanLogout();
  }
  sessionStorage.clear();
  try {
    localStorage.removeItem("albayan_logged_user");
    localStorage.removeItem("albayan_saved_token");
  } catch (e) {}
  await fetch("/api/logout", { method: "POST", headers: csrfHeaders() }).catch(() => {});
  window.location.href = "login.html?logout=1";
}

// ==============================================
// OVERFLOW MENU & TOP BAR CONTROLS
// ==============================================
function initOverflowMenu() {
  const moreBtn = document.getElementById("usersMoreMenuBtn");
  const menuWrap = document.getElementById("usersMoreMenuWrap");

  if (moreBtn) {
    moreBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleUsersMoreMenu();
    });
  }

  const bindMenuAction = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        closeUsersMoreMenu();
        fn();
      });
    }
  };

  bindMenuAction("menuItemAddStaff", openAddUserModal);
  bindMenuAction("menuItemAddStudent", openAddStudentModal);
  bindMenuAction("menuItemSyncNow", () => refreshAllAccounts(true));
  bindMenuAction("menuItemExportStudents", exportStudentsExcel);
  bindMenuAction("menuItemToggleStats", toggleStatsStrip);

  document.addEventListener("click", (e) => {
    if (menuWrap && !menuWrap.contains(e.target)) {
      closeUsersMoreMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeUsersMoreMenu();
    }
  });

  document.addEventListener("backbutton", (e) => {
    const dropdown = document.getElementById("usersMoreMenuDropdown");
    if (dropdown && dropdown.classList.contains("open")) {
      closeUsersMoreMenu();
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    }
  }, true);
}

function toggleUsersMoreMenu() {
  const dropdown = document.getElementById("usersMoreMenuDropdown");
  const btn = document.getElementById("usersMoreMenuBtn");
  if (!dropdown) return;
  const willOpen = !dropdown.classList.contains("open");
  dropdown.classList.toggle("open", willOpen);
  if (btn) btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function closeUsersMoreMenu() {
  const dropdown = document.getElementById("usersMoreMenuDropdown");
  const btn = document.getElementById("usersMoreMenuBtn");
  if (dropdown) dropdown.classList.remove("open");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

function toggleStatsStrip() {
  showStatsStrip = !showStatsStrip;
  try {
    localStorage.setItem("albayan_users_show_stats", showStatsStrip ? "1" : "0");
  } catch (e) {}
  applyStatsStripVisibility();
}

function applyStatsStripVisibility() {
  const strip = document.getElementById("waSummaryStrip");
  const label = document.getElementById("menuItemToggleStatsLabel");
  if (strip) strip.classList.toggle("hidden", !showStatsStrip);
  if (label) label.textContent = showStatsStrip ? "إخفاء شريط الإحصائيات" : "إظهار شريط الإحصائيات";
}

function openPrimaryAddModal() {
  if (currentActiveSection === "students") {
    openAddStudentModal();
  } else {
    openAddUserModal();
  }
}

// ==============================================
// TAB SWITCHER & UNIFIED SEARCH CONTROLLER
// ==============================================
function switchSectionTab(tab) {
  currentActiveSection = tab === "students" ? "students" : "staff";

  const tabStaffBtn = document.getElementById("tabStaffBtn");
  const tabStudentsBtn = document.getElementById("tabStudentsBtn");
  const staffSection = document.getElementById("staffSection");
  const studentsSection = document.getElementById("studentsSection");
  const staffPills = document.getElementById("staffFilterPills");
  const studentPills = document.getElementById("studentsFilterPills");
  const searchInput = document.getElementById("usersSearchInput");
  const fabBtn = document.getElementById("waFabAddBtn");
  const headerAddBtn = document.getElementById("btnQuickAddHeader");

  if (currentActiveSection === "staff") {
    if (tabStaffBtn) {
      tabStaffBtn.classList.add("active");
      tabStaffBtn.setAttribute("aria-selected", "true");
    }
    if (tabStudentsBtn) {
      tabStudentsBtn.classList.remove("active");
      tabStudentsBtn.setAttribute("aria-selected", "false");
    }
    if (staffSection) staffSection.style.display = "block";
    if (studentsSection) studentsSection.style.display = "none";
    if (staffPills) staffPills.style.display = "flex";
    if (studentPills) studentPills.style.display = "none";
    if (searchInput) searchInput.placeholder = "بحث في الكادر بالاسم أو الدور أو الصلاحية...";
    if (fabBtn) fabBtn.title = "إنشاء حساب كادر جديد";
    if (headerAddBtn) headerAddBtn.title = "إنشاء حساب كادر جديد";

    renderStats(allUsersData);
    filterUsersTable();
  } else {
    if (tabStudentsBtn) {
      tabStudentsBtn.classList.add("active");
      tabStudentsBtn.setAttribute("aria-selected", "true");
    }
    if (tabStaffBtn) {
      tabStaffBtn.classList.remove("active");
      tabStaffBtn.setAttribute("aria-selected", "false");
    }
    if (studentsSection) studentsSection.style.display = "block";
    if (staffSection) staffSection.style.display = "none";
    if (staffPills) staffPills.style.display = "none";
    if (studentPills) studentPills.style.display = "flex";
    if (searchInput) searchInput.placeholder = "بحث في الطلاب بالاسم أو الحلقة أو المعلم...";
    if (fabBtn) fabBtn.title = "إضافة حساب طالب جديد";
    if (headerAddBtn) headerAddBtn.title = "إضافة حساب طالب جديد";

    renderStudentStats(allStudentsData);
    filterStudentsTable();
  }
}

function handleUnifiedSearchInput() {
  const input = document.getElementById("usersSearchInput");
  const clearBtn = document.getElementById("usersSearchClearBtn");
  const val = input ? input.value : "";
  if (clearBtn) {
    clearBtn.classList.toggle("visible", val.trim().length > 0);
  }
  if (currentActiveSection === "students") {
    filterStudentsTable();
  } else {
    filterUsersTable();
  }
}

function clearUnifiedSearch() {
  const input = document.getElementById("usersSearchInput");
  const clearBtn = document.getElementById("usersSearchClearBtn");
  if (input) {
    input.value = "";
    input.focus();
  }
  if (clearBtn) clearBtn.classList.remove("visible");
  if (currentActiveSection === "students") {
    filterStudentsTable();
  } else {
    filterUsersTable();
  }
}

// ==============================================
// STAFF USERS MANAGEMENT
// ==============================================
function normalizeUserObj(raw, fallbackId = null) {
  if (!raw || typeof raw !== "object") return null;
  const uid = normalizeEntityId(raw.id !== undefined ? raw.id : (raw.local_id !== undefined ? raw.local_id : fallbackId), "users");
  if (uid === null) return null;
  const perms = parsePermissions(raw.permissions);
  const code = String(raw.code || raw.passcode || "").trim();
  const isSuper = (raw.is_superadmin === 1 || raw.is_superadmin === "1" || raw.is_superadmin === true) ? 1 : 0;
  const isActive = raw.is_active === undefined || raw.is_active === null ? 1 : (Number(raw.is_active) === 0 || raw.is_active === false ? 0 : 1);

  return {
    ...raw,
    id: uid,
    local_id: uid,
    username: String(raw.username || raw.display_name || raw.name || "").trim(),
    display_name: String(raw.display_name || raw.username || raw.name || "").trim(),
    role: raw.role || "teacher",
    code,
    passcode: code,
    permissions: perms,
    is_superadmin: isSuper,
    is_active: isActive
  };
}

function deduplicateAndFilterUsers(list) {
  const deletedSet = getDeletedSet("deleted_users");
  const byId = new Map();
  (list || []).forEach((item) => {
    const norm = normalizeUserObj(item);
    if (!norm || !norm.username) return;
    if (deletedSet.has(String(norm.id))) return;
    byId.set(String(norm.id), norm);
  });
  return Array.from(byId.values()).sort((a, b) => {
    if (a.is_superadmin !== b.is_superadmin) return b.is_superadmin - a.is_superadmin;
    return String(a.username).localeCompare(String(b.username), "ar");
  });
}

async function persistUsersCache(usersList) {
  try {
    localStorage.setItem("cached_users_list", JSON.stringify(usersList));
  } catch (e) {}
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveUsers === "function") {
    try {
      await window.AlbayanLocalDB.saveUsers(usersList);
    } catch (e) {}
  }
}

async function loadUsers() {
  let fetched = false;

  // 1. Instant Cache Render (<10ms) from AlbayanLocalDB or localStorage
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getUsers === "function") {
    try {
      const localUsers = await window.AlbayanLocalDB.getUsers();
      if (Array.isArray(localUsers) && localUsers.length > 0) {
        allUsersData = deduplicateAndFilterUsers(localUsers);
        updateUsersBadgesAndStats();
        if (currentActiveSection === "staff") filterUsersTable();
      }
    } catch (e) {}
  }

  if (allUsersData.length === 0) {
    try {
      const lsUsers = JSON.parse(localStorage.getItem("cached_users_list") || "[]");
      if (Array.isArray(lsUsers) && lsUsers.length > 0) {
        allUsersData = deduplicateAndFilterUsers(lsUsers);
        updateUsersBadgesAndStats();
        if (currentActiveSection === "staff") filterUsersTable();
      }
    } catch (e) {}
  }

  // 2. Try local Python server API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1400);
    const res = await fetch("/api/users", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const users = await res.json();
      if (Array.isArray(users) && users.length > 0) {
        allUsersData = deduplicateAndFilterUsers(users);
        fetched = true;
        await persistUsersCache(allUsersData);
      }
    }
  } catch (err) {}

  // 3. Firebase RTDB pull
  if (!fetched) {
    if (typeof window.pullUsersFromFirebase === "function") {
      try {
        const fbUsers = await window.pullUsersFromFirebase();
        if (Array.isArray(fbUsers) && fbUsers.length > 0) {
          allUsersData = deduplicateAndFilterUsers(fbUsers);
          fetched = true;
          await persistUsersCache(allUsersData);
        }
      } catch (e) {}
    }

    if (!fetched) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const fbRes = await fetch(`${FB_RTDB_BASE}/users.json`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (fbRes.ok) {
          const raw = await fbRes.json();
          if (raw && typeof raw === "object") {
            const list = [];
            Object.entries(raw).forEach(([k, v]) => {
              const norm = normalizeUserObj(v, k);
              if (norm) list.push(norm);
            });
            if (list.length > 0) {
              allUsersData = deduplicateAndFilterUsers(list);
              fetched = true;
              await persistUsersCache(allUsersData);
            }
          }
        }
      } catch (e) {}
    }
  }

  updateUsersBadgesAndStats();
  if (currentActiveSection === "staff") {
    filterUsersTable();
  }
}

function updateUsersBadgesAndStats() {
  const countBadge = document.getElementById("staffCountBadge");
  if (countBadge) countBadge.textContent = allUsersData.length;
  if (currentActiveSection === "staff") {
    renderStats(allUsersData);
  }
}

function renderStats(users) {
  const strip = document.getElementById("waSummaryStrip");
  if (!strip || currentActiveSection !== "staff") return;

  const total = users.length;
  const active = users.filter(u => u.is_active == 1).length;
  const teachers = users.filter(u => u.role === "teacher").length;
  const admins = users.filter(u => u.role === "admin" || u.role === "supervisor").length;

  strip.innerHTML = `
    <div class="wa-stat-chip accent-blue">
      <strong>${total}</strong>
      <span>إجمالي الكادر</span>
    </div>
    <div class="wa-stat-chip accent-green">
      <strong>${active}</strong>
      <span>نشط ومفعّل</span>
    </div>
    <div class="wa-stat-chip accent-amber">
      <strong>${teachers}</strong>
      <span>معلمو الحلقات</span>
    </div>
    <div class="wa-stat-chip accent-purple">
      <strong>${admins}</strong>
      <span>الإدارة والإشراف</span>
    </div>
  `;
}

function setUserRoleFilter(role, btnEl) {
  activeRoleFilter = role || "all";
  const buttons = document.querySelectorAll("#staffFilterPills .wa-filter-pill");
  buttons.forEach(b => b.classList.remove("active"));
  if (btnEl) {
    btnEl.classList.add("active");
  } else {
    const matching = document.querySelector(`#staffFilterPills [data-role="${activeRoleFilter}"]`);
    if (matching) matching.classList.add("active");
  }
  filterUsersTable();
}

function getRoleMeta(role, isSuper) {
  if (isSuper) return { cls: "superadmin", label: "المسؤول الأول", inlineCls: "" };
  if (role === "admin") return { cls: "admin", label: "مسؤول نظام", inlineCls: "" };
  if (role === "supervisor") return { cls: "supervisor", label: "مشرف تعليمي", inlineCls: "supervisor" };
  return { cls: "teacher", label: "معلم حلقة", inlineCls: "teacher" };
}

function filterUsersTable() {
  const listEl = document.getElementById("usersChatList");
  if (!listEl) return;

  const rawQuery = (document.getElementById("usersSearchInput")?.value || "").trim();
  const normQuery = normalizeArabicSearch(rawQuery);

  const permMap = {
    circles: "الحلقات",
    exams: "الاختبارات",
    analytics: "الإحصائيات",
    student_cv: "السير الذاتية",
    users: "المستخدمون",
    all_circles: "جميع الحلقات",
    own_circle: "حلقته فقط"
  };

  const filtered = allUsersData.filter(u => {
    const isSuper = u.is_superadmin === 1;
    const roleInfo = getRoleMeta(u.role, isSuper);
    const perms = parsePermissions(u.permissions);
    const permsText = perms.map(p => permMap[p] || p).join(" ");

    const haystack = normalizeArabicSearch(`${u.username} ${u.display_name || ""} ${roleInfo.label} ${permsText}`);
    const matchQuery = !normQuery || haystack.includes(normQuery);

    let matchRole = true;
    if (activeRoleFilter === "admin") matchRole = u.role === "admin";
    else if (activeRoleFilter === "supervisor") matchRole = u.role === "supervisor";
    else if (activeRoleFilter === "teacher") matchRole = u.role === "teacher";
    else if (activeRoleFilter === "active") matchRole = u.is_active == 1;
    else if (activeRoleFilter === "inactive") matchRole = u.is_active == 0;

    return matchQuery && matchRole;
  });

  if (filtered.length === 0) {
    const hasFilter = Boolean(normQuery) || activeRoleFilter !== "all";
    listEl.innerHTML = `
      <div class="wa-empty-state">
        <div style="font-size:15.5px; font-weight:800;">${hasFilter ? "لا توجد حسابات مطابقة" : "لا توجد حسابات كادر بعد"}</div>
        <p>${hasFilter ? "جرّب تعديل كلمة البحث أو تغيير فلتر الدور." : "اضغط على زر الإضافة لإنشاء أول حساب في كادر المدرسة."}</p>
        ${hasFilter ? `
          <button type="button" class="wa-filter-pill active" onclick="resetStaffFilters()">إعادة ضبط البحث والفلتر</button>
        ` : `
          <button type="button" class="wa-filter-pill active" onclick="openAddUserModal()">إنشاء حساب كادر</button>
        `}
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(u => {
    const isSuper = u.is_superadmin === 1;
    const isActive = u.is_active == 1;
    const perms = parsePermissions(u.permissions);
    const roleMeta = getRoleMeta(u.role, isSuper);
    const initialChar = (u.username || "م").trim().charAt(0).toUpperCase();
    const safeId = escapeJsArg(u.id);

    const permsSummary = (isSuper || perms.length === 0)
      ? "جميع الصلاحيات"
      : perms.slice(0, 3).map(p => permMap[p] || p).join("، ") + (perms.length > 3 ? ` (+${perms.length - 3})` : "");

    const statusText = !isActive
      ? `<span class="wa-row-status-text danger">معطّل</span>`
      : (u.has_logged_in
          ? `<span class="wa-row-status-text ok">مسجّل دخول</span>`
          : `<span class="wa-row-status-text">${escapeHtml(formatDualDateShort(u.created_at) || "نشط")}</span>`);

    const avatarCls = isActive ? roleMeta.cls : "disabled-avatar";
    const dotCls = isActive ? "online" : "offline";

    return `
      <div class="wa-user-row" role="button" tabindex="0" onclick="openEditUserModal('${safeId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEditUserModal('${safeId}');}">
        <div class="wa-user-avatar-wrap">
          <div class="wa-user-avatar ${avatarCls}" aria-hidden="true">${escapeHtml(initialChar)}</div>
          <span class="wa-avatar-dot ${dotCls}" title="${isActive ? 'حساب نشط' : 'حساب معطّل'}"></span>
        </div>

        <div class="wa-user-info">
          <div class="wa-user-top-line">
            <div class="wa-user-name-wrap">
              <h3 class="wa-user-name">${escapeHtml(u.username)}</h3>
              ${isSuper ? '<span class="wa-super-tag">المسؤول الأول</span>' : ''}
            </div>
            ${statusText}
          </div>

          <div class="wa-user-meta">
            <span class="wa-role-inline ${roleMeta.inlineCls}">${escapeHtml(roleMeta.label)}</span>
            <span>•</span>
            <span>${escapeHtml(permsSummary)}</span>
            ${u.code && window.currentUserIsAdmin ? `<span class="wa-inline-pin-pill" id="inlineStaffPin_${escapeHtml(String(u.id))}">${escapeHtml(u.code)}</span>` : ''}
          </div>
        </div>

        <div class="wa-user-row-actions" onclick="event.stopPropagation()">
          ${window.currentUserIsAdmin && u.code ? `
            <button type="button" class="wa-row-icon-btn" onclick="toggleInlinePin('inlineStaffPin_${escapeHtml(String(u.id))}', this)" title="إظهار / إخفاء كلمة المرور" aria-label="إظهار أو إخفاء كلمة المرور">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          ` : ''}
          <button type="button" class="wa-row-icon-btn" onclick="copyUserCredentials('${safeId}')" title="نسخ بيانات الدخول" aria-label="نسخ بيانات الدخول">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <span class="wa-row-chevron" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </span>
        </div>
      </div>
    `;
  }).join("");
}

function resetStaffFilters() {
  const inp = document.getElementById("usersSearchInput");
  const clr = document.getElementById("usersSearchClearBtn");
  if (inp) inp.value = "";
  if (clr) clr.classList.remove("visible");
  setUserRoleFilter("all");
}

function toggleInlinePin(pillId, btnEl) {
  const pill = document.getElementById(pillId);
  if (!pill) return;
  const shown = pill.classList.toggle("visible");
  if (btnEl) {
    btnEl.style.color = shown ? "#2563EB" : "";
  }
}

function onUserRoleSelectChanged() {
  const editId = document.getElementById("editUserId").value;
  if (editId) return; // Keep custom permissions while editing existing users
  const role = document.getElementById("userRole").value;
  const checkboxes = document.querySelectorAll('#userModal input[name="perm"]');
  const presets = {
    admin: ["circles", "all_circles", "exams", "analytics", "student_cv", "users"],
    supervisor: ["circles", "all_circles", "exams", "analytics", "student_cv"],
    teacher: ["circles", "exams", "analytics", "student_cv"]
  };
  const target = presets[role] || presets.teacher;
  checkboxes.forEach(cb => {
    if (!cb.disabled) cb.checked = target.includes(cb.value);
  });
}

function generateRandomStaffCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const input = document.getElementById("newCode");
  if (input) {
    input.value = code;
    input.type = "text";
    const eyeIcon = document.getElementById("newCodeEyeIcon");
    if (eyeIcon) eyeIcon.setAttribute("data-lucide", "eye-off");
    if (window.lucide) lucide.createIcons();
    input.focus();
    showAlert(`تم توليد رمز مرور عشوائي: ${code}`, "ok");
  }
}

function openAddUserModal() {
  document.getElementById("userModalTitle").textContent = "إنشاء حساب كادر جديد";
  document.getElementById("saveUserBtn").innerHTML = '<span>حفظ وإنشاء الحساب</span> <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>';
  document.getElementById("editUserId").value = "";
  document.getElementById("newUsername").value = "";
  document.getElementById("newUsername").disabled = false;
  document.getElementById("newCode").value = "";
  document.getElementById("newCode").type = "password";
  document.getElementById("newCode").required = true;
  document.getElementById("newCodeReqStar").style.display = "inline";
  document.getElementById("newCodeHelper").style.display = "none";
  document.getElementById("userRole").value = "teacher";
  document.getElementById("userRole").disabled = false;
  document.getElementById("userStatusField").style.display = "none";
  document.getElementById("userActiveStatus").value = "1";

  const banner = document.getElementById("staffModalProfileBanner");
  if (banner) banner.style.display = "none";

  const deleteBtn = document.getElementById("deleteUserBtn");
  if (deleteBtn) deleteBtn.style.display = "none";

  const checkboxes = document.querySelectorAll('#userModal input[name="perm"]');
  checkboxes.forEach(cb => { cb.disabled = false; });
  onUserRoleSelectChanged();

  openModal("userModal");
  if (window.lucide) lucide.createIcons();
}

function openEditUserModal(userId) {
  const user = allUsersData.find(u => String(u.id) === String(userId));
  if (!user) return;

  const isSuper = user.is_superadmin === 1;
  const isActive = user.is_active == 1;
  const roleMeta = getRoleMeta(user.role, isSuper);

  document.getElementById("userModalTitle").textContent = `إدارة حساب: ${user.username}`;
  document.getElementById("saveUserBtn").innerHTML = '<span>حفظ التعديلات</span> <i data-lucide="check" style="width:16px; height:16px;"></i>';
  document.getElementById("editUserId").value = user.id;
  document.getElementById("newUsername").value = user.username;
  document.getElementById("newUsername").disabled = isSuper;
  document.getElementById("newCode").value = user.code || "";
  document.getElementById("newCode").type = "password";
  const eyeIcon = document.getElementById("newCodeEyeIcon");
  if (eyeIcon) eyeIcon.setAttribute("data-lucide", "eye");
  document.getElementById("newCode").required = false;
  document.getElementById("newCodeReqStar").style.display = "none";
  document.getElementById("newCodeHelper").style.display = "block";
  document.getElementById("userRole").value = user.role || "teacher";
  document.getElementById("userRole").disabled = isSuper;

  // Profile Banner
  const banner = document.getElementById("staffModalProfileBanner");
  if (banner) {
    banner.style.display = "flex";
    const av = document.getElementById("staffBannerAvatar");
    if (av) {
      av.className = `wa-user-avatar ${isActive ? roleMeta.cls : "disabled-avatar"}`;
      av.textContent = (user.username || "م").trim().charAt(0).toUpperCase();
    }
    const bn = document.getElementById("staffBannerName");
    if (bn) bn.textContent = user.username;
    const bs = document.getElementById("staffBannerSubtitle");
    if (bs) bs.textContent = `${roleMeta.label} • ${isActive ? "حساب نشط" : "حساب معطّل"}`;

    const toggleQuickBtn = document.getElementById("btnToggleStaffActiveQuick");
    const toggleQuickLbl = document.getElementById("btnToggleStaffActiveLabel");
    if (toggleQuickBtn) {
      toggleQuickBtn.style.display = isSuper ? "none" : "inline-flex";
    }
    if (toggleQuickLbl) {
      toggleQuickLbl.textContent = isActive ? "تعطيل" : "تفعيل";
    }
  }

  const statusField = document.getElementById("userStatusField");
  const statusSelect = document.getElementById("userActiveStatus");
  if (statusField && statusSelect) {
    statusField.style.display = isSuper ? "none" : "block";
    statusSelect.value = isActive ? "1" : "0";
  }

  const deleteBtn = document.getElementById("deleteUserBtn");
  if (deleteBtn) {
    deleteBtn.style.display = isSuper ? "none" : "inline-flex";
  }

  const perms = parsePermissions(user.permissions);
  const checkboxes = document.querySelectorAll('#userModal input[name="perm"]');
  checkboxes.forEach(cb => {
    cb.checked = isSuper ? true : perms.includes(cb.value);
    cb.disabled = isSuper;
  });

  openModal("userModal");
  if (window.lucide) lucide.createIcons();
}

function toggleAllPerms(check) {
  const checkboxes = document.querySelectorAll('#userModal input[name="perm"]');
  checkboxes.forEach(cb => {
    if (!cb.disabled) cb.checked = check;
  });
}

async function toggleCurrentUserActiveQuick() {
  const editId = document.getElementById("editUserId").value;
  if (!editId) return;
  const user = allUsersData.find(u => String(u.id) === String(editId));
  if (!user || user.is_superadmin === 1) return;

  const nextActive = user.is_active == 1 ? 0 : 1;
  const statusSelect = document.getElementById("userActiveStatus");
  if (statusSelect) statusSelect.value = String(nextActive);

  await persistStaffUser({
    id: user.id,
    username: user.username,
    code: document.getElementById("newCode").value.trim() || user.code || "",
    role: document.getElementById("userRole").value || user.role,
    permissions: Array.from(document.querySelectorAll('#userModal input[name="perm"]:checked')).map(cb => cb.value),
    is_active: nextActive,
    isEdit: true,
    existingUser: user
  });
}

async function saveUser(e) {
  e.preventDefault();
  const editId = document.getElementById("editUserId").value.trim();
  const username = document.getElementById("newUsername").value.trim();
  const code = document.getElementById("newCode").value.trim();
  const role = document.getElementById("userRole").value;
  const is_active = parseInt(document.getElementById("userActiveStatus")?.value || "1", 10);
  const perms = Array.from(document.querySelectorAll('#userModal input[name="perm"]:checked')).map(cb => cb.value);

  if (!username) {
    showAlert("الرجاء إدخال اسم المستخدم.", "error");
    return;
  }

  if (!editId && !code) {
    showAlert("الرجاء إدخال كلمة المرور أو الرمز السري للحساب الجديد.", "error");
    return;
  }

  // Duplicate username validation on create
  if (!editId) {
    const normNew = normalizeArabicSearch(username);
    const dup = allUsersData.find(u => normalizeArabicSearch(u.username) === normNew);
    if (dup) {
      showAlert(`اسم المستخدم "${username}" مسجّل مسبقاً، اختر اسماً آخر.`, "error");
      return;
    }
  }

  const existingUser = editId ? allUsersData.find(u => String(u.id) === String(editId)) : null;

  await persistStaffUser({
    id: editId ? (normalizeEntityId(editId, "users") ?? editId) : Date.now(),
    username,
    code: code || (existingUser ? existingUser.code : ""),
    role,
    permissions: perms,
    is_active,
    isEdit: Boolean(editId),
    existingUser
  });
}

async function persistStaffUser({ id, username, code, role, permissions, is_active, isEdit, existingUser }) {
  const saveBtn = document.getElementById("saveUserBtn");
  if (saveBtn) saveBtn.disabled = true;

  const url = isEdit ? `/api/users/${id}` : "/api/users";
  const method = isEdit ? "PUT" : "POST";
  const bodyData = { username, role, permissions, is_active };
  if (code) bodyData.code = code;

  let serverSaved = false;
  let serverErrorMsg = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(url, {
      method,
      headers: csrfHeaders(),
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      serverSaved = true;
    } else if (res.status >= 400 && res.status < 500 && data.message) {
      serverErrorMsg = data.message;
    }
  } catch (err) {
    // Offline / APK / Static mode -> fall through to Firebase + LocalDB
  }

  if (serverErrorMsg) {
    if (saveBtn) saveBtn.disabled = false;
    showAlert(serverErrorMsg, "error");
    return;
  }

  const nowIso = new Date().toISOString();
  const userPayload = normalizeUserObj({
    ...(existingUser || {}),
    id,
    local_id: id,
    username,
    display_name: username,
    role,
    permissions,
    is_active,
    code: code || (existingUser ? existingUser.code : ""),
    passcode: code || (existingUser ? existingUser.code : ""),
    is_superadmin: existingUser ? existingUser.is_superadmin : 0,
    created_at: (existingUser && existingUser.created_at) ? existingUser.created_at : nowIso,
    updated_at: nowIso
  });

  // Always sync to Firebase RTDB so APK & Cloud stay aligned
  let fbSaved = false;
  if (typeof window.saveUserToFirebase === "function") {
    try {
      fbSaved = await window.saveUserToFirebase(userPayload);
    } catch (e) {}
  } else {
    try {
      const fbRes = await fetch(`${FB_RTDB_BASE}/users/${id}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload)
      });
      fbSaved = fbRes.ok;
    } catch (e) {}
  }

  // Update in-memory list & local IndexedDB immediately
  const idx = allUsersData.findIndex(u => String(u.id) === String(id));
  if (idx >= 0) {
    allUsersData[idx] = userPayload;
  } else {
    allUsersData.push(userPayload);
  }
  allUsersData = deduplicateAndFilterUsers(allUsersData);
  await persistUsersCache(allUsersData);

  if (saveBtn) saveBtn.disabled = false;
  closeModal("userModal");
  updateUsersBadgesAndStats();
  filterUsersTable();

  if (serverSaved || fbSaved) {
    showAlert(isEdit ? `تم تحديث حساب "${username}" بنجاح.` : `تم إنشاء حساب "${username}" وحفظه في السحابة بنجاح.`, "ok");
  } else {
    showAlert(isEdit ? "تم حفظ تعديلات الحساب محلياً." : "تم إنشاء الحساب محلياً.", "ok");
  }
}

async function deleteCurrentUserFromModal() {
  const editId = document.getElementById("editUserId").value;
  if (!editId) return;
  await deleteUser(editId);
}

async function deleteUser(userId) {
  const user = allUsersData.find(u => String(u.id) === String(userId));
  if (user && user.is_superadmin === 1) {
    showAlert("الحساب الرئيسي الأول للنظام محمي من الحذف.", "error");
    return;
  }

  const label = user ? `"${user.username}"` : "هذا الحساب";
  const confirmed = await confirmAction(
    `هل أنت متأكد تماماً من رغبتك في حذف حساب ${label}؟ لن يمكن التراجع عن هذا الإجراء.`,
    "حذف حساب كادر",
    true
  );
  if (!confirmed) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: csrfHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (err) {}

  addDeletedTombstone("deleted_users", userId);

  if (typeof window.deleteUserFromFirebase === "function") {
    try {
      await window.deleteUserFromFirebase(userId);
    } catch (e) {}
  } else {
    try {
      await fetch(`${FB_RTDB_BASE}/users/${userId}.json`, { method: "DELETE" });
    } catch (e) {}
  }

  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.deleteLocalUser === "function") {
    try { await window.AlbayanLocalDB.deleteLocalUser(userId); } catch (e) {}
  }

  allUsersData = allUsersData.filter(u => String(u.id) !== String(userId));
  await persistUsersCache(allUsersData);

  closeModal("userModal");
  updateUsersBadgesAndStats();
  filterUsersTable();
  showAlert("تم حذف الحساب بنجاح.", "ok");
}

function copyCurrentUserCredentials() {
  const editId = document.getElementById("editUserId").value;
  if (!editId) return;
  copyUserCredentials(editId);
}

function copyUserCredentials(userId) {
  const user = allUsersData.find(u => String(u.id) === String(userId));
  if (!user) return;
  const roleMeta = getRoleMeta(user.role, user.is_superadmin === 1);
  const codeVal = user.code || "123456";
  const message =
    `بيانات الدخول إلى منصة مدرسة البيان\n` +
    `اسم المستخدم: ${user.username}\n` +
    `الدور: ${roleMeta.label}\n` +
    `رمز الدخول: ${codeVal}`;

  copyToClipboard(message, `تم نسخ بيانات دخول "${user.username}" بنجاح.`);
}

// ==============================================
// STUDENTS ACCOUNTS MANAGEMENT
// ==============================================
function enrichStudentsList(rawStudents, circlesList, usersList) {
  const deletedStudents = getDeletedSet("deleted_students");
  const deletedCircles = getDeletedSet("deleted_circles");

  const circleMap = new Map();
  (circlesList || []).forEach(c => {
    if (!c) return;
    const cid = normalizeEntityId(c.id !== undefined ? c.id : c.local_id, "circles");
    if (cid === null || deletedCircles.has(String(cid))) return;
    circleMap.set(String(cid), { ...c, id: cid });
  });

  const userNameMap = new Map();
  (usersList || []).forEach(u => {
    if (u && u.id !== undefined) {
      userNameMap.set(String(u.id), u.username || u.display_name || "");
    }
  });

  const dedup = new Map();
  (rawStudents || []).forEach((s, idx) => {
    if (!s || typeof s !== "object") return;
    const sid = normalizeEntityId(s.id !== undefined ? s.id : (s.student_id !== undefined ? s.student_id : idx), "students");
    if (sid === null || deletedStudents.has(String(sid))) return;
    const sName = String(s.name || s.student_name || "").trim();
    if (!sName) return;

    const cid = normalizeEntityId(s.circle_id, "circles");
    if (cid !== null && deletedCircles.has(String(cid))) return;

    const circleObj = cid !== null ? circleMap.get(String(cid)) : null;
    const circleName = (circleObj && circleObj.name) || s.circle_name || "بدون حلقة";
    let teacherName = (circleObj && circleObj.teacher_name) || "";
    if (!teacherName && circleObj && circleObj.teacher_id !== undefined) {
      teacherName = userNameMap.get(String(circleObj.teacher_id)) || "";
    }
    if (!teacherName) teacherName = s.teacher_name || "غير محدد";

    const codeDisplay = String(s.code_display !== undefined && s.code_display !== null ? s.code_display : (s.code || "")).trim();
    const hasCode = codeDisplay.length > 0;

    const existing = dedup.get(String(sid));
    if (!existing || (hasCode && !existing.has_code)) {
      dedup.set(String(sid), {
        ...s,
        id: sid,
        name: sName,
        circle_id: cid,
        circle_name: circleName,
        teacher_name: teacherName,
        code: codeDisplay,
        code_display: codeDisplay,
        has_code: hasCode
      });
    }
  });

  return Array.from(dedup.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "ar")
  );
}

async function loadStudents() {
  let fetched = false;
  let rawStudents = [];
  let rawCircles = [];

  // 1. Try local server API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    const res = await fetch("/api/users/students", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      rawStudents = data.students || [];
      rawCircles = data.circles || [];
      fetched = true;
    }
  } catch (err) {}

  // 2. Fallback: Firebase RTDB (or CirclesService)
  if (!fetched) {
    try {
      const [studentsRes, circlesRes] = await Promise.all([
        fetch(`${FB_RTDB_BASE}/students.json`),
        fetch(`${FB_RTDB_BASE}/circles.json`)
      ]);

      if (studentsRes.ok) {
        const rawS = await studentsRes.json();
        if (rawS) {
          if (Array.isArray(rawS)) {
            rawS.forEach((s, idx) => { if (s) rawStudents.push({ ...s, id: s.id || idx }); });
          } else {
            Object.entries(rawS).forEach(([k, s]) => {
              if (s && typeof s === "object") {
                const sid = normalizeEntityId(s.id !== undefined ? s.id : k, "students");
                if (sid !== null) rawStudents.push({ ...s, id: sid });
              }
            });
          }
          fetched = true;
        }
      }

      if (circlesRes.ok) {
        const rawC = await circlesRes.json();
        if (rawC) {
          if (Array.isArray(rawC)) {
            rawC.forEach((c, idx) => { if (c) rawCircles.push({ ...c, id: c.id || idx }); });
          } else {
            Object.entries(rawC).forEach(([k, c]) => {
              if (c && typeof c === "object") {
                const cid = normalizeEntityId(c.id !== undefined ? c.id : k, "circles");
                if (cid !== null) rawCircles.push({ ...c, id: cid });
              }
            });
          }
        }
      }
    } catch (e) {}
  }

  // 3. Fallback: IndexedDB Cache
  if (!fetched && window.AlbayanLocalDB) {
    try {
      const cachedCircles = await window.AlbayanLocalDB.getLocalCircles();
      if (Array.isArray(cachedCircles) && cachedCircles.length > 0) {
        rawCircles = cachedCircles;
      }
      const cachedStudents = [];
      for (const c of rawCircles) {
        const st = await window.AlbayanLocalDB.getLocalStudents(c.id);
        if (Array.isArray(st)) cachedStudents.push(...st);
      }
      if (cachedStudents.length > 0) {
        rawStudents = cachedStudents;
        fetched = true;
      }
    } catch (e) {}
  }

  // Merge pending local student changes if any exist
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingStudentChanges === "function") {
    try {
      const pendingChanges = await window.AlbayanLocalDB.getPendingStudentChanges();
      Object.keys(pendingChanges).forEach(pid => {
        const dirty = pendingChanges[pid];
        const cleanPid = normalizeEntityId(pid, "students");
        if (cleanPid === null) return;
        const existing = rawStudents.find(s => String(normalizeEntityId(s.id, "students")) === String(cleanPid));
        if (existing) {
          Object.assign(existing, dirty);
        } else if (dirty && dirty.name) {
          rawStudents.push({
            id: cleanPid,
            name: dirty.name,
            circle_id: dirty.circle_id || "",
            code: dirty.code || "",
            ...dirty
          });
        }
      });
    } catch (e) {}
  }

  const deletedCircles = getDeletedSet("deleted_circles");
  allCirclesData = (rawCircles || [])
    .map(c => ({ ...c, id: normalizeEntityId(c.id, "circles") }))
    .filter(c => c && c.id !== null && c.name && !deletedCircles.has(String(c.id)));

  allStudentsData = enrichStudentsList(rawStudents, allCirclesData, allUsersData);

  const countBadge = document.getElementById("studentsCountBadge");
  if (countBadge) countBadge.textContent = allStudentsData.length;

  populateCircleSelects(allCirclesData);
  if (currentActiveSection === "students") {
    renderStudentStats(allStudentsData);
    filterStudentsTable();
  }
}

function populateCircleSelects(circles) {
  const filterSelect = document.getElementById("filterStudentCircleSelect");
  const modalSelect = document.getElementById("studentCircleSelect");

  if (filterSelect) {
    const currentVal = filterSelect.value || activeStudentCircleFilter || "all";
    filterSelect.innerHTML = `<option value="all">كل الحلقات (${circles.length})</option>` +
      circles.map(c => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.name)}</option>`).join("");
    if (currentVal && Array.from(filterSelect.options).some(o => o.value === currentVal)) {
      filterSelect.value = currentVal;
    } else {
      filterSelect.value = "all";
    }
    filterSelect.classList.toggle("has-selection", filterSelect.value !== "all");
  }

  if (modalSelect) {
    modalSelect.innerHTML = `<option value="">-- اختر الحلقة القرآنية --</option>` +
      circles.map(c => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.name)}</option>`).join("");
  }
}

function onStudentCircleFilterChanged() {
  const filterSelect = document.getElementById("filterStudentCircleSelect");
  activeStudentCircleFilter = filterSelect ? filterSelect.value : "all";
  if (filterSelect) {
    filterSelect.classList.toggle("has-selection", activeStudentCircleFilter !== "all");
  }
  filterStudentsTable();
}

function renderStudentStats(students) {
  const strip = document.getElementById("waSummaryStrip");
  if (!strip || currentActiveSection !== "students") return;

  const total = students.length;
  const withPin = students.filter(s => s.has_code).length;
  const pendingPin = total - withPin;
  const circlesCount = allCirclesData.length;

  strip.innerHTML = `
    <div class="wa-stat-chip accent-blue">
      <strong>${total}</strong>
      <span>إجمالي الطلاب</span>
    </div>
    <div class="wa-stat-chip accent-green">
      <strong>${withPin}</strong>
      <span>مفعّل برمز</span>
    </div>
    <div class="wa-stat-chip accent-amber">
      <strong>${pendingPin}</strong>
      <span>بانتظار الرمز</span>
    </div>
    <div class="wa-stat-chip accent-purple">
      <strong>${circlesCount}</strong>
      <span>الحلقات</span>
    </div>
  `;
}

function setStudentStatusFilter(status, btnEl) {
  activeStudentStatusFilter = status || "all";
  const buttons = document.querySelectorAll("#studentsFilterPills .wa-filter-pill");
  buttons.forEach(b => b.classList.remove("active"));
  if (btnEl) {
    btnEl.classList.add("active");
  } else {
    const matching = document.querySelector(`#studentsFilterPills [data-status="${activeStudentStatusFilter}"]`);
    if (matching) matching.classList.add("active");
  }
  filterStudentsTable();
}

function getFilteredStudentsList() {
  const rawQuery = (document.getElementById("usersSearchInput")?.value || "").trim();
  const normQuery = normalizeArabicSearch(rawQuery);
  const circleFilter = document.getElementById("filterStudentCircleSelect")?.value || "all";

  return allStudentsData.filter(s => {
    const haystack = normalizeArabicSearch(`${s.name} ${s.circle_name} ${s.teacher_name} ${s.code_display || ""}`);
    const matchQuery = !normQuery || haystack.includes(normQuery);

    let matchCircle = true;
    if (circleFilter !== "all") {
      matchCircle = String(s.circle_id) === String(circleFilter);
    }

    let matchStatus = true;
    if (activeStudentStatusFilter === "has_pin") matchStatus = s.has_code === true;
    else if (activeStudentStatusFilter === "no_pin") matchStatus = s.has_code === false;

    return matchQuery && matchCircle && matchStatus;
  });
}

function filterStudentsTable() {
  const listEl = document.getElementById("studentsChatList");
  if (!listEl) return;

  const filtered = getFilteredStudentsList();
  const rawQuery = (document.getElementById("usersSearchInput")?.value || "").trim();
  const circleFilter = document.getElementById("filterStudentCircleSelect")?.value || "all";

  if (filtered.length === 0) {
    const hasFilter = Boolean(rawQuery) || activeStudentStatusFilter !== "all" || circleFilter !== "all";
    listEl.innerHTML = `
      <div class="wa-empty-state">
        <div style="font-size:15.5px; font-weight:800;">${hasFilter ? "لا توجد حسابات طلاب مطابقة" : "لا يوجد طلاب مسجلون بعد"}</div>
        <p>${hasFilter ? "جرّب تعديل كلمة البحث أو اختيار حلقة أخرى." : "يمكنك إضافة طالب جديد وتوليد رمز الدخول الخاص به بسهولة."}</p>
        ${hasFilter ? `
          <button type="button" class="wa-filter-pill active" onclick="resetStudentFilters()">إعادة ضبط البحث والفلتر</button>
        ` : `
          <button type="button" class="wa-filter-pill active" onclick="openAddStudentModal()">إضافة حساب طالب</button>
        `}
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(s => {
    const hasPin = s.has_code;
    const initialChar = (s.name || "ط").trim().charAt(0).toUpperCase();
    const safeId = escapeJsArg(s.id);
    const dotCls = hasPin ? "online" : "pending";

    return `
      <div class="wa-user-row student-row" role="button" tabindex="0" onclick="openEditStudentModal('${safeId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEditStudentModal('${safeId}');}">
        <div class="wa-user-avatar-wrap">
          <div class="wa-user-avatar student" aria-hidden="true">${escapeHtml(initialChar)}</div>
          <span class="wa-avatar-dot ${dotCls}" title="${hasPin ? 'مفعّل برمز سري' : 'بانتظار تعيين الرمز'}"></span>
        </div>

        <div class="wa-user-info">
          <div class="wa-user-top-line">
            <div class="wa-user-name-wrap">
              <h3 class="wa-user-name">${escapeHtml(s.name)}</h3>
            </div>
            <span class="wa-row-status-text ${hasPin ? "ok" : "pending"}">${hasPin ? "مفعّل برمز" : "بدون رمز"}</span>
          </div>

          <div class="wa-user-meta">
            <span class="wa-role-inline circle">${escapeHtml(s.circle_name)}</span>
            <span>•</span>
            <span>المعلم: ${escapeHtml(s.teacher_name)}</span>
            ${hasPin ? `<span class="wa-inline-pin-pill" id="inlineStudentPin_${escapeHtml(String(s.id))}">${escapeHtml(s.code_display)}</span>` : ''}
          </div>
        </div>

        <div class="wa-user-row-actions" onclick="event.stopPropagation()">
          ${hasPin ? `
            <button type="button" class="wa-row-icon-btn" onclick="toggleInlinePin('inlineStudentPin_${escapeHtml(String(s.id))}', this)" title="إظهار / إخفاء الرمز السري" aria-label="إظهار أو إخفاء الرمز السري">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          ` : ''}
          <button type="button" class="wa-row-icon-btn" onclick="copyStudentCredentials('${safeId}')" title="نسخ بيانات الدخول" aria-label="نسخ بيانات الدخول">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <span class="wa-row-chevron" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </span>
        </div>
      </div>
    `;
  }).join("");
}

function resetStudentFilters() {
  const inp = document.getElementById("usersSearchInput");
  const clr = document.getElementById("usersSearchClearBtn");
  const sel = document.getElementById("filterStudentCircleSelect");
  if (inp) inp.value = "";
  if (clr) clr.classList.remove("visible");
  if (sel) {
    sel.value = "all";
    sel.classList.remove("has-selection");
  }
  activeStudentCircleFilter = "all";
  setStudentStatusFilter("all");
}

function openAddStudentModal() {
  document.getElementById("studentModalTitle").textContent = "إضافة حساب طالب جديد";
  document.getElementById("saveStudentBtn").innerHTML = '<span>حفظ وإضافة الطالب</span> <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>';
  document.getElementById("editStudentId").value = "";
  document.getElementById("studentNameInput").value = "";
  document.getElementById("studentCircleSelect").value = (activeStudentCircleFilter && activeStudentCircleFilter !== "all") ? activeStudentCircleFilter : "";
  document.getElementById("studentPinInput").value = "";
  document.getElementById("studentPinInput").type = "password";

  const banner = document.getElementById("studentModalProfileBanner");
  if (banner) banner.style.display = "none";

  const resetPinBtn = document.getElementById("btnModalResetPin");
  if (resetPinBtn) resetPinBtn.style.display = "none";

  const deleteBtn = document.getElementById("deleteStudentBtn");
  if (deleteBtn) deleteBtn.style.display = "none";

  const shareBox = document.getElementById("studentQuickShareBox");
  if (shareBox) shareBox.style.display = "none";

  openModal("studentModal");
  if (window.lucide) lucide.createIcons();
}

function openEditStudentModal(studentId) {
  const student = allStudentsData.find(s => String(s.id) === String(studentId));
  if (!student) return;

  document.getElementById("studentModalTitle").textContent = `إدارة حساب الطالب: ${student.name}`;
  document.getElementById("saveStudentBtn").innerHTML = '<span>حفظ التعديلات</span> <i data-lucide="check" style="width:16px; height:16px;"></i>';
  document.getElementById("editStudentId").value = student.id;
  document.getElementById("studentNameInput").value = student.name;
  document.getElementById("studentCircleSelect").value = student.circle_id ? String(student.circle_id) : "";
  document.getElementById("studentPinInput").value = student.code_display || "";
  document.getElementById("studentPinInput").type = "password";
  const pinEye = document.getElementById("studentPinEyeIcon");
  if (pinEye) pinEye.setAttribute("data-lucide", "eye");

  // Profile Banner
  const banner = document.getElementById("studentModalProfileBanner");
  if (banner) {
    banner.style.display = "flex";
    const av = document.getElementById("studentBannerAvatar");
    if (av) av.textContent = (student.name || "ط").trim().charAt(0).toUpperCase();
    const bn = document.getElementById("studentBannerName");
    if (bn) bn.textContent = student.name;
    const bs = document.getElementById("studentBannerSubtitle");
    if (bs) bs.textContent = `${student.circle_name} • المعلم: ${student.teacher_name}`;
    const cvLink = document.getElementById("studentBannerCvLink");
    if (cvLink) cvLink.href = `student_cv.html?student_id=${encodeURIComponent(student.id)}`;
  }

  const resetPinBtn = document.getElementById("btnModalResetPin");
  if (resetPinBtn) {
    resetPinBtn.style.display = student.has_code ? "inline-flex" : "none";
  }

  const deleteBtn = document.getElementById("deleteStudentBtn");
  if (deleteBtn) deleteBtn.style.display = "inline-flex";

  const shareBox = document.getElementById("studentQuickShareBox");
  const sharePreview = document.getElementById("studentSharePreviewText");
  if (shareBox && sharePreview) {
    shareBox.style.display = "block";
    const pinText = student.has_code ? student.code_display : "يتم تعيينه عند الدخول الأول";
    sharePreview.textContent = `اسم الطالب: ${student.name} | الحلقة: ${student.circle_name} | الرمز: ${pinText}`;
  }

  openModal("studentModal");
  if (window.lucide) lucide.createIcons();
}

function generateRandomStudentPin() {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const input = document.getElementById("studentPinInput");
  if (input) {
    input.value = pin;
    input.type = "text";
    const pinEye = document.getElementById("studentPinEyeIcon");
    if (pinEye) pinEye.setAttribute("data-lucide", "eye-off");
    if (window.lucide) lucide.createIcons();
    input.focus();
    showAlert(`تم توليد رمز سري عشوائي: ${pin}`, "ok");
  }
}

async function saveStudent(e) {
  e.preventDefault();
  const editId = document.getElementById("editStudentId").value.trim();
  const name = document.getElementById("studentNameInput").value.trim();
  const circleId = document.getElementById("studentCircleSelect").value;
  const pin = document.getElementById("studentPinInput").value.trim();

  if (!name) {
    showAlert("الرجاء إدخال اسم الطالب.", "error");
    return;
  }
  if (!circleId) {
    showAlert("الرجاء اختيار الحلقة القرآنية للطالب.", "error");
    return;
  }

  const saveBtn = document.getElementById("saveStudentBtn");
  if (saveBtn) saveBtn.disabled = true;

  const cleanCid = normalizeEntityId(circleId, "circles") ?? circleId;
  const existingStudent = editId ? allStudentsData.find(s => String(s.id) === String(editId)) : null;

  const url = editId ? `/api/users/students/${editId}` : "/api/users/students";
  const method = editId ? "PUT" : "POST";
  const bodyData = { name, circle_id: cleanCid, code: pin || null };

  let serverSaved = false;
  let serverErrorMsg = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(url, {
      method,
      headers: csrfHeaders(),
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      serverSaved = true;
    } else if (res.status >= 400 && res.status < 500 && data.message) {
      serverErrorMsg = data.message;
    }
  } catch (err) {}

  if (serverErrorMsg) {
    if (saveBtn) saveBtn.disabled = false;
    showAlert(serverErrorMsg, "error");
    return;
  }

  // Firebase + LocalDB Sync
  const targetSid = editId ? (normalizeEntityId(editId, "students") ?? editId) : Date.now();
  const nowIso = new Date().toISOString();
  let fbSuccess = false;

  if (editId && existingStudent) {
    // Handle circle transfer if circle changed
    if (String(existingStudent.circle_id) !== String(cleanCid) && window.RosterService && typeof window.RosterService.transferStudent === "function") {
      try {
        await window.RosterService.transferStudent(targetSid, existingStudent.circle_id, cleanCid);
      } catch (e) {}
    }

    const patchPayload = {
      id: targetSid,
      name,
      circle_id: cleanCid,
      code: pin || "",
      updated_at: nowIso
    };

    try {
      const fbRes = await fetch(`${FB_RTDB_BASE}/students/${targetSid}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload)
      });
      fbSuccess = fbRes.ok;
    } catch (e) {}

    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.enqueueChange === "function") {
      try {
        await window.AlbayanLocalDB.enqueueChange("UPDATE_STUDENT", "students", targetSid, patchPayload);
      } catch (e) {}
    }
  } else {
    const studentObj = {
      id: targetSid,
      name,
      circle_id: cleanCid,
      code: pin || ""
    };

    if (window.RosterService && typeof window.RosterService.addStudent === "function") {
      try {
        const res = await window.RosterService.addStudent(cleanCid, name, {}, { id: targetSid, code: pin || "" });
        if (res && res.synced) fbSuccess = true;
      } catch (e) {}
    } else {
      try {
        const fbRes = await fetch(`${FB_RTDB_BASE}/students/${targetSid}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...studentObj, local_id: targetSid, created_at: nowIso, updated_at: nowIso })
        });
        fbSuccess = fbRes.ok;
      } catch (e) {}
    }
  }

  if (saveBtn) saveBtn.disabled = false;
  closeModal("studentModal");
  await loadStudents();

  if (serverSaved || fbSuccess) {
    showAlert(editId ? `تم حفظ بيانات الطالب "${name}" بنجاح.` : `تمت إضافة حساب الطالب "${name}" وحفظه في السحابة بنجاح.`, "ok");
  } else {
    showAlert("تم حفظ بيانات الطالب محلياً على الجهاز.", "ok");
  }
}

async function resetCurrentStudentPinFromModal() {
  const editId = document.getElementById("editStudentId").value;
  if (!editId) return;
  await resetStudentPin(editId);
}

async function resetStudentPin(studentId) {
  const confirmed = await confirmAction(
    "هل ترغب في تصفير الرمز السري للطالب؟ سيُطلب منه وضع رمز جديد عند تسجيل دخوله القادم.",
    "تصفير الرمز السري",
    false
  );
  if (!confirmed) return;

  let ok = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    const res = await fetch(`/api/users/students/${studentId}/reset-pin`, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({}),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) ok = true;
  } catch (err) {}

  try {
    const fbRes = await fetch(`${FB_RTDB_BASE}/students/${studentId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "", updated_at: new Date().toISOString() })
    });
    if (fbRes.ok) ok = true;
  } catch (e) {}

  const pinInput = document.getElementById("studentPinInput");
  if (pinInput) pinInput.value = "";
  const resetBtn = document.getElementById("btnModalResetPin");
  if (resetBtn) resetBtn.style.display = "none";

  await loadStudents();
  showAlert(ok ? "تم تصفير الرمز السري للطالب بنجاح." : "تم تصفير الرمز محلياً.", "ok");
}

async function deleteCurrentStudentFromModal() {
  const editId = document.getElementById("editStudentId").value;
  if (!editId) return;
  await deleteStudent(editId);
}

async function deleteStudent(studentId) {
  const student = allStudentsData.find(s => String(s.id) === String(studentId));
  const stName = student ? student.name : "هذا الطالب";
  const confirmed = await confirmAction(
    `هل أنت متأكد تماماً من رغبتك في حذف حساب الطالب "${stName}" وجميع سجلاته القرآنية؟ لن يمكن استرجاع هذه البيانات.`,
    "حذف حساب طالب",
    true
  );
  if (!confirmed) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1600);
    await fetch(`/api/users/students/${studentId}`, {
      method: "DELETE",
      headers: csrfHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (err) {}

  addDeletedTombstone("deleted_students", studentId);

  if (window.RosterService && typeof window.RosterService.deleteStudent === "function") {
    try {
      await window.RosterService.deleteStudent(student ? student.circle_id : null, studentId);
    } catch (e) {}
  } else {
    try {
      await Promise.all([
        fetch(`${FB_RTDB_BASE}/students/${studentId}.json`, { method: "DELETE" }),
        fetch(`${FB_RTDB_BASE}/students/students_${studentId}.json`, { method: "DELETE" })
      ]);
    } catch (e) {}
  }

  allStudentsData = allStudentsData.filter(s => String(s.id) !== String(studentId));
  const countBadge = document.getElementById("studentsCountBadge");
  if (countBadge) countBadge.textContent = allStudentsData.length;

  closeModal("studentModal");
  renderStudentStats(allStudentsData);
  filterStudentsTable();
  showAlert(`تم حذف حساب الطالب "${stName}" بنجاح.`, "ok");
}

function copyCurrentStudentCredentials() {
  const editId = document.getElementById("editStudentId").value;
  if (!editId) return;
  copyStudentCredentials(editId);
}

function copyStudentCredentials(studentId) {
  const student = allStudentsData.find(s => String(s.id) === String(studentId));
  if (!student) return;

  const currentUrl = window.location.origin.startsWith("http")
    ? (window.location.origin + "/login")
    : "تطبيق مدرسة البيان (بوابة الطالب)";
  const pinText = student.has_code ? student.code_display : "يتم تعيينه عند الدخول الأول للمنصة";

  const message =
    `بيانات تسجيل دخول الطالب - مدرسة البيان لتعليم القرآن الكريم\n\n` +
    `اسم الطالب: ${student.name}\n` +
    `الحلقة القرآنية: ${student.circle_name}\n` +
    `المعلم المشرف: ${student.teacher_name}\n` +
    `الرمز السري (PIN): ${pinText}\n\n` +
    `بوابة الدخول: ${currentUrl}\n` +
    `ملاحظة: يرجى الاحتفاظ بهذه البيانات بسرية.`;

  copyToClipboard(message, `تم نسخ بيانات دخول الطالب "${student.name}" بنجاح.`);
}

function copyToClipboard(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showAlert(successMsg, "ok");
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    showAlert(successMsg || "تم النسخ بنجاح.", "ok");
  } catch (err) {
    showAlert("تعذر النسخ التلقائي، يرجى النسخ يدوياً.", "error");
  }
  document.body.removeChild(textArea);
}

async function exportStudentsExcel() {
  const rows = currentActiveSection === "students" ? getFilteredStudentsList() : allStudentsData;
  if (!rows || rows.length === 0) {
    showAlert("لا توجد بيانات طلاب لتصديرها حالياً.", "error");
    return;
  }

  const csvCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const header = ["#", "اسم الطالب", "الحلقة القرآنية", "المعلم المشرف", "حالة الرمز", "الرمز السري (PIN)", "تاريخ التسجيل"];
  const lines = [header.map(csvCell).join(",")];

  rows.forEach((s, idx) => {
    lines.push([
      idx + 1,
      s.name,
      s.circle_name || "",
      s.teacher_name || "",
      s.has_code ? "مفعل برمز" : "بدون رمز",
      s.code_display || "غير معين",
      formatDualDateShort(s.created_at) || ""
    ].map(csvCell).join(","));
  });

  const csvContent = "\uFEFF" + lines.join("\r\n");
  const fileName = `albayan_students_${new Date().toISOString().slice(0, 10)}.csv`;

  // Use native Android plugin when available
  const capPlugins = window.Capacitor && window.Capacitor.Plugins;
  if (capPlugins && capPlugins.AlbayanExport && typeof capPlugins.AlbayanExport.saveFileToDownloads === "function") {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
      await capPlugins.AlbayanExport.saveFileToDownloads({
        base64Data,
        fileName,
        mimeType: "text/csv;charset=utf-8"
      });
      showAlert(`تم تصدير كشف الطلاب (${rows.length} طالب) إلى التنزيلات بنجاح.`, "ok");
      return;
    } catch (e) {}
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showAlert(`تم تصدير كشف الطلاب (${rows.length} طالب) بنجاح.`, "ok");
}

// ==============================================
// MODAL & UTILITY FUNCTIONS
// ==============================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (typeof window.albayanPushOverlayHistory === "function") {
    window.albayanPushOverlayHistory();
  }
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => { modal.style.display = "none"; }, 150);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("userModal");
    closeModal("studentModal");
  }
});

function showAlert(msg, type = "ok") {
  const box = document.getElementById("usersAlertBox");
  if (!box) return;

  if (alertTimeoutHandle) {
    clearTimeout(alertTimeoutHandle);
    alertTimeoutHandle = null;
  }

  box.className = `alert-box ${type}`;
  box.innerHTML = `<i data-lucide="${type === "ok" ? "check-circle-2" : "alert-triangle"}" style="width:18px; height:18px; vertical-align:-3px;"></i> <span>${escapeHtml(msg)}</span>`;
  box.style.display = "flex";
  box.style.opacity = "1";
  if (window.lucide) lucide.createIcons();

  alertTimeoutHandle = setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => {
      box.style.display = "none";
      box.style.opacity = "1";
    }, 300);
  }, 4200);
}

function initMobileSidebar() {
  if (typeof initMobileBottomNav === "function") {
    initMobileBottomNav();
  }
}

window.toggleSidebar = function () {
  window.location.href = "more.html";
};

function toggleInputPasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.setAttribute("data-lucide", "eye-off");
  } else {
    input.type = "password";
    if (icon) icon.setAttribute("data-lucide", "eye");
  }
  if (window.lucide) lucide.createIcons();
}
