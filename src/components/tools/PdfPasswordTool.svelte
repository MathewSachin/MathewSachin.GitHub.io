<script lang="ts">
export let workerUrl: string;

let selectedFile: File | null = null;
let fileName = '';
let fileValid = false;
let isEncrypted = false;
let mode: 'add' | 'remove' = 'add';
let userPass = '';
let ownerPass = '';
let decryptPass = '';
let statusText = '';
let statusType: 'info' | 'danger' | 'success' | 'warning' = 'info';
let statusIcon = '';
let statusVisible = false;
let processDisabled = true;
let resultUrl = '';
let resultName = '';

function showStatus(text: string, type: typeof statusType, icon: string = '') {
  statusText = text;
  statusType = type;
  statusIcon = icon;
  statusVisible = true;
}
function hideStatus() { statusVisible = false; }

function isPdfEncrypted(bytes: Uint8Array): boolean {
  const tail = bytes.length > 4096 ? bytes.slice(bytes.length - 4096) : bytes;
  const text = new TextDecoder('latin1').decode(tail);
  return /\/Encrypt\s+\d+\s+\d+\s+R/.test(text);
}
function isValidPdf(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const pdfSignature = new TextDecoder('latin1').decode(bytes.slice(0, 5));
  return pdfSignature.startsWith('%PDF-');
}
function revokePreviousUrl() {
  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = '';
  }
}

function setMode(m: 'add' | 'remove') {
  mode = m;
}

function handleFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files && files[0]) handleFile(files[0]);
}
function handleDrop(e: DragEvent) {
  e.preventDefault();
  const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null;
  if (f) handleFile(f);
}
function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showStatus('Please select a PDF file.', 'danger', 'fa-exclamation-circle');
    return;
  }
  selectedFile = file;
  fileName = file.name;
  revokePreviousUrl();
  resultUrl = '';
  resultName = '';
  hideStatus();
  const reader = new FileReader();
  reader.onload = function (e) {
    const buf = (e.target && e.target.result) as ArrayBuffer | null;
    if (!buf) return;
    const bytes = new Uint8Array(buf);
    fileValid = isValidPdf(bytes);
    if (!fileValid) {
      showStatus('The selected file does not appear to be a valid PDF.', 'danger', 'fa-exclamation-circle');
      selectedFile = null;
      fileName = '';
      processDisabled = true;
      return;
    }
    isEncrypted = isPdfEncrypted(bytes);
    if (isEncrypted) {
      setMode('remove');
      showStatus('Encrypted PDF detected — enter the current password to remove it.', 'info', 'fa-lock');
    } else {
      setMode('add');
      showStatus('No encryption detected — you can add a password below.', 'info', 'fa-lock-open');
    }
    processDisabled = false;
  };
  reader.readAsArrayBuffer(file);
}

async function processPdf() {
  if (!selectedFile) return;
  if (mode === 'add' && !userPass && !ownerPass) {
    showStatus('Please enter at least a User Password or Owner Password.', 'danger', 'fa-exclamation-circle');
    return;
  }
  processDisabled = true;
  showStatus('Loading qpdf — this may take a moment on first use…', 'info', 'fa-spinner fa-spin');
  const reader = new FileReader();
  reader.onload = function (e) {
    const buf = (e.target && e.target.result) as ArrayBuffer | null;
    if (!buf) return;
    const fileData = new Uint8Array(buf);
    const worker = new Worker(workerUrl);
    worker.onmessage = function (ev) {
      worker.terminate();
      processDisabled = false;
      if (!ev.data.success) {
        const msg = ev.data.error || 'An unknown error occurred.';
        showStatus(msg, 'danger', 'fa-times-circle');
        return;
      }
      revokePreviousUrl();
      const blob = new Blob([ev.data.data], { type: 'application/pdf' });
      resultUrl = URL.createObjectURL(blob);
      const baseName = selectedFile!.name.replace(/\.pdf$/i, '');
      resultName = baseName + (mode === 'remove' ? '-decrypted.pdf' : '-protected.pdf');
      showStatus('Done! Your file is ready to download.', 'success', 'fa-check-circle');
    };
    worker.onerror = function (err) {
      worker.terminate();
      processDisabled = false;
      showStatus('Worker error: ' + (err.message || 'unknown'), 'danger', 'fa-times-circle');
    };
    const msg: any = { file: fileData, type: mode === 'remove' ? 'decrypt' : 'encrypt' };
    if (mode === 'remove') {
      msg.password = decryptPass;
    } else {
      msg.userPass = userPass;
      msg.ownerPass = ownerPass || userPass;
    }
    showStatus('Processing…', 'info', 'fa-spinner fa-spin');
    worker.postMessage(msg);
  };
  reader.readAsArrayBuffer(selectedFile);
}
</script>

