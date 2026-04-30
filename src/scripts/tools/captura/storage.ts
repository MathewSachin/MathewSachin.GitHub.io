// ── storage.ts ──────────────────────────────────────────────────────────────
// The I/O Engine: File System Access API + IndexedDB persistence.

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<unknown>;
  }
  interface Navigator {
    storage: {
      getDirectory: () => Promise<unknown>;
    };
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('captura-db', 1);
    req.onupgradeneeded = (e) => {
      const r = e.target as IDBOpenDBRequest;
      r.result.createObjectStore('settings');
    };
    req.onsuccess = (e) => {
      const r = e.target as IDBOpenDBRequest;
      resolve(r.result as IDBDatabase);
    };
    req.onerror = (e) => {
      const r = e.target as IDBOpenDBRequest;
      reject(r.error);
    };
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = db.transaction('settings', 'readonly').objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction('settings', 'readwrite').objectStore('settings').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function dateStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export class StorageManager {
  #dirHandle: any = null;
  #idbDb: IDBDatabase | null = null;
  #onDirNameChange: (name: string) => void = () => {};
  #onError: (title: string, message: string) => void;
  #isOPFS = typeof window.showDirectoryPicker !== 'function' &&
            typeof navigator.storage?.getDirectory === 'function';

  constructor(onDirNameChange: (name: string) => void, onError: (title: string, message: string) => void) {
    this.#onDirNameChange = onDirNameChange;
    this.#onError   = onError;
  }

  get dirHandle(): any { return this.#dirHandle; }
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
        this.#dirHandle = await navigator.storage!.getDirectory!();
        this.#updateDirUI();
      } catch (_) {}
    }
  }

  async pickDirectory() {
    if (this.#isOPFS) return;
    try {
      this.#dirHandle = await window.showDirectoryPicker!({ mode: 'readwrite' });
      this.#updateDirUI();
      await this.#persistHandle();
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string } | undefined;
      if (e?.name !== 'AbortError') {
        this.#onError('Folder Error', 'Could not select folder: ' + (e?.message ?? String(err)));
      }
    }
  }

  async ensureAccess() {
    if (this.#isOPFS) {
      if (!this.#dirHandle) {
        try { this.#dirHandle = await navigator.storage!.getDirectory!(); }
        catch (err) { const e = err as { message?: string } | undefined; this.#onError('Storage Error', 'Could not access browser storage: ' + (e?.message ?? String(err))); return false; }
      }
      return true;
    }

    if (!this.#dirHandle) {
      try {
        this.#dirHandle = await window.showDirectoryPicker!({ mode: 'readwrite' });
        this.#updateDirUI();
        await this.#persistHandle();
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string } | undefined;
        if (e?.name !== 'AbortError') {
          this.#onError('Folder Error', 'Could not select a save folder: ' + (e?.message ?? String(err)));
        }
        return false;
      }
    }

    let perm = await (this.#dirHandle as any).queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      try { perm = await (this.#dirHandle as any).requestPermission({ mode: 'readwrite' }); } catch (_) { perm = 'denied'; }
    }
    if (perm !== 'granted') {
      this.#onError('Permission Denied', 'Write permission for the save folder was denied. Please choose a different folder with the "Choose Folder" button.');
      return false;
    }
    return true;
  }

  #updateDirUI() {
    if (this.#isOPFS) {
      this.#onDirNameChange('(saving to browser storage — Click the Download Recording toast after recording)');
    } else {
      this.#onDirNameChange(this.#dirHandle?.name ?? '(no folder selected)');
    }
  }

  async #persistHandle() {
    if (!this.#idbDb) return;
    try { await idbPut(this.#idbDb, 'dir-handle', this.#dirHandle); }
    catch (e) { console.warn('IndexedDB put failed:', e); }
  }
}
