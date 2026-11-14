/**
 * ABOUT ME - Student Exclusive Records & Review Engine (Mobile-First Native App UX)
 * مدرسة البيان لتعليم القرآن الكريم
 */

let studentRecordsState = null;
let currentRecordFilter = "all";
let currentRecordSearch = "";

// 114 Quranic Surahs Start Pages (Madinah Mushaf)
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

const QURAN_SURAHS = [
  {id:1, name:"الفاتحة", ayahs:7}, {id:2, name:"البقرة", ayahs:286}, {id:3, name:"آل عمران", ayahs:200}, {id:4, name:"النساء", ayahs:176},
  {id:5, name:"المائدة", ayahs:120}, {id:6, name:"الأنعام", ayahs:165}, {id:7, name:"الأعراف", ayahs:206}, {id:8, name:"الأنفال", ayahs:75},
  {id:9, name:"التوبة", ayahs:129}, {id:10, name:"يونس", ayahs:109}, {id:11, name:"هود", ayahs:123}, {id:12, name:"يوسف", ayahs:111},
  {id:13, name:"الرعد", ayahs:43}, {id:14, name:"إبراهيم", ayahs:52}, {id:15, name:"الحجر", ayahs:99}, {id:16, name:"النحل", ayahs:128},
  {id:17, name:"الإسراء", ayahs:111}, {id:18, name:"الكهف", ayahs:110}, {id:19, name:"مريم", ayahs:98}, {id:20, name:"طه", ayahs:135},
  {id:21, name:"الأنبياء", ayahs:112}, {id:22, name:"الحج", ayahs:78}, {id:23, name:"المؤمنون", ayahs:118}, {id:24, name:"النور", ayahs:64},
  {id:25, name:"الفرقان", ayahs:77}, {id:26, name:"الشعراء", ayahs:227}, {id:27, name:"النمل", ayahs:93}, {id:28, name:"القصص", ayahs:88},
  {id:29, name:"العنكبوت", ayahs:69}, {id:30, name:"الروم", ayahs:60}, {id:31, name:"لقمان", ayahs:34}, {id:32, name:"السجدة", ayahs:30},
  {id:33, name:"الأحزاب", ayahs:73}, {id:34, name:"سبأ", ayahs:54}, {id:35, name:"فاطر", ayahs:45}, {id:36, name:"يس", ayahs:83},
  {id:37, name:"الصافات", ayahs:182}, {id:38, name:"ص", ayahs:88}, {id:39, name:"الزمر", ayahs:75}, {id:40, name:"غافر", ayahs:85},
  {id:41, name:"فصلت", ayahs:54}, {id:42, name:"الشورى", ayahs:53}, {id:43, name:"الزخرف", ayahs:89}, {id:44, name:"الدخان", ayahs:59},
  {id:45, name:"الجاثية", ayahs:37}, {id:46, name:"الأحقاف", ayahs:35}, {id:47, name:"محمد", ayahs:38}, {id:48, name:"الفتح", ayahs:29},
  {id:49, name:"الحجرات", ayahs:18}, {id:50, name:"ق", ayahs:45}, {id:51, name:"الذاريات", ayahs:60}, {id:52, name:"الطور", ayahs:49},
  {id:53, name:"النجم", ayahs:62}, {id:54, name:"القمر", ayahs:55}, {id:55, name:"الرحمن", ayahs:78}, {id:56, name:"الواقعة", ayahs:96},
  {id:57, name:"الحديد", ayahs:29}, {id:58, name:"المجادلة", ayahs:22}, {id:59, name:"الحشر", ayahs:24}, {id:60, name:"الممتحنة", ayahs:13},
  {id:61, name:"الصف", ayahs:14}, {id:62, name:"الجمعة", ayahs:11}, {id:63, name:"المنافقون", ayahs:11}, {id:64, name:"التغابن", ayahs:18},
  {id:65, name:"الطلاق", ayahs:12}, {id:66, name:"التحريم", ayahs:12}, {id:67, name:"الملك", ayahs:30}, {id:68, name:"القلم", ayahs:52},
  {id:69, name:"الحاقة", ayahs:52}, {id:70, name:"المعارج", ayahs:44}, {id:71, name:"نوح", ayahs:28}, {id:72, name:"الجن", ayahs:28},
  {id:73, name:"المزمل", ayahs:20}, {id:74, name:"المدثر", ayahs:56}, {id:75, name:"القيامة", ayahs:40}, {id:76, name:"الإنسان", ayahs:31},
  {id:77, name:"المرسلات", ayahs:50}, {id:78, name:"النبأ", ayahs:40}, {id:79, name:"النازعات", ayahs:46}, {id:80, name:"عبس", ayahs:42},
  {id:81, name:"التكوير", ayahs:29}, {id:82, name:"الانفطار", ayahs:19}, {id:83, name:"المطففين", ayahs:36}, {id:84, name:"الانشقاق", ayahs:25},
  {id:85, name:"البروج", ayahs:22}, {id:86, name:"الطارق", ayahs:17}, {id:87, name:"الأعلى", ayahs:19}, {id:88, name:"الغاشية", ayahs:26},
  {id:89, name:"الفجر", ayahs:30}, {id:90, name:"البلد", ayahs:20}, {id:91, name:"الشمس", ayahs:15}, {id:92, name:"الليل", ayahs:21},
  {id:93, name:"الضحى", ayahs:11}, {id:94, name:"الشرح", ayahs:8}, {id:95, name:"التين", ayahs:8}, {id:96, name:"العلق", ayahs:19},
  {id:97, name:"القدر", ayahs:5}, {id:98, name:"البينة", ayahs:8}, {id:99, name:"الزلزلة", ayahs:8}, {id:100, name:"العاديات", ayahs:11},
  {id:101, name:"القارعة", ayahs:11}, {id:102, name:"التكاثر", ayahs:8}, {id:103, name:"العصر", ayahs:3}, {id:104, name:"الهمزة", ayahs:9},
  {id:105, name:"الفيل", ayahs:5}, {id:106, name:"قريش", ayahs:4}, {id:107, name:"الماعون", ayahs:7}, {id:108, name:"الكوثر", ayahs:3},
  {id:109, name:"الكافرون", ayahs:6}, {id:110, name:"النصر", ayahs:3}, {id:111, name:"المسد", ayahs:5}, {id:112, name:"الإخلاص", ayahs:4},
  {id:113, name:"الفلق", ayahs:5}, {id:114, name:"الناس", ayahs:6}
];

