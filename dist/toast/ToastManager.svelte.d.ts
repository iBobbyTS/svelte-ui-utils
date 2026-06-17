import type { UiLanguage } from '../i18n.js';
import type { ToastPosition, ToastStore } from './types.js';
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
declare const ToastManager: $$__sveltets_2_IsomorphicComponent<{
    store?: ToastStore;
    positions?: ToastPosition[];
    language?: UiLanguage;
    closeLabel?: string | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type ToastManager = InstanceType<typeof ToastManager>;
export default ToastManager;
//# sourceMappingURL=ToastManager.svelte.d.ts.map