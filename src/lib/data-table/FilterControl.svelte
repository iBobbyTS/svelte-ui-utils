<svelte:options runes={false} />

<script lang="ts">
  import Dropdown from '../dropdown/Dropdown.svelte';
  import DropdownMultiSelect from '../dropdown/DropdownMultiSelect.svelte';
  import type {
    DropdownLoadContext,
    DropdownLoadOptionsResult,
    DropdownOption,
    DropdownSelection
  } from '../dropdown/types.js';
  import type { UiLanguage } from '../i18n.js';
  import DateRangeFilter from './DateRangeFilter.svelte';
  import NumberRangeFilter from './NumberRangeFilter.svelte';
  import type { DropdownSearchChangeDetail, DropdownSearchItem, FilterControl } from './types.js';

  export let control: FilterControl;
  export let language: UiLanguage = 'en_us';

  function actionClass(variant: string | undefined): string {
    return `suu-filter-table__action suu-filter-table__action--${variant ?? 'outline'}`;
  }

  function toggleCheckbox(value: string, checked: boolean) {
    if (control.type !== 'checkbox') {
      return;
    }

    const current = [...control.value];
    const next = checked ? [...new Set([...current, value])] : current.filter((item) => item !== value);
    void control.onChange(next);
  }

  function runButton() {
    if (control.type === 'button') {
      void control.onClick();
    }
  }

  // The removed DropdownSearch spoke free text in `value` while the root
  // Dropdown reports option identifiers. This adapter keeps the legacy
  // `{ value: label, selectedItem, selectedItems, status }` detail by resolving
  // each identifier back to the item that loadOptions returned.
  let dropdownSearchQuery = '';
  const dropdownSearchItems = new Map<string, DropdownSearchItem>();

  function resolveDropdownSearchItemLabel(item: DropdownSearchItem): string {
    return control.type === 'dropdownSearch' && control.getItemLabel
      ? control.getItemLabel(item)
      : item.label;
  }

  // The root Dropdown types labels against its own option shape; the options it
  // hands back are the very `DropdownSearchItem` objects we returned, so the
  // structural widening is lossless for consumers' getItemLabel callbacks.
  function dropdownSearchOptionLabel(option: DropdownOption): string {
    return resolveDropdownSearchItemLabel(option as DropdownSearchItem);
  }

  function findDropdownSearchItem(identifier: string): DropdownSearchItem | undefined {
    const cached = dropdownSearchItems.get(identifier);
    if (cached !== undefined) {
      return cached;
    }
    if (control.type === 'dropdownSearch' && control.selectedItem?.value === identifier) {
      return control.selectedItem;
    }
    return undefined;
  }

  async function loadDropdownSearchOptions(
    rawQuery: string,
    context: DropdownLoadContext
  ): Promise<DropdownLoadOptionsResult> {
    if (control.type !== 'dropdownSearch') {
      return { options: [] };
    }

    const query = rawQuery.trim();
    // minLength has no root Dropdown counterpart, so the wrapper keeps the old
    // "below threshold returns no options" contract itself.
    if (query.length < (control.minLength ?? 1)) {
      return { options: [] };
    }

    const result = await control.loadOptions(query, context);
    // Stale responses must not seed the identifier cache either.
    if (context.signal.aborted) {
      return { options: [] };
    }
    const items = result?.options ?? [];
    for (const item of items) {
      dropdownSearchItems.set(item.value, item);
    }

    return { options: items };
  }

  function handleDropdownSearchQueryChange(query: string) {
    dropdownSearchQuery = query;
  }

  function handleDropdownSearchChange(selection: DropdownSelection) {
    if (control.type !== 'dropdownSearch') {
      return;
    }

    const identifier = Array.isArray(selection) ? (selection[0] ?? '') : selection;
    // The root Dropdown reports an empty identifier when the user types over a
    // controlled selection (input/value divergence). That divergent-clear is
    // dropped so `onChange` stays a selection-change (submit) event; a real
    // selection always carries a non-empty identifier.
    if (!identifier) {
      return;
    }
    const item = findDropdownSearchItem(identifier);
    const detail: DropdownSearchChangeDetail = {
      value: item ? resolveDropdownSearchItemLabel(item) : identifier,
      selectedItem: item ?? null,
      selectedItems: [],
      status: item ? 'valid' : dropdownSearchQuery.trim() ? 'invalid' : 'empty'
    };
    void control.onChange(detail);
  }

  // External value/selected-item changes rebuild the root Dropdown instance:
  // controlled `value` resets its internal query, results, and draft, and
  // `selectedOptions` then displays the new selection.
  $: dropdownSearchKey = control.type === 'dropdownSearch'
    ? `${control.value}\u0000${control.selectedItem?.value ?? ''}`
    : '';
  // A selected item displays through `selectedOptions`; a free-text external
  // value has no option to resolve and falls back to the Dropdown value itself.
  $: dropdownSearchValue = control.type === 'dropdownSearch'
    ? control.selectedItem
      ? control.selectedItem.value
      : control.value
    : '';
  // The raw item is handed to the Dropdown untouched so its `getItemLabel` prop
  // is the single label conversion on the display path.
  $: dropdownSearchSelectedOptions = control.type === 'dropdownSearch' && control.selectedItem
    ? [control.selectedItem]
    : [];

