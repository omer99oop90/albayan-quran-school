/**
 * ALBAYAN QURAN SCHOOL - UNIVERSAL MOBILE BOTTOM NAVIGATION
 * Provides bottom navigation bar & "المزيد" (More) bottom sheet for mobile views.
 */

(function () {
  'use strict';

  const isStandalone = window.IS_CAPACITOR_APP || typeof window.Capacitor !== 'undefined' || window.location.protocol === 'file:' || window.location.origin.includes('capacitor://') || (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

  // SVG Icons
  const ICONS = {
    circles: `<svg viewBox="0 0 100 100" class="nav-svg"><circle cx="50" cy="22" r="14"/><path d="M30 40 c-7 0 -12 6 -12 14 v16 c0 4 3 7 7 7 h4 v-20 c0 -4 3 -7 7 -7 h28 c4 0 7 3 7 7 v20 h4 c4 0 7 -3 7 -7 v-16 c0 -8 -5 -14 -12 -14 Z"/><path d="M18 82 l32 -26 l32 26 M18 56 l32 26 l32 -26" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    admin: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
    analytics: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`,
    cv: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2v2"/><path d="M7 2v2"/><path d="M17 19.5a2.5 2.5 0 0 0-5 0"/><circle cx="14.5" cy="14.5" r="2.5"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>`,
    more: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
    award: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    exam: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    external: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    layers: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    logout: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
  };

  function getCurrentRoute() {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path.includes('roster')) return 'roster';
    if (path.includes('circles')) return 'circles';
    if (path.includes('admin')) return 'admin';
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('student-cv')) return 'student-cv';
    if (path.includes('more')) return 'more';
    if (path.includes('certificates')) return 'certificates';
    if (path.includes('users')) return 'users';
    if (path.includes('settings')) return 'settings';
    return '';
  }

  function initMobileBottomNav() {
    // Prevent duplicate rendering
    if (document.getElementById('mobileBottomNav')) return;

    const current = getCurrentRoute();

    // Do NOT render bottom nav on sub-pages belonging to "More"
    if (current === 'certificates' || current === 'users' || current === 'settings') {
      return;
    }

    const isMoreActive = current === 'more';
    const circlesUrl = 'circles.html';
    const adminUrl = 'admin.html';
    const analyticsUrl = 'analytics.html';
    const cvUrl = 'student_cv.html';
    const moreUrl = 'more.html';

    // 1. Build Bottom Nav HTML
    const navHtml = `
      <nav class="mobile-bottom-nav" id="mobileBottomNav" aria-label="التنقل السفلي">
        <div class="mobile-bottom-nav-inner">
          <a href="${circlesUrl}" class="bottom-nav-item ${current === 'circles' || current === 'roster' ? 'active' : ''}" data-page="circles" id="mobileNavCircles">
            <div class="bottom-nav-icon">${ICONS.circles}</div>
            <span class="bottom-nav-label">الحلقات</span>
          </a>

          <a href="${adminUrl}" class="bottom-nav-item ${current === 'admin' ? 'active' : ''}" data-page="admin">
            <div class="bottom-nav-icon">${ICONS.admin}</div>
            <span class="bottom-nav-label">الاختبارات</span>
          </a>

          <a href="${analyticsUrl}" class="bottom-nav-item ${current === 'analytics' ? 'active' : ''}" data-page="analytics">
            <div class="bottom-nav-icon">${ICONS.analytics}</div>
            <span class="bottom-nav-label">الإحصائيات</span>
          </a>

          <a href="${cvUrl}" class="bottom-nav-item ${current === 'student-cv' ? 'active' : ''}" data-page="student-cv" id="mobileNavStudentCv">
            <div class="bottom-nav-icon">${ICONS.cv}</div>
            <span class="bottom-nav-label">السيرة الذاتية</span>
          </a>

          <a href="${moreUrl}" class="bottom-nav-item ${isMoreActive ? 'active' : ''}" data-page="more" id="bottomNavMoreBtn">
            <div class="bottom-nav-icon">${ICONS.more}</div>
            <span class="bottom-nav-label">المزيد</span>
          </a>
        </div>
      </nav>
    `;

    const container = document.createElement('div');
    container.id = 'mobileBottomNavContainer';
    container.innerHTML = navHtml;
    document.body.appendChild(container);

    const circlesBtn = container.querySelector('#mobileNavCircles');
    if (circlesBtn) {
      circlesBtn.addEventListener('click', function(e) {
        if (window.location.pathname.includes('circles') || window.location.href.includes('circles.html')) {
          e.preventDefault();
          if (typeof window.closeCircleRoster === 'function') {
            window.closeCircleRoster();
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Sync permissions from desktop links if they are hidden
    syncPermissions();

    // Check if user is a teacher with a single circle ("حلقتي")
    checkTeacherCircle();

    // Re-trigger Lucide icons if available
    if (window.lucide && typeof lucide.createIcons === 'function') {
      try { lucide.createIcons(); } catch (e) {}
    }
  }

  async function checkTeacherCircle() {
    try {
      // Fast path from sessionStorage cache
      const cached = sessionStorage.getItem('albayan_teacher_circle_nav') || sessionStorage.getItem('albayan_teacher_single_circle');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.type === 'single' || parsed.id) {
            applySingleCircleNav(parsed.single || parsed);
          } else if (parsed.type === 'multiple') {
            applyMultipleCirclesNav();
          }
        } catch (e) {}
      }

      let meData = null;
      const meCached = sessionStorage.getItem('albayan_me_cache');
      if (meCached) {
        try { meData = JSON.parse(meCached); } catch (e) {}
      }
      if (!meData) {
        const meRes = await fetch('/api/me');
        if (!meRes.ok) return;
        meData = await meRes.json();
      }
      if (!meData.logged_in) return;

      const isTeacher = meData.role === 'teacher' || meData.role === 'معلم';
      if (isTeacher) {
        let circles = [];
        if (meData.teacher_circles_count !== undefined && meData.single_circle_id) {
          circles = [{ id: meData.single_circle_id, name: meData.single_circle_name }];
        } else {
          const circlesRes = await fetch('/api/circles');
          if (circlesRes.ok) {
            circles = await circlesRes.json();
          }
        }

        if (Array.isArray(circles) && circles.length === 1) {
          const single = circles[0];
          sessionStorage.setItem('albayan_teacher_circle_nav', JSON.stringify({ type: 'single', single: { id: single.id, name: single.name } }));
          applySingleCircleNav(single);
        } else if (Array.isArray(circles) && circles.length > 1) {
          sessionStorage.setItem('albayan_teacher_circle_nav', JSON.stringify({ type: 'multiple' }));
          applyMultipleCirclesNav();
        } else {
          sessionStorage.removeItem('albayan_teacher_circle_nav');
        }
      } else {
        sessionStorage.removeItem('albayan_teacher_circle_nav');
      }
    } catch (err) {
      console.warn('Teacher circle check error:', err);
    }
  }

  function applySingleCircleNav(single) {
    if (!single || !single.id) return;
    const navItem = document.getElementById('mobileNavCircles') || document.querySelector('.bottom-nav-item[data-page="circles"]');
    if (navItem) {
      const label = navItem.querySelector('.bottom-nav-label');
      if (label) label.textContent = 'حلقتي';
      navItem.href = `/circles?circle_id=${single.id}`;

      navItem.onclick = function (e) {
        if (window.location.pathname.includes('circles')) {
          e.preventDefault();
          if (typeof window.selectCircle === 'function') {
            window.selectCircle(single.id, single.name);
          }
        }
      };
    }

    // Also update desktop sidebar if present
    const sidebarCircleLink = document.querySelector('.sidebar-menu a[href="/circles"], aside a[href="/circles"]');
    if (sidebarCircleLink) {
      sidebarCircleLink.href = `/circles?circle_id=${single.id}`;
      sidebarCircleLink.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent.includes('الحلقات') || node.textContent.includes('حلقاتي'))) {
          node.textContent = ' حلقتي';
        }
      });
    }
  }

  function applyMultipleCirclesNav() {
    const navItem = document.getElementById('mobileNavCircles') || document.querySelector('.bottom-nav-item[data-page="circles"]');
    if (navItem) {
      const label = navItem.querySelector('.bottom-nav-label');
      if (label) label.textContent = 'حلقاتي';
      navItem.href = '/circles';
    }

    const sidebarCircleLink = document.querySelector('.sidebar-menu a[href="/circles"], aside a[href="/circles"]');
    if (sidebarCircleLink) {
      sidebarCircleLink.href = '/circles';
      sidebarCircleLink.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent.includes('الحلقات') || node.textContent.includes('حلقتي'))) {
          node.textContent = ' حلقاتي';
        }
      });
    }
  }

  async function syncPermissions() {
    try {
      let meData = null;
      const cached = sessionStorage.getItem('albayan_me_cache');
      if (cached) {
        try { meData = JSON.parse(cached); } catch (e) {}
      }
      if (!meData) {
        const res = await fetch('/api/me');
        if (res.ok) {
          meData = await res.json();
          sessionStorage.setItem('albayan_me_cache', JSON.stringify(meData));
        }
      }

      if (!meData || !meData.logged_in) return;

      const isSuper = meData.is_superadmin === 1 || meData.is_superadmin === "1";
      const isAdmin = meData.role === "admin";
      const isSupervisor = meData.role === "supervisor";
      const perms = Array.isArray(meData.permissions) ? meData.permissions : [];

      const canAccessUsers = isSuper || isAdmin || perms.includes("users");
      const canAccessCv = isSuper || isAdmin || isSupervisor || perms.includes("student_cv");
      const canAccessExams = isSuper || isAdmin || perms.includes("exams");
      const canAccessAnalytics = isSuper || isAdmin || perms.includes("analytics");

      // Users link
      const desktopUsersLink = document.getElementById('usersMenuLink');
      if (desktopUsersLink) desktopUsersLink.style.display = canAccessUsers ? '' : 'none';
      const moreUsers = document.getElementById('moreUsersLink') || document.getElementById('linkUsers');
      if (moreUsers) moreUsers.style.display = canAccessUsers ? '' : 'none';

      // Student CV link
      const desktopCvLink = document.getElementById('studentCvMenuLink');
      if (desktopCvLink) desktopCvLink.style.display = canAccessCv ? '' : 'none';
      const navCv = document.getElementById('mobileNavStudentCv');
      if (navCv) navCv.style.display = canAccessCv ? '' : 'none';

      // Exams link
      const desktopAdminLinks = document.querySelectorAll('a[href="/admin"]');
      desktopAdminLinks.forEach(el => {
        if (!el.classList.contains('bottom-nav-item')) {
          el.style.display = canAccessExams ? '' : 'none';
        }
      });
      const navAdmin = document.querySelector('.bottom-nav-item[data-page="admin"]');
      if (navAdmin) navAdmin.style.display = canAccessExams ? '' : 'none';

      // Analytics link
      const desktopAnalyticsLinks = document.querySelectorAll('a[href="/analytics"]');
      desktopAnalyticsLinks.forEach(el => {
        if (!el.classList.contains('bottom-nav-item')) {
          el.style.display = canAccessAnalytics ? '' : 'none';
        }
      });
      const navAnalytics = document.querySelector('.bottom-nav-item[data-page="analytics"]');
      if (navAnalytics) navAnalytics.style.display = canAccessAnalytics ? '' : 'none';

      // Update sidebar username and role badge if placeholder
      const userBox = document.getElementById('loggedUsername');
      if (userBox && (userBox.textContent === 'الكادر التعليمي' || userBox.textContent === 'زائر')) {
        userBox.textContent = meData.username;
      }
      const roleBox = document.getElementById('loggedRoleBadge') || document.getElementById('loggedRole');
      if (roleBox && (roleBox.textContent === 'مدرسة البيان' || roleBox.textContent === 'كادر تعليمي')) {
        roleBox.textContent = isAdmin ? 'مسؤول النظام' : (isSupervisor ? 'مشرف تربوي' : 'معلم قرآن');
      }
    } catch (err) {
      console.warn('Permissions sync error:', err);
    }
  }

  // Global functions
  window.openBottomMoreSheet = function () {
    window.location.href = isStandalone ? 'more.html' : '/more';
  };

  window.closeBottomMoreSheet = function () {
    // No-op for standalone page
  };

  window.toggleBottomMoreSheet = function () {
    window.location.href = isStandalone ? 'more.html' : '/more';
  };

  window.handleLogout = function () {
    if (typeof window.albayanLogout === 'function') {
      window.albayanLogout();
      return;
    }
    if (typeof window.logout === 'function') {
      window.logout();
      return;
    }
    sessionStorage.clear();
    try {
      localStorage.removeItem("albayan_logged_user");
      localStorage.removeItem("albayan_saved_token");
    } catch(e) {}
    fetch('/api/logout', { method: 'POST' }).finally(() => {
      window.location.href = 'login.html?logout=1';
    });
  };

  // Graceful fallback for any old sidebar calls
  window.toggleSidebar = function () {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && window.innerWidth > 768) {
      sidebar.classList.toggle('mobile-open');
      if (overlay) overlay.classList.toggle('show', sidebar.classList.contains('mobile-open'));
    } else {
      window.location.href = isStandalone ? 'more.html' : '/more';
    }
  };

  // Observer to keep permissions synced dynamically if scripts update roles later
  const observer = new MutationObserver(function () {
    syncPermissions();
  });

  // Self initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initMobileBottomNav();
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) observer.observe(sidebar, { attributes: true, subtree: true, childList: true });
    });
  } else {
    initMobileBottomNav();
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) observer.observe(sidebar, { attributes: true, subtree: true, childList: true });
  }

  window.initMobileBottomNav = initMobileBottomNav;
})();
