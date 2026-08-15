<script lang="ts">
  import SortableTable from '../../src/lib/sortable-table/SortableTable.svelte';
  import type { SortableTableReorderDetail } from '../../src/lib/sortable-table/types.js';

  export let items: Array<{ id: string; label: string }> = [];
  export let onReorder: ((items: Array<{ id: string; label: string }>, detail: SortableTableReorderDetail) => void) | undefined;

  function update(next: Array<{ id: string; label: string }>, detail: SortableTableReorderDetail): void {
    items = next;
    onReorder?.(next, detail);
  }
</script>

<SortableTable {items} onReorder={update}>
  {#snippet header()}<th>Label</th>{/snippet}
  {#snippet children(item)}<td>{item.label}</td>{/snippet}
</SortableTable>
