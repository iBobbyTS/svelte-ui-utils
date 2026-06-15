<script lang="ts">
  import { getPageCount, normalizePagination } from './state.js';
  import type { PaginationState } from './types.js';

  export let pagination: PaginationState = { page: 1, pageSize: 20 };
  export let totalRows = 0;
  export let pageSizeOptions: number[] = [10, 20, 50, 100];
  export let onPaginationChange: ((pagination: PaginationState) => void) | undefined = undefined;

  $: normalized = normalizePagination(pagination, totalRows);
  $: pageCount = getPageCount(totalRows, normalized.pageSize);
  $: startRow = totalRows === 0 ? 0 : (normalized.page - 1) * normalized.pageSize + 1;
  $: endRow = Math.min(totalRows, normalized.page * normalized.pageSize);

  function setPage(page: number) {
    onPaginationChange?.(normalizePagination({ ...normalized, page }, totalRows));
  }

  function setPageSize(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const pageSize = Number(select.value);
    onPaginationChange?.(normalizePagination({ page: 1, pageSize }, totalRows));
  }
</script>

<div class="suu-pagination" aria-label="Pagination">
  <div class="suu-pagination__summary">{startRow}-{endRow} / {totalRows}</div>
  <div class="suu-pagination__controls">
    <button type="button" class="suu-button" disabled={normalized.page <= 1} on:click={() => setPage(normalized.page - 1)}>
      Previous
    </button>
    <span class="suu-pagination__page">{normalized.page} / {pageCount}</span>
    <button
      type="button"
      class="suu-button"
      disabled={normalized.page >= pageCount}
      on:click={() => setPage(normalized.page + 1)}
    >
      Next
    </button>
    <label class="suu-pagination__size">
      <span>Rows</span>
      <select value={normalized.pageSize} on:change={setPageSize}>
        {#each pageSizeOptions as option}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </label>
  </div>
</div>