<div class="card google-anno-skip">
<div class="card-body">

<!-- Privacy badge -->
<div class="d-flex align-items-center gap-2 mb-4 p-2 rounded"
  style="background:rgba(25,135,84,.08); border:1px solid rgba(25,135,84,.2)">
  <i class="fas fa-shield-alt text-success"></i>
  <span class="small">
    <strong class="text-success">Privacy Check:</strong>
    0KB uploaded to server — all processing happens in your browser.
  </span>
</div>

<!-- Drop zone -->
<div id="drop-zone" class="border border-2 rounded p-5 text-center mb-4"
  style="cursor:pointer; border-style:dashed !important"
  on:click={() => document.getElementById('file-input')?.click()}
  on:dragover|preventDefault={() => {}} on:drop={handleDrop}>
  <i class="fas fa-file-pdf fa-2x text-muted mb-2 d-block"></i>
  <p class="mb-1">Drop a PDF here, or <span class="text-primary">click to browse</span></p>
  <small class="text-muted">PDF files only</small>
  <input type="file" id="file-input" accept=".pdf,application/pdf" class="d-none" on:change={handleFileInput}>
</div>

<!-- Selected file name -->
{#if fileName}
<p class="text-muted small mb-3">
  <i class="fas fa-file-pdf me-1"></i>{fileName}
</p>
{/if}

<!-- Mode selector -->
<div class="mb-4">
  <label class="form-label fw-semibold">Operation</label>
  <div class="d-flex gap-3 flex-wrap">
    <div class="form-check">
      <input class="form-check-input" type="radio" name="pdf-mode" id="mode-remove" value="remove" bind:group={mode}>
      <label class="form-check-label" for="mode-remove">
        <i class="fas fa-lock-open me-1 text-success"></i>Remove Password
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="pdf-mode" id="mode-add" value="add" bind:group={mode}>
      <label class="form-check-label" for="mode-add">
        <i class="fas fa-lock me-1 text-primary"></i>Add Password
      </label>
    </div>
  </div>
</div>

<!-- Remove-password section (shown when PDF is encrypted) -->
{#if mode === 'remove'}
<div class="mb-4">
  <label class="form-label fw-semibold" for="decrypt-pass">Current Password</label>
  <input type="password" id="decrypt-pass" class="form-control"
    placeholder="Enter the existing PDF password" autocomplete="current-password" bind:value={decryptPass}>
</div>
{/if}

<!-- Add-password section -->
{#if mode === 'add'}
<div class="mb-4">
  <div class="row g-3">
    <div class="col-12 col-sm-6">
      <label class="form-label fw-semibold" for="user-pass">
        User Password
        <i class="fas fa-info-circle text-muted ms-1" title="Password required to open the PDF"></i>
      </label>
      <input type="password" id="user-pass" class="form-control"
        placeholder="Required to open the PDF" autocomplete="new-password" bind:value={userPass}>
    </div>
    <div class="col-12 col-sm-6">
      <label class="form-label fw-semibold" for="owner-pass">
        Owner Password
        <i class="fas fa-info-circle text-muted ms-1" title="Password for full permissions (printing, editing). Defaults to User Password if left blank."></i>
      </label>
      <input type="password" id="owner-pass" class="form-control"
        placeholder="Defaults to User Password" autocomplete="new-password" bind:value={ownerPass}>
    </div>
  </div>
  <small class="text-muted d-block mt-2">
    Uses 256-bit AES encryption (PDF 1.7+).
  </small>
</div>
{/if}

<!-- Status message -->
{#if statusVisible}
<div class="mb-3">
  <div class={`alert alert-${statusType} py-2 mb-0`}>
    {#if statusIcon}
      <i class={`fas ${statusIcon} me-2`}></i>
    {/if}
    {statusText}
  </div>
</div>
{/if}

<!-- Process button -->
<button class="btn btn-primary" on:click={processPdf} disabled={processDisabled}>
  <i class="fas fa-cog me-1"></i>Process PDF
</button>

<!-- Result / download -->
{#if resultUrl}
<div class="mt-4">
  <div class="d-flex align-items-center gap-3 flex-wrap p-3 border rounded">
    <i class="fas fa-file-pdf fa-2x text-danger"></i>
    <div>
      <div class="small text-muted mb-1">Your processed PDF is ready:</div>
      <a href={resultUrl} download={resultName} class="btn btn-success btn-sm">
        <i class="fas fa-download me-1"></i><span>Download</span>
      </a>
    </div>
  </div>
</div>
{/if}

</div>
</div>