import type { CheckboxFilterControl, DateRangeFilterControl, DropdownSearchFilterControl, FilterButtonControl, FilterContainerControl, FilterControl, FilterLinkControl, FilterSelectControl, NumberRangeFilterControl, RadioFilterControl } from './types.js';
declare function checkbox(options: Omit<CheckboxFilterControl, 'type'>): CheckboxFilterControl;
declare function radio(options: Omit<RadioFilterControl, 'type'>): RadioFilterControl;
declare function dropdownSearch(options: Omit<DropdownSearchFilterControl, 'type'>): DropdownSearchFilterControl;
declare function dateRange(options: Omit<DateRangeFilterControl, 'type'>): DateRangeFilterControl;
declare function numberRange(options: Omit<NumberRangeFilterControl, 'type'>): NumberRangeFilterControl;
declare function button(options: Omit<FilterButtonControl, 'type'>): FilterButtonControl;
declare function link(options: Omit<FilterLinkControl, 'type'>): FilterLinkControl;
declare function select(options: Omit<FilterSelectControl, 'type'>): FilterSelectControl;
declare function container(controls: FilterControl[]): FilterContainerControl;
export declare const filter: {
    checkbox: typeof checkbox;
    radio: typeof radio;
    dropdownSearch: typeof dropdownSearch;
    dateRange: typeof dateRange;
    numberRange: typeof numberRange;
    button: typeof button;
    link: typeof link;
    select: typeof select;
    container: typeof container;
};
export {};
//# sourceMappingURL=filter.d.ts.map