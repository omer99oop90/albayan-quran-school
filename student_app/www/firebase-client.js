/**
 * Firebase Client & Cloud Sync Integration for Albayan Quran School
 * Provides instant automatic background sync without popup modals.
 * Dynamic status indicator:
 *  - 🟢 "متصل بالسحابة" (Online + Firebase Cloud active)
 *  - 🔵/🟢 "يعمل بالإنترنت المحلي" (Connected to host computer / local server)
 *  - ⚪/🟡 "يعمل على هذا الجهاز فقط" (Offline / standalone on this device)
 */

export const firebaseConfig = {
  apiKey: "AIzaSyD3Ny43iSx0-ftK1OmZY5cQIK8rc-wfPwc",
  authDomain: "bayan-56e77.firebaseapp.com",
  projectId: "bayan-56e77",
  storageBucket: "bayan-56e77.firebasestorage.app",
  messagingSenderId: "310709127497",
  appId: "1:310709127497:web:814ade60c1c18ac785f298",
  databaseURL: "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app"
};

let isSyncingNow = false;
let metaEventSource = null;
let lastSelfWriteTs = 0;
const CLIENT_INSTANCE_ID = 'client_' + Math.random().toString(36).substring(2, 9);

export function getLocalCloudMetaTs() {
  try {
    return Number(localStorage.getItem('albayan_cloud_meta_ts') || 0);
  } catch (e) {
    return 0;
  }
}

export function setLocalCloudMetaTs(ts) {
  try {
    if (ts) localStorage.setItem('albayan_cloud_meta_ts', String(ts));
  } catch (e) {}
}

export async function checkCloudHasUpdates() {
  const localTs = getLocalCloudMetaTs();
  if (!localTs) return true; // No baseline yet, pull full data
  try {
    const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${rtdbBase}/sync_meta/last_updated.json`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const cloudTs = await res.json();
      if (cloudTs && Number(cloudTs) <= localTs) {
        return false; // Up to date!
      }
      return cloudTs ? Number(cloudTs) : true;
    }
  } catch (e) {
    // If check fails, don't block
  }
  return true;
}

export async function touchCloudSyncMeta(entity = "general", source = "client") {
  lastSelfWriteTs = Date.now();
  const now = Date.now();
  setLocalCloudMetaTs(now);
  try {
    const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    await fetch(`${rtdbBase}/sync_meta.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_updated: now,
        version: now,
        source: source,
        client_id: CLIENT_INSTANCE_ID,
        entity: entity,
        iso: new Date().toISOString()
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`⚡ [CLOUD_NOTIFY] Sent update trigger to Firebase /sync_meta (ts=${now}, entity=${entity})`);
  } catch (e) {
    console.debug("touchCloudSyncMeta error:", e);
  }
}

export function initRealtimeCloudListener() {
  if (typeof window === "undefined" || typeof EventSource === "undefined") return;
  if (metaEventSource) return;

  try {
    const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
    const sseUrl = `${rtdbBase}/sync_meta.json`;
    console.log("[REALTIME_CLOUD] 🛰️ Initializing Realtime EventSource listener on Firebase /sync_meta...");

    metaEventSource = new EventSource(sseUrl);

    const handleMetaEvent = async (e) => {
      try {
        if (!e.data) return;
        const parsed = JSON.parse(e.data);
        const data = parsed.data !== undefined ? parsed.data : parsed;
        if (!data || typeof data !== "object") return;

        const cloudTs = Number(data.last_updated || data.version || 0);
        const sourceClientId = data.client_id;
        const localTs = getLocalCloudMetaTs();

        // 1. Skip if triggered by this exact client instance within last 12 seconds or recent user edit
        if (sourceClientId === CLIENT_INSTANCE_ID || (Date.now() - lastSelfWriteTs < 12000) || (Date.now() - (window._lastLocalUserActionTime || 0) < 12000)) {
          if (cloudTs > localTs) setLocalCloudMetaTs(cloudTs);
          return;
        }

        // 2. Real remote update detected!
        if (cloudTs && cloudTs > localTs) {
          console.log(`⚡ [REALTIME_NOTIFICATION] New update detected in Firebase! (cloud=${cloudTs}, local=${localTs}, source=${data.source || 'remote'})`);
          setLocalCloudMetaTs(cloudTs);

          // Micro-indicator pulse on sync pill
          const widget = document.getElementById("albayan-cloud-sync-widget");
          if (widget) {
            const dot = widget.querySelector("#syncDot");
            const text = widget.querySelector("#syncText");
            if (dot && text) {
              dot.className = "sync-dot syncing";
              text.textContent = "⚡ استلام تعديل من السحابة...";
            }
          }

          // Gentle background pull of latest tables
          if (typeof window.pullAllDataFromFirebase === "function") {
            await window.pullAllDataFromFirebase(true);
          }

          // Trigger view refresh if active
          if (typeof window.loadCircles === "function") {
            try { window.loadCircles(); } catch(e) {}
          }
          if (typeof window.loadRosterStudents === "function") {
            try { window.loadRosterStudents(); } catch(e) {}
          }
          if (typeof window.loadUsers === "function") {
            try { window.loadUsers(); } catch(e) {}
          }
          if (typeof window.loadStudents === "function") {
            try { window.loadStudents(); } catch(e) {}
          }

          if (widget) {
            const dot = widget.querySelector("#syncDot");
            const text = widget.querySelector("#syncText");
            if (dot && text) {
              dot.className = "sync-dot cloud-online";
              text.textContent = "تم التحديث تلقائياً 🟢";
              setTimeout(() => {
                if (typeof window.refreshSyncIndicator === "function") {
                  window.refreshSyncIndicator();
                }
              }, 2500);
            }
          }

          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('albayan:cloud_updated', { detail: data }));
          }
        }
      } catch (err) {
        console.warn("[REALTIME_CLOUD] Event processing error:", err);
      }
    };

    metaEventSource.addEventListener("put", handleMetaEvent);
    metaEventSource.addEventListener("patch", handleMetaEvent);

    metaEventSource.onerror = () => {
      // EventSource auto-reconnects natively
      console.debug("[REALTIME_CLOUD] SSE stream reconnecting in background...");
    };
  } catch (err) {
    console.warn("[REALTIME_CLOUD] Could not start EventSource:", err);
  }
}

// Check local server sync status
export async function getSyncStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("/api/sync/status", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Server responded with error");
    return await res.json();
  } catch (err) {
    return {
      cloud_connected: false,
      is_syncing: false,
      server_reachable: false,
      last_sync_status: "السيرفر المحلي غير مستجيب",
      pending_records_count: 0
    };
  }
}

