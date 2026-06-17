export declare const uiLanguages: readonly ["en_us", "zh_cn", "zh_tw"];
export type UiLanguage = (typeof uiLanguages)[number];
type DateRangePresetKey = 'last24Hours' | 'last7Days' | 'last30Days' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear';
export interface UiMessages {
    toast: {
        closeLabel: string;
    };
    dropdownSearch: {
        noResultsText: string;
        loadingText: string;
        clearLabel: string;
    };
    table: {
        emptyText: string;
        pageSizeLabel: string;
        paginationLabel: string;
    };
    dateRange: {
        startLabel: string;
        endLabel: string;
        presetLabels: Record<DateRangePresetKey, string>;
    };
    numberRange: {
        minLabel: string;
        maxLabel: string;
    };
}
export declare function resolveUiLanguage(language: UiLanguage | string | null | undefined): UiLanguage;
export declare function getUiMessages(language: UiLanguage | string | null | undefined): UiMessages;
export {};
//# sourceMappingURL=i18n.d.ts.map