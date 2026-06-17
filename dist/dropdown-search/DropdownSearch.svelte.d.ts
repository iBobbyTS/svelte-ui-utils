import type { DropdownSearchChangeDetail, DropdownSearchItem, DropdownSearchItemValueGetter, DropdownSearchLoadOptions, DropdownSearchStatus } from './types.js';
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
declare const DropdownSearch: $$__sveltets_2_IsomorphicComponent<{
    value?: string;
    selectedItem?: DropdownSearchItem | null;
    status?: DropdownSearchStatus;
    placeholder?: string;
    debounceMs?: number;
    limit?: number;
    minLength?: number;
    validate?: boolean;
    loadOptions: DropdownSearchLoadOptions;
    id?: string | undefined;
    name?: string | undefined;
    ariaLabel?: string | undefined;
    listboxId?: string | undefined;
    disabled?: boolean;
    noResultsText?: string;
    loadingText?: string;
    searchOnExternalValueChange?: boolean;
    width?: string | undefined;
    minWidth?: string | undefined;
    maxWidth?: string | undefined;
    getItemValue?: DropdownSearchItemValueGetter;
    onChange?: ((detail: DropdownSearchChangeDetail) => void) | undefined;
    onSelect?: ((item: DropdownSearchItem) => void) | undefined;
    onStatusChange?: ((status: DropdownSearchStatus) => void) | undefined;
    onInputBlur?: ((event: FocusEvent) => void) | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type DropdownSearch = InstanceType<typeof DropdownSearch>;
export default DropdownSearch;
//# sourceMappingURL=DropdownSearch.svelte.d.ts.map