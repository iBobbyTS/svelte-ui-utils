import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DataTable from '../src/lib/data-table/DataTable.svelte';
import DateRangeFilter from '../src/lib/data-table/DateRangeFilter.svelte';
import FilterTable from '../src/lib/data-table/FilterTable.svelte';
import NumberRangeFilter from '../src/lib/data-table/NumberRangeFilter.svelte';
import SyncedPaginationHarness from './fixtures/SyncedPaginationHarness.svelte';
import {
  filter,
  getAriaSort,
  getPageCount,
  normalizePagination,
  resolveDateRangePreset,
  setDataTableFilters,
  setDataTablePageSize,
  toggleSort
} from '../src/lib/data-table/index.js';
import { Pagination } from '../src/lib/pagination/index.js';
import type { DataTableState, FilterTableRow } from '../src/lib/data-table/index.js';

function mockWindowScroll(initialX: number, initialY: number) {
  const originalScrollTo = window.scrollTo;
  const originalScrollX = Object.getOwnPropertyDescriptor(window, 'scrollX');
  const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
  let scrollX = initialX;
  let scrollY = initialY;
  const scrollTo = vi.fn((nextX?: number | ScrollToOptions, nextY?: number) => {
    if (typeof nextX === 'object') {
      scrollX = nextX.left ?? scrollX;
      scrollY = nextX.top ?? scrollY;
      return;
    }

    scrollX = nextX ?? scrollX;
    scrollY = nextY ?? scrollY;
  });

  Object.defineProperty(window, 'scrollX', { configurable: true, get: () => scrollX });
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  window.scrollTo = scrollTo;

  return {
    scrollTo,
    setScroll(nextX: number, nextY: number) {
      scrollX = nextX;
      scrollY = nextY;
    },
    getScroll() {
      return { x: scrollX, y: scrollY };
    },
    restore() {
      window.scrollTo = originalScrollTo;
      if (originalScrollX) {
        Object.defineProperty(window, 'scrollX', originalScrollX);
      }
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY);
      }
    }
  };
}

function mockLocalStorage(initialEntries: Record<string, string> = {}) {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const values = new Map(Object.entries(initialEntries));
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, String(value))),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    get length() {
      return values.size;
    }
  } as Storage;
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  return {
    storage,
    restore() {
      if (original) {
        Object.defineProperty(window, 'localStorage', original);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  };
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  const left = overrides.left ?? overrides.x ?? 0;
  const top = overrides.top ?? overrides.y ?? 0;
  const width = overrides.width ?? 0;
  const height = overrides.height ?? 0;
  const right = overrides.right ?? left + width;
  const bottom = overrides.bottom ?? top + height;

  return {
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width,
    height,
    toJSON() {
      return this;
    }
  } as DOMRect;
}

async function flushAnimationFrame() {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

describe('data table state helpers', () => {
  it('toggles sort and exposes aria-sort values', () => {
    const first = toggleSort(null, 'name');
    const second = toggleSort(first, 'name');
    const third = toggleSort(second, 'createdAt');

    expect(first).toEqual({ key: 'name', direction: 'asc' });
    expect(second).toEqual({ key: 'name', direction: 'desc' });
    expect(third).toEqual({ key: 'createdAt', direction: 'asc' });
    expect(getAriaSort(second, 'name')).toBe('descending');
    expect(getAriaSort(second, 'createdAt')).toBe('none');
  });

  it('normalizes pagination and resets page on page size or filter changes', () => {
    const state: DataTableState = {
      sort: null,
      pagination: { page: 4, pageSize: 10 },
      filters: {}
    };

    expect(getPageCount(41, 10)).toBe(5);
    expect(normalizePagination({ page: 99, pageSize: 20 }, 42)).toEqual({ page: 3, pageSize: 20 });
    expect(setDataTablePageSize(state, 50, 200).pagination).toEqual({ page: 1, pageSize: 50 });
    expect(setDataTableFilters(state, { status: 'active' }).pagination.page).toBe(1);
  });
});

describe('date range preset helpers', () => {
  const current = new Date(2026, 6, 8, 10, 30, 15);

  it('resolves this week through the final day for either week convention', () => {
    expect(resolveDateRangePreset('thisWeek', current, 1)).toEqual({
      startDate: '2026-07-06',
      endDate: '2026-07-12',
      preset: 'thisWeek'
    });
    expect(resolveDateRangePreset('thisWeek', current, 0)).toEqual({
      startDate: '2026-07-05',
      endDate: '2026-07-11',
      preset: 'thisWeek'
    });
  });

  it('resolves this month and this year through their final calendar days', () => {
    expect(resolveDateRangePreset('thisMonth', current)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      preset: 'thisMonth'
    });
    expect(resolveDateRangePreset('thisYear', current)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      preset: 'thisYear'
    });
  });

  it('keeps rolling and today presets bounded by the current date and time', () => {
    expect(resolveDateRangePreset('last7Days', current)).toEqual({
      startDate: '2026-07-02',
      endDate: '2026-07-08',
      preset: 'last7Days'
    });
    expect(resolveDateRangePreset('today', current)).toEqual({
      startDate: '2026-07-08',
      endDate: '2026-07-08',
      preset: 'today'
    });
  });

  it('uses the leap-day month end', () => {
    expect(resolveDateRangePreset('thisMonth', new Date(2024, 1, 10))).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      preset: 'thisMonth'
    });
  });
});

