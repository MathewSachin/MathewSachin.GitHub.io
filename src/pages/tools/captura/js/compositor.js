// ── compositor.js ─────────────────────────────────────────────────────────────
// The Visual Engine: <canvas> compositing and PiP drag.
// Responsibilities:
//   • Draw screen capture, webcam PiP overlay, and timestamp onto the canvas.
//   • Handle Picture-in-Picture drag-to-reposition via mouse events on the
//     canvas, calling back onPipMoved so the owner can persist the position.
//   • Expose screenVid / webcamVid <video> elements for the owner to wire up
//     MediaStream sources.

const VIDEO_READY_TIMEOUT_MS = 3000;

export class Compositor {
  // ── State owned externally (set by app.js) ──────────────────────────────────

  webcamStream        = null;  // live webcam stream during recording
  previewWebcamStream = null;  // webcam stream during preview / between recordings
  isRecording         = false;
  pipX = -1;  // fractional position (0–1); -1 = default (bottom-left corner)
  pipY = -1;

  // ── Private fields ──────────────────────────────────────────────────────────

  #canvas;
  #ctx;
  #screenVid;
  #webcamVid;
  #pipDragging = false;
  #pipDragOffX = 0;
  #pipDragOffY = 0;
  #onPipMoved;

  // ── Constructor ─────────────────────────────────────────────────────────────

  // onPipMoved(x, y) is called when the user finishes dragging the PiP
  // so the owner can persist the fractional position in preferences.
  constructor(canvas, { onPipMoved } = {}) {
    this.#canvas     = canvas;
    this.#ctx        = canvas.getContext('2d');
    this.#onPipMoved = onPipMoved;

    // Off-screen video elements used by the compositor to read decoded frames.
    this.#screenVid = Object.assign(document.createElement('video'),
      { muted: true, autoplay: true, playsInline: true });
    this.#webcamVid = Object.assign(document.createElement('video'),
      { muted: true, autoplay: true, playsInline: true });

    this.#setupPipDrag();
  }

  // ── Public getters ──────────────────────────────────────────────────────────

  get canvas()    { return this.#canvas; }
  get screenVid() { return this.#screenVid; }
  get webcamVid() { return this.#webcamVid; }

  // ── Frame drawing ────────────────────────────────────────────────────────────

  drawFrame() {
    const W   = this.#canvas.width;
    const H   = this.#canvas.height;
    const ctx = this.#ctx;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Screen layer — shown whenever a live stream is available
    if (this.#screenVid.srcObject && this.#screenVid.readyState >= 2) {
      ctx.drawImage(this.#screenVid, 0, 0, W, H);
    } else {
      // Placeholder before any stream is active
      ctx.fillStyle    = 'rgba(255,255,255,0.15)';
      ctx.font         = `${Math.round(W / 40)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click "Start Recording" to begin', W / 2, H / 2);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // Webcam PiP — rendered in both preview and recording modes
    if ((this.webcamStream || this.previewWebcamStream) && this.#webcamVid.readyState >= 2) {
      const pipW = Math.round(W / 4);
      const pipH = Math.round(H / 4);
      const marg = Math.round(W / 80);
      const px   = this.pipX < 0 ? marg            : Math.round(this.pipX * W);
      const py   = this.pipY < 0 ? H - pipH - marg : Math.round(this.pipY * H);

      ctx.save();
      this.#roundRect(px, py, pipW, pipH, 8);
      ctx.clip();
      ctx.drawImage(this.#webcamVid, px, py, pipW, pipH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth   = 2;
      this.#roundRect(px, py, pipW, pipH, 8);
      ctx.stroke();

      // Drag hint shown only in preview / pre-recording state
      if (!this.isRecording) {
        ctx.fillStyle    = 'rgba(0,0,0,0.45)';
        ctx.font         = `${Math.round(W / 80)}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('drag to reposition', px + pipW / 2, py + pipH - 4);
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }

    // Timestamp overlay — recording mode only
    if (this.isRecording) {
      const ts  = new Date().toLocaleTimeString();
      const pad = 6, fw = 120, fh = 20;
      ctx.fillStyle    = 'rgba(0,0,0,0.45)';
      ctx.fillRect(W - fw - pad, H - fh - pad, fw, fh);
      ctx.fillStyle    = '#fff';
      ctx.font         = '12px monospace';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(ts, W - pad - 2, H - pad - 2);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // Returns the current PiP bounding box in canvas pixels, or null when webcam
  // is disabled.
  getPipRect() {
    if (!this.webcamStream && !this.previewWebcamStream) return null;
    const W = this.#canvas.width, H = this.#canvas.height;
    const pipW = Math.round(W / 4), pipH = Math.round(H / 4);
    const marg = Math.round(W / 80);
    const px   = this.pipX < 0 ? marg            : Math.round(this.pipX * W);
    const py   = this.pipY < 0 ? H - pipH - marg : Math.round(this.pipY * H);
    return { px, py, pipW, pipH };
  }

  // Resolves once a video element has at least one decoded frame, or after a
  // timeout (handles sources that never fire 'loadeddata', e.g. virtual cams).
  waitForVideoReady(vid) {
    return new Promise(resolve => {
      if (vid.readyState >= 2) { resolve(); return; }
      vid.addEventListener('loadeddata', resolve, { once: true });
      setTimeout(resolve, VIDEO_READY_TIMEOUT_MS);
    });
  }

  // ── PiP drag ─────────────────────────────────────────────────────────────────

  #canvasPos(e) {
    const rect = this.#canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.#canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (this.#canvas.height / rect.height),
    };
  }

  #setupPipDrag() {
    this.#canvas.addEventListener('mousedown', e => {
      const r = this.getPipRect();
      if (!r) return;
      const { x, y } = this.#canvasPos(e);
      if (x >= r.px && x <= r.px + r.pipW && y >= r.py && y <= r.py + r.pipH) {
        this.#pipDragging = true;
        this.#pipDragOffX = x - r.px;
        this.#pipDragOffY = y - r.py;
        this.#canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    this.#canvas.addEventListener('mousemove', e => {
      const r = this.getPipRect();
      if (r) {
        const { x, y } = this.#canvasPos(e);
        const over = x >= r.px && x <= r.px + r.pipW && y >= r.py && y <= r.py + r.pipH;
        if (!this.#pipDragging) this.#canvas.style.cursor = over ? 'grab' : '';
      }
      if (!this.#pipDragging || !r) return;
      const W = this.#canvas.width, H = this.#canvas.height;
      const { x, y } = this.#canvasPos(e);
      this.pipX = Math.max(0, Math.min((x - this.#pipDragOffX) / W, (W - r.pipW) / W));
      this.pipY = Math.max(0, Math.min((y - this.#pipDragOffY) / H, (H - r.pipH) / H));
    });

    const stopDrag = () => {
      if (!this.#pipDragging) return;
      this.#pipDragging = false;
      this.#canvas.style.cursor = '';
      this.#onPipMoved?.(this.pipX, this.pipY);
    };

    this.#canvas.addEventListener('mouseup',    stopDrag);
    this.#canvas.addEventListener('mouseleave', stopDrag);
  }

  #roundRect(x, y, w, h, r) {
    const ctx = this.#ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }
}
