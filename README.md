# svelte-ui-utils

Reusable Svelte 5 UI utilities published to the npm registry as
`@ibobbyts/svelte-ui-utils`.

## Install

Install from the public npm registry. No GitHub Packages token is required.

With Bun:

```bash
bun add @ibobbyts/svelte-ui-utils@0.2.0
```

Canonical Bun pull address:

```text
@ibobbyts/svelte-ui-utils@0.2.0
```

With npm:

```bash
npm install @ibobbyts/svelte-ui-utils@0.2.0
```

The repository does not track `dist/`; releases and local integration builds run
`npm run package` to generate the published files.

Import the stylesheet once in your app entry:

```ts
import '@ibobbyts/svelte-ui-utils/style.css';
```

## Module imports

```svelte
<script lang="ts">
  import { ToastManager, toast } from '@ibobbyts/svelte-ui-utils/toast';
  import { Dropdown } from '@ibobbyts/svelte-ui-utils/dropdown';
  import { DropdownSearch } from '@ibobbyts/svelte-ui-utils/dropdown-search';
  import { DataTable, DateRangeFilter, FilterTable, NumberRangeFilter } from '@ibobbyts/svelte-ui-utils/table';
</script>
```

The package root also re-exports the public modules:

```ts
import { ToastManager, Dropdown, DropdownSearch, DataTable } from '@ibobbyts/svelte-ui-utils';
```

## Toast

```svelte
<script lang="ts">
  import { ToastManager, toast } from '@ibobbyts/svelte-ui-utils/toast';
  import '@ibobbyts/svelte-ui-utils/style.css';

  function save() {
    toast.success({
      title: 'Saved',
      message: 'The record was updated.',
      duration: 4000,
      position: 'top-right'
    });
  }
</script>

<ToastManager language="en_us" closeLabel="Close" />
<button on:click={save}>Save</button>
```

Supported positions are `top-left`, `top-center`, `top-right`, `right-center`,
`bottom-right`, `bottom-center`, `bottom-left`, and `left-center`.

## DropdownSearch

```svelte
<script lang="ts">
  import { DropdownSearch } from '@ibobbyts/svelte-ui-utils/dropdown-search';

  async function loadOptions(query, { limit, signal }) {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, { signal });
    return response.json();
  }
</script>

<DropdownSearch
  language="en_us"
  placeholder="Search"
  debounceMs={500}
  clearLabel="Clear search"
  width="24rem"
  maxWidth="100%"
  {loadOptions}
  searchOnExternalValueChange={true}
/>
```

`loadOptions` returns `{ options, exactMatch }`. An item uses this shape:

```ts
{
  id: '123',
  title: 'Jane Doe',
  param_dict: { ID: 'M-123' }
}
```

The input is valid when the server returns one unique `exactMatch`, or when the
user selects an item. Non-empty text without a unique match is invalid.
Set `validate={false}` when the field should only show selectable options and
stay visually neutral instead of turning green or red. In that mode the
component ignores `exactMatch` for status and auto-selection.
Use `searchOnExternalValueChange` for scanner or programmatic input workflows.
When the input has text, `DropdownSearch` shows an internal clear button on the
right side of the field. Use `clearLabel` to localize that button's accessible
label, or use `language` to select the package default.
Use `width`, `minWidth`, and `maxWidth` to size the control directly when a
wrapper is not convenient.
Server-side code and Node tests that only need pure helpers should import from
`@ibobbyts/svelte-ui-utils/dropdown-search/state` so they do not load Svelte
component files.

## Dropdown

```svelte
<script lang="ts">
  import { Dropdown, type DropdownOption, type DropdownValue } from '@ibobbyts/svelte-ui-utils/dropdown';

  const pageSizeOptions: DropdownOption[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 }
  ];

  let pageSize: DropdownValue = 20;
</script>

<Dropdown
  value={pageSize}
  options={pageSizeOptions}
  ariaLabel="Rows"
  placement="down"
  onChange={(next) => {
    pageSize = next;
  }}
/>
```

