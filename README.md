# svelte-ui-utils

Reusable Svelte 5 UI utilities published as `@ibobbyts/svelte-ui-utils`.

## Install

GitHub Packages' npm registry requires authentication for installing public
packages. Add GitHub Packages registry mapping and an auth token to the
consuming project:

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
GITHUB_PACKAGES_TOKEN=<token> bun add @ibobbyts/svelte-ui-utils@0.1.0
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
  import { DataTable, Table } from '@ibobbyts/svelte-ui-utils/data-table';
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
Use `searchOnExternalValueChange` for scanner or programmatic input workflows.
Server-side code and Node tests that only need pure helpers should import from
`@ibobbyts/svelte-ui-utils/dropdown-search/state` so they do not load Svelte
component files.

## DataTable

```svelte
<script lang="ts">
  import { DataTable } from '@ibobbyts/svelte-ui-utils/data-table';

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'createdAt', header: 'Created', sortable: true }
  ];

  let state = {
    sort: null,
    pagination: { page: 1, pageSize: 20 },
    filters: {}
  };
</script>

<DataTable
  rows={rows}
  {columns}
  totalRows={totalRows}
  {state}
  tableLayout="auto"
  onStateChange={(next) => (state = next)}
/>
```

`FilterBox` supports custom slots and built-in filter definitions for
`checkbox`, `radio`, and `dropdownSearch`.

Use `Table` directly when pagination and filters are owned by the consuming
page:

```svelte
<Table
  rows={rows}
  {columns}
  rowKey="id"
  tableLayout="fixed"
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
</Table>
```

Sortable headers preserve the current window scroll position by default. Set
`preserveScrollOnSort={false}` when a page should intentionally return to the
top after sorting.

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

```bash
gh repo create iBobbyTS/svelte-ui-utils --public --source . --remote origin --push
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes "Initial Toast, DropdownSearch, and DataTable release"
gh run watch
```

The release workflow runs checks and publishes to GitHub Packages with the
workflow `GITHUB_TOKEN`. If the first package appears private, change package
visibility to public in GitHub package settings.

## Bun install verification

The repository includes a `Bun Consumer Check` workflow. It creates a temporary
consumer project, writes an `.npmrc` that points `@ibobbyts` to GitHub Packages,
uses the workflow `GITHUB_TOKEN`, and runs:

```bash
bun install
```

Use it after each release when a Bun-based project will consume the package.
