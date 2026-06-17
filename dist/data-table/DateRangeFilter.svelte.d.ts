import { type UiLanguage } from '../i18n.js';
import type { DateRangeFilterValue, DateRangePreset } from './types.js';
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
declare const DateRangeFilter: $$__sveltets_2_IsomorphicComponent<{
    value?: DateRangeFilterValue;
    language?: UiLanguage;
    startLabel?: string | undefined;
    endLabel?: string | undefined;
    presetLabels?: Partial<Record<DateRangePreset, string>>;
    now?: () => Date;
    weekStartsOn?: 0 | 1;
    onChange?: ((value: DateRangeFilterValue) => void) | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type DateRangeFilter = InstanceType<typeof DateRangeFilter>;
export default DateRangeFilter;
//# sourceMappingURL=DateRangeFilter.svelte.d.ts.map