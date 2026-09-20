# Compatibility Notes

This document records only releases that break existing behavior or require consumer migration.

## 0.4.7: configurable date range presets

Not breaking: omitting the new `presets` prop keeps the previous preset row
exactly (built-in buttons, two dividers, quick month/year selects), and
`defaultPreset`/`presetLabels` keep working for built-in keys. One type-level
change to review: `DateRangeFilterValue.preset` widens from
`DateRangePreset | null` to `string | null` so custom preset keys can round-trip.
Consumers that assign `value.preset` to a `DateRangePreset`-typed variable now
need a guard such as the exported `isDateRangePreset(key)`.

The `presets` prop accepts built-in preset keys, custom preset objects
(`{ key, label?, resolve }`), consumer-controlled select entries
(`{ type: 'select', key, value, options, ariaLabel?, onChange }`), and the
structural entries `'quickMonth'`, `'quickYear'`, and `'divider'`.

## Unreleased (after 0.4.3): dropdown string/label-value field contract

All dropdown-family components now speak one field contract: options are
`{ label, value }` and every submitted value is a string. This is a breaking
field migration; the package is not fully backward compatible with 0.4.x
callers that pass numeric values or `id`/`title` items.

- `DropdownValue` is now `string` (arrays are `string[]`). `Dropdown`,
  `DropdownMultiSelect`, and every handler that receives selected values emit
  strings only. Callers that keep numeric domain state must convert at the
  boundary: pass `String(id)` in option `value`, and `Number(value)` when the
  business layer needs the number back. The submitted business value is
  unchanged; only its transport type at the component boundary changed. The
  bundled `Pagination` already adapts internally: its page-size options and
  trigger are stringified while `PaginationState.pageSize` stays a number.
- `DropdownSearchItem` (and therefore `loadOptions` results, `selectedItem`,
  `selectedItems`, `focusOptions`, and `exactMatch`) now uses
  `{ label, value }` instead of `{ id, title }`. `label` is the display text,
  `value` is the submitted string identifier, and extra fields such as
  `param_dict` are preserved as business metadata. There is no `title`/`id`
  fallback.
- The `DropdownSearch`/`DropdownSearchMultiSelect` free-text `value` prop and
  `onChange` detail remain the raw input text. They are distinct from the
  submitted `item.value`; selecting an item fills the input with the item
  label.
- The `getItemValue` prop is renamed to `getItemLabel`
  (`DropdownSearchItemValueGetter` is now `DropdownSearchItemLabelGetter`).
  It returns the input text shown for a selected item and defaults to
  `item.label`. Rename any override; returning the submitted `item.value`
  from it is a mistake.
- Data-table filter options follow the same contract: `FilterOption.value`
  is `string`, and the checkbox, radio, and select filter controls take and
  emit `string`/`string[]` values. Convert numeric filter keys (for example
  category bits) with `String(...)` when building options and `Number(...)`
  inside `onChange`. `FilterValue`/`FilterState` remain the storage union.

Migration sketch:

```ts
// before
const options = users.map((u) => ({ id: u.id, title: u.displayName }));
onSelect: (item) => save(item.id)

// after
const options = users.map((u) => ({ value: String(u.id), label: u.displayName }));
onSelect: (item) => save(Number(item.value)) // or keep the string protocol
```

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