// Trigger intelligent tri-state background sync cycle
export async function triggerManualSync(circleId = null) {
  if (isSyncingNow) return { status: "busy" };
  isSyncingNow = true;

  try {
    let syncedLocal = 0;

    // 1. Process offline sync queue from AlbayanLocalDB if present
    if (typeof window !== "undefined" && window.AlbayanLocalDB) {
      try {
        const pendingItems = typeof window.AlbayanLocalDB.getUnacknowledgedOperations === 'function'
          ? await window.AlbayanLocalDB.getUnacknowledgedOperations()
          : (typeof window.AlbayanLocalDB.getPendingQueue === 'function' ? await window.AlbayanLocalDB.getPendingQueue() : []);

        if (pendingItems && pendingItems.length > 0) {
          if (typeof window.AlbayanLocalDB.markOperationsSending === 'function') {
            await window.AlbayanLocalDB.markOperationsSending(pendingItems.map(p => p.operation_id || p.queue_id));
          }

          // Direct Cloud Push to Firebase Realtime Database (Serverless Architecture)
          try {
            const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
            const ackQueueIds = [];
            const ackOpIds = [];

              for (const item of pendingItems) {
                if (item.payload || item.action_type === 'DELETE_STUDENT' || item.action_type === 'DELETE_CIRCLE') {
                  const isCreateStudent = (item.action_type === 'CREATE_STUDENT') || (item.entity_type === 'students' && item.payload && item.payload.name);
                  const isRecord = !isCreateStudent && ((item.entity_type === 'student_records') || (item.payload && (item.payload.memo_grade !== undefined || item.payload.from_surah !== undefined || item.payload.fiqh !== undefined)));
                  const targetEntity = isCreateStudent ? 'students' : (isRecord ? 'student_records' : (item.entity_type || item.table || (String(item.action_type || '').includes('CIRCLE') ? 'circles' : 'students')));
                  const entityId = Number(item.entity_id || (item.payload && (item.payload.student_id || item.payload.id)));
                  const itemCircleId = item.circle_id || (item.payload && item.payload.circle_id) || circleId || 0;
                  const isDelete = (String(item.action_type || '').startsWith('DELETE') || (item.payload && item.payload.is_deleted === 1));
                  const opId = item.operation_id || `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                  const nowIso = new Date().toISOString();

                  try {
                    let writeSuccess = false;
                    const patchData = isDelete ? { is_deleted: 1, updated_at: nowIso } : {
                      ...item.payload,
                      operation_id: opId,
                      synced_from_mobile: true,
                      synced_at: nowIso
                    };

                    const rtdbCtrl = new AbortController();
                    const rtdbTimeout = setTimeout(() => rtdbCtrl.abort(), 4000);

                    if (isCreateStudent && item.payload) {
                      const studentRecord = {
                        id: entityId,
                        student_id: entityId,
                        circle_id: itemCircleId,
                        name: item.payload.name,
                        phone: item.payload.phone || '',
                        code: item.payload.code || null,
                        notes: item.payload.notes || '',
                        is_deleted: isDelete ? 1 : 0,
                        created_at: item.payload.created_at || nowIso,
                        updated_at: nowIso,
                        synced_from_mobile: true
                      };
                      const sRes = await fetch(`${rtdbBase}/students/${entityId}.json`, {
                        method: isDelete ? "DELETE" : "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: isDelete ? undefined : JSON.stringify(studentRecord),
                        signal: rtdbCtrl.signal
                      }).catch(() => null);
                      writeSuccess = sRes && sRes.ok;

                      if (item.payload.month || item.payload.year) {
                        const normP = typeof normalizeArabicPeriod === 'function'
                          ? normalizeArabicPeriod(item.payload.month, item.payload.year, item.payload.period_type)
                          : { normMonth: item.payload.month, normYear: item.payload.year, canonicalRecordKey: `${item.payload.period_type || 'monthly'}_${item.payload.year}_${item.payload.month}` };
                        const recKey = `${entityId}_${normP.canonicalRecordKey}`;
                        const pRecord = {
                          ...patchData,
                          id: entityId,
                          student_id: entityId,
                          circle_id: itemCircleId,
                          period_type: normP.normPeriodType || 'monthly',
                          month: normP.normMonth,
                          year: normP.normYear
                        };
                        await fetch(`${rtdbBase}/student_records/${recKey}.json`, {
                          method: isDelete ? "DELETE" : "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: isDelete ? undefined : JSON.stringify(pRecord),
                          signal: rtdbCtrl.signal
                        }).catch(() => null);
                      }
                    } else if (isRecord && item.payload) {
                      const normP = typeof normalizeArabicPeriod === 'function'
                        ? normalizeArabicPeriod(item.payload.month, item.payload.year, item.payload.period_type)
                        : { normMonth: item.payload.month, normYear: item.payload.year, canonicalRecordKey: `${item.payload.period_type || 'monthly'}_${item.payload.year}_${item.payload.month}` };
                      const recKey = `${entityId}_${normP.canonicalRecordKey}`;
                      patchData.student_id = entityId;
                      patchData.id = entityId;
                      patchData.period_type = normP.normPeriodType || 'monthly';
                      patchData.month = normP.normMonth;
                      patchData.year = normP.normYear;

                      const rRes = await fetch(`${rtdbBase}/student_records/${recKey}.json`, {
                        method: isDelete ? "DELETE" : "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: isDelete ? undefined : JSON.stringify(patchData),
                        signal: rtdbCtrl.signal
                      }).catch(() => null);
                      writeSuccess = rRes && rRes.ok;
                    } else {
                      const entityUrl = `${rtdbBase}/${targetEntity}/${entityId}.json`;
                      const eRes = await fetch(entityUrl, {
                        method: isDelete ? "DELETE" : "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: isDelete ? undefined : JSON.stringify(patchData),
                        signal: rtdbCtrl.signal
                      }).catch(() => null);
                      writeSuccess = eRes && eRes.ok;
                    }
                    clearTimeout(rtdbTimeout);

                    if (itemCircleId) {
                      const changelogSeq = Date.now();
                      fetch(`${rtdbBase}/sync_changelog/circles/${itemCircleId}/${changelogSeq}.json`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          change_id: changelogSeq,
                          operation_id: opId,
                          entity_type: targetEntity,
                          entity_id: entityId,
                          circle_id: itemCircleId,
                          action_type: isDelete ? 'DELETE' : 'UPDATE',
                          version: (item.base_version || 0) + 1,
                          timestamp: nowIso,
                          data: patchData
                        })
                      }).catch(() => {});
                    }

                    if (writeSuccess) {
                      if (item.queue_id) ackQueueIds.push(item.queue_id);
                      if (item.operation_id) ackOpIds.push(item.operation_id);
                    }
                  } catch (rtdbErr) {
                    console.warn("[SYNC_ERROR] Direct RTDB push error:", rtdbErr);
                  }
                }
              }

              if (ackQueueIds.length > 0 && typeof window.AlbayanLocalDB.markQueueItemsSynced === 'function') {
                await window.AlbayanLocalDB.markQueueItemsSynced(ackQueueIds);
              }
              if (ackOpIds.length > 0 && typeof window.AlbayanLocalDB.acknowledgeOperations === 'function') {
                await window.AlbayanLocalDB.acknowledgeOperations(ackOpIds);
              }
              syncedLocal = ackOpIds.length || ackQueueIds.length;
              if (syncedLocal > 0) {
                console.log(`[SYNC_PUSH] Pushed ${syncedLocal} items directly to Firebase RTDB.`);
                touchCloudSyncMeta("students", "client_direct");
              }
            } catch (cloudErr) {
              console.warn("[SYNC_ERROR] Direct Firebase push error:", cloudErr);
            }
          }
        }
      } catch (dbErr) {
        console.warn("LocalDB queue check error:", dbErr);
      }
    }

    // 2. Trigger server-side cloud sync cycle if server is reachable
    try {
      const res = await fetch("/api/sync/trigger", { method: "POST" });
      const data = await res.json();
      isSyncingNow = false;
      return { ...data, synced_local_queue: syncedLocal };
    } catch (err) {
      isSyncingNow = false;
      return { status: "offline", synced_local_queue: syncedLocal, message: "تم حفظ التعديلات محلياً على هذا الجهاز." };
    }
  } catch (err) {
    isSyncingNow = false;
    return { status: "error", message: "تعذر إتمام المزامنة." };
  }
}

/**
 * Direct High-Speed Client-Side Firebase Realtime Database Pulling
 * Optimized with Parallel Batch Requests (Promise.all) + Persistent Session Caching + Cloud Meta Sync
 */

let lastSuccessfulCloudFetch = 0;

const memCache = {
  circles: { data: null, timestamp: 0 },
  students: {}, // circleKey -> { data, timestamp }
  exams: { data: null, timestamp: 0 },
  TTL: 120000 // 2 min in-memory TTL
};

function getPersistentCache(key, ttl = 300000) {
  try {
    const raw = sessionStorage.getItem(`albayan_mem_${key}`) || localStorage.getItem(`albayan_mem_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && (Date.now() - parsed.timestamp < ttl)) {
        return parsed.data;
      }
    }
  } catch (e) {}
  return null;
}

function setPersistentCache(key, data) {
  try {
    const obj = { data, timestamp: Date.now() };
    const str = JSON.stringify(obj);
    sessionStorage.setItem(`albayan_mem_${key}`, str);
    localStorage.setItem(`albayan_mem_${key}`, str);
  } catch (e) {}
}

export function normalizeArabicPeriod(month, year, periodType = 'monthly') {
  let m = String(month || '').trim();
  // Strip tashkeel/diacritics
  m = m.replace(/[\u064B-\u065F\u0670]/g, '');
  // Normalize Alefs (أ, إ, آ, ٱ -> ا)
  m = m.replace(/[أإآٱ]/g, 'ا');
  // Normalize Taa Marbuta (ة -> ه)
  m = m.replace(/ة/g, 'ه');
  // Normalize Yaa (ى -> ي)
  m = m.replace(/ى/g, 'ي');
  // Normalize Spaces
  m = m.replace(/\s+/g, ' ').trim();

  const MONTH_MAP = {
    'محرم': 'محرم',
    'صفر': 'صفر',
    'ربيع الاول': 'ربيع الاول',
    'ربيع الثاني': 'ربيع الثاني',
    'ربيع الاخر': 'ربيع الثاني',
    'جمادي الاولي': 'جمادي الاولي',
    'جمادي الثانيه': 'جمادي الاخره',
    'جمادي الاخره': 'جمادي الاخره',
    'رجب': 'رجب',
    'شعبان': 'شعبان',
    'رمضان': 'رمضان',
    'شوال': 'شوال',
    'ذو القعده': 'ذو القعده',
    'ذوالقعده': 'ذو القعده',
    'ذو الحجه': 'ذو الحجه',
    'ذوالحجه': 'ذو الحجه'
  };
  if (MONTH_MAP[m]) {
    m = MONTH_MAP[m];
  }

  const y = String(year || '1448').replace(/\D/g, '') || '1448';
  const pt = String(periodType || 'monthly').trim().toLowerCase();

  return {
    normMonth: m,
    normYear: y,
    normPeriodType: pt,
    canonicalRecordKey: `${pt}_${y}_${m}`
  };
}

export function sortCirclesByCreationDate(circlesList) {
  if (!Array.isArray(circlesList)) return [];
  return [...circlesList].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : (typeof a.id === 'number' ? a.id : (a.timestamp || 0));
    const timeB = b.created_at ? new Date(b.created_at).getTime() : (typeof b.id === 'number' ? b.id : (b.timestamp || 0));
    if (isNaN(timeA) || isNaN(timeB) || timeA === timeB) return 0;
    return timeB - timeA; // Newest creation date first
  });
}

export async function pullCirclesFromFirebase(forceRefresh = false) {
  const now = Date.now();
  const cachedData = memCache.circles.data || getPersistentCache('circles');

  // Fast offline return only if caller did not request a fresh remote pull
  if (!forceRefresh && cachedData && cachedData.length > 0) {
    return sortCirclesByCreationDate(cachedData);
  }

  const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Primary: fetch circles node independently so student counting never blocks circle loading
    const cRes = await fetch(`${rtdbBase}/circles.json`, { signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);

    if (!cRes || !cRes.ok) {
      console.warn(`RTDB circles status: ${cRes ? cRes.status : 'network error'}`);
      const fallback = memCache.circles.data || getPersistentCache('circles');
      if (fallback && fallback.length > 0) return sortCirclesByCreationDate(fallback);
      const local = localStorage.getItem("albayan_cached_circles") || localStorage.getItem("cached_circles_list");
      return local ? sortCirclesByCreationDate(JSON.parse(local)) : [];
    }
    const data = await cRes.json();
    lastSuccessfulCloudFetch = Date.now();

    // Deduplicate circles strictly by ID
    const circleMap = new Map();
    const ingestCircle = (c, fallbackId) => {
      if (!c || typeof c !== 'object') return;
      const rawId = c.id !== undefined ? c.id : (c.local_id || fallbackId);
      const cleanId = String(rawId || '').replace(/^circles_/, '').trim();
      const numId = Number(cleanId) || cleanId;
      if (!numId) return;

      const existing = circleMap.get(numId);
      if (!existing) {
        circleMap.set(numId, { ...c, id: numId });
      } else {
        circleMap.set(numId, { ...existing, ...c, id: numId });
      }
    };

    if (Array.isArray(data)) {
      data.forEach((c, idx) => ingestCircle(c, idx));
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([k, v]) => {
        const cleanKey = String(k || '').replace(/^circles_/, '').trim();
        const fallbackId = !isNaN(Number(cleanKey)) && cleanKey !== '' ? Number(cleanKey) : cleanKey;
        ingestCircle(v, fallbackId);
      });
    }

    const circles = Array.from(circleMap.values());

    // Process students count gently in background if needed
    try {
      const sCtrl = new AbortController();
      const sTimeout = setTimeout(() => sCtrl.abort(), 3500);
      const sRes = await fetch(`${rtdbBase}/students.json`, { signal: sCtrl.signal }).catch(() => null);
      clearTimeout(sTimeout);
      if (sRes && sRes.ok) {
        const stData = await sRes.json();
        if (stData && typeof stData === 'object') {
          const counts = {};
          const studentsList = Array.isArray(stData) ? stData : Object.values(stData);
          studentsList.forEach(s => {
            if (s && s.circle_id && (!s.is_deleted || s.is_deleted === 0)) {
              const cid = String(s.circle_id).replace(/^circles_/, '').trim();
              counts[cid] = (counts[cid] || 0) + 1;
            }
          });
          circles.forEach(c => {
            const cleanCid = String(c.id).replace(/^circles_/, '').trim();
            c.student_count = counts[cleanCid] || c.student_count || 0;
          });
        }
      }
    } catch(e) {}

    const sortedCircles = sortCirclesByCreationDate(circles);
    memCache.circles = { data: sortedCircles, timestamp: Date.now() };
    setPersistentCache('circles', sortedCircles);
    try {
      localStorage.setItem('albayan_cached_circles', JSON.stringify(sortedCircles));
      localStorage.setItem('cached_circles_list', JSON.stringify(sortedCircles));
    } catch(e) {}

    if (window.AlbayanLocalDB) {
      AlbayanLocalDB.cacheCircles(sortedCircles).catch(() => {});
    }
    return sortedCircles;
  } catch (err) {
    console.warn("Fast Firebase pullCircles failed:", err);
    return sortCirclesByCreationDate(memCache.circles.data || getPersistentCache('circles') || []);
  }
}

export async function pullStudentsFromFirebase(circleId, periodPayload = {}, forceRefresh = false) {
  const normReq = normalizeArabicPeriod(periodPayload.month, periodPayload.year, periodPayload.period_type);
  const pType = normReq.normPeriodType;
  const pMonth = normReq.normMonth;
  const pYear = normReq.normYear;
  const cacheKey = `${circleId}_${pType}_${pMonth}_${pYear}`;
  const now = Date.now();

  const cachedData = (memCache.students[cacheKey] && memCache.students[cacheKey].data) || getPersistentCache(`students_${cacheKey}`);

  if (!forceRefresh && cachedData && cachedData.length > 0) {
    const hasUpdates = await checkCloudHasUpdates();
    if (hasUpdates === false) {
      console.log(`⚡ [CACHE_HIT] Students for circle ${circleId} up to date. Skipping redundant Firebase fetch.`);
      memCache.students[cacheKey] = { data: cachedData, timestamp: now };
      return cachedData;
    }
  }

  const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    // Parallel fetch: fetch students and period records in ONE simultaneous round-trip!
    const [stRes, recRes] = await Promise.all([
      fetch(`${rtdbBase}/students.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/student_records.json`, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    if (!stRes || !stRes.ok) throw new Error(`RTDB students error`);
    const stData = await stRes.json();
    if (!stData) return [];

    lastSuccessfulCloudFetch = Date.now();

    // Deduplicate students by ID to prevent duplicate rows from RTDB canonical vs numeric keys
    const studentMap = new Map();
    const ingestStudent = (s, fallbackId) => {
      if (!s) return;
      const rawId = s.id !== undefined ? s.id : (s.local_id || fallbackId);
      const cleanId = String(rawId || '').replace(/^students_/, '').trim();
      const id = Number(cleanId) || cleanId;
      if (!id) return;
      const existing = studentMap.get(id);
      if (!existing) {
        studentMap.set(id, { ...s, id, name: s.name || `طالب ${id}` });
      } else {
        const realName = (s.name && !s.name.startsWith('طالب ')) ? s.name : existing.name;
        studentMap.set(id, {
          ...existing,
          ...s,
          id,
          name: realName
        });
      }
    };

    if (Array.isArray(stData)) {
      stData.forEach((s, idx) => ingestStudent(s, idx));
    } else if (typeof stData === 'object') {
      Object.entries(stData).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          const fallbackId = k.includes('_') ? parseInt(k.split('_')[1]) : parseInt(k);
          ingestStudent(v, fallbackId);
        }
      });
    }

    const allStudents = Array.from(studentMap.values());
    const cleanTargetCid = String(circleId || '').replace(/^circles_/, '').trim();
    const circleStudents = allStudents.filter(s => {
      const cleanStudentCid = String(s.circle_id || '').replace(/^circles_/, '').trim();
      return cleanStudentCid === cleanTargetCid && (!s.is_deleted || s.is_deleted === 0);
    });

    // Map records in memory with multi-key indexing and robust Arabic period normalization
    if (recRes && recRes.ok) {
      try {
        const recData = await recRes.json();
        if (recData && typeof recData === 'object') {
          const recordsMap = {};
          const recList = Array.isArray(recData) ? recData : Object.values(recData);
          recList.forEach(r => {
            if (r && (r.student_id !== undefined || r.id !== undefined)) {
              const rawSid = r.student_id || r.id;
              const sid = Number(String(rawSid).replace(/^students_/, '')) || rawSid;
              const normR = normalizeArabicPeriod(r.month, r.year, r.period_type);

              const canonicalKey = `${sid}_${normR.canonicalRecordKey}`;
              const monthKey = `${sid}_${normR.normMonth}_${normR.normYear}`;
              const fallback = `st_${sid}`;

              // Always pick newest updated_at if conflict exists
              const prev = recordsMap[canonicalKey];
              if (!prev || (new Date(r.updated_at || 0).getTime() >= new Date(prev.updated_at || 0).getTime())) {
                recordsMap[canonicalKey] = r;
              }
              if (!recordsMap[monthKey]) recordsMap[monthKey] = r;
              if (!recordsMap[fallback]) recordsMap[fallback] = r;
            }
          });

          circleStudents.forEach(s => {
            const sid = Number(s.id);
            const canonicalKey = `${sid}_${normReq.canonicalRecordKey}`;
            const monthKey = `${sid}_${normReq.normMonth}_${normReq.normYear}`;
            const record = recordsMap[canonicalKey] || recordsMap[monthKey] || recordsMap[`st_${sid}`] || {};
            
            // Map legacy aliases onto canonical properties
            const clean = { ...record };
            if (!clean.from_surah && clean.memo_surah) clean.from_surah = clean.memo_surah;
            if (!clean.from_ayah && clean.memo_ayah) clean.from_ayah = clean.memo_ayah;
            if (!clean.rev_from_surah && clean.rev_surah) clean.rev_from_surah = clean.rev_surah;
            if (!clean.rev_from_ayah && clean.rev_ayah) clean.rev_from_ayah = clean.rev_ayah;
            if ((clean.activity_mark === undefined || clean.activity_mark === null) && clean.activity_grade) clean.activity_mark = clean.activity_grade;
            if ((clean.fiqh === undefined || clean.fiqh === null) && clean.fiqh_grade) clean.fiqh = clean.fiqh_grade;
            if ((clean.tafsir === undefined || clean.tafsir === null) && clean.tafsir_grade) clean.tafsir = clean.tafsir_grade;
            if ((clean.adhkar === undefined || clean.adhkar === null) && clean.adhkar_grade) clean.adhkar = clean.adhkar_grade;
            if ((clean.seerah === undefined || clean.seerah === null) && clean.seerah_grade) clean.seerah = clean.seerah_grade;

            Object.assign(s, clean, { id: sid, name: s.name });
          });
        }
      } catch(e) {}
    }

    // Protect local pending unacknowledged edits so fresh remote pull never reverts them
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getPendingStudentChanges === 'function') {
      try {
        const pendingChanges = await window.AlbayanLocalDB.getPendingStudentChanges(circleId);
        circleStudents.forEach(st => {
          const sid = Number(st.id);
          const dirty = pendingChanges[sid] || pendingChanges[String(sid)];
          if (dirty) {
            Object.assign(st, dirty);
          }
        });

        // Also append any newly created students waiting in offline queue!
        const existingIds = new Set(circleStudents.map(s => Number(s.id)));
        Object.entries(pendingChanges).forEach(([stId, dirty]) => {
          const numId = Number(stId);
          if (!existingIds.has(numId) && dirty && dirty.name && (!dirty.is_deleted || dirty.is_deleted === 0)) {
            const dirtyCid = String(dirty.circle_id || '').replace(/^circles_/, '').trim();
            if (dirtyCid === cleanTargetCid) {
              circleStudents.push({ ...dirty, id: numId, student_id: numId });
              existingIds.add(numId);
            }
          }
        });
      } catch(e) {}
    }

    memCache.students[cacheKey] = { data: circleStudents, timestamp: Date.now() };
    setPersistentCache(`students_${cacheKey}`, circleStudents);

    if (window.AlbayanLocalDB && circleStudents.length > 0) {
      AlbayanLocalDB.cacheStudents(circleId, circleStudents, periodPayload).catch(() => {});
    }
    return circleStudents;
  } catch (err) {
    console.warn("Fast Firebase pullStudents failed:", err);
    return (memCache.students[cacheKey] && memCache.students[cacheKey].data) || getPersistentCache(`students_${cacheKey}`) || [];
  }
}

