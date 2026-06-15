<script lang="ts">
  import { onMount } from 'svelte';
  import { getAriaSort, getCellValue, toggleSort } from './state.js';
  import type {
    DataTableCellValue,
    DataTableColumn,
    DataTableLayout,
    DataTableRowAttributes,
    DataTableRowKey,
    DataTableSortChangeHandler,
    SortState
  } from './types.js';

  export let rows: unknown[] = [];
  export let columns: DataTableColumn[] = [];
  export let sort: SortState | null = null;
  export let zebra = true;
  export let bordered = true;
  export let verticalSeparators = false;
  export let tableLayout: DataTableLayout = 'auto';
  export let stickyHeader = true;
  export let stickyHeaderTop: string | undefined = undefined;
  export let preserveScrollOnSort = true;
  export let emptyText = 'No records';
  export let rowKey: DataTableRowKey | undefined = undefined;
  export let rowClass: string | ((row: unknown, index: number) => string | undefined | null) | undefined = undefined;
  export let rowAttributes: DataTableRowAttributes | undefined = undefined;
  export let onSortChange: DataTableSortChangeHandler | undefined = undefined;

  let scrollRestoreSequence = 0;
  let tableElement: HTMLTableElement | undefined = undefined;
  let stickyHeaderVisible = false;
  let stickyHeaderLeft = 0;
  let stickyHeaderWidth = 0;
  let stickyHeaderColumnWidths: number[] = [];
  let stickyHeaderUpdateFrame: number | null = null;

  function restoreScrollPosition(scrollX: number, scrollY: number, sequence: number) {
    if (!preserveScrollOnSort || typeof window === 'undefined' || sequence !== scrollRestoreSequence) {
      return;
    }

    window.scrollTo(scrollX, scrollY);
  }

  function queueScrollRestore(scrollX: number, scrollY: number, sequence: number) {
    if (!preserveScrollOnSort || typeof window === 'undefined') {
      return;
    }

    const restore = () => restoreScrollPosition(scrollX, scrollY, sequence);
    restore();
    window.requestAnimationFrame?.(restore);
    setTimeout(restore, 0);
    setTimeout(restore, 50);
  }

  function updateStickyHeader() {
    if (!stickyHeader || typeof window === 'undefined' || !tableElement) {
      stickyHeaderVisible = false;
      return;
    }

    const header = tableElement.tHead;
    const firstHeaderCell = header?.querySelector('th');
    if (!header || !firstHeaderCell) {
      stickyHeaderVisible = false;
      return;
    }

    const tableRect = tableElement.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const stickyTop = Number.parseFloat(window.getComputedStyle(firstHeaderCell).top) || 0;
    const nextVisible = tableRect.top < stickyTop && tableRect.bottom > stickyTop + headerRect.height;
    stickyHeaderVisible = nextVisible;

    if (!nextVisible) {
      return;
    }

    stickyHeaderLeft = tableRect.left;
    stickyHeaderWidth = tableRect.width;
    stickyHeaderColumnWidths = Array.from(header.querySelectorAll('th')).map((cell) => cell.getBoundingClientRect().width);
  }

  function queueStickyHeaderUpdate() {
    if (typeof window === 'undefined') {
      return;
    }

    if (stickyHeaderUpdateFrame !== null) {
      window.cancelAnimationFrame(stickyHeaderUpdateFrame);
    }

    stickyHeaderUpdateFrame = window.requestAnimationFrame(() => {
      stickyHeaderUpdateFrame = null;
      updateStickyHeader();
    });
  }

  async function handleSort(column: DataTableColumn) {
    if (!column.sortable) {
      return;
    }

    const shouldPreserveScroll = preserveScrollOnSort && typeof window !== 'undefined';
    const scrollX = shouldPreserveScroll ? window.scrollX : 0;
    const scrollY = shouldPreserveScroll ? window.scrollY : 0;
    const sequence = shouldPreserveScroll ? scrollRestoreSequence + 1 : scrollRestoreSequence;
    scrollRestoreSequence = sequence;

    const sortResult = onSortChange?.(toggleSort(sort, column.key));
    if (!shouldPreserveScroll) {
      return;
    }

    queueScrollRestore(scrollX, scrollY, sequence);
    try {
      await sortResult;
    } finally {
      queueScrollRestore(scrollX, scrollY, sequence);
    }
  }

  function resolveRowKey(row: unknown, index: number) {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }

    if (rowKey && row && typeof row === 'object' && rowKey in row) {
      return (row as Record<string, unknown>)[rowKey] as string | number;
    }

    return index;
  }

  function resolveRowClass(row: unknown, index: number) {
    if (typeof rowClass === 'function') {
      return rowClass(row, index) ?? '';
    }

    return rowClass ?? '';
  }

  function resolveRowAttributes(row: unknown, index: number) {
    return rowAttributes?.(row, index) ?? {};
  }

  function resolveCellClass(column: DataTableColumn, row: unknown, value: DataTableCellValue) {
    if (typeof column.class === 'function') {
      return column.class(row, value, column) ?? '';
    }

    return column.class ?? '';
  }

  onMount(() => {
    const update = () => queueStickyHeaderUpdate();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;

    if (tableElement) {
      observer?.observe(tableElement);
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    queueStickyHeaderUpdate();

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
      if (stickyHeaderUpdateFrame !== null) {
        window.cancelAnimationFrame(stickyHeaderUpdateFrame);
      }
    };
  });

  $: {
    rows;
    columns;
    sort;
    stickyHeader;
    queueStickyHeaderUpdate();
  }
