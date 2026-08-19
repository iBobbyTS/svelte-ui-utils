<svelte:options runes={false} />

<script lang="ts">
  import Dropdown from './Dropdown.svelte';
  import type {
    DropdownMenuAlign,
    DropdownMultiChangeHandler,
    DropdownMultiValue,
    DropdownOption,
    DropdownOptionGroup,
    DropdownPlacement,
    DropdownTriggerClickHandler
  } from './types.js';

  export let id: string | undefined = undefined;
  export let value: DropdownMultiValue = [];
  export let options: DropdownOption[] = [];
  export let optionGroups: DropdownOptionGroup[] | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let placement: DropdownPlacement = 'auto';
  export let menuAlign: DropdownMenuAlign = 'left';
  export let fitViewport = true;
  export let fitContent = false;
  export let disabled = false;
  export let width: string | undefined = undefined;
  export let minWidth: string | undefined = undefined;
  export let maxWidth: string | undefined = undefined;
  export let className: string | undefined = undefined;
  export let portal = false;
  export let onChange: DropdownMultiChangeHandler | undefined = undefined;
  export let onTriggerClick: DropdownTriggerClickHandler | undefined = undefined;
</script>

<Dropdown
  {id}
  {value}
  multiselect={true}
  {options}
  {optionGroups}
  {ariaLabel}
  {placement}
  {menuAlign}
  {fitViewport}
  {fitContent}
  {disabled}
  {width}
  {minWidth}
  {maxWidth}
  {className}
  {portal}
  {onChange}
  {onTriggerClick}
/>
