<script lang="ts">
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type { NumberRangeFilterValue } from './types.js';

  export let value: NumberRangeFilterValue = {
    min: null,
    max: null
  };
  export let language: UiLanguage = 'en_us';
  export let minLabel: string | undefined = undefined;
  export let maxLabel: string | undefined = undefined;
  export let prefixLabel = '';
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | string = 'any';
  export let onChange: ((value: NumberRangeFilterValue) => void) | undefined = undefined;

  $: messages = getUiMessages(language);
  $: resolvedMinLabel = minLabel ?? messages.numberRange.minLabel;
  $: resolvedMaxLabel = maxLabel ?? messages.numberRange.maxLabel;

  function parseNumber(input: string): number | null {
    if (input.trim() === '') {
      return null;
    }

    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function emit(next: NumberRangeFilterValue) {
    value = next;
    onChange?.(next);
  }

  function update(part: 'min' | 'max', input: string) {
    emit({
      min: part === 'min' ? parseNumber(input) : value.min,
      max: part === 'max' ? parseNumber(input) : value.max
    });
  }
</script>

<div class="suu-number-range-filter">
  <label class="suu-range-field">
    <span>{resolvedMinLabel}</span>
    <div class="suu-input-affix">
      {#if prefixLabel}
        <span class="suu-input-affix__label">{prefixLabel}</span>
      {/if}
      <input
        type="number"
        aria-label={resolvedMinLabel}
        {min}
        {max}
        {step}
        value={value.min ?? ''}
        on:input={(event) => update('min', (event.currentTarget as HTMLInputElement).value)}
      />
    </div>
  </label>
  <label class="suu-range-field">
    <span>{resolvedMaxLabel}</span>
    <div class="suu-input-affix">
      {#if prefixLabel}
        <span class="suu-input-affix__label">{prefixLabel}</span>
      {/if}
      <input
        type="number"
        aria-label={resolvedMaxLabel}
        {min}
        {max}
        {step}
        value={value.max ?? ''}
        on:input={(event) => update('max', (event.currentTarget as HTMLInputElement).value)}
      />
    </div>
  </label>
</div>
