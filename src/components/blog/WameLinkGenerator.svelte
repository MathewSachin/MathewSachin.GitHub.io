<script lang="ts">
let number = '';
let message = '';
let copied = false;
let copyTimeout: ReturnType<typeof setTimeout>;

$: link = buildLink(number, message);

function buildLink(num: string, msg: string): string {
  const digits = num.replace(/\D/g, '');
  let url = 'https://wa.me/' + digits;
  if (msg.trim()) {
    url += '?text=' + encodeURIComponent(msg.trim());
  }
  return url;
}

async function copyLink() {
  if (!number.replace(/\D/g, '')) return;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    // fallback for non-secure contexts
    const el = document.createElement('textarea');
    el.value = link;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
  copied = true;
  clearTimeout(copyTimeout);
  copyTimeout = setTimeout(() => { copied = false; }, 2500);
}
</script>

<div class="card border-0 shadow-sm my-4" style="background: linear-gradient(135deg, #e8f9ee 0%, #f0fdf4 100%); border-left: 4px solid #25D366 !important;">
  <div class="card-body p-4">
    <h5 class="card-title mb-3" style="color: #075e54;">
      <i class="fab fa-whatsapp me-2" style="color: #25D366;"></i> Generate Your wa.me Link
    </h5>

    <div class="mb-3">
      <label class="form-label fw-semibold" for="wame-number">Phone Number <span class="text-muted fw-normal">(full international format, digits only)</span></label>
      <input type="tel" id="wame-number" class="form-control" placeholder="e.g. 919876543210" style="font-family: monospace;" bind:value={number} />
      <div class="form-text">Include country code. No +, spaces, dashes, or brackets.</div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold" for="wame-message">Pre-filled Message <span class="text-muted fw-normal">(optional)</span></label>
      <input type="text" id="wame-message" class="form-control" placeholder="e.g. Hi, I'd like to place an order!" bind:value={message} />
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold" for="wame-output">Your Link</label>
      <div class="input-group">
        <input type="text" id="wame-output" class="form-control" readonly value={link} style="font-family: monospace; background: #fff;" />
        <button
          class="btn btn-success"
          on:click={copyLink}
          style={copied ? 'background-color: #128C7E; border-color: #128C7E;' : 'background-color: #25D366; border-color: #25D366;'}
        >
          {#if copied}
            <i class="fas fa-check me-1"></i> Copied!
          {:else}
            <i class="fas fa-copy me-1"></i> Copy
          {/if}
        </button>
      </div>
    </div>

    {#if copied}
      <div class="alert alert-success py-2 px-3 mb-0" role="alert">
        ✅ Link copied to clipboard!
      </div>
    {/if}
  </div>
</div>
