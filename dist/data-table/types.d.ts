import type { DropdownSearchLoadOptions } from '../dropdown-search/types.js';
export type SortDirection = 'asc' | 'desc';
export type DataTableLayout = 'auto' | 'fixed';
export interface SortState {
    key: string;
    direction: SortDirection;
}
export type DataTableSortChangeHandler = (sort: SortState) => void | Promise<void>;
export type DataTableStateChangeHandler = (nextState: DataTableState) => void | Promise<void>;
export interface PaginationState {
    page: number;
    pageSize: number;
}
export type FilterValue = string | number | boolean | null | undefined | DateRangeFilterValue | NumberRangeFilterValue | Array<string | number> | Record<string, unknown>;
export type FilterState = Record<string, FilterValue>;
export interface DataTableState {
    sort: SortState | null;
    pagination: PaginationState;
    filters: FilterState;
}
export type DataTableCellValue = unknown;
export type DataTableClassValue<Row = unknown> = string | undefined | null | ((row: Row, value: DataTableCellValue, column: DataTableColumn<Row>) => string | undefined | null);
export type DataTableRowKey<Row = unknown> = string | ((row: Row, index: number) => string | number);
export type DataTableRowAttributes<Row = unknown> = (row: Row, index: number) => Record<string, string | number | boolean | null | undefined>;
export interface DataTableColumn<Row = unknown> {
    key: string;
    header: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    class?: DataTableClassValue<Row>;
    headerClass?: string;
    nowrap?: boolean;
    render?: (row: Row, column: DataTableColumn<Row>) => DataTableCellValue;
}
export interface FilterOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}
export type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear';
export interface DateRangeFilterValue {
    startDate: string;
    endDate: string;
    preset: DateRangePreset | null;
    startDateTime?: string;
    endDateTime?: string;
}
export interface NumberRangeFilterValue {
    min: number | null;
    max: number | null;
}
export interface CheckboxFilterDefinition {
    type: 'checkbox';
    key: string;
    label: string;
    options: FilterOption[];
}
export interface RadioFilterDefinition {
    type: 'radio';
    key: string;
    label: string;
    options: FilterOption[];
}
export interface DropdownSearchFilterDefinition {
    type: 'dropdownSearch';
    key: string;
    label: string;
    placeholder?: string;
    debounceMs?: number;
    limit?: number;
    minLength?: number;
    loadOptions: DropdownSearchLoadOptions;
}
export interface DateRangeFilterDefinition {
    type: 'dateRange';
    key: string;
    label: string;
    startLabel?: string;
    endLabel?: string;
    presetLabels?: Partial<Record<DateRangePreset, string>>;
    now?: () => Date;
    weekStartsOn?: 0 | 1;
}
export interface NumberRangeFilterDefinition {
    type: 'numberRange';
    key: string;
    label: string;
    minLabel?: string;
    maxLabel?: string;
    prefixLabel?: string;
    min?: number;
    max?: number;
    step?: number | string;
}
export type FilterDefinition = CheckboxFilterDefinition | RadioFilterDefinition | DropdownSearchFilterDefinition | DateRangeFilterDefinition | NumberRangeFilterDefinition;
//# sourceMappingURL=types.d.ts.map