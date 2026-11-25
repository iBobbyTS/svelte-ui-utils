<svelte:options runes={false} />

<script lang="ts">
  import DataTable from '../../src/lib/data-table/DataTable.svelte';
  import type { DataTableColumn } from '../../src/lib/data-table/types.js';

  export let rows: unknown[] = [];
  export let columns: DataTableColumn[] = [];
</script>

<DataTable {rows} {columns} pagination={false} stickyHeader={false}>
  <svelte:fragment slot="cell" let:row let:column let:value>
    <span data-testid={`cell-${column.key}`} data-parent={String((row as Record<string, unknown>).id)}>{value}</span>
  </svelte:fragment>
  <svelte:fragment slot="subCell" let:row let:subRow let:subRowIndex let:subColumn let:subColumnIndex let:value>
    <span
      data-testid={`subcell-${subColumn.key}`}
      data-parent={String((row as Record<string, unknown>).id)}
      data-sub-row={String((subRow as Record<string, unknown>).id)}
      data-sub-row-index={subRowIndex}
      data-sub-column-index={subColumnIndex}
    >{value}</span>
  </svelte:fragment>
  <svelte:fragment slot="subEmpty" let:row let:column>
    <span data-testid={`sub-empty-${column.key}`}>无明细：{String((row as Record<string, unknown>).id)}</span>
  </svelte:fragment>
  <svelte:fragment slot="subFooter" let:row let:column>
    {#if (row as Record<string, unknown>).canAdd !== false}
      <button type="button" data-testid={`sub-add-${column.key}`} data-parent={String((row as Record<string, unknown>).id)}>
        添加
      </button>
    {/if}
  </svelte:fragment>
</DataTable>
