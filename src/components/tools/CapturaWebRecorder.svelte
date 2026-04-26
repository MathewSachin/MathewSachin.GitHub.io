<div id="alert-box" class="alert mb-3" hidden></div>

<div id="toast-container" class="toast-container position-fixed bottom-0 end-0 p-3"></div>

<dialog id="captura-error-dialog" aria-labelledby="captura-error-title">
  <div class="captura-dialog-content">
    <button type="button" class="captura-dialog-close" id="captura-error-close" aria-label="Close">&times;</button>
    <h5 id="captura-error-title" class="captura-dialog-title"></h5>
    <p id="captura-error-body" class="captura-dialog-body"></p>
  </div>
</dialog>

<!-- ── Recorder ──────────────────────────────────────────────────────────── -->
<div id="recorder-ui" class="card mb-4 google-anno-skip">
  <div class="card-body">

    <div class="row g-4">

      <!-- Left: canvas preview -->
      <div class="col-lg-8">
        <div class="mb-2 d-flex align-items-center justify-content-between">
          <span class="fw-semibold">Preview</span>
          <span class="d-flex align-items-center gap-2">
            <span id="status-badge" class="badge bg-secondary">Idle</span>
            <span id="timer-text" class="font-monospace text-muted small">00:00</span>
          </span>
        </div>
        <div class="canvas-wrap">
          <canvas id="recorder-canvas" width="1280" height="720"></canvas>
          <div id="countdown-overlay" hidden aria-live="assertive" aria-atomic="true">
            <span id="countdown-number"></span>
          </div>
        </div>
        <div class="mt-3 d-flex gap-2 flex-wrap">
          <button id="start-btn" class="btn btn-info text-white">
            <i class="fas fa-circle me-1"></i>Start Recording
          </button>
          <button id="pause-btn" class="btn btn-warning text-dark" hidden>
            <i class="fas fa-pause me-1"></i>Pause
          </button>
          <button id="stop-btn" class="btn btn-danger" hidden>
            <i class="fas fa-stop me-1"></i>Stop
          </button>
          <button id="cancel-countdown-btn" class="btn btn-secondary" hidden>
            <i class="fas fa-times me-1"></i>Cancel
          </button>
          <button id="end-session-btn" class="btn btn-outline-warning" hidden>
            <i class="fas fa-times-circle me-1"></i>End Session
          </button>
        </div>

        <!-- Save location -->
        <div class="mt-3 d-flex align-items-center gap-2">
          <span id="dir-name" class="text-muted small flex-grow-1 text-truncate">(no folder selected)</span>
          <button id="pick-dir-btn" class="btn btn-sm btn-outline-secondary flex-shrink-0">
            <i class="fas fa-folder-open me-1"></i>Choose Folder
          </button>
        </div>

        <!-- Audio Mix -->
        <div class="mt-3">
          <h6 class="mb-2">Audio Mix</h6>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label text-muted small mb-0" for="mic-gain-slider">
                <i class="fas fa-microphone me-1"></i>Mic level
              </label>
              <span id="mic-gain-label" class="text-muted small font-monospace">100%</span>
            </div>
            <input type="range" class="form-range" id="mic-gain-slider" min="0" max="2" step="0.01" value="1">
            <canvas id="mic-level-canvas" class="audio-meter mt-1" width="200" height="10"></canvas>
          </div>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label text-muted small mb-0" for="sys-gain-slider">
                <i class="fas fa-desktop me-1"></i>System level
              </label>
              <span id="sys-gain-label" class="text-muted small font-monospace">100%</span>
            </div>
            <input type="range" class="form-range" id="sys-gain-slider" min="0" max="2" step="0.01" value="1">
            <canvas id="sys-level-canvas" class="audio-meter mt-1" width="200" height="10"></canvas>
          </div>
        </div>

      </div>

      <!-- Right: settings -->
      <div class="col-lg-4">

        <!-- Audio / Video sources -->
        <h6 class="mb-3">Sources</h6>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="webcam-select">
            <i class="fas fa-video me-1"></i>Webcam overlay
          </label>
          <select id="webcam-select" class="form-select form-select-sm">
            <option value="">None</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="mic-select">
            <i class="fas fa-microphone me-1"></i>Microphone
          </label>
          <select id="mic-select" class="form-select form-select-sm">
            <option value="">None</option>
          </select>
        </div>

        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="sys-audio-chk">
          <label class="form-check-label small" for="sys-audio-chk">Capture system audio</label>
        </div>

        <hr>

        <!-- Quality -->
        <h6 class="mb-3">Quality</h6>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="fps-select">Frame rate</label>
          <select id="fps-select" class="form-select form-select-sm">
            <option value="15">15 fps</option>
            <option value="30" selected>30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="quality-select">Quality preset</label>
          <select id="quality-select" class="form-select form-select-sm">
            <option value="480">480p — ~2 Mbps</option>
            <option value="720" selected>720p — ~4 Mbps</option>
            <option value="1080">1080p — ~8 Mbps</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="format-select">Recording format</label>
          <select id="format-select" class="form-select form-select-sm">
            <option value="webm-vp9-opus" selected>WebM — VP9 + Opus</option>
            <option value="mp4-h264-aac">MP4 — H.264 + AAC</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label text-muted small mb-1" for="countdown-select">Countdown timer</label>
          <select id="countdown-select" class="form-select form-select-sm">
            <option value="0">Off</option>
            <option value="3" selected>3 seconds</option>
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
          </select>
        </div>

      </div>
    </div><!-- /.row -->

  </div><!-- /.card-body -->
</div><!-- /.card -->