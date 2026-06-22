<svelte:options runes={false} />

<script lang="ts">
  import DropdownSearch from './DropdownSearch.svelte';
  import type { UiLanguage } from '../i18n.js';
  import type {
    DropdownSearchChangeDetail,
    DropdownSearchItem,
    DropdownSearchItemValueGetter,
    DropdownSearchLoadOptions,
    DropdownSearchSelectedItemLabelGetter,
    DropdownSearchSelectedItemsChangeHandler,
    DropdownSearchStatus,
  } from './types.js';

  export let value = '';
  export let selectedItems: DropdownSearchItem[] = [];
  export let status: DropdownSearchStatus = 'empty';
  export let placeholder = '';
  export let debounceMs = 500;
  export let limit = 10;
  export let minLength = 1;
  export let validate = true;
  export let loadOptions: DropdownSearchLoadOptions;
  export let id: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let listboxId: string | undefined = undefined;
  export let disabled = false;
  export let language: UiLanguage = 'en_us';
  export let noResultsText: string | undefined = undefined;
  export let loadingText: string | undefined = undefined;
  export let clearLabel: string | undefined = undefined;
  export let searchOnExternalValueChange = false;
  export let width: string | undefined = undefined;
  export let minWidth: string | undefined = undefined;
  export let maxWidth: string | undefined = undefined;
  export let selectedItemsLabel = 'Selected items';
  export let removeSelectedItemLabel:
    | DropdownSearchSelectedItemLabelGetter
    | undefined = undefined;
  export let getItemValue: DropdownSearchItemValueGetter = (item) => item.title;
  export let onChange:
    | ((detail: DropdownSearchChangeDetail) => void)
    | undefined = undefined;
  export let onSelect: ((item: DropdownSearchItem) => void) | undefined =
    undefined;
  export let onDeselect: ((item: DropdownSearchItem) => void) | undefined =
    undefined;
  export let onSelectedItemsChange:
    | DropdownSearchSelectedItemsChangeHandler
    | undefined = undefined;
  export let onStatusChange:
    | ((status: DropdownSearchStatus) => void)
    | undefined = undefined;
  export let onInputBlur: ((event: FocusEvent) => void) | undefined = undefined;
</script>

<DropdownSearch
  {value}
  {selectedItems}
  {status}
  multiselect={true}
  {placeholder}
  {debounceMs}
  {limit}
  {minLength}
  {validate}
  {loadOptions}
  {id}
  {name}
  {ariaLabel}
  {listboxId}
  {disabled}
  {language}
  {noResultsText}
  {loadingText}
  {clearLabel}
  {searchOnExternalValueChange}
  {width}
  {minWidth}
  {maxWidth}
  {selectedItemsLabel}
  {removeSelectedItemLabel}
  {getItemValue}
  {onChange}
  {onSelect}
  {onDeselect}
  {onSelectedItemsChange}
  {onStatusChange}
  {onInputBlur}
/>
