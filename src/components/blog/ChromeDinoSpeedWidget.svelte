<script lang="ts">
import { onMount } from 'svelte';
import { registerCopyToClipboard } from '@scripts/utils';

let speed = '50';
const DEFAULT = 6;
let copyBtn: HTMLButtonElement | null = null;

function update(v: unknown) {
  const val = Math.max(0, Math.min(1000, parseInt(String(v), 10) || 0));
  speed = String(val);
}

onMount(() => {
  if (copyBtn) {
    registerCopyToClipboard(copyBtn, () => `(Runner.instance_ || Runner.getInstance()).setSpeed(${speed})`, copyBtn.querySelector('i'));
  }
});
</script>

<div class="dino-hack-widget">
  <div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
    <button class="btn btn-sm btn-dino-reset" on:click={() => update(DEFAULT)} title="Reset to default" aria-label="Reset speed to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
    <button class="btn btn-sm btn-dino" bind:this={copyBtn} title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i> COPY</button>
  </div>
  <div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2 small text-white text-opacity-75">
    <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).<span class="code-function">setSpeed</span>(</span>
    <input type="number" class="form-control form-control-sm dino-hack-num" bind:value={speed} min="0" max="1000" aria-label="Speed value" on:input={(e) => update((e.target as HTMLInputElement).value)} />
    <span>)</span>
  </div>
</div>

<style>
@import '@styles/chrome-dino-hack.css';
</style>
