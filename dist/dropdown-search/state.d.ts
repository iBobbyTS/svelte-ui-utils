import type { DropdownSearchItem, DropdownSearchStatus } from './types.js';
export declare function normalizeDropdownSearchValue(value: string): string;
export declare function clampDropdownSearchLimit(limit: number): number;
export declare function isUsableExactMatch(item: DropdownSearchItem | null | undefined): item is DropdownSearchItem;
export declare function resolveDropdownSearchStatus(params: {
    value: string;
    selectedItem?: DropdownSearchItem | null;
    exactMatch?: DropdownSearchItem | null;
    loading?: boolean;
    errored?: boolean;
    minLength?: number;
    validate?: boolean;
}): DropdownSearchStatus;
export declare function formatParamDict(paramDict: DropdownSearchItem['param_dict']): string[];
//# sourceMappingURL=state.d.ts.map