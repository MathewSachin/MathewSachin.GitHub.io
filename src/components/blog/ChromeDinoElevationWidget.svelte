<script lang="ts">
import ChromeDinoWidget from '@components/blog/ChromeDinoWidget.svelte';

let ground = 0;
const DEFAULT = 0;
</script>

<ChromeDinoWidget 
  resetFunction={() => ground = DEFAULT}
  contentToCopy={`(Runner.instance_ || Runner.getInstance()).tRex.groundYPos = 93 - ${ground}`}
  resetId="ground-reset"
  copyId="btn-ground-clip"
>
  <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).tRex.groundYPos <span class="code-symbol">=</span> <span class="code-number">93</span>  <span class="code-symbol">-</span> </span>
  <input type="number" id="ground-input" class="form-control form-control-sm w-auto" bind:value={ground} min="-40" max="130" aria-label="Ground Y offset value" />
</ChromeDinoWidget>
