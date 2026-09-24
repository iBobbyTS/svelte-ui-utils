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

export interface DateRangePresetContext {
  now: Date;
  weekStartsOn: 0 | 1;
}

export interface CustomDateRangePreset {
  /**
   * Stable key stored in `DateRangeFilterValue.preset` and matched against
   * `presetLabels`. Must be unique across all preset and select entries in one
   * `presets` list; duplicate keys make the active-state highlight and
   * `defaultPreset` lookup ambiguous.
   */
  key: string;
  /** Falls back to `presetLabels[key]`, then `key`. */
  label?: string;
  /** Returns the covered dates; the component formats them into the value. */
  resolve: (context: DateRangePresetContext) => { startDate: Date; endDate: Date };
}

/**
 * Consumer-controlled dropdown rendered inside the preset row, for example a
 * year picker that feeds custom preset resolvers. The component only renders
 * it and reports selection changes; the consumer owns the value and wiring.
 * `key` must be unique across all preset and select entries in one `presets`
 * list.
 */
export interface DateRangePresetSelect {
  type: 'select';
  key: string;
  value: string;
  options: FilterOption[];
  ariaLabel?: string;
  onChange: (value: string) => void | Promise<void>;
}

export type DateRangePresetEntry =
  | DateRangePreset
  | CustomDateRangePreset
  | DateRangePresetSelect
  | 'quickMonth'
  | 'quickYear'
  | 'divider';

export interface DateRangeFilterValue {
  startDate: string;
  endDate: string;
  preset: string | null;
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

/**
 * Data-table-local copy of the structural types that the removed free-text
 * search component family used to host. The `dropdownSearch` filter control
 * contract is unchanged; only that module is gone.
 */
export type DropdownSearchStatus = 'empty' | 'loading' | 'valid' | 'invalid' | 'error';

/**
 * Search options and selected chips use the unified label/value contract:
 * `label` is the display text, `value` is the submitted string identifier.
 * Extra business fields (e.g. `param_dict`) are preserved as metadata.
 */
export interface DropdownSearchItem {
  label: string;
  value: string;
  param_dict?: Record<string, string | number | null>;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface DropdownSearchLoadContext {
  limit: number;
  signal: AbortSignal;
}

export interface DropdownSearchResult {
  options: DropdownSearchItem[];
  exactMatch?: DropdownSearchItem | null;
}

export type DropdownSearchLoadOptions = (
  query: string,
  context: DropdownSearchLoadContext
) => Promise<DropdownSearchResult> | DropdownSearchResult;

export interface DropdownSearchChangeDetail {
  /** Free-text input content; distinct from the submitted `DropdownSearchItem.value`. */
  value: string;
  selectedItem: DropdownSearchItem | null;
  selectedItems: DropdownSearchItem[];
  status: DropdownSearchStatus;
}

/** Returns the input text shown for a selected item; defaults to the item label. */
export type DropdownSearchItemLabelGetter = (item: DropdownSearchItem) => string;

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
  presets?: DateRangePresetEntry[];
  presetLabels?: Partial<Record<string, string>>;
  defaultPreset?: string;
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

/**
 * Free-text filter input for `keyword contains`-style filtering. Unlike
 * `dropdownSearch` it has no selection semantics: every (debounced) change is
 * the raw input text, so it pairs with consumer-side row matching.
 */
export interface TextInputFilterControl {
  type: 'text';
  value: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Milliseconds to batch changes before `onChange` fires; 0 (default) reports every keystroke. */
  debounceMs?: number;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  disabled?: boolean;
  onChange: (value: string) => void | Promise<void>;
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
  | FilterContainerControl
  | TextInputFilterControl;

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
export type TextInputFilterDefinition = TextInputFilterControl & { key: string; label: string };
export type FilterDefinition =
  | CheckboxFilterDefinition
  | RadioFilterDefinition
  | DropdownSearchFilterDefinition
  | DropdownFilterDefinition
  | DropdownMultiSelectFilterDefinition
  | DateRangeFilterDefinition
  | NumberRangeFilterDefinition
  | TextInputFilterDefinition;
