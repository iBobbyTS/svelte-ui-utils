import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
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

    render(Table, {
      props: {
        rows: [{ name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name', sortable: true }],
        sort: null,
        onSortChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /Name/i }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
  });

  it('renders row attributes and respects borderless tables', () => {
    const { container } = render(Table, {
      props: {
        rows: [{ id: 42, name: 'Jane' }],
        columns: [{ key: 'name', header: 'Name', nowrap: false }],
        bordered: false,
        rowKey: 'id',
        rowAttributes: (row) => ({ 'data-row-id': (row as { id: number }).id })
      }
    });

    expect(container.querySelector('.suu-table-wrap--borderless')).toBeTruthy();
    expect(container.querySelector('tr[data-row-id="42"]')).toBeTruthy();
    expect(container.querySelector('td[data-nowrap="false"]')).toBeTruthy();
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
