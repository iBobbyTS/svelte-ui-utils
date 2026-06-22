import type { DropdownSearchItem, DropdownSearchStatus } from './types.js';

export function normalizeDropdownSearchValue(value: string): string {
  return value.trim();
}

export function clampDropdownSearchLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 10;
  }

  return Math.min(50, Math.max(1, Math.floor(limit)));
}

export function isUsableExactMatch(item: DropdownSearchItem | null | undefined): item is DropdownSearchItem {
  return Boolean(item && !item.disabled);
}

export function resolveDropdownSearchStatus(params: {
  value: string;
  selectedItem?: DropdownSearchItem | null;
  selectedItems?: DropdownSearchItem[];
  exactMatch?: DropdownSearchItem | null;
  loading?: boolean;
  errored?: boolean;
  minLength?: number;
  validate?: boolean;
  multiselect?: boolean;
}): DropdownSearchStatus {
  const trimmed = normalizeDropdownSearchValue(params.value);
  const minLength = params.minLength ?? 1;
  const validate = params.validate ?? true;
  const hasSelectedItems = Boolean(params.selectedItems?.some((item) => !item.disabled));

  if (!trimmed) {
    if (params.multiselect && validate && hasSelectedItems) {
      return 'valid';
    }

    return 'empty';
  }

  if (params.loading) {
    return 'loading';
  }

  if (!validate) {
    return 'empty';
  }

  if (params.multiselect && hasSelectedItems) {
    return 'valid';
  }

  if (params.errored) {
    return 'error';
  }

  if (trimmed.length < minLength) {
    return 'invalid';
  }

  if (isUsableExactMatch(params.selectedItem) || isUsableExactMatch(params.exactMatch)) {
    return 'valid';
  }

  return 'invalid';
}

export function formatParamDict(paramDict: DropdownSearchItem['param_dict']): string[] {
  if (!paramDict) {
    return [];
  }

  return Object.entries(paramDict)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value}`);
}
