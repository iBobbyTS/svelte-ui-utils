<script lang="ts">
  import SortableTableEnhanced from '../../src/lib/sortable-table/SortableTableEnhanced.svelte';
  import type {
    SortableTableReorderDetail,
    SortableTableRowColorPreset
  } from '../../src/lib/sortable-table/types.js';

  type Row = { id: string; label: string; preset?: SortableTableRowColorPreset; currentDisabled?: boolean };

  export let items: Row[] = [];
  export let currentId: string | null = null;
  export let showCurrentControl = true;
  export let disabled = false;
  export let onReorder: ((items: Row[], detail: SortableTableReorderDetail) => void) | undefined = undefined;
  export let onRemove: ((item: Row) => void) | undefined = undefined;
  export let onCurrentChange: ((item: Row) => void | Promise<void>) | undefined = undefined;
  export let getDragLabel: ((item: Row, index: number) => string) | undefined = undefined;
  export let getRemoveLabel: ((item: Row, index: number) => string) | undefined = undefined;

  function update(next: Row[], detail: SortableTableReorderDetail): void {
    items = next;
    onReorder?.(next, detail);
  }
</script>

<SortableTableEnhanced
  {items}
  {currentId}
  {showCurrentControl}
  {disabled}
  onReorder={update}
  {onRemove}
  {onCurrentChange}
  getCurrentDisabled={(item) => item.currentDisabled === true}
  getCurrentLabel={(item) => `Set ${item.label} current`}
  getRowColorPreset={(item) => item.preset}
  {getDragLabel}
  {getRemoveLabel}
  allowRemoveLast={true}
>
  {#snippet header()}<th>Label</th>{/snippet}
  {#snippet children(item)}<td>{item.label}</td>{/snippet}
</SortableTableEnhanced>
