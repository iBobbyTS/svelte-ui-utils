import type { DropdownChangeHandler, DropdownOption, DropdownPlacement, DropdownValue } from './types.js';
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
declare const Dropdown: $$__sveltets_2_IsomorphicComponent<{
    value?: DropdownValue;
    options?: DropdownOption[];
    ariaLabel?: string | undefined;
    placement?: DropdownPlacement;
    disabled?: boolean;
    onChange?: DropdownChangeHandler | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type Dropdown = InstanceType<typeof Dropdown>;
export default Dropdown;
//# sourceMappingURL=Dropdown.svelte.d.ts.map