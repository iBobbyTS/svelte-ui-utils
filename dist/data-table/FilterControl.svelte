<script lang="ts">
  import DropdownSearch from '../dropdown-search/DropdownSearch.svelte';
  import type { UiLanguage } from '../i18n.js';
  import DateRangeFilter from './DateRangeFilter.svelte';
  import NumberRangeFilter from './NumberRangeFilter.svelte';
  import type { FilterControl } from './types.js';

  export let control: FilterControl;
  export let language: UiLanguage = 'en_us';

  function actionClass(variant: string | undefined): string {
    return `suu-filter-table__action suu-filter-table__action--${variant ?? 'outline'}`;
  }

  function toggleCheckbox(value: string | number, checked: boolean) {
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

  function runSelect(event: Event) {
    if (control.type === 'select') {
      void control.onChange((event.currentTarget as HTMLSelectElement).value);
    }
  }
</script>

{#if control.type === 'container'}
  <div class="suu-filter-table__control-row">
    {#each control.controls as child}
      <svelte:self control={child} {language} />
    {/each}
  </div>
{:else if control.type === 'checkbox'}
  <div class="suu-filter-table__options">
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
  <DropdownSearch
    value={control.value}
    selectedItem={control.selectedItem}
    status={control.status}
    placeholder={control.placeholder ?? ''}
    ariaLabel={control.ariaLabel}
    debounceMs={control.debounceMs ?? 500}
    limit={control.limit ?? 10}
    minLength={control.minLength ?? 1}
    {language}
    noResultsText={control.noResultsText}
    loadingText={control.loadingText}
    clearLabel={control.clearLabel}
    searchOnExternalValueChange={control.searchOnExternalValueChange ?? false}
    width={control.width}
    minWidth={control.minWidth}
    maxWidth={control.maxWidth}
    getItemValue={control.getItemValue ?? ((item) => item.title)}
    loadOptions={control.loadOptions}
    onChange={(detail) => control.type === 'dropdownSearch' && void control.onChange(detail)}
  />
{:else if control.type === 'dateRange'}
  <DateRangeFilter
    value={control.value}
    {language}
    startLabel={control.startLabel}
    endLabel={control.endLabel}
    presetLabels={control.presetLabels ?? {}}
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
  <select class="suu-filter-table__select" aria-label={control.ariaLabel} value={control.value} on:change={runSelect}>
    {#each control.options as option}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
  </select>
{/if}
