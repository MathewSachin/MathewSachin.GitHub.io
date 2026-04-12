// ── dialogs.js ────────────────────────────────────────────────────────────────
// Alert banner, toast notifications, and modal error dialog.

const alertBox    = document.getElementById('alert-box');
const errorDialog = document.getElementById('captura-error-dialog');

const TOAST_FADE_MS = 150;

export function showAlert(msgOrNode, type) {
  alertBox.className = 'alert alert-' + type + ' mb-3';
  alertBox.hidden    = false;
  if (typeof msgOrNode === 'string') alertBox.textContent = msgOrNode;
  else alertBox.replaceChildren(msgOrNode);
}

export function showToast(msgOrNode, type, autohide = true) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  toast.setAttribute('aria-atomic', 'true');

  const inner = document.createElement('div');
  inner.className = 'd-flex';

  const body = document.createElement('div');
  body.className = 'toast-body';
  if (typeof msgOrNode === 'string') body.textContent = msgOrNode;
  else body.appendChild(msgOrNode);

  const closeBtn = document.createElement('button');
  closeBtn.type      = 'button';
  closeBtn.className = type === 'warning'
    ? 'btn-close me-2 m-auto flex-shrink-0'
    : 'btn-close btn-close-white me-2 m-auto flex-shrink-0';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.parentNode?.removeChild(toast), TOAST_FADE_MS);
  });

  inner.append(body, closeBtn);
  toast.appendChild(inner);
  container.appendChild(toast);

  if (autohide) {
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.parentNode?.removeChild(toast), TOAST_FADE_MS);
    }, 8000);
  }
}

export function showErrorDialog(title, message) {
  if (!errorDialog) { showAlert(message, 'danger'); return; }
  document.getElementById('captura-error-title').textContent = title;
  document.getElementById('captura-error-body').textContent  = message;
  errorDialog.showModal();
}

// Wire up error-dialog close handlers once on module load.
if (errorDialog) {
  const closeDialog = () => errorDialog.close();
  document.getElementById('captura-error-close')?.addEventListener('click', closeDialog);
  errorDialog.addEventListener('click', e => { if (e.target === errorDialog) closeDialog(); });
}
