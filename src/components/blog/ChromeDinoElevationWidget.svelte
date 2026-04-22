<script lang="ts">
import { onMount } from 'svelte';
import { registerCopyToClipboard } from '@scripts/utils';

let ground = '0';
const DEFAULT = 0;
const MIN = -40;
const MAX = 130;
let copyBtn: HTMLButtonElement | null = null;

function update(v: unknown) {
  let val = parseInt(String(v), 10);
  if (isNaN(val)) val = DEFAULT;
  if (val < MIN) val = MIN;
  if (val > MAX) val = MAX;
  ground = String(val);
}

onMount(() => {
  if (copyBtn) {
    registerCopyToClipboard(copyBtn, () => `(Runner.instance_ || Runner.getInstance()).tRex.groundYPos = 93 - ${ground}`, copyBtn.querySelector('i'));
  }
});
</script>

<div class="dino-hack-widget">
  <div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
    <button class="btn btn-sm btn-dino-reset" on:click={() => update(DEFAULT)} title="Reset to default" aria-label="Reset Y offset to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
    <button class="btn btn-sm btn-dino" bind:this={copyBtn} title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i> COPY</button>
  </div>
  <div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2 small text-white text-opacity-75">
    <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).tRex.groundYPos <span class="code-symbol">=</span> <span class="code-number">93</span>  <span class="code-symbol">-</span> </span>
    <input type="number" class="form-control form-control-sm dino-hack-num" bind:value={ground} min="-40" max="130" aria-label="Ground Y offset value" on:input={(e) => update((e.target as HTMLInputElement).value)} />
  </div>
</div>

<style>
@import '@styles/chrome-dino-hack.css';
</style>