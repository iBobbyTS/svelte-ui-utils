<script lang="ts">
  import { getPageCount, normalizePagination } from '../data-table/state.js';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type { PaginationChangeHandler, PaginationDropdownPlacement, PaginationState } from '../data-table/types.js';

  export let pagination: PaginationState = { page: 1, pageSize: 20 };
  export let totalRows = 0;
  export let pageSizeOptions: number[] = [10, 20, 50, 100];
  export let language: UiLanguage = 'en_us';
  export let pageSizeLabel: string | undefined = undefined;
  export let maxPageButtons = 15;
  export let pageSizeDropdownPlacement: PaginationDropdownPlacement = 'down';
  export let onPaginationChange: PaginationChangeHandler | undefined = undefined;

  type PaginationItem = { kind: 'page'; page: number } | { kind: 'ellipsis' };

  let pageSizeDropdownOpen = false;
  let activePageSize = pagination.pageSize;
  let pageSizeButton: HTMLButtonElement | undefined;

  $: messages = getUiMessages(language);
  $: resolvedPageSizeLabel = pageSizeLabel ?? messages.table.pageSizeLabel;
  $: normalized = normalizePagination(pagination, totalRows);
  $: pageCount = getPageCount(totalRows, normalized.pageSize);
  $: pageItems = buildPaginationItems(normalized.page, pageCount, maxPageButtons);
  $: selectedPageSizeText = String(normalized.pageSize);
  $: if (!pageSizeDropdownOpen) {
    activePageSize = normalized.pageSize;
  }

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
    void onPaginationChange?.(normalizePagination({ ...normalized, page }, totalRows));
  }

  function setPageSize(pageSize: number) {
    pageSizeDropdownOpen = false;
    activePageSize = pageSize;
    void onPaginationChange?.(normalizePagination({ page: 1, pageSize }, totalRows));
    pageSizeButton?.focus();
  }

  function currentPageSizeIndex(value: number): number {
    const index = pageSizeOptions.indexOf(value);
    return index >= 0 ? index : 0;
  }

  function moveActivePageSize(offset: number) {
    if (pageSizeOptions.length === 0) {
      return;
    }
    const currentIndex = currentPageSizeIndex(activePageSize);
    const nextIndex = (currentIndex + offset + pageSizeOptions.length) % pageSizeOptions.length;
    activePageSize = pageSizeOptions[nextIndex] ?? activePageSize;
  }

  function handlePageSizeKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (pageSizeDropdownOpen) {
        event.preventDefault();
        pageSizeDropdownOpen = false;
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!pageSizeDropdownOpen) {
        pageSizeDropdownOpen = true;
        activePageSize = normalized.pageSize;
      }
      moveActivePageSize(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && pageSizeDropdownOpen) {
      event.preventDefault();
      setPageSize(activePageSize);
    }
  }

  function handlePageSizeFocusout(event: FocusEvent) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    pageSizeDropdownOpen = false;
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
  <div class="suu-pagination__size">
    <span>{resolvedPageSizeLabel}</span>
    <span class="suu-pagination__select-wrap" on:focusout={handlePageSizeFocusout}>
      <button
        bind:this={pageSizeButton}
        type="button"
        class="suu-pagination__select-button"
        aria-label={resolvedPageSizeLabel}
        aria-haspopup="listbox"
        aria-expanded={pageSizeDropdownOpen}
        on:click={() => {
          pageSizeDropdownOpen = !pageSizeDropdownOpen;
          activePageSize = normalized.pageSize;
        }}
        on:keydown={handlePageSizeKeydown}
      >
        <span>{selectedPageSizeText}</span>
        <span class="suu-pagination__select-chevron" aria-hidden="true"></span>
      </button>

      {#if pageSizeDropdownOpen}
        <div
          class="suu-pagination__select-menu"
          class:suu-pagination__select-menu--up={pageSizeDropdownPlacement === 'up'}
          class:suu-pagination__select-menu--down={pageSizeDropdownPlacement === 'down'}
        >
          <div class="suu-pagination__select-panel" role="listbox" aria-label={resolvedPageSizeLabel}>
            {#each pageSizeOptions as option}
              <button
                type="button"
                class="suu-pagination__select-option"
                class:suu-pagination__select-option--active={option === activePageSize}
                role="option"
                aria-selected={option === normalized.pageSize}
                on:mousedown|preventDefault={() => undefined}
                on:mouseenter={() => (activePageSize = option)}
                on:click={() => setPageSize(option)}
              >
                {option}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </span>
  </div>
</div>
