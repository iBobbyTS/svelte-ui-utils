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

export interface DropdownSearchEnterDetail extends DropdownSearchChangeDetail {
  event: KeyboardEvent;
  exactMatch: DropdownSearchItem | null;
  options: DropdownSearchItem[];
}

/** Returns the input text shown for a selected item; defaults to the item label. */
export type DropdownSearchItemLabelGetter = (item: DropdownSearchItem) => string;
export type DropdownSearchSelectedItemsChangeHandler = (items: DropdownSearchItem[]) => void | Promise<void>;
export type DropdownSearchSelectedItemLabelGetter = (item: DropdownSearchItem) => string;
