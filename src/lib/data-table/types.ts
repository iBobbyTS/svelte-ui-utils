import type {
  DropdownSearchChangeDetail,
  DropdownSearchItem,
  DropdownSearchItemValueGetter,
  DropdownSearchLoadOptions,
  DropdownSearchStatus
} from '../dropdown-search/types.js';

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

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DateRangeFilterValue
  | NumberRangeFilterValue
  | Array<string | number>
  | Record<string, unknown>;

export type FilterState = Record<string, FilterValue>;

export interface DataTableState {
  sort: SortState | null;
  pagination: PaginationState;
  filters: FilterState;
}

export type DataTableCellValue = unknown;

export type DataTableClassValue<Row = unknown> =
  | string
  | undefined
  | null
  | ((row: Row, value: DataTableCellValue, column: DataTableColumn<Row>) => string | undefined | null);

export type DataTableRowKey<Row = unknown> = string | ((row: Row, index: number) => string | number);

export type DataTableRowAttributes<Row = unknown> = (
  row: Row,
  index: number
) => Record<string, string | number | boolean | null | undefined>;

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

export type FilterActionVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export type FilterActionIcon = 'search' | 'qr' | 'x';

export interface FilterButtonControl {
  type: 'button';
  label?: string;
  ariaLabel?: string;
  icon?: FilterActionIcon;
  variant?: FilterActionVariant;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export interface FilterLinkControl {
  type: 'link';
  label: string;
  href: string;
  ariaLabel?: string;
  icon?: FilterActionIcon;
  variant?: FilterActionVariant;
}

export interface FilterSelectControl {
  type: 'select';
  value: string | number;
  ariaLabel?: string;
  options: FilterOption[];
  onChange: (value: string) => void | Promise<void>;
}

export type DateRangePreset =
  | 'last24Hours'
  | 'last7Days'
  | 'last30Days'
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear';

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

export interface CheckboxFilterControl {
  type: 'checkbox';
  value: Array<string | number>;
  options: FilterOption[];
  onChange: (value: Array<string | number>) => void | Promise<void>;
}

export interface RadioFilterControl {
  type: 'radio';
  value: string | number | null | undefined;
  options: FilterOption[];
  onChange: (value: string | number) => void | Promise<void>;
}

export interface DropdownSearchFilterControl {
  type: 'dropdownSearch';
  value: string;
  selectedItem: DropdownSearchItem | null;
  status: DropdownSearchStatus;
  ariaLabel?: string;
  placeholder?: string;
  debounceMs?: number;
  limit?: number;
  minLength?: number;
  noResultsText?: string;
  loadingText?: string;
  clearLabel?: string;
  searchOnExternalValueChange?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  getItemValue?: DropdownSearchItemValueGetter;
  loadOptions: DropdownSearchLoadOptions;
  onChange: (detail: DropdownSearchChangeDetail) => void | Promise<void>;
}

export interface DateRangeFilterControl {
  type: 'dateRange';
  value: DateRangeFilterValue;
  startLabel?: string;
  endLabel?: string;
  presetLabels?: Partial<Record<DateRangePreset, string>>;
  now?: () => Date;
  weekStartsOn?: 0 | 1;
  onChange: (value: DateRangeFilterValue) => void | Promise<void>;
}

export interface NumberRangeFilterControl {
  type: 'numberRange';
  value: NumberRangeFilterValue;
  minLabel?: string;
  maxLabel?: string;
  prefixLabel?: string;
  min?: number;
  max?: number;
  step?: number | string;
  onChange: (value: NumberRangeFilterValue) => void | Promise<void>;
}

export interface FilterContainerControl {
  type: 'container';
  controls: FilterControl[];
}

export type FilterControl =
  | CheckboxFilterControl
  | RadioFilterControl
  | DropdownSearchFilterControl
  | DateRangeFilterControl
  | NumberRangeFilterControl
  | FilterButtonControl
  | FilterLinkControl
  | FilterSelectControl
  | FilterContainerControl;

export interface FilterTableRow {
  key: string;
  title: string;
  filter: FilterControl;
}

export type CheckboxFilterDefinition = CheckboxFilterControl & { key: string; label: string };
export type RadioFilterDefinition = RadioFilterControl & { key: string; label: string };
export type DropdownSearchFilterDefinition = DropdownSearchFilterControl & { key: string; label: string };
export type DateRangeFilterDefinition = DateRangeFilterControl & { key: string; label: string };
export type NumberRangeFilterDefinition = NumberRangeFilterControl & { key: string; label: string };
export type FilterDefinition =
  | CheckboxFilterDefinition
  | RadioFilterDefinition
  | DropdownSearchFilterDefinition
  | DateRangeFilterDefinition
  | NumberRangeFilterDefinition;
