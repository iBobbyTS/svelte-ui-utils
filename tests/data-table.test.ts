import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import DataTable from '../src/lib/data-table/DataTable.svelte';
import DateRangeFilter from '../src/lib/data-table/DateRangeFilter.svelte';
import FilterTable from '../src/lib/data-table/FilterTable.svelte';
import NumberRangeFilter from '../src/lib/data-table/NumberRangeFilter.svelte';
import SyncedPaginationHarness from './fixtures/SyncedPaginationHarness.svelte';
import GroupedTableHarness from './fixtures/GroupedTableHarness.svelte';
import {
  filter,
  getAriaSort,
  getPageCount,
  getSubCellValue,
  isDateRangePreset,
  normalizePagination,
  resolveDateRangePreset,
  setDataTableFilters,
  setDataTablePageSize,
  toggleSort
} from '../src/lib/data-table/index.js';
import { Pagination } from '../src/lib/pagination/index.js';
import type { DataTableColumn, DataTableState, FilterTableRow } from '../src/lib/data-table/index.js';

describe('exact column track sizing', () => {
  it('renders grouped and ungrouped tracks without stretching untouched columns', async () => {
    const columns: DataTableColumn[] = [
      { key: 'part', header: 'Part' },
      { key: 'musician', header: 'Musician', subColumns: [{ key: 'name', width: '8rem' }, { key: 'note' }] }
    ];
    const { container, rerender } = render(DataTable, { rows: [], columns, pagination: false, stickyHeader: false, columnTrackWidths: [80, 130, 300] });
    const table = container.querySelector('table')!;
    const widths = () => [...table.querySelectorAll('col')].map((col) => col.style.width);
    expect(table.querySelectorAll('colgroup')).toHaveLength(2);
    expect(table.style.tableLayout).toBe('fixed');
    expect(table.style.width).toBe('510px');
    expect(table.parentElement?.classList.contains('suu-table-wrap--sized-tracks')).toBe(true);
    expect(widths()).toEqual(['80px', '130px', '300px']);
    await rerender({ columnTrackWidths: [80, 200, 300] });
    expect(table.style.width).toBe('580px');
    expect(widths()).toEqual(['80px', '200px', '300px']);
    await rerender({ columnTrackWidths: undefined });
    expect(table.style.width).toBe('');
    expect(table.parentElement?.classList.contains('suu-table-wrap--sized-tracks')).toBe(false);
    expect(widths()).toEqual(['', '8rem', '']);
  });

  it('supports exact widths in a plain table without changing its header structure', () => {
    const columns = [{ key: 'name', header: 'Name' }, { key: 'note', header: 'Note' }];
    const { container } = render(DataTable, { rows: [], columns, pagination: false, stickyHeader: false, columnTrackWidths: [80, 240] });
    expect(container.querySelectorAll('thead tr')).toHaveLength(1);
    expect([...container.querySelectorAll('col')].map((col) => col.style.width)).toEqual(['80px', '240px']);
    expect(container.querySelector('table')!.style.width).toBe('320px');
  });
});

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

