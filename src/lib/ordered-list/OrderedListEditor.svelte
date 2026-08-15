<script lang="ts">
  import type { Snippet } from 'svelte';

  export type OrderedListItem = { id: string; value?: string; current?: boolean; status?: string };

  let {
    items,
    disabled = false,
    compact = false,
    allowRemoveLast = false,
    renderId,
    onremove,
    oncurrent,
    currentLabel,
    removeLabel,
    children
  }: {
    items: OrderedListItem[];
    disabled?: boolean;
    compact?: boolean;
    allowRemoveLast?: boolean;
    renderId?: string;
    onremove?: (id: string) => void;
    oncurrent?: (id: string) => void;
    currentLabel?: (item: OrderedListItem) => string;
    removeLabel?: (item: OrderedListItem) => string;
    children?: Snippet<[OrderedListItem, number]>;
  } = $props();
</script>

<div class:compact class="suu-ordered-list-editor">
  {#each items as item, index}
    {#if renderId === undefined || renderId === item.id}
      <div class="suu-ordered-list-editor__row" data-ordered-id={item.id}>
        {#if children}{@render children(item, index)}{/if}
        {#if oncurrent}
          <button type="button" class="suu-ordered-list-editor__current" disabled={disabled || item.current} aria-label={currentLabel?.(item) ?? `Select ${item.id}`} onclick={() => oncurrent?.(item.id)}>{item.current ? 'Current' : 'Select'}</button>
        {/if}
        {#if onremove}
          <button type="button" class="suu-ordered-list-editor__remove" disabled={disabled || (!allowRemoveLast && items.length === 1)} aria-label={removeLabel?.(item) ?? `Remove ${item.id}`} title={removeLabel?.(item) ?? `Remove ${item.id}`} onclick={() => onremove?.(item.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 21V8h12v13H6Z" fill="currentColor"/></svg>
          </button>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .suu-ordered-list-editor { display: grid; gap: 5px; }
  .suu-ordered-list-editor__row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .suu-ordered-list-editor__row :global(input) { min-width: 0; flex: 1; }
  .suu-ordered-list-editor__row :global(label) { display: flex; align-items: center; gap: 4px; white-space: nowrap; font-size: 11px; }
  .suu-ordered-list-editor__row :global(label input) { flex: 0; }
  .compact .suu-ordered-list-editor__row { gap: 3px; }
  .suu-ordered-list-editor__current { margin-left: auto; }
  .suu-ordered-list-editor__remove { display: inline-grid; place-items: center; width: 30px; height: 30px; padding: 6px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: #dc2626; cursor: pointer; }
  .suu-ordered-list-editor__remove svg { width: 16px; height: 16px; }
  .suu-ordered-list-editor__remove:disabled { cursor: default; opacity: .35; }
</style>
