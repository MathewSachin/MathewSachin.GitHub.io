<script lang="ts">
  export let value: unknown;
  export let depth: number = 0;

  let collapsed = false;

  function toggle() { collapsed = !collapsed; }
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  }

  $: isObj = value !== null && typeof value === 'object' && !Array.isArray(value);
  $: isArr = Array.isArray(value);
  $: entries = isObj
    ? Object.entries(value as Record<string, unknown>)
    : isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : [];
  $: count = entries.length;
  $: openBrace = isArr ? '[' : '{';
  $: closeBrace = isArr ? ']' : '}';
</script>

{#if isObj || isArr}
  <button class="json-toggle" on:click={toggle} on:keydown={handleKeydown} aria-label={collapsed ? 'expand' : 'collapse'}>
    {collapsed ? '▶' : '▼'}
  </button>
  <span class="json-brace">{openBrace}</span>
  {#if collapsed}
    <button class="json-ellipsis" on:click={toggle} aria-label="expand">
      {count} {isArr ? 'item' : 'key'}{count !== 1 ? 's' : ''}
    </button>
    <span class="json-brace">{closeBrace}</span>
  {:else}
    <div class="json-children">
      {#each entries as [key, val], i}
        <div class="json-entry">
          {#if isObj}
            <span class="json-key">"{key}"</span><span class="json-punct">: </span>
          {/if}
          <svelte:self value={val} depth={depth + 1} />{#if i < count - 1}<span class="json-punct">,</span>{/if}
        </div>
      {/each}
    </div>
    <span class="json-brace">{closeBrace}</span>
  {/if}
{:else if typeof value === 'string'}
  <span class="json-string">"{value}"</span>
{:else if value === null}
  <span class="json-null">null</span>
{:else}
  <span class="json-literal">{String(value)}</span>
{/if}

<style>
  .json-children {
    padding-left: 1.5em;
  }
  .json-toggle {
    cursor: pointer;
    user-select: none;
    font-size: 0.6em;
    margin-right: 0.3em;
    vertical-align: middle;
    background: none;
    border: none;
    padding: 0 0.2em;
    color: var(--bs-secondary-color, #adb5bd);
    line-height: 1;
  }
  .json-toggle:hover {
    color: var(--bs-body-color);
  }
  .json-brace {
    color: var(--bs-body-color);
  }
  .json-key {
    color: #9cdcfe;
  }
  .json-string {
    color: #ce9178;
  }
  .json-literal {
    color: #b5cea8;
  }
  .json-null {
    color: #569cd6;
  }
  .json-ellipsis {
    cursor: pointer;
    color: var(--bs-secondary-color, #adb5bd);
    font-style: italic;
    margin: 0 0.25em;
    font-size: 0.85em;
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline dotted;
  }
  .json-ellipsis:hover {
    color: var(--bs-body-color);
  }
  .json-punct {
    color: var(--bs-body-color);
  }
</style>
