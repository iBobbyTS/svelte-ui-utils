import type { DataTableColumn, DataTableState, FilterState, PaginationState, SortState } from './types.js';
export declare function toggleSort(current: SortState | null, columnKey: string): SortState;
export declare function getAriaSort(sort: SortState | null, columnKey: string): 'none' | 'ascending' | 'descending';
export declare function getPageCount(totalRows: number, pageSize: number): number;
export declare function normalizePagination(pagination: PaginationState, totalRows: number): PaginationState;
export declare function setDataTableSort(state: DataTableState, columnKey: string): DataTableState;
export declare function setDataTablePagination(state: DataTableState, pagination: PaginationState, totalRows: number): DataTableState;
export declare function setDataTablePageSize(state: DataTableState, pageSize: number, totalRows: number): DataTableState;
export declare function setDataTableFilters(state: DataTableState, filters: FilterState): DataTableState;
export declare function getCellValue<Row = unknown>(row: Row, column: DataTableColumn<Row>): unknown;
//# sourceMappingURL=state.d.ts.map