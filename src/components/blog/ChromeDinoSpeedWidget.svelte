<script lang="ts">
import ChromeDinoWidget from '@components/blog/ChromeDinoWidget.svelte';

let speed = 50;
const DEFAULT = 6;
</script>

<ChromeDinoWidget 
  resetFunction={() => speed = DEFAULT}
  contentToCopy={`(Runner.instance_ || Runner.getInstance()).setSpeed(${speed})`}
  resetId="speed-reset"
  copyId="btn-speed-clip"
>
  <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).<span class="code-function">setSpeed</span>(</span>
  <input type="number" id="speed-input" class="form-control form-control-sm w-auto" bind:value={speed} min="0" max="1000" aria-label="Speed value" />
  <span>)</span>
</ChromeDinoWidget>
