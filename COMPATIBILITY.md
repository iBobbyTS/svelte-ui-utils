# Compatibility Notes

This document records only releases that break existing behavior or require consumer migration.

## 0.5.0

Four breaking changes ship together in 0.5.0.

### 1. The `dropdown-search` component family is removed (0.5.0)

Old behavior: `DropdownSearch`, `DropdownSearchMultiSelect`, the pure helpers
(`clampDropdownSearchLimit`, `formatParamDict`, `isUsableExactMatch`,
`normalizeDropdownSearchValue`, `resolveDropdownSearchStatus`), and the type
names `DropdownSearchItem`, `DropdownSearchStatus`, `DropdownSearchChangeDetail`,
`DropdownSearchEnterDetail`, `DropdownSearchLoadOptions`,
`DropdownSearchItemLabelGetter`, and friends were exported from the package root
and from the `@ibobbyts/svelte-ui-utils/dropdown-search` and
`.../dropdown-search/state` entry points.

New behavior: the `src/lib/dropdown-search/` module and both entry points are
gone; the root export no longer contains the family or its types.

Migration: use the unified `Dropdown` search mode
(`<Dropdown search inputStyle="input" loadOptions={...} />`) and import nothing
from `dropdown-search`. The data-table `filter.dropdownSearch(...)` control is
unchanged and now renders that same root `Dropdown` internally.

### 2. The `Dropdown` prop `input_style` is renamed `inputStyle` (0.5.0)

Old behavior: `input_style` selected between the in-menu search field
(`"dropdown"`, default) and a directly editable input (`"input"`).

New behavior: the prop is `inputStyle` with the same two values. A stale
`input_style` attribute is ignored, so the component silently falls back to the
default `"dropdown"` mode.

Migration: rename every `input_style` usage to `inputStyle` (including any test
anchors).

### 3. `Dropdown` `portal` menus move in-tree and are lifted to the top layer (0.5.0)

Old behavior: `portal={true}` moved the open menu under `document.body` and the
menu sized itself to its content (`max-content`) unless `fitContent={false}`;
body-mounted nodes stay inert behind a modal `<dialog>`.

New behavior: the menu stays in the component tree and is promoted to the top
layer through the popover API when `showPopover` is available (otherwise it
remains a plain in-tree absolutely positioned menu). Its width always matches the
trigger, independent of `fitContent`.

Migration: replace any `body > .suu-dropdown__menu` selector or body-mount
assumption with the component's own `.suu-dropdown__menu` subtree; use
`fitContent` only for non-portal menu widths. No opt-out restores the body mount.

### 4. data-table `dropdownSearch` filter interaction differences (0.5.0)

Old behavior: the (now removed) `DropdownSearch` component reported a per
keystroke `onChange` with `detail.value` as the raw input text, resolved
`detail.status`/auto-selection from `exactMatch` + `minLength` + `validate`,
honored `searchOnExternalValueChange`, `closeOnValid={false}`,
`showOptionsOnFocus`/`focusOptions`, `footerText`, `clearLabel`, and passed
`limit` through verbatim.

New behavior: the `dropdownSearch` control type, the `filter.dropdownSearch()`
builder, and their public signatures are unchanged, but `FilterControl` renders
the root `Dropdown` in `inputStyle="input"` mode, which narrows the interactions:

- Real-time external value sync (`searchOnExternalValueChange: true`) is gone.
  A controlled `value`/`selectedItem` change now remounts the `Dropdown` (keyed
  rebuild): the input shows the new value, internal query/results/draft reset,
  and any in-flight search is aborted. Migration: keep driving `value` and
  `selectedItem` for resets; the display follows, but no search is re-run — let
  the user type, or trigger the refresh from your own interaction layer.
- `onChange` no longer fires per keystroke. `detail.value` is now the selected
  item's `getItemLabel` label (falling back to the identifier when the item is
  unknown), `selectedItem` is the loaded item, `selectedItems` stays `[]`, and
  the live query is kept internal. Migration: if you need the live query, render
  the root `Dropdown` directly and use its `onSearchChange`; the filter control
  has no query callback.
- `status` is no longer resolved from `exactMatch`/`minLength`/`validate`, and
  the control's `status` input is ignored for rendering. `detail.status` is
  `'valid'` when a known item was selected in the current instance, otherwise an
  internal `'empty'`/`'invalid'` approximation. Migration: derive validation
  from `selectedItem` in your own layer.
- `exactMatch` returned by `loadOptions` is ignored; only `options` render and
  drive selection. Migration: resolve the exact match yourself and select from
  the rendered options.
- `closeOnValid` is effectively always `true`: selecting an option closes the
  menu. Migration: the previous `closeOnValid={false}` behavior (keep the list
  open after validation) has no opt-in.
- `showOptionsOnFocus`, `focusOptions`, `footerText`, and `clearLabel` are
  omitted (the root `Dropdown` has no counterpart element). Migration: render
  focus shortcuts, notes, or a clear affordance outside the control, or use the
  root `Dropdown` API directly.
- `minLength` is preserved by the adapter: the query is trimmed and, when
  shorter than `minLength`, `loadOptions` is not called and no options render.
- `limit` is clamped by the root `Dropdown` to an integer in `1..50` before it
  reaches `loadOptions`. Migration: pre-clamp in your own `loadOptions` if you
  depend on limits outside that range. Defaults (`debounceMs` 500 → 500,
  `limit` 10 → 10) are unchanged.

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
