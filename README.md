# svelte-ui-utils

Reusable Svelte 5 UI utilities published to the npm registry as
`@ibobbyts/svelte-ui-utils`.

## Install

Install from the public npm registry. No GitHub Packages token is required.

With Bun:

```bash
bun add @ibobbyts/svelte-ui-utils@0.2.3
```

Canonical Bun pull address:

```text
@ibobbyts/svelte-ui-utils@0.2.3
```

With npm:

```bash
npm install @ibobbyts/svelte-ui-utils@0.2.3
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
  import { DropdownSearch, DropdownSearchMultiSelect } from '@ibobbyts/svelte-ui-utils/dropdown-search';
  import { Dialog, ConfirmDialog, InputDialog, CsvUploadDialog, ImagePreviewDialog, PasswordCopyDialog } from '@ibobbyts/svelte-ui-utils/dialog';
  import { DataTable, DateRangeFilter, FilterTable, NumberRangeFilter } from '@ibobbyts/svelte-ui-utils/table';
</script>
```

The package root also re-exports the public modules:

```ts
import { ToastManager, Dropdown, DropdownSearch, Dialog, DataTable } from '@ibobbyts/svelte-ui-utils';
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

## Dropdown

Dropdown menus default to `placement="auto"` and open toward whichever side of
the trigger has more available viewport space. The direction is recalculated
while the menu is open when the viewport is resized or a scroll container
moves. Set `placement="up"` or `placement="down"` to force a direction. Use
`fitViewport={true}` as well to constrain the panel height to the chosen side.

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
  closeOnValid={true}
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
Set `closeOnValid={true}` to hide the result list after validation finds a
usable exact match. The default is `false`, so existing validated searches keep
showing their current result list until the field closes or the user selects an
option.
Use `showOptionsOnFocus={true}` with `focusOptions` to show a controlled set of
options as soon as the field receives focus, including when the current value is
empty or already valid. Pass `footerText` to render a non-selectable note below
the options, separated by a divider.
When the input has text, `DropdownSearch` shows an internal clear button on the
right side of the field. Use `clearLabel` to localize that button's accessible
label, or use `language` to select the package default.
Use `width`, `minWidth`, and `maxWidth` to size the control directly when a
wrapper is not convenient.
Server-side code and Node tests that only need pure helpers should import from
`@ibobbyts/svelte-ui-utils/dropdown-search/state` so they do not load Svelte
component files.

Set `multiselect={true}` when the search box should collect multiple selected
items as chips. `DropdownSearchMultiSelect` is a convenience wrapper with the
same controlled contract:

```svelte
<script lang="ts">
  import { DropdownSearchMultiSelect, type DropdownSearchItem } from '@ibobbyts/svelte-ui-utils/dropdown-search';

  let selectedMembers: DropdownSearchItem[] = [];
</script>

<DropdownSearchMultiSelect
  language="en_us"
  placeholder="Search members"
  selectedItems={selectedMembers}
  selectedItemsLabel="Selected members"
  removeSelectedItemLabel={(item) => `Remove ${item.title}`}
  {loadOptions}
  onSelectedItemsChange={(items) => {
    selectedMembers = items;
  }}
/>
```

In multiselect mode, the text input remains a search query. Selecting an item
adds or removes it from `selectedItems`, clears the query, and emits both
`onChange` and `onSelectedItemsChange`.

## SortableList

`SortableList` provides controlled vertical HTML5 drag-and-drop ordering. Each
item has a string `id` (and may contain any additional fields); `getId` can
project a different string key while retaining that typed item contract. The
caller owns the item array and receives the reordered array through
`onReorder`. Use the third snippet argument to attach drag bindings to a
dedicated handle. `listTag` and `itemTag` can be changed when the list must
render valid table markup such as direct `<tr>` children under `<tbody>`.

```svelte
<script lang="ts">
  import { SortableList } from '@ibobbyts/svelte-ui-utils/sortable-list';

  let items = [{ id: 'a', label: 'First' }, { id: 'b', label: 'Second' }];
</script>

