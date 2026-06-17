<script lang="ts">
  import { Pagination, type PaginationState } from '../../src/lib/pagination/index.js';

  export let totalRows = 42;
  export let pageSizeOptions: number[] = [10, 20];
  export let initialPagination: PaginationState = { page: 1, pageSize: 10 };

  let pagination = initialPagination;

  function updatePagination(next: PaginationState) {
    pagination = next;
  }
</script>

<Pagination
  {pagination}
  {totalRows}
  {pageSizeOptions}
  pageSizeDropdownPlacement="down"
  onPaginationChange={updatePagination}
/>
<Pagination
  {pagination}
  {totalRows}
  {pageSizeOptions}
  pageSizeDropdownPlacement="up"
  onPaginationChange={updatePagination}
/>
