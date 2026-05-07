<script>
import { onDestroy, tick } from 'svelte';

let {
  value = '',
  targetSelector = '',
  title = 'Copy',
  iconClass = 'fas fa-copy',
  copiedIconClass = 'fas fa-check',
  resetDelay = 2000,
  className = 'btn btn-sm btn-outline-secondary',
  onclick = undefined,
  oncopied = undefined,
  children = undefined,
  ...restProps
} = $props();

let copied = $state(false);
let resetTimer = null;

onDestroy(() => {
  if (resetTimer) clearTimeout(resetTimer);
});

async function handleCopy(event) {
  onclick?.(event);

  try {
    const targetValue = targetSelector
      ? (document.querySelector(targetSelector)?.textContent || '')
      : value;

    await navigator.clipboard.writeText(targetValue);
    copied = true;
    oncopied?.();
    await tick();

    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      copied = false;
      resetTimer = null;
    }, resetDelay);
  } catch {
    // fallback: do nothing
  }
}
</script>

<button {...restProps} class={className} {title} onclick={handleCopy}>
  <i class={copied ? copiedIconClass : iconClass}></i>
  {#if children}
    {@render children()}
  {/if}
</button>
