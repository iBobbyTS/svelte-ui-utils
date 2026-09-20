<svelte:options runes={false} />

<script lang="ts">
  import { onMount } from 'svelte';
  import Dropdown from '../dropdown/Dropdown.svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import { endOfMonth, formatDate, isDateRangePreset, resolveDateRangePreset, startOfDay } from './date-range.js';
  import type {
    CustomDateRangePreset,
    DateRangeFilterValue,
    DateRangePreset,
    DateRangePresetEntry,
    DateRangePresetSelect
  } from './types.js';

  export let value: DateRangeFilterValue = {
    startDate: '',
    endDate: '',
    preset: null
  };
  export let language: UiLanguage = 'en_us';
  export let startLabel: string | undefined = undefined;
  export let endLabel: string | undefined = undefined;
  export let presets: DateRangePresetEntry[] | undefined = undefined;
  export let presetLabels: Partial<Record<string, string>> = {};
  export let defaultPreset: string | undefined = undefined;
  export let quickYears: number[] | undefined = undefined;
  export let now: () => Date = () => new Date();
  export let weekStartsOn: 0 | 1 = 1;
  export let onChange: ((value: DateRangeFilterValue) => void) | undefined = undefined;

  const defaultPresetEntries: DateRangePresetEntry[] = [
    'last24Hours',
    'last7Days',
    'last30Days',
    'divider',
    'today',
    'thisWeek',
    'thisMonth',
    'thisYear',
    'divider',
    'quickMonth',
    'quickYear'
  ];
  const monthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);
  const structuralEntryKeys = new Set(['quickMonth', 'quickYear', 'divider']);

  let quickYear = '';
  let quickMonth = '';

  $: messages = getUiMessages(language);
  $: resolvedStartLabel = startLabel ?? messages.dateRange.startLabel;
  $: resolvedEndLabel = endLabel ?? messages.dateRange.endLabel;
  $: presetEntries = presets ?? defaultPresetEntries;
  $: currentYear = startOfDay(now()).getFullYear();
  $: quickYearOptions = quickYears ?? [currentYear - 1, currentYear, currentYear + 1];
  $: quickMonthOptions = [
    { label: messages.dateRange.quickMonthPlaceholder, value: '' },
    ...monthNumbers.map((month) => ({ label: monthLabel(month), value: String(month) }))
  ];
  $: quickYearDropdownOptions = [
    { label: messages.dateRange.quickYearPlaceholder, value: '' },
    ...quickYearOptions.map((year) => ({ label: String(year), value: String(year) }))
  ];

  function resolveYearForMonth(month: number) {
    const today = startOfDay(now());
    return month <= today.getMonth() + 1 ? today.getFullYear() : today.getFullYear() - 1;
  }

  function resolveQuickRange(year: number, month: number | null): DateRangeFilterValue {
    const start = month === null ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
    const end = month === null ? new Date(year, 11, 31) : endOfMonth(year, month);

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
      preset: null
    };
  }

  function clearQuickSelection() {
    quickYear = '';
    quickMonth = '';
  }

  function isSelectEntry(entry: DateRangePresetEntry): entry is DateRangePresetSelect {
    return typeof entry === 'object' && 'type' in entry && entry.type === 'select';
  }

  function isPresetButtonEntry(entry: DateRangePresetEntry): entry is DateRangePreset | CustomDateRangePreset {
    if (typeof entry === 'string') {
      return !structuralEntryKeys.has(entry);
    }
    return !isSelectEntry(entry);
  }

  function presetKeyOf(entry: DateRangePreset | CustomDateRangePreset): string {
    return typeof entry === 'string' ? entry : entry.key;
  }

  function resolvePresetEntry(entry: DateRangePreset | CustomDateRangePreset): DateRangeFilterValue {
    if (typeof entry === 'string') {
      return resolveDateRangePreset(entry, now(), weekStartsOn);
    }

    const range = entry.resolve({ now: now(), weekStartsOn });
    return {
      startDate: formatDate(range.startDate),
      endDate: formatDate(range.endDate),
      preset: entry.key
    };
  }

  function findPresetEntryByKey(key: string): DateRangePreset | CustomDateRangePreset | undefined {
    return presetEntries
      .filter(isPresetButtonEntry)
      .find((entry) => presetKeyOf(entry) === key);
  }

  function emit(next: DateRangeFilterValue) {
    value = next;
    onChange?.(next);
  }

  function emptyRange(): DateRangeFilterValue {
    return {
      startDate: '',
      endDate: '',
      preset: null
    };
  }

  function isEmptyRange(nextValue: DateRangeFilterValue) {
    return !nextValue.startDate && !nextValue.endDate && nextValue.preset === null;
  }

  function updateDate(part: 'startDate' | 'endDate', nextValue: string) {
    clearQuickSelection();
    emit({
      startDate: part === 'startDate' ? nextValue : value.startDate,
      endDate: part === 'endDate' ? nextValue : value.endDate,
      preset: null
    });
  }

  function updateQuickYear(nextValue: string) {
    quickYear = nextValue;

    if (!nextValue) {
      clearQuickSelection();
      emit(emptyRange());
      return;
    }

    emit(resolveQuickRange(Number(nextValue), quickMonth ? Number(quickMonth) : null));
  }

  function updateQuickMonth(nextValue: string) {
    quickMonth = nextValue;

    if (!nextValue) {
      if (quickYear) {
        emit(resolveQuickRange(Number(quickYear), null));
      } else {
        emit(emptyRange());
      }
      return;
    }

    if (!quickYear) {
      quickYear = String(resolveYearForMonth(Number(nextValue)));
    }

    emit(resolveQuickRange(Number(quickYear), Number(nextValue)));
  }

  function applyPresetEntry(entry: DateRangePreset | CustomDateRangePreset) {
    clearQuickSelection();
    if (value.preset === presetKeyOf(entry)) {
      emit(emptyRange());
      return;
    }

    emit(resolvePresetEntry(entry));
  }

  function labelFor(entry: DateRangePreset | CustomDateRangePreset) {
    if (typeof entry === 'string') {
      return presetLabels[entry] ?? messages.dateRange.presetLabels[entry] ?? entry;
    }

    return entry.label ?? presetLabels[entry.key] ?? entry.key;
  }

  function monthLabel(month: number) {
    return messages.dateRange.monthLabels[month - 1] ?? String(month);
  }

  onMount(() => {
    if (!defaultPreset || !isEmptyRange(value)) {
      return;
    }

    const entry = findPresetEntryByKey(defaultPreset) ??
      (isDateRangePreset(defaultPreset) ? defaultPreset : undefined);
    if (entry) {
      emit(resolvePresetEntry(entry));
    }
  });
