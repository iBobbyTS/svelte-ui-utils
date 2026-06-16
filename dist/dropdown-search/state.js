export function normalizeDropdownSearchValue(value) {
    return value.trim();
}
export function clampDropdownSearchLimit(limit) {
    if (!Number.isFinite(limit)) {
        return 10;
    }
    return Math.min(50, Math.max(1, Math.floor(limit)));
}
export function isUsableExactMatch(item) {
    return Boolean(item && !item.disabled);
}
export function resolveDropdownSearchStatus(params) {
    const trimmed = normalizeDropdownSearchValue(params.value);
    const minLength = params.minLength ?? 1;
    const validate = params.validate ?? true;
    if (!trimmed) {
        return 'empty';
    }
    if (params.loading) {
        return 'loading';
    }
    if (!validate) {
        return 'empty';
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
export function formatParamDict(paramDict) {
    if (!paramDict) {
        return [];
    }
    return Object.entries(paramDict)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${key}: ${value}`);
}