/**
 * Resilient, Direct Firebase Realtime Database save for new or edited students
 */
export async function saveStudentToFirebase(studentData, periodPayload = {}) {
  if (!studentData || !studentData.name) return false;

  const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
  const nowIso = new Date().toISOString();
  const rawId = studentData.id || studentData.student_id || Date.now();
  const studentId = Number(rawId) || rawId;
  const rawCid = studentData.circle_id || 0;
  const cleanCid = String(rawCid).replace(/^circles_/, '').trim();
  const numCid = isNaN(Number(cleanCid)) ? cleanCid : parseInt(cleanCid, 10);

  const norm = normalizeArabicPeriod(
    periodPayload.month || studentData.month || 'الشهر الحالي',
    periodPayload.year || studentData.year || '1448',
    periodPayload.period_type || studentData.period_type || 'monthly'
  );
  const recKey = `${studentId}_${norm.canonicalRecordKey}`;

  const stRecord = {
    id: studentId,
    student_id: studentId,
    circle_id: numCid,
    name: studentData.name.trim(),
    phone: studentData.phone || '',
    notes: studentData.notes || '',
    code_display: studentData.code_display || studentData.code || '',
    has_code: !!(studentData.code_display || studentData.code),
    is_deleted: 0,
    created_at: studentData.created_at || nowIso,
    updated_at: nowIso,
    synced_from_mobile: true
  };

  const periodRecord = {
    id: studentId,
    student_id: studentId,
    circle_id: numCid,
    period_type: norm.normPeriodType,
    month: norm.normMonth,
    year: norm.normYear,
    record_date: periodPayload.record_date || studentData.record_date || '',
    from_surah: studentData.from_surah || '',
    from_ayah: studentData.from_ayah !== undefined && studentData.from_ayah !== null ? Number(studentData.from_ayah) : 1,
    to_surah: studentData.to_surah || '',
    to_ayah: studentData.to_ayah !== undefined && studentData.to_ayah !== null ? Number(studentData.to_ayah) : 0,
    rev_from_surah: studentData.rev_from_surah || '',
    rev_from_ayah: studentData.rev_from_ayah !== undefined && studentData.rev_from_ayah !== null ? Number(studentData.rev_from_ayah) : 1,
    rev_to_surah: studentData.rev_to_surah || '',
    rev_to_ayah: studentData.rev_to_ayah !== undefined && studentData.rev_to_ayah !== null ? Number(studentData.rev_to_ayah) : 0,
    memo_grade: (studentData.memo_grade !== undefined && studentData.memo_grade !== null && studentData.memo_grade !== 'غير محدد') ? studentData.memo_grade : null,
    rev_grade: (studentData.rev_grade !== undefined && studentData.rev_grade !== null && studentData.rev_grade !== 'غير محدد') ? studentData.rev_grade : null,
    sard_pages: studentData.sard_pages !== undefined && studentData.sard_pages !== null ? Number(studentData.sard_pages) : 0,
    absent_days: studentData.absent_days !== undefined && studentData.absent_days !== null ? Number(studentData.absent_days) : 0,
    activity_mark: studentData.activity_mark !== undefined && studentData.activity_mark !== null ? Number(studentData.activity_mark) : 0,
    fiqh: studentData.fiqh || null,
    tafsir: studentData.tafsir || null,
    adhkar: studentData.adhkar || null,
    seerah: studentData.seerah || null,
    exam_grade: studentData.exam_grade || 'لم يختبر بعد',
    exam_title: studentData.exam_title || '',
    created_at: nowIso,
    updated_at: nowIso,
    synced_from_mobile: true
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const writeResults = await Promise.all([
      fetch(`${rtdbBase}/students/${studentId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stRecord),
        signal: controller.signal
      }).catch(err => ({ ok: false, error: err })),
      fetch(`${rtdbBase}/student_records/${recKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(periodRecord),
        signal: controller.signal
      }).catch(err => ({ ok: false, error: err }))
    ]);
    clearTimeout(timeoutId);

    const hasSuccess = writeResults.some(r => r && r.ok);
    if (!hasSuccess) {
      console.warn("[FIREBASE_STUDENT_SAVE] Note: Firebase direct write failed or rejected. Results:", writeResults);
      return { success: false, error: "Firebase write rejected or offline" };
    }

    touchCloudSyncMeta("students", "client_student");

    // Update in-memory cache
    const cacheKey = `${numCid}_${norm.normPeriodType}_${norm.normMonth}_${norm.normYear}`;
    const merged = { ...stRecord, ...periodRecord };
    if (!memCache.students[cacheKey] || !Array.isArray(memCache.students[cacheKey].data)) {
      memCache.students[cacheKey] = { data: [], timestamp: Date.now() };
    }
    memCache.students[cacheKey].data = memCache.students[cacheKey].data.filter(s => Number(s.id) !== studentId);
    memCache.students[cacheKey].data.push(merged);
    // Also update localStorage so 0ms restore on reload immediately sees this student
    try {
      const rawCached = localStorage.getItem("albayan_cached_students_" + numCid);
      let localList = rawCached ? JSON.parse(rawCached) : [];
      if (!Array.isArray(localList)) localList = [];
      const exIdx = localList.findIndex(s => Number(s.id) === studentId);
      if (exIdx >= 0) localList[exIdx] = { ...localList[exIdx], ...merged };
      else localList.push(merged);
      localStorage.setItem("albayan_cached_students_" + numCid, JSON.stringify(localList));
    } catch(e) {}

    // Also update IndexedDB AlbayanLocalDB
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudents === 'function') {
      try {
        await window.AlbayanLocalDB.cacheStudents(numCid, [merged], periodPayload);
      } catch(e) {}
    }

    return { success: true, student_id: studentId };
  } catch (e) {
    console.warn("[FIREBASE_STUDENT_SAVE] Note:", e);
    return { success: false, error: e.message };
  }
}

