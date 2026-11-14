/**
 * ============================================================================
 * ALBAYAN QURAN SCHOOL - LAYERED FIREBASE ARCHITECTURE (firebase-client.js)
 * ============================================================================
 * Designed with strict separation of responsibilities across 5 layers:
 *   1. AlbayanDiagnostics     : Structured logging, error classification & sync UI status
 *   2. AlbayanDataNormalizer  : Canonical ID/period normalization & multi-format record resolver
 *   3. AlbayanFirebaseDAL     : Low-level Firebase RTDB REST & SSE transport (timeouts, dedup, retries)
 *   4. AlbayanStateStore      : Reactive state store, sequence guards (requestSeq), tombstones & cache
 *   5. Domain Services        : CirclesService & RosterService (plus Exams/Users/CVs sync)
 * ============================================================================
 */
(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyD3Ny43iSx0-ftK1OmZY5cQIK8rc-wfPwc",
    authDomain: "bayan-56e77.firebaseapp.com",
    projectId: "bayan-56e77",
    storageBucket: "bayan-56e77.firebasestorage.app",
    messagingSenderId: "310709127497",
    appId: "1:310709127497:web:814ade60c1c18ac785f298",
    databaseURL: "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app"
  };

  const RTDB_BASE = firebaseConfig.databaseURL.replace(/\/$/, '');
  const CLIENT_INSTANCE_ID = 'client_' + Math.random().toString(36).substring(2, 9);

  // ==========================================================================
  // LAYER 1: DIAGNOSTICS, ERROR HANDLING & SYNC STATUS (AlbayanDiagnostics)
  // ==========================================================================

  const AlbayanDiagnostics = (function () {
    const MAX_LOGS = 150;
    const logs = [];
    let currentConnectionStatus = navigator.onLine ? 'online' : 'offline';

    function log(layer, action, status, details = null) {
      const entry = {
        ts: new Date().toISOString(),
        layer,
        action,
        status,
        details: details ? (typeof details === 'object' ? { ...details } : String(details)) : null
      };
      logs.unshift(entry);
      if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;

      if (status === 'error') {
        console.warn(`[Albayan:${layer}] ${action} FAILED:`, details);
      }
      return entry;
    }

    function classifyError(err, httpStatus = 0) {
      if (!navigator.onLine) {
        return { code: 'OFFLINE', retryable: true, message: 'الجهاز غير متصل بالإنترنت حالياً.' };
      }
      if (err && err.name === 'AbortError') {
        return { code: 'TIMEOUT', retryable: true, message: 'انتهت مهلة الاتصال بقاعدة البيانات السحابية.' };
      }
      if (httpStatus === 401 || httpStatus === 403) {
        return { code: 'PERMISSION_DENIED', retryable: false, message: 'لا توجد صلاحية كافية للوصول إلى هذا المسار في Firebase.' };
      }
      if (httpStatus === 404) {
        return { code: 'NOT_FOUND', retryable: false, message: 'المسار المطلوب غير موجود.' };
      }
      if (httpStatus >= 500) {
        return { code: 'SERVER_ERROR', retryable: true, message: 'خطأ مؤقت في خادم Firebase.' };
      }
      return {
        code: 'NETWORK_ERROR',
        retryable: true,
        message: (err && err.message) ? err.message : 'تعذر الاتصال بالسحابة.'
      };
    }

    function setConnectionStatus(status) {
      currentConnectionStatus = status;
      updateSyncStatusBadge(status);
      window.dispatchEvent(new CustomEvent('albayan:sync-status', { detail: { status } }));
    }

    function updateSyncStatusBadge(status) {
      try {
        const badge = document.getElementById('cloudSyncStatusBadge');
        if (!badge) return;
        if (status === 'syncing') {
          badge.textContent = '🟡 جاري المزامنة...';
          badge.style.color = '#d97706';
        } else if (status === 'online' || status === 'synced') {
          badge.textContent = '🟢 متصل بالسحابة';
          badge.style.color = '#059669';
        } else {
          badge.textContent = '⚪ يعمل محلياً';
          badge.style.color = '#64748b';
        }
      } catch (e) {}
    }

    return {
      log,
      classifyError,
      setConnectionStatus,
      getLogs: () => [...logs],
      getStatus: () => currentConnectionStatus
    };
  })();

  // ==========================================================================
  // LAYER 2: CANONICAL DATA NORMALIZER & RESOLVER (AlbayanDataNormalizer)
  // ==========================================================================

  const AlbayanDataNormalizer = (function () {
    const SURAH_LIST = [
      { id: 1, name: "الفاتحة", ayahs: 7 }, { id: 2, name: "البقرة", ayahs: 286 },
      { id: 3, name: "آل عمران", ayahs: 200 }, { id: 4, name: "النساء", ayahs: 176 },
      { id: 5, name: "المائدة", ayahs: 120 }, { id: 6, name: "الأنعام", ayahs: 165 },
      { id: 7, name: "الأعراف", ayahs: 206 }, { id: 8, name: "الأنفال", ayahs: 75 },
      { id: 9, name: "التوبة", ayahs: 129 }, { id: 10, name: "يونس", ayahs: 109 },
      { id: 11, name: "هود", ayahs: 123 }, { id: 12, name: "يوسف", ayahs: 111 },
      { id: 13, name: "الرعد", ayahs: 43 }, { id: 14, name: "إبراهيم", ayahs: 52 },
      { id: 15, name: "الحجر", ayahs: 99 }, { id: 16, name: "النحل", ayahs: 128 },
      { id: 17, name: "الإسراء", ayahs: 111 }, { id: 18, name: "الكهف", ayahs: 110 },
      { id: 19, name: "مريم", ayahs: 98 }, { id: 20, name: "طه", ayahs: 135 },
      { id: 21, name: "الأنبياء", ayahs: 112 }, { id: 22, name: "الحج", ayahs: 78 },
      { id: 23, name: "المؤمنون", ayahs: 118 }, { id: 24, name: "النور", ayahs: 64 },
      { id: 25, name: "الفرقان", ayahs: 77 }, { id: 26, name: "الشعراء", ayahs: 227 },
      { id: 27, name: "النمل", ayahs: 93 }, { id: 28, name: "القصص", ayahs: 88 },
      { id: 29, name: "العنكبوت", ayahs: 69 }, { id: 30, name: "الروم", ayahs: 60 },
      { id: 31, name: "لقمان", ayahs: 34 }, { id: 32, name: "السجدة", ayahs: 30 },
      { id: 33, name: "الأحزاب", ayahs: 73 }, { id: 34, name: "سبأ", ayahs: 54 },
      { id: 35, name: "فاطر", ayahs: 45 }, { id: 36, name: "يس", ayahs: 83 },
      { id: 37, name: "الصافات", ayahs: 182 }, { id: 38, name: "ص", ayahs: 88 },
      { id: 39, name: "الزمر", ayahs: 75 }, { id: 40, name: "غافر", ayahs: 85 },
      { id: 41, name: "فصلت", ayahs: 54 }, { id: 42, name: "الشورى", ayahs: 53 },
      { id: 43, name: "الزخرف", ayahs: 89 }, { id: 44, name: "الدخان", ayahs: 59 },
      { id: 45, name: "الجاثية", ayahs: 37 }, { id: 46, name: "الأحقاف", ayahs: 35 },
      { id: 47, name: "محمد", ayahs: 38 }, { id: 48, name: "الفتح", ayahs: 29 },
      { id: 49, name: "الحجرات", ayahs: 18 }, { id: 50, name: "ق", ayahs: 45 },
      { id: 51, name: "الذاريات", ayahs: 60 }, { id: 52, name: "الطور", ayahs: 49 },
      { id: 53, name: "النجم", ayahs: 62 }, { id: 54, name: "القمر", ayahs: 55 },
      { id: 55, name: "الرحمن", ayahs: 78 }, { id: 56, name: "الواقعة", ayahs: 96 },
      { id: 57, name: "الحديد", ayahs: 29 }, { id: 58, name: "المجادلة", ayahs: 22 },
      { id: 59, name: "الحشر", ayahs: 24 }, { id: 60, name: "الممتحنة", ayahs: 13 },
      { id: 61, name: "الصف", ayahs: 14 }, { id: 62, name: "الجمعة", ayahs: 11 },
      { id: 63, name: "المنافقون", ayahs: 11 }, { id: 64, name: "التغابن", ayahs: 18 },
      { id: 65, name: "الطلاق", ayahs: 12 }, { id: 66, name: "التحريم", ayahs: 12 },
      { id: 67, name: "الملك", ayahs: 30 }, { id: 68, name: "القلم", ayahs: 52 },
      { id: 69, name: "الحاقة", ayahs: 52 }, { id: 70, name: "المعارج", ayahs: 44 },
      { id: 71, name: "نوح", ayahs: 28 }, { id: 72, name: "الجن", ayahs: 28 },
      { id: 73, name: "المزمل", ayahs: 20 }, { id: 74, name: "المدثر", ayahs: 56 },
      { id: 75, name: "القيامة", ayahs: 40 }, { id: 76, name: "الإنسان", ayahs: 31 },
      { id: 77, name: "المرسلات", ayahs: 50 }, { id: 78, name: "النبأ", ayahs: 40 },
      { id: 79, name: "النازعات", ayahs: 46 }, { id: 80, name: "عبس", ayahs: 42 },
      { id: 81, name: "التكوير", ayahs: 29 }, { id: 82, name: "الانفطار", ayahs: 19 },
      { id: 83, name: "المطففين", ayahs: 36 }, { id: 84, name: "الانشقاق", ayahs: 25 },
      { id: 85, name: "البروج", ayahs: 22 }, { id: 86, name: "الطارق", ayahs: 17 },
      { id: 87, name: "الأعلى", ayahs: 19 }, { id: 88, name: "الغاشية", ayahs: 26 },
      { id: 89, name: "الفجر", ayahs: 30 }, { id: 90, name: "البلد", ayahs: 20 },
      { id: 91, name: "الشمس", ayahs: 15 }, { id: 92, name: "الليل", ayahs: 21 },
      { id: 93, name: "الضحى", ayahs: 11 }, { id: 94, name: "الشرح", ayahs: 8 },
      { id: 95, name: "التين", ayahs: 8 }, { id: 96, name: "العلق", ayahs: 19 },
      { id: 97, name: "القدر", ayahs: 5 }, { id: 98, name: "البينة", ayahs: 8 },
      { id: 99, name: "الزلزلة", ayahs: 8 }, { id: 100, name: "العاديات", ayahs: 11 },
      { id: 101, name: "القارعة", ayahs: 11 }, { id: 102, name: "التكاثر", ayahs: 8 },
      { id: 103, name: "العصر", ayahs: 3 }, { id: 104, name: "الهمزة", ayahs: 9 },
      { id: 105, name: "الفيل", ayahs: 5 }, { id: 106, name: "قريش", ayahs: 4 },
      { id: 107, name: "الماعون", ayahs: 7 }, { id: 108, name: "الكوثر", ayahs: 3 },
      { id: 109, name: "الكافرون", ayahs: 6 }, { id: 110, name: "النصر", ayahs: 3 },
      { id: 111, name: "المسد", ayahs: 5 }, { id: 112, name: "الإخلاص", ayahs: 4 },
      { id: 113, name: "الفلق", ayahs: 5 }, { id: 114, name: "الناس", ayahs: 6 }
    ];

    const SURAH_START_PAGES = [
      1, 2, 50, 77, 106, 128, 151, 177, 187, 208,
      221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
      322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
      411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
      477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
      520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
      551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
      570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
      586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
      595, 595, 596, 596, 597, 597, 598, 598, 599, 599,
      600, 600, 601, 601, 601, 602, 602, 602, 603, 603,
      603, 604, 604, 604
    ];

    function calcQuranPages(fromSurah, fromAyah, toSurah, toAyah) {
      if (!fromSurah || !toSurah) return 0;
      let fromIdx = SURAH_LIST.findIndex(s => s.name === fromSurah);
      let toIdx = SURAH_LIST.findIndex(s => s.name === toSurah);
      if (fromIdx === -1 || toIdx === -1) return 0;

      let fa = parseInt(fromAyah, 10) || 1;
      let ta = parseInt(toAyah, 10) || 1;
      if (fromIdx > toIdx || (fromIdx === toIdx && fa > ta)) {
        [fromIdx, toIdx] = [toIdx, fromIdx];
        [fa, ta] = [ta, fa];
      }

      const getPage = (idx, ayah) => {
        const startP = SURAH_START_PAGES[idx];
        const endP = (idx + 1 < SURAH_START_PAGES.length) ? SURAH_START_PAGES[idx + 1] : 604;
        const ayahsCount = SURAH_LIST[idx]?.ayahs || 1;
        if (endP <= startP) return startP;
        const fraction = (Math.max(1, ayah) - 1) / Math.max(1, ayahsCount);
        const offset = Math.floor(fraction * (endP - startP + 1));
        return Math.min(endP, startP + offset);
      };

      const pFrom = getPage(fromIdx, fa);
      const pTo = getPage(toIdx, ta);
      return Math.max(1, pTo - pFrom + 1);
    }

    function normalizeEntityId(rawVal, prefix = '') {
      if (rawVal === null || rawVal === undefined || rawVal === '') return null;
      let s = String(rawVal).trim();
      if (prefix) {
        const re = new RegExp('^' + prefix + '_?', 'i');
        s = s.replace(re, '').trim();
      }
      s = s.replace(/^(circles_|students_|users_|exams_|student_records_)/i, '').trim();
      if (!s) return null;
      const n = Number(s);
      return (!isNaN(n) && isFinite(n) && String(n) === s) ? n : s;
    }

    function normalizeCircleId(rawVal) {
      return normalizeEntityId(rawVal, 'circles');
    }

    function normalizeStudentId(rawVal) {
      return normalizeEntityId(rawVal, 'students');
    }

    function normalizeUserId(rawVal) {
      return normalizeEntityId(rawVal, 'users');
    }

    function normalizeMonthLabel(rawMonth) {
      if (!rawMonth) return 'صفر';
      const s = String(rawMonth).trim();
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

    function isSameMonth(m1, m2) {
      if (!m1 && !m2) return true;
      if (!m1 || !m2) return false;
      return normalizeMonthComparisonKey(m1) === normalizeMonthComparisonKey(m2);
    }

    function normalizePeriod(period = {}) {
      const pType = String(period.period_type || 'monthly').trim() || 'monthly';
      const rawYear = String(period.year || '1448').replace(/\D/g, '') || '1448';
      const rawMonth = normalizeMonthLabel(
        period.month || (pType === 'daily' ? period.record_date : 'صفر') || 'صفر'
      );
      const recordDate = String(period.record_date || (pType === 'daily' ? rawMonth : '')).trim();
      const compMonth = normalizeMonthComparisonKey(rawMonth) || 'صفر';
      const safeMonthKey = rawMonth.replace(/[.#$/\[\]\s]/g, '_');
      return {
        period_type: pType,
        year: rawYear,
        month: rawMonth,
        record_date: recordDate,
        comp_month: compMonth,
        period_key: `${pType}_${rawYear}_${compMonth}`,
        safe_month_key: safeMonthKey
      };
    }

    function getCanonicalRecordKey(studentId, period = {}) {
      const sid = normalizeStudentId(studentId);
      const normP = normalizePeriod(period);
      if (normP.period_type === 'daily' && normP.record_date) {
        const safeDate = normP.record_date.replace(/[.#$/\[\]\s]/g, '_');
        return `${sid}_daily_${safeDate}`;
      }
      return `${sid}_${normP.period_type}_${normP.year}_${normP.safe_month_key}`;
    }

    function createBlankRecord(studentId, circleId, period = {}) {
      const normP = normalizePeriod(period);
      return {
        student_id: normalizeStudentId(studentId),
        circle_id: normalizeCircleId(circleId),
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

    function scoreRecordCompleteness(rec) {
      if (!rec || typeof rec !== 'object') return 0;
      let score = 0;
      if (rec.from_surah && String(rec.from_surah).trim() !== '') score += 2;
      if (rec.to_surah && String(rec.to_surah).trim() !== '') score += 2;
      if (Number(rec.memo_grade) > 0) score += 3;
      if (rec.rev_from_surah && String(rec.rev_from_surah).trim() !== '') score += 2;
      if (rec.rev_to_surah && String(rec.rev_to_surah).trim() !== '') score += 2;
      if (Number(rec.sard_pages) > 0) score += 2;
      if (Number(rec.rev_grade) > 0) score += 3;
      if (Number(rec.absent_days) > 0) score += 1;
      if (Number(rec.activity_mark) > 0) score += 2;
      if (Number(rec.fiqh) > 0) score += 1;
      if (Number(rec.tafsir) > 0) score += 1;
      if (Number(rec.adhkar) > 0) score += 1;
      if (Number(rec.seerah) > 0) score += 1;
      return score;
    }

    function normalizeCollectionEntries(rawObjOrArray) {
      if (!rawObjOrArray) return [];
      const entries = [];
      if (Array.isArray(rawObjOrArray)) {
        rawObjOrArray.forEach((val, idx) => {
          if (val && typeof val === 'object') {
            entries.push([String(idx), val]);
          }
        });
      } else if (typeof rawObjOrArray === 'object') {
        Object.entries(rawObjOrArray).forEach(([k, val]) => {
          if (val && typeof val === 'object') {
            entries.push([k, val]);
          }
        });
      }
      return entries;
    }

    function flattenFirebaseNode(rawObjOrArray, prefix = '') {
      if (!rawObjOrArray) return [];
      const entries = normalizeCollectionEntries(rawObjOrArray);
      return entries.map(([key, item]) => {
        if (!item || typeof item !== 'object') return null;
        return {
          ...item,
          _fbKey: key,
          id: item.id !== undefined ? item.id : normalizeEntityId(key, prefix)
        };
      }).filter(Boolean);
    }

    /**
     * Resolves and deduplicates raw `/circles` data against `/users` and `/students`.
     * Also returns any redundant legacy keys (e.g. `circles_<id>`) for cleanup.
     */
    function resolveCircles(rawCircles, rawUsers = null, rawStudents = null, deletedCircleIds = new Set(), deletedStudentIds = new Set()) {
      const usersMap = new Map();
      normalizeCollectionEntries(rawUsers).forEach(([k, u]) => {
        const uid = normalizeUserId(u.id !== undefined ? u.id : (u.local_id !== undefined ? u.local_id : k));
        if (uid !== null) {
          usersMap.set(String(uid), u.username || u.student_name || '');
        }
      });

      // Count active students per circle from rawStudents if provided
      const activeCountsByCircle = new Map();
      if (rawStudents) {
        const resolvedStu = resolveStudents(rawStudents, deletedCircleIds, deletedStudentIds).students;
        resolvedStu.forEach(s => {
          const cidStr = String(s.circle_id);
          activeCountsByCircle.set(cidStr, (activeCountsByCircle.get(cidStr) || 0) + 1);
        });
      }

      const circleMap = new Map();
      const redundantKeys = [];

      normalizeCollectionEntries(rawCircles).forEach(([rtdbKey, c]) => {
        const cid = normalizeCircleId(c.id !== undefined ? c.id : (c.local_id !== undefined ? c.local_id : rtdbKey));
        if (cid === null || cid === undefined) return;
        const cidStr = String(cid);

        if (rtdbKey !== cidStr && rtdbKey === `circles_${cidStr}`) {
          redundantKeys.push(rtdbKey);
        }

        if (deletedCircleIds.has(cidStr) || c.is_deleted === 1 || c.is_deleted === true) {
          return;
        }

        const teacherId = normalizeUserId(c.teacher_id);
        const resolvedTeacherName =
          (teacherId !== null && usersMap.get(String(teacherId))) ||
          c.teacher_name ||
          '';

        const candidate = {
          ...c,
          id: cid,
          local_id: cid,
          name: String(c.name || '').trim(),
          description: String(c.description || '').trim(),
          teacher_id: teacherId,
          teacher_name: resolvedTeacherName,
          student_count: activeCountsByCircle.has(cidStr)
            ? activeCountsByCircle.get(cidStr)
            : Number(c.student_count || 0),
          created_at: c.created_at || c.updated_at || new Date(typeof cid === 'number' && cid > 1700000000000 ? cid : Date.now()).toISOString(),
          updated_at: c.updated_at || c.created_at || ''
        };

        if (!candidate.name) return;

        const existing = circleMap.get(cidStr);
        if (!existing) {
          circleMap.set(cidStr, { data: candidate, rtdbKey });
        } else {
          // Prefer record with newer updated_at, or canonical key (<id> over circles_<id>)
          const tCand = new Date(candidate.updated_at || 0).getTime() || 0;
          const tExist = new Date(existing.data.updated_at || 0).getTime() || 0;
          const candIsCanonical = rtdbKey === cidStr;
          const existIsCanonical = existing.rtdbKey === cidStr;

          if (tCand > tExist || (tCand === tExist && candIsCanonical && !existIsCanonical)) {
            circleMap.set(cidStr, {
              data: {
                ...existing.data,
                ...candidate,
                student_count: activeCountsByCircle.has(cidStr)
                  ? activeCountsByCircle.get(cidStr)
                  : Math.max(Number(existing.data.student_count || 0), Number(candidate.student_count || 0))
              },
              rtdbKey
            });
          }
        }
      });

      const list = Array.from(circleMap.values()).map(item => item.data);
      // Sort newest first
      list.sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : (typeof a.id === 'number' ? a.id : 0);
        const tB = b.created_at ? new Date(b.created_at).getTime() : (typeof b.id === 'number' ? b.id : 0);
        if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tB - tA;
        return String(b.id).localeCompare(String(a.id));
      });

      return { circles: list, redundantKeys };
    }

    /**
     * Resolves and deduplicates raw `/students` data.
     */
    function resolveStudents(rawStudents, deletedCircleIds = new Set(), deletedStudentIds = new Set()) {
      const studentMap = new Map();
      const redundantKeys = [];

      normalizeCollectionEntries(rawStudents).forEach(([rtdbKey, s]) => {
        const sid = normalizeStudentId(s.id !== undefined ? s.id : (s.local_id !== undefined ? s.local_id : rtdbKey));
        const cid = normalizeCircleId(s.circle_id);
        if (sid === null || cid === null) return;

        const sidStr = String(sid);
        const cidStr = String(cid);

        if (rtdbKey !== sidStr && rtdbKey === `students_${sidStr}`) {
          redundantKeys.push(rtdbKey);
        }

        if (
          deletedStudentIds.has(sidStr) ||
          deletedCircleIds.has(cidStr) ||
          s.is_deleted === 1 ||
          s.is_deleted === true
        ) {
          return;
        }

        const name = String(s.name || s.student_name || '').trim();
        if (!name) return;

        const candidate = {
          id: sid,
          local_id: sid,
          circle_id: cid,
          name,
          created_at: s.created_at || '',
          updated_at: s.updated_at || ''
        };

        const existing = studentMap.get(sidStr);
        if (!existing) {
          studentMap.set(sidStr, { data: candidate, rtdbKey });
        } else {
          const tCand = new Date(candidate.updated_at || candidate.created_at || 0).getTime() || 0;
          const tExist = new Date(existing.data.updated_at || existing.data.created_at || 0).getTime() || 0;
          if (tCand >= tExist) {
            studentMap.set(sidStr, { data: { ...existing.data, ...candidate }, rtdbKey });
          }
        }
      });

      return {
        students: Array.from(studentMap.values()).map(item => item.data),
        redundantKeys
      };
    }

    /**
     * Multi-Candidate Record Resolver for `/student_records`.
     * Handles all 6 historical key formats in Firebase RTDB and merges non-empty fields
     * chronologically so no student grade is ever lost or overwritten by a blank duplicate key.
     */
    function resolveRosterRecords(circleStudents, rawRecords, period = {}) {
      const normP = normalizePeriod(period);
      const isYearly = normP.month === 'سجل نهاية السنة';
      const allEntries = normalizeCollectionEntries(rawRecords);

      const RECORD_DATA_FIELDS = [
        'from_surah', 'from_ayah', 'to_surah', 'to_ayah', 'memo_pages', 'memo_grade',
        'rev_from_surah', 'rev_from_ayah', 'rev_to_surah', 'rev_to_ayah', 'sard_pages', 'rev_grade',
        'absent_days', 'activity_mark', 'fiqh', 'tafsir', 'adhkar', 'seerah',
        'exam_grade', 'exam_title'
      ];

      // Group all records by normalized student_id
      const recordsByStudent = new Map();
      allEntries.forEach(([rtdbKey, r]) => {
        if (!r || typeof r !== 'object') return;
        let sid = normalizeStudentId(r.student_id !== undefined ? r.student_id : r.id);
        // Extract student_id from composite key if needed
        if (sid === null || String(sid).includes('_')) {
          const m = String(rtdbKey).match(/^(?:rec_|student_records_)?(\d+)/);
          if (m) sid = normalizeStudentId(m[1]);
        }
        if (sid === null) return;
        const sidStr = String(sid);
        if (!recordsByStudent.has(sidStr)) {
          recordsByStudent.set(sidStr, []);
        }
        recordsByStudent.get(sidStr).push({ rtdbKey, rec: r });
      });

      const redundantRecordKeys = [];

      const roster = (circleStudents || []).map(student => {
        const sid = normalizeStudentId(student.id);
        const cid = normalizeCircleId(student.circle_id);
        const sidStr = String(sid);
        const studentCandidates = recordsByStudent.get(sidStr) || [];
        const blank = createBlankRecord(sid, cid, normP);

        if (isYearly) {
          // Filter all non-yearly records for the requested year
          const yearBucketByMonth = new Map();
          studentCandidates.forEach(({ rec }) => {
            const rYear = String(rec.year || '1448').replace(/\D/g, '') || '1448';
            const rMonth = normalizeMonthLabel(rec.month || '');
            if (rYear !== normP.year || rMonth === 'سجل نهاية السنة') return;
            if (scoreRecordCompleteness(rec) === 0) return;

            const mKey = normalizeMonthComparisonKey(rMonth || rec.record_date || 'default');
            const existingInMonth = yearBucketByMonth.get(mKey);
            if (!existingInMonth || scoreRecordCompleteness(rec) >= scoreRecordCompleteness(existingInMonth)) {
              yearBucketByMonth.set(mKey, rec);
            }
          });

          const validMonthRecs = Array.from(yearBucketByMonth.values());
          if (validMonthRecs.length === 0) {
            return { ...student, ...blank, id: sid, circle_id: cid };
          }

          let totalMemoPages = 0;
          let totalSardPages = 0;
          let totalAbsentDays = 0;
          const avgFields = ['memo_grade', 'rev_grade', 'activity_mark', 'fiqh', 'tafsir', 'adhkar', 'seerah'];
          const sums = {};
          const counts = {};
          avgFields.forEach(k => { sums[k] = 0; counts[k] = 0; });

          let firstFromSurah = '', firstFromAyah = 0, lastToSurah = '', lastToAyah = 0;
          let firstRevFromSurah = '', firstRevFromAyah = 0, lastRevToSurah = '', lastRevToAyah = 0;

          validMonthRecs.forEach(r => {
            const mPages = (r.memo_pages !== undefined && Number(r.memo_pages) > 0)
              ? Number(r.memo_pages)
              : ((r.from_surah && r.to_surah) ? calcQuranPages(r.from_surah, r.from_ayah, r.to_surah, r.to_ayah) : 0);
            totalMemoPages += mPages;
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

          const yearlyMerged = {
            ...blank,
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
            yearlyMerged[k] = counts[k] > 0 ? Math.round((sums[k] / counts[k]) * 10) / 10 : '';
          });

          return { ...student, ...yearlyMerged, id: sid, circle_id: cid };
        }

        // Standard period (monthly / daily / custom)
        const canonicalKey = getCanonicalRecordKey(sid, normP);
        const matchingCandidates = studentCandidates.filter(({ rtdbKey, rec }) => {
          if (rtdbKey === canonicalKey) return true;
          const rPType = String(rec.period_type || 'monthly').trim() || 'monthly';
          const rYear = String(rec.year || '1448').replace(/\D/g, '') || '1448';
          if (rPType !== normP.period_type || rYear !== normP.year) return false;
          if (normP.period_type === 'daily') {
            return (rec.record_date && rec.record_date === normP.record_date) || isSameMonth(rec.month, normP.month);
          }
          return isSameMonth(rec.month, normP.month);
        });

        if (matchingCandidates.length === 0) {
          return { ...student, ...blank, id: sid, circle_id: cid };
        }

        // Track non-canonical duplicate keys so they can be cleaned up after canonical write
        matchingCandidates.forEach(({ rtdbKey }) => {
          if (rtdbKey !== canonicalKey) {
            redundantRecordKeys.push(rtdbKey);
          }
        });

        // Sort from least priority to highest priority so the newest/canonical values win
        matchingCandidates.sort((a, b) => {
          const tA = new Date(a.rec.updated_at || a.rec.created_at || 0).getTime() || 0;
          const tB = new Date(b.rec.updated_at || b.rec.created_at || 0).getTime() || 0;
          if (tA !== tB) return tA - tB;

          const isCanA = a.rtdbKey === canonicalKey ? 1 : 0;
          const isCanB = b.rtdbKey === canonicalKey ? 1 : 0;
          if (isCanA !== isCanB) return isCanA - isCanB;

          const scoreA = scoreRecordCompleteness(a.rec);
          const scoreB = scoreRecordCompleteness(b.rec);
          return scoreA - scoreB;
        });

        const merged = { ...blank };
        matchingCandidates.forEach(({ rtdbKey, rec }) => {
          const isAuthoritative = Boolean(rec.updated_at) || rtdbKey === canonicalKey;
          RECORD_DATA_FIELDS.forEach(field => {
            const val = rec[field];
            if (val === undefined || val === 'غير محدد') return;
            if (val !== null && val !== '') {
              if (field === 'exam_grade' && val === 'لم يختبر بعد' && merged.exam_grade !== 'لم يختبر بعد' && !isAuthoritative) {
                return;
              }
              merged[field] = val;
            } else if (isAuthoritative) {
              // Explicitly cleared field in a newer/canonical record must overwrite older stale values
              merged[field] = blank[field] !== undefined ? blank[field] : '';
            }
          });
          if (rec.updated_at) merged.updated_at = rec.updated_at;
        });

        if ((!merged.memo_pages || Number(merged.memo_pages) <= 0) && merged.from_surah && merged.to_surah && Number(merged.to_ayah) > 0) {
          merged.memo_pages = calcQuranPages(merged.from_surah, merged.from_ayah, merged.to_surah, merged.to_ayah);
        }

        return {
          ...student,
          ...merged,
          id: sid,
          circle_id: cid,
          name: student.name,
          period_type: normP.period_type,
          record_date: normP.record_date,
          month: normP.month,
          year: normP.year
        };
      });

      return { roster, redundantRecordKeys };
    }

    return {
      SURAH_LIST,
      calcQuranPages,
      normalizeEntityId,
      normalizeCircleId,
      normalizeStudentId,
      normalizeUserId,
      normalizeMonthLabel,
      normalizeMonthComparisonKey,
      isSameMonth,
      normalizePeriod,
      getCanonicalRecordKey,
      createBlankRecord,
      scoreRecordCompleteness,
      normalizeCollectionEntries,
      flattenFirebaseNode,
      resolveCircles,
      resolveStudents,
      resolveRosterRecords
    };
  })();

  // ==========================================================================
  // LAYER 3: FIREBASE CONNECTION & DATA ACCESS LAYER (AlbayanFirebaseDAL)
  // ==========================================================================

  const AlbayanFirebaseDAL = (function () {
    const inFlightGets = new Map();
    let lastSelfWriteTs = 0;

    function buildUrl(path, isGet = false) {
      const cleanPath = String(path || '').replace(/^\/+|\/+$/g, '').replace(/\.json$/i, '');
      const base = `${RTDB_BASE}/${cleanPath}.json`;
      return isGet ? `${base}?_cb=${Date.now()}` : base;
    }

    async function request(path, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      const timeoutMs = options.timeoutMs || (method === 'GET' ? 5000 : 6000);
      const retries = options.retries !== undefined ? options.retries : (method === 'GET' ? 1 : 1);
      const dedupKey = `${method}:${String(path || '').replace(/^\/+|\/+$/g, '').replace(/\.json$/i, '')}`;

      // Deduplicate concurrent identical GET requests
      if (method === 'GET' && !options.bypassDedup) {
        if (inFlightGets.has(dedupKey)) {
          return inFlightGets.get(dedupKey);
        }
      }

      const executePromise = (async () => {
        let lastError = null;
        let lastStatus = 0;

        for (let attempt = 0; attempt <= retries; attempt++) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);

          try {
            const url = buildUrl(path, method === 'GET');
            const fetchOpts = {
              method,
              cache: 'no-store',
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(options.headers || {})
              }
            };
            if (options.body !== undefined) {
              fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            }

            const res = await fetch(url, fetchOpts);
            clearTimeout(timer);
            lastStatus = res.status;

            if (!res.ok) {
              const errInfo = AlbayanDiagnostics.classifyError(null, res.status);
              AlbayanDiagnostics.log('DAL', `${method} /${path}`, 'error', { status: res.status, code: errInfo.code });
              if (!errInfo.retryable || attempt === retries) {
                return { ok: false, status: res.status, data: null, error: errInfo };
              }
            } else {
              let data = null;
              const text = await res.text();
              if (text && text.trim() !== '') {
                try {
                  data = JSON.parse(text);
                } catch (parseErr) {
                  data = text;
                }
              }
              if (method !== 'GET') {
                lastSelfWriteTs = Date.now();
              }
              AlbayanDiagnostics.setConnectionStatus('online');
              return { ok: true, status: res.status, data, error: null };
            }
          } catch (err) {
            clearTimeout(timer);
            lastError = err;
            const errInfo = AlbayanDiagnostics.classifyError(err, lastStatus);
            if (!errInfo.retryable || attempt === retries) {
              if (errInfo.code === 'OFFLINE') {
                AlbayanDiagnostics.setConnectionStatus('offline');
              }
              AlbayanDiagnostics.log('DAL', `${method} /${path}`, 'error', { code: errInfo.code, message: errInfo.message });
              return { ok: false, status: lastStatus, data: null, error: errInfo };
            }
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
          }
        }

        const fallbackErr = AlbayanDiagnostics.classifyError(lastError, lastStatus);
        return { ok: false, status: lastStatus, data: null, error: fallbackErr };
      })();

      if (method === 'GET' && !options.bypassDedup) {
        inFlightGets.set(dedupKey, executePromise);
        executePromise.finally(() => {
          inFlightGets.delete(dedupKey);
        });
      }

      return executePromise;
    }

    async function get(path, opts = {}) {
      return request(path, { ...opts, method: 'GET' });
    }

    async function put(path, body, opts = {}) {
      return request(path, { ...opts, method: 'PUT', body });
    }

    async function patch(path, body, opts = {}) {
      return request(path, { ...opts, method: 'PATCH', body });
    }

    async function remove(path, opts = {}) {
      return request(path, { ...opts, method: 'DELETE' });
    }

    async function touchSyncMeta(entity = 'all', source = 'client') {
      const now = Date.now();
      lastSelfWriteTs = now;
      try {
        localStorage.setItem('albayan_cloud_meta_ts', String(now));
      } catch (e) {}
      await patch('sync_meta', {
        last_updated: now,
        entity,
        source: `${source}_${CLIENT_INSTANCE_ID}`,
        updated_iso: new Date(now).toISOString()
      }, { timeoutMs: 3500, retries: 0 });
      return now;
    }

    return {
      buildUrl,
      request,
      get,
      put,
      patch,
      delete: remove,
      remove,
      touchSyncMeta,
      getLastSelfWriteTs: () => lastSelfWriteTs
    };
  })();

  // ==========================================================================
  // LAYER 4: STATE MANAGEMENT & SEQUENCE GUARD STORE (AlbayanStateStore)
  // ==========================================================================

  const AlbayanStateStore = (function () {
    const state = {
      circles: [],
      users: [],
      exams: [],
      rostersByCirclePeriod: new Map(), // key: `${circleId}_${periodKey}` -> Student[]
      studentsBaseByCircle: new Map(),  // key: `${circleId}` -> BaseStudent[]
      rawStudentsCache: null,
      rawStudentsCacheTs: 0,
      rawRecordsCache: null,
      rawRecordsCacheTs: 0
    };

    const requestSeqMap = new Map();
    const knownStudentsMap = new Map(); // key: String(studentId) -> BaseStudent
    const knownCirclesMap = new Map();  // key: String(circleId) -> CircleObj
    const sessionDeletedMap = {
      deleted_circles: new Set(),
      deleted_students: new Set(),
      deleted_users: new Set(),
      deleted_exams: new Set()
    };

    // Hydrate known students & circles from localStorage on boot
    try {
      const rawKnownStudents = localStorage.getItem('albayan_known_students_v3');
      if (rawKnownStudents) {
        const parsed = JSON.parse(rawKnownStudents);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              const sid = AlbayanDataNormalizer.normalizeStudentId(v.id !== undefined ? v.id : k);
              const cid = AlbayanDataNormalizer.normalizeCircleId(v.circle_id);
              if (sid !== null && cid !== null && v.name) {
                knownStudentsMap.set(String(sid), { ...v, id: sid, local_id: sid, circle_id: cid });
              }
            }
          });
        }
      }
    } catch (e) {}

    try {
      const rawKnownCircles = localStorage.getItem('albayan_known_circles_v3');
      if (rawKnownCircles) {
        const parsed = JSON.parse(rawKnownCircles);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              const cid = AlbayanDataNormalizer.normalizeCircleId(v.id !== undefined ? v.id : k);
              if (cid !== null && v.name) {
                knownCirclesMap.set(String(cid), { ...v, id: cid, local_id: cid });
              }
            }
          });
        }
      }
    } catch (e) {}

    function persistKnownStudents() {
      try {
        const obj = {};
        knownStudentsMap.forEach((v, k) => { obj[k] = v; });
        localStorage.setItem('albayan_known_students_v3', JSON.stringify(obj));
      } catch (e) {}
    }

    function persistKnownCircles() {
      try {
        const obj = {};
        knownCirclesMap.forEach((v, k) => { obj[k] = v; });
        localStorage.setItem('albayan_known_circles_v3', JSON.stringify(obj));
      } catch (e) {}
    }

    function registerKnownStudent(studentObj) {
      if (!studentObj || typeof studentObj !== 'object') return;
      const sid = AlbayanDataNormalizer.normalizeStudentId(studentObj.id !== undefined ? studentObj.id : studentObj.student_id);
      const cid = AlbayanDataNormalizer.normalizeCircleId(studentObj.circle_id);
      const name = String(studentObj.name || '').trim();
      if (sid === null || cid === null || !name) return;

      const base = {
        id: sid,
        local_id: sid,
        circle_id: cid,
        name,
        created_at: studentObj.created_at || new Date().toISOString(),
        updated_at: studentObj.updated_at || new Date().toISOString()
      };
      knownStudentsMap.set(String(sid), base);
      persistKnownStudents();

      if (state.rawStudentsCache && typeof state.rawStudentsCache === 'object' && !Array.isArray(state.rawStudentsCache)) {
        state.rawStudentsCache[String(sid)] = base;
      }
    }

    function unregisterKnownStudent(studentId) {
      const sid = AlbayanDataNormalizer.normalizeStudentId(studentId);
      if (sid === null) return;
      knownStudentsMap.delete(String(sid));
      persistKnownStudents();
      if (state.rawStudentsCache && typeof state.rawStudentsCache === 'object') {
        delete state.rawStudentsCache[String(sid)];
        delete state.rawStudentsCache[`students_${sid}`];
      }
    }

    function getKnownStudentsForCircle(circleId) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      if (cleanCid === null) return [];
      const cidStr = String(cleanCid);
      const delStudents = getDeletedIds('deleted_students');
      const resultMap = new Map();

      // 1. From knownStudentsMap
      knownStudentsMap.forEach((stu, sidStr) => {
        if (!delStudents.has(sidStr) && String(AlbayanDataNormalizer.normalizeCircleId(stu.circle_id)) === cidStr) {
          resultMap.set(sidStr, { ...stu, id: AlbayanDataNormalizer.normalizeStudentId(stu.id), circle_id: cleanCid });
        }
      });

      // 2. Also union with `albayan_circle_students_base_<cid>` from localStorage
      try {
        const rawBase = localStorage.getItem(`albayan_circle_students_base_${cleanCid}`);
        if (rawBase) {
          const parsed = JSON.parse(rawBase);
          if (Array.isArray(parsed)) {
            parsed.forEach(s => {
              if (!s || typeof s !== 'object') return;
              const sid = AlbayanDataNormalizer.normalizeStudentId(s.id);
              if (sid !== null && !delStudents.has(String(sid)) && s.name && !resultMap.has(String(sid))) {
                const entry = {
                  id: sid,
                  local_id: sid,
                  circle_id: cleanCid,
                  name: String(s.name).trim(),
                  created_at: s.created_at || new Date().toISOString()
                };
                resultMap.set(String(sid), entry);
                knownStudentsMap.set(String(sid), entry);
              }
            });
          }
        }
      } catch (e) {}

      return Array.from(resultMap.values());
    }

    function getAllKnownStudentsMap() {
      const delStudents = getDeletedIds('deleted_students');
      const delCircles = getDeletedIds('deleted_circles');
      const out = {};
      knownStudentsMap.forEach((stu, sidStr) => {
        const cidStr = String(AlbayanDataNormalizer.normalizeCircleId(stu.circle_id));
        if (!delStudents.has(sidStr) && !delCircles.has(cidStr)) {
          out[sidStr] = stu;
        }
      });
      return out;
    }

    function registerKnownCircle(circleObj) {
      if (!circleObj || typeof circleObj !== 'object') return;
      const cid = AlbayanDataNormalizer.normalizeCircleId(circleObj.id !== undefined ? circleObj.id : circleObj.local_id);
      const name = String(circleObj.name || '').trim();
      if (cid === null || !name) return;
      knownCirclesMap.set(String(cid), { ...circleObj, id: cid, local_id: cid, name });
      persistKnownCircles();
    }

    function unregisterKnownCircle(circleId) {
      const cid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      if (cid === null) return;
      const cidStr = String(cid);
      knownCirclesMap.delete(cidStr);
      persistKnownCircles();
      // Also purge known students belonging to this deleted circle
      let removedStu = false;
      knownStudentsMap.forEach((stu, sidStr) => {
        if (String(AlbayanDataNormalizer.normalizeCircleId(stu.circle_id)) === cidStr) {
          knownStudentsMap.delete(sidStr);
          removedStu = true;
        }
      });
      if (removedStu) persistKnownStudents();
    }

    function getKnownCircles() {
      const delCircles = getDeletedIds('deleted_circles');
      const list = [];
      knownCirclesMap.forEach((c, cidStr) => {
        if (!delCircles.has(cidStr)) {
          list.push(c);
        }
      });
      return list;
    }

    // One-time cleanup of stale tombstones from legacy app versions so valid Firebase circles/students are never hidden
    try {
      if (localStorage.getItem('albayan_v3_tombstone_reset') !== '1') {
        localStorage.removeItem('deleted_circles');
        localStorage.removeItem('deleted_students');
        localStorage.removeItem('albayan_cached_circles');
        localStorage.removeItem('cached_circles_list');
        localStorage.setItem('albayan_v3_tombstone_reset', '1');
      }
    } catch (e) {}

    function nextRequestSeq(key) {
      const next = (requestSeqMap.get(key) || 0) + 1;
      requestSeqMap.set(key, next);
      return next;
    }

    function isLatestRequestSeq(key, seq) {
      return (requestSeqMap.get(key) || 0) === seq;
    }

    function getDeletedIds(storageKey) {
      const set = new Set();
      if (sessionDeletedMap[storageKey]) {
        sessionDeletedMap[storageKey].forEach(id => set.add(String(id)));
      }
      return set;
    }

    function addDeletedId(storageKey, id) {
      if (id === null || id === undefined) return;
      if (!sessionDeletedMap[storageKey]) {
        sessionDeletedMap[storageKey] = new Set();
      }
      sessionDeletedMap[storageKey].add(String(id));
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(sessionDeletedMap[storageKey])));
      } catch (e) {}
    }

    function removeDeletedId(storageKey, id) {
      if (id === null || id === undefined) return;
      if (sessionDeletedMap[storageKey]) {
        sessionDeletedMap[storageKey].delete(String(id));
      }
      try {
        const arr = sessionDeletedMap[storageKey] ? Array.from(sessionDeletedMap[storageKey]) : [];
        localStorage.setItem(storageKey, JSON.stringify(arr));
      } catch (e) {}
    }

    function setCircles(circlesList) {
      state.circles = Array.isArray(circlesList) ? circlesList : [];
      try {
        localStorage.setItem('albayan_cached_circles', JSON.stringify(state.circles));
        localStorage.setItem('cached_circles_list', JSON.stringify(state.circles));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('albayan:state-changed', {
        detail: { entity: 'circles', data: state.circles }
      }));
    }

    function getCircles() {
      if (state.circles && state.circles.length > 0) return state.circles;
      try {
        const raw = localStorage.getItem('albayan_cached_circles') || localStorage.getItem('cached_circles_list');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const del = getDeletedIds('deleted_circles');
            state.circles = parsed.filter(c => c && !del.has(String(AlbayanDataNormalizer.normalizeCircleId(c.id))));
            return state.circles;
          }
        }
      } catch (e) {}
      return [];
    }

    function updateCircleStudentCount(circleId, count) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      if (cleanCid === null) return;
      const circles = getCircles();
      let changed = false;
      circles.forEach(c => {
        if (String(AlbayanDataNormalizer.normalizeCircleId(c.id)) === String(cleanCid)) {
          if (c.student_count !== count) {
            c.student_count = count;
            changed = true;
          }
        }
      });
      if (changed) {
        setCircles(circles);
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheCircles === 'function') {
          window.AlbayanLocalDB.cacheCircles(circles).catch(() => {});
        }
      }
    }

    function getRosterCacheKey(circleId, period = {}) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      const normP = AlbayanDataNormalizer.normalizePeriod(period);
      return `${cleanCid}_${normP.period_key}`;
    }

    function setRoster(circleId, period, studentsList) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      const normP = AlbayanDataNormalizer.normalizePeriod(period);
      const key = `${cleanCid}_${normP.period_key}`;
      const list = Array.isArray(studentsList) ? studentsList : [];
      state.rostersByCirclePeriod.set(key, list);

      try {
        localStorage.setItem(`albayan_cached_students_${key}`, JSON.stringify(list));
        // Base student list (ID + name + circle_id ONLY, no period grades!)
        const baseList = list.map(s => {
          const base = {
            id: AlbayanDataNormalizer.normalizeStudentId(s.id),
            local_id: AlbayanDataNormalizer.normalizeStudentId(s.id),
            circle_id: cleanCid,
            name: s.name
          };
          registerKnownStudent(base);
          return base;
        });
        state.studentsBaseByCircle.set(String(cleanCid), baseList);
        localStorage.setItem(`albayan_circle_students_base_${cleanCid}`, JSON.stringify(baseList));
      } catch (e) {}

      updateCircleStudentCount(cleanCid, list.length);

      window.dispatchEvent(new CustomEvent('albayan:state-changed', {
        detail: { entity: 'roster', circleId: cleanCid, period: normP, data: list }
      }));
    }

    function getRoster(circleId, period = {}) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      const normP = AlbayanDataNormalizer.normalizePeriod(period);
      const key = `${cleanCid}_${normP.period_key}`;
      const delStudents = getDeletedIds('deleted_students');

      if (state.rostersByCirclePeriod.has(key)) {
        return state.rostersByCirclePeriod.get(key).filter(s => !delStudents.has(String(AlbayanDataNormalizer.normalizeStudentId(s.id))));
      }

      try {
        const raw = localStorage.getItem(`albayan_cached_students_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(s => s && !delStudents.has(String(AlbayanDataNormalizer.normalizeStudentId(s.id))));
            state.rostersByCirclePeriod.set(key, filtered);
            return filtered;
          }
        }
      } catch (e) {}

      return null;
    }

    function invalidateRawCloudCaches() {
      state.rawStudentsCache = null;
      state.rawStudentsCacheTs = 0;
      state.rawRecordsCache = null;
      state.rawRecordsCacheTs = 0;
    }

    return {
      state,
      nextRequestSeq,
      isLatestRequestSeq,
      getDeletedIds,
      addDeletedId,
      removeDeletedId,
      registerKnownStudent,
      unregisterKnownStudent,
      getKnownStudentsForCircle,
      getAllKnownStudentsMap,
      registerKnownCircle,
      unregisterKnownCircle,
      getKnownCircles,
      setCircles,
      getCircles,
      updateCircleStudentCount,
      getRosterCacheKey,
      setRoster,
      getRoster,
      invalidateRawCloudCaches
    };
  })();

  // ==========================================================================
  // LAYER 5A: CIRCLES DOMAIN SERVICE (CirclesService)
  // ==========================================================================

  const CirclesService = (function () {
    /**
     * Unified fetch for Circles:
     *  - Deduplicates `<id>` and `circles_<id>`
     *  - Resolves `teacher_name` from `/users`
     *  - Computes accurate live `student_count` from active `/students` + known local students
     *  - Protects pending local mutations, newly created circles & tombstones
     *  - Cleans up redundant `circles_<id>` keys in background
     */
    async function fetchCircles(options = {}) {
      const seq = AlbayanStateStore.nextRequestSeq('circles');
      AlbayanDiagnostics.setConnectionStatus('syncing');

      // 1. Load local circles + pending queue for fallback / merge
      let localCircles = AlbayanStateStore.getCircles();
      if ((!localCircles || localCircles.length === 0) && window.AlbayanLocalDB) {
        try {
          localCircles = await window.AlbayanLocalDB.getLocalCircles();
        } catch (e) {}
      }

      // 2. Fetch `/circles`, `/users`, and `/students` in parallel from Firebase
      const [circlesRes, usersRes, studentsRes] = await Promise.all([
        AlbayanFirebaseDAL.get('circles', { bypassDedup: !!options.forceRefresh }),
        AlbayanFirebaseDAL.get('users'),
        AlbayanFirebaseDAL.get('students', { bypassDedup: !!options.forceRefresh })
      ]);

      if (!circlesRes.ok || circlesRes.data === null) {
        AlbayanDiagnostics.setConnectionStatus(navigator.onLine ? 'online' : 'offline');
        return {
          ok: false,
          fromCloud: false,
          circles: localCircles || [],
          error: circlesRes.error
        };
      }

      // Discard if a newer fetchCircles request was initiated while in-flight
      if (!AlbayanStateStore.isLatestRequestSeq('circles', seq)) {
        return { ok: true, fromCloud: true, circles: AlbayanStateStore.getCircles(), superseded: true };
      }

      const deletedCircleIds = AlbayanStateStore.getDeletedIds('deleted_circles');
      const deletedStudentIds = AlbayanStateStore.getDeletedIds('deleted_students');

      // Merge cloud students with known local non-deleted students so student_count never drops
      const combinedStudentsData = {
        ...AlbayanStateStore.getAllKnownStudentsMap(),
        ...(studentsRes.ok && studentsRes.data && typeof studentsRes.data === 'object' ? studentsRes.data : (AlbayanStateStore.state.rawStudentsCache || {}))
      };

      if (studentsRes.ok && studentsRes.data) {
        AlbayanStateStore.state.rawStudentsCache = combinedStudentsData;
        AlbayanStateStore.state.rawStudentsCacheTs = Date.now();
      }

      const { circles: resolvedCloudCircles, redundantKeys } = AlbayanDataNormalizer.resolveCircles(
        circlesRes.data,
        usersRes.ok ? usersRes.data : null,
        combinedStudentsData,
        deletedCircleIds,
        deletedStudentIds
      );

      // Register all cloud circles as known circles
      resolvedCloudCircles.forEach(c => AlbayanStateStore.registerKnownCircle(c));

      // 3. Union-merge any locally known non-deleted circles (e.g. newly created circles)
      const knownLocalCircles = AlbayanStateStore.getKnownCircles();
      knownLocalCircles.forEach(kc => {
        const cid = AlbayanDataNormalizer.normalizeCircleId(kc.id);
        if (cid === null || deletedCircleIds.has(String(cid))) return;
        const existsIdx = resolvedCloudCircles.findIndex(c => String(c.id) === String(cid));
        if (existsIdx === -1 && kc.name) {
          const liveKnownStudents = AlbayanStateStore.getKnownStudentsForCircle(cid);
          const restoredCircle = {
            ...kc,
            id: cid,
            local_id: cid,
            student_count: Math.max(Number(kc.student_count || 0), liveKnownStudents.length)
          };
          resolvedCloudCircles.unshift(restoredCircle);
          // Self-heal Firebase in background if newly created circle was missing from cloud
          AlbayanFirebaseDAL.put(`circles/${cid}`, restoredCircle, { retries: 0 }).catch(() => {});
        }
      });

      // 4. Merge any pending local circle creations/edits from outbox
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingSyncQueue === 'function') {
        try {
          const pending = await window.AlbayanLocalDB.getPendingSyncQueue();
          pending.forEach(item => {
            if (item.entity === 'circles' && item.payload) {
              const cid = AlbayanDataNormalizer.normalizeCircleId(item.entity_id || item.payload.id);
              if (cid === null || deletedCircleIds.has(String(cid))) return;
              const idx = resolvedCloudCircles.findIndex(c => String(c.id) === String(cid));
              if (item.action === 'DELETE_CIRCLE') {
                if (idx >= 0) resolvedCloudCircles.splice(idx, 1);
              } else if (idx >= 0) {
                resolvedCloudCircles[idx] = { ...resolvedCloudCircles[idx], ...item.payload, id: cid, local_id: cid };
              } else if (item.payload.name) {
                resolvedCloudCircles.unshift({ ...item.payload, id: cid, local_id: cid });
              }
            }
          });
        } catch (e) {}
      }

      // 5. Update state store and IndexedDB
      AlbayanStateStore.setCircles(resolvedCloudCircles);
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheCircles === 'function') {
        window.AlbayanLocalDB.cacheCircles(resolvedCloudCircles).catch(() => {});
      }

      // 6. Clean up redundant `circles_<id>` keys in background if canonical key exists
      if (redundantKeys.length > 0) {
        redundantKeys.forEach(legacyKey => {
          const cleanId = AlbayanDataNormalizer.normalizeCircleId(legacyKey);
          const canonicalCircle = resolvedCloudCircles.find(c => String(c.id) === String(cleanId));
          if (canonicalCircle) {
            AlbayanFirebaseDAL.put(`circles/${cleanId}`, canonicalCircle, { retries: 0 }).then(putRes => {
              if (putRes.ok) {
                AlbayanFirebaseDAL.remove(`circles/${legacyKey}`, { retries: 0 }).catch(() => {});
              }
            }).catch(() => {});
          }
        });
      }

      AlbayanDiagnostics.setConnectionStatus('synced');
      AlbayanDiagnostics.log('CirclesService', 'fetchCircles', 'ok', { count: resolvedCloudCircles.length });

      return {
        ok: true,
        fromCloud: true,
        circles: resolvedCloudCircles,
        error: null
      };
    }

    /**
     * Creates or updates a Circle with verified persistence.
     */
    async function saveCircle(circleInput, options = {}) {
      if (!circleInput || !String(circleInput.name || '').trim()) {
        return { ok: false, synced: false, error: { message: 'اسم الحلقة مطلوب.' } };
      }

      const isEdit = !!options.isEdit;
      const cleanId = AlbayanDataNormalizer.normalizeCircleId(
        circleInput.id !== undefined && circleInput.id !== '' ? circleInput.id : Date.now()
      );
      const teacherId = AlbayanDataNormalizer.normalizeUserId(circleInput.teacher_id);

      AlbayanStateStore.removeDeletedId('deleted_circles', cleanId);

      const existingCircles = AlbayanStateStore.getCircles();
      const existing = existingCircles.find(c => String(AlbayanDataNormalizer.normalizeCircleId(c.id)) === String(cleanId)) || {};
      const nowIso = new Date().toISOString();

      const canonicalCircle = {
        ...existing,
        ...circleInput,
        id: cleanId,
        local_id: cleanId,
        name: String(circleInput.name).trim(),
        description: String(circleInput.description || '').trim(),
        teacher_id: teacherId,
        teacher_name: String(circleInput.teacher_name !== undefined ? circleInput.teacher_name : (existing.teacher_name || '')).trim(),
        student_count: Number(circleInput.student_count !== undefined ? circleInput.student_count : (existing.student_count || 0)),
        created_at: existing.created_at || circleInput.created_at || nowIso,
        updated_at: nowIso
      };

      // 1. Optimistic State, Known Registry & LocalDB update
      AlbayanStateStore.registerKnownCircle(canonicalCircle);
      const updatedList = [...existingCircles];
      const idx = updatedList.findIndex(c => String(AlbayanDataNormalizer.normalizeCircleId(c.id)) === String(cleanId));
      if (idx >= 0) {
        updatedList[idx] = canonicalCircle;
      } else {
        updatedList.unshift(canonicalCircle);
      }
      AlbayanStateStore.setCircles(updatedList);

      let qid = null;
      if (window.AlbayanLocalDB) {
        try {
          await window.AlbayanLocalDB.saveLocalCircle(canonicalCircle);
          qid = await window.AlbayanLocalDB.enqueueChange(
            isEdit ? 'UPDATE_CIRCLE' : 'CREATE_CIRCLE',
            'circles',
            cleanId,
            canonicalCircle
          );
        } catch (e) {}
      }

      // 2. Write to canonical Firebase path `/circles/<cleanId>`
      AlbayanDiagnostics.setConnectionStatus('syncing');
      const putRes = await AlbayanFirebaseDAL.put(`circles/${cleanId}`, canonicalCircle);

      if (putRes.ok) {
        // Remove any legacy duplicate key `circles_<cleanId>`
        AlbayanFirebaseDAL.remove(`circles/circles_${cleanId}`, { retries: 0 }).catch(() => {});
        if (qid && window.AlbayanLocalDB) {
          window.AlbayanLocalDB.markChangeSynced(qid).catch(() => {});
        }
        await AlbayanFirebaseDAL.touchSyncMeta('circles', isEdit ? 'update_circle' : 'create_circle');
        AlbayanDiagnostics.setConnectionStatus('synced');
        AlbayanDiagnostics.log('CirclesService', 'saveCircle', 'ok', { id: cleanId, name: canonicalCircle.name });
        return { ok: true, synced: true, circle: canonicalCircle, error: null };
      }

      AlbayanDiagnostics.log('CirclesService', 'saveCircle', 'queued_offline', { id: cleanId, error: putRes.error });
      return { ok: true, synced: false, circle: canonicalCircle, error: putRes.error };
    }

    /**
     * Deletes a Circle and cascades deletion to its students & records.
     */
    async function deleteCircle(circleId) {
      const cleanId = AlbayanDataNormalizer.normalizeCircleId(circleId);
      if (cleanId === null || cleanId === undefined) {
        return { ok: false, synced: false, error: { message: 'معرّف الحلقة غير صالح.' } };
      }
      const cidStr = String(cleanId);

      // 1. Record tombstone and purge from local state & IndexedDB immediately
      AlbayanStateStore.addDeletedId('deleted_circles', cleanId);
      AlbayanStateStore.unregisterKnownCircle(cleanId);
      const remaining = AlbayanStateStore.getCircles().filter(
        c => String(AlbayanDataNormalizer.normalizeCircleId(c.id)) !== cidStr
      );
      AlbayanStateStore.setCircles(remaining);
      AlbayanStateStore.invalidateRawCloudCaches();

      let qid = null;
      if (window.AlbayanLocalDB) {
        try {
          await window.AlbayanLocalDB.deleteLocalCircle(cleanId);
          qid = await window.AlbayanLocalDB.enqueueChange('DELETE_CIRCLE', 'circles', cleanId, { id: cleanId });
        } catch (e) {}
      }

      // 2. Delete both `/circles/<id>` and `/circles/circles_<id>` from Firebase RTDB
      AlbayanDiagnostics.setConnectionStatus('syncing');
      const [delCanonical, delLegacy] = await Promise.all([
        AlbayanFirebaseDAL.remove(`circles/${cleanId}`),
        AlbayanFirebaseDAL.remove(`circles/circles_${cleanId}`)
      ]);

      // 3. Cascade delete students belonging to this circle in background
      (async () => {
        try {
          const stuRes = await AlbayanFirebaseDAL.get('students');
          if (stuRes.ok && stuRes.data) {
            const entries = AlbayanDataNormalizer.normalizeCollectionEntries(stuRes.data);
            for (const [k, s] of entries) {
              if (String(AlbayanDataNormalizer.normalizeCircleId(s.circle_id)) === cidStr) {
                const sid = AlbayanDataNormalizer.normalizeStudentId(s.id !== undefined ? s.id : k);
                AlbayanStateStore.addDeletedId('deleted_students', sid);
                AlbayanStateStore.unregisterKnownStudent(sid);
                await AlbayanFirebaseDAL.remove(`students/${k}`, { retries: 0 });
                if (sid !== null && String(sid) !== k) {
                  await AlbayanFirebaseDAL.remove(`students/${sid}`, { retries: 0 });
                }
              }
            }
          }
        } catch (e) {}
      })();

      if (delCanonical.ok || delLegacy.ok) {
        if (qid && window.AlbayanLocalDB) {
          window.AlbayanLocalDB.markChangeSynced(qid).catch(() => {});
        }
        await AlbayanFirebaseDAL.touchSyncMeta('circles', 'delete_circle');
        AlbayanDiagnostics.setConnectionStatus('synced');
        AlbayanDiagnostics.log('CirclesService', 'deleteCircle', 'ok', { id: cleanId });
        return { ok: true, synced: true, error: null };
      }

      return { ok: true, synced: false, error: delCanonical.error };
    }

    return {
      fetchCircles,
      saveCircle,
      deleteCircle,
      getCachedCircles: () => AlbayanStateStore.getCircles()
    };
  })();

  // ==========================================================================
  // LAYER 5B: ROSTER & STUDENT RECORDS DOMAIN SERVICE (RosterService)
  // ==========================================================================

  const RosterService = (function () {
    /**
     * Unified fetch for a Circle's Roster in a specific Period:
     *  - Strict sequence guard (`roster:${circleId}:${periodKey}`) prevents race conditions when switching circles/months
     *  - Strictly isolates grades per period (never leaks Month A's grades into Month B!)
     *  - Union-merges cloud students with known local non-deleted students so newly added students never disappear
     *  - Resolves all 6 historical key formats in `/student_records`
     *  - Applies pending local outbox changes ONLY for the matching circle & period
     */
    async function fetchRoster(circleId, period = {}, options = {}) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      if (cleanCid === null || cleanCid === undefined) {
        return { ok: false, fromCloud: false, students: [], error: { message: 'لم يتم تحديد الحلقة.' } };
      }

      const normP = AlbayanDataNormalizer.normalizePeriod(period);
      const seqKey = `roster:${cleanCid}:${normP.period_key}`;
      const seq = AlbayanStateStore.nextRequestSeq(seqKey);

      // 1. Prepare local fallback (strictly for this period)
      let localRoster = AlbayanStateStore.getRoster(cleanCid, normP);
      if ((!localRoster || localRoster.length === 0) && window.AlbayanLocalDB) {
        try {
          localRoster = await window.AlbayanLocalDB.getLocalStudents(cleanCid, normP);
        } catch (e) {}
      }

      // 2. Fetch `/students` and `/student_records` from Firebase
      AlbayanDiagnostics.setConnectionStatus('syncing');
      const now = Date.now();
      const useCachedRawStudents = !options.forceRefresh &&
        AlbayanStateStore.state.rawStudentsCache &&
        (now - AlbayanStateStore.state.rawStudentsCacheTs < 4000);
      const useCachedRawRecords = !options.forceRefresh &&
        AlbayanStateStore.state.rawRecordsCache &&
        (now - AlbayanStateStore.state.rawRecordsCacheTs < 4000);

      const [stuRes, recRes] = await Promise.all([
        useCachedRawStudents
          ? Promise.resolve({ ok: true, data: AlbayanStateStore.state.rawStudentsCache })
          : AlbayanFirebaseDAL.get('students', { bypassDedup: !!options.forceRefresh }),
        useCachedRawRecords
          ? Promise.resolve({ ok: true, data: AlbayanStateStore.state.rawRecordsCache })
          : AlbayanFirebaseDAL.get('student_records', { bypassDedup: !!options.forceRefresh })
      ]);

      // Discard if user already switched to another circle or month
      if (!AlbayanStateStore.isLatestRequestSeq(seqKey, seq)) {
        return {
          ok: true,
          fromCloud: false,
          superseded: true,
          students: AlbayanStateStore.getRoster(cleanCid, normP) || localRoster || []
        };
      }

      if (!stuRes.ok) {
        AlbayanDiagnostics.setConnectionStatus(navigator.onLine ? 'online' : 'offline');
        return {
          ok: false,
          fromCloud: false,
          students: localRoster || [],
          error: stuRes.error
        };
      }

      const deletedCircleIds = AlbayanStateStore.getDeletedIds('deleted_circles');
      const deletedStudentIds = AlbayanStateStore.getDeletedIds('deleted_students');

      // 3. Resolve active students in this circle from cloud
      const { students: allStudents, redundantKeys: redundantStudentKeys } = AlbayanDataNormalizer.resolveStudents(
        stuRes.data,
        deletedCircleIds,
        deletedStudentIds
      );
      const circleStudents = allStudents.filter(
        s => String(AlbayanDataNormalizer.normalizeCircleId(s.circle_id)) === String(cleanCid)
      );

      // Register all resolved cloud students in the known student registry
      circleStudents.forEach(s => AlbayanStateStore.registerKnownStudent(s));

      // 4. Union-merge with known local non-deleted students for this circle (prevents disappearing students!)
      const knownCircleStudents = AlbayanStateStore.getKnownStudentsForCircle(cleanCid);
      if (Array.isArray(localRoster)) {
        localRoster.forEach(ls => {
          const sid = AlbayanDataNormalizer.normalizeStudentId(ls.id);
          if (sid !== null && !deletedStudentIds.has(String(sid)) && ls.name) {
            if (!knownCircleStudents.some(k => String(k.id) === String(sid))) {
              knownCircleStudents.push({
                id: sid,
                local_id: sid,
                circle_id: cleanCid,
                name: ls.name,
                created_at: ls.created_at || new Date().toISOString()
              });
            }
          }
        });
      }

      knownCircleStudents.forEach(ks => {
        const sid = AlbayanDataNormalizer.normalizeStudentId(ks.id);
        if (sid === null || deletedStudentIds.has(String(sid))) return;
        const existsInCloud = circleStudents.some(s => String(s.id) === String(sid));
        if (!existsInCloud && ks.name) {
          const restoredStu = {
            id: sid,
            local_id: sid,
            circle_id: cleanCid,
            name: ks.name,
            created_at: ks.created_at || new Date().toISOString(),
            updated_at: ks.updated_at || new Date().toISOString()
          };
          circleStudents.push(restoredStu);
          // Self-heal Firebase in background if the student was missing from `/students`
          AlbayanFirebaseDAL.put(`students/${sid}`, restoredStu, { retries: 1 }).catch(() => {});
        }
      });

      // Update rawStudentsCache with the union-merged data
      const mergedRawStudents = {
        ...(stuRes.data && typeof stuRes.data === 'object' && !Array.isArray(stuRes.data) ? stuRes.data : {}),
        ...AlbayanStateStore.getAllKnownStudentsMap()
      };
      AlbayanStateStore.state.rawStudentsCache = mergedRawStudents;
      AlbayanStateStore.state.rawStudentsCacheTs = Date.now();
      if (recRes.ok) {
        AlbayanStateStore.state.rawRecordsCache = recRes.data || {};
        AlbayanStateStore.state.rawRecordsCacheTs = Date.now();
      }

      // 5. Merge any pending locally created students from outbox
      let pendingPeriodEdits = {};
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingStudentChanges === 'function') {
        try {
          pendingPeriodEdits = await window.AlbayanLocalDB.getPendingStudentChanges(cleanCid, normP);
          Object.entries(pendingPeriodEdits).forEach(([pid, dirty]) => {
            const cleanSid = AlbayanDataNormalizer.normalizeStudentId(pid);
            if (cleanSid === null || deletedStudentIds.has(String(cleanSid))) return;
            const exists = circleStudents.some(s => String(s.id) === String(cleanSid));
            if (!exists && dirty && dirty.name) {
              circleStudents.push({
                id: cleanSid,
                local_id: cleanSid,
                circle_id: cleanCid,
                name: dirty.name,
                created_at: dirty.created_at || new Date().toISOString()
              });
            }
          });
        } catch (e) {}
      }

      // 6. Resolve period records across all candidate formats
      const { roster: resolvedRoster, redundantRecordKeys } = AlbayanDataNormalizer.resolveRosterRecords(
        circleStudents,
        recRes.ok ? recRes.data : (AlbayanStateStore.state.rawRecordsCache || {}),
        normP
      );

      // 7. Overlay pending local grade edits for THIS exact period
      if (normP.month !== 'سجل نهاية السنة') {
        resolvedRoster.forEach(studentRow => {
          const sidStr = String(studentRow.id);
          const dirty = pendingPeriodEdits[sidStr] || pendingPeriodEdits[Number(sidStr)];
          if (dirty) {
            Object.assign(studentRow, dirty, {
              id: studentRow.id,
              circle_id: cleanCid,
              period_type: normP.period_type,
              month: normP.month,
              year: normP.year,
              record_date: normP.record_date
            });
          }
        });
      }

      // 8. Persist to StateStore & IndexedDB
      AlbayanStateStore.setRoster(cleanCid, normP, resolvedRoster);
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudents === 'function') {
        window.AlbayanLocalDB.cacheStudents(cleanCid, resolvedRoster, normP).catch(() => {});
      }

      // 9. Clean up redundant `students_<id>` and duplicate `student_records` keys in background
      if (redundantStudentKeys.length > 0) {
        redundantStudentKeys.forEach(legacyKey => {
          const cleanSid = AlbayanDataNormalizer.normalizeStudentId(legacyKey);
          const canonicalStu = allStudents.find(s => String(s.id) === String(cleanSid));
          if (canonicalStu) {
            AlbayanFirebaseDAL.put(`students/${cleanSid}`, canonicalStu, { retries: 0 }).then(putRes => {
              if (putRes.ok) {
                AlbayanFirebaseDAL.remove(`students/${legacyKey}`, { retries: 0 }).catch(() => {});
              }
            }).catch(() => {});
          }
        });
      }
      if (Array.isArray(redundantRecordKeys) && redundantRecordKeys.length > 0) {
        redundantRecordKeys.forEach(legacyRecKey => {
          if (AlbayanStateStore.state.rawRecordsCache && typeof AlbayanStateStore.state.rawRecordsCache === 'object') {
            delete AlbayanStateStore.state.rawRecordsCache[legacyRecKey];
          }
          AlbayanFirebaseDAL.remove(`student_records/${legacyRecKey}`, { retries: 0 }).catch(() => {});
        });
      }

      AlbayanDiagnostics.setConnectionStatus('synced');
      AlbayanDiagnostics.log('RosterService', 'fetchRoster', 'ok', {
        circleId: cleanCid,
        period: normP.period_key,
        count: resolvedRoster.length
      });

      return {
        ok: true,
        fromCloud: true,
        students: resolvedRoster,
        periodKey: normP.period_key,
        error: null
      };
    }

    /**
     * Adds a new student to a circle and initializes their record for the active period.
     * Supports passing either a studentName string or a student object as the 2nd parameter.
     */
    async function addStudent(circleId, studentOrName, period = {}, extraFields = {}) {
      const isObj = studentOrName && typeof studentOrName === 'object';
      const mergedExtra = isObj ? { ...studentOrName, ...extraFields } : extraFields;
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId || mergedExtra.circle_id);
      const cleanName = String(isObj ? (studentOrName.name || '') : (studentOrName || '')).trim();
      if (cleanCid === null || !cleanName) {
        return { ok: false, synced: false, error: { message: 'بيانات الطالب أو الحلقة غير مكتملة.' } };
      }

      const normP = AlbayanDataNormalizer.normalizePeriod(period);
      const studentId = mergedExtra.id
        ? AlbayanDataNormalizer.normalizeStudentId(mergedExtra.id)
        : Date.now();
      const nowIso = new Date().toISOString();

      AlbayanStateStore.removeDeletedId('deleted_students', studentId);

      const baseStudent = {
        id: studentId,
        local_id: studentId,
        circle_id: cleanCid,
        name: cleanName,
        created_at: nowIso,
        updated_at: nowIso
      };

      // Immediately register student in persistent known registry and rawStudentsCache
      AlbayanStateStore.registerKnownStudent(baseStudent);

      const fullStudentRow = {
        ...AlbayanDataNormalizer.createBlankRecord(studentId, cleanCid, normP),
        ...mergedExtra,
        ...baseStudent,
        period_type: normP.period_type,
        record_date: normP.record_date,
        month: normP.month,
        year: normP.year
      };

      // 1. Optimistic StateStore & IndexedDB update
      const currentRoster = AlbayanStateStore.getRoster(cleanCid, normP) || [];
      const existingIdx = currentRoster.findIndex(s => String(s.id) === String(studentId));
      const nextRoster = [...currentRoster];
      if (existingIdx >= 0) {
        nextRoster[existingIdx] = fullStudentRow;
      } else {
        nextRoster.push(fullStudentRow);
      }
      AlbayanStateStore.setRoster(cleanCid, normP, nextRoster);

      let qid = null;
      if (window.AlbayanLocalDB) {
        try {
          qid = await window.AlbayanLocalDB.enqueueChange('CREATE_STUDENT', 'students', studentId, fullStudentRow);
          await window.AlbayanLocalDB.cacheStudents(cleanCid, nextRoster, normP);
        } catch (e) {}
      }

      // 2. Write canonical student to `/students/<studentId>` and record to `/student_records/<canonicalKey>`
      AlbayanDiagnostics.setConnectionStatus('syncing');
      const canonicalRecordKey = AlbayanDataNormalizer.getCanonicalRecordKey(studentId, normP);
      const recordPayload = {
        ...AlbayanDataNormalizer.createBlankRecord(studentId, cleanCid, normP),
        ...mergedExtra,
        id: canonicalRecordKey,
        student_id: studentId,
        circle_id: cleanCid,
        student_name: cleanName,
        updated_at: nowIso
      };

      // Also inject into rawRecordsCache if present
      if (AlbayanStateStore.state.rawRecordsCache && typeof AlbayanStateStore.state.rawRecordsCache === 'object' && !Array.isArray(AlbayanStateStore.state.rawRecordsCache)) {
        AlbayanStateStore.state.rawRecordsCache[canonicalRecordKey] = recordPayload;
      }

      const [stuPutRes, recPutRes] = await Promise.all([
        AlbayanFirebaseDAL.put(`students/${studentId}`, baseStudent),
        normP.month !== 'سجل نهاية السنة'
          ? AlbayanFirebaseDAL.put(`student_records/${canonicalRecordKey}`, recordPayload)
          : Promise.resolve({ ok: true })
      ]);

      // Update parent circle's student_count in Firebase
      const updatedCircle = AlbayanStateStore.getCircles().find(c => String(c.id) === String(cleanCid));
      if (updatedCircle) {
        AlbayanFirebaseDAL.patch(`circles/${cleanCid}`, {
          student_count: nextRoster.length,
          updated_at: nowIso
        }, { retries: 0 }).catch(() => {});
      }

      if (stuPutRes.ok && recPutRes.ok) {
        if (qid && window.AlbayanLocalDB) {
          window.AlbayanLocalDB.markChangeSynced(qid).catch(() => {});
        }
        await AlbayanFirebaseDAL.touchSyncMeta('students', 'add_student');
        AlbayanDiagnostics.setConnectionStatus('synced');
        AlbayanDiagnostics.log('RosterService', 'addStudent', 'ok', { studentId, circleId: cleanCid, name: cleanName });
        return { ok: true, synced: true, student: fullStudentRow, error: null };
      }

      return { ok: true, synced: false, student: fullStudentRow, error: stuPutRes.error || recPutRes.error };
    }

    /**
     * Updates a student's grades/progress for a specific period with verified cloud write
     * and automatic cleanup of legacy duplicate record keys.
     */
    async function updateStudentRecord(circleId, studentId, period = {}, fields = {}, existingStudent = null) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      const cleanSid = AlbayanDataNormalizer.normalizeStudentId(studentId);
      if (cleanSid === null || cleanSid === undefined) {
        return { ok: false, synced: false, error: { message: 'معرّف الطالب غير صالح.' } };
      }

      const normP = AlbayanDataNormalizer.normalizePeriod(period);
      if (normP.month === 'سجل نهاية السنة') {
        return {
          ok: false,
          synced: false,
          error: { message: 'سجل نهاية السنة يُحسب تلقائياً ولا يُعدّل يدوياً.' }
        };
      }

      const nowIso = new Date().toISOString();
      const blankRec = AlbayanDataNormalizer.createBlankRecord(cleanSid, cleanCid, normP);
      const computedFields = { ...fields };

      // Normalize cleared (null) values to canonical empty values ("" or 0)
      Object.keys(computedFields).forEach(k => {
        if (computedFields[k] === null) {
          computedFields[k] = blankRec[k] !== undefined ? blankRec[k] : '';
        }
      });

      const currentRoster = AlbayanStateStore.getRoster(cleanCid, normP) || [];
      let baseStudent = currentRoster.find(s => String(s.id) === String(cleanSid));
      if (!baseStudent && existingStudent && typeof existingStudent === 'object') {
        baseStudent = existingStudent;
      }
      if (!baseStudent && AlbayanStateStore.state.rawRecordsCache && typeof AlbayanStateStore.state.rawRecordsCache === 'object') {
        const canonicalKey = AlbayanDataNormalizer.getCanonicalRecordKey(cleanSid, normP);
        const cachedRec = AlbayanStateStore.state.rawRecordsCache[canonicalKey];
        if (cachedRec) baseStudent = { ...blankRec, ...cachedRec, id: cleanSid, circle_id: cleanCid };
      }

      // Auto-calculate memo_pages if memorization surah/ayah range is updated or cleared
      if (
        computedFields.from_surah !== undefined ||
        computedFields.to_surah !== undefined ||
        computedFields.from_ayah !== undefined ||
        computedFields.to_ayah !== undefined
      ) {
        const refStu = baseStudent || {};
        const fSurah = computedFields.from_surah !== undefined ? computedFields.from_surah : refStu.from_surah;
        const fAyah = computedFields.from_ayah !== undefined ? computedFields.from_ayah : refStu.from_ayah;
        const tSurah = computedFields.to_surah !== undefined ? computedFields.to_surah : refStu.to_surah;
        const tAyah = computedFields.to_ayah !== undefined ? computedFields.to_ayah : refStu.to_ayah;
        if (fSurah && tSurah && Number(tAyah) > 0) {
          computedFields.memo_pages = AlbayanDataNormalizer.calcQuranPages(fSurah, fAyah, tSurah, tAyah);
        } else {
          computedFields.memo_pages = 0;
        }
      }

      // 1. Update in-memory StateStore immediately
      let updatedStudentRow = null;
      const nextRoster = currentRoster.map(s => {
        if (String(s.id) === String(cleanSid)) {
          updatedStudentRow = {
            ...s,
            ...computedFields,
            id: cleanSid,
            circle_id: cleanCid || s.circle_id,
            period_type: normP.period_type,
            record_date: normP.record_date,
            month: normP.month,
            year: normP.year,
            updated_at: nowIso
          };
          return updatedStudentRow;
        }
        return s;
      });

      if (!updatedStudentRow) {
        updatedStudentRow = {
          ...blankRec,
          ...(baseStudent || {}),
          ...computedFields,
          id: cleanSid,
          circle_id: cleanCid,
          period_type: normP.period_type,
          record_date: normP.record_date,
          month: normP.month,
          year: normP.year,
          updated_at: nowIso
        };
        nextRoster.push(updatedStudentRow);
      }

      AlbayanStateStore.setRoster(cleanCid, normP, nextRoster);

      // 2. Persist locally to IndexedDB & sync_queue
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.updateLocalStudentRecord === 'function') {
        try {
          await window.AlbayanLocalDB.updateLocalStudentRecord(cleanCid, cleanSid, computedFields, normP);
        } catch (e) {}
      }

      // 3. Write full canonical record to `/student_records/<canonicalKey>`
      AlbayanDiagnostics.setConnectionStatus('syncing');
      const canonicalKey = AlbayanDataNormalizer.getCanonicalRecordKey(cleanSid, normP);
      const recordToSave = {
        id: canonicalKey,
        student_id: cleanSid,
        circle_id: cleanCid,
        student_name: updatedStudentRow.name || '',
        from_surah: updatedStudentRow.from_surah || '',
        from_ayah: Number(updatedStudentRow.from_ayah || 0),
        to_surah: updatedStudentRow.to_surah || '',
        to_ayah: Number(updatedStudentRow.to_ayah || 0),
        memo_pages: Number(updatedStudentRow.memo_pages || 0),
        memo_grade: updatedStudentRow.memo_grade !== undefined && updatedStudentRow.memo_grade !== null ? updatedStudentRow.memo_grade : '',
        rev_from_surah: updatedStudentRow.rev_from_surah || '',
        rev_from_ayah: Number(updatedStudentRow.rev_from_ayah || 0),
        rev_to_surah: updatedStudentRow.rev_to_surah || '',
        rev_to_ayah: Number(updatedStudentRow.rev_to_ayah || 0),
        sard_pages: Number(updatedStudentRow.sard_pages || 0),
        rev_grade: updatedStudentRow.rev_grade !== undefined && updatedStudentRow.rev_grade !== null ? updatedStudentRow.rev_grade : '',
        absent_days: Number(updatedStudentRow.absent_days || 0),
        activity_mark: updatedStudentRow.activity_mark !== undefined && updatedStudentRow.activity_mark !== null ? updatedStudentRow.activity_mark : '',
        fiqh: updatedStudentRow.fiqh !== undefined && updatedStudentRow.fiqh !== null ? updatedStudentRow.fiqh : '',
        tafsir: updatedStudentRow.tafsir !== undefined && updatedStudentRow.tafsir !== null ? updatedStudentRow.tafsir : '',
        adhkar: updatedStudentRow.adhkar !== undefined && updatedStudentRow.adhkar !== null ? updatedStudentRow.adhkar : '',
        seerah: updatedStudentRow.seerah !== undefined && updatedStudentRow.seerah !== null ? updatedStudentRow.seerah : '',
        exam_grade: updatedStudentRow.exam_grade || 'لم يختبر بعد',
        exam_title: updatedStudentRow.exam_title || '',
        period_type: normP.period_type,
        record_date: normP.record_date,
        month: normP.month,
        year: normP.year,
        updated_at: nowIso
      };

      // Clean any non-canonical keys for this student & period from rawRecordsCache immediately
      const discoveredLegacyKeys = new Set([
        `${cleanSid}_${normP.safe_month_key}_${normP.year}`,
        `rec_${cleanSid}_${normP.period_type}_${normP.safe_month_key}_${normP.year}`,
        `student_records_${cleanSid}`
      ]);
      if (AlbayanStateStore.state.rawRecordsCache && typeof AlbayanStateStore.state.rawRecordsCache === 'object' && !Array.isArray(AlbayanStateStore.state.rawRecordsCache)) {
        Object.entries(AlbayanStateStore.state.rawRecordsCache).forEach(([rk, rv]) => {
          if (rk === canonicalKey || !rv || typeof rv !== 'object') return;
          const rSid = AlbayanDataNormalizer.normalizeStudentId(rv.student_id !== undefined ? rv.student_id : rv.id);
          if (String(rSid) === String(cleanSid) && AlbayanDataNormalizer.doesRecordMatchPeriod(rv, rk, normP)) {
            discoveredLegacyKeys.add(rk);
            delete AlbayanStateStore.state.rawRecordsCache[rk];
          }
        });
        AlbayanStateStore.state.rawRecordsCache[canonicalKey] = recordToSave;
      }

      const putRes = await AlbayanFirebaseDAL.put(`student_records/${canonicalKey}`, recordToSave);

      // If student name or circle_id was also modified, update `/students/<cleanSid>`
      if (computedFields.name !== undefined || computedFields.circle_id !== undefined) {
        AlbayanStateStore.registerKnownStudent({
          id: cleanSid,
          circle_id: cleanCid,
          name: computedFields.name !== undefined ? computedFields.name : updatedStudentRow.name,
          updated_at: nowIso
        });
        await AlbayanFirebaseDAL.patch(`students/${cleanSid}`, {
          id: cleanSid,
          circle_id: cleanCid,
          ...(computedFields.name !== undefined ? { name: computedFields.name } : {}),
          updated_at: nowIso
        });
      }

      if (putRes.ok) {
        // Clear pending queue items for this student & period
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingSyncQueue === 'function') {
          try {
            const pending = await window.AlbayanLocalDB.getPendingSyncQueue();
            for (const item of pending) {
              if (
                item.entity === 'students' &&
                String(AlbayanDataNormalizer.normalizeStudentId(item.entity_id)) === String(cleanSid) &&
                item.action !== 'DELETE_STUDENT'
              ) {
                await window.AlbayanLocalDB.markChangeSynced(item.qid);
              }
            }
          } catch (e) {}
        }

        // Remove known and discovered legacy duplicate keys for this student+period in background
        Array.from(discoveredLegacyKeys)
          .filter(k => k && k !== canonicalKey)
          .forEach(lk => {
            AlbayanFirebaseDAL.remove(`student_records/${lk}`, { retries: 0 }).catch(() => {});
          });

        await AlbayanFirebaseDAL.touchSyncMeta('student_records', 'update_record');
        AlbayanDiagnostics.setConnectionStatus('synced');
        AlbayanDiagnostics.log('RosterService', 'updateStudentRecord', 'ok', {
          studentId: cleanSid,
          canonicalKey,
          fields: Object.keys(computedFields)
        });
        return { ok: true, synced: true, student: updatedStudentRow, record: recordToSave, error: null };
      }

      AlbayanDiagnostics.log('RosterService', 'updateStudentRecord', 'queued_offline', {
        studentId: cleanSid,
        error: putRes.error
      });
      return { ok: false, synced: false, student: updatedStudentRow, record: recordToSave, error: putRes.error };
    }

    /**
     * Deletes a student from a circle and purges all their records from local & cloud storage.
     */
    async function deleteStudent(circleId, studentId) {
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      const cleanSid = AlbayanDataNormalizer.normalizeStudentId(studentId);
      if (cleanSid === null || cleanSid === undefined) {
        return { ok: false, synced: false, error: { message: 'معرّف الطالب غير صالح.' } };
      }
      const sidStr = String(cleanSid);

      // 1. Add tombstone and remove from known registry & all in-memory rosters for this circle
      AlbayanStateStore.addDeletedId('deleted_students', cleanSid);
      AlbayanStateStore.unregisterKnownStudent(cleanSid);
      AlbayanStateStore.state.rostersByCirclePeriod.forEach((list, key) => {
        const filtered = list.filter(s => String(AlbayanDataNormalizer.normalizeStudentId(s.id)) !== sidStr);
        AlbayanStateStore.state.rostersByCirclePeriod.set(key, filtered);
      });
      AlbayanStateStore.invalidateRawCloudCaches();

      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.deleteLocalStudent === 'function') {
        try {
          await window.AlbayanLocalDB.deleteLocalStudent(cleanSid, cleanCid);
        } catch (e) {}
      }

      // Update circle student count
      const baseKey = `albayan_circle_students_base_${cleanCid}`;
      try {
        const rawBase = JSON.parse(localStorage.getItem(baseKey) || '[]');
        const nextBase = Array.isArray(rawBase)
          ? rawBase.filter(s => String(AlbayanDataNormalizer.normalizeStudentId(s.id)) !== sidStr)
          : [];
        localStorage.setItem(baseKey, JSON.stringify(nextBase));
        AlbayanStateStore.updateCircleStudentCount(cleanCid, nextBase.length);
      } catch (e) {}

      // 2. Delete from Firebase RTDB
      const cloudSynced = await deleteStudentFromCloudOnly(cleanSid, cleanCid);
      return { ok: true, synced: cloudSynced, error: null };
    }

    async function deleteStudentFromCloudOnly(studentId, circleId = null) {
      const cleanSid = AlbayanDataNormalizer.normalizeStudentId(studentId);
      const cleanCid = AlbayanDataNormalizer.normalizeCircleId(circleId);
      const sidStr = String(cleanSid);

      AlbayanStateStore.unregisterKnownStudent(cleanSid);

      AlbayanDiagnostics.setConnectionStatus('syncing');
      const [delCanonical, delLegacy] = await Promise.all([
        AlbayanFirebaseDAL.remove(`students/${cleanSid}`),
        AlbayanFirebaseDAL.remove(`students/students_${cleanSid}`)
      ]);

      // Clean up student_records for this student in background
      (async () => {
        try {
          const recRes = await AlbayanFirebaseDAL.get('student_records');
          if (recRes.ok && recRes.data) {
            const entries = AlbayanDataNormalizer.normalizeCollectionEntries(recRes.data);
            for (const [k, r] of entries) {
              const rSid = AlbayanDataNormalizer.normalizeStudentId(r.student_id !== undefined ? r.student_id : r.id);
              if (String(rSid) === sidStr || k === sidStr || k.startsWith(`${sidStr}_`) || k.startsWith(`rec_${sidStr}_`)) {
                await AlbayanFirebaseDAL.remove(`student_records/${k}`, { retries: 0 });
              }
            }
          }
          if (cleanCid !== null) {
            const cList = AlbayanStateStore.getCircles();
            const cObj = cList.find(c => String(c.id) === String(cleanCid));
            if (cObj) {
              await AlbayanFirebaseDAL.patch(`circles/${cleanCid}`, {
                student_count: Math.max(0, Number(cObj.student_count || 0))
              }, { retries: 0 });
            }
          }
        } catch (e) {}
      })();

      if (delCanonical.ok || delLegacy.ok) {
        await AlbayanFirebaseDAL.touchSyncMeta('students', 'delete_student');
        AlbayanDiagnostics.setConnectionStatus('synced');
        return true;
      }
      return false;
    }

    /**
     * Transfers a student from one circle to another in both local state and Firebase.
     */
    async function transferStudent(studentId, fromCircleId, toCircleId) {
      const cleanSid = AlbayanDataNormalizer.normalizeStudentId(studentId);
      const cleanFrom = AlbayanDataNormalizer.normalizeCircleId(fromCircleId);
      const cleanTo = AlbayanDataNormalizer.normalizeCircleId(toCircleId);
      if (cleanSid === null || cleanTo === null) {
        return { ok: false, synced: false, error: { message: 'بيانات النقل غير مكتملة.' } };
      }

      const nowIso = new Date().toISOString();
      const existingKnown = AlbayanStateStore.getAllKnownStudentsMap()[String(cleanSid)];
      if (existingKnown && existingKnown.name) {
        AlbayanStateStore.registerKnownStudent({
          ...existingKnown,
          id: cleanSid,
          circle_id: cleanTo,
          updated_at: nowIso
        });
      }
      try {
        const fromBaseKey = `albayan_circle_students_base_${cleanFrom}`;
        const rawFromBase = JSON.parse(localStorage.getItem(fromBaseKey) || '[]');
        if (Array.isArray(rawFromBase)) {
          localStorage.setItem(
            fromBaseKey,
            JSON.stringify(rawFromBase.filter(s => String(AlbayanDataNormalizer.normalizeStudentId(s.id)) !== String(cleanSid)))
          );
        }
      } catch (e) {}
      AlbayanStateStore.invalidateRawCloudCaches();

      // Update in Firebase `/students/<cleanSid>`
      AlbayanDiagnostics.setConnectionStatus('syncing');
      const patchRes = await AlbayanFirebaseDAL.patch(`students/${cleanSid}`, {
        id: cleanSid,
        circle_id: cleanTo,
        updated_at: nowIso
      });
      // Remove legacy duplicate key if present
      AlbayanFirebaseDAL.remove(`students/students_${cleanSid}`, { retries: 0 }).catch(() => {});

      // Update local IndexedDB
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.openDB === 'function') {
        try {
          const db = await window.AlbayanLocalDB.openDB();
          await new Promise((resolve) => {
            const tx = db.transaction(['students', 'student_records'], 'readwrite');
            const stuStore = tx.objectStore('students');
            const recStore = tx.objectStore('student_records');
            const sReq = stuStore.get(cleanSid);
            sReq.onsuccess = () => {
              if (sReq.result) {
                sReq.result.circle_id = cleanTo;
                sReq.result.updated_at = nowIso;
                stuStore.put(sReq.result);
              }
            };
            const rReq = recStore.getAll();
            rReq.onsuccess = () => {
              (rReq.result || []).forEach(r => {
                if (String(AlbayanDataNormalizer.normalizeStudentId(r.student_id)) === String(cleanSid)) {
                  r.circle_id = cleanTo;
                  recStore.put(r);
                }
              });
            };
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          });
        } catch (e) {}
      }

      // Clear cached rosters in memory for both circles so next read is fresh
      Array.from(AlbayanStateStore.state.rostersByCirclePeriod.keys()).forEach(k => {
        if (k.startsWith(`${cleanFrom}_`) || k.startsWith(`${cleanTo}_`)) {
          AlbayanStateStore.state.rostersByCirclePeriod.delete(k);
        }
      });

      if (patchRes.ok) {
        await AlbayanFirebaseDAL.touchSyncMeta('students', 'transfer_student');
        AlbayanDiagnostics.setConnectionStatus('synced');
        return { ok: true, synced: true, error: null };
      }

      return { ok: false, synced: false, error: patchRes.error };
    }

    /**
     * Fetches the complete chronological history of a student across all periods.
     */
    async function fetchStudentHistory(studentId) {
      const cleanSid = AlbayanDataNormalizer.normalizeStudentId(studentId);
      if (cleanSid === null) return [];
      const sidStr = String(cleanSid);

      const recRes = await AlbayanFirebaseDAL.get('student_records');
      const allEntries = recRes.ok && recRes.data
        ? AlbayanDataNormalizer.normalizeCollectionEntries(recRes.data)
        : [];

      // Also merge local IndexedDB records for offline completeness
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.openDB === 'function') {
        try {
          const db = await window.AlbayanLocalDB.openDB();
          const localRecs = await new Promise(resolve => {
            const tx = db.transaction(['student_records'], 'readonly');
            const req = tx.objectStore('student_records').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
          localRecs.forEach((lr, idx) => {
            allEntries.push([`local_${idx}`, lr]);
          });
        } catch (e) {}
      }

      const periodBucket = new Map();
      allEntries.forEach(([, r]) => {
        if (!r || typeof r !== 'object') return;
        const rSid = AlbayanDataNormalizer.normalizeStudentId(r.student_id !== undefined ? r.student_id : r.id);
        if (String(rSid) !== sidStr) return;
        const normP = AlbayanDataNormalizer.normalizePeriod(r);
        if (normP.month === 'سجل نهاية السنة') return;
        if (AlbayanDataNormalizer.scoreRecordCompleteness(r) === 0) return;

        const existing = periodBucket.get(normP.period_key);
        if (!existing || AlbayanDataNormalizer.scoreRecordCompleteness(r) >= AlbayanDataNormalizer.scoreRecordCompleteness(existing)) {
          periodBucket.set(normP.period_key, {
            ...r,
            period_type: normP.period_type,
            month: normP.month,
            year: normP.year,
            record_date: normP.record_date
          });
        }
      });

      return Array.from(periodBucket.values());
    }

    async function syncPendingRecordItem(item) {
      if (!item || !item.payload) return false;
      const p = item.payload;
      const cid = p.circle_id || item.circle_id;
      const sid = p.student_id || p.id || item.entity_id;
      const res = await updateStudentRecord(cid, sid, {
        period_type: p.period_type || 'monthly',
        year: p.year || '1448',
        month: p.month || 'صفر',
        record_date: p.record_date || ''
      }, p);
      return !!(res && res.synced);
    }

    return {
      fetchRoster,
      addStudent,
      updateStudentRecord,
      deleteStudent,
      deleteStudentFromCloudOnly,
      transferStudent,
      fetchStudentHistory,
      syncPendingRecordItem
    };
  })();

  // ==========================================================================
  // SUPPORTING SERVICES: USERS, EXAMS, RESULTS, STUDENT CVS & FULL SYNC
  // ==========================================================================

  async function pullUsersFromFirebase() {
    const res = await AlbayanFirebaseDAL.get('users');
    if (!res.ok || !res.data) {
      if (window.AlbayanLocalDB) return window.AlbayanLocalDB.getUsers();
      return [];
    }
    const deletedUsers = AlbayanStateStore.getDeletedIds('deleted_users');
    const dedup = new Map();
    AlbayanDataNormalizer.normalizeCollectionEntries(res.data).forEach(([k, u]) => {
      const uid = AlbayanDataNormalizer.normalizeUserId(u.id !== undefined ? u.id : (u.local_id !== undefined ? u.local_id : k));
      if (uid === null || deletedUsers.has(String(uid))) return;
      dedup.set(String(uid), { ...u, id: uid, local_id: uid });
    });
    const list = Array.from(dedup.values());
    try { localStorage.setItem('cached_users_list', JSON.stringify(list)); } catch (e) {}
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveUsers === 'function') {
      window.AlbayanLocalDB.saveUsers(list).catch(() => {});
    }
    return list;
  }

  async function saveUserToFirebase(userObj) {
    if (!userObj) return false;
    const uid = AlbayanDataNormalizer.normalizeUserId(userObj.id !== undefined ? userObj.id : Date.now());
    const payload = { ...userObj, id: uid, local_id: uid, updated_at: new Date().toISOString() };
    const res = await AlbayanFirebaseDAL.put(`users/${uid}`, payload);
    AlbayanFirebaseDAL.remove(`users/users_${uid}`, { retries: 0 }).catch(() => {});
    if (res.ok) await AlbayanFirebaseDAL.touchSyncMeta('users', 'save_user');
    return res.ok;
  }

  async function deleteUserFromFirebase(userId) {
    const uid = AlbayanDataNormalizer.normalizeUserId(userId);
    if (uid === null) return false;
    AlbayanStateStore.addDeletedId('deleted_users', uid);
    if (window.AlbayanLocalDB) await window.AlbayanLocalDB.deleteLocalUser(uid).catch(() => {});
    const [r1, r2] = await Promise.all([
      AlbayanFirebaseDAL.remove(`users/${uid}`),
      AlbayanFirebaseDAL.remove(`users/users_${uid}`)
    ]);
    if (r1.ok || r2.ok) await AlbayanFirebaseDAL.touchSyncMeta('users', 'delete_user');
    return r1.ok || r2.ok;
  }

  async function pullExamsFromFirebase() {
    const res = await AlbayanFirebaseDAL.get('exams');
    if (!res.ok || !res.data) {
      if (window.AlbayanLocalDB) return window.AlbayanLocalDB.getLocalExams();
      return [];
    }
    const deletedExams = AlbayanStateStore.getDeletedIds('deleted_exams');
    const dedup = new Map();
    AlbayanDataNormalizer.normalizeCollectionEntries(res.data).forEach(([k, ex]) => {
      const exId = AlbayanDataNormalizer.normalizeEntityId(ex.id !== undefined ? ex.id : (ex.local_id !== undefined ? ex.local_id : k), 'exams');
      if (exId === null || deletedExams.has(String(exId))) return;
      dedup.set(String(exId), { ...ex, id: exId, local_id: exId });
    });
    const list = Array.from(dedup.values());
    try { localStorage.setItem('cached_exams_list', JSON.stringify(list)); } catch (e) {}
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheExams === 'function') {
      window.AlbayanLocalDB.cacheExams(list).catch(() => {});
    }
    return list;
  }

  async function saveExamToFirebase(examObj) {
    if (!examObj) return false;
    const exId = AlbayanDataNormalizer.normalizeEntityId(examObj.id !== undefined ? examObj.id : Date.now(), 'exams');
    const payload = { ...examObj, id: exId, local_id: exId, updated_at: new Date().toISOString() };
    const res = await AlbayanFirebaseDAL.put(`exams/${exId}`, payload);
    AlbayanFirebaseDAL.remove(`exams/exams_${exId}`, { retries: 0 }).catch(() => {});
    if (res.ok) await AlbayanFirebaseDAL.touchSyncMeta('exams', 'save_exam');
    return res.ok;
  }

  async function deleteExamFromFirebase(examId) {
    const exId = AlbayanDataNormalizer.normalizeEntityId(examId, 'exams');
    if (exId === null) return false;
    AlbayanStateStore.addDeletedId('deleted_exams', exId);
    if (window.AlbayanLocalDB) await window.AlbayanLocalDB.deleteLocalExam(exId).catch(() => {});
    const [r1, r2] = await Promise.all([
      AlbayanFirebaseDAL.remove(`exams/${exId}`),
      AlbayanFirebaseDAL.remove(`exams/exams_${exId}`)
    ]);
    if (r1.ok || r2.ok) await AlbayanFirebaseDAL.touchSyncMeta('exams', 'delete_exam');
    return r1.ok || r2.ok;
  }

  async function pullStudentCvsFromFirebase() {
    try {
      const [cvsRes, mRecsRes, studentsRes, circlesRes] = await Promise.all([
        AlbayanFirebaseDAL.get('student_cvs'),
        AlbayanFirebaseDAL.get('student_cv_monthly_records'),
        AlbayanFirebaseDAL.get('students'),
        AlbayanFirebaseDAL.get('circles')
      ]);

      const deletedCircles = AlbayanStateStore.getDeletedIds('deleted_circles');
      const deletedStudents = AlbayanStateStore.getDeletedIds('deleted_students');

      // 1. Build circle lookup map: circleId -> { id, name, teacher_name, level }
      const circleMap = new Map();
      if (circlesRes.ok && circlesRes.data) {
        const rawCircles = AlbayanDataNormalizer.flattenFirebaseNode(circlesRes.data, 'circles');
        for (const c of rawCircles) {
          const cid = AlbayanDataNormalizer.normalizeCircleId(c.id !== undefined ? c.id : c._fbKey);
          if (cid !== null && !deletedCircles.has(String(cid))) {
            circleMap.set(String(cid), {
              id: cid,
              name: c.name || c.circle_name || `حلقة ${cid}`,
              teacher_name: c.teacher_name || c.teacher || 'غير محدد',
              level: c.level || c.memorization_level || ''
            });
          }
        }
      }

      // 2. Group monthly CV records by cv_id / student_id
      const monthlyByCvId = new Map();
      if (mRecsRes.ok && mRecsRes.data) {
        const rawMRecs = AlbayanDataNormalizer.flattenFirebaseNode(mRecsRes.data, 'student_cv_monthly_records');
        for (const mr of rawMRecs) {
          const cid = mr.cv_id !== undefined ? mr.cv_id : (mr.student_id !== undefined ? mr.student_id : mr.id);
          const normId = AlbayanDataNormalizer.normalizeStudentId(cid);
          const mKey = mr.month_key || mr.month;
          if (normId !== null && mKey) {
            if (!monthlyByCvId.has(String(normId))) monthlyByCvId.set(String(normId), {});
            monthlyByCvId.get(String(normId))[mKey] = mr;
          }
        }
      }

      // 3. Parse explicit CVs from /student_cvs
      const cvById = new Map();
      const cvByName = new Map();
      if (cvsRes.ok && cvsRes.data) {
        const rawCvs = AlbayanDataNormalizer.flattenFirebaseNode(cvsRes.data, 'student_cvs');
        for (const cv of rawCvs) {
          const rawId = (cv.student_id !== undefined && cv.student_id !== null) ? cv.student_id : (cv.id !== undefined ? cv.id : cv._fbKey);
          const normId = AlbayanDataNormalizer.normalizeStudentId(rawId);
          if (normId === null) continue;
          if (deletedStudents.has(String(normId))) continue;
          const mRecs = Object.assign({}, monthlyByCvId.get(String(normId)) || {}, cv.monthly_records || {});
          const cleanCv = {
            ...cv,
            id: normId,
            student_id: cv.student_id || normId,
            name: (cv.name || '').trim(),
            monthly_records: mRecs,
            available_months: Object.keys(mRecs)
          };
          delete cleanCv._fbKey;
          if (cleanCv.name) {
            cvById.set(String(normId), cleanCv);
            cvByName.set(cleanCv.name.toLowerCase(), cleanCv);
          }
        }
      }

      // 4. Merge all active students from /students so every student in every circle appears in student_cv.html
      if (studentsRes.ok && studentsRes.data) {
        const rawStudents = AlbayanDataNormalizer.flattenFirebaseNode(studentsRes.data, 'students');
        for (const st of rawStudents) {
          const sid = AlbayanDataNormalizer.normalizeStudentId(st.id !== undefined ? st.id : (st.student_id !== undefined ? st.student_id : st._fbKey));
          if (sid === null || deletedStudents.has(String(sid))) continue;
          const sName = (st.name || st.student_name || '').trim();
          if (!sName) continue;

          const cid = AlbayanDataNormalizer.normalizeCircleId(st.circle_id);
          if (cid !== null && deletedCircles.has(String(cid))) continue;

          const circleInfo = (cid !== null && circleMap.has(String(cid))) ? circleMap.get(String(cid)) : null;
          const cName = circleInfo ? circleInfo.name : (st.circle_name || 'بدون حلقة');
          const tName = circleInfo ? circleInfo.teacher_name : (st.teacher_name || 'غير متوفر');
          const cLevel = circleInfo ? circleInfo.level : (st.memorization_level || 'غير متوفر');

          let existing = cvById.get(String(sid));
          if (existing) {
            if (!existing.circle_name || existing.circle_name === 'غير متوفر' || existing.circle_name === 'بدون حلقة') existing.circle_name = cName;
            if (!existing.teacher_name || existing.teacher_name === 'غير متوفر') existing.teacher_name = tName;
            if (!existing.memorization_level || existing.memorization_level === 'غير متوفر') existing.memorization_level = cLevel;
            if (cid !== null) existing.circle_id = cid;
            if (!existing.phone && st.phone) existing.phone = st.phone;
            if (!existing.guardian_phone && st.guardian_phone) existing.guardian_phone = st.guardian_phone;
            if (!existing.birth_date && st.birth_date) existing.birth_date = st.birth_date;
          } else {
            const mRecs = monthlyByCvId.get(String(sid)) || {};
            const synthesized = {
              id: sid,
              student_id: sid,
              circle_id: cid,
              name: sName,
              birth_date: st.birth_date || '',
              phone: st.phone || '',
              guardian_phone: st.guardian_phone || '',
              study_level: st.study_level || '',
              circle_name: cName,
              memorization_level: cLevel,
              teacher_name: tName,
              studied_material: st.studied_material || 'التفسير',
              studied_material_desc: st.studied_material_desc || '',
              exam_score: st.exam_score !== undefined ? st.exam_score : 85,
              monthly_records: mRecs,
              available_months: Object.keys(mRecs)
            };
            cvById.set(String(sid), synthesized);
          }
        }
      }

      const finalCvs = Array.from(cvById.values());
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudentCvs === 'function' && finalCvs.length > 0) {
        window.AlbayanLocalDB.cacheStudentCvs(finalCvs).catch(() => {});
      }
      return finalCvs;
    } catch (err) {
      AlbayanDiagnostics.log('StudentCV', 'pullStudentCvsFromFirebase', 'error', err);
      return [];
    }
  }

  async function saveStudentCvToFirebase(cvRecord) {
    if (!cvRecord || !cvRecord.id) return false;
    const normId = AlbayanDataNormalizer.normalizeStudentId(cvRecord.id);
    const payload = {
      ...cvRecord,
      id: normId,
      updated_at: new Date().toISOString()
    };
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudentCvs === 'function') {
      await window.AlbayanLocalDB.cacheStudentCvs([payload]).catch(() => {});
    }
    const res = await AlbayanFirebaseDAL.put(`student_cvs/cv_${normId}`, payload);
    if (res.ok) await AlbayanFirebaseDAL.touchSyncMeta('student_cvs', 'save_cv');
    return res.ok;
  }

  async function pullAllDataFromFirebase(force = false) {
    try {
      // Flush any pending local changes first so local edits are never overwritten
      if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.processSyncQueue === 'function') {
        await window.AlbayanLocalDB.processSyncQueue().catch(() => {});
      }

      const [circlesResult, usersList, examsList] = await Promise.all([
        CirclesService.fetchCircles({ forceRefresh: force }),
        pullUsersFromFirebase(),
        pullExamsFromFirebase()
      ]);

      window.dispatchEvent(new CustomEvent('albayan:db-synced', {
        detail: {
          circlesCount: (circlesResult.circles || []).length,
          usersCount: (usersList || []).length,
          examsCount: (examsList || []).length
        }
      }));
      return true;
    } catch (err) {
      AlbayanDiagnostics.log('Sync', 'pullAllDataFromFirebase', 'error', err);
      return false;
    }
  }

  // ==========================================================================
  // BACKWARD-COMPATIBLE GLOBAL ADAPTERS & EVENT BUS
  // ==========================================================================

  async function pullCirclesFromFirebase(forceRefresh = false) {
    const res = await CirclesService.fetchCircles({ forceRefresh: !!forceRefresh });
    return res.circles || [];
  }

  async function saveCircleToFirebase(circleData) {
    const res = await CirclesService.saveCircle(circleData, { isEdit: true });
    return !!(res && res.synced);
  }

  async function deleteCircleFromFirebase(circleId) {
    const res = await CirclesService.deleteCircle(circleId);
    return !!(res && res.synced);
  }

  async function pullStudentsFromFirebase(circleId, period = {}, forceRefresh = false) {
    const res = await RosterService.fetchRoster(circleId, period, { forceRefresh: !!forceRefresh });
    return res.students || [];
  }

  async function saveStudentToFirebase(studentData, period = {}) {
    if (!studentData) return false;
    const cid = studentData.circle_id;
    const sid = studentData.id || studentData.student_id;
    const res = await RosterService.addStudent(cid, studentData.name, period, { ...studentData, id: sid });
    return !!(res && res.synced);
  }

  function triggerInstantSync() {
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.processSyncQueue === 'function') {
      window.AlbayanLocalDB.processSyncQueue().catch(() => {});
    }
  }

  // Expose Clean Layered Architecture & Backward-Compatible Globals
  window.firebaseConfig = firebaseConfig;
  window.AlbayanDiagnostics = AlbayanDiagnostics;
  window.AlbayanDataNormalizer = AlbayanDataNormalizer;
  window.AlbayanFirebaseDAL = AlbayanFirebaseDAL;
  window.AlbayanStateStore = AlbayanStateStore;
  window.CirclesService = CirclesService;
  window.RosterService = RosterService;

  window.pullCirclesFromFirebase = pullCirclesFromFirebase;
  window.saveCircleToFirebase = saveCircleToFirebase;
  window.deleteCircleFromFirebase = deleteCircleFromFirebase;
  window.pullStudentsFromFirebase = pullStudentsFromFirebase;
  window.saveStudentToFirebase = saveStudentToFirebase;
  window.pullUsersFromFirebase = pullUsersFromFirebase;
  window.saveUserToFirebase = saveUserToFirebase;
  window.deleteUserFromFirebase = deleteUserFromFirebase;
  window.pullExamsFromFirebase = pullExamsFromFirebase;
  window.saveExamToFirebase = saveExamToFirebase;
  window.deleteExamFromFirebase = deleteExamFromFirebase;
  window.pullStudentCvsFromFirebase = pullStudentCvsFromFirebase;
  window.saveStudentCvToFirebase = saveStudentCvToFirebase;
  window.pullAllDataFromFirebase = pullAllDataFromFirebase;
  window.triggerInstantSync = triggerInstantSync;
  window.touchCloudSyncMeta = AlbayanFirebaseDAL.touchSyncMeta;

  window.AlbayanCloudSync = {
    pullCircles: pullCirclesFromFirebase,
    saveCircle: saveCircleToFirebase,
    deleteCircle: deleteCircleFromFirebase,
    pullStudents: pullStudentsFromFirebase,
    saveStudent: saveStudentToFirebase,
    pullStudentCvs: pullStudentCvsFromFirebase,
    saveStudentCv: saveStudentCvToFirebase,
    pullAll: pullAllDataFromFirebase,
    triggerInstantSync
  };

  // Notify pages immediately and on DOMContentLoaded that the Firebase layer is ready
  const fireReady = () => {
    window.dispatchEvent(new CustomEvent('albayan:firebase-ready'));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireReady);
  } else {
    setTimeout(fireReady, 0);
  }
})();
