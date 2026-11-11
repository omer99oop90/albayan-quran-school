---
name: capacitor-mobile
description: "Expert Capacitor, Android WebView, and offline-first mobile app development intelligence. Covers asset synchronization (Capacitor public assets), native WebView quirks, touch ergonomics (44px touch targets), safe-area insets, keyboard handling, offline persistence (IndexedDB/localStorage), non-blocking dialog engines (replacing window.alert/prompt), and automated Gradle build mechanics."
---

# Capacitor & Android Hybrid Mobile Engineering Skill

Comprehensive production knowledge for building, debugging, and optimizing hybrid mobile applications using Capacitor, Android WebView, and offline-first web technologies.

---

## 0. Zero-Shadow & Pure Border Visual Identity (STRICT ENFORCEMENT)
- Albayan Quran School uses a 100% **zero-shadow design system** (`box-shadow: none !important; -webkit-box-shadow: none !important; filter: none !important;`).
- Visual hierarchy and separation are achieved exclusively through:
  - Clean borders (`border: 1px solid var(--line, #e2e8f0)`).
  - High-contrast background fills (`var(--bg, #f8fafc)` vs `var(--card, #ffffff)`).
  - Generous spacing and typographic hierarchy.
- **NEVER** add `box-shadow` or `drop-shadow` to any element (buttons, cards, dialogs, inputs, popovers).

---

## 0.1 Input Responsiveness & Soft Keyboard Ergonomics
- All `<input>` and `<textarea>` elements must have:
  - `touch-action: auto !important;` (never use `touch-action: manipulation` or `touch-action: none` on inputs as it breaks IME composition and caret gestures).
  - `-webkit-user-select: text !important; user-select: text !important;`
  - `autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"` to prevent Android soft keyboard (Gboard/Samsung Keyboard) predictive composition locks that delay Backspace deletion.

---

## 1. Capacitor WebView Architecture & Environment Detection

In Capacitor mobile applications on Android:
- Assets are served locally from `android/app/src/main/assets/public/` either via `http://localhost/` (WebView local scheme) or `file:///android_asset/public/`.
- Direct cross-origin restrictions (CORS) behave differently than in browser environments:
  - WebView `http://localhost` or `capacitor://` headers are sent.
  - Absolute local paths like `/api/data` will fail if there is no local backend server running on the device.

### Resilient Environment Detection Pattern
```javascript
const isStandaloneMobile = !!(
  window.Capacitor || 
  window.IS_CAPACITOR_APP ||
  window.location.protocol === 'file:' || 
  window.location.origin.includes('capacitor://') ||
  (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'))
);
```

---

## 2. Preventing WebView Freezes: The Alert / Prompt Rule

**CRITICAL RULE**:
- In Android WebViews, native JavaScript blocking modals (`window.prompt`, `window.alert`, `window.confirm`) can crash the WebView thread or fail to render keyboard input on newer Android OS versions.
- **NEVER** rely on `window.prompt()` for numeric or text entry inside Android apps.
- Always use a lightweight, custom modal or an inline popover dropdown (e.g. `cellPopover` or `AlbayanDialog`).
- Ensure all modal elements have `style="display:none;"` by default and NEVER set `display: flex !important` in CSS classes, which overrides inline styles and freezes the screen on page load.

---

## 3. Safe-Area & Touch Ergonomics

1. **Touch Targets**:
   - Minimum tap target size: **44×44px** (per Apple HIG and Google Material guidelines).
   - Minimum spacing between interactive buttons: **8px**.
   - Provide tactile feedback on active states:
     ```css
     .btn:active, .bottom-nav-item:active {
       transform: scale(0.95);
       transition: transform 0.12s ease;
     }
     ```

2. **Safe-Area Insets (Notches & Navigation Bars)**:
   ```css
   padding-top: max(16px, env(safe-area-inset-top));
   padding-bottom: max(16px, env(safe-area-inset-bottom));
   padding-left: max(16px, env(safe-area-inset-left));
   padding-right: max(16px, env(safe-area-inset-right));
   ```

3. **Prevent Horizontal Jitter & Layout Thrashing**:
   - Always enforce `max-width: 100vw; overflow-x: hidden;` on body and layout containers.
   - For wide data tables (such as student rosters), wrap the table in a dedicated `.table-scroll-container` with `-webkit-overflow-scrolling: touch;` and `overflow-x: auto;`.

---

## 4. Multi-App & Asset Sync Mechanics in Albayan

The workspace maintains two dedicated app packages:
1. **Admin / Teacher Platform**:
   - Source files live in `c:\now\static\`.
   - Packaged via `c:\now\build_apk.ps1`.
   - Asset sync target: `c:\now\android\app\src\main\assets\public\`.
2. **Student App Portal (`student_app`)**:
   - Source files live in `c:\now\student_app\www\`.
   - Packaged via `c:\now\build_student_apk.ps1`.
   - Student app specific navigation: [student_nav.js](file:///c:/now/student_app/www/student_nav.js).

### Two-Way Synchronization Rule
Whenever modifying shared UI components, database layers, or logic:
- Check if the fix affects `static/` (teacher/admin) or `student_app/www/` (student portal) or both.
- Always verify that all assets (HTML, JS, CSS) in `android/app/src/main/assets/public/` are identical to `static/` or the appropriate build target.

---

## 5. Offline Data Strategy

- Always initialize views with a **0ms local-first restore**:
  1. Synchronous read from `localStorage` on page load.
  2. Asynchronous read from `IndexedDB` (high capacity for images, large tables).
  3. Render UI immediately.
  4. Silent background reconciliation with remote Firebase RTDB or local server.
  5. Merge dirty local edits so uncommitted user work is never overwritten.
