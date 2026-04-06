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

  constructor(dirNameEl, onError) {
    this.#dirNameEl = dirNameEl;
    this.#onError   = onError;
  }

  // The currently selected (and permitted) directory handle, or null.
  get dirHandle() { return this.#dirHandle; }

  // Opens IndexedDB and restores the previously persisted directory handle.
  // Call once at startup (safe to call even if IndexedDB is unavailable).
  async init() {
    try {
      this.#idbDb  = await openDB();
      const handle = await idbGet(this.#idbDb, 'dir-handle');
      if (handle) { this.#dirHandle = handle; this.#updateDirUI(); }
    } catch (_) {
      // IndexedDB unavailable (e.g. private browsing); proceed without persistence.
    }
  }

  // Shows the directory picker and persists the chosen handle.
  async pickDirectory() {
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

  // Ensures a writable directory is available, prompting if needed.
  // Returns true when the caller may proceed, false when access was denied or
  // the user cancelled the picker.
  async ensureAccess() {
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
    this.#dirNameEl.textContent = this.#dirHandle ? this.#dirHandle.name : '(no folder selected)';
  }

  async #persistHandle() {
    if (!this.#idbDb) return;
    try { await idbPut(this.#idbDb, 'dir-handle', this.#dirHandle); }
    catch (e) { console.warn('IndexedDB put failed:', e); }
  }
}
