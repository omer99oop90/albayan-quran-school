/**
 * Users and Accounts Management Script (إدارة المستخدمين وحسابات الطلاب)
 * Complete implementation for Staff & Student Accounts Management
 */

// CSRF Token Helper
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function csrfHeaders(extra = {}) {
  return Object.assign({
    "Content-Type": "application/json",
    "X-CSRF-Token": getCsrfToken()
  }, extra);
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

document.addEventListener("DOMContentLoaded", async () => {
  initMobileSidebar();
  await checkAuth();
  await loadUsers();
  await loadStudents();
});

// ==============================================
// AUTHENTICATION & ACCESS CONTROL
// ==============================================
async function checkAuth() {
  const isStandalone = window.IS_CAPACITOR_APP || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://') || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
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

    const isSuper = data.is_superadmin === 1 || data.is_superadmin === "1";
    if (data.role !== "admin" && !isSuper && !(data.permissions || []).includes("users")) {
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
    const thPwd = document.getElementById("thStaffPassword");
    if (thPwd) thPwd.style.display = window.currentUserIsAdmin ? "" : "none";

    const canAccessCv = isSuper || data.role === "admin" || data.role === "supervisor" || (Array.isArray(data.permissions) && data.permissions.includes("student_cv"));
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
    if (cached) {
      user = JSON.parse(cached);
    }
  } catch(e) {}

  if (!user || (!user.username && !user.student_name)) {
    window.location.href = "login.html";
    return;
  }

  const username = user.username || "مسؤول النظام";
  const userEl = document.getElementById("loggedUsername");
  if (userEl) userEl.textContent = username;
  const roleBadge = document.getElementById("loggedRoleBadge");
  if (roleBadge) roleBadge.textContent = user.role === "admin" ? "مسؤول نظام" : "كادر تعليمي";
  window.currentUserIsAdmin = (user.role === "admin" || user.is_superadmin === 1);
  const thPwd = document.getElementById("thStaffPassword");
  if (thPwd) thPwd.style.display = window.currentUserIsAdmin ? "" : "none";
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
  await fetch("/api/logout", { method: "POST", headers: csrfHeaders() }).catch(() => {});
  window.location.href = "login.html?logout=1";
}


// ==============================================
// TAB SWITCHER CONTROLLER
// ==============================================
function switchSectionTab(tab) {
  currentActiveSection = tab;

  const tabStaffBtn = document.getElementById("tabStaffBtn");
  const tabStudentsBtn = document.getElementById("tabStudentsBtn");
  const staffSection = document.getElementById("staffSection");
  const studentsSection = document.getElementById("studentsSection");

  const btnAddStaff = document.getElementById("btnAddStaffMain");
  const btnAddStudent = document.getElementById("btnAddStudentMain");
  const btnExportExcel = document.getElementById("btnExportStudentsExcel");

  const pageMainHeading = document.getElementById("pageMainHeading");
  const pageSubHeading = document.getElementById("pageSubHeading");

  if (tab === "staff") {
    if (tabStaffBtn) tabStaffBtn.classList.add("active");
    if (tabStudentsBtn) tabStudentsBtn.classList.remove("active");

    if (staffSection) {
      staffSection.style.display = "block";
      staffSection.classList.add("active");
    }
    if (studentsSection) {
      studentsSection.style.display = "none";
      studentsSection.classList.remove("active");
    }

    if (btnAddStaff) btnAddStaff.style.display = "inline-flex";
    if (btnAddStudent) btnAddStudent.style.display = "none";
    if (btnExportExcel) btnExportExcel.style.display = "none";

    if (pageMainHeading) pageMainHeading.textContent = "إدارة حسابات الكادر والصلاحيات";
    if (pageSubHeading) pageSubHeading.textContent = "إمكانية إنشاء وتعديل وحذف الحسابات وتوزيع الصلاحيات بدقة للمشرفين والمعلمين.";

    filterUsersTable();
  } else {
    if (tabStudentsBtn) tabStudentsBtn.classList.add("active");
    if (tabStaffBtn) tabStaffBtn.classList.remove("active");

    if (studentsSection) {
      studentsSection.style.display = "block";
      studentsSection.classList.add("active");
    }
    if (staffSection) {
      staffSection.style.display = "none";
      staffSection.classList.remove("active");
    }

    if (btnAddStaff) btnAddStaff.style.display = "none";
    if (btnAddStudent) btnAddStudent.style.display = "none";
    if (btnExportExcel) btnExportExcel.style.display = "inline-flex";

    if (pageMainHeading) pageMainHeading.textContent = "سجل حسابات ورموز الطلاب القرآنية";
    if (pageSubHeading) pageSubHeading.textContent = "عرض حسابات الطلاب والرموز السرية (PIN) وتواريخ التسجيل.";

    // Highlight students chip if available
    const stChip = document.querySelector('#usersRoleChips [data-role="students"]');
    if (stChip) {
      document.querySelectorAll("#usersRoleChips .user-role-chip").forEach(b => b.classList.remove("active"));
      stChip.classList.add("active");
    }

    filterStudentsTable();
  }

  if (window.lucide) lucide.createIcons();
}

// ==============================================
// STAFF USERS MANAGEMENT
// ==============================================
async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  const mobileFeed = document.getElementById("usersMobileFeed");
  let fetched = false;

  // 1. Instant Cache Render (<10ms)
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalUsers === "function") {
    try {
      const localUsers = await window.AlbayanLocalDB.getLocalUsers();
      if (Array.isArray(localUsers) && localUsers.length > 0) {
        allUsersData = localUsers;
        renderStats(allUsersData);
        filterUsersTable();
      }
    } catch (e) {}
  }

  // 2. Try network fetch from local server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/users", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const users = await res.json();
      if (Array.isArray(users) && users.length > 0) {
        allUsersData = users;
        fetched = true;
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheUsers === "function") {
          window.AlbayanLocalDB.cacheUsers(users).catch(() => {});
        }
      }
    }
  } catch (err) {}

  // 3. Try Firebase pull
  if (!fetched) {
    if (typeof window.pullUsersFromFirebase === "function") {
      try {
        const fbUsers = await window.pullUsersFromFirebase();
        if (Array.isArray(fbUsers) && fbUsers.length > 0) {
          allUsersData = fbUsers;
          fetched = true;
          if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheUsers === "function") {
            window.AlbayanLocalDB.cacheUsers(fbUsers).catch(() => {});
          }
        }
      } catch (e) {}
    }

    if (!fetched) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const fbRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/users.json", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (fbRes.ok) {
          const raw = await fbRes.json();
          if (raw && typeof raw === "object") {
            const list = [];
            Object.entries(raw).forEach(([k, v]) => {
              if (v && typeof v === "object") {
                const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
                list.push({ ...v, id });
              }
            });
            if (list.length > 0) {
              allUsersData = list;
              fetched = true;
              if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheUsers === "function") {
                window.AlbayanLocalDB.cacheUsers(list).catch(() => {});
              }
            }
          }
        }
      } catch(e) {}
    }
  }

  // 4. Fallback to AlbayanLocalDB pre-seeded accounts
  if (!allUsersData || allUsersData.length === 0) {
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalUsers === "function") {
      try {
        const fallbackUsers = await window.AlbayanLocalDB.getLocalUsers();
        if (Array.isArray(fallbackUsers) && fallbackUsers.length > 0) {
          allUsersData = fallbackUsers;
        }
      } catch(e) {}
    }
  }

  const countBadge = document.getElementById("staffCountBadge");
  if (countBadge) countBadge.textContent = allUsersData.length;

  renderStats(allUsersData);
  filterUsersTable();
}