`Dropdown` is a controlled select-like component for simple option lists. Use
`placement="up"` when the menu should open above the trigger, such as bottom
pagination bars. `DataTable` uses this same component for its page-size picker.

## DataTable

```svelte
<script lang="ts">
  import { DataTable } from '@ibobbyts/svelte-ui-utils/table';

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      headerHorizontalAlign: 'center',
      headerVerticalAlign: 'middle',
      cellHorizontalAlign: 'right',
      cellVerticalAlign: 'top'
    }
  ];

  let sort = null;
  let page = 1;
  let pageSize = 20;
</script>

<DataTable
  language="en_us"
  rows={rows}
  {columns}
  {sort}
  {page}
  {pageSize}
  totalRows={totalRows}
  tableLayout="auto"
  stickyHeader={true}
  onSortChange={(next) => {
    sort = next;
    page = 1;
  }}
  onPaginationChange={(next) => {
    page = next.page;
    pageSize = next.pageSize;
  }}
/>
```

`DataTable` renders page-number pagination above and below the data table by
default, including a page-size selector. Use `language` for package-owned
defaults such as empty state, pagination label, and page-size label; use
`pageSizeLabel` or `emptyText` when a specific app needs to override them.
Use `showPagination={false}` for static tables. Use `showHeader={false}` for
tables that should render body rows without a header section. Sortable headers
preserve the current window scroll position by default and wait for an async
`onSortChange` before restoring scroll position.

Column alignment is configured separately for headers and body cells.
Horizontal alignment accepts `left`, `center`, or `right`; vertical alignment
accepts `top`, `middle`, or `bottom`. Header alignment defaults to
`left`/`middle`; cell alignment defaults to `left`/`top`.
Use `headerHorizontalAlign`, `headerVerticalAlign`, `cellHorizontalAlign`, and
`cellVerticalAlign` instead of the older combined `align` field.

`Pagination` is also available as a standalone module when an app needs
pagination outside `DataTable`:

```svelte
<script lang="ts">
  import { Pagination, type PaginationState } from '@ibobbyts/svelte-ui-utils/pagination';

  let pagination: PaginationState = { page: 1, pageSize: 20 };
</script>

<Pagination
  {pagination}
  totalRows={totalRows}
  pageSizeOptions={[10, 20, 50, 100]}
  pageSizeDropdownPlacement="down"
  onPaginationChange={(next) => {
    pagination = next;
  }}
/>
```

Render two synchronized pagination bars by passing both instances the same
controlled `pagination` value and the same `onPaginationChange` handler. This
is the same contract `DataTable` uses for its top and bottom pagination.

`FilterTable` is filter-only. It accepts `rows`, where each row has a `title`
for the left column and a controlled filter created with the `filter` helper:

```svelte
<script lang="ts">
  import { FilterTable, filter } from '@ibobbyts/svelte-ui-utils/table';

  const filterRows = [
    {
      key: 'status',
      title: 'Status',
      filter: filter.checkbox({
        value: selectedStatuses,
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Archived', value: 'archived' }
        ],
        onChange: (value) => (selectedStatuses = value)
      })
    },
    {
      key: 'search',
      title: 'Search',
      filter: filter.container([
        filter.dropdownSearch({
          value: searchValue,
          selectedItem,
          status: searchStatus,
          width: '24rem',
          maxWidth: '100%',
          clearLabel: 'Clear search',
          loadOptions,
          onChange: (detail) => updateSearch(detail)
        }),
        filter.button({ icon: 'search', label: 'Find', onClick: submitSearch })
      ])
    }
  ];
</script>

<FilterTable rows={filterRows} language="en_us" />
```

If a dropdown-style filter appears clipped, check the parent containers first.
`DropdownSearch` renders its result list as an absolutely positioned child, so
any ancestor with `overflow: hidden`, `overflow: auto`, or `overflow: scroll`
can clip the menu even when the menu has a high `z-index`. Keep the nearest
filter container at `overflow: visible`, or move the clipping/scrolling behavior
to a parent that does not wrap the dropdown menu directly.

