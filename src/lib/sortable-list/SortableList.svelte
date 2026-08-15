<script lang="ts" generics="Item extends SortableListItem">
  import type { Snippet } from 'svelte';
  import type {
    SortableListChildren,
    SortableListDropPosition,
    SortableListItem,
    SortableListItemClassGetter,
    SortableListReorderHandler
  } from './types.js';

  type DropIndicator = { targetId: string; position: SortableListDropPosition };

  let {
    items = [],
    getId = (item: Item) => item.id,
    disabled = false,
    listTag = 'div',
    itemTag = 'div',
    listClass = '',
    itemClass,
    listRole = 'list',
    itemRole = 'listitem',
    onReorder,
    children
  }: {
    items?: Item[];
    getId?: (item: Item) => string;
    disabled?: boolean;
    listTag?: string;
    itemTag?: string;
    listClass?: string;
    itemClass?: string | SortableListItemClassGetter<Item>;
    listRole?: string | undefined;
    itemRole?: string | undefined;
    onReorder?: SortableListReorderHandler<Item>;
    children: SortableListChildren<Item>;
  } = $props();

  let draggedId = $state<string | null>(null);
  let dropIndicator = $state<DropIndicator | null>(null);

  function finishDrag(): void {
    draggedId = null;
    dropIndicator = null;
  }

  function startDrag(event: DragEvent, id: string): void {
    if (disabled) {
      event.preventDefault();
      return;
    }
    draggedId = id;
    dropIndicator = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  }

  function dropPosition(event: DragEvent): SortableListDropPosition {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const pointerY = Number.isFinite(event.clientY) ? event.clientY : bounds.top;
    return pointerY < bounds.top + bounds.height / 2 ? 'before' : 'after';
  }

  function updateDropIndicator(event: DragEvent, targetId: string): void {
    if (disabled || !draggedId || draggedId === targetId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dropIndicator = { targetId, position: dropPosition(event) };
  }

  function updateListDropIndicator(event: DragEvent): void {
    if (disabled || event.target !== event.currentTarget || !draggedId || !items.length) return;
    const lastId = getId(items[items.length - 1]);
    if (draggedId === lastId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dropIndicator = { targetId: lastId, position: 'after' };
  }

  function reorder(sourceId: string, targetId: string, position: SortableListDropPosition): void {
    if (disabled || sourceId === targetId) return;
    const sourceIndex = items.findIndex((item) => getId(item) === sourceId);
    if (sourceIndex < 0 || !items.some((item) => getId(item) === targetId)) return;
    const next = [...items];
    const [source] = next.splice(sourceIndex, 1);
    if (!source) return;
    const targetIndex = next.findIndex((item) => getId(item) === targetId);
    next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, source);
    void onReorder?.(next, { sourceId, targetId, position });
  }

  function dropItem(event: DragEvent, targetId: string): void {
    event.preventDefault();
    const sourceId = draggedId;
    const position = dropIndicator?.targetId === targetId
      ? dropIndicator.position
      : dropPosition(event);
    finishDrag();
    if (sourceId) reorder(sourceId, targetId, position);
  }

  function itemClasses(item: Item, index: number): string {
    const custom = typeof itemClass === 'function' ? itemClass(item, index) : itemClass;
    return [
      'suu-sortable-list__item',
      custom,
      draggedId === getId(item) ? 'suu-sortable-list__item--dragging' : '',
      dropIndicator?.targetId === getId(item) && dropIndicator.position === 'before'
        ? 'suu-sortable-list__item--drop-before' : '',
      dropIndicator?.targetId === getId(item) && dropIndicator.position === 'after'
        ? 'suu-sortable-list__item--drop-after' : ''
    ].filter(Boolean).join(' ');
  }
</script>

<svelte:element
  this={listTag}
  class={`suu-sortable-list ${listClass}`.trim()}
  role={listRole}
  ondragover={updateListDropIndicator}
  ondrop={(event) => {
    if (event.target !== event.currentTarget || !items.length) return;
    dropItem(event, getId(items[items.length - 1]));
  }}
>
  {#each items as item, index (getId(item))}
    {@const id = getId(item)}
    {@const handleProps = {
      draggable: !disabled,
      ondragstart: (event: DragEvent) => startDrag(event, id),
      ondragend: finishDrag
    }}
    <svelte:element
      this={itemTag}
      class={itemClasses(item, index)}
      role={itemRole}
      data-sortable-id={id}
      ondragover={(event) => updateDropIndicator(event, id)}
      ondrop={(event) => dropItem(event, id)}
    >
      {@render children(item, index, handleProps)}
    </svelte:element>
  {/each}
</svelte:element>

<style>
  .suu-sortable-list { position: relative; }
  .suu-sortable-list__item { position: relative; }
  .suu-sortable-list__item--dragging { opacity: 0.55; }
  .suu-sortable-list__item--drop-before::before,
  .suu-sortable-list__item--drop-after::after {
    position: absolute;
    right: 0;
    left: 0;
    z-index: 2;
    height: 3px;
    border-radius: 999px;
    background: var(--suu-color-accent, #2563eb);
    box-shadow: 0 0 8px color-mix(in srgb, var(--suu-color-accent, #2563eb) 65%, transparent);
    content: '';
    pointer-events: none;
  }
  .suu-sortable-list__item--drop-before::before { top: -7px; }
  .suu-sortable-list__item--drop-after::after { bottom: -7px; }
</style>