export async function pullExamsFromFirebase(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && memCache.exams.data && (now - memCache.exams.timestamp < memCache.TTL)) {
    return memCache.exams.data;
  }

  const rtdbUrl = `${firebaseConfig.databaseURL.replace(/\/$/, '')}/exams.json`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(rtdbUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`RTDB exams status: ${res.status}`);
    const data = await res.json();
    if (!data) return [];

    lastSuccessfulCloudFetch = Date.now();

    const list = [];
    if (Array.isArray(data)) {
      data.forEach((e, idx) => {
        if (e) list.push({ ...e, id: e.id || idx });
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
          list.push({ ...v, id });
        }
      });
    }

    memCache.exams = { data: list, timestamp: Date.now() };
    try {
      localStorage.setItem("cached_exams_list", JSON.stringify(list));
    } catch (e) {}
    return list;
  } catch (err) {
    console.warn("Fast Firebase pullExams failed:", err);
    return memCache.exams.data || [];
  }
}

export async function pullUsersFromFirebase(forceRefresh = false) {
  const rtdbUrl = `${firebaseConfig.databaseURL.replace(/\/$/, '')}/users.json`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(rtdbUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`RTDB users status: ${res.status}`);
    const data = await res.json();
    if (!data) return [];

    const list = [];
    if (Array.isArray(data)) {
      data.forEach((u, idx) => { if (u) list.push({ ...u, id: u.id || idx }); });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
          list.push({ ...v, id });
        }
      });
    }

    if (window.AlbayanLocalDB && list.length > 0) {
      AlbayanLocalDB.cacheUsers(list).catch(() => {});
    }
    return list;
  } catch (err) {
    console.warn("Fast Firebase pullUsers failed:", err);
    return [];
  }
}

