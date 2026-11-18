/**
 * Albayan Smart Certificates Studio - PixelLab Mobile Architecture
 * High-Resolution 300 DPI Canvas Engine (3508 x 2480)
 * Context-Aware Bottom Bar, Non-Blocking Tray, Slide-Over Layers Drawer,
 * Pinch-to-Zoom & Golden Magnetic Snap Guides
 */

(function () {
  'use strict';

  // --- Constants & Dimensions (A4 Landscape at 300 DPI: 3508 x 2480) ---
  const CANVAS_WIDTH = 3508;
  const CANVAS_HEIGHT = 2480;

  const STUDIO_DRAFT_KEY = 'albayan_cert_studio_draft_v2';
  const STUDIO_PRESETS_KEY = 'albayan_cert_studio_presets_v2';

  const STUDIO_FONTS = [
    { value: 'Amiri', label: 'الأميري', sub: 'نسخ فاخر' },
    { value: 'Scheherazade New', label: 'شهرزاد', sub: 'نسخ تقليدي' },
    { value: 'Aref Ruqaa', label: 'عارف رقعة', sub: 'ثلث ورقعة' },
    { value: 'El Messiri', label: 'المسيري', sub: 'ديواني رشيق' },
    { value: 'Reem Kufi', label: 'ريم كوفي', sub: 'كوفي هندسي' },
    { value: 'Cairo', label: 'كايرو', sub: 'حديث واضح' },
    { value: 'Tajawal', label: 'تجوّل', sub: 'حديث أنيق' }
  ];

  const STUDIO_COLORS = [
    { hex: '#1B3A4B', name: 'كحلي داكن' },
    { hex: '#0F5132', name: 'زمردي قرآني' },
    { hex: '#C59B27', name: 'ذهبي ملكي' },
    { hex: '#DFBC55', name: 'ذهبي فاتح' },
    { hex: '#8B1E0F', name: 'عنابي فاخر' },
    { hex: '#FFFFFF', name: 'أبيض ناصع' },
    { hex: '#111827', name: 'أسود كربوني' },
    { hex: '#334155', name: 'رمادي أردوازي' },
    { hex: '#845EC2', name: 'بنفسجي ملكي' }
  ];

  function createDefaultElements() {
    return {
      ornamental_border: { type: 'border', x: 50, y: 50, size: 100, opacity: 1, rotation: 0, zIndex: 5, visible: true, locked: true },
      school_logo: { type: 'image', subType: 'school_logo', x: 92, y: 10, size: 170, width: 170, height: 170, opacity: 1, rotation: 0, zIndex: 15, visible: true, locked: false },
      quran_emblem: { type: 'image', subType: 'quran_emblem', x: 8, y: 10, size: 160, width: 160, height: 160, opacity: 1, rotation: 0, zIndex: 16, visible: false, locked: false },
      cert_title: { type: 'text', x: 50, y: 31, size: 108, align: 'center', color: '#8B1E0F', fontFamily: 'Amiri', isBold: true, lineHeight: 1.3, strokeEnabled: false, strokeWidth: 4, strokeColor: '#ffffff', shadowEnabled: false, shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.45)', opacity: 1, rotation: 0, zIndex: 20, visible: true, locked: false, width: 1100, height: 140 },
      student_name: { type: 'text', x: 50, y: 47, size: 116, align: 'center', color: '#1B3A4B', fontFamily: 'Amiri', isBold: true, lineHeight: 1.3, strokeEnabled: false, strokeWidth: 4, strokeColor: '#ffffff', shadowEnabled: false, shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.45)', opacity: 1, rotation: 0, zIndex: 30, visible: true, locked: false, width: 1300, height: 160 },
      grade_badge: { type: 'text', x: 50, y: 58, size: 54, align: 'center', color: '#C59B27', fontFamily: 'Amiri', isBold: true, lineHeight: 1.3, strokeEnabled: false, strokeWidth: 3, strokeColor: '#ffffff', shadowEnabled: false, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.45)', opacity: 1, rotation: 0, zIndex: 40, visible: true, locked: false, width: 700, height: 90 },
      body_text: { type: 'text', x: 50, y: 69, size: 48, align: 'center', color: '#334155', fontFamily: 'Amiri', isBold: false, lineHeight: 1.65, strokeEnabled: false, strokeWidth: 3, strokeColor: '#ffffff', shadowEnabled: false, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)', opacity: 1, rotation: 0, zIndex: 50, visible: true, locked: false, width: 2200, height: 220, maxWidth: 2600 },
      circle_info: { type: 'text', x: 28, y: 86, size: 44, align: 'center', color: '#475569', fontFamily: 'Cairo', isBold: true, lineHeight: 1.3, strokeEnabled: false, strokeWidth: 3, strokeColor: '#ffffff', shadowEnabled: false, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)', opacity: 1, rotation: 0, zIndex: 60, visible: true, locked: false, width: 650, height: 90 },
      teacher_info: { type: 'text', x: 72, y: 86, size: 44, align: 'center', color: '#475569', fontFamily: 'Cairo', isBold: true, lineHeight: 1.3, strokeEnabled: false, strokeWidth: 3, strokeColor: '#ffffff', shadowEnabled: false, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)', opacity: 1, rotation: 0, zIndex: 70, visible: true, locked: false, width: 650, height: 90 },
      school_stamp: { type: 'image', subType: 'school_stamp', x: 50, y: 85, size: 180, align: 'center', color: '#C59B27', fontFamily: 'Cairo', isBold: true, opacity: 1, rotation: 0, zIndex: 80, visible: true, locked: false, width: 180, height: 180 }
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

    // Elements
    elements: createDefaultElements(),
    activeElementKey: null, // Start clean in default 4-tab PixelLab state

    // PixelLab UI State
    activeTool: null, // 'templates' | 'add' | 'presets' | 'font' | 'size' | 'color' | 'position' | 'format' | 'effects' | 'rotate' | 'opacity' | 'layer'
    layersDrawerOpen: false,
    snapGridEnabled: true,

    // Filter & Audience State
    filterMode: 'all',
    selectedCircleId: 'all',
    selectedStudentId: '',
    studentSearchQuery: '',
    achieverCriteria: 'top_sard',
    timeframe: 'month',
    selectedMonth: 'all',
    selectedYear: 'all',
    limit: 20,
    gradeSource: 'all_weighted',
    exportFormat: 'png_uhd',

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

  let customElementIdCounter = 1;

  const dragState = {
    isDragging: false,
    hasMoved: false,
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
    startHeight: 100,
    startMaxWidth: 2600
  };

  // Preloaded Images
  let schoolLogoImg = null;
  let quranEmblemImg = null;

  // Core DOM Refs
  const canvas = document.getElementById('certCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const canvasFrame = document.getElementById('certCanvasFrame');
  const dragOverlay = document.getElementById('certDragOverlay');
  const certToast = document.getElementById('certToast');
  const bottomBarEl = document.getElementById('pxBottomBar');
  const contextualTrayEl = document.getElementById('pxContextualTray');
  const trayInnerEl = document.getElementById('pxTrayInner');

  const prevStudentBtn = document.getElementById('prevStudentBtn');
  const nextStudentBtn = document.getElementById('nextStudentBtn');
  const currentStudentNameEl = document.getElementById('currentStudentName');
  const studentCounterEl = document.getElementById('studentCounter');

  // --- Initializer ---
  async function initStudio() {
    initAuthAndUser();
    setupTopBarAndModals();
    setupLayersDrawer();
    setupTextEditModal();
    setupFileInputs();
    setupFilterListeners();
    setupExportHandlers();
    setupHistoryManager();
    setupPanAndGestures();

    await loadDraftFromStorage();
    syncElementVisibilityFlags();
    syncSnapGridUI();

    await preloadAssets();
    await fetchFilterOptions();
    await fetchStudentsList();

    buildDragOverlayHandles();
    renderLayersDrawer();
    renderBottomToolbar();
    renderCertificate();

    pushHistoryState('الحالة الأولية');

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

  window.logout = async function () {
    if (typeof window.albayanLogout === 'function') {
      return window.albayanLogout();
    }
    sessionStorage.clear();
    try {
      localStorage.removeItem('albayan_logged_user');
      localStorage.removeItem('albayan_saved_token');
    } catch (e) {}
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = 'login.html?logout=1';
  };

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(message, duration = 2600) {
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

  // --- Unified Top Bar & Modals ---
  function setupTopBarAndModals() {
    const studentPill = document.getElementById('studentPill');
    const studentsModal = document.getElementById('studentsFilterModal');
    const closeStudentsBtn = document.getElementById('closeStudentsModalBtn');

    if (studentPill && studentsModal) {
      studentPill.addEventListener('click', () => openStudentsModal());
    }
    if (closeStudentsBtn && studentsModal) {
      closeStudentsBtn.addEventListener('click', () => { studentsModal.style.display = 'none'; });
    }
    if (studentsModal) {
      studentsModal.addEventListener('click', (e) => {
        if (e.target === studentsModal) studentsModal.style.display = 'none';
      });
    }

    const openExportBtn = document.getElementById('openExportModalBtn');
    const exportModal = document.getElementById('exportShareModal');
    const closeExportBtn = document.getElementById('closeExportModalBtn');

    if (openExportBtn && exportModal) {
      openExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
    }
    if (closeExportBtn && exportModal) {
      closeExportBtn.addEventListener('click', () => { exportModal.style.display = 'none'; });
    }
    if (exportModal) {
      exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) exportModal.style.display = 'none';
      });
    }

    const snapBtn = document.getElementById('snapGridToggleBtn');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        state.snapGridEnabled = !state.snapGridEnabled;
        syncSnapGridUI();
        showToast(state.snapGridEnabled ? 'تم تفعيل الشبكة والمحاذاة المغناطيسية' : 'تم إيقاف الشبكة والمحاذاة');
      });
    }

    const zoomFitBtn = document.getElementById('zoomFitBtn');
    if (zoomFitBtn) {
      zoomFitBtn.addEventListener('click', () => {
        state.scale = 1;
        state.panX = 0;
        state.panY = 0;
        applyCanvasTransform();
      });
    }

    const trayCloseBtn = document.getElementById('pxTrayCloseBtn');
    if (trayCloseBtn) {
      trayCloseBtn.addEventListener('click', () => {
        state.activeTool = null;
        renderTray();
        renderBottomToolbar();
      });
    }

    // Android Back Button integration for Studio modals, Layers drawer, Tray, and Selection
    const prevBackHandler = typeof window.albayanHandleBack === 'function' ? window.albayanHandleBack : null;
    window.albayanHandleBack = function (fromPopState) {
      const textModal = document.getElementById('textEditModal');
      if (textModal && textModal.style.display !== 'none') {
        closeQuickTextEditor();
        return true;
      }
      if (exportModal && exportModal.style.display !== 'none') {
        exportModal.style.display = 'none';
        return true;
      }
      if (studentsModal && studentsModal.style.display !== 'none') {
        studentsModal.style.display = 'none';
        return true;
      }
      if (state.layersDrawerOpen) {
        toggleLayersDrawer(false);
        return true;
      }
      if (state.activeTool) {
        state.activeTool = null;
        renderTray();
        renderBottomToolbar();
        return true;
      }
      if (state.activeElementKey) {
        setSelectedElement(null);
        return true;
      }
      return prevBackHandler ? prevBackHandler(fromPopState) : false;
    };
  }

  function openStudentsModal() {
    const modal = document.getElementById('studentsFilterModal');
    if (modal) {
      modal.style.display = 'flex';
      syncStudentGradeSelectorUI();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  function syncSnapGridUI() {
    const snapBtn = document.getElementById('snapGridToggleBtn');
    const gridEl = document.getElementById('canvasSnapGrid');
    if (snapBtn) {
      snapBtn.classList.toggle('active', Boolean(state.snapGridEnabled));
      snapBtn.setAttribute('aria-pressed', String(Boolean(state.snapGridEnabled)));
    }
    if (gridEl) {
      gridEl.classList.toggle('visible', Boolean(state.snapGridEnabled));
    }
  }

  // --- Element Helpers & Selection ---
  function getElementKind(key, elem) {
    if (!key || !elem) return 'none';
    if (elem.type === 'border' || key === 'ornamental_border') return 'border';
    if (elem.type === 'image' || key === 'school_stamp' || key === 'school_logo' || key === 'quran_emblem') return 'image';
    return 'text';
  }

  function getElementLabel(key, elem) {
    const labels = {
      ornamental_border: 'الإطار الزخرفي',
      school_logo: 'شعار المدرسة',
      quran_emblem: 'المصحف الشريف',
      student_name: 'اسم الطالب',
      cert_title: 'عنوان الشهادة',
      grade_badge: 'العلامة والتقدير',
      body_text: 'نص التكريم',
      circle_info: 'بيانات الحلقة',
      teacher_info: 'بيانات المعلم',
      school_stamp: 'الختم الرسمي'
    };
    if (labels[key]) return labels[key];
    if (elem && elem.isCustom) {
      if (elem.type === 'text') {
        const t = (elem.text || '').trim();
        return t ? (t.length > 16 ? t.substring(0, 14) + '...' : t) : 'نص إضافي';
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

  function syncElementVisibilityFlags() {
    if (state.elements.ornamental_border) {
      state.showOrnamentalBorder = state.elements.ornamental_border.visible !== false;
    }
    if (state.elements.school_logo) {
      state.showSchoolLogo = state.elements.school_logo.visible !== false;
    }
    if (state.elements.quran_emblem) {
      state.showQuranEmblem = state.elements.quran_emblem.visible !== false;
    }
    if (state.elements.school_stamp) {
      state.showOfficialStamp = state.elements.school_stamp.visible !== false;
    }
  }

  function setSelectedElement(key) {
    const prevKind = getElementKind(state.activeElementKey, state.elements[state.activeElementKey]);
    state.activeElementKey = key || null;
    const nextKind = getElementKind(state.activeElementKey, state.elements[state.activeElementKey]);

    if (nextKind === 'none') {
      if (!['templates', 'add', 'presets'].includes(state.activeTool)) {
        state.activeTool = null;
      }
    } else if (prevKind !== nextKind) {
      // Keep compatible tool open or reset when switching between text <-> image <-> none
      const textTools = ['font', 'size', 'color', 'position', 'format', 'effects'];
      const imageTools = ['size', 'rotate', 'position', 'opacity', 'layer'];
      if (nextKind === 'text' && !textTools.includes(state.activeTool)) state.activeTool = null;
      else if (nextKind === 'image' && !imageTools.includes(state.activeTool)) state.activeTool = null;
      else if (nextKind === 'border' && !['opacity', 'layer'].includes(state.activeTool)) state.activeTool = null;
    }

    highlightActiveHandle();
    renderLayersDrawer();
    renderBottomToolbar();
    renderTray();
  }

  // =========================================================
  // PIXELLAB CONTEXT-AWARE BOTTOM TOOLBAR & TRAY
  // =========================================================
  function renderBottomToolbar() {
    if (!bottomBarEl) return;
    const key = state.activeElementKey;
    const elem = key ? state.elements[key] : null;
    const kind = getElementKind(key, elem);

    bottomBarEl.className = 'px-bottom-bar ' + (kind === 'none' ? 'mode-default' : 'mode-contextual');

    let tools = [];
    if (kind === 'none') {
      tools = [
        { id: 'templates', label: 'القوالب والزخارف', icon: 'palette' },
        { id: 'add', label: 'إضافة نص/عنصر', icon: 'plus-circle' },
        { id: 'students', label: 'الطلاب والدرجات', icon: 'users' },
        { id: 'presets', label: 'حفظ القالب', icon: 'bookmark-plus' }
      ];
    } else if (kind === 'text') {
      tools = [
        { id: 'edit', label: 'تعديل النص', icon: 'edit-3' },
        { id: 'font', label: 'الخط', icon: 'type' },
        { id: 'size', label: 'الحجم', icon: 'sliders-horizontal' },
        { id: 'color', label: 'اللون', icon: 'palette' },
        { id: 'position', label: 'الموقع', icon: 'move' },
        { id: 'format', label: 'التنسيق', icon: 'align-center' },
        { id: 'effects', label: 'المؤثرات', icon: 'sparkles' },
        { id: 'duplicate', label: 'تكرار', icon: 'copy' },
        { id: 'delete', label: 'حذف', icon: 'trash-2', danger: true }
      ];
    } else if (kind === 'image') {
      tools = [
        { id: 'replace_image', label: 'تغيير الصورة', icon: 'image' },
        { id: 'size', label: 'الحجم', icon: 'maximize-2' },
        { id: 'rotate', label: 'التدوير', icon: 'rotate-cw' },
        { id: 'position', label: 'الموقع', icon: 'move' },
        { id: 'opacity', label: 'الشفافية', icon: 'contrast' },
        { id: 'layer', label: 'الطبقة', icon: 'layers' },
        { id: 'delete', label: 'حذف', icon: 'trash-2', danger: true }
      ];
    } else {
      // border
      tools = [
        { id: 'opacity', label: 'الشفافية', icon: 'contrast' },
        { id: 'layer', label: 'الطبقة', icon: 'layers' },
        { id: 'delete', label: 'إخفاء', icon: 'eye-off', danger: true }
      ];
    }

    bottomBarEl.innerHTML = '';
    tools.forEach((tool) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-tool-btn' + (state.activeTool === tool.id ? ' active' : '') + (tool.danger ? ' danger' : '');
      btn.setAttribute('data-tool', tool.id);
      btn.innerHTML = `<i data-lucide="${tool.icon}" style="width:20px; height:20px;"></i><span>${tool.label}</span>`;
      btn.addEventListener('click', () => handleBottomToolClick(tool.id));
      bottomBarEl.appendChild(btn);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ nameAttr: 'data-lucide' });
    }
  }

  function handleBottomToolClick(toolId) {
    if (toolId === 'students') {
      openStudentsModal();
      return;
    }
    if (toolId === 'edit') {
      openQuickTextEditor(state.activeElementKey || 'student_name');
      return;
    }
    if (toolId === 'duplicate') {
      duplicateActiveElement();
      return;
    }
    if (toolId === 'delete') {
      deleteOrHideActiveElement();
      return;
    }
    if (toolId === 'replace_image') {
      const inp = document.getElementById('replaceImageInput');
      if (inp) inp.click();
      return;
    }

    // Toggle contextual tray
    state.activeTool = state.activeTool === toolId ? null : toolId;
    renderBottomToolbar();
    renderTray();
  }

  // --- Contextual Tray Renderer (~56px compact strip above bottom bar) ---
  function renderTray() {
    if (!contextualTrayEl || !trayInnerEl) return;
    const tool = state.activeTool;
    const key = state.activeElementKey;
    const elem = key ? state.elements[key] : null;

    if (!tool) {
      contextualTrayEl.style.display = 'none';
      trayInnerEl.innerHTML = '';
      return;
    }

    // Guard element-specific tools if nothing selected
    const elementTools = ['font', 'size', 'color', 'position', 'format', 'effects', 'rotate', 'opacity', 'layer'];
    if (elementTools.includes(tool) && !elem) {
      state.activeTool = null;
      contextualTrayEl.style.display = 'none';
      trayInnerEl.innerHTML = '';
      return;
    }

    contextualTrayEl.style.display = 'flex';
    trayInnerEl.innerHTML = '';

    if (tool === 'templates') buildTemplatesTray(trayInnerEl);
    else if (tool === 'add') buildAddElementTray(trayInnerEl);
    else if (tool === 'presets') buildPresetsTray(trayInnerEl);
    else if (tool === 'font') buildFontTray(trayInnerEl, elem);
    else if (tool === 'size') buildSizeTray(trayInnerEl, key, elem);
    else if (tool === 'color') buildColorTray(trayInnerEl, elem);
    else if (tool === 'position') buildPositionTray(trayInnerEl, key, elem);
    else if (tool === 'format') buildFormatTray(trayInnerEl, key, elem);
    else if (tool === 'effects') buildEffectsTray(trayInnerEl, key, elem);
    else if (tool === 'rotate') buildRotateTray(trayInnerEl, elem);
    else if (tool === 'opacity') buildOpacityTray(trayInnerEl, key, elem);
    else if (tool === 'layer') buildLayerTray(trayInnerEl);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function buildTemplatesTray(container) {
    const templates = [
      { id: 'academic', name: 'عاجي أكاديمي', bg: 'linear-gradient(135deg,#fafaf9,#e7e5e4)' },
      { id: 'gold', name: 'ذهبي ملكي', bg: 'linear-gradient(135deg,#0f172a,#1e293b)' },
      { id: 'emerald', name: 'زمردي قرآني', bg: 'linear-gradient(135deg,#022c22,#064e3b)' },
      { id: 'navy', name: 'كحلي إمبراطوري', bg: 'linear-gradient(135deg,#091e3a,#1e3a8a)' },
      { id: 'blank', name: 'صفحة فارغة', bg: '#ffffff' }
    ];

    templates.forEach((tpl) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-tpl-chip' + (state.currentTemplate === tpl.id ? ' active' : '');
      btn.innerHTML = `<span class="px-tpl-swatch" style="background:${tpl.bg};"></span><span>${tpl.name}</span>`;
      btn.addEventListener('click', () => {
        applyTemplatePreset(tpl.id);
        renderTray();
        renderLayersDrawer();
        renderCertificate();
        pushHistoryState('تغيير القالب');
      });
      container.appendChild(btn);
    });

    // Custom Background Upload & Remove
    const bgBtn = document.createElement('button');
    bgBtn.type = 'button';
    bgBtn.className = 'px-tray-chip' + (state.currentTemplate === 'custom' ? ' active' : '');
    bgBtn.innerHTML = '<i data-lucide="image-plus" style="width:15px;height:15px;"></i><span>خلفية مخصصة</span>';
    bgBtn.addEventListener('click', () => {
      const inp = document.getElementById('customBgInput');
      if (inp) inp.click();
    });
    container.appendChild(bgBtn);

    if (state.customBgImage) {
      const rmBgBtn = document.createElement('button');
      rmBgBtn.type = 'button';
      rmBgBtn.className = 'px-tray-chip danger';
      rmBgBtn.innerHTML = '<i data-lucide="trash-2" style="width:14px;height:14px;"></i><span>إلغاء الخلفية</span>';
      rmBgBtn.addEventListener('click', () => {
        applyTemplatePreset('academic');
        renderTray();
        renderCertificate();
        pushHistoryState('إزالة الخلفية المخصصة');
      });
      container.appendChild(rmBgBtn);
    }

    const div = document.createElement('div');
    div.className = 'px-tray-divider';
    container.appendChild(div);

    // Quick Decoration Toggles
    const decos = [
      { prop: 'showOrnamentalBorder', elemKey: 'ornamental_border', label: 'الإطار' },
      { prop: 'showSchoolLogo', elemKey: 'school_logo', label: 'الشعار' },
      { prop: 'showQuranEmblem', elemKey: 'quran_emblem', label: 'المصحف' },
      { prop: 'showOfficialStamp', elemKey: 'school_stamp', label: 'الختم' }
    ];

    decos.forEach((d) => {
      const active = Boolean(state[d.prop]);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'px-tray-chip' + (active ? ' active' : '');
      chip.textContent = (active ? '✓ ' : '') + d.label;
      chip.addEventListener('click', () => {
        const nextVal = !state[d.prop];
        state[d.prop] = nextVal;
        if (state.elements[d.elemKey]) {
          state.elements[d.elemKey].visible = nextVal;
        }
        buildDragOverlayHandles();
        renderLayersDrawer();
        renderTray();
        renderCertificate();
        pushHistoryState('تعديل الزخارف');
      });
      container.appendChild(chip);
    });

    // Grade Source Quick Switcher
    const gradeSrcSelect = document.createElement('select');
    gradeSrcSelect.className = 'form-select-sm';
    gradeSrcSelect.style.width = 'auto';
    gradeSrcSelect.style.flexShrink = '0';
    gradeSrcSelect.innerHTML = `
      <option value="all_weighted">المعدل العام</option>
      <option value="exams">الاختبارات فقط</option>
      <option value="sard">السرد والحفظ</option>
    `;
    gradeSrcSelect.value = state.gradeSource || 'all_weighted';
    gradeSrcSelect.addEventListener('change', (e) => {
      state.gradeSource = e.target.value;
      renderCertificate();
      pushHistoryState('تغيير مصدر الدرجات');
    });
    container.appendChild(gradeSrcSelect);
  }

  function buildAddElementTray(container) {
    const addTxtBtn = document.createElement('button');
    addTxtBtn.type = 'button';
    addTxtBtn.className = 'px-tray-chip active';
    addTxtBtn.innerHTML = '<i data-lucide="type" style="width:15px;height:15px;"></i><span>+ نص جديد</span>';
    addTxtBtn.addEventListener('click', () => addCustomText('نص جديد', { openEditor: true }));
    container.appendChild(addTxtBtn);

    const addImgBtn = document.createElement('button');
    addImgBtn.type = 'button';
    addImgBtn.className = 'px-tray-chip';
    addImgBtn.innerHTML = '<i data-lucide="image-plus" style="width:15px;height:15px;"></i><span>+ صورة / ملصق</span>';
    addImgBtn.addEventListener('click', () => {
      const inp = document.getElementById('customStickerInput');
      if (inp) inp.click();
    });
    container.appendChild(addImgBtn);

    const div = document.createElement('div');
    div.className = 'px-tray-divider';
    container.appendChild(div);

    const quickVars = [
      { label: '+ اسم الطالب', tag: '{{اسم_الطالب}}' },
      { label: '+ التقدير', tag: '{{التقدير}}' },
      { label: '+ المعدل', tag: '{{المعدل}}' },
      { label: '+ الحلقة', tag: '{{اسم_الحلقة}}' },
      { label: '+ المعلم', tag: '{{اسم_المعلم}}' },
      { label: '+ التاريخ الهجري', tag: '{{التاريخ_الهجري}}' }
    ];
    quickVars.forEach((v) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-tray-chip';
      btn.textContent = v.label;
      btn.addEventListener('click', () => addCustomText(v.tag, { openEditor: false, toast: `تمت إضافة ${v.label}` }));
      container.appendChild(btn);
    });
  }

  function buildPresetsTray(container) {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'px-inline-input';
    nameInput.placeholder = 'اسم القالب...';
    nameInput.value = 'تصميم البيان ' + (getSavedPresets().length + 1);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'px-tray-chip active';
    saveBtn.innerHTML = '<i data-lucide="bookmark-plus" style="width:15px;height:15px;"></i><span>حفظ</span>';
    saveBtn.addEventListener('click', () => saveNamedPreset(nameInput.value));

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'px-tray-chip danger';
    resetBtn.innerHTML = '<i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i><span>افتراضي</span>';
    resetBtn.addEventListener('click', resetStudioDesign);

    container.appendChild(nameInput);
    container.appendChild(saveBtn);
    container.appendChild(resetBtn);

    const presets = getSavedPresets();
    if (presets.length > 0) {
      const div = document.createElement('div');
      div.className = 'px-tray-divider';
      container.appendChild(div);

      presets.forEach((preset) => {
        const chip = document.createElement('div');
        chip.className = 'px-tray-chip';
        chip.style.gap = '6px';

        const applySpan = document.createElement('span');
        applySpan.textContent = preset.name;
        applySpan.addEventListener('click', async () => {
          await applyDesignSnapshotObj(preset.snapshot);
          pushHistoryState('استرجاع قالب: ' + preset.name);
          showToast('تم تطبيق القالب: ' + preset.name);
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = '×';
        delBtn.style.cssText = 'border:none;background:transparent;color:#dc2626;font-weight:800;font-size:15px;cursor:pointer;padding:0 2px;';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = getSavedPresets().filter((p) => p.id !== preset.id);
          localStorage.setItem(STUDIO_PRESETS_KEY, JSON.stringify(next));
          renderTray();
          showToast('تم حذف القالب');
        });

        chip.appendChild(applySpan);
        chip.appendChild(delBtn);
        container.appendChild(chip);
      });
    }
  }

  function buildFontTray(container, elem) {
    const activeFont = elem.fontFamily || state.fontFamily || 'Amiri';
    const allFonts = [
      ...STUDIO_FONTS,
      ...state.customFonts.map((cf) => ({ value: cf.name, label: cf.label || 'خط مخصص', sub: 'مرفوع' }))
    ];

    allFonts.forEach((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-font-chip' + (activeFont === f.value ? ' active' : '');
      btn.innerHTML = `<strong style="font-family:'${f.value}', serif;">${f.label}</strong><small>${f.sub}</small>`;
      btn.addEventListener('click', () => {
        elem.fontFamily = f.value;
        state.fontFamily = f.value;
        renderTray();
        renderCertificate();
        pushHistoryState('تغيير الخط');
      });
      container.appendChild(btn);
    });

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'px-tray-chip';
    uploadBtn.innerHTML = '<i data-lucide="upload" style="width:14px;height:14px;"></i><span>رفع خط (.ttf)</span>';
    uploadBtn.addEventListener('click', () => {
      const inp = document.getElementById('customFontInput');
      if (inp) inp.click();
    });
    container.appendChild(uploadBtn);
  }

  function buildSizeTray(container, key, elem) {
    const isImage = getElementKind(key, elem) === 'image';
    const min = isImage ? 60 : 18;
    const max = isImage ? 1200 : 260;
    const step = isImage ? 10 : 2;
    const currVal = Math.round(isImage ? (elem.width || elem.size || 200) : (elem.size || 60));

    const wrap = document.createElement('div');
    wrap.className = 'px-slider-row';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'px-step-btn';
    minusBtn.textContent = '−';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'px-range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = currVal;

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'px-step-btn';
    plusBtn.textContent = '+';

    const badge = document.createElement('span');
    badge.className = 'px-val-badge';
    badge.textContent = `${currVal}px`;

    const applySize = (val, commit = false) => {
      const clamped = Math.max(min, Math.min(max, Math.round(val)));
      if (isImage && elem.type === 'image' && key !== 'school_stamp') {
        const aspect = (elem.width && elem.height) ? (elem.width / elem.height) : 1;
        elem.width = clamped;
        elem.height = Math.max(40, Math.round(clamped / aspect));
        elem.size = Math.max(elem.width, elem.height);
      } else {
        elem.size = clamped;
        if (key === 'school_stamp') {
          elem.width = clamped;
          elem.height = clamped;
        }
      }
      slider.value = clamped;
      badge.textContent = `${clamped}px`;
      syncHandlePosition(key);
      scheduleCanvasDraw();
      if (commit) {
        renderCertificate();
        pushHistoryState('تعديل الحجم');
      }
    };

    slider.addEventListener('input', (e) => applySize(Number(e.target.value), false));
    slider.addEventListener('change', (e) => applySize(Number(e.target.value), true));
    minusBtn.addEventListener('click', () => applySize(Number(slider.value) - step, true));
    plusBtn.addEventListener('click', () => applySize(Number(slider.value) + step, true));

    wrap.appendChild(minusBtn);
    wrap.appendChild(slider);
    wrap.appendChild(plusBtn);
    wrap.appendChild(badge);
    container.appendChild(wrap);
  }

  function buildColorTray(container, elem) {
    const currentColor = String(elem.color || state.primaryColor || '#1B3A4B').toUpperCase();

    STUDIO_COLORS.forEach((c) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'px-color-dot' + (currentColor === c.hex.toUpperCase() ? ' active' : '');
      dot.style.background = c.hex;
      dot.title = c.name;
      dot.addEventListener('click', () => {
        applyTextColor(c.hex, true);
        renderTray();
      });
      container.appendChild(dot);
    });

    const pickerWrap = document.createElement('label');
    pickerWrap.className = 'px-color-picker-btn';
    pickerWrap.title = 'لون مخصص';
    pickerWrap.innerHTML = '<i data-lucide="pipette" style="width:15px;height:15px;"></i>';
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = (elem.color && elem.color.startsWith('#') && elem.color.length === 7) ? elem.color : '#1B3A4B';
    inp.addEventListener('input', (e) => applyTextColor(e.target.value, false));
    inp.addEventListener('change', () => {
      pushHistoryState('تغيير اللون');
      renderTray();
    });
    pickerWrap.appendChild(inp);
    container.appendChild(pickerWrap);
  }

  function bindHoldNudge(btn, dx, dy, key, elem, coordsBadge) {
    let timer = null;
    let holdTimeout = null;
    let changed = false;

    const step = () => {
      if (elem.locked) return;
      elem.x = Math.round(Math.max(3, Math.min(97, elem.x + dx)) * 10) / 10;
      elem.y = Math.round(Math.max(3, Math.min(97, elem.y + dy)) * 10) / 10;
      changed = true;
      if (coordsBadge) coordsBadge.textContent = `${elem.x}%, ${elem.y}%`;
      syncHandlePosition(key);
      scheduleCanvasDraw();
    };

    const stop = () => {
      if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
      if (timer) { clearInterval(timer); timer = null; }
      if (changed) {
        changed = false;
        renderCertificate();
        pushHistoryState('تحريك دقيق');
      }
    };

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      step();
      holdTimeout = setTimeout(() => {
        timer = setInterval(step, 55);
      }, 220);
    });
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('pointerleave', stop);
  }

  function buildPositionTray(container, key, elem) {
    const dpad = document.createElement('div');
    dpad.className = 'px-dpad-group';

    const coordsBadge = document.createElement('span');
    coordsBadge.className = 'px-val-badge';
    coordsBadge.style.minWidth = '72px';
    coordsBadge.textContent = `${elem.x}%, ${elem.y}%`;

    const arrows = [
      { icon: 'arrow-up', dx: 0, dy: -0.4, title: 'أعلى' },
      { icon: 'arrow-down', dx: 0, dy: 0.4, title: 'أسفل' },
      { icon: 'arrow-right', dx: 0.4, dy: 0, title: 'يمين' },
      { icon: 'arrow-left', dx: -0.4, dy: 0, title: 'يسار' }
    ];

    arrows.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-dpad-btn';
      btn.title = a.title;
      btn.innerHTML = `<i data-lucide="${a.icon}" style="width:16px;height:16px;"></i>`;
      bindHoldNudge(btn, a.dx, a.dy, key, elem, coordsBadge);
      dpad.appendChild(btn);
    });

    container.appendChild(dpad);

    const div = document.createElement('div');
    div.className = 'px-tray-divider';
    container.appendChild(div);

    const centerH = document.createElement('button');
    centerH.type = 'button';
    centerH.className = 'px-tray-chip';
    centerH.innerHTML = '<i data-lucide="align-center-horizontal" style="width:14px;height:14px;"></i><span>توسيط أفقي</span>';
    centerH.addEventListener('click', () => {
      elem.x = 50;
      coordsBadge.textContent = `${elem.x}%, ${elem.y}%`;
      updateSnapGuides(true, false);
      setTimeout(() => updateSnapGuides(false, false), 650);
      renderCertificate();
      pushHistoryState('توسيط أفقي');
    });

    const centerV = document.createElement('button');
    centerV.type = 'button';
    centerV.className = 'px-tray-chip';
    centerV.innerHTML = '<i data-lucide="align-center-vertical" style="width:14px;height:14px;"></i><span>توسيط رأسي</span>';
    centerV.addEventListener('click', () => {
      elem.y = 50;
      coordsBadge.textContent = `${elem.x}%, ${elem.y}%`;
      updateSnapGuides(false, true);
      setTimeout(() => updateSnapGuides(false, false), 650);
      renderCertificate();
      pushHistoryState('توسيط رأسي');
    });

    container.appendChild(centerH);
    container.appendChild(centerV);
    container.appendChild(coordsBadge);
  }

  function buildFormatTray(container, key, elem) {
    const aligns = [
      { id: 'right', icon: 'align-right', title: 'يمين' },
      { id: 'center', icon: 'align-center', title: 'وسط' },
      { id: 'left', icon: 'align-left', title: 'يسار' }
    ];
    aligns.forEach((al) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-dpad-btn' + ((elem.align || 'center') === al.id ? ' active' : '');
      if ((elem.align || 'center') === al.id) {
        btn.style.borderColor = 'var(--cert-primary)';
        btn.style.color = 'var(--cert-primary)';
        btn.style.background = 'var(--cert-primary-light)';
      }
      btn.title = al.title;
      btn.innerHTML = `<i data-lucide="${al.icon}" style="width:16px;height:16px;"></i>`;
      btn.addEventListener('click', () => {
        elem.align = al.id;
        renderTray();
        renderCertificate();
        pushHistoryState('تغيير المحاذاة');
      });
      container.appendChild(btn);
    });

    const boldBtn = document.createElement('button');
    boldBtn.type = 'button';
    boldBtn.className = 'px-tray-chip' + (elem.isBold !== false && (elem.isBold || key === 'cert_title' || key === 'student_name') ? ' active' : '');
    boldBtn.innerHTML = '<i data-lucide="bold" style="width:14px;height:14px;"></i><span>عريض</span>';
    boldBtn.addEventListener('click', () => {
      elem.isBold = !elem.isBold;
      renderTray();
      renderCertificate();
      pushHistoryState('تبديل السماكة');
    });
    container.appendChild(boldBtn);

    const div = document.createElement('div');
    div.className = 'px-tray-divider';
    container.appendChild(div);

    const lhLabel = document.createElement('span');
    lhLabel.style.cssText = 'font-size:0.72rem;font-weight:700;white-space:nowrap;';
    lhLabel.textContent = 'تباعد الأسطر:';

    const defaultLh = key === 'body_text' ? 1.65 : 1.3;
    const lhVal = Number(elem.lineHeight || defaultLh);

    const lhSlider = document.createElement('input');
    lhSlider.type = 'range';
    lhSlider.className = 'px-range';
    lhSlider.style.minWidth = '85px';
    lhSlider.min = '1.0';
    lhSlider.max = '2.4';
    lhSlider.step = '0.05';
    lhSlider.value = lhVal;

    const lhBadge = document.createElement('span');
    lhBadge.className = 'px-val-badge';
    lhBadge.textContent = lhVal.toFixed(2);

    lhSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      elem.lineHeight = v;
      lhBadge.textContent = v.toFixed(2);
      syncHandlePosition(key);
      scheduleCanvasDraw();
    });
    lhSlider.addEventListener('change', () => {
      renderCertificate();
      pushHistoryState('تعديل تباعد الأسطر');
    });

    container.appendChild(lhLabel);
    container.appendChild(lhSlider);
    container.appendChild(lhBadge);
  }

  function buildEffectsTray(container, key, elem) {
    // 1. Stroke Toggle & Width + Color
    const strokeBtn = document.createElement('button');
    strokeBtn.type = 'button';
    strokeBtn.className = 'px-tray-chip' + (elem.strokeEnabled ? ' active' : '');
    strokeBtn.textContent = elem.strokeEnabled ? '✓ حد خارجي' : 'حد خارجي';
    strokeBtn.addEventListener('click', () => {
      elem.strokeEnabled = !elem.strokeEnabled;
      if (elem.strokeEnabled && !elem.strokeWidth) elem.strokeWidth = 4;
      renderTray();
      renderCertificate();
      pushHistoryState('تعديل الحد الخارجي');
    });
    container.appendChild(strokeBtn);

    if (elem.strokeEnabled) {
      const swSlider = document.createElement('input');
      swSlider.type = 'range';
      swSlider.className = 'px-range';
      swSlider.style.minWidth = '65px';
      swSlider.min = '1';
      swSlider.max = '16';
      swSlider.step = '1';
      swSlider.value = elem.strokeWidth || 4;
      swSlider.addEventListener('input', (e) => {
        elem.strokeWidth = Number(e.target.value);
        scheduleCanvasDraw();
      });
      swSlider.addEventListener('change', () => pushHistoryState('سمك الحد'));

      const scPicker = document.createElement('label');
      scPicker.className = 'px-color-picker-btn';
      scPicker.style.background = elem.strokeColor || '#ffffff';
      scPicker.title = 'لون الحد الخارجي';
      const scInp = document.createElement('input');
      scInp.type = 'color';
      scInp.value = elem.strokeColor || '#ffffff';
      scInp.addEventListener('input', (e) => {
        elem.strokeColor = e.target.value;
        scPicker.style.background = e.target.value;
        scheduleCanvasDraw();
      });
      scInp.addEventListener('change', () => pushHistoryState('لون الحد'));
      scPicker.appendChild(scInp);

      container.appendChild(swSlider);
      container.appendChild(scPicker);
    }

    const div1 = document.createElement('div');
    div1.className = 'px-tray-divider';
    container.appendChild(div1);

    // 2. Shadow Toggle & Blur
    const shadowBtn = document.createElement('button');
    shadowBtn.type = 'button';
    shadowBtn.className = 'px-tray-chip' + (elem.shadowEnabled ? ' active' : '');
    shadowBtn.textContent = elem.shadowEnabled ? '✓ ظل النص' : 'ظل النص';
    shadowBtn.addEventListener('click', () => {
      elem.shadowEnabled = !elem.shadowEnabled;
      if (elem.shadowEnabled && !elem.shadowBlur) elem.shadowBlur = 12;
      renderTray();
      renderCertificate();
      pushHistoryState('تعديل ظل النص');
    });
    container.appendChild(shadowBtn);

    if (elem.shadowEnabled) {
      const shSlider = document.createElement('input');
      shSlider.type = 'range';
      shSlider.className = 'px-range';
      shSlider.style.minWidth = '65px';
      shSlider.min = '2';
      shSlider.max = '32';
      shSlider.step = '2';
      shSlider.value = elem.shadowBlur || 12;
      shSlider.addEventListener('input', (e) => {
        elem.shadowBlur = Number(e.target.value);
        scheduleCanvasDraw();
      });
      shSlider.addEventListener('change', () => pushHistoryState('حجم الظل'));
      container.appendChild(shSlider);
    }

    const div2 = document.createElement('div');
    div2.className = 'px-tray-divider';
    container.appendChild(div2);

    // 3. Opacity
    buildOpacityTray(container, key, elem, true);
  }

  function buildRotateTray(container, elem) {
    const rot = Math.round(elem.rotation || 0);

    const left15 = document.createElement('button');
    left15.type = 'button';
    left15.className = 'px-step-btn';
    left15.textContent = '↺';
    left15.title = '-15°';
    left15.addEventListener('click', () => {
      rotateActiveElementTo((elem.rotation || 0) - 15, true);
      renderTray();
    });

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'px-range';
    slider.min = '-180';
    slider.max = '180';
    slider.step = '1';
    slider.value = rot;

    const right15 = document.createElement('button');
    right15.type = 'button';
    right15.className = 'px-step-btn';
    right15.textContent = '↻';
    right15.title = '+15°';
    right15.addEventListener('click', () => {
      rotateActiveElementTo((elem.rotation || 0) + 15, true);
      renderTray();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'px-val-badge';
    resetBtn.style.cssText = 'border:1px solid var(--cert-border);background:var(--cert-surface-alt);border-radius:6px;padding:4px 6px;cursor:pointer;';
    resetBtn.textContent = `${rot}°`;
    resetBtn.title = 'إعادة إلى 0°';
    resetBtn.addEventListener('click', () => {
      rotateActiveElementTo(0, true);
      renderTray();
    });

    slider.addEventListener('input', (e) => {
      const deg = Number(e.target.value);
      rotateActiveElementTo(deg, false);
      resetBtn.textContent = `${deg}°`;
    });
    slider.addEventListener('change', () => pushHistoryState('تعديل الدوران'));

    container.appendChild(left15);
    container.appendChild(slider);
    container.appendChild(right15);
    container.appendChild(resetBtn);
  }

  function buildOpacityTray(container, key, elem, compact = false) {
    const opPct = Math.round((elem.opacity !== undefined ? elem.opacity : 1) * 100);
    const label = document.createElement('span');
    label.style.cssText = 'font-size:0.72rem;font-weight:700;white-space:nowrap;';
    label.textContent = 'الشفافية:';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'px-range';
    if (compact) slider.style.minWidth = '75px';
    slider.min = '10';
    slider.max = '100';
    slider.step = '5';
    slider.value = opPct;

    const badge = document.createElement('span');
    badge.className = 'px-val-badge';
    badge.textContent = `${opPct}%`;

    slider.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      elem.opacity = Math.max(0.1, Math.min(1, pct / 100));
      badge.textContent = `${pct}%`;
      scheduleCanvasDraw();
    });
    slider.addEventListener('change', () => pushHistoryState('تعديل الشفافية'));

    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(badge);
  }

  function buildLayerTray(container) {
    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'px-tray-chip';
    upBtn.innerHTML = '<i data-lucide="arrow-up" style="width:15px;height:15px;"></i><span>تقديم للأمام</span>';
    upBtn.addEventListener('click', () => moveActiveElementLayer(1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'px-tray-chip';
    downBtn.innerHTML = '<i data-lucide="arrow-down" style="width:15px;height:15px;"></i><span>تأخير للخلف</span>';
    downBtn.addEventListener('click', () => moveActiveElementLayer(-1));

    const openDrawerBtn = document.createElement('button');
    openDrawerBtn.type = 'button';
    openDrawerBtn.className = 'px-tray-chip active';
    openDrawerBtn.innerHTML = '<i data-lucide="layers" style="width:15px;height:15px;"></i><span>لوحة الطبقات</span>';
    openDrawerBtn.addEventListener('click', () => toggleLayersDrawer(true));

    container.appendChild(upBtn);
    container.appendChild(downBtn);
    container.appendChild(openDrawerBtn);
  }

  // =========================================================
  // SLIDE-OVER LAYERS DRAWER (40% Width + Drag Reorder + Lock + Eye)
  // =========================================================
  function setupLayersDrawer() {
    const btn = document.getElementById('layersDrawerBtn');
    const closeBtn = document.getElementById('closeLayersDrawerBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLayersDrawer();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => toggleLayersDrawer(false));
    }
  }

  function toggleLayersDrawer(forceState) {
    const drawer = document.getElementById('layersDrawer');
    const btn = document.getElementById('layersDrawerBtn');
    state.layersDrawerOpen = typeof forceState === 'boolean' ? forceState : !state.layersDrawerOpen;
    if (drawer) drawer.classList.toggle('open', state.layersDrawerOpen);
    if (btn) {
      btn.classList.toggle('active', state.layersDrawerOpen);
      btn.setAttribute('aria-expanded', String(state.layersDrawerOpen));
    }
  }

  function renderLayersDrawer() {
    const layersWrap = document.getElementById('layersListContainer');
    const countBadge = document.getElementById('layersCountBadge');
    if (!layersWrap) return;

    const topFirstKeys = [...getSortedElementKeys()].reverse();
    if (countBadge) countBadge.textContent = String(topFirstKeys.length);

    layersWrap.innerHTML = '';
    topFirstKeys.forEach((k) => {
      const el = state.elements[k];
      if (!el) return;

      const row = document.createElement('div');
      row.className = 'layer-row' +
        (state.activeElementKey === k ? ' active' : '') +
        (el.visible === false ? ' is-hidden' : '');
      row.setAttribute('data-layer-key', k);

      // 1. Drag Grip Handle for Z-Index Reorder
      const grip = document.createElement('div');
      grip.className = 'layer-drag-handle';
      grip.title = 'اسحب لإعادة ترتيب الطبقة';
      grip.innerHTML = '<i data-lucide="grip-vertical" style="width:14px;height:14px;"></i>';
      attachLayerReorderDrag(grip, row, layersWrap);

      // 2. Layer Name (Click to Select)
      const nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'layer-name-btn';
      nameBtn.textContent = getElementLabel(k, el);
      nameBtn.addEventListener('click', () => {
        setSelectedElement(k);
      });

      // 3. Lock / Unlock Button
      const lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = 'layer-icon-action' + (el.locked ? ' locked' : '');
      lockBtn.title = el.locked ? 'فتح قفل الطبقة' : 'قفل الطبقة لمنع التحريك بالخطأ';
      lockBtn.innerHTML = el.locked
        ? '<i data-lucide="lock" style="width:13px;height:13px;"></i>'
        : '<i data-lucide="unlock" style="width:13px;height:13px;"></i>';
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.locked = !el.locked;
        if (el.locked && state.activeElementKey === k && el.type === 'border') {
          state.activeElementKey = null;
        }
        buildDragOverlayHandles();
        renderLayersDrawer();
        renderBottomToolbar();
        renderTray();
        pushHistoryState(el.locked ? 'قفل طبقة' : 'فتح قفل طبقة');
        showToast(el.locked ? `تم قفل ${getElementLabel(k, el)}` : `تم فتح قفل ${getElementLabel(k, el)}`);
      });

      // 4. Show / Hide Eye Button
      const visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = 'layer-icon-action' + (el.visible !== false ? ' visible' : '');
      visBtn.title = el.visible !== false ? 'إخفاء العنصر' : 'إظهار العنصر';
      visBtn.innerHTML = el.visible !== false
        ? '<i data-lucide="eye" style="width:14px;height:14px;"></i>'
        : '<i data-lucide="eye-off" style="width:14px;height:14px;"></i>';
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.visible = el.visible === false;
        syncElementVisibilityFlags();
        if (!el.visible && state.activeElementKey === k) {
          state.activeElementKey = null;
        }
        buildDragOverlayHandles();
        renderLayersDrawer();
        renderBottomToolbar();
        renderTray();
        renderCertificate();
        pushHistoryState('تبديل ظهور الطبقة');
      });

      row.appendChild(grip);
      row.appendChild(nameBtn);
      row.appendChild(lockBtn);
      row.appendChild(visBtn);
      layersWrap.appendChild(row);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function attachLayerReorderDrag(grip, row, listContainer) {
    let dragging = false;
    let moved = false;

    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      moved = false;
      row.classList.add('dragging-layer');
      listContainer.style.overflowY = 'hidden';
      try { grip.setPointerCapture(e.pointerId); } catch (err) {}
    });

    grip.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const rows = [...listContainer.querySelectorAll('.layer-row')];
      for (const other of rows) {
        if (other === row) continue;
        const rect = other.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY && row.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_PRECEDING) {
          listContainer.insertBefore(row, other);
          moved = true;
          break;
        } else if (e.clientY > midY && row.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) {
          listContainer.insertBefore(row, other.nextSibling);
          moved = true;
          break;
        }
      }
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      row.classList.remove('dragging-layer');
      listContainer.style.overflowY = 'auto';
      try {
        if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (moved) {
        // Top row in list = highest zIndex
        const orderedRows = [...listContainer.querySelectorAll('.layer-row')];
        const total = orderedRows.length;
        orderedRows.forEach((r, idx) => {
          const key = r.getAttribute('data-layer-key');
          if (state.elements[key]) {
            state.elements[key].zIndex = (total - idx) * 10;
          }
        });
        buildDragOverlayHandles();
        renderCertificate();
        pushHistoryState('إعادة ترتيب الطبقات');
      }
    };

    grip.addEventListener('pointerup', endDrag);
    grip.addEventListener('pointercancel', endDrag);
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
    const tmp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = tmp;
    sorted.forEach((k, i) => {
      if (state.elements[k]) state.elements[k].zIndex = (i + 1) * 10;
    });
    buildDragOverlayHandles();
    renderLayersDrawer();
    renderCertificate();
    pushHistoryState('تغيير ترتيب الطبقات');
  }

  // --- File Inputs Setup ---
  function setupFileInputs() {
    const customBgInput = document.getElementById('customBgInput');
    if (customBgInput) {
      customBgInput.addEventListener('change', handleCustomBgUpload);
    }

    const customStickerInput = document.getElementById('customStickerInput');
    if (customStickerInput) {
      customStickerInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          addCustomImage(file);
          customStickerInput.value = '';
        }
      });
    }

    const replaceImageInput = document.getElementById('replaceImageInput');
    if (replaceImageInput) {
      replaceImageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          replaceActiveElementImage(file);
          replaceImageInput.value = '';
        }
      });
    }

    const customFontInput = document.getElementById('customFontInput');
    if (customFontInput) {
      customFontInput.addEventListener('change', handleCustomFontUpload);
    }
  }

  function handleCustomBgUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        state.customBgImage = img;
        state.customBgDataUrl = dataUrl;
        state.currentTemplate = 'custom';
        renderTray();
        renderCertificate();
        pushHistoryState('رفع خلفية مخصصة');
        showToast('تم تحميل الخلفية المخصصة بنجاح');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function replaceActiveElementImage(file) {
    const key = state.activeElementKey;
    const elem = key ? state.elements[key] : null;
    if (!elem || getElementKind(key, elem) !== 'image') return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        elem.img = img;
        elem.imgElement = img;
        elem.imgDataUrl = dataUrl;
        if (img.width && img.height) {
          const aspect = img.width / img.height;
          const baseW = elem.width || elem.size || 240;
          elem.width = baseW;
          elem.height = Math.max(40, Math.round(baseW / aspect));
          elem.size = Math.max(elem.width, elem.height);
        }
        buildDragOverlayHandles();
        renderCertificate();
        pushHistoryState('تغيير الصورة');
        showToast('تم استبدال الصورة بنجاح');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // --- Templates & Presets ---
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

    if (state.elements.ornamental_border) state.elements.ornamental_border.visible = state.showOrnamentalBorder;
    if (state.elements.school_logo) state.elements.school_logo.visible = state.showSchoolLogo;
    if (state.elements.quran_emblem) state.elements.quran_emblem.visible = state.showQuranEmblem;
    if (state.elements.school_stamp) state.elements.school_stamp.visible = state.showOfficialStamp;

    if (tplKey !== 'blank') {
      ['cert_title', 'student_name', 'grade_badge', 'body_text', 'circle_info', 'teacher_info', 'school_stamp'].forEach((k) => {
        if (state.elements[k]) state.elements[k].visible = true;
      });
    }
    buildDragOverlayHandles();
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
      if (!dataUrl) { resolve(null); return; }
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
        // Ensure new structural layers exist even on older drafts
        ['ornamental_border', 'school_logo', 'quran_emblem'].forEach((sysKey) => {
          if (!snap.elements[sysKey] && defaults[sysKey]) {
            rebuilt[sysKey] = { ...defaults[sysKey] };
            if (sysKey === 'ornamental_border') rebuilt[sysKey].visible = state.showOrnamentalBorder;
            if (sysKey === 'school_logo') rebuilt[sysKey].visible = state.showSchoolLogo;
            if (sysKey === 'quran_emblem') rebuilt[sysKey].visible = state.showQuranEmblem;
          }
        });

        for (const k of Object.keys(snap.elements)) {
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
            zIndex: item.zIndex !== undefined ? Number(item.zIndex) : 50,
            locked: item.locked !== undefined ? Boolean(item.locked) : (k === 'ornamental_border')
          };
          if (item.imgDataUrl) {
            const loadedImg = await loadImageFromDataUrl(item.imgDataUrl);
            rebuilt[k].imgElement = loadedImg;
            rebuilt[k].img = loadedImg;
          }
        }
        state.elements = rebuilt;
      }

      syncElementVisibilityFlags();
      syncCustomElementIdCounter();

      if (state.activeElementKey && !state.elements[state.activeElementKey]) {
        state.activeElementKey = null;
      }

      buildDragOverlayHandles();
      renderLayersDrawer();
      renderBottomToolbar();
      renderTray();
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

  function saveNamedPreset(customName) {
    const clean = String(customName || '').trim() || ('تصميم مدرسة البيان ' + (getSavedPresets().length + 1));
    const presets = getSavedPresets();
    const snapshot = buildDesignSnapshotObj();
    presets.unshift({
      id: 'preset_' + Date.now().toString(36),
      name: clean,
      savedAt: new Date().toISOString(),
      snapshot
    });
    try {
      localStorage.setItem(STUDIO_PRESETS_KEY, JSON.stringify(presets.slice(0, 12)));
      renderTray();
      showToast('تم حفظ التصميم في القوالب الجاهزة');
    } catch (e) {
      showToast('تعذر حفظ القالب: مساحة التخزين ممتلئة');
    }
  }

  async function resetStudioDesign() {
    try { localStorage.removeItem(STUDIO_DRAFT_KEY); } catch (e) {}
    state.elements = createDefaultElements();
    state.fontFamily = 'Amiri';
    state.title = 'شَهَادَةُ شُكْرٍ وَتَقْدِير';
    state.bodyText = 'تَسُرُّ إدارة مدرسة البيان لتعليم القرآن الكريم أن تمنح هذه الشهادة للطالب المبارك تقديراً لاجتهاده وتميزه ومواظبته على حفظ كتاب الله وسنة رسوله، سائلين الله تعالى أن يجعله من أهل القرآن الذين هم أهل الله وخاصته.';
    state.gradeSource = 'all_weighted';
    state.activeElementKey = null;
    applyTemplatePreset('academic');
    renderLayersDrawer();
    renderBottomToolbar();
    renderTray();
    renderCertificate();
    pushHistoryState('إعادة التصميم الافتراضي');
    showToast('تمت استعادة التصميم الافتراضي بنجاح');
  }

  // --- Smart Variables Engine ---
  function formatMentions(text, studentObj) {
    if (!text) return '';
    const student = studentObj || (state.students && state.students[state.currentStudentIndex]) || {};

    const today = new Date();
    const gregDate = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const gregYear = today.getFullYear();

    let hijriDate = '';
    let hijriYearNum = 1447;
    try {
      hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(today);
      if (window.HijriDate && typeof window.HijriDate.getCurrentHijriYear === 'function') {
        hijriYearNum = window.HijriDate.getCurrentHijriYear();
      } else {
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

    const sName = student.name || (student.isDemo ? 'عبد الله بن محمد الأهدل' : 'طالب غير محدد');
    const sCode = student.student_code || (student.id ? `STD-${String(student.id).padStart(4, '0')}` : (student.isDemo ? 'STD-0042' : ''));
    const sCircle = student.circle_name || (student.isDemo ? 'حلقة البيان القرآنية' : '—');
    const sTeacher = student.teacher_name || (student.isDemo ? 'الشيخ عبد الرحمن' : '—');

    const activeStudentId = student.id !== undefined && student.id !== null ? String(student.id).trim() : '';
    let activeGrade = null;
    if (Array.isArray(student.linked_grades) && student.linked_grades.length > 0) {
      const wantedKey = student.selectedGradeKey || 'summary';
      const candidate = student.linked_grades.find((g) => g.gradeKey === wantedKey) || student.linked_grades[0];
      if (candidate && String(candidate.sourceStudentId) === activeStudentId) {
        activeGrade = candidate;
      }
    }

    const gradeExamPct = activeGrade && hasNumeric(activeGrade.exam_percent)
      ? Math.round(Number(activeGrade.exam_percent))
      : (hasNumeric(student.exam_percent) ? Math.round(Number(student.exam_percent)) : null);
    const gradeSardPages = activeGrade && hasNumeric(activeGrade.sard_pages)
      ? Math.round(Number(activeGrade.sard_pages))
      : (hasNumeric(student.sard_pages) ? Math.round(Number(student.sard_pages)) : null);
    const gradeAttRate = activeGrade && hasNumeric(activeGrade.attendance_rate)
      ? Math.round(Number(activeGrade.attendance_rate))
      : (hasNumeric(student.attendance_rate) ? Math.round(Number(student.attendance_rate)) : null);

    let finalPct = null;
    if (activeGrade && activeGrade.type === 'exam' && gradeExamPct !== null) {
      finalPct = gradeExamPct;
    } else if (state.gradeSource === 'exams' && gradeExamPct !== null) {
      finalPct = gradeExamPct;
    } else if (state.gradeSource === 'sard' && gradeSardPages !== null && gradeSardPages > 0) {
      finalPct = Math.min(100, Math.round((gradeSardPages / 30) * 100));
    } else if (gradeExamPct !== null) {
      finalPct = gradeExamPct;
    }

    const noGradeText = student.isDemo ? '98%' : 'غير مرصود';
    const noRatingText = student.isDemo ? 'ممتاز مرتفع' : 'غير مرصود';

    const sFinal = (activeGrade && activeGrade.grade_badge)
      ? activeGrade.grade_badge
      : (student.final_grade || student.grade_badge || (finalPct !== null ? `${finalPct}%` : (gradeSardPages !== null && gradeSardPages > 0 ? `${gradeSardPages} وجهاً` : noGradeText)));
    const sTerm1 = student.term_1_grade || (gradeExamPct !== null ? `${gradeExamPct}%` : (student.isDemo ? '95%' : 'غير مرصود'));
    const sTerm2 = student.term_2_grade || (gradeExamPct !== null ? `${gradeExamPct}%` : (student.isDemo ? '98%' : 'غير مرصود'));
    const sMonth = (activeGrade && activeGrade.type === 'record' && activeGrade.grade_badge)
      ? activeGrade.grade_badge
      : (student.month_grade || (gradeExamPct !== null ? `${gradeExamPct}%` : (student.isDemo ? '100%' : 'غير مرصود')));
    const sRating = (activeGrade && activeGrade.rating)
      ? activeGrade.rating
      : (student.rating || student.grade_label || (finalPct !== null ? computeRating(finalPct) : noRatingText));
    const sSard = gradeSardPages !== null
      ? `${gradeSardPages} وجهاً`
      : (student.sard_pages ? String(student.sard_pages) : '٠ وجهاً');
    const sAtt = gradeAttRate !== null
      ? `${gradeAttRate}%`
      : (student.attendance_rate ? (String(student.attendance_rate).includes('%') ? student.attendance_rate : `${student.attendance_rate}%`) : (student.isDemo ? '100%' : 'غير مرصود'));
    const sMemo = (activeGrade && activeGrade.memo_grade) || student.memo_grade || (student.isDemo ? 'ممتاز' : 'غير مرصود');
    const sRev = (activeGrade && activeGrade.rev_grade) || student.rev_grade || (student.isDemo ? 'ممتاز' : 'غير مرصود');
    const sAchievement = student.achievement_text || (gradeSardPages !== null && gradeSardPages > 0
      ? `إتمام سرد وتسميع ${gradeSardPages} وجهاً من القرآن الكريم بإتقان وتفوق`
      : 'الاجتهاد والمواظبة في حلقة تحفيظ القرآن الكريم بإتقان وتفوق');
    const sDirector = 'إدارة مدرسة البيان';
    const sSchool = 'مدرسة البيان لتعليم القرآن الكريم';
    const sYear = `${toArabicDigits(hijriYearNum)} هـ / ${toArabicDigits(gregYear)} م`;

    function resolveKey(rawKey) {
      if (!rawKey) return '';
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

      if (norm.includes('رقم') || norm.includes('كود') || norm.includes('قيد') || norm.includes('code') || norm.includes('id')) return sCode;
      if (norm.includes('حضور') || norm.includes('مواظب') || norm.includes('غياب') || norm.includes('attendance')) return sAtt;
      if ((norm.includes('فصل') || norm.includes('ترم') || norm.includes('term')) && (norm.includes('اول') || norm.includes('1') || norm.includes('الاول'))) return sTerm1;
      if ((norm.includes('فصل') || norm.includes('ترم') || norm.includes('term')) && (norm.includes('ثان') || norm.includes('2') || norm.includes('الثاني'))) return sTerm2;
      if (norm.includes('شهر') || norm.includes('month')) return sMonth;
      if (norm.includes('سرد') || norm.includes('اوجه') || norm.includes('صفحات') || norm.includes('sard')) return sSard;
      if (norm.includes('حفظ') || norm.includes('memo') || norm.includes('تسميع')) return sMemo;
      if (norm.includes('مراجع') || norm.includes('rev')) return sRev;
      if (norm.includes('انجاز') || norm.includes('تكريم') || norm.includes('achievement') || norm.includes('honor')) return sAchievement;
      if (norm.includes('هجر') || norm.includes('hijri')) return hijriDate;
      if (norm.includes('ميلاد') || norm.includes('تاريخ') || norm.includes('date') || norm.includes('gregorian')) return gregDate;
      if (norm.includes('عام') || norm.includes('سنه') || norm.includes('دراسي') || norm.includes('year')) return sYear;
      if (norm.includes('حلق') || norm.includes('circle')) return sCircle;
      if (norm.includes('معلم') || norm.includes('شيخ') || norm.includes('استاذ') || norm.includes('teacher')) return sTeacher;
      if (norm.includes('مدير') || norm.includes('اداره') || norm.includes('director')) return sDirector;
      if (norm.includes('مدرس') || norm.includes('مركز') || norm.includes('school')) return sSchool;
      if (norm.includes('تقدير') || norm.includes('تقييم') || norm.includes('مستوي') || norm.includes('rating') || norm.includes('level')) return sRating;
      if (norm.includes('طالب') || norm === 'اسم' || norm === 'الاسم' || norm === 'name' || norm === 'student' || norm === 'student name' || norm === 'student_name') return sName;
      if (norm.includes('نهائي') || norm.includes('علام') || norm.includes('درج') || norm.includes('نسب') || norm.includes('معدل') || norm.includes('grade') || norm.includes('score') || norm.includes('percent') || norm.includes('نتيج')) return sFinal;

      return '';
    }

    let result = String(text);
    result = result.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/\[\s*([^\[\]]+?)\s*\]/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/\{([^{}]+?)\}/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/[«»]\s*([^«»]+?)\s*[«»]/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/<<\s*([^<>]+?)\s*>>/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/@([\u0600-\u06FFa-zA-Z0-9_]+)/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/%([\u0600-\u06FFa-zA-Z0-9_]+)%/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });
    result = result.replace(/\$([\u0600-\u06FFa-zA-Z0-9_]+)/g, (m, p1) => { const v = resolveKey(p1); return v !== '' ? v : m; });

    return result;
  }

  // --- Text Editor Modal ---
  function setupTextEditModal() {
    const modal = document.getElementById('textEditModal');
    const closeBtn = document.getElementById('closeTextEditModalBtn');
    const cancelBtn = document.getElementById('cancelQuickEditTextBtn');
    const saveBtn = document.getElementById('saveQuickEditTextBtn');
    const textarea = document.getElementById('quickEditTextInput');

    if (closeBtn) closeBtn.addEventListener('click', closeQuickTextEditor);
    if (cancelBtn) cancelBtn.addEventListener('click', closeQuickTextEditor);
    if (saveBtn) saveBtn.addEventListener('click', saveQuickEditText);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQuickTextEditor();
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

  function openQuickTextEditor(targetKey) {
    const key = targetKey || state.activeElementKey || 'student_name';
    const elem = state.elements[key];
    if (!elem || getElementKind(key, elem) !== 'text') return;
    const modal = document.getElementById('textEditModal');
    const input = document.getElementById('quickEditTextInput');
    if (!modal || !input) return;

    state.activeElementKey = key;
    elem.visible = true;

    let currentText = '';
    if (elem.isCustom && elem.type === 'text') currentText = elem.text || '';
    else if (key === 'student_name') currentText = elem.text !== undefined ? elem.text : '{{اسم_الطالب}}';
    else if (key === 'cert_title') currentText = elem.text !== undefined ? elem.text : (state.title || 'شَهَادَةُ شُكْرٍ وَتَقْدِير');
    else if (key === 'body_text') currentText = elem.text !== undefined ? elem.text : (state.bodyText || '');
    else if (key === 'grade_badge') currentText = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
    else if (key === 'circle_info') currentText = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
    else if (key === 'teacher_info') currentText = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
    else currentText = elem.text || '';

    input.value = currentText;
    modal.style.display = 'flex';
    modal.scrollTop = 0;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => {
      input.focus();
      input.select();
    }, 30);
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
    if (key === 'cert_title') state.title = newText;
    else if (key === 'body_text') state.bodyText = newText;

    modal.style.display = 'none';
    renderLayersDrawer();
    renderCertificate();
    pushHistoryState('تعديل النص');
    showToast('تم حفظ النص والمتغيرات بنجاح');
  }

  function applyTextColor(color, recordHistory = true) {
    if (!color) return;
    state.primaryColor = color;
    const targetKey = state.activeElementKey;
    if (targetKey && state.elements[targetKey]) {
      state.elements[targetKey].color = color;
      if (recordHistory) pushHistoryState('تغيير اللون');
    }
    scheduleCanvasDraw();
    saveDraftToStorage();
  }

  async function handleCustomFontUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fontName = 'CustomFont_' + Date.now().toString(36);
    try {
      showToast('جاري تثبيت الخط على الشهادة...');
      const arrayBuffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, arrayBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      state.fontFamily = fontName;
      if (state.activeElementKey && state.elements[state.activeElementKey]) {
        state.elements[state.activeElementKey].fontFamily = fontName;
      }
      state.customFonts.push({ name: fontName, label: file.name.replace(/\.[^/.]+$/, '').substring(0, 14) });

      pushHistoryState('رفع خط مخصص');
      renderTray();
      renderCertificate();
      showToast('تم تحميل الخط بنجاح!');
    } catch (err) {
      console.error('Error loading custom font:', err);
      showToast('تعذر تحميل الخط، تأكد من اختيار ملف .ttf أو .otf صالح');
    }
    e.target.value = '';
  }

  // --- Filtering & Student Data (Firebase + LocalDB + Strict 1-to-1 Grade Linking) ---
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
      } catch (err) {}
    }

    let loadedCircles = [];
    if (window.CirclesService && typeof window.CirclesService.fetchCircles === 'function') {
      try {
        const res = await window.CirclesService.fetchCircles();
        if (res && Array.isArray(res.circles) && res.circles.length > 0) loadedCircles = res.circles;
      } catch (e) {}
    }
    if (loadedCircles.length === 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === 'function') {
      try {
        const localCircles = await window.AlbayanLocalDB.getLocalCircles();
        if (Array.isArray(localCircles) && localCircles.length > 0) loadedCircles = localCircles;
      } catch (e) {}
    }
    state.circles = loadedCircles;
    populateFilterDropdowns(state.circles, HIJRI_MONTHS_LIST, null, null);
  }

  function syncStudentGradeSelectorUI() {
    const student = state.students[state.currentStudentIndex] || null;
    const nameEl = document.getElementById('linkedStudentName');
    const infoEl = document.getElementById('linkedStudentInfo');
    const badgeEl = document.getElementById('studentGradeVerifiedBadge');
    const gradeSelect = document.getElementById('studentGradeRecordSelect');
    if (!gradeSelect) return;

    gradeSelect.innerHTML = '';

    if (!student || state.students.length === 0) {
      if (nameEl) nameEl.textContent = 'لا يوجد طالب محدد';
      if (infoEl) infoEl.textContent = 'اختر طالباً لعرض درجاته المسجلة فقط';
      if (badgeEl) {
        badgeEl.textContent = 'بدون تحديد';
        badgeEl.classList.add('empty');
      }
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'لا توجد بيانات';
      gradeSelect.appendChild(opt);
      gradeSelect.disabled = true;
      return;
    }

    const activeSid = String(student.id !== undefined && student.id !== null ? student.id : '').trim();
    const sCode = student.student_code || (activeSid ? `STD-${activeSid}` : '');
    if (nameEl) nameEl.textContent = student.name || 'طالب البيان';
    if (infoEl) {
      const circleTxt = student.circle_name ? `الحلقة: ${student.circle_name}` : 'بدون حلقة';
      infoEl.textContent = sCode ? `${circleTxt} • رقم القيد: ${sCode}` : circleTxt;
    }

    const verifiedGrades = Array.isArray(student.linked_grades)
      ? student.linked_grades.filter((g) => String(g.sourceStudentId) === activeSid)
      : [];

    if (verifiedGrades.length === 0) {
      if (badgeEl) {
        badgeEl.textContent = 'بدون درجات';
        badgeEl.classList.add('empty');
      }
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'لا توجد درجات مسجلة لهذا الطالب';
      gradeSelect.appendChild(opt);
      gradeSelect.disabled = true;
      student.selectedGradeKey = '';
      return;
    }

    if (badgeEl) {
      badgeEl.textContent = student.isDemo ? 'نموذج معاينة' : `مرتبط (${verifiedGrades.length})`;
      badgeEl.classList.remove('empty');
    }

    gradeSelect.disabled = false;
    verifiedGrades.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.gradeKey;
      opt.textContent = g.label;
      gradeSelect.appendChild(opt);
    });

    const currentKey = student.selectedGradeKey && verifiedGrades.some((g) => g.gradeKey === student.selectedGradeKey)
      ? student.selectedGradeKey
      : verifiedGrades[0].gradeKey;
    student.selectedGradeKey = currentKey;
    gradeSelect.value = currentKey;
  }

  function selectStudentAtIndex(idx) {
    if (!Array.isArray(state.students) || state.students.length === 0) {
      syncStudentGradeSelectorUI();
      updateStudentPager();
      renderCertificate();
      return;
    }
    const safeIdx = Math.max(0, Math.min(state.students.length - 1, idx));
    state.currentStudentIndex = safeIdx;
    const s = state.students[safeIdx];
    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect && s && s.id !== undefined) {
      studentSelect.value = s.id;
    }
    syncStudentGradeSelectorUI();
    updateStudentPager();
    renderStudentsPillPreview();
    renderCertificate();
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
        isDemo: true,
        student_code: 'STD-0042',
        name: 'عبد الله بن محمد الأهدل',
        circle_name: 'حلقة الإمام عاصم بن أبي النجود',
        teacher_name: 'الشيخ عبد الرحمن',
        grade_badge: '98%',
        grade_label: 'ممتاز مرتفع',
        sard_pages: 45,
        attendance_rate: 100,
        exam_percent: 98,
        achievement_text: 'إتمام سرد وتسميع 45 وجهاً من القرآن الكريم بإتقان وتفوق',
        selectedGradeKey: 'summary',
        linked_grades: [{
          gradeKey: 'summary',
          type: 'summary',
          sourceStudentId: '0',
          label: 'المعدل التقديري للمعاينة — 98% (ممتاز مرتفع)',
          exam_percent: 98,
          sard_pages: 45,
          attendance_rate: 100,
          memo_grade: 'ممتاز',
          rev_grade: 'ممتاز',
          grade_badge: '98%',
          rating: 'ممتاز مرتفع'
        }]
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

    syncStudentGradeSelectorUI();
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
        if (modeSelectedLabel) modeSelectedLabel.textContent = modeLabels[state.filterMode] || '';

        if (state.filterMode === 'circle') {
          if (circleSelectRow) circleSelectRow.style.display = 'flex';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'none';
          if (achieversSubpanel) achieversSubpanel.style.display = 'none';
        } else if (state.filterMode === 'single') {
          if (circleSelectRow) circleSelectRow.style.display = 'flex';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'flex';
          if (achieversSubpanel) achieversSubpanel.style.display = 'none';
        } else if (state.filterMode === 'top_achievers') {
          if (circleSelectRow) circleSelectRow.style.display = 'flex';
          if (singleStudentSelectRow) singleStudentSelectRow.style.display = 'none';
          if (achieversSubpanel) achieversSubpanel.style.display = 'flex';
        } else {
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
        if (idx !== -1) selectStudentAtIndex(idx);
      });
    }

    const gradeRecordSelect = document.getElementById('studentGradeRecordSelect');
    if (gradeRecordSelect) {
      gradeRecordSelect.addEventListener('change', (e) => {
        const student = state.students[state.currentStudentIndex];
        if (!student) return;
        const activeSid = String(student.id !== undefined && student.id !== null ? student.id : '').trim();
        const chosen = Array.isArray(student.linked_grades)
          ? student.linked_grades.find((g) => g.gradeKey === e.target.value && String(g.sourceStudentId) === activeSid)
          : null;
        if (!chosen) return;
        student.selectedGradeKey = chosen.gradeKey;
        renderCertificate();
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
    if (timeframeSelect) timeframeSelect.addEventListener('change', (e) => { state.timeframe = e.target.value; fetchStudentsList(); });

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
        if (state.currentStudentIndex > 0) selectStudentAtIndex(state.currentStudentIndex - 1);
      });
    }

    if (nextStudentBtn) {
      nextStudentBtn.addEventListener('click', () => {
        if (state.currentStudentIndex < state.students.length - 1) selectStudentAtIndex(state.currentStudentIndex + 1);
      });
    }
  }

  function normStudentIdStr(val) {
    if (val === undefined || val === null || val === '') return '';
    if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.normalizeStudentId === 'function') {
      return String(window.AlbayanDataNormalizer.normalizeStudentId(val)).trim();
    }
    return String(val).trim();
  }

  function normCircleIdStr(val) {
    if (val === undefined || val === null || val === '') return '';
    if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.normalizeCircleId === 'function') {
      return String(window.AlbayanDataNormalizer.normalizeCircleId(val)).trim();
    }
    return String(val).trim();
  }

  function computeGradeRating(pct) {
    const n = Number(pct);
    if (Number.isNaN(n)) return 'غير مرصود';
    if (n >= 95) return 'ممتاز مرتفع';
    if (n >= 90) return 'ممتاز';
    if (n >= 80) return 'جيد جداً';
    if (n >= 70) return 'جيد';
    if (n >= 50) return 'ناجح';
    return 'مشارك';
  }

  function buildLinkedGradesForStudent(student, allRecords, allResults, examsMap) {
    const sid = normStudentIdStr(student.id !== undefined ? student.id : student.student_id);
    const cid = normCircleIdStr(student.circle_id);
    if (!sid) return { stuRecords: [], stuResults: [], linkedGrades: [], examAvg: null, sardTotal: 0, attRate: null, memoVal: '' };

    const stuRecords = (allRecords || []).filter((r) => {
      if (!r || r.deleted) return false;
      const rSid = normStudentIdStr(r.student_id);
      if (!rSid || rSid !== sid) return false;
      const rCid = normCircleIdStr(r.circle_id);
      if (cid && rCid && rCid !== cid) return false;
      if (state.filterMode === 'top_achievers' && state.selectedMonth !== 'all' && window.AlbayanDataNormalizer) {
        return window.AlbayanDataNormalizer.isSameMonth(r.month, state.selectedMonth);
      }
      return true;
    });

    const stuResults = (allResults || []).filter((res) => {
      if (!res || res.deleted) return false;
      const rSid = normStudentIdStr(res.student_id);
      if (!rSid || rSid !== sid) return false;
      const rCid = normCircleIdStr(res.circle_id);
      if (cid && rCid && rCid !== cid) return false;
      return true;
    });

    const linkedGrades = [];

    stuResults.forEach((res, idx) => {
      let pct = null;
      if (res.percentage !== undefined && res.percentage !== null && res.percentage !== '' && !Number.isNaN(Number(res.percentage))) {
        pct = Math.round(Number(res.percentage));
      } else if (res.score !== undefined && res.total && Number(res.total) > 0) {
        pct = Math.round((Number(res.score) / Number(res.total)) * 100);
      }
      if (pct === null) return;
      const examMeta = examsMap && res.exam_id !== undefined ? examsMap.get(String(res.exam_id)) : null;
      const examTitle = res.exam_title || (examMeta && (examMeta.title || examMeta.name)) || `اختبار #${idx + 1}`;
      const scoreText = (res.score !== undefined && res.total) ? ` (${res.score}/${res.total})` : '';
      const rating = res.rating || computeGradeRating(pct);
      linkedGrades.push({
        gradeKey: `exam_${res.id || res.exam_id || idx}`,
        type: 'exam',
        sourceStudentId: sid,
        label: `${examTitle}${scoreText} — ${pct}% (${rating})`,
        exam_percent: pct,
        grade_badge: `${pct}%`,
        rating
      });
    });

    const sardTotal = stuRecords.reduce((acc, r) => acc + (Number(r.sard_pages) || Number(r.pages) || 0), 0);
    stuRecords.forEach((rec, idx) => {
      const mLabel = rec.month || `سجل شهر ${idx + 1}`;
      const rPages = rec.sard_pages !== undefined ? Number(rec.sard_pages) : (rec.pages !== undefined ? Number(rec.pages) : null);
      const rExam = (rec.exam_score !== undefined && rec.exam_score !== '' && !Number.isNaN(Number(rec.exam_score)))
        ? Math.round(Number(rec.exam_score)) : null;
      const rAtt = (rec.attendance_days !== undefined && rec.attendance_days !== '' && !Number.isNaN(Number(rec.attendance_days)))
        ? Math.min(100, Math.round((Number(rec.attendance_days) / 20) * 100)) : null;
      const rMemo = rec.memo_grade || '';
      const rRev = rec.rev_grade || '';
      const parts = [];
      if (rExam !== null) parts.push(`${rExam}%`);
      if (rPages !== null) parts.push(`سرد ${Math.round(rPages)} وجهاً`);
      if (rMemo) parts.push(`حفظ: ${rMemo}`);
      const rating = rExam !== null ? computeGradeRating(rExam) : (rMemo || 'مشارك');
      const badge = rExam !== null ? `${rExam}%` : (rPages !== null && rPages > 0 ? `${Math.round(rPages)} وجهاً` : (rMemo || 'مشارك'));
      linkedGrades.push({
        gradeKey: `rec_${rec.id || mLabel}_${idx}`,
        type: 'record',
        sourceStudentId: sid,
        label: `${mLabel} — ${parts.join(' • ') || rating}`,
        exam_percent: rExam,
        sard_pages: rPages,
        attendance_rate: rAtt,
        memo_grade: rMemo,
        rev_grade: rRev,
        grade_badge: badge,
        rating
      });
    });

    let examAvg = null;
    if (stuResults.length > 0) {
      const validPcts = stuResults
        .map((res) => {
          if (res.percentage !== undefined && res.percentage !== null && res.percentage !== '') return Number(res.percentage);
          if (res.score !== undefined && res.total && Number(res.total) > 0) return (Number(res.score) / Number(res.total)) * 100;
          return NaN;
        })
        .filter((v) => !Number.isNaN(v));
      if (validPcts.length > 0) examAvg = Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length);
    } else if (student.percentage !== undefined && student.percentage !== null && student.percentage !== '' && !Number.isNaN(Number(student.percentage))) {
      examAvg = Math.round(Number(student.percentage));
    } else if (stuRecords.length > 0) {
      const latestWithScore = [...stuRecords].reverse().find((r) => r.exam_score !== undefined && r.exam_score !== '' && !Number.isNaN(Number(r.exam_score)));
      if (latestWithScore) examAvg = Math.round(Number(latestWithScore.exam_score));
    }

    const latestRec = stuRecords[stuRecords.length - 1] || {};
    const sardVal = sardTotal || (student.sard_pages !== undefined ? Number(student.sard_pages) : 0) || 0;
    const attRate = (student.attendance_rate !== undefined && student.attendance_rate !== null && student.attendance_rate !== '')
      ? Number(student.attendance_rate)
      : (latestRec.attendance_days !== undefined ? Math.min(100, Math.round((Number(latestRec.attendance_days) / 20) * 100)) : null);
    const memoVal = latestRec.memo_grade || student.memo_grade || '';
    const revVal = latestRec.rev_grade || student.rev_grade || '';

    const hasSummaryData = examAvg !== null || sardVal > 0 || memoVal !== '' || stuRecords.length > 0;
    if (hasSummaryData) {
      const sumBadge = examAvg !== null ? `${examAvg}%` : (sardVal > 0 ? `${Math.round(sardVal)} وجهاً` : memoVal);
      const sumRating = examAvg !== null ? computeGradeRating(examAvg) : (memoVal || 'مشارك');
      linkedGrades.unshift({
        gradeKey: 'summary',
        type: 'summary',
        sourceStudentId: sid,
        label: `الملخص العام للطالب — ${sumBadge} (${sumRating})`,
        exam_percent: examAvg,
        sard_pages: sardVal,
        attendance_rate: attRate,
        memo_grade: memoVal || 'غير مرصود',
        rev_grade: revVal || 'غير مرصود',
        grade_badge: sumBadge,
        rating: sumRating
      });
    }

    return { stuRecords, stuResults, linkedGrades, examAvg, sardVal, attRate, memoVal, revVal };
  }

  window.AlbayanCertGradeEngine = { buildLinkedGradesForStudent, computeGradeRating };

  async function loadStudentsOfflineOrCloud() {
    const circleMap = new Map();
    (state.circles || []).forEach((c) => {
      const cid = normCircleIdStr(c.id);
      if (cid) circleMap.set(cid, c);
    });

    let rawStudents = [];
    let allRecords = [];
    let allResults = [];
    const examsMap = new Map();

    if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
      try {
        const [stuRes, recRes, resRes, exRes] = await Promise.all([
          window.AlbayanFirebaseDAL.get('students'),
          window.AlbayanFirebaseDAL.get('student_records'),
          window.AlbayanFirebaseDAL.get('results'),
          window.AlbayanFirebaseDAL.get('exams')
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
        if (exRes && exRes.ok && exRes.data && window.AlbayanDataNormalizer) {
          window.AlbayanDataNormalizer.normalizeCollectionEntries(exRes.data).forEach(([k, ex]) => {
            if (ex) examsMap.set(String(ex.id || k), ex);
          });
        }
      } catch (e) {}
    }

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

    const wantCircleId = state.selectedCircleId !== 'all' ? normCircleIdStr(state.selectedCircleId) : null;
    const normalizedStudents = [];
    const seenIds = new Set();

    for (const s of rawStudents) {
      if (!s || s.deleted) continue;
      const sid = normStudentIdStr(s.id !== undefined ? s.id : s.student_id);
      if (!sid || seenIds.has(sid)) continue;
      const cid = normCircleIdStr(s.circle_id);
      if (wantCircleId && cid !== wantCircleId) continue;
      seenIds.add(sid);

      const circleObj = circleMap.get(cid) || {};
      const resolved = buildLinkedGradesForStudent(s, allRecords, allResults, examsMap);
      const examAvg = resolved.examAvg;
      const sardVal = resolved.sardVal;
      const attRate = resolved.attRate;
      const memoVal = resolved.memoVal;
      const revVal = resolved.revVal;

      const computedBadge = examAvg !== null ? `${examAvg}%` : (sardVal > 0 ? `${Math.round(sardVal)} وجهاً` : (memoVal || 'غير مرصود'));
      const computedLabel = examAvg !== null ? computeGradeRating(examAvg) : (memoVal || 'غير مرصود');

      normalizedStudents.push({
        id: s.id !== undefined ? s.id : sid,
        isDemo: false,
        student_code: s.student_code || `STD-${String(sid).padStart(4, '0')}`,
        name: s.name || s.student_name || 'طالب البيان',
        circle_id: cid,
        circle_name: s.circle_name || circleObj.name || 'حلقة القرآن الكريم',
        teacher_name: s.teacher_name || circleObj.teacher_name || 'معلم الحلقة',
        exam_percent: examAvg !== null ? examAvg : '',
        grade_badge: computedBadge,
        grade_label: computedLabel,
        rating: s.rating || computedLabel,
        sard_pages: sardVal,
        attendance_rate: attRate !== null ? attRate : '',
        memo_grade: memoVal,
        rev_grade: revVal,
        achievement_text: sardVal > 0
          ? `إتمام سرد وتسميع ${Math.round(sardVal)} وجهاً من القرآن الكريم بإتقان وتفوق`
          : 'التميز والمواظبة في حفظ كتاب الله تعالى',
        linked_grades: resolved.linkedGrades,
        selectedGradeKey: resolved.linkedGrades.length > 0 ? resolved.linkedGrades[0].gradeKey : ''
      });
    }

    if (state.filterMode === 'top_achievers') {
      const crit = state.achieverCriteria || 'top_sard';
      normalizedStudents.sort((a, b) => {
        if (crit === 'top_exams') return (Number(b.exam_percent) || 0) - (Number(a.exam_percent) || 0);
        if (crit === 'top_attendance') return (Number(b.attendance_rate) || 0) - (Number(a.attendance_rate) || 0);
        if (crit === 'top_memo') {
          const rank = (g) => String(g || '').includes('ممتاز') ? 4 : (String(g || '').includes('جيد جداً') || String(g || '').includes('جيد جدا')) ? 3 : 2;
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
        if (state.filterMode === 'single' && state.selectedStudentId) params.append('student_id', state.selectedStudentId);
        params.append('category', state.filterMode === 'top_achievers' ? state.achieverCriteria : 'all');
        params.append('timeframe', state.timeframe);
        params.append('month', state.selectedMonth);
        params.append('year', state.selectedYear);
        params.append('limit', state.limit);
        params.append('grade_source', state.gradeSource);

        const res = await fetch(`/api/certificates/students-filter?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) loaded = data.students || [];
        }
      } catch (err) {}
    }

    if (loaded === null) {
      loaded = await loadStudentsOfflineOrCloud();
    } else if (Array.isArray(loaded)) {
      loaded = loaded.map((st) => {
        const sid = normStudentIdStr(st.id !== undefined ? st.id : st.student_id);
        if (Array.isArray(st.linked_grades) && st.linked_grades.length > 0) {
          return {
            ...st,
            isDemo: false,
            linked_grades: st.linked_grades.filter((g) => String(g.sourceStudentId || sid) === sid)
              .map((g) => ({ ...g, sourceStudentId: sid }))
          };
        }
        const resolved = buildLinkedGradesForStudent(st, [], [], null);
        return {
          ...st,
          isDemo: false,
          linked_grades: resolved.linkedGrades,
          selectedGradeKey: resolved.linkedGrades.length > 0 ? resolved.linkedGrades[0].gradeKey : ''
        };
      });
    }

    state.allFilteredStudents = Array.isArray(loaded) ? loaded : [];
    applyStudentSearchAndRefreshUI();
  }

  function updateStudentPager() {
    const total = state.students.length;
    const current = total > 0 ? state.currentStudentIndex + 1 : 0;
    const student = state.students[state.currentStudentIndex] || {};

    if (currentStudentNameEl) {
      currentStudentNameEl.textContent = total > 0 ? (student.name || 'طالب البيان') : 'لا توجد نتائج';
    }
    if (studentCounterEl) {
      studentCounterEl.textContent = `(${current}/${total})`;
    }
    if (prevStudentBtn) prevStudentBtn.disabled = state.currentStudentIndex <= 0;
    if (nextStudentBtn) nextStudentBtn.disabled = state.currentStudentIndex >= total - 1;

    const countBadge = document.getElementById('studentsCountBadge');
    if (countBadge) countBadge.textContent = `${total} طلاب محددين`;

    const batchHint = document.getElementById('batchCountHint');
    if (batchHint) batchHint.textContent = `تنزيل شهادات ${total} طالب`;
  }

  function renderStudentsPillPreview() {
    const container = document.getElementById('studentsPillPreview');
    if (!container) return;
    container.innerHTML = '';

    if (state.students.length === 0) {
      container.innerHTML = '<span class="saved-presets-empty" style="font-size:0.76rem;color:var(--cert-text-muted);">لا يوجد طلاب مطابقون للبحث الحالي.</span>';
      return;
    }

    state.students.slice(0, 35).forEach((s, idx) => {
      const pill = document.createElement('span');
      pill.className = `student-tag-pill ${idx === state.currentStudentIndex ? 'active' : ''}`;
      pill.textContent = s.name;
      pill.onclick = () => selectStudentAtIndex(idx);
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
  // INTERACTIVE CANVAS DRAG, RESIZE, ROTATE & SNAP GUIDES
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

    if (elem.type === 'border') {
      return { widthPct: 92, heightPct: 90, centerXPct: 50, pixelWidth: 3200, pixelHeight: 2200 };
    } else if (elem.type === 'image' || key === 'school_stamp') {
      pixelWidth = elem.width || elem.size || 200;
      pixelHeight = elem.height || elem.size || 200;
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
      const lh = (elem.size || 48) * (elem.lineHeight || 1.65);
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
      }
      const sz = elem.size || defaultSize;
      const lh = sz * (elem.lineHeight || 1.3);
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
    if (key !== 'school_stamp' && key !== 'grade_badge' && elem.type !== 'image' && elem.type !== 'border') {
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
      if (elem.type === 'border') return; // Frame/border is managed from Layers Drawer so it never steals canvas clicks
      if (key === 'school_stamp' && !state.showOfficialStamp) return;
      if (key === 'grade_badge' && state.gradeSource === 'none') return;

      const handle = document.createElement('div');
      handle.className = `drag-box-handle ${key === state.activeElementKey ? 'active' : ''} ${elem.locked ? 'is-locked' : ''}`;
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
        if (elem.locked) return;
        setSelectedElement(key);
      }

      function triggerDoubleTap() {
        if (elem.locked) return;
        if (tapTimeout) { clearTimeout(tapTimeout); tapTimeout = null; }
        setSelectedElement(key);
        if (getElementKind(key, elem) === 'text') {
          openQuickTextEditor(key);
        }
      }

      handle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dragState.hasMoved || elem.locked) return;
        const now = Date.now();
        if (now - lastTapTime < 320) {
          triggerDoubleTap();
        } else {
          if (tapTimeout) clearTimeout(tapTimeout);
          tapTimeout = setTimeout(() => {
            triggerSingleTap();
            tapTimeout = null;
          }, 220);
        }
        lastTapTime = now;
      });

      handle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        triggerDoubleTap();
      });

      attachPointerDrag(handle, key);
      dragOverlay.appendChild(handle);
    });

    highlightActiveHandle();
  }

  function updateSnapGuides(showX, showY) {
    const gx = document.getElementById('snapGuideX');
    const gy = document.getElementById('snapGuideY');
    if (gx) gx.classList.toggle('visible', Boolean(showX));
    if (gy) gy.classList.toggle('visible', Boolean(showY));
  }

  function attachPointerDrag(handle, key) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) return;
      const elem = state.elements[key];
      if (!elem || elem.locked) return;
      if (e.target.closest('.corner-scale-dot') || e.target.closest('.edge-scale-dot') || e.target.closest('.rotate-handle-dot')) return;

      e.stopPropagation();
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}

      dragState.isDragging = true;
      dragState.hasMoved = false;
      dragState.key = key;
      dragState.pointerId = e.pointerId;
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
      dragState.elemStartX = elem.x;
      dragState.elemStartY = elem.y;

      setSelectedElement(key);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragState.isDragging || dragState.key !== key) return;
      const elem = state.elements[key];
      if (!elem || elem.locked) return;

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

      let snappedX = false;
      let snappedY = false;
      if (state.snapGridEnabled) {
        if (Math.abs(newX - 50) <= 1.5) { newX = 50; snappedX = true; }
        if (Math.abs(newY - 50) <= 1.5) { newY = 50; snappedY = true; }
      }
      updateSnapGuides(snappedX, snappedY);

      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;

      elem.x = newX;
      elem.y = newY;
      syncHandlePosition(key);
      scheduleCanvasDraw();
    });

    const endDrag = (e) => {
      updateSnapGuides(false, false);
      if (dragState.isDragging && dragState.key === key) {
        try {
          if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
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

  function attachCornerScaleDrag(dot, key, corner) {
    dot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const elem = state.elements[key];
      if (!elem || elem.locked) return;

      try { dot.setPointerCapture(e.pointerId); } catch (err) {}

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
      if (!elem || elem.locked) return;

      const deltaX = e.clientX - scaleDragState.startX;
      const deltaY = e.clientY - scaleDragState.startY;
      let scaleDelta = 0;
      if (corner === 'se') scaleDelta = (deltaX + deltaY) / 2;
      else if (corner === 'nw') scaleDelta = (-deltaX - deltaY) / 2;
      else if (corner === 'ne') scaleDelta = (deltaX - deltaY) / 2;
      else if (corner === 'sw') scaleDelta = (-deltaX + deltaY) / 2;

      const rect = canvasFrame.getBoundingClientRect();
      const ratio = rect.width ? CANVAS_WIDTH / rect.width : 3;
      const canvasDelta = scaleDelta * ratio;

      if (elem.type === 'image' && key !== 'school_stamp') {
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
        elem.size = Math.max(18, Math.min(260, Math.round(scaleDragState.startSize + canvasDelta * 0.35)));
      }

      syncHandlePosition(key);
      if (state.activeTool === 'size') renderTray();
      scheduleCanvasDraw();
    });

    const endScale = (e) => {
      if (scaleDragState.isScaling && scaleDragState.key === key) {
        try { if (dot.hasPointerCapture(e.pointerId)) dot.releasePointerCapture(e.pointerId); } catch (err) {}
        scaleDragState.isScaling = false;
        scaleDragState.key = null;
        pushHistoryState(`scale_${key}`);
        renderCertificate();
      }
    };

    dot.addEventListener('pointerup', endScale);
    dot.addEventListener('pointercancel', endScale);
  }

  function attachEdgeScaleDrag(dot, key, edge) {
    dot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const elem = state.elements[key];
      if (!elem || elem.locked) return;

      try { dot.setPointerCapture(e.pointerId); } catch (err) {}
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
      if (!elem || elem.locked) return;

      const deltaX = e.clientX - scaleDragState.startX;
      const deltaY = e.clientY - scaleDragState.startY;
      const rect = canvasFrame.getBoundingClientRect();
      const ratio = rect.width ? CANVAS_WIDTH / rect.width : 3;

      if (edge === 'e' || edge === 'w') {
        const dir = edge === 'e' ? 1 : -1;
        const deltaPx = deltaX * dir * ratio;
        if (key === 'body_text') {
          elem.maxWidth = Math.max(600, Math.min(3200, Math.round(scaleDragState.startMaxWidth + deltaPx * 2)));
        } else if (elem.type === 'image' && key !== 'school_stamp') {
          elem.width = Math.max(60, Math.min(2800, Math.round(scaleDragState.startWidth + deltaPx * 2)));
        } else {
          elem.size = Math.max(18, Math.min(260, Math.round(scaleDragState.startSize + deltaPx * 0.25)));
        }
      } else if (edge === 'n' || edge === 's') {
        const dir = edge === 's' ? 1 : -1;
        const deltaPx = deltaY * dir * ratio;
        if (elem.type === 'image' && key !== 'school_stamp') {
          elem.height = Math.max(60, Math.min(2800, Math.round(scaleDragState.startHeight + deltaPx * 2)));
        } else {
          elem.size = Math.max(18, Math.min(260, Math.round(scaleDragState.startSize + deltaPx * 0.25)));
        }
      }

      syncHandlePosition(key);
      scheduleCanvasDraw();
    });

    const endEdgeScale = (e) => {
      if (scaleDragState.isScaling && scaleDragState.key === key) {
        try { if (dot.hasPointerCapture(e.pointerId)) dot.releasePointerCapture(e.pointerId); } catch (err) {}
        scaleDragState.isScaling = false;
        scaleDragState.key = null;
        pushHistoryState(`edge_scale_${key}`);
        renderCertificate();
      }
    };

    dot.addEventListener('pointerup', endEdgeScale);
    dot.addEventListener('pointercancel', endEdgeScale);
  }

  function attachPointerRotate(rotDot, key) {
    let isRotating = false;
    let centerX = 0;
    let centerY = 0;
    let startAngle = 0;
    let origRotation = 0;

    rotDot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const handle = document.getElementById(`handle_${key}`);
      const elem = state.elements[key];
      if (!handle || !elem || elem.locked) return;

      const box = handle.getBoundingClientRect();
      centerX = box.left + box.width / 2;
      centerY = box.top + box.height / 2;
      startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      origRotation = elem.rotation || 0;
      isRotating = true;
      try { rotDot.setPointerCapture(e.pointerId); } catch (err) {}
    });

    rotDot.addEventListener('pointermove', (e) => {
      if (!isRotating) return;
      e.preventDefault();
      e.stopPropagation();

      const currAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      let nextDeg = Math.round(origRotation + (currAngle - startAngle));
      if (Math.abs(nextDeg) <= 3) nextDeg = 0;
      else if (Math.abs(nextDeg - 90) <= 3) nextDeg = 90;
      else if (Math.abs(nextDeg + 90) <= 3) nextDeg = -90;
      rotateActiveElementTo(nextDeg, false);
    });

    const endRotate = (e) => {
      if (!isRotating) return;
      isRotating = false;
      try { if (rotDot.hasPointerCapture(e.pointerId)) rotDot.releasePointerCapture(e.pointerId); } catch (err) {}
      pushHistoryState(`rotate_${key}`);
      renderCertificate();
    };

    rotDot.addEventListener('pointerup', endRotate);
    rotDot.addEventListener('pointercancel', endRotate);
  }

  function highlightActiveHandle() {
    document.querySelectorAll('.drag-box-handle').forEach((h) => {
      const key = h.getAttribute('data-key');
      const isActive = key === state.activeElementKey;
      h.classList.toggle('active', isActive);
      h.querySelectorAll('.corner-scale-dot, .edge-scale-dot, .rotate-handle-dot, .rotate-handle-stem').forEach((d) => d.remove());
    });

    if (!state.activeElementKey) return;
    const activeHandle = document.getElementById(`handle_${state.activeElementKey}`);
    const elem = state.elements[state.activeElementKey];
    if (!activeHandle || !elem || elem.visible === false || elem.locked) return;

    const rotStem = document.createElement('div');
    rotStem.className = 'rotate-handle-stem';
    activeHandle.appendChild(rotStem);

    const rotDot = document.createElement('div');
    rotDot.className = 'rotate-handle-dot';
    rotDot.title = 'اسحب لتدوير العنصر';
    rotDot.innerHTML = '↻';
    attachPointerRotate(rotDot, state.activeElementKey);
    activeHandle.appendChild(rotDot);

    ['nw', 'ne', 'sw', 'se'].forEach((pos) => {
      const dot = document.createElement('div');
      dot.className = `corner-scale-dot ${pos}`;
      attachCornerScaleDrag(dot, state.activeElementKey, pos);
      activeHandle.appendChild(dot);
    });

    ['n', 's', 'e', 'w'].forEach((edge) => {
      const dot = document.createElement('div');
      dot.className = `edge-scale-dot ${edge}`;
      attachEdgeScaleDrag(dot, state.activeElementKey, edge);
      activeHandle.appendChild(dot);
    });
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
    handle.classList.toggle('is-locked', Boolean(elem.locked));
    if (!isVisible) return;

    const bounds = computeElementExactBounds(key);
    handle.style.left = `${bounds.centerXPct}%`;
    handle.style.top = `${elem.y}%`;
    handle.style.width = `${bounds.widthPct}%`;
    handle.style.height = `${bounds.heightPct}%`;
    handle.style.setProperty('--elem-rotate', `${elem.rotation || 0}deg`);
  }

  function rotateActiveElementTo(deg, recordHistory = true) {
    const key = state.activeElementKey;
    const elem = key ? state.elements[key] : null;
    if (!elem || elem.locked) return;
    let normalized = Math.round(deg);
    while (normalized > 180) normalized -= 360;
    while (normalized < -180) normalized += 360;
    elem.rotation = normalized;
    syncHandlePosition(key);
    scheduleCanvasDraw();
    if (recordHistory) pushHistoryState('تعديل الدوران');
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
    if (!elem || elem.type === 'border') return;

    syncCustomElementIdCounter();
    const newKey = 'custom_' + (elem.type || 'text') + '_' + (customElementIdCounter++);
    let newElem = {};

    if (elem.isCustom || elem.type === 'image') {
      const imgObj = elem.imgElement || elem.img ||
        (elem.subType === 'school_logo' ? schoolLogoImg : (elem.subType === 'quran_emblem' ? quranEmblemImg : null));
      newElem = {
        ...elem,
        isCustom: true,
        locked: false,
        imgElement: imgObj || undefined,
        img: imgObj || undefined,
        imgDataUrl: elem.imgDataUrl || null
      };
      if (key === 'school_stamp' && !imgObj) {
        newElem.type = 'text';
        newElem.text = 'معتمد';
      }
    } else {
      let textVal = '';
      if (key === 'student_name') textVal = elem.text !== undefined ? elem.text : '{{اسم_الطالب}}';
      else if (key === 'cert_title') textVal = elem.text !== undefined ? elem.text : state.title;
      else if (key === 'body_text') textVal = elem.text !== undefined ? elem.text : state.bodyText;
      else if (key === 'grade_badge') textVal = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
      else if (key === 'circle_info') textVal = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
      else if (key === 'teacher_info') textVal = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
      else textVal = elem.text || 'عنصر مكرر';

      newElem = {
        ...elem,
        isCustom: true,
        type: 'text',
        text: textVal,
        locked: false
      };
    }

    newElem.x = Math.min(90, (elem.x || 50) + 4);
    newElem.y = Math.min(90, (elem.y || 50) + 4);
    newElem.zIndex = getNextZIndex();
    newElem.visible = true;

    state.elements[newKey] = newElem;
    buildDragOverlayHandles();
    setSelectedElement(newKey);
    renderCertificate();
    pushHistoryState('تكرار العنصر');
    showToast('تم تكرار العنصر بنجاح');
  }

  function deleteOrHideActiveElement() {
    const key = state.activeElementKey;
    const elem = state.elements[key];
    if (!elem) return;

    if (elem.isCustom) {
      delete state.elements[key];
      showToast('تم حذف العنصر');
    } else {
      elem.visible = false;
      syncElementVisibilityFlags();
      showToast('تم إخفاء العنصر');
    }

    state.activeElementKey = null;
    state.activeTool = null;
    buildDragOverlayHandles();
    renderLayersDrawer();
    renderBottomToolbar();
    renderTray();
    renderCertificate();
    pushHistoryState('حذف/إخفاء العنصر');
  }

  function addCustomText(initialText, options = {}) {
    syncCustomElementIdCounter();
    const id = 'custom_text_' + (customElementIdCounter++);
    const text = initialText !== undefined ? initialText : '{{اسم_الطالب}}';
    const isLightBg = state.currentTemplate === 'blank' || state.currentTemplate === 'academic';
    state.elements[id] = {
      isCustom: true,
      type: 'text',
      text,
      x: options.x !== undefined ? options.x : 50,
      y: options.y !== undefined ? options.y : 50,
      size: options.size || 68,
      align: options.align || 'center',
      color: options.color || (isLightBg ? '#1B3A4B' : '#dfbc55'),
      fontFamily: state.fontFamily || 'Amiri',
      isBold: true,
      lineHeight: 1.35,
      strokeEnabled: false,
      strokeWidth: 4,
      strokeColor: '#ffffff',
      shadowEnabled: false,
      shadowBlur: 12,
      shadowColor: 'rgba(0,0,0,0.45)',
      opacity: 1,
      rotation: 0,
      zIndex: getNextZIndex(),
      visible: true,
      locked: false,
      width: 450,
      height: 90
    };
    buildDragOverlayHandles();
    setSelectedElement(id);
    renderCertificate();
    pushHistoryState('إضافة نص');
    showToast(options.toast || 'تمت إضافة النص بنجاح');
    if (options.openEditor) openQuickTextEditor(id);
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
          if (aspect >= 1) { w = 350; h = Math.round(350 / aspect); }
          else { h = 350; w = Math.round(350 * aspect); }
        }
        state.elements[id] = {
          isCustom: true,
          type: 'image',
          img,
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
          visible: true,
          locked: false
        };
        buildDragOverlayHandles();
        setSelectedElement(id);
        renderCertificate();
        pushHistoryState('إضافة صورة');
        showToast('تمت إضافة الصورة بنجاح');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // =========================================================
  // CANVAS RENDERING CORE (300 DPI A4 Landscape: 3508 x 2480)
  // =========================================================
  function renderCertificate() {
    drawCertificateCanvas();
    Object.keys(state.elements).forEach(syncHandlePosition);
    highlightActiveHandle();
  }

  function drawCertificateCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state.currentTemplate === 'custom' && state.customBgImage) drawCustomBackground();
    else if (state.currentTemplate === 'blank') drawBlankTemplate();
    else if (state.currentTemplate === 'gold') drawRoyalGoldTemplate();
    else if (state.currentTemplate === 'emerald') drawQuranicEmeraldTemplate();
    else if (state.currentTemplate === 'navy') drawSapphireNavyTemplate();
    else drawAcademicIvoryTemplate();

    if (state.currentTemplate !== 'blank') {
      drawHeaderElements();
    }

    drawAllOrderedElements();
  }

  function drawBlankTemplate() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function applyTextEffects(context, elem) {
    if (elem && elem.shadowEnabled) {
      const blur = Number(elem.shadowBlur || 12);
      context.shadowColor = elem.shadowColor || 'rgba(0, 0, 0, 0.48)';
      context.shadowBlur = blur * 2;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = Math.round(blur * 0.55);
    }
  }

  function drawStyledTextLine(context, elem, line, x, y) {
    if (elem && elem.strokeEnabled) {
      context.save();
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.lineJoin = 'round';
      context.miterLimit = 2;
      context.lineWidth = Math.max(2, Number(elem.strokeWidth || 4) * 2.2);
      context.strokeStyle = elem.strokeColor || '#ffffff';
      context.strokeText(line, x, y);
      context.restore();
    }
    context.fillText(line, x, y);
  }

  function drawMultilineOrSingle(context, text, x, y, lineHeight, elem) {
    if (!text) return;
    const str = String(text);
    const lines = str.split('\n');
    applyTextEffects(context, elem);
    if (lines.length === 1) {
      drawStyledTextLine(context, elem, str, x, y);
      return;
    }
    const lh = lineHeight || 60;
    const totalH = (lines.length - 1) * lh;
    const startY = y - totalH / 2;
    lines.forEach((line, idx) => {
      drawStyledTextLine(context, elem, line, x, startY + idx * lh);
    });
  }

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight, elem) {
    const lines = measureWrappedLines(context, text, maxWidth);
    const startY = y - (((lines.length - 1) * lineHeight) / 2);
    applyTextEffects(context, elem);
    for (let i = 0; i < lines.length; i++) {
      drawStyledTextLine(context, elem, lines[i], x, startY + (i * lineHeight));
    }
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

      if (elem.type === 'border' || key === 'ornamental_border') {
        if (state.showOrnamentalBorder) drawOrnamentalBorders(elem);
        return;
      }
      if (key === 'school_logo') {
        if (state.showSchoolLogo) drawElementImage(elem, schoolLogoImg);
        return;
      }
      if (key === 'quran_emblem') {
        if (state.showQuranEmblem) drawElementImage(elem, quranEmblemImg);
        return;
      }
      if (key === 'school_stamp') {
        if (state.showOfficialStamp) {
          if (elem.imgElement || elem.img) drawElementImage(elem, elem.imgElement || elem.img);
          else drawSchoolStamp(elem);
        }
        return;
      }
      if (elem.isCustom) {
        drawSingleCustomElement(elem, student);
        return;
      }
      drawSingleBuiltInElement(key, elem, student, isDark);
    });
  }

  function drawElementImage(elem, fallbackImg) {
    const imgObj = elem.imgElement || elem.img || fallbackImg;
    if (!imgObj) return;
    ctx.save();
    const x = (elem.x / 100) * CANVAS_WIDTH;
    const y = (elem.y / 100) * CANVAS_HEIGHT;
    const w = elem.width || elem.size || 180;
    const h = elem.height || elem.size || 180;
    ctx.globalAlpha = elem.opacity !== undefined ? elem.opacity : 1;
    ctx.translate(x, y);
    if (elem.rotation) ctx.rotate((elem.rotation * Math.PI) / 180);
    try {
      ctx.drawImage(imgObj, -w / 2, -h / 2, w, h);
    } catch (e) {}
    ctx.restore();
  }

  function drawSingleCustomElement(elem, student) {
    if (elem.type === 'image') {
      drawElementImage(elem, null);
      return;
    }
    ctx.save();
    const x = (elem.x / 100) * CANVAS_WIDTH;
    const y = (elem.y / 100) * CANVAS_HEIGHT;
    ctx.globalAlpha = elem.opacity !== undefined ? elem.opacity : 1;
    ctx.translate(x, y);
    if (elem.rotation) ctx.rotate((elem.rotation * Math.PI) / 180);

    const font = elem.fontFamily || state.fontFamily || 'Cairo';
    const weight = elem.isBold ? '700' : '600';
    ctx.textAlign = elem.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${elem.size || 64}px '${font}', 'Cairo', sans-serif`;
    ctx.fillStyle = elem.color || state.primaryColor || '#1B3A4B';

    const textToDraw = formatMentions(elem.text || '', student);
    const lh = (elem.size || 64) * (elem.lineHeight || 1.35);
    drawMultilineOrSingle(ctx, textToDraw, 0, 0, lh, elem);
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

  function drawOrnamentalBorders(borderElem) {
    ctx.save();
    if (borderElem && borderElem.opacity !== undefined) {
      ctx.globalAlpha = borderElem.opacity;
    }
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

  function drawHeaderElements() {
    ctx.save();
    const isDark = state.currentTemplate !== 'academic';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = `600 52px '${state.fontFamily}', 'Amiri', serif`;
    ctx.fillStyle = '#dfbc55';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', CANVAS_WIDTH / 2, 170);

    ctx.font = `700 48px '${state.fontFamily}', 'Cairo', sans-serif`;
    ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
    ctx.fillText('مَدْرَسَةُ البَيَانِ لِتَعْلِيمِ القُرْآنِ الكَرِيمِ', CANVAS_WIDTH / 2, 240);

    const barGrad = ctx.createLinearGradient(CANVAS_WIDTH / 2 - 400, 0, CANVAS_WIDTH / 2 + 400, 0);
    barGrad.addColorStop(0, 'rgba(223, 188, 85, 0)');
    barGrad.addColorStop(0.5, 'rgba(223, 188, 85, 1)');
    barGrad.addColorStop(1, 'rgba(223, 188, 85, 0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(CANVAS_WIDTH / 2 - 400, 310, 800, 4);

    ctx.fillStyle = '#dfbc55';
    ctx.font = '24px serif';
    ctx.fillText('✦ ۞ ✦', CANVAS_WIDTH / 2, 298);
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
    if (elem.rotation) ctx.rotate((elem.rotation * Math.PI) / 180);

    if (key === 'cert_title') {
      const weight = elem.isBold !== false ? '700' : '500';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Amiri', serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#1B3A4B' : (isDark ? '#dfbc55' : '#8B1E0F'));
      const rawText = elem.text !== undefined ? elem.text : (state.title || 'شَهَادَةُ شُكْرٍ وَتَقْدِير');
      drawMultilineOrSingle(ctx, formatMentions(rawText, student), 0, 0, elem.size * (elem.lineHeight || 1.3), elem);
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
      drawMultilineOrSingle(ctx, nameText, 0, 0, elem.size * (elem.lineHeight || 1.3), elem);
    } else if (key === 'grade_badge') {
      const weight = elem.isBold !== false ? '700' : '500';
      const rawText = elem.text !== undefined ? elem.text : '{{التقدير}}: {{العلامة_النهائية}}';
      const badgeText = formatMentions(rawText, student);

      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Cairo', sans-serif`;
      const badgeWidth = ctx.measureText(badgeText).width + 44;
      const badgeHeight = elem.size + 22;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 24);
      else ctx.rect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight);
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
      applyTextEffects(ctx, elem);
      drawStyledTextLine(ctx, elem, badgeText, 0, 0);
    } else if (key === 'body_text') {
      const weight = elem.isBold ? '700' : '500';
      const rawText = elem.text !== undefined ? elem.text : state.bodyText;
      const renderedText = formatMentions(rawText, student);

      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Amiri', serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#334155' : (isDark ? '#e2e8f0' : '#334155'));
      drawWrappedText(ctx, renderedText, 0, 0, elem.maxWidth || 2600, elem.size * (elem.lineHeight || 1.65), elem);
    } else if (key === 'circle_info') {
      const weight = elem.isBold !== false ? '700' : '500';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Cairo', sans-serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#475569' : '#dfbc55');
      const rawText = elem.text !== undefined ? elem.text : 'الحلقة: {{اسم_الحلقة}}';
      drawMultilineOrSingle(ctx, formatMentions(rawText, student), 0, 0, elem.size * (elem.lineHeight || 1.3), elem);
    } else if (key === 'teacher_info') {
      const weight = elem.isBold !== false ? '700' : '500';
      ctx.textAlign = elem.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${elem.size}px '${elemFont}', 'Cairo', sans-serif`;
      ctx.fillStyle = elem.color || (state.currentTemplate === 'blank' ? '#475569' : '#dfbc55');
      const rawText = elem.text !== undefined ? elem.text : 'معلم الحلقة: {{اسم_المعلم}}';
      drawMultilineOrSingle(ctx, formatMentions(rawText, student), 0, 0, elem.size * (elem.lineHeight || 1.3), elem);
    }

    ctx.restore();
  }

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
    if (stampElem.rotation) ctx.rotate((stampElem.rotation * Math.PI) / 180);

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

  // =========================================================
  // PINCH-TO-ZOOM & WORKSPACE PAN GESTURES
  // =========================================================
  function applyCanvasTransform() {
    if (!canvasFrame) return;
    canvasFrame.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
    const zoomBadge = document.getElementById('zoomLevelBadge');
    const zoomFitBtn = document.getElementById('zoomFitBtn');
    const isModified = Math.abs(state.scale - 1) > 0.02 || Math.abs(state.panX) > 2 || Math.abs(state.panY) > 2;
    if (zoomBadge) zoomBadge.textContent = `${Math.round(state.scale * 100)}%`;
    if (zoomFitBtn) zoomFitBtn.style.display = isModified ? 'inline-flex' : 'none';
  }

  function setupPanAndGestures() {
    const viewport = document.getElementById('certStageContainer');
    if (!viewport) return;

    let isPanning = false;
    let panHasMoved = false;
    let panPointerId = null;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginClientX = 0;
    let panOriginClientY = 0;
    let initialPinchDistance = 0;
    let initialScale = 1;
    let touchPanStartX = 0;
    let touchPanStartY = 0;
    let twoFingerActive = false;

    const clampPan = (nx, ny) => {
      const rect = viewport.getBoundingClientRect();
      const maxX = Math.max(240, rect.width * state.scale * 0.85);
      const maxY = Math.max(200, rect.height * state.scale * 0.85);
      return {
        x: Math.max(-maxX, Math.min(maxX, nx)),
        y: Math.max(-maxY, Math.min(maxY, ny))
      };
    };

    viewport.addEventListener('pointerdown', (e) => {
      if (e.isPrimary === false) return;
      const isDirectEmptyTarget = e.target === viewport || e.target === canvas || e.target === canvasFrame || e.target === dragOverlay;
      if (!isDirectEmptyTarget || e.target.closest('.drag-box-handle')) return;

      // Single-finger pan on empty area / locked layer, or mouse middle/Alt drag
      const allowPan = e.button === 1 || (e.button === 0 && e.altKey) || e.pointerType === 'touch' || (e.button === 0 && state.scale > 1.02);
      if (allowPan && e.button !== 2) {
        isPanning = true;
        panHasMoved = false;
        panPointerId = e.pointerId;
        panOriginClientX = e.clientX;
        panOriginClientY = e.clientY;
        panStartX = e.clientX - state.panX;
        panStartY = e.clientY - state.panY;
        viewport.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (isPanning && e.pointerId === panPointerId && !twoFingerActive) {
        if (Math.abs(e.clientX - panOriginClientX) > 4 || Math.abs(e.clientY - panOriginClientY) > 4) {
          panHasMoved = true;
        }
        if (panHasMoved) {
          const clamped = clampPan(e.clientX - panStartX, e.clientY - panStartY);
          state.panX = clamped.x;
          state.panY = clamped.y;
          applyCanvasTransform();
        }
      }
    });

    const endMousePan = (e) => {
      if (isPanning && (!e || e.pointerId === panPointerId)) {
        const wasTap = !panHasMoved && !twoFingerActive;
        isPanning = false;
        panPointerId = null;
        viewport.style.cursor = '';
        if (wasTap) {
          if (state.activeElementKey) setSelectedElement(null);
          if (state.layersDrawerOpen) toggleLayersDrawer(false);
        }
      }
    };
    window.addEventListener('pointerup', endMousePan);
    window.addEventListener('pointercancel', endMousePan);

    // Touch Pinch-to-Zoom & 2-Finger Pan
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        twoFingerActive = true;
        isPanning = false;
        // Cancel any single-finger element drag/scale if user puts 2nd finger down to zoom
        if (dragState.isDragging) {
          dragState.isDragging = false;
          dragState.key = null;
          updateSnapGuides(false, false);
          document.querySelectorAll('.drag-box-handle.dragging').forEach((h) => h.classList.remove('dragging'));
        }
        if (scaleDragState.isScaling) {
          scaleDragState.isScaling = false;
          scaleDragState.key = null;
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialScale = state.scale;
        touchPanStartX = ((t1.clientX + t2.clientX) / 2) - state.panX;
        touchPanStartY = ((t1.clientY + t2.clientY) / 2) - state.panY;
      }
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (initialPinchDistance > 0) {
          const ratio = currentDist / initialPinchDistance;
          state.scale = Math.min(3.0, Math.max(0.4, Math.round(initialScale * ratio * 100) / 100));
          const cx = (t1.clientX + t2.clientX) / 2;
          const cy = (t1.clientY + t2.clientY) / 2;
          const clamped = clampPan(cx - touchPanStartX, cy - touchPanStartY);
          state.panX = clamped.x;
          state.panY = clamped.y;
          applyCanvasTransform();
        }
      }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDistance = 0;
        twoFingerActive = false;
      }
    });

    viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.scale = Math.min(3.0, Math.max(0.4, Math.round((state.scale + delta) * 100) / 100));
        applyCanvasTransform();
      }
    }, { passive: false });
  }

  // =========================================================
  // UNDO / REDO HISTORY STACK
  // =========================================================
  function setupHistoryManager() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) undoBtn.addEventListener('click', (e) => { e.stopPropagation(); undo(); });
    if (redoBtn) redoBtn.addEventListener('click', (e) => { e.stopPropagation(); redo(); });

    window.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.activeElementKey) {
        if (target && target.tagName === 'SELECT') return;
        e.preventDefault();
        deleteOrHideActiveElement();
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

    if (history.stack.length > 0 && history.index >= 0 && history.index < history.stack.length) {
      if (history.stack[history.index].data === snapshot) {
        saveDraftToStorage();
        return;
      }
    }

    if (history.index < history.stack.length - 1) {
      history.stack = history.stack.slice(0, history.index + 1);
    }

    history.stack.push({ name: actionName, data: snapshot });
    if (history.stack.length > (history.maxSize || 35)) history.stack.shift();
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
        setSelectedElement(parsed.activeElementKey);
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
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
  }

  // =========================================================
  // EXPORT & NATIVE ANDROID SHARE BRIDGE
  // =========================================================
  function setupExportHandlers() {
    const btnDownloadSinglePng = document.getElementById('btnDownloadSinglePng');
    const btnDownloadSinglePdf = document.getElementById('btnDownloadSinglePdf');
    const btnDownloadBatchZip = document.getElementById('btnDownloadBatchZip');
    const btnDownloadBatchPdf = document.getElementById('btnDownloadBatchPdf');
    const btnShareMobile = document.getElementById('btnShareMobile');
    const btnPrintDirect = document.getElementById('btnPrintDirect');
    const cancelBatchBtn = document.getElementById('cancelBatchExportBtn');
    const exportFormatSelect = document.getElementById('exportFormatSelect');

    if (exportFormatSelect) {
      exportFormatSelect.value = state.exportFormat || 'png_uhd';
      exportFormatSelect.addEventListener('change', (e) => {
        state.exportFormat = e.target.value || 'png_uhd';
      });
    }

    if (btnDownloadSinglePng) btnDownloadSinglePng.addEventListener('click', downloadCurrentCertificatePng);
    if (btnDownloadSinglePdf) btnDownloadSinglePdf.addEventListener('click', downloadCurrentCertificatePdf);
    if (btnDownloadBatchZip) btnDownloadBatchZip.addEventListener('click', downloadBatchZip);
    if (btnDownloadBatchPdf) btnDownloadBatchPdf.addEventListener('click', downloadBatchPdf);
    if (btnShareMobile) btnShareMobile.addEventListener('click', shareCurrentCertificate);
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

  function formatExportSize(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(n / 1024))} KB`;
  }

  function showVerifiedExportCard(title, detailsText, isError = false) {
    const card = document.getElementById('lastExportResultCard');
    const titleEl = document.getElementById('lastExportTitle');
    const pathEl = document.getElementById('lastExportPath');
    if (!card) return;
    card.style.display = 'flex';
    card.style.borderColor = isError ? '#dc2626' : '#16a34a';
    card.style.background = isError ? 'rgba(220, 38, 38, 0.07)' : 'rgba(22, 163, 74, 0.07)';
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.style.color = isError ? '#b91c1c' : '#15803d';
    }
    if (pathEl) pathEl.textContent = detailsText || '';
  }

  function getExportPresetConfig(formatKey) {
    if (formatKey === 'jpg_hd') {
      return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, mime: 'image/jpeg', ext: 'jpg', quality: 0.94, label: 'JPG عالية الجودة' };
    }
    if (formatKey === 'png_std') {
      return { width: 1754, height: 1240, mime: 'image/png', ext: 'png', quality: 1.0, label: 'PNG قياسي' };
    }
    return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, mime: 'image/png', ext: 'png', quality: 1.0, label: 'PNG فائق الدقة' };
  }

  async function renderExportCanvasBlob(sourceCanvas, formatKey) {
    const cfg = getExportPresetConfig(formatKey);
    let targetCanvas = sourceCanvas;
    let tempCanvas = null;

    if (cfg.width !== sourceCanvas.width || cfg.height !== sourceCanvas.height) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = cfg.width;
      tempCanvas.height = cfg.height;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = 'high';
      tCtx.drawImage(sourceCanvas, 0, 0, cfg.width, cfg.height);
      targetCanvas = tempCanvas;
    }

    const blob = await new Promise((resolve) => targetCanvas.toBlob(resolve, cfg.mime, cfg.quality));
    if (tempCanvas) { tempCanvas.width = 0; tempCanvas.height = 0; }
    if (!blob || blob.size <= 0) throw new Error('تعذر توليد بيانات الصورة (0 بايت)');
    return { blob, cfg };
  }

  async function saveBlobOnDevice(blob, filename, options = {}) {
    if (!blob || blob.size <= 0) throw new Error('الملف الناتج فارغ (0 بايت)');

    const target = options.target || 'downloads';
    const mimeType = options.mimeType || blob.type || 'application/octet-stream';
    const capPlugins = window.Capacitor && window.Capacitor.Plugins;

    if (capPlugins && capPlugins.AlbayanExport) {
      const base64Data = await blobToBase64(blob);
      const pluginFn = target === 'gallery'
        ? capPlugins.AlbayanExport.saveImageToGallery
        : capPlugins.AlbayanExport.saveFileToDownloads;

      if (typeof pluginFn === 'function') {
        const res = await pluginFn.call(capPlugins.AlbayanExport, { base64Data, fileName: filename, mimeType });
        if (!res || res.verified !== true || !(Number(res.bytes) > 0)) {
          throw new Error('تعذر التحقق من كتابة الملف على وحدة التخزين');
        }
        return { verified: true, path: res.path || filename, uri: res.uri || '', bytes: Number(res.bytes) };
      }
    }

    if (window.IS_CAPACITOR_APP || (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())) {
      throw new Error('إضافة الحفظ الأصلية AlbayanExport غير متاحة في هذه النسخة');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { verified: true, path: filename, bytes: blob.size };
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

  async function downloadCurrentCertificatePng() {
    const student = state.students[state.currentStudentIndex] || {};
    const formatKey = state.exportFormat || 'png_uhd';
    showToast('جاري تجهيز وحفظ الشهادة في المعرض...');
    try {
      drawCertificateCanvas();
      const { blob, cfg } = await renderExportCanvasBlob(canvas, formatKey);
      const filename = getCleanFileName(student.name, cfg.ext);
      const saved = await saveBlobOnDevice(blob, filename, { target: 'gallery', mimeType: cfg.mime });
      showVerifiedExportCard('تم حفظ الصورة في المعرض بنجاح', `${saved.path} (${formatExportSize(saved.bytes)})`);
      showToast(`تم حفظ الشهادة في المعرض (${formatExportSize(saved.bytes)})`);
    } catch (err) {
      console.error('Image export failed:', err);
      const msg = (err && err.message) ? err.message : 'فشل حفظ الصورة في الجهاز';
      showVerifiedExportCard('فشل تصدير الصورة', msg, true);
      showToast(`تعذر حفظ الشهادة: ${msg}`);
    }
  }

  async function downloadCurrentCertificatePdf() {
    const student = state.students[state.currentStudentIndex] || {};
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('مكتبة PDF غير محملة، جاري فتح نافذة الطباعة...');
      printCurrentCertificate();
      return;
    }
    showToast('جاري إنشاء ملف PDF وحفظه في التنزيلات...');
    try {
      drawCertificateCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.addImage(imgData, 'JPEG', 0, 0, 841.89, 595.28);
      const pdfBlob = doc.output('blob');
      const filename = getCleanFileName(student.name, 'pdf');
      const saved = await saveBlobOnDevice(pdfBlob, filename, { target: 'downloads', mimeType: 'application/pdf' });
      showVerifiedExportCard('تم حفظ ملف PDF في التنزيلات', `${saved.path} (${formatExportSize(saved.bytes)})`);
      showToast(`تم حفظ ملف PDF في التنزيلات (${formatExportSize(saved.bytes)})`);
    } catch (err) {
      console.error('PDF export failed:', err);
      const msg = (err && err.message) ? err.message : 'فشل إنشاء ملف PDF';
      showVerifiedExportCard('فشل تصدير PDF', msg, true);
      showToast(`تعذر حفظ PDF: ${msg}`);
    }
  }

  async function downloadBatchZip() {
    if (!window.JSZip) {
      showToast('مكتبة ضغط ZIP غير محملة، يمكنك استخدام PDF المجمع');
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
    const formatKey = state.exportFormat === 'png_std' ? 'png_std' : 'jpg_hd';
    updateBatchModal(true, 'جاري تجهيز حزمة الشهادات (ZIP)...', 0, total, '');

    try {
      let packedCount = 0;
      for (let i = 0; i < total; i++) {
        if (state.isBatchCancelled) throw new Error('BATCH_CANCELLED');
        const st = state.students[i];
        state.currentStudentIndex = i;
        drawCertificateCanvas();
        updateBatchModal(true, 'جاري تجهيز حزمة الشهادات (ZIP)...', i + 1, total, st.name);

        const { blob, cfg } = await renderExportCanvasBlob(canvas, formatKey);
        zip.file(`${i + 1}_${getCleanFileName(st.name, cfg.ext)}`, blob);
        packedCount += 1;
        await new Promise((r) => setTimeout(r, 15));
      }

      state.currentStudentIndex = initialIndex;
      renderCertificate();

      updateBatchModal(true, 'جاري ضغط وحفظ ملف ZIP...', total, total, `${packedCount} شهادة`);
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } });
      if (!content || content.size <= 0) throw new Error('ملف ZIP الناتج فارغ');

      const zipName = `شهادات_مدرسة_البيان_${new Date().toISOString().slice(0, 10)}.zip`;
      const saved = await saveBlobOnDevice(content, zipName, { target: 'downloads', mimeType: 'application/zip' });
      updateBatchModal(false);
      showVerifiedExportCard(`تم حفظ حزمة ZIP (${packedCount} شهادة)`, `${saved.path} (${formatExportSize(saved.bytes)})`);
      showToast(`تم حفظ ملف ZIP (${packedCount} شهادة) في التنزيلات`);
    } catch (err) {
      updateBatchModal(false);
      state.currentStudentIndex = initialIndex;
      renderCertificate();
      if (err && err.message === 'BATCH_CANCELLED') {
        showToast('تم إلغاء التصدير الجماعي');
      } else {
        console.error('Batch ZIP export error:', err);
        const msg = (err && err.message) ? err.message : 'فشل تصدير ملف ZIP';
        showVerifiedExportCard('فشل التصدير الجماعي ZIP', msg, true);
        showToast(`تعذر حفظ ZIP: ${msg}`);
      }
    }
  }

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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    updateBatchModal(true, 'جاري إنشاء ملف PDF مجمع...', 0, total, '');

    try {
      for (let i = 0; i < total; i++) {
        if (state.isBatchCancelled) throw new Error('BATCH_CANCELLED');
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
      const saved = await saveBlobOnDevice(pdfBlob, pdfName, { target: 'downloads', mimeType: 'application/pdf' });
      updateBatchModal(false);
      showVerifiedExportCard(`تم حفظ PDF المجمع (${total} شهادة)`, `${saved.path} (${formatExportSize(saved.bytes)})`);
      showToast(`تم حفظ ملف PDF لـ ${total} طالب في التنزيلات`);
    } catch (err) {
      updateBatchModal(false);
      state.currentStudentIndex = initialIndex;
      renderCertificate();
      if (err && err.message === 'BATCH_CANCELLED') {
        showToast('تم إلغاء إنشاء ملف PDF');
      } else {
        console.error('Batch PDF export error:', err);
        const msg = (err && err.message) ? err.message : 'فشل إنشاء ملف PDF المجمع';
        showVerifiedExportCard('فشل تصدير PDF المجمع', msg, true);
        showToast(`تعذر حفظ PDF المجمع: ${msg}`);
      }
    }
  }

  async function shareCurrentCertificate() {
    const student = state.students[state.currentStudentIndex] || {};
    const formatKey = state.exportFormat === 'jpg_hd' ? 'jpg_hd' : 'png_uhd';
    showToast('جاري إعداد الشهادة للمشاركة...');
    try {
      drawCertificateCanvas();
      const { blob, cfg } = await renderExportCanvasBlob(canvas, formatKey);
      const filename = getCleanFileName(student.name, cfg.ext);
      const capPlugins = window.Capacitor && window.Capacitor.Plugins;

      if (capPlugins && capPlugins.AlbayanExport && typeof capPlugins.AlbayanExport.shareFile === 'function') {
        const base64Data = await blobToBase64(blob);
        const res = await capPlugins.AlbayanExport.shareFile({
          base64Data,
          fileName: filename,
          mimeType: cfg.mime,
          title: `شهادة تقدير - ${student.name || 'طالب البيان'}`,
          text: `شهادة تكريم وتفوق للطالب / ${student.name || 'طالب البيان'} من مدرسة البيان لتعليم القرآن الكريم.`
        });
        if (res && res.verified) {
          showToast('تم فتح نافذة المشاركة بنجاح!');
          return;
        }
      }

      const file = new File([blob], filename, { type: cfg.mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `شهادة تقدير - ${student.name || 'طالب البيان'}`,
          text: `شهادة تكريم وتفوق للطالب المبارك / ${student.name || 'طالب البيان'} من مدرسة البيان لتعليم القرآن الكريم.`
        });
        showToast('تمت المشاركة بنجاح!');
      } else if (navigator.share) {
        await navigator.share({
          title: `شهادة تقدير - ${student.name || 'طالب البيان'}`,
          text: `شهادة تكريم وتفوق للطالب المبارك / ${student.name || 'طالب البيان'} من مدرسة البيان لتعليم القرآن الكريم.`
        });
      } else {
        const saved = await saveBlobOnDevice(blob, filename, { target: 'gallery', mimeType: cfg.mime });
        showVerifiedExportCard('تم حفظ الصورة في المعرض', `${saved.path} (${formatExportSize(saved.bytes)})`);
        showToast('تم حفظ الشهادة في المعرض للمشاركة اليدوية');
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.error('Share failed:', err);
        showToast(`تعذر مشاركة الشهادة: ${(err && err.message) || 'خطأ غير متوقع'}`);
      }
    }
  }

  function printCurrentCertificate() {
    const dataUrl = canvas.toDataURL('image/png');
    const printContainer = document.getElementById('printContainer');
    if (printContainer) {
      printContainer.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'شهادة التقدير';
      img.onload = () => window.print();
      printContainer.appendChild(img);
      return;
    }
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>طباعة الشهادة</title></head><body onload="window.print();" style="margin:0;"><img src="${dataUrl}" style="width:100vw;height:100vh;object-fit:contain;" alt="شهادة"></body></html>`);
      win.document.close();
    } else {
      showToast('يرجى استخدام خيار حفظ PDF أو PNG للطباعة من الهاتف');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudio);
  } else {
    initStudio();
  }
})();
