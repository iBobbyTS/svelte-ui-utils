import type { DropdownSelection } from './types.js';

/**
 * Narrows a `Dropdown` selection change to the multiselect shape. The
 * component emits an array whenever `multiselect` is set, but the shared
 * `onChange` signature keeps the `string | string[]` union, so multiselect
 * handlers would otherwise repeat this narrowing at every call site.
 */
export function toMultiSelection(selection: DropdownSelection): string[] {
  return Array.isArray(selection) ? selection : [selection];
}

/**
 * Narrows a `Dropdown` selection change to the single-select shape: the first
 * identifier when an array slips through, otherwise the identifier itself.
 */
export function toSingleSelection(selection: DropdownSelection): string {
  return Array.isArray(selection) ? (selection[0] ?? '') : selection;
}