export async function pullStudentCvsFromFirebase(forceRefresh = false) {
  const rtdbUrl = `${firebaseConfig.databaseURL.replace(/\/$/, '')}/student_cvs.json`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(rtdbUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`RTDB student_cvs status: ${res.status}`);
    const data = await res.json();
    if (!data) return [];

    const list = [];
    if (Array.isArray(data)) {
      data.forEach((c, idx) => { if (c) list.push({ ...c, id: c.id || idx }); });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
          list.push({ ...v, id });
        }
      });
    }

    if (window.AlbayanLocalDB && list.length > 0) {
      AlbayanLocalDB.cacheStudentCvs(list).catch(() => {});
    }
    return list;
  } catch (err) {
    console.warn("Fast Firebase pullStudentCvs failed:", err);
    return [];
  }
}

export async function pullAllDataFromFirebase(forceRefresh = false) {
  // 0. Smart Quota-Saving Check via /sync_meta
  if (!forceRefresh) {
    const hasUpdates = await checkCloudHasUpdates();
    if (!hasUpdates) {
      console.log("[QUOTA_SAVER] 🟢 بيانات السحابة متطابقة محلياً. تم تخطي تحميل الجداول وتوفير الباندويث بنجاح.");
      return { skipped: true, reason: "up_to_date" };
    }
  }

  const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    // Single parallel batch request for all 7 collections at once!
    const [cRes, sRes, recRes, eRes, resRes, uRes, cvRes] = await Promise.all([
      fetch(`${rtdbBase}/circles.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/students.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/student_records.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/exams.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/results.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/users.json`, { signal: controller.signal }).catch(() => null),
      fetch(`${rtdbBase}/student_cvs.json`, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    lastSuccessfulCloudFetch = Date.now();

    // 1. Process circles
    const circles = [];
    if (cRes && cRes.ok) {
      const cData = await cRes.json();
      if (cData) {
        if (Array.isArray(cData)) {
          cData.forEach((c, idx) => { if (c) circles.push({ ...c, id: c.id || idx }); });
        } else if (typeof cData === 'object') {
          Object.entries(cData).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
              circles.push({ ...v, id });
            }
          });
        }
      }
    }

    // 2. Process students & records with deduplication
    const studentMap = new Map();
    const ingestGlobalStudent = (s, fallbackId) => {
      if (!s) return;
      const id = Number(s.id !== undefined ? s.id : (s.local_id || fallbackId));
      if (!id) return;
      const existing = studentMap.get(id);
      if (!existing) {
        studentMap.set(id, { ...s, id, name: s.name || `طالب ${id}` });
      } else {
        const realName = (s.name && !s.name.startsWith('طالب ')) ? s.name : existing.name;
        studentMap.set(id, {
          ...existing,
          ...s,
          id,
          name: realName
        });
      }
    };

    if (sRes && sRes.ok) {
      const sData = await sRes.json();
      if (sData) {
        if (Array.isArray(sData)) {
          sData.forEach((s, idx) => ingestGlobalStudent(s, idx));
        } else if (typeof sData === 'object') {
          Object.entries(sData).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              const fallbackId = k.includes('_') ? parseInt(k.split('_')[1]) : parseInt(k);
              ingestGlobalStudent(v, fallbackId);
            }
          });
        }
      }
    }
    const allStudents = Array.from(studentMap.values());

    // Records list & map
    const recordsMap = {};
    const recordsList = [];
    if (recRes && recRes.ok) {
      try {
        const recData = await recRes.json();
        if (recData && typeof recData === 'object') {
          const rawRecs = Array.isArray(recData) ? recData : Object.values(recData);
          rawRecs.forEach(r => {
            if (r && (r.student_id !== undefined || r.id !== undefined)) {
              const sid = Number(r.student_id || r.id);
              const rType = String(r.period_type || 'monthly').trim();
              const rMonth = String(r.month || '').trim();
              const rYear = String(r.year || '').replace(/\D/g, '');

              const normRecord = {
                ...r,
                student_id: sid,
                period_type: rType,
                month: rMonth,
                year: rYear
              };

              const specific = `${sid}_${rType}_${rMonth}_${rYear}`;
              const monthOnly = `${sid}_${rMonth}_${rYear}`;
              const fallback = `st_${sid}`;

              recordsMap[specific] = normRecord;
              if (!recordsMap[monthOnly]) recordsMap[monthOnly] = normRecord;
              if (!recordsMap[fallback]) recordsMap[fallback] = normRecord;
              recordsList.push(normRecord);
            }
          });
        }
      } catch(e) {}
    }

    // Compute student counts per circle
    const circleStudentCounts = {};
    const studentsByCircle = {};
    allStudents.forEach(s => {
      const cid = String(s.circle_id || '0');
      circleStudentCounts[cid] = (circleStudentCounts[cid] || 0) + 1;
      if (!studentsByCircle[cid]) studentsByCircle[cid] = [];
      const record = recordsMap[`st_${s.id}`] || {};
      studentsByCircle[cid].push({ ...s, ...record, id: s.id });
    });

    circles.forEach(c => {
      c.student_count = circleStudentCounts[String(c.id)] || 0;
    });

    // 3. Process exams
    let examsList = [];
    if (eRes && eRes.ok) {
      try {
        const eData = await eRes.json();
        if (eData) {
          if (Array.isArray(eData)) {
            eData.forEach((e, idx) => { if (e) examsList.push({ ...e, id: e.id || idx }); });
          } else if (typeof eData === 'object') {
            Object.entries(eData).forEach(([k, v]) => {
              if (v && typeof v === 'object') {
                const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
                examsList.push({ ...v, id });
              }
            });
          }
          memCache.exams = { data: examsList, timestamp: Date.now() };
          try { localStorage.setItem("cached_exams_list", JSON.stringify(examsList)); } catch(e) {}
        }
      } catch(e) {}
    }

    // 4. Process results
    let resultsList = [];
    if (resRes && resRes.ok) {
      try {
        const rData = await resRes.json();
        if (rData) {
          if (Array.isArray(rData)) {
            rData.forEach((r, idx) => { if (r) resultsList.push({ ...r, id: r.id || idx }); });
          } else if (typeof rData === 'object') {
            Object.entries(rData).forEach(([k, v]) => {
              if (v && typeof v === 'object') {
                const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
                resultsList.push({ ...v, id });
              }
            });
          }
        }
      } catch(e) {}
    }

    // 5. Process users
    let usersList = [];
    if (uRes && uRes.ok) {
      try {
        const uData = await uRes.json();
        if (uData) {
          if (Array.isArray(uData)) {
            uData.forEach((u, idx) => { if (u) usersList.push({ ...u, id: u.id || idx }); });
          } else if (typeof uData === 'object') {
            Object.entries(uData).forEach(([k, v]) => {
              if (v && typeof v === 'object') {
                const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
                usersList.push({ ...v, id });
              }
            });
          }
        }
      } catch(e) {}
    }

    // 6. Process student CVs
    let cvsList = [];
    if (cvRes && cvRes.ok) {
      try {
        const cvData = await cvRes.json();
        if (cvData) {
          if (Array.isArray(cvData)) {
            cvData.forEach((c, idx) => { if (c) cvsList.push({ ...c, id: c.id || idx }); });
          } else if (typeof cvData === 'object') {
            Object.entries(cvData).forEach(([k, v]) => {
              if (v && typeof v === 'object') {
                const id = v.id || v.local_id || (k.includes('_') ? parseInt(k.split('_')[1]) : k);
                cvsList.push({ ...v, id });
              }
            });
          }
        }
      } catch(e) {}
    }

    // 6.5. Protect and merge pending local unacknowledged operations over cloud data
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getUnacknowledgedOperations === 'function') {
      try {
        const pendingOps = await window.AlbayanLocalDB.getUnacknowledgedOperations();
        if (Array.isArray(pendingOps) && pendingOps.length > 0) {
          pendingOps.forEach(op => {
            const eType = op.entity_type;
            const eId = op.entity_id;
            const payload = op.payload || {};
            if (eType === 'students' || op.action_type === 'CREATE_STUDENT') {
              const sid = Number(eId || (payload && (payload.id || payload.student_id)));
              const st = allStudents.find(s => Number(s.id) === sid);
              if (st) {
                Object.assign(st, payload);
              } else if (payload && payload.name && (!payload.is_deleted || payload.is_deleted === 0)) {
                const newStudentItem = {
                  id: sid,
                  circle_id: Number(payload.circle_id) || payload.circle_id || 0,
                  name: payload.name,
                  phone: payload.phone || '',
                  notes: payload.notes || '',
                  created_at: payload.created_at || new Date().toISOString(),
                  ...payload
                };
                allStudents.push(newStudentItem);
              }

              const studentCircleId = String(payload.circle_id || (st && st.circle_id) || '0').replace(/^circles_/, '').trim();
              if (studentCircleId) {
                if (!studentsByCircle[studentCircleId]) studentsByCircle[studentCircleId] = [];
                const sInCircle = studentsByCircle[studentCircleId].find(s => Number(s.id) === sid);
                if (sInCircle) {
                  Object.assign(sInCircle, payload);
                } else if (payload && payload.name && (!payload.is_deleted || payload.is_deleted === 0)) {
                  studentsByCircle[studentCircleId].push({
                    id: sid,
                    circle_id: studentCircleId,
                    name: payload.name,
                    phone: payload.phone || '',
                    notes: payload.notes || '',
                    ...payload
                  });
                  circleStudentCounts[studentCircleId] = (circleStudentCounts[studentCircleId] || 0) + 1;
                }
              }
            } else if (eType === 'circles') {
              const c = circles.find(item => String(item.id) === String(eId));
              if (c) Object.assign(c, payload);
            } else if (eType === 'student_records') {
              const sid = Number(eId || (payload && (payload.student_id || payload.id)));
              const r = recordsList.find(item => Number(item.id) === sid || Number(item.student_id) === sid);
              if (r) {
                Object.assign(r, payload);
              } else if (payload && payload.name) {
                recordsList.push({
                  student_id: sid,
                  id: sid,
                  ...payload
                });
              }
            }
          });
        }
      } catch (mergeErr) {
        console.warn("Could not merge local pending operations in pullAllDataFromFirebase:", mergeErr);
      }
    }

    // 7. Atomic import to AlbayanLocalDB (Unified 3-Database Engine)
    memCache.circles = { data: circles, timestamp: Date.now() };
    try {
      if (circles && circles.length > 0) {
        localStorage.setItem('albayan_cached_circles', JSON.stringify(circles));
      }
      Object.entries(studentsByCircle).forEach(([cid, stList]) => {
        if (Array.isArray(stList)) {
          localStorage.setItem('albayan_cached_students_' + cid, JSON.stringify(stList));
        }
      });
    } catch(e) {}

    if (window.AlbayanLocalDB) {
      const bundle = {
        circles,
        students: allStudents,
        student_records: recordsList,
        exams: examsList,
        results: resultsList,
        users: usersList,
        student_cvs: cvsList
      };
      await window.AlbayanLocalDB.importFullDatabase(bundle).catch((err) => {
        console.warn("AlbayanLocalDB import error:", err);
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('albayan:db-synced', {
        detail: {
          source: 'firebase',
          circlesCount: circles.length,
          studentsCount: allStudents.length,
          examsCount: examsList.length,
          usersCount: usersList.length,
          cvsCount: cvsList.length
        }
      }));
    } catch(e) {}

    setLocalCloudMetaTs(Date.now());

    return {
      status: "success",
      circlesCount: circles.length,
      studentsCount: allStudents.length,
      examsCount: examsList.length,
      usersCount: usersList.length,
      cvsCount: cvsList.length
    };
  } catch (err) {
    console.warn("Fast Firebase pullAllData failed:", err);
    return { status: "error", error: err.message };
  }
}

