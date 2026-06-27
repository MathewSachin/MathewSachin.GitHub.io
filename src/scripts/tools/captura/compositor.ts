// ── compositor.ts ─────────────────────────────────────────────────────────────
const VIDEO_READY_TIMEOUT_MS = 3000;

type AnnotationTool = 'none' | 'draw' | 'highlight' | 'zoom';

type NormalizedPoint = { x: number; y: number };

type DrawAnnotation = {
  type: 'draw';
  points: NormalizedPoint[];
  color: string;
  width: number;
};

type RectAnnotation = {
  type: 'highlight';
  rect: { x: number; y: number; w: number; h: number };
  color: string;
  width: number;
};

type Annotation = DrawAnnotation | RectAnnotation;
type DraftRect = RectAnnotation & { mode: 'highlight' | 'zoom' };

export class Compositor {
  webcamStream: MediaStream | null = null;
  previewWebcamStream: MediaStream | null = null;
  isRecording = false;
  pipX: number = -1;
  pipY: number = -1;

  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #screenVid: HTMLVideoElement;
  #webcamVid: HTMLVideoElement;
  #pipDragging = false;
  #pipDragOffX = 0;
  #pipDragOffY = 0;
  #onPipMoved?: (x: number, y: number) => void;
  #annotationTool: AnnotationTool = 'none';
  #annotationColor = '#ff3b30';
  #annotationWidth = 4;
  #annotations: Annotation[] = [];
  #draftStroke: DrawAnnotation | null = null;
  #draftRect: DraftRect | null = null;
  #zoomRegion: { x: number; y: number; w: number; h: number } | null = null;
  #isAnnotating = false;
  #dragStart: NormalizedPoint | null = null;

