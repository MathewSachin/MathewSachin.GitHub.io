<script lang="ts">
import { createEventDispatcher } from "svelte";
import { tick } from "svelte";
import Fa from 'svelte-fa';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-common-types';

export let value: string = "";
export let targetSelector: string = "";
export let title: string = "Copy";
export let icon: IconDefinition = faCopy;
export let copiedIcon: IconDefinition = faCheck;
export let iconClass: string = "";
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
  <Fa icon={copied ? copiedIcon : icon} class={iconClass} />
  <slot />
</button>
