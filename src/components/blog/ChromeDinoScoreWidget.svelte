<script lang="ts">
import ChromeDinoWidget from "@components/blog/ChromeDinoWidget.svelte";

let score = 12345;
const DEFAULT = 12345;
</script>

<ChromeDinoWidget 
  resetFunction={() => score = DEFAULT}
  contentToCopy={`(Runner.instance_ || Runner.getInstance()).distanceRan = ${score} / 0.025`}
  resetId="score-reset"
  copyId="btn-score-clip"
>
  <span>(Runner.instance_ <span class="code-symbol">||</span> Runner.<span class="code-function">getInstance</span>()).distanceRan <span class="code-symbol">=</span> </span>
  <input type="number" id="score-input" class="form-control form-control-sm dino-hack-num" bind:value={score} min="0" max="99999" aria-label="Score value" style="width:110px" />
  <span> <span class="code-symbol">/</span> <span class="code-number">0.025</span></span>
</ChromeDinoWidget>
