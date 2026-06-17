export const uiLanguages = ['en_us', 'zh_cn', 'zh_tw'] as const;

export type UiLanguage = (typeof uiLanguages)[number];

type DateRangePresetKey =
  | 'last24Hours'
  | 'last7Days'
  | 'last30Days'
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear';

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

const messages: Record<UiLanguage, UiMessages> = {
  en_us: {
    toast: {
      closeLabel: 'Close notification'
    },
    dropdownSearch: {
      noResultsText: 'No results',
      loadingText: 'Loading...',
      clearLabel: 'Clear'
    },
    table: {
      emptyText: 'No records',
      pageSizeLabel: 'Rows',
      paginationLabel: 'Pagination'
    },
    dateRange: {
      startLabel: 'Start date',
      endLabel: 'End date',
      presetLabels: {
        last24Hours: 'last 24 hours',
        last7Days: 'last 7 days',
        last30Days: 'last 30 days',
        today: 'today',
        thisWeek: 'this week',
        thisMonth: 'this month',
        thisYear: 'this year'
      }
    },
    numberRange: {
      minLabel: 'Min',
      maxLabel: 'Max'
    }
  },
  zh_cn: {
    toast: {
      closeLabel: '关闭通知'
    },
    dropdownSearch: {
      noResultsText: '没有匹配结果',
      loadingText: '搜索中...',
      clearLabel: '清除'
    },
    table: {
      emptyText: '暂无记录',
      pageSizeLabel: '每页',
      paginationLabel: '分页'
    },
    dateRange: {
      startLabel: '开始日期',
      endLabel: '结束日期',
      presetLabels: {
        last24Hours: '过去 24 小时',
        last7Days: '过去 7 天',
        last30Days: '过去 30 天',
        today: '今天',
        thisWeek: '本周',
        thisMonth: '本月',
        thisYear: '今年'
      }
    },
    numberRange: {
      minLabel: '最小值',
      maxLabel: '最大值'
    }
  },
  zh_tw: {
    toast: {
      closeLabel: '關閉通知'
    },
    dropdownSearch: {
      noResultsText: '沒有符合結果',
      loadingText: '搜尋中...',
      clearLabel: '清除'
    },
    table: {
      emptyText: '暫無記錄',
      pageSizeLabel: '每頁',
      paginationLabel: '分頁'
    },
    dateRange: {
      startLabel: '開始日期',
      endLabel: '結束日期',
      presetLabels: {
        last24Hours: '過去 24 小時',
        last7Days: '過去 7 天',
        last30Days: '過去 30 天',
        today: '今天',
        thisWeek: '本週',
        thisMonth: '本月',
        thisYear: '今年'
      }
    },
    numberRange: {
      minLabel: '最小值',
      maxLabel: '最大值'
    }
  }
};

export function resolveUiLanguage(language: UiLanguage | string | null | undefined): UiLanguage {
  if (!language) {
    return 'en_us';
  }

  const normalized = language.trim().toLowerCase().replaceAll('-', '_');
  if (normalized === 'zh' || normalized === 'zh_cn' || normalized === 'zh_hans') {
    return 'zh_cn';
  }
  if (normalized === 'zh_tw' || normalized === 'zh_hant' || normalized === 'zh_hk') {
    return 'zh_tw';
  }
  if (normalized === 'en' || normalized === 'en_us') {
    return 'en_us';
  }

  return 'en_us';
}

export function getUiMessages(language: UiLanguage | string | null | undefined): UiMessages {
  return messages[resolveUiLanguage(language)];
}
