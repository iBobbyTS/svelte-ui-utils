# svelte-ui-utils

Reusable Svelte 5 UI utilities published as `@ibobbyts/svelte-ui-utils`.

## Install

Install the public GitHub source package with Bun:

```bash
bun add github:iBobbyTS/svelte-ui-utils
```

The package keeps built `dist/` files in the repository so GitHub installs work
without an npm or GitHub Packages token.

GitHub Packages' npm registry is also available, but it requires authentication
for installing public packages. Add GitHub Packages registry mapping and an auth
token to the consuming project:

```ini
@ibobbyts:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

The token must be a classic GitHub token with `read:packages`. With npm:

```bash
npm install @ibobbyts/svelte-ui-utils
```

With Bun:

```bash
GITHUB_PACKAGES_TOKEN=<token> bun add @ibobbyts/svelte-ui-utils@0.1.1
```

Import the stylesheet once in your app entry:

```ts
import '@ibobbyts/svelte-ui-utils/style.css';
```

## Module imports

```svelte
<script lang="ts">
  import { ToastManager, toast } from '@ibobbyts/svelte-ui-utils/toast';
  import { DropdownSearch } from '@ibobbyts/svelte-ui-utils/dropdown-search';
  import { DataTable, DateRangeFilter, FilterTable, NumberRangeFilter } from '@ibobbyts/svelte-ui-utils/table';
</script>
```

The package root also re-exports all three modules:

```ts
import { ToastManager, DropdownSearch, DataTable } from '@ibobbyts/svelte-ui-utils';
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

<ToastManager closeLabel="Close" />
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
  placeholder="Search"
  debounceMs={500}
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
Use `width`, `minWidth`, and `maxWidth` to size the control directly when a
wrapper is not convenient.
Server-side code and Node tests that only need pure helpers should import from
`@ibobbyts/svelte-ui-utils/dropdown-search/state` so they do not load Svelte
component files.

## DataTable

```svelte
<script lang="ts">
  import { DataTable } from '@ibobbyts/svelte-ui-utils/table';

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'createdAt', header: 'Created', sortable: true }
  ];

  let sort = null;
  let page = 1;
  let pageSize = 20;
</script>

<DataTable
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
default, including a page-size selector. Use `pageSizeLabel` to localize the
selector label and `showPagination={false}` for static tables. Sortable headers
preserve the current window scroll position by default and wait for an async
`onSortChange` before restoring scroll position.

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
          loadOptions,
          onChange: (detail) => updateSearch(detail)
        }),
        filter.button({ icon: 'search', label: 'Find', onClick: submitSearch })
      ])
    }
  ];
</script>

<FilterTable rows={filterRows} />
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
preset: null }`. The `last24Hours` preset also emits `startDateTime` and
`endDateTime` so a consuming app can run an exact timestamp query while still
showing the covered dates in the inputs.

`numberRange` renders min/max number inputs and supports `prefixLabel`, for
example `$` for currency filters.

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
git tag v0.1.1
git push origin v0.1.1
gh release create v0.1.1 --title "v0.1.1" --notes "Add DateRangeFilter and NumberRangeFilter"
gh run watch
```

The release workflow runs checks and publishes to GitHub Packages with the
workflow `GITHUB_TOKEN`. If the first package appears private, change package
visibility to public in GitHub package settings.

## Bun install verification

The repository includes a `Bun Consumer Check` workflow. It creates a temporary
consumer project and installs the public GitHub source package without a token:

```bash
bun add github:iBobbyTS/svelte-ui-utils svelte
```

Use it after each release when a Bun-based project will consume the package.
