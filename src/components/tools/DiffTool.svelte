<script>
  import { createTwoFilesPatch } from 'diff';
  import * as Diff2Html from 'diff2html';
  import 'diff2html/bundles/css/diff2html.min.css';

  let left = '';
  let right = '';
  let outputHtml = '';

  function computeDiff() {
    const patch = createTwoFilesPatch('A', 'B', left || '', right || '', '', '');
    outputHtml = Diff2Html.html(patch, {
      inputFormat: 'diff',
      showFiles: true,
      matching: 'lines',
      outputFormat: 'side-by-side'
    });
  }

  function clearAll() {
    left = '';
    right = '';
    outputHtml = '';
  }
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-4">

      <div class="col-12 col-md-6">
        <h5 class="mb-3">Payload A</h5>
        <textarea class="form-control font-monospace" rows="12" bind:value={left} placeholder="Paste payload A here"></textarea>
      </div>

      <div class="col-12 col-md-6">
        <h5 class="mb-3">Payload B</h5>
        <textarea class="form-control font-monospace" rows="12" bind:value={right} placeholder="Paste payload B here"></textarea>
      </div>

    </div>

    <div class="mt-3 d-flex gap-2">
      <button class="btn btn-primary" on:click={computeDiff}>Compare</button>
      <button class="btn btn-outline-secondary" on:click={clearAll}>Clear</button>
    </div>

    {#if outputHtml}
      <div class="mt-3">
        {@html outputHtml}
      </div>
    {/if}

  </div>
</div>