function renderStats(users) {
  const cardsContainer = document.getElementById("usersStatsCards");
  if (!cardsContainer) return;

  const total = users.length;
  const active = users.filter(u => u.is_active == 1).length;
  const teachers = users.filter(u => u.role === "teacher").length;
  const admins = users.filter(u => u.role === "admin" || u.role === "supervisor").length;

  cardsContainer.innerHTML = `
    <div class="users-kpi-card">
      <div class="users-kpi-icon blue">
        <i data-lucide="users" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">إجمالي الكادر</span>
        <strong class="users-kpi-val">${total}</strong>
      </div>
    </div>

    <div class="users-kpi-card">
      <div class="users-kpi-icon green">
        <i data-lucide="check-circle-2" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">الحسابات النشطة</span>
        <strong class="users-kpi-val">${active}</strong>
      </div>
    </div>

    <div class="users-kpi-card">
      <div class="users-kpi-icon amber">
        <i data-lucide="book-open" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">معلمو الحلقات</span>
        <strong class="users-kpi-val">${teachers}</strong>
      </div>
    </div>

    <div class="users-kpi-card">
      <div class="users-kpi-icon purple">
        <i data-lucide="shield-check" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">الإدارة والإشراف</span>
        <strong class="users-kpi-val">${admins}</strong>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function setUserRoleFilter(role, btnEl) {
  activeRoleFilter = role;
  const buttons = document.querySelectorAll("#usersRoleChips .user-role-chip, #studentsStatusChips .user-role-chip");
  buttons.forEach(b => b.classList.remove("active"));
  if (btnEl) {
    btnEl.classList.add("active");
  } else {
    const matching = document.querySelector(`#usersRoleChips [data-role="${role}"]`);
    if (matching) matching.classList.add("active");
  }

  if (role === "students") {
    switchSectionTab("students");
  } else {
    switchSectionTab("staff");
  }
}

