<script lang="ts">
  import BaseDataTable from './BaseDataTable.svelte';
  import Pagination from './Pagination.svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type {
    DataTableColumn,
    DataTableLayout,
    DataTableRowAttributes,
    DataTableRowKey,
    DataTableSortChangeHandler,
    PaginationState,
    SortState
  } from './types.js';

  export let rows: unknown[] = [];
  export let columns: DataTableColumn[] = [];
  export let rowKey: DataTableRowKey | undefined = undefined;
  export let language: UiLanguage = 'en_us';
  export let emptyText: string | undefined = undefined;
  export let sort: SortState | null = null;
  export let onSortChange: DataTableSortChangeHandler | undefined = undefined;
  export let showPagination = true;
  export let page = 1;
  export let pageSize = 20;
  export let totalRows: number | undefined = undefined;
  export let pageSizeOptions: number[] = [10, 20, 50, 100];
  export let pageSizeLabel: string | undefined = undefined;
  export let maxPageButtons = 15;
  export let onPaginationChange: ((pagination: PaginationState) => void | Promise<void>) | undefined = undefined;
  export let zebra = true;
  export let bordered = true;
  export let verticalSeparators = true;
  export let tableLayout: DataTableLayout = 'auto';
  export let stickyHeader = true;
  export let stickyHeaderTop: string | undefined = undefined;
  export let stickyHeaderOffset: string | undefined = undefined;
  export let preserveScrollOnSort = true;
  export let rowClass: string | ((row: unknown, index: number) => string | undefined | null) | undefined = undefined;
  export let rowAttributes: DataTableRowAttributes | undefined = undefined;

  $: messages = getUiMessages(language);
  $: resolvedEmptyText = emptyText ?? messages.table.emptyText;
  $: resolvedPageSizeLabel = pageSizeLabel ?? messages.table.pageSizeLabel;
  $: resolvedTotalRows = totalRows ?? rows.length;
  $: pagination = { page, pageSize };

  function updatePagination(next: PaginationState) {
    void onPaginationChange?.(next);
  }
</script>

<div class="suu-data-table">
  {#if showPagination}
    <Pagination
      {pagination}
      {language}
      totalRows={resolvedTotalRows}
      {pageSizeOptions}
      pageSizeLabel={resolvedPageSizeLabel}
      {maxPageButtons}
      onPaginationChange={updatePagination}
    />
  {/if}

  <BaseDataTable
    {rows}
    {columns}
    {sort}
    {zebra}
    {bordered}
    {verticalSeparators}
    {tableLayout}
    {stickyHeader}
    {stickyHeaderTop}
    {stickyHeaderOffset}
    {preserveScrollOnSort}
    {language}
    emptyText={resolvedEmptyText}
    {rowKey}
    {rowClass}
    {rowAttributes}
    {onSortChange}
  >
    <slot name="header" slot="header" let:column let:sort {column} {sort}>{column.header}</slot>
    <slot name="cell" slot="cell" let:row let:column let:value {row} {column} {value}>{value}</slot>
  </BaseDataTable>

  {#if showPagination}
    <Pagination
      {pagination}
      {language}
      totalRows={resolvedTotalRows}
      {pageSizeOptions}
      pageSizeLabel={resolvedPageSizeLabel}
      {maxPageButtons}
      onPaginationChange={updatePagination}
    />
  {/if}
</div>
