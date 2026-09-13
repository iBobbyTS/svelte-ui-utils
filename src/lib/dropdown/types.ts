/**
 * Every dropdown submits string values. Callers that keep numeric domain
 * state (e.g. a numeric page size) convert with String/Number at the
 * component boundary so the submitted business value stays unchanged.
 */
export type DropdownValue = string;

export type DropdownMultiValue = string[];

export type DropdownSelection = DropdownValue | DropdownMultiValue;

export type DropdownPlacement = 'auto' | 'up' | 'down';

export type DropdownMenuAlign = 'left' | 'right';

export interface DropdownOption {
  label: string;
  /** Optional text used for keyboard typeahead matching instead of (or in addition to) the label. */
  searchText?: string;
  value: DropdownValue;
  disabled?: boolean;
}

export interface DropdownOptionGroup {
  label?: string;
  options: DropdownOption[];
}

export type DropdownChangeHandler = (value: DropdownValue) => void | Promise<void>;

export type DropdownMultiChangeHandler = (value: DropdownMultiValue) => void | Promise<void>;

export type DropdownSelectionChangeHandler = {
	bivarianceHack(value: DropdownSelection): void | Promise<void>;
}['bivarianceHack'];

export type DropdownTriggerClickHandler = (event: MouseEvent) => void;

export type DropdownSearchChangeHandler = (query: string) => void | Promise<void>;

export type DropdownLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DropdownLoadContext {
  limit: number;
  signal: AbortSignal;
}

export interface DropdownLoadOptionsResult {
  /**
   * Flat options. Ignored whenever `optionGroups` is present on the same
   * result — groups are then the sole render source.
   */
  options?: DropdownOption[];
  optionGroups?: DropdownOptionGroup[];
}

export type DropdownLoadOptions = (
  query: string,
  context: DropdownLoadContext
) => Promise<DropdownLoadOptionsResult> | DropdownLoadOptionsResult;