function dropdownSearchRows(options: Parameters<typeof filter.dropdownSearch>[0]) {
  return [{ key: 'search', title: 'Search', filter: filter.dropdownSearch(options) }];
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

  it('resolves grouped sub cell values from render callbacks or the sub row field', () => {
    expect(getSubCellValue({ label: '甲' }, { key: 'label' })).toBe('甲');
    expect(getSubCellValue({ label: '甲' }, { key: 'label', render: (subRow) => `[${(subRow as { label: string }).label}]` })).toBe('[甲]');
    // render 返回 undefined 表示回退到子行同名字段。
    expect(getSubCellValue({ label: '甲' }, { key: 'label', render: () => undefined })).toBe('甲');
    expect(getSubCellValue({ label: null }, { key: 'label' })).toBe('');
    expect(getSubCellValue({}, { key: 'missing' })).toBe('');
    expect(getSubCellValue(null, { key: 'label' })).toBe('');
    expect(getSubCellValue('text', { key: 'label' })).toBe('');
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

  it('recognizes built-in preset keys only', () => {
    expect(isDateRangePreset('thisYear')).toBe(true);
    expect(isDateRangePreset('last24Hours')).toBe(true);
    expect(isDateRangePreset('firstHalfYear')).toBe(false);
    expect(isDateRangePreset('divider')).toBe(false);
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

    const button = screen.getByRole('button', { name: /Name/i });
    await fireEvent.click(button);
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
    expect(button).toBeEnabled();
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

  it('shows the fixed header at the sticky offset and locks both sets of sort buttons during sorting', async () => {
    let finishSort!: () => void;
    const pending = new Promise<void>((resolve) => { finishSort = resolve; });
    const onSortChange = vi.fn().mockReturnValueOnce(pending);
    const { container, rerender } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ id: 1, name: 'Jane' }],
        columns: [
          { key: 'id', header: 'ID', sortable: true },
          { key: 'name', header: 'Name', sortable: true },
          { key: 'status', header: 'Status' }
        ],
        stickyHeaderOffset: '64px',
        preserveScrollOnSort: false,
        onSortChange
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

      expect(table.classList.contains('suu-table--sticky-header-shadowed')).toBe(true);
      const stickyButtons = container.querySelectorAll<HTMLButtonElement>('.suu-table__sticky-clone button');
      const regularButtons = header.querySelectorAll<HTMLButtonElement>('button');
      expect(stickyButtons).toHaveLength(2);
      expect(regularButtons).toHaveLength(2);

      const sortHeaders = [header, container.querySelector('.suu-table__sticky-clone thead')!];
      for (const section of sortHeaders) {
        expect(Array.from(section.querySelectorAll('th'), (cell) => cell.getAttribute('aria-sort')))
          .toEqual(['none', 'none', null]);
      }

      await fireEvent.click(stickyButtons[0]);
      expect(onSortChange).toHaveBeenCalledWith({ key: 'id', direction: 'asc' });
      for (const button of [...stickyButtons, ...regularButtons]) {
        expect(button).toBeDisabled();
        await fireEvent.click(button);
      }
      expect(onSortChange).toHaveBeenCalledTimes(1);

      finishSort();
      await waitFor(() => {
        for (const button of [...stickyButtons, ...regularButtons]) expect(button).toBeEnabled();
      });
      await fireEvent.click(regularButtons[1]);
      expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'asc' });

      for (const [direction, ariaSort] of [['asc', 'ascending'], ['desc', 'descending']] as const) {
        await rerender({ sort: { key: 'id', direction } });
        for (const section of sortHeaders) {
          expect(Array.from(section.querySelectorAll('th'), (cell) => cell.getAttribute('aria-sort')))
            .toEqual([ariaSort, 'none', null]);
        }
      }
    } finally {
      finishSort();
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

  it('renders a text filter input that reports every keystroke by default', async () => {
    const onChange = vi.fn();
    render(FilterTable, {
      props: {
        rows: [
          {
            key: 'location',
            title: 'Location',
            filter: filter.text({
              value: '',
              placeholder: 'Search location',
              ariaLabel: 'Location filter',
              onChange
            })
          }
        ]
      }
    });

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('placeholder', 'Search location');
    expect(input).toHaveAttribute('aria-label', 'Location filter');
    await fireEvent.input(input, { target: { value: '上海' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('上海');
  });

  it('debounces text filter changes and flushes the pending draft on Enter', async () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      render(FilterTable, {
        props: {
          rows: [
            {
              key: 'location',
              title: 'Location',
              filter: filter.text({ value: '', debounceMs: 300, onChange })
            }
          ]
        }
      });

      const input = screen.getByRole('searchbox');
      await fireEvent.input(input, { target: { value: '北' } });
      await fireEvent.input(input, { target: { value: '北京' } });
      expect(onChange).not.toHaveBeenCalled();

      await fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith('北京');

      await fireEvent.input(input, { target: { value: '北京市' } });
      vi.advanceTimersByTime(300);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith('北京市');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the text filter a controlled input across external resets', async () => {
    const onChange = vi.fn();
    const rowsFor = (value: string): FilterTableRow[] => [
      {
        key: 'location',
        title: 'Location',
        filter: filter.text({ value, onChange })
      }
    ];
    const { rerender } = render(FilterTable, { props: { rows: rowsFor('广州') } });

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('广州');
    // Typing is not clobbered while the controlled value lags behind the draft.
    await fireEvent.input(input, { target: { value: '广州市' } });
    expect(input.value).toBe('广州市');
    expect(onChange).toHaveBeenLastCalledWith('广州市');

    await rerender({ rows: rowsFor('') });
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
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
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ limit: 50 }));

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
                getItemLabel: (item) => item.label,
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
    const dropdown = container.querySelector('.suu-dropdown--search') as HTMLElement | null;
    expect(dropdown?.style.width).toBe('24rem');
    expect(dropdown?.style.minWidth).toBe('16rem');
    expect(dropdown?.style.maxWidth).toBe('100%');
    const dropdownInput = container.querySelector('input.suu-dropdown__input') as HTMLInputElement | null;
    expect(dropdownInput?.placeholder).toBe('Search people');
    await fireEvent.click(screen.getByRole('button', { name: /Find/i }));
    expect(onSearchClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Clear/i })).toHaveAttribute('href', '/clear');
    await fireEvent.click(screen.getByRole('button', { name: 'Type' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Member' }));
    expect(onSelectChange).toHaveBeenCalledWith('member');
  });

  it('maps a dropdown search selection back to the legacy label-valued detail', async () => {
    const onChange = vi.fn();
    const item = { label: 'Alice Chen', value: 'user-42' };
    render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          getItemLabel: (option: { label: string }) => option.label.toUpperCase(),
          loadOptions: () => ({ options: [item] }),
          onChange
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));

    expect(onChange).toHaveBeenCalledWith({
      value: 'ALICE CHEN',
      selectedItem: item,
      selectedItems: [],
      status: 'valid'
    });
  });

  it('renders async dropdown search results from loadOptions', async () => {
    const loadOptions = vi.fn(async (query: string) => ({
      options: query === 'al' ? [{ label: 'Alice Chen', value: 'user-42' }] : []
    }));
    render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          loadOptions,
          onChange: vi.fn()
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'al' } });

    expect(await screen.findByRole('option', { name: 'Alice Chen' })).toBeInTheDocument();
  });

  it('reports every free-text keystroke through onQueryChange without touching onChange', async () => {
    const onQueryChange = vi.fn();
    const onChange = vi.fn();
    render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          loadOptions: () => ({ options: [] }),
          onQueryChange,
          onChange
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'A' } });
    await fireEvent.input(input, { target: { value: 'Al' } });

    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange).toHaveBeenNthCalledWith(1, 'A');
    expect(onQueryChange).toHaveBeenNthCalledWith(2, 'Al');
    // onChange 保持「选中提交」语义，纯输入不触发。
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reconciles a truly external dropdown search value without replacing the input node', async () => {
    const loadOptions = vi.fn(() => ({ options: [{ label: 'Alice Chen', value: 'user-42' }] }));
    const { rerender } = render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          loadOptions,
          onChange: vi.fn()
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Old draft' } });
    expect(input.value).toBe('Old draft');

    await rerender({
      rows: dropdownSearchRows({
        value: 'New value',
        selectedItem: { label: 'New value', value: 'new-1' },
        status: 'valid',
        debounceMs: 0,
        loadOptions,
        onChange: vi.fn()
      })
    });

    const nextInput = screen.getByRole('combobox') as HTMLInputElement;
    // 外部替换不重建节点，但 Dropdown 必须就地重置内部 query/results/draft。
    expect(nextInput).toBe(input);
    expect(nextInput.value).toBe('New value');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps the same dropdown search instance free of a pending result from the previous value', async () => {
    let resolveOld: ((result: { options: Array<{ label: string; value: string }> }) => void) | undefined;
    const loadOptions = vi.fn(
      () => new Promise<{ options: Array<{ label: string; value: string }> }>((resolve) => {
        resolveOld = resolve;
      })
    );
    const { rerender } = render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          loadOptions,
          onChange: vi.fn()
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'old' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('old', expect.anything()));

    await rerender({
      rows: dropdownSearchRows({
        value: 'Picked',
        selectedItem: { label: 'Picked', value: 'picked' },
        status: 'valid',
        debounceMs: 0,
        loadOptions,
        onChange: vi.fn()
      })
    });

    resolveOld?.({ options: [{ label: 'Stale result', value: 'stale' }] });
    await tick();
    await tick();

    const nextInput = screen.getByRole('combobox') as HTMLInputElement;
    expect(nextInput).toBe(input);
    expect(nextInput.value).toBe('Picked');
    expect(screen.queryByRole('option', { name: 'Stale result' })).toBeNull();
  });

  it('returns no dropdown search options for queries below minLength', async () => {
    const loadOptions = vi.fn(() => ({ options: [{ label: 'Alice Chen', value: 'user-42' }] }));
    render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          minLength: 3,
          loadOptions,
          onChange: vi.fn()
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: ' ab ' } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadOptions).not.toHaveBeenCalled();
    expect(screen.queryByRole('option', { name: 'Alice Chen' })).toBeNull();

    await fireEvent.input(input, { target: { value: ' abc ' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('abc', expect.anything()));
  });

  it('does not emit a dropdown search change when typing over a controlled selection', async () => {
    const onChange = vi.fn();
    const item = { label: 'Alice Chen', value: 'user-42' };
    render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: 'user-42',
          selectedItem: item,
          status: 'valid',
          debounceMs: 0,
          loadOptions: () => ({ options: [item] }),
          onChange
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Alice Chen');

    await fireEvent.input(input, { target: { value: 'Ali' } });
    await tick();

    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));

    expect(onChange).toHaveBeenCalledWith({
      value: 'Alice Chen',
      selectedItem: item,
      selectedItems: [],
      status: 'valid'
    });
  });

  it('keeps the same focused input when the selected value is written back', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const loadOptions = vi.fn(() => ({ options: [item] }));
    const onChange = vi.fn();
    const { rerender } = render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          loadOptions,
          onChange
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));

    expect(onChange).toHaveBeenCalledWith({
      value: 'Alice Chen',
      selectedItem: item,
      selectedItems: [],
      status: 'valid'
    });

    // 父组件把选中结果回写到受控 value/selectedItem，等价于选中后的正常回传。
    await rerender({
      rows: dropdownSearchRows({
        value: 'user-42',
        selectedItem: item,
        status: 'valid',
        debounceMs: 0,
        loadOptions,
        onChange
      })
    });

    const nextInput = screen.getByRole('combobox') as HTMLInputElement;
    expect(nextInput).toBe(input);
    expect(nextInput.value).toBe('Alice Chen');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('treats a controlled clear after a dropped divergence report as an external replacement', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const loadOptions = vi.fn(() => ({ options: [item] }));
    const onChange = vi.fn();
    const { rerender } = render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: 'user-42',
          selectedItem: item,
          status: 'valid',
          debounceMs: 0,
          loadOptions,
          onChange
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Alice Chen');
    input.focus();

    await fireEvent.input(input, { target: { value: 'Alice Ch' } });
    expect(input.value).toBe('Alice Ch');
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Alice Ch', expect.anything()));

    // FilterControl 的适配器契约会丢弃偏离上报的 ''（onChange 只表达选中变更），
    // 因此此后的受控清空不是对本次上报的同步回传，而是真正的外部替换。
    await rerender({
      rows: dropdownSearchRows({
        value: '',
        selectedItem: null,
        status: 'empty',
        debounceMs: 0,
        loadOptions,
        onChange
      })
    });

    const nextInput = screen.getByRole('combobox') as HTMLInputElement;
    expect(nextInput).toBe(input);
    expect(nextInput.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('listbox')).toBeNull();

    // 重置后继续输入仍按完整文本驱动搜索。
    await fireEvent.input(nextInput, { target: { value: 'Alice Che' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Alice Che', expect.anything()));
  });

  it('applies a non-idempotent getItemLabel exactly once to the selected label', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const getItemLabel = (option: { label: string }) => `${option.label}!`;
    const { rerender } = render(FilterTable, {
      props: {
        rows: dropdownSearchRows({
          value: '',
          selectedItem: null,
          status: 'empty',
          debounceMs: 0,
          getItemLabel,
          loadOptions: () => ({ options: [item] }),
          onChange: vi.fn()
        })
      }
    });

    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));
    expect(input.value).toBe('Alice Chen!');

    await rerender({
      rows: dropdownSearchRows({
        value: 'user-42',
        selectedItem: item,
        status: 'valid',
        debounceMs: 0,
        getItemLabel,
        loadOptions: () => ({ options: [item] }),
        onChange: vi.fn()
      })
    });

    const rebuiltInput = screen.getByRole('combobox') as HTMLInputElement;
    expect(rebuiltInput.value).toBe('Alice Chen!');
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

  it('renders only the configured preset entries', () => {
    const { container } = render(DateRangeFilter, {
      props: {
        presets: [
          'last7Days',
          'last30Days',
          'divider',
          {
            key: 'firstHalfYear',
            label: 'First Half',
            resolve: ({ now }) => ({
              startDate: new Date(now.getFullYear(), 0, 1),
              endDate: new Date(now.getFullYear(), 5, 30)
            })
          },
          {
            key: 'secondHalfYear',
            label: 'Second Half',
            resolve: ({ now }) => ({
              startDate: new Date(now.getFullYear(), 6, 1),
              endDate: new Date(now.getFullYear(), 11, 31)
            })
          }
        ],
        now: () => new Date(2026, 8, 20, 12)
      }
    });

    expect(screen.getByRole('button', { name: 'Last 7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First Half' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second Half' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Last 24 Hours' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'This Year' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Month' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Year' })).toBeNull();
    expect(container.querySelectorAll('.suu-filter-preset-divider')).toHaveLength(1);
  });

  it('resolves custom presets, marks them active, and clears on the second click', async () => {
    const onChange = vi.fn();
    render(DateRangeFilter, {
      props: {
        presets: [
          {
            key: 'firstHalfYear',
            label: 'First Half',
            resolve: ({ now }) => ({
              startDate: new Date(now.getFullYear(), 0, 1),
              endDate: new Date(now.getFullYear(), 5, 30)
            })
          }
        ],
        now: () => new Date(2026, 8, 20, 12),
        onChange
      }
    });

    const button = screen.getByRole('button', { name: 'First Half' });
    await fireEvent.click(button);
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      preset: 'firstHalfYear'
    });
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2026-06-30');
    expect(button).toHaveClass('suu-filter-preset--active');

    await fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-02-01' } });
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-02-01',
      endDate: '2026-06-30',
      preset: null
    });
    expect(button).not.toHaveClass('suu-filter-preset--active');

    await fireEvent.click(button);
    await fireEvent.click(button);
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '',
      endDate: '',
      preset: null
    });
  });

  it('falls back to presetLabels for custom preset keys', () => {
    render(DateRangeFilter, {
      props: {
        presets: [
          {
            key: 'firstHalfYear',
            resolve: ({ now }) => ({
              startDate: new Date(now.getFullYear(), 0, 1),
              endDate: new Date(now.getFullYear(), 5, 30)
            })
          },
          'thisYear'
        ],
        presetLabels: { firstHalfYear: 'H1', thisYear: 'Current year' },
        now: () => new Date(2026, 8, 20, 12)
      }
    });

    expect(screen.getByRole('button', { name: 'H1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current year' })).toBeInTheDocument();
  });

  it('applies a custom default preset by key on mount', async () => {
    const onChange = vi.fn();
    render(DateRangeFilter, {
      props: {
        presets: [
          {
            key: 'secondHalfYear',
            label: 'Second Half',
            resolve: ({ now }) => ({
              startDate: new Date(now.getFullYear(), 6, 1),
              endDate: new Date(now.getFullYear(), 11, 31)
            })
          }
        ],
        defaultPreset: 'secondHalfYear',
        now: () => new Date(2026, 8, 20, 12),
        onChange
      }
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        preset: 'secondHalfYear'
      });
    });
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-07-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2026-12-31');
  });

  it('renders a consumer-controlled select entry and reports its changes', async () => {
    const onSelectChange = vi.fn();
    const onChange = vi.fn();
    render(DateRangeFilter, {
      props: {
        presets: [
          'last7Days',
          {
            type: 'select',
            key: 'halfYearPicker',
            value: '2026',
            options: [
              { label: '2025', value: '2025' },
              { label: '2026', value: '2026' }
            ],
            ariaLabel: 'Survey year',
            onChange: onSelectChange
          },
          {
            key: 'firstHalfYear',
            label: 'First Half',
            resolve: ({ now }) => ({
              startDate: new Date(now.getFullYear(), 0, 1),
              endDate: new Date(now.getFullYear(), 5, 30)
            })
          }
        ],
        now: () => new Date(2026, 8, 20, 12),
        onChange
      }
    });

    const select = screen.getByRole('button', { name: 'Survey year' });
    expect(select).toHaveAttribute('data-value', '2026');

    await fireEvent.click(select);
    await fireEvent.click(screen.getByRole('option', { name: '2025' }));
    expect(onSelectChange).toHaveBeenLastCalledWith('2025');
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'First Half' }));
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      preset: 'firstHalfYear'
    });
  });

  it('passes custom presets through a FilterTable date range row', async () => {
    const onChange = vi.fn();
    render(FilterTable, {
      props: {
        rows: [
          {
            key: 'dateRange',
            title: 'Date range',
            filter: filter.dateRange({
              value: { startDate: '', endDate: '', preset: null },
              presets: [
                'last7Days',
                {
                  key: 'firstHalfYear',
                  label: 'First Half',
                  resolve: ({ now }) => ({
                    startDate: new Date(now.getFullYear(), 0, 1),
                    endDate: new Date(now.getFullYear(), 5, 30)
                  })
                }
              ],
              now: () => new Date(2026, 8, 20, 12),
              onChange
            })
          }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'First Half' }));
    expect(onChange).toHaveBeenLastCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      preset: 'firstHalfYear'
    });
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
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

describe('grouped data table columns', () => {
  type Detail = { id: number; label: string; count: string; note?: string };
  type ParentRow = { id: string; name: string; details: Detail[]; canAdd?: boolean };

  function bodyTrackOccupancy(body: HTMLTableSectionElement, trackCount: number) {
    const rows = Array.from(body.rows);
    const slots = rows.map(() => Array<HTMLTableCellElement | null>(trackCount).fill(null));

    rows.forEach((row, rowIndex) => {
      let trackIndex = 0;
      for (const cell of row.cells) {
        while (slots[rowIndex][trackIndex]) trackIndex += 1;
        const trackEnd = trackIndex + cell.colSpan;
        const rowEnd = rowIndex + cell.rowSpan;
        expect(trackEnd, `physical row ${rowIndex} exceeds the declared tracks`).toBeLessThanOrEqual(trackCount);
        expect(rowEnd).toBeLessThanOrEqual(rows.length);

        for (let y = rowIndex; y < rowEnd; y += 1) {
          for (let x = trackIndex; x < trackEnd; x += 1) {
            expect(slots[y][x]).toBeNull();
            slots[y][x] = cell;
          }
        }
        trackIndex = trackEnd;
      }
      expect(slots[rowIndex]).not.toContain(null);
    });

    return slots;
  }

  function detailColumns(): DataTableColumn[] {
    return [
      { key: 'name', header: '姓名' },
      {
        key: 'details',
        header: '明细',
        subColumns: [
          { key: 'label', header: '项目' },
          { key: 'count', header: '数量', cellHorizontalAlign: 'right', nowrap: false },
          { key: 'note', header: '备注' }
        ],
        getSubRows: (row) => (row as ParentRow).details
      }
    ];
  }

  const parentRows: ParentRow[] = [
    { id: 'a', name: '甲', details: [{ id: 1, label: '甲-1', count: '1' }] },
    {
      id: 'b',
      name: '乙',
      details: [
        { id: 2, label: '乙-1', count: '2', note: '长文本备注用于撑开列宽并保持列轨对齐' },
        { id: 3, label: '乙-2', count: '3' }
      ]
    }
  ];

  it('renders a single header row and no grouped markup without subColumns', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: [{ name: 'Jane' }, { name: 'John' }],
        columns: [{ key: 'name', header: 'Name' }]
      }
    });

    const table = container.querySelector('table.suu-table') as HTMLTableElement;
    expect(table.classList.contains('suu-table--grouped')).toBe(false);
    expect(table.querySelector('colgroup')).toBeNull();
    expect(container.querySelectorAll('thead tr')).toHaveLength(1);
    expect(container.querySelectorAll('tbody')).toHaveLength(1);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelector('[data-suu-first-column]')).toBeNull();
    expect(container.querySelector('[data-suu-group-header]')).toBeNull();
    expect(container.querySelector('th')?.hasAttribute('rowspan')).toBe(false);
  });

  it('renders two header rows with a grouped parent header and its sub columns', () => {
    const { container } = render(DataTable, {
      props: { pagination: false, rows: parentRows, columns: detailColumns() }
    });

    const headerRows = Array.from(container.querySelectorAll('thead tr')) as HTMLTableRowElement[];
    expect(headerRows).toHaveLength(2);

    const [firstRow, secondRow] = headerRows;
    const nameHeader = firstRow.cells[0] as HTMLTableCellElement;
    expect(nameHeader.textContent?.trim()).toBe('姓名');
    expect(nameHeader.getAttribute('rowspan')).toBe('2');
    expect(nameHeader.getAttribute('scope')).toBe('col');

    const groupHeader = firstRow.cells[1] as HTMLTableCellElement;
    expect(groupHeader.textContent?.trim()).toBe('明细');
    expect(groupHeader.getAttribute('colspan')).toBe('3');
    expect(groupHeader.getAttribute('scope')).toBe('colgroup');
    expect(groupHeader.getAttribute('data-suu-group-header')).toBe('true');

    expect(Array.from(secondRow.cells).map((cell) => cell.textContent?.trim())).toEqual(['项目', '数量', '备注']);
    for (const cell of Array.from(secondRow.cells)) {
      expect(cell.getAttribute('scope')).toBe('col');
    }
    expect(secondRow.cells[1].getAttribute('data-nowrap')).toBe('false');
    expect(secondRow.cells[1].getAttribute('data-horizontal-align')).toBe('left');
  });

  it('renders sub rows inside the parent row with spanning parent cells', () => {
    const { container } = render(DataTable, {
      props: { pagination: false, rows: parentRows, columns: detailColumns() }
    });

    const groups = Array.from(container.querySelectorAll('tbody.suu-table__row-group'));
    expect(groups).toHaveLength(2);

    // 首条子行与父行其它单元格共用第一物理行：一条子行只有一行，两条子行多出一条续行。
    expect(groups[0].querySelectorAll('tr')).toHaveLength(1);
    expect(groups[1].querySelectorAll('tr')).toHaveLength(2);

    const firstParentCell = groups[0].querySelector('tr td') as HTMLTableCellElement;
    expect(firstParentCell.getAttribute('rowspan')).toBe('1');
    const secondParentCell = groups[1].querySelector('tr td') as HTMLTableCellElement;
    expect(secondParentCell.getAttribute('rowspan')).toBe('2');

    const firstGroupCells = Array.from(groups[0].querySelectorAll('tr:first-child td')).filter(
      (cell) => cell.getAttribute('data-suu-group-cell') === 'true'
    );
    expect(firstGroupCells.map((cell) => cell.textContent?.trim())).toEqual(['甲-1', '1', '']);
    expect(firstGroupCells[1].getAttribute('data-horizontal-align')).toBe('right');

    // 单分组列时每个父行的物理行数由自身子行数决定，不需要填充格。
    expect(container.querySelectorAll('.suu-table__sub-filler')).toHaveLength(0);

    const secondGroupSubRows = Array.from(groups[1].querySelectorAll('tr.suu-table__sub-row')) as HTMLTableRowElement[];
    expect(secondGroupSubRows).toHaveLength(1);
    expect(secondGroupSubRows[0].getAttribute('data-suu-sub-row-index')).toBe('1');
    expect(Array.from(secondGroupSubRows[0].cells).map((cell) => cell.textContent?.trim())).toEqual(['乙-2', '3', '']);
  });

  it('keeps the fallback and caller footer in their tracks alongside populated groups', () => {
    const columns = [...detailColumns(), { key: 'id', header: '编号' }];
    const rows: ParentRow[] = [
      parentRows[1],
      { id: 'c', name: '丙', details: [] },
      { id: 'd', name: '丁', details: [], canAdd: false }
    ];
    const { container } = render(GroupedTableHarness, { props: { rows, columns } });

    const firstSubCell = container.querySelector('[data-testid="subcell-label"]') as HTMLElement;
    expect(firstSubCell.textContent?.trim()).toBe('乙-1');
    expect(firstSubCell.getAttribute('data-parent')).toBe('b');
    expect(firstSubCell.getAttribute('data-sub-row')).toBe('2');
    expect(firstSubCell.getAttribute('data-sub-row-index')).toBe('0');
    expect(firstSubCell.getAttribute('data-sub-column-index')).toBe('0');

    const secondRowSubCells = Array.from(container.querySelectorAll('tr.suu-table__sub-row [data-testid="subcell-label"]'));
    expect(secondRowSubCells).toHaveLength(1);
    expect(secondRowSubCells[0].getAttribute('data-sub-row')).toBe('3');
    expect(secondRowSubCells[0].getAttribute('data-sub-row-index')).toBe('1');

    const table = container.querySelector<HTMLTableElement>('table.suu-table')!;
    const trackCount = table.querySelectorAll('colgroup col').length;
    expect(trackCount).toBe(5);
    const groups = Array.from(table.tBodies);
    expect(groups).toHaveLength(3);
    const [populated, editableEmpty, readOnlyEmpty] = groups.map((body) => bodyTrackOccupancy(body, trackCount));

    const [parentCell, emptyCell, trailingCell] = Array.from(groups[1].rows[0].cells);
    const emptyFooter = groups[1].rows[1].cells[0];
    expect(editableEmpty).toEqual([
      [parentCell, emptyCell, emptyCell, emptyCell, trailingCell],
      [parentCell, emptyFooter, emptyFooter, emptyFooter, trailingCell]
    ]);
    expect(emptyCell.querySelector('[data-testid="sub-empty-details"]')?.textContent).toBe('无明细：c');
    expect(emptyFooter.querySelector('[data-testid="sub-add-details"]')).toHaveAttribute('data-parent', 'c');

    const populatedFooterTracks = populated[2].slice(1, 4);
    expect(populatedFooterTracks).toEqual(Array(3).fill(groups[0].rows[2].cells[0]));
    expect(populatedFooterTracks[0]?.querySelector('[data-testid="sub-add-details"]')).toHaveAttribute('data-parent', 'b');
    expect(readOnlyEmpty[0][1]?.querySelector('[data-testid="sub-empty-details"]')).toHaveTextContent('无明细：d');
    expect(readOnlyEmpty[1][1]?.querySelector('button')).toBeNull();
    expect(container.querySelectorAll('.suu-table__sub-filler')).toHaveLength(0);
  });

  it('spans an empty group through another group’s continuation rows and stops before the footer', () => {
    const columns = [
      ...detailColumns(),
      { key: 'other', header: '其他', subColumns: [{ key: 'label', header: '其他项目' }] }
    ];
    const { container } = render(GroupedTableHarness, { props: { rows: [parentRows[1]], columns } });
    const body = container.querySelector<HTMLTableSectionElement>('tbody.suu-table__row-group')!;
    const slots = bodyTrackOccupancy(body, 5);
    const emptyCell = body.rows[0].cells[4];
    expect(emptyCell).toHaveClass('suu-table__sub-empty');
    expect(slots[1][4]).toBe(emptyCell);
    expect(slots[2][4]).toBe(body.rows[2].cells[1]);
    expect(slots[2][4]?.querySelector('[data-testid="sub-add-other"]')).toBeInTheDocument();
  });

  it('renders the add-control footer row only for callers that provide the subFooter slot', () => {
    const columns = detailColumns();

    const withFooter = render(GroupedTableHarness, { props: { rows: parentRows, columns } });
    const footerRows = withFooter.container.querySelectorAll('tr.suu-table__sub-footer');
    expect(footerRows).toHaveLength(2);
    const footerCell = footerRows[0].querySelector('td') as HTMLTableCellElement;
    expect(footerCell.getAttribute('colspan')).toBe('3');
    expect(footerRows[0].querySelector('[data-testid="sub-add-details"]')?.getAttribute('data-parent')).toBe('a');
    const parentCellWithFooter = withFooter.container.querySelector('tbody.suu-table__row-group tr td') as HTMLTableCellElement;
    expect(parentCellWithFooter.getAttribute('rowspan')).toBe('2');
    withFooter.unmount();

    const withoutFooter = render(DataTable, { props: { pagination: false, rows: parentRows, columns } });
    expect(withoutFooter.container.querySelector('tr.suu-table__sub-footer')).toBeNull();
    const parentCellWithoutFooter = withoutFooter.container.querySelector('tbody.suu-table__row-group tr td') as HTMLTableCellElement;
    expect(parentCellWithoutFooter.getAttribute('rowspan')).toBe('1');
  });

  it('uses the populated parent-row attributes on the first physical row only', () => {
    const { container } = render(DataTable, {
      props: {
        pagination: false,
        rows: parentRows,
        columns: detailColumns(),
        rowKey: 'id',
        rowClass: (row) => `row-${(row as ParentRow).id}`,
        rowAttributes: (row) => ({ 'data-parent-id': (row as ParentRow).id })
      }
    });

    const firstRows = Array.from(container.querySelectorAll('tbody.suu-table__row-group > tr:first-child'));
    expect(firstRows).toHaveLength(2);
    expect(firstRows[0].classList.contains('row-a')).toBe(true);
    expect(firstRows[0].getAttribute('data-parent-id')).toBe('a');
    expect(firstRows[1].getAttribute('data-parent-id')).toBe('b');
    expect(container.querySelectorAll('[data-parent-id]')).toHaveLength(2);
  });

  it('marks only the first logical track so vertical separators follow the column tracks', () => {
    const { container } = render(DataTable, {
      props: { pagination: false, rows: parentRows, columns: detailColumns(), verticalSeparators: true }
    });

    // 第一逻辑列是未分组的“姓名”列：表头 + 每个父行一个单元格，子行中不重复出现。
    const marked = Array.from(container.querySelectorAll('[data-suu-first-column="true"]'));
    expect(marked.map((cell) => cell.textContent?.trim())).toEqual(['姓名', '甲', '乙']);
    for (const cell of marked) {
      expect(cell.getAttribute('data-suu-group-cell')).toBeNull();
    }
    expect(container.querySelector('.suu-table__sub-cell[data-suu-first-column="true"]')).toBeNull();
    expect(container.querySelector('.suu-table__sub-empty[data-suu-first-column="true"]')).toBeNull();
  });

  it('emits the parent column sort key from a grouped header', async () => {
    const onSortChange = vi.fn();
    render(DataTable, {
      props: {
        pagination: false,
        rows: parentRows,
        columns: detailColumns().map((column) => (column.key === 'details' ? { ...column, sortable: true } : column)),
        onSortChange,
        preserveScrollOnSort: false
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /明细/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'details', direction: 'asc' });
  });

  it('keeps the empty state spanning every grouped track', () => {
    const { container } = render(DataTable, {
      props: { pagination: false, rows: [], columns: detailColumns() }
    });

    const emptyCell = container.querySelector('.suu-table__empty') as HTMLTableCellElement;
    expect(emptyCell.getAttribute('colspan')).toBe('4');
    expect(container.querySelectorAll('tbody.suu-table__row-group')).toHaveLength(0);
  });

  it('renders grouped rows without a header section when showHeader is false', () => {
    const { container } = render(DataTable, {
      props: { pagination: false, rows: parentRows, columns: detailColumns(), showHeader: false }
    });

    expect(container.querySelector('thead')).toBeNull();
    expect(container.querySelector('colgroup')).toBeTruthy();
    expect(container.querySelectorAll('tbody.suu-table__row-group')).toHaveLength(2);
  });

  it('falls back to the caller fallback cell when a grouped column has no sub rows resolver', () => {
    const columns: DataTableColumn[] = [
      { key: 'name', header: '姓名' },
      {
        key: 'details',
        header: '明细',
        subColumns: [{ key: 'label', header: '项目' }]
      }
    ];
    const { container } = render(DataTable, {
      props: { pagination: false, rows: parentRows, columns }
    });

    expect(container.querySelectorAll('.suu-table__sub-empty')).toHaveLength(2);
    expect(container.querySelectorAll('.suu-table__sub-cell')).toHaveLength(0);
    // 没有子行就没有续行，父单元格无需跨行。
    expect(container.querySelector('tbody.suu-table__row-group tr td')?.getAttribute('rowspan')).toBe('1');
  });

  it('supports several grouped columns with different sub row counts', () => {
    const columns: DataTableColumn[] = [
      { key: 'name', header: '姓名' },
      {
        key: 'left',
        header: '左组',
        subColumns: [
          { key: 'a', header: 'A' },
          { key: 'b', header: 'B' }
        ],
        getSubRows: () => [{ a: 'a1', b: 'b1' }, { a: 'a2', b: 'b2' }]
      },
      {
        key: 'right',
        header: '右组',
        subColumns: [
          { key: 'c', header: 'C' },
          { key: 'd', header: 'D' }
        ],
        getSubRows: () => [{ c: 'c1', d: 'd1' }]
      },
      { key: 'id', header: '编号' }
    ];
    const { container } = render(DataTable, {
      props: { pagination: false, rows: [{ name: '甲', id: '甲一' }], columns }
    });

    const nativeGroups = Array.from(container.querySelectorAll('table.suu-table > colgroup'));
    const groupHeaderCells = Array.from(container.querySelectorAll<HTMLTableCellElement>('thead tr:first-child th'));
    expect(groupHeaderCells.map((cell) => cell.textContent?.trim())).toEqual(['姓名', '左组', '右组', '编号']);
    expect(groupHeaderCells.map((cell) => cell.scope)).toEqual(['col', 'colgroup', 'colgroup', 'col']);
    expect(nativeGroups.map((group) => group.querySelectorAll('col').length)).toEqual(
      groupHeaderCells.map((cell) => cell.colSpan)
    );
    expect(container.querySelectorAll('thead tr:nth-child(2) th')).toHaveLength(4);

    const physicalRows = Array.from(container.querySelectorAll('tbody.suu-table__row-group > tr')) as HTMLTableRowElement[];
    expect(physicalRows).toHaveLength(2);
    expect(Array.from(physicalRows[0].cells).map((cell) => cell.textContent?.trim())).toEqual(['甲', 'a1', 'b1', 'c1', 'd1', '甲一']);
    expect(Array.from(physicalRows[1].cells).map((cell) => cell.textContent?.trim())).toEqual(['a2', 'b2', '']);
    const rightFiller = physicalRows[1].querySelector('.suu-table__sub-filler') as HTMLTableCellElement;
    expect(rightFiller.getAttribute('colspan')).toBe('2');
    // 右侧分组只有一条子行，填充格覆盖该分组剩余的续行。
    expect(rightFiller.getAttribute('rowspan')).toBe('1');
    expect(physicalRows[0].cells[0].getAttribute('rowspan')).toBe('2');
  });

  it('uses sub column render callbacks and renders nullish values as empty text', () => {
    const columns: DataTableColumn[] = [
      { key: 'name', header: '姓名' },
      {
        key: 'details',
        header: '明细',
        subColumns: [
          { key: 'label', header: '项目', render: (subRow) => `[${(subRow as Detail).label}]` },
          { key: 'missing', header: '缺失' }
        ],
        getSubRows: () => [{ label: '值', missing: null }]
      }
    ];
    const { container } = render(DataTable, {
      props: { pagination: false, rows: [{ name: '甲' }], columns }
    });

    const subCells = Array.from(container.querySelectorAll('.suu-table__sub-cell'));
    expect(subCells.map((cell) => cell.textContent?.trim())).toEqual(['[值]', '']);
  });

  it('aligns sticky sub column tracks and exposes sorting on the parent header only', async () => {
    const { container, rerender } = render(DataTable, {
      props: {
        pagination: false,
        rows: parentRows,
        columns: detailColumns().map((column) => (column.key === 'details' ? { ...column, sortable: true } : column)),
        stickyHeaderOffset: '64px',
        preserveScrollOnSort: false
      }
    });

    const table = container.querySelector('.suu-table-wrap > table.suu-table') as HTMLTableElement;
    const header = table.tHead as HTMLTableSectionElement;
    const probe = container.querySelector('.suu-table__sticky-offset-probe') as HTMLElement;
    const [nameHeader, groupHeader] = Array.from(header.rows[0].cells) as HTMLElement[];
    const [labelHeader, countHeader, noteHeader] = Array.from(header.rows[1].cells) as HTMLElement[];
    const spies = [
      vi.spyOn(table, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 63, bottom: 520, width: 420, height: 457 })),
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 63, bottom: 107, width: 420, height: 44 })),
      vi.spyOn(probe, 'getBoundingClientRect').mockReturnValue(makeRect({ top: 64, bottom: 64 })),
      vi.spyOn(nameHeader, 'getBoundingClientRect').mockReturnValue(makeRect({ width: 120 })),
      vi.spyOn(groupHeader, 'getBoundingClientRect').mockReturnValue(makeRect({ width: 300 })),
      vi.spyOn(labelHeader, 'getBoundingClientRect').mockReturnValue(makeRect({ width: 90 })),
      vi.spyOn(countHeader, 'getBoundingClientRect').mockReturnValue(makeRect({ width: 100 })),
      vi.spyOn(noteHeader, 'getBoundingClientRect').mockReturnValue(makeRect({ width: 110 }))
    ];

    try {
      window.dispatchEvent(new Event('scroll'));
      await flushAnimationFrame();

      const clone = container.querySelector('.suu-table__sticky-clone') as HTMLElement;
      expect(clone).toBeTruthy();
      const cloneTable = clone.querySelector('table.suu-table') as HTMLTableElement;
      expect(cloneTable.classList.contains('suu-table--grouped')).toBe(true);

      const tracks = Array.from(cloneTable.querySelectorAll('colgroup col')) as HTMLTableColElement[];
      expect(tracks.map((track) => track.style.width)).toEqual(['120px', '90px', '100px', '110px']);
      expect(Array.from(cloneTable.querySelectorAll(':scope > colgroup'), (group) => group.children.length))
        .toEqual([1, 3]);
      expect(cloneTable.style.width).toBe('420px');

      const cloneRows = Array.from(cloneTable.querySelectorAll('thead tr')) as HTMLTableRowElement[];
      expect(cloneRows).toHaveLength(2);
      expect((cloneRows[0].cells[0] as HTMLTableCellElement).getAttribute('rowspan')).toBe('2');
      expect((cloneRows[0].cells[1] as HTMLTableCellElement).getAttribute('colspan')).toBe('3');
      expect(cloneRows[0].cells[1].getAttribute('scope')).toBe('colgroup');
      expect(Array.from(cloneRows[1].cells).map((cell) => cell.textContent?.trim())).toEqual(['项目', '数量', '备注']);

      for (const cell of Array.from(cloneTable.querySelectorAll('th'))) {
        expect((cell as HTMLElement).style.width).toBe('');
      }

      for (const [direction, ariaSort] of [[null, 'none'], ['asc', 'ascending'], ['desc', 'descending']] as const) {
        await rerender({ sort: direction === null ? null : { key: 'details', direction } });
        for (const section of [header, cloneTable.tHead!]) {
          expect(Array.from(section.querySelectorAll('th'), (cell) => cell.getAttribute('aria-sort')))
            .toEqual([null, ariaSort, null, null, null]);
        }
      }
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});
