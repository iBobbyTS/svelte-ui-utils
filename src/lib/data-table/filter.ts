import type {
  CheckboxFilterControl,
  DateRangeFilterControl,
  DropdownSearchFilterControl,
  FilterButtonControl,
  FilterContainerControl,
  FilterControl,
  FilterLinkControl,
  FilterSelectControl,
  NumberRangeFilterControl,
  RadioFilterControl
} from './types.js';

function checkbox(options: Omit<CheckboxFilterControl, 'type'>): CheckboxFilterControl {
  return { type: 'checkbox', ...options };
}

function radio(options: Omit<RadioFilterControl, 'type'>): RadioFilterControl {
  return { type: 'radio', ...options };
}

function dropdownSearch(options: Omit<DropdownSearchFilterControl, 'type'>): DropdownSearchFilterControl {
  return { type: 'dropdownSearch', ...options };
}

function dateRange(options: Omit<DateRangeFilterControl, 'type'>): DateRangeFilterControl {
  return { type: 'dateRange', ...options };
}

function numberRange(options: Omit<NumberRangeFilterControl, 'type'>): NumberRangeFilterControl {
  return { type: 'numberRange', ...options };
}

function button(options: Omit<FilterButtonControl, 'type'>): FilterButtonControl {
  return { type: 'button', ...options };
}

function link(options: Omit<FilterLinkControl, 'type'>): FilterLinkControl {
  return { type: 'link', ...options };
}

function select(options: Omit<FilterSelectControl, 'type'>): FilterSelectControl {
  return { type: 'select', ...options };
}

function container(controls: FilterControl[]): FilterContainerControl {
  return { type: 'container', controls };
}

export const filter = {
  checkbox,
  radio,
  dropdownSearch,
  dateRange,
  numberRange,
  button,
  link,
  select,
  container
};
