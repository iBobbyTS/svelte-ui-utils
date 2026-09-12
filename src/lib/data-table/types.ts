import type {
  DropdownSearchChangeDetail,
  DropdownSearchItem,
  DropdownSearchItemLabelGetter,
  DropdownSearchLoadOptions,
  DropdownSearchStatus
} from '../dropdown-search/types.js';
import type {
  DropdownLoadOptions,
  DropdownMenuAlign,
  DropdownMultiChangeHandler,
  DropdownMultiValue,
  DropdownOption,
  DropdownOptionGroup,
  DropdownPlacement,
  DropdownSelection,
  DropdownSelectionChangeHandler,
  DropdownTriggerClickHandler
} from '../dropdown/types.js';

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

export type DataTablePaginationQueryKey = string | number | boolean | null | undefined;

export type DataTableServerPagination = {
  tableId: string;
  totalRows: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  pageSizeLabel?: string;
  persistPageSize?: boolean;
  queryKey?: DataTablePaginationQueryKey;
  onRequest: (pagination: PaginationState) => void | Promise<void>;
};

export type PaginationDropdownPlacement = DropdownPlacement;

export type PaginationChangeHandler = (pagination: PaginationState) => void | Promise<void>;

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

export type DataTableHorizontalAlign = 'left' | 'center' | 'right';

export type DataTableVerticalAlign = 'top' | 'middle' | 'bottom';

export interface DataTableColumn<Row = unknown> {
  key: string;
  header?: string;
  sortable?: boolean;
  headerHorizontalAlign?: DataTableHorizontalAlign;
  headerVerticalAlign?: DataTableVerticalAlign;
  cellHorizontalAlign?: DataTableHorizontalAlign;
  cellVerticalAlign?: DataTableVerticalAlign;
  class?: DataTableClassValue<Row>;
  headerClass?: string;
  nowrap?: boolean;
  render?: (row: Row, column: DataTableColumn<Row>) => DataTableCellValue;
}

export interface FilterOption {
  label: string;
  value: string;
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
  value: string;
  ariaLabel?: string;
  options: FilterOption[];
  onChange: (value: string) => void | Promise<void>;
}

export interface DropdownFilterControl {
  type: 'dropdown';
  value: DropdownSelection;
  options?: DropdownOption[];
  optionGroups?: DropdownOptionGroup[];
  groupsCollapsedByDefault?: 'true' | 'false' | 'auto';
  multiselect?: boolean;
  search?: boolean;
  loadOptions?: DropdownLoadOptions;
  searchDebounceMs?: number;
  searchLimit?: number;
  searchPlaceholder?: string;
  errorText?: string;
  ariaLabel?: string;
  placement?: DropdownPlacement;
  menuAlign?: DropdownMenuAlign;
  fitViewport?: boolean;
  fitContent?: boolean;
  disabled?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  portal?: boolean;
  onChange: DropdownSelectionChangeHandler;
  onTriggerClick?: DropdownTriggerClickHandler;
}

export interface DropdownMultiSelectFilterControl {
  type: 'dropdownMultiSelect';
  value: DropdownMultiValue;
  options?: DropdownOption[];
  optionGroups?: DropdownOptionGroup[];
  ariaLabel?: string;
  placement?: DropdownPlacement;
  menuAlign?: DropdownMenuAlign;
  fitViewport?: boolean;
  fitContent?: boolean;
  disabled?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  portal?: boolean;
  onChange: DropdownMultiChangeHandler;
  onTriggerClick?: DropdownTriggerClickHandler;
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
  value: string[];
  options: FilterOption[];
  optionGroups?: DropdownOptionGroup[];
  onChange: (value: string[]) => void | Promise<void>;
}

export interface RadioFilterControl {
  type: 'radio';
  value: string | null | undefined;
  options: FilterOption[];
  onChange: (value: string) => void | Promise<void>;
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
  closeOnValid?: boolean;
  showOptionsOnFocus?: boolean;
  focusOptions?: DropdownSearchItem[];
  footerText?: string;
  noResultsText?: string;
  loadingText?: string;
  clearLabel?: string;
  searchOnExternalValueChange?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  getItemLabel?: DropdownSearchItemLabelGetter;
  loadOptions: DropdownSearchLoadOptions;
  onChange: (detail: DropdownSearchChangeDetail) => void | Promise<void>;
}

export interface DateRangeFilterControl {
  type: 'dateRange';
  value: DateRangeFilterValue;
  startLabel?: string;
  endLabel?: string;
  presetLabels?: Partial<Record<DateRangePreset, string>>;
  defaultPreset?: DateRangePreset;
  quickYears?: number[];
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
  width?: string;
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
  | DropdownFilterControl
  | DropdownMultiSelectFilterControl
  | FilterContainerControl;

export interface FilterTableRow {
  key: string;
  title: string;
  filter: FilterControl;
}

export type CheckboxFilterDefinition = CheckboxFilterControl & { key: string; label: string };
export type RadioFilterDefinition = RadioFilterControl & { key: string; label: string };
export type DropdownSearchFilterDefinition = DropdownSearchFilterControl & { key: string; label: string };
export type DropdownFilterDefinition = DropdownFilterControl & { key: string; label: string };
export type DropdownMultiSelectFilterDefinition = DropdownMultiSelectFilterControl & { key: string; label: string };
export type DateRangeFilterDefinition = DateRangeFilterControl & { key: string; label: string };
export type NumberRangeFilterDefinition = NumberRangeFilterControl & { key: string; label: string };
export type FilterDefinition =
  | CheckboxFilterDefinition
  | RadioFilterDefinition
  | DropdownSearchFilterDefinition
  | DropdownFilterDefinition
  | DropdownMultiSelectFilterDefinition
  | DateRangeFilterDefinition
  | NumberRangeFilterDefinition;
