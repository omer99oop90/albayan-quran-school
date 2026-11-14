/**
 * Albayan Offline-First Local Database Engine (IndexedDB + Outbox Queue)
 * Provides 100% offline capability for the Android mobile app and web client:
 *  - Local caching of Circles, Students, Student Records, Exams, Questions, Users, Settings
 *  - Canonical ID & Hijri Period Normalization (prevents cross-month grade bleeding)
 *  - Conflict-free IndexedDB Upserts (resolves unique index ConstraintError on student_period)
 *  - Outbox Sync Queue (stores offline mutations with timestamps)
 *  - Automatic background sync when connection to server or Firebase is available
 */

(function () {
  const DB_NAME = 'AlbayanOfflineDB';
  const DB_VERSION = 3;

  let dbInstance = null;
  let syncInProgress = false;

  // One-time reset of stale legacy tombstones so active Firebase circles/students are never hidden on upgraded devices
  try {
    if (localStorage.getItem('albayan_v3_tombstone_reset') !== '1') {
      localStorage.removeItem('deleted_circles');
      localStorage.removeItem('deleted_students');
      localStorage.removeItem('albayan_cached_circles');
      localStorage.removeItem('cached_circles_list');
      localStorage.setItem('albayan_v3_tombstone_reset', '1');
    }
  } catch (e) {}

  // ===========================================================================
  // 1. CANONICAL ID & PERIOD NORMALIZERS
  // ===========================================================================

  function normalizeEntityId(rawId, prefixToStrip = '') {
    if (rawId === null || rawId === undefined || rawId === '') return null;
    let s = String(rawId).trim();
    if (prefixToStrip) {
      const re = new RegExp('^' + prefixToStrip + '_?', 'i');
      s = s.replace(re, '').trim();
    }
    s = s.replace(/^(circles_|students_|users_|exams_|student_records_)/i, '').trim();
    if (!s) return null;
    const n = Number(s);
    return (!isNaN(n) && isFinite(n) && String(n) === s) ? n : s;
  }

  function normalizeCircleId(rawId) {
    return normalizeEntityId(rawId, 'circles');
  }

  function normalizeStudentId(rawId) {
    return normalizeEntityId(rawId, 'students');
  }

  function normalizeMonthName(rawMonth) {
    if (!rawMonth) return 'صفر';
    let s = String(rawMonth).trim();
    // Preserve yearly summary canonical label
    if (
      s === 'سجل نهاية السنة' ||
      s === 'نهاية السنة' ||
      s === 'المحصلة السنوية' ||
      s === 'المحصلة السنوية الشاملة'
    ) {
      return 'سجل نهاية السنة';
    }
    return s;
  }

  function normalizeMonthComparisonKey(rawMonth) {
    if (!rawMonth) return '';
    let s = String(rawMonth)
      .trim()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/^شهر\s+/i, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
    if (s === 'ربيع الثاني') s = 'ربيع الاخر';
    if (s === 'جمادي الثانيه' || s === 'جمادي الاخره') s = 'جمادي الاخره';
    if (s === 'جمادي الاولي') s = 'جمادي الاولي';
    return s;
  }

  function isSameNormalizedMonth(m1, m2) {
    if (!m1 && !m2) return true;
    if (!m1 || !m2) return false;
    return normalizeMonthComparisonKey(m1) === normalizeMonthComparisonKey(m2);
  }

  function normalizePeriodObject(period = {}) {
    const pType = String(period.period_type || 'monthly').trim() || 'monthly';
    const rawYear = String(period.year || '1448').replace(/\D/g, '') || '1448';
    const rawMonth = normalizeMonthName(
      period.month || (pType === 'daily' ? period.record_date : 'صفر') || 'صفر'
    );
    const recordDate = String(period.record_date || (pType === 'daily' ? rawMonth : '')).trim();
    const compMonth = normalizeMonthComparisonKey(rawMonth) || 'صفر';
    const periodKey = `${pType}_${rawYear}_${compMonth}`;
    return {
      period_type: pType,
      year: rawYear,
      month: rawMonth,
      record_date: recordDate,
      comp_month: compMonth,
      period_key: periodKey
    };
  }

  function buildCanonicalRecordId(studentId, period = {}) {
    const sid = normalizeStudentId(studentId);
    const normP = normalizePeriodObject(period);
    return `rec_${sid}_${normP.period_type}_${normP.year}_${normP.comp_month}`;
  }

  const GRADE_AND_RECORD_FIELDS = [
    'from_surah', 'from_ayah', 'to_surah', 'to_ayah', 'memo_pages', 'memo_grade',
    'rev_from_surah', 'rev_from_ayah', 'rev_to_surah', 'rev_to_ayah', 'sard_pages', 'rev_grade',
    'absent_days', 'attendance_mark', 'activity_mark',
    'fiqh', 'tafsir', 'adhkar', 'seerah',
    'exam_grade', 'exam_title', 'period_type', 'record_date', 'month', 'year'
  ];

  function createBlankRecordFields(period = {}) {
    const normP = normalizePeriodObject(period);
    return {
      from_surah: '',
      from_ayah: 0,
      to_surah: '',
      to_ayah: 0,
      memo_pages: 0,
      memo_grade: '',
      rev_from_surah: '',
      rev_from_ayah: 0,
      rev_to_surah: '',
      rev_to_ayah: 0,
      sard_pages: 0,
      rev_grade: '',
      absent_days: 0,
      activity_mark: '',
      fiqh: '',
      tafsir: '',
      adhkar: '',
      seerah: '',
      exam_grade: 'لم يختبر بعد',
      exam_title: '',
      period_type: normP.period_type,
      record_date: normP.record_date,
      month: normP.month,
      year: normP.year
    };
  }

  function stripRecordFieldsFromStudent(studentObj) {
    const clean = { ...studentObj };
    clean.id = normalizeStudentId(clean.id !== undefined ? clean.id : clean.student_id);
    clean.circle_id = normalizeCircleId(clean.circle_id);
    return {
      id: clean.id,
      circle_id: clean.circle_id,
      name: String(clean.name || '').trim(),
      created_at: clean.created_at || new Date().toISOString(),
      updated_at: clean.updated_at || new Date().toISOString(),
      is_deleted: clean.is_deleted ? 1 : 0
    };
  }

  function hasMeaningfulRecordData(rec) {
    if (!rec || typeof rec !== 'object') return false;
    if (rec.from_surah && String(rec.from_surah).trim() !== '') return true;
    if (rec.to_surah && String(rec.to_surah).trim() !== '') return true;
    if (rec.rev_from_surah && String(rec.rev_from_surah).trim() !== '') return true;
    if (rec.rev_to_surah && String(rec.rev_to_surah).trim() !== '') return true;
    if (Number(rec.memo_grade) > 0) return true;
    if (Number(rec.rev_grade) > 0) return true;
    if (Number(rec.sard_pages) > 0) return true;
    if (Number(rec.absent_days) > 0) return true;
    if (Number(rec.activity_mark) > 0) return true;
    if (Number(rec.fiqh) > 0 || Number(rec.tafsir) > 0 || Number(rec.adhkar) > 0 || Number(rec.seerah) > 0) return true;
    if (rec.exam_grade && rec.exam_grade !== 'لم يختبر بعد' && rec.exam_grade !== '-') return true;
    return false;
  }

  // ===========================================================================
  // 2. INDEXEDDB INITIALIZATION & SCHEMA
  // ===========================================================================

  function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser/WebView'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('circles')) {
          db.createObjectStore('circles', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('circle_id', 'circle_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('student_records')) {
          const recStore = db.createObjectStore('student_records', { keyPath: 'id', autoIncrement: true });
          recStore.createIndex('student_period', ['student_id', 'period_type', 'month', 'year'], { unique: true });
          recStore.createIndex('circle_id', 'circle_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('exam_questions')) {
          db.createObjectStore('exam_questions', { keyPath: 'exam_id' });
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'qid', autoIncrement: true });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = function (event) {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = function (event) {
        console.error('[AlbayanLocalDB] Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Safe helper to upsert a student_record into `recStore` without triggering
   * a ConstraintError on the `student_period` unique index.
   */
  function safeUpsertStudentRecordInStore(recStore, recordObj) {
    if (!recStore || !recordObj) return;
    const sid = normalizeStudentId(recordObj.student_id !== undefined ? recordObj.student_id : recordObj.id);
    if (sid === null || sid === undefined) return;

    const normP = normalizePeriodObject(recordObj);
    const normalizedRec = {
      ...createBlankRecordFields(normP),
      ...recordObj,
      student_id: sid,
      circle_id: normalizeCircleId(recordObj.circle_id),
      period_type: normP.period_type,
      month: normP.month,
      year: normP.year,
      record_date: normP.record_date,
      updated_at: recordObj.updated_at || new Date().toISOString()
    };

    try {
      const idx = recStore.index('student_period');
      const keyRange = [sid, normP.period_type, normP.month, normP.year];
      const lookupReq = idx.get(keyRange);
      lookupReq.onsuccess = function () {
        const existing = lookupReq.result;
        if (existing && existing.id !== undefined) {
          normalizedRec.id = existing.id;
        } else if (normalizedRec.id === undefined || normalizedRec.id === null || normalizedRec.id === sid) {
          normalizedRec.id = buildCanonicalRecordId(sid, normP);
        }
        try {
          recStore.put(normalizedRec);
        } catch (putErr) {
          console.warn('[AlbayanLocalDB] Put student_record warning:', putErr);
        }
      };
      lookupReq.onerror = function () {
        normalizedRec.id = buildCanonicalRecordId(sid, normP);
        try { recStore.put(normalizedRec); } catch (e) {}
      };
    } catch (err) {
      normalizedRec.id = buildCanonicalRecordId(sid, normP);
      try { recStore.put(normalizedRec); } catch (e) {}
    }
  }

  // ===========================================================================
  // 3. CIRCLES OPERATIONS
  // ===========================================================================

  async function cacheCircles(circlesList) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['circles'], 'readwrite');
      const store = tx.objectStore('circles');

      let deletedCircles = [];
      try {
        deletedCircles = JSON.parse(localStorage.getItem('deleted_circles') || '[]').map(String);
      } catch (e) {}

      let pendingCircleDeletes = [];
      let pendingCircleUpdates = {};

      const applyCircles = () => {
        const dedupMap = new Map();
        (circlesList || []).forEach(c => {
          if (!c || typeof c !== 'object') return;
          const cleanId = normalizeCircleId(c.id !== undefined ? c.id : c.local_id);
          if (cleanId === null || cleanId === undefined) return;
          if (deletedCircles.includes(String(cleanId)) || pendingCircleDeletes.includes(String(cleanId))) {
            return;
          }
          if (c.is_deleted === 1 || c.is_deleted === true) return;

          const merged = {
            ...c,
            ...(pendingCircleUpdates[String(cleanId)] || {}),
            id: cleanId,
            local_id: cleanId
          };
          const existing = dedupMap.get(String(cleanId));
          if (!existing) {
            dedupMap.set(String(cleanId), merged);
          } else {
            const tNew = new Date(merged.updated_at || merged.created_at || 0).getTime() || 0;
            const tOld = new Date(existing.updated_at || existing.created_at || 0).getTime() || 0;
            if (tNew >= tOld) {
              dedupMap.set(String(cleanId), { ...existing, ...merged });
            }
          }
        });

        // Also preserve pending newly created circles
        Object.keys(pendingCircleUpdates).forEach(cid => {
          if (!dedupMap.has(String(cid)) && !deletedCircles.includes(String(cid))) {
            const p = pendingCircleUpdates[cid];
            if (p && p.name) {
              const cleanId = normalizeCircleId(cid);
              dedupMap.set(String(cleanId), { ...p, id: cleanId, local_id: cleanId });
            }
          }
        });

        store.clear();
        dedupMap.forEach(c => {
          store.put(c);
        });
      };

      if (db.objectStoreNames.contains('sync_queue')) {
        try {
          const qTx = db.transaction(['sync_queue'], 'readonly');
          const qReq = qTx.objectStore('sync_queue').getAll();
          qReq.onsuccess = () => {
            const pending = (qReq.result || []).filter(i => i.status === 'pending');
            pending.forEach(item => {
              if (item.entity === 'circles') {
                const cid = String(normalizeCircleId(item.entity_id || (item.payload && item.payload.id)));
                if (item.action === 'DELETE_CIRCLE') {
                  pendingCircleDeletes.push(cid);
                } else if (item.payload) {
                  pendingCircleUpdates[cid] = { ...(pendingCircleUpdates[cid] || {}), ...item.payload };
                }
              }
            });
            const writeTx = db.transaction(['circles'], 'readwrite');
            const writeStore = writeTx.objectStore('circles');
            const dedupMap = new Map();
            (circlesList || []).forEach(c => {
              if (!c || typeof c !== 'object') return;
              const cleanId = normalizeCircleId(c.id !== undefined ? c.id : c.local_id);
              if (cleanId === null || cleanId === undefined) return;
              if (deletedCircles.includes(String(cleanId)) || pendingCircleDeletes.includes(String(cleanId))) return;
              if (c.is_deleted === 1 || c.is_deleted === true) return;
              const merged = {
                ...c,
                ...(pendingCircleUpdates[String(cleanId)] || {}),
                id: cleanId,
                local_id: cleanId
              };
              dedupMap.set(String(cleanId), merged);
            });
            Object.keys(pendingCircleUpdates).forEach(cid => {
              if (!dedupMap.has(String(cid)) && !deletedCircles.includes(String(cid))) {
                const p = pendingCircleUpdates[cid];
                if (p && p.name) {
                  const cleanId = normalizeCircleId(cid);
                  dedupMap.set(String(cleanId), { ...p, id: cleanId, local_id: cleanId });
                }
              }
            });
            writeStore.clear();
            dedupMap.forEach(c => writeStore.put(c));
            writeTx.oncomplete = () => resolve(true);
            writeTx.onerror = (e) => reject(e.target.error);
          };
          qReq.onerror = () => {
            applyCircles();
            tx.oncomplete = () => resolve(true);
            tx.onerror = (e) => reject(e.target.error);
          };
          return;
        } catch (e) {}
      }

      applyCircles();
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveLocalCircle(circleObj) {
    if (!circleObj || circleObj.id === undefined) return false;
    const cleanId = normalizeCircleId(circleObj.id);
    const normalized = { ...circleObj, id: cleanId, local_id: cleanId };
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['circles'], 'readwrite');
      const store = tx.objectStore('circles');
      store.put(normalized);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteLocalCircle(circleId) {
    if (circleId === undefined || circleId === null) return false;
    const cleanId = normalizeCircleId(circleId);
    const rawStr = String(cleanId);

    try {
      const deletedCircles = JSON.parse(localStorage.getItem('deleted_circles') || '[]').map(String);
      if (!deletedCircles.includes(rawStr)) {
        deletedCircles.push(rawStr);
        localStorage.setItem('deleted_circles', JSON.stringify(deletedCircles));
      }
    } catch (e) {}

    // Clean localStorage student caches for this circle
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(`albayan_cached_students_${rawStr}`) || k.startsWith(`albayan_circle_students_base_${rawStr}`))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    const db = await openDB();
    return new Promise((resolve) => {
      const stores = ['circles', 'students', 'student_records'].filter(s => db.objectStoreNames.contains(s));
      const tx = db.transaction(stores, 'readwrite');
      const circleStore = tx.objectStore('circles');

      circleStore.delete(cleanId);
      circleStore.delete(String(cleanId));
      if (!isNaN(Number(cleanId))) circleStore.delete(Number(cleanId));
      circleStore.delete(`circles_${rawStr}`);

      if (tx.objectStoreNames.contains('students')) {
        const stuStore = tx.objectStore('students');
        const stuReq = stuStore.getAll();
        stuReq.onsuccess = () => {
          (stuReq.result || []).forEach(st => {
            if (String(normalizeCircleId(st.circle_id)) === rawStr) {
              stuStore.delete(st.id);
            }
          });
        };
      }

      if (tx.objectStoreNames.contains('student_records')) {
        const recStore = tx.objectStore('student_records');
        const recReq = recStore.getAll();
        recReq.onsuccess = () => {
          (recReq.result || []).forEach(r => {
            if (String(normalizeCircleId(r.circle_id)) === rawStr) {
              recStore.delete(r.id);
            }
          });
        };
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async function getLocalCircles() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['circles'], 'readonly');
      const store = tx.objectStore('circles');
      const req = store.getAll();
      req.onsuccess = () => {
        let deletedCircles = [];
        try {
          deletedCircles = JSON.parse(localStorage.getItem('deleted_circles') || '[]').map(String);
        } catch (e) {}
        const dedup = new Map();
        (req.result || []).forEach(c => {
          if (!c || typeof c !== 'object') return;
          const cleanId = normalizeCircleId(c.id !== undefined ? c.id : c.local_id);
          if (cleanId === null || cleanId === undefined) return;
          if (deletedCircles.includes(String(cleanId))) return;
          if (c.is_deleted === 1 || c.is_deleted === true) return;
          dedup.set(String(cleanId), { ...c, id: cleanId, local_id: cleanId });
        });
        resolve(Array.from(dedup.values()));
      };
      req.onerror = () => resolve([]);
    });
  }

  // ===========================================================================
  // 4. STUDENTS & PERIOD-ISOLATED RECORDS OPERATIONS
  // ===========================================================================

  async function cacheStudents(circleId, studentsList, period = {}) {
    const cleanCid = normalizeCircleId(circleId);
    if (cleanCid === null || cleanCid === undefined) return false;
    const normP = normalizePeriodObject(period);
    const isYearly = normP.month === 'سجل نهاية السنة';

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['students', 'student_records'], 'readwrite');
      const stuStore = tx.objectStore('students');
      const recStore = tx.objectStore('student_records');

      let deletedStudents = [];
      try {
        deletedStudents = JSON.parse(localStorage.getItem('deleted_students') || '[]').map(String);
      } catch (e) {}

      (studentsList || []).forEach(s => {
        if (!s || typeof s !== 'object') return;
        const sid = normalizeStudentId(s.id !== undefined ? s.id : s.student_id);
        if (sid === null || sid === undefined) return;
        if (deletedStudents.includes(String(sid)) || s.is_deleted === 1 || s.is_deleted === true) return;

        // 1. Store clean base student identity (without polluting base student with period grades)
        const baseStudent = stripRecordFieldsFromStudent({ ...s, id: sid, circle_id: cleanCid });
        stuStore.put(baseStudent);

        // 2. Store period-specific record only if not yearly summary
        if (!isYearly) {
          const recPayload = {
            student_id: sid,
            circle_id: cleanCid,
            period_type: normP.period_type,
            record_date: normP.record_date,
            month: normP.month,
            year: normP.year,
            from_surah: s.from_surah || '',
            from_ayah: Number(s.from_ayah || 0),
            to_surah: s.to_surah || '',
            to_ayah: Number(s.to_ayah || 0),
            memo_pages: Number(s.memo_pages || 0),
            memo_grade: s.memo_grade !== undefined && s.memo_grade !== null ? s.memo_grade : '',
            rev_from_surah: s.rev_from_surah || '',
            rev_from_ayah: Number(s.rev_from_ayah || 0),
            rev_to_surah: s.rev_to_surah || '',
            rev_to_ayah: Number(s.rev_to_ayah || 0),
            sard_pages: Number(s.sard_pages || 0),
            rev_grade: s.rev_grade !== undefined && s.rev_grade !== null ? s.rev_grade : '',
            absent_days: Number(s.absent_days || 0),
            activity_mark: s.activity_mark !== undefined && s.activity_mark !== null ? s.activity_mark : '',
            fiqh: s.fiqh !== undefined && s.fiqh !== null ? s.fiqh : '',
            tafsir: s.tafsir !== undefined && s.tafsir !== null ? s.tafsir : '',
            adhkar: s.adhkar !== undefined && s.adhkar !== null ? s.adhkar : '',
            seerah: s.seerah !== undefined && s.seerah !== null ? s.seerah : '',
            exam_grade: s.exam_grade || 'لم يختبر بعد',
            exam_title: s.exam_title || '',
            updated_at: s.updated_at || new Date().toISOString()
          };
          safeUpsertStudentRecordInStore(recStore, recPayload);
        }
      });

      tx.oncomplete = () => {
        // Save period-isolated localStorage snapshot and union-merge base student list
        try {
          localStorage.setItem(`albayan_cached_students_${cleanCid}_${normP.period_key}`, JSON.stringify(studentsList || []));
          const baseKey = `albayan_circle_students_base_${cleanCid}`;
          const baseMap = new Map();
          try {
            const existingRaw = localStorage.getItem(baseKey);
            if (existingRaw) {
              const existingArr = JSON.parse(existingRaw);
              if (Array.isArray(existingArr)) {
                existingArr.forEach(st => {
                  const sid = normalizeStudentId(st && (st.id !== undefined ? st.id : st.student_id));
                  if (sid !== null && !deletedStudents.includes(String(sid)) && st.name) {
                    baseMap.set(String(sid), stripRecordFieldsFromStudent({ ...st, id: sid, circle_id: cleanCid }));
                  }
                });
              }
            }
          } catch (e) {}
          (studentsList || []).forEach(st => {
            const sid = normalizeStudentId(st && (st.id !== undefined ? st.id : st.student_id));
            if (sid !== null && !deletedStudents.includes(String(sid)) && st.name) {
              baseMap.set(String(sid), stripRecordFieldsFromStudent({ ...st, id: sid, circle_id: cleanCid }));
            }
          });
          localStorage.setItem(baseKey, JSON.stringify(Array.from(baseMap.values())));
        } catch (e) {}
        resolve(true);
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function getLocalStudents(circleId, period = {}) {
    const cleanCid = normalizeCircleId(circleId);
    if (cleanCid === null || cleanCid === undefined) return [];
    const normP = normalizePeriodObject(period);
    const isYearly = normP.month === 'سجل نهاية السنة';

    let deletedStudents = [];
    try {
      deletedStudents = JSON.parse(localStorage.getItem('deleted_students') || '[]').map(String);
    } catch (e) {}

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['students', 'student_records'], 'readonly');
      const stuStore = tx.objectStore('students');
      const recStore = tx.objectStore('student_records');

      const allStuReq = stuStore.getAll();
      allStuReq.onsuccess = () => {
        const rawStudents = allStuReq.result || [];
        const circleStudentsMap = new Map();

        rawStudents.forEach(s => {
          if (!s || typeof s !== 'object') return;
          const sid = normalizeStudentId(s.id !== undefined ? s.id : s.student_id);
          const scid = normalizeCircleId(s.circle_id);
          if (sid === null || String(scid) !== String(cleanCid)) return;
          if (deletedStudents.includes(String(sid)) || s.is_deleted === 1 || s.is_deleted === true) return;
          circleStudentsMap.set(String(sid), stripRecordFieldsFromStudent({ ...s, id: sid, circle_id: cleanCid }));
        });

        // Also check base student list in localStorage in case IndexedDB was cleared
        if (circleStudentsMap.size === 0) {
          try {
            const rawBase = localStorage.getItem(`albayan_circle_students_base_${cleanCid}`);
            if (rawBase) {
              const parsedBase = JSON.parse(rawBase);
              if (Array.isArray(parsedBase)) {
                parsedBase.forEach(s => {
                  const sid = normalizeStudentId(s.id);
                  if (sid !== null && !deletedStudents.includes(String(sid)) && !s.is_deleted) {
                    circleStudentsMap.set(String(sid), stripRecordFieldsFromStudent({ ...s, id: sid, circle_id: cleanCid }));
                  }
                });
              }
            }
          } catch (e) {}
        }

        const students = Array.from(circleStudentsMap.values());
        if (students.length === 0) {
          resolve([]);
          return;
        }

        const allRecsReq = recStore.getAll();
        allRecsReq.onsuccess = () => {
          const allRecs = allRecsReq.result || [];

          if (isYearly) {
            // Compute yearly cumulative summary across all records of this year
            const result = students.map(s => {
              const sidStr = String(s.id);
              const studentYearRecs = allRecs.filter(r => {
                const rSid = normalizeStudentId(r.student_id !== undefined ? r.student_id : r.id);
                const rYear = String(r.year || '1448').replace(/\D/g, '') || '1448';
                const rMonth = normalizeMonthName(r.month);
                return String(rSid) === sidStr && rYear === normP.year && rMonth !== 'سجل نهاية السنة' && hasMeaningfulRecordData(r);
              });

              if (studentYearRecs.length === 0) {
                return { ...s, ...createBlankRecordFields(normP) };
              }

              let totalMemoPages = 0;
              let totalSardPages = 0;
              let totalAbsentDays = 0;
              const avgFields = ['memo_grade', 'rev_grade', 'activity_mark', 'fiqh', 'tafsir', 'adhkar', 'seerah'];
              const sums = {};
              const counts = {};
              avgFields.forEach(k => { sums[k] = 0; counts[k] = 0; });

              let firstFromSurah = '';
              let firstFromAyah = 0;
              let lastToSurah = '';
              let lastToAyah = 0;
              let firstRevFromSurah = '';
              let firstRevFromAyah = 0;
              let lastRevToSurah = '';
              let lastRevToAyah = 0;

              studentYearRecs.forEach(r => {
                totalMemoPages += Number(r.memo_pages || 0);
                totalSardPages += Number(r.sard_pages || 0);
                totalAbsentDays += Number(r.absent_days || 0);
                avgFields.forEach(k => {
                  const val = parseFloat(r[k]);
                  if (!isNaN(val) && val > 0) {
                    sums[k] += val;
                    counts[k] += 1;
                  }
                });
                if (r.from_surah && !firstFromSurah) {
                  firstFromSurah = r.from_surah;
                  firstFromAyah = r.from_ayah || 1;
                }
                if (r.to_surah) {
                  lastToSurah = r.to_surah;
                  lastToAyah = r.to_ayah || 1;
                }
                if (r.rev_from_surah && !firstRevFromSurah) {
                  firstRevFromSurah = r.rev_from_surah;
                  firstRevFromAyah = r.rev_from_ayah || 1;
                }
                if (r.rev_to_surah) {
                  lastRevToSurah = r.rev_to_surah;
                  lastRevToAyah = r.rev_to_ayah || 1;
                }
              });

              const summaryRec = {
                ...createBlankRecordFields(normP),
                from_surah: firstFromSurah,
                from_ayah: firstFromAyah,
                to_surah: lastToSurah,
                to_ayah: lastToAyah,
                rev_from_surah: firstRevFromSurah,
                rev_from_ayah: firstRevFromAyah,
                rev_to_surah: lastRevToSurah,
                rev_to_ayah: lastRevToAyah,
                memo_pages: Math.round(totalMemoPages * 10) / 10,
                sard_pages: Math.round(totalSardPages * 10) / 10,
                absent_days: totalAbsentDays
              };
              avgFields.forEach(k => {
                summaryRec[k] = counts[k] > 0 ? Math.round((sums[k] / counts[k]) * 10) / 10 : '';
              });

              return { ...s, ...summaryRec };
            });

            resolve(result);
            return;
          }

          // Specific period lookup (strictly isolated by period)
          const result = students.map(s => {
            const sidStr = String(s.id);
            const candidates = allRecs.filter(r => {
              const rSid = normalizeStudentId(r.student_id !== undefined ? r.student_id : r.id);
              if (String(rSid) !== sidStr) return false;
              const rPType = String(r.period_type || 'monthly').trim() || 'monthly';
              const rYear = String(r.year || '1448').replace(/\D/g, '') || '1448';
              if (rPType !== normP.period_type || rYear !== normP.year) return false;
              if (normP.period_type === 'daily') {
                return (r.record_date && r.record_date === normP.record_date) || isSameNormalizedMonth(r.month, normP.month);
              }
              return isSameNormalizedMonth(r.month, normP.month);
            });

            const blank = createBlankRecordFields(normP);
            if (candidates.length === 0) {
              return { ...s, ...blank };
            }

            // Sort candidates by updated_at ascending so newest overwrites older
            const canonicalRecId = buildCanonicalRecordId(s.id, normP);
            candidates.sort((a, b) => {
              const tA = new Date(a.updated_at || 0).getTime() || 0;
              const tB = new Date(b.updated_at || 0).getTime() || 0;
              if (tA !== tB) return tA - tB;
              return (a.id === canonicalRecId ? 1 : 0) - (b.id === canonicalRecId ? 1 : 0);
            });

            const mergedRec = { ...blank };
            candidates.forEach(cand => {
              const isAuthoritative = Boolean(cand.updated_at) || cand.id === canonicalRecId;
              GRADE_AND_RECORD_FIELDS.forEach(field => {
                const v = cand[field];
                if (v === undefined) return;
                if (v !== null && v !== '') {
                  mergedRec[field] = v;
                } else if (isAuthoritative) {
                  mergedRec[field] = blank[field] !== undefined ? blank[field] : '';
                }
              });
            });

            mergedRec.period_type = normP.period_type;
            mergedRec.month = normP.month;
            mergedRec.year = normP.year;
            mergedRec.record_date = normP.record_date;

            return {
              ...s,
              ...mergedRec,
              id: s.id,
              circle_id: cleanCid,
              name: s.name
            };
          });

          resolve(result);
        };

        allRecsReq.onerror = () => {
          resolve(students.map(s => ({ ...s, ...createBlankRecordFields(normP) })));
        };
      };

      allStuReq.onerror = () => resolve([]);
    });
  }

  async function updateLocalStudentRecord(circleId, studentId, fields, period = {}) {
    const cleanCid = normalizeCircleId(circleId);
    const cleanSid = normalizeStudentId(studentId);
    const normP = normalizePeriodObject(period);
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['students', 'student_records', 'sync_queue'], 'readwrite');
      const stuStore = tx.objectStore('students');
      const recStore = tx.objectStore('student_records');
      const syncStore = tx.objectStore('sync_queue');

      // 1. Update student name/circle_id in students store if present
      if (fields.name !== undefined || fields.circle_id !== undefined) {
        const sReq = stuStore.get(cleanSid);
        sReq.onsuccess = () => {
          const st = sReq.result || { id: cleanSid, circle_id: cleanCid, name: fields.name || '' };
          if (fields.name !== undefined) st.name = fields.name;
          if (fields.circle_id !== undefined) st.circle_id = normalizeCircleId(fields.circle_id);
          st.updated_at = new Date().toISOString();
          stuStore.put(stripRecordFieldsFromStudent(st));
        };
      }

      // 2. Upsert period-specific record safely and remove any non-canonical duplicates for this student+period
      const canonicalRecId = buildCanonicalRecordId(cleanSid, normP);
      const blankRecFields = createBlankRecordFields(normP);
      const normalizedFields = { ...fields };
      Object.keys(normalizedFields).forEach(k => {
        if (normalizedFields[k] === null) {
          normalizedFields[k] = blankRecFields[k] !== undefined ? blankRecFields[k] : '';
        }
      });

      const allRecsReq = recStore.getAll();
      allRecsReq.onsuccess = () => {
        const allRecs = allRecsReq.result || [];
        const matchingRecs = allRecs.filter(r => {
          if (!r || String(normalizeStudentId(r.student_id || r.id)) !== String(cleanSid)) return false;
          if ((r.period_type || 'monthly') !== normP.period_type) return false;
          if (String(r.year || '').replace(/\D/g, '') !== normP.year) return false;
          if (normP.period_type === 'daily') {
            return (r.record_date && r.record_date === normP.record_date) || isSameNormalizedMonth(r.month, normP.month);
          }
          return isSameNormalizedMonth(r.month, normP.month);
        });

        let baseRec = {
          id: canonicalRecId,
          ...blankRecFields,
          student_id: cleanSid,
          circle_id: cleanCid
        };

        matchingRecs.forEach(r => {
          GRADE_AND_RECORD_FIELDS.forEach(f => {
            if (r[f] !== undefined && r[f] !== null && r[f] !== '') {
              baseRec[f] = r[f];
            }
          });
          if (r.id && r.id !== canonicalRecId) {
            recStore.delete(r.id);
          }
        });

        Object.assign(baseRec, normalizedFields, {
          id: canonicalRecId,
          student_id: cleanSid,
          circle_id: cleanCid,
          period_type: normP.period_type,
          month: normP.month,
          year: normP.year,
          record_date: normP.record_date,
          updated_at: new Date().toISOString()
        });
        recStore.put(baseRec);
      };

      // 3. Enqueue in outbox with explicit period metadata
      syncStore.add({
        action: 'UPDATE_STUDENT_RECORD',
        entity: 'students',
        entity_id: cleanSid,
        circle_id: cleanCid,
        period_key: normP.period_key,
        payload: {
          id: cleanSid,
          student_id: cleanSid,
          circle_id: cleanCid,
          ...normalizedFields,
          period_type: normP.period_type,
          record_date: normP.record_date,
          year: normP.year,
          month: normP.month,
          updated_at: new Date().toISOString()
        },
        status: 'pending',
        timestamp: Date.now()
      });

      tx.oncomplete = () => {
        // Also update period-isolated localStorage snapshot if present
        try {
          const lsKey = `albayan_cached_students_${cleanCid}_${normP.period_key}`;
          const raw = localStorage.getItem(lsKey);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const target = list.find(item => String(normalizeStudentId(item.id)) === String(cleanSid));
              if (target) {
                Object.assign(target, normalizedFields);
                localStorage.setItem(lsKey, JSON.stringify(list));
              }
            }
          }
        } catch (e) {}
        resolve(true);
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteLocalStudent(studentId, circleId = null) {
    const cleanSid = normalizeStudentId(studentId);
    if (cleanSid === null || cleanSid === undefined) return false;
    const rawId = String(cleanSid);

    try {
      const deletedStudents = JSON.parse(localStorage.getItem('deleted_students') || '[]').map(String);
      if (!deletedStudents.includes(rawId)) {
        deletedStudents.push(rawId);
        localStorage.setItem('deleted_students', JSON.stringify(deletedStudents));
      }
    } catch (e) {}

    // Purge from all localStorage student caches
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('albayan_cached_students_') || k.startsWith('albayan_circle_students_base_'))) {
          try {
            const arr = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(arr)) {
              const filtered = arr.filter(s => String(normalizeStudentId(s.id)) !== rawId);
              localStorage.setItem(k, JSON.stringify(filtered));
            }
          } catch (err) {}
        }
      }
    } catch (e) {}

    const db = await openDB();
    return new Promise((resolve) => {
      const stores = ['students', 'student_records', 'sync_queue'].filter(s => db.objectStoreNames.contains(s));
      const tx = db.transaction(stores, 'readwrite');
      const stuStore = tx.objectStore('students');

      stuStore.delete(cleanSid);
      stuStore.delete(rawId);
      if (!isNaN(Number(rawId))) stuStore.delete(Number(rawId));

      if (tx.objectStoreNames.contains('student_records')) {
        const recStore = tx.objectStore('student_records');
        const allRecsReq = recStore.getAll();
        allRecsReq.onsuccess = () => {
          (allRecsReq.result || []).forEach(r => {
            if (String(normalizeStudentId(r.student_id)) === rawId || String(normalizeStudentId(r.id)) === rawId) {
              recStore.delete(r.id);
            }
          });
        };
      }

      if (tx.objectStoreNames.contains('sync_queue')) {
        const qStore = tx.objectStore('sync_queue');
        const qReq = qStore.getAll();
        qReq.onsuccess = () => {
          (qReq.result || []).forEach(item => {
            if (
              String(normalizeStudentId(item.entity_id)) === rawId &&
              item.action !== 'DELETE_STUDENT'
            ) {
              qStore.delete(item.qid);
            }
          });
          qStore.add({
            action: 'DELETE_STUDENT',
            entity: 'students',
            entity_id: cleanSid,
            circle_id: normalizeCircleId(circleId),
            payload: { id: cleanSid, circle_id: normalizeCircleId(circleId) },
            status: 'pending',
            timestamp: Date.now()
          });
        };
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  /**
   * Returns pending student changes filtered by circleId AND optional period!
   * Prevents pending grade edits in one month from bleeding into another month.
   */
  async function getPendingStudentChanges(circleId = null, period = null) {
    try {
      const pending = await getPendingSyncQueue();
      const map = {};
      const cleanCid = circleId !== null && circleId !== undefined ? String(normalizeCircleId(circleId)) : null;
      const normP = period ? normalizePeriodObject(period) : null;

      pending.forEach(item => {
        if (item.entity === 'students' && item.payload) {
          const itemCid = item.circle_id || item.payload.circle_id;
          if (cleanCid && itemCid && String(normalizeCircleId(itemCid)) !== cleanCid) {
            return;
          }
          const sid = normalizeStudentId(item.entity_id || item.payload.student_id || item.payload.id);
          if (!sid) return;

          if (item.action === 'CREATE_STUDENT') {
            map[sid] = {
              ...(map[sid] || {}),
              id: sid,
              circle_id: normalizeCircleId(itemCid || circleId),
              name: item.payload.name
            };
          } else if (item.action === 'UPDATE_STUDENT_RECORD' || item.action === 'UPDATE_GRADE' || item.action === 'UPDATE_PROGRESS') {
            // Only apply record grade fields if period matches (or no period filter was passed)
            if (normP) {
              const itemPeriod = normalizePeriodObject(item.payload);
              if (itemPeriod.period_key !== normP.period_key) {
                return;
              }
            }
            map[sid] = { ...(map[sid] || {}), ...item.payload };
          }
        }
      });
      return map;
    } catch (e) {
      return {};
    }
  }

  // ===========================================================================
  // 5. EXAMS, QUESTIONS, USERS, SETTINGS
  // ===========================================================================

  async function cacheExams(examsList) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['exams'], 'readwrite');
      const store = tx.objectStore('exams');

      let deletedExams = [];
      try {
        deletedExams = JSON.parse(localStorage.getItem('deleted_exams') || '[]').map(String);
      } catch (e) {}

      store.clear();
      (examsList || []).forEach(ex => {
        if (!ex || typeof ex !== 'object') return;
        const cleanId = normalizeEntityId(ex.id !== undefined ? ex.id : ex.local_id, 'exams');
        if (cleanId !== null && !deletedExams.includes(String(cleanId))) {
          store.put({ ...ex, id: cleanId });
        }
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteLocalExam(examId) {
    if (examId === undefined || examId === null) return false;
    const cleanId = normalizeEntityId(examId, 'exams');
    const rawId = String(cleanId);

    try {
      const deletedExams = JSON.parse(localStorage.getItem('deleted_exams') || '[]').map(String);
      if (!deletedExams.includes(rawId)) {
        deletedExams.push(rawId);
        localStorage.setItem('deleted_exams', JSON.stringify(deletedExams));
      }
    } catch (e) {}

    const db = await openDB();
    return new Promise((resolve) => {
      const stores = ['exams', 'exam_questions'].filter(s => db.objectStoreNames.contains(s));
      const tx = db.transaction(stores, 'readwrite');
      const exStore = tx.objectStore('exams');
      exStore.delete(cleanId);
      exStore.delete(rawId);
      if (!isNaN(Number(rawId))) exStore.delete(Number(rawId));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async function getLocalExams() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['exams'], 'readonly');
      const store = tx.objectStore('exams');
      const req = store.getAll();
      req.onsuccess = () => {
        let deletedExams = [];
        try {
          deletedExams = JSON.parse(localStorage.getItem('deleted_exams') || '[]').map(String);
        } catch (e) {}
        const list = (req.result || []).filter(ex => ex && !deletedExams.includes(String(ex.id)));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  }

  async function cacheExamQuestions(examId, questionsData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['exam_questions'], 'readwrite');
      const store = tx.objectStore('exam_questions');
      store.put({
        exam_id: Number(examId) || examId,
        data: questionsData,
        updated_at: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function getLocalExamQuestions(examId) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['exam_questions'], 'readonly');
      const store = tx.objectStore('exam_questions');
      const req = store.get(Number(examId) || examId);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  }

  async function saveUsers(usersList) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['users'], 'readwrite');
      const store = tx.objectStore('users');

      let deletedUsers = [];
      try {
        deletedUsers = JSON.parse(localStorage.getItem('deleted_users') || '[]').map(String);
      } catch (e) {}

      store.clear();
      (usersList || []).forEach(u => {
        if (!u || typeof u !== 'object') return;
        const cleanId = normalizeEntityId(u.id !== undefined ? u.id : u.local_id, 'users');
        if (cleanId !== null && !deletedUsers.includes(String(cleanId))) {
          store.put({ ...u, id: cleanId });
        }
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteLocalUser(userId) {
    if (userId === undefined || userId === null) return false;
    const cleanId = normalizeEntityId(userId, 'users');
    const rawId = String(cleanId);

    try {
      const deletedUsers = JSON.parse(localStorage.getItem('deleted_users') || '[]').map(String);
      if (!deletedUsers.includes(rawId)) {
        deletedUsers.push(rawId);
        localStorage.setItem('deleted_users', JSON.stringify(deletedUsers));
      }
    } catch (e) {}

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['users'], 'readwrite');
      const uStore = tx.objectStore('users');
      uStore.delete(cleanId);
      uStore.delete(rawId);
      if (!isNaN(Number(rawId))) uStore.delete(Number(rawId));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async function getUsers() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['users'], 'readonly');
      const store = tx.objectStore('users');
      const req = store.getAll();
      req.onsuccess = () => {
        let deletedUsers = [];
        try {
          deletedUsers = JSON.parse(localStorage.getItem('deleted_users') || '[]').map(String);
        } catch (e) {}
        const list = (req.result || []).filter(u => u && !deletedUsers.includes(String(u.id)));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  }

  async function saveSetting(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: String(key), value, updated_at: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function getSetting(key, defaultValue = null) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(String(key));
      req.onsuccess = () => resolve(req.result !== undefined ? req.result.value : defaultValue);
      req.onerror = () => resolve(defaultValue);
    });
  }

  // ===========================================================================
  // 6. OUTBOX SYNC QUEUE MANAGEMENT
  // ===========================================================================

  async function enqueueChange(action, entity, entityId, payload) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.add({
        action,
        entity,
        entity_id: entityId,
        payload,
        status: 'pending',
        timestamp: Date.now()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getPendingSyncQueue() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['sync_queue'], 'readonly');
      const store = tx.objectStore('sync_queue');
      const idx = store.index('status');
      const req = idx.getAll('pending');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function markChangeSynced(qid) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['sync_queue'], 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.delete(qid);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  // ===========================================================================
  // 7. FULL DATABASE EXPORT & IMPORT (CONFLICT-FREE)
  // ===========================================================================

  async function exportFullDatabase() {
    const db = await openDB();
    const storeNames = ['circles', 'students', 'student_records', 'exams', 'exam_questions', 'users', 'settings'];
    const result = {
      version: DB_VERSION,
      exported_at: new Date().toISOString(),
      stores: {}
    };

    for (const name of storeNames) {
      if (!db.objectStoreNames.contains(name)) continue;
      result.stores[name] = await new Promise((resolve) => {
        const tx = db.transaction([name], 'readonly');
        const store = tx.objectStore(name);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }
    return result;
  }

  async function importFullDatabase(dump, options = { clearExisting: false }) {
    if (!dump || !dump.stores) throw new Error('Invalid database dump format');
    const db = await openDB();
    const storeNames = Object.keys(dump.stores).filter(n => db.objectStoreNames.contains(n));

    let pendingChanges = [];
    if (db.objectStoreNames.contains('sync_queue')) {
      try {
        pendingChanges = await getPendingSyncQueue();
      } catch (e) {}
    }

    const dirtyStudentIds = new Set();
    const deletedStudentIds = new Set();
    const deletedCircleIds = new Set();

    try {
      JSON.parse(localStorage.getItem('deleted_circles') || '[]').forEach(id => deletedCircleIds.add(String(id)));
      JSON.parse(localStorage.getItem('deleted_students') || '[]').forEach(id => deletedStudentIds.add(String(id)));
    } catch (e) {}

    pendingChanges.forEach(item => {
      if (item.entity === 'students') {
        const sid = normalizeStudentId(item.entity_id || (item.payload && (item.payload.student_id || item.payload.id)));
        if (item.action === 'DELETE_STUDENT' && sid !== null) {
          deletedStudentIds.add(String(sid));
        } else if (sid !== null) {
          dirtyStudentIds.add(String(sid));
        }
      } else if (item.entity === 'circles' && item.action === 'DELETE_CIRCLE') {
        const cid = normalizeCircleId(item.entity_id || (item.payload && item.payload.id));
        if (cid !== null) deletedCircleIds.add(String(cid));
      }
    });

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        const store = tx.objectStore(name);
        const items = dump.stores[name] || [];

        if (options.clearExisting && items.length > 0 && name !== 'students' && name !== 'student_records' && name !== 'circles') {
          store.clear();
        }

        items.forEach(item => {
          if (!item || typeof item !== 'object') return;

          if (name === 'circles') {
            const cid = normalizeCircleId(item.id !== undefined ? item.id : item.local_id);
            if (cid === null || deletedCircleIds.has(String(cid)) || item.is_deleted) return;
            store.put({ ...item, id: cid, local_id: cid });
            return;
          }

          if (name === 'students') {
            const sid = normalizeStudentId(item.id !== undefined ? item.id : item.student_id);
            const cid = normalizeCircleId(item.circle_id);
            if (sid === null || deletedStudentIds.has(String(sid)) || deletedCircleIds.has(String(cid)) || item.is_deleted) return;
            if (dirtyStudentIds.has(String(sid))) return;
            store.put(stripRecordFieldsFromStudent({ ...item, id: sid, circle_id: cid }));
            return;
          }

          if (name === 'student_records') {
            const sid = normalizeStudentId(item.student_id !== undefined ? item.student_id : item.id);
            if (sid === null || deletedStudentIds.has(String(sid)) || dirtyStudentIds.has(String(sid))) return;
            safeUpsertStudentRecordInStore(store, item);
            return;
          }

          try {
            store.put(item);
          } catch (e) {}
        });
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // ===========================================================================
  // 8. BACKGROUND OUTBOX FLUSH TO SERVER / FIREBASE
  // ===========================================================================

  async function processSyncQueue() {
    if (syncInProgress || !navigator.onLine) return { synced: 0, remaining: 0 };
    syncInProgress = true;

    let syncedCount = 0;
    try {
      const pending = await getPendingSyncQueue();
      if (pending.length === 0) {
        syncInProgress = false;
        return { synced: 0, remaining: 0 };
      }

      for (const item of pending) {
        let success = false;
        try {
          if (item.action === 'UPDATE_STUDENT_RECORD' || item.action === 'UPDATE_GRADE' || item.action === 'UPDATE_PROGRESS') {
            if (window.RosterService && typeof window.RosterService.syncPendingRecordItem === 'function') {
              success = await window.RosterService.syncPendingRecordItem(item);
            } else if (typeof window.saveStudentToFirebase === 'function') {
              const p = item.payload || {};
              const fbOk = await window.saveStudentToFirebase(p, {
                period_type: p.period_type || 'monthly',
                year: p.year || '1448',
                month: p.month || 'صفر',
                record_date: p.record_date || ''
              });
              if (fbOk) success = true;
            }
          } else if (item.action === 'CREATE_STUDENT') {
            const p = item.payload || {};
            if (typeof window.saveStudentToFirebase === 'function') {
              const fbOk = await window.saveStudentToFirebase(p, {
                period_type: p.period_type || 'monthly',
                year: p.year || '1448',
                month: p.month || 'صفر',
                record_date: p.record_date || ''
              });
              if (fbOk) success = true;
            }
          } else if (item.action === 'DELETE_STUDENT') {
            if (window.RosterService && typeof window.RosterService.deleteStudentFromCloudOnly === 'function') {
              success = await window.RosterService.deleteStudentFromCloudOnly(item.entity_id, item.circle_id);
            }
          } else if (item.action === 'CREATE_CIRCLE' || item.action === 'UPDATE_CIRCLE') {
            if (typeof window.saveCircleToFirebase === 'function' && item.payload) {
              const fbOk = await window.saveCircleToFirebase(item.payload);
              if (fbOk) success = true;
            }
          } else if (item.action === 'DELETE_CIRCLE') {
            if (typeof window.deleteCircleFromFirebase === 'function') {
              const fbOk = await window.deleteCircleFromFirebase(item.entity_id);
              if (fbOk) success = true;
            }
          }
        } catch (netErr) {
          break;
        }

        if (success) {
          await markChangeSynced(item.qid);
          syncedCount++;
        }
      }

      const remaining = await getPendingSyncQueue();
      syncInProgress = false;

      if (syncedCount > 0) {
        window.dispatchEvent(new CustomEvent('albayan:local-sync-complete', {
          detail: { synced: syncedCount, remaining: remaining.length }
        }));
      }

      return { synced: syncedCount, remaining: remaining.length };
    } catch (err) {
      syncInProgress = false;
      return { synced: syncedCount, remaining: -1 };
    }
  }

  window.addEventListener('online', () => {
    processSyncQueue();
  });

  document.addEventListener('DOMContentLoaded', () => {
    openDB().then(() => {
      setTimeout(processSyncQueue, 1500);
    }).catch(() => {});
  });

  window.AlbayanLocalDB = {
    openDB,
    normalizeCircleId,
    normalizeStudentId,
    normalizePeriodObject,
    isSameNormalizedMonth,
    buildCanonicalRecordId,
    cacheCircles,
    saveLocalCircle,
    deleteLocalCircle,
    getLocalCircles,
    getCircles: getLocalCircles,
    saveCircles: cacheCircles,
    cacheStudents,
    getLocalStudents,
    getStudents: getLocalStudents,
    saveStudents: cacheStudents,
    updateLocalStudentRecord,
    deleteLocalStudent,
    cacheExams,
    deleteLocalExam,
    getLocalExams,
    getExams: getLocalExams,
    saveExams: cacheExams,
    cacheExamQuestions,
    getLocalExamQuestions,
    saveUsers,
    deleteLocalUser,
    getUsers,
    saveSetting,
    getSetting,
    enqueueChange,
    getPendingSyncQueue,
    getPendingStudentChanges,
    markChangeSynced,
    processSyncQueue,
    exportFullDatabase,
    importFullDatabase
  };
})();
