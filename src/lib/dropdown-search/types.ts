export type DropdownSearchStatus = 'empty' | 'loading' | 'valid' | 'invalid' | 'error';

export interface DropdownSearchItem {
  id: string | number;
  title: string;
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
  value: string;
  selectedItem: DropdownSearchItem | null;
  status: DropdownSearchStatus;
}

export type DropdownSearchItemValueGetter = (item: DropdownSearchItem) => string;
