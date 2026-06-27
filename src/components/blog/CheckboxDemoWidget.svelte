<script lang="ts">
  const items = [
    "Buy groceries",
    "Reply to emails",
    "Schedule dentist appointment",
    "Pay electricity bill",
    "Water the plants",
    "Call mom",
    "Read 20 pages",
    "Go for a walk",
    "Backup laptop files",
    "Review pull requests",
    "Clean the desk",
    "Renew gym membership",
    "Update resume",
    "Book flight tickets",
    "Fix the leaking tap",
    "Return library books",
    "Cancel unused subscriptions",
    "Prepare presentation slides",
    "Run dishwasher",
    "Charge all devices",
    "Submit expense report",
    "Organise downloads folder",
    "Write weekly review",
    "Check tyre pressure",
    "Order birthday gift",
    "Take out the trash",
    "Set up 2FA on accounts",
  ];

  let checked: boolean[] = $state(items.map(() => false));

  const allChecked = $derived(checked.every(Boolean));
  const noneChecked = $derived(checked.every((c) => !c));

  function selectAll() {
    checked = items.map(() => true);
  }

  function clearAll() {
    checked = items.map(() => false);
  }
</script>

<div class="card shadow-sm my-4">
  <div class="card-header fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
    <span>✅ Todo List Demo — {checked.filter(Boolean).length} / {items.length} checked</span>
    <div class="d-flex gap-2">
      <button class="btn btn-sm btn-primary" onclick={selectAll} disabled={allChecked}>
        Select All
      </button>
      <button class="btn btn-sm btn-outline-secondary" onclick={clearAll} disabled={noneChecked}>
        Clear All
      </button>
    </div>
  </div>
  <ul class="list-group list-group-flush">
    {#each items as item, i}
      <li class="list-group-item">
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id={`demo-cb-${i}`}
            bind:checked={checked[i]}
          />
          <label class="form-check-label" for={`demo-cb-${i}`}>
            {item}
          </label>
        </div>
      </li>
    {/each}
  </ul>
</div>
