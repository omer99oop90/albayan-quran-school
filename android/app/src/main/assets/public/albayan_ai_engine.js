/**
 * ============================================================================
 * ALBAYAN AI — INTELLIGENT ADMINISTRATIVE ASSISTANT ENGINE (albayan_ai_engine.js)
 * ============================================================================
 * Layers:
 *  1. AlbayanAISecurity    : Auth, RBAC permissions, Secret Vault proxy, Persistent Single-Use Confirmation Gate
 *  2. AlbayanAIAudit       : Persistent Audit Log & Reversible Operation Undo
 *  3. AlbayanAIDataContext : Targeted & TTL-cached multi-source loader (Firebase + LocalDB + Services)
 *  4. AlbayanAIToolRegistry: 26 validated DB-backed tools (Halaqat, Students, History, Teachers, Stats, CVs, Anomalies)
 *  5. AlbayanAIProviders   : Real streaming/non-streaming adapters (Gemini, OpenAI, Anthropic, Custom, Local Engine)
 *  6. AlbayanAIMemory      : User-isolated conversations, auto-title, and rolling context summarization
 * ============================================================================
 */
(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    provider: 'builtin', // 'builtin' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'deepseek' | 'anthropic' | 'custom'
    model: 'albayan-local-v1',
    customEndpoint: '',
    temperature: 0.2,
    thinkingBudget: 1024,
    maxTokens: 2048,
    dailyTokenLimit: 250000,
    fallbackToBuiltin: false
  };

  const PROVIDER_CATALOG = {
    builtin: {
      id: 'builtin',
      isLocal: true,
      label: 'محرك البيان المحلي (بدون سحابة ذكاء اصطناعي)',
      shortLabel: 'محرك محلي',
      requiresKey: false,
      requiresEndpoint: false,
      defaultEndpoint: '',
      defaultModel: 'albayan-local-v1',
      models: [
        { id: 'albayan-local-v1', label: 'محرك الأوامر المحلي v1 (قواعد ذكية + بيانات المدرسة)' }
      ]
    },
    gemini: {
      id: 'gemini',
      isLocal: false,
      label: 'Google Gemini API',
      shortLabel: 'Gemini',
      requiresKey: true,
      requiresEndpoint: false,
      defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-3.8-flash',
      models: [
        { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (الأحدث — سريع وذكي)' },
        { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (متوازن وموثوق)' },
        { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon (تفكير عميق)' },
        { id: 'gemini-4-argon', label: 'Gemini 4 Argon' },
        { id: 'gemini-4-neon', label: 'Gemini 4 Neon' },
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
        { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (اقتصادي)' },
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (مستقر)' },
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
      ]
    },
    openai: {
      id: 'openai',
      isLocal: false,
      label: 'OpenAI API',
      shortLabel: 'OpenAI',
      requiresKey: true,
      requiresEndpoint: false,
      defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
        { id: 'gpt-4.1', label: 'GPT-4.1' },
        { id: 'o4-mini', label: 'o4-mini' }
      ]
    },
    groq: {
      id: 'groq',
      isLocal: false,
      label: 'Groq Cloud (سريع جداً - Llama / Qwen)',
      shortLabel: 'Groq',
      requiresKey: true,
      requiresEndpoint: false,
      defaultEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
      defaultModel: 'llama-3.3-70b-versatile',
      models: [
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
        { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
        { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B' },
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B' }
      ]
    },
    openrouter: {
      id: 'openrouter',
      isLocal: false,
      label: 'OpenRouter API (متعدد النماذج)',
      shortLabel: 'OpenRouter',
      requiresKey: true,
      requiresEndpoint: false,
      defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
      defaultModel: 'google/gemini-2.5-flash',
      models: [
        { id: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash' },
        { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
        { id: 'anthropic/claude-3.5-haiku', label: 'Anthropic Claude 3.5 Haiku' },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' }
      ]
    },
    deepseek: {
      id: 'deepseek',
      isLocal: false,
      label: 'DeepSeek API',
      shortLabel: 'DeepSeek',
      requiresKey: true,
      requiresEndpoint: false,
      defaultEndpoint: 'https://api.deepseek.com/chat/completions',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
        { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' }
      ]
    },
    anthropic: {
      id: 'anthropic',
      isLocal: false,
      label: 'Anthropic Claude API',
      shortLabel: 'Claude',
      requiresKey: true,
      requiresEndpoint: false,
      defaultEndpoint: 'https://api.anthropic.com/v1/messages',
      defaultModel: 'claude-3-5-haiku-latest',
      models: [
        { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
        { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
        { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' }
      ]
    },
    custom: {
      id: 'custom',
      isLocal: false,
      label: 'مزود متوافق مع OpenAI (Custom URL)',
      shortLabel: 'Custom API',
      requiresKey: false,
      requiresEndpoint: true,
      defaultEndpoint: '',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
        { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct' }
      ]
    }
  };

  // Pricing only for known cloud models; unknown/local models return null cost
  const COST_PER_1M = {
    'gemini-2.5-flash': { in: 0.15, out: 0.60 },
    'gemini-2.5-pro': { in: 1.25, out: 5.00 },
    'gemini-2.5-flash-lite': { in: 0.075, out: 0.30 },
    'gemini-2.0-flash': { in: 0.10, out: 0.40 },
    'gpt-4o-mini': { in: 0.15, out: 0.60 },
    'gpt-4o': { in: 2.50, out: 10.00 },
    'gpt-4.1-mini': { in: 0.40, out: 1.60 },
    'gpt-4.1': { in: 2.00, out: 8.00 },
    'o4-mini': { in: 1.10, out: 4.40 },
    'llama-3.3-70b-versatile': { in: 0.59, out: 0.79 },
    'deepseek-chat': { in: 0.27, out: 1.10 },
    'deepseek-reasoner': { in: 0.55, out: 2.19 },
    'claude-3-5-haiku-latest': { in: 0.80, out: 4.00 },
    'claude-sonnet-4-20250514': { in: 3.00, out: 15.00 },
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

  function categorizeGradeAr(grade) {
    if (grade === undefined || grade === null || grade === '' || grade === '0' || grade === 0 || grade === 'غير محدد') {
      return 'غير محدد';
    }
    const g = String(grade).trim();
    const num = parseFloat(g);
    if (!isNaN(num)) {
      if (num >= 36) return 'ممتاز';
      if (num >= 30) return 'جيد جداً';
      if (num >= 24) return 'جيد';
      return 'يحتاج متابعة';
    }
    if (['ممتاز', 'ممتازة', 'ممتاز مرتفع'].includes(g)) return 'ممتاز';
    if (['جيد جدا', 'جيد جداً'].includes(g)) return 'جيد جداً';
    if (['جيد'].includes(g)) return 'جيد';
    if (['ضعيف', 'مقبول', 'يحتاج متابعة'].includes(g)) return 'يحتاج متابعة';
    return 'غير محدد';
  }

  function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function stableStringify(obj) {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
  }

  function getNativePlugin() {
    try {
      return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AlbayanExport;
    } catch (e) {
      return null;
    }
  }

  function withAbortAndTimeout(promise, timeoutMs, signal) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        reject(new Error('ABORTED'));
        return;
      }
      let settled = false;
      const onAbort = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('ABORTED'));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(new Error(`TIMEOUT: انتهت مهلة تنفيذ العملية (${Math.round(timeoutMs / 1000)} ثانية).`));
      }, timeoutMs);

      if (signal) signal.addEventListener('abort', onAbort, { once: true });

      Promise.resolve(promise).then(
        val => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve(val);
        },
        err => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (signal) signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }

  class ProviderRequestError extends Error {
    constructor(category, message, httpStatus = 0) {
      super(message);
      this.name = 'ProviderRequestError';
      this.category = category; // 'aborted' | 'offline' | 'network' | 'timeout' | 'auth' | 'model' | 'rate_limit' | 'server' | 'bad_request' | 'config'
      this.httpStatus = httpStatus;
    }
  }

  // ==========================================================================
  // LAYER 1: PERMISSIONS, SECURITY, VAULT & PERSISTENT CONFIRMATION GATE
  // ==========================================================================
  const AlbayanAISecurity = (function () {
    const CONFIRM_STORAGE_KEY = 'albayan_ai_pending_confirms_v1';
    const WEB_VAULT_PREFIX = 'ai_vault_secret_v1_';
    const pendingConfirmations = new Map();

    function loadPersistedConfirmations() {
      try {
        const raw = localStorage.getItem(CONFIRM_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const now = Date.now();
          Object.entries(parsed).forEach(([k, v]) => {
            if (v && !v.consumed && v.expiresAt > now) {
              pendingConfirmations.set(k, v);
            }
          });
        }
      } catch (e) {}
    }

    function persistConfirmations() {
      try {
        const obj = {};
        const now = Date.now();
        pendingConfirmations.forEach((v, k) => {
          if (v && !v.consumed && v.expiresAt > now) {
            obj[k] = v;
          }
        });
        localStorage.setItem(CONFIRM_STORAGE_KEY, JSON.stringify(obj));
      } catch (e) {}
    }

    loadPersistedConfirmations();

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
      return !!(u && u.role !== 'student');
    }

    function authorizeTool(toolName, args = {}, context = {}) {
      const user = context.user || getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'يجب تسجيل الدخول بحساب كادر معتمد لاستخدام مساعد البيان الذكي.' };
      }
      if (user.role === 'student') {
        return { allowed: false, reason: 'غير مصرح لحسابات الطلاب باستخدام الأدوات الإدارية لمساعد البيان.' };
      }

      const adminOnlyTools = new Set(['create_halaqah', 'delete_halaqah', 'update_teacher']);
      if (adminOnlyTools.has(toolName) && !isAdmin(user) && !hasPermission('admin_ai', user) && !hasPermission('users', user)) {
        return {
          allowed: false,
          reason: `صلاحيات حسابك (${user.role || 'كادر'}) لا تسمح بتنفيذ العملية "${toolName}". هذه العملية مخصصة لإدارة المدرسة.`
        };
      }

      if ((toolName === 'delete_student' || toolName === 'update_halaqah') && isTeacher(user) && !hasPermission('manage_circles', user)) {
        return {
          allowed: false,
          reason: 'صلاحيات المعلم لا تسمح بحذف الطلاب أو تعديل بيانات الحلقات الإدارية.'
        };
      }

      if ((toolName === 'create_cv' || toolName === 'update_cv') && isTeacher(user) && !hasPermission('student_cv', user) && !isSupervisor(user)) {
        return {
          allowed: false,
          reason: 'حسابك لا يمتلك صلاحية تعديل السيرة الذاتية للطلاب (student_cv).'
        };
      }

      if (isTeacher(user) && !hasPermission('all_circles', user) && args && args.circle_id !== undefined && Array.isArray(context.teacherCircleIds)) {
        const targetCid = String(normCircleId(args.circle_id));
        if (targetCid && !context.teacherCircleIds.includes(targetCid) &&
            ['create_student', 'update_student', 'create_student_record', 'update_student_record', 'get_halaqah_details'].includes(toolName)) {
          return {
            allowed: false,
            reason: 'غير مصرح لك بالوصول أو التعديل على طلاب وسجلات خارج نطاق حلقاتك المسندة إليك.'
          };
        }
      }

      return { allowed: true };
    }

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
      persistConfirmations();
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
      loadPersistedConfirmations();
      if (!token || typeof token !== 'string') return { valid: false, reason: 'رمز التأكيد مفقود.' };
      const entry = pendingConfirmations.get(token);
      if (!entry) return { valid: false, reason: 'رمز التأكيد غير صالح أو منتهي الصلاحية.' };
      if (entry.consumed) return { valid: false, reason: 'تم استخدام هذا التأكيد مسبقاً.' };
      if (Date.now() > entry.expiresAt) {
        pendingConfirmations.delete(token);
        persistConfirmations();
        return { valid: false, reason: 'انتهت مهلة صلاحية التأكيد (10 دقائق)، يُرجى إعادة طلب العملية.' };
      }
      if (entry.toolName !== toolName) {
        return { valid: false, reason: 'رمز التأكيد لا يطابق العملية المطلوبة.' };
      }
      if (entry.userKey !== getUserIdentityKey(user)) {
        return { valid: false, reason: 'رمز التأكيد يخص مستخدماً آخر.' };
      }
      entry.consumed = true;
      pendingConfirmations.delete(token);
      persistConfirmations();
      return { valid: true, argsSnapshot: entry.argsSnapshot };
    }

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
      const masked = cleanKey ? (cleanKey.length <= 6 ? '••••••' : '••••••••' + cleanKey.slice(-4)) : '';
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
        const masked = dec ? (dec.length <= 6 ? '••••••' : '••••••••' + dec.slice(-4)) : '';
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
      if (!target) return { ok: false, message: 'لم يتم العثور على سجل العملية المطلوبة.' };
      if (target.undone) return { ok: false, message: 'تم التراجع عن هذه العملية مسبقاً.' };
      if (!target.reversible || !target.beforeState) return { ok: false, message: 'هذه العملية غير قابلة للتراجع التلقائي.' };

      const auth = AlbayanAISecurity.authorizeTool(target.toolName, {}, {});
      if (!auth.allowed) return { ok: false, message: auth.reason };

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

      if (!restored) return { ok: false, message: 'تعذر استعادة الحالة السابقة من قاعدة البيانات.' };

      AlbayanAIDataContext.invalidateCache();
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

    return { loadLogs, recordAudit, undoAuditAction };
  })();

  // ==========================================================================
  // LAYER 3: TARGETED & TTL-CACHED DATA LOADER (AlbayanAIDataContext)
  // ==========================================================================
  const AlbayanAIDataContext = (function () {
    const CACHE_TTL_MS = 4500;
    const cache = {
      users: { data: null, ts: 0, inflight: null },
      circles: { data: null, ts: 0, inflight: null },
      stuRec: { data: null, ts: 0, inflight: null },
      exams: { data: null, ts: 0, inflight: null }
    };

    function invalidateCache() {
      Object.values(cache).forEach(entry => {
        entry.data = null;
        entry.ts = 0;
      });
    }

    function getActivePeriod() {
      let savedMonth = '';
      let savedYear = '';
      try {
        savedMonth = localStorage.getItem('albayan_active_month') || '';
        savedYear = localStorage.getItem('albayan_active_year') || '';
      } catch (e) {}

      if (window.AlbayanCycleEngine && typeof window.AlbayanCycleEngine.getConfig === 'function') {
        const cfg = window.AlbayanCycleEngine.getConfig();
        const pType = cfg.mode || cfg.periodType || 'monthly';
        const opts = window.AlbayanCycleEngine.buildPeriodOptionsList(cfg);
        const firstOpt = opts && Array.isArray(opts.options) && opts.options.length > 0 ? opts.options[0] : null;
        const defaultMonth = pType === 'monthly'
          ? (savedMonth || 'صفر')
          : ((firstOpt && firstOpt.value) ? firstOpt.value : 'صفر');
        return {
          period_type: pType,
          year: savedYear || '1448',
          month: defaultMonth,
          record_date: ''
        };
      }
      return { period_type: 'monthly', year: savedYear || '1448', month: savedMonth || 'صفر', record_date: '' };
    }

    async function cachedLoad(slot, loaderFn, force = false) {
      const now = Date.now();
      if (!force && slot.data !== null && (now - slot.ts) < CACHE_TTL_MS) {
        return slot.data;
      }
      if (slot.inflight) return slot.inflight;
      slot.inflight = (async () => {
        try {
          const val = await loaderFn();
          const isEmptyArr = Array.isArray(val) && val.length === 0;
          const isEmptyStuRec = val && !Array.isArray(val) && Array.isArray(val.students) && val.students.length === 0 && Array.isArray(val.records) && val.records.length === 0;
          if (!isEmptyArr && !isEmptyStuRec) {
            slot.data = val;
            slot.ts = Date.now();
          }
          return val;
        } finally {
          slot.inflight = null;
        }
      })();
      return slot.inflight;
    }

    async function loadUsers(force = false) {
      return cachedLoad(cache.users, async () => {
        let users = [];
        if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
          try {
            const res = await window.AlbayanFirebaseDAL.get('users', { timeoutMs: 12000 });
            if (res && res.ok && res.data && window.AlbayanDataNormalizer) {
              users = window.AlbayanDataNormalizer.normalizeCollectionEntries(res.data).map(([k, u]) => ({
                ...u,
                id: normUserId(u.id !== undefined ? u.id : (u.local_id !== undefined ? u.local_id : k))
              }));
            }
          } catch (e) {}
        }
        if ((!users || users.length === 0) && typeof window.pullUsersFromFirebase === 'function') {
          try { users = await window.pullUsersFromFirebase(); } catch (e) {}
        }
        if ((!users || users.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getUsers === 'function') {
          try { users = await window.AlbayanLocalDB.getUsers(); } catch (e) {}
        }
        if (!users || users.length === 0) {
          try { users = JSON.parse(localStorage.getItem('cached_users_list') || '[]'); } catch (e) {}
        }
        return Array.isArray(users) ? users : [];
      }, force);
    }

    async function loadCircles(force = false) {
      return cachedLoad(cache.circles, async () => {
        let circles = [];
        if (window.CirclesService && typeof window.CirclesService.fetchCircles === 'function') {
          try {
            const res = await window.CirclesService.fetchCircles({ forceRefresh: force });
            if (res && res.ok && Array.isArray(res.circles)) circles = res.circles;
          } catch (e) {}
        }
        if ((!circles || circles.length === 0) && window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
          try {
            const fbRes = await window.AlbayanFirebaseDAL.get('circles', { timeoutMs: 12000 });
            if (fbRes && fbRes.ok && fbRes.data && window.AlbayanDataNormalizer) {
              circles = window.AlbayanDataNormalizer.resolveCircles(fbRes.data).circles || [];
            }
          } catch (e) {}
        }
        if ((!circles || circles.length === 0) && window.AlbayanStateStore && typeof window.AlbayanStateStore.getCircles === 'function') {
          circles = window.AlbayanStateStore.getCircles();
        }
        if ((!circles || circles.length === 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalCircles === 'function') {
          try { circles = await window.AlbayanLocalDB.getLocalCircles(); } catch (e) {}
        }
        return Array.isArray(circles) ? circles : [];
      }, force);
    }

    async function loadRawStudentsAndRecords(force = false) {
      return cachedLoad(cache.stuRec, async () => {
        let rawStudents = [];
        let rawRecords = [];
        let fetchedStudentsOk = false;
        let fetchedRecordsOk = false;

        if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
          const [stuRes, recRes] = await Promise.all([
            window.AlbayanFirebaseDAL.get('students', { timeoutMs: 12000 }).catch(() => ({ ok: false })),
            window.AlbayanFirebaseDAL.get('student_records', { timeoutMs: 12000 }).catch(() => ({ ok: false }))
          ]);

          const normalizer = window.AlbayanDataNormalizer;
          if (stuRes && stuRes.ok) {
            fetchedStudentsOk = true;
            if (stuRes.data && normalizer && typeof normalizer.normalizeCollectionEntries === 'function') {
              rawStudents = normalizer.normalizeCollectionEntries(stuRes.data).map(([k, v]) => ({
                ...v,
                _fbKey: k,
                id: normStudentId(v.id !== undefined ? v.id : (v.student_id !== undefined ? v.student_id : k)),
                circle_id: normCircleId(v.circle_id)
              }));
            }
          }
          if (recRes && recRes.ok) {
            fetchedRecordsOk = true;
            if (recRes.data && normalizer && typeof normalizer.normalizeCollectionEntries === 'function') {
              rawRecords = normalizer.normalizeCollectionEntries(recRes.data).map(([k, v]) => ({
                ...v,
                _fbKey: k,
                student_id: normStudentId(v.student_id !== undefined ? v.student_id : v.id),
                circle_id: normCircleId(v.circle_id)
              }));
            }
          }
        }

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
          if (s.deleted === true || s.is_deleted === 1 || s.is_deleted === true) return;
          const sidStr = String(s.id);
          if (deletedStudents.has(sidStr)) return;
          if (uniqueStudentsMap.has(sidStr)) {
            duplicateEntries.push({ type: 'same_id', key: s._fbKey, student: s });
            return;
          }
          uniqueStudentsMap.set(sidStr, s);
        });

        // Per-store LocalDB fallback if cloud fetch failed or returned offline empty
        if ((!fetchedStudentsOk || !fetchedRecordsOk || uniqueStudentsMap.size === 0) &&
            window.AlbayanLocalDB && typeof window.AlbayanLocalDB.exportFullDatabase === 'function') {
          try {
            const exported = await window.AlbayanLocalDB.exportFullDatabase();
            const lStu = (exported && exported.stores && exported.stores.students) || [];
            const lRec = (exported && exported.stores && exported.stores.student_records) || [];
            if (!fetchedStudentsOk || uniqueStudentsMap.size === 0) {
              lStu.forEach(s => {
                if (!s || s.deleted === true || s.is_deleted === 1 || s.is_deleted === true) return;
                const sid = normStudentId(s.id !== undefined ? s.id : s.student_id);
                if (sid !== null && !deletedStudents.has(String(sid))) {
                  uniqueStudentsMap.set(String(sid), { ...s, id: sid, circle_id: normCircleId(s.circle_id) });
                }
              });
            }
            if (!fetchedRecordsOk || rawRecords.length === 0) {
              rawRecords = lRec.map(r => ({
                ...r,
                student_id: normStudentId(r.student_id !== undefined ? r.student_id : r.id),
                circle_id: normCircleId(r.circle_id)
              }));
            }
          } catch (e) {}
        }

        return {
          students: Array.from(uniqueStudentsMap.values()),
          rawStudents,
          records: rawRecords.filter(r => r && !r.deleted),
          duplicateIdEntries: duplicateEntries,
          deletedCircles,
          deletedStudents
        };
      }, force);
    }

    async function loadExamsAndResults(force = false) {
      return cachedLoad(cache.exams, async () => {
        let exams = [];
        let results = [];
        if (typeof window.pullExamsFromFirebase === 'function') {
          try { exams = await window.pullExamsFromFirebase(); } catch (e) {}
        }
        if (window.AlbayanFirebaseDAL && typeof window.AlbayanFirebaseDAL.get === 'function') {
          // Canonical path in Albayan RTDB is /results (with fallback check on /exam_results)
          const [resMain, resAlt] = await Promise.all([
            window.AlbayanFirebaseDAL.get('results', { timeoutMs: 12000 }).catch(() => ({ ok: false })),
            window.AlbayanFirebaseDAL.get('exam_results', { timeoutMs: 12000 }).catch(() => ({ ok: false }))
          ]);
          const normalizer = window.AlbayanDataNormalizer;
          if (resMain && resMain.ok && resMain.data && normalizer) {
            results = normalizer.normalizeCollectionEntries(resMain.data).map(([k, r]) => ({ ...r, id: r.id || k }));
          } else if (resAlt && resAlt.ok && resAlt.data && normalizer) {
            results = normalizer.normalizeCollectionEntries(resAlt.data).map(([k, r]) => ({ ...r, id: r.id || k }));
          }
        }
        if (results.length === 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getLocalResults === 'function') {
          try {
            const localRes = await window.AlbayanLocalDB.getLocalResults();
            if (Array.isArray(localRes)) results = localRes;
          } catch (e) {}
        }
        return {
          exams: Array.isArray(exams) ? exams : [],
          results: Array.isArray(results) ? results : []
        };
      }, force);
    }

    async function loadStudentCvs() {
      let cvs = [];
      if (typeof window.pullStudentCvsFromFirebase === 'function') {
        try { cvs = await window.pullStudentCvsFromFirebase(); } catch (e) {}
      }
      return Array.isArray(cvs) ? cvs : [];
    }

    async function loadSnapshot(opts = {}) {
      const force = !!opts.force;
      const needCircles = opts.circles !== false;
      const needUsers = opts.users !== false;
      const needStuRec = opts.students !== false || opts.records !== false;
      const needExams = !!opts.exams;

      const [circles, users, stuRec, examsData] = await Promise.all([
        needCircles ? loadCircles(force) : Promise.resolve([]),
        needUsers ? loadUsers(force) : Promise.resolve([]),
        needStuRec ? loadRawStudentsAndRecords(force) : Promise.resolve({ students: [], rawStudents: [], records: [], duplicateIdEntries: [], deletedCircles: new Set(), deletedStudents: new Set() }),
        needExams ? loadExamsAndResults(force) : Promise.resolve({ exams: [], results: [] })
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
          live_student_count: needStuRec ? liveStudents.length : Number(c.student_count || 0)
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

    async function loadFullSnapshot(force = false) {
      return loadSnapshot({ circles: true, users: true, students: true, records: true, exams: true, force });
    }

    return {
      invalidateCache,
      getActivePeriod,
      loadUsers,
      loadCircles,
      loadRawStudentsAndRecords,
      loadExamsAndResults,
      loadStudentCvs,
      loadSnapshot,
      loadFullSnapshot
    };
  })();

  // ==========================================================================
  // LAYER 4: CENTRAL TOOL REGISTRY (26 VALIDATED SERVER/DB-BACKED REAL TOOLS)
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

    function getSurahList() {
      return (window.AlbayanDataNormalizer && Array.isArray(window.AlbayanDataNormalizer.SURAH_LIST))
        ? window.AlbayanDataNormalizer.SURAH_LIST
        : [];
    }

    function normalizeSurahName(raw) {
      if (raw === null || raw === undefined) return { ok: true, value: '' };
      const str = String(raw).trim();
      if (!str) return { ok: true, value: '' };
      const surahs = getSurahList();
      if (!surahs.length) return { ok: true, value: str };

      if (/^\d+$/.test(str)) {
        const byNum = surahs.find(s => Number(s.id) === Number(str));
        if (byNum) return { ok: true, value: byNum.name, surah: byNum };
        return { ok: false, message: `رقم السورة "${str}" غير صالح (السور من 1 إلى 114).` };
      }

      const q = normAr(str).replace(/^(?:سوره|سورة)\s+/g, '').trim();
      const qNoAl = q.replace(/^ال/, '');
      const exact = surahs.filter(s => {
        const sn = normAr(s.name);
        return sn === q || sn.replace(/^ال/, '') === qNoAl;
      });
      if (exact.length === 1) return { ok: true, value: exact[0].name, surah: exact[0] };

      const partial = surahs.filter(s => normAr(s.name).includes(q));
      if (partial.length === 1) return { ok: true, value: partial[0].name, surah: partial[0] };
      if (partial.length > 1) {
        return { ok: false, message: `اسم السورة "${raw}" غامض؛ يرجى التحديد بدقة مثل: ${partial.slice(0, 3).map(s => s.name).join('، ')}.` };
      }
      return { ok: false, message: `اسم السورة "${raw}" غير معروف، يرجى كتابة اسم سورة صحيح من القرآن الكريم.` };
    }

    function computeRecordMetrics(row = {}) {
      const absent = Number(row.absent_days || 0);
      const attendanceMark = Math.max(0, 30 - absent * 0.5);
      const mGrade = parseFloat(row.memo_grade);
      const rGrade = parseFloat(row.rev_grade);
      const aMark = parseFloat(row.activity_mark);
      const extra = ['fiqh', 'tafsir', 'adhkar', 'seerah'].reduce((acc, k) => {
        const v = parseFloat(row[k]);
        return acc + (!isNaN(v) && v > 0 ? v : 0);
      }, 0);
      const totalScore = Math.round((
        (!isNaN(mGrade) && mGrade > 0 ? mGrade : 0) +
        (!isNaN(rGrade) && rGrade > 0 ? rGrade : 0) +
        attendanceMark +
        (!isNaN(aMark) && aMark > 0 ? aMark : 0) +
        extra
      ) * 10) / 10;
      return {
        memo_pages: Number(row.memo_pages || 0),
        sard_pages: Number(row.sard_pages || 0),
        absent_days: absent,
        attendance_mark: attendanceMark,
        total_score_out_of_200: totalScore,
        percentage: Math.round((totalScore / 200) * 1000) / 10
      };
    }

    function validateRecordFields(fields) {
      if (!fields || typeof fields !== 'object') return { ok: false, message: 'حقول السجل غير صالحة.' };
      const bounds = [
        ['memo_grade', 0, 40, 'درجة الحفظ'],
        ['rev_grade', 0, 30, 'درجة المراجعة'],
        ['activity_mark', 0, 20, 'درجة النشاط'],
        ['absent_days', 0, 31, 'أيام الغياب'],
        ['fiqh', 0, 20, 'درجة الفقه'],
        ['tafsir', 0, 20, 'درجة التفسير'],
        ['adhkar', 0, 20, 'درجة الأذكار'],
        ['seerah', 0, 20, 'درجة السيرة'],
        ['sard_pages', 0, 604, 'أوجه السرد'],
        ['memo_pages', 0, 604, 'أوجه الحفظ']
      ];
      for (const [key, min, max, label] of bounds) {
        if (fields[key] !== undefined && fields[key] !== '' && fields[key] !== null) {
          const val = Number(fields[key]);
          if (isNaN(val) || val < min || val > max) {
            return { ok: false, message: `قيمة "${label}" غير صالحة (${fields[key]}). يجب أن تكون بين ${min} و ${max}.` };
          }
          fields[key] = val;
        }
      }
      return { ok: true };
    }

    function normalizeRegisterFields(rawFields, currentRecord = {}) {
      const allowedKeys = Object.keys(RECORD_FIELDS_SCHEMA.properties);
      const fields = {};
      Object.keys(rawFields || {}).forEach(k => {
        if (allowedKeys.includes(k) && rawFields[k] !== undefined) {
          fields[k] = rawFields[k];
        }
      });

      const surahKeys = ['from_surah', 'to_surah', 'rev_from_surah', 'rev_to_surah'];
      for (const sk of surahKeys) {
        if (fields[sk] !== undefined && fields[sk] !== null) {
          const res = normalizeSurahName(fields[sk]);
          if (!res.ok) return { ok: false, message: res.message };
          fields[sk] = res.value;
        }
      }

      const surahs = getSurahList();
      const ayahPairs = [
        ['from_ayah', 'from_surah', 'آية بداية الحفظ'],
        ['to_ayah', 'to_surah', 'آية نهاية الحفظ'],
        ['rev_from_ayah', 'rev_from_surah', 'آية بداية المراجعة'],
        ['rev_to_ayah', 'rev_to_surah', 'آية نهاية المراجعة']
      ];
      for (const [ak, sk, label] of ayahPairs) {
        if (fields[ak] !== undefined && fields[ak] !== '' && fields[ak] !== null) {
          const num = Math.floor(Number(fields[ak]));
          if (!isFinite(num) || num < 1) {
            return { ok: false, message: `قيمة "${label}" غير صالحة (${fields[ak]}). يجب أن تكون رقماً صحيحاً يبدأ من 1.` };
          }
          const targetSurah = fields[sk] !== undefined ? fields[sk] : currentRecord[sk];
          if (targetSurah && surahs.length) {
            const sObj = surahs.find(s => s.name === targetSurah || normAr(s.name) === normAr(targetSurah));
            if (sObj && num > sObj.ayahs) {
              return { ok: false, message: `رقم الآية (${num}) يتجاوز عدد آيات سورة ${sObj.name} (${sObj.ayahs} آية).` };
            }
          }
          fields[ak] = num;
        }
      }

      const valCheck = validateRecordFields(fields);
      if (!valCheck.ok) return { ok: false, message: valCheck.message };

      if (
        (fields.from_surah !== undefined || fields.to_surah !== undefined || fields.from_ayah !== undefined || fields.to_ayah !== undefined) &&
        fields.memo_pages === undefined
      ) {
        const fSurah = fields.from_surah !== undefined ? fields.from_surah : currentRecord.from_surah;
        const fAyah = fields.from_ayah !== undefined ? fields.from_ayah : currentRecord.from_ayah;
        const tSurah = fields.to_surah !== undefined ? fields.to_surah : currentRecord.to_surah;
        const tAyah = fields.to_ayah !== undefined ? fields.to_ayah : currentRecord.to_ayah;
        if (fSurah && tSurah && Number(tAyah) > 0 && window.AlbayanDataNormalizer && typeof window.AlbayanDataNormalizer.calcQuranPages === 'function') {
          fields.memo_pages = window.AlbayanDataNormalizer.calcQuranPages(fSurah, Number(fAyah) || 1, tSurah, Number(tAyah));
        } else if (fSurah === '' || tSurah === '') {
          fields.memo_pages = 0;
        }
      }

      return { ok: true, fields };
    }

    const RECORD_FIELDS_SCHEMA = {
      type: 'object',
      description: 'الحقول المراد تعديلها في سجل الطالب',
      properties: {
        from_surah: { type: 'string', description: 'بداية الحفظ (اسم السورة)' },
        from_ayah: { type: 'number', description: 'رقم آية البداية' },
        to_surah: { type: 'string', description: 'نهاية الحفظ (اسم السورة)' },
        to_ayah: { type: 'number', description: 'رقم آية النهاية' },
        memo_pages: { type: 'number', description: 'عدد أوجه الحفظ' },
        memo_grade: { type: 'number', description: 'درجة الحفظ من 0 إلى 40' },
        rev_from_surah: { type: 'string', description: 'بداية المراجعة (اسم السورة)' },
        rev_from_ayah: { type: 'number', description: 'آية بداية المراجعة' },
        rev_to_surah: { type: 'string', description: 'نهاية المراجعة (اسم السورة)' },
        rev_to_ayah: { type: 'number', description: 'آية نهاية المراجعة' },
        sard_pages: { type: 'number', description: 'عدد أوجه السرد' },
        rev_grade: { type: 'number', description: 'درجة المراجعة من 0 إلى 30' },
        absent_days: { type: 'number', description: 'أيام الغياب من 0 إلى 31' },
        activity_mark: { type: 'number', description: 'درجة النشاط من 0 إلى 20' },
        fiqh: { type: 'number', description: 'درجة الفقه من 0 إلى 20' },
        tafsir: { type: 'number', description: 'درجة التفسير من 0 إلى 20' },
        adhkar: { type: 'number', description: 'درجة الأذكار من 0 إلى 20' },
        seerah: { type: 'number', description: 'درجة السيرة من 0 إلى 20' },
        exam_grade: { type: 'string', description: 'تقدير أو درجة الاختبار' },
        exam_title: { type: 'string', description: 'عنوان الاختبار' }
      }
    };

    // 1. get_dashboard_data
    register({
      name: 'get_dashboard_data',
      category: 'نظرة عامة',
      label: 'ملخص لوحة المدرسة الشاملة',
      description: 'يجلب نظرة تنفيذية شاملة على أعداد الحلقات والطلاب والمعلمين والاختبارات ونظام المدة.',
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

    // 2. get_all_halaqat
    register({
      name: 'get_all_halaqat',
      category: 'الحلقات',
      label: 'قراءة الحلقات القرآنية',
      description: 'يعرض الحلقات القرآنية مع المعلم المسؤول وعدد الطلاب والوصف، مع دعم البحث والتصفية.',
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: true, records: false, exams: false });
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
          student_count_label: formatStudentCountAr(c.live_student_count),
          created_at: c.created_at || ''
        }));

        return { ok: true, total: list.length, offset, limit, circles: paged };
      }
    });

    // 3. get_halaqah_details
    register({
      name: 'get_halaqah_details',
      category: 'الحلقات',
      label: 'تفاصيل حلقة قرآنية',
      description: 'يعرض تفاصيل حلقة معينة وطلابها وسجل الغياب والحفظ.',
      parameters: {
        type: 'object',
        properties: {
          circle_id: { type: 'string', description: 'معرف الحلقة' },
          circle_name: { type: 'string', description: 'اسم الحلقة' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: true, records: false, exams: false });
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
        const auth = AlbayanAISecurity.authorizeTool('get_halaqah_details', { circle_id: circle.id }, context);
        if (!auth.allowed) return { ok: false, error: auth.reason };

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

    // 4. create_halaqah
    register({
      name: 'create_halaqah',
      category: 'الحلقات',
      label: 'إنشاء حلقة قرآنية جديدة',
      description: 'ينشئ حلقة قرآنية جديدة بالاسم والوصف والمعلم المسؤول بعد التحقق من عدم التكرار.',
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
        if (!cleanName || cleanName.length < 2) {
          return { ok: false, missingFields: ['name'], message: 'يرجى تحديد اسم واضح للحلقة الجديدة قبل الإنشاء.' };
        }
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: false, records: false, exams: false });
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

        AlbayanAIDataContext.invalidateCache();
        const auditRec = await AlbayanAIAudit.recordAudit({
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
          auditId: auditRec.id,
          circle: saveRes.circle,
          operationCard: {
            title: 'تم إنشاء الحلقة القرآنية بنجاح',
            entity: saveRes.circle.name,
            changes: [
              { field: 'الاسم', before: '—', after: saveRes.circle.name },
              { field: 'المعلم', before: '—', after: saveRes.circle.teacher_name || 'إدارة عامة' },
              { field: 'الوصف', before: '—', after: saveRes.circle.description || 'بدون وصف' }
            ],
            auditId: auditRec.id,
            reversible: true,
            synced: saveRes.synced
          }
        };
      }
    });

    // 5. update_halaqah
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: false, records: false, exams: false });
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

        AlbayanAIDataContext.invalidateCache();
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

    // 6. delete_halaqah
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: true, records: false, exams: false });
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
        if (!check.valid) return { ok: false, message: check.reason };

        const delRes = await window.CirclesService.deleteCircle(targetCircle.id);
        AlbayanAIDataContext.invalidateCache();
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

    // 7. get_students
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: false, students: true, records: false, exams: false });
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

    // 8. get_student_details
    register({
      name: 'get_student_details',
      category: 'الطلاب',
      label: 'عرض ملف طالب',
      description: 'يعرض تفاصيل طالب معين مع حلقته ومعلمه وآخر سجلاته ونتائج اختباراته.',
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

    // 9. get_student_history (NEW — Dedicated chronological student history)
    register({
      name: 'get_student_history',
      category: 'الطلاب',
      label: 'السجل التراكمي وتاريخ الطالب',
      description: 'يجلب السجل التاريخي التراكمي الكامل للطالب عبر جميع الأشهر والفترات ونتائج الاختبارات والمجاميع.',
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
              ? 'يوجد أكثر من طالب متشابه بالاسم؛ يرجى تحديد الطالب وحلقته:'
              : 'لم يتم العثور على الطالب المطلوب.',
            candidates: sRes.candidates.map(s => {
              const c = snap.circleById.get(String(normCircleId(s.circle_id)));
              return { id: s.id, name: s.name, circle_name: c ? c.name : 'غير محدد' };
            })
          };
        }

        const student = sRes.exact;
        const circle = snap.circleById.get(String(normCircleId(student.circle_id)));
        let historyRows = [];
        if (window.RosterService && typeof window.RosterService.fetchStudentHistory === 'function') {
          try {
            historyRows = await window.RosterService.fetchStudentHistory(student.id);
          } catch (e) {}
        }
        if (!Array.isArray(historyRows) || historyRows.length === 0) {
          historyRows = snap.records.filter(r => String(normStudentId(r.student_id)) === String(student.id));
        }

        let totalMemoPages = 0;
        let totalSardPages = 0;
        let totalAbsent = 0;
        const formattedHistory = historyRows.map(r => {
          const memoPages = Number(r.memo_pages || 0);
          const sardPages = Number(r.sard_pages || 0);
          const absent = Number(r.absent_days || 0);
          totalMemoPages += memoPages;
          totalSardPages += sardPages;
          totalAbsent += absent;

          const attMark = Math.max(0, 30 - absent * 0.5);
          const mGrade = parseFloat(r.memo_grade);
          const rGrade = parseFloat(r.rev_grade);
          const aMark = parseFloat(r.activity_mark);
          const extra = ['fiqh', 'tafsir', 'adhkar', 'seerah'].reduce((acc, k) => {
            const v = parseFloat(r[k]);
            return acc + (!isNaN(v) && v > 0 ? v : 0);
          }, 0);
          const totalScore = Math.round((
            (!isNaN(mGrade) && mGrade > 0 ? mGrade : 0) +
            (!isNaN(rGrade) && rGrade > 0 ? rGrade : 0) +
            attMark +
            (!isNaN(aMark) && aMark > 0 ? aMark : 0) +
            extra
          ) * 10) / 10;

          return {
            period_type: r.period_type || 'monthly',
            period_label: r.period_type === 'daily' ? (r.record_date || r.month || '') : `${r.month || ''} ${r.year || ''}`.trim(),
            memo_range: (r.from_surah && r.to_surah) ? `${r.from_surah} (${r.from_ayah || 1}) -> ${r.to_surah} (${r.to_ayah || 1})` : '—',
            memo_pages: memoPages,
            memo_grade: r.memo_grade || '—',
            rev_range: (r.rev_from_surah && r.rev_to_surah) ? `${r.rev_from_surah} (${r.rev_from_ayah || 1}) -> ${r.rev_to_surah} (${r.rev_to_ayah || 1})` : '—',
            sard_pages: sardPages,
            rev_grade: r.rev_grade || '—',
            absent_days: absent,
            attendance_mark: attMark,
            activity_mark: r.activity_mark || '—',
            total_score_out_of_200: totalScore,
            percentage: Math.round((totalScore / 200) * 1000) / 10
          };
        });

        const examAttempts = snap.examResults.filter(er =>
          String(er.student_id || '') === String(student.id) || normAr(er.student_name) === normAr(student.name)
        );

        return {
          ok: true,
          student: {
            id: student.id,
            name: student.name,
            circle_name: circle ? circle.name : 'غير مرتبط بحلقة',
            teacher_name: circle ? circle.resolved_teacher_name : 'غير محدد'
          },
          summary: {
            periods_recorded: formattedHistory.length,
            total_memo_pages: Math.round(totalMemoPages * 10) / 10,
            total_sard_pages: Math.round(totalSardPages * 10) / 10,
            total_absent_days: totalAbsent,
            exam_attempts_count: examAttempts.length
          },
          history: formattedHistory,
          exam_results: examAttempts.slice(0, 15)
        };
      }
    });

    // 10. create_student
    register({
      name: 'create_student',
      category: 'الطلاب',
      label: 'إضافة طالب إلى حلقة',
      description: 'يضيف طالباً جديداً إلى حلقة قرآنية حقيقية، مع إمكانية تعبئة حقول السجل الأولية (الحفظ، المراجعة، الغياب، الدرجات) دفعة واحدة.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'اسم الطالب الكامل (مطلوب)' },
          circle_id: { type: 'string' },
          circle_name: { type: 'string', description: 'اسم الحلقة المستهدفة' },
          force_duplicate: { type: 'boolean', description: 'متابعة الإضافة حتى مع تشابه الاسم' },
          period_type: { type: 'string', description: 'نوع الفترة: monthly أو weekly أو daily' },
          month: { type: 'string', description: 'الشهر الهجري (مثل صفر)' },
          year: { type: 'string', description: 'السنة الهجرية (مثل 1448)' },
          record_date: { type: 'string', description: 'تاريخ اليوم في النظام اليومي' },
          fields: RECORD_FIELDS_SCHEMA
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: false, students: true, records: false, exams: false });
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

        // Collect & validate optional initial register fields (nested or flat)
        const allowedKeys = Object.keys(RECORD_FIELDS_SCHEMA.properties);
        const rawFields = { ...(args.fields && typeof args.fields === 'object' ? args.fields : {}) };
        allowedKeys.forEach(k => {
          if (args[k] !== undefined && rawFields[k] === undefined) rawFields[k] = args[k];
        });
        const normRes = normalizeRegisterFields(rawFields, {});
        if (!normRes.ok) return { ok: false, message: normRes.message };
        const initialFields = normRes.fields;

        const period = {
          ...snap.activePeriod,
          ...(args.period_type ? { period_type: args.period_type } : {}),
          ...(args.year ? { year: String(args.year) } : {}),
          ...(args.month ? { month: args.month } : {}),
          ...(args.record_date ? { record_date: args.record_date } : {})
        };

        if (!window.RosterService || typeof window.RosterService.addStudent !== 'function') {
          return { ok: false, message: 'خدمة الطلاب (RosterService) غير متاحة حالياً.' };
        }
        const res = await window.RosterService.addStudent(circle.id, cleanName, period, initialFields);
        if (!res || !res.ok) {
          return { ok: false, message: (res && res.error && res.error.message) || 'تعذر إضافة الطالب.' };
        }

        AlbayanAIDataContext.invalidateCache();
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
        const changes = [
          { field: 'الطالب', before: '—', after: res.student.name },
          { field: 'الحلقة', before: '—', after: circle.name },
          { field: 'الفترة', before: '—', after: `${period.month} ${period.year}` }
        ];
        Object.keys(initialFields).forEach(k => {
          changes.push({ field: k, before: 'فارغ', after: String(initialFields[k]) });
        });
        return {
          ok: true,
          synced: res.synced,
          student: res.student,
          period,
          metrics: computeRecordMetrics(res.student),
          operationCard: {
            title: 'تمت إضافة الطالب بنجاح',
            entity: res.student.name,
            changes,
            synced: res.synced
          }
        };
      }
    });

    // 11. update_student
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: false, students: true, records: false, exams: false });
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
        const auth = AlbayanAISecurity.authorizeTool('update_student', { circle_id: student.circle_id }, context);
        if (!auth.allowed) return { ok: false, message: auth.reason };

        const currentCircle = snap.circleById.get(String(normCircleId(student.circle_id)));
        const changes = [];
        let auditBefore = { student_id: student.id, circle_id: student.circle_id, name: student.name, period: snap.activePeriod };
        let resolvedTargetCid = student.circle_id;

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
          resolvedTargetCid = destCircle.id;
          changes.push({ field: 'الحلقة', before: currentCircle ? currentCircle.name : String(student.circle_id), after: destCircle.name });
          auditBefore = { wasTransfer: true, student_id: student.id, previous_circle_id: student.circle_id, current_circle_id: destCircle.id };
        }

        if (args.new_name && String(args.new_name).trim() !== student.name) {
          const nextName = String(args.new_name).trim();
          await window.RosterService.updateStudentRecord(resolvedTargetCid, student.id, snap.activePeriod, { name: nextName }, student);
          changes.push({ field: 'الاسم', before: student.name, after: nextName });
        }

        if (changes.length === 0) {
          return { ok: false, message: 'لم يتم تحديد أي تعديل مطلوب للطالب.' };
        }

        AlbayanAIDataContext.invalidateCache();
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

    // 12. delete_student
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: false, students: true, records: false, exams: false });
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
        AlbayanAIDataContext.invalidateCache();
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

    // 13. get_teachers
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: true, records: false, exams: false });
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

    // 14. update_teacher
    register({
      name: 'update_teacher',
      category: 'المعلمون',
      label: 'تعديل بيانات معلم أو إسناده لحلقة',
      description: 'يعدّل الاسم المعروض أو الدور الوظيفي (بعد تأكيد صريح) أو يسند المعلم إلى حلقة قرآنية.',
      parameters: {
        type: 'object',
        properties: {
          teacher_id: { type: 'string' },
          teacher_name: { type: 'string' },
          new_username: { type: 'string' },
          new_role: { type: 'string' },
          assign_circle_name: { type: 'string' },
          confirm_token: { type: 'string' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: false, records: false, exams: false });
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
        const user = context.user || AlbayanAISecurity.getCurrentUser();

        // Role elevation/change is sensitive and requires explicit confirmation
        if (args.new_role && args.new_role !== existingUser.role) {
          if (!['admin', 'supervisor', 'teacher'].includes(args.new_role)) {
            return { ok: false, message: 'الدور الوظيفي غير صالح. الأدوار المتاحة: admin | supervisor | teacher.' };
          }
          if (!args.confirm_token) {
            const confirmation = AlbayanAISecurity.createConfirmation({
              toolName: 'update_teacher',
              args: { ...args, teacher_id: String(existingUser.id) },
              operationTitle: `تغيير صلاحيات "${existingUser.username}"`,
              targetSummary: `المستخدم: ${existingUser.username}`,
              oldValues: { الدور_الحالي: existingUser.role },
              newValues: { الدور_الجديد: args.new_role },
              impactWarning: 'تغيير الدور الوظيفي يعدّل صلاحيات الوصول الإدارية للحساب.'
            }, user);
            return { ok: false, status: 'CONFIRMATION_REQUIRED', confirmation };
          }
          const check = AlbayanAISecurity.consumeConfirmation(args.confirm_token, 'update_teacher', user);
          if (!check.valid) return { ok: false, message: check.reason };
        }

        const changes = [];
        const updatedUser = { ...existingUser };

        if (args.new_username && String(args.new_username).trim() !== existingUser.username) {
          updatedUser.username = String(args.new_username).trim();
          changes.push({ field: 'اسم المستخدم', before: existingUser.username, after: updatedUser.username });
        }
        if (args.new_role && args.new_role !== existingUser.role) {
          updatedUser.role = args.new_role;
          changes.push({ field: 'الدور الوظيفي', before: existingUser.role, after: updatedUser.role });
        }

        let userSaved = true;
        if (changes.length > 0 && typeof window.saveUserToFirebase === 'function') {
          userSaved = await window.saveUserToFirebase(updatedUser);
        }

        if (args.assign_circle_name) {
          const cRes = resolveCircleInList(snap.circles, args.assign_circle_name);
          if (!cRes.exact) return { ok: false, message: `لم يتم العثور على الحلقة "${args.assign_circle_name}".` };
          const circle = cRes.exact;
          await window.CirclesService.saveCircle({
            ...circle,
            teacher_id: normUserId(updatedUser.id),
            teacher_name: updatedUser.username
          }, { isEdit: true });
          changes.push({ field: `معلم ${circle.name}`, before: circle.resolved_teacher_name || 'غير محدد', after: updatedUser.username });
        }

        if (changes.length === 0) return { ok: false, message: 'لم يتم تحديد أي تعديلات لتطبيقها على المعلم.' };

        AlbayanAIDataContext.invalidateCache();
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
          auditId: auditRec.id,
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

    // 15. get_student_records
    register({
      name: 'get_student_records',
      category: 'السجلات',
      label: 'قراءة سجلات الطلاب',
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: false, students: true, records: true, exams: false });
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
          const metrics = computeRecordMetrics(r);
          return {
            record_id: r.id || r._fbKey,
            student_id: normStudentId(r.student_id),
            student_name: r.student_name || (st && st.name) || 'غير معروف',
            circle_name: cObj ? cObj.name : 'غير محدد',
            period_type: r.period_type || 'monthly',
            record_date: r.record_date || '',
            month: r.month || '',
            year: r.year || '',
            from_surah: r.from_surah || '',
            from_ayah: r.from_ayah || '',
            to_surah: r.to_surah || '',
            to_ayah: r.to_ayah || '',
            memo_range: (r.from_surah && r.to_surah) ? `${r.from_surah} (${r.from_ayah || 1}) -> ${r.to_surah} (${r.to_ayah || 1})` : '—',
            memo_pages: Number(r.memo_pages || 0),
            memo_grade: r.memo_grade ?? '',
            rev_from_surah: r.rev_from_surah || '',
            rev_from_ayah: r.rev_from_ayah || '',
            rev_to_surah: r.rev_to_surah || '',
            rev_to_ayah: r.rev_to_ayah || '',
            rev_range: (r.rev_from_surah && r.rev_to_surah) ? `${r.rev_from_surah} (${r.rev_from_ayah || 1}) -> ${r.rev_to_surah} (${r.rev_to_ayah || 1})` : '—',
            sard_pages: Number(r.sard_pages || 0),
            rev_grade: r.rev_grade ?? '',
            absent_days: Number(r.absent_days || 0),
            attendance_mark: metrics.attendance_mark,
            activity_mark: r.activity_mark ?? '',
            fiqh: r.fiqh ?? '',
            tafsir: r.tafsir ?? '',
            adhkar: r.adhkar ?? '',
            seerah: r.seerah ?? '',
            exam_title: r.exam_title || '',
            exam_grade: r.exam_grade || '',
            total_score_out_of_200: metrics.total_score_out_of_200,
            percentage: metrics.percentage
          };
        });
        return { ok: true, total: recs.length, records: formatted };
      }
    });

    // 16. create_student_record
    register({
      name: 'create_student_record',
      category: 'السجلات',
      label: 'إضافة سجل جديد لطالب',
      description: 'ينشئ سجلاً شهرياً/أسبوعياً/يومياً لطالب محدد مع كافة خانات السجل (الحفظ، المراجعة، السرد، الغياب، النشاط، المصاحبة، الاختبار).',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string' },
          period_type: { type: 'string', description: 'monthly أو weekly أو daily' },
          month: { type: 'string', description: 'الشهر الهجري مثل صفر' },
          year: { type: 'string', description: 'السنة مثل 1448' },
          record_date: { type: 'string', description: 'تاريخ اليوم إن كان النظام يومياً' },
          fields: RECORD_FIELDS_SCHEMA
        }
      },
      async execute(args = {}, context = {}) {
        const updateTool = tools.get('update_student_record');
        return updateTool.execute({ ...args, is_new_record: true }, context);
      }
    });

    // 17. update_student_record
    register({
      name: 'update_student_record',
      category: 'السجلات',
      label: 'تعديل سجل طالب',
      description: 'يعدّل أي خانة في سجل الطالب (الحفظ من سورة/آية إلى سورة/آية، المراجعة، السرد، الغياب، النشاط، الفقه، التفسير، الأذكار، السيرة، الاختبار) مع التحقق التلقائي وحساب أوجه الحفظ والمجموع.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          circle_name: { type: 'string' },
          period_type: { type: 'string', description: 'monthly أو weekly أو daily' },
          month: { type: 'string', description: 'الشهر الهجري مثل صفر' },
          year: { type: 'string', description: 'السنة مثل 1448' },
          record_date: { type: 'string', description: 'تاريخ اليوم إن كان النظام يومياً' },
          fields: RECORD_FIELDS_SCHEMA,
          preview_only: { type: 'boolean', description: 'لعرض التعديلات المقترحة قبل الحفظ' }
        }
      },
      async execute(args = {}, context = {}) {
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: false, students: true, records: true, exams: false });
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
        const auth = AlbayanAISecurity.authorizeTool('update_student_record', { circle_id: student.circle_id }, context);
        if (!auth.allowed) return { ok: false, message: auth.reason };

        const period = {
          ...snap.activePeriod,
          ...(args.period_type ? { period_type: args.period_type } : {}),
          ...(args.month ? { month: args.month } : {}),
          ...(args.year ? { year: String(args.year) } : {}),
          ...(args.record_date ? { record_date: args.record_date } : {})
        };

        const currentRecord = snap.records.find(r => {
          if (String(normStudentId(r.student_id)) !== String(student.id)) return false;
          if (period.record_date && r.record_date) return r.record_date === period.record_date;
          const sameMonth = normAr(r.month || snap.activePeriod.month) === normAr(period.month);
          const sameYear = !r.year || !period.year || String(r.year) === String(period.year);
          return sameMonth && sameYear;
        }) || {};

        // Accept either nested fields object or flat record fields
        const allowedKeys = Object.keys(RECORD_FIELDS_SCHEMA.properties);
        const rawFields = { ...(args.fields && typeof args.fields === 'object' ? args.fields : {}) };
        allowedKeys.forEach(k => {
          if (args[k] !== undefined && rawFields[k] === undefined) rawFields[k] = args[k];
        });

        if (Object.keys(rawFields).length === 0) {
          return { ok: false, message: 'يرجى تحديد الحقول والقيم المراد تحديثها في السجل.' };
        }

        const normRes = normalizeRegisterFields(rawFields, currentRecord);
        if (!normRes.ok) return { ok: false, message: normRes.message };
        const fields = normRes.fields;

        if (Object.keys(fields).length === 0) {
          return { ok: false, message: 'يرجى تحديد الحقول والقيم الصالحة المراد تحديثها في السجل.' };
        }

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

        const nextMetrics = computeRecordMetrics({ ...currentRecord, ...fields });

        if (args.preview_only) {
          return {
            ok: true,
            previewOnly: true,
            student: { id: student.id, name: student.name },
            period,
            proposedChanges: changes,
            metrics: nextMetrics
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

        AlbayanAIDataContext.invalidateCache();
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
          period,
          metrics: nextMetrics,
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

    // 18. get_statistics
    register({
      name: 'get_statistics',
      category: 'الإحصائيات',
      label: 'استخراج الإحصائيات الفعلية',
      description: 'يحسب إحصائيات الطلاب والحلقات والمعلمين والحفظ والغياب والاختبارات من مصادر قاعدة البيانات الفعلية.',
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
          if (categorizeGradeAr(r.memo_grade) === 'ممتاز') excellentCount++;
        });

        const attendanceRate = totalStudentsActive > 0
          ? Math.max(0, Math.min(100, Math.round(100 - (totalAbsentDays / (totalStudentsActive * 30)) * 100)))
          : 100;

        const passedExams = snap.examResults.filter(er => er.passed === 1 || er.passed === true || Number(er.percentage || 0) >= 50).length;

        return {
          ok: true,
          sources_used: ['/students', '/circles', '/student_records', '/users', '/exams', '/results'],
          formulas: {
            total_students_active: 'عدد السجلات الفريدة الفعّالة في /students بعد استبعاد المحذوفين',
            sum_of_circle_live_students: 'مجموع الطلاب المرتبطين فعلياً بحلقة نشطة في /circles',
            attendance_rate: '100 - (مجموع أيام الغياب ÷ (عدد الطلاب × 30)) × 100'
          },
          metrics: {
            total_circles: snap.circles.length,
            total_students_active: totalStudentsActive,
            sum_of_circle_live_students: circleLiveSum,
            sum_of_circle_stored_counts: circleStoredSum,
            orphan_students_count: orphanStudents.length,
            total_records: snap.records.length,
            total_memo_pages: Math.round(totalMemoPages * 10) / 10,
            total_sard_pages: Math.round(totalSardPages * 10) / 10,
            total_absent_days: totalAbsentDays,
            attendance_rate: attendanceRate,
            excellent_records_count: excellentCount,
            total_teachers: snap.users.filter(u => u.role === 'teacher' || u.role === 'معلم').length,
            total_exams: snap.exams.length,
            total_exam_results: snap.examResults.length,
            passed_exam_results: passedExams
          }
        };
      }
    });

    // 19. analyze_statistics
    register({
      name: 'analyze_statistics',
      category: 'الإحصائيات',
      label: 'تحليل الإحصائيات ومطابقة مصادرها',
      description: 'يقارن الأعداد بين الحلقات والإحصائيات وجدول الطلاب ويكتشف التناقضات وأسبابها الدقيقة.',
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
          explanations.push('جميع المصادر متطابقة: عدد الطلاب في جدول students يطابق تماماً مجموع طلاب الحلقات والأرقام المخزنة.');
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
            orphan_students: orphanStudents.slice(0, 20).map(s => ({ id: s.id, name: s.name, circle_id: s.circle_id || null })),
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

    // 20. generate_report
    register({
      name: 'generate_report',
      category: 'التقارير',
      label: 'إعداد تقرير إداري شامل',
      description: 'يولّد تقريراً إدارياً منظماً حسب نوعه (شامل / الحلقات / الطلاب / المعلمين / السجلات).',
      parameters: {
        type: 'object',
        properties: {
          report_type: { type: 'string', description: 'شامل | حلقات | طلاب | معلمين | سجلات' }
        }
      },
      async execute(args = {}) {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const [statsRes, anomalyRes] = await Promise.all([
          tools.get('get_statistics').execute(),
          tools.get('detect_data_anomalies').execute()
        ]);
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

    // 21-23. Student CVs
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
          if ((!cv.phone || cv.phone === 'غير متوفر') && (!cv.guardian_phone || cv.guardian_phone === 'غير متوفر')) missing.push('رقم التواصل/ولي الأمر');
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
      description: 'ينشئ ملف السيرة الذاتية لطالب وفق هيكل صفحة السيرة الذاتية المعتمد.',
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
        const snap = await AlbayanAIDataContext.loadSnapshot({ circles: true, users: true, students: true, records: false, exams: false });
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
      description: 'يعدّل بيانات بطاقة السيرة الذاتية مع الحفاظ على السجلات الشهرية والمرفقات.',
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
        if (!target) return { ok: false, message: 'لم يتم العثور على بطاقة السيرة الذاتية للطالب.' };

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
          auditId: auditRec.id,
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

    // 24. search_school_data
    register({
      name: 'search_school_data',
      category: 'بحث شامل',
      label: 'بحث في وحدات المدرسة',
      description: 'يبحث في الحلقات والطلاب والمعلمين والاختبارات بكلمة مفتاحية محددة.',
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

    // 25. detect_data_anomalies
    register({
      name: 'detect_data_anomalies',
      category: 'فحص الأخطاء',
      label: 'فحص الأخطاء والتناقضات في البيانات',
      description: 'يجري فحصاً شاملاً لاكتشاف التكرار والبيانات الناقصة والحلقات بدون معلم والطلاب اليتامى وتناقضات الإحصائيات.',
      parameters: { type: 'object', properties: {} },
      async execute() {
        const snap = await AlbayanAIDataContext.loadFullSnapshot(false);
        const findings = [];
        const addFinding = (classification, severity, title, location, affected, reason, solution, actionNeeded) => {
          findings.push({
            classification,
            severity,
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

        if (snap.duplicateIdEntries.length > 0) {
          addFinding('خطأ مؤكد', 'عالي', 'تضارب معرفات طلاب مكررة في Firebase', 'جدول /students',
            snap.duplicateIdEntries.map(d => `${d.student.name} (مفتاح: ${d.key})`),
            'وجود مفاتيح قديمة بجانب المفتاح القياسي لنفس الطالب',
            'تنظيف المفاتيح المكررة والإبقاء على المعرف القياسي الموحد',
            'مراجعة مفاتيح /students وحذف المفاتيح المكررة');
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
          addFinding('بيانات تحتاج مراجعة بشرية', 'متوسط', 'أسماء طلاب متطابقة أو مكررة', 'قائمة الطلاب',
            dupNames.map(g => `${g[0].name} (${g.length} مرات)`),
            'إدخال الطالب مرتين أو تشابه حقيقي في الأسماء',
            'التأكد من هوية كل طالب وحذف الإدخال المكرر مع تأكيد صريح',
            'مراجعة الأسماء المكررة والتأكد من عدم تكرار الطالب نفسه');
        }

        const brokenStudents = snap.students.filter(s => !s.name || String(s.name).trim().length < 2);
        if (brokenStudents.length > 0) {
          addFinding('خطأ مؤكد', 'عالي', 'سجلات طلاب بدون اسم أو باسم ناقص', 'جدول الطلاب',
            brokenStudents.map(s => `معرف الطالب: ${s.id}`),
            'حفظ سجل غير مكتمل الاسم',
            'تحديث اسم الطالب أو حذف السجل الفارغ بعد التأكد',
            'تعديل أسماء الطلاب المتأثرين');
        }

        const orphanStudents = snap.students.filter(s => !s.circle_id || !validCircleIds.has(String(normCircleId(s.circle_id))));
        if (orphanStudents.length > 0) {
          addFinding('خطأ مؤكد', 'عالي', 'طلاب غير مرتبطين بحلقات نشطة', 'العلاقة بين students و circles',
            orphanStudents.map(s => `${s.name} (circle_id: ${s.circle_id || 'فارغ'})`),
            'حذف الحلقة السابقة دون نقل الطلاب أو إدخال معرف حلقة غير موجود',
            'نقل الطلاب المتأثرين إلى حلقات فعالة باستخدام أداة نقل الطالب',
            'تحديد الحلقة المناسبة لكل طالب غير مرتبط');
        }

        const circlesNoTeacher = snap.circles.filter(c => !c.teacher_id && !c.resolved_teacher_name);
        if (circlesNoTeacher.length > 0) {
          addFinding('بيانات تحتاج مراجعة بشرية', 'متوسط', 'حلقات بدون معلم مسؤول', 'جدول الحلقات (/circles)',
            circlesNoTeacher.map(c => `${c.name} (معرّف: ${c.id})`),
            'إنشاء الحلقة دون تعيين معلم أو حذف حساب المعلم السابق',
            'إسناد معلم مسؤول لكل حلقة عبر تعديل الحلقة',
            'تعيين معلم لكل حلقة ظاهرة');
        }

        const countMismatches = snap.circles.filter(c => c.stored_student_count !== c.live_student_count);
        if (countMismatches.length > 0) {
          addFinding('احتمال وجود مشكلة', 'متوسط', 'اختلاف عدد الطلاب المخزن عن العدد الفعلي داخل الحلقات', 'حقل student_count مقابل /students',
            countMismatches.map(c => `${c.name}: مخزن (${c.stored_student_count}) مقابل فعلي (${c.live_student_count})`),
            'تأخر تحديث العداد المخزن بعد نقل أو حذف طالب',
            'الاعتماد على العدد الحي من /students وتحديث student_count في الحلقات',
            'إعادة مزامنة أعداد الطلاب في الحلقات المتأثرة');
        }

        const orphanRecords = snap.records.filter(r => !activeStudentIds.has(String(normStudentId(r.student_id))));
        if (orphanRecords.length > 0) {
          addFinding('احتمال وجود مشكلة', 'منخفض', 'سجلات درجات تعود لطلاب غير موجودين في القائمة النشطة', 'جدول student_records',
            orphanRecords.slice(0, 10).map(r => `${r.student_name || r.student_id} (${r.month || ''})`),
            'بقاء سجلات تاريخية بعد حذف الطالب أو اختلاف صيغة المعرف',
            'مراجعة السجلات وتنظيف المتبقي من الطلاب المحذوفين',
            'فحص السجلات غير المرتبطة والتأكد من صحتها');
        }

        const invalidRuleRecords = snap.records.filter(r =>
          Number(r.absent_days) < 0 || Number(r.absent_days) > 31 ||
          (r.memo_pages !== undefined && Number(r.memo_pages) < 0) ||
          (r.sard_pages !== undefined && Number(r.sard_pages) < 0) ||
          (!isNaN(parseFloat(r.memo_grade)) && (parseFloat(r.memo_grade) < 0 || parseFloat(r.memo_grade) > 40)) ||
          (!isNaN(parseFloat(r.rev_grade)) && (parseFloat(r.rev_grade) < 0 || parseFloat(r.rev_grade) > 30))
        );
        if (invalidRuleRecords.length > 0) {
          addFinding('خطأ مؤكد', 'عالي', 'قيم خارج النطاق في الغياب أو الدرجات أو الأوجه', 'جدول student_records',
            invalidRuleRecords.map(r => `${r.student_name || r.student_id}: غياب=${r.absent_days}, حفظ=${r.memo_grade}`),
            'إدخال غير منضبط يتجاوز الحدود المعتمدة (الحفظ 40، المراجعة 30، الغياب 31)',
            'تصحيح القيم المخالفة للقواعد بعد المراجعة',
            'تعديل السجلات المخالفة للقيم السليمة');
        }

        const emptyCircles = snap.circles.filter(c => c.live_student_count === 0);
        if (emptyCircles.length > 0) {
          addFinding('ملاحظة تحسين', 'منخفض', 'حلقات فارغة لا تضم أي طلاب', 'صفحة الحلقات',
            emptyCircles.map(c => c.name),
            'حلقة جديدة أو نُقل جميع طلابها',
            'إضافة طلاب للحلقة أو أرشفتها إذا لم تعد مستخدمة',
            'توزيع الطلاب أو أرشفة الحلقات غير النشطة');
        }

        const missingDescCircles = snap.circles.filter(c => !String(c.description || '').trim());
        if (missingDescCircles.length > 0) {
          addFinding('ملاحظة تحسين', 'منخفض', 'حلقات بدون وصف', 'جدول الحلقات (description)',
            missingDescCircles.map(c => c.name),
            'عدم إدخال حقل الوصف عند إنشاء الحلقة',
            'إضافة وصف واضح مثل المستوى أو الفترة لتسهيل التصنيف',
            'تحديث وصف الحلقات');
        }

        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingSyncQueue === 'function') {
          try {
            const pendingQ = await window.AlbayanLocalDB.getPendingSyncQueue();
            if (Array.isArray(pendingQ) && pendingQ.length > 0) {
              addFinding('احتمال وجود مشكلة', 'متوسط', 'عمليات محلية معلّقة في طابور المزامنة', 'IndexedDB sync_queue',
                pendingQ.map(q => `${q.action} (${q.entity}:${q.entity_id})`),
                'انقطاع الاتصال أثناء الحفظ أو تعذر الوصول لخادم Firebase',
                'إعادة المزامنة عند توفر الإنترنت',
                'التحقق من الاتصال بالسحابة واستكمال المزامنة');
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

    // 26. get_audit_history
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
        if (args.undo_audit_id) return await AlbayanAIAudit.undoAuditAction(args.undo_audit_id);
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

    function validateArgsSchema(def, args) {
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        return { valid: false, message: 'معاملات الأداة يجب أن تكون كائناً صحيحاً.' };
      }
      const req = (def.parameters && Array.isArray(def.parameters.required)) ? def.parameters.required : [];
      for (const field of req) {
        if (args[field] === undefined || args[field] === null || String(args[field]).trim() === '') {
          return { valid: false, message: `الحقل المطلوب "${field}" مفقود لتنفيذ الأداة "${def.label}".` };
        }
      }
      return { valid: true };
    }

    function listDeclarations() {
      const list = [];
      tools.forEach(def => {
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

      const schemaCheck = validateArgsSchema(def, args);
      if (!schemaCheck.valid) {
        return { ok: false, error: schemaCheck.message };
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
        return await withAbortAndTimeout(def.execute(args || {}, context), 20000, context.signal);
      } catch (err) {
        if (err && err.message === 'ABORTED') throw err;
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
  // LAYER 5: PROVIDER ADAPTERS, STREAMING, ERROR CLASSIFICATION & INTENT ROUTING
  // ==========================================================================
  const AlbayanAIProviders = (function () {
    const CONFIG_SETTING_KEY = 'ai_provider_config_v1';
    const USAGE_SETTING_KEY = 'ai_token_usage_v1';
    const CONN_STATE_STORAGE_KEY = 'albayan_ai_conn_state_v1';

    function makeConfigFingerprint(cfg) {
      return `${cfg.provider || 'builtin'}|${cfg.model || ''}|${(cfg.customEndpoint || '').trim()}`;
    }

    function getConnectionState(cfg = null) {
      try {
        const raw = localStorage.getItem(CONN_STATE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed) return { state: 'untested', detail: '' };
        if (cfg && parsed.fingerprint !== makeConfigFingerprint(cfg)) {
          return { state: 'untested', detail: '' };
        }
        return parsed;
      } catch (e) {
        return { state: 'untested', detail: '' };
      }
    }

    function setConnectionState(cfg, state, detail = '', latencyMs = null) {
      try {
        const payload = {
          fingerprint: makeConfigFingerprint(cfg),
          provider: cfg.provider,
          model: cfg.model,
          state, // 'untested' | 'connected' | 'auth_error' | 'model_error' | 'network_error' | 'rate_limit'
          detail,
          latencyMs,
          checkedAt: new Date().toISOString()
        };
        localStorage.setItem(CONN_STATE_STORAGE_KEY, JSON.stringify(payload));
        return payload;
      } catch (e) {
        return { state, detail };
      }
    }

    function clearConnectionState() {
      try { localStorage.removeItem(CONN_STATE_STORAGE_KEY); } catch (e) {}
    }

    async function loadConfig() {
      let cfg = { ...DEFAULT_CONFIG };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        try {
          const saved = await window.AlbayanLocalDB.getSetting(CONFIG_SETTING_KEY, null);
          if (saved && typeof saved === 'object') {
            cfg = { ...DEFAULT_CONFIG, ...saved };
            if (cfg.model === 'albayan-agent-v1') cfg.model = 'albayan-local-v1';
          }
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
      if (next.provider === 'custom' && (!next.customEndpoint || !/^https?:\/\//i.test(next.customEndpoint.trim()))) {
        throw new Error('يجب إدخال رابط نقطة نهاية صالح (http/https) للمزود المخصص.');
      }
      if (makeConfigFingerprint(current) !== makeConfigFingerprint(next)) {
        clearConnectionState();
      }
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(CONFIG_SETTING_KEY, next);
      }
      return next;
    }

    async function loadUsageStats() {
      const empty = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, hasKnownCost: false, requestsCount: 0 };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSetting === 'function') {
        try {
          const u = await window.AlbayanLocalDB.getSetting(USAGE_SETTING_KEY, null);
          if (u && typeof u === 'object') return { ...empty, ...u };
        } catch (e) {}
      }
      return empty;
    }

    async function addUsageStats(modelId, promptTokens = 0, completionTokens = 0) {
      const p = Number(promptTokens || 0);
      const c = Number(completionTokens || 0);
      if (p === 0 && c === 0) return await loadUsageStats();
      const cur = await loadUsageStats();
      const rates = COST_PER_1M[modelId] || null;
      const costDelta = rates ? ((p / 1e6) * rates.in + (c / 1e6) * rates.out) : 0;
      const next = {
        promptTokens: cur.promptTokens + p,
        completionTokens: cur.completionTokens + c,
        totalTokens: cur.totalTokens + p + c,
        estimatedCostUsd: Number((cur.estimatedCostUsd + costDelta).toFixed(6)),
        hasKnownCost: cur.hasKnownCost || !!rates,
        requestsCount: cur.requestsCount + 1
      };
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSetting === 'function') {
        await window.AlbayanLocalDB.saveSetting(USAGE_SETTING_KEY, next);
      }
      return next;
    }

    function classifyProviderHttpError(status, rawBody, model = '') {
      let apiMsg = '';
      try {
        const parsed = JSON.parse(rawBody || '{}');
        apiMsg = (parsed.error && (parsed.error.message || parsed.error.status)) || parsed.message || '';
      } catch (e) {
        apiMsg = String(rawBody || '').slice(0, 200);
      }
      const lower = (apiMsg + ' ' + String(rawBody || '')).toLowerCase();

      if (status === 401 || status === 403 || lower.includes('api_key_invalid') || lower.includes('invalid api key') || lower.includes('incorrect api key') || lower.includes('authentication_error') || lower.includes('permission_denied')) {
        return new ProviderRequestError('auth', `خطأ مصادقة (${status || 401}): مفتاح API غير صالح أو مرفوض أو يفتقر للصلاحية. ${apiMsg ? '(' + apiMsg + ')' : ''}`, status);
      }
      if (status === 404 || lower.includes('model_not_found') || lower.includes('is not found for api version') || (lower.includes('model') && lower.includes('does not exist'))) {
        return new ProviderRequestError('model', `خطأ في النموذج (${status || 404}): معرّف النموذج "${model}" غير موجود أو غير مدعوم لدى المزود.`, status);
      }
      if (status === 429 || lower.includes('rate_limit') || lower.includes('quota') || lower.includes('insufficient_quota')) {
        return new ProviderRequestError('rate_limit', `تجاوز حد الطلبات أو الرصيد (429): ${apiMsg || 'يرجى التحقق من الحصة المتاحة لدى المزود.'}`, status);
      }
      if (status >= 500) {
        return new ProviderRequestError('server', `خطأ مؤقت من خادم المزود (HTTP ${status}): ${apiMsg || 'يرجى المحاولة لاحقاً.'}`, status);
      }
      return new ProviderRequestError('bad_request', `رفض المزود الطلب (HTTP ${status}): ${apiMsg || 'تحقق من الإعدادات والمعاملات.'}`, status);
    }

    async function performHttp(provider, url, payloadObj, options = {}) {
      const { extraHeaders = {}, overrideKey = '', signal = null, timeoutMs = 45000, model = '', method = 'POST' } = options;
      const reqMethod = String(method || 'POST').toUpperCase();
      if (signal && signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new ProviderRequestError('offline', 'الجهاز غير متصل بالإنترنت حالياً.');
      }

      const plugin = getNativePlugin();
      const bodyStr = (reqMethod !== 'GET' && payloadObj) ? JSON.stringify(payloadObj) : '';

      if (plugin && typeof plugin.proxyAiHttp === 'function') {
        const requestId = genId('aihttp');
        const onAbort = () => {
          if (typeof plugin.cancelAiHttp === 'function') {
            plugin.cancelAiHttp({ requestId }).catch(() => {});
          }
        };
        if (signal) signal.addEventListener('abort', onAbort, { once: true });
        try {
          const res = await withAbortAndTimeout(
            plugin.proxyAiHttp({
              provider,
              url,
              method: reqMethod,
              body: bodyStr,
              headers: extraHeaders,
              overrideApiKey: overrideKey || '',
              timeoutMs,
              requestId
            }),
            timeoutMs + 2000,
            signal
          );
          if (res.aborted || res.error === 'ABORTED') {
            throw new ProviderRequestError('aborted', 'ABORTED');
          }
          if (!res.ok) {
            if (!res.status || res.status === 0) {
              const errTxt = String(res.error || '');
              const isTimeout = /timeout|timed out/i.test(errTxt);
              throw new ProviderRequestError(
                isTimeout ? 'timeout' : 'network',
                isTimeout ? 'انتهت مهلة الاتصال بخادم المزود.' : `تعذر الوصول إلى المزود (${errTxt || 'خطأ شبكة'}).`
              );
            }
            throw classifyProviderHttpError(res.status, res.data || '', model);
          }
          try {
            return JSON.parse(res.data || '{}');
          } catch (e) {
            throw new ProviderRequestError('server', 'استجابة غير صالحة (ليست JSON) من المزود.');
          }
        } catch (err) {
          if (err instanceof ProviderRequestError) throw err;
          if (err && err.message === 'ABORTED') throw new ProviderRequestError('aborted', 'ABORTED');
          if (err && String(err.message).startsWith('TIMEOUT:')) {
            throw new ProviderRequestError('timeout', err.message.replace(/^TIMEOUT:\s*/, ''));
          }
          throw new ProviderRequestError('network', (err && err.message) || 'تعذر الاتصال بالمزود.');
        } finally {
          if (signal) signal.removeEventListener('abort', onAbort);
        }
      }

      // Browser / WebView fetch path with explicit timeout + AbortController
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

      const fetchCtrl = new AbortController();
      const forwardAbort = () => fetchCtrl.abort('USER_STOPPED');
      if (signal) signal.addEventListener('abort', forwardAbort, { once: true });
      const timer = setTimeout(() => fetchCtrl.abort('TIMEOUT'), timeoutMs);

      try {
        const fetchOpts = {
          method: reqMethod,
          headers,
          signal: fetchCtrl.signal
        };
        if (reqMethod !== 'GET' && bodyStr) {
          fetchOpts.body = bodyStr;
        }
        const fetchRes = await fetch(url, fetchOpts);
        const text = await fetchRes.text();
        if (!fetchRes.ok) {
          throw classifyProviderHttpError(fetchRes.status, text, model);
        }
        try {
          return JSON.parse(text || '{}');
        } catch (e) {
          throw new ProviderRequestError('server', 'استجابة غير صالحة (ليست JSON) من المزود.');
        }
      } catch (err) {
        if (err instanceof ProviderRequestError) throw err;
        if (signal && signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
        if (fetchCtrl.signal.aborted && fetchCtrl.signal.reason === 'TIMEOUT') {
          throw new ProviderRequestError('timeout', `انتهت مهلة الاتصال بالمزود (${Math.round(timeoutMs / 1000)} ثانية).`);
        }
        if (err && err.name === 'AbortError') throw new ProviderRequestError('aborted', 'ABORTED');
        throw new ProviderRequestError('network', `تعذر الاتصال بخادم المزود: ${(err && err.message) || 'تحقق من الشبكة أو رابط المزود.'}`);
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', forwardAbort);
      }
    }

    async function performStreamingFetch(provider, url, payloadObj, options = {}) {
      const { extraHeaders = {}, overrideKey = '', signal = null, timeoutMs = 45000, model = '', onSseEvent } = options;
      const plugin = getNativePlugin();
      if (plugin && typeof plugin.proxyAiHttp === 'function') {
        return null; // Native proxy uses non-streaming chunk-completed response with cancellation
      }

      if (signal && signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new ProviderRequestError('offline', 'الجهاز غير متصل بالإنترنت حالياً.');
      }

      const apiKey = overrideKey || await AlbayanAISecurity.getWebFallbackSecret(provider);
      const headers = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', ...extraHeaders };
      if (apiKey) {
        if (provider === 'gemini') headers['x-goog-api-key'] = apiKey;
        else if (provider === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const fetchCtrl = new AbortController();
      const forwardAbort = () => fetchCtrl.abort('USER_STOPPED');
      if (signal) signal.addEventListener('abort', forwardAbort, { once: true });
      let timer = setTimeout(() => fetchCtrl.abort('TIMEOUT'), timeoutMs);
      const resetTimeout = () => {
        clearTimeout(timer);
        timer = setTimeout(() => fetchCtrl.abort('TIMEOUT'), timeoutMs);
      };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payloadObj),
          signal: fetchCtrl.signal
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw classifyProviderHttpError(res.status, errText, model);
        }
        if (!res.body || typeof res.body.getReader !== 'function') {
          const fallbackJson = await res.json();
          return { fallbackJson };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentEvent = '';
        let dataLines = [];

        const flushEvent = () => {
          if (dataLines.length === 0) {
            currentEvent = '';
            return;
          }
          const rawData = dataLines.join('\n').trim();
          dataLines = [];
          const evtName = currentEvent;
          currentEvent = '';
          if (!rawData || rawData === '[DONE]') return;
          try {
            const parsed = JSON.parse(rawData);
            if (onSseEvent) onSseEvent(evtName, parsed);
          } catch (e) {}
        };

        while (true) {
          const { value, done } = await reader.read();
          resetTimeout();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line === '') {
              flushEvent();
            } else if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
        }
        if (buffer.trim()) {
          if (buffer.startsWith('data:')) dataLines.push(buffer.slice(5).trimStart());
        }
        flushEvent();
        return { streamed: true };
      } catch (err) {
        if (err instanceof ProviderRequestError) throw err;
        if (signal && signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
        if (fetchCtrl.signal.aborted && fetchCtrl.signal.reason === 'TIMEOUT') {
          throw new ProviderRequestError('timeout', `انتهت مهلة البث مع المزود (${Math.round(timeoutMs / 1000)} ثانية).`);
        }
        if (err && err.name === 'AbortError') throw new ProviderRequestError('aborted', 'ABORTED');
        throw new ProviderRequestError('network', `تعذر الاتصال بخادم المزود: ${(err && err.message) || 'خطأ شبكة.'}`);
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', forwardAbort);
      }
    }

    function resolveOpenAICompatEndpoint(cfg) {
      const p = (cfg && cfg.provider) || 'openai';
      if (p === 'custom') return (cfg.customEndpoint || '').trim();
      if (cfg && cfg.customEndpoint && cfg.customEndpoint.trim()) return cfg.customEndpoint.trim();
      const cat = PROVIDER_CATALOG[p];
      return (cat && cat.defaultEndpoint) || 'https://api.openai.com/v1/chat/completions';
    }

    function buildSystemPrompt(user) {
      return [
        'أنت "مساعد البيان الذكي" داخل منظومة مدرسة البيان لتعليم القرآن الكريم.',
        `المستخدم الحالي: ${user ? user.username : 'كادر'} (الدور: ${user ? user.role : 'staff'}).`,
        'المهام: الإجابة باللغة العربية الفصيحة الواضحة، وتنفيذ الاستعلامات والعمليات الإدارية عبر الأدوات الحقيقية فقط.',
        '',
        'قواعد التوجيه الذكي للطلبات (إلزامية):',
        '1. المحادثة العادية (التحيات مثل "مرحباً"، الشكر، الأسئلة العامة حول قدراتك): أجب بلطف واختصار مباشرةً دون استدعاء أي أداة قاعدة بيانات.',
        '2. استرجاع البيانات المحدد: عند السؤال عن عدد الحلقات أو الطلاب أو المعلمين أو سجل طالب، استدعِ فقط الأداة المحددة المطلوبة (مثل get_all_halaqat أو get_statistics أو get_student_history) ولا تقم بفحص شامل للمدرسة دون طلب.',
        '3. إضافة طالب وتسجيل أي خانة في السجل: يمكنك إضافة طالب مع تعبئة سجله دفعة واحدة عبر create_student (بتمرير fields)، أو تعديل/إنشاء أي خانة في السجل عبر update_student_record / create_student_record.',
        '   خانات السجل (السجل الشهري الافتراضي: صفر 1448 ما لم يُحدد شهر/سنة أو تاريخ يومي):',
        '   - الحفظ: from_surah، from_ayah، to_surah، to_ayah، memo_pages (تُحسب تلقائياً عند تحديد نطاق السور والآيات)، memo_grade (0-40).',
        '   - المراجعة والسرد: rev_from_surah، rev_from_ayah، rev_to_surah، rev_to_ayah، sard_pages، rev_grade (0-30).',
        '   - الحضور والنشاط والمناهج المصاحبة: absent_days (0-31)، activity_mark (0-20)، fiqh (0-20)، tafsir (0-20)، adhkar (0-20)، seerah (0-20).',
        '   - الاختبارات: exam_title، exam_grade.',
        '4. التحقق قبل التنفيذ: إذا نقصت بيانات إلزامية (مثل الحلقة عند إضافة طالب) أو تشابهت الأسماء، اسأل المستخدم ولا تخمّن.',
        '5. التحليل الشامل وفحص الأخطاء: استدعِ analyze_statistics أو detect_data_anomalies أو generate_report فقط عندما يطلب المستخدم فحص المدرسة أو اكتشاف الأخطاء أو مقارنة الإحصائيات أو تقريراً شاملاً.',
        '6. الصدق والدقة: لا تخترع أرقاماً أو أسماء طلاب أو نتائج لم ترد في مخرجات الأدوات. العمليات الحساسة (الحذف أو تغيير الأدوار) تتطلب confirm_token من المستخدم.'
      ].join('\n');
    }

    function extractGeminiText(parts) {
      return (parts || [])
        .filter(p => p && !p.thought && typeof p.text === 'string')
        .map(p => p.text)
        .join('')
        .trim();
    }

    // ------------------------------------------------------------------------
    // Adapter 1: Google Gemini API (Streaming on web + Native proxy on Android)
    // ------------------------------------------------------------------------
    async function runGeminiTurn(cfg, historyMessages, userPrompt, context) {
      const model = cfg.model || 'gemini-2.5-flash';
      const customBase = (cfg.customEndpoint && cfg.customEndpoint.trim()) ? cfg.customEndpoint.replace(/\/$/, '') : '';
      const generateUrl = customBase || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const streamUrl = customBase
        ? customBase.replace(/:generateContent$/, ':streamGenerateContent?alt=sse')
        : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

      const contents = [];
      (historyMessages || []).forEach(m => {
        if (!m || !m.content) return;
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content) }]
        });
      });
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });

      const functionDeclarations = AlbayanAIToolRegistry.listDeclarations().map(d => {
        const hasProps = d.parameters && d.parameters.properties && Object.keys(d.parameters.properties).length > 0;
        return hasProps
          ? { name: d.name, description: d.description, parameters: d.parameters }
          : { name: d.name, description: d.description };
      });

      const executedTools = [];
      const operationCards = [];
      const confirmations = [];
      const seenCalls = new Set();
      let totalIn = 0;
      let totalOut = 0;
      const MAX_STEPS = 6;

      for (let step = 0; step < MAX_STEPS; step++) {
        if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
        if (context.onProgress) context.onProgress(step === 0 ? `جاري الاتصال بنموذج ${model}...` : 'جاري صياغة الإجابة من نتائج الأدوات...');

        const generationConfig = {
          temperature: Number(cfg.temperature ?? 0.2),
          maxOutputTokens: Number(cfg.maxTokens || 2048)
        };
        if (model.includes('2.5') && Number(cfg.thinkingBudget) > 0) {
          generationConfig.thinkingConfig = { thinkingBudget: Number(cfg.thinkingBudget) };
        }

        const allowTools = step < MAX_STEPS - 1;
        const bodyPayload = {
          systemInstruction: { parts: [{ text: buildSystemPrompt(context.user) }] },
          contents,
          ...(allowTools ? { tools: [{ functionDeclarations }] } : {}),
          generationConfig
        };

        let parts = [];
        let streamedText = '';
        const plugin = getNativePlugin();
        const useStream = !(plugin && typeof plugin.proxyAiHttp === 'function') && (streamUrl.includes(':streamGenerateContent') || streamUrl.includes('alt=sse'));

        if (useStream) {
          const collectedParts = [];
          const stResult = await performStreamingFetch('gemini', streamUrl, bodyPayload, {
            signal: context.signal,
            model,
            onSseEvent: (_evt, chunk) => {
              if (chunk.usageMetadata) {
                totalIn = Math.max(totalIn, Number(chunk.usageMetadata.promptTokenCount || 0));
                totalOut = Math.max(totalOut, Number(chunk.usageMetadata.candidatesTokenCount || 0));
              }
              const cand = chunk.candidates && chunk.candidates[0];
              const chunkParts = (cand && cand.content && cand.content.parts) || [];
              chunkParts.forEach(p => {
                collectedParts.push(p);
                if (!p.thought && typeof p.text === 'string' && p.text) {
                  streamedText += p.text;
                  if (context.onStreamDelta) context.onStreamDelta(streamedText);
                }
              });
            }
          });
          if (stResult && stResult.fallbackJson) {
            const resp = stResult.fallbackJson;
            if (resp.usageMetadata) {
              totalIn += Number(resp.usageMetadata.promptTokenCount || 0);
              totalOut += Number(resp.usageMetadata.candidatesTokenCount || 0);
            }
            const cand = resp.candidates && resp.candidates[0];
            parts = (cand && cand.content && cand.content.parts) || [];
          } else {
            parts = collectedParts;
          }
        } else {
          const resp = await performHttp('gemini', generateUrl, bodyPayload, { signal: context.signal, model });
          if (resp.usageMetadata) {
            totalIn += Number(resp.usageMetadata.promptTokenCount || 0);
            totalOut += Number(resp.usageMetadata.candidatesTokenCount || 0);
          }
          const candidate = resp.candidates && resp.candidates[0];
          parts = (candidate && candidate.content && candidate.content.parts) || [];
        }

        setConnectionState(cfg, 'connected', 'متصل ويعمل');
        const fnCalls = parts.filter(p => p && p.functionCall);

        if (fnCalls.length === 0) {
          const text = streamedText.trim() || extractGeminiText(parts) || 'لم يُرجع النموذج نصاً.';
          await addUsageStats(model, totalIn, totalOut);
          return {
            text,
            executedTools,
            tables: [],
            operationCards,
            confirmations,
            usage: (totalIn + totalOut) > 0 ? { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'gemini', model } : null
          };
        }

        contents.push({ role: 'model', parts });
        const fnResponseParts = [];
        for (const callPart of fnCalls) {
          if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
          const fc = callPart.functionCall;
          const toolDef = AlbayanAIToolRegistry.get(fc.name);
          const toolLabel = (toolDef && toolDef.label) || fc.name;
          const callSig = `${fc.name}:${stableStringify(fc.args || {})}`;

          let toolOut;
          if (seenCalls.has(callSig)) {
            toolOut = { ok: false, duplicate_blocked: true, message: 'تم استدعاء هذه الأداة بنفس المعاملات مسبقاً في هذه الدورة. استخدم النتيجة السابقة للإجابة.' };
          } else {
            seenCalls.add(callSig);
            if (context.onProgress) context.onProgress(`تنفيذ: ${toolLabel}...`);
            toolOut = await AlbayanAIToolRegistry.execute(fc.name, fc.args || {}, context);
            executedTools.push({
              name: fc.name,
              label: toolLabel,
              ok: !!toolOut.ok,
              status: toolOut.status === 'CONFIRMATION_REQUIRED' ? 'pending' : (toolOut.ok ? 'ok' : 'fail'),
              error: toolOut.ok ? '' : (toolOut.error || toolOut.message || '')
            });
            if (toolOut.operationCard) operationCards.push(toolOut.operationCard);
            if (toolOut.confirmation) confirmations.push(toolOut.confirmation);
          }

          fnResponseParts.push({
            functionResponse: { name: fc.name, response: toolOut }
          });
        }
        contents.push({ role: 'user', parts: fnResponseParts });
      }

      await addUsageStats(model, totalIn, totalOut);
      return {
        text: 'اكتمل تنفيذ الأدوات المطلوبة.',
        executedTools,
        tables: [],
        operationCards,
        confirmations,
        usage: (totalIn + totalOut) > 0 ? { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'gemini', model } : null
      };
    }

    // ------------------------------------------------------------------------
    // Adapter 2 & 4: OpenAI / OpenAI-Compatible API
    // ------------------------------------------------------------------------
    async function runOpenAITurn(cfg, historyMessages, userPrompt, context) {
      const cat = PROVIDER_CATALOG[cfg.provider] || PROVIDER_CATALOG.openai;
      const model = cfg.model || cat.defaultModel || 'gpt-4o-mini';
      if (cfg.provider === 'custom' && (!cfg.customEndpoint || !cfg.customEndpoint.trim())) {
        throw new ProviderRequestError('config', 'يرجى تحديد عنوان API (Endpoint URL) للمزود المخصص في الإعدادات.');
      }
      const url = resolveOpenAICompatEndpoint(cfg);

      const isReasoning = /^o[134]/i.test(model);
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
      const operationCards = [];
      const confirmations = [];
      const seenCalls = new Set();
      let totalIn = 0;
      let totalOut = 0;
      const MAX_STEPS = 6;

      for (let step = 0; step < MAX_STEPS; step++) {
        if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
        if (context.onProgress) context.onProgress(step === 0 ? `جاري المعالجة عبر ${model}...` : 'جاري صياغة الإجابة النهائية...');

        const allowTools = step < MAX_STEPS - 1;
        const payload = {
          model,
          messages,
          ...(allowTools ? { tools: toolsSpec } : {}),
          ...(isReasoning ? { max_completion_tokens: Number(cfg.maxTokens || 2048) } : { temperature: Number(cfg.temperature ?? 0.2), max_tokens: Number(cfg.maxTokens || 2048) })
        };

        const plugin = getNativePlugin();
        const useStream = !(plugin && typeof plugin.proxyAiHttp === 'function');
        let assistantMsg = null;

        if (useStream) {
          let streamedContent = '';
          const tcAccum = new Map();
          const stResult = await performStreamingFetch(cfg.provider, url, { ...payload, stream: true, stream_options: { include_usage: true } }, {
            signal: context.signal,
            model,
            onSseEvent: (_evt, chunk) => {
              if (chunk.usage) {
                totalIn += Number(chunk.usage.prompt_tokens || 0);
                totalOut += Number(chunk.usage.completion_tokens || 0);
              }
              const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
              if (!delta) return;
              if (typeof delta.content === 'string' && delta.content) {
                streamedContent += delta.content;
                if (context.onStreamDelta) context.onStreamDelta(streamedContent);
              }
              if (Array.isArray(delta.tool_calls)) {
                delta.tool_calls.forEach(tc => {
                  const idx = tc.index !== undefined ? tc.index : 0;
                  if (!tcAccum.has(idx)) {
                    tcAccum.set(idx, { id: tc.id || `call_${idx}`, type: 'function', function: { name: '', arguments: '' } });
                  }
                  const entry = tcAccum.get(idx);
                  if (tc.id) entry.id = tc.id;
                  if (tc.function && tc.function.name) entry.function.name += tc.function.name;
                  if (tc.function && tc.function.arguments) entry.function.arguments += tc.function.arguments;
                });
              }
            }
          });
          if (stResult && stResult.fallbackJson) {
            const resp = stResult.fallbackJson;
            if (resp.usage) {
              totalIn += Number(resp.usage.prompt_tokens || 0);
              totalOut += Number(resp.usage.completion_tokens || 0);
            }
            assistantMsg = resp.choices && resp.choices[0] && resp.choices[0].message;
          } else {
            assistantMsg = {
              role: 'assistant',
              content: streamedContent || null,
              tool_calls: tcAccum.size > 0 ? Array.from(tcAccum.values()) : undefined
            };
          }
        } else {
          const resp = await performHttp(cfg.provider, url, payload, { signal: context.signal, model });
          if (resp.usage) {
            totalIn += Number(resp.usage.prompt_tokens || 0);
            totalOut += Number(resp.usage.completion_tokens || 0);
          }
          assistantMsg = resp.choices && resp.choices[0] && resp.choices[0].message;
        }

        setConnectionState(cfg, 'connected', 'متصل ويعمل');
        if (!assistantMsg) break;
        const toolCalls = assistantMsg.tool_calls || [];

        if (toolCalls.length === 0) {
          await addUsageStats(model, totalIn, totalOut);
          return {
            text: (assistantMsg.content || '').trim() || 'لم يُرجع النموذج نصاً.',
            executedTools,
            tables: [],
            operationCards,
            confirmations,
            usage: (totalIn + totalOut) > 0 ? { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: cfg.provider, model } : null
          };
        }

        messages.push(assistantMsg);
        for (const tc of toolCalls) {
          if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
          const fnName = tc.function && tc.function.name;
          const toolDef = AlbayanAIToolRegistry.get(fnName);
          const toolLabel = (toolDef && toolDef.label) || fnName;

          let parsedArgs = {};
          let parseFailed = false;
          try {
            parsedArgs = JSON.parse((tc.function && tc.function.arguments) || '{}');
          } catch (e) {
            parseFailed = true;
          }

          let toolOut;
          if (parseFailed) {
            toolOut = { ok: false, error: 'تعذر تحليل معاملات الأداة (JSON غير صالح).' };
            executedTools.push({ name: fnName, label: toolLabel, ok: false, status: 'fail', error: toolOut.error });
          } else {
            const callSig = `${fnName}:${stableStringify(parsedArgs)}`;
            if (seenCalls.has(callSig)) {
              toolOut = { ok: false, duplicate_blocked: true, message: 'تم استدعاء هذه الأداة بنفس المعاملات مسبقاً. استخدم النتيجة السابقة للإجابة.' };
            } else {
              seenCalls.add(callSig);
              if (context.onProgress) context.onProgress(`تنفيذ: ${toolLabel}...`);
              toolOut = await AlbayanAIToolRegistry.execute(fnName, parsedArgs, context);
              executedTools.push({
                name: fnName,
                label: toolLabel,
                ok: !!toolOut.ok,
                status: toolOut.status === 'CONFIRMATION_REQUIRED' ? 'pending' : (toolOut.ok ? 'ok' : 'fail'),
                error: toolOut.ok ? '' : (toolOut.error || toolOut.message || '')
              });
              if (toolOut.operationCard) operationCards.push(toolOut.operationCard);
              if (toolOut.confirmation) confirmations.push(toolOut.confirmation);
            }
          }
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolOut) });
        }
      }

      await addUsageStats(model, totalIn, totalOut);
      return {
        text: 'تم تنفيذ العمليات المطلوبة.',
        executedTools,
        tables: [],
        operationCards,
        confirmations,
        usage: (totalIn + totalOut) > 0 ? { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: cfg.provider, model } : null
      };
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
      const operationCards = [];
      const confirmations = [];
      const seenCalls = new Set();
      let totalIn = 0;
      let totalOut = 0;
      const MAX_STEPS = 6;

      for (let step = 0; step < MAX_STEPS; step++) {
        if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
        if (context.onProgress) context.onProgress(step === 0 ? `جاري المعالجة عبر ${model}...` : 'جاري صياغة الإجابة النهائية...');

        const allowTools = step < MAX_STEPS - 1;
        const resp = await performHttp('anthropic', url, {
          model,
          system: buildSystemPrompt(context.user),
          messages,
          ...(allowTools ? { tools: toolsSpec } : {}),
          temperature: Math.min(1, Number(cfg.temperature ?? 0.2)),
          max_tokens: Number(cfg.maxTokens || 2048)
        }, { signal: context.signal, model });

        setConnectionState(cfg, 'connected', 'متصل ويعمل');
        if (resp.usage) {
          totalIn += Number(resp.usage.input_tokens || 0);
          totalOut += Number(resp.usage.output_tokens || 0);
        }

        const blocks = Array.isArray(resp.content) ? resp.content : [];
        const toolUses = blocks.filter(b => b.type === 'tool_use');
        if (toolUses.length === 0) {
          const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || 'لم يُرجع النموذج نصاً.';
          await addUsageStats(model, totalIn, totalOut);
          return {
            text,
            executedTools,
            tables: [],
            operationCards,
            confirmations,
            usage: (totalIn + totalOut) > 0 ? { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'anthropic', model } : null
          };
        }

        messages.push({ role: 'assistant', content: blocks });
        const resultBlocks = [];
        for (const tu of toolUses) {
          if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
          const toolDef = AlbayanAIToolRegistry.get(tu.name);
          const toolLabel = (toolDef && toolDef.label) || tu.name;
          const callSig = `${tu.name}:${stableStringify(tu.input || {})}`;

          let toolOut;
          if (seenCalls.has(callSig)) {
            toolOut = { ok: false, duplicate_blocked: true, message: 'تم استدعاء هذه الأداة بنفس المعاملات مسبقاً. استخدم النتيجة السابقة للإجابة.' };
          } else {
            seenCalls.add(callSig);
            if (context.onProgress) context.onProgress(`تنفيذ: ${toolLabel}...`);
            toolOut = await AlbayanAIToolRegistry.execute(tu.name, tu.input || {}, context);
            executedTools.push({
              name: tu.name,
              label: toolLabel,
              ok: !!toolOut.ok,
              status: toolOut.status === 'CONFIRMATION_REQUIRED' ? 'pending' : (toolOut.ok ? 'ok' : 'fail'),
              error: toolOut.ok ? '' : (toolOut.error || toolOut.message || '')
            });
            if (toolOut.operationCard) operationCards.push(toolOut.operationCard);
            if (toolOut.confirmation) confirmations.push(toolOut.confirmation);
          }
          resultBlocks.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(toolOut) });
        }
        messages.push({ role: 'user', content: resultBlocks });
      }

      await addUsageStats(model, totalIn, totalOut);
      return {
        text: 'تم تنفيذ الأدوات بنجاح.',
        executedTools,
        tables: [],
        operationCards,
        confirmations,
        usage: (totalIn + totalOut) > 0 ? { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut, provider: 'anthropic', model } : null
      };
    }

    // ------------------------------------------------------------------------
    // Adapter 5: Local Rule-Based Administrative Engine (Intent-Routed, Zero False Scans)
    // ------------------------------------------------------------------------
    function hasAnyKw(qNorm, keywords) {
      return keywords.some(kw => qNorm.includes(normAr(kw)));
    }

    function isOrdinaryConversation(qNorm) {
      const pureConversational = [
        /^(مرحبا+|اهلا+|هلا+|السلام عليكم|وعليكم السلام|صباح الخير|مساء الخير|حي الله|حياك الله|كيف حالك|كيف الحال|اخبارك|اهلين|ي هلا|هاي|hello|hi|hey)(\s+(بك|بكم|يا\s+\S+|مساعد|البيان))?[!؟.،]*$/,
        /^(شكرا+|جزاك الله خيرا+|بارك الله فيك|مشكور|يعطيك العافيه|تسلم|ممتاز|تمام|حسنا|طيب|اوكي|نعم|لا)[!؟.،]*$/,
        /^(من انت|ما اسمك|عرفني بنفسك|ما هي قدراتك|ماذا تستطيع|وش تقدر تسوي|كيف تعمل|ما مهامك|مساعده|help)[؟!.]*$/,
        /^هل يمكنك\s+(مساعدتي|انشاء|اضافه|تعديل|حذف|عرض|تحليل)/
      ];
      if (pureConversational.some(re => re.test(qNorm))) return true;
      if (/^(كيف|هل يمكنني|هل استطيع|ما طريقه)\s+(انشاء|اضافه|تعديل|حذف)\s+(حلقه|طالب|سجل)/.test(qNorm)) return true;
      return false;
    }

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

    function parseCircleCreationCommand(raw) {
      const cleaned = raw.trim();
      // Ignore pure assistance phrasing like "ساعدني في إنشاء حلقة قرآنية جديدة"
      if (/^(ساعدني|اريد المساعده|كيف)\b/.test(normAr(cleaned)) && !cleaned.match(/باسم\s+/)) {
        return { name: '', teacherName: '', description: '' };
      }
      let cName = '';
      const byName = cleaned.match(/(?:باسم|اسمها)\s+["«]?([^"»،,\n]+?)["»]?(?=\s+(?:و|بمعلم|المعلم|الأستاذ|استاذ|بوصف|وصفها|وصف|بمستوى|مستواها)|[،,.]|$)/);
      if (byName) {
        cName = byName[1].trim();
      } else {
        const mH = cleaned.match(/حلقة\s+(?:جديدة\s+)?["«]?([^"»،,\n]+?)["»]?(?=\s+(?:و|بمعلم|المعلم|الأستاذ|استاذ|بوصف|وصفها|وصف|بمستوى|مستواها)|[،,.]|$)/);
        if (mH) cName = mH[1].trim();
      }
      // Reject filler/imperative words accidentally matched as circle name
      const badNames = ['جديده', 'قرانيه', 'قرانيه جديده', 'جديده واضف', 'واضف', 'جديد'];
      if (badNames.includes(normAr(cName)) || /^جديدة\s+و/.test(cName)) cName = '';

      const teacherMatch = cleaned.match(/(?:المعلم|الأستاذ|الاستاذ|استاذ)\s+([^\s،,.]+)/);
      const teacherName = teacherMatch ? teacherMatch[1].trim() : '';
      const descMatch = cleaned.match(/(?:وصفها|بوصف|وصف|بمستوى|مستواها)\s+([^\n،,.]+?)(?=\s+(?:والمعلم|معلم|بمعلم)|[،,.]|$)/);
      const description = descMatch ? descMatch[1].trim() : '';
      return { name: cName, teacherName, description };
    }

    async function runBuiltinAgentTurn(userPrompt, context) {
      if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
      const raw = String(userPrompt || '').trim();
      const q = normAr(raw);
      const executedTools = [];
      const tables = [];
      const operationCards = [];
      const confirmations = [];

      const invokeTool = async (name, args = {}) => {
        if (context.signal && context.signal.aborted) throw new ProviderRequestError('aborted', 'ABORTED');
        const def = AlbayanAIToolRegistry.get(name);
        const label = (def && def.label) || name;
        if (context.onProgress) context.onProgress(`تنفيذ: ${label}...`);
        const out = await AlbayanAIToolRegistry.execute(name, args, context);
        executedTools.push({
          name,
          label,
          ok: !!out.ok,
          status: out.status === 'CONFIRMATION_REQUIRED' ? 'pending' : (out.ok ? 'ok' : 'fail'),
          error: out.ok ? '' : (out.error || out.message || '')
        });
        if (out.operationCard) operationCards.push(out.operationCard);
        if (out.confirmation) confirmations.push(out.confirmation);
        return out;
      };

      // A. Ordinary Conversation -> Zero DB calls, Zero tools!
      if (isOrdinaryConversation(q)) {
        const userName = (context.user && context.user.username) ? ` يا **${context.user.username}**` : '';
        if (q.includes('شكر') || q.includes('جزاك') || q.includes('بارك') || q.includes('تسلم') || q.includes('يعطيك')) {
          return { text: `العفو${userName}، يسعدني خدمتك دائماً. أخبرني بأي استفسار أو مهمة إدارية تحتاجها.`, executedTools, tables, operationCards, confirmations };
        }
        if (/^(من انت|ما اسمك|عرفني|ما هي قدراتك|ماذا تستطيع|وش تقدر|كيف تعمل|ما مهامك|مساعده|help)/.test(q) || /^هل يمكنك/.test(q)) {
          return {
            text: [
              `أهلاً بك${userName}. أنا **مساعد البيان الإداري** (أعمل حالياً بالمحرك المحلي المرتبط مباشرة بقاعدة بيانات المدرسة).`,
              '',
              'يمكنني مساعدتك في المهام الحقيقية التالية:',
              '- **الاستعلامات:** عدد وتفاصيل الحلقات، الطلاب، المعلمين، الإحصائيات، والسجل التراكمي للطلاب.',
              '- **الإدارة:** إنشاء أو تعديل الحلقات، إضافة أو نقل الطلاب، تعديل درجات الحفظ/المراجعة/الغياب.',
              '- **التحليل والتدقيق:** مقارنة الإحصائيات، اكتشاف الأخطاء والتناقضات، وإعداد التقارير الإدارية.',
              '',
              '*ملاحظة: للحصول على محادثة ذكاء اصطناعي مفتوحة، يمكنك ربط مزود سحابي (Gemini أو OpenAI أو Claude) من أيقونة الإعدادات في الأعلى.*'
            ].join('\n'),
            executedTools, tables, operationCards, confirmations
          };
        }
        return {
          text: `مرحباً بك${userName}! كيف يمكنني مساعدتك اليوم في إدارة شؤون مدرسة البيان أو متابعة بيانات الحلقات والطلاب؟`,
          executedTools, tables, operationCards, confirmations
        };
      }

      // B. Destructive operations (Delete Halaqah / Delete Student)
      if ((q.includes('احذف') || q.includes('حذف')) && (q.includes('حلقه') || q.includes('حلق'))) {
        const targetName = extractQuotedOrAfter(raw, ['حذف حلقة', 'احذف حلقة', 'حلقة']);
        if (!targetName) {
          const listRes = await invokeTool('get_all_halaqat', { limit: 15 });
          return {
            text: 'يرجى تحديد اسم الحلقة المراد حذفها ليتم عرض تفاصيلها وطلب تأكيدك قبل الحذف.',
            executedTools,
            tables: listRes.ok ? [{ title: 'الحلقات المتاحة', headers: ['المعرّف', 'الحلقة', 'المعلم', 'عدد الطلاب'], rows: listRes.circles.map(c => [c.id, c.name, c.teacher_name, c.student_count_label]) }] : [],
            operationCards, confirmations
          };
        }
        const delRes = await invokeTool('delete_halaqah', { circle_name: targetName });
        return {
          text: delRes.status === 'CONFIRMATION_REQUIRED'
            ? 'هذه عملية حساسة تتطلب موافقتك الصريحة. راجع التفاصيل في البطاقة أدناه ثم اضغط **"تأكيد التنفيذ"**.'
            : (delRes.message || delRes.error || 'تعذر تنفيذ طلب الحذف.'),
          executedTools, tables, operationCards, confirmations
        };
      }

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

      // C. Create Halaqah
      if (hasAnyKw(q, ['أنشئ', 'انشئ', 'إنشاء', 'أضف', 'اضف', 'إضافة']) && hasAnyKw(q, ['حلقة', 'حلقه'])) {
        const parsed = parseCircleCreationCommand(raw);
        if (!parsed.name) {
          return {
            text: [
              'لإنشاء حلقة قرآنية جديدة، اكتب اسم الحلقة بوضوح في رسالتك، مثل:',
              '- *"أنشئ حلقة باسم حلقة النور والمعلم عمر ووصفها مبتدئ"*',
              '- أو *"أنشئ حلقة الفجر"*'
            ].join('\n'),
            executedTools, tables, operationCards, confirmations
          };
        }
        const createRes = await invokeTool('create_halaqah', {
          name: parsed.name,
          teacher_name: parsed.teacherName,
          description: parsed.description
        });
        return {
          text: createRes.ok
            ? `تم إنشاء الحلقة **"${createRes.circle.name}"** وحفظها بنجاح في قاعدة البيانات.`
            : (createRes.message || createRes.error || 'تعذر إنشاء الحلقة.'),
          executedTools, tables, operationCards, confirmations
        };
      }

      // D. Update Halaqah
      if (hasAnyKw(q, ['عدل', 'تعديل', 'غير']) && hasAnyKw(q, ['حلقة', 'حلقه']) && !hasAnyKw(q, ['طالب'])) {
        const mRename = raw.match(/حلقة\s+["«]?([^"»،,]+?)["»]?\s+(?:إلى|الى)\s+["«]?([^"»،,\n]+?)["»]?$/);
        if (mRename) {
          const updRes = await invokeTool('update_halaqah', { circle_name: mRename[1].trim(), new_name: mRename[2].trim() });
          return {
            text: updRes.ok ? `تم تحديث اسم الحلقة بنجاح.` : (updRes.message || updRes.error),
            executedTools, tables, operationCards, confirmations
          };
        }
        return {
          text: 'لتعديل حلقة قرآنية، اكتب الاسم الحالي والقيمة الجديدة، مثل: *"عدّل حلقة النور إلى حلقة الفرقان"*.',
          executedTools, tables, operationCards, confirmations
        };
      }

      // E. Add Student (optionally with initial register fields)
      if (hasAnyKw(q, ['أضف', 'اضف', 'سجل', 'إضافة']) && hasAnyKw(q, ['طالب'])) {
        const sMatch = raw.match(/(?:طالباً|طالب|الطالب)\s+(?:اسمه|باسم)?\s*["«]?([^"»،,]+?)["»]?(?=\s+(?:إلى|الى|في)\s+|$)/);
        const cMatch = raw.match(/(?:إلى|الى|في)\s+(?:حلقة\s+)?["«]?([^"»،.\n]+?)["»]?(?=\s+(?:درجة|غياب|نشاط|سرد|من\s+سورة|فقه|تفسير|أذكار|سيرة)|$)/);
        const sName = sMatch ? sMatch[1].trim() : '';
        const cName = cMatch ? cMatch[1].trim() : '';
        if (!sName || !cName) {
          return {
            text: 'لإضافة طالب جديد، حدد اسم الطالب واسم الحلقة، مثال: *"أضف الطالب محمد علي إلى حلقة علي بن أبي طالب"*.',
            executedTools, tables, operationCards, confirmations
          };
        }
        const addRes = await invokeTool('create_student', { name: sName, circle_name: cName });
        return {
          text: addRes.ok
            ? `تمت إضافة الطالب **"${addRes.student.name}"** بنجاح والتحقق من الحفظ في سجل (${addRes.period?.month || 'صفر'} ${addRes.period?.year || '1448'}).`
            : (addRes.message || addRes.error),
          executedTools, tables, operationCards, confirmations
        };
      }

      // F. Update Student Record (surah ranges & all register grades/fields)
      if (hasAnyKw(q, ['عدل', 'تعديل', 'رصد', 'سجل']) && hasAnyKw(q, ['طالب', 'درجة', 'علامة', 'غياب', 'حفظ', 'مراجعة', 'فقه', 'تفسير', 'أذكار', 'سيرة', 'سرد', 'نشاط', 'سورة'])) {
        const stuMatch = raw.match(/(?:للطالب|لطالب|الطالب|طالب)\s+["«]?([^"»،,]+?)["»]?(?=\s+(?:إلى|الى|في|بـ|=|:|درجة|علامة|غياب|فقه|تفسير|أذكار|سيرة|سرد|نشاط|من\s+سورة)|$)/);
        const surahRange = raw.match(/من\s+(?:سورة\s+)?([^\s،,]+(?:\s+[^\s،,]+)?)\s*(?:آية|ايه|اية)?\s*(\d+)?\s*(?:إلى|الى)\s+(?:سورة\s+)?([^\s،,]+(?:\s+[^\s،,]+)?)\s*(?:آية|ايه|اية)?\s*(\d+)/);
        const numMatch = raw.match(/(?:إلى|الى|=|:|\s)(\d+(?:\.\d+)?)\s*$/);
        if (stuMatch && (surahRange || numMatch)) {
          const fields = {};
          if (surahRange) {
            const isRev = hasAnyKw(q, ['مراجعة', 'مراجع']);
            if (isRev) {
              fields.rev_from_surah = surahRange[1].trim();
              if (surahRange[2]) fields.rev_from_ayah = Number(surahRange[2]);
              fields.rev_to_surah = surahRange[3].trim();
              fields.rev_to_ayah = Number(surahRange[4]);
            } else {
              fields.from_surah = surahRange[1].trim();
              if (surahRange[2]) fields.from_ayah = Number(surahRange[2]);
              fields.to_surah = surahRange[3].trim();
              fields.to_ayah = Number(surahRange[4]);
            }
          }
          if (numMatch && !surahRange) {
            const val = Number(numMatch[1]);
            if (hasAnyKw(q, ['فقه'])) fields.fiqh = val;
            else if (hasAnyKw(q, ['تفسير'])) fields.tafsir = val;
            else if (hasAnyKw(q, ['أذكار', 'اذكار'])) fields.adhkar = val;
            else if (hasAnyKw(q, ['سيرة'])) fields.seerah = val;
            else if (hasAnyKw(q, ['سرد'])) fields.sard_pages = val;
            else if (hasAnyKw(q, ['أوجه الحفظ', 'اوجه الحفظ'])) fields.memo_pages = val;
            else if (hasAnyKw(q, ['مراجعة', 'مراجع'])) fields.rev_grade = val;
            else if (hasAnyKw(q, ['نشاط'])) fields.activity_mark = val;
            else if (hasAnyKw(q, ['غياب'])) fields.absent_days = val;
            else fields.memo_grade = val;
          }

          if (Object.keys(fields).length > 0) {
            const updRes = await invokeTool('update_student_record', { student_name: stuMatch[1].trim(), fields });
            return {
              text: updRes.ok
                ? `تم تحديث سجل الطالب **"${stuMatch[1].trim()}"** بنجاح.`
                : (updRes.message || updRes.error),
              executedTools, tables, operationCards, confirmations
            };
          }
        }
        return {
          text: [
            'لتعديل سجل طالب بالمحرك المحلي، حدد اسم الطالب والحقل والقيمة، مثال:',
            '- *"عدّل درجة حفظ الطالب خالد إلى 38"*',
            '- *"رصد غياب الطالب سعيد إلى 1"*',
            '- *"سجل حفظ الطالب خالد من سورة البقرة آية 1 إلى البقرة آية 20"*',
            '',
            'لإدخال بيانات معقدة بجمل حرة، اربط **مفتاح AI حقيقي** (مثل **Gemini** أو **Groq**) من الإعدادات.'
          ].join('\n'),
          executedTools, tables, operationCards, confirmations
        };
      }

      // G. Student History
      if (hasAnyKw(q, ['سجل', 'تاريخ', 'تراكمي']) && hasAnyKw(q, ['طالب'])) {
        const stuName = extractQuotedOrAfter(raw, ['الطالب', 'طالب']);
        if (stuName) {
          const hRes = await invokeTool('get_student_history', { student_name: stuName });
          if (!hRes.ok) {
            return { text: hRes.message || hRes.error || 'تعذر جلب سجل الطالب.', executedTools, tables, operationCards, confirmations };
          }
          if (hRes.history && hRes.history.length > 0) {
            tables.push({
              title: `السجل التراكمي للطالب: ${hRes.student.name}`,
              headers: ['الفترة', 'الحفظ', 'أوجه', 'درجة الحفظ', 'المراجعة', 'الغياب', 'المجموع / 200'],
              rows: hRes.history.map(h => [h.period_label, h.memo_range, h.memo_pages, h.memo_grade, h.rev_grade, h.absent_days, `${h.total_score_out_of_200} (${h.percentage}%)`])
            });
          }
          return {
            text: `### ملف السجل التراكمي: ${hRes.student.name}\n- **الحلقة:** ${hRes.student.circle_name} | **المعلم:** ${hRes.student.teacher_name}\n- **عدد الفترات المسجلة:** ${hRes.summary.periods_recorded} | **إجمالي أوجه الحفظ:** ${hRes.summary.total_memo_pages}`,
            executedTools, tables, operationCards, confirmations
          };
        }
      }

      // H. Targeted Halaqat count / list
      if (hasAnyKw(q, ['عدد الحلقات', 'كم حلقة', 'الحلقات الموجودة', 'اعرض الحلقات', 'قائمة الحلقات']) && !hasAnyKw(q, ['تقرير', 'حلل'])) {
        const hRes = await invokeTool('get_all_halaqat', { limit: 40 });
        if (!hRes.ok) return { text: hRes.error || 'تعذر قراءة الحلقات.', executedTools, tables, operationCards, confirmations };
        tables.push({
          title: `الحلقات القرآنية المسجلة (${hRes.total})`,
          headers: ['الحلقة', 'المعلم', 'عدد الطلاب', 'الوصف'],
          rows: hRes.circles.map(c => [c.name, c.teacher_name, c.student_count_label, c.description || '—'])
        });
        return {
          text: `يوجد حالياً **${hRes.total}** حلقات قرآنية مسجلة في قاعدة البيانات.`,
          executedTools, tables, operationCards, confirmations
        };
      }

      // I. Statistics Discrepancy / Reconciliation (when asking specifically why stats differ)
      if ((hasAnyKw(q, ['مختلف', 'فرق', 'مقارنة']) || (hasAnyKw(q, ['تناقض']) && hasAnyKw(q, ['إحصائيات', 'عدد الطلاب']))) && !hasAnyKw(q, ['اكتشف'])) {
        const recon = await invokeTool('analyze_statistics', {});
        const rec = recon.reconciliation || {};
        const lines = [
          '### نتيجة فحص مصادر الإحصائيات ومطابقة الأعداد',
          ...(rec.explanations || []).map(x => `- ${x}`)
        ];
        tables.push({
          title: 'مقارنة مصادر الأعداد الفعلية',
          headers: ['المصدر', 'العدد المسجل'],
          rows: [
            ['إجمالي الطلاب النشطين (/students)', rec.students_table_count],
            ['مجموع الطلاب في الحلقات النشطة', rec.sum_live_in_circles],
            ['مجموع student_count في بطاقات الحلقات', rec.sum_stored_circle_counts],
            ['طلاب غير مرتبطين بحلقة نشطة', rec.orphan_students_count]
          ]
        });
        return { text: lines.join('\n'), executedTools, tables, operationCards, confirmations };
      }

      // J. Full System Anomalies / Errors Scan
      if (hasAnyKw(q, ['اكتشف', 'مشكلة', 'مشكلات', 'أخطاء', 'فحص'])) {
        const scan = await invokeTool('detect_data_anomalies', {});
        if (!scan.ok) return { text: scan.error || 'تعذر إجراء الفحص.', executedTools, tables, operationCards, confirmations };
        const counts = scan.counts || {};
        const summaryText = [
          '### نتائج الفحص الذكي لبيانات مدرسة البيان',
          `- أخطاء مؤكدة: **${counts.confirmed_errors || 0}**`,
          `- احتمالات تحتاج تحققاً: **${counts.potential_issues || 0}**`,
          `- بيانات للمراجعة البشرية: **${counts.needs_human_review || 0}**`,
          `- ملاحظات تحسين: **${counts.improvements || 0}**`
        ].join('\n');

        if (scan.findings && scan.findings.length > 0) {
          tables.push({
            title: 'تفاصيل الملاحظات والأخطاء المكتشفة',
            headers: ['التصنيف', 'الخطورة', 'المشكلة', 'المتأثر', 'الحل المقترح'],
            rows: scan.findings.map(f => [
              f.classification,
              f.severity,
              f.title,
              `${f.affected_count}: ${f.affected_records.slice(0, 2).join('، ')}`,
              f.suggested_solution
            ])
          });
        }
        return { text: summaryText, executedTools, tables, operationCards, confirmations };
      }

      // K. Teachers Review
      if (hasAnyKw(q, ['معلم', 'أساتذة', 'كادر'])) {
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
          text: `### مراجعة بيانات المعلمين (${tRes.total})\n- أعلى عبء: **${bal.max_students_per_teacher}** | أقل عبء: **${bal.min_students_per_teacher}**\n- التوازن العام: ${bal.imbalance_detected ? 'يوجد تفاوت ملحوظ في توزيع الطلاب بين المعلمين (الفارق ' + bal.spread + ' طلاب).' : 'توزيع الطلاب متوازن حالياً.'}`,
          executedTools, tables, operationCards, confirmations
        };
      }

      // L. Audit History / Undo
      if (hasAnyKw(q, ['تراجع', 'تدقيق', 'سجل العمليات'])) {
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

      // M. Statistics / Reports / Halaqat Performance
      if (hasAnyKw(q, ['إحصائيات', 'كم عدد الطلاب', 'تقرير', 'أداء', 'تحليل'])) {
        const [stats, circlesRes] = await Promise.all([
          invokeTool('get_statistics', {}),
          invokeTool('get_all_halaqat', { limit: 30 })
        ]);
        const m = stats.metrics || {};
        const lines = [
          '### الإحصائيات والتقرير الإداري المحدّث',
          `- **إجمالي الحلقات القرآنية:** ${m.total_circles}`,
          `- **إجمالي الطلاب النشطين (/students):** ${formatStudentCountAr(m.total_students_active)} (منهم ${m.sum_of_circle_live_students} داخل الحلقات النشطة و ${m.orphan_students_count} غير مرتبطين بحلقة)`,
          `- **عدد المعلمين:** ${m.total_teachers} | **الاختبارات:** ${m.total_exams} (${m.total_exam_results} نتيجة)`,
          `- **نسبة الحضور العامة:** ${m.attendance_rate}% (أيام الغياب: ${m.total_absent_days})`,
          `- **إجمالي أوجه الحفظ:** ${m.total_memo_pages} | **أوجه السرد:** ${m.total_sard_pages}`
        ];
        if (circlesRes.ok) {
          tables.push({
            title: 'توزيع الحلقات القرآنية',
            headers: ['الحلقة', 'المعلم', 'عدد الطلاب', 'الوصف'],
            rows: circlesRes.circles.map(c => [c.name, c.teacher_name, c.student_count_label, c.description || '—'])
          });
        }
        return { text: lines.join('\n'), executedTools, tables, operationCards, confirmations };
      }

      // N. Student CV Inquiry
      if (hasAnyKw(q, ['سيرة', 'ذاتية'])) {
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

      // O. Explicit Search Only (when user actually says "ابحث عن..." or asks about a name)
      if (/^(ابحث عن|بحث عن|اعطني بيانات|ملف)\s+/.test(q)) {
        const term = raw.replace(/^(ابحث عن|بحث عن|اعطني بيانات|ملف)\s+/g, '').trim();
        if (term.length >= 2) {
          const sr = await invokeTool('search_school_data', { query: term });
          const totalHits = (sr.circles || []).length + (sr.students || []).length + (sr.teachers || []).length + (sr.exams || []).length;
          if ((sr.students || []).length > 0) {
            tables.push({ title: `نتائج الطلاب لـ "${term}"`, headers: ['المعرف', 'الاسم', 'الحلقة'], rows: sr.students.map(s => [s.id, s.name, s.circle_name]) });
          }
          if ((sr.circles || []).length > 0) {
            tables.push({ title: `نتائج الحلقات لـ "${term}"`, headers: ['المعرف', 'الحلقة', 'المعلم'], rows: sr.circles.map(c => [c.id, c.name, c.teacher || '—']) });
          }
          return {
            text: totalHits > 0 ? `عُثر على **${totalHits}** نتيجة مطابقة لـ **"${term}"**.` : `لم يُعثر على نتائج مطابقة لـ **"${term}"** في قاعدة البيانات.`,
            executedTools, tables, operationCards, confirmations
          };
        }
      }

      // P. Unmatched free-text prompt in Local Engine -> Polite guidance WITHOUT running full DB scan!
      return {
        text: [
          'أعمل حالياً عبر **المحرك المحلي** الذي ينفذ الأوامر والأسئلة الإدارية المباشرة.',
          'لم أفهم المطلوب تحديداً، يمكنك تجربة عبارات واضحة مثل:',
          '- *"كم عدد الحلقات؟"* أو *"أعطني إحصائيات الطلاب"*',
          '- *"اكتشف الأخطاء في بيانات المدرسة"*',
          '- *"اعرض السجل التراكمي للطالب ..."*',
          '- *"أنشئ حلقة باسم ... والمعلم ..."*',
          '',
          'أو يمكنك ربط مزود ذكاء اصطناعي خارجي (مثل **Gemini** أو **OpenAI** أو **Claude**) من الإعدادات لفهم الأسئلة الحرة بالكامل.'
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
        onProgress: options.onProgress || null,
        onStreamDelta: options.onStreamDelta || null
      };

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
        throw new ProviderRequestError('rate_limit', `تم بلوغ الحد الأقصى لاستهلاك الرموز (${Number(cfg.dailyTokenLimit).toLocaleString()}). يمكنك رفع الحد من الإعدادات أو التبديل إلى المحرك المحلي.`);
      }

      if (cfg.provider === 'builtin') {
        return await runBuiltinAgentTurn(userPrompt, context);
      }

      const keyStatus = await AlbayanAISecurity.getApiKeyStatus(cfg.provider);
      if (PROVIDER_CATALOG[cfg.provider]?.requiresKey && !keyStatus.configured) {
        if (cfg.fallbackToBuiltin) {
          const fallbackRes = await runBuiltinAgentTurn(userPrompt, context);
          fallbackRes.fallbackNotice = `مفتاح ${PROVIDER_CATALOG[cfg.provider].label} غير مهيأ؛ تم التنفيذ عبر المحرك المحلي.`;
          return fallbackRes;
        }
        setConnectionState(cfg, 'auth_error', 'مفتاح API غير مهيأ');
        throw new ProviderRequestError('auth', `لم يتم إدخال مفتاح API لمزود ${PROVIDER_CATALOG[cfg.provider].label}. افتح إعدادات المزود لإدخال المفتاح واختبار الاتصال.`);
      }

      try {
        if (cfg.provider === 'gemini') return await runGeminiTurn(cfg, historyMessages, userPrompt, context);
        if (cfg.provider === 'anthropic') return await runAnthropicTurn(cfg, historyMessages, userPrompt, context);
        return await runOpenAITurn(cfg, historyMessages, userPrompt, context);
      } catch (err) {
        if (err && (err.category === 'aborted' || err.message === 'ABORTED' || err.name === 'AbortError')) {
          throw err;
        }
        const cat = (err && err.category) || 'network';
        const stateMap = { auth: 'auth_error', model: 'model_error', rate_limit: 'rate_limit', offline: 'network_error', network: 'network_error', timeout: 'network_error', server: 'network_error', bad_request: 'model_error', config: 'network_error' };
        setConnectionState(cfg, stateMap[cat] || 'network_error', err.message || 'فشل الاتصال');

        if (cfg.fallbackToBuiltin) {
          const fallbackRes = await runBuiltinAgentTurn(userPrompt, context);
          fallbackRes.fallbackNotice = `تعذر الاتصال بـ ${PROVIDER_CATALOG[cfg.provider]?.shortLabel || cfg.provider}: ${err.message} — تم التنفيذ عبر المحرك المحلي.`;
          return fallbackRes;
        }
        throw err;
      }
    }

    const LIVE_MODELS_STORAGE_PREFIX = 'albayan_ai_live_models_v1_';

    function getCachedLiveModels(providerId) {
      try {
        const raw = localStorage.getItem(`${LIVE_MODELS_STORAGE_PREFIX}${providerId}`);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }

    function saveCachedLiveModels(providerId, models) {
      try {
        if (Array.isArray(models) && models.length > 0) {
          localStorage.setItem(`${LIVE_MODELS_STORAGE_PREFIX}${providerId}`, JSON.stringify(models));
        }
      } catch (e) {}
    }

    function getModelsEndpoint(tempConfig = {}) {
      const p = tempConfig.provider || 'openai';
      if (p === 'gemini') {
        const base = (tempConfig.customEndpoint && tempConfig.customEndpoint.trim())
          ? tempConfig.customEndpoint.replace(/\/models\/.*$/, '').replace(/\/$/, '')
          : 'https://generativelanguage.googleapis.com/v1beta';
        return `${base}/models?pageSize=100`;
      }
      if (p === 'anthropic') {
        return 'https://api.anthropic.com/v1/models';
      }
      const chatUrl = resolveOpenAICompatEndpoint(tempConfig);
      if (!chatUrl) return '';
      return chatUrl.replace(/\/chat\/completions\/?$/i, '/models');
    }

    async function fetchProviderModels(tempConfig = {}, overrideKey = '') {
      const p = tempConfig.provider || 'builtin';
      if (p === 'builtin') {
        return { ok: true, models: PROVIDER_CATALOG.builtin.models };
      }
      const keyStatus = await AlbayanAISecurity.getApiKeyStatus(p);
      if (!overrideKey && PROVIDER_CATALOG[p]?.requiresKey && !keyStatus.configured) {
        return { ok: false, category: 'auth', message: 'أدخل مفتاح API أولاً ثم اضغط تحديث النماذج.' };
      }
      const url = getModelsEndpoint(tempConfig);
      if (!url) {
        return { ok: false, category: 'config', message: 'رابط API غير محدد.' };
      }

      try {
        const data = await performHttp(p, url, null, { method: 'GET', overrideKey, timeoutMs: 12000 });
        let models = [];
        if (p === 'gemini' && Array.isArray(data.models)) {
          models = data.models
            .filter(m => {
              const id = String(m.name || '').replace(/^models\//, '');
              const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
              if (!methods.includes('generateContent')) return false;
              if (/(embedding|imagen|veo|tts|robotics|aqa)/i.test(id)) return false;
              return /^gemini/i.test(id);
            })
            .map(m => {
              const id = String(m.name || '').replace(/^models\//, '');
              return { id, label: m.displayName ? `${m.displayName} (${id})` : id };
            })
            .sort((a, b) => {
              const score = (id) => {
                const match = id.match(/gemini-(\d+(?:\.\d+)?)/i);
                const ver = match ? parseFloat(match[1]) : 0;
                const bonus = /flash/i.test(id) ? 0.05 : (/pro|carbon|hydrogen/i.test(id) ? 0.03 : 0);
                return ver + bonus;
              };
              return score(b.id) - score(a.id);
            });
        } else if (Array.isArray(data.data)) {
          models = data.data
            .map(m => ({ id: m.id, label: m.name ? `${m.name} (${m.id})` : m.id }))
            .filter(m => m.id)
            .slice(0, 60);
        }

        if (models.length === 0) {
          return { ok: false, message: 'لم يتم العثور على نماذج نصية متاحة في هذا الحساب.' };
        }
        saveCachedLiveModels(p, models);
        return { ok: true, models };
      } catch (err) {
        return { ok: false, category: (err && err.category) || 'network', message: (err && err.message) || 'تعذر جلب قائمة النماذج.' };
      }
    }

    async function testConnection(tempConfig = {}, overrideKey = '') {
      if (!AlbayanAISecurity.canConfigureProvider()) {
        return { ok: false, category: 'auth', message: 'اختبار وتعديل إعدادات المزود متاح لطاقم المدرسة المسجل فقط.' };
      }
      const p = tempConfig.provider || 'builtin';
      if (p === 'builtin') {
        return { ok: true, category: 'local', latencyMs: 1, message: 'المحرك المحلي جاهز ويعمل مباشرةً مع قاعدة بيانات المدرسة (بدون نموذج سحابي).' };
      }

      if (p === 'custom' && (!tempConfig.customEndpoint || !/^https?:\/\//i.test(tempConfig.customEndpoint.trim()))) {
        return { ok: false, category: 'config', message: 'يرجى إدخال عنوان Endpoint صالح (https://...) قبل اختبار الاتصال.' };
      }

      const keyStatus = await AlbayanAISecurity.getApiKeyStatus(p);
      if (!overrideKey && PROVIDER_CATALOG[p]?.requiresKey && !keyStatus.configured) {
        setConnectionState(tempConfig, 'auth_error', 'مفتاح API غير مهيأ');
        return { ok: false, category: 'auth', message: 'يرجى إدخال مفتاح API أولاً لاختبار الاتصال.' };
      }

      const started = Date.now();
      const model = tempConfig.model || PROVIDER_CATALOG[p].defaultModel;
      try {
        if (p === 'gemini') {
          const url = (tempConfig.customEndpoint && tempConfig.customEndpoint.trim())
            || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
          await performHttp('gemini', url, {
            contents: [{ role: 'user', parts: [{ text: 'قل: جاهز' }] }],
            generationConfig: { maxOutputTokens: 16 }
          }, { overrideKey, timeoutMs: 12000, model });
        } else if (p === 'anthropic') {
          const url = (tempConfig.customEndpoint && tempConfig.customEndpoint.trim()) || 'https://api.anthropic.com/v1/messages';
          await performHttp('anthropic', url, {
            model,
            messages: [{ role: 'user', content: 'قل: جاهز' }],
            max_tokens: 16
          }, { overrideKey, timeoutMs: 12000, model });
        } else {
          const url = resolveOpenAICompatEndpoint(tempConfig);
          const isReasoning = /^o[134]/i.test(model);
          await performHttp(p, url, {
            model,
            messages: [{ role: 'user', content: 'قل: جاهز' }],
            ...(isReasoning ? { max_completion_tokens: 16 } : { max_tokens: 16 })
          }, { overrideKey, timeoutMs: 12000, model });
        }

        const latencyMs = Date.now() - started;
        setConnectionState(tempConfig, 'connected', `متصل (${latencyMs}ms)`, latencyMs);
        let liveModels = null;
        try {
          const mRes = await fetchProviderModels(tempConfig, overrideKey);
          if (mRes && mRes.ok) liveModels = mRes.models;
        } catch (e) {}
        return {
          ok: true,
          category: 'connected',
          latencyMs,
          liveModels,
          message: `تم التحقق من الاتصال بنجاح بمزود ${PROVIDER_CATALOG[p].shortLabel} (${model}) خلال ${latencyMs}ms.`
        };
      } catch (err) {
        const cat = (err && err.category) || 'network';
        const stateMap = { auth: 'auth_error', model: 'model_error', rate_limit: 'rate_limit' };
        let suggestedModels = null;
        if (cat === 'model') {
          try {
            const mRes = await fetchProviderModels(tempConfig, overrideKey);
            if (mRes && mRes.ok) suggestedModels = mRes.models;
          } catch (e) {}
        }
        setConnectionState(tempConfig, stateMap[cat] || 'network_error', err.message || 'فشل الاختبار');
        const msgSuffix = (suggestedModels && suggestedModels.length > 0)
          ? ` — تم تحديث القائمة بـ ${suggestedModels.length} نموذج متاح في حسابك، اختر أول نموذج ثم احفظ.`
          : '';
        return { ok: false, category: cat, suggestedModels, message: (err.message || 'تعذر الاتصال بالمزود.') + msgSuffix };
      }
    }

    return {
      PROVIDER_CATALOG,
      DEFAULT_CONFIG,
      loadConfig,
      saveConfig,
      loadUsageStats,
      getConnectionState,
      setConnectionState,
      getCachedLiveModels,
      fetchProviderModels,
      sendPrompt,
      testConnection,
      _adapters: {
        runGeminiTurn,
        runOpenAITurn,
        runAnthropicTurn,
        runBuiltinAgentTurn,
        isOrdinaryConversation,
        classifyProviderHttpError,
        resolveOpenAICompatEndpoint
      }
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

      const older = msgs.slice(0, msgs.length - ACTIVE_LIMIT_MESSAGES);
      const recent = msgs.slice(msgs.length - ACTIVE_LIMIT_MESSAGES);
      const bullets = older
        .filter(m => m && m.content)
        .slice(-8)
        .map(m => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${String(m.content).slice(0, 120)}`)
        .join(' | ');
      conv.summary = bullets;
      return [{ role: 'user', content: `ملخص السياق السابق للمحادثة (للاسترشاد فقط): ${bullets}` }, ...recent];
    }

    return { loadAll, saveAll, createConversation, compressHistoryForModel };
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
