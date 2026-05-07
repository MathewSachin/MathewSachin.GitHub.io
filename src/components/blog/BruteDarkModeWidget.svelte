<script lang="ts">
function applyDark() {
  if (!document.getElementById('__brute-dark')) {
    const s = document.createElement('style');
    s.id = '__brute-dark';
    s.innerHTML = 'html { filter: invert(100%) hue-rotate(180deg) !important; } img, video, picture, canvas { filter: invert(100%) hue-rotate(180deg) !important; }';
    document.head.appendChild(s);
  }
}

function removeDark() {
  const el = document.getElementById('__brute-dark');
  if (el) el.remove();
}
</script>

<div class="my-3">
  <button class="btn btn-dark me-2" on:click={applyDark}>🌙 Dark Mode ON</button>
  <button class="btn btn-secondary" on:click={removeDark}>☀️ Dark Mode OFF</button>
</div>