// Arabic Name Normalization & Comparison Helpers
function normalizeArabicName(name) {
  if (!name) return "";
  let s = String(name).trim();
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, ""); // Harakat & Tatweel
  s = s.replace(/[أإآٱ]/g, "ا");
  s = s.replace(/[ةه]/g, "ه");
  s = s.replace(/[ىي]/g, "ي");
  s = s.replace(/[ؤ]/g, "و");
  s = s.replace(/[ئ]/g, "ي");
  s = s.replace(/\bعبد\s+/g, "عبد");
  s = s.replace(/\bال\s+/g, "ال");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, "");
  return s.split(/\s+/).join(" ").toLowerCase();
}

function isNameMatch(n1, n2) {
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  const a = normalizeArabicName(n1);
  const b = normalizeArabicName(n2);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

// Helper to calculate exact pages between two Quran positions
function calculateClientPages(fromSurah, fromAyah, toSurah, toAyah) {
  if (!fromSurah || !toSurah) return 0;
  const fName = String(fromSurah).trim();
  const tName = String(toSurah).trim();
  let fromIdx = QURAN_SURAHS.findIndex(s => s.name === fName);
  let toIdx = QURAN_SURAHS.findIndex(s => s.name === tName);
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
    const ayahsCount = QURAN_SURAHS[idx]?.ayahs || 1;
    if (endP <= startP) return startP;
    const fraction = (Math.max(1, ayah) - 1) / Math.max(1, ayahsCount);
    const offset = Math.floor(fraction * (endP - startP + 1));
    return Math.min(endP, startP + offset);
  };

  const pFrom = getPage(fromIdx, fa);
  const pTo = getPage(toIdx, ta);
  return Math.max(1, pTo - pFrom + 1);
}

// Calculate complete record total (out of 200) and percentage
function calculateRecordTotal(rec) {
  const memoScore = parseFloat(rec.memo_grade);
  const memo = (!isNaN(memoScore) && memoScore > 0) ? memoScore : 0;

  const revScore = parseFloat(rec.rev_grade);
  const rev = (!isNaN(revScore) && revScore > 0) ? revScore : 0;

  const absDays = parseInt(rec.absent_days, 10) || 0;
  const attendance = Math.max(0, 30 - (absDays * 0.5));

  const actScore = parseFloat(rec.activity_mark);
  const activity = (!isNaN(actScore) && actScore > 0) ? actScore : 0;

  const fScore = parseFloat(rec.fiqh);
  const fiqh = (!isNaN(fScore) && fScore > 0) ? fScore : 0;

  const tScore = parseFloat(rec.tafsir);
  const tafsir = (!isNaN(tScore) && tScore > 0) ? tScore : 0;

  const aScore = parseFloat(rec.adhkar);
  const adhkar = (!isNaN(aScore) && aScore > 0) ? aScore : 0;

  const sScore = parseFloat(rec.seerah);
  const seerah = (!isNaN(sScore) && sScore > 0) ? sScore : 0;

  let total = memo + rev + attendance + activity + fiqh + tafsir + adhkar + seerah;
  total = Math.round(total * 10) / 10;
  const percentage = Math.round((total / 200) * 1000) / 10;

  let pctClass = "good";
  if (percentage >= 90) pctClass = "excellent";
  else if (percentage >= 75) pctClass = "verygood";
  else if (percentage < 50) pctClass = "warning";

  return { total, percentage, pctClass, attendance, activity };
}

// Helper for Hijri/Dual date
function getFormattedDualDate(dateStr) {
  if (window.formatDualDate) {
    return window.formatDualDate(dateStr);
  }
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString("ar-SA") + " هـ / " + d.toLocaleDateString("ar-EG") + " م";
  } catch (e) {
    return dateStr || "—";
  }
}

