<svelte:options runes={false} />

<script lang="ts">
  import { onMount } from 'svelte';
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

  $: messages = getUiMessages(language);
  $: resolvedStartLabel = startLabel ?? messages.dateRange.startLabel;
  $: resolvedEndLabel = endLabel ?? messages.dateRange.endLabel;

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
    emit({
      startDate: part === 'startDate' ? nextValue : value.startDate,
      endDate: part === 'endDate' ? nextValue : value.endDate,
      preset: null
    });
  }

  function applyPreset(preset: DateRangePreset) {
    if (value.preset === preset) {
      emit(emptyRange());
      return;
    }

    emit(resolvePreset(preset));
  }

  function labelFor(preset: DateRangePreset) {
    return presetLabels[preset] ?? messages.dateRange.presetLabels[preset];
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
    {/each}
  </div>
</div>
