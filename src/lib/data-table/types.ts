import type { DropdownSearchLoadOptions } from '../dropdown-search/types.js';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

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

export type FilterDefinition = CheckboxFilterDefinition | RadioFilterDefinition | DropdownSearchFilterDefinition;
