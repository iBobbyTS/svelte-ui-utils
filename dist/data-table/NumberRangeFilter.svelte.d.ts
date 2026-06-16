import type { NumberRangeFilterValue } from './types.js';
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
declare const NumberRangeFilter: $$__sveltets_2_IsomorphicComponent<{
    value?: NumberRangeFilterValue;
    minLabel?: string;
    maxLabel?: string;
    prefixLabel?: string;
    min?: number | undefined;
    max?: number | undefined;
    step?: number | string;
    onChange?: ((value: NumberRangeFilterValue) => void) | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type NumberRangeFilter = InstanceType<typeof NumberRangeFilter>;
export default NumberRangeFilter;
//# sourceMappingURL=NumberRangeFilter.svelte.d.ts.map