`dateRange` renders two browser date inputs plus preset buttons:
`last 24 hours`, `last 7 days`, `last 30 days`, `today`, `this week`,
`this month`, and `this year`. Manual changes emit `{ startDate, endDate,
preset: null }`. Pass `defaultPreset` to apply a preset on mount when the
current value is empty. Clicking the currently active preset clears both date
inputs and emits an empty range. The `last24Hours` preset also emits
`startDateTime` and `endDateTime` so a consuming app can run an exact timestamp
query while still showing the covered dates in the inputs.

`numberRange` renders min/max number inputs and supports `prefixLabel`, for
example `$` for currency filters.

## Localization

Components that render package-owned text accept `language="en_us"`,
`language="zh_cn"`, or `language="zh_tw"`. This affects only built-in defaults:
toast close labels, dropdown loading/empty/clear labels, table empty and
pagination labels, date range labels and presets, and number range labels.
Business labels such as column headers, filter row titles, button labels, and
placeholders should still be passed by the consuming app. Explicit props such
as `closeLabel`, `clearLabel`, `noResultsText`, `emptyText`, `pageSizeLabel`,
`startLabel`, and `minLabel` always override the language defaults.

Use `DataTable showPagination={false}` for a non-paginated data table:

```svelte
<DataTable
  rows={rows}
  {columns}
  showPagination={false}
  rowKey="id"
  tableLayout="fixed"
  stickyHeader={true}
  stickyHeaderOffset="4rem"
  verticalSeparators={true}
  preserveScrollOnSort={true}
  rowAttributes={(row) => ({ 'data-row-id': row.id })}
  onSortChange={(sort) => updateUrl(sort)}
>
  <svelte:fragment slot="cell" let:row let:column let:value>
    {#if column.key === 'actions'}
      <button type="button">Open</button>
    {:else}
      {value}
    {/if}
  </svelte:fragment>
</DataTable>
```

Set `preserveScrollOnSort={false}` when a page should intentionally return to
the top after sorting. `DataTable` headers are sticky by default. Use
`stickyHeader={false}` to disable this, or set `stickyHeaderOffset` when an app
has a fixed or sticky navbar. The offset accepts any browser CSS length such as
`64px`, `4rem`, or `calc(...)`, and it is used both for the fixed header
position and for the scroll threshold. When the original header top reaches the
offset, a synchronized fixed header takes over while the original header keeps
its layout space. The older `stickyHeaderTop` prop and
`--suu-table-sticky-top` CSS variable remain supported.

## Theme variables

The package ships plain CSS and CSS variables. Override variables globally or
inside a theme root:

```css
:root {
  --suu-color-bg: #ffffff;
  --suu-color-text: #111827;
  --suu-color-border: #d1d5db;
  --suu-color-accent: #2563eb;
}

[data-theme='dark'] {
  --suu-color-bg: #111827;
  --suu-color-text: #f9fafb;
  --suu-color-border: #374151;
  --suu-color-accent: #60a5fa;
}
```

## Release

Publishing is release-driven:

Do not publish this package as part of consumer-app local integration work.
Create tags, GitHub Releases, or package publishes only when a release is
explicitly requested.

```bash
gh repo create iBobbyTS/svelte-ui-utils --public --source . --remote origin --push
git tag v0.2.0
git push origin v0.2.0
gh release create v0.2.0 --title "v0.2.0" --notes "Publish public npm package"
gh run watch
```

The release workflow runs checks and publishes to the public npm registry with
the repository secret `NPM_TOKEN`. The token must have permission to publish
`@ibobbyts/svelte-ui-utils`; do not commit it to this repository.

## Bun install verification

The repository includes a `Bun Consumer Check` workflow. It creates a temporary
consumer project and installs the released npm version without registry-specific
tokens:

```bash
bun add @ibobbyts/svelte-ui-utils@0.2.0 svelte
```

Use it after each release when a Bun-based project will consume the package.
