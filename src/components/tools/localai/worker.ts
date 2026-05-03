/**
 * Web Worker for local AI inference using Transformers.js.
 * All heavy Transformers.js work runs here so the main thread stays responsive.
 */
import { pipeline, TextStreamer, env } from '@huggingface/transformers';

/** Minimal subset of Transformers.js CacheInterface we need to satisfy env.customCache. */
interface CacheInterface {
  match(request: string): Promise<Response | undefined>;
  put(request: string, response: Response, progress_callback?: (data: { progress: number; loaded: number; total: number }) => void): Promise<void>;
  delete?(request: string): Promise<boolean>;
}

const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX';

// ── Custom FileSystem Directory Handle Cache ─────────────────────────────────
// Implements CacheInterface using the File System Access API so users can
// choose a local directory to persist model weights across sessions/browsers.

class DirHandleCache implements CacheInterface {
  constructor(private handle: FileSystemDirectoryHandle) {}

  /** Convert a full URL into a path segments array rooted at the chosen dir. */
  private urlToSegments(url: string): string[] {
    try {
      const parsed = new URL(url);
      // e.g. ["onnx-community", "gemma-4-E2B-it-ONNX", "resolve", "main", "model.onnx"]
      return [parsed.hostname, ...parsed.pathname.split('/').filter(Boolean)];
    } catch {
      return url.split('/').filter(Boolean);
    }
  }

  async match(request: string): Promise<Response | undefined> {
    const segments = this.urlToSegments(request);
    try {
      let dir: FileSystemDirectoryHandle = this.handle;
      for (let i = 0; i < segments.length - 1; i++) {
        dir = await dir.getDirectoryHandle(segments[i]);
      }
      const fileHandle = await dir.getFileHandle(segments[segments.length - 1]);
      const file = await fileHandle.getFile();
      return new Response(file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'Content-Length': String(file.size) },
      });
    } catch {
      return undefined;
    }
  }

  async put(
    request: string,
    response: Response,
    progress_callback?: (data: { progress: number; loaded: number; total: number }) => void,
  ): Promise<void> {
    const segments = this.urlToSegments(request);
    let dir: FileSystemDirectoryHandle = this.handle;
    for (let i = 0; i < segments.length - 1; i++) {
      dir = await dir.getDirectoryHandle(segments[i], { create: true });
    }
    const fileHandle = await dir.getFileHandle(segments[segments.length - 1], { create: true });
    const writable = await fileHandle.createWritable();

    const contentLength = response.headers.get('Content-Length');
    const total = parseInt(contentLength ?? '0');
    let loaded = 0;
    const reader = response.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writable.write(value);
      loaded += value.length;
      progress_callback?.({ progress: total > 0 ? loaded / total : 0, loaded, total });
    }
    await writable.close();
  }

  async delete(request: string): Promise<boolean> {
    const segments = this.urlToSegments(request);
    try {
      let dir: FileSystemDirectoryHandle = this.handle;
      for (let i = 0; i < segments.length - 1; i++) {
        dir = await dir.getDirectoryHandle(segments[i]);
      }
      await dir.removeEntry(segments[segments.length - 1]);
      return true;
    } catch {
      return false;
    }
  }
}

// ── Worker state ─────────────────────────────────────────────────────────────

let generator: Awaited<ReturnType<typeof pipeline>> | null = null;
let abortController: AbortController | null = null;

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data as { type: string; payload: any };

  if (type === 'load') {
    try {
      // Configure cache backend
      if (payload?.dirHandle) {
        env.useCustomCache = true;
        env.useBrowserCache = false;
        (env as any).customCache = new DirHandleCache(payload.dirHandle);
      } else {
        // Default: use the browser's Cache API (persists across sessions)
        env.useBrowserCache = true;
        env.useCustomCache = false;
      }

      generator = await pipeline('text-generation', MODEL_ID, {
        device: 'webgpu',
        dtype: 'q4f16',
        progress_callback: (progress: any) => {
          self.postMessage({ type: 'progress', payload: progress });
        },
      });

      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', payload: err?.message ?? String(err) });
    }
    return;
  }

  if (type === 'generate') {
    if (!generator) {
      self.postMessage({ type: 'error', payload: 'Model not loaded yet.' });
      return;
    }
    try {
      abortController = new AbortController();

      const messages = [{ role: 'user', content: payload.prompt as string }];

      const streamer = new TextStreamer((generator as any).tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          self.postMessage({ type: 'token', payload: text });
        },
      });

      await (generator as any)(messages, {
        max_new_tokens: 512,
        do_sample: false,
        streamer,
      });

      self.postMessage({ type: 'done' });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        self.postMessage({ type: 'done' });
      } else {
        self.postMessage({ type: 'error', payload: err?.message ?? String(err) });
      }
    }
    abortController = null;
    return;
  }

  if (type === 'abort') {
    abortController?.abort();
    return;
  }
};
