import type { DataTableColumn, DataTableLayout, DataTableRowAttributes, DataTableRowKey, DataTableSortChangeHandler, PaginationState, SortState } from './types.js';
interface $$__sveltets_2_IsomorphicComponent<Props extends Record<string, any> = any, Events extends Record<string, any> = any, Slots extends Record<string, any> = any, Exports = {}, Bindings = string> {
    new (options: import('svelte').ComponentConstructorOptions<Props>): import('svelte').SvelteComponent<Props, Events, Slots> & {
        $$bindings?: Bindings;
    } & Exports;
    (internal: unknown, props: Props & {
        $$events?: Events;
        $$slots?: Slots;
    }): Exports & {
        $set?: any;
        $on?: any;
    };
    z_$$bindings?: Bindings;
}
declare const DataTable: $$__sveltets_2_IsomorphicComponent<{
    rows?: unknown[];
    columns?: DataTableColumn[];
    rowKey?: DataTableRowKey | undefined;
    emptyText?: string;
    sort?: SortState | null;
    onSortChange?: DataTableSortChangeHandler | undefined;
    showPagination?: boolean;
    page?: number;
    pageSize?: number;
    totalRows?: number | undefined;
    pageSizeOptions?: number[];
    pageSizeLabel?: string;
    maxPageButtons?: number;
    onPaginationChange?: ((pagination: PaginationState) => void | Promise<void>) | undefined;
    zebra?: boolean;
    bordered?: boolean;
    verticalSeparators?: boolean;
    tableLayout?: DataTableLayout;
    stickyHeader?: boolean;
    stickyHeaderTop?: string | undefined;
    stickyHeaderOffset?: string | undefined;
    preserveScrollOnSort?: boolean;
    rowClass?: string | ((row: unknown, index: number) => string | undefined | null) | undefined;
    rowAttributes?: DataTableRowAttributes | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {
    header: {
        slot: string;
        column: DataTableColumn<unknown>;
        sort: SortState | null;
    };
    cell: {
        slot: string;
        row: unknown;
        column: DataTableColumn<unknown>;
        value: any;
    };
}, {}, string>;
type DataTable = InstanceType<typeof DataTable>;
export default DataTable;
//# sourceMappingURL=DataTable.svelte.d.ts.map