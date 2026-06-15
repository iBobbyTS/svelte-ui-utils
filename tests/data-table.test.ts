import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DataTable from '../src/lib/data-table/DataTable.svelte';
import FilterBox from '../src/lib/data-table/FilterBox.svelte';
import Pagination from '../src/lib/data-table/Pagination.svelte';
import Table from '../src/lib/data-table/Table.svelte';
import {
  getAriaSort,
  getPageCount,
  normalizePagination,
  setDataTableFilters,
  setDataTablePageSize,
  toggleSort
} from '../src/lib/data-table/index.js';
import type { DataTableState, FilterDefinition } from '../src/lib/data-table/index.js';

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

    const { container } = render(Table, {
      props: {
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
      render(Table, {
        props: {
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
    const { container, rerender } = render(Table, {
      props: {
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
      rows: [{ name: 'Jane' }],
      columns: [{ key: 'name', header: 'Name', sortable: true }],
      sort: { key: 'name', direction: 'desc' }
    });

    expect(container.querySelector('.suu-table__sort-icon--asc')).toBeFalsy();
    expect(container.querySelector('.suu-table__sort-icon--desc')).toBeTruthy();
  });

  it('renders row attributes and optional table styling classes', () => {
    const { container } = render(Table, {
      props: {
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
    expect(container.querySelector('.suu-table-wrap')?.getAttribute('style')).toContain('--suu-table-sticky-top: 4rem');
    expect(container.querySelector('tr[data-row-id="42"]')).toBeTruthy();
    expect(container.querySelector('td[data-nowrap="false"]')).toBeTruthy();
  });

  it('can disable sticky headers', () => {
    const { container } = render(Table, {
      props: {
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        stickyHeader: false
      }
    });

    expect(container.querySelector('.suu-table--sticky-header')).toBeFalsy();
  });

  it('passes table layout and sticky header options through DataTable', () => {
    const { container } = render(DataTable, {
      props: {
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name' }],
        totalRows: 1,
        tableLayout: 'fixed',
        stickyHeaderTop: '3rem'
      }
    });

    expect(container.querySelector('.suu-table--layout-fixed')).toBeTruthy();
    expect(container.querySelector('.suu-table--sticky-header')).toBeTruthy();
    expect(container.querySelector('.suu-table-wrap')?.getAttribute('style')).toContain('--suu-table-sticky-top: 3rem');
  });

  it('waits for DataTable state changes before restoring sort scroll', async () => {
    const scroll = mockWindowScroll(6, 320);
    const onStateChange = vi.fn(async () => {
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
          onStateChange
        }
      });

      await fireEvent.click(screen.getByRole('button', { name: /Name/i }));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(onStateChange).toHaveBeenCalledWith({
        sort: { key: 'name', direction: 'asc' },
        pagination: { page: 1, pageSize: 20 },
        filters: {}
      });
      expect(scroll.getScroll()).toEqual({ x: 6, y: 320 });
    } finally {
      scroll.restore();
    }
  });

  it('emits pagination changes and resets to page 1 when page size changes', async () => {
    const onPaginationChange = vi.fn();

    render(Pagination, {
      props: {
        pagination: { page: 2, pageSize: 10 },
        totalRows: 35,
        pageSizeOptions: [10, 20],
        onPaginationChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(onPaginationChange).toHaveBeenCalledWith({ page: 3, pageSize: 10 });

    await fireEvent.change(screen.getByRole('combobox'), { target: { value: '20' } });
    expect(onPaginationChange).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('emits checkbox and radio filter state', async () => {
    const definitions: FilterDefinition[] = [
      {
        type: 'checkbox',
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Archived', value: 'archived' }
        ]
      },
      {
        type: 'radio',
        key: 'role',
        label: 'Role',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Member', value: 'member' }
        ]
      }
    ];
    const onFiltersChange = vi.fn();

    render(FilterBox, {
      props: {
        definitions,
        filters: {},
        onFiltersChange
      }
    });

    await fireEvent.click(screen.getByLabelText('Active'));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ status: ['active'] });

    await fireEvent.click(screen.getByLabelText('Member'));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ status: ['active'], role: 'member' });
  });
});