</script>

<div class:suu-table-wrap--borderless={!bordered} class="suu-table-wrap" style:--suu-table-sticky-top={stickyHeaderTop}>
  {#if stickyHeaderVisible}
    <div
      class="suu-table__sticky-clone"
      style:left={`${stickyHeaderLeft}px`}
      style:width={`${stickyHeaderWidth}px`}
      aria-hidden="true"
    >
      <table
        class:suu-table--layout-auto={tableLayout === 'auto'}
        class:suu-table--layout-fixed={tableLayout === 'fixed'}
        class:suu-table--sticky-header={stickyHeader}
        class:suu-table--zebra={zebra}
        class:suu-table--vertical-separators={verticalSeparators}
        class="suu-table"
      >
        <thead>
          <tr>
            {#each columns as column, columnIndex (column.key)}
              <th
                class={column.headerClass}
                aria-sort={column.sortable ? getAriaSort(sort, column.key) : undefined}
                data-align={column.align ?? 'left'}
                scope="col"
                style:width={stickyHeaderColumnWidths[columnIndex] ? `${stickyHeaderColumnWidths[columnIndex]}px` : undefined}
                style:min-width={stickyHeaderColumnWidths[columnIndex] ? `${stickyHeaderColumnWidths[columnIndex]}px` : undefined}
                style:max-width={stickyHeaderColumnWidths[columnIndex] ? `${stickyHeaderColumnWidths[columnIndex]}px` : undefined}
              >
                {#if column.sortable}
                  <button class="suu-table__sort-button" type="button" on:click={() => handleSort(column)}>
                    <span><slot name="header" {column} {sort}>{column.header}</slot></span>
                    <span class="suu-table__sort-indicator" aria-hidden="true">
                      {#if sort?.key === column.key && sort.direction === 'asc'}
                        <svg class="suu-table__sort-icon suu-table__sort-icon--asc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M5 9.5 8 6.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                        </svg>
                      {:else if sort?.key === column.key}
                        <svg class="suu-table__sort-icon suu-table__sort-icon--desc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="m5 6.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                        </svg>
                      {:else}
                        <svg class="suu-table__sort-icon suu-table__sort-icon--both" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M5 6.5 8 3.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                          <path d="m5 9.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                        </svg>
                      {/if}
                    </span>
                  </button>
                {:else}
                  <slot name="header" {column} {sort}>{column.header}</slot>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
      </table>
    </div>
  {/if}

  <table
    bind:this={tableElement}
    class:suu-table--layout-auto={tableLayout === 'auto'}
    class:suu-table--layout-fixed={tableLayout === 'fixed'}
    class:suu-table--sticky-header={stickyHeader}
    class:suu-table--zebra={zebra}
    class:suu-table--vertical-separators={verticalSeparators}
    class="suu-table"
  >
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th
            class={column.headerClass}
            aria-sort={column.sortable ? getAriaSort(sort, column.key) : undefined}
            data-align={column.align ?? 'left'}
            scope="col"
          >
            {#if column.sortable}
              <button class="suu-table__sort-button" type="button" on:click={() => handleSort(column)}>
                <span><slot name="header" {column} {sort}>{column.header}</slot></span>
                <span class="suu-table__sort-indicator" aria-hidden="true">
                  {#if sort?.key === column.key && sort.direction === 'asc'}
                    <svg class="suu-table__sort-icon suu-table__sort-icon--asc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <path d="M5 9.5 8 6.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                    </svg>
                  {:else if sort?.key === column.key}
                    <svg class="suu-table__sort-icon suu-table__sort-icon--desc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <path d="m5 6.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                    </svg>
                  {:else}
                    <svg class="suu-table__sort-icon suu-table__sort-icon--both" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <path d="M5 6.5 8 3.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                      <path d="m5 9.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                    </svg>
                  {/if}
                </span>
              </button>
            {:else}
              <slot name="header" {column} {sort}>{column.header}</slot>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if rows.length > 0}
        {#each rows as row, rowIndex (resolveRowKey(row, rowIndex))}
          <tr {...resolveRowAttributes(row, rowIndex)} class={resolveRowClass(row, rowIndex)}>
            {#each columns as column (column.key)}
              {@const value = getCellValue(row, column)}
              <td class={resolveCellClass(column, row, value)} data-align={column.align ?? 'left'} data-nowrap={column.nowrap === false ? 'false' : 'true'}>
                <slot name="cell" {row} {column} {value}>{value as string}</slot>
              </td>
            {/each}
          </tr>
        {/each}
      {:else}
        <tr>
          <td class="suu-table__empty" colspan={Math.max(1, columns.length)}>{emptyText}</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
