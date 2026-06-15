<script lang="ts">
  import { getAriaSort, getCellValue, toggleSort } from './state.js';
  import type { DataTableCellValue, DataTableColumn, DataTableRowAttributes, DataTableRowKey, SortState } from './types.js';

  export let rows: unknown[] = [];
  export let columns: DataTableColumn[] = [];
  export let sort: SortState | null = null;
  export let zebra = true;
  export let bordered = true;
  export let emptyText = 'No records';
  export let rowKey: DataTableRowKey | undefined = undefined;
  export let rowClass: string | ((row: unknown, index: number) => string | undefined | null) | undefined = undefined;
  export let rowAttributes: DataTableRowAttributes | undefined = undefined;
  export let onSortChange: ((sort: SortState) => void) | undefined = undefined;

  function handleSort(column: DataTableColumn) {
    if (!column.sortable) {
      return;
    }

    onSortChange?.(toggleSort(sort, column.key));
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
</script>

<div class:suu-table-wrap--borderless={!bordered} class="suu-table-wrap">
  <table class:suu-table--zebra={zebra} class="suu-table">
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
                  {#if sort?.key === column.key}
                    {sort.direction === 'asc' ? '▲' : '▼'}
                  {:else}
                    ↕
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
