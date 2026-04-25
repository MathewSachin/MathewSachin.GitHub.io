<script lang="ts">
import ChromeDinoWidget from "@components/blog/ChromeDinoWidget.svelte";

let jump = 10;
const DEFAULT = 10;
</script>

<ChromeDinoWidget 
  resetFunction={() => jump = DEFAULT}
  contentToCopy={`(Runner.instance_ || Runner.getInstance()).tRex.setJumpVelocity(${jump})`}
  resetId="jump-reset"
  copyId="btn-jump-clip"
>
  <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).tRex.<span class="code-function">setJumpVelocity</span>(</span>
  <input type="number" id="jump-input"class="form-control form-control-sm w-auto" bind:value={jump} min="0" max="50" aria-label="Jump velocity value" />
  <span>)</span>
</ChromeDinoWidget>
