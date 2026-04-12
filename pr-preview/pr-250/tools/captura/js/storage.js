// ── storage.js ────────────────────────────────────────────────────────────────
// The I/O Engine: File System Access API + IndexedDB persistence.
// Responsibilities:
//   • Let the user pick (or reuse a persisted) save directory.
//   • Verify / re-request write permission when the page reloads.
//   • Expose ensureAccess() so the recording flow gets a guaranteed-writable
//     directory handle before it creates any files.
//   • Persist the chosen directory handle across sessions via IndexedDB so
//     the user does not have to re-pick the folder on every visit.

// ── IndexedDB helpers (module-private) ───────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('captura-db', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('settings');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('settings', 'readonly').objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('settings', 'readwrite').objectStore('settings').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Utility ──────────────────────────────────────────────────────────────────

// Returns an ISO-8601-like timestamp safe for use in file names.
export function dateStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ── StorageManager ────────────────────────────────────────────────────────────

export class StorageManager {
  #dirHandle = null;
  #idbDb     = null;
  #dirNameEl;
  #onError;  // (title, message) callback — keeps UI coupling out of this module

  // True when the File System Access API is unavailable and we are using the
  // Origin Private File System (OPFS) as a temporary staging area instead.
  // Set synchronously so that ensureAccess() and render() can use it before
  // the async init() resolves.
  #isOPFS = typeof window.showDirectoryPicker !== 'function' &&
            typeof navigator?.storage?.getDirectory === 'function';

  constructor(dirNameEl, onError) {
    this.#dirNameEl = dirNameEl;
    this.#onError   = onError;
  }

  // The currently selected (and permitted) directory handle, or null.
  get dirHandle() { return this.#dirHandle; }

  // True when using OPFS instead of the File System Access API.
  get isOPFS() { return this.#isOPFS; }

  // Opens IndexedDB and restores the previously persisted directory handle
  // (FSA mode), or acquires the OPFS root directory (OPFS mode).
  // Call once at startup (safe to call even if the underlying API is unavailable).
  async init() {
    if (!this.#isOPFS) {
      // FSA path: restore persisted folder handle from IndexedDB.
      try {
        this.#idbDb  = await openDB();
        const handle = await idbGet(this.#idbDb, 'dir-handle');
        if (handle) { this.#dirHandle = handle; this.#updateDirUI(); }
      } catch (_) {
        // IndexedDB unavailable (e.g. private browsing); proceed without persistence.
      }
    } else {
      // OPFS path: recordings are staged in the browser's private storage and
      // downloaded by the user when the recording is complete.
      try {
        this.#dirHandle = await navigator.storage.getDirectory();
        this.#updateDirUI();
      } catch (_) {
        // OPFS unavailable; ensureAccess() will surface the error when recording starts.
      }
    }
  }

  // Shows the directory picker and persists the chosen handle (FSA mode only).
  // No-op in OPFS mode.
  async pickDirectory() {
    if (this.#isOPFS) return;
    try {
      this.#dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      this.#updateDirUI();
      await this.#persistHandle();
    } catch (err) {
      if (err.name !== 'AbortError') {
        this.#onError('Folder Error', 'Could not select folder: ' + err.message);
      }
    }
  }

  // Ensures a writable directory is available, prompting if needed (FSA mode)
  // or resolving the OPFS root (OPFS mode).
  // Returns true when the caller may proceed, false when access was denied or
  // the user cancelled the picker.
  async ensureAccess() {
    if (this.#isOPFS) {
      // OPFS is always accessible without a user-facing permission prompt.
      if (!this.#dirHandle) {
        try {
          this.#dirHandle = await navigator.storage.getDirectory();
        } catch (err) {
          this.#onError('Storage Error', 'Could not access browser storage: ' + err.message);
          return false;
        }
      }
      return true;
    }

    // FSA path —————————————————————————————————————————————————————————————
    if (!this.#dirHandle) {
      try {
        this.#dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        this.#updateDirUI();
        await this.#persistHandle();
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.#onError('Folder Error', 'Could not select a save folder: ' + err.message);
        }
        return false;
      }
    }

    let perm = await this.#dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      try { perm = await this.#dirHandle.requestPermission({ mode: 'readwrite' }); }
      catch (_) { perm = 'denied'; }
    }
    if (perm !== 'granted') {
      this.#onError(
        'Permission Denied',
        'Write permission for the save folder was denied. ' +
        'Please choose a different folder with the "Choose Folder" button.'
      );
      return false;
    }
    return true;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  #updateDirUI() {
    if (this.#isOPFS) {
      this.#dirNameEl.textContent = '(saving to browser storage — file downloads when done)';
    } else {
      this.#dirNameEl.textContent = this.#dirHandle ? this.#dirHandle.name : '(no folder selected)';
    }
  }

  async #persistHandle() {
    if (!this.#idbDb) return;
    try { await idbPut(this.#idbDb, 'dir-handle', this.#dirHandle); }
    catch (e) { console.warn('IndexedDB put failed:', e); }
  }
}