export async function pullDeltaChanges(circleId = null) {
  try {
    const lanCursorKey = circleId ? `lan_cursor_circle_${circleId}` : 'lan_cursor';
    let lanCursor = 0;
    if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSyncCursor === 'function') {
      lanCursor = await window.AlbayanLocalDB.getSyncCursor(lanCursorKey);
      if (!lanCursor && !circleId) {
        lanCursor = await window.AlbayanLocalDB.getSyncCursor('default_cursor');
      }
    }

    let pulledChanges = null;
    let newCursor = lanCursor;
    let baselineReset = false;

    // 1. Try LAN server delta pull first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const url = `/api/sync/delta-pull?cursor=${lanCursor || 0}${circleId ? `&circle_id=${circleId}` : ''}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 410) {
        // CURSOR_TOO_OLD -> Request full baseline recovery for circle
        console.warn(`[SYNC_PULL] LAN Cursor too old (410). Fetching circle baseline.`);
        if (circleId) {
          const baseRes = await fetch(`/api/circles/${circleId}/baseline`);
          if (baseRes.ok) {
            const baseData = await baseRes.json();
            if (baseData.success && Array.isArray(baseData.students)) {
              if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.cacheStudents === 'function') {
                await window.AlbayanLocalDB.cacheStudents(circleId, baseData.students);
              }
              if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSyncCursor === 'function') {
                await window.AlbayanLocalDB.saveSyncCursor(baseData.baseline_cursor || 0, lanCursorKey);
              }
              baselineReset = true;
              pulledChanges = [];
              if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('albayan:delta_sync', {
                  detail: { circleId, baselineReset: true, studentsCount: baseData.students.length }
                }));
              }
              return { success: true, count: baseData.students.length, baselineReset: true };
            }
          }
        }
      } else if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.changes)) {
          pulledChanges = data.changes;
          newCursor = data.latest_cursor || lanCursor;
          console.log(`[SYNC_PULL] LAN Delta: cursor=${lanCursor}->${newCursor}, count=${pulledChanges.length}`);
          if (newCursor && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSyncCursor === 'function') {
            await window.AlbayanLocalDB.saveSyncCursor(newCursor, lanCursorKey);
          }
        }
      }
    } catch (lanErr) {
      // LAN server not reachable
    }

    // 2. Direct RTDB circle-scoped sync_changelog fallback if LAN not accessible
    if (pulledChanges === null) {
      try {
        const rtdbBase = firebaseConfig.databaseURL.replace(/\/$/, '');
        const cloudCursorKey = circleId ? `cloud_cursor_circle_${circleId}` : 'cloud_cursor';
        let cloudCursor = 0;
        if (window.AlbayanLocalDB && typeof window.AlbayanLocalDB.getSyncCursor === 'function') {
          cloudCursor = await window.AlbayanLocalDB.getSyncCursor(cloudCursorKey);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        let changelogUrl;
        if (circleId) {
          changelogUrl = `${rtdbBase}/sync_changelog/circles/${circleId}.json?orderBy="$key"&limitToLast=50`;
        } else {
          changelogUrl = `${rtdbBase}/sync_changelog.json?limitToLast=30`;
        }

        const res = await fetch(changelogUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const logData = await res.json();
          if (logData && typeof logData === 'object') {
            pulledChanges = [];
            let maxCloudSeq = cloudCursor || 0;

            const entries = Object.entries(logData).sort((a, b) => {
              const seqA = Number(a[0]) || 0;
              const seqB = Number(b[0]) || 0;
              return seqA - seqB;
            });

            for (const [k, v] of entries) {
              const seqNum = Number(k) || 0;
              if (cloudCursor && seqNum <= Number(cloudCursor)) {
                continue; // Already applied
              }
              if (v && typeof v === 'object') {
                pulledChanges.push({
                  cursor: k,
                  server_commit_seq: seqNum,
                  entity_type: v.entity_type || 'students',
                  entity_id: v.entity_id,
                  circle_id: v.circle_id || circleId,
                  action_type: v.action_type || 'UPDATE',
                  changed_fields: v.data || v.changed_fields || {},
                  version: v.version || 1
                });
                if (seqNum > maxCloudSeq) {
                  maxCloudSeq = seqNum;
                }
              }
            }

            if (maxCloudSeq > (cloudCursor || 0) && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.saveSyncCursor === 'function') {
              await window.AlbayanLocalDB.saveSyncCursor(maxCloudSeq, cloudCursorKey);
            }
            console.log(`[SYNC_PULL] RTDB Delta: received=${pulledChanges.length} changelog entries`);
          }
        }
      } catch (fbErr) {
        console.warn("[SYNC_PULL] RTDB changelog pull error:", fbErr);
      }
    }

    // 3. Apply changes with Pending Shield
    if (pulledChanges && pulledChanges.length > 0 && window.AlbayanLocalDB && typeof window.AlbayanLocalDB.applyDeltaChanges === 'function') {
      const applied = await window.AlbayanLocalDB.applyDeltaChanges(pulledChanges);
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('albayan:delta_sync', {
          detail: { circleId, changes: pulledChanges, applied }
        }));
      }
      return { success: true, count: pulledChanges.length, applied };
    }

    return { success: true, count: 0, applied: 0 };
  } catch (err) {
    console.warn("[SYNC_ERROR] pullDeltaChanges failed:", err);
    return { success: false, error: err.message };
  }
}

