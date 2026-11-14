/**
 * Albayan Smart Certificates Studio - JavaScript Core
 * High-Resolution 300 DPI Canvas Engine & Android Mobile Experience
 * Pure Minimalist Icons & Smooth Pointer Drag System
 */

(function () {
  'use strict';

  // --- Constants & Dimensions (A4 Landscape at 300 DPI: 3508 x 2480) ---
  const CANVAS_WIDTH = 3508;
  const CANVAS_HEIGHT = 2480;

  const STUDIO_DRAFT_KEY = 'albayan_cert_studio_draft_v2';
  const STUDIO_PRESETS_KEY = 'albayan_cert_studio_presets_v2';

  function createDefaultElements() {
    return {
      cert_title: { x: 50, y: 31, size: 108, align: 'center', color: '#8B1E0F', fontFamily: 'Amiri', isBold: true, opacity: 1, rotation: 0, zIndex: 20, visible: true, width: 1100, height: 140 },
      student_name: { x: 50, y: 47, size: 116, align: 'center', color: '#1B3A4B', fontFamily: 'Amiri', isBold: true, opacity: 1, rotation: 0, zIndex: 30, visible: true, width: 1300, height: 160 },
      grade_badge: { x: 50, y: 58, size: 54, align: 'center', color: '#C59B27', fontFamily: 'Amiri', isBold: true, opacity: 1, rotation: 0, zIndex: 40, visible: true, width: 700, height: 90 },
      body_text: { x: 50, y: 69, size: 48, align: 'center', color: '#334155', fontFamily: 'Amiri', isBold: false, opacity: 1, rotation: 0, zIndex: 50, visible: true, width: 2200, height: 220, maxWidth: 2600 },
      circle_info: { x: 28, y: 86, size: 44, align: 'center', color: '#475569', fontFamily: 'Cairo', isBold: true, opacity: 1, rotation: 0, zIndex: 60, visible: true, width: 650, height: 90 },
      teacher_info: { x: 72, y: 86, size: 44, align: 'center', color: '#475569', fontFamily: 'Cairo', isBold: true, opacity: 1, rotation: 0, zIndex: 70, visible: true, width: 650, height: 90 },
      school_stamp: { x: 50, y: 85, size: 180, align: 'center', color: '#C59B27', fontFamily: 'Cairo', isBold: true, opacity: 1, rotation: 0, zIndex: 80, visible: true, width: 220, height: 220 }
    };
  }

  // --- Studio State ---
  const state = {
    currentTemplate: 'academic', // 'blank', 'gold', 'emerald', 'navy', 'academic', 'custom'
    customBgImage: null,
    customBgDataUrl: null,
    showOrnamentalBorder: true,
    showQuranEmblem: false,
    showSchoolLogo: true,
    showOfficialStamp: true,

    // Typography
    title: 'شَهَادَةُ شُكْرٍ وَتَقْدِير',
    bodyText: 'تَسُرُّ إدارة مدرسة البيان لتعليم القرآن الكريم أن تمنح هذه الشهادة للطالب المبارك تقديراً لاجتهاده وتميزه ومواظبته على حفظ كتاب الله وسنة رسوله، سائلين الله تعالى أن يجعله من أهل القرآن الذين هم أهل الله وخاصته.',
    fontFamily: 'Amiri',
    primaryColor: '#8B1E0F',
    accentColor: '#C59B27',

    // Element Positions & Styles (% of canvas width / height)
    elements: createDefaultElements(),

    activeElementKey: 'student_name',

    // Filter & Audience State
    filterMode: 'all', // 'all', 'circle', 'single', 'top_achievers'
    selectedCircleId: 'all',
    selectedStudentId: '',
    studentSearchQuery: '',
    achieverCriteria: 'top_sard',
    timeframe: 'month',
    selectedMonth: 'all',
    selectedYear: 'all',
    limit: 20,
    gradeSource: 'all_weighted',

    // Loaded Data
    circles: [],
    allFilteredStudents: [],
    students: [],
    currentStudentIndex: 0,
    customFonts: [],
    isBatchCancelled: false,

    // Canvas Zoom & Pan
    scale: 1,
    panX: 0,
    panY: 0
  };

  // --- Undo / Redo History Stack ---
  const history = {
    stack: [],
    index: -1,
    maxSize: 35,
    isApplying: false
  };

  // --- RequestAnimationFrame Draw Scheduler ---
  let animFrameId = null;
  function scheduleCanvasDraw() {
    if (animFrameId) return;
    animFrameId = requestAnimationFrame(() => {
      drawCertificateCanvas();
      animFrameId = null;
    });
  }

  // --- Drag & Scale State ---
  let customElementIdCounter = 1;

  const dragState = {
    isDragging: false,
    key: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    elemStartX: 0,
    elemStartY: 0
  };

  const scaleDragState = {
    isScaling: false,
    key: null,
    corner: null,
    edge: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    startSize: 60,
    startWidth: 200,
    startHeight: 100
  };

  // --- Preloaded Images ---
  let schoolLogoImg = null;
  let quranEmblemImg = null;

  // --- DOM Elements ---
  const canvas = document.getElementById('certCanvas');
  const ctx = canvas.getContext('2d');
  const canvasFrame = document.getElementById('certCanvasFrame');
  const dragOverlay = document.getElementById('certDragOverlay');
  const bottomSheet = document.getElementById('bottomSheet');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const sheetTitle = document.getElementById('sheetTitle');
  const certToast = document.getElementById('certToast');

  // App Bar Elements
  const prevStudentBtn = document.getElementById('prevStudentBtn');
  const nextStudentBtn = document.getElementById('nextStudentBtn');
  const currentStudentNameEl = document.getElementById('currentStudentName');
  const studentCounterEl = document.getElementById('studentCounter');
  const quickShareBtn = document.getElementById('quickShareBtn');
  const quickExportBtn = document.getElementById('quickExportBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');

  // Sliders & Position Controls
  const sliderX = document.getElementById('sliderX');
  const sliderY = document.getElementById('sliderY');
  const sliderSize = document.getElementById('sliderSize');
  const valXDisplay = document.getElementById('valXDisplay');
  const valYDisplay = document.getElementById('valYDisplay');
  const valSizeDisplay = document.getElementById('valSizeDisplay');
  const currentElemBadge = document.getElementById('currentElemBadge');
  const resetElemPosBtn = document.getElementById('resetElemPosBtn');

  // --- Initializer ---
  async function initStudio() {
    initAuthAndUser();
    initMobileSidebar();
    setupBottomNavigation();
    setupStudioTabs();
    setupBottomSheetDrag();
    setupTemplates();
    setupTextEditModal();
    setupTypographyAndFonts();
    setupPositioningSliders();
    setupFilterListeners();
    setupExportHandlers();
    setupStageControls();
    setupHistoryManager();
    setupPanAndGestures();

    // Restore saved auto-draft if available, otherwise sync initial template UI
    await loadDraftFromStorage();
    syncStudioControlsUI();
    renderElementSelectorAndLayers();
    renderSavedPresetsList();

    // Load assets
    await preloadAssets();

    // Fetch circles and filter options
    await fetchFilterOptions();

    // Fetch initial student list
    await fetchStudentsList();

    // Build interactive overlay handles once
    buildDragOverlayHandles();

    // Initial Render
    renderCertificate();
    updateTypographyPanelActiveElement();

    // Push initial clean state to undo history
    pushHistoryState('الحالة الأولية');

    // Refresh Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- Auth & User State ---
  async function initAuthAndUser() {
    const applyUserToUI = (u) => {
      if (!u) return;
      const userElem = document.getElementById('loggedUsername');
      if (userElem && (u.username || u.student_name)) {
        userElem.textContent = u.username || u.student_name;
      }
      const roleElem = document.getElementById('loggedRole');
      if (roleElem && u.role) {
        const rolesMap = { admin: 'مدير النظام', teacher: 'معلم الحلقة', supervisor: 'مشرف تعليمي', student: 'طالب' };
        roleElem.textContent = rolesMap[u.role] || u.role;
      }
      const usersLink = document.getElementById('usersMenuLink');
      if (usersLink && u.role && u.role !== 'admin') {
        usersLink.style.display = 'none';
      }
    };

    if (!window.IS_CAPACITOR_APP) {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.logged_in) {
            applyUserToUI(data);
            return;
          }
        }
      } catch (e) {}
    }

    // Fallback (or primary on Capacitor) cached session
    try {
      const cached = localStorage.getItem('albayan_logged_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u && (u.username || u.student_name)) {
          applyUserToUI(u);
          return;
        }
      }
    } catch (e) {}

    window.location.href = 'login.html';
  }

  // Global Logout
  window.logout = async function () {
    if (typeof window.albayanLogout === 'function') {
      return window.albayanLogout();
    }
    sessionStorage.clear();
    try {
      localStorage.removeItem("albayan_logged_user");
      localStorage.removeItem("albayan_saved_token");
    } catch (e) {}
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = 'login.html?logout=1';
  };

  // --- Mobile Sidebar Controls ---
  function initMobileSidebar() {
    if (typeof initMobileBottomNav === 'function') {
      initMobileBottomNav();
    }
  }

  window.toggleSidebar = function (forceState) {
    if (typeof toggleBottomMoreSheet === 'function') {
      toggleBottomMoreSheet();
    }
  };


  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(message, duration = 3000) {
    if (!certToast) return;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    certToast.textContent = message;
    certToast.classList.add('show');
    toastTimer = setTimeout(() => {
      certToast.classList.remove('show');
      toastTimer = null;
    }, duration);
  }

  // --- Preload Static Images ---
  function preloadAssets() {
    const loadImgWithFallback = (paths) => new Promise((resolve) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= paths.length) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          idx += 1;
          tryNext();
        };
        img.src = paths[idx];
      };
      tryNext();
    });

    return Promise.all([
      loadImgWithFallback(['logo.png', '/static/logo.png']).then((img) => { schoolLogoImg = img; }),
      loadImgWithFallback(['quran_3d.png', '/static/quran_3d.png']).then((img) => { quranEmblemImg = img; })
    ]);
  }

  // --- Navigation & Section Switching ---
  function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        switchSectionTab(target);
      });
    });

    const closeBtn = document.getElementById('sheetCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeBottomSheet);
    }
    if (sheetBackdrop) {
      sheetBackdrop.addEventListener('click', closeBottomSheet);
    }
  }

  function setupStudioTabs() {
    const tabBtns = document.querySelectorAll('.studio-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        switchSectionTab(target);
      });
    });
  }

  function switchSectionTab(tabName) {
    const effectiveTab = tabName === 'Placement' ? 'Typography' : tabName;

    document.querySelectorAll('.bottom-nav-item').forEach((n) => {
      n.classList.toggle('active', n.getAttribute('data-target') === effectiveTab);
    });

    document.querySelectorAll('.studio-tab-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-tab') === effectiveTab);
    });

    document.querySelectorAll('.sheet-tab-panel').forEach((panel) => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`tabPanel${effectiveTab}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    const titlesMap = {
      Templates: 'القوالب والخلفيات',
      Typography: 'إعدادات النص',
      Students: 'ترشيح الطلاب والمميزين',
      Export: 'التصدير والمشاركة'
    };
    if (sheetTitle) {
      sheetTitle.textContent = titlesMap[effectiveTab] || 'الإعدادات';
    }

    if (window.innerWidth < 1100) {
      bottomSheet.classList.add('open');
      sheetBackdrop.classList.add('active');
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function closeBottomSheet() {
    bottomSheet.classList.remove('open');
    sheetBackdrop.classList.remove('active');
  }

  function setupBottomSheetDrag() {
    const handle = document.getElementById('sheetDragHandle');
    if (!handle) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    handle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        bottomSheet.style.transform = `translateY(${diff}px)`;
      }
    }, { passive: true });

    handle.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = currentY - startY;
      bottomSheet.style.transform = '';
      if (diff > 80) {
        closeBottomSheet();
      }
    });
  }

  function syncStudioControlsUI() {
    document.querySelectorAll('.template-card').forEach((card) => {
      card.classList.toggle('active', card.getAttribute('data-template') === state.currentTemplate);
    });
    const customBgActions = document.getElementById('customBgActions');
    if (customBgActions) {
      customBgActions.style.display = state.customBgImage ? 'flex' : 'none';
    }
    ['showOrnamentalBorder', 'showQuranEmblem', 'showSchoolLogo', 'showOfficialStamp'].forEach((prop) => {
      const el = document.getElementById(prop);
      if (el) el.checked = Boolean(state[prop]);
    });
    const gradeSelect = document.getElementById('gradeSourceSelect');
    if (gradeSelect && state.gradeSource) {
      gradeSelect.value = state.gradeSource;
    }
  }

  function applyTemplatePreset(tplKey) {
    state.currentTemplate = tplKey || 'academic';
    state.customBgImage = null;
    state.customBgDataUrl = null;

    if (tplKey === 'blank') {
      state.showOrnamentalBorder = false;
      state.showQuranEmblem = false;
      state.showSchoolLogo = false;
      state.showOfficialStamp = false;
      state.primaryColor = '#1B3A4B';
      if (state.elements.student_name) state.elements.student_name.color = '#1B3A4B';
      if (state.elements.cert_title) state.elements.cert_title.color = '#1B3A4B';
      if (state.elements.grade_badge) state.elements.grade_badge.color = '#C59B27';
      if (state.elements.body_text) state.elements.body_text.color = '#334155';
      if (state.elements.circle_info) state.elements.circle_info.color = '#475569';
      if (state.elements.teacher_info) state.elements.teacher_info.color = '#475569';
    } else if (tplKey === 'gold') {
      state.showOrnamentalBorder = true;
      state.showSchoolLogo = true;
      state.showOfficialStamp = true;
      state.primaryColor = '#C59B27';
      if (state.elements.student_name) state.elements.student_name.color = '#FFFFFF';
      if (state.elements.cert_title) state.elements.cert_title.color = '#dfbc55';
      if (state.elements.grade_badge) state.elements.grade_badge.color = '#fbbf24';
      if (state.elements.body_text) state.elements.body_text.color = '#e2e8f0';
      if (state.elements.circle_info) state.elements.circle_info.color = '#cbd5e1';
      if (state.elements.teacher_info) state.elements.teacher_info.color = '#cbd5e1';
    } else if (tplKey === 'emerald') {
      state.showOrnamentalBorder = true;
      state.showSchoolLogo = true;
      state.showOfficialStamp = true;
      state.primaryColor = '#34d399';
      if (state.elements.student_name) state.elements.student_name.color = '#FFFFFF';
      if (state.elements.cert_title) state.elements.cert_title.color = '#fbbf24';
      if (state.elements.grade_badge) state.elements.grade_badge.color = '#6ee7b7';
      if (state.elements.body_text) state.elements.body_text.color = '#e2e8f0';
      if (state.elements.circle_info) state.elements.circle_info.color = '#a7f3d0';
      if (state.elements.teacher_info) state.elements.teacher_info.color = '#a7f3d0';
    } else if (tplKey === 'navy') {
      state.showOrnamentalBorder = true;
      state.showSchoolLogo = true;
      state.showOfficialStamp = true;
      state.primaryColor = '#60a5fa';
      if (state.elements.student_name) state.elements.student_name.color = '#FFFFFF';
      if (state.elements.cert_title) state.elements.cert_title.color = '#fbbf24';
      if (state.elements.grade_badge) state.elements.grade_badge.color = '#93c5fd';
      if (state.elements.body_text) state.elements.body_text.color = '#e2e8f0';
      if (state.elements.circle_info) state.elements.circle_info.color = '#93c5fd';
      if (state.elements.teacher_info) state.elements.teacher_info.color = '#93c5fd';
    } else {
      // academic
      state.showOrnamentalBorder = true;
      state.showSchoolLogo = true;
      state.showOfficialStamp = true;
      state.primaryColor = '#8B1E0F';
      if (state.elements.student_name) state.elements.student_name.color = '#1B3A4B';
      if (state.elements.cert_title) state.elements.cert_title.color = '#8B1E0F';
      if (state.elements.grade_badge) state.elements.grade_badge.color = '#C59B27';
      if (state.elements.body_text) state.elements.body_text.color = '#334155';
      if (state.elements.circle_info) state.elements.circle_info.color = '#475569';
      if (state.elements.teacher_info) state.elements.teacher_info.color = '#475569';
    }

    if (tplKey !== 'blank') {
      ['cert_title', 'student_name', 'grade_badge', 'body_text', 'circle_info', 'teacher_info', 'school_stamp'].forEach((k) => {
        if (state.elements[k]) state.elements[k].visible = true;
      });
    } else if (state.elements.school_stamp) {
      state.elements.school_stamp.visible = false;
    }
    syncStudioControlsUI();
    if (typeof buildDragOverlayHandles === 'function') {
      buildDragOverlayHandles();
    }
  }

  function buildDesignSnapshotObj() {
    const serializedElements = {};
    Object.keys(state.elements).forEach((k) => {
      const el = state.elements[k];
      if (!el) return;
      serializedElements[k] = {
        ...el,
        img: undefined,
        imgElement: undefined,
        imgDataUrl: el.imgDataUrl || null
      };
    });
    return {
      currentTemplate: state.currentTemplate,
      customBgDataUrl: state.customBgDataUrl || null,
      showOrnamentalBorder: state.showOrnamentalBorder,
      showQuranEmblem: state.showQuranEmblem,
      showSchoolLogo: state.showSchoolLogo,
      showOfficialStamp: state.showOfficialStamp,
      title: state.title,
      bodyText: state.bodyText,
      fontFamily: state.fontFamily,
      primaryColor: state.primaryColor,
      accentColor: state.accentColor,
      gradeSource: state.gradeSource,
      elements: serializedElements
    };
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  async function applyDesignSnapshotObj(snap) {
    if (!snap || typeof snap !== 'object') return;
    history.isApplying = true;
    try {
      state.currentTemplate = snap.currentTemplate || 'academic';
      state.showOrnamentalBorder = snap.showOrnamentalBorder !== undefined ? Boolean(snap.showOrnamentalBorder) : true;
      state.showQuranEmblem = Boolean(snap.showQuranEmblem);
      state.showSchoolLogo = snap.showSchoolLogo !== undefined ? Boolean(snap.showSchoolLogo) : true;
      state.showOfficialStamp = snap.showOfficialStamp !== undefined ? Boolean(snap.showOfficialStamp) : true;
      if (snap.title !== undefined) state.title = snap.title;
      if (snap.bodyText !== undefined) state.bodyText = snap.bodyText;
      if (snap.fontFamily) state.fontFamily = snap.fontFamily;
      if (snap.primaryColor) state.primaryColor = snap.primaryColor;
      if (snap.accentColor) state.accentColor = snap.accentColor;
      if (snap.gradeSource) state.gradeSource = snap.gradeSource;

      state.customBgDataUrl = snap.customBgDataUrl || null;
      state.customBgImage = snap.customBgDataUrl ? await loadImageFromDataUrl(snap.customBgDataUrl) : null;

      if (snap.elements && typeof snap.elements === 'object') {
        const defaults = createDefaultElements();
        const rebuilt = {};
        const keys = Object.keys(snap.elements);
        for (const k of keys) {
          const item = snap.elements[k];
          if (!item) continue;
          const base = defaults[k] ? { ...defaults[k] } : {};
          rebuilt[k] = {
            ...base,
            ...item,
            fontFamily: item.fontFamily || state.fontFamily || 'Amiri',
            isBold: item.isBold !== undefined ? Boolean(item.isBold) : (k === 'cert_title' || k === 'student_name'),
            opacity: item.opacity !== undefined ? Number(item.opacity) : 1,
            rotation: item.rotation !== undefined ? Number(item.rotation) : 0,
            zIndex: item.zIndex !== undefined ? Number(item.zIndex) : 50
          };
          if (item.imgDataUrl) {
            const loadedImg = await loadImageFromDataUrl(item.imgDataUrl);
            rebuilt[k].imgElement = loadedImg;
            rebuilt[k].img = loadedImg;
          }
        }
        state.elements = rebuilt;
      }

      if (typeof syncCustomElementIdCounter === 'function') {
        syncCustomElementIdCounter();
      }
      if (!state.activeElementKey || !state.elements[state.activeElementKey]) {
        state.activeElementKey = Object.keys(state.elements).find((k) => state.elements[k].visible !== false) || null;
      }

      syncStudioControlsUI();
      if (typeof buildDragOverlayHandles === 'function') buildDragOverlayHandles();
      if (typeof renderElementSelectorAndLayers === 'function') renderElementSelectorAndLayers();
      if (typeof updateTypographyPanelActiveElement === 'function') updateTypographyPanelActiveElement();
      renderCertificate();
    } finally {
      history.isApplying = false;
    }
  }

  let draftSaveTimer = null;
  function saveDraftToStorage() {
    if (history.isApplying) return;
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      try {
        const snap = buildDesignSnapshotObj();
        // Avoid blowing up localStorage quota if a huge image was uploaded (>2MB)
        const json = JSON.stringify(snap);
        if (json.length < 2500000) {
          localStorage.setItem(STUDIO_DRAFT_KEY, json);
        }
      } catch (e) {}
    }, 350);
  }

  async function loadDraftFromStorage() {
    try {
      const raw = localStorage.getItem(STUDIO_DRAFT_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw);
      await applyDesignSnapshotObj(snap);
    } catch (e) {}
  }

  function getSavedPresets() {
    try {
      const raw = localStorage.getItem(STUDIO_PRESETS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveNamedPreset() {
    const name = window.prompt('أدخل اسماً لهذا القالب الجاهز:', 'تصميم مدرسة البيان ' + (getSavedPresets().length + 1));
    if (!name || !name.trim()) return;
    const presets = getSavedPresets();
    const snapshot = buildDesignSnapshotObj();
    presets.unshift({
      id: 'preset_' + Date.now().toString(36),
      name: name.trim(),
      savedAt: new Date().toISOString(),
      snapshot
    });
    try {
      localStorage.setItem(STUDIO_PRESETS_KEY, JSON.stringify(presets.slice(0, 12)));
      renderSavedPresetsList();
      showToast('تم حفظ التصميم في القوالب الجاهزة');
    } catch (e) {
      showToast('تعذر حفظ القالب: مساحة التخزين ممتلئة');
    }
  }

  function renderSavedPresetsList() {
    const container = document.getElementById('savedPresetsList');
    if (!container) return;
    const presets = getSavedPresets();
    if (!presets.length) {
      container.innerHTML = '<span class="saved-presets-empty">لا توجد تصاميم محفوظة بعد. اضغط "حفظ" للاحتفاظ بتصميمك الحالي.</span>';
      return;
    }
    container.innerHTML = '';
    presets.forEach((preset) => {
      const chip = document.createElement('div');
      chip.className = 'preset-chip';

      const loadBtn = document.createElement('span');
      loadBtn.textContent = preset.name;
      loadBtn.style.cursor = 'pointer';
      loadBtn.addEventListener('click', async () => {
        await applyDesignSnapshotObj(preset.snapshot);
        pushHistoryState('استرجاع قالب: ' + preset.name);
        showToast('تم تطبيق القالب: ' + preset.name);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'preset-chip-delete';
      delBtn.title = 'حذف القالب';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = getSavedPresets().filter((p) => p.id !== preset.id);
        localStorage.setItem(STUDIO_PRESETS_KEY, JSON.stringify(next));
        renderSavedPresetsList();
        showToast('تم حذف القالب');
      });

      chip.appendChild(loadBtn);
      chip.appendChild(delBtn);
      container.appendChild(chip);
    });
  }

  async function resetStudioDesign() {
    try {
      localStorage.removeItem(STUDIO_DRAFT_KEY);
    } catch (e) {}
    state.elements = createDefaultElements();
    state.fontFamily = 'Amiri';
    state.title = 'شَهَادَةُ شُكْرٍ وَتَقْدِير';
    state.bodyText = 'تَسُرُّ إدارة مدرسة البيان لتعليم القرآن الكريم أن تمنح هذه الشهادة للطالب المبارك تقديراً لاجتهاده وتميزه ومواظبته على حفظ كتاب الله وسنة رسوله، سائلين الله تعالى أن يجعله من أهل القرآن الذين هم أهل الله وخاصته.';
    state.gradeSource = 'all_weighted';
    state.activeElementKey = 'student_name';
    applyTemplatePreset('academic');
    buildDragOverlayHandles();
    renderElementSelectorAndLayers();
    updateTypographyPanelActiveElement();
    renderCertificate();
    pushHistoryState('إعادة التصميم الافتراضي');
    showToast('تمت استعادة التصميم الافتراضي بنجاح');
  }

  // --- Templates Setup ---
  function setupTemplates() {
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach((card) => {
      card.addEventListener('click', () => {
        const tplKey = card.getAttribute('data-template');
        applyTemplatePreset(tplKey);
        renderElementSelectorAndLayers();
        updateTypographyPanelActiveElement();
        renderCertificate();
        pushHistoryState('تغيير القالب');
      });
    });

    const bgUploadZone = document.getElementById('bgUploadZone');
    const customBgInput = document.getElementById('customBgInput');
    const removeCustomBgBtn = document.getElementById('removeCustomBgBtn');

    if (bgUploadZone && customBgInput) {
      bgUploadZone.addEventListener('click', () => customBgInput.click());
      customBgInput.addEventListener('change', handleCustomBgUpload);
    }

    if (removeCustomBgBtn) {
      removeCustomBgBtn.addEventListener('click', () => {
        applyTemplatePreset('academic');
        renderElementSelectorAndLayers();
        updateTypographyPanelActiveElement();
        renderCertificate();
        pushHistoryState('إزالة الخلفية المخصصة');
        showToast('تمت استعادة القالب الأكاديمي الافتراضي');
      });
    }

    ['showOrnamentalBorder', 'showQuranEmblem', 'showSchoolLogo', 'showOfficialStamp'].forEach((prop) => {
      const el = document.getElementById(prop);
      if (el) {
        el.addEventListener('change', (e) => {
          state[prop] = e.target.checked;
          if (prop === 'showOfficialStamp' && state.elements.school_stamp) {
            state.elements.school_stamp.visible = e.target.checked;
            buildDragOverlayHandles();
            renderElementSelectorAndLayers();
          }
          renderCertificate();
          pushHistoryState('تعديل الزخارف');
        });
      }
    });

    const gradeSourceSelect = document.getElementById('gradeSourceSelect');
    if (gradeSourceSelect) {
      gradeSourceSelect.addEventListener('change', (e) => {
        state.gradeSource = e.target.value;
        renderCertificate();
        pushHistoryState('تغيير مصدر التقدير');
      });
    }

    const savePresetBtn = document.getElementById('saveDesignPresetBtn');
    if (savePresetBtn) savePresetBtn.addEventListener('click', saveNamedPreset);

    const resetStudioBtn = document.getElementById('resetStudioDesignBtn');
    if (resetStudioBtn) resetStudioBtn.addEventListener('click', resetStudioDesign);
  }

  function handleCustomBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        state.customBgImage = img;
        state.customBgDataUrl = dataUrl;
        state.currentTemplate = 'custom';
        syncStudioControlsUI();
        renderCertificate();
        pushHistoryState('رفع خلفية مخصصة');
        showToast('تم تحميل الخلفية المخصصة بنجاح');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // --- Smart Variables Engine (محرك المتغيرات الذكية الشامل) ---
  function formatMentions(text, studentObj) {
    if (!text) return '';
    const student = studentObj || (state.students && state.students[state.currentStudentIndex]) || {};

    const today = new Date();
    // Gregorian Arabic
    const gregDate = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const gregYear = today.getFullYear();

    // Hijri Arabic
    let hijriDate = '';
    let hijriYearNum = 1447;
    try {
      if (window.HijriDate && typeof window.HijriDate.formatDualDate === 'function') {
        hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(today);
        if (typeof window.HijriDate.getCurrentHijriYear === 'function') {
          hijriYearNum = window.HijriDate.getCurrentHijriYear();
        }
      } else {
        hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(today);
        const yParts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).format(today);
        const parsedY = parseInt(String(yParts).replace(/[^0-9]/g, ''), 10);
        if (parsedY > 1400) hijriYearNum = parsedY;
      }
    } catch (e) {
      hijriDate = '١٥ ربيع الأول ' + hijriYearNum + ' هـ';
    }

    const toArabicDigits = (val) => String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
    const hasNumeric = (val) => val !== undefined && val !== null && val !== '' && !Number.isNaN(Number(val));
    const computeRating = (pct) => {
      const n = Number(pct);
      if (n >= 95) return 'ممتاز مرتفع';
      if (n >= 90) return 'ممتاز';
      if (n >= 80) return 'جيد جداً';
      if (n >= 70) return 'جيد';
      if (n >= 50) return 'ناجح';
      return 'مشارك';
    };

    const sName = student.name || 'عبد الله بن محمد الأهدل';
    const sCode = student.student_code || (student.id ? `STD-${String(student.id).padStart(4, '0')}` : 'STD-0042');
    const sCircle = student.circle_name || 'حلقة البيان القرآنية';
    const sTeacher = student.teacher_name || 'الشيخ عبد الرحمن';

    let finalPct = null;
    if (state.gradeSource === 'exams' && hasNumeric(student.exam_percent)) {
      finalPct = Math.round(Number(student.exam_percent));
    } else if (state.gradeSource === 'sard' && hasNumeric(student.sard_pages)) {
      finalPct = Math.min(100, Math.round((Number(student.sard_pages) / 30) * 100));
    } else if (hasNumeric(student.exam_percent)) {
      finalPct = Math.round(Number(student.exam_percent));
    }

    const sFinal = student.final_grade || student.grade_badge || (finalPct !== null ? `${finalPct}%` : (hasNumeric(student.sard_pages) ? `${Math.round(Number(student.sard_pages))} وجهاً` : '98%'));
    const sTerm1 = student.term_1_grade || (hasNumeric(student.exam_percent) ? `${Math.round(Number(student.exam_percent))}%` : '95%');
    const sTerm2 = student.term_2_grade || (hasNumeric(student.exam_percent) ? `${Math.round(Number(student.exam_percent))}%` : '98%');
    const sMonth = student.month_grade || (hasNumeric(student.exam_percent) ? `${Math.round(Number(student.exam_percent))}%` : '100%');
    const sRating = student.rating || student.grade_label || (finalPct !== null ? computeRating(finalPct) : 'ممتاز مرتفع');
    const sSard = hasNumeric(student.sard_pages)
      ? `${Math.round(Number(student.sard_pages))} وجهاً`
      : (student.sard_pages ? String(student.sard_pages) : '٠ وجهاً');
    const sAtt = hasNumeric(student.attendance_rate)
      ? `${Math.round(Number(student.attendance_rate))}%`
      : (student.attendance_rate ? (String(student.attendance_rate).includes('%') ? student.attendance_rate : `${student.attendance_rate}%`) : '100%');
    const sMemo = student.memo_grade || 'ممتاز';
    const sRev = student.rev_grade || 'ممتاز';
    const sAchievement = student.achievement_text || (hasNumeric(student.sard_pages) && Number(student.sard_pages) > 0
      ? `إتمام سرد وتسميع ${Math.round(Number(student.sard_pages))} وجهاً من القرآن الكريم بإتقان وتفوق`
      : 'الاجتهاد والمواظبة في حلقة تحفيظ القرآن الكريم بإتقان وتفوق');
    const sDirector = 'إدارة مدرسة البيان';
    const sSchool = 'مدرسة البيان لتعليم القرآن الكريم';
    const sYear = `${toArabicDigits(hijriYearNum)} هـ / ${toArabicDigits(gregYear)} م`;

    // Universal Arabic-Aware Semantic Resolver
    function resolveKey(rawKey) {
      if (!rawKey) return '';
      // Strip diacritics, harakat, tatweel, punctuation, underscores
      const clean = String(rawKey)
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[_.\-:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const norm = clean
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .toLowerCase();

      // 1. Student code / number: {{رقم_الطالب}} / {{كود_الطالب}} / {{رقم_القيد}}
      if (norm.includes('رقم') || norm.includes('كود') || norm.includes('قيد') || norm.includes('code') || norm.includes('id')) return sCode;

      // 2. Attendance: {{نسبة_الحضور}} / {{المواظبة}} / {{الحضور}}
      if (norm.includes('حضور') || norm.includes('مواظب') || norm.includes('غياب') || norm.includes('attendance')) return sAtt;

      // 3. Term 1 & 2 & Month
      if ((norm.includes('فصل') || norm.includes('ترم') || norm.includes('term')) && (norm.includes('اول') || norm.includes('1') || norm.includes('الاول'))) return sTerm1;
      if ((norm.includes('فصل') || norm.includes('ترم') || norm.includes('term')) && (norm.includes('ثان') || norm.includes('2') || norm.includes('الثاني'))) return sTerm2;
      if (norm.includes('شهر') || norm.includes('month')) return sMonth;

      // 4. Sard: {{أوجه_السرد}} / {{السرد}}
      if (norm.includes('سرد') || norm.includes('اوجه') || norm.includes('صفحات') || norm.includes('sard')) return sSard;

      // 5. Memorization & Revision: {{درجة_الحفظ}} / {{الحفظ}} / {{درجة_المراجعة}}
      if (norm.includes('حفظ') || norm.includes('memo') || norm.includes('تسميع')) return sMemo;
      if (norm.includes('مراجع') || norm.includes('rev')) return sRev;

      // 6. Achievement / Honoring statement: {{نص_التكريم}} / {{التكريم}} / {{نص_الإنجاز}}
      if (norm.includes('انجاز') || norm.includes('تكريم') || norm.includes('achievement') || norm.includes('honor')) return sAchievement;

      // 7. Hijri date: {{التاريخ_الهجري}} / {{الهجري}}
      if (norm.includes('هجر') || norm.includes('hijri')) return hijriDate;

      // 8. Gregorian date: {{التاريخ_الميلادي}} / {{الميلادي}} / {{التاريخ}}
      if (norm.includes('ميلاد') || norm.includes('تاريخ') || norm.includes('date') || norm.includes('gregorian')) return gregDate;

      // 9. Academic year: {{العام_الدراسي}} / {{العام}} / {{السنة}}
      if (norm.includes('عام') || norm.includes('سنه') || norm.includes('دراسي') || norm.includes('year')) return sYear;

      // 10. Circle: {{اسم_الحلقة}} / {{الحلقة}}
      if (norm.includes('حلق') || norm.includes('circle')) return sCircle;

      // 11. Teacher: {{اسم_المعلم}} / {{المعلم}} / {{الشيخ}}
      if (norm.includes('معلم') || norm.includes('شيخ') || norm.includes('استاذ') || norm.includes('teacher')) return sTeacher;

      // 12. Director: {{اسم_المدير}} / {{المدير}}
      if (norm.includes('مدير') || norm.includes('اداره') || norm.includes('director')) return sDirector;

      // 13. School: {{اسم_المدرسة}} / {{المدرسة}}
      if (norm.includes('مدرس') || norm.includes('مركز') || norm.includes('school')) return sSchool;

      // 14. Rating / Evaluation: {{التقدير}} / {{التقييم}} / {{المستوى}}
      if (norm.includes('تقدير') || norm.includes('تقييم') || norm.includes('مستوي') || norm.includes('rating') || norm.includes('level')) return sRating;

      // 15. Student name: {{اسم_الطالب}} / {{اسم الطالب}} / {{الطالب}} / {student_name}
      if (norm.includes('طالب') || norm === 'اسم' || norm === 'الاسم' || norm === 'name' || norm === 'student' || norm === 'student name' || norm === 'student_name') return sName;

      // 16. Final Grade / Score / Percentage: {{العلامة_النهائية}} / {{العلامة}} / {{الدرجة}} / {{النسبة}} / {{المعدل}}
      if (norm.includes('نهائي') || norm.includes('علام') || norm.includes('درج') || norm.includes('نسب') || norm.includes('معدل') || norm.includes('grade') || norm.includes('score') || norm.includes('percent') || norm.includes('نتيج')) return sFinal;

      return '';
    }

    let result = String(text);

    // 1. Double Braces: {{ key }}
    result = result.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 2. Square Brackets: [ key ]
    result = result.replace(/\[\s*([^\[\]]+?)\s*\]/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 3. Single Braces: { key }
    result = result.replace(/\{([^{}]+?)\}/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 4. Arabic Quotes: « key » or » key «
    result = result.replace(/[«»]\s*([^«»]+?)\s*[«»]/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 5. Chevron Tag: << key >>
    result = result.replace(/<<\s*([^<>]+?)\s*>>/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 6. Mention @key
    result = result.replace(/@([\u0600-\u06FFa-zA-Z0-9_]+)/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 7. Percent %key%
    result = result.replace(/%([\u0600-\u06FFa-zA-Z0-9_]+)%/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    // 8. Dollar $key
    result = result.replace(/\$([\u0600-\u06FFa-zA-Z0-9_]+)/g, (match, p1) => {
      const val = resolveKey(p1);
      return val !== '' ? val : match;
    });

    return result;
  }

  // --- Text Editor & Smart Variables Modal Setup ---
  function setupTextEditModal() {
    const modal = document.getElementById('textEditModal');
    const closeBtn = document.getElementById('closeTextEditModalBtn');
    const cancelBtn = document.getElementById('cancelQuickEditTextBtn');
    const saveBtn = document.getElementById('saveQuickEditTextBtn');
    const textarea = document.getElementById('quickEditTextInput');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeQuickTextEditor);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeQuickTextEditor);
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', saveQuickEditText);
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeQuickTextEditor();
        }
      });
    }

    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          saveQuickEditText();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeQuickTextEditor();
        }
      });
    }

    // Quick insert buttons in textEditModal
    const modalChips = document.querySelectorAll('#modalMentionsChips .mini-mention-pill');
    modalChips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = chip.getAttribute('data-insert');
        const input = document.getElementById('quickEditTextInput');
        if (input && tag) {
          insertTagIntoTextarea(input, tag);
          showToast(`تم إدراج ${tag}`);
        }
      });
    });
  }

  function closeQuickTextEditor() {
    const modal = document.getElementById('textEditModal');
    if (modal) modal.style.display = 'none';
  }

  function insertTagIntoTextarea(textarea, tag) {
    if (!textarea) return;
    const start = textarea.selectionStart !== undefined ? textarea.selectionStart : textarea.value.length;
    const end = textarea.selectionEnd !== undefined ? textarea.selectionEnd : start;
    const val = textarea.value;

    const before = val.substring(0, start);
    const after = val.substring(end);

    const needLeadingSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const needTrailingSpace = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');

    const insertStr = (needLeadingSpace ? ' ' : '') + tag + (needTrailingSpace ? ' ' : '');
    textarea.value = before + insertStr + after;

    const newPos = start + insertStr.length;
    textarea.focus();
    textarea.setSelectionRange(newPos, newPos);
  }

  // --- Unified Element Inspector & Typography Setup ---
  function setupTypographyAndFonts() {
    // 1. Direct Inline Text Editor
    const directTextarea = document.getElementById('panelDirectTextarea');
    if (directTextarea) {
      directTextarea.addEventListener('input', (e) => {
        const key = state.activeElementKey;
        const elem = state.elements[key];
        if (!elem) return;
        elem.text = e.target.value;
        if (key === 'cert_title') state.title = e.target.value;
        if (key === 'body_text') state.bodyText = e.target.value;
        scheduleCanvasDraw();
        syncHandlePosition(key);
      });

      directTextarea.addEventListener('change', () => {
        pushHistoryState('تعديل النص');
        renderCertificate();
      });
    }

    // 2. Direct Variable Chips in Inspector
    const inspectorChips = document.querySelectorAll('#panelVariablesScroll .mini-mention-pill');
    inspectorChips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = chip.getAttribute('data-insert');
        if (!tag) return;

        const key = state.activeElementKey;
        const elem = key ? state.elements[key] : null;

        // If no element is selected or active element is an image, add a new text element with this tag
        if (!elem || elem.type === 'image') {
          addCustomText(tag, { openEditor: false });
          return;
        }

        const input = document.getElementById('panelDirectTextarea');
        if (input) {
          insertTagIntoTextarea(input, tag);
          elem.text = input.value;
          if (key === 'cert_title') state.title = input.value;
          if (key === 'body_text') state.bodyText = input.value;
          pushHistoryState('إدراج نص');
          renderCertificate();
          showToast(`تم إدراج ${tag}`);
        }
      });
    });

    // 3. Deselect Element Button
    const deselectBtn = document.getElementById('deselectElemBtn');
    if (deselectBtn) {
      deselectBtn.addEventListener('click', () => {
        state.activeElementKey = null;
        highlightActiveHandle();
        renderElementSelectorAndLayers();
        updateTypographyPanelActiveElement();
      });
    }

    // 4. Modal Text Editor Button (if user wants popup)
    const panelEditTextBtn = document.getElementById('panelEditTextBtn');
    if (panelEditTextBtn) {
      panelEditTextBtn.addEventListener('click', () => {
        openQuickTextEditor(state.activeElementKey || 'student_name');
      });
    }

    // 5. Add Text & Add Image
    const panelAddTextBtn = document.getElementById('panelAddTextBtn');
    if (panelAddTextBtn) {
      panelAddTextBtn.addEventListener('click', () => {
        addCustomText('{{اسم_الطالب}}', { openEditor: false });
      });
    }

    const panelAddTextQuickBtn = document.getElementById('panelAddTextQuickBtn');
    if (panelAddTextQuickBtn) {
      panelAddTextQuickBtn.addEventListener('click', () => {
        addCustomText('{{اسم_الطالب}}', { openEditor: false });
      });
    }

    const panelAddImageBtn = document.getElementById('panelAddImageBtn');
    const customStickerInput = document.getElementById('customStickerInput');
    if (panelAddImageBtn && customStickerInput) {
      panelAddImageBtn.addEventListener('click', () => {
        customStickerInput.click();
      });
    }

    // 6. Action Buttons
    const panelCenterElemBtn = document.getElementById('panelCenterElemBtn');
    if (panelCenterElemBtn) {
      panelCenterElemBtn.addEventListener('click', centerActiveElement);
    }

    const panelDuplicateElemBtn = document.getElementById('panelDuplicateElemBtn');
    if (panelDuplicateElemBtn) {
      panelDuplicateElemBtn.addEventListener('click', duplicateActiveElement);
    }

    const panelDeleteElemBtn = document.getElementById('panelDeleteElemBtn');
    if (panelDeleteElemBtn) {
      panelDeleteElemBtn.addEventListener('click', deleteOrHideActiveElement);
    }

    if (resetElemPosBtn) {
      resetElemPosBtn.addEventListener('click', resetActiveElementToDefault);
    }

    // 7. Bold, Layer Order, Opacity, Rotation Controls
    const btnToggleBold = document.getElementById('btnToggleBold');
    if (btnToggleBold) {
      btnToggleBold.addEventListener('click', () => {
        const key = state.activeElementKey;
        if (!key || !state.elements[key]) return;
        state.elements[key].isBold = !state.elements[key].isBold;
        updateTypographyPanelActiveElement();
        renderCertificate();
        pushHistoryState('تبديل سماكة الخط');
      });
    }

    const btnLayerUp = document.getElementById('btnLayerUp');
    if (btnLayerUp) {
      btnLayerUp.addEventListener('click', () => moveActiveElementLayer(1));
    }

    const btnLayerDown = document.getElementById('btnLayerDown');
    if (btnLayerDown) {
      btnLayerDown.addEventListener('click', () => moveActiveElementLayer(-1));
    }

    const sliderOpacity = document.getElementById('sliderOpacity');
    const valOpacityDisplay = document.getElementById('valOpacityDisplay');
    if (sliderOpacity) {
      sliderOpacity.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10);
        const key = state.activeElementKey;
        if (key && state.elements[key]) {
          state.elements[key].opacity = Math.max(0.1, Math.min(1, pct / 100));
          if (valOpacityDisplay) valOpacityDisplay.textContent = `${pct}%`;
          scheduleCanvasDraw();
        }
      });
      sliderOpacity.addEventListener('change', () => pushHistoryState('تعديل الشفافية'));
    }

    const sliderRotation = document.getElementById('sliderRotation');
    const valRotationDisplay = document.getElementById('valRotationDisplay');
    if (sliderRotation) {
      sliderRotation.addEventListener('input', (e) => {
        const deg = parseInt(e.target.value, 10) || 0;
        const key = state.activeElementKey;
        if (key && state.elements[key]) {
          state.elements[key].rotation = deg;
          if (valRotationDisplay) valRotationDisplay.textContent = `${deg}°`;
          syncHandlePosition(key);
          scheduleCanvasDraw();
        }
      });
      sliderRotation.addEventListener('change', () => pushHistoryState('تعديل الدوران'));
    }

    // 8. Per-Element Font Selector & Upload
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    if (fontFamilySelect) {
      fontFamilySelect.addEventListener('change', (e) => {
        const chosenFont = e.target.value;
        state.fontFamily = chosenFont;
        if (state.activeElementKey && state.elements[state.activeElementKey]) {
          state.elements[state.activeElementKey].fontFamily = chosenFont;
        }
        pushHistoryState('تغيير الخط');
        renderCertificate();
      });
    }

    const customFontInput = document.getElementById('customFontInput');
    if (customFontInput) {
      customFontInput.addEventListener('change', handleCustomFontUpload);
    }

    // 9. Colors & Pipette
    const colorDots = document.querySelectorAll('.color-dot');
    const customColorPicker = document.getElementById('customColorPicker');

    colorDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        colorDots.forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
        const color = dot.getAttribute('data-color');
        applyTextColor(color);
      });
    });

    if (customColorPicker) {
      customColorPicker.addEventListener('input', (e) => {
        applyTextColor(e.target.value, false);
      });
      customColorPicker.addEventListener('change', () => {
        pushHistoryState('تغيير اللون');
      });
    }

    // 10. Position & Size Sliders
    if (sliderX) {
      sliderX.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (state.activeElementKey && state.elements[state.activeElementKey]) {
          state.elements[state.activeElementKey].x = val;
          if (valXDisplay) valXDisplay.textContent = `${val}%`;
          syncHandlePosition(state.activeElementKey);
          scheduleCanvasDraw();
        }
      });
      sliderX.addEventListener('change', () => pushHistoryState('تعديل موضع X'));
    }

    if (sliderY) {
      sliderY.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (state.activeElementKey && state.elements[state.activeElementKey]) {
          state.elements[state.activeElementKey].y = val;
          if (valYDisplay) valYDisplay.textContent = `${val}%`;
          syncHandlePosition(state.activeElementKey);
          scheduleCanvasDraw();
        }
      });
      sliderY.addEventListener('change', () => pushHistoryState('تعديل موضع Y'));
    }

    if (sliderSize) {
      sliderSize.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (state.activeElementKey && state.elements[state.activeElementKey]) {
          state.elements[state.activeElementKey].size = val;
          if (valSizeDisplay) valSizeDisplay.textContent = `${val}px`;
          syncHandlePosition(state.activeElementKey);
          scheduleCanvasDraw();
        }
      });
      sliderSize.addEventListener('change', () => {
        pushHistoryState('تعديل الحجم');
        renderCertificate();
      });
    }

    const alignBtns = document.querySelectorAll('.seg-btn[data-align]');
    alignBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        alignBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const align = btn.getAttribute('data-align');
        if (state.activeElementKey && state.elements[state.activeElementKey]) {
          state.elements[state.activeElementKey].align = align;
          pushHistoryState('تغيير المحاذاة');
          renderCertificate();
        }
      });
    });

    renderElementSelectorAndLayers();
    updateTypographyPanelActiveElement();
  }

  function getElementLabel(key, elem) {
    const labels = {
      student_name: 'اسم الطالب',
      cert_title: 'عنوان الشهادة',
      grade_badge: 'العلامة والتقدير',
      body_text: 'نص التكريم',
      circle_info: 'بيانات الحلقة',
      teacher_info: 'بيانات المعلم',
      school_stamp: 'الختم والاعتماد'
    };
    if (labels[key]) return labels[key];
    if (elem && elem.isCustom) {
      if (elem.type === 'text') {
        const t = (elem.text || '').trim();
        return t ? (t.length > 18 ? t.substring(0, 16) + '...' : t) : 'نص إضافي';
      }
      return 'صورة / ملصق';
    }
    return key;
  }

  function getSortedElementKeys() {
    return Object.keys(state.elements).sort((a, b) => {
      const za = state.elements[a]?.zIndex ?? 50;
      const zb = state.elements[b]?.zIndex ?? 50;
      return za - zb;
    });
  }

  function renderElementSelectorAndLayers() {
    const pillsWrap = document.getElementById('panelElementSelectorPills');
    const layersWrap = document.getElementById('layersListContainer');
    const keys = getSortedElementKeys();

    if (pillsWrap) {
      pillsWrap.innerHTML = '';
      keys.forEach((k) => {
        const el = state.elements[k];
        if (!el) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'elem-pill-btn' + (state.activeElementKey === k ? ' active' : '') + (el.visible === false ? ' is-hidden-elem' : '');
        btn.setAttribute('data-element', k);
        btn.textContent = getElementLabel(k, el);
        btn.addEventListener('click', () => {
          el.visible = true;
          state.activeElementKey = k;
          buildDragOverlayHandles();
          highlightActiveHandle();
          renderElementSelectorAndLayers();
          updateTypographyPanelActiveElement();
          renderCertificate();
        });
        pillsWrap.appendChild(btn);
      });
    }

    if (layersWrap) {
      layersWrap.innerHTML = '';
      // Show top layers first in layer stack
      [...keys].reverse().forEach((k) => {
        const el = state.elements[k];
        if (!el) return;
        const row = document.createElement('div');
        row.className = 'layer-row' + (state.activeElementKey === k ? ' active' : '') + (el.visible === false ? ' is-hidden' : '');

        const nameBtn = document.createElement('button');
        nameBtn.type = 'button';
        nameBtn.className = 'layer-name-btn';
        nameBtn.textContent = getElementLabel(k, el);
        nameBtn.addEventListener('click', () => {
          state.activeElementKey = k;
          highlightActiveHandle();
          renderElementSelectorAndLayers();
          updateTypographyPanelActiveElement();
        });

        const visBtn = document.createElement('button');
        visBtn.type = 'button';
        visBtn.className = 'layer-vis-btn' + (el.visible !== false ? ' visible' : '');
        visBtn.title = el.visible !== false ? 'إخفاء العنصر' : 'إظهار العنصر';
        visBtn.innerHTML = el.visible !== false
          ? '<i data-lucide="eye" style="width:14px;height:14px;"></i>'
          : '<i data-lucide="eye-off" style="width:14px;height:14px;"></i>';
        visBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          el.visible = el.visible === false;
          if (k === 'school_stamp') {
            state.showOfficialStamp = el.visible;
            syncStudioControlsUI();
          }
          if (el.visible) state.activeElementKey = k;
          buildDragOverlayHandles();
          renderElementSelectorAndLayers();
          updateTypographyPanelActiveElement();
          renderCertificate();
          pushHistoryState('تبديل ظهور العنصر');
        });

        row.appendChild(nameBtn);
        row.appendChild(visBtn);
        layersWrap.appendChild(row);
      });
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  function moveActiveElementLayer(direction) {
    const key = state.activeElementKey;
    if (!key || !state.elements[key]) return;
    const sorted = getSortedElementKeys();
    const idx = sorted.indexOf(key);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) {
      showToast(direction > 0 ? 'العنصر في أعلى طبقة بالفعل' : 'العنصر في أسفل طبقة بالفعل');
      return;
    }
    const swapKey = sorted[targetIdx];
    const tmp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = tmp;
    sorted.forEach((k, i) => {
      if (state.elements[k]) state.elements[k].zIndex = (i + 1) * 10;
    });
    renderElementSelectorAndLayers();
    renderCertificate();
    pushHistoryState('تغيير ترتيب الطبقات');
  }

  function updateTypographyPanelActiveElement() {
    const key = state.activeElementKey;
    const elem = key ? state.elements[key] : null;
    const badge = document.getElementById('panelActiveElemBadge');
    const directTextarea = document.getElementById('panelDirectTextarea');
    const textControls = document.getElementById('inspectorTextControls');
    const typoSection = document.getElementById('inspectorTypographySection');
    const activeContainer = document.getElementById('inspectorActiveContainer');
    const noSelectionContainer = document.getElementById('inspectorNoSelectionContainer');
    const placementSection = document.getElementById('inspectorPlacementSection');

    if (!key || !elem) {
      if (activeContainer) activeContainer.style.display = 'none';
      if (typoSection) typoSection.style.display = 'none';
      if (placementSection) placementSection.style.display = 'none';
      if (noSelectionContainer) noSelectionContainer.style.display = 'block';
      if (badge) badge.textContent = 'إعدادات النص';
      if (directTextarea) {
        directTextarea.value = '';
        directTextarea.placeholder = 'انقر على أي نص في الشهادة لتعديل خياراته...';
      }
      return;
    }

    if (activeContainer) activeContainer.style.display = 'block';
    if (typoSection) typoSection.style.display = 'block';
    if (placementSection) placementSection.style.display = 'block';
    if (noSelectionContainer) noSelectionContainer.style.display = 'none';

    if (directTextarea) directTextarea.disabled = false;
    if (textControls) textControls.style.opacity = '1';

    if (badge) {
      badge.textContent = getElementLabel(key, elem);
    }

    // Update pills/layers active state
    document.querySelectorAll('#panelElementSelectorPills .elem-pill-btn').forEach((pill) => {
      pill.classList.toggle('active', pill.getAttribute('data-element') === key);
    });
    document.querySelectorAll('#layersListContainer .layer-row').forEach((row, idx) => {
      // active state already managed by renderElementSelectorAndLayers when selection changes
    });

    // Populate direct textarea
    if (directTextarea) {
      let raw = '';
      if (elem.isCustom && elem.type === 'text') raw = elem.text || '';
      else if (key === 'student_name') raw = elem.text !== undefined ? elem.text : '{{اسم_الطالب}}';
      else if (key === 'cert_title') raw = elem.text !== undefined ? elem.text : (state.title || 'شَهَادَةُ شُكْرٍ وَتَقْدِير');
      else if (key === 'body_text') raw = elem.text !== undefined ? elem.text : (state.bodyText || '');
      else if (key === 'grade_badge') raw = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
      else if (key === 'circle_info') raw = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
      else if (key === 'teacher_info') raw = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
      else raw = elem.text || '';

      directTextarea.value = raw;
    }

    // Toggle text controls visibility if element is image or stamp
    const isText = (!elem.type || elem.type === 'text') && key !== 'school_stamp';
    if (textControls) {
      textControls.style.display = isText ? 'block' : 'none';
    }

    // Update sliders
    if (sliderX) {
      sliderX.value = elem.x;
      if (valXDisplay) valXDisplay.textContent = `${elem.x}%`;
    }
    if (sliderY) {
      sliderY.value = elem.y;
      if (valYDisplay) valYDisplay.textContent = `${elem.y}%`;
    }
    if (sliderSize) {
      sliderSize.value = elem.size || 60;
      if (valSizeDisplay) valSizeDisplay.textContent = `${elem.size || 60}px`;
    }

    const sliderOpacity = document.getElementById('sliderOpacity');
    const valOpacityDisplay = document.getElementById('valOpacityDisplay');
    const opPct = Math.round((elem.opacity !== undefined ? elem.opacity : 1) * 100);
    if (sliderOpacity) sliderOpacity.value = opPct;
    if (valOpacityDisplay) valOpacityDisplay.textContent = `${opPct}%`;

    const sliderRotation = document.getElementById('sliderRotation');
    const valRotationDisplay = document.getElementById('valRotationDisplay');
    const rotDeg = elem.rotation || 0;
    if (sliderRotation) sliderRotation.value = rotDeg;
    if (valRotationDisplay) valRotationDisplay.textContent = `${rotDeg}°`;

    const btnToggleBold = document.getElementById('btnToggleBold');
    if (btnToggleBold) {
      btnToggleBold.classList.toggle('active', Boolean(elem.isBold));
    }

    // Alignment buttons
    document.querySelectorAll('.seg-btn[data-align]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-align') === (elem.align || 'center'));
    });

    // Font Family dropdown
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const activeFont = elem.fontFamily || state.fontFamily || 'Amiri';
    if (fontFamilySelect) {
      if (![...fontFamilySelect.options].some((o) => o.value === activeFont)) {
        const opt = document.createElement('option');
        opt.value = activeFont;
        opt.textContent = activeFont;
        fontFamilySelect.appendChild(opt);
      }
      fontFamilySelect.value = activeFont;
    }

    // Color picker
    if (elem.color) {
      const customColorPicker = document.getElementById('customColorPicker');
      if (customColorPicker && elem.color.startsWith('#') && elem.color.length === 7) {
        customColorPicker.value = elem.color;
      }
      document.querySelectorAll('.color-dot').forEach((dot) => {
        dot.classList.toggle('active', dot.getAttribute('data-color') === elem.color);
      });
    }
  }

  function applyTextColor(color, recordHistory = true) {
    if (!color) return;
    state.primaryColor = color;

    let targetKey = state.activeElementKey;
    if (!targetKey || !state.elements[targetKey]) {
      const keys = Object.keys(state.elements);
      const visibleTextKey = keys.find(k => state.elements[k] && state.elements[k].visible !== false && state.elements[k].type !== 'image');
      targetKey = visibleTextKey || 'student_name';
      state.activeElementKey = targetKey;
      highlightActiveHandle();
    }

    if (state.elements[targetKey]) {
      state.elements[targetKey].color = color;
      if (recordHistory) pushHistoryState('تغيير اللون');
    }

    const customColorPicker = document.getElementById('customColorPicker');
    if (customColorPicker && color.startsWith('#') && color.length === 7) {
      customColorPicker.value = color;
    }

    document.querySelectorAll('.color-dot').forEach((dot) => {
      dot.classList.toggle('active', dot.getAttribute('data-color') === color);
    });

    drawCertificateCanvas();
    scheduleCanvasDraw();
    saveDraftToStorage();
  }

  async function handleCustomFontUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fontName = 'CustomFont_' + Date.now().toString(36);
    try {
      showToast('جاري تثبيت وتفعيل الخط على الشهادة...');
      const arrayBuffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      state.fontFamily = fontName;
      if (state.activeElementKey && state.elements[state.activeElementKey]) {
        state.elements[state.activeElementKey].fontFamily = fontName;
      }
      state.customFonts.push({ name: fontName, label: file.name.replace(/\.[^/.]+$/, '') });

      const container = document.getElementById('loadedCustomFontsList');
      if (container) {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'preset-chip';
        pill.textContent = 'خط: ' + file.name.substring(0, 14);
        pill.style.fontFamily = fontName;
        pill.onclick = () => {
          state.fontFamily = fontName;
          if (state.activeElementKey && state.elements[state.activeElementKey]) {
            state.elements[state.activeElementKey].fontFamily = fontName;
          }
          pushHistoryState('تغيير الخط المخصص');
          updateTypographyPanelActiveElement();
          renderCertificate();
        };
        container.appendChild(pill);
      }

      pushHistoryState('رفع خط مخصص');
      updateTypographyPanelActiveElement();
      renderCertificate();
      showToast('تم تحميل الخط بنجاح وتطبيقه على الشهادة!');
    } catch (err) {
      console.error('Error loading custom font:', err);
      showToast('تعذر تحميل الخط، يرجى التأكد من اختيار ملف .ttf أو .otf صالح');
    }
  }

  // --- Element Positioning & Coordinate Sliders ---
  function setupPositioningSliders() {
    // Sliders are fully bound inside setupTypographyAndFonts above for the unified inspector!
  }

  function updateSliderValuesFromActiveElement() {
    updateTypographyPanelActiveElement();
  }

  function resetActiveElementToDefault() {
    const defaults = createDefaultElements();
    if (defaults[state.activeElementKey]) {
      Object.assign(state.elements[state.activeElementKey], defaults[state.activeElementKey]);
      updateTypographyPanelActiveElement();
      renderElementSelectorAndLayers();
      syncHandlePosition(state.activeElementKey);
      renderCertificate();
      pushHistoryState('إعادة ضبط موضع العنصر');
      showToast('تمت إعادة موضع العنصر للافتراضي');
    }
  }

  const HIJRI_MONTHS_LIST = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];

  function populateFilterDropdowns(circles, months, years, currentYear) {
    const circleSelect = document.getElementById('circleSelect');
    if (circleSelect) {
      const prevVal = state.selectedCircleId || 'all';
      circleSelect.innerHTML = '<option value="all">كل الحلقات القرآنية</option>';
      (circles || []).forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        circleSelect.appendChild(opt);
      });
      if ([...circleSelect.options].some((o) => String(o.value) === String(prevVal))) {
        circleSelect.value = prevVal;
      }
    }

    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
      const mList = (months && months.length) ? months : HIJRI_MONTHS_LIST;
      monthSelect.innerHTML = '<option value="all">كل الشهور</option>';
      mList.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        monthSelect.appendChild(opt);
      });
    }

    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
      let curYear = currentYear || '';
      if (!curYear && window.HijriDate && typeof window.HijriDate.getCurrentHijriYear === 'function') {
        curYear = String(window.HijriDate.getCurrentHijriYear());
      }
      if (!curYear) curYear = '1447';
      const yNum = parseInt(String(curYear).replace(/[^0-9]/g, ''), 10) || 1447;
      const yList = (years && years.length) ? years : [String(yNum - 1), String(yNum), String(yNum + 1)];
      yearSelect.innerHTML = '<option value="all">كل الأعوام</option>';
      yList.forEach((y) => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (String(y) === String(curYear)) opt.selected = true;
        yearSelect.appendChild(opt);
      });
    }
  }

  // --- Filtering & Student Data API (Server + Firebase + Offline LocalDB) ---
  async function fetchFilterOptions() {
    if (!window.IS_CAPACITOR_APP) {
      try {
        const res = await fetch('/api/certificates/options');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.circles)) {
            state.circles = data.circles;
            populateFilterDropdowns(state.circles, data.months, data.years, data.current_year);
            return;
          }
        }
      } catch (err) {
        console.warn('Server certificate options unavailable, falling back to Cloud/LocalDB');
      }
    }

    // Cloud Firebase -> Local IndexedDB fallback
    let loadedCircles = [];
    if (window.CirclesService && typeof window.CirclesService.fetchCircles === 'function') {
      try {
        const res = await window.CirclesService.fetchCircles();
        if (res && Array.isArray(res.circles) && res.circles.length > 0) {
          loadedCircles = res.circles;
        }
      } catch (e) {}
    }

    if (loadedCircles.length === 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === 'function') {
      try {
        const localCircles = await window.AlbayanLocalDB.getLocalCircles();
        if (Array.isArray(localCircles) && localCircles.length > 0) {
          loadedCircles = localCircles;
        }
      } catch (e) {}
    }

    state.circles = loadedCircles;
    populateFilterDropdowns(state.circles, HIJRI_MONTHS_LIST, null, null);
  }

  function applyStudentSearchAndRefreshUI() {
    const query = (state.studentSearchQuery || '').trim().toLowerCase();
    const baseList = Array.isArray(state.allFilteredStudents) ? state.allFilteredStudents : [];
    const matched = query
      ? baseList.filter((s) => {
          const name = String(s.name || '').toLowerCase();
          const circle = String(s.circle_name || '').toLowerCase();
          const code = String(s.student_code || '').toLowerCase();
          return name.includes(query) || circle.includes(query) || code.includes(query);
        })
      : baseList;

    if (matched.length > 0) {
      state.students = matched;
    } else if (query) {
      state.students = [];
    } else {
      state.students = [{
        id: 0,
        name: 'عبد الله بن محمد الأهدل',
        circle_name: 'حلقة الإمام عاصم بن أبي النجود',
        teacher_name: 'الشيخ عبد الرحمن',
        grade_badge: '98%',
        grade_label: 'ممتاز مرتفع',
        sard_pages: 45,
        attendance_rate: 100,
        exam_percent: 98,
        achievement_text: 'إتمام سرد وتسميع 45 وجهاً من القرآن الكريم بإتقان وتفوق'
      }];
    }

    state.currentStudentIndex = 0;

    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect) {
      const prevSelected = state.selectedStudentId;
      studentSelect.innerHTML = '<option value="">اختر طالباً...</option>';
      state.students.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name + (s.circle_name ? ` — ${s.circle_name}` : '');
        studentSelect.appendChild(opt);
      });
      if (prevSelected && [...studentSelect.options].some((o) => String(o.value) === String(prevSelected))) {
        studentSelect.value = prevSelected;
        const foundIdx = state.students.findIndex((s) => String(s.id) === String(prevSelected));
        if (foundIdx >= 0) state.currentStudentIndex = foundIdx;
      }
    }

    renderStudentsPillPreview();
    updateStudentPager();
    renderCertificate();
  }

  function setupFilterListeners() {
    const modeIconBtns = document.querySelectorAll('#filterModeIcons .mode-icon-btn');
    const modeSelectedLabel = document.getElementById('modeSelectedLabel');
    const circleSelectRow = document.getElementById('circleSelectRow');
    const singleStudentSelectRow = document.getElementById('singleStudentSelectRow');
    const achieversSubpanel = document.getElementById('achieversSubpanel');

    const modeLabels = {
      all: 'جميع الطلاب',
      circle: 'حلقة قرآنية محددة',
      single: 'طالب واحد فقط',
      top_achievers: 'الطلاب المتفوقين والمميزين'
    };

    modeIconBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeIconBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.filterMode = btn.getAttribute('data-mode');

        if (modeSelectedLabel) {
          modeSelectedLabel.textContent = modeLabels[state.filterMode] || '';
        }

        if (state.filterMode === 'circle') {
          if (circleSelectRow) circleSelectRow.style.display = 'block';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'none';
          if (achieversSubpanel) achieversSubpanel.style.display = 'none';
        } else if (state.filterMode === 'single') {
          if (circleSelectRow) circleSelectRow.style.display = 'block';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'block';
          if (achieversSubpanel) achieversSubpanel.style.display = 'none';
        } else if (state.filterMode === 'top_achievers') {
          if (circleSelectRow) circleSelectRow.style.display = 'block';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'none';
          if (achieversSubpanel) achieversSubpanel.style.display = 'block';
        } else {
          // all
          state.selectedCircleId = 'all';
          const circleSelectEl = document.getElementById('circleSelect');
          if (circleSelectEl) circleSelectEl.value = 'all';
          if (circleSelectRow) circleSelectRow.style.display = 'none';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'none';
          if (achieversSubpanel) achieversSubpanel.style.display = 'none';
        }

        fetchStudentsList();
      });
    });

    const circleSelect = document.getElementById('circleSelect');
    if (circleSelect) {
      circleSelect.addEventListener('change', (e) => {
        state.selectedCircleId = e.target.value;
        fetchStudentsList();
      });
    }

    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect) {
      studentSelect.addEventListener('change', (e) => {
        state.selectedStudentId = e.target.value;
        const idx = state.students.findIndex((s) => String(s.id) === String(state.selectedStudentId));
        if (idx !== -1) {
          state.currentStudentIndex = idx;
          renderStudentsPillPreview();
          updateStudentPager();
          renderCertificate();
        }
      });
    }

    const studentSearchInput = document.getElementById('studentSearchInput');
    if (studentSearchInput) {
      studentSearchInput.addEventListener('input', (e) => {
        state.studentSearchQuery = e.target.value || '';
        applyStudentSearchAndRefreshUI();
      });
    }

    document.querySelectorAll('input[name="achieverCriteria"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        state.achieverCriteria = e.target.value;
        document.querySelectorAll('.criteria-card').forEach((card) => {
          card.classList.toggle('active', card.contains(radio));
        });
        fetchStudentsList();
      });
    });

    const timeframeSelect = document.getElementById('timeframeSelect');
    if (timeframeSelect) {
      timeframeSelect.addEventListener('change', (e) => {
        state.timeframe = e.target.value;
        fetchStudentsList();
      });
    }

    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const limitSelect = document.getElementById('limitSelect');

    if (monthSelect) monthSelect.addEventListener('change', (e) => { state.selectedMonth = e.target.value; fetchStudentsList(); });
    if (yearSelect) yearSelect.addEventListener('change', (e) => { state.selectedYear = e.target.value; fetchStudentsList(); });
    if (limitSelect) limitSelect.addEventListener('change', (e) => { state.limit = parseInt(e.target.value, 10) || 20; fetchStudentsList(); });

    const refreshStudentsBtn = document.getElementById('refreshStudentsBtn');
    if (refreshStudentsBtn) {
      refreshStudentsBtn.addEventListener('click', async () => {
        await fetchFilterOptions();
        await fetchStudentsList();
        showToast('تم تحديث قائمة الطلاب والبيانات');
      });
    }

    if (prevStudentBtn) {
      prevStudentBtn.addEventListener('click', () => {
        if (state.currentStudentIndex > 0) {
          state.currentStudentIndex--;
          updateStudentPager();
          renderStudentsPillPreview();
          renderCertificate();
        }
      });
    }

    if (nextStudentBtn) {
      nextStudentBtn.addEventListener('click', () => {
        if (state.currentStudentIndex < state.students.length - 1) {
          state.currentStudentIndex++;
          updateStudentPager();
          renderStudentsPillPreview();
          renderCertificate();
        }
      });
    }
  }

  async function loadStudentsOfflineOrCloud() {
    const circleMap = new Map();
    (state.circles || []).forEach((c) => {
      const cid = window.AlbayanDataNormalizer
        ? String(window.AlbayanDataNormalizer.normalizeCircleId(c.id))
        : String(c.id);
      circleMap.set(cid, c);
    });

    let rawStudents = [];
    let allRecords = [];
    let allResults = [];

    // 1. Try Firebase cloud via AlbayanFirebaseDAL for complete multi-circle + records view
    if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
      try {
        const [stuRes, recRes, resRes] = await Promise.all([
          window.AlbayanFirebaseDAL.get('students'),
          window.AlbayanFirebaseDAL.get('student_records'),
          window.AlbayanFirebaseDAL.get('results')
        ]);

        if (stuRes && stuRes.ok && stuRes.data && window.AlbayanDataNormalizer) {
          rawStudents = window.AlbayanDataNormalizer.resolveStudents(stuRes.data).students || [];
        }
        if (recRes && recRes.ok && recRes.data && window.AlbayanDataNormalizer) {
          allRecords = window.AlbayanDataNormalizer.normalizeCollectionEntries(recRes.data).map(([, r]) => r).filter(Boolean);
        }
        if (resRes && resRes.ok && resRes.data && window.AlbayanDataNormalizer) {
          allResults = window.AlbayanDataNormalizer.normalizeCollectionEntries(resRes.data).map(([, r]) => r).filter(Boolean);
        }
      } catch (e) {}
    }

    // 2. Fallback to IndexedDB (AlbayanLocalDB) across all circles or selected circle
    if (rawStudents.length === 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalStudents === 'function') {
      try {
        const targetCircles = state.selectedCircleId !== 'all'
          ? [{ id: state.selectedCircleId }]
          : (state.circles && state.circles.length ? state.circles : []);

        for (const c of targetCircles) {
          const list = await window.AlbayanLocalDB.getLocalStudents(c.id);
          if (Array.isArray(list)) {
            rawStudents.push(...list.map((s) => ({ ...s, circle_id: s.circle_id || c.id })));
          }
        }
      } catch (e) {}
    }

    if (rawStudents.length === 0) return [];

    // Filter by circle if selected
    const wantCircleId = state.selectedCircleId !== 'all'
      ? (window.AlbayanDataNormalizer ? String(window.AlbayanDataNormalizer.normalizeCircleId(state.selectedCircleId)) : String(state.selectedCircleId))
      : null;

    const normalizedStudents = [];
    const seenIds = new Set();

    for (const s of rawStudents) {
      if (!s || s.deleted) continue;
      const sid = window.AlbayanDataNormalizer ? String(window.AlbayanDataNormalizer.normalizeStudentId(s.id || s.student_id)) : String(s.id || '');
      if (!sid || seenIds.has(sid)) continue;
      const cid = window.AlbayanDataNormalizer ? String(window.AlbayanDataNormalizer.normalizeCircleId(s.circle_id)) : String(s.circle_id || '');
      if (wantCircleId && cid !== wantCircleId) continue;
      seenIds.add(sid);

      const circleObj = circleMap.get(cid) || {};

      // Aggregate matching records for student
      const stuRecords = allRecords.filter((r) => {
        const rSid = window.AlbayanDataNormalizer ? String(window.AlbayanDataNormalizer.normalizeStudentId(r.student_id)) : String(r.student_id || '');
        if (rSid !== sid) return false;
        if (state.filterMode === 'top_achievers' && state.selectedMonth !== 'all' && window.AlbayanDataNormalizer) {
          return window.AlbayanDataNormalizer.isSameMonth(r.month, state.selectedMonth);
        }
        return true;
      });

      const sardTotal = stuRecords.reduce((acc, r) => acc + (Number(r.sard_pages) || Number(r.pages) || 0), 0);
      const latestRec = stuRecords[stuRecords.length - 1] || {};

      // Aggregate exam results
      const stuResults = allResults.filter((res) => {
        const rSid = window.AlbayanDataNormalizer ? String(window.AlbayanDataNormalizer.normalizeStudentId(res.student_id)) : String(res.student_id || '');
        return rSid === sid;
      });

      let examAvg = null;
      if (stuResults.length > 0) {
        const sumPct = stuResults.reduce((acc, res) => {
          const pct = res.percentage !== undefined ? Number(res.percentage) : (res.score !== undefined && res.total ? (Number(res.score) / Number(res.total)) * 100 : 0);
          return acc + (Number.isNaN(pct) ? 0 : pct);
        }, 0);
        examAvg = Math.round(sumPct / stuResults.length);
      } else if (s.percentage !== undefined && s.percentage !== null && s.percentage !== '') {
        examAvg = Math.round(Number(s.percentage));
      } else if (latestRec.exam_score !== undefined && latestRec.exam_score !== '') {
        examAvg = Math.round(Number(latestRec.exam_score));
      }

      const attRate = s.attendance_rate !== undefined
        ? Number(s.attendance_rate)
        : (latestRec.attendance_days !== undefined ? Math.min(100, Math.round((Number(latestRec.attendance_days) / 20) * 100)) : 100);

      const sardVal = sardTotal || Number(s.sard_pages) || 0;
      const memoVal = latestRec.memo_grade || s.memo_grade || 'ممتاز';

      normalizedStudents.push({
        id: s.id || sid,
        student_code: s.student_code || `STD-${String(sid).padStart(4, '0')}`,
        name: s.name || s.student_name || 'طالب البيان',
        circle_id: cid,
        circle_name: s.circle_name || circleObj.name || 'حلقة القرآن الكريم',
        teacher_name: s.teacher_name || circleObj.teacher_name || 'معلم الحلقة',
        exam_percent: examAvg !== null ? examAvg : '',
        grade_badge: examAvg !== null ? `${examAvg}%` : (sardVal > 0 ? `${sardVal} وجهاً` : 'مشارك'),
        grade_label: examAvg !== null
          ? (examAvg >= 95 ? 'ممتاز مرتفع' : examAvg >= 90 ? 'ممتاز' : examAvg >= 80 ? 'جيد جداً' : 'جيد')
          : memoVal,
        rating: s.rating || (examAvg !== null ? (examAvg >= 95 ? 'ممتاز مرتفع' : examAvg >= 90 ? 'ممتاز' : examAvg >= 80 ? 'جيد جداً' : 'جيد') : memoVal),
        sard_pages: sardVal,
        attendance_rate: attRate,
        memo_grade: memoVal,
        rev_grade: latestRec.rev_grade || s.rev_grade || 'ممتاز',
        achievement_text: sardVal > 0
          ? `إتمام سرد وتسميع ${Math.round(sardVal)} وجهاً من القرآن الكريم بإتقان وتفوق`
          : 'التميز والمواظبة في حفظ كتاب الله تعالى'
      });
    }

    // Apply Top Achievers sorting & limit if selected
    if (state.filterMode === 'top_achievers') {
      const crit = state.achieverCriteria || 'top_sard';
      normalizedStudents.sort((a, b) => {
        if (crit === 'top_exams') return (Number(b.exam_percent) || 0) - (Number(a.exam_percent) || 0);
        if (crit === 'top_attendance') return (Number(b.attendance_rate) || 0) - (Number(a.attendance_rate) || 0);
        if (crit === 'top_memo') {
          const rank = (g) => String(g || '').includes('ممتاز') ? 4 : String(g || '').includes('جيد جدا') || String(g || '').includes('جيد جداً') ? 3 : 2;
          return rank(b.memo_grade) - rank(a.memo_grade);
        }
        return (Number(b.sard_pages) || 0) - (Number(a.sard_pages) || 0);
      });
      return normalizedStudents.slice(0, state.limit || 20);
    }

    return normalizedStudents;
  }

  async function fetchStudentsList() {
    let loaded = null;

    if (!window.IS_CAPACITOR_APP) {
      try {
        const params = new URLSearchParams();
        params.append('circle_id', state.selectedCircleId);
        if (state.filterMode === 'single' && state.selectedStudentId) {
          params.append('student_id', state.selectedStudentId);
        }
        params.append('category', state.filterMode === 'top_achievers' ? state.achieverCriteria : 'all');
        params.append('timeframe', state.timeframe);
        params.append('month', state.selectedMonth);
        params.append('year', state.selectedYear);
        params.append('limit', state.limit);
        params.append('grade_source', state.gradeSource);

        const res = await fetch(`/api/certificates/students-filter?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            loaded = data.students || [];
          }
        }
      } catch (err) {
        console.warn('Server students filter unavailable, using Cloud/LocalDB fallback');
      }
    }

    if (loaded === null) {
      loaded = await loadStudentsOfflineOrCloud();
    }

    state.allFilteredStudents = Array.isArray(loaded) ? loaded : [];
    applyStudentSearchAndRefreshUI();
  }

  function updateStudentPager() {
    const total = state.students.length;
    const current = total > 0 ? state.currentStudentIndex + 1 : 0;
    const student = state.students[state.currentStudentIndex] || {};

    if (currentStudentNameEl) {
      currentStudentNameEl.textContent = total > 0 ? (student.name || 'طالب البيان') : 'لا توجد نتائج مطابقة';
    }
    if (studentCounterEl) {
      studentCounterEl.textContent = `(${current} / ${total})`;
    }

    if (prevStudentBtn) prevStudentBtn.disabled = state.currentStudentIndex <= 0;
    if (nextStudentBtn) nextStudentBtn.disabled = state.currentStudentIndex >= total - 1;

    const countBadge = document.getElementById('studentsCountBadge');
    if (countBadge) {
      countBadge.textContent = `${total} طالب محدد`;
    }

    const batchHint = document.getElementById('batchCountHint');
    if (batchHint) {
      batchHint.textContent = `تحميل شهادات ${total} طالب دفعة واحدة`;
    }
  }

  function renderStudentsPillPreview() {
    const container = document.getElementById('studentsPillPreview');
    if (!container) return;
    container.innerHTML = '';

    if (state.students.length === 0) {
      container.innerHTML = '<span class="saved-presets-empty">لا يوجد طلاب مطابقون للبحث الحالي.</span>';
      return;
    }

    state.students.slice(0, 35).forEach((s, idx) => {
      const pill = document.createElement('span');
      pill.className = `student-tag-pill ${idx === state.currentStudentIndex ? 'active' : ''}`;
      pill.textContent = s.name;
      pill.onclick = () => {
        state.currentStudentIndex = idx;
        const studentSelect = document.getElementById('studentSelect');
        if (studentSelect && s.id !== undefined) studentSelect.value = s.id;
        updateStudentPager();
        renderCertificate();
        renderStudentsPillPreview();
      };
      container.appendChild(pill);
    });

    if (state.students.length > 35) {
      const more = document.createElement('span');
      more.className = 'student-tag-pill';
      more.textContent = `+${state.students.length - 35} آخرين`;
      container.appendChild(more);
    }
  }

  // =========================================================
  // SMOOTH INTERACTIVE DRAG OVERLAY SYSTEM
  // =========================================================

  // =========================================================
  // SMOOTH INTERACTIVE FIGMA/CANVA DRAG & RESIZE SYSTEM
  // =========================================================

  function measureWrappedLines(context, text, maxWidth) {
    const paragraphs = String(text || '').split('\n');
    const lines = [];
    paragraphs.forEach((para) => {
      const words = para.split(' ');
      let currentLine = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine.trim());
          currentLine = words[n];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine.trim());
    });
    return lines.length ? lines : [''];
  }

  function computeElementExactBounds(key) {
    const elem = state.elements[key];
    if (!elem || !ctx) {
      return { widthPct: 12, heightPct: 5, centerXPct: elem ? elem.x : 50, pixelWidth: 300, pixelHeight: 120 };
    }

    const student = state.students[state.currentStudentIndex] || {};
    const elemFont = elem.fontFamily || state.fontFamily || 'Amiri';
    const boldWeight = elem.isBold ? '700' : '500';
    let pixelWidth = 200;
    let pixelHeight = 100;

    if (key === 'school_stamp') {
      const size = elem.size || 180;
      pixelWidth = size + 24;
      pixelHeight = size + 24;
    } else if (elem.type === 'image') {
      pixelWidth = elem.width || 250;
      pixelHeight = elem.height || 250;
    } else if (key === 'grade_badge') {
      const rawText = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
      const badgeText = formatMentions(rawText, student);
      ctx.save();
      ctx.font = `${elem.isBold !== false ? '700' : '500'} ${elem.size || 54}px '${elemFont}', 'Cairo', sans-serif`;
      pixelWidth = ctx.measureText(badgeText).width + 44;
      pixelHeight = (elem.size || 54) + 22;
      ctx.restore();
    } else if (key === 'body_text') {
      const rawText = elem.text !== undefined ? elem.text : state.bodyText;
      const renderedText = formatMentions(rawText, student);
      ctx.save();
      ctx.font = `${boldWeight} ${elem.size || 48}px '${elemFont}', 'Amiri', serif`;
      const maxWidth = elem.maxWidth || 2600;
      const lh = (elem.size || 48) * 1.65;
      const lines = measureWrappedLines(ctx, renderedText, maxWidth);

      let maxLineW = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxLineW) maxLineW = w;
      });
      pixelWidth = Math.max(260, maxLineW + 40);
      pixelHeight = Math.max(lh, lines.length * lh + 20);
      ctx.restore();
    } else {
      let text = '';
      let defaultSize = 60;
      if (key === 'student_name') {
        text = formatMentions(elem.text !== undefined ? elem.text : '{{اسم_الطالب}}', student);
        defaultSize = 116;
      } else if (key === 'cert_title') {
        text = formatMentions(elem.text !== undefined ? elem.text : (state.title || 'شَهَادَةُ شُكْرٍ وَتَقْدِير'), student);
        defaultSize = 108;
      } else if (key === 'circle_info') {
        text = formatMentions(elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}', student);
        defaultSize = 44;
      } else if (key === 'teacher_info') {
        text = formatMentions(elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}', student);
        defaultSize = 44;
      } else {
        text = formatMentions(elem.text || '', student);
        defaultSize = 60;
      }
      const sz = elem.size || defaultSize;
      const lh = sz * 1.3;
      const weight = (key === 'student_name' || key === 'cert_title') ? (elem.isBold !== false ? '700' : '500') : (elem.isBold ? '700' : '600');
      ctx.save();
      ctx.font = `${weight} ${sz}px '${elemFont}', 'Cairo', serif`;
      const lines = String(text).split('\n');
      let maxW = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxW) maxW = w;
      });
      pixelWidth = Math.max(100, maxW + 36);
      pixelHeight = Math.max(36, lines.length * lh + 12);
      ctx.restore();
    }

    elem.width = pixelWidth;
    elem.height = pixelHeight;

    const widthPct = Math.min(96, Math.max(2.5, (pixelWidth / CANVAS_WIDTH) * 100));
    const heightPct = Math.min(96, Math.max(1.8, (pixelHeight / CANVAS_HEIGHT) * 100));

    let centerXPct = elem.x;
    if (key !== 'school_stamp' && key !== 'grade_badge' && elem.type !== 'image') {
      if (elem.align === 'left') centerXPct = elem.x + widthPct / 2;
      else if (elem.align === 'right') centerXPct = elem.x - widthPct / 2;
    }

    return { widthPct, heightPct, centerXPct, pixelWidth, pixelHeight };
  }

  function buildDragOverlayHandles() {
    if (!dragOverlay) return;
    dragOverlay.innerHTML = '';

    getSortedElementKeys().forEach((key) => {
      const elem = state.elements[key];
      if (!elem || elem.visible === false) return;
      if (key === 'school_stamp' && !state.showOfficialStamp) return;
      if (key === 'grade_badge' && state.gradeSource === 'none') return;

      const handle = document.createElement('div');
      handle.className = `drag-box-handle ${key === state.activeElementKey ? 'active' : ''}`;
      handle.setAttribute('data-key', key);
      handle.id = `handle_${key}`;

      const bounds = computeElementExactBounds(key);
      handle.style.left = `${bounds.centerXPct}%`;
      handle.style.top = `${elem.y}%`;
      handle.style.width = `${bounds.widthPct}%`;
      handle.style.height = `${bounds.heightPct}%`;
      handle.style.setProperty('--elem-rotate', `${elem.rotation || 0}deg`);

      let tapTimeout = null;
      let lastTapTime = 0;

      function triggerSingleTap() {
        state.activeElementKey = key;
        highlightActiveHandle();
        renderElementSelectorAndLayers();
        updateTypographyPanelActiveElement();
        if (window.innerWidth >= 1100) {
          switchSectionTab('Typography');
        }
      }

      function triggerDoubleTap() {
        if (tapTimeout) {
          clearTimeout(tapTimeout);
          tapTimeout = null;
        }
        state.activeElementKey = key;
        highlightActiveHandle();
        updateTypographyPanelActiveElement();
        closeBottomSheet();
        openQuickTextEditor(key);
      }

      handle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dragState.hasMoved) return;

        const now = Date.now();
        if (now - lastTapTime < 320) {
          // Double Tap / Double Click detected
          triggerDoubleTap();
        } else {
          // Potential Single Tap
          if (tapTimeout) clearTimeout(tapTimeout);
          tapTimeout = setTimeout(() => {
            triggerSingleTap();
            tapTimeout = null;
          }, 240);
        }
        lastTapTime = now;
      });

      // Double-click for mouse desktop
      handle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        triggerDoubleTap();
      });

      // Pointer event listeners (unified mouse + touch + stylus)
      attachPointerDrag(handle, key);

      dragOverlay.appendChild(handle);
    });

    highlightActiveHandle();
  }

  function attachPointerDrag(handle, key) {
    handle.addEventListener('pointerdown', (e) => {
      // Do not initiate drag if user clicked a resize dot
      if (e.target.closest('.corner-scale-dot') || e.target.closest('.edge-scale-dot')) {
        return;
      }

      e.stopPropagation();

      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {}

      dragState.isDragging = true;
      dragState.hasMoved = false;
      dragState.key = key;
      dragState.pointerId = e.pointerId;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.elemStartX = state.elements[key].x;
      dragState.elemStartY = state.elements[key].y;

      state.activeElementKey = key;
      highlightActiveHandle();
      updateTypographyPanelActiveElement();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragState.isDragging || dragState.key !== key) return;

      const dx = Math.abs(e.clientX - dragState.startX);
      const dy = Math.abs(e.clientY - dragState.startY);
      if (dx > 4 || dy > 4) {
        dragState.hasMoved = true;
        handle.classList.add('dragging');
      }

      if (!dragState.hasMoved) return;
      e.preventDefault();

      const rect = canvasFrame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaXPct = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragState.startY) / rect.height) * 100;

      let newX = Math.max(3, Math.min(97, dragState.elemStartX + deltaXPct));
      let newY = Math.max(3, Math.min(97, dragState.elemStartY + deltaYPct));

      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;

      state.elements[key].x = newX;
      state.elements[key].y = newY;

      handle.style.left = `${newX}%`;
      handle.style.top = `${newY}%`;

      if (sliderX && state.activeElementKey === key) {
        sliderX.value = newX;
        if (valXDisplay) valXDisplay.textContent = `${newX}%`;
      }
      if (sliderY && state.activeElementKey === key) {
        sliderY.value = newY;
        if (valYDisplay) valYDisplay.textContent = `${newY}%`;
      }

      scheduleCanvasDraw();
    });

    const endDrag = (e) => {
      if (dragState.isDragging && dragState.key === key) {
        try {
          if (handle.hasPointerCapture(e.pointerId)) {
            handle.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}

        dragState.isDragging = false;
        dragState.key = null;
        handle.classList.remove('dragging');

        if (dragState.hasMoved && (dragState.elemStartX !== state.elements[key].x || dragState.elemStartY !== state.elements[key].y)) {
          pushHistoryState(`move_${key}`);
        }

        renderCertificate();
      }
    };

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  // --- Professional Figma/Canva Corner Scale Dots Drag ---
  function attachCornerScaleDrag(dot, key, corner) {
    dot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const elem = state.elements[key];
      if (!elem) return;

      try {
        dot.setPointerCapture(e.pointerId);
      } catch (err) {}

      scaleDragState.isScaling = true;
      scaleDragState.key = key;
      scaleDragState.corner = corner;
      scaleDragState.pointerId = e.pointerId;
      scaleDragState.startX = e.clientX;
      scaleDragState.startY = e.clientY;
      scaleDragState.startSize = elem.size || 60;
      scaleDragState.startWidth = elem.width || 200;
      scaleDragState.startHeight = elem.height || 100;
      scaleDragState.startMaxWidth = elem.maxWidth || 2600;
    });

    dot.addEventListener('pointermove', (e) => {
      if (!scaleDragState.isScaling || scaleDragState.key !== key) return;
      e.preventDefault();
      e.stopPropagation();

      const elem = state.elements[key];
      if (!elem) return;

      const deltaX = e.clientX - scaleDragState.startX;
      const deltaY = e.clientY - scaleDragState.startY;

      let scaleDelta = 0;
      if (corner === 'se') {
        scaleDelta = (deltaX + deltaY) / 2;
      } else if (corner === 'nw') {
        scaleDelta = (-deltaX - deltaY) / 2;
      } else if (corner === 'ne') {
        scaleDelta = (deltaX - deltaY) / 2;
      } else if (corner === 'sw') {
        scaleDelta = (-deltaX + deltaY) / 2;
      }

      const rect = canvasFrame.getBoundingClientRect();
      const ratio = rect.width ? CANVAS_WIDTH / rect.width : 3;
      const canvasDelta = scaleDelta * ratio;

      if (elem.type === 'image') {
        const aspect = (scaleDragState.startWidth && scaleDragState.startHeight) ? scaleDragState.startWidth / scaleDragState.startHeight : 1;
        const newWidth = Math.max(60, Math.min(2800, Math.round(scaleDragState.startWidth + canvasDelta)));
        const newHeight = Math.max(60, Math.min(2800, Math.round(newWidth / aspect)));
        elem.width = newWidth;
        elem.height = newHeight;
        elem.size = Math.max(newWidth, newHeight);
      } else if (key === 'school_stamp') {
        const newSize = Math.max(60, Math.min(600, Math.round(scaleDragState.startSize + canvasDelta * 0.5)));
        elem.size = newSize;
        elem.width = newSize;
        elem.height = newSize;
      } else {
        const newSize = Math.max(18, Math.min(260, Math.round(scaleDragState.startSize + canvasDelta * 0.35)));
        elem.size = newSize;
        if (sliderSize && state.activeElementKey === key) {
          sliderSize.value = newSize;
          if (valSizeDisplay) valSizeDisplay.textContent = `${newSize}px`;
        }
      }

      syncHandlePosition(key);
      scheduleCanvasDraw();
    });

    const endScale = (e) => {
      if (scaleDragState.isScaling && scaleDragState.key === key) {
        try {
          if (dot.hasPointerCapture(e.pointerId)) {
            dot.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}
        scaleDragState.isScaling = false;
        scaleDragState.key = null;
        pushHistoryState(`scale_${key}`);
        renderCertificate();
      }
    };

    dot.addEventListener('pointerup', endScale);
    dot.addEventListener('pointercancel', endScale);
  }

  // --- Professional Edge Midpoint Scale Dots Drag ---
  function attachEdgeScaleDrag(dot, key, edge) {
    dot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const elem = state.elements[key];
      if (!elem) return;

      try {
        dot.setPointerCapture(e.pointerId);
      } catch (err) {}

      scaleDragState.isScaling = true;
      scaleDragState.key = key;
      scaleDragState.edge = edge;
      scaleDragState.pointerId = e.pointerId;
      scaleDragState.startX = e.clientX;
      scaleDragState.startY = e.clientY;
      scaleDragState.startSize = elem.size || 60;
      scaleDragState.startWidth = elem.width || 200;
      scaleDragState.startHeight = elem.height || 100;
      scaleDragState.startMaxWidth = elem.maxWidth || 2600;
    });

    dot.addEventListener('pointermove', (e) => {
      if (!scaleDragState.isScaling || scaleDragState.key !== key) return;
      e.preventDefault();
      e.stopPropagation();

      const elem = state.elements[key];
      if (!elem) return;

      const deltaX = e.clientX - scaleDragState.startX;
      const deltaY = e.clientY - scaleDragState.startY;

      const rect = canvasFrame.getBoundingClientRect();
      const ratio = rect.width ? CANVAS_WIDTH / rect.width : 3;

      if (edge === 'e' || edge === 'w') {
        const dir = edge === 'e' ? 1 : -1;
        const deltaPx = deltaX * dir * ratio;
        if (key === 'body_text') {
          elem.maxWidth = Math.max(600, Math.min(3200, Math.round(scaleDragState.startMaxWidth + deltaPx * 2)));
        } else if (elem.type === 'image') {
          elem.width = Math.max(60, Math.min(2800, Math.round(scaleDragState.startWidth + deltaPx * 2)));
        } else {
          const newSize = Math.max(18, Math.min(260, Math.round(scaleDragState.startSize + deltaPx * 0.25)));
          elem.size = newSize;
          if (sliderSize && state.activeElementKey === key) {
            sliderSize.value = newSize;
            if (valSizeDisplay) valSizeDisplay.textContent = `${newSize}px`;
          }
        }
      } else if (edge === 'n' || edge === 's') {
        const dir = edge === 's' ? 1 : -1;
        const deltaPx = deltaY * dir * ratio;
        if (elem.type === 'image') {
          elem.height = Math.max(60, Math.min(2800, Math.round(scaleDragState.startHeight + deltaPx * 2)));
        } else {
          const newSize = Math.max(18, Math.min(260, Math.round(scaleDragState.startSize + deltaPx * 0.25)));
          elem.size = newSize;
          if (sliderSize && state.activeElementKey === key) {
            sliderSize.value = newSize;
            if (valSizeDisplay) valSizeDisplay.textContent = `${newSize}px`;
          }
        }
      }

      syncHandlePosition(key);
      scheduleCanvasDraw();
    });

    const endEdgeScale = (e) => {
      if (scaleDragState.isScaling && scaleDragState.key === key) {
        try {
          if (dot.hasPointerCapture(e.pointerId)) {
            dot.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}
        scaleDragState.isScaling = false;
        scaleDragState.key = null;
        pushHistoryState(`edge_scale_${key}`);
        renderCertificate();
      }
    };

    dot.addEventListener('pointerup', endEdgeScale);
    dot.addEventListener('pointercancel', endEdgeScale);
  }

  // --- Pro Action Toolbar: Removed from floating over canvas; controls are in Typography Panel ---
  function attachProActionToolbar() {
    // Intentionally no-op: edit button and actions are placed inside the typography panel as requested
  }

  // --- Inline Quick Text Editor Modal ---
  function openQuickTextEditor(targetKey) {
    const key = targetKey || state.activeElementKey || 'student_name';
    const elem = state.elements[key];
    if (!elem) return;
    const modal = document.getElementById('textEditModal');
    const input = document.getElementById('quickEditTextInput');
    if (!modal || !input) return;

    state.activeElementKey = key;
    elem.visible = true; // Ensure element is visible on certificate

    let currentText = '';
    if (elem.isCustom && elem.type === 'text') {
      currentText = elem.text || '';
    } else if (key === 'student_name') {
      currentText = elem.text !== undefined ? elem.text : '{{اسم_الطالب}}';
    } else if (key === 'cert_title') {
      currentText = elem.text !== undefined ? elem.text : (state.title || 'شَهَادَةُ شُكْرٍ وَتَقْدِير');
    } else if (key === 'body_text') {
      currentText = elem.text !== undefined ? elem.text : (state.bodyText || '');
    } else if (key === 'grade_badge') {
      currentText = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
    } else if (key === 'circle_info') {
      currentText = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
    } else if (key === 'teacher_info') {
      currentText = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
    } else {
      currentText = elem.text || '';
    }

    input.value = currentText;
    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    input.focus();
    input.select();
  }

  function saveQuickEditText() {
    const key = state.activeElementKey || 'student_name';
    const elem = state.elements[key];
    const modal = document.getElementById('textEditModal');
    const input = document.getElementById('quickEditTextInput');
    if (!elem || !modal || !input) return;

    const newText = input.value;
    elem.text = newText;
    elem.visible = true;

    if (key === 'cert_title') {
      state.title = newText;
    } else if (key === 'body_text') {
      state.bodyText = newText;
    }

    modal.style.display = 'none';
    updateTypographyPanelActiveElement();
    renderCertificate();
    pushHistoryState('save_text');
    showToast('تم حفظ النص والمتغيرات بنجاح');
  }

  function openColorPickerForActiveElement() {
    const picker = document.getElementById('proColorPicker');
    if (!picker) return;
    const elem = state.elements[state.activeElementKey];
    if (elem && elem.color) {
      picker.value = elem.color.startsWith('#') && elem.color.length === 7 ? elem.color : '#dfbc55';
    }
    picker.click();
  }

  function syncCustomElementIdCounter() {
    let maxId = 0;
    Object.keys(state.elements).forEach((k) => {
      const m = k.match(/^custom_(?:text|img)_(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxId) maxId = n;
      }
    });
    customElementIdCounter = maxId + 1;
  }

  function getNextZIndex() {
    let maxZ = 80;
    Object.values(state.elements).forEach((el) => {
      if (el && typeof el.zIndex === 'number' && el.zIndex > maxZ) maxZ = el.zIndex;
    });
    return maxZ + 10;
  }

  function duplicateActiveElement() {
    const key = state.activeElementKey;
    const elem = state.elements[key];
    if (!elem) return;

    syncCustomElementIdCounter();
    const newKey = 'custom_' + (elem.type || 'text') + '_' + (customElementIdCounter++);
    let newElem = {};

    if (elem.isCustom) {
      newElem = {
        ...elem,
        imgElement: undefined,
        img: undefined
      };
      if (elem.type === 'image') {
        const imgObj = elem.imgElement || elem.img;
        newElem.imgElement = imgObj;
        newElem.img = imgObj;
        newElem.imgDataUrl = elem.imgDataUrl || null;
      }
    } else {
      let textVal = '';
      if (key === 'student_name') textVal = elem.text !== undefined ? elem.text : '{{اسم_الطالب}}';
      else if (key === 'cert_title') textVal = elem.text !== undefined ? elem.text : state.title;
      else if (key === 'body_text') textVal = elem.text !== undefined ? elem.text : state.bodyText;
      else if (key === 'grade_badge') textVal = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
      else if (key === 'circle_info') textVal = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
      else if (key === 'teacher_info') textVal = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
      else textVal = 'عنصر مكرر';

      newElem = {
        isCustom: true,
        type: 'text',
        text: textVal,
        size: elem.size || 60,
        align: elem.align || 'center',
        color: elem.color || '#dfbc55',
        fontFamily: elem.fontFamily || state.fontFamily || 'Amiri',
        isBold: Boolean(elem.isBold),
        opacity: elem.opacity !== undefined ? elem.opacity : 1,
        rotation: elem.rotation || 0,
        width: elem.width || 400,
        height: elem.height || 100
      };
    }

    newElem.x = Math.min(90, (elem.x || 50) + 4);
    newElem.y = Math.min(90, (elem.y || 50) + 4);
    newElem.zIndex = getNextZIndex();
    newElem.visible = true;

    state.elements[newKey] = newElem;
    state.activeElementKey = newKey;
    buildDragOverlayHandles();
    renderElementSelectorAndLayers();
    updateTypographyPanelActiveElement();
    renderCertificate();
    pushHistoryState('duplicate_element');
    showToast('تم تكرار العنصر بنجاح');
  }

  function centerActiveElement() {
    const elem = state.elements[state.activeElementKey];
    if (!elem) return;
    elem.x = 50;
    syncHandlePosition(state.activeElementKey);
    updateSliderValuesFromActiveElement();
    drawCertificateCanvas();
    pushHistoryState('center_element');
    showToast('تمت محاذاة العنصر في المنتصف');
  }

  function deleteOrHideActiveElement() {
    const key = state.activeElementKey;
    const elem = state.elements[key];
    if (!elem) return;

    if (elem.isCustom) {
      delete state.elements[key];
      state.activeElementKey = null;
      buildDragOverlayHandles();
      renderElementSelectorAndLayers();
      renderCertificate();
      updateTypographyPanelActiveElement();
      pushHistoryState('delete_custom_element');
      showToast('تم حذف العنصر');
    } else {
      elem.visible = false;
      if (key === 'school_stamp') {
        state.showOfficialStamp = false;
        syncStudioControlsUI();
      }
      state.activeElementKey = null;
      buildDragOverlayHandles();
      renderElementSelectorAndLayers();
      renderCertificate();
      updateTypographyPanelActiveElement();
      pushHistoryState('hide_element');
      showToast('تم إخفاء العنصر');
    }
  }

  // --- Add Custom Text & Images ---
  function addCustomText(initialText, options = {}) {
    syncCustomElementIdCounter();
    const id = 'custom_text_' + (customElementIdCounter++);
    const text = initialText !== undefined ? initialText : '{{اسم_الطالب}}';
    const isLightBg = state.currentTemplate === 'blank' || state.currentTemplate === 'academic';
    state.elements[id] = {
      isCustom: true,
      type: 'text',
      text: text,
      x: options.x !== undefined ? options.x : 50,
      y: options.y !== undefined ? options.y : 50,
      size: options.size || 68,
      align: options.align || 'center',
      color: options.color || (isLightBg ? '#1B3A4B' : '#dfbc55'),
      fontFamily: state.fontFamily || 'Amiri',
      isBold: true,
      opacity: 1,
      rotation: 0,
      zIndex: getNextZIndex(),
      visible: true,
      width: 450,
      height: 90
    };
    state.activeElementKey = id;
    buildDragOverlayHandles();
    renderElementSelectorAndLayers();
    renderCertificate();
    pushHistoryState('add_custom_text');
    showToast(options.toast || 'تمت إضافة النص بنجاح');
    updateTypographyPanelActiveElement();
    switchSectionTab('Typography');
    if (options.openEditor) {
      openQuickTextEditor(id);
    }
  }

  function addCustomImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        syncCustomElementIdCounter();
        const id = 'custom_img_' + (customElementIdCounter++);
        let w = 300;
        let h = 300;
        if (img.width && img.height) {
          const aspect = img.width / img.height;
          if (aspect >= 1) {
            w = 350;
            h = Math.round(350 / aspect);
          } else {
            h = 350;
            w = Math.round(350 * aspect);
          }
        }
        state.elements[id] = {
          isCustom: true,
          type: 'image',
          img: img,
          imgElement: img,
          imgDataUrl: dataUrl,
          x: 50,
          y: 50,
          size: Math.max(w, h),
          width: w,
          height: h,
          opacity: 1,
          rotation: 0,
          zIndex: getNextZIndex(),
          visible: true
        };
        state.activeElementKey = id;
        buildDragOverlayHandles();
        renderElementSelectorAndLayers();
        updateTypographyPanelActiveElement();
        renderCertificate();
        pushHistoryState('add_custom_image');
        showToast('تمت إضافة الصورة/الملصق بنجاح');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function syncHandlePosition(key) {
    const handle = document.getElementById(`handle_${key}`);
    if (!handle) return;
    const elem = state.elements[key];
    if (!elem) return;

    let isVisible = elem.visible !== false;
    if (key === 'school_stamp' && !state.showOfficialStamp) isVisible = false;
    if (key === 'grade_badge' && state.gradeSource === 'none') isVisible = false;

    handle.style.display = isVisible ? 'flex' : 'none';
    if (!isVisible) return;

    const bounds = computeElementExactBounds(key);
    handle.style.left = `${bounds.centerXPct}%`;
    handle.style.top = `${elem.y}%`;
    handle.style.width = `${bounds.widthPct}%`;
    handle.style.height = `${bounds.heightPct}%`;
    handle.style.setProperty('--elem-rotate', `${elem.rotation || 0}deg`);
  }

  function highlightActiveHandle() {
    document.querySelectorAll('.drag-box-handle').forEach((h) => {
      const key = h.getAttribute('data-key');
      const isActive = key === state.activeElementKey;
      h.classList.toggle('active', isActive);

      const dots = h.querySelectorAll('.corner-scale-dot, .edge-scale-dot');
      dots.forEach((d) => d.remove());
      const tb = h.querySelector('.pro-action-toolbar');
      if (tb) tb.remove();
    });

    if (!state.activeElementKey) {
      updateTypographyPanelActiveElement();
      return;
    }

    const activeHandle = document.getElementById(`handle_${state.activeElementKey}`);
    if (!activeHandle) return;

    const elem = state.elements[state.activeElementKey];
    if (!elem || elem.visible === false) return;

    // Attach 4 corner scale handles
    ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
      const dot = document.createElement('div');
      dot.className = `corner-scale-dot ${pos}`;
      attachCornerScaleDrag(dot, state.activeElementKey, pos);
      activeHandle.appendChild(dot);
    });

    // Attach 4 edge midpoint scale handles
    ['n', 's', 'e', 'w'].forEach((edge) => {
      const dot = document.createElement('div');
      dot.className = `edge-scale-dot ${edge}`;
      attachEdgeScaleDrag(dot, state.activeElementKey, edge);
      activeHandle.appendChild(dot);
    });

    // Update active element inspector in typography panel
    updateTypographyPanelActiveElement();
  }

  // --- Canvas Rendering Core (300 DPI A4 Landscape: 3508 x 2480) ---
  function renderCertificate() {
    drawCertificateCanvas();
    Object.keys(state.elements).forEach(syncHandlePosition);
    highlightActiveHandle();
  }

  function drawCertificateCanvas() {
    if (!ctx) return;

    // 1. Clear Canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Background
    if (state.currentTemplate === 'custom' && state.customBgImage) {
      drawCustomBackground();
    } else if (state.currentTemplate === 'blank') {
      drawBlankTemplate();
    } else if (state.currentTemplate === 'gold') {
      drawRoyalGoldTemplate();
    } else if (state.currentTemplate === 'emerald') {
      drawQuranicEmeraldTemplate();
    } else if (state.currentTemplate === 'navy') {
      drawSapphireNavyTemplate();
    } else {
      drawAcademicIvoryTemplate();
    }

    // 3. Borders
    if (state.showOrnamentalBorder) {
      drawOrnamentalBorders();
    }

    // 4. Header & Quran Emblem (drawn when template is not blank, or when logo/emblem explicitly enabled)
    if (state.currentTemplate !== 'blank' || state.showSchoolLogo || state.showQuranEmblem) {
      drawHeaderElements();
    }

    // 5. Render all elements (built-in + custom + stamp) in zIndex layer order
    drawAllOrderedElements();
  }

  function drawBlankTemplate() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawMultilineOrSingle(context, text, x, y, lineHeight) {
    if (!text) return;
    const str = String(text);
    const lines = str.split('\n');
    if (lines.length === 1) {
      context.fillText(str, x, y);
      return;
    }
    const lh = lineHeight || 60;
    const totalH = (lines.length - 1) * lh;
    const startY = y - totalH / 2;
    lines.forEach((line, idx) => {
      context.fillText(line, x, startY + idx * lh);
    });
  }

  function drawAllOrderedElements() {
    const student = state.students[state.currentStudentIndex] || {
      name: 'عبد الله بن محمد الأهدل',
      circle_name: 'حلقة البيان القرآنية',
      teacher_name: 'معلم الحلقة',
      grade_badge: '98%',
      grade_label: 'النسبة العامة'
    };
    const isDark = state.currentTemplate !== 'academic' && state.currentTemplate !== 'blank';

    getSortedElementKeys().forEach((key) => {
      const elem = state.elements[key];
      if (!elem || elem.visible === false) return;
      if (key === 'school_stamp') {
        if (state.showOfficialStamp) drawSchoolStamp(elem);
        return;
      }
      if (elem.isCustom) {
        drawSingleCustomElement(elem, student);
        return;
      }
      drawSingleBuiltInElement(key, elem, student, isDark);
    });
  }

  function drawSingleCustomElement(elem, student) {
    ctx.save();
    const x = (elem.x / 100) * CANVAS_WIDTH;
    const y = (elem.y / 100) * CANVAS_HEIGHT;
    ctx.globalAlpha = elem.opacity !== undefined ? elem.opacity : 1;
    ctx.translate(x, y);
    if (elem.rotation) {
      ctx.rotate((elem.rotation * Math.PI) / 180);
    }

    if (elem.type === 'text') {
      const font = elem.fontFamily || state.fontFamily || 'Cairo';
      const weight = elem.isBold ? '700' : '600';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size || 64}px '${font}', 'Cairo', sans-serif`;
      ctx.fillStyle = elem.color || state.primaryColor || '#1B3A4B';

      const textToDraw = formatMentions(elem.text || '', student);
      const lh = (elem.size || 64) * 1.35;
      drawMultilineOrSingle(ctx, textToDraw, 0, 0, lh);
    } else if (elem.type === 'image') {
      const imgObj = elem.imgElement || elem.img;
      if (imgObj) {
        const w = elem.width || 250;
        const h = elem.height || 250;
        ctx.drawImage(imgObj, -w / 2, -h / 2, w, h);
      }
    }
    ctx.restore();
  }

  // --- Background Renderers ---
  function drawRoyalGoldTemplate() {
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const radial = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1400);
    radial.addColorStop(0, 'rgba(197, 155, 39, 0.12)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawQuranicEmeraldTemplate() {
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#022c22');
    bgGrad.addColorStop(0.5, '#064e3b');
    bgGrad.addColorStop(1, '#022c22');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const radial = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1400);
    radial.addColorStop(0, 'rgba(52, 211, 153, 0.14)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawSapphireNavyTemplate() {
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#091e3a');
    bgGrad.addColorStop(0.5, '#1e3a8a');
    bgGrad.addColorStop(1, '#091e3a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const radial = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1400);
    radial.addColorStop(0, 'rgba(96, 165, 250, 0.14)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawAcademicIvoryTemplate() {
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#fdfbf7');
    bgGrad.addColorStop(0.5, '#f5f0e6');
    bgGrad.addColorStop(1, '#ebe3d5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const radial = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1200);
    radial.addColorStop(0, 'rgba(197, 155, 39, 0.08)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawCustomBackground() {
    try {
      ctx.drawImage(state.customBgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } catch (e) {
      drawRoyalGoldTemplate();
    }
  }

  // --- Islamic Borders ---
  function drawOrnamentalBorders() {
    ctx.save();
    const goldPrimary = '#dfbc55';
    const goldDark = '#9a7212';
    const outerMargin = 100;
    const innerMargin = 140;

    ctx.lineWidth = 14;
    ctx.strokeStyle = goldPrimary;
    ctx.strokeRect(outerMargin, outerMargin, CANVAS_WIDTH - outerMargin * 2, CANVAS_HEIGHT - outerMargin * 2);

    ctx.lineWidth = 4;
    ctx.strokeStyle = goldDark;
    ctx.strokeRect(outerMargin + 20, outerMargin + 20, CANVAS_WIDTH - (outerMargin + 20) * 2, CANVAS_HEIGHT - (outerMargin + 20) * 2);

    ctx.lineWidth = 6;
    ctx.strokeStyle = goldPrimary;
    ctx.strokeRect(innerMargin, innerMargin, CANVAS_WIDTH - innerMargin * 2, CANVAS_HEIGHT - innerMargin * 2);

    drawCornerFiligree(innerMargin, innerMargin, 0);
    drawCornerFiligree(CANVAS_WIDTH - innerMargin, innerMargin, Math.PI / 2);
    drawCornerFiligree(CANVAS_WIDTH - innerMargin, CANVAS_HEIGHT - innerMargin, Math.PI);
    drawCornerFiligree(innerMargin, CANVAS_HEIGHT - innerMargin, -Math.PI / 2);

    ctx.restore();
  }

  function drawCornerFiligree(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = '#dfbc55';
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(80, 0);
    ctx.lineTo(40, 40);
    ctx.lineTo(0, 80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(80, 80, 50, Math.PI, 1.5 * Math.PI, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(40, 40, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#9a7212';
    ctx.fill();

    ctx.restore();
  }

  // --- Header, Title & Emblem ---
  function drawHeaderElements() {
    ctx.save();
    const isDark = state.currentTemplate !== 'academic';

    // School Logo (Top Right)
    if (state.showSchoolLogo && schoolLogoImg) {
      try {
        const logoSize = 170;
        ctx.drawImage(schoolLogoImg, CANVAS_WIDTH - 360, 160, logoSize, logoSize);
      } catch (e) {}
    }

    // Quran 3D Emblem (Top Left)
    if (state.showQuranEmblem && quranEmblemImg) {
      try {
        const emblemSize = 160;
        ctx.drawImage(quranEmblemImg, 200, 165, emblemSize, emblemSize);
      } catch (e) {}
    }

    // Header Title & Basmala (only when template is not blank)
    if (state.currentTemplate !== 'blank') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      ctx.font = `600 52px '${state.fontFamily}', 'Amiri', serif`;
      ctx.fillStyle = '#dfbc55';
      ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', CANVAS_WIDTH / 2, 170);

      ctx.font = `700 48px '${state.fontFamily}', 'Cairo', sans-serif`;
      ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
      ctx.fillText('مَدْرَسَةُ البَيَانِ لِتَعْلِيمِ القُرْآنِ الكَرِيمِ', CANVAS_WIDTH / 2, 240);

      // Divider
      const barGrad = ctx.createLinearGradient(CANVAS_WIDTH / 2 - 400, 0, CANVAS_WIDTH / 2 + 400, 0);
      barGrad.addColorStop(0, 'rgba(223, 188, 85, 0)');
      barGrad.addColorStop(0.5, 'rgba(223, 188, 85, 1)');
      barGrad.addColorStop(1, 'rgba(223, 188, 85, 0)');
      ctx.fillStyle = barGrad;
      ctx.fillRect(CANVAS_WIDTH / 2 - 400, 310, 800, 4);

      ctx.fillStyle = '#dfbc55';
      ctx.font = '24px serif';
      ctx.fillText('✦ ۞ ✦', CANVAS_WIDTH / 2, 298);
    }

    ctx.restore();
  }

  function drawSingleBuiltInElement(key, elem, student, isDark) {
    const elemFont = elem.fontFamily || state.fontFamily || 'Amiri';
    const x = (elem.x / 100) * CANVAS_WIDTH;
    const y = (elem.y / 100) * CANVAS_HEIGHT;

    if (key === 'grade_badge' && state.gradeSource === 'none') return;

    ctx.save();
    ctx.globalAlpha = elem.opacity !== undefined ? elem.opacity : 1;
    ctx.translate(x, y);
    if (elem.rotation) {
      ctx.rotate((elem.rotation * Math.PI) / 180);
    }

    if (key === 'cert_title') {
      const weight = elem.isBold !== false ? '700' : '500';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Amiri', serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#1B3A4B' : (isDark ? '#dfbc55' : '#8B1E0F'));

      const rawText = elem.text !== undefined ? elem.text : (state.title || 'شَهَادَةُ شُكْرٍ وَتَقْدِير');
      drawMultilineOrSingle(ctx, formatMentions(rawText, student), 0, 0, elem.size * 1.3);
    } else if (key === 'student_name') {
      const weight = elem.isBold !== false ? '700' : '500';
      const align = elem.align || 'center';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Amiri', serif`;

      const rawText = elem.text !== undefined ? elem.text : '{{اسم_الطالب}}';
      const nameText = formatMentions(rawText, student);
      const textWidth = ctx.measureText(nameText).width;
      const plateWidth = textWidth + 50;
      const plateHeight = elem.size + 16;
      const plateStartX = align === 'left' ? -15 : (align === 'right' ? -plateWidth + 15 : -plateWidth / 2);

      if (state.currentTemplate !== 'blank') {
        ctx.save();
        const plateGrad = ctx.createLinearGradient(plateStartX, 0, plateStartX + plateWidth, 0);
        if (isDark) {
          plateGrad.addColorStop(0, 'rgba(197, 155, 39, 0)');
          plateGrad.addColorStop(0.2, 'rgba(197, 155, 39, 0.25)');
          plateGrad.addColorStop(0.5, 'rgba(197, 155, 39, 0.45)');
          plateGrad.addColorStop(0.8, 'rgba(197, 155, 39, 0.25)');
          plateGrad.addColorStop(1, 'rgba(197, 155, 39, 0)');
        } else {
          plateGrad.addColorStop(0, 'rgba(197, 155, 39, 0)');
          plateGrad.addColorStop(0.2, 'rgba(197, 155, 39, 0.16)');
          plateGrad.addColorStop(0.5, 'rgba(197, 155, 39, 0.28)');
          plateGrad.addColorStop(0.8, 'rgba(197, 155, 39, 0.16)');
          plateGrad.addColorStop(1, 'rgba(197, 155, 39, 0)');
        }
        ctx.fillStyle = plateGrad;
        ctx.fillRect(plateStartX, -plateHeight / 2, plateWidth, plateHeight);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#dfbc55';
        ctx.beginPath();
        ctx.moveTo(plateStartX + 10, plateHeight / 2);
        ctx.lineTo(plateStartX + plateWidth - 10, plateHeight / 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#1B3A4B' : (isDark ? '#FFFFFF' : '#1e293b'));
      drawMultilineOrSingle(ctx, nameText, 0, 0, elem.size * 1.3);
    } else if (key === 'grade_badge') {
      const weight = elem.isBold !== false ? '700' : '500';
      const rawText = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
      const badgeText = formatMentions(rawText, student);

      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Cairo', sans-serif`;
      const badgeWidth = ctx.measureText(badgeText).width + 44;
      const badgeHeight = elem.size + 22;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 24);
      } else {
        ctx.rect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight);
      }
      ctx.fillStyle = elem.color || '#C59B27';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#9a7212';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lightBadgeBg = ['#dfbc55', '#fbbf24', '#c59b27', '#6ee7b7', '#93c5fd', '#a7f3d0'];
      const isLightFill = lightBadgeBg.includes(String(elem.color || '').toLowerCase());
      ctx.fillStyle = isLightFill ? '#0f172a' : '#ffffff';
      ctx.fillText(badgeText, 0, 0);
    } else if (key === 'body_text') {
      const weight = elem.isBold ? '700' : '500';
      const rawText = elem.text !== undefined ? elem.text : state.bodyText;
      const renderedText = formatMentions(rawText, student);

      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Amiri', serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#334155' : (isDark ? '#e2e8f0' : '#334155'));

      drawWrappedText(ctx, renderedText, 0, 0, elem.maxWidth || 2600, elem.size * 1.65);
    } else if (key === 'circle_info') {
      const weight = elem.isBold !== false ? '700' : '500';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Cairo', sans-serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#475569' : '#dfbc55');

      const rawText = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
      drawMultilineOrSingle(ctx, formatMentions(rawText, student), 0, 0, elem.size * 1.3);
    } else if (key === 'teacher_info') {
      const weight = elem.isBold !== false ? '700' : '500';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Cairo', sans-serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#475569' : '#dfbc55');

      const rawText = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
      drawMultilineOrSingle(ctx, formatMentions(rawText, student), 0, 0, elem.size * 1.3);
    }

    ctx.restore();
  }

  // --- Official Golden Stamp ---
  function drawSchoolStamp(stampElemArg) {
    const stampElem = stampElemArg || state.elements.school_stamp;
    if (!stampElem || stampElem.visible === false || !state.showOfficialStamp) return;

    ctx.save();
    const sx = (stampElem.x / 100) * CANVAS_WIDTH;
    const sy = (stampElem.y / 100) * CANVAS_HEIGHT;
    const radius = (stampElem.size || 180) / 2;
    const k = Math.max(0.55, radius / 90);
    const stampColor = stampElem.color || '#C59B27';

    ctx.globalAlpha = stampElem.opacity !== undefined ? stampElem.opacity : 1;
    ctx.translate(sx, sy);
    if (stampElem.rotation) {
      ctx.rotate((stampElem.rotation * Math.PI) / 180);
    }

    ctx.lineWidth = Math.max(3, 6 * k);
    ctx.strokeStyle = stampColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.lineWidth = Math.max(1.5, 3 * k);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 12 * k, 0, 2 * Math.PI);
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const ang = (i * 2 * Math.PI) / 16;
      const px = Math.cos(ang) * (radius - 6 * k);
      const py = Math.sin(ang) * (radius - 6 * k);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.5, 2.2 * k), 0, 2 * Math.PI);
      ctx.fillStyle = stampColor;
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(22 * k)}px 'Cairo', sans-serif`;
    ctx.fillStyle = stampColor;
    ctx.fillText('مدرسة البيان', 0, -24 * k);

    ctx.font = `900 ${Math.round(28 * k)}px 'Cairo', sans-serif`;
    ctx.fillText('مُعْتَمَد', 0, 6 * k);

    ctx.font = `600 ${Math.round(16 * k)}px 'Cairo', sans-serif`;
    ctx.fillText('Al-Bayan Certified', 0, 36 * k);

    ctx.restore();
  }

  // --- Text Wrapping Helper ---
  function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
    const lines = measureWrappedLines(context, text, maxWidth);
    const startY = y - (((lines.length - 1) * lineHeight) / 2);

    for (let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], x, startY + (i * lineHeight));
    }
  }

  // --- Zoom & Pan Stage Controls ---
  function setupStageControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomFitBtn = document.getElementById('zoomFitBtn');
    const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        state.scale = Math.min(2.5, Math.round((state.scale + 0.15) * 100) / 100);
        applyCanvasTransform();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        state.scale = Math.max(0.4, Math.round((state.scale - 0.15) * 100) / 100);
        applyCanvasTransform();
      });
    }

    if (zoomFitBtn) {
      zoomFitBtn.addEventListener('click', () => {
        state.scale = 1;
        state.panX = 0;
        state.panY = 0;
        applyCanvasTransform();
      });
    }

    if (toggleOverlayBtn) {
      toggleOverlayBtn.addEventListener('click', () => {
        const isHidden = dragOverlay.style.display === 'none';
        dragOverlay.style.display = isHidden ? 'block' : 'none';
        showToast(isHidden ? 'تم إظهار مقابض السحب' : 'تم إخفاء مقابض السحب');
      });
    }

    // Floating Stage Controls (Direct Add Text, Add Image)
    const addTextBtn = document.getElementById('addTextBtn');
    const addImageBtn = document.getElementById('addImageBtn');
    const customStickerInput = document.getElementById('customStickerInput');
    const proColorPicker = document.getElementById('proColorPicker');

    if (addTextBtn) {
      addTextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addCustomText('{{اسم_الطالب}}', { openEditor: false });
      });
    }

    if (addImageBtn && customStickerInput) {
      addImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customStickerInput.click();
      });
    }

    if (customStickerInput) {
      customStickerInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          addCustomImage(file);
          customStickerInput.value = '';
        }
      });
    }

    if (proColorPicker) {
      proColorPicker.addEventListener('input', (e) => {
        applyTextColor(e.target.value, false);
      });
      proColorPicker.addEventListener('change', () => {
        pushHistoryState('color_change');
      });
    }

    window.addEventListener('resize', () => {
      // Handles are percentage based, so they automatically adjust on resize!
    });
  }

  function applyCanvasTransform() {
    if (!canvasFrame) return;
    canvasFrame.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
    const zoomBadge = document.getElementById('zoomLevelBadge');
    if (zoomBadge) {
      zoomBadge.textContent = `${Math.round(state.scale * 100)}%`;
    }
  }

  function applyCanvasScale() {
    applyCanvasTransform();
  }

  // --- Pan, Zoom & Touch Viewport Gestures ---
  function setupPanAndGestures() {
    const viewport = document.getElementById('certStageContainer') || document.getElementById('certStageViewport');
    if (!viewport) return;

    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let initialPinchDistance = 0;
    let initialScale = 1;

    // Deselect active element when clicking empty canvas/stage area
    viewport.addEventListener('pointerdown', (e) => {
      const isDirectEmptyTarget = e.target === viewport || e.target === canvas || e.target === canvasFrame || e.target === dragOverlay;
      if (isDirectEmptyTarget && !e.target.closest('.drag-box-handle')) {
        if (state.activeElementKey) {
          state.activeElementKey = null;
          highlightActiveHandle();
          updateTypographyPanelActiveElement();
        }
      }

      // Middle-mouse drag or space+left click or Alt+click for pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX - state.panX;
        panStartY = e.clientY - state.panY;
        viewport.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (isPanning) {
        e.preventDefault();
        state.panX = e.clientX - panStartX;
        state.panY = e.clientY - panStartY;
        applyCanvasTransform();
      }
    });

    window.addEventListener('pointerup', () => {
      if (isPanning) {
        isPanning = false;
        viewport.style.cursor = '';
      }
    });

    // Touch pinch-to-zoom and two-finger pan
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        initialScale = state.scale;
        panStartX = ((touch1.clientX + touch2.clientX) / 2) - state.panX;
        panStartY = ((touch1.clientY + touch2.clientY) / 2) - state.panY;
      }
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        if (initialPinchDistance > 0) {
          const ratio = currentDist / initialPinchDistance;
          state.scale = Math.min(2.5, Math.max(0.35, Math.round(initialScale * ratio * 100) / 100));
          const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
          const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
          state.panX = currentCenterX - panStartX;
          state.panY = currentCenterY - panStartY;
          applyCanvasTransform();
        }
      }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDistance = 0;
      }
    });

    // Ctrl + Mouse Wheel Zoom
    viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.scale = Math.min(2.5, Math.max(0.4, Math.round((state.scale + delta) * 100) / 100));
        applyCanvasTransform();
      }
    }, { passive: false });
  }

  // --- Professional Undo / Redo History Stack ---
  function setupHistoryManager() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        undo();
      });
    }

    if (redoBtn) {
      redoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        redo();
      });
    }

    window.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    });

    updateHistoryButtons();
  }

  function getSerializedStudioSnapshot() {
    const snap = buildDesignSnapshotObj();
    snap.activeElementKey = state.activeElementKey;
    return JSON.stringify(snap);
  }

  function pushHistoryState(actionName = 'action') {
    if (history.isApplying) return;

    const snapshot = getSerializedStudioSnapshot();

    // If snapshot is identical to current top, don't duplicate
    if (history.stack.length > 0 && history.index >= 0 && history.index < history.stack.length) {
      if (history.stack[history.index].data === snapshot) {
        saveDraftToStorage();
        return;
      }
    }

    // Cut forward redo history if new action taken
    if (history.index < history.stack.length - 1) {
      history.stack = history.stack.slice(0, history.index + 1);
    }

    history.stack.push({ name: actionName, data: snapshot });

    if (history.stack.length > (history.maxSize || 35)) {
      history.stack.shift();
    }

    history.index = history.stack.length - 1;
    updateHistoryButtons();
    saveDraftToStorage();
  }

  async function restoreHistorySnapshot(snapshotStr) {
    if (!snapshotStr) return;
    try {
      const parsed = JSON.parse(snapshotStr);
      await applyDesignSnapshotObj(parsed);
      if (parsed.activeElementKey !== undefined) {
        state.activeElementKey = parsed.activeElementKey;
        highlightActiveHandle();
        renderElementSelectorAndLayers();
        updateTypographyPanelActiveElement();
      }
      updateHistoryButtons();
      saveDraftToStorage();
    } catch (err) {
      console.error('Failed to restore history snapshot:', err);
    }
  }

  async function undo() {
    if (history.index > 0) {
      history.index--;
      await restoreHistorySnapshot(history.stack[history.index].data);
      showToast('تراجع');
    }
  }

  async function redo() {
    if (history.index < history.stack.length - 1) {
      history.index++;
      await restoreHistorySnapshot(history.stack[history.index].data);
      showToast('إعادة');
    }
  }

  function updateHistoryButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    const canUndo = history.index > 0;
    const canRedo = history.index < history.stack.length - 1;

    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.classList.toggle('disabled', !canUndo);
      undoBtn.style.opacity = canUndo ? '1' : '0.4';
      undoBtn.style.pointerEvents = canUndo ? 'auto' : 'none';
    }

    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.classList.toggle('disabled', !canRedo);
      redoBtn.style.opacity = canRedo ? '1' : '0.4';
      redoBtn.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  // --- Pure Export Handlers (Browser + Capacitor Native Support) ---
  function setupExportHandlers() {
    const btnDownloadSinglePng = document.getElementById('btnDownloadSinglePng');
    const btnDownloadSinglePdf = document.getElementById('btnDownloadSinglePdf');
    const btnDownloadBatchZip = document.getElementById('btnDownloadBatchZip');
    const btnDownloadBatchPdf = document.getElementById('btnDownloadBatchPdf');
    const btnShareMobile = document.getElementById('btnShareMobile');
    const btnPrintDirect = document.getElementById('btnPrintDirect');
    const cancelBatchBtn = document.getElementById('cancelBatchExportBtn');

    if (btnDownloadSinglePng) btnDownloadSinglePng.addEventListener('click', downloadCurrentCertificatePng);
    if (quickExportBtn) quickExportBtn.addEventListener('click', downloadCurrentCertificatePng);
    if (btnDownloadSinglePdf) btnDownloadSinglePdf.addEventListener('click', downloadCurrentCertificatePdf);
    if (btnDownloadBatchZip) btnDownloadBatchZip.addEventListener('click', downloadBatchZip);
    if (btnDownloadBatchPdf) btnDownloadBatchPdf.addEventListener('click', downloadBatchPdf);
    if (btnShareMobile) btnShareMobile.addEventListener('click', shareCurrentCertificate);
    if (quickShareBtn) quickShareBtn.addEventListener('click', shareCurrentCertificate);
    if (btnPrintDirect) btnPrintDirect.addEventListener('click', printCurrentCertificate);
    if (cancelBatchBtn) {
      cancelBatchBtn.addEventListener('click', () => {
        state.isBatchCancelled = true;
        showToast('جاري إلغاء التصدير الجماعي...');
      });
    }
  }

  function getCleanFileName(studentName, ext = 'png') {
    const cleanName = (studentName || 'طالب').replace(/[^\u0600-\u06FFa-zA-Z0-9_\-]/g, '_');
    return `شهادة_${cleanName}.${ext}`;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function saveBlobOnDevice(blob, filename) {
    // 1. Try Capacitor native Filesystem when running inside Android APK
    const capPlugins = window.Capacitor && window.Capacitor.Plugins;
    if (window.IS_CAPACITOR_APP && capPlugins && capPlugins.Filesystem && typeof capPlugins.Filesystem.writeFile === 'function') {
      try {
        const base64Data = await blobToBase64(blob);
        await capPlugins.Filesystem.writeFile({
          path: `AlbayanCertificates/${filename}`,
          data: base64Data,
          directory: 'DOCUMENTS',
          recursive: true
        });
        showToast(`تم حفظ الملف في المستندات: ${filename}`);
        return true;
      } catch (capErr) {
        console.warn('Capacitor Filesystem fallback to anchor download:', capErr);
      }
    }

    // 2. Standard browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }

  function updateBatchModal(visible, title = '', done = 0, total = 0, studentName = '') {
    const modal = document.getElementById('batchExportModal');
    const titleEl = document.getElementById('batchExportTitle');
    const countEl = document.getElementById('batchExportProgressText');
    const fillEl = document.getElementById('batchExportProgressFill');
    const subEl = document.getElementById('batchExportStudentName');

    if (!modal) return;
    modal.style.display = visible ? 'flex' : 'none';
    if (!visible) return;

    if (titleEl && title) titleEl.textContent = title;
    if (countEl) countEl.textContent = `${done} / ${total}`;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (subEl) subEl.textContent = studentName ? `الطالب الحالي: ${studentName}` : 'يرجى الانتظار وعدم إغلاق الصفحة';
  }

  // 1. Single PNG Export
  function downloadCurrentCertificatePng() {
    const student = state.students[state.currentStudentIndex] || {};
    showToast('جاري تصدير الصورة عالية الدقة (300 DPI)...');

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      await saveBlobOnDevice(blob, getCleanFileName(student.name, 'png'));
      showToast('تم تنزيل الشهادة بنجاح!');
    }, 'image/png', 1.0);
  }

  // 2. Single PDF Export
  async function downloadCurrentCertificatePdf() {
    const student = state.students[state.currentStudentIndex] || {};
    showToast('جاري إنشاء ملف PDF جاهز للطباعة...');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      doc.addImage(imgData, 'JPEG', 0, 0, 841.89, 595.28);
      const pdfBlob = doc.output('blob');
      await saveBlobOnDevice(pdfBlob, getCleanFileName(student.name, 'pdf'));
      showToast('تم حفظ ملف PDF بنجاح!');
    } else {
      showToast('جاري تحويل الشهادة إلى نافذة الطباعة (PDF)...');
      printCurrentCertificate();
    }
  }

  // 3A. Batch ZIP Export (with progress & cancel)
  async function downloadBatchZip() {
    if (!window.JSZip) {
      showToast('مكتبة الضغط غير متاحة بدون إنترنت، يمكنك استخدام التصدير الفردي أو PDF');
      return;
    }

    if (state.students.length === 0) {
      showToast('لا يوجد طلاب محددون للتصدير');
      return;
    }

    state.isBatchCancelled = false;
    const total = state.students.length;
    const zip = new JSZip();
    const initialIndex = state.currentStudentIndex;
    updateBatchModal(true, 'جاري تجهيز حزمة الشهادات (ZIP)...', 0, total, '');

    try {
      for (let i = 0; i < total; i++) {
        if (state.isBatchCancelled) {
          throw new Error('BATCH_CANCELLED');
        }
        const st = state.students[i];
        state.currentStudentIndex = i;
        drawCertificateCanvas();
        updateBatchModal(true, 'جاري تجهيز حزمة الشهادات (ZIP)...', i + 1, total, st.name);

        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
        const fileName = `${i + 1}_${getCleanFileName(st.name, 'jpg')}`;
        zip.file(fileName, blob);

        // Yield frame to keep mobile UI responsive
        await new Promise((r) => setTimeout(r, 15));
      }

      state.currentStudentIndex = initialIndex;
      renderCertificate();

      updateBatchModal(true, 'جاري ضغط الحزمة النهائية...', total, total, 'يتم إنشاء ملف ZIP');
      const content = await zip.generateAsync({ type: 'blob' });
      const zipName = `شهادات_مدرسة_البيان_${new Date().toISOString().slice(0, 10)}.zip`;
      await saveBlobOnDevice(content, zipName);
      updateBatchModal(false);
      showToast(`تم تصدير ${total} شهادة بنجاح!`);
    } catch (err) {
      updateBatchModal(false);
      state.currentStudentIndex = initialIndex;
      renderCertificate();
      if (err && err.message === 'BATCH_CANCELLED') {
        showToast('تم إلغاء التصدير الجماعي');
      } else {
        console.error('Batch ZIP export error:', err);
        showToast('حدث خطأ أثناء التصدير الجماعي');
      }
    }
  }

  // 3B. Batch Multi-Page PDF Export (with progress & cancel)
  async function downloadBatchPdf() {
    if (state.students.length === 0) {
      showToast('لا يوجد طلاب محددون للتصدير');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('مكتبة PDF غير متاحة حالياً، جاري الفتح للطباعة...');
      printCurrentCertificate();
      return;
    }

    state.isBatchCancelled = false;
    const total = state.students.length;
    const initialIndex = state.currentStudentIndex;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    updateBatchModal(true, 'جاري إنشاء ملف PDF مجمع...', 0, total, '');

    try {
      for (let i = 0; i < total; i++) {
        if (state.isBatchCancelled) {
          throw new Error('BATCH_CANCELLED');
        }
        const st = state.students[i];
        state.currentStudentIndex = i;
        drawCertificateCanvas();
        updateBatchModal(true, 'جاري إنشاء ملف PDF مجمع...', i + 1, total, st.name);

        if (i > 0) doc.addPage('a4', 'landscape');
        const imgData = canvas.toDataURL('image/jpeg', 0.90);
        doc.addImage(imgData, 'JPEG', 0, 0, 841.89, 595.28);

        await new Promise((r) => setTimeout(r, 15));
      }

      state.currentStudentIndex = initialIndex;
      renderCertificate();

      const pdfBlob = doc.output('blob');
      const pdfName = `شهادات_البيان_مجمعة_${new Date().toISOString().slice(0, 10)}.pdf`;
      await saveBlobOnDevice(pdfBlob, pdfName);
      updateBatchModal(false);
      showToast(`تم حفظ ملف PDF لـ ${total} طالب بنجاح!`);
    } catch (err) {
      updateBatchModal(false);
      state.currentStudentIndex = initialIndex;
      renderCertificate();
      if (err && err.message === 'BATCH_CANCELLED') {
        showToast('تم إلغاء إنشاء ملف PDF');
      } else {
        console.error('Batch PDF export error:', err);
        showToast('حدث خطأ أثناء إنشاء ملف PDF المجمع');
      }
    }
  }

  // 4. Mobile Native Share API + Capacitor Share Fallback
  async function shareCurrentCertificate() {
    const student = state.students[state.currentStudentIndex] || {};
    const filename = getCleanFileName(student.name, 'png');
    showToast('جاري إعداد الشهادة للمشاركة...');

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Try Capacitor Cache + Native Share first if inside APK
        const capPlugins = window.Capacitor && window.Capacitor.Plugins;
        if (window.IS_CAPACITOR_APP && capPlugins && capPlugins.Filesystem && capPlugins.Share) {
          try {
            const base64Data = await blobToBase64(blob);
            const writeRes = await capPlugins.Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: 'CACHE'
            });
            await capPlugins.Share.share({
              title: `شهادة تقدير - ${student.name || 'طالب البيان'}`,
              text: `شهادة تكريم وتفوق للطالب / ${student.name || 'طالب البيان'} من مدرسة البيان لتعليم القرآن الكريم.`,
              files: writeRes && writeRes.uri ? [writeRes.uri] : undefined,
              url: writeRes ? writeRes.uri : undefined
            });
            showToast('تمت المشاركة بنجاح!');
            return;
          } catch (capShareErr) {
            if (capShareErr && String(capShareErr).includes('cancel')) return;
          }
        }

        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `شهادة تقدير - ${student.name}`,
            text: `شهادة تكريم وتفوق للطالب المبارك / ${student.name} من مدرسة البيان لتعليم القرآن الكريم.`
          });
          showToast('تمت المشاركة بنجاح!');
        } else if (navigator.share) {
          await navigator.share({
            title: `شهادة تقدير - ${student.name}`,
            text: `شهادة تكريم وتفوق للطالب المبارك / ${student.name} من مدرسة البيان لتعليم القرآن الكريم.`
          });
        } else {
          await saveBlobOnDevice(blob, filename);
          showToast('تم تنزيل الشهادة لعدم دعم المشاركة المباشرة في متصفحك');
        }
      }, 'image/png');
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.error('Share failed:', err);
        downloadCurrentCertificatePng();
      }
    }
  }

  // 5. Direct Print (WebView-Safe In-DOM #printContainer + CSS @media print)
  function printCurrentCertificate() {
    const dataUrl = canvas.toDataURL('image/png');
    const printContainer = document.getElementById('printContainer');
    if (printContainer) {
      printContainer.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'شهادة التقدير';
      img.onload = () => {
        window.print();
      };
      printContainer.appendChild(img);
      return;
    }

    // Fallback if printContainer was removed
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head><title>طباعة الشهادة</title></head>
        <body onload="window.print();" style="margin:0;"><img src="${dataUrl}" style="width:100vw;height:100vh;object-fit:contain;" alt="شهادة"></body>
        </html>
      `);
      win.document.close();
    } else {
      showToast('يرجى استخدام خيار حفظ PDF أو PNG للطباعة من الهاتف');
    }
  }

  // --- Run on DOM Ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudio);
  } else {
    initStudio();
  }
})();
