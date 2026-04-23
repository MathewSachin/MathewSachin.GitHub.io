<script>
  import { buildCronExpression, ordinal, pad, DOW_NAMES } from '@scripts/tools/cron.js';

  let freq = 'day';
  let minute = 0;
  let hour = 0;
  let dom = 1;
  let dow = 0;

  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const doms = Array.from({ length: 31 }, (_, i) => i + 1);

  let expr = '';
  let desc = '';
  let fields = [];
  let copied = false;

  // derive expression, description and fields reactively from inputs
  $: {
    const result = buildCronExpression(freq, String(minute), String(hour), String(dow), String(dom));
    expr = result.expr;
    desc = result.desc;

    if (freq === 'minute') {
      fields = [['Minute','*','Every minute'],['Hour','*','Every hour'],['Day (month)','*','Every day'],['Month','*','Every month'],['Day (week)','*','Every day']];
    } else if (freq === 'hour') {
      fields = [['Minute', String(minute), 'At minute ' + minute],['Hour','*','Every hour'],['Day (month)','*','Every day'],['Month','*','Every month'],['Day (week)','*','Every day']];
    } else if (freq === 'day') {
      fields = [['Minute', String(minute), 'At minute ' + minute],['Hour', String(hour), 'At ' + pad(String(hour)) + ':00 UTC'],['Day (month)','*','Every day'],['Month','*','Every month'],['Day (week)','*','Every day']];
    } else if (freq === 'week') {
      fields = [['Minute', String(minute), 'At minute ' + minute],['Hour', String(hour), 'At ' + pad(String(hour)) + ':00 UTC'],['Day (month)','*','Every day'],['Month','*','Every month'],['Day (week)', String(dow), 'On ' + DOW_NAMES[Number(dow)]]];
    } else { // month
      fields = [['Minute', String(minute), 'At minute ' + minute],['Hour', String(hour), 'At ' + pad(String(hour)) + ':00 UTC'],['Day (month)', String(dom), 'On the ' + ordinal(+dom)],['Month','*','Every month'],['Day (week)','*','Every day']];
    }
  }

  function copyExpr() {
    if (!expr) return;
    navigator.clipboard.writeText(expr).then(() => {
      copied = true;
      setTimeout(() => copied = false, 1200);
    }).catch(() => {
      // ignore
    });
  }
</script>

<div class="card google-anno-skip">
  <div class="card-body">

    <div class="row g-4">

      <!-- Controls -->
      <div class="col-12 col-md-5">
        <h5 class="mb-3">Configure</h5>

        <div class="mb-3">
          <label class="form-label" for="freq-select">Frequency</label>
          <select class="form-select" id="freq-select" bind:value={freq}>
            <option value="minute">Every Minute</option>
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        {#if freq !== 'minute'}
        <div class="mb-3" id="row-minute">
          <label class="form-label" for="sel-minute">At minute</label>
          <select class="form-select" id="sel-minute" bind:value={minute}>
            {#each minutes as m}
              <option value={m}>{m < 10 ? '0' + m : m}</option>
            {/each}
          </select>
        </div>
        {/if}

        {#if freq !== 'minute' && freq !== 'hour'}
        <div class="mb-3" id="row-hour">
          <label class="form-label" for="sel-hour">At hour (0–23, UTC)</label>
          <select class="form-select" id="sel-hour" bind:value={hour}>
            {#each hours as h}
              <option value={h}>{h < 10 ? '0' + h : h}</option>
            {/each}
          </select>
        </div>
        {/if}

        {#if freq === 'week'}
        <div class="mb-3" id="row-dow">
          <label class="form-label" for="sel-dow">On day of week</label>
          <select class="form-select" id="sel-dow" bind:value={dow}>
            {#each DOW_NAMES as name, idx}
              <option value={idx}>{name}</option>
            {/each}
          </select>
        </div>
        {/if}

        {#if freq === 'month'}
        <div class="mb-3" id="row-dom">
          <label class="form-label" for="sel-dom">On day of month</label>
          <select class="form-select" id="sel-dom" bind:value={dom}>
            {#each doms as d}
              <option value={d}>{d}</option>
            {/each}
          </select>
        </div>
        {/if}
      </div>

      <!-- Result -->
      <div class="col-12 col-md-7">
        <h5 class="mb-3">Expression</h5>

        <div id="result-area">
          <div class="mb-3">
            <p class="form-label fw-semibold">CRON Expression</p>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <code id="cron-expr" class="fs-5">{expr}</code>
              <button class="btn btn-sm btn-outline-secondary" id="copy-cron-btn" title="Copy expression" on:click={copyExpr}>
                {#if copied}
                  <i class="fas fa-check"></i>
                {:else}
                  <i class="fas fa-copy"></i>
                {/if}
              </button>
            </div>
          </div>

          <div class="mb-3">
            <p class="form-label fw-semibold">Human Readable</p>
            <p id="cron-desc" class="mb-0 text-muted">{desc}</p>
          </div>

          <hr>
          <h6 class="mb-2">Field Reference</h6>
          <table class="table table-sm table-bordered">
            <thead class="table-light">
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody id="cron-table">
              {#each fields as f}
                <tr>
                  <td>{f[0]}</td>
                  <td><code>{f[1]}</code></td>
                  <td>{f[2]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</div>
