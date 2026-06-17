import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DataTable from '../src/lib/data-table/DataTable.svelte';
import DateRangeFilter from '../src/lib/data-table/DateRangeFilter.svelte';
import FilterTable from '../src/lib/data-table/FilterTable.svelte';
import NumberRangeFilter from '../src/lib/data-table/NumberRangeFilter.svelte';
import Pagination from '../src/lib/data-table/Pagination.svelte';
import {
  filter,
  getAriaSort,
  getPageCount,
  normalizePagination,
  setDataTableFilters,
  setDataTablePageSize,
  toggleSort
} from '../src/lib/data-table/index.js';
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

describe('data table components', () => {
  it('emits sort changes from sortable headers', async () => {
    const onSortChange = vi.fn();

    const { container } = render(DataTable, {
      props: {
        showPagination: false,
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
          showPagination: false,
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
        showPagination: false,
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
      showPagination: false,
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
        showPagination: false,
        rows: [{ id: 42, name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name', nowrap: false }],
        bordered: false,
        verticalSeparators: true,
        tableLayout: 'fixed',
        stickyHeaderTop: '4rem',
        rowKey: 'id',
        rowAttributes: (row) => ({ 'data-row-id': (row as { id: number }).id })
      }
    });

    expect(container.querySelector('.suu-table-wrap--borderless')).toBeTruthy();
    expect(container.querySelector('.suu-table--vertical-separators')).toBeTruthy();
    expect(container.querySelector('.suu-table--layout-fixed')).toBeTruthy();
    expect(container.querySelector('.suu-table--sticky-header')).toBeTruthy();
    expect(container.querySelector('.suu-table__sticky-offset-probe')).toBeTruthy();
    expect(container.querySelector('.suu-table-wrap')?.getAttribute('style')).toContain('--suu-table-sticky-top: 4rem');
    expect(container.querySelector('tr[data-row-id="42"]')).toBeTruthy();
    expect(container.querySelector('td[data-nowrap="false"]')).toBeTruthy();
  });

  it('can disable sticky headers', () => {
    const { container } = render(DataTable, {
      props: {
        showPagination: false,
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
        showPagination: false,
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
        totalRows: 1,
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
          totalRows: 1,
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

  it('renders DataTable pagination above and below the table by default', async () => {
    const { container } = render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        totalRows: 42,
        page: 2,
        pageSize: 20
      }
    });

    expect(container.querySelectorAll('.suu-pagination')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '3' })).toHaveLength(2);
    expect(screen.getByText('Jane')).toBeTruthy();

    const pageSizeButtons = screen.getAllByRole('button', { name: 'Rows' });
    await fireEvent.click(pageSizeButtons[0]);
    expect(container.querySelector('.suu-pagination__select-menu')?.classList.contains('suu-pagination__select-menu--down')).toBe(true);
    await fireEvent.click(pageSizeButtons[0]);

    await fireEvent.click(pageSizeButtons[1]);
    expect(container.querySelector('.suu-pagination__select-menu')?.classList.contains('suu-pagination__select-menu--up')).toBe(true);
  });

  it('uses localized DataTable defaults when labels are not overridden', () => {
    const { container } = render(DataTable, {
      props: {
        rows: [],
        columns: [{ key: 'name', header: 'Name' }],
        totalRows: 0,
        language: 'zh_cn'
      }
    });

    expect(screen.getByText('暂无记录')).toBeTruthy();
    expect(screen.getAllByText('每页')).toHaveLength(2);
    expect(container.querySelectorAll('.suu-pagination[aria-label="分页"]')).toHaveLength(2);
  });

  it('can render DataTable without pagination', () => {
    const { container } = render(DataTable, {
      props: {
        showPagination: false,
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }]
      }
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

    expect(container.querySelector('.suu-filter-table__filters')).toBeTruthy();
    expect(container.querySelector('.suu-table')).toBeFalsy();
    expect(screen.getByRole('rowheader', { name: 'Status' })).toBeTruthy();
    await fireEvent.click(screen.getByLabelText('Active'));
    expect(onStatusChange).toHaveBeenLastCalledWith(['active']);

    await fireEvent.click(screen.getByLabelText('Member'));
    expect(onRoleChange).toHaveBeenLastCalledWith('member');
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
    await fireEvent.change(screen.getByRole('combobox', { name: 'Type' }), { target: { value: 'member' } });
    expect(onSelectChange).toHaveBeenCalledWith('member');
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

    await fireEvent.click(screen.getByRole('button', { name: 'last 24 hours' }));
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

    expect(container.querySelector('.suu-filter-table__filters')).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Issue date' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'today' }));
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
