import type { FilterDefinition, FilterState, FilterValue } from './types.js';
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
type $$__sveltets_2_PropsWithChildren<Props, Slots> = Props & (Slots extends {
    default: any;
} ? Props extends Record<string, never> ? any : {
    children?: any;
} : {});
declare const FilterBox: $$__sveltets_2_IsomorphicComponent<$$__sveltets_2_PropsWithChildren<{
    definitions?: FilterDefinition[];
    filters?: FilterState;
    onFiltersChange?: ((filters: FilterState) => void) | undefined;
}, {
    default: {
        filters: FilterState;
        updateFilter: (key: string, value: FilterValue) => void;
    };
}>, {
    [evt: string]: CustomEvent<any>;
}, {
    default: {
        filters: FilterState;
        updateFilter: (key: string, value: FilterValue) => void;
    };
}, {}, string>;
type FilterBox = InstanceType<typeof FilterBox>;
export default FilterBox;
//# sourceMappingURL=FilterBox.svelte.d.ts.map