<script lang="ts">

import { extractVideoId, thumbnailUrl, getResolutions } from "../../scripts/tools/yt-thumbnail";
import Fa from 'svelte-fa';
import { faDownload, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { faYoutube } from '@fortawesome/free-brands-svg-icons';

let input = "";
let error = "";
let currentId: string | null = null;
let selectedRes = getResolutions()[0].key;
let previewUrl = "";
let downloadFilename = "";
let showResult = false;
let resolutions = getResolutions();

function showError(msg: string) {
  error = msg;
  showResult = false;
}

function clearError() {
  error = "";
}

function updatePreview() {
  if (!currentId) return;
  previewUrl = thumbnailUrl(currentId, selectedRes);
  downloadFilename = `thumbnail-${currentId}-${selectedRes}.jpg`;
}

function grabThumbnail() {
  clearError();
  const id = extractVideoId(input);
  if (!id) {
    showError("Could not find a valid YouTube video ID. Paste a full YouTube URL or the 11-character video ID.");
    return;
  }
  currentId = id;
  showResult = true;
  updatePreview();
}

function downloadThumbnail() {
  if (!previewUrl || !downloadFilename) return;
  fetch(previewUrl)
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadFilename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    })
    .catch(() => {
      window.open(previewUrl, "_blank");
    });
}
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="mb-3">
      <label for="yt-input" class="form-label fw-semibold">YouTube URL or Video ID</label>
      <input id="yt-input" type="text" class="form-control font-monospace" bind:value={input}
        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        onkeydown={(e) => { if (e.key === 'Enter') grabThumbnail(); }}>
      <div class="form-text">Paste any YouTube URL (watch, shorts, youtu.be) or just the 11-character video ID.</div>
    </div>
    <button id="grab-btn" class="btn btn-danger text-white" onclick={grabThumbnail}>
      <Fa icon={faYoutube} class="me-1" />Grab Thumbnail
    </button>
    <div id="yt-error" class:text-danger={!!error} class:small={!!error} class:mt-2={!!error} class:d-none={!error}>{error}</div>
    <div id="yt-result" class:mt-4={showResult} class:d-none={!showResult}>
      {#if showResult}
        <div class="mb-3">
          <img id="yt-preview" alt="YouTube thumbnail preview"
            class="img-fluid rounded border d-block" src={previewUrl} data-proofer-ignore>
        </div>
        <div class="mb-3">
          <label for="yt-res-select" class="form-label">Resolution</label>
          <select id="yt-res-select" class="form-select" style="max-width:320px;" bind:value={selectedRes} onchange={updatePreview}>
            {#each resolutions as r}
              <option value={r.key}>{r.label}</option>
            {/each}
          </select>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <a id="yt-open-btn" href={previewUrl} target="_blank" rel="noopener"
            class="btn btn-outline-secondary">
            <Fa icon={faExternalLinkAlt} class="me-1" />Open Image
          </a>
          <button id="yt-download-btn" type="button"
            class="btn btn-primary" onclick={downloadThumbnail}
            data-filename={downloadFilename}>
            <Fa icon={faDownload} class="me-1" />Download
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