// Fetch all student record data on load (Instant SWR: Local Cache 0ms -> Silent Background Sync)
async function loadStudentRecordData() {
  const loadingOverlay = document.getElementById("portalLoading");
  const hideLoading = () => { if (loadingOverlay) loadingOverlay.style.display = "none"; };
  const safetyTimeout = setTimeout(hideLoading, 2500);

  // 1. Immediately read and display locally cached results if present (0ms offline speed)
  let localCache = null;
  try {
    localCache = JSON.parse(localStorage.getItem('albayan_student_records_cache') || 'null');
    if (localCache && typeof localCache === "object") {
      studentRecordsState = localCache;
      renderRecordsUI(localCache);
      hideLoading();
    }
  } catch(e) {}

  // If no cache at all, only then show overlay while initial fetching
  if (!studentRecordsState && loadingOverlay) {
    loadingOverlay.style.display = "flex";
  }

  let cachedUser = {};
  try {
    cachedUser = JSON.parse(localStorage.getItem('albayan_logged_user') || '{}');
  } catch(e) {}
  const studentName = (cachedUser.student_name || cachedUser.display_name || cachedUser.username || "طالب البيان").trim();
  const cachedStudentId = cachedUser.student_id || cachedUser.id || null;

  let fetchedData = null;

  // 2. Try fetching from server endpoint (skip or fast-timeout on mobile/serverless)
  const isMobileApp = !!(window.Capacitor || window.location.protocol === 'file:');
  // 2. Direct Cloud pull via Firebase Realtime Database with smart caching (Serverless Architecture)

  // 3. Fallback: Direct Firebase Realtime Database fetch with entity caching
  if (!fetchedData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const fbBase = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";
      
      // Check cached students and circles (1 hour TTL)
      let cachedStudents = null;
      let cachedCircles = null;
      try {
        const cs = JSON.parse(localStorage.getItem('albayan_student_portal_students') || 'null');
        if (cs && cs.data && (Date.now() - cs.time < 3600000)) cachedStudents = cs.data;
        const cc = JSON.parse(localStorage.getItem('albayan_student_portal_circles') || 'null');
        if (cc && cc.data && (Date.now() - cc.time < 3600000)) cachedCircles = cc.data;
      } catch(e) {}

      const fetchPromises = [
        fetch(`${fbBase}/student_records.json`, { signal: controller.signal }).catch(() => null)
      ];
      if (!cachedStudents) fetchPromises.push(fetch(`${fbBase}/students.json`, { signal: controller.signal }).catch(() => null));
      if (!cachedCircles) fetchPromises.push(fetch(`${fbBase}/circles.json`, { signal: controller.signal }).catch(() => null));

      const responses = await Promise.all(fetchPromises);
      clearTimeout(timeoutId);

      const recordsRes = responses[0];
      let respIdx = 1;
      let studentsRaw = cachedStudents;
      if (!cachedStudents) {
        const sRes = responses[respIdx++];
        if (sRes && sRes.ok) {
          studentsRaw = await sRes.json();
          try { localStorage.setItem('albayan_student_portal_students', JSON.stringify({ time: Date.now(), data: studentsRaw })); } catch(e) {}
        }
      }
      let circlesRaw = cachedCircles;
      if (!cachedCircles) {
        const cRes = responses[respIdx++];
        if (cRes && cRes.ok) {
          circlesRaw = await cRes.json();
          try { localStorage.setItem('albayan_student_portal_circles', JSON.stringify({ time: Date.now(), data: circlesRaw })); } catch(e) {}
        }
      }

      let recordsRaw = recordsRes && recordsRes.ok ? await recordsRes.json() : null;

      let studentObj = null;
      let studentId = null;
      let circleId = null;
      let circleName = (localCache && localCache.student && localCache.student.circle_name) || "مدرسة البيان لتعليم القرآن";
      let teacherName = (localCache && localCache.student && localCache.student.teacher_name) || "كادر التحفيظ";

      // Match student
      if (studentsRaw && typeof studentsRaw === "object") {
        const sList = Array.isArray(studentsRaw) ? studentsRaw : Object.values(studentsRaw);
        studentObj = sList.find(s => s && isNameMatch(s.name || s.student_name, studentName));
        if (studentObj) {
          studentId = studentObj.id || studentObj.local_id;
          circleId = studentObj.circle_id;
        }
      }

      // Match circle
      if (circlesRaw && typeof circlesRaw === "object") {
        const cList = Array.isArray(circlesRaw) ? circlesRaw : Object.values(circlesRaw);
        let circleObj = null;
        if (circleId) {
          circleObj = cList.find(c => c && (c.id == circleId || c.local_id == circleId));
        }
        if (!circleObj && studentObj) {
          circleObj = cList.find(c => c && c.name && studentObj.circle_name && c.name === studentObj.circle_name);
        }
        if (circleObj) {
          circleName = circleObj.name || circleName;
          teacherName = circleObj.teacher_name || circleObj.teacher || teacherName;
        }
      }

      // Match & build records
      if (recordsRaw && typeof recordsRaw === "object") {
        const rList = Array.isArray(recordsRaw) ? recordsRaw.filter(Boolean) : Object.entries(recordsRaw).map(([k, v]) => ({ cloud_id: k, ...(v || {}) }));
        
        const matchedRecords = rList.filter(r => {
          if (!r || typeof r !== "object") return false;
          if (studentId && (r.student_id == studentId || r.local_student_id == studentId)) return true;
          if (r.student_name && isNameMatch(r.student_name, studentName)) return true;
          if (r.name && isNameMatch(r.name, studentName)) return true;
          return false;
        });

        if (matchedRecords.length > 0) {
          // Reconcile and deduplicate records by normalized period (period_type, year, month)
          // Uses Disjoint Field-Level Merging with Provenance & Conflict Tracking
          const periodMap = new Map();
          matchedRecords.forEach(r => {
            const norm = typeof window.normalizeArabicPeriod === 'function'
              ? window.normalizeArabicPeriod(r.month, r.year, r.period_type)
              : { normMonth: String(r.month || '').trim(), normYear: String(r.year || '1448').trim(), normPeriodType: String(r.period_type || 'monthly').trim() };
            const pKey = `${norm.normPeriodType}_${norm.normYear}_${norm.normMonth}`;
            const existing = periodMap.get(pKey);
            if (!existing) {
              periodMap.set(pKey, { ...r, _raw_candidates: [r] });
            } else {
              const timeA = new Date(r.updated_at || r.created_at || 0).getTime();
              const timeB = new Date(existing.updated_at || existing.created_at || 0).getTime();
              const newer = (timeA >= timeB) ? r : existing;
              const older = (timeA >= timeB) ? existing : r;

              // 1. Start with newer base
              const merged = { ...older, ...newer };

              // 2. Disjoint field merge: preserve non-empty rubric fields from older if absent in newer
              const rubricFields = [
                'memo_grade', 'memo_pages', 'from_surah', 'from_ayah', 'to_surah', 'to_ayah',
                'rev_grade', 'rev_pages', 'sard_pages', 'rev_from_surah', 'rev_from_ayah', 'rev_to_surah', 'rev_to_ayah',
                'absent_days', 'activity_mark', 'fiqh', 'tafsir', 'adhkar', 'seerah', 'notes'
              ];
              const conflicts = [];
              rubricFields.forEach(field => {
                const valNew = newer[field];
                const valOld = older[field];
                const hasNew = valNew !== undefined && valNew !== null && valNew !== "" && valNew !== 0;
                const hasOld = valOld !== undefined && valOld !== null && valOld !== "" && valOld !== 0;

                if (!hasNew && hasOld) {
                  merged[field] = valOld; // Preserve disjoint non-empty field
                } else if (hasNew && hasOld && String(valNew).trim() !== String(valOld).trim()) {
                  conflicts.push({
                    field: field,
                    candidateNew: valNew,
                    candidateOld: valOld,
                    newerSource: newer.cloud_id || newer.id,
                    olderSource: older.cloud_id || older.id
                  });
                }
              });

              merged._conflicts = (existing._conflicts || []).concat(conflicts);
              merged._raw_candidates = (existing._raw_candidates || [existing]).concat([r]);
              periodMap.set(pKey, merged);
            }
          });

          const uniqueRecords = Array.from(periodMap.values());

          // Sort newest first by year/id
          uniqueRecords.sort((a, b) => {
            const yA = parseInt(String(a.year || '').replace(/\D/g, '') || 0, 10);
            const yB = parseInt(String(b.year || '').replace(/\D/g, '') || 0, 10);
            if (yA !== yB) return yB - yA;
            const idA = parseInt(a.id || a.local_id || 0, 10);
            const idB = parseInt(b.id || b.local_id || 0, 10);
            return idB - idA;
          });

          const formattedRecords = uniqueRecords.map((r, idx) => {
            let mp = r.memo_pages || 0;
            if (!mp && r.from_surah && r.to_surah) {
              mp = calculateClientPages(r.from_surah, r.from_ayah, r.to_surah, r.to_ayah);
            }
            let rp = r.rev_pages || 0;
            if (!rp && r.rev_from_surah && r.rev_to_surah) {
              rp = calculateClientPages(r.rev_from_surah, r.rev_from_ayah, r.rev_to_surah, r.rev_to_ayah);
            }

            return {
              id: r.id || r.local_id || (idx + 1),
              month: r.month || "غير محدد",
              year: r.year || (window.HijriDate ? window.HijriDate.getCurrentHijriYear() : 1448),
              from_surah: r.from_surah || "",
              from_ayah: r.from_ayah || 1,
              to_surah: r.to_surah || "",
              to_ayah: r.to_ayah || 1,
              memo_pages: mp,
              memo_grade: r.memo_grade || "ممتاز",
              rev_from_surah: r.rev_from_surah || "",
              rev_from_ayah: r.rev_from_ayah || 1,
              rev_to_surah: r.rev_to_surah || "",
              rev_to_ayah: r.rev_to_ayah || 1,
              rev_pages: rp,
              rev_grade: r.rev_grade || "ممتاز",
              sard_pages: r.sard_pages || 0,
              fiqh: r.fiqh || 0,
              tafsir: r.tafsir || 0,
              adhkar: r.adhkar || 0,
              seerah: r.seerah || 0,
              activity_mark: r.activity_mark || 0,
              absent_days: r.absent_days || 0,
              exam_grade: r.exam_grade || "ممتاز",
              notes: r.notes || ""
            };
          });

          fetchedData = {
            success: true,
            student: {
              id: studentId,
              name: studentName,
              circle_id: circleId,
              circle_name: circleName,
              teacher_name: teacherName
            },
            records: formattedRecords
          };
        }
      }
    } catch(e) {
      console.warn("Direct Firebase records fetch error:", e);
    }
  }

  // 4. Save and Render
  if (fetchedData) {
    studentRecordsState = fetchedData;
    try {
      localStorage.setItem('albayan_student_records_cache', JSON.stringify(fetchedData));
    } catch(e) {}
    renderRecordsUI(fetchedData);
  } else if (!studentRecordsState) {
    // 5. If no network and no cache, render initial clean state
    const emptyState = {
      success: true,
      student: {
        name: studentName,
        circle_name: "مدرسة البيان لتعليم القرآن",
        teacher_name: "كادر التحفيظ"
      },
      records: []
    };
    studentRecordsState = emptyState;
    renderRecordsUI(emptyState);
  }

  if (loadingOverlay) loadingOverlay.style.display = "none";
}

