import type { DataTableColumn, DataTableLayout, DataTableRowAttributes, DataTableRowKey, DataTableSortChangeHandler, FilterDefinition, FilterState, SortState } from './types.js';
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
declare const FilterTable: $$__sveltets_2_IsomorphicComponent<{
    rows?: unknown[];
    columns?: DataTableColumn[];
    filterDefinitions?: FilterDefinition[];
    filters?: FilterState;
    onFiltersChange?: ((filters: FilterState) => void | Promise<void>) | undefined;
    sort?: SortState | null;
    zebra?: boolean;
    bordered?: boolean;
    verticalSeparators?: boolean;
    tableLayout?: DataTableLayout;
    stickyHeader?: boolean;
    stickyHeaderTop?: string | undefined;
    stickyHeaderOffset?: string | undefined;
    preserveScrollOnSort?: boolean;
    emptyText?: string;
    rowKey?: DataTableRowKey | undefined;
    rowClass?: string | ((row: unknown, index: number) => string | undefined | null) | undefined;
    rowAttributes?: DataTableRowAttributes | undefined;
    onSortChange?: DataTableSortChangeHandler | undefined;
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
type FilterTable = InstanceType<typeof FilterTable>;
export default FilterTable;
//# sourceMappingURL=FilterTable.svelte.d.ts.map