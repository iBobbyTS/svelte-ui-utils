<script lang="ts">
  import DropdownSearch from '../dropdown-search/DropdownSearch.svelte';
  import type { DropdownSearchChangeDetail, DropdownSearchItem, DropdownSearchStatus } from '../dropdown-search/types.js';
  import type { FilterDefinition, FilterState, FilterValue } from './types.js';

  export let definitions: FilterDefinition[] = [];
  export let filters: FilterState = {};
  export let onFiltersChange: ((filters: FilterState) => void) | undefined = undefined;

  let dropdownValues: Record<string, string> = {};
  let dropdownStatuses: Record<string, DropdownSearchStatus> = {};
  let dropdownSelections: Record<string, DropdownSearchItem | null> = {};

  function setFilter(key: string, value: FilterValue) {
    const next = { ...filters, [key]: value };
    filters = next;
    onFiltersChange?.(next);
  }

  function toggleCheckbox(key: string, value: string | number, checked: boolean) {
    const current = Array.isArray(filters[key]) ? ([...(filters[key] as Array<string | number>)] as Array<string | number>) : [];
    const next = checked ? [...new Set([...current, value])] : current.filter((item) => item !== value);
    setFilter(key, next);
  }

  function handleDropdownChange(key: string, detail: DropdownSearchChangeDetail) {
    dropdownValues = { ...dropdownValues, [key]: detail.value };
    dropdownStatuses = { ...dropdownStatuses, [key]: detail.status };
    dropdownSelections = { ...dropdownSelections, [key]: detail.selectedItem };
    setFilter(key, {
      value: detail.value,
      selectedItem: detail.selectedItem,
      status: detail.status
    });
  }
</script>

<div class="suu-filter-box">
  <slot {filters} updateFilter={setFilter}>
    {#each definitions as definition (definition.key)}
      <fieldset class="suu-filter-box__group">
        <legend>{definition.label}</legend>
        {#if definition.type === 'checkbox'}
          <div class="suu-filter-box__options">
            {#each definition.options as option}
              <label class="suu-filter-box__option">
                <input
                  type="checkbox"
                  value={option.value}
                  disabled={option.disabled}
                  checked={Array.isArray(filters[definition.key]) && (filters[definition.key] as Array<string | number>).includes(option.value)}
                  on:change={(event) => toggleCheckbox(definition.key, option.value, (event.currentTarget as HTMLInputElement).checked)}
                />
                <span>{option.label}</span>
              </label>
            {/each}
          </div>
        {:else if definition.type === 'radio'}
          <div class="suu-filter-box__options">
            {#each definition.options as option}
              <label class="suu-filter-box__option">
                <input
                  type="radio"
                  name={`suu-filter-${definition.key}`}
                  value={option.value}
                  disabled={option.disabled}
                  checked={filters[definition.key] === option.value}
                  on:change={() => setFilter(definition.key, option.value)}
                />
                <span>{option.label}</span>
              </label>
            {/each}
          </div>
        {:else if definition.type === 'dropdownSearch'}
          <DropdownSearch
            value={dropdownValues[definition.key] ?? ''}
            selectedItem={dropdownSelections[definition.key] ?? null}
            status={dropdownStatuses[definition.key] ?? 'empty'}
            placeholder={definition.placeholder ?? ''}
            debounceMs={definition.debounceMs ?? 500}
            limit={definition.limit ?? 10}
            minLength={definition.minLength ?? 1}
            loadOptions={definition.loadOptions}
            onChange={(detail) => handleDropdownChange(definition.key, detail)}
          />
        {/if}
      </fieldset>
    {/each}
  </slot>
</div>
