---
name: firebase
description: "Expert Firebase engineering intelligence for Realtime Database (RTDB), Firestore, Auth, and Storage. Covers offline-first REST fallbacks, resilient AbortController timeouts, delta synchronization, conflict resolution, SWR (Stale-While-Revalidate), local IndexedDB/localStorage caching, security rules, and data normalization (Sparse Object vs Array handling in RTDB)."
---

# Firebase Engineering & Offline-First Architecture Skill

Production-grade engineering knowledge for Firebase Realtime Database (RTDB), Cloud Firestore, Firebase Authentication, and client-side offline-first architectures.

---

## 1. Core Architecture Principles

In hybrid web and mobile applications (e.g., Capacitor WebView, zero-backend, and offline-first setups):

1. **Never Block on Firebase Network Calls**:
   - Always load data using the **SWR (Stale-While-Revalidate)** pattern.
   - 0ms local restore: Read immediately from `localStorage` or `IndexedDB`.
   - Fire a background non-blocking fetch with strict timeout (1500ms–3500ms max).
   - If the network fails or times out, the user continues working without interruption or blank loading screens.

2. **Always Use `AbortController` on REST Calls**:
   - Browsers and mobile WebViews can hang indefinitely on slow or intermittent cellular connections.
   ```javascript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 3000);
   try {
     const res = await fetch(url, { signal: controller.signal });
     clearTimeout(timeoutId);
     if (res.ok) return await res.json();
   } catch (err) {
     clearTimeout(timeoutId);
     // Fallback seamlessly to local cache or offline queue
   }
   ```

3. **Handle Sparse Objects vs Arrays in RTDB**:
   - Firebase RTDB serializes arrays as JSON Objects if array indices are non-sequential or sparse (e.g. `{ "0": {...}, "15": {...} }`).
   - **Always normalize RTDB responses**:
   ```javascript
   function normalizeFbList(data) {
     if (!data) return [];
     if (Array.isArray(data)) return data.filter(Boolean);
     return Object.entries(data).map(([key, val]) => ({
       cloud_id: key,
       ...(typeof val === 'object' && val !== null ? val : { value: val })
     }));
   }
   ```

4. **Prevent Focus Destruction and Cursor Jumps**:
   - When background Firebase sync completes, **NEVER** re-render the DOM if the user is actively typing in an input, textarea, or has a modal/popover open.
   ```javascript
   const activeEl = document.activeElement;
   const isTyping = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);
   const isModalOpen = !!document.querySelector('.modal-overlay[style*="display: flex"], .popover-dropdown[style*="display: block"]');
   if (isTyping || isModalOpen) {
     return; // Defer or update in-memory state only; do not destroy active DOM elements
   }
   ```

---

## 2. Realtime Database (RTDB) Patterns

### Direct REST Endpoints
- Base URL format: `https://<PROJECT-ID>-default-rtdb.<REGION>.firebasedatabase.app/<COLLECTION>.json`
- Sharded / Child query format:
  ```javascript
  // Read specific entity
  const url = `${fbBase}/students/${studentId}.json`;
  
  // Patch specific fields (non-destructive)
  await fetch(`${fbBase}/student_records/${recordId}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memo_grade: 38, updated_at: Date.now() })
  });
  ```

### Delta Synchronization & Conflict Resolution
- When saving offline changes:
  1. Write change immediately to local in-memory state.
  2. Write change immediately to `IndexedDB` / `localStorage`.
  3. Enqueue the mutation in `pending_changes` queue.
  4. Dispatch local event `albayan:delta_sync` to update all active views.
  5. Attempt background network sync; if failed, queue remains persisted and replays upon `online` event.

---

## 3. Cloud Firestore vs Realtime Database Quick Matrix

| Feature | Realtime Database (RTDB) | Cloud Firestore |
| :--- | :--- | :--- |
| **Data Format** | Deep JSON tree | Documents organized in Collections |
| **Querying** | Filter or sort on a single child | Complex multi-field indexing and compound queries |
| **Offline Support** | Client SDK offline cache or custom REST + IndexedDB | Built-in offline persistence in Web SDK |
| **Pricing Model** | Bandwidth (GB downloaded) + Storage | Operations (Reads, Writes, Deletes) |
| **Best Used For** | Fast live feeds, simple tables, delta syncing | Structured documents, multi-tenant roles, complex filtering |

---

## 4. Security Rules Best Practices

### RTDB Security Rules
```json
{
  "rules": {
    ".read": "auth != null || true",
    ".write": "auth != null",
    "students": {
      ".indexOn": ["circle_id", "name"]
    },
    "student_records": {
      ".indexOn": ["student_id", "month", "year", "circle_id"]
    }
  }
}
```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 5. Troubleshooting & Anti-Patterns

- **Anti-Pattern**: Using `display: flex !important` or CSS class overrides that break modal visibility bindings.
- **Anti-Pattern**: Waiting for Firebase network response before displaying data on page load (causes white screen / spinner lock).
- **Anti-Pattern**: Overwriting local un-synced user edits with stale remote Firebase data during polling. Always merge pending local changes on top of remote payloads.
- **Anti-Pattern**: Omitting `timeout` or `AbortController` on mobile networks. Always cap network calls at 2.5s–3.5s.
