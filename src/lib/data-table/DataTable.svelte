<script lang="ts">
  import FilterBox from './FilterBox.svelte';
  import Pagination from './Pagination.svelte';
  import Table from './Table.svelte';
  import { setDataTableFilters, setDataTablePageSize, setDataTablePagination, setDataTableSort } from './state.js';
  import type { DataTableColumn, DataTableState, FilterDefinition, FilterState, PaginationState, SortState } from './types.js';

  export let rows: Record<string, unknown>[] = [];
  export let columns: DataTableColumn<Record<string, unknown>>[] = [];
  export let totalRows = 0;
  export let state: DataTableState = {
    sort: null,
    pagination: { page: 1, pageSize: 20 },
    filters: {}
  };
  export let filterDefinitions: FilterDefinition[] = [];
  export let pageSizeOptions: number[] = [10, 20, 50, 100];
  export let zebra = true;
  export let emptyText = 'No records';
  export let onStateChange: ((nextState: DataTableState) => void) | undefined = undefined;

  function emit(nextState: DataTableState) {
    onStateChange?.(nextState);
  }

  function updateSort(sort: SortState) {
    emit({ ...setDataTableSort(state, sort.key), sort });
  }

  function updateFilters(filters: FilterState) {
    emit(setDataTableFilters(state, filters));
  }

  function updatePagination(pagination: PaginationState) {
    const pageSizeChanged = pagination.pageSize !== state.pagination.pageSize;
    emit(pageSizeChanged ? setDataTablePageSize(state, pagination.pageSize, totalRows) : setDataTablePagination(state, pagination, totalRows));
  }
</script>

<div class="suu-data-table">
  {#if filterDefinitions.length > 0}
    <FilterBox definitions={filterDefinitions} filters={state.filters} onFiltersChange={updateFilters} />
  {/if}

  <slot name="filters" {state} onFiltersChange={updateFilters}></slot>

  <Table {rows} {columns} sort={state.sort} {zebra} {emptyText} onSortChange={updateSort}>
    <slot name="cell" slot="cell" let:row let:column let:value {row} {column} {value}>{value}</slot>
  </Table>

  <Pagination pagination={state.pagination} {totalRows} {pageSizeOptions} onPaginationChange={updatePagination} />
</div>
