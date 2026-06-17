import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DropdownSearch from '../src/lib/dropdown-search/DropdownSearch.svelte';
import { clampDropdownSearchLimit, formatParamDict, resolveDropdownSearchStatus } from '../src/lib/dropdown-search/index.js';
import { getUiMessages, resolveUiLanguage } from '../src/lib/i18n.js';
import type { DropdownSearchItem, DropdownSearchLoadOptions } from '../src/lib/dropdown-search/index.js';

const jane: DropdownSearchItem = {
  id: 'M-123',
  title: 'Jane Doe',
  param_dict: { ID: 'M-123', City: 'Calgary' }
};

describe('dropdown search state', () => {
  it('resolves supported UI languages', () => {
    expect(resolveUiLanguage('zh-cn')).toBe('zh_cn');
    expect(resolveUiLanguage('zh_tw')).toBe('zh_tw');
    expect(resolveUiLanguage('en')).toBe('en_us');
    expect(getUiMessages('zh_cn').dropdownSearch.clearLabel).toBe('清除');
    expect(getUiMessages('zh_cn').dropdownSearch.noResultsText).toBe('空');
  });

  it('formats param_dict and resolves input status', () => {
    expect(formatParamDict(jane.param_dict)).toEqual(['ID: M-123', 'City: Calgary']);
    expect(resolveDropdownSearchStatus({ value: '' })).toBe('empty');
    expect(resolveDropdownSearchStatus({ value: 'J', minLength: 2 })).toBe('invalid');
    expect(resolveDropdownSearchStatus({ value: 'Jane', loading: true })).toBe('loading');
    expect(resolveDropdownSearchStatus({ value: 'Jane', exactMatch: jane })).toBe('valid');
    expect(resolveDropdownSearchStatus({ value: 'Jane' })).toBe('invalid');
    expect(resolveDropdownSearchStatus({ value: 'Jane', exactMatch: jane, validate: false })).toBe('empty');
    expect(resolveDropdownSearchStatus({ value: 'Jane', errored: true, validate: false })).toBe('empty');
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

  it('shows a loading row while a debounced search is pending', async () => {
    vi.useFakeTimers();
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));

    render(DropdownSearch, {
      props: {
        debounceMs: 500,
        loadOptions
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'Jane' } });

    expect(loadOptions).not.toHaveBeenCalled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(500);
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Jane', expect.objectContaining({ limit: 10 })));
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

  it('searches and validates an initial controlled value on mount', async () => {
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [jane], exactMatch: jane }));
    const changes: string[] = [];

    render(DropdownSearch, {
      props: {
        value: 'M-123',
        loadOptions,
        searchOnExternalValueChange: true,
        onChange: (detail) => changes.push(`${detail.status}:${detail.selectedItem?.title ?? ''}`)
      }
    });

    const input = screen.getByRole('textbox');
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('M-123', expect.objectContaining({ limit: 10 })));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'false'));
    await waitFor(() => expect(changes).toContain('valid:Jane Doe'));
  });

  it('clears the current value from the built-in clear button', async () => {
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));
    const changes: Array<{ value: string; selectedItem: DropdownSearchItem | null; status: string }> = [];

    render(DropdownSearch, {
      props: {
        value: 'Jane Doe',
        selectedItem: jane,
        status: 'valid',
        clearLabel: 'Clear search',
        loadOptions,
        onChange: (detail) => changes.push(detail)
      }
    });

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Jane Doe');

    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(input).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(loadOptions).not.toHaveBeenCalled();
    expect(changes.at(-1)).toMatchObject({
      value: '',
      selectedItem: null,
      status: 'empty'
    });
  });

  it('uses localized default labels when no text override is passed', async () => {
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));

    render(DropdownSearch, {
      props: {
        value: 'Jane Doe',
        status: 'invalid',
        language: 'zh_tw',
        loadOptions
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    expect(screen.getByRole('button', { name: '清除' })).toBeInTheDocument();
    expect(screen.getByText('空')).toBeInTheDocument();
  });

  it('falls back to default dropdown messages when text overrides are blank', async () => {
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));

    render(DropdownSearch, {
      props: {
        value: 'Nobody',
        status: 'invalid',
        noResultsText: '',
        loadingText: '',
        clearLabel: '',
        loadOptions
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);

    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('only reserves clear-button space when the input has text', async () => {
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));

    const { container, rerender } = render(DropdownSearch, {
      props: {
        value: '',
        status: 'empty',
        clearLabel: 'Clear search',
        loadOptions
      }
    });

    const root = container.querySelector('.suu-dropdown-search');
    expect(root).not.toHaveClass('suu-dropdown-search--has-clear');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    await rerender({
      value: 'Jane',
      status: 'invalid',
      clearLabel: 'Clear search',
      loadOptions
    });

    expect(root).toHaveClass('suu-dropdown-search--has-clear');
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });

  it('keeps a neutral status when validation is disabled', async () => {
    vi.useFakeTimers();
    const changes: string[] = [];
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [jane], exactMatch: jane }));

    const { container } = render(DropdownSearch, {
      props: {
        debounceMs: 10,
        loadOptions,
        validate: false,
        onChange: (detail) => changes.push(`${detail.status}:${detail.selectedItem?.title ?? ''}`)
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'Jane' } });
    await vi.advanceTimersByTimeAsync(10);

    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Jane', expect.objectContaining({ limit: 10 })));
    await tick();
    expect(screen.getByRole('option', { name: /Jane Doe/ })).toBeInTheDocument();
    const root = container.querySelector('.suu-dropdown-search');
    expect(root).toHaveAttribute('data-status', 'empty');
    expect(root).not.toHaveClass('suu-dropdown-search--valid');
    expect(root).not.toHaveClass('suu-dropdown-search--invalid');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(changes).toContain('loading:');
    expect(changes).toContain('empty:');
    expect(changes).not.toContain('valid:Jane Doe');

    await fireEvent.mouseDown(screen.getByRole('option', { name: /Jane Doe/ }));

    expect(root).toHaveAttribute('data-status', 'empty');
    expect(root).not.toHaveClass('suu-dropdown-search--valid');
    expect(input).toHaveValue('Jane Doe');
    expect(changes).toContain('empty:Jane Doe');
  });

  it('does not mark missing matches invalid when validation is disabled', async () => {
    vi.useFakeTimers();
    const loadOptions = vi.fn<DropdownSearchLoadOptions>(() => ({ options: [], exactMatch: null }));

    const { container } = render(DropdownSearch, {
      props: {
        debounceMs: 10,
        loadOptions,
        validate: false
      }
    });

    const input = screen.getByRole('textbox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'Nobody' } });
    await vi.advanceTimersByTimeAsync(10);

    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Nobody', expect.objectContaining({ limit: 10 })));
    await tick();
    const root = container.querySelector('.suu-dropdown-search');
    expect(root).toHaveAttribute('data-status', 'empty');
    expect(root).not.toHaveClass('suu-dropdown-search--invalid');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });
});