// Render complete records UI
function renderRecordsUI(data) {
  try {
    const student = data.student || {};
    const records = data.records || [];

    // 1. Header & Hero Info
    const studentName = student.name || "الطالب";
    const headerNameEl = document.getElementById("headerStudentName");
    if (headerNameEl) headerNameEl.textContent = studentName;

    const heroNameEl = document.getElementById("heroStudentName");
    if (heroNameEl) heroNameEl.textContent = studentName;

    // Student initials for avatar
    const parts = studentName.trim().split(" ");
    const initials = parts.length >= 2 ? (parts[0][0] + " " + parts[1][0]) : studentName.substring(0, 2);
    const avatarEl = document.getElementById("studentAvatarInitials");
    if (avatarEl) avatarEl.textContent = initials;

    // Badges in Hero
    const circleEl = document.getElementById("heroCircleName");
    if (circleEl) circleEl.textContent = student.circle_name && student.circle_name !== "غير محدد" ? `حلقة ${student.circle_name}` : "حلقة قرآنية";

    const teacherEl = document.getElementById("heroTeacherName");
    if (teacherEl) teacherEl.textContent = student.teacher_name && student.teacher_name !== "غير محدد" ? `الشيخ ${student.teacher_name}` : "كادر التحفيظ";

    // 2. Stats Metrics for Quranic Records
    const totalRecordsEl = document.getElementById("statTotalRecords");
    if (totalRecordsEl) totalRecordsEl.textContent = records.length;

    // Calculate marks, average scores, and stats
    let memoScores = [];
    let revScores = [];
    let totalAbsenceDays = 0;
    let totalAccompanyingCount = 0;
    let latestExamGrade = "—";
    let totalScoresSum = 0;

    records.forEach((r, idx) => {
      const mParsed = parseFloat(r.memo_grade);
      if (!isNaN(mParsed) && mParsed > 0) memoScores.push(mParsed);

      const rParsed = parseFloat(r.rev_grade);
      if (!isNaN(rParsed) && rParsed > 0) revScores.push(rParsed);

      totalAbsenceDays += parseInt(r.absent_days, 10) || 0;

      let accCount = 0;
      if (parseFloat(r.fiqh) > 0) accCount++;
      if (parseFloat(r.tafsir) > 0) accCount++;
      if (parseFloat(r.adhkar) > 0) accCount++;
      if (parseFloat(r.seerah) > 0) accCount++;
      if (parseFloat(r.activity_mark) > 0) accCount++;
      if (parseFloat(r.sard_pages) > 0) accCount++;
      totalAccompanyingCount += accCount;

      const calc = calculateRecordTotal(r);
      totalScoresSum += calc.total;

      if (idx === 0 && r.exam_grade && r.exam_grade !== "لم يختبر بعد" && r.exam_grade !== "—") {
        latestExamGrade = r.exam_grade;
      }
    });

    if (latestExamGrade === "—" && records.length > 0) {
      const testedRec = records.find(r => r.exam_grade && r.exam_grade !== "لم يختبر بعد" && r.exam_grade !== "—");
      if (testedRec) latestExamGrade = testedRec.exam_grade;
    }

    // Memorization average mark (out of 40)
    let avgMemo = "—";
    if (memoScores.length > 0) {
      const avg = memoScores.reduce((a, b) => a + b, 0) / memoScores.length;
      avgMemo = `${Math.round(avg * 10) / 10} / 40`;
    } else if (records.length > 0 && records[0].memo_grade && records[0].memo_grade !== "غير محدد") {
      avgMemo = records[0].memo_grade;
    }
    const statAvgMemoEl = document.getElementById("statAvgMemoMark");
    if (statAvgMemoEl) statAvgMemoEl.textContent = avgMemo;

    // Revision average mark (out of 30)
    let avgRev = "—";
    if (revScores.length > 0) {
      const avg = revScores.reduce((a, b) => a + b, 0) / revScores.length;
      avgRev = `${Math.round(avg * 10) / 10} / 30`;
    } else if (records.length > 0 && records[0].rev_grade && records[0].rev_grade !== "غير محدد") {
      avgRev = records[0].rev_grade;
    }
    const statAvgRevEl = document.getElementById("statAvgRevMark");
    if (statAvgRevEl) statAvgRevEl.textContent = avgRev;

    const statAccompanyingCountEl = document.getElementById("statAccompanyingCount");
    if (statAccompanyingCountEl) {
      statAccompanyingCountEl.textContent = totalAccompanyingCount > 0 ? `${totalAccompanyingCount} مادة` : "مقررة";
    }

    const statFinalExamGradeEl = document.getElementById("statFinalExamGrade");
    if (statFinalExamGradeEl) {
      if (records.length > 0) {
        const avgScore = Math.round((totalScoresSum / records.length) * 10) / 10;
        const avgPct = Math.round((avgScore / 200) * 1000) / 10;
        statFinalExamGradeEl.textContent = `${avgPct}%`;
      } else {
        statFinalExamGradeEl.textContent = latestExamGrade;
      }
    }

    const totalAbsenceEl = document.getElementById("statTotalAbsence");
    if (totalAbsenceEl) totalAbsenceEl.textContent = `${totalAbsenceDays} يوم`;

    const absenceStatusEl = document.getElementById("statAbsenceStatus");
    if (absenceStatusEl) {
      if (totalAbsenceDays === 0) absenceStatusEl.textContent = "حضور كامل 100%";
      else if (totalAbsenceDays <= 3) absenceStatusEl.textContent = "انضباط ممتاز";
      else absenceStatusEl.textContent = "مواظبة جيدة";
    }

    // 3. Render Period / Date / Semester Filter Chips
    renderPeriodFilterChips();

    // 4. Render Quran records table & mobile cards
    renderQuranRecordsTable();

    // Update icons
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Error rendering records UI:", err);
  }
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

/**
 * Format month, year, or period in Hijri format to match circles system
 */
function formatHijriMonthYear(rec) {
  if (!rec) return "—";
  let month = (rec.month || "").trim();
  let year = rec.year;

  // Daily date format (YYYY-MM-DD)
  if (month && /^\d{4}-\d{2}-\d{2}$/.test(month)) {
    if (window.HijriDate) {
      const dual = window.HijriDate.formatDualDate(month);
      return `${dual.hijri}`;
    }
    return month;
  }

  // If month is default/unspecified
  if (!month || month === "غير محدد" || month === "الشهر الحالي") {
    if (window.HijriDate) {
      month = window.HijriDate.getCurrentHijriMonth();
      year = year || window.HijriDate.getCurrentHijriYear();
    } else {
      month = "صفر";
      year = year || 1448;
    }
  }

  let yearStr = "";
  if (year) {
    const yNum = parseInt(year, 10);
    if (yNum >= 1400 && yNum < 1600) {
      yearStr = `${yNum} هـ`;
    } else if (yNum >= 2000) {
      yearStr = `${yNum - 578} هـ`;
    } else {
      yearStr = `${yNum} هـ`;
    }
  } else {
    yearStr = window.HijriDate ? `${window.HijriDate.getCurrentHijriYear()} هـ` : "1448 هـ";
  }

  return `${month} ${yearStr}`.trim();
}

/**
 * Format memorization mark (out of 40)
 */
function formatMemoMark(rawVal) {
  if (rawVal === undefined || rawVal === null || rawVal === "" || rawVal === "غير محدد") {
    return { text: "—", score: null, badgeClass: "pending" };
  }
  const parsed = parseFloat(rawVal);
  if (!isNaN(parsed)) {
    let badgeClass = "good";
    if (parsed >= 36) badgeClass = "excellent";
    else if (parsed >= 30) badgeClass = "verygood";
    else if (parsed < 20) badgeClass = "warning";
    return { text: `${parsed} / 40`, score: parsed, badgeClass };
  }
  let badgeClass = "good";
  if (rawVal.includes("ممتاز")) badgeClass = "excellent";
  else if (rawVal.includes("مقبول") || rawVal.includes("يحتاج")) badgeClass = "warning";
  return { text: rawVal, score: null, badgeClass };
}

/**
 * Format revision mark (out of 30)
 */
function formatRevMark(rawVal) {
  if (rawVal === undefined || rawVal === null || rawVal === "" || rawVal === "غير محدد") {
    return { text: "—", score: null, badgeClass: "pending" };
  }
  const parsed = parseFloat(rawVal);
  if (!isNaN(parsed)) {
    let badgeClass = "good";
    if (parsed >= 27) badgeClass = "excellent";
    else if (parsed >= 22) badgeClass = "verygood";
    else if (parsed < 15) badgeClass = "warning";
    return { text: `${parsed} / 30`, score: parsed, badgeClass };
  }
  let badgeClass = "good";
  if (rawVal.includes("ممتاز")) badgeClass = "excellent";
  else if (rawVal.includes("مقبول") || rawVal.includes("يحتاج")) badgeClass = "warning";
  return { text: rawVal, score: null, badgeClass };
}

/**
 * Real imported accompanying materials from circles student_records
 */
function renderAccompanyingMaterialsBadges(rec) {
  const materials = [
    { key: "fiqh", name: "الفقه", color: "blue", val: rec.fiqh },
    { key: "tafsir", name: "التفسير", color: "emerald", val: rec.tafsir },
    { key: "adhkar", name: "الأذكار", color: "amber", val: rec.adhkar },
    { key: "seerah", name: "السيرة", color: "purple", val: rec.seerah },
    { key: "activity_mark", name: "النشاط", color: "gold", val: rec.activity_mark }
  ];

  const recorded = materials.filter(m => m.val !== undefined && m.val !== null && m.val !== "" && parseFloat(m.val) > 0);

  if (recorded.length === 0) {
    return `<span class="accompanying-empty-tag"><i data-lucide="clock" style="width:12px; height:12px; vertical-align:-2px;"></i> بانتظار رصد المواد</span>`;
  }

  return `
    <div class="accompanying-badges-wrap">
      ${materials.map(it => {
        const hasVal = it.val !== undefined && it.val !== null && it.val !== "" && parseFloat(it.val) > 0;
        const scoreText = hasVal ? `${it.val} / 20` : '—';
        const badgeColor = hasVal ? it.color : 'pending';
        return `
          <span class="accompanying-badge ${badgeColor}" title="${it.name} (من 20)">
            <span class="acc-name">${escapeHtml(it.name)}:</span>
            <span class="acc-score">${scoreText}</span>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function renderFinalExamGradeBadge(rec) {
  let gradeText = (rec.exam_grade || "").trim();

  if (!gradeText || gradeText === "لم يختبر بعد" || gradeText === "—") {
    return `<span class="final-grade-badge-card pending"><i data-lucide="clock" style="width:12px; height:12px;"></i> لم يختبر بعد</span>`;
  }

  let badgeClass = "good";
  if (gradeText.includes("ممتاز") || gradeText.includes("100") || gradeText.includes("95") || gradeText.includes("90")) {
    badgeClass = "excellent";
  } else if (gradeText.includes("جيد جداً") || gradeText.includes("85") || gradeText.includes("80")) {
    badgeClass = "verygood";
  } else if (gradeText.includes("يحتاج مراجعة") || gradeText.includes("راسب") || gradeText.includes("مقبول")) {
    badgeClass = "warning";
  }

  return `
    <span class="final-grade-badge-card ${badgeClass}">
      <i data-lucide="award" style="width:13px; height:13px;"></i>
      <span>${escapeHtml(gradeText)}</span>
    </span>
  `;
}

/**
 * Dynamically render Period / Date / Semester filter chips
 */
function renderPeriodFilterChips() {
  const container = document.getElementById("filterChipsContainer") || document.querySelector(".filter-chips");
  if (!container || !studentRecordsState) return;

  const records = studentRecordsState.records || [];
  if (records.length === 0) {
    container.innerHTML = `
      <button type="button" class="filter-chip active" onclick="setRecordFilter('all', this)">
        <i data-lucide="layers" style="width:13px; height:13px; vertical-align:-2px; margin-left:3px;"></i>
        <span>جميع الفترات</span>
      </button>
    `;
    return;
  }

  // Extract unique periods formatted properly
  const periodKeys = [];
  const seen = new Set();
  records.forEach(r => {
    const key = formatHijriMonthYear(r);
    if (key && key !== "—" && !seen.has(key)) {
      seen.add(key);
      periodKeys.push(key);
    }
  });

  const isSemesterSystem = (studentRecordsState.period_type === "custom") || periodKeys.some(k => k.includes("فصل"));

  let chipsHtml = `
    <button type="button" class="filter-chip ${currentRecordFilter === 'all' ? 'active' : ''}" onclick="setRecordFilter('all', this)">
      <i data-lucide="layers" style="width:13px; height:13px; vertical-align:-2px; margin-left:3px;"></i>
      <span>${isSemesterSystem ? 'جميع الفصول' : 'جميع الفترات'}</span>
    </button>
  `;

  periodKeys.forEach(pKey => {
    const isAct = currentRecordFilter === pKey;
    chipsHtml += `
      <button type="button" class="filter-chip ${isAct ? 'active' : ''}" onclick="setRecordFilter('${escapeHtml(pKey)}', this)">
        <i data-lucide="calendar" style="width:13px; height:13px; vertical-align:-2px; margin-left:3px;"></i>
        <span>${escapeHtml(pKey)}</span>
      </button>
    `;
  });

  container.innerHTML = chipsHtml;
  if (window.lucide) lucide.createIcons();
}

// Filter handling by period or date
function setRecordFilter(filterKey, element) {
  currentRecordFilter = filterKey;
  document.querySelectorAll(".filter-chip").forEach(btn => btn.classList.remove("active"));
  if (element) element.classList.add("active");
  renderQuranRecordsTable();
}

function handleSearchRecords(e) {
  currentRecordSearch = e.target.value.trim();
  renderQuranRecordsTable();
}

// Render Quran Records with filters and search
function renderQuranRecordsTable() {
  if (!studentRecordsState) return;
  const records = studentRecordsState.records || [];
  const container = document.getElementById("quranRecordsContainer");
  if (!container) return;

  // Filter & Search
  let filtered = records.filter(r => {
    // 1. Period / Date / Semester filter
    if (currentRecordFilter && currentRecordFilter !== "all") {
      const formatted = formatHijriMonthYear(r);
      const isMatch = formatted === currentRecordFilter || 
                      (r.month && r.month === currentRecordFilter) ||
                      (r.record_date && r.record_date === currentRecordFilter);
      if (!isMatch) return false;
    }

    // 2. Keyword Search filter
    if (currentRecordSearch) {
      const q = currentRecordSearch.toLowerCase();
      const monthFormatted = formatHijriMonthYear(r).toLowerCase();
      const monthMatch = (r.month || "").toLowerCase().includes(q) || monthFormatted.includes(q);
      const yearMatch = String(r.year || "").includes(q);
      const fromSurahMatch = (r.from_surah || "").toLowerCase().includes(q);
      const toSurahMatch = (r.to_surah || "").toLowerCase().includes(q);
      const revSurahMatch = (r.rev_from_surah || "").toLowerCase().includes(q) || (r.rev_to_surah || "").toLowerCase().includes(q);
      const memoGradeMatch = String(r.memo_grade || "").toLowerCase().includes(q);
      const revGradeMatch = String(r.rev_grade || "").toLowerCase().includes(q);
      const examGradeMatch = (r.exam_grade || "").toLowerCase().includes(q);

      if (!monthMatch && !yearMatch && !fromSurahMatch && !toSurahMatch && !revSurahMatch && !memoGradeMatch && !revGradeMatch && !examGradeMatch) {
        return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="portal-empty-state">
        <div class="empty-icon-wrap" style="color:var(--student-secondary); background:rgba(2,132,199,0.1);">
          <i data-lucide="book-open" style="width:32px; height:32px;"></i>
        </div>
        <h4>${records.length === 0 ? "لا توجد سجلات متابعة قرآنية مسجلة بعد" : "لا توجد سجلات تطابق البحث أو التصفية"}</h4>
        <p>${records.length === 0 ? "يقوم المحفظ برصد مقادير الحفظ والمراجعة الدورية ودرجات التقييم شهرياً." : "جرّب تغيير كلمات البحث أو اختيار فترة أخرى."}</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // 1. Mobile Feed Cards HTML
  const cardsHtml = filtered.map(rec => {
    const memoSurah = (rec.from_surah && rec.to_surah) 
      ? `من ${rec.from_surah} (${rec.from_ayah || 1}) إلى ${rec.to_surah} (${rec.to_ayah || 1})`
      : (rec.from_surah ? `من ${rec.from_surah} (${rec.from_ayah || 1})` : "—");

    const revSurah = (rec.rev_from_surah && rec.rev_to_surah)
      ? `من ${rec.rev_from_surah} (${rec.rev_from_ayah || 1}) إلى ${rec.rev_to_surah} (${rec.rev_to_ayah || 1})`
      : (rec.rev_from_surah ? `من ${rec.rev_from_surah} (${rec.rev_from_ayah || 1})` : "—");

    const memoObj = formatMemoMark(rec.memo_grade);
    const revObj = formatRevMark(rec.rev_grade);

    // Memorization Pages (أوجه الحفظ)
    let memoPages = rec.memo_pages || 0;
    if (!memoPages && rec.from_surah && rec.to_surah) {
      memoPages = calculateClientPages(rec.from_surah, rec.from_ayah, rec.to_surah, rec.to_ayah);
    }

    // Revision Pages & Sard (أوجه السرد والمراجعة)
    let sardPages = parseFloat(rec.sard_pages) || 0;
    let revPages = rec.rev_pages || 0;
    if (!revPages && rec.rev_from_surah && rec.rev_to_surah) {
      revPages = calculateClientPages(rec.rev_from_surah, rec.rev_from_ayah, rec.rev_to_surah, rec.rev_to_ayah);
    }

    let sardText = "—";
    if (sardPages > 0) {
      sardText = `${sardPages} وجه سرد`;
    } else if (revPages > 0) {
      sardText = `${revPages} وجه`;
    }

    // Total Score (out of 200) & Percentage
    const scoreData = calculateRecordTotal(rec);

    const absentDays = parseInt(rec.absent_days, 10) || 0;
    const absentHtml = absentDays === 0 
      ? `<span class="grade-tag excellent"><i data-lucide="check" style="width:11px; height:11px;"></i> بدون غياب</span>`
      : `<span class="grade-tag warning"><i data-lucide="alert-circle" style="width:11px; height:11px;"></i> غياب ${absentDays} يوم</span>`;

    const hijriDateLabel = formatHijriMonthYear(rec);

    return `
      <div class="mobile-record-card">
        <!-- Card Header with Hijri Date -->
        <div class="record-card-top">
          <div class="record-month-tag">
            <i data-lucide="calendar" style="width:16px; height:16px; color:var(--student-primary);"></i>
            <span>${hijriDateLabel}</span>
          </div>
          <div class="record-final-grade-wrap">
            ${renderFinalExamGradeBadge(rec)}
          </div>
        </div>

        <!-- Memorization and Revision Block with Marks and Corner Pages -->
        <div class="record-blocks-grid">
          <!-- مقدار الحفظ الجديد -->
          <div class="record-block-box memo">
            <div class="record-block-header">
              <span style="display:inline-flex; align-items:center; gap:5px;">
                <i data-lucide="book-open" style="width:13px; height:13px; color:var(--student-primary);"></i>
                <span>مقدار الحفظ الجديد</span>
              </span>
              <span class="grade-tag ${memoObj.badgeClass}">${memoObj.text}</span>
            </div>
            <div class="record-block-text">${memoSurah}</div>
            <!-- الزاوية السفلية اليسرى: عدد أوجه الحفظ -->
            <div class="pages-corner-tag memo-tag" title="عدد أوجه الحفظ في هذا السجل">
              <i data-lucide="file-text" style="width:11px; height:11px;"></i>
              <span>${memoPages > 0 ? memoPages + ' وجه' : '—'}</span>
            </div>
          </div>

          <!-- مقدار المراجعة والتثبيت -->
          <div class="record-block-box rev">
            <div class="record-block-header">
              <span style="display:inline-flex; align-items:center; gap:5px;">
                <i data-lucide="repeat" style="width:13px; height:13px; color:var(--student-purple);"></i>
                <span>مقدار المراجعة والتثبيت</span>
              </span>
              <span class="grade-tag ${revObj.badgeClass}">${revObj.text}</span>
            </div>
            <div class="record-block-text">${revSurah}</div>
            <!-- الزاوية السفلية اليسرى: مقدار السرد / أوجه المراجعة -->
            <div class="pages-corner-tag rev-tag" title="مقدار السرد / أوجه المراجعة">
              <i data-lucide="book-marked" style="width:11px; height:11px;"></i>
              <span>${sardText}</span>
            </div>
          </div>
        </div>

        <!-- قسم المواد المصاحبة والأنشطة (استيراد حقيقي لكل مادة + علامة النشاط) -->
        <div class="record-accompanying-box">
          <div class="record-acc-header">
            <span style="display:inline-flex; align-items:center; gap:5px;">
              <i data-lucide="layers" style="width:13px; height:13px; color:var(--student-secondary);"></i>
              <span>المواد المصاحبة والأنشطة</span>
            </span>
          </div>
          <div class="record-acc-content">
            ${renderAccompanyingMaterialsBadges(rec)}
          </div>
        </div>

        <!-- قسم المجموع الكلي والنسبة المئوية للمجموع -->
        <div class="record-score-summary-box">
          <div class="record-score-item">
            <span class="record-score-label">المجموع الكلي:</span>
            <span class="record-score-value">${scoreData.total} / 200</span>
          </div>
          <div class="record-score-item">
            <span class="record-score-label">النسبة المئوية:</span>
            <span class="record-percentage-badge ${scoreData.pctClass}">${scoreData.percentage}%</span>
          </div>
        </div>

        <!-- قسم العلامة النهائية وسجل الانضباط -->
        <div class="record-final-summary-row">
          <div class="final-summary-item">
            <span class="final-summary-label">العلامة النهائية:</span>
            <span class="final-summary-val">${escapeHtml(rec.exam_grade || 'لم يختبر بعد')}</span>
          </div>
          <div class="final-summary-item">
            <span class="final-summary-label">الانضباط:</span>
            <div>${absentHtml}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <!-- Quran Records Feed (Cards View) -->
    <div class="mobile-records-feed">
      ${cardsHtml}
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

// Print Full Quranic Record Report
function printStudentFullRecord() {
  if (!studentRecordsState) return;
  const student = studentRecordsState.student || {};
  const records = studentRecordsState.records || [];
  const stName = student.name || "الطالب";
  const circleName = student.circle_name || "مدرسة البيان لتعليم القرآن";
  const teacherName = student.teacher_name || "كادر التحفيظ";

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>سجل المتابعة القرآني الشامل - ${stName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 30px;
          color: #0f172a;
          direction: rtl;
        }
        .report-header {
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .report-title {
          font-size: 24px;
          font-weight: 800;
          color: #1d4ed8;
          margin: 0 0 8px;
        }
        .student-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          margin-top: 15px;
          background: #f8fafc;
          padding: 12px 18px;
          border-radius: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 10px 8px;
          text-align: center;
        }
        th {
          background: #eff6ff;
          color: #1e40af;
          font-weight: 800;
        }
        .footer-signatures {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <div class="report-title">مدرسة البيان لتعليم القرآن الكريم</div>
        <div>تقرير سجل المتابعة القرآني والإنجاز الشهري للطالب</div>
        <div class="student-info-row">
          <div>اسم الطالب: <strong>${stName}</strong></div>
          <div>الحلقة: <strong>${circleName}</strong></div>
          <div>المحفظ: <strong>${teacherName}</strong></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الفترة / الشهر</th>
            <th>مقدار الحفظ</th>
            <th>علامة الحفظ</th>
            <th>مقدار المراجعة</th>
            <th>علامة المراجعة</th>
            <th>الغياب</th>
            <th>المجموع / 200</th>
            <th>العلامة النهائية</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => {
            const tot = calculateRecordTotal(r);
            const mSurah = r.from_surah ? `${r.from_surah} - ${r.to_surah}` : '—';
            const rSurah = r.rev_from_surah ? `${r.rev_from_surah} - ${r.rev_to_surah}` : '—';
            return `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${formatHijriMonthYear(r)}</strong></td>
                <td>${mSurah}</td>
                <td>${r.memo_grade || '—'}</td>
                <td>${rSurah}</td>
                <td>${r.rev_grade || '—'}</td>
                <td>${r.absent_days || 0} يوم</td>
                <td><strong>${tot.total} (${tot.percentage}%)</strong></td>
                <td><strong>${r.exam_grade || '—'}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer-signatures">
        <div>توقيع المشرف: .............................</div>
        <div>ختم إدارة المدرسة: .............................</div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Student Logout
async function studentLogout() {
  let ok = false;
  if (window.AlbayanDialog && window.AlbayanDialog.confirm) {
    ok = await AlbayanDialog.confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟", "تسجيل الخروج", {
      confirmText: "تسجيل الخروج",
      cancelText: "إلغاء",
      isDestructive: true,
      type: "danger"
    });
  } else {
    ok = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟");
  }
  if (!ok) return;

  try {
    await fetch("/logout", { credentials: "same-origin" });
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    try {
      localStorage.removeItem("albayan_logged_user");
    } catch(e) {}
    window.location.href = "login.html";
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadStudentRecordData();
});
