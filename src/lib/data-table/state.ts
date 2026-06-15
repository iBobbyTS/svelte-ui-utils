import type { DataTableColumn, DataTableState, FilterState, PaginationState, SortState } from './types.js';

export function toggleSort(current: SortState | null, columnKey: string): SortState {
  if (!current || current.key !== columnKey) {
    return { key: columnKey, direction: 'asc' };
  }

  return { key: columnKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export function getAriaSort(sort: SortState | null, columnKey: string): 'none' | 'ascending' | 'descending' {
  if (!sort || sort.key !== columnKey) {
    return 'none';
  }

  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

export function getPageCount(totalRows: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(Math.max(0, totalRows) / pageSize));
}

export function normalizePagination(pagination: PaginationState, totalRows: number): PaginationState {
  const pageSize = Math.max(1, pagination.pageSize);
  const pageCount = getPageCount(totalRows, pageSize);

  return {
    pageSize,
    page: Math.min(Math.max(1, pagination.page), pageCount)
  };
}

export function setDataTableSort(state: DataTableState, columnKey: string): DataTableState {
  return {
    ...state,
    sort: toggleSort(state.sort, columnKey),
    pagination: { ...state.pagination, page: 1 }
  };
}

export function setDataTablePagination(state: DataTableState, pagination: PaginationState, totalRows: number): DataTableState {
  return {
    ...state,
    pagination: normalizePagination(pagination, totalRows)
  };
}

export function setDataTablePageSize(state: DataTableState, pageSize: number, totalRows: number): DataTableState {
  return setDataTablePagination(state, { page: 1, pageSize }, totalRows);
}

export function setDataTableFilters(state: DataTableState, filters: FilterState): DataTableState {
  return {
    ...state,
    filters,
    pagination: { ...state.pagination, page: 1 }
  };
}

export function getCellValue<Row extends Record<string, unknown>>(row: Row, column: DataTableColumn<Row>) {
  if (column.render) {
    return column.render(row, column);
  }

  const value = row[column.key];
  return value === null || value === undefined ? '' : value;
}
