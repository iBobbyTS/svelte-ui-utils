<script lang="ts">
  import DropdownSearch from '../dropdown-search/DropdownSearch.svelte';
  import DateRangeFilter from './DateRangeFilter.svelte';
  import NumberRangeFilter from './NumberRangeFilter.svelte';
  import type { DropdownSearchChangeDetail, DropdownSearchItem, DropdownSearchStatus } from '../dropdown-search/types.js';
  import type { DateRangeFilterValue, FilterDefinition, FilterState, FilterValue, NumberRangeFilterValue } from './types.js';

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

  function dateRangeValue(value: FilterValue): DateRangeFilterValue {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return {
        startDate: typeof record.startDate === 'string' ? record.startDate : '',
        endDate: typeof record.endDate === 'string' ? record.endDate : '',
        preset: typeof record.preset === 'string' ? (record.preset as DateRangeFilterValue['preset']) : null,
        startDateTime: typeof record.startDateTime === 'string' ? record.startDateTime : undefined,
        endDateTime: typeof record.endDateTime === 'string' ? record.endDateTime : undefined
      };
    }

    return { startDate: '', endDate: '', preset: null };
  }

  function numberRangeValue(value: FilterValue): NumberRangeFilterValue {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return {
        min: typeof record.min === 'number' && Number.isFinite(record.min) ? record.min : null,
        max: typeof record.max === 'number' && Number.isFinite(record.max) ? record.max : null
      };
    }

    return { min: null, max: null };
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
        {:else if definition.type === 'dateRange'}
          <DateRangeFilter
            value={dateRangeValue(filters[definition.key])}
            startLabel={definition.startLabel ?? 'Start date'}
            endLabel={definition.endLabel ?? 'End date'}
            presetLabels={definition.presetLabels ?? {}}
            now={definition.now ?? (() => new Date())}
            weekStartsOn={definition.weekStartsOn ?? 1}
            onChange={(detail) => setFilter(definition.key, detail)}
          />
        {:else if definition.type === 'numberRange'}
          <NumberRangeFilter
            value={numberRangeValue(filters[definition.key])}
            minLabel={definition.minLabel ?? 'Min'}
            maxLabel={definition.maxLabel ?? 'Max'}
            prefixLabel={definition.prefixLabel ?? ''}
            min={definition.min}
            max={definition.max}
            step={definition.step ?? 'any'}
            onChange={(detail) => setFilter(definition.key, detail)}
          />
        {/if}
      </fieldset>
    {/each}
  </slot>
</div>
