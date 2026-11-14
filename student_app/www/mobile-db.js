/**
 * ALBAYAN QURAN SCHOOL - EMBEDDED MOBILE & OFFLINE DATABASE ENGINE
 * High-performance, zero-dependency IndexedDB storage for offline-first operations.
 * Enables the mobile app to function completely standalone without a server.
 */

(function (window) {
  'use strict';

  const DB_NAME = 'AlbayanOfflineDB';
  const DB_VERSION = 2;
  let dbInstance = null;

  /**
   * Initialize and open the local IndexedDB database
   */
  function openLocalDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        return resolve(dbInstance);
      }

      if (!window.indexedDB) {
        console.warn('IndexedDB is not supported on this device/browser.');
        return reject(new Error('IndexedDB not supported'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (e) {
        const db = e.target.result;

        // 1. Circles Store
        if (!db.objectStoreNames.contains('circles')) {
          const circleStore = db.createObjectStore('circles', { keyPath: 'id' });
          circleStore.createIndex('teacher_id', 'teacher_id', { unique: false });
        }

        // 2. Students Store
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('circle_id', 'circle_id', { unique: false });
        }

        // 3. Student Period Records (Attendance, Grades, Accompanying marks)
        if (!db.objectStoreNames.contains('student_records')) {
          const recordStore = db.createObjectStore('student_records', { keyPath: 'id', autoIncrement: true });
          recordStore.createIndex('student_circle', ['circle_id', 'period_type', 'month', 'year'], { unique: false });
          recordStore.createIndex('student_period', ['student_id', 'period_type', 'month', 'year'], { unique: true });
        }

        // 4. Exams Store
        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' });
        }

        // 5. Exam Results Store
        if (!db.objectStoreNames.contains('results')) {
          const resultStore = db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
          resultStore.createIndex('exam_id', 'exam_id', { unique: false });
        }

        // 6. Users & Staff Store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('role', 'role', { unique: false });
        }

        // 7. Student CVs Store
        if (!db.objectStoreNames.contains('student_cvs')) {
          const cvStore = db.createObjectStore('student_cvs', { keyPath: 'id' });
          cvStore.createIndex('student_id', 'student_id', { unique: false });
        }

        // 8. Certificates Store
        if (!db.objectStoreNames.contains('certificates')) {
          db.createObjectStore('certificates', { keyPath: 'id' });
        }

        // 9. App Settings Store
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings', { keyPath: 'key' });
        }

        // 10. Pending Sync Queue (Outbox of changes waiting to be pushed)
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'queue_id', autoIncrement: true });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 11. System & Meta Key-Value Store
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = function (e) {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      request.onerror = function (e) {
        console.error('Failed to open AlbayanOfflineDB:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * Helper to run a transaction
   */
  async function withStore(storeName, mode, callback) {
    const db = await openLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;

      try {
        result = callback(store);
      } catch (err) {
        return reject(err);
      }

      tx.oncomplete = () => resolve(result);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // =========================================================================
  // CIRCLES CACHE & OFFLINE STORE
  // =========================================================================

  async function saveLocalCircle(circle) {
    if (!circle) return;
    const rawId = circle.id !== undefined ? circle.id : circle.local_id;
    const cleanId = String(rawId || '').replace(/^circles_/, '').trim();
    const targetId = Number(cleanId) || cleanId;
    if (!targetId) return;

    return withStore('circles', 'readwrite', (store) => {
      store.put({
        ...circle,
        id: targetId,
        local_id: targetId,
        _cached_at: new Date().toISOString()
      });
    });
  }

  async function cacheCircles(circlesList, replaceAll = false) {
    if (!Array.isArray(circlesList) || circlesList.length === 0) return;
    return withStore('circles', 'readwrite', (store) => {
      if (replaceAll) {
        store.clear();
      }
      circlesList.forEach((c) => {
        if (!c) return;
        const rawId = c.id !== undefined ? c.id : c.local_id;
        const cleanId = String(rawId || '').replace(/^circles_/, '').trim();
        const targetId = Number(cleanId) || cleanId;
        if (!targetId) return;

        store.put({
          ...c,
          id: targetId,
          local_id: targetId,
          _cached_at: new Date().toISOString()
        });
      });
    });
  }

  async function getLocalCircles() {
    return withStore('circles', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  async function deleteLocalCircle(circleId) {
    const rawId = String(circleId || '').replace(/^circles_/, '').trim();
    const numId = Number(rawId);
    return withStore('circles', 'readwrite', (store) => {
      if (!isNaN(numId)) store.delete(numId);
      store.delete(rawId);
      store.delete(`circles_${rawId}`);
    });
  }

  // =========================================================================
  // STUDENTS & ROSTER CACHE & OFFLINE STORE
  // =========================================================================

  async function cacheStudents(circleId, studentsList, periodPayload = {}) {
    if (!Array.isArray(studentsList)) return;
    const db = await openLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['students', 'student_records'], 'readwrite');
      const studentStore = tx.objectStore('students');
      const recordStore = tx.objectStore('student_records');

      const normCid = Number(circleId) || circleId;
      const periodType = String(periodPayload.period_type || 'monthly').trim();
      const month = String(periodPayload.month || 'صفر').trim();
      const year = String(periodPayload.year || '1448').replace(/\D/g, '') || '1448';

      studentsList.forEach((s) => {
        if (!s) return;
        const sId = Number(s.id) || s.id;

        // Save student base info (preserving existing valid name if incoming is dummy)
        const getStudentReq = studentStore.get(sId);
        getStudentReq.onsuccess = function () {
          const currentStudent = getStudentReq.result || {};
          studentStore.put({
            id: sId,
            circle_id: normCid,
            name: s.name || currentStudent.name || `طالب ${sId}`,
            phone: s.phone !== undefined ? s.phone : (currentStudent.phone || ''),
            notes: s.notes !== undefined ? s.notes : (currentStudent.notes || ''),
            created_at: s.created_at || currentStudent.created_at || new Date().toISOString()
          });
        };

        // Save student period record with ALL actual database fields
        const recordData = {
          student_id: sId,
          circle_id: normCid,
          period_type: periodType,
          month: month,
          year: year,
          record_date: periodPayload.record_date || s.record_date || '',
          from_surah: s.from_surah !== undefined ? s.from_surah : (s.memo_surah || ''),
          from_ayah: s.from_ayah !== undefined && s.from_ayah !== null ? Number(s.from_ayah) : (s.memo_ayah || 0),
          to_surah: s.to_surah !== undefined ? s.to_surah : '',
          to_ayah: s.to_ayah !== undefined && s.to_ayah !== null ? Number(s.to_ayah) : 0,
          rev_from_surah: s.rev_from_surah !== undefined ? s.rev_from_surah : (s.rev_surah || ''),
          rev_from_ayah: s.rev_from_ayah !== undefined && s.rev_from_ayah !== null ? Number(s.rev_from_ayah) : (s.rev_ayah || 0),
          rev_to_surah: s.rev_to_surah !== undefined ? s.rev_to_surah : '',
          rev_to_ayah: s.rev_to_ayah !== undefined && s.rev_to_ayah !== null ? Number(s.rev_to_ayah) : 0,
          memo_pages: s.memo_pages !== undefined && s.memo_pages !== null ? Number(s.memo_pages) : 0,
          rev_pages: s.rev_pages !== undefined && s.rev_pages !== null ? Number(s.rev_pages) : 0,
          sard_pages: s.sard_pages !== undefined && s.sard_pages !== null ? Number(s.sard_pages) : 0,
          memo_grade: (s.memo_grade !== undefined && s.memo_grade !== null && s.memo_grade !== '') ? s.memo_grade : null,
          rev_grade: (s.rev_grade !== undefined && s.rev_grade !== null && s.rev_grade !== '') ? s.rev_grade : null,
          absent_days: s.absent_days !== undefined && s.absent_days !== null ? Number(s.absent_days) : 0,
          attendance_grade: s.attendance_grade !== undefined ? s.attendance_grade : 30,
          activity_mark: (s.activity_mark !== undefined && s.activity_mark !== null && s.activity_mark !== '') ? s.activity_mark : (s.activity_grade || null),
          fiqh: (s.fiqh !== undefined && s.fiqh !== null && s.fiqh !== '') ? s.fiqh : (s.fiqh_grade || null),
          tafsir: (s.tafsir !== undefined && s.tafsir !== null && s.tafsir !== '') ? s.tafsir : (s.tafsir_grade || null),
          adhkar: (s.adhkar !== undefined && s.adhkar !== null && s.adhkar !== '') ? s.adhkar : (s.adhkar_grade || null),
          seerah: (s.seerah !== undefined && s.seerah !== null && s.seerah !== '') ? s.seerah : (s.seerah_grade || null),
          exam_grade: s.exam_grade || 'لم يختبر بعد',
          total_score: s.total_score !== undefined ? s.total_score : 0,
          percentage: s.percentage !== undefined ? s.percentage : 0,
          // Legacy aliases for full backward compatibility
          memo_surah: s.from_surah || s.memo_surah || '',
          memo_ayah: s.from_ayah || s.memo_ayah || 0,
          rev_surah: s.rev_from_surah || s.rev_surah || '',
          rev_ayah: s.rev_from_ayah || s.rev_ayah || 0,
          activity_grade: s.activity_mark || s.activity_grade || 0,
          fiqh_grade: s.fiqh || s.fiqh_grade || 0,
          tafsir_grade: s.tafsir || s.tafsir_grade || 0,
          adhkar_grade: s.adhkar || s.adhkar_grade || 0,
          seerah_grade: s.seerah || s.seerah_grade || 0,
          _cached_at: new Date().toISOString()
        };

        // Use indexed lookup to update without erasing existing valid data
        const index = recordStore.index('student_period');
        const key = [sId, periodType, month, year];
        const getReq = index.get(key);
        getReq.onsuccess = function () {
          if (getReq.result) {
            const existing = getReq.result;
            recordData.id = existing.id;
            // Merge so non-empty incoming fields overwrite, but existing values are not wiped
            const merged = { ...existing };
            Object.keys(recordData).forEach(k => {
              if (recordData[k] !== undefined && recordData[k] !== null && recordData[k] !== '') {
                merged[k] = recordData[k];
              }
            });
            recordStore.put(merged);
          } else {
            recordStore.put(recordData);
          }
        };
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function generateUUID() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9) + '_' + Math.random().toString(36).substring(2, 9);
  }

  async function getLocalStudents(circleId, periodPayload = {}) {
    const db = await openLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['students', 'student_records'], 'readonly');
      const studentStore = tx.objectStore('students');
      const recordStore = tx.objectStore('student_records');
      const studentIndex = studentStore.index('circle_id');

      const targetId = Number(circleId) || circleId;
      const strId = String(circleId);

      const handleFinalStudents = function (rawStudents) {
        const studentMap = new Map();
        (rawStudents || []).forEach(s => {
          if (s && s.is_deleted !== 1 && s._deleted !== true) {
            const sid = Number(s.id) || s.id;
            if (!studentMap.has(sid) || (s.name && !studentMap.get(sid).name)) {
              studentMap.set(sid, { ...s, id: sid });
            }
          }
        });
        const students = Array.from(studentMap.values());
        if (!students || students.length === 0) return resolve([]);

        const periodType = String(periodPayload.period_type || 'monthly').trim();
        const month = String(periodPayload.month || 'صفر').trim();
        const year = String(periodPayload.year || '1448').replace(/\D/g, '') || '1448';

        const recordIndex = recordStore.index('student_period');
        let completed = 0;
        const mergedList = [];

        students.forEach((st) => {
          const sid = Number(st.id) || st.id;
          const recReq = recordIndex.get([sid, periodType, month, year]);
          recReq.onsuccess = function () {
            let rec = recReq.result;
            if (!rec) {
              const fbReq = recordIndex.get([String(sid), periodType, month, year]);
              fbReq.onsuccess = function () {
                const finalRec = fbReq.result || {};
                mergeAndPush(st, finalRec);
              };
              fbReq.onerror = function () {
                mergeAndPush(st, {});
              };
            } else {
              mergeAndPush(st, rec);
            }
          };
          recReq.onerror = function () {
            mergeAndPush(st, {});
          };
        });

        function mergeAndPush(st, rec) {
          const cleanRec = { ...rec };
          if (!cleanRec.from_surah && cleanRec.memo_surah) cleanRec.from_surah = cleanRec.memo_surah;
          if (!cleanRec.from_ayah && cleanRec.memo_ayah) cleanRec.from_ayah = cleanRec.memo_ayah;
          if (!cleanRec.rev_from_surah && cleanRec.rev_surah) cleanRec.rev_from_surah = cleanRec.rev_surah;
          if (!cleanRec.rev_from_ayah && cleanRec.rev_ayah) cleanRec.rev_from_ayah = cleanRec.rev_ayah;
          if ((cleanRec.activity_mark === undefined || cleanRec.activity_mark === null) && cleanRec.activity_grade) cleanRec.activity_mark = cleanRec.activity_grade;
          if ((cleanRec.fiqh === undefined || cleanRec.fiqh === null) && cleanRec.fiqh_grade) cleanRec.fiqh = cleanRec.fiqh_grade;
          if ((cleanRec.tafsir === undefined || cleanRec.tafsir === null) && cleanRec.tafsir_grade) cleanRec.tafsir = cleanRec.tafsir_grade;
          if ((cleanRec.adhkar === undefined || cleanRec.adhkar === null) && cleanRec.adhkar_grade) cleanRec.adhkar = cleanRec.adhkar_grade;
          if ((cleanRec.seerah === undefined || cleanRec.seerah === null) && cleanRec.seerah_grade) cleanRec.seerah = cleanRec.seerah_grade;

          mergedList.push({
            ...st,
            ...cleanRec,
            id: st.id
          });
          completed++;
          if (completed === students.length) {
            resolve(mergedList);
          }
        }
      };

      const handleResults = function (students) {
        if (!students || students.length === 0) {
          if (typeof targetId === 'number') {
            const req2 = studentIndex.getAll(strId);
            req2.onsuccess = () => {
              const res2 = req2.result || [];
              if (res2.length > 0) return handleFinalStudents(res2);
              return resolve([]);
            };
            req2.onerror = () => resolve([]);
            return;
          }
          return resolve([]);
        }
        handleFinalStudents(students);
      };

      const studentsReq = studentIndex.getAll(targetId);
      studentsReq.onsuccess = () => handleResults(studentsReq.result || []);
      studentsReq.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Update student period record locally in IndexedDB and enqueue sync change with coalescing
   */
  async function updateLocalStudentRecord(circleId, studentId, fields, periodPayload = {}) {
    const db = await openLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['student_records', 'sync_queue'], 'readwrite');
      const recordStore = tx.objectStore('student_records');
      const queueStore = tx.objectStore('sync_queue');

      const periodType = String(periodPayload.period_type || 'monthly').trim();
      const month = String(periodPayload.month || 'صفر').trim();
      const year = String(periodPayload.year || '1448').replace(/\D/g, '') || '1448';
      const stId = Number(studentId) || studentId;
      const cId = Number(circleId) || circleId;

      const recordIndex = recordStore.index('student_period');
      const getReq = recordIndex.get([stId, periodType, month, year]);

      getReq.onsuccess = function () {
        let existing = getReq.result;
        if (!existing) {
          const fallbackReq = recordIndex.get([String(stId), periodType, month, year]);
          fallbackReq.onsuccess = function () {
            existing = fallbackReq.result || {
              student_id: stId,
              circle_id: cId,
              period_type: periodType,
              month: month,
              year: year
            };
            applyUpdate(existing);
          };
          fallbackReq.onerror = function () {
            existing = { student_id: stId, circle_id: cId, period_type: periodType, month: month, year: year };
            applyUpdate(existing);
          };
        } else {
          applyUpdate(existing);
        }

        function applyUpdate(existingRecord) {
          const updated = {
            ...existingRecord,
            ...fields,
            student_id: stId,
            circle_id: cId,
            period_type: periodType,
            month: month,
            year: year,
            _updated_at: new Date().toISOString()
          };

          if (existingRecord.id) {
            updated.id = existingRecord.id;
          }

          recordStore.put(updated);

          // Outbox Coalescing: check for existing pending item for this student record
          const qIndex = queueStore.index('status');
          const qReq = qIndex.getAll('pending');
          qReq.onsuccess = function () {
            const pending = qReq.result || [];
            const existingItem = pending.find(p =>
              (p.entity_type === 'student_records' || p.entity_type === 'students') &&
              (Number(p.entity_id) === stId || (p.payload && Number(p.payload.student_id) === stId)) &&
              p.action_type !== 'DELETE_STUDENT'
            );

            if (existingItem) {
              existingItem.entity_type = 'student_records';
              existingItem.payload = {
                ...existingItem.payload,
                ...updated
              };
              existingItem.operation_id = generateUUID();
              existingItem.updated_at = new Date().toISOString();
              queueStore.put(existingItem);
            } else {
              queueStore.add({
                operation_id: generateUUID(),
                action_type: 'UPDATE_STUDENT_RECORD',
                entity_type: 'student_records',
                entity_id: stId,
                payload: {
                  ...updated
                },
                created_at: new Date().toISOString(),
                status: 'pending',
                retry_count: 0,
                is_in_flight: false
              });
            }
          };
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // =========================================================================
  // SYNC QUEUE MANAGEMENT (OFFLINE CHANGES OUTBOX)
  // =========================================================================

  /**
   * Enqueue a student update, grade change, or new student into offline sync queue with safe coalescing
   */
  async function enqueueChange(actionType, entityType, entityId, payload) {
    const opId = (payload && payload.operation_id) ? payload.operation_id : generateUUID();
    return withStore('sync_queue', 'readwrite', (store) => {
      const index = store.index('status');
      const req = index.getAll();
      req.onsuccess = () => {
        const allQueue = req.result || [];
        // Find existing unacknowledged mutation for the same entity
        const existing = allQueue.find(p => p.entity_type === entityType && String(p.entity_id) === String(entityId) && p.action_type === actionType);
        
        // Strict Coalescing Rule (Section 14):
        // state === 'pending' && attempts === 0 && !is_in_flight
        const canCoalesce = (
          existing &&
          existing.status === 'pending' &&
          (!existing.retry_count || existing.retry_count === 0) &&
          !existing.is_in_flight &&
          actionType !== 'DELETE_STUDENT'
        );

        if (canCoalesce) {
          existing.payload = { ...(existing.payload || {}), ...(payload || {}) };
          // Mandatory: regenerate operation_id to preserve atomicity of coalesced state
          existing.operation_id = generateUUID();
          existing.updated_at = new Date().toISOString();
          store.put(existing);
        } else {
          store.add({
            operation_id: opId,
            action_type: actionType, // 'UPDATE', 'UPDATE_STUDENT', 'CREATE_STUDENT', 'DELETE_STUDENT', 'TRANSFER'
            entity_type: entityType, // 'students', 'student_records', 'circles'
            entity_id: entityId,
            payload: payload,
            created_at: new Date().toISOString(),
            status: 'pending', // 'pending', 'sending', 'acknowledged', 'failed'
            retry_count: 0,
            is_in_flight: false
          });
        }
      };
    });
  }

  /**
   * Soft-delete a student locally (Tombstone) and enqueue DELETE_STUDENT operation
   */
  async function deleteLocalStudent(studentId, circleId = null) {
    const db = await openLocalDB();
    const stId = Number(studentId) || studentId;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['students', 'student_records', 'sync_queue'], 'readwrite');
      const studentStore = tx.objectStore('students');
      const recordStore = tx.objectStore('student_records');
      const queueStore = tx.objectStore('sync_queue');

      const nowIso = new Date().toISOString();

      // Soft delete: Retain tombstone in studentStore for 30-day lifecycle
      const getReq = studentStore.get(stId);
      getReq.onsuccess = () => {
        const student = getReq.result || { id: stId, circle_id: circleId };
        student.is_deleted = 1;
        student.deleted_at = nowIso;
        student._cached_at = nowIso;
        studentStore.put(student);
      };

      queueStore.add({
        operation_id: generateUUID(),
        action_type: 'DELETE_STUDENT',
        entity_type: 'students',
        entity_id: stId,
        payload: {
          student_id: stId,
          circle_id: circleId,
          is_deleted: 1,
          deleted_at: nowIso
        },
        created_at: nowIso,
        status: 'pending',
        retry_count: 0,
        is_in_flight: false
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get all unacknowledged items waiting to be synced (pending or failed)
   */
  async function getPendingQueue() {
    return withStore('sync_queue', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          const unacked = all.filter(item => ['pending', 'failed'].includes(item.status));
          resolve(unacked);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Get all unacknowledged items in any active state (pending, sending, failed)
   */
  async function getUnacknowledgedOperations() {
    return withStore('sync_queue', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          const active = all.filter(item => ['pending', 'sending', 'failed'].includes(item.status));
          resolve(active);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Get count of pending unsynced items
   */
  async function getPendingCount() {
    return withStore('sync_queue', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          const pendingCount = all.filter(i => i.status === 'pending').length;
          resolve(pendingCount);
        };
        req.onerror = () => resolve(0);
      });
    });
  }

  /**
   * Mark successfully synced queue items as synced (or delete them)
   */
  async function markQueueItemsSynced(queueIds) {
    if (!Array.isArray(queueIds) || queueIds.length === 0) return;
    return withStore('sync_queue', 'readwrite', (store) => {
      queueIds.forEach((id) => {
        store.delete(id);
      });
    });
  }

  /**
   * Get dictionary of pending student modifications: { [studentId]: Set of fields }
   * Across all unacknowledged states: pending, sending, failed (Protocol Rule I06)
   */
  async function getPendingStudentChanges(circleId = null) {
    try {
      const activeOps = await getUnacknowledgedOperations();
      const map = {};
      activeOps.forEach((item) => {
        if (item.entity_type === 'students' || item.entity_type === 'student_records') {
          const stId = Number(item.entity_id || (item.payload && (item.payload.student_id || item.payload.id)));
          if (stId) {
            map[stId] = map[stId] || {};
            if (item.payload) {
              Object.assign(map[stId], item.payload);
            }
          }
        }
      });
      return map;
    } catch (e) {
      return {};
    }
  }

  /**
   * Delta Sync: Get and Save Sync Cursor (Supports circle-scoped keys)
   */
  async function getSyncCursor(cursorKey = 'sync_cursor') {
    return withStore('meta', 'readonly', (store) => {
      return new Promise((resolve) => {
        const req = store.get(cursorKey);
        req.onsuccess = () => resolve((req.result && req.result.value) || 0);
        req.onerror = () => resolve(0);
      });
    });
  }

  async function saveSyncCursor(cursorKey = 'sync_cursor', cursorVal = 0) {
    // Handle overload saveSyncCursor(val) vs saveSyncCursor(key, val)
    if (typeof cursorKey === 'number' || (typeof cursorKey === 'string' && !isNaN(Number(cursorKey)))) {
      cursorVal = cursorKey;
      cursorKey = 'sync_cursor';
    }
    return withStore('meta', 'readwrite', (store) => {
      store.put({ key: cursorKey, value: Number(cursorVal) || cursorVal, updated_at: new Date().toISOString() });
    });
  }

  /**
   * Apply incremental delta changes to IndexedDB with Pending Shield protection
   * and Contiguous Cursor Advancement (Sections 9, 11, 15, 16 of v2.2.1)
   */
  async function applyDeltaChanges(changes, circleId = null) {
    if (!Array.isArray(changes) || changes.length === 0) return 0;
    const db = await openLocalDB();
    const pendingChanges = await getPendingStudentChanges(circleId);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['students', 'student_records', 'meta'], 'readwrite');
      const studentStore = tx.objectStore('students');
      const recordStore = tx.objectStore('student_records');
      const metaStore = tx.objectStore('meta');

      let applied = 0;
      let maxCursor = 0;

      changes.forEach((ch) => {
        const cVal = Number(ch.server_commit_seq || ch.cursor) || 0;
        if (cVal > maxCursor) maxCursor = cVal;

        const eType = ch.entity_type;
        const eId = Number(ch.entity_id) || ch.entity_id;
        const action = ch.action_type || ch.action;
        const fields = ch.changed_fields || ch.payload || {};

        if (eType === 'students') {
          if (action === 'DELETE' || fields.is_deleted === 1) {
            // Soft delete in IndexedDB (Tombstone)
            const getReq = studentStore.get(eId);
            getReq.onsuccess = () => {
              const current = getReq.result || { id: eId };
              current.is_deleted = 1;
              current.deleted_at = fields.deleted_at || new Date().toISOString();
              studentStore.put(current);
              applied++;
            };
          } else if (action === 'TRANSFER') {
            const getReq = studentStore.get(eId);
            getReq.onsuccess = () => {
              const current = getReq.result || { id: eId, name: fields.name };
              if (fields.new_circle_id) {
                current.circle_id = fields.new_circle_id;
              }
              studentStore.put({ ...current, ...fields, id: eId });
              applied++;
            };
          } else {
            // Pending Shield Invariant (Protocol Rule I07):
            // Remote data can NEVER silently overwrite an unacknowledged local field!
            const unacked = pendingChanges[eId] || pendingChanges[String(eId)];
            const getReq = studentStore.get(eId);
            getReq.onsuccess = () => {
              const current = getReq.result || { id: eId };
              if (unacked) {
                // Field-Level Disjoint Merge
                const localKeys = new Set(Object.keys(unacked));
                const disjoint = {};
                const conflicting = {};
                Object.keys(fields).forEach((k) => {
                  if (!localKeys.has(k)) {
                    disjoint[k] = fields[k];
                  } else {
                    conflicting[k] = fields[k];
                  }
                });
                // Merge disjoint fields immediately into IndexedDB
                Object.assign(current, disjoint);
                // Ingest conflicting fields into shadow_server_state so they are never lost
                if (Object.keys(conflicting).length > 0) {
                  current._shadow_server_state = { ...(current._shadow_server_state || {}), ...conflicting };
                }
              } else {
                Object.assign(current, fields);
              }
              current.id = eId;
              if (ch.version) current.version = ch.version;
              studentStore.put(current);
              applied++;
            };
          }
        } else if (eType === 'student_records') {
          const stId = Number(fields.student_id || eId);
          const unacked = pendingChanges[stId] || pendingChanges[String(stId)];
          if (fields.id) {
            const getReq = recordStore.get(fields.id);
            getReq.onsuccess = () => {
              const current = getReq.result || fields;
              if (unacked) {
                const localKeys = new Set(Object.keys(unacked));
                const disjoint = {};
                const conflicting = {};
                Object.keys(fields).forEach((k) => {
                  if (!localKeys.has(k)) {
                    disjoint[k] = fields[k];
                  } else {
                    conflicting[k] = fields[k];
                  }
                });
                Object.assign(current, disjoint);
                if (Object.keys(conflicting).length > 0) {
                  current._shadow_server_state = { ...(current._shadow_server_state || {}), ...conflicting };
                }
              } else {
                Object.assign(current, fields);
              }
              if (ch.version) current.version = ch.version;
              recordStore.put(current);
              applied++;
            };
          }
        }
      });

      // Strict Cursor Advancement Rule (Section 11, Protocol Rule I05):
      // Cursor advances ONLY after all prior events are safely accounted for in IndexedDB / Shadow State!
      if (maxCursor > 0) {
        const cursorKey = circleId ? `lan_cursor_circle_${circleId}` : 'sync_cursor';
        metaStore.put({ key: cursorKey, value: maxCursor, updated_at: new Date().toISOString() });
      }

      tx.oncomplete = () => {
        // Dispatch live event for incremental UI engine
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          try {
            window.dispatchEvent(new CustomEvent('albayan:delta_sync', {
              detail: { changes, circleId, maxCursor }
            }));
          } catch (evErr) {
            console.warn('Delta sync event dispatch notice:', evErr);
          }
        }
        resolve(applied);
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // =========================================================================
  // EXAMS & RESULTS STORE
  // =========================================================================

  async function cacheExams(examsList) {
    if (!Array.isArray(examsList) || examsList.length === 0) return;
    return withStore('exams', 'readwrite', (store) => {
      examsList.forEach((ex) => {
        if (!ex) return;
        const id = ex.id !== undefined ? ex.id : (ex.local_id || Date.now());
        store.put({
          ...ex,
          id: id,
          _cached_at: new Date().toISOString()
        });
      });
    });
  }

  async function getLocalExams() {
    return withStore('exams', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  async function cacheResults(resultsList) {
    if (!Array.isArray(resultsList)) return;
    return withStore('results', 'readwrite', (store) => {
      resultsList.forEach((r) => {
        store.put({
          ...r,
          _cached_at: new Date().toISOString()
        });
      });
    });
  }

  async function getLocalResults(examId = null) {
    return withStore('results', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        if (examId !== null && examId !== undefined) {
          const index = store.index('exam_id');
          const req = index.getAll(examId);
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = (e) => reject(e.target.error);
        } else {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = (e) => reject(e.target.error);
        }
      });
    });
  }

  // =========================================================================
  // USERS & STAFF STORE
  // =========================================================================

  async function cacheUsers(usersList) {
    if (!Array.isArray(usersList)) return;
    return withStore('users', 'readwrite', (store) => {
      usersList.forEach((u) => {
        const id = u.id !== undefined ? u.id : (u.local_id || Date.now());
        store.put({
          ...u,
          id: id,
          _cached_at: new Date().toISOString()
        });
      });
    });
  }

  async function getLocalUsers() {
    return withStore('users', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  // =========================================================================
  // STUDENT CVS STORE
  // =========================================================================

  async function cacheStudentCvs(cvList) {
    if (!Array.isArray(cvList)) return;
    return withStore('student_cvs', 'readwrite', (store) => {
      cvList.forEach((cv) => {
        const id = cv.id !== undefined ? cv.id : (cv.local_id || Date.now());
        store.put({
          ...cv,
          id: id,
          _cached_at: new Date().toISOString()
        });
      });
    });
  }

  async function getLocalStudentCvs() {
    return withStore('student_cvs', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  async function deleteLocalStudentCv(id) {
    return withStore('student_cvs', 'readwrite', (store) => {
      const numId = Number(id);
      store.delete(numId || id);
      if (numId) store.delete(String(id));
    });
  }

  // =========================================================================
  // CERTIFICATES STORE
  // =========================================================================

  async function cacheCertificates(certsList) {
    if (!Array.isArray(certsList)) return;
    return withStore('certificates', 'readwrite', (store) => {
      certsList.forEach((c) => {
        const id = c.id !== undefined ? c.id : (c.local_id || Date.now());
        store.put({
          ...c,
          id: id,
          _cached_at: new Date().toISOString()
        });
      });
    });
  }

  async function getLocalCertificates() {
    return withStore('certificates', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    });
  }

  // =========================================================================
  // UNIFIED IMPORT / EXPORT ACROSS THE 3 DATABASES
  // =========================================================================

  /**
   * Imports a complete database bundle (from Flask SQLite or Firebase RTDB)
   * atomically into the mobile app's local IndexedDB.
   */
  async function importFullDatabase(bundle = {}) {
    const db = await openLocalDB();
    let pendingChanges = {};
    try {
      if (typeof getPendingStudentChanges === 'function') {
        pendingChanges = await getPendingStudentChanges();
      }
    } catch (e) {}

    const storeNames = ['circles', 'students', 'student_records', 'exams', 'results', 'users', 'student_cvs', 'certificates', 'meta'];
    const activeStores = storeNames.filter((s) => db.objectStoreNames.contains(s));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(activeStores, 'readwrite');

      if (Array.isArray(bundle.circles)) {
        const store = tx.objectStore('circles');
        bundle.circles.forEach((c) => store.put({ ...c, id: c.id !== undefined ? c.id : c.local_id }));
      }

      if (Array.isArray(bundle.students)) {
        const store = tx.objectStore('students');
        const stMap = new Map();
        bundle.students.forEach((s) => {
          if (!s) return;
          const sId = Number(s.id !== undefined ? s.id : s.local_id);
          if (sId) {
            const existing = stMap.get(sId);
            if (!existing || (s.name && !existing.name)) {
              stMap.set(sId, { ...s, id: sId });
            }
          }
        });
        stMap.forEach((s, sId) => {
          const unacked = pendingChanges[sId] || pendingChanges[String(sId)];
          if (unacked) {
            store.put({ ...s, ...unacked, id: sId });
          } else {
            store.put({ ...s, id: sId });
          }
        });

        // Also preserve all locally created students in pendingChanges not in remote bundle
        if (pendingChanges && typeof pendingChanges === 'object') {
          Object.entries(pendingChanges).forEach(([stId, dirty]) => {
            const sid = Number(stId) || stId;
            if (!stMap.has(sid) && dirty && dirty.name && (!dirty.is_deleted || dirty.is_deleted === 0)) {
              store.put({
                id: sid,
                circle_id: Number(dirty.circle_id) || dirty.circle_id || 0,
                name: dirty.name,
                phone: dirty.phone || '',
                notes: dirty.notes || '',
                created_at: dirty.created_at || new Date().toISOString(),
                ...dirty
              });
            }
          });
        }
      }

      if (Array.isArray(bundle.student_records)) {
        const store = tx.objectStore('student_records');
        bundle.student_records.forEach((r) => {
          if (!r) return;
          const sid = Number(r.student_id || r.id);
          if (!sid) return;

          const periodType = String(r.period_type || 'monthly').trim();
          const month = String(r.month || 'صفر').trim();
          const year = String(r.year || '1448').replace(/\D/g, '') || '1448';
          const unacked = pendingChanges[sid] || pendingChanges[String(sid)];

          const normalizedRec = {
            ...r,
            student_id: sid,
            period_type: periodType,
            month: month,
            year: year
          };

          if (unacked) {
            Object.assign(normalizedRec, unacked);
          }
          store.put(normalizedRec);
        });

        // Also preserve locally created records in pendingChanges
        if (pendingChanges && typeof pendingChanges === 'object') {
          Object.entries(pendingChanges).forEach(([stId, dirty]) => {
            const sid = Number(stId) || stId;
            if (dirty && dirty.name) {
              const pType = String(dirty.period_type || 'monthly').trim();
              const pMonth = String(dirty.month || 'صفر').trim();
              const pYear = String(dirty.year || '1448').replace(/\D/g, '') || '1448';
              store.put({
                student_id: sid,
                circle_id: Number(dirty.circle_id) || dirty.circle_id || 0,
                period_type: pType,
                month: pMonth,
                year: pYear,
                id: sid,
                ...dirty
              });
            }
          });
        }
      }

      if (Array.isArray(bundle.exams) && db.objectStoreNames.contains('exams')) {
        const store = tx.objectStore('exams');
        bundle.exams.forEach((e) => store.put({ ...e, id: e.id !== undefined ? e.id : e.local_id }));
      }

      if (Array.isArray(bundle.results) && db.objectStoreNames.contains('results')) {
        const store = tx.objectStore('results');
        bundle.results.forEach((r) => store.put(r));
      }

      if (Array.isArray(bundle.users) && db.objectStoreNames.contains('users')) {
        const store = tx.objectStore('users');
        bundle.users.forEach((u) => store.put({ ...u, id: u.id !== undefined ? u.id : u.local_id }));
      }

      if (Array.isArray(bundle.student_cvs) && db.objectStoreNames.contains('student_cvs')) {
        const store = tx.objectStore('student_cvs');
        bundle.student_cvs.forEach((cv) => store.put({ ...cv, id: cv.id !== undefined ? cv.id : cv.local_id }));
      }

      if (Array.isArray(bundle.certificates) && db.objectStoreNames.contains('certificates')) {
        const store = tx.objectStore('certificates');
        bundle.certificates.forEach((c) => store.put({ ...c, id: c.id !== undefined ? c.id : c.local_id }));
      }

      // Record sync timestamp in meta
      const metaStore = tx.objectStore('meta');
      metaStore.put({ key: 'last_full_sync', value: new Date().toISOString() });
      metaStore.put({ key: 'db_version', value: DB_VERSION });

      tx.oncomplete = () => {
        resolve(true);
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Dumps the entire local IndexedDB into a single JSON bundle
   * to push to Flask SQLite or Firebase RTDB.
   */
  async function exportFullDatabase() {
    const [circles, students, exams, users, student_cvs, certificates] = await Promise.all([
      getLocalCircles().catch(() => []),
      withStore('students', 'readonly', (s) => new Promise((res) => { const r = s.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); })).catch(() => []),
      getLocalExams().catch(() => []),
      getLocalUsers().catch(() => []),
      getLocalStudentCvs().catch(() => []),
      getLocalCertificates().catch(() => [])
    ]);

    const records = await withStore('student_records', 'readonly', (s) => new Promise((res) => {
      const r = s.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    })).catch(() => []);

    return {
      circles,
      students,
      student_records: records,
      exams,
      users,
      student_cvs,
      certificates,
      exported_at: new Date().toISOString(),
      source: 'AlbayanOfflineDB_v2'
    };
  }

  // =========================================================================
  // LOCAL META STORE (IP, LAST SYNC, USER PROFILE)
  // =========================================================================

  async function setMeta(key, value) {
    return withStore('meta', 'readwrite', (store) => {
      store.put({ key: key, value: value, updated_at: new Date().toISOString() });
    });
  }

  async function getMeta(key, defaultValue = null) {
    return withStore('meta', 'readonly', (store) => {
      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
        req.onerror = () => resolve(defaultValue);
      });
    });
  }

  // Export to window global
  window.AlbayanLocalDB = {
    open: openLocalDB,
    // Circles
    saveLocalCircle,
    upsertLocalCircle: saveLocalCircle,
    saveCircle: saveLocalCircle,
    cacheCircles,
    getLocalCircles,
    getCircles: getLocalCircles,
    deleteLocalCircle,
    deleteCircle: deleteLocalCircle,
    // Students & Records
    cacheStudents,
    getLocalStudents,
    getStudents: getLocalStudents,
    updateLocalStudentRecord,
    deleteLocalStudent,
    deleteStudent: deleteLocalStudent,
    // Exams & Results
    cacheExams,
    getLocalExams,
    getExams: getLocalExams,
    cacheResults,
    getLocalResults,
    getResults: getLocalResults,
    // Users & Staff
    cacheUsers,
    getLocalUsers,
    getUsers: getLocalUsers,
    // Student CVs
    cacheStudentCvs,
    getLocalStudentCvs,
    getStudentCvs: getLocalStudentCvs,
    deleteLocalStudentCv,
    // Certificates
    cacheCertificates,
    getLocalCertificates,
    getCertificates: getLocalCertificates,
    // Unified Bundle Sync
    importFullDatabase,
    exportFullDatabase,
    // Sync Queue Outbox
    enqueueChange,
    queueChange: enqueueChange,
    getPendingQueue,
    getPendingCount,
    markQueueItemsSynced,
    getPendingStudentChanges,
    getUnacknowledgedOperations,
    generateUUID,
    // Delta Sync & Cursor
    getSyncCursor,
    saveSyncCursor,
    applyDeltaChanges,
    // Key-Value Meta
    setMeta,
    getMeta
  };

  // Pre-initialize on script load
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      openLocalDB().catch((err) => console.warn('AlbayanLocalDB auto-init notice:', err));
    });
  }

})(typeof window !== 'undefined' ? window : this);
