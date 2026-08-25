<svelte:options runes={false} />

<script lang="ts">
  import { onMount } from 'svelte';
  import BaseDataTable from './BaseDataTable.svelte';
  import Pagination from '../pagination/Pagination.svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import { normalizePagination } from './state.js';
  import type {
    DataTableColumn,
    DataTableLayout,
    DataTableRowAttributes,
    DataTableRowKey,
    DataTableSortChangeHandler,
    DataTableServerPagination,
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
  export let showHeader = true;
  export let pagination: false | DataTableServerPagination;
  export let maxPageButtons = 15;
  export let zebra = true;
  export let hoverable = true;
  export let bordered = true;
  export let verticalSeparators = true;
  export let tableLayout: DataTableLayout = 'auto';
  export let stickyHeader = true;
  export let stickyHeaderTop: string | undefined = undefined;
  export let stickyHeaderOffset: string | undefined = undefined;
  export let preserveScrollOnSort = true;
  export let rowClass: string | ((row: unknown, index: number) => string | undefined | null) | undefined = undefined;
  export let rowAttributes: DataTableRowAttributes | undefined = undefined;

  const defaultPageSizeOptions = [10, 20, 50, 100];
  const initialPaginationConfig = pagination === false ? undefined : pagination;

  let currentPagination: PaginationState = {
    page: 1,
    pageSize: resolveDefaultPageSize(initialPaginationConfig)
  };
  let requestPending = false;
  let requestSequence = 0;
  let mounted = false;
  let lastQueryKey = initialPaginationConfig?.queryKey;

  $: messages = getUiMessages(language);
  $: resolvedEmptyText = emptyText ?? messages.table.emptyText;
  $: serverPagination = pagination === false ? undefined : pagination;
  $: resolvedPageSizeOptions = normalizePageSizeOptions(serverPagination?.pageSizeOptions);
  $: resolvedDefaultPageSize = resolveDefaultPageSize(serverPagination);
  $: resolvedTotalRows = serverPagination?.totalRows ?? 0;
  $: resolvedPageSizeLabel = serverPagination?.pageSizeLabel ?? messages.table.pageSizeLabel;
  $: minimumPageSizeOption = Math.min(...resolvedPageSizeOptions);
  $: shouldShowPagination = serverPagination !== undefined && resolvedTotalRows >= minimumPageSizeOption;

  $: if (mounted && serverPagination && serverPagination.queryKey !== lastQueryKey) {
    lastQueryKey = serverPagination.queryKey;
    void requestPagination({ page: 1, pageSize: currentPagination.pageSize }, true);
  }

  $: if (mounted && serverPagination) {
    const normalized = normalizePagination(currentPagination, resolvedTotalRows);
    if (resolvedTotalRows === 0 && currentPagination.page !== 1) {
      currentPagination = { ...currentPagination, page: 1 };
    } else if (resolvedTotalRows > 0 && normalized.page !== currentPagination.page) {
      void requestPagination(normalized);
    }
  }

  $: if (mounted && serverPagination && !resolvedPageSizeOptions.includes(currentPagination.pageSize)) {
    void requestPagination({ page: 1, pageSize: resolvedDefaultPageSize });
  }

  function normalizePageSizeOptions(options: number[] | undefined): number[] {
    const normalized = [...new Set((options ?? defaultPageSizeOptions).filter((option) => Number.isInteger(option) && option > 0))];
    return normalized.length > 0 ? normalized : [...defaultPageSizeOptions];
  }

  function resolveDefaultPageSize(config: DataTableServerPagination | undefined): number {
    const options = normalizePageSizeOptions(config?.pageSizeOptions);
    return config?.defaultPageSize !== undefined && options.includes(config.defaultPageSize)
      ? config.defaultPageSize
      : (options[0] as number);
  }

  function storageKey(config: DataTableServerPagination): string | undefined {
    const tableId = config.tableId.trim();
    return config.persistPageSize === true && tableId.length > 0
      ? `svelte-ui-utils:data-table:${tableId}:page-size`
      : undefined;
  }

  function readStoredPageSize(): number | null {
    if (!serverPagination) {
      return null;
    }
    const key = storageKey(serverPagination);
    if (!key) {
      return null;
    }
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue === null) {
        return null;
      }
      const storedPageSize = Number(storedValue);
      return resolvedPageSizeOptions.includes(storedPageSize) ? storedPageSize : null;
    } catch {
      return null;
    }
  }

  function storePageSize(config: DataTableServerPagination, nextPageSize: number) {
    const key = storageKey(config);
    if (!key || !normalizePageSizeOptions(config.pageSizeOptions).includes(nextPageSize)) {
      return;
    }
    try {
      window.localStorage.setItem(key, String(nextPageSize));
    } catch {
      // localStorage 可能因浏览器隐私策略或存储空间限制而不可用。
    }
  }

  async function requestPagination(next: PaginationState, force = false) {
    const config = serverPagination;
    if (!config) {
      return;
    }

    const nextPagination = normalizePagination(next, config.totalRows);
    if (!force && nextPagination.page === currentPagination.page && nextPagination.pageSize === currentPagination.pageSize) {
      return;
    }

    const previousPagination = currentPagination;
    const sequence = ++requestSequence;
    currentPagination = nextPagination;
    requestPending = true;

    try {
      await config.onRequest(nextPagination);
      if (sequence === requestSequence) {
        storePageSize(config, nextPagination.pageSize);
        requestPending = false;
      }
    } catch {
      if (sequence === requestSequence) {
        const latestTotalRows = pagination === false ? 0 : pagination.totalRows;
        currentPagination = normalizePagination(previousPagination, latestTotalRows);
        requestPending = false;
      }
    }
  }

  onMount(() => {
    mounted = true;
    lastQueryKey = pagination === false ? undefined : pagination.queryKey;
    const storedPageSize = readStoredPageSize();
    if (storedPageSize !== null && storedPageSize !== currentPagination.pageSize) {
      void requestPagination({ page: 1, pageSize: storedPageSize });
    }
  });
</script>

<div class="suu-data-table">
  {#if shouldShowPagination}
    <Pagination
      pagination={currentPagination}
      {language}
      totalRows={resolvedTotalRows}
      pageSizeOptions={resolvedPageSizeOptions}
      pageSizeLabel={resolvedPageSizeLabel}
      {maxPageButtons}
      disabled={requestPending}
      pageSizeDropdownPlacement="down"
      onPaginationChange={requestPagination}
    />
  {/if}

  <BaseDataTable
    {rows}
    {columns}
    {sort}
    {showHeader}
    {zebra}
    {hoverable}
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

  {#if shouldShowPagination}
    <Pagination
      pagination={currentPagination}
      {language}
      totalRows={resolvedTotalRows}
      pageSizeOptions={resolvedPageSizeOptions}
      pageSizeLabel={resolvedPageSizeLabel}
      {maxPageButtons}
      disabled={requestPending}
      pageSizeDropdownPlacement="up"
      onPaginationChange={requestPagination}
    />
  {/if}
</div>
