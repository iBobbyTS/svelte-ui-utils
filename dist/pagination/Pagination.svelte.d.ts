import { type UiLanguage } from '../i18n.js';
import type { PaginationChangeHandler, PaginationDropdownPlacement, PaginationState } from '../data-table/types.js';
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
declare const Pagination: $$__sveltets_2_IsomorphicComponent<{
    pagination?: PaginationState;
    totalRows?: number;
    pageSizeOptions?: number[];
    language?: UiLanguage;
    pageSizeLabel?: string | undefined;
    maxPageButtons?: number;
    pageSizeDropdownPlacement?: PaginationDropdownPlacement;
    onPaginationChange?: PaginationChangeHandler | undefined;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type Pagination = InstanceType<typeof Pagination>;
export default Pagination;
//# sourceMappingURL=Pagination.svelte.d.ts.map