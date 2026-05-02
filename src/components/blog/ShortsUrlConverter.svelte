<script lang="ts">
import CopyButton from '../tools/CopyButton.svelte';

let shortsUrl = '';

$: videoId = extractVideoId(shortsUrl);
$: outputUrl = videoId ? 'https://www.youtube.com/watch?v=' + videoId : '';

function extractVideoId(value: string): string | null {
  const match = value.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}
</script>

<div class="card shadow-sm my-4" style="max-width:560px;">
  <div class="card-header fw-semibold">🔗 Shorts URL Converter</div>
  <div class="card-body">
    <div class="mb-3">
      <label for="shorts-input" class="form-label">Paste a YouTube Shorts URL</label>
      <input
        id="shorts-input"
        type="url"
        class="form-control font-monospace"
        placeholder="https://www.youtube.com/shorts/dQw4w9WgXcQ"
        bind:value={shortsUrl}
      />
    </div>

    {#if outputUrl}
      <div id="shorts-output-wrap">
        <label class="form-label" for="shorts-output">Normal player URL</label>
        <div class="input-group">
          <input id="shorts-output" type="url" class="form-control font-monospace" readonly value={outputUrl} />
          <CopyButton
            id="btn-copy-shorts-url"
            type="button"
            className="btn btn-outline-secondary"
            value={outputUrl}
          >Copy</CopyButton>
        </div>
        <a id="shorts-open" target="_blank" rel="noopener" class="btn btn-outline-primary mt-2" href={outputUrl}>▶ Open in Normal Player</a>
      </div>
    {/if}
  </div>
</div>
