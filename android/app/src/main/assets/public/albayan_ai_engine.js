/**
 * ============================================================================
 * ALBAYAN AI — FULL-SYSTEM INTELLIGENT ADMINISTRATIVE AGENT ENGINE
 * ============================================================================
 * Layers:
 *  1. AlbayanAISecurity    : Auth, RBAC permissions, Secret Vault proxy, Single-Use Confirmation Gate
 *  2. AlbayanAIAudit       : Persistent Audit Log & Reversible Operation Undo
 *  3. AlbayanAIDataContext : Live multi-source loader (Firebase + LocalDB + Services)
 *  4. AlbayanAIToolRegistry: 25 validated server/DB-backed tools across all school modules + 10-point anomaly detector
 *  5. AlbayanAIProviders   : Multi-provider LLM Adapters (Gemini, OpenAI, Anthropic, Custom, Built-in Arabic Agent)
 *  6. AlbayanAIMemory      : User-isolated conversations, auto-title, and rolling context summarization
 * ============================================================================
 */
(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    provider: 'builtin', // 'gemini' | 'openai' | 'anthropic' | 'custom' | 'builtin'
    model: 'albayan-agent-v1',
    customEndpoint: '',
    temperature: 0.2,
    thinkingBudget: 1024,
    maxTokens: 2048,
    dailyTokenLimit: 250000,
    fallbackToBuiltin: true
  };

  const PROVIDER_CATALOG = {
    builtin: {
      id: 'builtin',
      label: 'محرك البيان الذكي المدمج',
      requiresKey: false,
      defaultModel: 'albayan-agent-v1',
      models: [
        { id: 'albayan-agent-v1', label: 'محرك البيان التنفيذي v1 (محلي فوري)' }
      ]
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini API',
      requiresKey: true,
      defaultModel: 'gemini-2.5-flash',
      models: [
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (سريع وذكي)' },
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (تحليل وتفكير عميق)' },
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
      ]
    },
    openai: {
      id: 'openai',
      label: 'OpenAI API',
      requiresKey: true,
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'o3-mini', label: 'o3-mini (تفكير منطقي)' }
      ]
    },
    anthropic: {
      id: 'anthropic',
      label: 'Anthropic Claude API',
      requiresKey: true,
      defaultModel: 'claude-3-5-haiku-latest',
      models: [
        { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
        { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' }
      ]
    },
    custom: {
      id: 'custom',
      label: 'مزود متوافق مع OpenAI (Custom)',
      requiresKey: false,
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
        { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B' }
      ]
    }
  };

  const COST_PER_1M = {
    'gemini-2.5-flash': { in: 0.15, out: 0.60 },
    'gemini-2.5-pro': { in: 1.25, out: 5.00 },
    'gemini-2.0-flash': { in: 0.10, out: 0.40 },
    'gemini-1.5-pro': { in: 1.25, out: 5.00 },
    'gpt-4o-mini': { in: 0.15, out: 0.60 },
    'gpt-4o': { in: 2.50, out: 10.00 },
    'o3-mini': { in: 1.10, out: 4.40 },
    'claude-3-5-haiku-latest': { in: 0.80, out: 4.00 },
    'claude-3-7-sonnet-latest': { in: 3.00, out: 15.00 }
  };

  function normAr(val) {
    return String(val || '')
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\s+/g, ' ');
  }

  function normCircleId(id) {
    if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.normalizeCircleId === 'function') {
      return window.AlbayanDataNormalizer.normalizeCircleId(id);
    }
    if (id === null || id === undefined || id === '') return null;
    const s = String(id).replace(/^circles_/i, '').trim();
    const n = Number(s);
    return (!isNaN(n) && isFinite(n) && String(n) === s) ? n : s;
  }

  function normStudentId(id) {
    if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.normalizeStudentId === 'function') {
      return window.AlbayanDataNormalizer.normalizeStudentId(id);
    }
    if (id === null || id === undefined || id === '') return null;
    const s = String(id).replace(/^students_/i, '').trim();
    const n = Number(s);
    return (!isNaN(n) && isFinite(n) && String(n) === s) ? n : s;
  }

  function normUserId(id) {
    if (window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.normalizeUserId === 'function') {
      return window.AlbayanDataNormalizer.normalizeUserId(id);
    }
    if (id === null || id === undefined || id === '') return null;
    const s = String(id).replace(/^users_/i, '').trim();
    const n = Number(s);
    return (!isNaN(n) && isFinite(n) && String(n) === s) ? n : s;
  }

  function formatStudentCountAr(count) {
    const n = Math.max(0, parseInt(count, 10) || 0);
    if (n === 0) return '0 طالب';
    if (n === 1) return 'طالب واحد';
    if (n === 2) return 'طالبان';
    const mod = n % 100;
    if (mod >= 3 && mod <= 10) return `${n} طلاب`;
    if (mod >= 11 && mod <= 99) return `${n} طالباً`;
    return `${n} طالب`;
  }

  function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getNativePlugin() {
    try {
      return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AlbayanExport;
    } catch (e) {
      return null;
    }
  }

  // ==========================================================================
  // LAYER 1: PERMISSIONS, SECURITY, VAULT & CONFIRMATION GATE
  // ==========================================================================
  const AlbayanAISecurity = (function () {
    const pendingConfirmations = new Map();
    const WEB_VAULT_PREFIX = 'ai_vault_secret_v1_';

    function getCurrentUser() {
      try {
        const raw = localStorage.getItem('albayan_logged_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.username || parsed.id || parsed.role)) {
            return parsed;
          }
        }
      } catch (e) {}
      return null;
    }

    function getUserIdentityKey(userInput = null) {
      const u = userInput || getCurrentUser();
      if (!u) return 'guest';
      const idPart = u.id !== undefined && u.id !== null ? String(u.id) : normAr(u.username || 'staff').replace(/\s+/g, '_');
      return `${String(u.role || 'staff').toLowerCase()}_${idPart}`;
    }

    function isAdmin(user = null) {
      const u = user || getCurrentUser();
      if (!u) return false;
      return u.role === 'admin' || u.is_superadmin === 1 || u.is_superadmin === '1';
    }

    function isSupervisor(user = null) {
      const u = user || getCurrentUser();
      return !!(u && u.role === 'supervisor');
    }

    function isTeacher(user = null) {
      const u = user || getCurrentUser();
      return !!(u && (u.role === 'teacher' || u.role === 'معلم'));
    }

    function hasPermission(perm, user = null) {
      const u = user || getCurrentUser();
      if (!u) return false;
      if (isAdmin(u)) return true;
      if (u.role === 'student') return false;
      const perms = Array.isArray(u.permissions) ? u.permissions : [];
      return perms.includes(perm) || perms.includes('*');
    }

    function canConfigureProvider(user = null) {
      const u = user || getCurrentUser();
      if (!u) return false;
      return isAdmin(u);
    }

    function authorizeTool(toolName, args = {}, context = {}) {
      const user = context.user || getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'يجب تسجيل الدخول بحساب كادر معتمد لاستخدام مساعد البيان الذكي.' };
      }
      if (user.role === 'student') {
        return { allowed: false, reason: 'غير مصرح لحسابات الطلاب باستخدام الأدوات الإدارية لمساعد البيان.' };
      }

      const adminOnlyTools = new Set([
        'create_halaqah',
        'delete_halaqah',
        'update_teacher'
      ]);

      if (adminOnlyTools.has(toolName) && !isAdmin(user) && !hasPermission('admin_ai', user) && !hasPermission('users', user)) {
        return {
          allowed: false,
          reason: `صلاحيات حسابك (${user.role || 'كادر'}) لا تسمح بتنفيذ العملية "${toolName}". هذه العملية مخصصة لإدارة المدرسة.`
        };
      }

      if ((toolName === 'delete_student' || toolName === 'update_halaqah') && isTeacher(user) && !hasPermission('manage_circles', user)) {
        return {
          allowed: false,
          reason: `صلاحيات المعلم لا تسمح بحذف الطلاب أو تعديل بيانات الحلقات الإدارية.`
        };
      }

      if ((toolName === 'create_cv' || toolName === 'update_cv') && isTeacher(user) && !hasPermission('student_cv', user) && !isSupervisor(user)) {
        return {
          allowed: false,
          reason: 'حسابك لا يمتلك صلاحية تعديل السيرة الذاتية للطلاب (student_cv).'
        };
      }

      // Teacher scope restriction on single circle operations
      if (isTeacher(user) && !hasPermission('all_circles', user) && args && args.circle_id !== undefined && Array.isArray(context.teacherCircleIds)) {
        const targetCid = String(normCircleId(args.circle_id));
        if (targetCid && !context.teacherCircleIds.includes(targetCid) &&
            ['create_student', 'update_student', 'create_student_record', 'update_student_record'].includes(toolName)) {
          return {
            allowed: false,
            reason: 'غير مصرح لك بتعديل طلاب أو سجلات خارج نطاق حلقاتك المسندة إليك.'
          };
        }
      }

      return { allowed: true };
    }

    // Single-use confirmation tokens (prevents replay or accidental execution)
    function createConfirmation(spec, user) {
      const token = genId('confirm');
      const entry = {
        token,
        userKey: getUserIdentityKey(user),
        toolName: spec.toolName,
        argsSnapshot: JSON.parse(JSON.stringify(spec.args || {})),
        operationTitle: spec.operationTitle,
        targetSummary: spec.targetSummary,
        oldValues: spec.oldValues || {},
        newValues: spec.newValues || {},
        impactWarning: spec.impactWarning || '',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        consumed: false
      };
      pendingConfirmations.set(token, entry);
      return {
        token: entry.token,
        toolName: entry.toolName,
        argsSnapshot: entry.argsSnapshot,
        operationTitle: entry.operationTitle,
        targetSummary: entry.targetSummary,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        impactWarning: entry.impactWarning,
        expiresAt: entry.expiresAt
      };
    }

    function consumeConfirmation(token, toolName, user) {
      if (!token || typeof token !== 'string') return { valid: false, reason: 'رمز التأكيد مفقود.' };
      const entry = pendingConfirmations.get(token);
      if (!entry) return { valid: false, reason: 'رمز التأكيد غير صالح أو منتهي الصلاحية.' };
      if (entry.consumed) return { valid: false, reason: 'تم استخدام هذا التأكيد مسبقاً.' };
      if (Date.now() > entry.expiresAt) {
        pendingConfirmations.delete(token);
        return { valid: false, reason: 'انتهت مهلة صلاحية التأكيد، يُرجى إعادة طلب العملية.' };
      }
      if (entry.toolName !== toolName) {
        return { valid: false, reason: 'رمز التأكيد لا يطابق العملية المطلوبة.' };
      }
      if (entry.userKey !== getUserIdentityKey(user)) {
        return { valid: false, reason: 'رمز التأكيد يخص مستخدماً آخر.' };
      }
      entry.consumed = true;
      pendingConfirmations.delete(token);
      return { valid: true, argsSnapshot: entry.argsSnapshot };
    }

    // Encode/obfuscate fallback secret only when outside native Android vault
    function encodeWebVault(raw) {
      try {
        return 'v1:' + btoa(unescape(encodeURIComponent(String(raw || ''))));
      } catch (e) {
        return '';
      }
    }

    function decodeWebVault(enc) {
      try {
        if (!enc || !String(enc).startsWith('v1:')) return '';
        return decodeURIComponent(escape(atob(String(enc).slice(3))));
      } catch (e) {
        return '';
      }
    }

    async function saveApiKey(provider, apiKey) {
      if (!canConfigureProvider()) {
        throw new Error('صلاحية حفظ مفاتيح API مخصصة لمدير النظام فقط.');
      }
      const p = String(provider || '').trim().toLowerCase();
      const cleanKey = String(apiKey || '').trim();
      const plugin = getNativePlugin();
      if (plugin && typeof plugin.saveAiSecret === 'function') {
        return await plugin.saveAiSecret({ provider: p, apiKey: cleanKey });
      }
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(WEB_VAULT_PREFIX + p, cleanKey ? encodeWebVault(cleanKey) : '');
      }
      const masked = cleanKey
        ? (cleanKey.length <= 6 ? '••••••' : '••••••••' + cleanKey.slice(-4))
        : '';
      return { ok: true, provider: p, configured: !!cleanKey, maskedKey: masked };
    }

    async function getApiKeyStatus(provider) {
      const p = String(provider || '').trim().toLowerCase();
      if (!p || p === 'builtin') return { ok: true, provider: p, configured: true, maskedKey: '' };
      const plugin = getNativePlugin();
      if (plugin && typeof plugin.getAiSecretStatus === 'function') {
        return await plugin.getAiSecretStatus({ provider: p });
      }
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        const stored = await window.AlbayanLocalDB.getSetting(WEB_VAULT_PREFIX + p, '');
        const dec = decodeWebVault(stored);
        const masked = dec
          ? (dec.length <= 6 ? '••••••' : '••••••••' + dec.slice(-4))
          : '';
        return { ok: true, provider: p, configured: !!dec, maskedKey: masked };
      }
      return { ok: true, provider: p, configured: false, maskedKey: '' };
    }

    async function getWebFallbackSecret(provider) {
      const p = String(provider || '').trim().toLowerCase();
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        const stored = await window.AlbayanLocalDB.getSetting(WEB_VAULT_PREFIX + p, '');
        return decodeWebVault(stored);
      }
      return '';
    }

    return {
      getCurrentUser,
      getUserIdentityKey,
      isAdmin,
      isSupervisor,
      isTeacher,
      hasPermission,
      canConfigureProvider,
      authorizeTool,
      createConfirmation,
      consumeConfirmation,
      saveApiKey,
      getApiKeyStatus,
      getWebFallbackSecret
    };
  })();

  // ==========================================================================
  // LAYER 2: PERSISTENT AUDIT LOG & REVERSIBLE UNDO (AlbayanAIAudit)
  // ==========================================================================
  const AlbayanAIAudit = (function () {
    const AUDIT_SETTING_KEY = 'ai_audit_logs_v1';
    const MAX_LOGS = 200;

    async function loadLogs() {
      let logs = [];
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        try {
          const val = await window.AlbayanLocalDB.getSetting(AUDIT_SETTING_KEY, []);
          if (Array.isArray(val)) logs = val;
        } catch (e) {}
      }
      return logs;
    }

    async function recordAudit(entry) {
      const user = AlbayanAISecurity.getCurrentUser() || { username: 'نظام', role: 'system' };
      const record = {
        id: genId('audit'),
        timestamp: new Date().toISOString(),
        username: user.username || 'كادر تعليمي',
        userRole: user.role || 'staff',
        userKey: AlbayanAISecurity.getUserIdentityKey(user),
        conversationId: entry.conversationId || '',
        toolName: entry.toolName || '',
        operation: entry.operation || '',
        targetIds: Array.isArray(entry.targetIds) ? entry.targetIds : (entry.targetIds ? [entry.targetIds] : []),
        targetLabel: entry.targetLabel || '',
        beforeState: entry.beforeState !== undefined ? entry.beforeState : null,
        afterState: entry.afterState !== undefined ? entry.afterState : null,
        status: entry.status || 'ok',
        reversible: !!entry.reversible,
        undone: false
      };

      try {
        const logs = await loadLogs();
        logs.unshift(record);
        if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
          await window.AlbayanLocalDB.saveSetting(AUDIT_SETTING_KEY, logs);
        }
      } catch (e) {}

      if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.put === 'function') {
        window.AlbayanFirebaseDAL.put(`ai_audit_logs/${record.id}`, record, { retries: 0 }).catch(() => {});
      }
      return record;
    }

    async function undoAuditAction(auditId) {
      const logs = await loadLogs();
      const target = logs.find(l => l.id === auditId);
      if (!target) {
        return { ok: false, message: 'لم يتم العثور على سجل العملية المطلوبة.' };
      }
      if (target.undone) {
        return { ok: false, message: 'تم التراجع عن هذه العملية مسبقاً.' };
      }
      if (!target.reversible || !target.beforeState) {
        return { ok: false, message: 'هذه العملية غير قابلة للتراجع التلقائي.' };
      }

      const auth = AlbayanAISecurity.authorizeTool(target.toolName, {}, {});
      if (!auth.allowed) {
        return { ok: false, message: auth.reason };
      }

      let restored = false;
      const before = target.beforeState;

      if (target.toolName === 'update_halaqah' && window.CirclesService) {
        const res = await window.CirclesService.saveCircle(before, { isEdit: true });
        restored = !!(res && res.ok);
      } else if (target.toolName === 'create_halaqah' && before.createdId && window.CirclesService) {
        const res = await window.CirclesService.deleteCircle(before.createdId);
        restored = !!(res && res.ok);
      } else if (target.toolName === 'update_student_record' && window.RosterService) {
        const res = await window.RosterService.updateStudentRecord(
          before.circle_id,
          before.student_id,
          before.period || {},
          before.fields || {},
          before.studentRow || null
        );
        restored = !!(res && res.ok);
      } else if (target.toolName === 'update_student' && window.RosterService) {
        if (before.wasTransfer) {
          const res = await window.RosterService.transferStudent(before.student_id, before.current_circle_id, before.previous_circle_id);
          restored = !!(res && res.ok);
        } else {
          const res = await window.RosterService.updateStudentRecord(
            before.circle_id,
            before.student_id,
            before.period || {},
            { name: before.name },
            before
          );
          restored = !!(res && res.ok);
        }
      } else if (target.toolName === 'update_cv' && typeof window.saveStudentCvToFirebase === 'function') {
        restored = await window.saveStudentCvToFirebase(before);
      } else if (target.toolName === 'update_teacher' && typeof window.saveUserToFirebase === 'function') {
        restored = await window.saveUserToFirebase(before);
      }

      if (!restored) {
        return { ok: false, message: 'تعذر استعادة الحالة السابقة من قاعدة البيانات.' };
      }

      target.undone = true;
      target.undoneAt = new Date().toISOString();
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(AUDIT_SETTING_KEY, logs);
      }

      await recordAudit({
        toolName: 'undo_audit_action',
        operation: `التراجع عن: ${target.operation}`,
        targetIds: target.targetIds,
        targetLabel: target.targetLabel,
        beforeState: target.afterState,
        afterState: target.beforeState,
        reversible: false
      });

      return { ok: true, message: `تم التراجع بنجاح عن العملية: ${target.operation}`, restoredTarget: target.targetLabel };
    }

    return {
      loadLogs,
      recordAudit,
      undoAuditAction
    };
  })();

  // ==========================================================================
  // LAYER 3: LIVE MULTI-SOURCE DATA LOADER (AlbayanAIDataContext)
  // ==========================================================================
  const AlbayanAIDataContext = (function () {
    function getActivePeriod() {
      if (window.AlbayanCycleEngine && typeof window.AlbayanCycleEngine.getConfig === 'function') {
        const cfg = window.AlbayanCycleEngine.getConfig();
        const opts = window.AlbayanCycleEngine.buildPeriodOptionsList(cfg);
        const firstOpt = opts && Array.isArray(opts.options) && opts.options.length > 0 ? opts.options[0] : null;
        return {
          period_type: cfg.mode || cfg.periodType || 'monthly',
          year: '1448',
          month: (firstOpt && firstOpt.value) ? firstOpt.value : 'صفر',
          record_date: ''
        };
      }
      return { period_type: 'monthly', year: '1448', month: 'صفر', record_date: '' };
    }

    async function loadUsers() {
      let users = [];
      if (typeof window.pullUsersFromFirebase === 'function') {
        try { users = await window.pullUsersFromFirebase(); } catch (e) {}
      }
      if ((!users || users.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getUsers === 'function') {
        try { users = await window.AlbayanLocalDB.getUsers(); } catch (e) {}
      }
      if (!users || users.length === 0) {
        try { users = JSON.parse(localStorage.getItem('cached_users_list') || '[]'); } catch (e) {}
      }
      return Array.isArray(users) ? users : [];
    }

    async function loadCircles(forceRefresh = false) {
      let circles = [];
      if (window.CirclesService && typeof window.CirclesService.fetchCircles === 'function') {
        try {
          const res = await window.CirclesService.fetchCircles({ forceRefresh });
          if (res && Array.isArray(res.circles)) circles = res.circles;
        } catch (e) {}
      }
      if ((!circles || circles.length === 0) && window.AlbayanStateStore && typeof window.AlbayanStateStore.getCircles === 'function') {
        circles = window.AlbayanStateStore.getCircles();
      }
      if ((!circles || circles.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === 'function') {
        try { circles = await window.AlbayanLocalDB.getLocalCircles(); } catch (e) {}
      }
      return Array.isArray(circles) ? circles : [];
    }

    async function loadRawStudentsAndRecords() {
      let rawStudents = [];
      let rawRecords = [];

      if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
        const [stuRes, recRes] = await Promise.all([
          window.AlbayanFirebaseDAL.get('students').catch(() => ({ ok: false })),
          window.AlbayanFirebaseDAL.get('student_records').catch(() => ({ ok: false }))
        ]);

        const normalizer = window.AlbayanDataNormalizer;
        if (stuRes && stuRes.ok && stuRes.data) {
          if (normalizer && typeof normalizer.normalizeCollectionEntries === 'function') {
            rawStudents = normalizer.normalizeCollectionEntries(stuRes.data).map(([k, v]) => ({
              ...v,
              _fbKey: k,
              id: normStudentId(v.id !== undefined ? v.id : (v.student_id !== undefined ? v.student_id : k)),
              circle_id: normCircleId(v.circle_id)
            }));
          }
        }
        if (recRes && recRes.ok && recRes.data && normalizer) {
          rawRecords = normalizer.normalizeCollectionEntries(recRes.data).map(([k, v]) => ({
            ...v,
            _fbKey: k,
            student_id: normStudentId(v.student_id !== undefined ? v.student_id : v.id),
            circle_id: normCircleId(v.circle_id)
          }));
        }
      }

      // Deduplicate active canonical students respecting tombstones
      const deletedCircles = (window.AlbayanStateStore && window.AlbayanStateStore.getDeletedIds)
        ? window.AlbayanStateStore.getDeletedIds('deleted_circles')
        : new Set();
      const deletedStudents = (window.AlbayanStateStore && window.AlbayanStateStore.getDeletedIds)
        ? window.AlbayanStateStore.getDeletedIds('deleted_students')
        : new Set();

      const uniqueStudentsMap = new Map();
      const duplicateEntries = [];

      rawStudents.forEach(s => {
        if (!s || s.id === null || s.id === undefined) return;
        const sidStr = String(s.id);
        if (deletedStudents.has(sidStr)) return;
        if (uniqueStudentsMap.has(sidStr)) {
          duplicateEntries.push({ type: 'same_id', key: s._fbKey, student: s });
          return;
        }
        uniqueStudentsMap.set(sidStr, s);
      });

      // Fallback from LocalDB if offline / empty cloud
      if (uniqueStudentsMap.size === 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.exportFullDatabase === 'function') {
        try {
          const exported = await window.AlbayanLocalDB.exportFullDatabase();
          const lStu = (exported && exported.stores && exported.stores.students) || [];
          const lRec = (exported && exported.stores && exported.stores.student_records) || [];
          lStu.forEach(s => {
            const sid = normStudentId(s.id !== undefined ? s.id : s.student_id);
            if (sid !== null && !deletedStudents.has(String(sid))) {
              uniqueStudentsMap.set(String(sid), { ...s, id: sid, circle_id: normCircleId(s.circle_id) });
            }
          });
          if (rawRecords.length === 0) rawRecords = lRec;
        } catch (e) {}
      }

      return {
        students: Array.from(uniqueStudentsMap.values()),
        rawStudents,
        records: rawRecords,
        duplicateIdEntries: duplicateEntries,
        deletedCircles,
        deletedStudents
      };
    }

    async function loadExamsAndResults() {
      let exams = [];
      let results = [];
      if (typeof window.pullExamsFromFirebase === 'function') {
        try { exams = await window.pullExamsFromFirebase(); } catch (e) {}
      }
      if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
        try {
          const res = await window.AlbayanFirebaseDAL.get('exam_results');
          if (res && res.ok && res.data && window.AlbayanDataNormalizer) {
            results = window.AlbayanDataNormalizer.normalizeCollectionEntries(res.data).map(([k, r]) => ({ ...r, id: r.id || k }));
          }
        } catch (e) {}
      }
      return {
        exams: Array.isArray(exams) ? exams : [],
        results: Array.isArray(results) ? results : []
      };
    }

    async function loadStudentCvs() {
      let cvs = [];
      if (typeof window.pullStudentCvsFromFirebase === 'function') {
        try { cvs = await window.pullStudentCvsFromFirebase(); } catch (e) {}
      }
      return Array.isArray(cvs) ? cvs : [];
    }

    async function loadFullSnapshot(force = false) {
      const [circles, users, stuRec, examsData] = await Promise.all([
        loadCircles(force),
        loadUsers(),
        loadRawStudentsAndRecords(),
        loadExamsAndResults()
      ]);

      const circleById = new Map();
      circles.forEach(c => {
        const cid = normCircleId(c.id);
        if (cid !== null) circleById.set(String(cid), c);
      });

      const userById = new Map();
      users.forEach(u => {
        const uid = normUserId(u.id);
        if (uid !== null) userById.set(String(uid), u);
      });

      const enrichedCircles = circles.map(c => {
        const cid = normCircleId(c.id);
        const teacherObj = c.teacher_id ? userById.get(String(normUserId(c.teacher_id))) : null;
        const resolvedTeacherName = (c.teacher_name && c.teacher_name.trim()) || (teacherObj && teacherObj.username) || '';
        const liveStudents = stuRec.students.filter(s => String(normCircleId(s.circle_id)) === String(cid));
        return {
          ...c,
          id: cid,
          resolved_teacher_name: resolvedTeacherName,
          stored_student_count: Number(c.student_count || 0),
          live_student_count: liveStudents.length
        };
      });

      return {
        circles: enrichedCircles,
        users,
        students: stuRec.students,
        rawStudents: stuRec.rawStudents,
        records: stuRec.records,
        duplicateIdEntries: stuRec.duplicateIdEntries,
        deletedCircles: stuRec.deletedCircles,
        deletedStudents: stuRec.deletedStudents,
        exams: examsData.exams,
        examResults: examsData.results,
        circleById,
        userById,
        activePeriod: getActivePeriod()
      };
    }

    return {
      getActivePeriod,
      loadUsers,
      loadCircles,
      loadRawStudentsAndRecords,
      loadExamsAndResults,
      loadStudentCvs,
      loadFullSnapshot
    };
  })();

  // ==========================================================================
  // LAYER 4: CENTRAL TOOL REGISTRY (25 SERVER/DB-BACKED REAL TOOLS)
  // ==========================================================================
  const AlbayanAIToolRegistry = (function () {
    const tools = new Map();

    function register(def) {
      tools.set(def.name, def);
    }

    function resolveTeacherInUsers(users, teacherQuery) {
      if (!teacherQuery) return { exact: null, candidates: [] };
      const q = normAr(teacherQuery);
      const qClean = q.replace(/^(الاستاذ|أستاذ|المعلم|معلم|الشيخ|شيخ)\s+/g, '').trim();
      const teachers = users.filter(u => ['teacher', 'معلم', 'supervisor', 'admin'].includes(String(u.role || '').toLowerCase()));
      const exact = teachers.filter(u => {
        const uname = normAr(u.username || u.full_name || '');
        return uname === q || uname === qClean;
      });
      if (exact.length === 1) return { exact: exact[0], candidates: exact };
      const partial = teachers.filter(u => {
        const uname = normAr(u.username || u.full_name || '');
        return uname.includes(qClean || q);
      });
      return { exact: partial.length === 1 ? partial[0] : null, candidates: partial };
    }

    function resolveCircleInList(circles, idOrName) {
      if (idOrName === null || idOrName === undefined || idOrName === '') return { exact: null, candidates: [] };
      const numId = normCircleId(idOrName);
      const byId = circles.find(c => String(normCircleId(c.id)) === String(numId));
      if (byId) return { exact: byId, candidates: [byId] };

      const q = normAr(idOrName).replace(/^حلقة\s+/g, '').trim();
      const fullQ = normAr(idOrName);
      const exact = circles.filter(c => {
        const n = normAr(c.name);
        return n === fullQ || n.replace(/^حلقة\s+/g, '').trim() === q;
      });
      if (exact.length === 1) return { exact: exact[0], candidates: exact };
      const partial = circles.filter(c => {
        const n = normAr(c.name);
        return n.includes(q || fullQ);
      });
      return { exact: partial.length === 1 ? partial[0] : null, candidates: partial };
    }

    function resolveStudentInList(students, circles, query, circleIdFilter = null) {
      let pool = students;
      if (circleIdFilter !== null && circleIdFilter !== undefined && circleIdFilter !== '') {
        const cidStr = String(normCircleId(circleIdFilter));
        pool = pool.filter(s => String(normCircleId(s.circle_id)) === cidStr);
      }
      if (query === null || query === undefined || query === '') return { exact: null, candidates: [] };
      const maybeId = normStudentId(query);
      const byId = pool.find(s => String(normStudentId(s.id)) === String(maybeId));
      if (byId) return { exact: byId, candidates: [byId] };

      const q = normAr(query);
      const exact = pool.filter(s => normAr(s.name) === q);
      if (exact.length === 1) return { exact: exact[0], candidates: exact };
      if (exact.length > 1) return { exact: null, candidates: exact };

      const partial = pool.filter(s => normAr(s.name).includes(q));
      return { exact: partial.length === 1 ? partial[0] : null, candidates: partial };
    }

    // ------------------------------------------------------------------------
    // 1. get_dashboard_data
    // ------------------------------------------------------------------------
    register({
      name: 'get_dashboard_data',
      category: 'نظرة عامة',
      label: 'ملخص لوحة المدرسة الشاملة',
      description: 'يجلب نظرة تنفيذية شاملة على أعداد الحلقات والطلاب والمعلمين والاختبارات ونظام المدة ومزامنة السحابة.',
      parameters: { type: 'object', properties: {} },
      async execute() {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const teachers = snap.users.filter(u => u.role === 'teacher' || u.role === 'معلم');
        const cycleCfg = window.AlbayanCycleEngine ? window.AlbayanCycleEngine.getConfig() : null;
        const cycleStats = (cycleCfg && window.AlbayanCycleEngine) ? window.AlbayanCycleEngine.computeCycleStats(cycleCfg) : null;
        return {
          ok: true,
          summary: {
            total_circles: snap.circles.length,
            total_students_active: snap.students.length,
            total_records: snap.records.length,
            total_teachers: teachers.length,
            total_users: snap.users.length,
            total_exams: snap.exams.length,
            total_exam_results: snap.examResults.length,
            active_period: snap.activePeriod,
            cycle_config: cycleCfg,
            cycle_stats: cycleStats,
            sync_status: window.AlbayanDiagnostics ? window.AlbayanDiagnostics.getStatus() : 'unknown'
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 2. get_all_halaqat
    // ------------------------------------------------------------------------
    register({
      name: 'get_all_halaqat',
      category: 'الحلقات',
      label: 'قراءة جميع الحلقات القرآنية',
      description: 'يعرض الحلقات القرآنية مع المعلم المسؤول وعدد الطلاب والوصف، مع دعم البحث والتصفية والتقسيم إلى صفحات.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'بحث اختياري باسم الحلقة أو المعلم' },
          description_filter: { type: 'string', description: 'تصفية اختيارية حسب وصف الحلقة' },
          limit: { type: 'number', description: 'الحد الأقصى للنتائج في الصفحة (افتراضي 25)' },
          offset: { type: 'number', description: 'إزاحة البداية للنتائج (افتراضي 0)' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let list = snap.circles;
        if (args.query) {
          const q = normAr(args.query);
          list = list.filter(c => normAr(c.name).includes(q) || normAr(c.resolved_teacher_name).includes(q) || normAr(c.description).includes(q));
        }
        if (args.description_filter) {
          const dTarget = String(args.description_filter).trim();
          list = list.filter(c => String(c.description || '').trim() === dTarget);
        }
        const limit = Math.max(1, Math.min(100, Number(args.limit || 25)));
        const offset = Math.max(0, Number(args.offset || 0));
        const paged = list.slice(offset, offset + limit).map(c => ({
          id: c.id,
          name: c.name,
          teacher_id: c.teacher_id || null,
          teacher_name: c.resolved_teacher_name || 'غير محدد',
          description: c.description || '',
          stored_student_count: c.stored_student_count,
          live_student_count: c.live_student_count,
          student_count_label: formatStudentCountAr(c.live_student_count || c.stored_student_count),
          created_at: c.created_at || ''
        }));

        return {
          ok: true,
          total: list.length,
          offset,
          limit,
          circles: paged
        };
      }
    });

    // ------------------------------------------------------------------------
    // 3. get_halaqah_details
    // ------------------------------------------------------------------------
    register({
      name: 'get_halaqah_details',
      category: 'الحلقات',
      label: 'جلب تفاصيل حلقة قرآنية',
      description: 'يعرض كافة تفاصيل حلقة معينة وطلابها وسجل الغياب والحفظ.',
      parameters: {
        type: 'object',
        properties: {
          circle_id: { type: 'string', description: 'معرف الحلقة' },
          circle_name: { type: 'string', description: 'اسم الحلقة' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const res = resolveCircleInList(snap.circles, args.circle_id || args.circle_name);
        if (!res.exact) {
          return {
            ok: false,
            error: res.candidates.length > 1
              ? 'تم العثور على أكثر من حلقة مطابقة، يُرجى تحديد الاسم الكامل.'
              : 'لم يتم العثور على الحلقة المطلوبة.',
            candidates: res.candidates.map(c => ({ id: c.id, name: c.name }))
          };
        }
        const circle = res.exact;
        const students = snap.students.filter(s => String(normCircleId(s.circle_id)) === String(circle.id));
        return {
          ok: true,
          circle: {
            id: circle.id,
            name: circle.name,
            teacher_id: circle.teacher_id || null,
            teacher_name: circle.resolved_teacher_name || 'غير محدد',
            description: circle.description || '',
            stored_student_count: circle.stored_student_count,
            live_student_count: students.length
          },
          students: students.map(s => ({ id: s.id, name: s.name, created_at: s.created_at || '' }))
        };
      }
    });

    // ------------------------------------------------------------------------
    // 4. create_halaqah
    // ------------------------------------------------------------------------
    register({
      name: 'create_halaqah',
      category: 'الحلقات',
      label: 'إنشاء حلقة قرآنية جديدة',
      description: 'ينشئ حلقة قرآنية جديدة بالاسم والوصف والمعلم المسؤول بعد التحقق من وجود الحلقة مسبقاً.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم الحلقة الجديدة (مطلوب)' },
          teacher_name: { type: 'string', description: 'اسم المعلم المسؤول' },
          teacher_id: { type: 'string', description: 'معرف المعلم' },
          description: { type: 'string', description: 'وصف أو مستوى الحلقة' }
        },
        required: ['name']
      },
      async execute(args = {}, context = {}) {
        const cleanName = String(args.name || '').trim();
        if (!cleanName) {
          return { ok: false, missingFields: ['name'], message: 'يرجى تحديد اسم الحلقة الجديدة قبل الإنشاء.' };
        }
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const dup = snap.circles.find(c => normAr(c.name) === normAr(cleanName));
        if (dup) {
          return { ok: false, message: `توجد حلقة مسجلة مسبقاً بنفس الاسم "${dup.name}" (المعرّف: ${dup.id}).` };
        }

        let teacherId = args.teacher_id ? normUserId(args.teacher_id) : null;
        let teacherName = String(args.teacher_name || '').trim();
        if (teacherName && !teacherId) {
          const tRes = resolveTeacherInUsers(snap.users, teacherName);
          if (tRes.exact) {
            teacherId = normUserId(tRes.exact.id);
            teacherName = tRes.exact.username;
          } else if (tRes.candidates.length > 1) {
            return {
              ok: false,
              ambiguous: 'teacher',
              message: `يوجد أكثر من معلم يطابق الاسم "${teacherName}". يرجى اختيار المعلم المطلوب:`,
              candidates: tRes.candidates.map(u => ({ id: u.id, username: u.username, role: u.role }))
            };
          }
        }

        const newId = Date.now();
        const payload = {
          id: newId,
          local_id: newId,
          name: cleanName,
          description: String(args.description || '').trim(),
          teacher_id: teacherId,
          teacher_name: teacherName,
          student_count: 0,
          created_at: new Date().toISOString()
        };

        if (!window.CirclesService || typeof window.CirclesService.saveCircle !== 'function') {
          return { ok: false, message: 'خدمة الحلقات (CirclesService) غير متاحة حالياً.' };
        }
        const saveRes = await window.CirclesService.saveCircle(payload, { isEdit: false });
        if (!saveRes || !saveRes.ok) {
          return { ok: false, message: (saveRes && saveRes.error && saveRes.error.message) || 'تعذر حفظ الحلقة الجديدة.' };
        }

        await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'create_halaqah',
          operation: `إنشاء حلقة "${saveRes.circle.name}"`,
          targetIds: [saveRes.circle.id],
          targetLabel: saveRes.circle.name,
          beforeState: { createdId: saveRes.circle.id },
          afterState: saveRes.circle,
          reversible: true
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: true,
          synced: saveRes.synced,
          circle: saveRes.circle,
          operationCard: {
            title: 'تم إنشاء الحلقة القرآنية بنجاح',
            entity: saveRes.circle.name,
            changes: [
              { field: 'الاسم', before: '—', after: saveRes.circle.name },
              { field: 'المعلم', before: '—', after: saveRes.circle.teacher_name || 'إدارة عامة' },
              { field: 'الوصف', before: '—', after: saveRes.circle.description || 'بدون وصف' }
            ],
            synced: saveRes.synced
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 5. update_halaqah
    // ------------------------------------------------------------------------
    register({
      name: 'update_halaqah',
      category: 'الحلقات',
      label: 'تعديل بيانات حلقة قرآنية',
      description: 'يعدّل اسم الحلقة أو وصفها أو المعلم المسؤول عنها بعد التحقق من هويتها.',
      parameters: {
        type: 'object',
        properties: {
          circle_id: { type: 'string' },
          circle_name: { type: 'string', description: 'اسم الحلقة الحالية المراد تعديلها' },
          new_name: { type: 'string' },
          new_description: { type: 'string' },
          new_teacher_name: { type: 'string' },
          new_teacher_id: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const cRes = resolveCircleInList(snap.circles, args.circle_id || args.circle_name);
        if (!cRes.exact) {
          return {
            ok: false,
            message: cRes.candidates.length > 1
              ? 'يوجد أكثر من حلقة مطابقة. يرجى تحديد الحلقة بدقة:'
              : 'لم يتم العثور على الحلقة المراد تعديلها.',
            candidates: cRes.candidates.map(c => ({ id: c.id, name: c.name }))
          };
        }

        const existing = cRes.exact;
        let nextTeacherId = existing.teacher_id || null;
        let nextTeacherName = existing.teacher_name || existing.resolved_teacher_name || '';

        if (args.new_teacher_id !== undefined) {
          nextTeacherId = args.new_teacher_id ? normUserId(args.new_teacher_id) : null;
          const tObj = snap.users.find(u => String(normUserId(u.id)) === String(nextTeacherId));
          nextTeacherName = tObj ? tObj.username : (args.new_teacher_name || '');
        } else if (args.new_teacher_name !== undefined) {
          const tRes = resolveTeacherInUsers(snap.users, args.new_teacher_name);
          if (tRes.exact) {
            nextTeacherId = normUserId(tRes.exact.id);
            nextTeacherName = tRes.exact.username;
          } else {
            nextTeacherName = String(args.new_teacher_name).trim();
          }
        }

        const updatedPayload = {
          ...existing,
          name: args.new_name !== undefined ? String(args.new_name).trim() : existing.name,
          description: args.new_description !== undefined ? String(args.new_description).trim() : (existing.description || ''),
          teacher_id: nextTeacherId,
          teacher_name: nextTeacherName
        };

        const changes = [];
        if (updatedPayload.name !== existing.name) changes.push({ field: 'اسم الحلقة', before: existing.name, after: updatedPayload.name });
        if ((updatedPayload.description || '') !== (existing.description || '')) changes.push({ field: 'وصف الحلقة', before: existing.description || 'فارغ', after: updatedPayload.description || 'فارغ' });
        if ((updatedPayload.teacher_name || '') !== (existing.teacher_name || existing.resolved_teacher_name || '')) {
          changes.push({ field: 'المعلم المسؤول', before: existing.resolved_teacher_name || 'غير محدد', after: updatedPayload.teacher_name || 'غير محدد' });
        }

        if (changes.length === 0) {
          return { ok: false, message: 'لم يتم تمرير أي قيم جديدة مختلفة لتعديل الحلقة.' };
        }

        const saveRes = await window.CirclesService.saveCircle(updatedPayload, { isEdit: true });
        if (!saveRes || !saveRes.ok) {
          return { ok: false, message: 'تعذر حفظ تعديلات الحلقة.' };
        }

        const auditRec = await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'update_halaqah',
          operation: `تعديل حلقة "${existing.name}"`,
          targetIds: [existing.id],
          targetLabel: updatedPayload.name,
          beforeState: existing,
          afterState: saveRes.circle,
          reversible: true
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: true,
          synced: saveRes.synced,
          auditId: auditRec.id,
          circle: saveRes.circle,
          operationCard: {
            title: 'تم تحديث بيانات الحلقة بنجاح',
            entity: saveRes.circle.name,
            changes,
            auditId: auditRec.id,
            reversible: true,
            synced: saveRes.synced
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 6. delete_halaqah (SENSITIVE — REQUIRES EXPLICIT CONFIRMATION)
    // ------------------------------------------------------------------------
    register({
      name: 'delete_halaqah',
      category: 'الحلقات',
      label: 'حذف حلقة قرآنية',
      description: 'يحذف حلقة قرآنية مع جميع بياناتها وطلابها بعد موافقة صريحة من المستخدم.',
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          circle_id: { type: 'string' },
          circle_name: { type: 'string' },
          confirm_token: { type: 'string', description: 'يُمرر فقط بعد تأكيد المستخدم التفاعلي' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const cRes = resolveCircleInList(snap.circles, args.circle_id || args.circle_name);
        if (!cRes.exact) {
          return {
            ok: false,
            message: cRes.candidates.length > 1
              ? 'يرجى تحديد الحلقة الدقيقة المراد حذفها:'
              : 'لم يتم العثور على الحلقة المراد حذفها.',
            candidates: cRes.candidates.map(c => ({ id: c.id, name: c.name }))
          };
        }
        const targetCircle = cRes.exact;
        const user = context.user || AlbayanAISecurity.getCurrentUser();

        if (!args.confirm_token) {
          const confirmation = AlbayanAISecurity.createConfirmation({
            toolName: 'delete_halaqah',
            args: { circle_id: String(targetCircle.id), circle_name: targetCircle.name },
            operationTitle: `حذف حلقة "${targetCircle.name}"`,
            targetSummary: `الحلقة: ${targetCircle.name} (المعرّف: ${targetCircle.id})`,
            oldValues: {
              الاسم: targetCircle.name,
              المعلم: targetCircle.resolved_teacher_name || 'غير محدد',
              الوصف: targetCircle.description || 'بدون وصف',
              عدد_الطلاب: formatStudentCountAr(targetCircle.live_student_count)
            },
            newValues: { الحالة: 'محذوفة مع طلابها وسجلاتها' },
            impactWarning: `سيؤدي هذا الإجراء إلى حذف الحلقة و${formatStudentCountAr(targetCircle.live_student_count)} وسجلاتهم المرتبطة بها.`
          }, user);
          return { ok: false, status: 'CONFIRMATION_REQUIRED', confirmation };
        }

        const check = AlbayanAISecurity.consumeConfirmation(args.confirm_token, 'delete_halaqah', user);
        if (!check.valid) {
          return { ok: false, message: check.reason };
        }

        const delRes = await window.CirclesService.deleteCircle(targetCircle.id);
        await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'delete_halaqah',
          operation: `حذف حلقة "${targetCircle.name}"`,
          targetIds: [targetCircle.id],
          targetLabel: targetCircle.name,
          beforeState: targetCircle,
          afterState: { deleted: true },
          reversible: false
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: !!(delRes && delRes.ok),
          synced: !!(delRes && delRes.synced),
          operationCard: {
            title: 'تم حذف الحلقة القرآنية',
            entity: targetCircle.name,
            changes: [{ field: 'الحالة', before: 'نشطة', after: 'تم الحذف النهائي' }],
            synced: !!(delRes && delRes.synced)
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 7. get_students
    // ------------------------------------------------------------------------
    register({
      name: 'get_students',
      category: 'الطلاب',
      label: 'جلب والبحث عن الطلاب',
      description: 'يبحث في قائمة الطلاب ويعرض بياناتهم وحلقاتهم مع دعم Pagination.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'اسم الطالب أو جزء منه' },
          circle_id: { type: 'string' },
          circle_name: { type: 'string' },
          limit: { type: 'number' },
          offset: { type: 'number' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let list = snap.students;
        if (args.circle_id || args.circle_name) {
          const cRes = resolveCircleInList(snap.circles, args.circle_id || args.circle_name);
          if (cRes.exact) {
            list = list.filter(s => String(normCircleId(s.circle_id)) === String(cRes.exact.id));
          } else {
            return { ok: false, message: 'لم يتم العثور على الحلقة المحددة للتصفية.' };
          }
        }
        if (args.query) {
          const q = normAr(args.query);
          list = list.filter(s => normAr(s.name).includes(q));
        }
        const limit = Math.max(1, Math.min(100, Number(args.limit || 25)));
        const offset = Math.max(0, Number(args.offset || 0));
        const items = list.slice(offset, offset + limit).map(s => {
          const cObj = snap.circleById.get(String(normCircleId(s.circle_id)));
          return {
            id: s.id,
            name: s.name,
            circle_id: s.circle_id,
            circle_name: cObj ? cObj.name : 'بدون حلقة / حلقة غير موجودة',
            created_at: s.created_at || ''
          };
        });
        return { ok: true, total: list.length, offset, limit, students: items };
      }
    });

    // ------------------------------------------------------------------------
    // 8. get_student_details
    // ------------------------------------------------------------------------
    register({
      name: 'get_student_details',
      category: 'الطلاب',
      label: 'عرض ملف وسجلات طالب',
      description: 'يعرض تفاصيل طالب معين مع حلقته وسجلات درجاته الشهرية واليومية.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let cFilter = null;
        if (args.circle_name) {
          const cRes = resolveCircleInList(snap.circles, args.circle_name);
          if (cRes.exact) cFilter = cRes.exact.id;
        }
        const sRes = resolveStudentInList(snap.students, snap.circles, args.student_id || args.student_name, cFilter);
        if (!sRes.exact) {
          return {
            ok: false,
            ambiguous: sRes.candidates.length > 1,
            message: sRes.candidates.length > 1
              ? 'يوجد أكثر من طالب بنفس الاسم؛ يرجى تحديد الطالب المقصود وحلقته:'
              : 'لم يتم العثور على الطالب المطلوب.',
            candidates: sRes.candidates.map(s => {
              const c = snap.circleById.get(String(normCircleId(s.circle_id)));
              return { id: s.id, name: s.name, circle_id: s.circle_id, circle_name: c ? c.name : 'غير محدد' };
            })
          };
        }
        const student = sRes.exact;
        const circle = snap.circleById.get(String(normCircleId(student.circle_id)));
        const stuRecords = snap.records.filter(r => String(normStudentId(r.student_id)) === String(student.id));
        const stuExamResults = snap.examResults.filter(er =>
          String(er.student_id || '') === String(student.id) || normAr(er.student_name) === normAr(student.name)
        );
        return {
          ok: true,
          student: {
            id: student.id,
            name: student.name,
            circle_id: student.circle_id,
            circle_name: circle ? circle.name : 'غير مرتبط بحلقة',
            teacher_name: circle ? circle.resolved_teacher_name : 'غير محدد'
          },
          records: stuRecords.slice(0, 15),
          exam_results: stuExamResults.slice(0, 10)
        };
      }
    });

    // ------------------------------------------------------------------------
    // 9. create_student
    // ------------------------------------------------------------------------
    register({
      name: 'create_student',
      category: 'الطلاب',
      label: 'إضافة طالب إلى حلقة',
      description: 'يضيف طالباً جديداً إلى حلقة قرآنية حقيقية بعد التحقق من وجود الحلقة وعدم تكرار الاسم.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم الطالب الكامل (مطلوب)' },
          circle_id: { type: 'string' },
          circle_name: { type: 'string', description: 'اسم الحلقة المستهدفة' },
          force_duplicate: { type: 'boolean', description: 'متابعة الإضافة حتى مع تشابه الاسم' }
        },
        required: ['name']
      },
      async execute(args = {}, context = {}) {
        const cleanName = String(args.name || '').trim();
        if (!cleanName) {
          return { ok: false, missingFields: ['name'], message: 'يرجى تحديد اسم الطالب المراد إضافته.' };
        }
        if (!args.circle_id && !args.circle_name) {
          return { ok: false, missingFields: ['circle_name'], message: `يرجى تحديد اسم الحلقة التي سيُضاف إليها الطالب "${cleanName}".` };
        }
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const cRes = resolveCircleInList(snap.circles, args.circle_id || args.circle_name);
        if (!cRes.exact) {
          return {
            ok: false,
            message: cRes.candidates.length > 1
              ? 'تطابق الاسم مع أكثر من حلقة، يرجى التحديد:'
              : `لم يتم العثور على حلقة باسم "${args.circle_name || args.circle_id}".`,
            candidates: cRes.candidates.map(c => ({ id: c.id, name: c.name }))
          };
        }
        const circle = cRes.exact;
        const auth = AlbayanAISecurity.authorizeTool('create_student', { circle_id: circle.id }, context);
        if (!auth.allowed) return { ok: false, message: auth.reason };

        // Check duplicate in same circle or school
        const sameInCircle = snap.students.find(s =>
          String(normCircleId(s.circle_id)) === String(circle.id) && normAr(s.name) === normAr(cleanName)
        );
        if (sameInCircle && !args.force_duplicate) {
          return {
            ok: false,
            duplicateDetected: true,
            message: `الطالب "${sameInCircle.name}" موجود بالفعل داخل "${circle.name}" (المعرّف: ${sameInCircle.id}).`
          };
        }

        if (!window.RosterService || typeof window.RosterService.addStudent !== 'function') {
          return { ok: false, message: 'خدمة الطلاب (RosterService) غير متاحة حالياً.' };
        }
        const res = await window.RosterService.addStudent(circle.id, cleanName, {}, snap.activePeriod);
        if (!res || !res.ok) {
          return { ok: false, message: (res && res.error && res.error.message) || 'تعذر إضافة الطالب.' };
        }

        await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'create_student',
          operation: `إضافة الطالب "${cleanName}" إلى "${circle.name}"`,
          targetIds: [res.student.id],
          targetLabel: cleanName,
          beforeState: null,
          afterState: res.student,
          reversible: false
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: true,
          synced: res.synced,
          student: res.student,
          operationCard: {
            title: 'تمت إضافة الطالب بنجاح',
            entity: res.student.name,
            changes: [
              { field: 'الطالب', before: '—', after: res.student.name },
              { field: 'الحلقة', before: '—', after: circle.name }
            ],
            synced: res.synced
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 10. update_student (rename or transfer between circles)
    // ------------------------------------------------------------------------
    register({
      name: 'update_student',
      category: 'الطلاب',
      label: 'تعديل أو نقل طالب',
      description: 'يعدّل اسم الطالب أو ينقله إلى حلقة قرآنية أخرى مع التأكد من هويته.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string', description: 'الحلقة الحالية للطالب لتفادي التشابه' },
          new_name: { type: 'string' },
          target_circle_id: { type: 'string' },
          target_circle_name: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let cFilter = null;
        if (args.circle_name) {
          const cr = resolveCircleInList(snap.circles, args.circle_name);
          if (cr.exact) cFilter = cr.exact.id;
        }
        const sRes = resolveStudentInList(snap.students, snap.circles, args.student_id || args.student_name, cFilter);
        if (!sRes.exact) {
          return {
            ok: false,
            ambiguous: sRes.candidates.length > 1,
            message: sRes.candidates.length > 1
              ? 'يوجد أكثر من طالب يحمل هذا الاسم؛ لا يمكن التعديل قبل تحديد الطالب المطلوب وحلقته:'
              : 'لم يتم العثور على الطالب.',
            candidates: sRes.candidates.map(s => {
              const c = snap.circleById.get(String(normCircleId(s.circle_id)));
              return { id: s.id, name: s.name, circle_name: c ? c.name : 'غير محدد' };
            })
          };
        }

        const student = sRes.exact;
        const currentCircle = snap.circleById.get(String(normCircleId(student.circle_id)));
        const changes = [];
        let auditBefore = { student_id: student.id, circle_id: student.circle_id, name: student.name, period: snap.activePeriod };

        if (args.target_circle_id || args.target_circle_name) {
          const destRes = resolveCircleInList(snap.circles, args.target_circle_id || args.target_circle_name);
          if (!destRes.exact) {
            return { ok: false, message: 'لم يتم العثور على الحلقة الجديدة المنقول إليها.' };
          }
          const destCircle = destRes.exact;
          const trRes = await window.RosterService.transferStudent(student.id, student.circle_id, destCircle.id);
          if (!trRes || !trRes.ok) {
            return { ok: false, message: 'تعذر نقل الطالب.' };
          }
          changes.push({ field: 'الحلقة', before: currentCircle ? currentCircle.name : String(student.circle_id), after: destCircle.name });
          auditBefore = { wasTransfer: true, student_id: student.id, previous_circle_id: student.circle_id, current_circle_id: destCircle.id };
        }

        if (args.new_name && String(args.new_name).trim() !== student.name) {
          const nextName = String(args.new_name).trim();
          const targetCid = args.target_circle_id ? normCircleId(args.target_circle_id) : student.circle_id;
          await window.RosterService.updateStudentRecord(targetCid, student.id, snap.activePeriod, { name: nextName }, student);
          changes.push({ field: 'الاسم', before: student.name, after: nextName });
        }

        if (changes.length === 0) {
          return { ok: false, message: 'لم يتم تحديد أي تعديل مطلوب للطالب.' };
        }

        const auditRec = await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'update_student',
          operation: `تحديث بيانات الطالب "${student.name}"`,
          targetIds: [student.id],
          targetLabel: args.new_name || student.name,
          beforeState: auditBefore,
          afterState: { student_id: student.id, changes },
          reversible: true
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: true,
          auditId: auditRec.id,
          operationCard: {
            title: 'تم تحديث بيانات الطالب بنجاح',
            entity: args.new_name || student.name,
            changes,
            auditId: auditRec.id,
            reversible: true,
            synced: true
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 11. delete_student (SENSITIVE — REQUIRES EXPLICIT CONFIRMATION)
    // ------------------------------------------------------------------------
    register({
      name: 'delete_student',
      category: 'الطلاب',
      label: 'حذف طالب من الحلقة',
      description: 'يحذف طالباً وسجلاته من الحلقة بعد تأكيد صريح من المستخدم.',
      requiresConfirmation: true,
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string' },
          confirm_token: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let cFilter = null;
        if (args.circle_name) {
          const cr = resolveCircleInList(snap.circles, args.circle_name);
          if (cr.exact) cFilter = cr.exact.id;
        }
        const sRes = resolveStudentInList(snap.students, snap.circles, args.student_id || args.student_name, cFilter);
        if (!sRes.exact) {
          return {
            ok: false,
            message: sRes.candidates.length > 1
              ? 'يرجى تحديد الطالب الدقيق المراد حذفه (توجد أسماء متشابهة):'
              : 'لم يتم العثور على الطالب.',
            candidates: sRes.candidates.map(s => {
              const c = snap.circleById.get(String(normCircleId(s.circle_id)));
              return { id: s.id, name: s.name, circle_name: c ? c.name : 'غير محدد' };
            })
          };
        }

        const student = sRes.exact;
        const circle = snap.circleById.get(String(normCircleId(student.circle_id)));
        const user = context.user || AlbayanAISecurity.getCurrentUser();

        if (!args.confirm_token) {
          const confirmation = AlbayanAISecurity.createConfirmation({
            toolName: 'delete_student',
            args: { student_id: String(student.id), student_name: student.name },
            operationTitle: `حذف الطالب "${student.name}"`,
            targetSummary: `الطالب: ${student.name} — الحلقة: ${circle ? circle.name : 'غير محدد'}`,
            oldValues: {
              الاسم: student.name,
              الحلقة: circle ? circle.name : 'غير محدد',
              المعرف: String(student.id)
            },
            newValues: { الحالة: 'محذوف نهائياً مع سجلاته' },
            impactWarning: 'سيتم حذف سجل الطالب ودرجاته من الحلقة بشكل دائم.'
          }, user);
          return { ok: false, status: 'CONFIRMATION_REQUIRED', confirmation };
        }

        const check = AlbayanAISecurity.consumeConfirmation(args.confirm_token, 'delete_student', user);
        if (!check.valid) return { ok: false, message: check.reason };

        const delRes = await window.RosterService.deleteStudent(student.circle_id, student.id);
        await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'delete_student',
          operation: `حذف الطالب "${student.name}"`,
          targetIds: [student.id],
          targetLabel: student.name,
          beforeState: student,
          afterState: { deleted: true },
          reversible: false
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: !!(delRes && delRes.ok),
          synced: !!(delRes && delRes.synced),
          operationCard: {
            title: 'تم حذف الطالب بنجاح',
            entity: student.name,
            changes: [{ field: 'الحالة', before: circle ? circle.name : 'مسجل', after: 'محذوف' }],
            synced: !!(delRes && delRes.synced)
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 12. get_teachers
    // ------------------------------------------------------------------------
    register({
      name: 'get_teachers',
      category: 'المعلمون',
      label: 'مراجعة بيانات المعلمين والكادر',
      description: 'يعرض قائمة المعلمين وحلقاتهم وتوزيع الطلاب ومؤشرات توازن العبء التدريسي.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          include_staff: { type: 'boolean' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let users = snap.users;
        if (!args.include_staff) {
          users = users.filter(u => u.role === 'teacher' || u.role === 'معلم' || u.role === 'supervisor');
        }
        if (args.query) {
          const q = normAr(args.query);
          users = users.filter(u => normAr(u.username).includes(q) || normAr(u.role).includes(q));
        }

        const teachersReport = users.map(u => {
          const uid = String(normUserId(u.id));
          const assignedCircles = snap.circles.filter(c =>
            (c.teacher_id && String(normUserId(c.teacher_id)) === uid) ||
            (c.resolved_teacher_name && normAr(c.resolved_teacher_name) === normAr(u.username))
          );
          const totalStudents = assignedCircles.reduce((sum, c) => sum + c.live_student_count, 0);
          return {
            id: u.id,
            username: u.username,
            role: u.role,
            circles_count: assignedCircles.length,
            circles_names: assignedCircles.map(c => c.name),
            total_students: totalStudents
          };
        });

        const studentCounts = teachersReport.filter(t => t.role === 'teacher' || t.role === 'معلم').map(t => t.total_students);
        const maxS = studentCounts.length ? Math.max(...studentCounts) : 0;
        const minS = studentCounts.length ? Math.min(...studentCounts) : 0;
        return {
          ok: true,
          total: teachersReport.length,
          teachers: teachersReport,
          workload_balance: {
            max_students_per_teacher: maxS,
            min_students_per_teacher: minS,
            spread: maxS - minS,
            imbalance_detected: (maxS - minS) >= 8
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 13. update_teacher
    // ------------------------------------------------------------------------
    register({
      name: 'update_teacher',
      category: 'المعلمون',
      label: 'تعديل بيانات معلم أو إسناده لحلقة',
      description: 'يعدّل الاسم المعروض أو الصلاحيات أو يسند المعلم إلى حلقة قرآنية.',
      parameters: {
        type: 'object',
        properties: {
          teacher_id: { type: 'string' },
          teacher_name: { type: 'string' },
          new_username: { type: 'string' },
          new_role: { type: 'string' },
          assign_circle_name: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const tRes = args.teacher_id
          ? { exact: snap.users.find(u => String(normUserId(u.id)) === String(normUserId(args.teacher_id))), candidates: [] }
          : resolveTeacherInUsers(snap.users, args.teacher_name);

        if (!tRes.exact) {
          return {
            ok: false,
            message: tRes.candidates.length > 1
              ? 'يوجد أكثر من معلم بنفس الاسم؛ يرجى التحديد:'
              : 'لم يتم العثور على المعلم المطلوب.',
            candidates: tRes.candidates.map(u => ({ id: u.id, username: u.username }))
          };
        }

        const existingUser = { ...tRes.exact };
        const changes = [];
        const updatedUser = { ...existingUser };

        if (args.new_username && String(args.new_username).trim() !== existingUser.username) {
          updatedUser.username = String(args.new_username).trim();
          changes.push({ field: 'اسم المستخدم', before: existingUser.username, after: updatedUser.username });
        }
        if (args.new_role && ['admin', 'supervisor', 'teacher'].includes(args.new_role)) {
          updatedUser.role = args.new_role;
          changes.push({ field: 'الدور الوظيفي', before: existingUser.role, after: updatedUser.role });
        }

        let userSaved = true;
        if (changes.length > 0 && typeof window.saveUserToFirebase === 'function') {
          userSaved = await window.saveUserToFirebase(updatedUser);
        }

        if (args.assign_circle_name) {
          const cRes = resolveCircleInList(snap.circles, args.assign_circle_name);
          if (!cRes.exact) {
            return { ok: false, message: `لم يتم العثور على الحلقة "${args.assign_circle_name}".` };
          }
          const circle = cRes.exact;
          await window.CirclesService.saveCircle({
            ...circle,
            teacher_id: normUserId(updatedUser.id),
            teacher_name: updatedUser.username
          }, { isEdit: true });
          changes.push({ field: `معلم ${circle.name}`, before: circle.resolved_teacher_name || 'غير محدد', after: updatedUser.username });
        }

        if (changes.length === 0) {
          return { ok: false, message: 'لم يتم تحديد أي تعديلات لتطبيقها على المعلم.' };
        }

        const auditRec = await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'update_teacher',
          operation: `تعديل بيانات المعلم "${existingUser.username}"`,
          targetIds: [existingUser.id],
          targetLabel: updatedUser.username,
          beforeState: existingUser,
          afterState: updatedUser,
          reversible: true
        });

        return {
          ok: userSaved,
          operationCard: {
            title: 'تم تحديث بيانات المعلم بنجاح',
            entity: updatedUser.username,
            changes,
            auditId: auditRec.id,
            reversible: true,
            synced: userSaved
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 14. get_student_records
    // ------------------------------------------------------------------------
    register({
      name: 'get_student_records',
      category: 'السجلات',
      label: 'قراءة والبحث في سجلات الطلاب',
      description: 'يقرأ سجلات الحفظ والمراجعة والغياب والدرجات لطالب أو حلقة أو فترة زمنية.',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string' },
          student_id: { type: 'string' },
          circle_name: { type: 'string' },
          month: { type: 'string' },
          limit: { type: 'number' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let recs = snap.records;

        if (args.circle_name) {
          const cr = resolveCircleInList(snap.circles, args.circle_name);
          if (cr.exact) {
            const cIds = new Set(snap.students.filter(s => String(normCircleId(s.circle_id)) === String(cr.exact.id)).map(s => String(s.id)));
            recs = recs.filter(r => String(normCircleId(r.circle_id)) === String(cr.exact.id) || cIds.has(String(normStudentId(r.student_id))));
          }
        }
        if (args.student_id) {
          const sidStr = String(normStudentId(args.student_id));
          recs = recs.filter(r => String(normStudentId(r.student_id)) === sidStr);
        } else if (args.student_name) {
          const q = normAr(args.student_name);
          const matchingSids = new Set(snap.students.filter(s => normAr(s.name).includes(q)).map(s => String(s.id)));
          recs = recs.filter(r => matchingSids.has(String(normStudentId(r.student_id))) || normAr(r.student_name).includes(q));
        }
        if (args.month) {
          const mq = normAr(args.month);
          recs = recs.filter(r => normAr(r.month).includes(mq));
        }

        const stuMap = new Map(snap.students.map(s => [String(s.id), s]));
        const limit = Math.max(1, Math.min(80, Number(args.limit || 25)));
        const formatted = recs.slice(0, limit).map(r => {
          const st = stuMap.get(String(normStudentId(r.student_id)));
          const cObj = snap.circleById.get(String(normCircleId(r.circle_id || (st && st.circle_id))));
          return {
            record_id: r.id || r._fbKey,
            student_id: normStudentId(r.student_id),
            student_name: r.student_name || (st && st.name) || 'غير معروف',
            circle_name: cObj ? cObj.name : 'غير محدد',
            month: r.month || '',
            year: r.year || '',
            memo_range: (r.from_surah && r.to_surah) ? `${r.from_surah} (${r.from_ayah || 1}) -> ${r.to_surah} (${r.to_ayah || 1})` : '—',
            memo_pages: Number(r.memo_pages || 0),
            memo_grade: r.memo_grade || '',
            sard_pages: Number(r.sard_pages || 0),
            rev_grade: r.rev_grade || '',
            absent_days: Number(r.absent_days || 0),
            activity_mark: r.activity_mark || ''
          };
        });
        return { ok: true, total: recs.length, records: formatted };
      }
    });

    // ------------------------------------------------------------------------
    // 15. create_student_record
    // ------------------------------------------------------------------------
    register({
      name: 'create_student_record',
      category: 'السجلات',
      label: 'إضافة سجل جديد لطالب',
      description: 'ينشئ سجلاً شهرياً/دورياً لطالب محدد مع الحفظ والمراجعة والغياب والدرجات.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string' },
          month: { type: 'string' },
          year: { type: 'string' },
          fields: { type: 'object' }
        }
      },
      async execute(args = {}, context = {}) {
        const updateTool = tools.get('update_student_record');
        return updateTool.execute({ ...args, is_new_record: true }, context);
      }
    });

    // ------------------------------------------------------------------------
    // 16. update_student_record (STRICT IDENTITY + DIFF + AUDIT)
    // ------------------------------------------------------------------------
    register({
      name: 'update_student_record',
      category: 'السجلات',
      label: 'تعديل سجل طالب',
      description: 'يعدّل سجل طالب معين بدقة مع التحقق من هويته وعدم خلط المتشابهين بالاسم، وعرض القيم القديمة والجديدة.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string' },
          month: { type: 'string' },
          year: { type: 'string' },
          fields: { type: 'object', description: 'الحقول المراد تعديلها مثل memo_grade, rev_grade, absent_days, activity_mark, sard_pages, from_surah, to_surah...' },
          preview_only: { type: 'boolean', description: 'لعرض التعديلات المقترحة قبل الحفظ' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        let cFilter = null;
        if (args.circle_name) {
          const cr = resolveCircleInList(snap.circles, args.circle_name);
          if (cr.exact) cFilter = cr.exact.id;
        }
        const sRes = resolveStudentInList(snap.students, snap.circles, args.student_id || args.student_name, cFilter);
        if (!sRes.exact) {
          return {
            ok: false,
            ambiguous: sRes.candidates.length > 1,
            message: sRes.candidates.length > 1
              ? 'تم العثور على أكثر من طالب متشابه في الاسم. لا يُسمح بتعديل السجل قبل تأكيد هوية الطالب وحلقته:'
              : 'لم يتم العثور على الطالب المحدد في قاعدة البيانات.',
            candidates: sRes.candidates.map(s => {
              const c = snap.circleById.get(String(normCircleId(s.circle_id)));
              return { id: s.id, name: s.name, circle_name: c ? c.name : 'غير محدد' };
            })
          };
        }

        const student = sRes.exact;
        const period = {
          ...snap.activePeriod,
          ...(args.month ? { month: args.month } : {}),
          ...(args.year ? { year: args.year } : {})
        };
        const fields = args.fields && typeof args.fields === 'object' ? args.fields : {};
        if (Object.keys(fields).length === 0) {
          return { ok: false, message: 'يرجى تحديد الحقول والقيم المراد تحديثها في السجل.' };
        }

        // Locate current record state cleanly
        const currentRecord = snap.records.find(r =>
          String(normStudentId(r.student_id)) === String(student.id) &&
          normAr(r.month || snap.activePeriod.month) === normAr(period.month)
        ) || {};

        const changes = [];
        const beforeFields = {};
        Object.keys(fields).forEach(k => {
          beforeFields[k] = currentRecord[k] !== undefined ? currentRecord[k] : '';
          changes.push({
            field: k,
            before: beforeFields[k] === '' ? 'فارغ' : String(beforeFields[k]),
            after: String(fields[k])
          });
        });

        if (args.preview_only) {
          return {
            ok: true,
            previewOnly: true,
            student: { id: student.id, name: student.name },
            period,
            proposedChanges: changes
          };
        }

        if (!window.RosterService || typeof window.RosterService.updateStudentRecord !== 'function') {
          return { ok: false, message: 'خدمة تحديث السجلات (RosterService) غير متاحة حالياً.' };
        }

        const updRes = await window.RosterService.updateStudentRecord(
          student.circle_id,
          student.id,
          period,
          fields,
          student
        );
        if (!updRes || !updRes.ok) {
          return { ok: false, message: (updRes && updRes.error && updRes.error.message) || 'تعذر حفظ تعديل السجل.' };
        }

        const auditRec = await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'update_student_record',
          operation: `${args.is_new_record ? 'إنشاء' : 'تعديل'} سجل الطالب "${student.name}" (${period.month})`,
          targetIds: [student.id],
          targetLabel: `${student.name} — ${period.month}`,
          beforeState: { circle_id: student.circle_id, student_id: student.id, period, fields: beforeFields, studentRow: student },
          afterState: { circle_id: student.circle_id, student_id: student.id, period, fields },
          reversible: true
        });

        window.dispatchEvent(new CustomEvent('albayan:cloud_updated'));
        return {
          ok: true,
          synced: updRes.synced,
          auditId: auditRec.id,
          operationCard: {
            title: args.is_new_record ? 'تم إنشاء سجل الطالب بنجاح' : 'تم تحديث سجل الطالب بنجاح',
            entity: `${student.name} (${period.month} ${period.year})`,
            changes,
            auditId: auditRec.id,
            reversible: true,
            synced: updRes.synced
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 17. get_statistics
    // ------------------------------------------------------------------------
    register({
      name: 'get_statistics',
      category: 'الإحصائيات',
      label: 'استخراج الإحصائيات من مصادرها الحقيقية',
      description: 'يحسب إحصائيات الطلاب والحلقات والمعلمين والحفظ والغياب من مصادر قاعدة البيانات الفعلية مع شرح مصدر كل رقم.',
      parameters: { type: 'object', properties: {} },
      async execute() {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const totalStudentsActive = snap.students.length;
        const circleStoredSum = snap.circles.reduce((acc, c) => acc + c.stored_student_count, 0);
        const circleLiveSum = snap.circles.reduce((acc, c) => acc + c.live_student_count, 0);

        const activeSids = new Set(snap.students.map(s => String(s.id)));
        const validCircleIds = new Set(snap.circles.map(c => String(c.id)));
        const orphanStudents = snap.students.filter(s => !s.circle_id || !validCircleIds.has(String(normCircleId(s.circle_id))));

        let totalMemoPages = 0;
        let totalSardPages = 0;
        let totalAbsentDays = 0;
        let excellentCount = 0;
        snap.records.forEach(r => {
          if (!activeSids.has(String(normStudentId(r.student_id)))) return;
          totalMemoPages += Number(r.memo_pages || 0);
          totalSardPages += Number(r.sard_pages || 0);
          totalAbsentDays += Number(r.absent_days || 0);
          if (String(r.memo_grade || '').trim() === 'ممتاز') excellentCount++;
        });

        const attendanceRate = totalStudentsActive > 0
          ? Math.max(0, Math.min(100, Math.round(100 - (totalAbsentDays / (totalStudentsActive * 30)) * 100)))
          : 100;

        return {
          ok: true,
          sources_used: ['/students (Firebase/IndexedDB)', '/circles (Firebase/IndexedDB)', '/student_records', '/users', '/exams'],
          formulas: {
            total_students_active: 'عدد السجلات الفريدة الفعّالة في جدول students بعد استبعاد المحذوفين (deleted_students)',
            circle_live_sum: 'مجموع الطلاب المرتبطين فعلياً بمعرّف حلقة موجودة في جدول circles',
            attendance_rate: '100 - (مجموع أيام الغياب ÷ (عدد الطلاب × 30)) × 100'
          },
          metrics: {
            total_circles: snap.circles.length,
            total_students_active: totalStudentsActive,
            sum_of_circle_live_students: circleLiveSum,
            sum_of_circle_stored_counts: circleStoredSum,
            orphan_students_count: orphanStudents.length,
            total_records: snap.records.length,
            total_memo_pages: totalMemoPages,
            total_sard_pages: totalSardPages,
            total_absent_days: totalAbsentDays,
            attendance_rate: attendanceRate,
            excellent_records_count: excellentCount,
            total_teachers: snap.users.filter(u => u.role === 'teacher' || u.role === 'معلم').length
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 18. analyze_statistics (CROSS-SOURCE RECONCILIATION)
    // ------------------------------------------------------------------------
    register({
      name: 'analyze_statistics',
      category: 'الإحصائيات',
      label: 'تحليل الإحصائيات ومطابقة مصادرها',
      description: 'يقارن الأعداد بين صفحة الحلقات وصفحة الإحصائيات وجدول الطلاب ويكتشف التناقضات وأسبابها الدقيقة.',
      parameters: { type: 'object', properties: {} },
      async execute() {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const validCircleIds = new Set(snap.circles.map(c => String(c.id)));
        const orphanStudents = snap.students.filter(s => !s.circle_id || !validCircleIds.has(String(normCircleId(s.circle_id))));

        const countMismatches = snap.circles
          .filter(c => c.stored_student_count !== c.live_student_count)
          .map(c => ({
            circle_id: c.id,
            circle_name: c.name,
            stored_student_count: c.stored_student_count,
            actual_students_count: c.live_student_count,
            diff: c.live_student_count - c.stored_student_count
          }));

        // Check name duplicates
        const byNormName = new Map();
        snap.students.forEach(s => {
          const k = normAr(s.name);
          if (!k) return;
          if (!byNormName.has(k)) byNormName.set(k, []);
          byNormName.get(k).push(s);
        });
        const duplicateNameGroups = Array.from(byNormName.entries())
          .filter(([, arr]) => arr.length > 1)
          .map(([name, arr]) => ({ name, count: arr.length, ids: arr.map(x => x.id) }));

        const totalStudentsTable = snap.students.length;
        const sumLiveInCircles = snap.circles.reduce((acc, c) => acc + c.live_student_count, 0);
        const sumStoredInCircles = snap.circles.reduce((acc, c) => acc + c.stored_student_count, 0);

        const explanations = [];
        if (totalStudentsTable !== sumLiveInCircles) {
          explanations.push(`يوجد ${orphanStudents.length} طالباً غير مرتبطين بحلقة نشطة (circle_id مفقود أو يشير لحلقة محذوفة)، ولذلك يظهرون في إجمالي جدول الطلاب (${totalStudentsTable}) ولا يدخلون ضمن مجموع طلاب الحلقات (${sumLiveInCircles}).`);
        }
        if (sumStoredInCircles !== sumLiveInCircles) {
          explanations.push(`الحقل المخزن student_count في بطاقات الحلقات مجموعه (${sumStoredInCircles}) بينما العدد الفعلي من جدول students هو (${sumLiveInCircles}) في ${countMismatches.length} حلقة.`);
        }
        if (duplicateNameGroups.length > 0) {
          explanations.push(`تم رصد ${duplicateNameGroups.length} حالة تكرار أو تشابه في أسماء الطلاب مما قد يرفع الإحصاء الإجمالي في حال التكرار غير المقصود.`);
        }
        if (explanations.length === 0) {
          explanations.push('جميع المصادر متطابقة: عدد الطلاب في جدول students يطابق تماماً مجموع طلاب الحلقات والأرقام المخزنة في student_count.');
        }

        return {
          ok: true,
          reconciliation: {
            students_table_count: totalStudentsTable,
            sum_live_in_circles: sumLiveInCircles,
            sum_stored_circle_counts: sumStoredInCircles,
            orphan_students_count: orphanStudents.length,
            has_discrepancy: (totalStudentsTable !== sumLiveInCircles) || (sumStoredInCircles !== sumLiveInCircles),
            circle_count_mismatches: countMismatches,
            orphan_students: orphanStudents.map(s => ({ id: s.id, name: s.name, circle_id: s.circle_id || null })),
            duplicate_name_groups: duplicateNameGroups,
            explanations
          },
          circle_rankings: [...snap.circles]
            .sort((a, b) => b.live_student_count - a.live_student_count)
            .map(c => ({
              name: c.name,
              teacher: c.resolved_teacher_name || 'غير محدد',
              description: c.description || '—',
              live_students: c.live_student_count,
              stored_students: c.stored_student_count
            }))
        };
      }
    });

    // ------------------------------------------------------------------------
    // 19. generate_report
    // ------------------------------------------------------------------------
    register({
      name: 'generate_report',
      category: 'التقارير',
      label: 'إعداد تقرير إداري شامل',
      description: 'يولّد تقريراً إدارياً منظماً حسب نوعه (شامل / الحلقات / الطلاب / المعلمين / السجلات والاختبارات).',
      parameters: {
        type: 'object',
        properties: {
          report_type: { type: 'string', description: 'شامل | حلقات | طلاب | معلمين | سجلات' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const statsRes = await tools.get('get_statistics').execute();
        const anomalyRes = await tools.get('detect_data_anomalies').execute();
        const reportType = String(args.report_type || 'شامل');

        return {
          ok: true,
          report_type: reportType,
          generated_at: new Date().toISOString(),
          period: snap.activePeriod,
          summary: statsRes.metrics,
          circles: snap.circles.map(c => ({
            name: c.name,
            teacher: c.resolved_teacher_name || 'غير محدد',
            students: c.live_student_count,
            description: c.description || '—'
          })),
          anomalies_summary: anomalyRes.counts
        };
      }
    });

    // ------------------------------------------------------------------------
    // 20-22. Student CVs (get_cv_data, create_cv, update_cv)
    // ------------------------------------------------------------------------
    register({
      name: 'get_cv_data',
      category: 'السيرة الذاتية',
      label: 'جلب بيانات السيرة الذاتية للطلاب',
      description: 'يقرأ بطاقات السيرة الذاتية للطلاب ويحدد الحقول الناقصة والتعارضات.',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string' },
          student_id: { type: 'string' }
        }
      },
      async execute(args = {}) {
        const cvs = await AlbayanAIDataContext.loadStudentCvs();
        let matches = cvs;
        if (args.student_id) {
          const sid = String(normStudentId(args.student_id));
          matches = cvs.filter(c => String(normStudentId(c.id)) === sid);
        } else if (args.student_name) {
          const q = normAr(args.student_name);
          matches = cvs.filter(c => normAr(c.name).includes(q));
        }

        const analyzed = matches.slice(0, 20).map(cv => {
          const missing = [];
          if (!cv.phone && !cv.guardian_phone) missing.push('رقم التواصل/ولي الأمر');
          if (!cv.circle_name || cv.circle_name === 'بدون حلقة') missing.push('الحلقة');
          if (!cv.teacher_name || cv.teacher_name === 'غير متوفر') missing.push('اسم المعلم');
          if (!cv.monthly_records || Object.keys(cv.monthly_records).length === 0) missing.push('التقييمات الشهرية');
          return {
            id: cv.id,
            name: cv.name,
            circle_name: cv.circle_name || 'غير محدد',
            teacher_name: cv.teacher_name || 'غير محدد',
            phone: cv.phone || '',
            guardian_phone: cv.guardian_phone || '',
            available_months: cv.available_months || [],
            missing_fields: missing
          };
        });
        return { ok: true, total: matches.length, cvs: analyzed };
      }
    });

    register({
      name: 'create_cv',
      category: 'السيرة الذاتية',
      label: 'إنشاء بطاقة سيرة ذاتية لطالب',
      description: 'ينشئ أو يكمّل ملف السيرة الذاتية لطالب وفق هيكل صفحة السيرة الذاتية المعتمد.',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string' },
          student_id: { type: 'string' },
          phone: { type: 'string' },
          guardian_phone: { type: 'string' },
          study_level: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const sRes = resolveStudentInList(snap.students, snap.circles, args.student_id || args.student_name, null);
        if (!sRes.exact) {
          return {
            ok: false,
            message: sRes.candidates.length > 1
              ? 'يرجى تحديد الطالب الدقيق لإنشاء سيرته الذاتية:'
              : 'لم يتم العثور على الطالب في قاعدة بيانات الطلاب.',
            candidates: sRes.candidates.map(s => ({ id: s.id, name: s.name }))
          };
        }
        const st = sRes.exact;
        const circle = snap.circleById.get(String(normCircleId(st.circle_id)));
        const monthKey = `${snap.activePeriod.month} ${snap.activePeriod.year}`;
        const cvPayload = {
          id: st.id,
          student_id: st.id,
          circle_id: st.circle_id,
          name: st.name,
          circle_name: circle ? circle.name : 'بدون حلقة',
          teacher_name: circle ? (circle.resolved_teacher_name || 'غير متوفر') : 'غير متوفر',
          phone: args.phone || st.phone || '',
          guardian_phone: args.guardian_phone || st.guardian_phone || '',
          study_level: args.study_level || st.study_level || '',
          notes: args.notes || '',
          monthly_records: {
            [monthKey]: {
              month: monthKey,
              month_key: monthKey,
              strength: Array.isArray(args.strengths) ? args.strengths : [],
              notes: args.notes || '',
              updated_at: new Date().toISOString()
            }
          }
        };
        const saved = typeof window.saveStudentCvToFirebase === 'function'
          ? await window.saveStudentCvToFirebase(cvPayload)
          : false;
        await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'create_cv',
          operation: `إنشاء سيرة ذاتية للطالب "${st.name}"`,
          targetIds: [st.id],
          targetLabel: st.name,
          beforeState: null,
          afterState: cvPayload,
          reversible: false
        });
        return {
          ok: saved,
          operationCard: {
            title: 'تم حفظ السيرة الذاتية للطالب',
            entity: st.name,
            changes: [
              { field: 'الحلقة', before: '—', after: cvPayload.circle_name },
              { field: 'الجوال', before: '—', after: cvPayload.guardian_phone || cvPayload.phone || 'غير محدد' }
            ],
            synced: saved
          }
        };
      }
    });

    register({
      name: 'update_cv',
      category: 'السيرة الذاتية',
      label: 'تحديث السيرة الذاتية لطالب',
      description: 'يعدّل بيانات بطاقة السيرة الذاتية مع الحفاظ على السجلات الشهرية والمرفقات الموجودة.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          phone: { type: 'string' },
          guardian_phone: { type: 'string' },
          study_level: { type: 'string' },
          notes: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const cvs = await AlbayanAIDataContext.loadStudentCvs();
        let target = null;
        if (args.student_id) {
          target = cvs.find(c => String(normStudentId(c.id)) === String(normStudentId(args.student_id)));
        } else if (args.student_name) {
          const matches = cvs.filter(c => normAr(c.name) === normAr(args.student_name));
          if (matches.length === 1) target = matches[0];
          else if (matches.length > 1) {
            return { ok: false, ambiguous: true, message: 'توجد أكثر من سيرة ذاتية متشابهة، يرجى التحديد.', candidates: matches.map(c => ({ id: c.id, name: c.name, circle_name: c.circle_name })) };
          }
        }
        if (!target) {
          return { ok: false, message: 'لم يتم العثور على بطاقة السيرة الذاتية للطالب.' };
        }
        const before = JSON.parse(JSON.stringify(target));
        const updated = { ...target };
        const changes = [];
        ['phone', 'guardian_phone', 'study_level', 'notes'].forEach(f => {
          if (args[f] !== undefined && String(args[f]) !== String(target[f] || '')) {
            changes.push({ field: f, before: target[f] || 'فارغ', after: String(args[f]) });
            updated[f] = String(args[f]);
          }
        });
        if (changes.length === 0) return { ok: false, message: 'لا توجد تعديلات جديدة لحفظها.' };
        const saved = typeof window.saveStudentCvToFirebase === 'function'
          ? await window.saveStudentCvToFirebase(updated)
          : false;
        const auditRec = await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName: 'update_cv',
          operation: `تحديث السيرة الذاتية لـ "${target.name}"`,
          targetIds: [target.id],
          targetLabel: target.name,
          beforeState: before,
          afterState: updated,
          reversible: true
        });
        return {
          ok: saved,
          operationCard: {
            title: 'تم تحديث السيرة الذاتية بنجاح',
            entity: target.name,
            changes,
            auditId: auditRec.id,
            reversible: true,
            synced: saved
          }
        };
      }
    });

    // ------------------------------------------------------------------------
    // 23. search_school_data
    // ------------------------------------------------------------------------
    register({
      name: 'search_school_data',
      category: 'بحث شامل',
      label: 'بحث شامل عبر جميع وحدات المدرسة',
      description: 'يبحث في الحلقات والطلاب والمعلمين والاختبارات والسير الذاتية بكلمة مفتاحية واحدة.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'كلمة البحث' }
        },
        required: ['query']
      },
      async execute(args = {}) {
        const q = normAr(args.query || '');
        if (!q) return { ok: false, message: 'يرجى إدخال كلمة للبحث.' };
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        return {
          ok: true,
          query: args.query,
          circles: snap.circles.filter(c => normAr(c.name).includes(q) || normAr(c.description).includes(q)).slice(0, 15).map(c => ({ id: c.id, name: c.name, teacher: c.resolved_teacher_name })),
          students: snap.students.filter(s => normAr(s.name).includes(q)).slice(0, 20).map(s => ({ id: s.id, name: s.name, circle_name: (snap.circleById.get(String(normCircleId(s.circle_id))) || {}).name || 'غير محدد' })),
          teachers: snap.users.filter(u => normAr(u.username).includes(q)).slice(0, 10).map(u => ({ id: u.id, username: u.username, role: u.role })),
          exams: snap.exams.filter(e => normAr(e.title).includes(q)).slice(0, 10).map(e => ({ id: e.id, title: e.title }))
        };
      }
    });

    // ------------------------------------------------------------------------
    // 24. detect_data_anomalies (PHASE 6 DIAGNOSTIC ENGINE — 10 CHECKS)
    // ------------------------------------------------------------------------
    register({
      name: 'detect_data_anomalies',
      category: 'فحص الأخطاء',
      label: 'اكتشاف الأخطاء والتناقضات في بيانات المدرسة',
      description: 'يجري فحصاً شاملاً لاكتشاف التكرار، البيانات الناقصة، الحلقات بدون معلم، الطلاب اليتامى، وتناقضات الإحصائيات بدون اختلاق أو تعديل تلقائي.',
      parameters: { type: 'object', properties: {} },
      async execute() {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const findings = [];
        const addFinding = (classification, severity, title, location, affected, reason, solution, actionNeeded) => {
          findings.push({
            classification, // 'خطأ مؤكد' | 'احتمال وجود مشكلة' | 'ملاحظة تحسين' | 'بيانات تحتاج مراجعة بشرية'
            severity,       // 'عالي' | 'متوسط' | 'منخفض'
            title,
            location,
            affected_count: Array.isArray(affected) ? affected.length : 1,
            affected_records: Array.isArray(affected) ? affected.slice(0, 15) : [affected],
            reason,
            suggested_solution: solution,
            action_required: actionNeeded
          });
        };

        const validCircleIds = new Set(snap.circles.map(c => String(c.id)));
        const activeStudentIds = new Set(snap.students.map(s => String(s.id)));

        // 1. Duplicate students (same ID or duplicate exact normalized names)
        if (snap.duplicateIdEntries.length > 0) {
          addFinding(
            'خطأ مؤكد',
            'عالي',
            'تضارب معرفات طلاب مكررة في Firebase',
            'جدول /students',
            snap.duplicateIdEntries.map(d => `${d.student.name} (مفتاح: ${d.key})`),
            'وجود مفاتيح قديمة بجانب المفتاح القياسي لنفس الطالب',
            'تنظيف المفاتيح المكررة والإبقاء على المعرف القياسي الموحد',
            'مراجعة مفاتيح /students وحذف المفاتيح المكررة'
          );
        }
        const stuNameBuckets = new Map();
        snap.students.forEach(s => {
          const k = normAr(s.name);
          if (!k) return;
          if (!stuNameBuckets.has(k)) stuNameBuckets.set(k, []);
          stuNameBuckets.get(k).push(s);
        });
        const dupNames = Array.from(stuNameBuckets.values()).filter(arr => arr.length > 1);
        if (dupNames.length > 0) {
          addFinding(
            'بيانات تحتاج مراجعة بشرية',
            'متوسط',
            'أسماء طلاب متطابقة أو مكررة',
            'قائمة الطلاب',
            dupNames.map(g => `${g[0].name} (${g.length} مرات)`),
            'إدخال الطالب مرتين أو تشابه حقيقي في الأسماء الثلاثية',
            'التأكد من هوية كل طالب وحذف الإدخال المكرر مع تأكيد صريح',
            'مراجعة الأسماء المكررة والتأكد من عدم تكرار الطالب نفسه'
          );
        }

        // 2. Missing student data (empty names)
        const brokenStudents = snap.students.filter(s => !s.name || String(s.name).trim().length < 2);
        if (brokenStudents.length > 0) {
          addFinding(
            'خطأ مؤكد',
            'عالي',
            'سجلات طلاب بدون اسم أو باسم ناقص',
            'جدول الطلاب',
            brokenStudents.map(s => `معرف الطالب: ${s.id}`),
            'حفظ سجل غير مكتمل الاسم',
            'تحديث اسم الطالب أو حذف السجل الفارغ بعد التأكد',
            'تعديل أسماء الطلاب المتأثرين'
          );
        }

        // 3. Students unlinked from any active circle
        const orphanStudents = snap.students.filter(s => !s.circle_id || !validCircleIds.has(String(normCircleId(s.circle_id))));
        if (orphanStudents.length > 0) {
          addFinding(
            'خطأ مؤكد',
            'عالي',
            'طلاب غير مرتبطين بحلقات نشطة',
            'العلاقة بين students و circles',
            orphanStudents.map(s => `${s.name} (circle_id: ${s.circle_id || 'فارغ'})`),
            'حذف الحلقة السابقة دون نقل الطلاب أو إدخال معرف حلقة غير موجود',
            'نقل الطلاب المتأثرين إلى حلقات فعالة باستخدام أداة نقل الطالب',
            'تحديد الحلقة المناسبة لكل طالب يتيم'
          );
        }

        // 4. Halaqat without assigned teacher
        const circlesNoTeacher = snap.circles.filter(c => !c.teacher_id && !c.resolved_teacher_name);
        if (circlesNoTeacher.length > 0) {
          addFinding(
            'بيانات تحتاج مراجعة بشرية',
            'متوسط',
            'حلقات بدون معلم مسؤول',
            'جدول الحلقات (/circles)',
            circlesNoTeacher.map(c => `${c.name} (معرّف: ${c.id})`),
            'إنشاء الحلقة دون تعيين معلم أو حذف حساب المعلم السابق',
            'إسناد معلم مسؤول لكل حلقة عبر تعديل الحلقة',
            'تعيين معلم لكل حلقة ظاهرة'
          );
        }

        // 5. Statistics mismatch (stored student_count vs actual /students count)
        const countMismatches = snap.circles.filter(c => c.stored_student_count !== c.live_student_count);
        if (countMismatches.length > 0) {
          addFinding(
            'احتمال وجود مشكلة',
            'متوسط',
            'اختلاف عدد الطلاب المخزن عن العدد الفعلي داخل الحلقات',
            'حقل student_count في الحلقات مقارنةً بجدول الطلاب',
            countMismatches.map(c => `${c.name}: مخزن (${c.stored_student_count}) مقابل فعلي (${c.live_student_count})`),
            'تأخر تحديث العداد المخزن بعد نقل أو حذف طالب',
            'الاعتماد على العدد الحي من /students وتحديث student_count في الحلقات',
            'إعادة مزامنة أعداد الطلاب في الحلقات المتأثرة'
          );
        }

        // 6 & 7. Conflicting or orphan records (records whose student_id is missing or circle_id mismatch)
        const orphanRecords = snap.records.filter(r => !activeStudentIds.has(String(normStudentId(r.student_id))));
        if (orphanRecords.length > 0) {
          addFinding(
            'احتمال وجود مشكلة',
            'منخفض',
            'سجلات درجات تعود لطلاب غير موجودين في القائمة النشطة',
            'جدول student_records',
            orphanRecords.slice(0, 10).map(r => `${r.student_name || r.student_id} (${r.month || ''})`),
            'بقاء سجلات تاريخية بعد حذف الطالب أو اختلاف صيغة المعرف',
            'مراجعة السجلات وتنظيف المتبقي من الطلاب المحذوفين',
            'فحص السجلات اليتيمة والتأكد من صحتها'
          );
        }

        // 8. Records violating domain rules (negative absence or out-of-range grades)
        const invalidRuleRecords = snap.records.filter(r =>
          Number(r.absent_days) < 0 ||
          Number(r.absent_days) > 31 ||
          (r.memo_pages !== undefined && Number(r.memo_pages) < 0) ||
          (r.sard_pages !== undefined && Number(r.sard_pages) < 0)
        );
        if (invalidRuleRecords.length > 0) {
          addFinding(
            'خطأ مؤكد',
            'عالي',
            'قيم غير منطقية في أيام الغياب أو عدد الأوجه',
            'جدول student_records',
            invalidRuleRecords.map(r => `${r.student_name || r.student_id}: غياب=${r.absent_days}, حفظ=${r.memo_pages}`),
            'إدخال يدوي غير منضبط أو خطأ في السجلات',
            'تصحيح القيم المخالفة للقواعد يدوياً بعد المراجعة',
            'تعديل السجلات المخالفة للقيم السليمة'
          );
        }

        // 9. Unbalanced teacher workload & missing descriptions
        const emptyCircles = snap.circles.filter(c => c.live_student_count === 0);
        if (emptyCircles.length > 0) {
          addFinding(
            'ملاحظة تحسين',
            'منخفض',
            'حلقات فارغة لا تضم أي طلاب',
            'صفحة الحلقات',
            emptyCircles.map(c => c.name),
            'حلقة جديدة أو نُقل جميع طلابها',
            'إضافة طلاب للحلقة أو أرشفتها إذا لم تعد مستخدمة',
            'توزيع الطلاب أو أرشفة الحلقات غير النشطة'
          );
        }

        const missingDescCircles = snap.circles.filter(c => !String(c.description || '').trim());
        if (missingDescCircles.length > 0) {
          addFinding(
            'ملاحظة تحسين',
            'منخفض',
            'حلقات بدون وصف (لن تظهر لها فلاتر وصف)',
            'جدول الحلقات (description)',
            missingDescCircles.map(c => c.name),
            'عدم إدخال حقل الوصف عند إنشاء الحلقة',
            'إضافة وصف واضح مثل المستوى أو الفترة لتسهيل التصنيف',
            'تحديث وصف الحلقات'
          );
        }

        // 10. Pending offline sync failures in outbox queue
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingSyncQueue === 'function') {
          try {
            const pendingQ = await window.AlbayanLocalDB.getPendingSyncQueue();
            if (Array.isArray(pendingQ) && pendingQ.length > 0) {
              addFinding(
                'احتمال وجود مشكلة',
                'متوسط',
                'عمليات محلية معلّقة في طابور المزامنة ولم تكتمل سحابياً بعد',
                'IndexedDB sync_queue',
                pendingQ.map(q => `${q.action} (${q.entity}:${q.entity_id})`),
                'انقطاع الاتصال أثناء الحفظ أو تعذر الوصول لخادم Firebase',
                'إعادة المزامنة عند توفر الإنترنت عبر AlbayanLocalDB.processSyncQueue()',
                'التحقق من الاتصال بالسحابة واستكمال المزامنة'
              );
            }
          } catch (e) {}
        }

        const counts = {
          confirmed_errors: findings.filter(f => f.classification === 'خطأ مؤكد').length,
          potential_issues: findings.filter(f => f.classification === 'احتمال وجود مشكلة').length,
          improvements: findings.filter(f => f.classification === 'ملاحظة تحسين').length,
          needs_human_review: findings.filter(f => f.classification === 'بيانات تحتاج مراجعة بشرية').length
        };

        return {
          ok: true,
          total_findings: findings.length,
          counts,
          findings,
          note: 'تم الفحص التحليلي للقراءة فقط؛ لم يتم تعديل أي بيانات تلقائياً.'
        };
      }
    });

    // ------------------------------------------------------------------------
    // 25. get_audit_history
    // ------------------------------------------------------------------------
    register({
      name: 'get_audit_history',
      category: 'سجل التدقيق',
      label: 'سجل عمليات المساعد والتراجع',
      description: 'يعرض سجل التدقيق الكامل للعمليات المنفذة عبر المساعد مع إمكانية التراجع عن التعديلات العكسية.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          undo_audit_id: { type: 'string', description: 'معرّف عملية للتراجع عنها' }
        }
      },
      async execute(args = {}) {
        if (args.undo_audit_id) {
          return await AlbayanAIAudit.undoAuditAction(args.undo_audit_id);
        }
        const logs = await AlbayanAIAudit.loadLogs();
        const limit = Math.max(1, Math.min(50, Number(args.limit || 20)));
        return {
          ok: true,
          total: logs.length,
          logs: logs.slice(0, limit).map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            username: l.username,
            toolName: l.toolName,
            operation: l.operation,
            targetLabel: l.targetLabel,
            status: l.status,
            reversible: l.reversible && !l.undone,
            undone: !!l.undone
          }))
        };
      }
    });

    function listDeclarations() {
      const list = [];
      tools.forEach((def) => {
        list.push({
          name: def.name,
          description: def.description,
          parameters: def.parameters || { type: 'object', properties: {} }
        });
      });
      return list;
    }

    async function execute(toolName, args = {}, context = {}) {
      const def = tools.get(toolName);
      if (!def) {
        return { ok: false, error: `الأداة "${toolName}" غير مسجلة في النظام.` };
      }

      const auth = AlbayanAISecurity.authorizeTool(toolName, args, context);
      if (!auth.allowed) {
        await AlbayanAIAudit.recordAudit({
          conversationId: context.conversationId,
          toolName,
          operation: `محاولة مرفوضة: ${def.label}`,
          targetLabel: args.circle_name || args.student_name || '',
          status: 'denied',
          reversible: false
        });
        return { ok: false, denied: true, error: auth.reason };
      }

      try {
        return await def.execute(args || {}, context);
      } catch (err) {
        return { ok: false, error: (err && err.message) ? err.message : 'خطأ أثناء تنفيذ الأداة.' };
      }
    }

    return {
      get: (name) => tools.get(name),
      list: () => Array.from(tools.values()),
      listDeclarations,
      execute,
      resolveCircleInList,
      resolveStudentInList,
      resolveTeacherInUsers
    };
  })();

  // ==========================================================================
  // LAYER 5: PROVIDER ADAPTERS & BUILT-IN ARABIC NLU AGENT
  // ==========================================================================
  const AlbayanAIProviders = (function () {
    const CONFIG_SETTING_KEY = 'ai_provider_config_v1';
    const USAGE_SETTING_KEY = 'ai_token_usage_v1';

    async function loadConfig() {
      let cfg = { ...DEFAULT_CONFIG };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        try {
          const saved = await window.AlbayanLocalDB.getSetting(CONFIG_SETTING_KEY, null);
          if (saved && typeof saved === 'object') cfg = { ...DEFAULT_CONFIG, ...saved };
        } catch (e) {}
      }
      return cfg;
    }

    async function saveConfig(partial) {
      if (!AlbayanAISecurity.canConfigureProvider()) {
        throw new Error('لا تمتلك صلاحية تعديل إعدادات مزود الذكاء الاصطناعي.');
      }
      const current = await loadConfig();
      const next = { ...current, ...(partial || {}), updatedAt: new Date().toISOString() };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(CONFIG_SETTING_KEY, next);
      }
      return next;
    }

    async function loadUsageStats() {
      const empty = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, requestsCount: 0 };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        try {
          const u = await window.AlbayanLocalDB.getSetting(USAGE_SETTING_KEY, null);
          if (u && typeof u === 'object') return { ...empty, ...u };
        } catch (e) {}
      }
      return empty;
    }

    async function addUsageStats(modelId, promptTokens = 0, completionTokens = 0) {
      const cur = await loadUsageStats();
      const p = Number(promptTokens || 0);
      const c = Number(completionTokens || 0);
      const rates = COST_PER_1M[modelId] || { in: 0, out: 0 };
      const costDelta = (p / 1e6) * rates.in + (c / 1e6) * rates.out;
      const next = {
        promptTokens: cur.promptTokens + p,
        completionTokens: cur.completionTokens + c,
        totalTokens: cur.totalTokens + p + c,
        estimatedCostUsd: Number((cur.estimatedCostUsd + costDelta).toFixed(6)),
        requestsCount: cur.requestsCount + 1
      };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(USAGE_SETTING_KEY, next);
      }
      return next;
    }

    async function performHttp(provider, url, payloadObj, extraHeaders = {}, overrideKey = '', signal = null) {
      const plugin = getNativePlugin();
      const bodyStr = payloadObj ? JSON.stringify(payloadObj) : '';
      if (plugin && typeof plugin.proxyAiHttp === 'function') {
        const res = await plugin.proxyAiHttp({
          provider,
          url,
          method: 'POST',
          body: bodyStr,
          headers: extraHeaders,
          overrideApiKey: overrideKey || '',
          timeoutMs: 60000
        });
        if (!res.ok) {
          throw new Error(res.error || `HTTP ${res.status}: ${(res.data || '').slice(0, 300)}`);
        }
        return JSON.parse(res.data || '{}');
      }

      // Standard Browser fallback using stored Web Vault key
      const apiKey = overrideKey || await AlbayanAISecurity.getWebFallbackSecret(provider);
      const headers = { 'Content-Type': 'application/json', ...extraHeaders };
      if (apiKey) {
        if (provider === 'gemini') headers['x-goog-api-key'] = apiKey;
        else if (provider === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const fetchRes = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyStr,
        signal
      });
      const text = await fetchRes.text();
      if (!fetchRes.ok) {
        throw new Error(`HTTP ${fetchRes.status}: ${text.slice(0, 300)}`);
      }
      return JSON.parse(text || '{}');
    }

    function buildSystemPrompt(user) {
      return [
        'أنت "مساعد البيان الذكي (ALBAYAN AI)" داخل منظومة مدرسة البيان لتعليم القرآن الكريم.',
        `المستخدم الحالي: ${user ? user.username : 'زائر'} (الدور: ${user ? user.role : 'guest'}).`,
        'المهام الأساسية: الإجابة بدقة باللغة العربية، استخدام الأدوات الحقيقية المتاحة فقط، تحليل البيانات، اكتشاف التناقضات، وتنفيذ العمليات الإدارية بعد التحقق.',
        'قواعد صارمة:',
        '1. لا تخمن أي رقم أو اسم طالب أو حلقة؛ استخدم الأدوات المتاحة لجلب البيانات الحقيقية أولاً.',
        '2. إذا كانت البيانات ناقصة (مثل اسم الحلقة عند الإضافة أو اسم المعلم أو اسم الطالب الغامض)، اسأل المستخدم بوضوح.',
        '3. لا تعدّل أي سجل طالب متشابه الاسم قبل التأكد من هويته وحلقته.',
        '4. عند الحذف أو العمليات الحساسة، اطلب confirm_token عبر الأداة ليؤكدها المستخدم تفاعلياً.',
        '5. التزم بتفاصيل الخادم الحقيقية فقط في ملخصاتك وجداولك.'
      ].join('\n');
    }

    // ------------------------------------------------------------------------
    // Adapter 1: Google Gemini API
    // ------------------------------------------------------------------------
    async function runGeminiTurn(cfg, historyMessages, userPrompt, context) {
      const model = cfg.model || 'gemini-2.5-flash';
      const base = (cfg.customEndpoint && cfg.customEndpoint.trim())
        ? cfg.customEndpoint.replace(/\/$/, '')
        : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const contents = [];
      (historyMessages || []).forEach(m => {
        if (!m || !m.content) return;
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content) }]
        });
      });
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });

      const functionDeclarations = AlbayanAIToolRegistry.listDeclarations().map(d => ({
        name: d.name,
        description: d.description,
        parameters: d.parameters
      }));

      const executedTools = [];
      const tables = [];
      const operationCards = [];
      const confirmations = [];
      let totalIn = 0;
      let totalOut = 0;

      for (let step = 0; step < 6; step++) {
        if (context.signal && context.signal.aborted) throw new Error('ABORTED');
        if (context.onProgress) context.onProgress(step === 0 ? 'جاري تحليل الطلب عبر Gemini...' : 'جاري استكمال تحليل نتائج الأدوات...');

        const generationConfig = {
          temperature: Number(cfg.temperature ?? 0.2),
          maxOutputTokens: Number(cfg.maxTokens || 2048)
        };
        if (model.includes('2.5') && Number(cfg.thinkingBudget) > 0) {
          generationConfig.thinkingConfig = { thinkingBudget: Number(cfg.thinkingBudget) };
        }

        const resp = await performHttp('gemini', base, {
          systemInstruction: { parts: [{ text: buildSystemPrompt(context.user) }] },
          contents,
          tools: [{ functionDeclarations }],
          generationConfig
        }, {}, '', context.signal);

        if (resp.usageMetadata) {
          totalIn += Number(resp.usageMetadata.promptTokenCount || 0);
          totalOut += Number(resp.usageMetadata.candidatesTokenCount || 0);
        }

        const candidate = resp.candidates && resp.candidates[0];
        const parts = (candidate && candidate.content && candidate.content.parts) || [];
        const fnCalls = parts.filter(p => p.functionCall);

        if (fnCalls.length === 0) {
          const text = parts.map(p => p.text || '').join('\n').trim() || 'لم يُرجع النموذج نصاً.';
          await addUsageStats(model, totalIn, totalOut);
          return { text, executedTools, tables, operationCards, confirmations, usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'gemini', model } };
        }

        contents.push({ role: 'model', parts });
        const fnResponseParts = [];
        for (const callPart of fnCalls) {
          const fc = callPart.functionCall;
          const toolDef = AlbayanAIToolRegistry.get(fc.name);
          if (context.onProgress) context.onProgress(`تنفيذ أداة: ${(toolDef && toolDef.label) || fc.name}`);
          const toolOut = await AlbayanAIToolRegistry.execute(fc.name, fc.args || {}, context);
          executedTools.push({ name: fc.name, label: (toolDef && toolDef.label) || fc.name, ok: !!toolOut.ok });
          if (toolOut.operationCard) operationCards.push(toolOut.operationCard);
          if (toolOut.confirmation) confirmations.push(toolOut.confirmation);
          fnResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: toolOut
            }
          });
        }
        contents.push({ role: 'user', parts: fnResponseParts });
      }

      await addUsageStats(model, totalIn, totalOut);
      return {
        text: 'تم تنفيذ الأدوات المطلوبة أعلاه.',
        executedTools, tables, operationCards, confirmations,
        usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'gemini', model }
      };
    }

    // ------------------------------------------------------------------------
    // Adapter 2 & 4: OpenAI / OpenAI-Compatible API
    // ------------------------------------------------------------------------
    async function runOpenAITurn(cfg, historyMessages, userPrompt, context) {
      const model = cfg.model || 'gpt-4o-mini';
      const url = (cfg.provider === 'custom' && cfg.customEndpoint)
        ? cfg.customEndpoint.trim()
        : 'https://api.openai.com/v1/chat/completions';

      const messages = [{ role: 'system', content: buildSystemPrompt(context.user) }];
      (historyMessages || []).forEach(m => {
        if (m && m.content) messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
      });
      messages.push({ role: 'user', content: userPrompt });

      const toolsSpec = AlbayanAIToolRegistry.listDeclarations().map(d => ({
        type: 'function',
        function: { name: d.name, description: d.description, parameters: d.parameters }
      }));

      const executedTools = [];
      const tables = [];
      const operationCards = [];
      const confirmations = [];
      let totalIn = 0;
      let totalOut = 0;

      for (let step = 0; step < 6; step++) {
        if (context.signal && context.signal.aborted) throw new Error('ABORTED');
        if (context.onProgress) context.onProgress('جاري المعالجة عبر OpenAI API...');

        const resp = await performHttp(cfg.provider, url, {
          model,
          messages,
          tools: toolsSpec,
          temperature: Number(cfg.temperature ?? 0.2),
          max_tokens: Number(cfg.maxTokens || 2048)
        }, {}, '', context.signal);

        if (resp.usage) {
          totalIn += Number(resp.usage.prompt_tokens || 0);
          totalOut += Number(resp.usage.completion_tokens || 0);
        }

        const msg = resp.choices && resp.choices[0] && resp.choices[0].message;
        if (!msg) break;
        const toolCalls = msg.tool_calls || [];

        if (toolCalls.length === 0) {
          await addUsageStats(model, totalIn, totalOut);
          return {
            text: (msg.content || '').trim() || 'اكتمل التحليل.',
            executedTools, tables, operationCards, confirmations,
            usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: cfg.provider, model }
          };
        }

        messages.push(msg);
        for (const tc of toolCalls) {
          const fnName = tc.function && tc.function.name;
          let parsedArgs = {};
          try { parsedArgs = JSON.parse((tc.function && tc.function.arguments) || '{}'); } catch (e) {}
          const toolDef = AlbayanAIToolRegistry.get(fnName);
          if (context.onProgress) context.onProgress(`تنفيذ أداة: ${(toolDef && toolDef.label) || fnName}`);
          const toolOut = await AlbayanAIToolRegistry.execute(fnName, parsedArgs, context);
          executedTools.push({ name: fnName, label: (toolDef && toolDef.label) || fnName, ok: !!toolOut.ok });
          if (toolOut.operationCard) operationCards.push(toolOut.operationCard);
          if (toolOut.confirmation) confirmations.push(toolOut.confirmation);
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolOut) });
        }
      }

      await addUsageStats(model, totalIn, totalOut);
      return { text: 'تم تنفيذ العمليات المطلوبة.', executedTools, tables, operationCards, confirmations, usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: cfg.provider, model } };
    }

    // ------------------------------------------------------------------------
    // Adapter 3: Anthropic Claude API
    // ------------------------------------------------------------------------
    async function runAnthropicTurn(cfg, historyMessages, userPrompt, context) {
      const model = cfg.model || 'claude-3-5-haiku-latest';
      const url = (cfg.customEndpoint && cfg.customEndpoint.trim()) || 'https://api.anthropic.com/v1/messages';

      const messages = [];
      (historyMessages || []).forEach(m => {
        if (m && m.content) messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) });
      });
      messages.push({ role: 'user', content: userPrompt });

      const toolsSpec = AlbayanAIToolRegistry.listDeclarations().map(d => ({
        name: d.name,
        description: d.description,
        input_schema: d.parameters
      }));

      const executedTools = [];
      const tables = [];
      const operationCards = [];
      const confirmations = [];
      let totalIn = 0;
      let totalOut = 0;

      for (let step = 0; step < 6; step++) {
        if (context.signal && context.signal.aborted) throw new Error('ABORTED');
        if (context.onProgress) context.onProgress('جاري المعالجة عبر Anthropic Claude...');

        const resp = await performHttp('anthropic', url, {
          model,
          system: buildSystemPrompt(context.user),
          messages,
          tools: toolsSpec,
          max_tokens: Number(cfg.maxTokens || 2048)
        }, {}, '', context.signal);

        if (resp.usage) {
          totalIn += Number(resp.usage.input_tokens || 0);
          totalOut += Number(resp.usage.output_tokens || 0);
        }

        const blocks = Array.isArray(resp.content) ? resp.content : [];
        const toolUses = blocks.filter(b => b.type === 'tool_use');
        if (toolUses.length === 0) {
          const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || 'اكتمل التنفيذ.';
          await addUsageStats(model, totalIn, totalOut);
          return { text, executedTools, tables, operationCards, confirmations, usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'anthropic', model } };
        }

        messages.push({ role: 'assistant', content: blocks });
        const resultBlocks = [];
        for (const tu of toolUses) {
          const toolDef = AlbayanAIToolRegistry.get(tu.name);
          if (context.onProgress) context.onProgress(`تنفيذ أداة: ${(toolDef && toolDef.label) || tu.name}`);
          const toolOut = await AlbayanAIToolRegistry.execute(tu.name, tu.input || {}, context);
          executedTools.push({ name: tu.name, label: (toolDef && toolDef.label) || tu.name, ok: !!toolOut.ok });
          if (toolOut.operationCard) operationCards.push(toolOut.operationCard);
          if (toolOut.confirmation) confirmations.push(toolOut.confirmation);
          resultBlocks.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(toolOut) });
        }
        messages.push({ role: 'user', content: resultBlocks });
      }

      await addUsageStats(model, totalIn, totalOut);
      return { text: 'تم تنفيذ الأدوات بنجاح.', executedTools, tables, operationCards, confirmations, usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'anthropic', model } };
    }

    // ------------------------------------------------------------------------
    // Adapter 5: Built-in Arabic Administrative Agent & Deterministic NLU
    // Calls real tools from AlbayanAIToolRegistry — NEVER fakes or guesses data!
    // ------------------------------------------------------------------------
    function extractQuotedOrAfter(text, keywords) {
      const mQuote = text.match(/["«“]([^"»”]+)["»”]/);
      if (mQuote) return mQuote[1].trim();
      for (const kw of keywords) {
        const idx = text.indexOf(kw);
        if (idx !== -1) {
          const rest = text.slice(idx + kw.length).trim()
            .replace(/^(باسم|اسمه|اسمها|هي|هو|:)\s+/g, '')
            .split(/[،,.]|(?:\s+(?:و|في|الى|إلى|بـ|عن|من)\s+)/)[0]
            .trim();
          if (rest) return rest;
        }
      }
      return '';
    }

    async function runBuiltinAgentTurn(userPrompt, context) {
      const q = normAr(userPrompt);
      const raw = String(userPrompt || '').trim();
      const executedTools = [];
      const tables = [];
      const operationCards = [];
      const confirmations = [];

      const invokeTool = async (name, args = {}) => {
        const def = AlbayanAIToolRegistry.get(name);
        if (context.onProgress) context.onProgress(`تشغيل أداة: ${(def && def.label) || name}`);
        const out = await AlbayanAIToolRegistry.execute(name, args, context);
        executedTools.push({ name, label: (def && def.label) || name, ok: !!out.ok });
        if (out.operationCard) operationCards.push(out.operationCard);
        if (out.confirmation) confirmations.push(out.confirmation);
        return out;
      };

      // 1. Delete Halaqah
      if ((q.includes('احذف') || q.includes('حذف')) && (q.includes('حلقه') || q.includes('حلق'))) {
        const targetName = extractQuotedOrAfter(raw, ['حذف حلقة', 'احذف حلقة', 'حلقة']);
        if (!targetName) {
          const listRes = await invokeTool('get_all_halaqat', { limit: 15 });
          return {
            text: 'يرجى تحديد اسم الحلقة المراد حذفها ليتم عرض ملخصها وطلب التأكيد قبل التنفيذ.',
            executedTools,
            tables: listRes.ok ? [{ title: 'الحلقات المتاحة', headers: ['المعرّف', 'الحلقة', 'المعلم', 'عدد الطلاب'], rows: listRes.circles.map(c => [c.id, c.name, c.teacher_name, c.student_count_label]) }] : [],
            operationCards,
            confirmations
          };
        }
        const delRes = await invokeTool('delete_halaqah', { circle_name: targetName });
        return {
          text: delRes.status === 'CONFIRMATION_REQUIRED'
            ? `هذه عملية حساسة تتطلب موافقتك الصريحة. راجع تفاصيل الحلقة أدناه ثم اضغط **"تأكيد التنفيذ"**.`
            : (delRes.message || delRes.error || 'اكتمل فحص طلب الحذف.'),
          executedTools, tables, operationCards, confirmations
        };
      }

      // 2. Delete Student
      if ((q.includes('احذف') || q.includes('حذف')) && q.includes('طالب')) {
        const stuName = extractQuotedOrAfter(raw, ['حذف طالب', 'احذف الطالب', 'احذف طالب', 'طالب']);
        if (!stuName) {
          return { text: 'يرجى ذكر اسم الطالب (والحلقة إن أمكن) المراد حذفه حتى أتحقق من هويته وأعرض طلب التأكيد.', executedTools, tables, operationCards, confirmations };
        }
        const delRes = await invokeTool('delete_student', { student_name: stuName });
        return {
          text: delRes.status === 'CONFIRMATION_REQUIRED'
            ? 'يرجى مراجعة بيانات الطالب المستهدف في بطاقة التأكيد أدناه قبل الحذف.'
            : (delRes.message || delRes.error || 'تعذر تحديد الطالب للحذف.'),
          executedTools, tables, operationCards, confirmations
        };
      }

      // 3. Create Halaqah
      if ((q.includes('انشئ') || q.includes('اضف') || q.includes('اضافه') || q.includes('جديده')) && q.includes('حلقه')) {
        const circleNameMatch = raw.match(/(?:باسم|حلقة)\s+([^\s،,]+(?:\s+[^\s،,]+)?)/);
        let cName = circleNameMatch ? circleNameMatch[1].replace(/^(?:جديدة|قرآنية)$/g, '').trim() : '';
        if (cName === 'قرآنية جديدة' || cName === 'جديدة') cName = '';
        const teacherMatch = raw.match(/(?:المعلم|الأستاذ|استاذ)\s+([^\s،,]+)/);
        const teacherName = teacherMatch ? teacherMatch[1].trim() : '';
        const descMatch = raw.match(/(?:وصفها|وصف|بمستوى|مستواها)\s+([^\s،,.]+(?:\s+[^\s،,.]+)?)/);
        const desc = descMatch ? descMatch[1].trim() : '';

        if (!cName) {
          const tRes = await invokeTool('get_teachers', {});
          return {
            text: [
              'لإنشاء حلقة قرآنية جديدة بشكل صحيح، زوّدني بالتفاصيل التالية (أو اذكرها في رسالة واحدة):',
              '- **اسم الحلقة** (إلزامي، مثال: *حلقة النور*)',
              '- **اسم المعلم المسؤول** (اختياري، مثل المعلمين المسجلين أدناه)',
              '- **وصف أو مستوى الحلقة** (اختياري، مثال: *مبتدئ* أو *متقدم*)'
            ].join('\n'),
            executedTools,
            tables: tRes.ok ? [{ title: 'المعلمون المتاحون لإسناد الحلقة', headers: ['المعرف', 'اسم المعلم', 'الحلقات الحالية'], rows: tRes.teachers.map(t => [t.id, t.username, t.circles_names.join('، ') || 'لا يوجد']) }] : [],
            operationCards, confirmations
          };
        }

        const createRes = await invokeTool('create_halaqah', { name: cName, teacher_name: teacherName, description: desc });
        return {
          text: createRes.ok
            ? `تم إنشاء الحلقة **"${createRes.circle.name}"** في قاعدة البيانات بنجاح.`
            : (createRes.message || createRes.error || 'تعذر إنشاء الحلقة.'),
          executedTools, tables, operationCards, confirmations
        };
      }

      // 4. Add Student
      if ((q.includes('اضف') || q.includes('سجل') || q.includes('اضافه')) && q.includes('طالب') && !q.includes('حلقه جديده')) {
        const sMatch = raw.match(/(?:طالباً|طالب|الطالب)\s+(?:اسمه|باسم)?\s*([^\s،,]+(?:\s+[^\s،,]+)?)/);
        const cMatch = raw.match(/(?:إلى|الى|في)\s+(حلقة\s+[^\s،,.]+(?:\s+[^\s،,.]+)?|[^\s،,.]+)/);
        const sName = sMatch ? sMatch[1].trim() : '';
        const cName = cMatch ? cMatch[1].trim() : '';
        const addRes = await invokeTool('create_student', { name: sName, circle_name: cName });
        return {
          text: addRes.ok
            ? `تمت إضافة الطالب **"${addRes.student.name}"** بنجاح والتحقق من الحفظ.`
            : (addRes.message || addRes.error),
          executedTools, tables, operationCards, confirmations
        };
      }

      // 5. Statistics Discrepancy / Reconciliation
      if ((q.includes('مختلف') || q.includes('تناقض') || q.includes('فرق') || q.includes('مقارن') || q.includes('اخطاء في احصائيات') || q.includes('الاخطاء في احصائيات'))) {
        const recon = await invokeTool('analyze_statistics', {});
        const rec = recon.reconciliation || {};
        const lines = [
          '### نتيجة فحص مصادر الإحصائيات ومطابقة الأعداد',
          ...(rec.explanations || []).map(x => `- ${x}`)
        ];
        if (rec.circle_count_mismatches && rec.circle_count_mismatches.length > 0) {
          tables.push({
            title: 'فروقات عداد الحلقات (المخزن مقابل الفعلي)',
            headers: ['الحلقة', 'المخزن في البطاقة', 'الفعلي في جدول الطلاب', 'الفرق'],
            rows: rec.circle_count_mismatches.map(m => [m.circle_name, m.stored_student_count, m.actual_students_count, m.diff])
          });
        } else {
          tables.push({
            title: 'مقارنة مصادر الأعداد الفعلية',
            headers: ['المصدر', 'العدد المسجل'],
            rows: [
              ['إجمالي الطلاب النشطين (/students)', rec.students_table_count],
              ['مجموع الطلاب في الحلقات الحية', rec.sum_live_in_circles],
              ['مجموع student_count في بطاقات الحلقات', rec.sum_stored_circle_counts],
              ['طلاب غير مرتبطين بحلقة نشطة', rec.orphan_students_count]
            ]
          });
        }
        return { text: lines.join('\n'), executedTools, tables, operationCards, confirmations };
      }

      // 6. Full System Anomalies / Problems Scan
      if (q.includes('اكتشف') || q.includes('مشكله') || q.includes('مشكلات') || q.includes('اخطاء') || q.includes('فحص')) {
        const scan = await invokeTool('detect_data_anomalies', {});
        if (!scan.ok) return { text: scan.error || 'تعذر إجراء الفحص.', executedTools, tables, operationCards, confirmations };
        const counts = scan.counts || {};
        const summaryText = [
          `### نتائج الفحص الذكي لبيانات مدرسة البيان`,
          `- أخطاء مؤكدة: **${counts.confirmed_errors || 0}**`,
          `- احتمالات تحتاج تحققاً: **${counts.potential_issues || 0}**`,
          `- بيانات للمراجعة البشرية: **${counts.needs_human_review || 0}**`,
          `- ملاحظات تحسين: **${counts.improvements || 0}**`,
          scan.total_findings === 0 ? '\nلم يتم رصد أي تناقضات أو أخطاء في البيانات الحالية.' : '\n*ملاحظة: الفحص للقراءة فقط ولم يتم تعديل أي سجل تلقائياً.*'
        ].join('\n');

        if (scan.findings && scan.findings.length > 0) {
          tables.push({
            title: 'تفاصيل الملاحظات والأخطاء المكتشفة',
            headers: ['التصنيف', 'الخطورة', 'المشكلة', 'المكان', 'المتأثر', 'الحل المقترح'],
            rows: scan.findings.map(f => [
              f.classification,
              f.severity,
              f.title,
              f.location,
              `${f.affected_count}: ${f.affected_records.slice(0, 3).join('، ')}`,
              f.suggested_solution
            ])
          });
        }
        return { text: summaryText, executedTools, tables, operationCards, confirmations };
      }

      // 7. Teachers Review
      if (q.includes('معلم') || q.includes('اساتذه') || q.includes('كادر')) {
        const tRes = await invokeTool('get_teachers', {});
        if (!tRes.ok) return { text: tRes.error || 'تعذر جلب المعلمين.', executedTools, tables, operationCards, confirmations };
        tables.push({
          title: 'قائمة المعلمين وتوزيع الحلقات والطلاب',
          headers: ['الاسم', 'الدور', 'عدد الحلقات', 'الحلقات المسندة', 'إجمالي الطلاب'],
          rows: tRes.teachers.map(t => [
            t.username,
            t.role,
            t.circles_count,
            t.circles_names.join('، ') || 'غير مسند',
            formatStudentCountAr(t.total_students)
          ])
        });
        const bal = tRes.workload_balance;
        return {
          text: `### مراجعة بيانات المعلمين (${tRes.total})\n- أعلى عبء لطالب معلم واحد: **${bal.max_students_per_teacher}** | أقل عبء: **${bal.min_students_per_teacher}**\n- التوازن العام: ${bal.imbalance_detected ? 'يوجد تفاوت ملحوظ في توزيع الطلاب بين المعلمين (الفارق ' + bal.spread + ' طلاب).' : 'توزيع الطلاب متوازن حالياً.'}`,
          executedTools, tables, operationCards, confirmations
        };
      }

      // 8. Audit History or Undo
      if (q.includes('تراجع') || q.includes('تدقيق') || q.includes('سجل العمليات')) {
        const aud = await invokeTool('get_audit_history', { limit: 15 });
        if (aud.ok && aud.logs) {
          tables.push({
            title: 'سجل عمليات مساعد البيان والتدقيق',
            headers: ['الوقت', 'المنفّذ', 'العملية', 'الهدف', 'الحالة'],
            rows: aud.logs.map(l => [
              (l.timestamp || '').slice(0, 16).replace('T', ' '),
              l.username,
              l.operation,
              l.targetLabel || '—',
              l.undone ? 'تم التراجع' : l.status
            ])
          });
        }
        return { text: `تم جلب **${(aud.logs || []).length}** عملية من سجل التدقيق.`, executedTools, tables, operationCards, confirmations };
      }

      // 9. Update Student or Student Record Guidance / Execution
      if ((q.includes('عدل') || q.includes('تعديل') || q.includes('غير')) && (q.includes('طالب') || q.includes('درجه') || q.includes('غياب') || q.includes('سجل'))) {
        const sRes = await invokeTool('get_students', { limit: 15 });
        return {
          text: [
            'لتعديل بيانات طالب أو سجله بدقة (دون التباس مع الأسماء المتشابهة)، حدد لي في رسالتك:',
            '1. **اسم الطالب الكامل** (والحلقة عند تشابه الأسماء)',
            '2. **الحقل المطلوب تعديله وقيمته الجديدة** (مثال: *علامة الحفظ 38* أو *أيام الغياب 1* أو *نقله إلى حلقة الفجر*)',
            'أو فعّل مزود Gemini / OpenAI / Anthropic من إعدادات النموذج في الأعلى لفهم الأوامر الحرة متعددة الخطوات.'
          ].join('\n'),
          executedTools,
          tables: sRes.ok ? [{ title: 'عينة من الطلاب الحاليين للرجوع السريع', headers: ['المعرف', 'اسم الطالب', 'الحلقة'], rows: sRes.students.map(s => [s.id, s.name, s.circle_name]) }] : [],
          operationCards, confirmations
        };
      }

      // 10. Halaqat Performance / Analysis / Administrative Report
      if (q.includes('تقرير') || q.includes('اداء') || q.includes('حلق') || q.includes('كم عدد الطلاب')) {
        const [stats, circlesRes, recon] = await Promise.all([
          invokeTool('get_statistics', {}),
          invokeTool('get_all_halaqat', { limit: 30 }),
          invokeTool('analyze_statistics', {})
        ]);
        const m = stats.metrics || {};
        const lines = [
          '### التقرير الإداري المحدّث من قاعدة بيانات مدرسة البيان',
          `- **إجمالي الحلقات القرآنية:** ${m.total_circles}`,
          `- **إجمالي الطلاب النشطين (المصدر الفعلي `/students`):** ${formatStudentCountAr(m.total_students_active)}`,
          `- **عدد المعلمين:** ${m.total_teachers}`,
          `- **نسبة الحضور العامة:** ${m.attendance_rate}% (أيام الغياب المسجلة: ${m.total_absent_days})`,
          `- **إجمالي أوجه الحفظ:** ${m.total_memo_pages} | **أوجه السرد:** ${m.total_sard_pages}`,
          '',
          `> **المصادر المعتمدة:** ${(stats.sources_used || []).join(' • ')}`
        ];
        if (circlesRes.ok) {
          tables.push({
            title: 'تفاصيل أداء وتوزيع الحلقات القرآنية',
            headers: ['الحلقة', 'المعلم', 'عدد الطلاب', 'الوصف'],
            rows: circlesRes.circles.map(c => [c.name, c.teacher_name, c.student_count_label, c.description || 'بدون وصف'])
          });
        }
        return { text: lines.join('\n'), executedTools, tables, operationCards, confirmations };
      }

      // 11. Student CV Inquiry
      if (q.includes('سيره') || q.includes('ذاتيه') || q.includes('ملف')) {
        const cvRes = await invokeTool('get_cv_data', {});
        if (cvRes.ok) {
          tables.push({
            title: 'ملخص بطاقات السيرة الذاتية للطلاب',
            headers: ['الطالب', 'الحلقة', 'المعلم', 'الحقول الناقصة'],
            rows: cvRes.cvs.map(cv => [cv.name, cv.circle_name, cv.teacher_name, cv.missing_fields.join('، ') || 'مكتملة'])
          });
        }
        return { text: `تمت مراجعة **${cvRes.total || 0}** بطاقة سيرة ذاتية من قاعدة البيانات.`, executedTools, tables, operationCards, confirmations };
      }

      // 12. General School Data Search fallback
      const cleanedSearch = raw.replace(/^(ابحث عن|اعطني|عرض|كم|من هو)\s+/g, '').trim();
      if (cleanedSearch.length >= 2 && cleanedSearch.length <= 40) {
        const sr = await invokeTool('search_school_data', { query: cleanedSearch });
        const totalHits = (sr.circles || []).length + (sr.students || []).length + (sr.teachers || []).length + (sr.exams || []).length;
        if (totalHits > 0) {
          if ((sr.students || []).length > 0) {
            tables.push({ title: `نتائج الطلاب لـ "${cleanedSearch}"`, headers: ['المعرف', 'الاسم', 'الحلقة'], rows: sr.students.map(s => [s.id, s.name, s.circle_name]) });
          }
          if ((sr.circles || []).length > 0) {
            tables.push({ title: `نتائج الحلقات لـ "${cleanedSearch}"`, headers: ['المعرف', 'الحلقة', 'المعلم'], rows: sr.circles.map(c => [c.id, c.name, c.teacher || '—']) });
          }
          return { text: `عُثر على **${totalHits}** نتيجة مطابقة لـ **"${cleanedSearch}"** في بيانات المدرسة.`, executedTools, tables, operationCards, confirmations };
        }
      }

      const dash = await invokeTool('get_dashboard_data', {});
      const s = dash.summary || {};
      return {
        text: [
          `تم فحص الحالة الحية للنظام: يوجد حالياً **${s.total_circles || 0}** حلقات، و**${formatStudentCountAr(s.total_students_active || 0)}**، و**${s.total_teachers || 0}** معلماً، و**${s.total_exams || 0}** اختبارات.`,
          '',
          'يمكنك أن تطلب مني مباشرةً مثل:',
          '- *"حلل أداء الحلقات القرآنية"*',
          '- *"لماذا عدد الطلاب مختلف في الإحصائيات؟"*',
          '- *"اكتشف الأخطاء والمشكلات في بيانات المدرسة"*',
          '- *"أنشئ حلقة جديدة باسم حلقة النور واجعل المعلم أحمد مسؤولاً عنها ووصفها مبتدئ"*'
        ].join('\n'),
        executedTools, tables, operationCards, confirmations
      };
    }

    async function sendPrompt(historyMessages, userPrompt, options = {}) {
      const cfg = await loadConfig();
      const user = AlbayanAISecurity.getCurrentUser();
      const context = {
        user,
        conversationId: options.conversationId || '',
        signal: options.signal || null,
        onProgress: options.onProgress || null
      };

      // Pre-load teacher circles list for RBAC checks if teacher
      if (AlbayanAISecurity.isTeacher(user)) {
        try {
          const circles = await AlbayanAIDataContext.loadCircles(false);
          const uid = String(normUserId(user.id || ''));
          context.teacherCircleIds = circles
            .filter(c => (c.teacher_id && String(normUserId(c.teacher_id)) === uid) || (user.username && normAr(c.teacher_name) === normAr(user.username)))
            .map(c => String(normCircleId(c.id)));
        } catch (e) {}
      }

      const usage = await loadUsageStats();
      if (cfg.dailyTokenLimit && usage.totalTokens >= Number(cfg.dailyTokenLimit) && cfg.provider !== 'builtin') {
        throw new Error(`تم بلوغ الحد الأقصى لاستهلاك الرموز (${cfg.dailyTokenLimit.toLocaleString()}). يمكنك رفع الحد من إعدادات المزود أو التبديل إلى المحرك المدمج.`);
      }

      if (cfg.provider === 'builtin') {
        return await runBuiltinAgentTurn(userPrompt, context);
      }

      const keyStatus = await AlbayanAISecurity.getApiKeyStatus(cfg.provider);
      if (PROVIDER_CATALOG[cfg.provider]?.requiresKey && !keyStatus.configured) {
        if (cfg.fallbackToBuiltin) {
          const fallbackRes = await runBuiltinAgentTurn(userPrompt, context);
          fallbackRes.fallbackNotice = `مفتاح ${PROVIDER_CATALOG[cfg.provider].label} غير مهيأ بعد؛ تم التنفيذ عبر المحرك الذكي المدمج.`;
          return fallbackRes;
        }
        throw new Error(`لم يتم إدخال API Key لمزود ${PROVIDER_CATALOG[cfg.provider].label}. أدخل المفتاح من إعدادات المزود.`);
      }

      try {
        if (cfg.provider === 'gemini') return await runGeminiTurn(cfg, historyMessages, userPrompt, context);
        if (cfg.provider === 'anthropic') return await runAnthropicTurn(cfg, historyMessages, userPrompt, context);
        return await runOpenAITurn(cfg, historyMessages, userPrompt, context);
      } catch (err) {
        if (err && (err.message === 'ABORTED' || err.name === 'AbortError')) throw err;
        if (cfg.fallbackToBuiltin) {
          const fallbackRes = await runBuiltinAgentTurn(userPrompt, context);
          fallbackRes.fallbackNotice = `تعذر الاتصال بـ ${cfg.provider} (${err.message}); تم التنفيذ عبر المحرك الذكي المدمج مع الوصول الكامل لأدوات النظام.`;
          return fallbackRes;
        }
        throw err;
      }
    }

    async function testConnection(tempConfig = {}, overrideKey = '') {
      if (!AlbayanAISecurity.canConfigureProvider()) {
        return { ok: false, message: 'اختبار وتعديل إعدادات المزود متاح لمدير النظام فقط.' };
      }
      const p = tempConfig.provider || 'builtin';
      if (p === 'builtin') {
        return { ok: true, latencyMs: 1, message: 'المحرك الذكي المدمج متصل وجاهز ويعمل بأدوات قاعدة البيانات الحقيقية.' };
      }

      const started = Date.now();
      const keyStatus = await AlbayanAISecurity.getApiKeyStatus(p);
      if (!overrideKey && PROVIDER_CATALOG[p]?.requiresKey && !keyStatus.configured) {
        return { ok: false, message: 'يرجى إدخال API Key أولاً لاختبار الاتصال.' };
      }

      try {
        const model = tempConfig.model || PROVIDER_CATALOG[p].defaultModel;
        if (p === 'gemini') {
          const url = (tempConfig.customEndpoint && tempConfig.customEndpoint.trim())
            || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
          await performHttp('gemini', url, {
            contents: [{ role: 'user', parts: [{ text: 'أجب بكلمة: جاهز' }] }],
            generationConfig: { maxOutputTokens: 16 }
          }, {}, overrideKey);
        } else if (p === 'anthropic') {
          const url = (tempConfig.customEndpoint && tempConfig.customEndpoint.trim()) || 'https://api.anthropic.com/v1/messages';
          await performHttp('anthropic', url, {
            model,
            messages: [{ role: 'user', content: 'أجب بكلمة: جاهز' }],
            max_tokens: 16
          }, {}, overrideKey);
        } else {
          const url = (p === 'custom' && tempConfig.customEndpoint)
            ? tempConfig.customEndpoint.trim()
            : 'https://api.openai.com/v1/chat/completions';
          await performHttp(p, url, {
            model,
            messages: [{ role: 'user', content: 'أجب بكلمة: جاهز' }],
            max_tokens: 16
          }, {}, overrideKey);
        }
        return { ok: true, latencyMs: Date.now() - started, message: `تم الاتصال بنجاح بمزود ${PROVIDER_CATALOG[p].label} (${model}) خلال ${Date.now() - started}ms.` };
      } catch (err) {
        return { ok: false, message: `فشل الاتصال: ${err.message}` };
      }
    }

    return {
      PROVIDER_CATALOG,
      DEFAULT_CONFIG,
      loadConfig,
      saveConfig,
      loadUsageStats,
      sendPrompt,
      testConnection,
      _adapters: { runGeminiTurn, runOpenAITurn, runAnthropicTurn, runBuiltinAgentTurn }
    };
  })();

  // ==========================================================================
  // LAYER 6: CONVERSATION MEMORY & USER-ISOLATED CONTEXT MANAGEMENT
  // ==========================================================================
  const AlbayanAIMemory = (function () {
    const ACTIVE_LIMIT_MESSAGES = 16;

    function getStorageKey() {
      return `ai_conversations_v1_${AlbayanAISecurity.getUserIdentityKey()}`;
    }

    async function loadAll() {
      const key = getStorageKey();
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        try {
          const data = await window.AlbayanLocalDB.getSetting(key, []);
          if (Array.isArray(data)) return data;
        } catch (e) {}
      }
      return [];
    }

    async function saveAll(list) {
      const key = getStorageKey();
      const clean = (Array.isArray(list) ? list : []).slice(0, 60);
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(key, clean);
      }
      if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.put === 'function') {
        const userKey = AlbayanAISecurity.getUserIdentityKey();
        const summaryIndex = clean.map(c => ({ id: c.id, title: c.title, updatedAt: c.updatedAt, messageCount: (c.messages || []).length }));
        window.AlbayanFirebaseDAL.put(`ai_conversations/${userKey}`, { updatedAt: new Date().toISOString(), index: summaryIndex }, { retries: 0 }).catch(() => {});
      }
      return clean;
    }

    function createConversation(initialTitle = 'محادثة جديدة') {
      const now = new Date().toISOString();
      return {
        id: genId('conv'),
        userKey: AlbayanAISecurity.getUserIdentityKey(),
        title: initialTitle,
        createdAt: now,
        updatedAt: now,
        summary: '',
        messages: []
      };
    }

    function compressHistoryForModel(conv) {
      if (!conv || !Array.isArray(conv.messages)) return [];
      const msgs = conv.messages;
      if (msgs.length <= ACTIVE_LIMIT_MESSAGES) return msgs;

      // Summarize older messages to keep context compact & within token window
      const older = msgs.slice(0, msgs.length - ACTIVE_LIMIT_MESSAGES);
      const recent = msgs.slice(msgs.length - ACTIVE_LIMIT_MESSAGES);
      const bullets = older
        .filter(m => m && m.content)
        .slice(-8)
        .map(m => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${String(m.content).slice(0, 120)}`)
        .join(' | ');
      conv.summary = bullets;
      return [{ role: 'user', content: `ملخص السياق السابق للمحادثة (للاسترشاد فقط وليس إثباتاً لحالة قاعدة البيانات): ${bullets}` }, ...recent];
    }

    return {
      loadAll,
      saveAll,
      createConversation,
      compressHistoryForModel
    };
  })();

  window.AlbayanAI = {
    Security: AlbayanAISecurity,
    Audit: AlbayanAIAudit,
    Data: AlbayanAIDataContext,
    Tools: AlbayanAIToolRegistry,
    Providers: AlbayanAIProviders,
    Memory: AlbayanAIMemory,
    CATALOG: PROVIDER_CATALOG
  };
})();