</script>

{#if control.type === 'container'}
  <div class="suu-filter-table__control-row">
    {#each control.controls as child}
      <svelte:self control={child} {language} />
    {/each}
  </div>
{:else if control.type === 'checkbox'}
  <div class="suu-filter-table__options">
    {#if control.optionGroups?.length}
      {#each control.optionGroups as group, groupIndex}
        {#each group.options as option, optionIndex}
          <label
            class="suu-filter-table__option"
            class:suu-filter-table__option--checked={control.value.includes(option.value)}
            class:suu-filter-table__option--group-end={groupIndex < control.optionGroups.length - 1 && optionIndex === group.options.length - 1}
          >
            <input
              class="suu-filter-table__option-input"
              type="checkbox"
              value={option.value}
              disabled={option.disabled}
              checked={control.value.includes(option.value)}
              on:change={(event) => toggleCheckbox(option.value, (event.currentTarget as HTMLInputElement).checked)}
            />
            <span class="suu-filter-table__option-label">{option.label}</span>
            <span class="suu-filter-table__option-check" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="m5 10 3 3 7-7"></path>
              </svg>
            </span>
          </label>
        {/each}
      {/each}
    {:else}
      {#each control.options as option}
        <label class="suu-filter-table__option" class:suu-filter-table__option--checked={control.value.includes(option.value)}>
          <input
            class="suu-filter-table__option-input"
            type="checkbox"
            value={option.value}
            disabled={option.disabled}
            checked={control.value.includes(option.value)}
            on:change={(event) => toggleCheckbox(option.value, (event.currentTarget as HTMLInputElement).checked)}
          />
          <span class="suu-filter-table__option-label">{option.label}</span>
          <span class="suu-filter-table__option-check" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <path d="m5 10 3 3 7-7"></path>
            </svg>
          </span>
        </label>
      {/each}
    {/if}
  </div>
{:else if control.type === 'radio'}
  <div class="suu-filter-table__options">
    {#each control.options as option}
      <label class="suu-filter-table__option" class:suu-filter-table__option--checked={control.value === option.value}>
        <input
          class="suu-filter-table__option-input"
          type="radio"
          value={option.value}
          disabled={option.disabled}
          checked={control.value === option.value}
          on:change={() => control.type === 'radio' && void control.onChange(option.value)}
        />
        <span class="suu-filter-table__option-label">{option.label}</span>
        <span class="suu-filter-table__option-check" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="m5 10 3 3 7-7"></path>
          </svg>
        </span>
      </label>
    {/each}
  </div>
{:else if control.type === 'dropdownSearch'}
  {#key dropdownSearchKey}
    <Dropdown
      value={dropdownSearchValue}
      search
      inputStyle="input"
      portal
      selectedOptions={dropdownSearchSelectedOptions}
      loadOptions={loadDropdownSearchOptions}
      searchDebounceMs={control.debounceMs ?? 500}
      searchLimit={control.limit ?? 10}
      placeholder={control.placeholder ?? ''}
      ariaLabel={control.ariaLabel}
      {language}
      noResultsText={control.noResultsText}
      loadingText={control.loadingText}
      width={control.width}
      minWidth={control.minWidth}
      maxWidth={control.maxWidth}
      getItemLabel={dropdownSearchOptionLabel}
      onChange={handleDropdownSearchChange}
      onSearchChange={handleDropdownSearchQueryChange}
    />
  {/key}
{:else if control.type === 'dateRange'}
  <DateRangeFilter
    value={control.value}
    {language}
    startLabel={control.startLabel}
    endLabel={control.endLabel}
    presets={control.presets}
    presetLabels={control.presetLabels ?? {}}
    defaultPreset={control.defaultPreset}
    quickYears={control.quickYears}
    now={control.now ?? (() => new Date())}
    weekStartsOn={control.weekStartsOn ?? 1}
    onChange={(detail) => control.type === 'dateRange' && void control.onChange(detail)}
  />
{:else if control.type === 'numberRange'}
  <NumberRangeFilter
    value={control.value}
    {language}
    minLabel={control.minLabel}
    maxLabel={control.maxLabel}
    prefixLabel={control.prefixLabel ?? ''}
    min={control.min}
    max={control.max}
    step={control.step ?? 'any'}
    width={control.width}
    onChange={(detail) => control.type === 'numberRange' && void control.onChange(detail)}
  />
{:else if control.type === 'button'}
  <button
    type="button"
    class={actionClass(control.variant)}
    aria-label={control.ariaLabel}
    disabled={control.disabled}
    on:click={runButton}
  >
    {#if control.icon === 'search'}
      <svg class="suu-filter-table__action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m16 16 4 4"></path>
      </svg>
    {:else if control.icon === 'qr'}
      <svg class="suu-filter-table__action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"></path>
        <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"></path>
      </svg>
    {:else if control.icon === 'x'}
      <svg class="suu-filter-table__action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18"></path>
      </svg>
    {/if}
    {#if control.label}
      <span>{control.label}</span>
    {/if}
  </button>
{:else if control.type === 'link'}
  <a class={actionClass(control.variant ?? 'ghost')} href={control.href} aria-label={control.ariaLabel}>
    {#if control.icon === 'search'}
      <svg class="suu-filter-table__action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m16 16 4 4"></path>
      </svg>
    {:else if control.icon === 'qr'}
      <svg class="suu-filter-table__action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"></path>
        <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"></path>
      </svg>
    {:else if control.icon === 'x'}
      <svg class="suu-filter-table__action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18"></path>
      </svg>
    {/if}
    <span>{control.label}</span>
  </a>
{:else if control.type === 'select'}
  <Dropdown
    value={control.value}
    options={control.options}
    ariaLabel={control.ariaLabel}
    fitContent
    onChange={(value) => {
      if (control.type === 'select' && !Array.isArray(value)) {
        void control.onChange(value);
      }
    }}
  />
{:else if control.type === 'dropdown'}
  <Dropdown
    value={control.value}
    multiselect={control.multiselect}
    options={control.options ?? []}
    optionGroups={control.optionGroups}
    groupsCollapsedByDefault={control.groupsCollapsedByDefault}
    search={control.search}
    loadOptions={control.loadOptions}
    searchDebounceMs={control.searchDebounceMs}
    searchLimit={control.searchLimit}
    searchPlaceholder={control.searchPlaceholder}
    errorText={control.errorText}
    ariaLabel={control.ariaLabel}
    placement={control.placement}
    menuAlign={control.menuAlign}
    fitViewport={control.fitViewport}
    fitContent={control.fitContent ?? true}
    disabled={control.disabled}
    width={control.width}
    minWidth={control.minWidth}
    maxWidth={control.maxWidth}
    portal={control.portal}
    onChange={control.onChange}
    onTriggerClick={control.onTriggerClick}
  />
{:else if control.type === 'dropdownMultiSelect'}
  <DropdownMultiSelect
    value={control.value}
    options={control.options}
    optionGroups={control.optionGroups}
    ariaLabel={control.ariaLabel}
    placement={control.placement}
    menuAlign={control.menuAlign}
    fitViewport={control.fitViewport}
    fitContent={control.fitContent ?? true}
    disabled={control.disabled}
    width={control.width}
    minWidth={control.minWidth}
    maxWidth={control.maxWidth}
    portal={control.portal}
    onChange={control.onChange}
    onTriggerClick={control.onTriggerClick}
  />
{/if}
