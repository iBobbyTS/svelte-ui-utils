<script lang="ts">
  import SortableList from '../../src/lib/sortable-list/SortableList.svelte';
  import type { SortableListReorderDetail } from '../../src/lib/sortable-list/types.js';

  export let items: Array<{ id: string; label: string }> = [];
  export let disabled = false;
  export let tableMarkup = false;
  export let onReorder: ((items: Array<{ id: string; label: string }>, detail: SortableListReorderDetail) => void) | undefined;

  function update(next: Array<{ id: string; label: string }>, detail: SortableListReorderDetail): void {
    items = next;
    onReorder?.(next, detail);
  }
</script>

{#if tableMarkup}
  <table>
    <SortableList {items} {disabled} listTag="tbody" itemTag="tr" listRole={undefined} itemRole={undefined} onReorder={update}>
      {#snippet children(item, _index, handle)}
        <td><button type="button" data-sortable-handle {...handle}>{item.label}</button></td>
      {/snippet}
    </SortableList>
  </table>
{:else}
  <SortableList {items} {disabled} onReorder={update}>
    {#snippet children(item, _index, handle)}
      <button type="button" data-sortable-handle {...handle}>{item.label}</button>
    {/snippet}
  </SortableList>
{/if}
