<script lang="ts">
import Fa from 'svelte-fa';
import { faExclamationCircle, faLock, faLockOpen, faSpinner, faTimesCircle, faCheckCircle, faShieldAlt, faFilePdf, faInfoCircle, faCog, faDownload } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-common-types';
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
let statusIcon: IconDefinition | null = null;
let statusSpin = false;
let statusVisible = false;
let processDisabled = true;
let resultUrl = '';
let resultName = '';

function showStatus(text: string, type: typeof statusType, icon: IconDefinition | null = null, spin = false) {
  statusText = text;
  statusType = type;
  statusIcon = icon;
  statusSpin = spin;
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
    showStatus('Please select a PDF file.', 'danger', faExclamationCircle);
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
      showStatus('The selected file does not appear to be a valid PDF.', 'danger', faExclamationCircle);
      selectedFile = null;
      fileName = '';
      processDisabled = true;
      return;
    }
    isEncrypted = isPdfEncrypted(bytes);
    if (isEncrypted) {
      setMode('remove');
      showStatus('Encrypted PDF detected — enter the current password to remove it.', 'info', faLock);
    } else {
      setMode('add');
      showStatus('No encryption detected — you can add a password below.', 'info', faLockOpen);
    }
    processDisabled = false;
  };
  reader.readAsArrayBuffer(file);
}

async function processPdf() {
  if (!selectedFile) return;
  if (mode === 'add' && !userPass && !ownerPass) {
    showStatus('Please enter at least a User Password or Owner Password.', 'danger', faExclamationCircle);
    return;
  }
  processDisabled = true;
  showStatus('Loading qpdf — this may take a moment on first use…', 'info', faSpinner, true);
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
        showStatus(msg, 'danger', faTimesCircle);
        return;
      }
      revokePreviousUrl();
      const blob = new Blob([ev.data.data], { type: 'application/pdf' });
      resultUrl = URL.createObjectURL(blob);
      const baseName = selectedFile!.name.replace(/\.pdf$/i, '');
      resultName = baseName + (mode === 'remove' ? '-decrypted.pdf' : '-protected.pdf');
      showStatus('Done! Your file is ready to download.', 'success', faCheckCircle);
    };
    worker.onerror = function (err) {
      worker.terminate();
      processDisabled = false;
      showStatus('Worker error: ' + (err.message || 'unknown'), 'danger', faTimesCircle);
    };
    const msg: any = { file: fileData, type: mode === 'remove' ? 'decrypt' : 'encrypt' };
    if (mode === 'remove') {
      msg.password = decryptPass;
    } else {
      msg.userPass = userPass;
      msg.ownerPass = ownerPass || userPass;
    }
    showStatus('Processing…', 'info', faSpinner, true);
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
  <Fa icon={faShieldAlt} class="text-success" />
  <span class="small">
    <strong class="text-success">Privacy Check:</strong>
    <span id="privacy-bytes">0 KB</span> uploaded to server — all processing happens in your browser.
  </span>
</div>

<!-- Drop zone -->
<div id="drop-zone" class="border border-2 rounded p-5 text-center mb-4"
  style="cursor:pointer; border-style:dashed !important"
  on:click={() => document.getElementById('file-input')?.click()}
  on:dragover|preventDefault={() => {}} on:drop={handleDrop}>
  <Fa icon={faFilePdf} size="2x" class="text-muted mb-2 d-block" />
  <p class="mb-1">Drop a PDF here, or <span class="text-primary">click to browse</span></p>
  <small class="text-muted">PDF files only</small>
  <input type="file" id="file-input" accept=".pdf,application/pdf" class="d-none" on:change={handleFileInput}>
</div>

<!-- Selected file name -->
{#if fileName}
<p id="file-name" class="text-muted small mb-3">
  <Fa icon={faFilePdf} class="me-1" />{fileName}
</p>
{/if}

<!-- Mode selector -->
<div class="mb-4">
  <label class="form-label fw-semibold">Operation</label>
  <div class="d-flex gap-3 flex-wrap">
    <div class="form-check">
      <input class="form-check-input" type="radio" name="pdf-mode" id="mode-remove" value="remove" bind:group={mode}>
      <label class="form-check-label" for="mode-remove">
        <Fa icon={faLockOpen} class="me-1 text-success" />Remove Password
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="pdf-mode" id="mode-add" value="add" bind:group={mode}>
      <label class="form-check-label" for="mode-add">
        <Fa icon={faLock} class="me-1 text-primary" />Add Password
      </label>
    </div>
  </div>
</div>

<!-- Remove-password section (shown when PDF is encrypted) -->
{#if mode === 'remove'}
<div id="remove-section" class="mb-4">
  <label class="form-label fw-semibold" for="decrypt-pass">Current Password</label>
  <input type="password" id="decrypt-pass" class="form-control"
    placeholder="Enter the existing PDF password" autocomplete="current-password" bind:value={decryptPass}>
</div>
{/if}

<!-- Add-password section -->
{#if mode === 'add'}
<div id="add-section" class="mb-4">
  <div class="row g-3">
    <div class="col-12 col-sm-6">
      <label class="form-label fw-semibold" for="user-pass">
        User Password
        <Fa icon={faInfoCircle} class="text-muted ms-1" title="Password required to open the PDF" />
      </label>
      <input type="password" id="user-pass" class="form-control"
        placeholder="Required to open the PDF" autocomplete="new-password" bind:value={userPass}>
    </div>
    <div class="col-12 col-sm-6">
      <label class="form-label fw-semibold" for="owner-pass">
        Owner Password
        <Fa icon={faInfoCircle} class="text-muted ms-1" title="Password for full permissions (printing, editing). Defaults to User Password if left blank." />
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
<div id="status-msg" class="mb-3">
  <div class={`alert alert-${statusType} py-2 mb-0`}>
    {#if statusIcon}
      <Fa icon={statusIcon} spin={statusSpin} class="me-2" />
    {/if}
    {statusText}
  </div>
</div>
{/if}

<!-- Process button -->
<button id="process-btn" class="btn btn-primary" on:click={processPdf} disabled={processDisabled}>
  <Fa icon={faCog} class="me-1" />Process PDF
</button>

<!-- Result / download -->
{#if resultUrl}
<div class="mt-4">
  <div class="d-flex align-items-center gap-3 flex-wrap p-3 border rounded">
    <Fa icon={faFilePdf} size="2x" class="text-danger" />
    <div>
      <div class="small text-muted mb-1">Your processed PDF is ready:</div>
      <a href={resultUrl} download={resultName} class="btn btn-success btn-sm">
        <Fa icon={faDownload} class="me-1" /><span>Download</span>
      </a>
    </div>
  </div>
</div>
{/if}

</div>
</div>