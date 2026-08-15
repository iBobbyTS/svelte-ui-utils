<script lang="ts" generics="Item extends SortableTableItem">
  import type { Snippet } from 'svelte';
  import type { SortableListDropPosition } from '../sortable-list/types.js';
  import type { SortableTableItem, SortableTableReorderDetail } from './types.js';

  let {
    items = [],
    getId = (item: Item) => item.id,
    disabled = false,
    allowRemoveLast = false,
    tableClass = '',
    onReorder,
    onRemove,
    header,
    children
  }: {
    items?: Item[];
    getId?: (item: Item) => string;
    disabled?: boolean;
    allowRemoveLast?: boolean;
    tableClass?: string;
    onReorder?: (items: Item[], detail: SortableTableReorderDetail) => void;
    onRemove?: (item: Item) => void;
    header: Snippet;
    children: Snippet<[Item, number]>;
  } = $props();

  let draggingId = $state<string | null>(null);
  let indicator = $state<{ id: string; position: SortableListDropPosition } | null>(null);

  function finishDrag(): void { draggingId = null; indicator = null; }
  function startDrag(event: DragEvent, id: string): void {
    if (disabled) { event.preventDefault(); return; }
    draggingId = id;
    indicator = null;
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }
  }
  function position(event: DragEvent): SortableListDropPosition {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
  }
  function dragOver(event: DragEvent, id: string): void {
    if (disabled || !draggingId || draggingId === id) return;
    event.preventDefault();
    indicator = { id, position: position(event) };
  }
  function drop(event: DragEvent, targetId: string): void {
    event.preventDefault();
    const sourceId = draggingId;
    const targetPosition = indicator?.id === targetId ? indicator.position : position(event);
    finishDrag();
    if (!sourceId || sourceId === targetId || disabled) return;
    const sourceIndex = items.findIndex((item) => getId(item) === sourceId);
    if (sourceIndex < 0) return;
    const next = [...items];
    const [source] = next.splice(sourceIndex, 1);
    if (!source) return;
    const targetIndex = next.findIndex((item) => getId(item) === targetId);
    if (targetIndex < 0) return;
    next.splice(targetIndex + (targetPosition === 'after' ? 1 : 0), 0, source);
    void onReorder?.(next, { sourceId, targetId, position: targetPosition });
  }
  function rowClass(item: Item): string {
    return ['suu-sortable-table__row', draggingId === getId(item) ? 'suu-sortable-table__row--dragging' : '', indicator?.id === getId(item) ? `suu-sortable-table__row--drop-${indicator.position}` : ''].filter(Boolean).join(' ');
  }
</script>

<table class={`suu-sortable-table ${tableClass}`.trim()}>
  <thead><tr><th class="suu-sortable-table__drag-column" aria-hidden="true"></th>{@render header()}<th class="suu-sortable-table__remove-column" aria-hidden="true"></th></tr></thead>
  <tbody>
    {#each items as item, index (getId(item))}
      {@const id = getId(item)}
      <tr class={rowClass(item)} data-sortable-id={id} ondragover={(event) => dragOver(event, id)} ondrop={(event) => drop(event, id)}>
        <td class="suu-sortable-table__drag-cell">
          <button type="button" class="suu-sortable-table__drag-handle" disabled={disabled} draggable={!disabled} aria-label={`Drag ${id}`} title={`Drag ${id}`} ondragstart={(event) => startDrag(event, id)} ondragend={finishDrag}>⋮⋮</button>
        </td>
        {@render children(item, index)}
        <td class="suu-sortable-table__remove-cell">
          {#if onRemove}
            <button type="button" class="suu-sortable-table__remove" disabled={disabled || (!allowRemoveLast && items.length === 1)} aria-label={`Remove ${id}`} title={`Remove ${id}`} onclick={() => onRemove?.(item)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 21V8h12v13H6Z" fill="currentColor"/></svg>
            </button>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .suu-sortable-table { width: 100%; border-collapse: collapse; }
  .suu-sortable-table__drag-column, .suu-sortable-table__remove-column { width: 38px; }
  .suu-sortable-table__drag-cell, .suu-sortable-table__remove-cell { width: 38px; padding: 6px; text-align: center; vertical-align: middle; }
  .suu-sortable-table__drag-handle, .suu-sortable-table__remove { display: inline-grid; place-items: center; border: 0; background: transparent; cursor: grab; color: var(--suu-color-text-dim, #6b7280); padding: 4px; font: inherit; }
  .suu-sortable-table__remove { width: 30px; height: 30px; cursor: pointer; color: var(--suu-color-danger, #dc2626); }
  .suu-sortable-table__remove svg { width: 16px; height: 16px; }
  .suu-sortable-table__drag-handle:active { cursor: grabbing; }
  .suu-sortable-table__drag-handle:disabled, .suu-sortable-table__remove:disabled { cursor: default; opacity: .35; }
  .suu-sortable-table__row { position: relative; border-bottom: 1px solid var(--suu-color-border, #d1d5db); }
  .suu-sortable-table :global(td) { border-bottom: 0; }
  .suu-sortable-table__row--dragging { opacity: .55; }
  .suu-sortable-table__row--drop-before::before, .suu-sortable-table__row--drop-after::after { position: absolute; right: 0; left: 0; z-index: 2; height: 3px; border-radius: 999px; background: var(--suu-color-accent, #2563eb); content: ''; pointer-events: none; }
  .suu-sortable-table__row--drop-before::before { top: -3px; }
  .suu-sortable-table__row--drop-after::after { bottom: -3px; }
</style>
