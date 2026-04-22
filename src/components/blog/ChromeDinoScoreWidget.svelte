<script lang="ts">
import { onMount } from 'svelte';
import { registerCopyToClipboard } from '@scripts/utils';

let score = '12345';
const DEFAULT = 12345;
let copyBtn: HTMLButtonElement | null = null;

function update(v: unknown) {
  let val = parseInt(String(v), 10);
  if (isNaN(val) || val < 0) val = 0;
  if (val > 99999) val = 99999;
  score = String(val);
}

onMount(() => {
  if (copyBtn) {
    registerCopyToClipboard(copyBtn, () => `(Runner.instance_ || Runner.getInstance()).distanceRan = ${score} / 0.025`, copyBtn.querySelector('i'));
  }
});
</script>

<div class="dino-hack-widget">
  <div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
    <button class="btn btn-sm btn-dino-reset" on:click={() => update(DEFAULT)} title="Reset to default" aria-label="Reset score to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
    <button class="btn btn-sm btn-dino" bind:this={copyBtn} title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i> COPY</button>
  </div>
  <div class="dino-hack-controls d-flex  align-items-center gap-2 flex-wrap px-3 py-2 small text-white text-opacity-75">
    <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).distanceRan <span class="code-symbol">=</span> </span>
    <input type="number" class="form-control form-control-sm dino-hack-num" bind:value={score} min="0" max="99999" aria-label="Score value" style="width:110px" on:input={(e) => update((e.target as HTMLInputElement).value)} />
    <span> <span class="code-symbol">/</span> <span class="code-number">0.025</span></span>
  </div>
</div>

<style>
@import '@styles/chrome-dino-hack.css';
</style>
