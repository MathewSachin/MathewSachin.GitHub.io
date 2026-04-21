// ── storage.ts ──────────────────────────────────────────────────────────────
// The I/O Engine: File System Access API + IndexedDB persistence.

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('captura-db', 1);
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('settings');
    req.onsuccess = (e: any) => resolve(e.target.result as IDBDatabase);
    req.onerror   = (e: any) => reject(e.target.error);
  });
}

function idbGet(db: IDBDatabase, key: string) {
  return new Promise<any>((resolve, reject) => {
    const req = db.transaction('settings', 'readonly').objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: any) {
  return new Promise<void>((resolve, reject) => {
    const req = db.transaction('settings', 'readwrite').objectStore('settings').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export function dateStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export class StorageManager {
  #dirHandle: any = null;
  #idbDb: IDBDatabase | null = null;
  #dirNameEl: HTMLElement;
  #onError: (title: string, message: string) => void;
  #isOPFS = typeof (window as any).showDirectoryPicker !== 'function' &&
            typeof (navigator as any)?.storage?.getDirectory === 'function';

  constructor(dirNameEl: HTMLElement, onError: (title: string, message: string) => void) {
    this.#dirNameEl = dirNameEl;
    this.#onError   = onError;
  }

  get dirHandle() { return this.#dirHandle; }
  get isOPFS() { return this.#isOPFS; }

  async init() {
    if (!this.#isOPFS) {
      try {
        this.#idbDb  = await openDB();
        const handle = await idbGet(this.#idbDb, 'dir-handle');
        if (handle) { this.#dirHandle = handle; this.#updateDirUI(); }
      } catch (_) {}
    } else {
      try {
        this.#dirHandle = await (navigator as any).storage.getDirectory();
        this.#updateDirUI();
      } catch (_) {}
    }
  }

  async pickDirectory() {
    if (this.#isOPFS) return;
    try {
      this.#dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      this.#updateDirUI();
      await this.#persistHandle();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        this.#onError('Folder Error', 'Could not select folder: ' + err.message);
      }
    }
  }

  async ensureAccess() {
    if (this.#isOPFS) {
      if (!this.#dirHandle) {
        try { this.#dirHandle = await (navigator as any).storage.getDirectory(); }
        catch (err: any) { this.#onError('Storage Error', 'Could not access browser storage: ' + err.message); return false; }
      }
      return true;
    }

    if (!this.#dirHandle) {
      try {
        this.#dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        this.#updateDirUI();
        await this.#persistHandle();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          this.#onError('Folder Error', 'Could not select a save folder: ' + err.message);
        }
        return false;
      }
    }

    let perm = await this.#dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      try { perm = await this.#dirHandle.requestPermission({ mode: 'readwrite' }); } catch (_) { perm = 'denied'; }
    }
    if (perm !== 'granted') {
      this.#onError('Permission Denied', 'Write permission for the save folder was denied. Please choose a different folder with the "Choose Folder" button.');
      return false;
    }
    return true;
  }

  #updateDirUI() {
    if (this.#isOPFS) {
      this.#dirNameEl.textContent = '(saving to browser storage — Click the Download Recording toast after recording)';
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
