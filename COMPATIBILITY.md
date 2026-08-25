# Compatibility Notes

This document records only releases that break existing behavior or require consumer migration.

## Unreleased / 0.4.0

`DataTable` now has one explicit server-pagination contract. It owns the page,
page-size preference, request pending state, query reset, and page-boundary
correction. It still does not load rows or display application request errors.

The following `DataTable` props have been removed:

- `showPagination`
- `page`
- `pageSize`
- `totalRows`
- `pageSizeOptions`
- `pageSizeLabel`
- `pageSizeStorageKey`
- `onPaginationChange`

For a static table, replace `showPagination={false}` with the required explicit
setting:

```svelte
<DataTable rows={rows} {columns} pagination={false} />
```

For a server-paginated table, remove the caller-owned page and page-size state
and move pagination settings into `pagination`. Pass only the server's current
page rows to `rows`:

```svelte
<script lang="ts">
  import { DataTable, type PaginationState } from '@ibobbyts/svelte-ui-utils/table';

  type UserRow = {
    name: string;
  };

  const columns = [{ key: 'name', header: 'Name' }];
  let rows: UserRow[] = [];
  let totalRows = 0;
  let searchTerm = '';

  async function loadRows({ page, pageSize }: PaginationState) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search: searchTerm
    });
    const response = await fetch(`/api/users?${params}`);

    if (!response.ok) {
      throw new Error('Failed to load users');
    }

    const result = (await response.json()) as { rows: UserRow[]; totalRows: number };
    rows = result.rows;
    totalRows = result.totalRows;
  }
</script>

<DataTable
  rows={rows}
  {columns}
  pagination={{
    tableId: 'admin-users',
    totalRows,
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    persistPageSize: true,
    queryKey: searchTerm,
    onRequest: loadRows
  }}
/>
```

Replace a previous `pageSizeStorageKey` with a stable `tableId` and
`persistPageSize: true`. The component generates
`svelte-ui-utils:data-table:<tableId>:page-size`; existing values under custom
keys are not migrated automatically. Pass the old page-size label as
`pagination.pageSizeLabel`. `queryKey` must be a stable primitive and should
represent the active search or filter inputs that require returning to page 1.

Standalone `Pagination` keeps its controlled API. It additionally accepts
`disabled` when a caller needs to lock its page buttons and page-size dropdown.

## 0.3.0

`Dropdown` changes two defaults:

- `menuAlign` changes from `"right"` to `"left"`. Pass `menuAlign="right"` to preserve the previous alignment.
- `fitViewport` changes from `false` to `true`. Pass `fitViewport={false}` to preserve the previous stylesheet-level `100vh` panel limit instead of constraining the panel to the space available above or below the trigger.

## 0.3.6

`Dropdown` changes its `fitContent` default from `false` to `true`. Menus now size horizontally to their option content by default. Pass `fitContent={false}` to preserve the previous trigger-width menu behavior.