<SortableList {items} onReorder={(next) => (items = next)}>
  {#snippet children(item, _index, handle)}
    <div {...handle} aria-label={`Drag ${item.label}`}>⠿</div>
    <span>{item.label}</span>
  {/snippet}
</SortableList>
```

Dragging over the target item's upper or lower half displays a before/after
insertion indicator. Dropping on the same item or while `disabled={true}` is a
no-op. The component does not persist order or perform rollback; those remain
the responsibility of the controlled parent.

## OrderedListEditor

`OrderedListEditor` is the shared editor for ordered fields. It renders the
provided content first, an optional current/select action next, and a trash-icon
remove action at the far right. Reorder arrows are intentionally not rendered;
use `SortableList` when drag-and-drop ordering is needed. Set
`allowRemoveLast={true}` when an empty list is valid.

```svelte
<script lang="ts">
  import { OrderedListEditor } from '@ibobbyts/svelte-ui-utils/ordered-list';
</script>

<OrderedListEditor items={rows} onremove={(id) => remove(id)}>
  {#snippet children(item)}
    <input value={item.value ?? ''} />
  {/snippet}
</OrderedListEditor>
```

## SortableTable

`SortableTable` is the table-level ordering primitive. It owns the table rows,
the left drag-handle column, and the right trash-icon delete column. Callers
provide only the header cells and the middle row cells through snippets.

```svelte
<SortableTable items={rows} onReorder={reorder} onRemove={remove}>
  {#snippet header()}<th>Name</th><th>Protocol</th>{/snippet}
  {#snippet children(row)}<td>{row.name}</td><td>{row.protocol}</td>{/snippet}
</SortableTable>
```

## Dialogs

```svelte
<script lang="ts">
  import { ConfirmDialog, Dialog, InputDialog } from '@ibobbyts/svelte-ui-utils/dialog';

  let dialogOpen = false;
  let confirmOpen = false;
  let inputOpen = false;
  let passwordOpen = false;
  let name = '';
</script>

<button type="button" on:click={() => (dialogOpen = true)}>Open dialog</button>

<Dialog
  open={dialogOpen}
  title="Edit record"
  description="Update the shared fields."
  padding="12px 16px"
  closeLabel="Close dialog"
  blurBackdrop={true}
  showCountdown={true}
  countdownDurationMs={30000}
  onClose={() => (dialogOpen = false)}
>
  <p>Dialog body content goes here.</p>
  <svelte:fragment slot="footer">
    <button type="button" class="suu-dialog__button" on:click={() => (dialogOpen = false)}>Cancel</button>
    <button type="button" class="suu-dialog__button suu-dialog__button--primary">Save</button>
  </svelte:fragment>
</Dialog>

<ConfirmDialog
  open={confirmOpen}
  title="Delete file"
  message="This cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  intent="danger"
  onClose={() => (confirmOpen = false)}
  onConfirm={() => {
    confirmOpen = false;
  }}
/>

<InputDialog
  open={inputOpen}
  title="Rename"
  inputLabel="Name"
  bind:inputValue={name}
  onClose={() => (inputOpen = false)}
  onConfirm={(value) => {
    name = value;
    inputOpen = false;
  }}
/>

<PasswordCopyDialog
  open={passwordOpen}
  title="Temporary password"
  message="This value is shown only once."
  value="Abc123xy"
  valueLabel="Password"
  copyLabel="Copy password"
  copiedLabel="Copied"
  doneLabel="Done"
  onClose={() => (passwordOpen = false)}
/>
```

Dialog components are controlled by the consuming app. `Dialog` calls `onClose`
from the close button, backdrop, or Escape key when dismissible; it does not
mutate `open` internally. Set `dimBackdrop={false}` to disable background
darkening, `blurBackdrop={true}` to blur content behind the dialog, and
`showCountdown={true}` with `countdownDurationMs` to show a toast-style top
countdown bar. The optional `padding` prop accepts a CSS padding shorthand and
applies it consistently to the dialog header, body, and footer. The default
section-specific spacing is preserved when `padding` is omitted, and the same
prop is available on all dialog wrapper components.

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
  menuAlign="left"
  onChange={(next) => {
    pageSize = next;
  }}
/>
```

`Dropdown` is a controlled select-like component for simple option lists. Use
`placement="up"` when the menu should open above the trigger, such as bottom
pagination bars. Use `menuAlign="left"` when the expanded menu should share the
trigger's left edge; the default is `right` for backward compatibility.
`fitContent` can be combined with `menuAlign="left"` to size the menu to its
longest option while keeping its left edge aligned. `DataTable` uses this same
component for its page-size picker.

The dropdown panel defaults to the viewport height (`100vh`) and remains
scrollable when its contents exceed that height. When `fitViewport` is enabled,
the component replaces that default with the space available above or below the
trigger.

The original flat `options` API and all default behavior remain unchanged. New
callers may opt into grouped options with `optionGroups`; each group can have an
optional accessible label and its options keep the same keyboard and disabled
semantics. `width`, `minWidth`, `maxWidth`, and `className` are optional styling
hooks. `onTriggerClick` runs before the dropdown toggles, so a nested control
can stop event propagation without preventing the dropdown from opening.

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

`filter.select` uses the shared `Dropdown` component, so select filters keep the
same menu, keyboard, and visual behavior as standalone dropdowns.

If a dropdown-style filter appears clipped, check the parent containers first.
`DropdownSearch` renders its result list as an absolutely positioned child, so
any ancestor with `overflow: hidden`, `overflow: auto`, or `overflow: scroll`
can clip the menu even when the menu has a high `z-index`. Keep the nearest
filter container at `overflow: visible`, or move the clipping/scrolling behavior
to a parent that does not wrap the dropdown menu directly.

`dateRange` renders two browser date inputs, preset buttons, and quick month/year
selects. The presets are `last 24 hours`, `last 7 days`, `last 30 days`,
`today`, `this week`, `this month`, and `this year`. Manual changes and quick
month/year changes emit `{ startDate, endDate, preset: null }`. When the month is
selected first, the year select fills with the most recent matching year. For
example, in July 2026, July resolves to 2026 and August resolves to 2025. Pass
`defaultPreset` to apply a preset on mount when the current value is empty.
Clicking the currently active preset clears both date inputs and emits an empty
range. `thisWeek`, `thisMonth`, and `thisYear` cover the complete calendar
period, including days after today. The `last24Hours` preset also emits
`startDateTime` and `endDateTime` so
a consuming app can run an exact timestamp query while still showing the covered
dates in the inputs.

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

Do not publish this package as part of consumer-app local integration work.
Publish only when a release is explicitly requested. Releases are published
directly from the maintainer's machine to npm; do not create a GitHub Actions
secret or a GitHub Release for package publishing.

The npm token is exported as `NPM_TOKEN` from `~/.zshrc`. After updating the
package version, run the validation and publish commands locally:

```bash
npm run check
npm test
npm run package
npm publish --access public
```

Never commit the npm token or copy it into repository settings.

## Bun install verification

The repository includes a `Bun Consumer Check` workflow. It creates a temporary
consumer project and installs the released npm version without registry-specific
tokens:

```bash
bun add @ibobbyts/svelte-ui-utils@0.2.0 svelte
```

Use it after each release when a Bun-based project will consume the package.
