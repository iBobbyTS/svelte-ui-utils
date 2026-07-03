<svelte:options runes={false} />

<script lang="ts">
  import { onMount } from 'svelte';
  import Dropdown from '../dropdown/Dropdown.svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type { DateRangeFilterValue, DateRangePreset } from './types.js';

  export let value: DateRangeFilterValue = {
    startDate: '',
    endDate: '',
    preset: null
  };
  export let language: UiLanguage = 'en_us';
  export let startLabel: string | undefined = undefined;
  export let endLabel: string | undefined = undefined;
  export let presetLabels: Partial<Record<DateRangePreset, string>> = {};
  export let defaultPreset: DateRangePreset | undefined = undefined;
  export let now: () => Date = () => new Date();
  export let weekStartsOn: 0 | 1 = 1;
  export let onChange: ((value: DateRangeFilterValue) => void) | undefined = undefined;

  const presets: DateRangePreset[] = [
    'last24Hours',
    'last7Days',
    'last30Days',
    'today',
    'thisWeek',
    'thisMonth',
    'thisYear'
  ];
  const monthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

  let quickYear = '';
  let quickMonth = '';

  $: messages = getUiMessages(language);
  $: resolvedStartLabel = startLabel ?? messages.dateRange.startLabel;
  $: resolvedEndLabel = endLabel ?? messages.dateRange.endLabel;
  $: currentYear = startOfDay(now()).getFullYear();
  $: quickYearOptions = Array.from({ length: 21 }, (_, index) => currentYear - index);
  $: quickMonthOptions = [
    { label: messages.dateRange.quickMonthPlaceholder, value: '' },
    ...monthNumbers.map((month) => ({ label: monthLabel(month), value: String(month) }))
  ];
  $: quickYearDropdownOptions = [
    { label: messages.dateRange.quickYearPlaceholder, value: '' },
    ...quickYearOptions.map((year) => ({ label: String(year), value: String(year) }))
  ];

  function pad(value: number) {
    return String(value).padStart(2, '0');
  }

  function formatDate(date: Date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function formatDateTime(date: Date) {
    return `${formatDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function startOfWeek(date: Date) {
    const start = startOfDay(date);
    const day = start.getDay();
    const offset = weekStartsOn === 1 ? (day + 6) % 7 : day;
    return addDays(start, -offset);
  }

  function endOfMonth(year: number, month: number) {
    return new Date(year, month, 0);
  }

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

  function resolvePreset(preset: DateRangePreset): DateRangeFilterValue {
    const current = now();
    const today = startOfDay(current);

    if (preset === 'last24Hours') {
      const start = new Date(current.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: formatDate(start),
        endDate: formatDate(current),
        preset,
        startDateTime: formatDateTime(start),
        endDateTime: formatDateTime(current)
      };
    }

    if (preset === 'last7Days') {
      return {
        startDate: formatDate(addDays(today, -6)),
        endDate: formatDate(today),
        preset
      };
    }

    if (preset === 'last30Days') {
      return {
        startDate: formatDate(addDays(today, -29)),
        endDate: formatDate(today),
        preset
      };
    }

    if (preset === 'thisWeek') {
      return {
        startDate: formatDate(startOfWeek(today)),
        endDate: formatDate(today),
        preset
      };
    }

    if (preset === 'thisMonth') {
      return {
        startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate: formatDate(today),
        preset
      };
    }

    if (preset === 'thisYear') {
      return {
        startDate: formatDate(new Date(today.getFullYear(), 0, 1)),
        endDate: formatDate(today),
        preset
      };
    }

    return {
      startDate: formatDate(today),
      endDate: formatDate(today),
      preset
    };
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

  function applyPreset(preset: DateRangePreset) {
    clearQuickSelection();
    if (value.preset === preset) {
      emit(emptyRange());
      return;
    }

    emit(resolvePreset(preset));
  }

  function labelFor(preset: DateRangePreset) {
    return presetLabels[preset] ?? messages.dateRange.presetLabels[preset];
  }

  function monthLabel(month: number) {
    return messages.dateRange.monthLabels[month - 1] ?? String(month);
  }

  onMount(() => {
    if (defaultPreset && isEmptyRange(value)) {
      emit(resolvePreset(defaultPreset));
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
    {#each presets as preset}
      <button
        type="button"
        class="suu-filter-preset"
        class:suu-filter-preset--active={value.preset === preset}
        on:click={() => applyPreset(preset)}
      >
        {labelFor(preset)}
      </button>
      {#if preset === 'last30Days' || preset === 'thisYear'}
        <span class="suu-filter-preset-divider" aria-hidden="true"></span>
      {/if}
    {/each}
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
  </div>
</div>
