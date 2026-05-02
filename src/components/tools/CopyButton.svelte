<script lang="ts">
import { createEventDispatcher } from "svelte";
import { tick } from "svelte";

export let value: string = "";
export let targetSelector: string = "";
export let title: string = "Copy";
export let iconClass: string = "fas fa-copy";
export let copiedIconClass: string = "fas fa-check";
export let resetDelay: number = 2000;
export let className: string = "btn btn-sm btn-outline-secondary";

let copied = false;
const dispatch = createEventDispatcher();

async function handleCopy() {
  try {
    const targetValue = targetSelector
      ? (document.querySelector(targetSelector)?.textContent || "")
      : value;

    await navigator.clipboard.writeText(targetValue);
    copied = true;
    dispatch("copied");
    await tick();
    setTimeout(() => {
      copied = false;
    }, resetDelay);
  } catch (e) {
    // fallback: do nothing
  }
}
</script>

<button {...$$restProps} class={className} {title} on:click={handleCopy}>
  <i class={copied ? copiedIconClass : iconClass}></i>
  <slot />
</button>