</script>

<div class="suu-date-range-filter">
  <label class="suu-range-field">
    <span>{resolvedStartLabel}</span>
    <input
      type="date"
      value={value.startDate}
      on:change={(event) => updateDate('startDate', (event.currentTarget as HTMLInputElement).value)}
    />
  </label>
  <label class="suu-range-field">
    <span>{resolvedEndLabel}</span>
    <input
      type="date"
      value={value.endDate}
      on:change={(event) => updateDate('endDate', (event.currentTarget as HTMLInputElement).value)}
    />
  </label>
  <div class="suu-filter-preset-row">
    {#each presetEntries as entry}
      {#if entry === 'divider'}
        <span class="suu-filter-preset-divider" aria-hidden="true"></span>
      {:else if entry === 'quickMonth'}
        <label class="suu-filter-preset-select">
          <span class="suu-visually-hidden">{messages.dateRange.quickMonthLabel}</span>
          <Dropdown
            ariaLabel={messages.dateRange.quickMonthLabel}
            value={quickMonth}
            options={quickMonthOptions}
            fitViewport={true}
            fitContent={true}
            onChange={(nextValue) => updateQuickMonth(String(nextValue))}
          />
        </label>
      {:else if entry === 'quickYear'}
        <label class="suu-filter-preset-select">
          <span class="suu-visually-hidden">{messages.dateRange.quickYearLabel}</span>
          <Dropdown
            ariaLabel={messages.dateRange.quickYearLabel}
            value={quickYear}
            options={quickYearDropdownOptions}
            fitViewport={true}
            fitContent={true}
            onChange={(nextValue) => updateQuickYear(String(nextValue))}
          />
        </label>
      {:else if isSelectEntry(entry)}
        <label class="suu-filter-preset-select">
          <span class="suu-visually-hidden">{entry.ariaLabel ?? entry.key}</span>
          <Dropdown
            ariaLabel={entry.ariaLabel ?? entry.key}
            value={entry.value}
            options={entry.options}
            fitViewport={true}
            fitContent={true}
            onChange={(nextValue) => {
              if (isSelectEntry(entry)) {
                void entry.onChange(String(nextValue));
              }
            }}
          />
        </label>
      {:else}
        <button
          type="button"
          class="suu-filter-preset"
          class:suu-filter-preset--active={value.preset === presetKeyOf(entry)}
          on:click={() => applyPresetEntry(entry)}
        >
          {labelFor(entry)}
        </button>
      {/if}
    {/each}
  </div>
</div>
