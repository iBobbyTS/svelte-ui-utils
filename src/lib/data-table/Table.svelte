<script lang="ts">
  import { getAriaSort, getCellValue, toggleSort } from './state.js';
  import type { DataTableColumn, SortState } from './types.js';

  export let rows: Record<string, unknown>[] = [];
  export let columns: DataTableColumn<Record<string, unknown>>[] = [];
  export let sort: SortState | null = null;
  export let zebra = true;
  export let emptyText = 'No records';
  export let onSortChange: ((sort: SortState) => void) | undefined = undefined;

  function handleSort(column: DataTableColumn<Record<string, unknown>>) {
    if (!column.sortable) {
      return;
    }

    onSortChange?.(toggleSort(sort, column.key));
  }
</script>

<div class="suu-table-wrap">
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
                <span>{column.header}</span>
                <span class="suu-table__sort-indicator" aria-hidden="true">
                  {#if sort?.key === column.key}
                    {sort.direction === 'asc' ? '▲' : '▼'}
                  {:else}
                    ↕
                  {/if}
                </span>
              </button>
            {:else}
              {column.header}
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if rows.length > 0}
        {#each rows as row}
          <tr>
            {#each columns as column (column.key)}
              {@const value = getCellValue(row, column)}
              <td class={column.class} data-align={column.align ?? 'left'}>
                <slot name="cell" {row} {column} {value}>{value}</slot>
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
