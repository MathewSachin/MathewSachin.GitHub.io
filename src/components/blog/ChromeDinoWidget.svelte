<script lang="ts">
import CopyButton from '@components/tools/CopyButton.svelte';

const { resetFunction, contentToCopy, children, resetId = '', copyId = '' } = $props();
</script>

<div class="highlight code-block-header">
  <div class="dino-hack-controls d-flex justify-content-between gap-2 flex-wrap px-3 py-2">
    <span class="code-lang">JS</span>
    <span>
      <button class="btn btn-sm btn-code" id={resetId} onclick={resetFunction} title="Reset to default" aria-label="Reset speed to default"><i class="fa fa-undo" aria-hidden="true"></i> RESET</button>
      <CopyButton value={contentToCopy} className="btn btn-sm btn-code" {...(copyId ? { id: copyId } : {})}>COPY</CopyButton>
    </span>
  </div>
  <div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2 small text-white text-opacity-75">
    {@render children()}
  </div>
</div>