describe('data table components', () => {
  it('emits sort changes from sortable headers', async () => {
    const onSortChange = vi.fn();

    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name', sortable: true }],
        sort: null,
        preserveScrollOnSort: false,
        onSortChange
      }
    });

    expect(screen.queryByText('↕')).toBeNull();
    expect(screen.queryByText('▲')).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
    expect(container.querySelector('.suu-table__sort-icon--both')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: /Name/i }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
  });

  it('preserves window scroll around async sort changes', async () => {
    const scroll = mockWindowScroll(12, 480);
    const onSortChange = vi.fn(async () => {
      scroll.setScroll(0, 0);
      await Promise.resolve();
      scroll.setScroll(0, 0);
    });

    try {
      render(DataTable, {
        props: {
          pagination: false,
          rows: [{ name: 'Jane' }],
          columns: [{ key: 'name', header: 'Name', sortable: true }],
          sort: null,
          onSortChange
        }
      });

      await fireEvent.click(screen.getByRole('button', { name: /Name/i }));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
      expect(scroll.scrollTo).toHaveBeenCalledWith(12, 480);
      expect(scroll.getScroll()).toEqual({ x: 12, y: 480 });
    } finally {
      scroll.restore();
    }
  });

  it('renders sorted states with single-direction svg arrows', async () => {
    const { container, rerender } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name', sortable: true }],
        sort: { key: 'name', direction: 'asc' }
      }
    });

    expect(screen.queryByText('▲')).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
    expect(container.querySelector('.suu-table__sort-icon--asc')).toBeTruthy();
    expect(container.querySelector('.suu-table__sort-icon--desc')).toBeFalsy();

    await rerender({
      pagination: false,
      rows: [{ name: 'Jane' }],
      columns: [{ key: 'name', header: 'Name', sortable: true }],
      sort: { key: 'name', direction: 'desc' }
    });

    expect(container.querySelector('.suu-table__sort-icon--asc')).toBeFalsy();
    expect(container.querySelector('.suu-table__sort-icon--desc')).toBeTruthy();
  });

  it('renders row attributes and optional table styling classes', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ id: 42, name: 'Jane' }],
        columns: [
          {
            key: 'name',
            header: 'Name',
            nowrap: false,
            headerHorizontalAlign: 'center',
            headerVerticalAlign: 'middle',
            cellHorizontalAlign: 'right',
            cellVerticalAlign: 'bottom'
          }
        ],
        bordered: false,
        zebra: false,
        hoverable: false,
        verticalSeparators: true,
        tableLayout: 'fixed',
        stickyHeaderTop: '4rem',
        rowKey: 'id',
        rowAttributes: (row) => ({ 'data-row-id': (row as { id: number }).id })
      }
    });

    expect(container.querySelector('.suu-table-wrap--borderless')).toBeTruthy();
    expect(container.querySelector('.suu-table--plain')).toBeTruthy();
    expect(container.querySelector('.suu-table--zebra')).toBeFalsy();
    expect(container.querySelector('.suu-table--hoverable')).toBeFalsy();
    expect(container.querySelector('.suu-table--vertical-separators')).toBeTruthy();
    expect(container.querySelector('.suu-table--layout-fixed')).toBeTruthy();
    expect(container.querySelector('.suu-table--sticky-header')).toBeTruthy();
    expect(container.querySelector('.suu-table__sticky-offset-probe')).toBeTruthy();
    expect(container.querySelector('.suu-table-wrap')?.getAttribute('style')).toContain('--suu-table-sticky-top: 4rem');
    expect(container.querySelector('tr[data-row-id="42"]')).toBeTruthy();
    expect(container.querySelector('td[data-nowrap="false"]')).toBeTruthy();
    expect(container.querySelector('th[data-horizontal-align="center"][data-vertical-align="middle"]')).toBeTruthy();
    expect(container.querySelector('td[data-horizontal-align="right"][data-vertical-align="bottom"]')).toBeTruthy();
  });

  it('uses separate default header and cell alignment values', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }]
      }
    });

    expect(container.querySelector('th[data-horizontal-align="left"][data-vertical-align="middle"]')).toBeTruthy();
    expect(container.querySelector('td[data-horizontal-align="left"][data-vertical-align="top"]')).toBeTruthy();
  });

  it('can render data rows without a header section', () => {
    const { container } = render(DataTable, {
      props: {
        showHeader: false,
        pagination: false,
        rows: [{ name: 'Jane', role: 'Admin' }],
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'role', header: 'Role' }
        ]
      }
    });

    expect(container.querySelector('thead')).toBeNull();
    expect(container.querySelector('.suu-table__sticky-clone')).toBeNull();
    expect(screen.getByText('Jane')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('can disable sticky headers', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        stickyHeader: false
      }
    });

    expect(container.querySelector('.suu-table--sticky-header')).toBeFalsy();
  });

  it('shows the fixed header as soon as the original header reaches the sticky offset', async () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ id: 1, name: 'Jane' }],
        columns: [
          { key: 'id', header: 'ID', sortable: true },
          { key: 'name', header: 'Name', sortable: true }
        ],
        stickyHeaderOffset: '64px'
      }
    });

    const table = container.querySelector('.suu-table-wrap > table.suu-table') as HTMLTableElement;
    const header = table.tHead as HTMLTableSectionElement;
    const probe = container.querySelector('.suu-table__sticky-offset-probe') as HTMLElement;
    const [firstHeaderCell, secondHeaderCell] = Array.from(table.querySelectorAll('thead th')) as HTMLElement[];
    const spies = [
      vi.spyOn(table, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 63, bottom: 520, width: 320, height: 457 })),
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 63, bottom: 107, width: 320, height: 44 })),
      vi.spyOn(probe, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 64, bottom: 64 })),
      vi.spyOn(firstHeaderCell, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 63, bottom: 107, width: 140, height: 44 })),
      vi.spyOn(secondHeaderCell, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 63, bottom: 107, width: 180, height: 44 }))
    ];

    try {
      window.dispatchEvent(new Event('scroll'));
      await flushAnimationFrame();

      expect(container.querySelector('.suu-table__sticky-clone')).toBeTruthy();
      expect(table.classList.contains('suu-table--sticky-header-shadowed')).toBe(true);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('passes table layout and sticky header offset options through DataTable', () => {
    const { container } = render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        pagination: false,
        tableLayout: 'fixed',
        stickyHeaderTop: '3rem',
        stickyHeaderOffset: '64px'
      }
    });

    expect(container.querySelector('.suu-table--layout-fixed')).toBeTruthy();
    expect(container.querySelector('.suu-table--sticky-header')).toBeTruthy();
    expect(container.querySelector('.suu-table-wrap')?.getAttribute('style')).toContain('--suu-table-sticky-top: 64px');
  });

  it('waits for DataTable sort changes before restoring scroll', async () => {
    const scroll = mockWindowScroll(6, 320);
    const onSortChange = vi.fn(async () => {
      scroll.setScroll(0, 0);
      await Promise.resolve();
      scroll.setScroll(0, 0);
    });

    try {
      render(DataTable, {
        props: {
          rows: [{ name: 'Jane' }],
          columns: [{ key: 'name', header: 'Name', sortable: true }],
          pagination: false,
          onSortChange
        }
      });

      await fireEvent.click(screen.getByRole('button', { name: /Name/i }));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
      expect(scroll.getScroll()).toEqual({ x: 6, y: 320 });
    } finally {
      scroll.restore();
    }
  });

  it('emits page number pagination changes and resets to page 1 when page size changes', async () => {
    const onPaginationChange = vi.fn();

    render(Pagination, {
      props: {
        pagination: { page: 2, pageSize: 10 },
        totalRows: 35,
        pageSizeOptions: [10, 20],
        onPaginationChange
      }
    });

    expect(screen.queryByRole('button', { name: /Next/i })).toBeFalsy();

    await fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPaginationChange).toHaveBeenCalledWith({ page: 3, pageSize: 10 });

    await fireEvent.click(screen.getByRole('button', { name: 'Rows' }));
    await fireEvent.click(screen.getByRole('option', { name: '20' }));
    expect(onPaginationChange).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('collapses long pagination ranges while keeping the current page window', () => {
    render(Pagination, {
      props: {
        pagination: { page: 10, pageSize: 10 },
        totalRows: 1000,
        pageSizeOptions: [10]
      }
    });

    expect(screen.getByRole('button', { name: '1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: '100' })).toBeTruthy();
    expect(screen.getAllByText('...')).toHaveLength(2);
  });

  it('keeps two standalone paginations synchronized through controlled state', async () => {
    render(SyncedPaginationHarness, {
      props: {
        totalRows: 42,
        pageSizeOptions: [10, 20],
        initialPagination: { page: 1, pageSize: 10 }
      }
    });

    await fireEvent.click(screen.getAllByRole('button', { name: '2' })[0] as HTMLElement);
    expect(screen.getAllByRole('button', { name: '2' }).map((button) => button.getAttribute('aria-current'))).toEqual([
      'page',
      'page'
    ]);

    await fireEvent.click(screen.getAllByRole('button', { name: 'Rows' })[1] as HTMLElement);
    await fireEvent.click(screen.getByRole('option', { name: '20' }));

    expect(screen.getAllByRole('button', { name: '1' }).map((button) => button.getAttribute('aria-current'))).toEqual([
      'page',
      'page'
    ]);
    expect(screen.getAllByRole('button', { name: 'Rows' }).map((button) => button.textContent?.trim())).toEqual([
      '20',
      '20'
    ]);
  });

  it('renders synchronized server pagination above and below the table', async () => {
    const onRequest = vi.fn();
    const { container } = render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        pagination: { tableId: 'members', totalRows: 42, defaultPageSize: 20, onRequest }
      }
    });

    expect(container.querySelectorAll('.suu-pagination')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '1' })).toHaveLength(2);
    expect(screen.getByText('Jane')).toBeTruthy();

    const pageSizeButtons = screen.getAllByRole('button', { name: 'Rows' });
    await fireEvent.click(pageSizeButtons[0] as HTMLElement);
    expect(container.querySelector('.suu-dropdown__menu')?.classList.contains('suu-dropdown__menu--down')).toBe(true);
    await fireEvent.click(pageSizeButtons[0] as HTMLElement);
    await fireEvent.click(pageSizeButtons[1] as HTMLElement);
    expect(container.querySelector('.suu-dropdown__menu')?.classList.contains('suu-dropdown__menu--up')).toBe(true);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('restores and persists a valid page size through the table id', async () => {
    const storageKey = 'svelte-ui-utils:data-table:members:page-size';
    const localStorage = mockLocalStorage({ [storageKey]: '50' });
    const onRequest = vi.fn();
    try {
      render(DataTable, {
        props: {
          rows: [{ name: 'Jane' }],
          columns: [{ key: 'name', header: 'Name' }],
          pagination: {
            tableId: 'members', totalRows: 100, defaultPageSize: 20,
            pageSizeOptions: [20, 50, 100], persistPageSize: true, onRequest
          }
        }
      });

      await waitFor(() => expect(onRequest).toHaveBeenCalledWith({ page: 1, pageSize: 50 }));
      expect(screen.getAllByRole('button', { name: 'Rows' }).map((button) => button.textContent?.trim())).toEqual(['50', '50']);

      await fireEvent.click(screen.getAllByRole('button', { name: 'Rows' })[0] as HTMLElement);
      await fireEvent.click(screen.getByRole('option', { name: '100' }));
      await waitFor(() => expect(localStorage.storage.getItem(storageKey)).toBe('100'));
      expect(onRequest).toHaveBeenLastCalledWith({ page: 1, pageSize: 100 });
    } finally {
      localStorage.restore();
    }
  });

  it('ignores stored page sizes outside the normalized options', async () => {
    const storageKey = 'svelte-ui-utils:data-table:members:page-size';
    const localStorage = mockLocalStorage({ [storageKey]: '75' });
    const onRequest = vi.fn();
    try {
      render(DataTable, {
        props: {
          rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }],
          pagination: {
            tableId: 'members', totalRows: 100, defaultPageSize: 20,
            pageSizeOptions: [20, 50, 100], persistPageSize: true, onRequest
          }
        }
      });
      await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rows' })).toHaveLength(2));
      expect(onRequest).not.toHaveBeenCalled();
      expect(screen.getAllByRole('button', { name: 'Rows' })[0]?.textContent?.trim()).toBe('20');
    } finally {
      localStorage.restore();
    }
  });

  it('normalizes page size options and falls back to the first valid default', async () => {
    render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }],
        pagination: {
          tableId: 'members', totalRows: 100, defaultPageSize: 50,
          pageSizeOptions: [20, 20, -1, 12.5, 0], onRequest: vi.fn()
        }
      }
    });
    const pageSizeButton = screen.getAllByRole('button', { name: 'Rows' })[0] as HTMLElement;
    expect(pageSizeButton.textContent?.trim()).toBe('20');
    await fireEvent.click(pageSizeButton);
    expect(screen.getAllByRole('option').map((option) => option.textContent?.trim())).toEqual(['20']);
  });

  it('updates optimistically, disables both controls, and keeps state after success', async () => {
    const request = deferred();
    const onRequest = vi.fn(() => request.promise);
    render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }],
        pagination: { tableId: 'members', totalRows: 35, defaultPageSize: 10, onRequest }
      }
    });
    await fireEvent.click(screen.getAllByRole('button', { name: '3' })[0] as HTMLElement);
    expect(onRequest).toHaveBeenCalledWith({ page: 3, pageSize: 10 });
    expect(screen.getAllByRole('button', { name: '3' }).map((button) => button.getAttribute('aria-current'))).toEqual(['page', 'page']);
    expect(screen.getAllByRole('button', { name: 'Rows' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    request.resolve();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rows' })[0]?.hasAttribute('disabled')).toBe(false));
  });

  it('rolls back and unlocks controls after a rejected request', async () => {
    const request = deferred();
    const onRequest = vi.fn(() => request.promise);
    render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }],
        pagination: { tableId: 'members', totalRows: 35, defaultPageSize: 10, onRequest }
      }
    });
    await fireEvent.click(screen.getAllByRole('button', { name: '3' })[0] as HTMLElement);
    request.reject(new Error('request failed'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: '1' }).map((button) => button.getAttribute('aria-current'))).toEqual(['page', 'page']));
    expect(screen.getAllByRole('button', { name: 'Rows' })[0]?.hasAttribute('disabled')).toBe(false);
  });

  it('resets to page 1 when queryKey changes without requesting on initial mount', async () => {
    const onRequest = vi.fn();
    const basePagination = { tableId: 'members', totalRows: 35, defaultPageSize: 10, onRequest };
    const props = { rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }] };
    const { rerender } = render(DataTable, { props: { ...props, pagination: { ...basePagination, queryKey: 'active' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rows' })).toHaveLength(2));
    expect(onRequest).not.toHaveBeenCalled();
    await fireEvent.click(screen.getAllByRole('button', { name: '3' })[0] as HTMLElement);
    await waitFor(() => expect(onRequest).toHaveBeenCalledWith({ page: 3, pageSize: 10 }));
    onRequest.mockClear();
    await rerender({ ...props, pagination: { ...basePagination, queryKey: 'archived' } });
    await waitFor(() => expect(onRequest).toHaveBeenCalledWith({ page: 1, pageSize: 10 }));
  });

  it('does not let an older request completion unlock or replace newer pagination state', async () => {
    const firstRequest = deferred();
    const secondRequest = deferred();
    const onRequest = vi.fn()
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);
    const basePagination = { tableId: 'members', totalRows: 35, defaultPageSize: 10, onRequest };
    const props = { rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }] };
    const { rerender } = render(DataTable, { props: { ...props, pagination: { ...basePagination, queryKey: 'active' } } });

    await fireEvent.click(screen.getAllByRole('button', { name: '3' })[0] as HTMLElement);
    await rerender({ ...props, pagination: { ...basePagination, queryKey: 'archived' } });
    await waitFor(() => expect(onRequest).toHaveBeenNthCalledWith(2, { page: 1, pageSize: 10 }));

    firstRequest.resolve();
    await Promise.resolve();
    expect(screen.getAllByRole('button', { name: 'Rows' })[0]?.hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('button', { name: '1' })[0]?.getAttribute('aria-current')).toBe('page');

    secondRequest.resolve();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rows' })[0]?.hasAttribute('disabled')).toBe(false));
    expect(screen.getAllByRole('button', { name: '1' })[0]?.getAttribute('aria-current')).toBe('page');
  });

  it('continues without requesting when localStorage is unavailable', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage unavailable');
      }
    });
    const onRequest = vi.fn();
    try {
      render(DataTable, {
        props: {
          rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }],
          pagination: { tableId: 'members', totalRows: 35, persistPageSize: true, onRequest }
        }
      });
      await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rows' })).toHaveLength(2));
      expect(onRequest).not.toHaveBeenCalled();
    } finally {
      if (original) {
        Object.defineProperty(window, 'localStorage', original);
      }
    }
  });

  it('requests the final valid page when totalRows shrinks and does not request an empty page', async () => {
    const onRequest = vi.fn();
    const basePagination = { tableId: 'members', defaultPageSize: 10, onRequest };
    const props = { rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }] };
    const { rerender } = render(DataTable, { props: { ...props, pagination: { ...basePagination, totalRows: 100 } } });
    await fireEvent.click(screen.getAllByRole('button', { name: '10' })[0] as HTMLElement);
    await waitFor(() => expect(onRequest).toHaveBeenLastCalledWith({ page: 10, pageSize: 10 }));
    onRequest.mockClear();
    await rerender({ ...props, pagination: { ...basePagination, totalRows: 15 } });
    await waitFor(() => expect(onRequest).toHaveBeenCalledWith({ page: 2, pageSize: 10 }));
    onRequest.mockClear();
    await rerender({ ...props, rows: [], pagination: { ...basePagination, totalRows: 0 } });
    await waitFor(() => expect(screen.queryByRole('button', { name: '2' })).toBeNull());
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('hides pagination below the smallest page size and shows it at the boundary', () => {
    const props = { rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }] };
    const { container, rerender } = render(DataTable, {
      props: { ...props, pagination: { tableId: 'members', totalRows: 2, pageSizeOptions: [10, 20], onRequest: vi.fn() } }
    });
    expect(container.querySelector('.suu-pagination')).toBeFalsy();
    void rerender({ ...props, pagination: { tableId: 'members', totalRows: 10, pageSizeOptions: [10, 20], onRequest: vi.fn() } });
    return waitFor(() => expect(container.querySelectorAll('.suu-pagination')).toHaveLength(2));
  });

  it('renders an active first page when the selected size exceeds the row count', () => {
    const { container } = render(DataTable, {
      props: {
        rows: Array.from({ length: 12 }, (_, index) => ({ name: `Member ${index + 1}` })),
        columns: [{ key: 'name', header: 'Name' }],
        pagination: {
          tableId: 'members', totalRows: 12, defaultPageSize: 20,
          pageSizeOptions: [10, 20, 50], onRequest: vi.fn()
        }
      }
    });
    expect(container.querySelectorAll('.suu-pagination')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '1' }).map((button) => button.getAttribute('aria-current'))).toEqual(['page', 'page']);
  });

  it('uses localized DataTable defaults when labels are not overridden', () => {
    const { container } = render(DataTable, {
      props: {
        rows: [], columns: [{ key: 'name', header: 'Name' }], language: 'zh_cn',
        pagination: { tableId: 'members', totalRows: 12, onRequest: vi.fn() }
      }
    });
    expect(screen.getByText('暂无记录')).toBeTruthy();
    expect(screen.getAllByText('每页')).toHaveLength(2);
    expect(container.querySelectorAll('.suu-pagination[aria-label="分页"]')).toHaveLength(2);
  });

  it('renders static tables only when pagination is explicitly false', () => {
    const { container } = render(DataTable, {
      props: { pagination: false, rows: [{ name: 'Jane' }], columns: [{ key: 'name', header: 'Name' }] }
    });
    expect(container.querySelector('.suu-pagination')).toBeFalsy();
    expect(screen.getByText('Jane')).toBeTruthy();
  });

  it('renders checkbox and radio filter controls', async () => {
    const onStatusChange = vi.fn();
    const onRoleChange = vi.fn();
    const rows: FilterTableRow[] = [
      {
        key: 'status',
        title: 'Status',
        filter: filter.checkbox({
          value: [],
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Archived', value: 'archived' }
          ],
          onChange: onStatusChange
        })
      },
      {
        key: 'role',
        title: 'Role',
        filter: filter.radio({
          value: null,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Member', value: 'member' }
          ],
          onChange: onRoleChange
        })
      }
    ];

    const { container } = render(FilterTable, {
      props: { rows }
    });

    const filterTable = container.querySelector('.suu-filter-table__filters');
    expect(filterTable).toBeTruthy();
    expect(filterTable?.classList.contains('suu-filter-table__filters--borderless')).toBe(false);
    expect(getComputedStyle(filterTable as Element).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(container.querySelector('.suu-filter-table__filters-wrap')).toBeFalsy();
    expect(container.querySelector('.suu-table')).toBeFalsy();
    expect(screen.getByRole('rowheader', { name: 'Status' })).toBeTruthy();
    await fireEvent.click(screen.getByLabelText('Active'));
    expect(onStatusChange).toHaveBeenLastCalledWith(['active']);

    await fireEvent.click(screen.getByLabelText('Member'));
    expect(onRoleChange).toHaveBeenLastCalledWith('member');
  });

  it('renders grouped checkbox options with dividers and keeps one selection callback', async () => {
    const onChange = vi.fn();
    const { container } = render(FilterTable, {
      props: {
        rows: [{
          key: 'categories',
          title: 'Categories',
          filter: filter.checkbox({
            value: [],
            options: [],
            optionGroups: [
              { label: '前期', options: [{ label: '制作统筹', value: 'producer' }] },
              { label: '演奏', options: [{ label: '乐手', value: 'musician' }] }
            ],
            onChange
          })
        }]
      }
    });

    expect(container.querySelectorAll('.suu-filter-table__option')).toHaveLength(2);
    expect(container.querySelectorAll('.suu-filter-table__option--group-end')).toHaveLength(1);
    await fireEvent.click(screen.getByLabelText('乐手'));
    expect(onChange).toHaveBeenLastCalledWith(['musician']);
  });

  it('can render FilterTable without its outer border', () => {
    const { container } = render(FilterTable, {
      props: {
        bordered: false,
        rows: []
      }
    });

    expect(container.querySelector('.suu-filter-table__filters--borderless')).toBeTruthy();
  });

  it('renders a multi-select dropdown filter and keeps its menu open across selections', async () => {
    const onChange = vi.fn();
    const { container } = render(FilterTable, {
      props: {
        rows: [
          {
            key: 'groups',
            title: 'Groups',
            filter: filter.dropdownMultiSelect({
              value: [],
              options: [
                { label: 'A', value: 'a' },
                { label: 'B', value: 'b' }
              ],
              ariaLabel: 'Groups',
              onChange
            })
          }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
    expect(screen.getByRole('option', { name: 'A' })).toBeTruthy();
    expect(container.querySelector('.suu-dropdown__menu')).toHaveClass('suu-dropdown__menu--fit-content');
    await fireEvent.click(screen.getByRole('option', { name: 'A' }));
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    expect(container.querySelector('.suu-dropdown__menu')).toBeTruthy();
  });

  it('renders a unified dropdown filter with static grouped options', async () => {
    const onChange = vi.fn();
    render(FilterTable, {
      props: {
        rows: [
          {
            key: 'protocol',
            title: 'Protocol',
            filter: filter.dropdown({
              value: 'chat',
              optionGroups: [
                { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
                { label: 'Other', options: [{ label: 'Mail', value: 'mail' }] }
              ],
              groupsCollapsedByDefault: 'true',
              ariaLabel: 'Protocol',
              onChange
            })
          }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocol' }));
    expect(screen.getByRole('group', { name: 'Core' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Chat' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Core' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Chat' }));

    expect(onChange).toHaveBeenCalledWith('chat');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps a multiselect dropdown filter open across picks', async () => {
    const onChange = vi.fn();
    render(FilterTable, {
      props: {
        rows: [
          {
            key: 'roles',
            title: 'Roles',
            filter: filter.dropdown({
              value: ['editor'],
              multiselect: true,
              options: [
                { label: 'Editor', value: 'editor' },
                { label: 'Reviewer', value: 'reviewer' }
              ],
              ariaLabel: 'Roles',
              onChange
            })
          }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Roles' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Reviewer' }));

    expect(onChange).toHaveBeenLastCalledWith(['editor', 'reviewer']);
    expect(screen.getByRole('listbox', { name: 'Roles' })).toBeInTheDocument();
  });

  it('runs async search from a unified dropdown filter', async () => {
    const onChange = vi.fn();
    const loadOptions = vi.fn().mockResolvedValue({
      optionGroups: [{ label: 'People', options: [{ label: 'Jane Doe', value: 'jane' }] }]
    });

    render(FilterTable, {
      props: {
        rows: [
          {
            key: 'member',
            title: 'Member',
            filter: filter.dropdown({
              value: '',
              search: true,
              searchDebounceMs: 0,
              loadOptions,
              ariaLabel: 'Member',
              onChange
            })
          }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Member' }));
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ limit: 10 }));

    expect(await screen.findByRole('option', { name: 'Jane Doe' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('option', { name: 'Jane Doe' }));

    expect(onChange).toHaveBeenCalledWith('jane');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('uses an explicit plain background and supports disabling row hover changes', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        zebra: false,
        hoverable: false
      }
    });

    expect(container.querySelector('.suu-table--plain')).toBeTruthy();
    expect(container.querySelector('.suu-table--hoverable')).toBeFalsy();
  });

  it('keeps row hover changes enabled by default', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }]
      }
    });

    expect(container.querySelector('.suu-table--hoverable')).toBeTruthy();
  });

  it('renders container filters with dropdown search, button, link, and select controls', async () => {
    const onSearchChange = vi.fn();
    const onSearchClick = vi.fn();
    const onSelectChange = vi.fn();
    const { container } = render(FilterTable, {
      props: {
        rows: [
          {
            key: 'search',
            title: 'Search',
            filter: filter.container([
              filter.dropdownSearch({
                value: 'Jane',
                selectedItem: null,
                status: 'invalid',
                placeholder: 'Search people',
                clearLabel: 'Clear search',
                width: '24rem',
                minWidth: '16rem',
                maxWidth: '100%',
                getItemValue: (item) => String(item.id),
                loadOptions: () => ({ options: [], exactMatch: null }),
                onChange: onSearchChange
              }),
              filter.button({ icon: 'search', label: 'Find', onClick: onSearchClick }),
              filter.link({ href: '/clear', label: 'Clear' }),
              filter.select({
                value: 'all',
                ariaLabel: 'Type',
                options: [
                  { label: 'All', value: 'all' },
                  { label: 'Member', value: 'member' }
                ],
                onChange: onSelectChange
              })
            ])
          }
        ]
      }
    });

    expect(container.querySelector('.suu-filter-table__control-row')).toBeTruthy();
    const dropdown = container.querySelector('.suu-dropdown-search') as HTMLElement | null;
    expect(dropdown?.style.width).toBe('24rem');
    expect(dropdown?.style.minWidth).toBe('16rem');
    expect(dropdown?.style.maxWidth).toBe('100%');
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /Find/i }));
    expect(onSearchClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Clear/i })).toHaveAttribute('href', '/clear');
    await fireEvent.click(screen.getByRole('button', { name: 'Type' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Member' }));
    expect(onSelectChange).toHaveBeenCalledWith('member');
  });

  it('forwards focus options and footer text to dropdown search filters', async () => {
    render(FilterTable, {
      props: {
        rows: [
          {
            key: 'year',
            title: 'Year',
            filter: filter.dropdownSearch({
              value: '',
              selectedItem: null,
              status: 'empty',
              showOptionsOnFocus: true,
              focusOptions: [
                { id: 2025, title: '2025' },
                { id: 2026, title: '2026' },
                { id: 2027, title: '2027' },
              ],
              footerText: 'Other years must be entered manually',
              loadOptions: () => ({ options: [], exactMatch: null }),
              onChange: vi.fn(),
            }),
          },
        ],
      },
    });

    await fireEvent.focus(screen.getByRole('textbox'));

    expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Other years must be entered manually');
  });

  it('emits date range changes and exact last 24 hour values', async () => {
    const onChange = vi.fn();

    render(DateRangeFilter, {
      props: {
        startLabel: 'Start',
        endLabel: 'End',
        now: () => new Date(2026, 5, 16, 10, 30, 15),
        onChange
      }
    });

    await fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2026-06-01' } });
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-06-01',
      endDate: '',
      preset: null
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Last 24 Hours' }));
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-06-15',
      endDate: '2026-06-16',
      preset: 'last24Hours',
      startDateTime: '2026-06-15T10:30:15',
      endDateTime: '2026-06-16T10:30:15'
    });

    expect(screen.getByLabelText('Start')).toHaveValue('2026-06-15');
    expect(screen.getByLabelText('End')).toHaveValue('2026-06-16');
  });

  it('uses localized date range defaults', async () => {
    const onChange = vi.fn();

    render(DateRangeFilter, {
      props: {
        language: 'zh_cn',
        now: () => new Date(2026, 5, 16, 10, 30, 15),
        onChange
      }
    });

    await fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-06-01' } });
    await fireEvent.click(screen.getByRole('button', { name: '今天' }));

    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      preset: 'today'
    });
  });

  it('applies a default date range preset when the value is empty', async () => {
    const onChange = vi.fn();

    render(DateRangeFilter, {
      props: {
        defaultPreset: 'thisMonth',
        now: () => new Date(2026, 5, 16, 10, 30, 15),
        onChange
      }
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        preset: 'thisMonth'
      });
    });
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-06-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2026-06-30');
  });

  it('does not override an existing date range value with a default preset', async () => {
    const onChange = vi.fn();

    render(DateRangeFilter, {
      props: {
        value: {
          startDate: '2026-05-01',
          endDate: '2026-05-31',
          preset: null
        },
        defaultPreset: 'thisMonth',
        now: () => new Date(2026, 5, 16, 10, 30, 15),
        onChange
      }
    });

    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-05-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2026-05-31');
  });

  it('clears the date range when the active preset is clicked again', async () => {
    const onChange = vi.fn();

    render(DateRangeFilter, {
      props: {
        value: {
          startDate: '2026-06-16',
          endDate: '2026-06-16',
          preset: 'today'
        },
        now: () => new Date(2026, 5, 16, 10, 30, 15),
        onChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '',
      endDate: '',
      preset: null
    });
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('End date')).toHaveValue('');
  });

  it('auto-selects the most recent year when a quick month is selected first', async () => {
    const onChange = vi.fn();
    const { container } = render(DateRangeFilter, {
      props: {
        now: () => new Date(2026, 6, 2, 10, 30, 15),
        onChange
      }
    });

    const month = screen.getByRole('button', { name: 'Month' });
    const year = screen.getByRole('button', { name: 'Year' });
    expect(month).toHaveAttribute('data-value', '');
    expect(year).toHaveAttribute('data-value', '');
    expect(container.querySelectorAll('.suu-filter-preset-divider')).toHaveLength(2);

    await fireEvent.click(month);
    expect(container.querySelector('.suu-dropdown__menu--fit-content')).toBeTruthy();
    await fireEvent.click(screen.getByRole('option', { name: 'Jul' }));
    expect(year).toHaveAttribute('data-value', '2026');
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      preset: null
    });

    await fireEvent.click(year);
    expect(container.querySelector('.suu-dropdown__menu--fit-content')).toBeTruthy();
    expect(screen.getByRole('option', { name: '2025' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '2026' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '2027' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: '2024' })).toBeNull();
    expect(screen.queryByRole('option', { name: '2028' })).toBeNull();
    await fireEvent.click(screen.getByRole('option', { name: 'Year' }));
    await fireEvent.click(month);
    await fireEvent.click(screen.getByRole('option', { name: 'Aug' }));
    expect(year).toHaveAttribute('data-value', '2025');
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2025-08-01',
      endDate: '2025-08-31',
      preset: null
    });
  });

  it('keeps quick month empty when a quick year is selected first', async () => {
    const onChange = vi.fn();
    render(DateRangeFilter, {
      props: {
        now: () => new Date(2026, 6, 2, 10, 30, 15),
        quickYears: [2024, 2025, 2026],
        onChange
      }
    });

    const month = screen.getByRole('button', { name: 'Month' });
    const year = screen.getByRole('button', { name: 'Year' });

    await fireEvent.click(year);
    await fireEvent.click(screen.getByRole('option', { name: '2024' }));
    expect(month).toHaveAttribute('data-value', '');
    expect(year).toHaveAttribute('data-value', '2024');
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      preset: null
    });
  });

  it('emits number range changes with prefix labels', async () => {
    const onChange = vi.fn();
    const { container } = render(NumberRangeFilter, {
      props: {
        minLabel: 'Minimum',
        maxLabel: 'Maximum',
        prefixLabel: '$',
        step: '0.01',
        onChange
      }
    });

    expect(container.querySelectorAll('.suu-input-affix__label')).toHaveLength(2);
    await fireEvent.input(screen.getByLabelText('Minimum'), { target: { value: '25.5' } });
    expect(onChange).toHaveBeenLastCalledWith({ min: 25.5, max: null });

    await fireEvent.input(screen.getByLabelText('Maximum'), { target: { value: '80' } });
    expect(onChange).toHaveBeenLastCalledWith({ min: 25.5, max: 80 });
  });

  it('applies number range width', () => {
    const { container } = render(NumberRangeFilter, {
      props: {
        width: '6em'
      }
    });

    expect(container.querySelector('.suu-number-range-filter')).toHaveStyle({
      '--suu-number-range-field-width': '6em'
    });
  });

  it('uses localized number range defaults', async () => {
    const onChange = vi.fn();

    render(NumberRangeFilter, {
      props: {
        language: 'zh_tw',
        onChange
      }
    });

    await fireEvent.input(screen.getByLabelText('最小值'), { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith({ min: 12, max: null });
  });

  it('emits date and number range filter changes', async () => {
    const onIssueDateChange = vi.fn();
    const onAmountChange = vi.fn();
    const rows: FilterTableRow[] = [
      {
        key: 'issueDate',
        title: 'Issue date',
        filter: filter.dateRange({
          value: { startDate: '', endDate: '', preset: null },
          startLabel: 'From',
          endLabel: 'To',
          defaultPreset: 'last7Days',
          now: () => new Date(2026, 5, 16, 9, 0, 0),
          onChange: onIssueDateChange
        })
      },
      {
        key: 'amount',
        title: 'Amount',
        filter: filter.numberRange({
          value: { min: null, max: null },
          minLabel: 'Min amount',
          maxLabel: 'Max amount',
          prefixLabel: '$',
          step: '0.01',
          onChange: onAmountChange
        })
      }
    ];

    const { container } = render(FilterTable, {
      props: { rows }
    });

    await waitFor(() => {
      expect(onIssueDateChange).toHaveBeenLastCalledWith({
        startDate: '2026-06-10',
        endDate: '2026-06-16',
        preset: 'last7Days'
      });
    });
    expect(container.querySelector('.suu-filter-table__filters')).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Issue date' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onIssueDateChange).toHaveBeenLastCalledWith({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      preset: 'today'
    });

    await fireEvent.input(screen.getByLabelText('Min amount'), { target: { value: '10' } });
    expect(onAmountChange).toHaveBeenLastCalledWith({ min: 10, max: null });
  });

  it('passes language through FilterTable child controls', async () => {
    const onChange = vi.fn();

    render(FilterTable, {
      props: {
        language: 'zh_tw',
        rows: [
          {
            key: 'amount',
            title: 'Amount',
            filter: filter.numberRange({
              value: { min: null, max: null },
              onChange
            })
          }
        ]
      }
    });

    await fireEvent.input(screen.getByLabelText('最小值'), { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith({ min: 9, max: null });
  });
});
