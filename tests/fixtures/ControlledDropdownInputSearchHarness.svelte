<svelte:options runes={false} />

<script lang="ts">
  import Dropdown from '../../src/lib/dropdown/Dropdown.svelte';
  import type {
    DropdownLoadOptions,
    DropdownOption,
    DropdownSelection
  } from '../../src/lib/dropdown/types.js';

  // 真实父组件语义的受控 host：onChange 中直接做普通赋值（不是
  // testing-library 的 rerender/flushSync），用于覆盖同 flush 回写时序。
  export let initialValue = '';
  export let initialSelectedOptions: DropdownOption[] = [];
  export let loadOptions: DropdownLoadOptions = async () => ({ options: [] });
  export let writeback: 'value-only' | 'canonical' = 'value-only';
  export let canonicalLabel = '';
  export let writebackDelayMs = 0;
  export let searchDebounceMs = 0;
  // 真实消费者（FilterControl/lmdo 的 onChange 路径）通常忽略偏离清选的 ''
  // 上报；仅在测试空 value 选项时显式允许回写 ''。
  export let writebackEmptySelection = false;

  let value = initialValue;
  let selectedOptions: DropdownOption[] = initialSelectedOptions;

  function applyWriteback(nextValue: string) {
    value = nextValue;
    selectedOptions = writeback === 'canonical'
      ? [{ label: canonicalLabel, value: nextValue }]
      : [];
  }

  function handleChange(selection: DropdownSelection) {
    if (Array.isArray(selection)) {
      return;
    }
    if (selection === '' && !writebackEmptySelection) {
      return;
    }
    if (writebackDelayMs > 0) {
      setTimeout(() => applyWriteback(selection), writebackDelayMs);
    } else {
      applyWriteback(selection);
    }
  }
</script>

<Dropdown
  inputStyle="input"
  search
  {searchDebounceMs}
  {value}
  {selectedOptions}
  {loadOptions}
  onChange={handleChange}
  ariaLabel="Harness search"
/>

<output aria-label="Controlled value">{value}</output>
