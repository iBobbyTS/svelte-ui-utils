import type { DataTableColumn, DataTableLayout, DataTableState, DataTableStateChangeHandler, FilterDefinition, FilterState } from './types.js';
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
    totalRows?: number;
    state?: DataTableState;
    filterDefinitions?: FilterDefinition[];
    pageSizeOptions?: number[];
    zebra?: boolean;
    verticalSeparators?: boolean;
    tableLayout?: DataTableLayout;
    stickyHeader?: boolean;
    stickyHeaderTop?: string | undefined;
    stickyHeaderOffset?: string | undefined;
    preserveScrollOnSort?: boolean;
    emptyText?: string;
    onStateChange?: DataTableStateChangeHandler | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {
    filters: {
        state: DataTableState;
        onFiltersChange: (filters: FilterState) => void | Promise<void> | undefined;
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