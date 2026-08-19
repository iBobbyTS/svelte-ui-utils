<script lang="ts" generics="Item extends SortableTableItem">
  import type { Snippet } from 'svelte';
  import SortableTable from './SortableTable.svelte';
  import type {
    SortableTableItem,
    SortableTableReorderDetail,
    SortableTableRowColorPreset
  } from './types.js';

  let {
    items = [],
    getId = (item: Item) => item.id,
    disabled = false,
    allowRemoveLast = false,
    tableClass = '',
    showCurrentControl = true,
    currentId = null,
    getCurrentDisabled = () => false,
    getCurrentLabel = (item: Item) => `Set ${getId(item)} as current`,
    getRowColorPreset = () => null,
    getDragLabel,
    getRemoveLabel,
    onReorder,
    onRemove,
    onCurrentChange,
    header,
    children
  }: {
    items?: Item[];
    getId?: (item: Item) => string;
    disabled?: boolean;
    allowRemoveLast?: boolean;
    tableClass?: string;
    showCurrentControl?: boolean;
    currentId?: string | null;
    getCurrentDisabled?: (item: Item, index: number) => boolean;
    getCurrentLabel?: (item: Item, index: number) => string;
    getRowColorPreset?: (item: Item, index: number) => SortableTableRowColorPreset | undefined | null;
    getDragLabel?: (item: Item, index: number) => string;
    getRemoveLabel?: (item: Item, index: number) => string;
    onReorder?: (items: Item[], detail: SortableTableReorderDetail) => void;
    onRemove?: (item: Item) => void;
    onCurrentChange?: (item: Item) => void | Promise<void>;
    header: Snippet;
    children: Snippet<[Item, number]>;
  } = $props();

  const instanceId = $props.id();
  const radioName = `suu-sortable-table-current-${instanceId}`;

  function rowClass(item: Item, index: number): string | undefined {
    const preset = getRowColorPreset(item, index);
    return preset ? `suu-sortable-table-enhanced__row--${preset}` : undefined;
  }

  function selectCurrent(item: Item): void {
    void onCurrentChange?.(item);
  }
</script>

{#snippet currentControl(item: Item, index: number)}
  <input
    type="radio"
    class="suu-sortable-table-enhanced__current"
    name={radioName}
    value={getId(item)}
    checked={currentId === getId(item)}
    disabled={disabled || !onCurrentChange || getCurrentDisabled(item, index)}
    aria-label={getCurrentLabel(item, index)}
    onchange={() => selectCurrent(item)}
  />
{/snippet}

<SortableTable
  {items}
  {getId}
  {disabled}
  {allowRemoveLast}
  tableClass={`suu-sortable-table-enhanced ${tableClass}`.trim()}
  getRowClass={rowClass}
  {getDragLabel}
  {getRemoveLabel}
  {onReorder}
  {onRemove}
  dragAccessory={showCurrentControl ? currentControl : undefined}
  {header}
  {children}
/>

<style>
  :global(.suu-sortable-table-enhanced .suu-sortable-table__drag-column),
  :global(.suu-sortable-table-enhanced .suu-sortable-table__drag-cell) {
    width: 68px;
  }
  :global(.suu-sortable-table-enhanced .suu-sortable-table__drag-cell) {
    white-space: nowrap;
  }
  .suu-sortable-table-enhanced__current {
    width: 16px;
    height: 16px;
    margin: 0 0 0 6px;
    accent-color: var(--suu-color-accent, #2563eb);
    vertical-align: middle;
    cursor: pointer;
  }
  .suu-sortable-table-enhanced__current:disabled {
    cursor: default;
    opacity: .45;
  }
  :global(.suu-sortable-table-enhanced__row--red > td) {
    background-color: var(--suu-sortable-table-row-red-light, rgba(207, 34, 46, .08));
  }
  :global(.suu-sortable-table-enhanced__row--yellow > td) {
    background-color: var(--suu-sortable-table-row-yellow-light, rgba(191, 135, 0, .09));
  }
  :global(.suu-sortable-table-enhanced__row--green > td) {
    background-color: var(--suu-sortable-table-row-green-light, rgba(26, 127, 55, .08));
  }
  @media (prefers-color-scheme: dark) {
    :global(.suu-sortable-table-enhanced__row--red > td) {
      background-color: var(--suu-sortable-table-row-red-dark, var(--suu-sortable-table-row-red-light, rgba(239, 68, 68, .14)));
    }
    :global(.suu-sortable-table-enhanced__row--yellow > td) {
      background-color: var(--suu-sortable-table-row-yellow-dark, var(--suu-sortable-table-row-yellow-light, rgba(245, 158, 11, .14)));
    }
    :global(.suu-sortable-table-enhanced__row--green > td) {
      background-color: var(--suu-sortable-table-row-green-dark, var(--suu-sortable-table-row-green-light, rgba(34, 197, 94, .13)));
    }
  }
</style>