function filterUsersTable() {
  const tbody = document.getElementById("usersTableBody");
  const mobileFeed = document.getElementById("usersMobileFeed");
  const searchQuery = (document.getElementById("searchUsersInput")?.value || "").trim().toLowerCase();

  const filtered = allUsersData.filter(u => {
    const matchQuery = (u.username || "").toLowerCase().includes(searchQuery);
    let matchRole = true;
    if (activeRoleFilter === "admin") matchRole = u.role === "admin";
    else if (activeRoleFilter === "supervisor") matchRole = u.role === "supervisor";
    else if (activeRoleFilter === "teacher") matchRole = u.role === "teacher";
    else if (activeRoleFilter === "active") matchRole = u.is_active == 1;

    return matchQuery && matchRole;
  });

  const emptyHtml = `
    <div style="text-align:center; padding:32px 16px; color:var(--muted); background:var(--card-bg); border:1px dashed var(--line); border-radius:16px;">
      <i data-lucide="search-x" style="width:36px; height:36px; margin-bottom:8px; opacity:0.6;"></i>
      <p style="margin:0; font-size:14px; font-weight:700;">لا توجد حسابات كادر تطابق خيارات البحث أو التصفية الحالية.</p>
    </div>
  `;

  if (!filtered || filtered.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px;">${emptyHtml}</td></tr>`;
    if (mobileFeed) mobileFeed.innerHTML = emptyHtml;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const permMap = {
    circles: "الحلقات",
    exams: "الاختبارات",
    analytics: "الإحصائيات",
    student_cv: "سير الطلاب",
    users: "المستخدمين",
    all_circles: "جميع الحلقات",
    own_circle: "حلقته فقط"
  };

  // 1. Mobile Feed
  if (mobileFeed) {
    mobileFeed.innerHTML = filtered.map((u, idx) => {
      const isSuper = u.is_superadmin === 1;
      const isActive = u.is_active == 1;
      let perms = [];
      try { perms = JSON.parse(u.permissions || "[]"); } catch (e) { perms = []; }

      let roleClass = "teacher";
      let roleStr = "معلم حلقة";
      if (u.role === "admin") {
        roleClass = "admin";
        roleStr = "مسؤول نظام";
      } else if (u.role === "supervisor") {
        roleClass = "supervisor";
        roleStr = "مشرف تعليمي";
      }

      const initialChar = (u.username || "م").trim().charAt(0).toUpperCase();

      let formattedDateText = "--";
      if (u.created_at) {
        if (window.HijriDate) {
          const dual = window.HijriDate.formatDualDate(u.created_at);
          formattedDateText = `${dual.hijri} (${dual.gregorian})`;
        } else {
          formattedDateText = u.created_at;
        }
      }

      return `
        <div class="user-mobile-card">
          <div class="user-mobile-card-header">
            <div class="user-mobile-profile">
              <div class="user-avatar-badge ${roleClass}">
                <span>${initialChar}</span>
              </div>
              <div class="user-mobile-info">
                <div class="user-mobile-name-row">
                  <span class="user-mobile-name">${escapeHtml(u.username)}</span>
                  ${isSuper ? '<span class="user-badge-super"><i data-lucide="crown" style="width:12px; height:12px;"></i> المسؤول الأول</span>' : ''}
                  ${u.is_online ? '<span class="online-indicator-pill"><span class="online-ping"></span> متصل الآن</span>' : ''}
                </div>
                <div style="margin-top:3px;">
                  <span class="user-badge-role ${roleClass}">${roleStr}</span>
                </div>
              </div>
            </div>

            <div class="user-mobile-status-pill ${isActive ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              <span>${isActive ? 'نشط' : 'معطّل'}</span>
            </div>
          </div>

          <div class="user-mobile-meta-box">
            <div class="user-mobile-meta-row">
              <span class="user-mobile-meta-label">
                <i data-lucide="log-in" style="width:14px; height:14px;"></i> حالة الدخول
              </span>
              <span class="user-mobile-meta-val">
                ${u.has_logged_in ? `
                  <span style="color:#059669; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم التسجيل
                  </span>
                ` : `
                  <span style="color:var(--muted); font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="clock" style="width:14px; height:14px;"></i> لم يسجل بعد
                  </span>
                `}
              </span>
            </div>

            ${window.currentUserIsAdmin && u.code ? `
            <div class="user-mobile-meta-row">
              <span class="user-mobile-meta-label">
                <i data-lucide="key" style="width:14px; height:14px;"></i> كلمة المرور
              </span>
              <span class="user-mobile-meta-val">
                <div class="user-pwd-cell" id="pwdBoxUserMob_${u.id}">
                  <span class="user-pwd-text masked" id="pwdTextMob_${u.id}">••••••</span>
                  <button type="button" class="btn-icon-eye" onclick="toggleRevealPassword('userMob', ${u.id}, '${escapeHtml(u.code)}')" title="إظهار / إخفاء الرمز">
                    <i data-lucide="eye" id="pwdEyeMob_${u.id}" style="width:16px; height:16px;"></i>
                  </button>
                </div>
              </span>
            </div>
            ` : ''}

            <div class="user-mobile-meta-row">
              <span class="user-mobile-meta-label">
                <i data-lucide="calendar" style="width:14px; height:14px;"></i> تاريخ الإنشاء
              </span>
              <span class="user-mobile-meta-val" style="font-size:11.5px;">${formattedDateText}</span>
            </div>

            <div style="margin-top:2px;">
              <span class="user-mobile-meta-label" style="display:block; margin-bottom:4px;">
                <i data-lucide="key" style="width:14px; height:14px;"></i> الصلاحيات:
              </span>
              <div class="user-perms-chips-wrap">
                ${perms.length > 0 ? perms.map(p => `<span class="user-perm-chip">${escapeHtml(permMap[p] || p)}</span>`).join("") : '<span class="user-perm-chip" style="color:var(--user-primary); font-weight:800;">جميع الصلاحيات</span>'}
              </div>
            </div>
          </div>

          <button type="button" class="user-mobile-action-btn" onclick="openEditUserModal(${u.id})">
            <i data-lucide="edit-3" style="width:16px; height:16px;"></i>
            <span>تعديل الصلاحيات والحساب</span>
          </button>
        </div>
      `;
    }).join("");
  }

  // 2. Desktop Table
  if (tbody) {
    tbody.innerHTML = filtered.map((u, idx) => {
      const isSuper = u.is_superadmin === 1;
      const isActive = u.is_active == 1;
      let perms = [];
      try { perms = JSON.parse(u.permissions || "[]"); } catch (e) { perms = []; }

      let roleClass = "teacher";
      let roleStr = "معلم حلقة";
      if (u.role === "admin") {
        roleClass = "admin";
        roleStr = "مسؤول نظام";
      } else if (u.role === "supervisor") {
        roleClass = "supervisor";
        roleStr = "مشرف تعليمي";
      }

      let formattedDateHtml = "--";
      if (u.created_at) {
        if (window.HijriDate) {
          const dual = window.HijriDate.formatDualDate(u.created_at);
          formattedDateHtml = `<div class="dual-date-wrap"><strong class="date-hijri">${dual.hijri}</strong><small class="date-gregorian">(${dual.gregorian})</small></div>`;
        } else {
          formattedDateHtml = u.created_at;
        }
      }

      return `
        <tr>
          <td style="color:var(--muted); font-weight:700;">${idx + 1}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:14.5px;">${escapeHtml(u.username)}</strong>
              ${isSuper ? '<span class="user-badge-super"><i data-lucide="crown" style="width:12px; height:12px;"></i> المسؤول الأول</span>' : ''}
              ${u.is_online ? '<span class="online-indicator-pill"><span class="online-ping"></span> متصل</span>' : ''}
              ${!isActive ? '<span class="user-mobile-status-pill inactive" style="font-size:10px; padding:1px 6px;">معطل</span>' : ''}
            </div>
          </td>
          <td style="white-space: nowrap;">
            <span class="user-badge-role ${roleClass}">${roleStr}</span>
          </td>
          <td>
            <div class="user-perms-chips-wrap">
              ${perms.length > 0 ? perms.map(p => `<span class="user-perm-chip">${escapeHtml(permMap[p] || p)}</span>`).join("") : '<span class="user-perm-chip" style="color:var(--user-primary); font-weight:800;">جميع الصلاحيات</span>'}
            </div>
          </td>
          <td style="white-space: nowrap;">
            ${u.has_logged_in ? `
              <span style="color:#059669; font-weight:800; display:inline-flex; align-items:center; gap:4px; font-size:12px;">
                <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم التسجيل
              </span>
            ` : `
              <span style="color:var(--muted); font-weight:700; display:inline-flex; align-items:center; gap:4px; font-size:12px;">
                <i data-lucide="clock" style="width:14px; height:14px;"></i> لم يتم التسجيل
              </span>
            `}
          </td>
          ${window.currentUserIsAdmin ? `
          <td style="white-space: nowrap;">
            ${u.code ? `
              <div class="user-pwd-cell" id="pwdBoxUser_${u.id}">
                <span class="user-pwd-text masked" id="pwdText_${u.id}">••••••</span>
                <button type="button" class="btn-icon-eye" onclick="toggleRevealPassword('user', ${u.id}, '${escapeHtml(u.code)}')" title="إظهار / إخفاء الرمز">
                  <i data-lucide="eye" id="pwdEye_${u.id}" style="width:16px; height:16px;"></i>
                </button>
              </div>
            ` : '<span style="color:var(--muted); font-size:12px;">--</span>'}
          </td>
          ` : ''}
          <td style="white-space: nowrap;">${formattedDateHtml}</td>
          <td style="text-align:center;">
            <button type="button" class="btn-secondary" style="padding:7px 14px; font-size:12.5px; display:inline-flex; align-items:center; gap:5px; border-radius:10px;" onclick="openEditUserModal(${u.id})">
              <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
              <span>تعديل</span>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  if (window.lucide) lucide.createIcons();
}

function openAddUserModal() {
  document.getElementById("userModalTitle").textContent = "إنشاء حساب كادر وتحديد الصلاحيات";
  document.getElementById("saveUserBtn").innerHTML = '<span>حفظ وإنشاء الحساب</span> <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>';
  document.getElementById("editUserId").value = "";
  document.getElementById("newUsername").value = "";
  document.getElementById("newUsername").disabled = false;
  document.getElementById("newCode").value = "";
  document.getElementById("newCode").required = true;
  document.getElementById("newCodeReqStar").style.display = "inline";
  document.getElementById("newCodeHelper").style.display = "none";
  document.getElementById("userRole").value = "teacher";
  document.getElementById("userRole").disabled = false;
  document.getElementById("userStatusField").style.display = "none";
  document.getElementById("userActiveStatus").value = "1";

  const deleteBtn = document.getElementById("deleteUserBtn");
  if (deleteBtn) deleteBtn.style.display = "none";

  toggleAllPerms(true);
  const modal = document.getElementById("userModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
  if (window.lucide) lucide.createIcons();
}

function openEditUserModal(userId) {
  const user = allUsersData.find(u => u.id === userId);
  if (!user) return;

  const isSuper = user.is_superadmin === 1;

  document.getElementById("userModalTitle").textContent = `تعديل حساب: ${user.username}`;
  document.getElementById("saveUserBtn").innerHTML = '<span>حفظ وحماية التعديلات</span> <i data-lucide="check" style="width:16px; height:16px;"></i>';
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

  const statusField = document.getElementById("userStatusField");
  const statusSelect = document.getElementById("userActiveStatus");
  if (statusField && statusSelect) {
    statusField.style.display = isSuper ? "none" : "block";
    statusSelect.value = user.is_active ? "1" : "0";
  }

  const deleteBtn = document.getElementById("deleteUserBtn");
  if (deleteBtn) {
    deleteBtn.style.display = "inline-flex";
    if (isSuper) {
      deleteBtn.disabled = true;
      deleteBtn.title = "الحساب الرئيسي الأول للنظام محمي من الحذف";
      deleteBtn.style.opacity = "0.5";
      deleteBtn.style.cursor = "not-allowed";
    } else {
      deleteBtn.disabled = false;
      deleteBtn.title = "حذف هذا الحساب";
      deleteBtn.style.opacity = "1";
      deleteBtn.style.cursor = "pointer";
    }
  }

  let perms = [];
  try { perms = JSON.parse(user.permissions || "[]"); } catch (e) { perms = []; }

  const checkboxes = document.querySelectorAll('#userModal input[name="perm"]');
  checkboxes.forEach(cb => {
    cb.checked = isSuper ? true : perms.includes(cb.value);
    cb.disabled = isSuper;
  });

  const modal = document.getElementById("userModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
  if (window.lucide) lucide.createIcons();
}

function toggleAllPerms(check) {
  const checkboxes = document.querySelectorAll('#userModal input[name="perm"]');
  checkboxes.forEach(cb => {
    if (!cb.disabled) cb.checked = check;
  });
}

async function deleteCurrentUserFromModal() {
  const editId = document.getElementById("editUserId").value;
  if (!editId) return;
  await deleteUser(parseInt(editId, 10));
}

async function saveUser(e) {
  e.preventDefault();
  const editId = document.getElementById("editUserId").value;
  const username = document.getElementById("newUsername").value.trim();
  const code = document.getElementById("newCode").value.trim();
  const role = document.getElementById("userRole").value;
  const is_active = document.getElementById("userActiveStatus")?.value || "1";

  const perms = Array.from(document.querySelectorAll('#userModal input[name="perm"]:checked')).map(cb => cb.value);

  const url = editId ? `/api/users/${editId}` : "/api/users";
  const method = editId ? "PUT" : "POST";

  const bodyData = { username, role, permissions: perms, is_active: parseInt(is_active, 10) };
  if (code) bodyData.code = code;

  try {
    const res = await fetch(url, {
      method: method,
      headers: csrfHeaders(),
      body: JSON.stringify(bodyData)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeModal("userModal");
      showAlert(data.message || (editId ? "تم تحديث بيانات الحساب بنجاح." : "تم إنشاء الحساب بنجاح."), "ok");
      await loadUsers();
    } else {
      showAlert(data.message || "فشل حفظ الحساب.", "error");
    }
  } catch (err) {
    showAlert("تعذر الاتصال بالخادم.", "error");
  }
}

async function deleteUser(userId) {
  if (!confirm("هل أنت متأكد تماماً من رغبتك في حذف هذا الحساب؟ لن يتم التراجع عن هذا الإجراء.")) return;
  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: csrfHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeModal("userModal");
      showAlert("تم حذف الحساب بنجاح.", "ok");
      await loadUsers();
    } else {
      showAlert(data.message || "فشل الحذف.", "error");
    }
  } catch (err) {
    showAlert("تعذر الحذف.", "error");
  }
}

// ==============================================
// STUDENTS ACCOUNTS MANAGEMENT
// ==============================================
async function loadStudents() {
  const tbody = document.getElementById("studentsTableBody");
  const mobileFeed = document.getElementById("studentsMobileFeed");
  let fetched = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/users/students", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      allStudentsData = data.students || [];
      allCirclesData = data.circles || [];
      fetched = true;
    }
  } catch (err) {}

  // Fallback 1: Direct Firebase RTDB
  if (!fetched) {
    try {
      const [studentsRes, circlesRes] = await Promise.all([
        fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/students.json"),
        fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/circles.json")
      ]);
      if (studentsRes.ok) {
        const rawStudents = await studentsRes.json();
        const stdList = [];
        if (rawStudents) {
          if (Array.isArray(rawStudents)) {
            rawStudents.forEach((s, idx) => { if (s) stdList.push({ ...s, id: s.id || idx }); });
          } else {
            Object.entries(rawStudents).forEach(([id, s]) => {
              if (s && typeof s === 'object') stdList.push({ ...s, id });
            });
          }
        }
        allStudentsData = stdList;
        fetched = true;
      }
      if (circlesRes.ok) {
        const rawCircles = await circlesRes.json();
        const circList = [];
        if (rawCircles) {
          if (Array.isArray(rawCircles)) {
            rawCircles.forEach((c, idx) => { if (c) circList.push({ ...c, id: c.id || idx }); });
          } else {
            Object.entries(rawCircles).forEach(([id, c]) => {
              if (c && typeof c === 'object') circList.push({ ...c, id });
            });
          }
        }
        allCirclesData = circList;
      }
    } catch(e) {
      console.warn("Direct Firebase fetch error:", e);
    }
  }

  // Fallback 2: IndexedDB / Cache
  if (!fetched && window.AlbayanLocalDB) {
    try {
      const cachedCircles = await window.AlbayanLocalDB.getCachedCircles();
      if (Array.isArray(cachedCircles) && cachedCircles.length > 0) {
        allCirclesData = cachedCircles;
      }
      const cachedStudents = [];
      for (const c of allCirclesData) {
        const st = await window.AlbayanLocalDB.getCachedStudents(c.id);
        if (Array.isArray(st)) cachedStudents.push(...st);
      }
      if (cachedStudents.length > 0) {
        allStudentsData = cachedStudents;
        fetched = true;
      }
    } catch(e) {}
  }

  // Merge pending local student changes if any exist
  if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingStudentChanges === 'function') {
    try {
      const pendingChanges = await window.AlbayanLocalDB.getPendingStudentChanges();
      Object.keys(pendingChanges).forEach(pid => {
        const dirty = pendingChanges[pid];
        const numPid = Number(pid);
        const existing = allStudentsData.find(s => Number(s.id) === numPid);
        if (existing) {
          Object.assign(existing, dirty);
        } else if (dirty && dirty.name) {
          allStudentsData.push({
            id: numPid,
            name: dirty.name,
            circle_id: dirty.circle_id || "",
            code: dirty.code || null,
            ...dirty
          });
        }
      });
    } catch(e) {}
  }

  const countBadge = document.getElementById("studentsCountBadge");
  if (countBadge) countBadge.textContent = allStudentsData.length;

  populateCircleSelects(allCirclesData);
  renderStudentStats(allStudentsData);
  filterStudentsTable();
}


function populateCircleSelects(circles) {
  const filterSelect = document.getElementById("filterStudentCircleSelect");
  const modalSelect = document.getElementById("studentCircleSelect");

  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = `<option value="all">جميع الحلقات القرآنية (${circles.length})</option>` +
      circles.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    if (currentVal && Array.from(filterSelect.options).some(o => o.value === currentVal)) {
      filterSelect.value = currentVal;
    }
  }

  if (modalSelect) {
    modalSelect.innerHTML = `<option value="">-- اختر الحلقة القرآنية --</option>` +
      circles.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  }
}

function renderStudentStats(students) {
  const container = document.getElementById("studentsStatsCards");
  if (!container) return;

  const total = students.length;
  const withPin = students.filter(s => s.has_code).length;
  const pendingPin = total - withPin;
  const circlesCount = allCirclesData.length;

  container.innerHTML = `
    <div class="users-kpi-card">
      <div class="users-kpi-icon blue">
        <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">إجمالي الطلاب</span>
        <strong class="users-kpi-val">${total}</strong>
      </div>
    </div>

    <div class="users-kpi-card">
      <div class="users-kpi-icon green">
        <i data-lucide="key" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">مفعّل برمز سري</span>
        <strong class="users-kpi-val">${withPin}</strong>
      </div>
    </div>

    <div class="users-kpi-card">
      <div class="users-kpi-icon amber">
        <i data-lucide="clock" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">بانتظار تعيين الرمز</span>
        <strong class="users-kpi-val">${pendingPin}</strong>
      </div>
    </div>

    <div class="users-kpi-card">
      <div class="users-kpi-icon purple">
        <i data-lucide="book-open" style="width:22px; height:22px;"></i>
      </div>
      <div class="users-kpi-data">
        <span class="users-kpi-label">الحلقات القرآنية</span>
        <strong class="users-kpi-val">${circlesCount}</strong>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function setStudentStatusFilter(status, btnEl) {
  activeStudentStatusFilter = status;
  const buttons = document.querySelectorAll("#studentsStatusChips .user-role-chip");
  buttons.forEach(b => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  filterStudentsTable();
}

function filterStudentsTable() {
  const tbody = document.getElementById("studentsTableBody");
  const mobileFeed = document.getElementById("studentsMobileFeed");
  const searchQuery = (document.getElementById("searchStudentsInput")?.value || "").trim().toLowerCase();
  const circleFilter = document.getElementById("filterStudentCircleSelect")?.value || "all";

  const filtered = allStudentsData.filter(s => {
    const matchQuery = (s.name || "").toLowerCase().includes(searchQuery) ||
                       (s.circle_name || "").toLowerCase().includes(searchQuery) ||
                       (s.teacher_name || "").toLowerCase().includes(searchQuery);

    let matchCircle = true;
    if (circleFilter !== "all") {
      matchCircle = String(s.circle_id) === String(circleFilter);
    }

    let matchStatus = true;
    if (activeStudentStatusFilter === "has_pin") matchStatus = s.has_code === true;
    else if (activeStudentStatusFilter === "no_pin") matchStatus = s.has_code === false;

    return matchQuery && matchCircle && matchStatus;
  });

  const emptyHtml = `
    <div style="text-align:center; padding:32px 16px; color:var(--muted); background:var(--card-bg); border:1px dashed var(--line); border-radius:16px;">
      <i data-lucide="search-x" style="width:36px; height:36px; margin-bottom:8px; opacity:0.6;"></i>
      <p style="margin:0; font-size:14px; font-weight:700;">لا توجد حسابات طلاب تطابق خيارات البحث أو التصفية الحالية.</p>
    </div>
  `;

  if (!filtered || filtered.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px;">${emptyHtml}</td></tr>`;
    if (mobileFeed) mobileFeed.innerHTML = emptyHtml;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // 1. Mobile Feed
  if (mobileFeed) {
    mobileFeed.innerHTML = filtered.map((s, idx) => {
      const hasPin = s.has_code;
      const initialChar = (s.name || "ط").trim().charAt(0).toUpperCase();

      let formattedDateText = "--";
      if (s.created_at) {
        if (window.HijriDate) {
          const dual = window.HijriDate.formatDualDate(s.created_at);
          formattedDateText = `${dual.hijri} (${dual.gregorian})`;
        } else {
          formattedDateText = s.created_at;
        }
      }

      return `
        <div class="user-mobile-card student-mobile-card">
          <div class="user-mobile-card-header">
            <div class="user-mobile-profile">
              <div class="user-avatar-badge student">
                <span>${initialChar}</span>
              </div>
              <div class="user-mobile-info">
                <div class="user-mobile-name-row">
                  <span class="user-mobile-name">${escapeHtml(s.name)}</span>
                </div>
                <div style="margin-top:3px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                  <span class="user-badge-role circle-badge"><i data-lucide="book-open" style="width:11px; height:11px;"></i> ${escapeHtml(s.circle_name)}</span>
                  <span class="user-badge-role teacher-badge"><i data-lucide="user" style="width:11px; height:11px;"></i> ${escapeHtml(s.teacher_name)}</span>
                </div>
              </div>
            </div>

            <div class="user-mobile-status-pill ${hasPin ? 'active' : 'pending'}">
              <span class="status-dot"></span>
              <span>${hasPin ? 'مفعّل برمز' : 'بدون رمز'}</span>
            </div>
          </div>

          <div class="user-mobile-meta-box">
            <div class="user-mobile-meta-row">
              <span class="user-mobile-meta-label">
                <i data-lucide="key" style="width:14px; height:14px;"></i> الرمز السري (PIN)
              </span>
              <span class="user-mobile-meta-val">
                ${hasPin ? `
                  <div class="user-pwd-cell" id="pwdBoxStudentMob_${s.id}">
                    <span class="user-pwd-text masked" id="pwdTextStudentMob_${s.id}">••••••</span>
                    <button type="button" class="btn-icon-eye" onclick="toggleRevealPassword('studentMob', ${s.id}, '${escapeHtml(s.code_display || s.code || '')}')" title="إظهار / إخفاء الرمز">
                      <i data-lucide="eye" id="pwdEyeStudentMob_${s.id}" style="width:16px; height:16px;"></i>
                    </button>
                  </div>
                ` : '<span style="color:var(--muted); font-size:13px; font-style:italic;">غير معيّن</span>'}
              </span>
            </div>

            <div class="user-mobile-meta-row">
              <span class="user-mobile-meta-label">
                <i data-lucide="calendar" style="width:14px; height:14px;"></i> تاريخ التسجيل
              </span>
              <span class="user-mobile-meta-val" style="font-size:11.5px;">${formattedDateText}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 2. Desktop Table
  if (tbody) {
    tbody.innerHTML = filtered.map((s, idx) => {
      const hasPin = s.has_code;

      let formattedDateHtml = "--";
      if (s.created_at) {
        if (window.HijriDate) {
          const dual = window.HijriDate.formatDualDate(s.created_at);
          formattedDateHtml = `<div class="dual-date-wrap"><strong class="date-hijri">${dual.hijri}</strong><small class="date-gregorian">(${dual.gregorian})</small></div>`;
        } else {
          formattedDateHtml = s.created_at;
        }
      }

      return `
        <tr>
          <td style="color:var(--muted); font-weight:700;">${idx + 1}</td>
          <td>
            <strong style="font-size:14.5px; color:var(--text);">${escapeHtml(s.name)}</strong>
          </td>
          <td style="white-space: nowrap;">
            <span class="user-badge-role circle-badge"><i data-lucide="book-open" style="width:12px; height:12px;"></i> ${escapeHtml(s.circle_name)}</span>
          </td>
          <td style="white-space: nowrap;">
            <span class="user-badge-role teacher-badge"><i data-lucide="user" style="width:12px; height:12px;"></i> ${escapeHtml(s.teacher_name)}</span>
          </td>
          <td style="white-space: nowrap;">
            ${hasPin ? `
              <span class="user-mobile-status-pill active" style="font-size:11.5px; padding:3px 10px;">
                <span class="status-dot"></span> مفعّل برمز
              </span>
            ` : `
              <span class="user-mobile-status-pill pending" style="font-size:11.5px; padding:3px 10px;">
                <span class="status-dot"></span> بانتظار التعيين
              </span>
            `}
          </td>
          <td style="white-space: nowrap;">
            ${hasPin ? `
              <div class="user-pwd-cell" id="pwdBoxStudent_${s.id}">
                <span class="user-pwd-text masked" id="pwdTextStudent_${s.id}">••••••</span>
                <button type="button" class="btn-icon-eye" onclick="toggleRevealPassword('student', ${s.id}, '${escapeHtml(s.code_display || s.code || '')}')" title="إظهار / إخفاء الرمز">
                  <i data-lucide="eye" id="pwdEyeStudent_${s.id}" style="width:16px; height:16px;"></i>
                </button>
              </div>
            ` : `
              <span style="color:var(--muted); font-size:13px; font-style:italic;">لم يُعيّن بعد</span>
            `}
          </td>
          <td style="white-space: nowrap;">${formattedDateHtml}</td>
        </tr>
      `;
    }).join("");
  }

  if (window.lucide) lucide.createIcons();
}

function openAddStudentModal() {
  document.getElementById("studentModalTitle").textContent = "إضافة حساب طالب جديد";
  document.getElementById("saveStudentBtn").innerHTML = '<span>حفظ وإضافة الطالب</span> <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>';
  document.getElementById("editStudentId").value = "";
  document.getElementById("studentNameInput").value = "";
  document.getElementById("studentCircleSelect").value = "";
  document.getElementById("studentPinInput").value = "";

  const resetPinBtn = document.getElementById("btnModalResetPin");
  if (resetPinBtn) resetPinBtn.style.display = "none";

  const deleteBtn = document.getElementById("deleteStudentBtn");
  if (deleteBtn) deleteBtn.style.display = "none";

  const shareBox = document.getElementById("studentQuickShareBox");
  if (shareBox) shareBox.style.display = "none";

  const modal = document.getElementById("studentModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
  if (window.lucide) lucide.createIcons();
}

function openEditStudentModal(studentId) {
  const student = allStudentsData.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById("studentModalTitle").textContent = `تعديل حساب الطالب: ${student.name}`;
  document.getElementById("saveStudentBtn").innerHTML = '<span>حفظ التعديلات</span> <i data-lucide="check" style="width:16px; height:16px;"></i>';
  document.getElementById("editStudentId").value = student.id;
  document.getElementById("studentNameInput").value = student.name;
  document.getElementById("studentCircleSelect").value = student.circle_id || "";
  document.getElementById("studentPinInput").value = student.code_display || "";

  const resetPinBtn = document.getElementById("btnModalResetPin");
  if (resetPinBtn) {
    resetPinBtn.style.display = student.has_code ? "inline-flex" : "none";
  }

  const deleteBtn = document.getElementById("deleteStudentBtn");
  if (deleteBtn) deleteBtn.style.display = "inline-flex";

  // Share preview text
  const shareBox = document.getElementById("studentQuickShareBox");
  const sharePreview = document.getElementById("studentSharePreviewText");
  if (shareBox && sharePreview) {
    shareBox.style.display = "block";
    const pinText = student.has_code ? student.code_display : "يتم تعيينه عند الدخول الأول";
    sharePreview.textContent = `اسم الطالب: ${student.name} | الحلقة: ${student.circle_name} | الرمز: ${pinText}`;
  }

  const modal = document.getElementById("studentModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
  if (window.lucide) lucide.createIcons();
}

function generateRandomStudentPin() {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const input = document.getElementById("studentPinInput");
  if (input) {
    input.value = pin;
    input.focus();
    showAlert(`تم توليد رمز سري عشوائي: ${pin}`, "ok");
  }
}

async function saveStudent(e) {
  e.preventDefault();
  const editId = document.getElementById("editStudentId").value;
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

  const url = editId ? `/api/users/students/${editId}` : "/api/users/students";
  const method = editId ? "PUT" : "POST";

  const cleanCid = parseInt(circleId, 10) || circleId;
  const bodyData = {
    name: name,
    circle_id: cleanCid,
    code: pin || null
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, {
      method: method,
      headers: csrfHeaders(),
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.success) {
      closeModal("studentModal");
      showAlert(data.message || "تم حفظ بيانات الطالب بنجاح.", "ok");
      await loadStudents();
      return;
    } else {
      showAlert(data.message || "تعذر حفظ بيانات الطالب.", "error");
      return;
    }
  } catch (err) {
    // Fallback: Direct Firebase RTDB + AlbayanLocalDB
    const targetSid = editId ? Number(editId) : Date.now();
    const studentObj = {
      id: targetSid,
      name: name,
      circle_id: cleanCid,
      code: pin || null
    };

    let fbSuccess = false;
    if (typeof window.saveStudentToFirebase === 'function') {
      try {
        const fbRes = await window.saveStudentToFirebase(studentObj);
        if (fbRes && fbRes.success) fbSuccess = true;
      } catch (fbErr) {}
    }

    if (window.AlbayanLocalDB) {
      try {
        await AlbayanLocalDB.enqueueChange(editId ? 'UPDATE_STUDENT' : 'CREATE_STUDENT', 'students', targetSid, studentObj);
      } catch (dbErr) {}
    }

    if (typeof window.triggerInstantSync === 'function') {
      window.triggerInstantSync();
    }

    closeModal("studentModal");
    if (fbSuccess) {
      showAlert("تم حفظ بيانات الطالب في السحابة بنجاح! ☁️✨", "ok");
    } else {
      showAlert("تم حفظ بيانات الطالب محلياً على الجهاز. ✨", "ok");
    }
    await loadStudents();
  }
}

async function resetCurrentStudentPinFromModal() {
  const editId = document.getElementById("editStudentId").value;
  if (!editId) return;
  await resetStudentPin(parseInt(editId, 10));
}

async function resetStudentPin(studentId) {
  if (!confirm("هل ترغب في تصفير الرمز السري للطالب؟ سيُطلب منه وضع رمز جديد عند تسجيل دخوله القادم.")) return;

  try {
    const res = await fetch(`/api/users/students/${studentId}/reset-pin`, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const pinInput = document.getElementById("studentPinInput");
      if (pinInput) pinInput.value = "";
      const resetBtn = document.getElementById("btnModalResetPin");
      if (resetBtn) resetBtn.style.display = "none";

      showAlert(data.message || "تم تصفير الرمز السري بنجاح.", "ok");
      await loadStudents();
    } else {
      showAlert(data.message || "فشل تصفير الرمز.", "error");
    }
  } catch (err) {
    showAlert("تعذر تصفير الرمز.", "error");
  }
}

async function deleteCurrentStudentFromModal() {
  const editId = document.getElementById("editStudentId").value;
  if (!editId) return;
  await deleteStudent(parseInt(editId, 10));
}

async function deleteStudent(studentId) {
  const student = allStudentsData.find(s => s.id === studentId);
  const stName = student ? student.name : "هذا الطالب";
  if (!confirm(`هل أنت متأكد تماماً من رغبتك في حذف حساب الطالب '${stName}' وجميع سجلاته القرآنية؟ لن يمكن استرجاع هذه البيانات.`)) return;

  try {
    const res = await fetch(`/api/users/students/${studentId}`, {
      method: "DELETE",
      headers: csrfHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeModal("studentModal");
      showAlert(data.message || "تم حذف حساب الطالب بنجاح.", "ok");
      await loadStudents();
    } else {
      showAlert(data.message || "فشل حذف حساب الطالب.", "error");
    }
  } catch (err) {
    showAlert("تعذر حذف الحساب.", "error");
  }
}

function copyCurrentStudentCredentials() {
  const editId = document.getElementById("editStudentId").value;
  if (!editId) return;
  copyStudentCredentials(parseInt(editId, 10));
}

function copyStudentCredentials(studentId) {
  const student = allStudentsData.find(s => s.id === studentId);
  if (!student) return;

  const currentUrl = window.location.origin + "/login";
  const pinText = student.has_code ? student.code_display : "يتم تعيينه عند الدخول الأول للمنصة";

  const message = `✨ *بيانات تسجيل دخول الطالب - مدرسة البيان لتعليم القرآن الكريم* ✨\n\n` +
    `👤 *اسم الطالب:* ${student.name}\n` +
    `⭕ *الحلقة القرآنية:* ${student.circle_name}\n` +
    `👨‍🏫 *المعلم المشرف:* ${student.teacher_name}\n` +
    `🔑 *الرمز السري (PIN):* ${pinText}\n\n` +
    `🌐 *رابط الدخول لمنصة الاختبارات والدرجات:* \n${currentUrl}\n\n` +
    `_ملاحظة: يرجى الاحتفاظ بهذه البيانات بسرية._`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message).then(() => {
      showAlert(`تم نسخ بيانات دخول الطالب '${student.name}' بنجاح! يمكنك الآن إرسالها لولي الأمر.`, "ok");
    }).catch(() => {
      fallbackCopyText(message, student.name);
    });
  } else {
    fallbackCopyText(message, student.name);
  }
}

function fallbackCopyText(text, studentName) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    showAlert(`تم نسخ بيانات دخول الطالب '${studentName}' بنجاح!`, "ok");
  } catch (err) {
    showAlert("تعذر النسخ التلقائي، يرجى النسخ يدوياً.", "error");
  }
  document.body.removeChild(textArea);
}

function exportStudentsExcel() {
  showAlert("جارٍ إعداد وتنزيل كشف حسابات الطلاب...", "ok");
  window.location.href = "/api/users/students/export-excel";
}

// ==============================================
// MODAL & UTILITY FUNCTIONS
// ==============================================
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
  box.innerHTML = `<i data-lucide="${type === 'ok' ? 'check-circle-2' : 'alert-triangle'}" style="width:18px; height:18px; vertical-align:-3px;"></i> <span>${escapeHtml(msg)}</span>`;
  box.style.display = "flex";
  box.style.opacity = "1";
  if (window.lucide) lucide.createIcons();

  alertTimeoutHandle = setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => {
      box.style.display = "none";
      box.style.opacity = "1";
    }, 300);
  }, 4500);
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

/* Mobile Sidebar Drawer Controller */
function initMobileSidebar() {
  if (typeof initMobileBottomNav === 'function') {
    initMobileBottomNav();
  }
}

window.toggleSidebar = function() {
  window.location.href = 'more.html';
};

/* Password reveal and copy helpers for System Admin */
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

function toggleRevealPassword(prefix, id, actualCode) {
  let textId = `pwdText_${id}`;
  let eyeId = `pwdEye_${id}`;
  if (prefix === 'userMob') {
    textId = `pwdTextMob_${id}`;
    eyeId = `pwdEyeMob_${id}`;
  } else if (prefix === 'studentMob') {
    textId = `pwdTextStudentMob_${id}`;
    eyeId = `pwdEyeStudentMob_${id}`;
  } else if (prefix === 'student') {
    textId = `pwdTextStudent_${id}`;
    eyeId = `pwdEyeStudent_${id}`;
  }

  const textEl = document.getElementById(textId);
  const eyeEl = document.getElementById(eyeId);
  if (!textEl) return;

  if (textEl.classList.contains("masked")) {
    textEl.textContent = actualCode || "--";
    textEl.classList.remove("masked");
    if (eyeEl) eyeEl.setAttribute("data-lucide", "eye-off");
  } else {
    textEl.textContent = "••••••";
    textEl.classList.add("masked");
    if (eyeEl) eyeEl.setAttribute("data-lucide", "eye");
  }
  if (window.lucide) lucide.createIcons();
}

function copyUserPassword(code) {
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    showAlert(`تم نسخ الرمز (${code}) بنجاح للمشاركة.`, "ok");
  }).catch(() => {
    showAlert(`الرمز: ${code}`, "ok");
  });
}


