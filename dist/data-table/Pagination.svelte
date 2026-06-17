<script lang="ts">
  import { getPageCount, normalizePagination } from './state.js';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type { PaginationState } from './types.js';

  export let pagination: PaginationState = { page: 1, pageSize: 20 };
  export let totalRows = 0;
  export let pageSizeOptions: number[] = [10, 20, 50, 100];
  export let language: UiLanguage = 'en_us';
  export let pageSizeLabel: string | undefined = undefined;
  export let maxPageButtons = 15;
  export let onPaginationChange: ((pagination: PaginationState) => void) | undefined = undefined;

  type PaginationItem = { kind: 'page'; page: number } | { kind: 'ellipsis' };

  $: messages = getUiMessages(language);
  $: resolvedPageSizeLabel = pageSizeLabel ?? messages.table.pageSizeLabel;
  $: normalized = normalizePagination(pagination, totalRows);
  $: pageCount = getPageCount(totalRows, normalized.pageSize);
  $: pageItems = buildPaginationItems(normalized.page, pageCount, maxPageButtons);

  function buildPaginationItems(currentPage: number, totalPages: number, maxButtons: number): PaginationItem[] {
    if (totalPages <= 1) {
      return [];
    }

    const visiblePageCount = Math.max(3, Math.trunc(maxButtons));
    if (totalPages <= visiblePageCount) {
      return Array.from({ length: totalPages }, (_, index) => ({ kind: 'page', page: index + 1 }));
    }

    const page = Math.min(Math.max(Math.trunc(currentPage), 1), totalPages);
    const innerWindowSize = visiblePageCount - 2;
    const maxInnerPage = totalPages - 1;
    let windowStart = page - Math.floor(innerWindowSize / 2);
    let windowEnd = windowStart + innerWindowSize - 1;

    if (windowStart < 2) {
      windowStart = 2;
      windowEnd = windowStart + innerWindowSize - 1;
    }
    if (windowEnd > maxInnerPage) {
      windowEnd = maxInnerPage;
      windowStart = windowEnd - innerWindowSize + 1;
    }

    const pages = [1];
    for (let p = windowStart; p <= windowEnd; p += 1) {
      pages.push(p);
    }
    pages.push(totalPages);

    const items: PaginationItem[] = [];
    for (let i = 0; i < pages.length; i += 1) {
      const previousPage = pages[i - 1];
      const nextPage = pages[i];
      if (previousPage !== undefined && nextPage !== undefined && nextPage - previousPage > 1) {
        items.push({ kind: 'ellipsis' });
      }
      if (nextPage !== undefined) {
        items.push({ kind: 'page', page: nextPage });
      }
    }
    return items;
  }

  function setPage(page: number) {
    onPaginationChange?.(normalizePagination({ ...normalized, page }, totalRows));
  }

  function setPageSize(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const pageSize = Number(select.value);
    onPaginationChange?.(normalizePagination({ page: 1, pageSize }, totalRows));
  }
</script>

<div class="suu-pagination" aria-label={messages.table.paginationLabel}>
  <div class="suu-pagination__pages" class:suu-pagination__pages--empty={pageItems.length === 0}>
    {#each pageItems as item, index (item.kind === 'page' ? `page-${item.page}` : `ellipsis-${index}`)}
      {#if item.kind === 'page'}
        <button
          type="button"
          class:suu-pagination__page-button={true}
          class:suu-pagination__page-button--active={item.page === normalized.page}
          aria-current={item.page === normalized.page ? 'page' : undefined}
          on:click={() => setPage(item.page)}
        >
          {item.page}
        </button>
      {:else}
        <span class="suu-pagination__ellipsis" aria-hidden="true">...</span>
      {/if}
    {/each}
  </div>
  <label class="suu-pagination__size">
    <span>{resolvedPageSizeLabel}</span>
    <select value={normalized.pageSize} on:change={setPageSize}>
      {#each pageSizeOptions as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>
</div>
