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

export interface DataTableColumn<Row = Record<string, unknown>> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  class?: string;
  headerClass?: string;
  render?: (row: Row, column: DataTableColumn<Row>) => string | number | null | undefined;
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
