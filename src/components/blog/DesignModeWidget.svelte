<script lang="ts">
let enabled = false;

function toggle() {
  enabled = !enabled;
  document.designMode = enabled ? 'on' : 'off';
}
</script>

<div class="text-center my-3">
  <button
    class={enabled ? 'btn btn-warning' : 'btn btn-info'}
    on:click={toggle}
  >
    {enabled ? '✋ Disable Edit Mode' : '✏️ Enable Edit Mode'}
  </button>
</div>
<p class="text-center text-muted" style="font-size:0.9em;">Click the button above, then click any text on this page and start typing!</p>
