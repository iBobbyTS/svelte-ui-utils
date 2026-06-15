import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DropdownSearch from '../src/lib/dropdown-search/DropdownSearch.svelte';
import { clampDropdownSearchLimit, formatParamDict, resolveDropdownSearchStatus } from '../src/lib/dropdown-search/index.js';
import type { DropdownSearchItem, DropdownSearchLoadOptions } from '../src/lib/dropdown-search/index.js';

const jane: DropdownSearchItem = {
  id: 'M-123',
  title: 'Jane Doe',
  param_dict: { ID: 'M-123', City: 'Calgary' }
};

describe('dropdown search state', () => {
  it('formats param_dict and resolves input status', () => {
    expect(formatParamDict(jane.param_dict)).toEqual(['ID: M-123', 'City: Calgary']);
    expect(resolveDropdownSearchStatus({ value: '' })).toBe('empty');
    expect(resolveDropdownSearchStatus({ value: 'J', minLength: 2 })).toBe('invalid');
    expect(resolveDropdownSearchStatus({ value: 'Jane', loading: true })).toBe('loading');
    expect(resolveDropdownSearchStatus({ value: 'Jane', exactMatch: jane })).toBe('valid');
    expect(resolveDropdownSearchStatus({ value: 'Jane' })).toBe('invalid');
    expect(clampDropdownSearchLimit(-3)).toBe(1);
    expect(clampDropdownSearchLimit(8.7)).toBe(8);
    expect(clampDropdownSearchLimit(100)).toBe(50);
  });
});

describe('DropdownSearch component', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces searches and turns valid on a unique exact match', async () => {
    vi.useFakeTimers();
    const changes: string[] = [];
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [jane], exactMatch: jane }));

    render(DropdownSearch, {
      props: {
        debounceMs: 200,
        loadOptions,
        onStatusChange: (status) => changes.push(status)
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Jane' } });

    expect(loadOptions).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);

    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Jane', expect.objectContaining({ limit: 10 })));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'false'));
    expect(changes).toContain('loading');
    expect(changes).toContain('valid');
  });

  it('marks non-empty text invalid when there is no unique match', async () => {
    vi.useFakeTimers();
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));

    render(DropdownSearch, {
      props: {
        debounceMs: 10,
        loadOptions
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Nobody' } });
    await vi.advanceTimersByTimeAsync(10);

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
  });

  it('aborts the previous request and ignores stale responses', async () => {
    vi.useFakeTimers();
    let firstSignal: AbortSignal | undefined;
    const changes: string[] = [];
    const loadOptions = vi.fn<DropdownSearchLoadOptions>((query, context) => {
      if (query === 'Jane') {
        firstSignal = context.signal;
        return new Promise((resolve) => {
          setTimeout(() => resolve({ options: [{ ...jane, title: 'Stale Jane' }], exactMatch: { ...jane, title: 'Stale Jane' } }), 100);
        });
      }

      return { options: [jane], exactMatch: jane };
    });

    render(DropdownSearch, {
      props: {
        debounceMs: 10,
        loadOptions,
        onChange: (detail) => changes.push(`${detail.status}:${detail.selectedItem?.title ?? ''}`)
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'Jane' } });
    await vi.advanceTimersByTimeAsync(10);
    await waitFor(() => expect(firstSignal).toBeDefined());

    await fireEvent.input(input, { target: { value: 'Jane Doe' } });
    await vi.advanceTimersByTimeAsync(10);

    expect(firstSignal?.aborted).toBe(true);
    await waitFor(() => expect(changes).toContain('valid:Jane Doe'));

    await vi.advanceTimersByTimeAsync(100);
    expect(changes).not.toContain('valid:Stale Jane');
  });

  it('searches when a controlled value changes externally', async () => {
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [jane], exactMatch: jane }));
    const changes: string[] = [];

    const { rerender } = render(DropdownSearch, {
      props: {
        value: '',
        loadOptions,
        searchOnExternalValueChange: true,
        onChange: (detail) => changes.push(`${detail.status}:${detail.selectedItem?.title ?? ''}`)
      }
    });

    await rerender({ value: 'M-123' });

    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('M-123', expect.objectContaining({ limit: 10 })));
    await waitFor(() => expect(changes).toContain('valid:Jane Doe'));
    expect(changes).not.toContain('invalid:');
  });
});
