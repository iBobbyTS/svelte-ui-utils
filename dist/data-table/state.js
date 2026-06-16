export function toggleSort(current, columnKey) {
    if (!current || current.key !== columnKey) {
        return { key: columnKey, direction: 'asc' };
    }
    return { key: columnKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}
export function getAriaSort(sort, columnKey) {
    if (!sort || sort.key !== columnKey) {
        return 'none';
    }
    return sort.direction === 'asc' ? 'ascending' : 'descending';
}
export function getPageCount(totalRows, pageSize) {
    if (pageSize <= 0) {
        return 1;
    }
    return Math.max(1, Math.ceil(Math.max(0, totalRows) / pageSize));
}
export function normalizePagination(pagination, totalRows) {
    const pageSize = Math.max(1, pagination.pageSize);
    const pageCount = getPageCount(totalRows, pageSize);
    return {
        pageSize,
        page: Math.min(Math.max(1, pagination.page), pageCount)
    };
}
export function setDataTableSort(state, columnKey) {
    return {
        ...state,
        sort: toggleSort(state.sort, columnKey),
        pagination: { ...state.pagination, page: 1 }
    };
}
export function setDataTablePagination(state, pagination, totalRows) {
    return {
        ...state,
        pagination: normalizePagination(pagination, totalRows)
    };
}
export function setDataTablePageSize(state, pageSize, totalRows) {
    return setDataTablePagination(state, { page: 1, pageSize }, totalRows);
}
export function setDataTableFilters(state, filters) {
    return {
        ...state,
        filters,
        pagination: { ...state.pagination, page: 1 }
    };
}
export function getCellValue(row, column) {
    if (column.render) {
        return column.render(row, column);
    }
    const value = row && typeof row === 'object' && column.key in row
        ? row[column.key]
        : undefined;
    return value === null || value === undefined ? '' : value;
}
