import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dropdown, DropdownMultiSelect } from '../src/lib/dropdown/index.js';
import type { DropdownLoadOptionsResult } from '../src/lib/dropdown/types.js';
import ControlledDropdownMultiSelectHarness from './fixtures/ControlledDropdownMultiSelectHarness.svelte';

describe('dropdown', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders input style only when search is enabled and loads after typing', async () => {
    const loadOptions = vi.fn(async (query: string) => ({
      options: [{ label: query ? `Result ${query}` : 'Default result', value: 'result' }]
    }));
    const { container } = render(Dropdown, {
      props: {
        input_style: 'input',
        search: true,
        searchDebounceMs: 0,
        loadOptions,
        placeholder: 'Search'
      }
    });

    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await fireEvent.focus(input);
    await tick();
    expect(loadOptions).not.toHaveBeenCalled();
    expect(screen.queryByRole('option', { name: 'Default result' })).not.toBeInTheDocument();

    await fireEvent.input(input, { target: { value: 'alice' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('alice', expect.anything()));
    expect(screen.getByRole('option', { name: 'Result alice' })).toBeInTheDocument();

    await fireEvent.input(input, { target: { value: '' } });
    expect(screen.queryByRole('option', { name: 'Result alice' })).not.toBeInTheDocument();
  });

  it('fills the input with the selected label while emitting its distinct value', async () => {
    const onChange = vi.fn();
    const { container } = render(Dropdown, {
      props: {
        input_style: 'input',
        search: true,
        searchDebounceMs: 0,
        loadOptions: async () => ({
          options: [{ label: 'Alice Chen', value: 'user-42' }]
        }),
        onChange
      }
    });

    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));

    expect(onChange).toHaveBeenCalledWith('user-42');
    expect(input.value).toBe('Alice Chen');
    expect(screen.queryByRole('option', { name: 'Alice Chen' })).not.toBeInTheDocument();
  });

  it('keeps input style gated off when search is disabled', () => {
    const { container } = render(Dropdown, {
      props: { input_style: 'input', options: [{ label: 'One', value: 'one' }] }
    });
    expect(container.querySelector('input.suu-dropdown__input')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses getItemLabel for input selections and supports multiselect chips', async () => {
    const onChange = vi.fn();
    const option = { label: 'Jane Doe', value: 'jane' };
    const { container } = render(Dropdown, {
      props: {
        input_style: 'input',
        search: true,
        multiselect: true,
        value: ['jane'],
        selectedOptions: [option],
        getItemLabel: (item: typeof option) => `@${item.value}`,
        loadOptions: async () => ({ options: [option] }),
        onChange
      }
    });
    expect(container.querySelector('.suu-dropdown__selected-item')).toHaveTextContent('@jane');
    await fireEvent.click(container.querySelector('.suu-dropdown__selected-remove') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps a newly typed query while a controlled single value is pending', async () => {
    const onChange = vi.fn();
    const { container } = render(Dropdown, {
      props: {
        input_style: 'input',
        search: true,
        value: 'alice',
        options: [{ label: 'Alice', value: 'alice' }],
        selectedOptions: [{ label: 'Alice', value: 'alice' }],
        onChange,
        loadOptions: async () => ({ options: [] })
      }
    });

    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    expect(input.value).toBe('Alice');
    await fireEvent.input(input, { target: { value: 'ali' } });
    await tick();

    expect(onChange).toHaveBeenCalledWith('');
    expect(input.value).toBe('ali');
  });

  it('passes through the optional button id', () => {
    render(Dropdown, {
      props: {
        id: 'status-dropdown',
        value: 'active',
        ariaLabel: 'Status',
        options: [{ label: 'Active', value: 'active' }]
      }
    });

    expect(screen.getByRole('button', { name: 'Status' })).toHaveAttribute('id', 'status-dropdown');
  });

  it('emits selected option changes as strings even when labels look numeric', async () => {
    const onChange = vi.fn();

    render(Dropdown, {
      props: {
        value: '10',
        ariaLabel: 'Rows',
        options: [
          { label: '10', value: '10' },
          { label: '20', value: '20' }
        ],
        onChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Rows' }));
    await fireEvent.click(screen.getByRole('option', { name: '20' }));

    expect(onChange).toHaveBeenCalledWith('20');
  });

  it('keeps the displayed label distinct from the submitted value', async () => {
    const onChange = vi.fn();

    render(Dropdown, {
      props: {
        value: 'M-123',
        ariaLabel: 'Member',
        options: [{ label: 'Jane Doe', value: 'M-123' }],
        onChange
      }
    });

    expect(screen.getByRole('button', { name: 'Member' }).textContent).toContain('Jane Doe');

    await fireEvent.click(screen.getByRole('button', { name: 'Member' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Jane Doe' }));

    expect(onChange).toHaveBeenCalledWith('M-123');
    expect(screen.getByRole('button', { name: 'Member' }).textContent).toContain('Jane Doe');
  });

  it('displays labels for selected values before a search menu is opened', () => {
    render(Dropdown, {
      props: {
        value: ['member-1'],
        multiselect: true,
        search: true,
        ariaLabel: 'Members',
        selectedOptions: [{ label: 'Jane Doe', value: 'member-1' }],
        loadOptions: async () => ({ options: [] })
      }
    });

    expect(screen.getByRole('button', { name: 'Members' })).toHaveTextContent('Jane Doe');
  });

  it('includes selected options in the first empty search result', async () => {
    render(Dropdown, {
      props: {
        value: ['member-1'],
        multiselect: true,
        search: true,
        ariaLabel: 'Members',
        selectedOptions: [{ label: 'Jane Doe', value: 'member-1' }],
        loadOptions: async () => ({ options: [] })
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Members' }));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Jane Doe' })).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Jane Doe' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Jane Doe' }).querySelector('.suu-dropdown__checkbox')).toHaveAttribute('data-checked', 'true');
  });

  it('supports upward placement', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        placement: 'up',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    expect(container.querySelector('.suu-dropdown__menu')?.classList.contains('suu-dropdown__menu--up')).toBe(true);
  });

  it('can size the menu to fit option content', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'choir',
        ariaLabel: 'Group',
        fitContent: true,
        options: [
          { label: 'Choir', value: 'choir' },
          { label: 'A much longer group name', value: 'long' }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Group' }));

    expect(container.querySelector('.suu-dropdown__menu')?.classList.contains('suu-dropdown__menu--fit-content')).toBe(
      true
    );
  });

  it('uses content-sized menus by default and preserves the explicit opt-out', async () => {
    const { container, rerender } = render(Dropdown, {
      props: {
        value: 'short',
        ariaLabel: 'Default sizing',
        options: [{ label: 'A longer option label', value: 'short' }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Default sizing' }));
    expect(container.querySelector('.suu-dropdown__menu')).toHaveClass('suu-dropdown__menu--fit-content');

    await rerender({
      value: 'short',
      ariaLabel: 'Default sizing',
      fitContent: false,
      options: [{ label: 'A longer option label', value: 'short' }]
    });
    expect(container.querySelector('.suu-dropdown__menu')).not.toHaveClass('suu-dropdown__menu--fit-content');
  });

  it('uses content-sized menus for multiselect by default and preserves the explicit opt-out', async () => {
    const { container, rerender } = render(DropdownMultiSelect, {
      props: {
        value: [],
        ariaLabel: 'Default multiselect sizing',
        options: [{ label: 'A longer option label', value: 'long' }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Default multiselect sizing' }));
    expect(container.querySelector('.suu-dropdown__menu')).toHaveClass('suu-dropdown__menu--fit-content');

    await rerender({
      value: [],
      ariaLabel: 'Default multiselect sizing',
      fitContent: false,
      options: [{ label: 'A longer option label', value: 'long' }]
    });
    expect(container.querySelector('.suu-dropdown__menu')).not.toHaveClass('suu-dropdown__menu--fit-content');
  });

  it('wraps dropdown labels to two lines and truncates longer text', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'long',
        ariaLabel: 'Provider',
        options: [
          { label: 'A provider name that is longer than two lines', value: 'long' },
          { label: 'Another provider name', value: 'other' }
        ]
      }
    });

    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent(
      'A provider name that is longer than two lines'
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));
    expect(container.querySelectorAll('.suu-dropdown__option .suu-dropdown__label')).toHaveLength(2);
  });

  it('can render the open menu outside an overflow-bound container', async () => {
    const { unmount } = render(Dropdown, {
      props: {
        value: 'one',
        ariaLabel: 'Provider',
        portal: true,
        options: [
          { label: 'One', value: 'one' },
          { label: 'Two', value: 'two' }
        ]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));

    const menu = document.body.querySelector('.suu-dropdown__menu--portal');
    expect(menu).toBeTruthy();
    // The menu stays inside the component tree so a modal <dialog> cannot make
    // it inert; the top layer (not a body mount) is what escapes overflow.
    expect(menu?.parentElement).not.toBe(document.body);
    expect(menu?.closest('.suu-dropdown')).toBeTruthy();
    unmount();
    expect(document.body.querySelector('.suu-dropdown__menu--portal')).toBeNull();
  });

  it('keeps portal placement variables when opening upward and aligning right', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'one',
        ariaLabel: 'Provider',
        portal: true,
        placement: 'up',
        menuAlign: 'right',
        options: [
          { label: 'One', value: 'one' },
          { label: 'Two', value: 'two' }
        ]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      right: 500,
      bottom: 340,
      left: 380,
      width: 120,
      height: 40,
      x: 380,
      y: 300,
      toJSON: () => ({})
    });
    vi.stubGlobal('innerWidth', 1000);

    await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));

    const menu = document.body.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
    expect(menu).toHaveClass('suu-dropdown__menu--up', 'suu-dropdown__menu--right');
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('294px');
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-right')).toBe('500px');
  });

  it('applies viewport height to the body-mounted portal menu', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        portal: true,
        fitViewport: true,
        options: [{ label: 'Active', value: 'active' }]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      right: 240,
      bottom: 140,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 100,
      toJSON: () => ({})
    });
    vi.stubGlobal('innerHeight', 640);

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    const menu = document.body.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
    expect(menu.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('474px');
  });

  it('positions an upward portal menu correctly on its first open', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        portal: true,
        placement: 'up',
        fitViewport: true,
        options: [{ label: 'Active', value: 'active' }]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      right: 240,
      bottom: 340,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 300,
      toJSON: () => ({})
    });
    vi.stubGlobal('innerHeight', 640);

    let menuMeasurements = 0;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('suu-dropdown__menu')) {
        menuMeasurements += 1;
        const height = this.style.getPropertyValue('--suu-dropdown-panel-max-height') ? 120 : 640;
        return {
          top: 0,
          right: 0,
          bottom: height,
          left: 0,
          width: 120,
          height,
          x: 0,
          y: 0,
          toJSON: () => ({})
        };
      }
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      };
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    await tick();

    const menu = document.body.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
    expect(menu.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('274px');
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('174px');
    expect(menuMeasurements).toBe(1);
  });

  it('repositions an upward portal menu when async results change its height', async () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    class ResizeObserverMock implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe(_target: Element, _options?: ResizeObserverOptions) {}
      unobserve(_target: Element) {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    let resolveSearch: ((result: { options: Array<{ label: string; value: string }> }) => void) | undefined;
    const { container } = render(Dropdown, {
      props: {
        input_style: 'input',
        search: true,
        searchDebounceMs: 0,
        loadOptions: () => new Promise((resolve) => { resolveSearch = resolve; }),
        portal: true,
        placement: 'up',
        fitViewport: true,
        ariaLabel: 'User'
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      right: 240,
      bottom: 342,
      left: 120,
      width: 120,
      height: 42,
      x: 120,
      y: 300,
      toJSON: () => ({})
    });
    let menuHeight = 46;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('suu-dropdown__menu')) {
        return { top: 0, right: 0, bottom: menuHeight, left: 0, width: 120, height: menuHeight, x: 0, y: 0, toJSON: () => ({}) };
      }
      return { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
    });

    await fireEvent.input(container.querySelector('.suu-dropdown__input') as HTMLInputElement, { target: { value: 'ali' } });
    await waitFor(() => expect(resolveSearch).toBeTypeOf('function'));
    const menu = document.body.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('248px');

    resolveSearch?.({ options: [
      { label: 'Alice', value: 'alice' },
      { label: 'Alicia', value: 'alicia' },
      { label: 'Alina', value: 'alina' }
    ] });
    await tick();
    menuHeight = 116;
    resizeCallback?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
    await tick();
    await tick();

    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('178px');
  });

  it('keeps the portal menu in the component tree without popover markup when the popover API is unavailable', async () => {
    const onChange = vi.fn();
    const { container } = render(Dropdown, {
      props: {
        value: 'one',
        ariaLabel: 'Provider',
        portal: true,
        onChange,
        options: [
          { label: 'One', value: 'one' },
          { label: 'Two', value: 'two' }
        ]
      }
    });

    // jsdom has no popover API; the fallback must not pretend otherwise.
    expect(typeof HTMLElement.prototype.showPopover).toBe('undefined');

    await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));

    const menu = container.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
    expect(menu).toBeTruthy();
    expect(menu.hasAttribute('popover')).toBe(false);
    expect(menu.parentElement).not.toBe(document.body);
    expect(menu.closest('.suu-dropdown')).toBeTruthy();
    expect(menu).toBeVisible();
    expect(getComputedStyle(menu).display).not.toBe('none');

    await fireEvent.click(screen.getByRole('option', { name: 'Two' }));

    expect(onChange).toHaveBeenCalledWith('two');
    expect(container.querySelector('.suu-dropdown__menu--portal')).toBeNull();
  });

  describe('portal menu top layer', () => {
    const showPopover = vi.fn();
    const hidePopover = vi.fn();
    const shownNodes: HTMLElement[] = [];
    const shownConnected: boolean[] = [];
    const hiddenNodes: HTMLElement[] = [];

    beforeEach(() => {
      shownNodes.length = 0;
      shownConnected.length = 0;
      hiddenNodes.length = 0;
      showPopover.mockImplementation(function (this: HTMLElement) {
        shownNodes.push(this);
        shownConnected.push(this.isConnected);
      });
      hidePopover.mockImplementation(function (this: HTMLElement) {
        hiddenNodes.push(this);
      });
      HTMLElement.prototype.showPopover = showPopover;
      HTMLElement.prototype.hidePopover = hidePopover;
    });

    afterEach(() => {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).showPopover;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).hidePopover;
      showPopover.mockReset();
      hidePopover.mockReset();
    });

    function renderPortalDropdown() {
      return render(Dropdown, {
        props: {
          value: 'one',
          ariaLabel: 'Provider',
          portal: true,
          options: [
            { label: 'One', value: 'one' },
            { label: 'Two', value: 'two' }
          ]
        }
      });
    }

    it('promotes the menu to a manual top layer popover and hides it on close', async () => {
      const { container } = renderPortalDropdown();

      await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));

      const menu = container.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
      expect(menu.getAttribute('popover')).toBe('manual');
      expect(showPopover).toHaveBeenCalledTimes(1);
      // A real showPopover() throws unless the node is connected to the document.
      expect(shownNodes).toEqual([menu]);
      expect(shownConnected).toEqual([true]);
      expect(hidePopover).not.toHaveBeenCalled();

      // jsdom's UA stylesheet hides a closed `[popover]` (display: none), so the
      // option is intentionally queried by DOM instead of by accessible role.
      const option = menu.querySelector('.suu-dropdown__option[data-value="two"]') as HTMLElement;
      await fireEvent.click(option);

      expect(container.querySelector('.suu-dropdown__menu--portal')).toBeNull();
      expect(hidePopover).toHaveBeenCalledTimes(1);
      expect(hiddenNodes).toEqual([menu]);
    });

    it('hides the top layer popover when the menu is destroyed while open', async () => {
      const { container, unmount } = renderPortalDropdown();

      await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));
      const menu = container.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
      expect(shownNodes).toEqual([menu]);
      expect(hidePopover).not.toHaveBeenCalled();

      unmount();

      expect(hidePopover).toHaveBeenCalledTimes(1);
      expect(hiddenNodes).toEqual([menu]);
    });

    it('keeps teardown idempotent when hidePopover reports nothing to hide', async () => {
      hidePopover.mockImplementation(() => {
        throw new Error('not in the top layer');
      });
      const { unmount } = renderPortalDropdown();

      await fireEvent.click(screen.getByRole('button', { name: 'Provider' }));

      expect(() => unmount()).not.toThrow();
      expect(hidePopover).toHaveBeenCalledTimes(1);
    });
  });

  it('aligns the menu left edge with the trigger by default', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        options: [{ label: 'Active', value: 'active' }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    const menu = container.querySelector('.suu-dropdown__menu');
    expect(menu?.classList.contains('suu-dropdown__menu--left')).toBe(true);
    expect(menu?.classList.contains('suu-dropdown__menu--right')).toBe(false);
  });

  it('allows callers to retain right-edge menu alignment', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        menuAlign: 'right',
        options: [{ label: 'Active', value: 'active' }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    const menu = container.querySelector('.suu-dropdown__menu');
    expect(menu).toHaveClass('suu-dropdown__menu--right');
    expect(menu).not.toHaveClass('suu-dropdown__menu--left');
  });

  it('fits the menu panel to the available viewport below the trigger by default', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      right: 240,
      bottom: 240,
      left: 120,
      width: 120,
      height: 140,
      x: 120,
      y: 100,
      toJSON: () => ({})
    });
    vi.stubGlobal('innerHeight', 640);

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('374px');
  });

  it('allows callers to disable viewport fitting', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        fitViewport: false,
        options: [{ label: 'Active', value: 'active' }]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      right: 240,
      bottom: 140,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 100,
      toJSON: () => ({})
    });
    vi.stubGlobal('innerHeight', 640);

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('');
  });

  it('can fit the menu panel to the available viewport above the trigger', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        placement: 'up',
        fitViewport: true,
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      right: 240,
      bottom: 340,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 300,
      toJSON: () => ({})
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('274px');
  });

  it('automatically opens toward the side with more viewport space', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        fitViewport: true,
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    const rectSpy = vi.spyOn(dropdown, 'getBoundingClientRect');
    rectSpy.mockReturnValue({
      top: 100,
      right: 240,
      bottom: 140,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 100,
      toJSON: () => ({})
    });
    vi.stubGlobal('innerHeight', 640);

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    const menu = container.querySelector('.suu-dropdown__menu');
    expect(menu).toHaveClass('suu-dropdown__menu--down');
    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('474px');

    rectSpy.mockReturnValue({
      top: 560,
      right: 240,
      bottom: 600,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 560,
      toJSON: () => ({})
    });
    window.dispatchEvent(new Event('scroll'));
    await tick();
    await tick();

    expect(menu).toHaveClass('suu-dropdown__menu--up');
    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('534px');
  });

  it('closes when the trigger leaves the viewport while open', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    });
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    const rectSpy = vi.spyOn(dropdown, 'getBoundingClientRect');
    rectSpy.mockReturnValue({
      top: 100,
      right: 240,
      bottom: 140,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: 100,
      toJSON: () => ({})
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    expect(screen.getByRole('listbox', { name: 'Status' })).toBeTruthy();

    rectSpy.mockReturnValue({
      top: -80,
      right: 240,
      bottom: -40,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: -80,
      toJSON: () => ({})
    });
    window.dispatchEvent(new Event('scroll'));
    await tick();
    await tick();

    expect(screen.queryByRole('listbox', { name: 'Status' })).toBeNull();
  });

  it('supports keyboard option selection', async () => {
    const onChange = vi.fn();

    render(Dropdown, {
      props: {
        value: 'small',
        ariaLabel: 'Size',
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' }
        ],
        onChange
      }
    });

    const button = screen.getByRole('button', { name: 'Size' });
    await fireEvent.keyDown(button, { key: 'ArrowDown' });
    await fireEvent.keyDown(button, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('medium');
  });

  it('uses printable prefixes to activate the first enabled grouped option without selecting it', async () => {
    const onChange = vi.fn();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView
    });

    render(Dropdown, {
      props: {
        value: 'initial',
        ariaLabel: 'Protocol',
        optionGroups: [
          { label: 'Unavailable', options: [{ label: 'Alpha', value: 'disabled', disabled: true }] },
          {
            label: 'Available',
            options: [
              { label: 'Alpine', value: 'alpine' },
              { label: 'Alpha', value: 'alpha' },
              { label: 'Beta', value: 'beta' }
            ]
          }
        ],
        onChange
      }
    });

    const trigger = screen.getByRole('button', { name: 'Protocol' });
    await fireEvent.keyDown(trigger, { key: 'a' });
    await tick();

    expect(screen.getByRole('option', { name: 'Alpine' })).toHaveClass('suu-dropdown__option--active');
    for (const option of screen.getAllByRole('option', { name: 'Alpha' })) {
      expect(option).not.toHaveClass('suu-dropdown__option--active');
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute('data-value', 'initial');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('resets the typeahead prefix after its timeout and skips disabled matches', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(Dropdown, {
      props: {
        value: 'initial',
        ariaLabel: 'Choice',
        options: [
          { label: 'Alpha', value: 'alpha', disabled: true },
          { label: 'Beta', value: 'beta' }
        ],
        onChange
      }
    });

    const trigger = screen.getByRole('button', { name: 'Choice' });
    await fireEvent.keyDown(trigger, { key: 'a' });
    expect(screen.queryByRole('option', { name: 'Alpha' })).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    await fireEvent.keyDown(trigger, { key: 'b' });
    await tick();

    expect(screen.getByRole('option', { name: 'Beta' })).toHaveClass('suu-dropdown__option--active');
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute('data-value', 'initial');
  });

  it('matches a multi-character prefix including browser code-style keys', async () => {
    render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'Community',
        options: [
          { label: 'Banff Trail', value: 'banff' },
          { label: 'Brentwood', value: 'brentwood' },
          { label: 'Bowness', value: 'bowness' }
        ]
      }
    });

    const trigger = screen.getByRole('button', { name: 'Community' });
    for (const key of ['KeyB', 'KeyR', 'KeyE', 'KeyN']) {
      await fireEvent.keyDown(trigger, { key });
    }
    await tick();

    expect(screen.getByRole('option', { name: 'Brentwood' })).toHaveClass('suu-dropdown__option--active');
    expect(trigger).toHaveAttribute('data-value', '');
  });

  it('uses optional search text for typeahead while keeping the display label', async () => {
    const onChange = vi.fn();
    render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'Country',
        options: [
          { label: '中国', searchText: 'China', value: 'cn' },
          { label: '加拿大', searchText: 'Canada', value: 'ca' }
        ],
        onChange
      }
    });

    const trigger = screen.getByRole('button', { name: 'Country' });
    await fireEvent.keyDown(trigger, { key: 'c' });
    await fireEvent.keyDown(trigger, { key: 'h' });

    expect(screen.getByRole('option', { name: '中国' })).toHaveClass('suu-dropdown__option--active');
    expect(trigger).toHaveTextContent('');
    await fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('cn');
  });

  it('keeps a multi-character search alias when typing between buffer ticks', async () => {
    vi.useFakeTimers();
    render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'Country',
        options: [
          { label: '智利', searchText: 'Chile', value: 'cl' },
          { label: '中国', searchText: 'China', value: 'cn' }
        ]
      }
    });

    const trigger = screen.getByRole('button', { name: 'Country' });
    for (const key of ['c', 'h', 'i', 'n']) {
      await fireEvent.keyDown(trigger, { key });
      await vi.advanceTimersByTimeAsync(700);
    }

    expect(screen.getByRole('option', { name: '中国' })).toHaveClass('suu-dropdown__option--active');
  });

  it('bridges a single selection to form data while leaving the trigger nameless', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const { container, rerender } = render(Dropdown, {
      target: form,
      props: {
        value: 'active',
        ariaLabel: 'Status',
        name: 'status',
        required: true,
        options: [{ label: 'Active', value: 'active' }]
      }
    });

    const input = container.querySelector('input[name="status"]') as HTMLInputElement;
    const trigger = screen.getByRole('button', { name: 'Status' });
    expect(input).toHaveAttribute('type', 'text');
    expect(input).not.toHaveAttribute('readonly');
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveValue('active');
    expect(trigger).not.toHaveAttribute('name');
    expect(new FormData(form).get('status')).toBe('active');
    expect(form.checkValidity()).toBe(true);

    await rerender({
      value: '',
      ariaLabel: 'Status',
      name: 'status',
      required: true,
      options: [{ label: 'Active', value: 'active' }]
    });
    expect(form.checkValidity()).toBe(false);

    await rerender({
      value: 'active',
      ariaLabel: 'Status',
      name: 'status',
      required: true,
      disabled: true,
      options: [{ label: 'Active', value: 'active' }]
    });
    expect(new FormData(form).has('status')).toBe(false);
    form.remove();
  });

  it('keeps the legacy flat-options defaults unchanged', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    });

    const dropdown = container.querySelector('.suu-dropdown');
    expect(dropdown).toHaveClass('suu-dropdown');
    expect(dropdown).not.toHaveClass('suu-dropdown--sized');
    expect(dropdown?.getAttribute('style')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    expect(container.querySelector('.suu-dropdown__menu')).toHaveClass('suu-dropdown__menu--down');
    expect(container.querySelector('.suu-dropdown__menu')).toHaveClass('suu-dropdown__menu--left');
    expect(screen.queryAllByRole('group')).toHaveLength(0);
  });

  it('renders opt-in groups with accessible headings and flat keyboard navigation', async () => {
    const onChange = vi.fn();

    render(Dropdown, {
      props: {
        value: 'chat',
        ariaLabel: 'Protocol',
        optionGroups: [
          { label: 'OpenAI', options: [{ label: 'Chat', value: 'chat' }] },
          {
            label: 'Other',
            options: [
              { label: 'Responses', value: 'responses' },
              { label: 'Unavailable', value: 'unavailable', disabled: true }
            ]
          }
        ],
        onChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocol' }));
    expect(screen.getByRole('group', { name: 'OpenAI' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Other' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Unavailable' })).toBeDisabled();

    const button = screen.getByRole('button', { name: 'Protocol' });
    await fireEvent.keyDown(button, { key: 'ArrowDown' });
    await fireEvent.keyDown(button, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('responses');
  });

  it('keeps a divider between a group heading and its first option on hover', async () => {
    render(DropdownMultiSelect, {
      props: {
        value: [],
        ariaLabel: 'Grouped choices',
        optionGroups: [{ label: 'Core', options: [{ label: 'Chat', value: 'chat' }] }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Grouped choices' }));
    const firstOption = screen.getByRole('option', { name: 'Chat' });
    await fireEvent.mouseEnter(firstOption);

    expect(firstOption).toHaveClass('suu-dropdown__option--group-first');
  });

  it('supports collapsed groups and auto-expands selected groups once per open', async () => {
    const groups = [
      { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
      { label: 'Extra', options: [{ label: 'Mail', value: 'mail' }] }
    ];
    const { rerender } = render(DropdownMultiSelect, {
      props: { value: ['chat'], ariaLabel: 'Grouped choices', optionGroups: groups, groupsCollapsedByDefault: 'auto' }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Grouped choices' }));
    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();

    await rerender({ value: [] });
    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Grouped choices' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Grouped choices' }));
    expect(screen.queryByRole('option', { name: 'Chat' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();
  });

  it('allows manually expanding a group configured as collapsed by default', async () => {
    render(Dropdown, {
      props: {
        value: 'chat', ariaLabel: 'Grouped choice', groupsCollapsedByDefault: 'true',
        optionGroups: [{ label: 'Core', options: [{ label: 'Chat', value: 'chat' }] }]
      }
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Grouped choice' }));
    expect(screen.queryByRole('option', { name: 'Chat' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Core' }));
    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();
  });

  it('supports opt-in sizing, classes, and trigger event handling', async () => {
    const onTriggerClick = vi.fn((event: MouseEvent) => event.stopPropagation());
    const parentClick = vi.fn();
    const { container } = render(Dropdown, {
      props: {
        value: 'one',
        ariaLabel: 'Choice',
        width: '12rem',
        minWidth: '10rem',
        maxWidth: '20rem',
        className: 'custom-dropdown',
        onTriggerClick,
        options: [{ label: 'One', value: 'one' }]
      }
    });
    container.addEventListener('click', parentClick);

    await fireEvent.click(screen.getByRole('button', { name: 'Choice' }));

    const dropdown = container.querySelector('.suu-dropdown');
    expect(dropdown).toHaveClass('suu-dropdown--sized', 'custom-dropdown');
    expect(dropdown).toHaveStyle({ width: '12rem', minWidth: '10rem', maxWidth: '20rem' });
    expect(onTriggerClick).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox', { name: 'Choice' })).toBeInTheDocument();
  });

  it('toggles multiple values in option order without closing the menu', async () => {
    const onChange = vi.fn();
    const options = [
      { label: 'Alpha', value: 'alpha' },
      { label: 'Beta', value: 'beta' },
      { label: 'Gamma', value: 'gamma', disabled: true }
    ];
    const { container, rerender } = render(DropdownMultiSelect, {
      props: {
        value: ['beta'],
        options,
        ariaLabel: 'Members',
        maxWidth: '12rem',
        onChange
      }
    });

    expect(container.querySelector('.suu-dropdown')).toHaveClass(
      'suu-dropdown--multiselect',
      'suu-dropdown--sized'
    );
    expect(container.querySelector('.suu-dropdown')).toHaveStyle({ maxWidth: '12rem' });
    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('Beta');

    await fireEvent.click(screen.getByRole('button', { name: 'Members' }));
    expect(screen.getByRole('listbox', { name: 'Members' })).toHaveAttribute('aria-multiselectable', 'true');
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false');
    expect(container.querySelectorAll('.suu-dropdown__checkbox')).toHaveLength(3);
    expect(
      screen.getByRole('option', { name: 'Beta' }).querySelector('.suu-dropdown__checkbox')
    ).toHaveAttribute('data-checked', 'true');

    await fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onChange).toHaveBeenLastCalledWith(['alpha', 'beta']);
    expect(screen.getByRole('listbox', { name: 'Members' })).toBeInTheDocument();

    await rerender({ value: ['beta', 'missing', 'alpha'], options, ariaLabel: 'Members', maxWidth: '12rem', onChange });
    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('Alpha, Beta');
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');

    await fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
    expect(onChange).toHaveBeenLastCalledWith(['alpha', 'missing']);
    expect(screen.getByRole('listbox', { name: 'Members' })).toBeInTheDocument();
  });

  it('updates open option checkboxes immediately when a controlled parent removes a value', async () => {
    render(ControlledDropdownMultiSelectHarness);

    await fireEvent.click(screen.getByRole('button', { name: 'Controlled choices' }));
    const alphaOption = screen.getByRole('option', { name: 'Alpha' });
    const alphaCheckbox = alphaOption.querySelector('.suu-dropdown__checkbox');
    expect(alphaOption).toHaveAttribute('aria-selected', 'true');
    expect(alphaCheckbox).toHaveAttribute('data-checked', 'true');

    await fireEvent.click(alphaOption);

    expect(screen.getByRole('listbox', { name: 'Controlled choices' })).toBeInTheDocument();
    expect(screen.getByLabelText('Selected values')).toHaveTextContent('beta');
    expect(alphaOption).toHaveAttribute('aria-selected', 'false');
    expect(alphaCheckbox).toHaveAttribute('data-checked', 'false');
  });

  it('supports grouped and disabled options in multiselect mode', async () => {
    const onChange = vi.fn();
    render(DropdownMultiSelect, {
      props: {
        value: [],
        ariaLabel: 'Protocols',
        optionGroups: [
          { label: 'Core', options: [{ label: 'Chat', value: 'chat', disabled: true }] },
          { label: 'Other', options: [{ label: 'Responses', value: 'responses', disabled: true }] }
        ],
        onChange
      }
    });

    const trigger = screen.getByRole('button', { name: 'Protocols' });
    expect(trigger.querySelector('.suu-dropdown__label')).toHaveTextContent('');
    await fireEvent.click(trigger);
    expect(screen.getByRole('group', { name: 'Core' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Other' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chat' })).toBeDisabled();
    await fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox', { name: 'Protocols' })).toBeInTheDocument();
  });

  it('keeps multiselect open for keyboard toggles and closes through each dismissal path', async () => {
    const options = [
      { label: 'One', value: 'one' },
      { label: 'Two', value: 'two' }
    ];
    const onChange = vi.fn();
    const { rerender, unmount } = render(DropdownMultiSelect, {
      props: { value: ['one'], options, ariaLabel: 'Keyboard choices', onChange }
    });
    const trigger = screen.getByRole('button', { name: 'Keyboard choices' });

    await fireEvent.click(trigger);
    await fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['one', 'two']);
    expect(screen.getByRole('listbox', { name: 'Keyboard choices' })).toBeInTheDocument();

    await rerender({ value: ['one', 'two'], options, ariaLabel: 'Keyboard choices', onChange });
    await fireEvent.keyDown(trigger, { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith(['one']);
    expect(screen.getByRole('listbox', { name: 'Keyboard choices' })).toBeInTheDocument();

    await fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Keyboard choices' })).not.toBeInTheDocument();
    await fireEvent.click(trigger);
    await fireEvent.click(trigger);
    expect(screen.queryByRole('listbox', { name: 'Keyboard choices' })).not.toBeInTheDocument();
    await fireEvent.click(trigger);
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox', { name: 'Keyboard choices' })).not.toBeInTheDocument();
    unmount();
  });

  it('keeps the single-select listbox contract unchanged', async () => {
    render(Dropdown, {
      props: {
        value: 'one',
        ariaLabel: 'Single choice',
        options: [{ label: 'One', value: 'one' }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Single choice' }));
    expect(screen.getByRole('listbox', { name: 'Single choice' })).not.toHaveAttribute('aria-multiselectable');
    expect(document.querySelector('.suu-dropdown__checkbox')).toBeNull();
  });
});

describe('dropdown search', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fires the empty query immediately on open with a limited abortable context', async () => {
    const loadOptions = vi.fn(
      (_query: string, context: { limit: number; signal: AbortSignal }) =>
        new Promise<{ options: { label: string; value: string }[] }>(() => undefined)
    );

    render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'Country',
        search: true,
        searchLimit: 25,
        loadOptions
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));

    expect(loadOptions).toHaveBeenCalledTimes(1);
    const [query, context] = loadOptions.mock.calls[0];
    expect(query).toBe('');
    expect(context.limit).toBe(25);
    expect(context.signal).toBeInstanceOf(AbortSignal);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('debounces typed queries and renders flat results', async () => {
    vi.useFakeTimers();
    const loadOptions = vi.fn().mockResolvedValue({ options: [{ label: 'Beta', value: 'beta' }] });

    render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'Country',
        search: true,
        searchDebounceMs: 300,
        loadOptions
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));
    loadOptions.mockClear();

    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'be' } });
    expect(loadOptions).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(loadOptions).toHaveBeenCalledTimes(1);
    expect(loadOptions).toHaveBeenCalledWith('be', expect.objectContaining({ limit: 10 }));
    expect(await screen.findByRole('option', { name: 'Beta' })).toBeInTheDocument();
  });

  it('reports each search query immediately without waiting for the remote loader', async () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    const loadOptions = vi.fn().mockResolvedValue({ options: [] });

    render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'User',
        placeholder: 'Search users',
        search: true,
        searchDebounceMs: 300,
        loadOptions,
        onSearchChange
      }
    });

    expect(screen.getByRole('button', { name: 'User' })).toHaveTextContent('Search users');
    await fireEvent.click(screen.getByRole('button', { name: 'User' }));
    loadOptions.mockClear();

    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'alice' } });

    expect(onSearchChange).toHaveBeenCalledOnce();
    expect(onSearchChange).toHaveBeenCalledWith('alice');
    expect(loadOptions).not.toHaveBeenCalled();
  });

  it('renders async option groups as the sole source and hides empty groups', async () => {
    const loadOptions = vi.fn().mockResolvedValue({
      options: [{ label: 'Ignored', value: 'ignored' }],
      optionGroups: [
        { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
        { label: 'Empty', options: [] },
        { options: [{ label: 'Ungrouped', value: 'ungrouped' }] }
      ]
    });

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Protocols', search: true, searchDebounceMs: 0, loadOptions }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocols' }));

    expect(await screen.findByRole('group', { name: 'Core' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ungrouped' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ignored' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Empty' })).toBeNull();
  });

  it('shows the no-results state when the async result is empty', async () => {
    const loadOptions = vi.fn().mockResolvedValue({ options: [], optionGroups: [] });

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Country', search: true, searchDebounceMs: 0, loadOptions }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));

    expect(await screen.findByText('Empty')).toBeInTheDocument();
    expect(screen.queryByRole('option')).toBeNull();
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ limit: 10 }));
  });

  it('shows an error state when loading fails and recovers on the next query', async () => {
    const loadOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ options: [{ label: 'Beta', value: 'beta' }] });

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Country', search: true, searchDebounceMs: 0, loadOptions }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load options');

    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'be' } });
    expect(await screen.findByRole('option', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('discards stale responses and renders only the latest result', async () => {
    let resolveFirst: ((result: { options: { label: string; value: string }[] }) => void) | undefined;
    const loadOptions = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ options: { label: string; value: string }[] }>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ options: [{ label: 'Latest', value: 'latest' }] })
      );

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Country', search: true, searchDebounceMs: 0, loadOptions }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));
    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'la' } });

    expect(await screen.findByRole('option', { name: 'Latest' })).toBeInTheDocument();

    resolveFirst?.({ options: [{ label: 'Stale', value: 'stale' }] });
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: 'Stale' })).toBeNull();
      expect(screen.getByRole('option', { name: 'Latest' })).toBeInTheDocument();
    });
  });

  it('aborts the in-flight request when superseded and when the menu closes', async () => {
    const signals: AbortSignal[] = [];
    const loadOptions = vi.fn((_query: string, context: { signal: AbortSignal }) => {
      signals.push(context.signal);
      return new Promise<DropdownLoadOptionsResult>(() => undefined);
    });

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Country', search: true, searchDebounceMs: 0, loadOptions }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));
    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'x' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(2));

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await fireEvent.keyDown(screen.getByRole('button', { name: 'Country' }), { key: 'Escape' });
    expect(signals[1].aborted).toBe(true);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('closes after a single-select search pick and keeps the selected label across queries', async () => {
    const onChange = vi.fn();
    const loadOptions = vi
      .fn()
      .mockResolvedValueOnce({ options: [{ label: 'Alpha', value: 'alpha' }, { label: 'Beta', value: 'beta' }] })
      .mockResolvedValue({ options: [{ label: 'Beta', value: 'beta' }] });
    const props = {
      value: '',
      ariaLabel: 'Country',
      search: true,
      searchDebounceMs: 0,
      loadOptions,
      onChange
    };
    const { rerender } = render(Dropdown, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));
    await fireEvent.click(await screen.findByRole('option', { name: 'Alpha' }));

    expect(onChange).toHaveBeenCalledWith('alpha');
    expect(screen.queryByRole('listbox')).toBeNull();

    await rerender({ ...props, value: 'alpha' });
    const trigger = screen.getByRole('button', { name: 'Country' });
    expect(trigger).toHaveTextContent('Alpha');

    await fireEvent.click(trigger);
    expect(await screen.findByRole('option', { name: 'Beta' })).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Alpha');
  });

  it('keeps multiselect search open and preserves earlier picks across queries', async () => {
    const onChange = vi.fn();
    const loadOptions = vi
      .fn()
      .mockResolvedValueOnce({ options: [{ label: 'Apple', value: 'apple' }] })
      .mockResolvedValue({ options: [{ label: 'Banana', value: 'banana' }] });
    const props = {
      value: [] as string[],
      multiselect: true,
      ariaLabel: 'Fruit',
      search: true,
      searchDebounceMs: 0,
      loadOptions,
      onChange
    };
    const { rerender } = render(Dropdown, { props });

    await fireEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    await fireEvent.click(await screen.findByRole('option', { name: 'Apple' }));

    expect(onChange).toHaveBeenLastCalledWith(['apple']);
    expect(screen.getByRole('listbox', { name: 'Fruit' })).toBeInTheDocument();

    await rerender({ ...props, value: ['apple'] });
    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'ban' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Banana' }));

    expect(onChange).toHaveBeenLastCalledWith(['banana', 'apple']);
    expect(screen.getByRole('listbox', { name: 'Fruit' })).toBeInTheDocument();

    await rerender({ ...props, value: ['banana', 'apple'] });
    expect(screen.getByRole('button', { name: 'Fruit' })).toHaveTextContent('Banana, Apple');
  });

  it('applies auto group collapse to async groups based on the current selection', async () => {
    const onChange = vi.fn();
    const loadOptions = vi.fn().mockResolvedValue({
      optionGroups: [
        { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
        { label: 'Extra', options: [{ label: 'Mail', value: 'mail' }] }
      ]
    });

    render(Dropdown, {
      props: {
        value: ['chat'],
        multiselect: true,
        ariaLabel: 'Protocols',
        search: true,
        groupsCollapsedByDefault: 'auto' as const,
        searchDebounceMs: 0,
        loadOptions,
        onChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocols' }));

    expect(await screen.findByRole('group', { name: 'Core' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();

    await fireEvent.click(await screen.findByRole('button', { name: 'Extra' }));
    expect(screen.getByRole('option', { name: 'Mail' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('option', { name: 'Mail' }));
    expect(onChange).toHaveBeenLastCalledWith(['chat', 'mail']);
    expect(screen.getByRole('listbox', { name: 'Protocols' })).toBeInTheDocument();
  });

  it('preserves manual group collapse toggles across query refreshes within one open session', async () => {
    const loadOptions = vi
      .fn()
      .mockResolvedValueOnce({
        optionGroups: [
          { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
          { label: 'Extra', options: [{ label: 'Mail', value: 'mail' }] }
        ]
      })
      .mockResolvedValueOnce({
        optionGroups: [
          { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
          { label: 'Extra', options: [{ label: 'Mail', value: 'mail' }, { label: 'Mail Pro', value: 'mailPro' }] }
        ]
      });

    render(Dropdown, {
      props: {
        value: ['chat'],
        multiselect: true,
        ariaLabel: 'Protocols',
        search: true,
        groupsCollapsedByDefault: 'auto' as const,
        searchDebounceMs: 0,
        loadOptions
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocols' }));

    expect(await screen.findByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Core' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Extra' }));
    expect(screen.queryByRole('option', { name: 'Chat' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Mail' })).toBeInTheDocument();

    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'ma' } });

    expect(await screen.findByRole('option', { name: 'Mail Pro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mail' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Chat' })).toBeNull();
  });

  it('re-evaluates auto group collapse after closing and reopening the menu', async () => {
    const loadOptions = vi.fn().mockResolvedValue({
      optionGroups: [
        { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
        { label: 'Extra', options: [{ label: 'Mail', value: 'mail' }] }
      ]
    });
    const props = {
      value: ['chat'] as string[],
      multiselect: true,
      ariaLabel: 'Protocols',
      search: true,
      groupsCollapsedByDefault: 'auto' as const,
      searchDebounceMs: 0,
      loadOptions
    };
    const { rerender } = render(Dropdown, { props });

    const trigger = screen.getByRole('button', { name: 'Protocols' });
    await fireEvent.click(trigger);
    expect(await screen.findByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Extra' }));
    expect(screen.getByRole('option', { name: 'Mail' })).toBeInTheDocument();

    await fireEvent.click(trigger);
    expect(screen.queryByRole('listbox', { name: 'Protocols' })).toBeNull();

    await fireEvent.click(trigger);
    expect(await screen.findByRole('group', { name: 'Extra' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();

    await fireEvent.click(trigger);
    await rerender({ ...props, value: ['chat', 'mail'] });
    await fireEvent.click(trigger);
    expect(await screen.findByRole('option', { name: 'Mail' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();
  });

  it('seeds auto collapse at the first valid grouped response of an open session', async () => {
    const loadOptions = vi
      .fn()
      .mockResolvedValueOnce({ options: [], optionGroups: [] })
      .mockResolvedValueOnce({
        optionGroups: [
          { label: 'Core', options: [{ label: 'Chat', value: 'chat' }] },
          { label: 'Extra', options: [{ label: 'Mail', value: 'mail' }] }
        ]
      });

    render(Dropdown, {
      props: {
        value: ['chat'],
        multiselect: true,
        ariaLabel: 'Protocols',
        search: true,
        groupsCollapsedByDefault: 'auto' as const,
        searchDebounceMs: 0,
        loadOptions
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocols' }));
    expect(await screen.findByText('Empty')).toBeInTheDocument();

    await fireEvent.input(screen.getByRole('combobox'), { target: { value: 'ch' } });

    expect(await screen.findByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mail' })).toBeNull();
  });

  it('supports keyboard selection and escape dismissal from the search input', async () => {
    const onChange = vi.fn();
    const loadOptions = vi
      .fn()
      .mockResolvedValue({ options: [{ label: 'Alpha', value: 'alpha' }, { label: 'Beta', value: 'beta' }] });

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Country', search: true, searchDebounceMs: 0, loadOptions, onChange }
    });

    const trigger = screen.getByRole('button', { name: 'Country' });
    await fireEvent.click(trigger);
    const input = screen.getByRole('combobox');
    expect(await screen.findByRole('option', { name: 'Alpha' })).toBeInTheDocument();

    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('beta');
    expect(screen.queryByRole('listbox')).toBeNull();

    await fireEvent.click(trigger);
    const reopenedInput = screen.getByRole('combobox');
    await screen.findByRole('option', { name: 'Alpha' });
    await fireEvent.keyDown(reopenedInput, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes an open search menu on outside pointerdown', async () => {
    const loadOptions = vi.fn().mockResolvedValue({ options: [{ label: 'Alpha', value: 'alpha' }] });

    render(Dropdown, {
      props: { value: '', ariaLabel: 'Country', search: true, searchDebounceMs: 0, loadOptions }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Country' }));
    expect(await screen.findByRole('option', { name: 'Alpha' })).toBeInTheDocument();

    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('never calls loadOptions and keeps instantiated options when search is disabled', async () => {
    const loadOptions = vi.fn();
    const optionGroups = [{ label: 'Core', options: [{ label: 'Chat', value: 'chat' }] }];

    render(Dropdown, {
      props: {
        value: 'chat',
        ariaLabel: 'Protocols',
        options: [{ label: 'Ignored flat', value: 'flat' }],
        optionGroups,
        loadOptions
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Protocols' }));

    expect(screen.getByRole('option', { name: 'Chat' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ignored flat' })).toBeNull();
    expect(loadOptions).not.toHaveBeenCalled();
  });
});