// Global hooks for other scripts
if (typeof window !== "undefined") {
  window.normalizeArabicPeriod = normalizeArabicPeriod;
  window.pullCirclesFromFirebase = pullCirclesFromFirebase;
  window.sortCirclesByCreationDate = sortCirclesByCreationDate;
  window.pullStudentsFromFirebase = pullStudentsFromFirebase;
  window.saveStudentToFirebase = saveStudentToFirebase;
  window.pullExamsFromFirebase = pullExamsFromFirebase;
  window.pullUsersFromFirebase = pullUsersFromFirebase;
  window.pullStudentCvsFromFirebase = pullStudentCvsFromFirebase;
  window.pullAllDataFromFirebase = pullAllDataFromFirebase;
  window.pullDeltaChanges = pullDeltaChanges;
  window.touchCloudSyncMeta = touchCloudSyncMeta;
  window.checkCloudHasUpdates = checkCloudHasUpdates;
  window.initRealtimeCloudListener = initRealtimeCloudListener;

  window.triggerInstantSync = async function () {
    const widget = document.getElementById("albayan-cloud-sync-widget");
    if (widget) {
      const dot = widget.querySelector("#syncDot");
      const text = widget.querySelector("#syncText");
      if (dot && text) {
        dot.className = "sync-dot syncing";
        text.textContent = "جارٍ حفظ ومزامنة التعديلات...";
      }
    }
    await triggerManualSync();
    if (typeof window.refreshSyncIndicator === "function") {
      window.refreshSyncIndicator();
    }
  };
}

/**
 * Mounts the Non-Intrusive Cloud Sync Status Pill into any page
 */