  constructor(canvas: HTMLCanvasElement, { onPipMoved }: { onPipMoved?: (x: number, y: number) => void } = {}) {
    this.#canvas     = canvas;
    this.#ctx        = canvas.getContext('2d')!;
    this.#onPipMoved = onPipMoved;

    this.#screenVid = Object.assign(document.createElement('video'),
      { muted: true, autoplay: true, playsInline: true });
    this.#webcamVid = Object.assign(document.createElement('video'),
      { muted: true, autoplay: true, playsInline: true });

    this.#setupPipDrag();
    this.#syncDataAttrs();
  }

  get canvas()    { return this.#canvas; }
  get screenVid() { return this.#screenVid; }
  get webcamVid() { return this.#webcamVid; }
  get hasZoomRegion() { return !!this.#zoomRegion; }

  drawFrame() {
    const W   = this.#canvas.width;
    const H   = this.#canvas.height;
    const ctx = this.#ctx;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    if (this.#screenVid.srcObject && this.#screenVid.readyState >= 2) {
      if (this.#zoomRegion) {
        const sx = this.#zoomRegion.x * W;
        const sy = this.#zoomRegion.y * H;
        const sw = this.#zoomRegion.w * W;
        const sh = this.#zoomRegion.h * H;
        ctx.drawImage(this.#screenVid, sx, sy, sw, sh, 0, 0, W, H);
      } else {
        ctx.drawImage(this.#screenVid, 0, 0, W, H);
      }
    } else {
      ctx.fillStyle    = 'rgba(255,255,255,0.15)';
      ctx.font         = `${Math.round(W / 40)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click "Start Recording" to begin', W / 2, H / 2);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
    }

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

    this.#drawAnnotations(ctx, W, H);

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

  getPipRect(): { px: number; py: number; pipW: number; pipH: number } | null {
    if (!this.webcamStream && !this.previewWebcamStream) return null;
    const W = this.#canvas.width, H = this.#canvas.height;
    const pipW = Math.round(W / 4), pipH = Math.round(H / 4);
    const marg = Math.round(W / 80);
    const px   = this.pipX < 0 ? marg            : Math.round(this.pipX * W);
    const py   = this.pipY < 0 ? H - pipH - marg : Math.round(this.pipY * H);
    return { px, py, pipW, pipH };
  }

  waitForVideoReady(vid: HTMLVideoElement): Promise<void> {
    return new Promise<void>(resolve => {
      if (vid.readyState >= 2) { resolve(); return; }
      vid.addEventListener('loadeddata', () => resolve(), { once: true });
      setTimeout(resolve, VIDEO_READY_TIMEOUT_MS);
    });
  }

  #canvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.#canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.#canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (this.#canvas.height / rect.height),
    };
  }

  #normPoint(p: { x: number; y: number }): NormalizedPoint {
    return {
      x: Math.max(0, Math.min(1, p.x / this.#canvas.width)),
      y: Math.max(0, Math.min(1, p.y / this.#canvas.height)),
    };
  }

  #normalizeRect(a: NormalizedPoint, b: NormalizedPoint): { x: number; y: number; w: number; h: number } | null {
    const x1 = Math.max(0, Math.min(a.x, b.x));
    const y1 = Math.max(0, Math.min(a.y, b.y));
    const x2 = Math.min(1, Math.max(a.x, b.x));
    const y2 = Math.min(1, Math.max(a.y, b.y));
    const w = x2 - x1;
    const h = y2 - y1;
    if (w <= 0.01 || h <= 0.01) return null;
    return { x: x1, y: y1, w, h };
  }

  #mapPointToCanvas(p: NormalizedPoint, W: number, H: number): { x: number; y: number } {
    if (!this.#zoomRegion) return { x: p.x * W, y: p.y * H };
    return {
      x: ((p.x - this.#zoomRegion.x) / this.#zoomRegion.w) * W,
      y: ((p.y - this.#zoomRegion.y) / this.#zoomRegion.h) * H,
    };
  }

  #mapRectToCanvas(rect: { x: number; y: number; w: number; h: number }, W: number, H: number) {
    const topLeft = this.#mapPointToCanvas({ x: rect.x, y: rect.y }, W, H);
    const bottomRight = this.#mapPointToCanvas({ x: rect.x + rect.w, y: rect.y + rect.h }, W, H);
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: bottomRight.x - topLeft.x,
      h: bottomRight.y - topLeft.y,
    };
  }

  #drawAnnotations(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const drawStroke = (annotation: DrawAnnotation) => {
      if (annotation.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = this.#mapPointToCanvas(annotation.points[0], W, H);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < annotation.points.length; i++) {
        const p = this.#mapPointToCanvas(annotation.points[i], W, H);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawHighlight = (annotation: RectAnnotation, isDraft = false) => {
      const mapped = this.#mapRectToCanvas(annotation.rect, W, H);
      const alpha = isDraft ? 0.18 : 0.28;
      ctx.save();
      ctx.fillStyle = this.#withAlpha(annotation.color, alpha);
      ctx.strokeStyle = this.#withAlpha(annotation.color, 0.9);
      ctx.lineWidth = annotation.width;
      ctx.fillRect(mapped.x, mapped.y, mapped.w, mapped.h);
      ctx.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
      ctx.restore();
    };

    for (const annotation of this.#annotations) {
      if (annotation.type === 'draw') drawStroke(annotation);
      else drawHighlight(annotation);
    }

    if (this.#draftStroke) drawStroke(this.#draftStroke);

    if (this.#draftRect) {
      if (this.#draftRect.mode === 'highlight') drawHighlight(this.#draftRect, true);
      else {
        const mapped = this.#mapRectToCanvas(this.#draftRect.rect, W, H);
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = Math.max(1, this.#draftRect.width / 2);
        ctx.setLineDash([10, 6]);
        ctx.fillRect(mapped.x, mapped.y, mapped.w, mapped.h);
        ctx.strokeRect(mapped.x, mapped.y, mapped.w, mapped.h);
        ctx.restore();
      }
    }
  }

  #withAlpha(hexColor: string, alpha: number): string {
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return `rgba(255,255,0,${alpha})`;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  setAnnotationOptions({ tool, color, width }: { tool: AnnotationTool; color: string; width: number }) {
    this.#annotationTool = tool;
    this.#annotationColor = color;
    this.#annotationWidth = width;
    if (!this.#pipDragging && !this.#isAnnotating) {
      this.#canvas.style.cursor = tool === 'none' ? '' : 'crosshair';
    }
    this.#syncDataAttrs();
  }

  clearAnnotations() {
    this.#annotations = [];
    this.#draftStroke = null;
    this.#draftRect = null;
    this.#syncDataAttrs();
  }

  clearZoomRegion() {
    this.#zoomRegion = null;
    this.#draftRect = null;
    this.#syncDataAttrs();
  }

  #syncDataAttrs() {
    this.#canvas.dataset.annotationCount = String(this.#annotations.length);
    this.#canvas.dataset.zoomActive = String(!!this.#zoomRegion);
    this.#canvas.dataset.annotationTool = this.#annotationTool;
  }

  #setupPipDrag() {
    this.#canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.#annotationTool !== 'none') {
        const start = this.#normPoint(this.#canvasPos(e));
        this.#isAnnotating = true;
        this.#dragStart = start;

        if (this.#annotationTool === 'draw') {
          this.#draftStroke = {
            type: 'draw',
            points: [start],
            color: this.#annotationColor,
            width: this.#annotationWidth,
          };
          this.#draftRect = null;
        } else {
          this.#draftStroke = null;
          this.#draftRect = {
            type: 'highlight',
            mode: this.#annotationTool,
            rect: { x: start.x, y: start.y, w: 0, h: 0 },
            color: this.#annotationColor,
            width: this.#annotationWidth,
          };
        }

        this.#canvas.style.cursor = 'crosshair';
        e.preventDefault();
        return;
      }

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

    this.#canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.#isAnnotating) {
        const curr = this.#normPoint(this.#canvasPos(e));
        if (this.#annotationTool === 'draw' && this.#draftStroke) {
          this.#draftStroke.points.push(curr);
        } else if (this.#draftRect && this.#dragStart) {
          const rect = this.#normalizeRect(this.#dragStart, curr);
          this.#draftRect.rect = rect ?? { x: this.#dragStart.x, y: this.#dragStart.y, w: 0, h: 0 };
        }
        e.preventDefault();
        return;
      }

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
      if (this.#isAnnotating) {
        if (this.#annotationTool === 'draw' && this.#draftStroke && this.#draftStroke.points.length > 1) {
          this.#annotations.push(this.#draftStroke);
        } else if (this.#draftRect && this.#dragStart) {
          const rect = this.#draftRect.rect;
          const normalized = rect.w > 0 && rect.h > 0 ? rect : null;
          if (normalized) {
            if (this.#draftRect.mode === 'zoom') {
              this.#zoomRegion = normalized;
            } else {
              this.#annotations.push({
                type: 'highlight',
                rect: normalized,
                color: this.#annotationColor,
                width: this.#annotationWidth,
              });
            }
          }
        }
        this.#isAnnotating = false;
        this.#dragStart = null;
        this.#draftStroke = null;
        this.#draftRect = null;
        this.#canvas.style.cursor = this.#annotationTool === 'none' ? '' : 'crosshair';
        this.#syncDataAttrs();
        return;
      }

      if (!this.#pipDragging) return;
      this.#pipDragging = false;
      this.#canvas.style.cursor = '';
      this.#onPipMoved?.(this.pipX, this.pipY);
    };

    this.#canvas.addEventListener('mouseup',    stopDrag);
    this.#canvas.addEventListener('mouseleave', stopDrag);
  }

  #roundRect(x: number, y: number, w: number, h: number, r: number) {
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