export function mountSyncIndicator(targetElement = "body") {
  const container = typeof targetElement === "string" ? document.querySelector(targetElement) : targetElement;
  if (!container) return;

  // Prevent multiple injections
  if (document.getElementById("albayan-cloud-sync-widget")) return;

  const widget = document.createElement("div");
  widget.id = "albayan-cloud-sync-widget";
  widget.innerHTML = `
    <style>
      #albayan-cloud-sync-widget {
        position: fixed;
        bottom: 22px;
        left: 22px;
        z-index: 9990;
        font-family: 'Cairo', 'Segoe UI', system-ui, -apple-system, sans-serif;
        direction: rtl;
        pointer-events: auto;
      }
      .sync-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.16);
        padding: 7px 14px;
        border-radius: 9999px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.35), 0 4px 8px -2px rgba(0, 0, 0, 0.2);
        transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
      }
      .sync-status-pill:hover {
        transform: translateY(-2px);
        background: rgba(30, 41, 59, 0.98);
        box-shadow: 0 14px 30px -4px rgba(0, 0, 0, 0.45);
        border-color: rgba(255, 255, 255, 0.3);
      }
      .sync-status-pill:active {
        transform: scale(0.97);
      }
      .sync-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background-color: #94a3b8;
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
        flex-shrink: 0;
      }
      .sync-dot.cloud-online {
        background-color: #22c55e;
        box-shadow: 0 0 10px #22c55e, 0 0 4px #22c55e;
      }
      .sync-dot.lan-online {
        background-color: #38bdf8;
        box-shadow: 0 0 10px #38bdf8, 0 0 4px #38bdf8;
      }
      .sync-dot.local-standalone {
        background-color: #e2e8f0;
        box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
      }
      .sync-dot.syncing {
        background-color: #3b82f6;
        animation: pulse-sync-dot 0.8s infinite alternate;
      }
      @keyframes pulse-sync-dot {
        0% { transform: scale(0.75); opacity: 0.5; box-shadow: 0 0 4px #3b82f6; }
        100% { transform: scale(1.35); opacity: 1; box-shadow: 0 0 12px #3b82f6; }
      }
      .sync-badge-pending {
        background: #ef4444;
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 800;
        padding: 1px 6px;
        border-radius: 10px;
        margin-right: 2px;
      }

      /* Mobile Adjustment: Stay above bottom nav bar */
      @media screen and (max-width: 768px) {
        #albayan-cloud-sync-widget {
          bottom: 78px;
          left: 14px;
        }
        .sync-status-pill {
          padding: 6px 11px;
          font-size: 11.5px;
        }
      }
    </style>

    <div class="sync-status-pill" id="syncStatusPill" title="انقر للمزامنة الفورية في الخلفية">
      <div class="sync-dot local-standalone" id="syncDot"></div>
      <span id="syncText">فحص حالة الربط...</span>
      <span class="sync-badge-pending" id="syncPendingBadge" style="display:none">0</span>
    </div>
  `;

  document.body.appendChild(widget);

  const pill = widget.querySelector("#syncStatusPill");
  const dot = widget.querySelector("#syncDot");
  const text = widget.querySelector("#syncText");
  const badge = widget.querySelector("#syncPendingBadge");

  // Check direct Firebase connectivity from the phone
  async function checkDirectFirebaseOnline() {
    if (lastSuccessfulCloudFetch > 0 && (Date.now() - lastSuccessfulCloudFetch < 45000)) {
      return true;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${firebaseConfig.databaseURL.replace(/\/$/, '')}/circles.json?shallow=true`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        lastSuccessfulCloudFetch = Date.now();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async function updateStatusUI() {
    let localPendingCount = 0;
    if (typeof window !== "undefined" && window.AlbayanLocalDB) {
      try {
        localPendingCount = await window.AlbayanLocalDB.getPendingCount();
      } catch (e) {}
    }

    const isCloudReachable = await checkDirectFirebaseOnline();
    let serverReachable = false;
    let pendingServerCount = 0;

    if (!isCloudReachable) {
      // If cloud was not reached, probe local LAN server
      const status = await getSyncStatus();
      serverReachable = status.server_reachable !== false && status.last_sync_status !== "السيرفر المحلي غير مستجيب";
      pendingServerCount = status.pending_records_count || 0;
    }

    const pending = pendingServerCount + localPendingCount;

    if (pending > 0) {
      badge.style.display = "inline-block";
      badge.textContent = `${pending} معلق`;
    } else {
      badge.style.display = "none";
    }

    if (isSyncingNow) {
      dot.className = "sync-dot syncing";
      text.textContent = "جارٍ المزامنة الفورية...";
      return;
    }

    // Determine connection state:
    // 1. Direct Cloud Connected (Firebase Realtime Database):
    if (isCloudReachable) {
      dot.className = "sync-dot cloud-online";
      text.textContent = pending > 0 ? `متصل بالسحابة (${pending} معلق)` : "متصل بالسحابة";
    }
    // 2. Local Network (Connected to host computer / LAN server):
    else if (serverReachable) {
      dot.className = "sync-dot lan-online";
      text.textContent = pending > 0 ? `يعمل بالإنترنت المحلي (${pending} معلق)` : "يعمل بالإنترنت المحلي";
    }
    // 3. Standalone on this device only (Offline):
    else {
      dot.className = "sync-dot local-standalone";
      text.textContent = pending > 0 ? `يعمل دون اتصال (${pending} معلق)` : "يعمل دون اتصال";
    }
  }

  // Silent sync on click with instant micro-feedback (NO POPUP WINDOW)
  pill.addEventListener("click", async () => {
    dot.className = "sync-dot syncing";
    text.textContent = "جارٍ سحب وتحديث البيانات من السحابة...";
    
    await triggerManualSync();
    if (typeof pullAllDataFromFirebase === "function") {
      try {
        await pullAllDataFromFirebase(true);
        if (typeof window.loadCircles === "function") {
          await window.loadCircles();
        }
      } catch (pullErr) {
        console.warn("Pull error on click:", pullErr);
      }
    }
    
    text.textContent = "تم التحديث بنجاح";
    setTimeout(updateStatusUI, 1200);
  });

  // Expose refresh function
  window.refreshSyncIndicator = updateStatusUI;

  // Auto-sync when internet reconnects
  window.addEventListener("online", async () => {
    dot.className = "sync-dot syncing";
    text.textContent = "عادت الشبكة.. جارٍ المزامنة والسحب...";
    await triggerManualSync();
    if (typeof pullAllDataFromFirebase === "function") {
      try {
        await pullAllDataFromFirebase(true);
        if (typeof window.loadCircles === "function") {
          await window.loadCircles();
        }
      } catch (e) {}
    }
    await updateStatusUI();
  });

  window.addEventListener("offline", () => {
    updateStatusUI();
  });

  // Initial update & regular background check
  updateStatusUI();
  setInterval(updateStatusUI, 25000);
}

// Auto mount if in browser and admin/teacher page, and auto pre-populate cloud data in background
if (typeof window !== "undefined") {
  const initAppSync = () => {
    const path = (window.location.pathname || '') + (window.location.href || '');
    if (!path.includes("login.html") && !path.endsWith("/login")) {
      mountSyncIndicator();
    }

    // Initialize Realtime Server-Sent Events listener for Firebase /sync_meta
    initRealtimeCloudListener();

    // Auto pull & pre-populate cloud data in background on app startup (smart quota check)
    setTimeout(async () => {
      try {
        if (typeof pullAllDataFromFirebase === "function") {
          await pullAllDataFromFirebase(false);
          if (typeof window.loadCircles === "function") {
            window.loadCircles();
          }
        }
      } catch (e) {}
    }, 150);

    // Sane periodic background reconciliation with Firebase every 5 minutes (checks /sync_meta first to save quota)
    setInterval(async () => {
      try {
        if (typeof pullAllDataFromFirebase === "function") {
          await pullAllDataFromFirebase(false);
        }
      } catch (e) {}
    }, 300000);
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initAppSync);
  } else {
    initAppSync();
  }
}
