import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dropdown, DropdownMultiSelect } from '../src/lib/dropdown/index.js';
import type { DropdownLoadOptionsResult } from '../src/lib/dropdown/types.js';
import FilterTable from '../src/lib/data-table/FilterTable.svelte';
import { filter } from '../src/lib/data-table/index.js';
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
        inputStyle: 'input',
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
        inputStyle: 'input',
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
      props: { inputStyle: 'input', options: [{ label: 'One', value: 'one' }] }
    });
    expect(container.querySelector('input.suu-dropdown__input')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses getItemLabel for input selections and supports multiselect chips', async () => {
    const onChange = vi.fn();
    const option = { label: 'Jane Doe', value: 'jane' };
    const { container } = render(Dropdown, {
      props: {
        inputStyle: 'input',
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
        inputStyle: 'input',
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
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('296px');
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-right')).toBe('496px');
  });

  it('applies viewport height to the in-tree portal menu', async () => {
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
    expect(menu.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('476px');
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
      if (this.classList.contains('suu-dropdown__panel')) {
        // Non-panel menu chrome (borders) is 20px; without this the whole menu
        // height would be booked as chrome and the panel budget would collapse.
        const height = (this.closest('.suu-dropdown__menu') as HTMLElement | null)?.style.getPropertyValue('--suu-dropdown-panel-max-height') ? 100 : 620;
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
    // Available above the trigger is 300 - 20 - 4 = 276px; the 20px menu chrome
    // comes off the panel budget, and the menu is then placed from its measured
    // 120px total height.
    expect(menu.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('256px');
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('176px');
    // One measurement settles the clamp synchronously at mount; the open-time
    // reflow repeats it and the portal placement measures once more.
    expect(menuMeasurements).toBe(3);
  });

  it('settles the panel max-height before host observers measure the mounted menu', async () => {
    // Regression: hosts reposition the menu with fixed coordinates from a
    // MutationObserver callback. That microtask fires between mount and the
    // post-mount tick that used to clamp the panel, so the host measured the
    // unclamped height and locked the menu at a wrong offset (long option lists
    // escaped the viewport). The clamp must already be final when the menu
    // enters the DOM.
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
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

    let mountedMaxHeight = 'not-run';
    const observer = new MutationObserver(() => {
      const menu = container.querySelector('.suu-dropdown__menu') as HTMLElement | null;
      if (menu) {
        mountedMaxHeight = menu.style.getPropertyValue('--suu-dropdown-panel-max-height');
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    observer.disconnect();

    // The observer callback runs as a microtask right after the mount flush —
    // the exact moment a host repositioning action would take its measurement.
    expect(mountedMaxHeight).toBe('276px');
  });

  it('keeps an upward search portal menu inside the viewport when the search box consumes budget', async () => {
    // Regression: the search box is menu height outside the panel. A budget
    // that ignores it makes the total menu taller than the space above the
    // trigger, so the upward portal top goes negative and the menu escapes the
    // viewport (or gets clamped down over the trigger by page CSS).
    const { container } = render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'User',
        portal: true,
        search: true,
        searchDebounceMs: 0,
        loadOptions: () => ({ options: [{ label: 'Alice', value: 'alice' }] }),
        placement: 'up',
        fitViewport: true
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
    vi.stubGlobal('innerHeight', 640);

    const naturalPanelHeight = 600;
    const searchBoxHeight = 42;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const max = (this.closest('.suu-dropdown__menu') as HTMLElement | null)?.style.getPropertyValue('--suu-dropdown-panel-max-height');
      const cappedHeight = max ? Math.min(naturalPanelHeight, parseInt(max, 10)) : naturalPanelHeight;
      let height: number;
      if (this.classList.contains('suu-dropdown__menu')) {
        height = cappedHeight + searchBoxHeight;
      } else if (this.classList.contains('suu-dropdown__panel')) {
        height = cappedHeight;
      } else {
        height = 0;
      }
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
    });

    await fireEvent.click(screen.getByRole('button', { name: 'User' }));
    await tick();

    const menu = document.body.querySelector('.suu-dropdown__menu--portal') as HTMLElement;
    // 276px available above minus the 42px search box leaves 234px for the
    // panel; the total 276px menu then starts exactly at the viewport margin.
    expect(menu.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('234px');
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('20px');
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
        inputStyle: 'input',
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
    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('250px');

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

    expect(menu.style.getPropertyValue('--suu-dropdown-menu-top')).toBe('180px');
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

    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('376px');
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

    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('276px');
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
    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('476px');

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
    expect(dropdown.style.getPropertyValue('--suu-dropdown-panel-max-height')).toBe('536px');
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

  it('aligns collapsed trigger content to an edge only when opted in', async () => {
    const props = { value: 'one', ariaLabel: 'Choice', options: [{ label: 'One', value: 'one' }] };
    const { container, rerender } = render(Dropdown, { props });
    const dropdown = container.querySelector('.suu-dropdown');
    expect(dropdown?.className).not.toContain('suu-dropdown--valign-');

    await rerender({ ...props, verticalAlign: 'start' });
    expect(dropdown).toHaveClass('suu-dropdown--valign-start');
    expect(dropdown?.className.match(/suu-dropdown--valign-\S+/g)).toEqual(['suu-dropdown--valign-start']);

    await rerender({ ...props, verticalAlign: 'end' });
    expect(dropdown).toHaveClass('suu-dropdown--valign-end');
    expect(dropdown?.className.match(/suu-dropdown--valign-\S+/g)).toEqual(['suu-dropdown--valign-end']);

    const multi = render(DropdownMultiSelect, {
      props: { value: ['one'], ariaLabel: 'Choices', verticalAlign: 'start', options: props.options }
    });
    expect(multi.container.querySelector('.suu-dropdown')).toHaveClass('suu-dropdown--valign-start');
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

  it('overrides the collapsed trigger text with triggerText while blank falls back', async () => {
    const options = [
      { label: 'Alpha', value: 'alpha' },
      { label: 'Beta', value: 'beta' }
    ];
    const { container, rerender } = render(Dropdown, {
      props: {
        multiselect: true,
        value: ['alpha', 'beta'],
        options,
        ariaLabel: 'Members',
        triggerText: '2 selected'
      }
    });
    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('2 selected');

    // Blank triggerText keeps the default joined-label behavior.
    await rerender({ multiselect: true, value: ['alpha', 'beta'], options, ariaLabel: 'Members', triggerText: '   ' });
    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('Alpha, Beta');

    await rerender({ multiselect: true, value: ['beta'], options, ariaLabel: 'Members', triggerText: '1 selected' });
    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('1 selected');

    // The override also applies to single-select triggers.
    const single = render(Dropdown, {
      props: { value: 'alpha', options, ariaLabel: 'Single', triggerText: 'Alpha only' }
    });
    expect(single.container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('Alpha only');
  });

  it('passes triggerText through DropdownMultiSelect to the collapsed trigger', () => {
    const { container } = render(DropdownMultiSelect, {
      props: {
        value: ['alpha', 'beta'],
        options: [
          { label: 'Alpha', value: 'alpha' },
          { label: 'Beta', value: 'beta' }
        ],
        ariaLabel: 'Members',
        triggerText: '2 selected'
      }
    });
    expect(container.querySelector('.suu-dropdown__button .suu-dropdown__label')).toHaveTextContent('2 selected');
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
    expect(loadOptions).toHaveBeenCalledWith('be', expect.objectContaining({ limit: 50 }));
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
    expect(loadOptions).toHaveBeenCalledWith('', expect.objectContaining({ limit: 50 }));
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

  // Escape 收起菜单时必须阻断默认行为与冒泡：宿主 modal dialog 的 close request 与
  // 键盘监听都不应被触发，否则菜单与宿主弹窗会被同一次 Escape 一起关闭。
  function renderInsideHost() {
    const host = document.createElement('div');
    const hostKeydown = vi.fn();
    host.addEventListener('keydown', hostKeydown);
    document.body.appendChild(host);
    const rendered = render(Dropdown, {
      props: {
        value: '',
        ariaLabel: 'Country',
        options: [
          { label: 'Alpha', value: 'alpha' },
          { label: 'Beta', value: 'beta' }
        ]
      }
    });
    host.appendChild(rendered.container);
    return { host, hostKeydown, ...rendered };
  }

  it('dismisses the open menu with Escape without bubbling the keydown to the host', async () => {
    const { host, hostKeydown, unmount } = renderInsideHost();

    const trigger = screen.getByRole('button', { name: 'Country' });
    await fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(hostKeydown).not.toHaveBeenCalled();
    unmount();
    host.remove();
  });

  it('swallows Escape from a focused option so the host dialog stays in control', async () => {
    const { host, hostKeydown, unmount } = renderInsideHost();

    const trigger = screen.getByRole('button', { name: 'Country' });
    await fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Beta' }) as HTMLElement;
    option.focus();

    const capturedKeydownEvents: KeyboardEvent[] = [];
    const captureSpy = (event: KeyboardEvent) => capturedKeydownEvents.push(event);
    document.addEventListener('keydown', captureSpy, true);

    await fireEvent.keyDown(option, { key: 'Escape' });

    document.removeEventListener('keydown', captureSpy, true);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(hostKeydown).not.toHaveBeenCalled();
    expect(capturedKeydownEvents.map((event) => event.defaultPrevented)).toEqual([true]);
    unmount();
    host.remove();
  });
});

describe('dropdown input mode state consistency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function searchOptionsFor(query: string) {
    return query ? [{ label: `Result ${query}`, value: `result-${query}` }] : [];
  }

  async function renderOpenInputSearch() {
    const loadOptions = vi.fn(async (query: string) => ({ options: searchOptionsFor(query) }));
    const rendered = render(Dropdown, {
      props: {
        inputStyle: 'input',
        search: true,
        searchDebounceMs: 0,
        loadOptions,
        ariaLabel: 'Search users'
      }
    });
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();
    await fireEvent.input(input, { target: { value: 'ea' } });
    expect(await screen.findByRole('option', { name: 'Result ea' })).toBeInTheDocument();
    return { ...rendered, input, loadOptions };
  }

  it('keeps the typed text and focus after an outside pointerdown closes the menu', async () => {
    const { input, loadOptions } = await renderOpenInputSearch();

    await fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('ea');
    expect(document.activeElement).toBe(input);

    // 关闭后继续输入时按输入框中的完整文本发起搜索。
    await fireEvent.input(input, { target: { value: 'eab' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('eab', expect.anything()));
  });

  it('keeps the typed text and focus after Escape closes the menu', async () => {
    const { input } = await renderOpenInputSearch();

    await fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('ea');
    expect(document.activeElement).toBe(input);
  });

  it('keeps the typed text and focus when scrolling the trigger out of view closes the menu', async () => {
    const { container, input } = await renderOpenInputSearch();
    const dropdown = container.querySelector('.suu-dropdown') as HTMLElement;
    const rect = vi.spyOn(dropdown, 'getBoundingClientRect').mockReturnValue({
      top: -120,
      right: 240,
      bottom: -80,
      left: 120,
      width: 120,
      height: 40,
      x: 120,
      y: -120,
      toJSON: () => ({})
    });

    // jsdom 没有真实滚动，直接触发关闭菜单所用的等价 viewport scroll 事件。
    window.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(rect).toHaveBeenCalled();
    expect(input).toHaveValue('ea');
    expect(document.activeElement).toBe(input);
  });

  it('still resets the in-menu search field for dropdown-style search closes', async () => {
    const loadOptions = vi.fn(async (query: string) => ({ options: searchOptionsFor(query) }));
    render(Dropdown, {
      props: {
        search: true,
        searchDebounceMs: 0,
        loadOptions,
        ariaLabel: 'Users'
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Users' }));
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'ea' } });
    expect(await screen.findByRole('option', { name: 'Result ea' })).toBeInTheDocument();

    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Users' }));
    const reopenedInput = screen.getByRole('combobox') as HTMLInputElement;
    expect(reopenedInput).toHaveValue('');
    await waitFor(() => expect(loadOptions).toHaveBeenLastCalledWith('', expect.anything()));
  });

  it('keeps the same input node and focus when a controlled selection is written back', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const onChange = vi.fn();
    const props = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: '',
      selectedOptions: [],
      loadOptions: async () => ({ options: [item] }),
      onChange
    };
    const { container, rerender } = render(Dropdown, { props });
    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));
    expect(onChange).toHaveBeenCalledWith('user-42');

    await rerender({ ...props, value: 'user-42', selectedOptions: [item] });

    expect(container.querySelector('input.suu-dropdown__input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue('Alice Chen');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps a partial deletion and focus when the consumer echoes the divergence clear in the same flush', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const baseProps = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: 'user-42',
      selectedOptions: [item],
      loadOptions: async () => ({ options: [item] })
    };
    const onChangeValues: unknown[] = [];
    let rerenderDropdown: ((props: Record<string, unknown>) => Promise<void>) | undefined;
    const onChange = (selection: unknown) => {
      onChangeValues.push(selection);
      if (selection !== '') {
        return;
      }
      // 真实 UserSearchDropdown 的 handleSearchChange → clearSelection：在同一个
      // 输入事件回调中同步清空受控选择，Svelte 合并到同一 flush。
      void rerenderDropdown?.({ ...baseProps, value: '', selectedOptions: [], onChange });
    };
    const rendered = render(Dropdown, { props: { ...baseProps, onChange } });
    rerenderDropdown = rendered.rerender as unknown as (props: Record<string, unknown>) => Promise<void>;
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    expect(input).toHaveValue('Alice Chen');
    input.focus();

    await fireEvent.input(input, { target: { value: 'Alice Ch' } });
    await tick();

    // 输入偏离选中标签时组件上报空值，消费者在同一 flush 内清空受控选择。
    expect(onChangeValues).toContain('');
    expect(rendered.container.querySelector('input.suu-dropdown__input')).toBe(input);
    expect(input).toHaveValue('Alice Ch');
    expect(document.activeElement).toBe(input);
  });

  it('resets query, results and draft for a truly external value replacement', async () => {
    const loadOptions = vi.fn(async (query: string) => ({ options: searchOptionsFor(query) }));
    const props = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: '',
      selectedOptions: [],
      loadOptions,
      onChange: vi.fn()
    };
    const { container, rerender } = render(Dropdown, { props });
    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;

    await fireEvent.input(input, { target: { value: 'old' } });
    expect(await screen.findByRole('option', { name: 'Result old' })).toBeInTheDocument();

    const replacement = { label: 'Bob Stone', value: 'user-7' };
    await rerender({ ...props, value: 'user-7', selectedOptions: [replacement] });

    expect(input).toHaveValue('Bob Stone');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryByRole('option', { name: 'Result old' })).toBeNull();
  });

  it('does not let a dropped divergence echo swallow a later external clear', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    // 模拟 FilterControl：Divergence 的 '' 上报被丢弃，不会产生受控回写。
    const onChange = vi.fn();
    const props = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: 'user-42',
      selectedOptions: [item],
      loadOptions: async () => ({ options: [item] }),
      onChange
    };
    const { container, rerender } = render(Dropdown, { props });
    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Alice Ch' } });
    expect(onChange).toHaveBeenCalledWith('');
    expect(input).toHaveValue('Alice Ch');

    // 关闭菜单后，未被回传消费的 echo 必须随搜索会话一起失效。
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('Alice Ch');

    // 宿主此后独立清空受控值：这是真正的外部清空，必须重置内部状态。
    await rerender({ ...props, value: '', selectedOptions: [] });

    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps the selected label for a same-flush consumer that writes back only value', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const baseProps = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: '',
      selectedOptions: [] as { label: string; value: string }[],
      loadOptions: async () => ({ options: [item] })
    };
    let rerenderDropdown: ((props: Record<string, unknown>) => Promise<void>) | undefined;
    const onChange = (selection: unknown) => {
      if (typeof selection !== 'string') {
        return;
      }
      // 真实消费者在 onChange 中同步回写受控 value（Svelte 合并到同一 flush）。
      void rerenderDropdown?.({ ...baseProps, value: selection, onChange });
    };
    const rendered = render(Dropdown, { props: { ...baseProps, onChange } });
    rerenderDropdown = rendered.rerender as unknown as (props: Record<string, unknown>) => Promise<void>;
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));
    await tick();

    // 回传 echo 必须在关闭块清理前被消费：没有 selectedOptions 时，
    // 标签只能来自 selectOption 写入的 draft。
    expect(input).toHaveValue('Alice Chen');
    expect(document.activeElement).toBe(input);
  });

  it('does not reset when only selectedOptions resolves for an unchanged value', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const unresolvedSelectedOptions: { label: string; value: string }[] = [];
    const props = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: 'user-42',
      selectedOptions: unresolvedSelectedOptions,
      loadOptions: async () => ({ options: [] }),
      onChange: vi.fn()
    };
    const { container, rerender } = render(Dropdown, { props });
    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Ali' } });
    expect(input).toHaveValue('Ali');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // value 未变，只是宿主的 selectedItem 异步解析后到达。
    await rerender({ ...props, selectedOptions: [item] });

    expect(container.querySelector('input.suu-dropdown__input')).toBe(input);
    expect(input).toHaveValue('Ali');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it('does not display a stale known label for an external replacement without selectedItem', async () => {
    const staleOption = { label: 'Cached stale label', value: 'shared' };
    const props = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: '',
      selectedOptions: [] as { label: string; value: string }[],
      loadOptions: async (query: string) => ({ options: query ? [staleOption] : [] }),
      onChange: vi.fn()
    };
    const { container, rerender } = render(Dropdown, { props });
    const input = container.querySelector('input.suu-dropdown__input') as HTMLInputElement;

    await fireEvent.input(input, { target: { value: 'old' } });
    expect(await screen.findByRole('option', { name: 'Cached stale label' })).toBeInTheDocument();

    // 外部替换到此前会话出现过的同一 value，但宿主不提供 selectedItem。
    await rerender({ ...props, value: 'shared' });

    expect(input).toHaveValue('shared');
    expect(input).not.toHaveValue('Cached stale label');
  });

  it('resets and aborts an open-menu divergence drop when the host clears externally', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    let resolveStale: ((result: { options: Array<{ label: string; value: string }> }) => void) | undefined;
    const signals: AbortSignal[] = [];
    const loadOptions = vi.fn((query: string, context: { signal: AbortSignal }) => {
      signals.push(context.signal);
      if (query === 'Ali') {
        return new Promise<{ options: Array<{ label: string; value: string }> }>((resolve) => {
          resolveStale = resolve;
        });
      }
      return { options: query ? [item] : [] };
    });
    const rows = (value: string, selectedItem: { label: string; value: string } | null) => [
      {
        key: 'search',
        title: 'Search',
        filter: filter.dropdownSearch({
          value,
          selectedItem,
          status: value ? 'valid' : 'empty',
          debounceMs: 0,
          loadOptions,
          onChange: vi.fn()
        })
      }
    ];

    const { rerender } = render(FilterTable, { props: { rows: rows('user-42', item) } });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();

    // 输入偏离选中标签：Dropdown 上报 ''，但 FilterControl 适配器将其丢弃，
    // 因此没有回传写回，菜单保持打开。
    await fireEvent.input(input, { target: { value: 'Ali' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Ali', expect.anything()));
    const pendingSignal = signals[signals.length - 1];
    expect(pendingSignal.aborted).toBe(false);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(input).toHaveValue('Ali');

    // 宿主独立发起外部清空（不是对本次上报的回传）。
    await rerender({ rows: rows('', null) });

    const nextInput = screen.getByRole('combobox') as HTMLInputElement;
    expect(nextInput).toBe(input);
    expect(nextInput).toHaveValue('');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(pendingSignal.aborted).toBe(true);

    resolveStale?.({ options: [{ label: 'Stale result', value: 'stale' }] });
    await tick();
    await tick();
    expect(screen.queryByRole('option', { name: 'Stale result' })).toBeNull();
  });

  it('keeps the selected label for an async value-only writeback after the menu closes', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const baseProps = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: '',
      selectedOptions: [] as { label: string; value: string }[],
      loadOptions: async () => ({ options: [item] })
    };
    let rerenderDropdown: ((props: Record<string, unknown>) => Promise<void>) | undefined;
    let resolveWriteback: (() => void) | undefined;
    const writebackDone = new Promise<void>((resolve) => {
      resolveWriteback = resolve;
    });
    const onChange = (selection: unknown) => {
      if (typeof selection !== 'string') {
        return;
      }
      // onChange 契约允许异步回写；选中 echo 必须存活到它到达。
      setTimeout(() => {
        void rerenderDropdown?.({ ...baseProps, value: selection, onChange }).then(() => {
          resolveWriteback?.();
        });
      }, 0);
    };
    const rendered = render(Dropdown, { props: { ...baseProps, onChange } });
    rerenderDropdown = rendered.rerender as unknown as (props: Record<string, unknown>) => Promise<void>;
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Alice' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Alice Chen' }));
    expect(input).toHaveValue('Alice Chen');

    // selectOption 已关闭菜单；等 setTimeout(0) 的异步 value 回写真正落定后再断言。
    await writebackDone;
    await tick();
    expect(rendered.container.querySelector('input.suu-dropdown__input')).toBe(input);
    expect(input).toHaveValue('Alice Chen');
    expect(document.activeElement).toBe(input);
  });

  it('keeps an empty-valued selection label for an async value-only writeback', async () => {
    const initial = { label: 'Initial', value: 'initial' };
    const emptyOption = { label: 'All users', value: '' };
    const baseProps = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: 'initial',
      selectedOptions: [initial] as { label: string; value: string }[],
      loadOptions: async () => ({ options: [emptyOption] })
    };
    let rerenderDropdown: ((props: Record<string, unknown>) => Promise<void>) | undefined;
    let resolveWriteback: (() => void) | undefined;
    const writebackDone = new Promise<void>((resolve) => {
      resolveWriteback = resolve;
    });
    const onChange = (selection: unknown) => {
      if (typeof selection !== 'string') {
        return;
      }
      // value 为 '' 的选项是合法选中；异步回写必须能消费这次 selection echo。
      setTimeout(() => {
        void rerenderDropdown?.({ ...baseProps, value: selection, selectedOptions: [], onChange }).then(() => {
          resolveWriteback?.();
        });
      }, 0);
    };
    const rendered = render(Dropdown, { props: { ...baseProps, onChange } });
    rerenderDropdown = rendered.rerender as unknown as (props: Record<string, unknown>) => Promise<void>;
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    expect(input).toHaveValue('Initial');
    input.focus();

    // 输入与当前标签完全一致 → 不产生 divergence echo；选中值为 '' 的合法选项。
    await fireEvent.input(input, { target: { value: 'Initial' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'All users' }));
    expect(input).toHaveValue('All users');

    // 等 setTimeout(0) 的异步 value 回写真正落定后再断言。
    await writebackDone;
    await tick();
    expect(rendered.container.querySelector('input.suu-dropdown__input')).toBe(input);
    expect(input).toHaveValue('All users');
    expect(document.activeElement).toBe(input);
  });

  it('clears the query text on close for multiselect input mode', async () => {
    const rendered = render(Dropdown, {
      props: {
        inputStyle: 'input',
        multiselect: true,
        search: true,
        searchDebounceMs: 0,
        value: [],
        ariaLabel: 'Members',
        loadOptions: async (query: string) => ({
          options: query ? [{ label: 'Alpha', value: 'alpha' }] : []
        })
      }
    });
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;

    await fireEvent.input(input, { target: { value: 'Al' } });
    expect(input).toHaveValue('Al');
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');

    await fireEvent.input(input, { target: { value: 'Al' } });
    expect(input).toHaveValue('Al');
    await fireEvent.pointerDown(document.body);
    expect(input).toHaveValue('');
  });

  it('shows an asynchronously resolved selectedItem label without an input draft', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const rows = (selectedItem: { label: string; value: string } | null) => [
      {
        key: 'search',
        title: 'Search',
        filter: filter.dropdownSearch({
          value: 'user-42',
          selectedItem,
          status: selectedItem ? 'valid' : 'invalid',
          debounceMs: 0,
          loadOptions: () => ({ options: [] }),
          onChange: vi.fn()
        })
      }
    ];

    const { rerender } = render(FilterTable, { props: { rows: rows(null) } });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    // 没有 draft 时先显示原始 value。
    expect(input).toHaveValue('user-42');

    // value 不变，仅 selectedItem 稍后解析到达。
    await rerender({ rows: rows(item) });

    expect(screen.getByRole('combobox')).toBe(input);
    expect(input).toHaveValue('Alice Chen');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('treats a one-microtask async divergence writeback as an external clear', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const signals: AbortSignal[] = [];
    const loadOptions = vi.fn(
      (_query: string, context: { signal: AbortSignal }) => {
        signals.push(context.signal);
        return new Promise<{ options: Array<{ label: string; value: string }> }>(() => undefined);
      }
    );
    const baseProps = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: 'user-42',
      selectedOptions: [item] as { label: string; value: string }[],
      loadOptions
    };
    let rerenderDropdown: ((props: Record<string, unknown>) => Promise<void>) | undefined;
    const onChange = async (selection: unknown) => {
      if (typeof selection !== 'string') {
        return;
      }
      // 只让出一个 microtask：不是同步同 flush 回写，应被视为外部清空。
      await Promise.resolve();
      await rerenderDropdown?.({ ...baseProps, value: '', selectedOptions: [], onChange });
    };
    const rendered = render(Dropdown, { props: { ...baseProps, onChange } });
    rerenderDropdown = rendered.rerender as unknown as (props: Record<string, unknown>) => Promise<void>;
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    // 先打开菜单并制造一个在途请求（输入与当前标签一致，不触发 divergence）。
    await fireEvent.input(input, { target: { value: 'Alice Chen' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1));
    const pendingSignal = signals[0];
    expect(pendingSignal.aborted).toBe(false);

    // 输入偏离选中标签：上报 ''，宿主在一个 microtask 后回写 value ''。
    await fireEvent.input(input, { target: { value: 'Alice Ch' } });
    await waitFor(() => expect(input).toHaveValue(''));

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(pendingSignal.aborted).toBe(true);
  });

  it('shows the canonical label written back after a selection instead of the candidate draft', async () => {
    const candidate = { label: 'Candidate label', value: 'user-42' };
    const canonical = { label: 'Canonical label', value: 'user-42' };
    const loadOptions = vi.fn(() => ({ options: [candidate] }));
    const rows = (value: string, selectedItem: { label: string; value: string } | null) => [
      {
        key: 'search',
        title: 'Search',
        filter: filter.dropdownSearch({
          value,
          selectedItem,
          status: selectedItem ? 'valid' : value ? 'invalid' : 'empty',
          debounceMs: 0,
          loadOptions,
          onChange: vi.fn()
        })
      }
    ];

    const { rerender } = render(FilterTable, { props: { rows: rows('', null) } });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Cand' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Candidate label' }));
    expect(input).toHaveValue('Candidate label');

    // 宿主回写公共 value + 同 id 的 canonical selectedItem。
    await rerender({ rows: rows('user-42', canonical) });

    expect(screen.getByRole('combobox')).toBe(input);
    expect(input).toHaveValue('Canonical label');
    expect(document.activeElement).toBe(input);
  });

  it('releases the optimistic draft so later selectedOptions labels win', async () => {
    const candidate = { label: 'Candidate label', value: 'user-42' };
    const canonical = { label: 'Canonical label', value: 'user-42' };
    const baseProps = {
      inputStyle: 'input' as const,
      search: true,
      searchDebounceMs: 0,
      value: '',
      selectedOptions: [] as { label: string; value: string }[],
      loadOptions: async () => ({ options: [candidate] }),
      onChange: vi.fn()
    };
    const rendered = render(Dropdown, { props: baseProps });
    const input = rendered.container.querySelector('input.suu-dropdown__input') as HTMLInputElement;
    input.focus();

    await fireEvent.input(input, { target: { value: 'Cand' } });
    await fireEvent.click(await screen.findByRole('option', { name: 'Candidate label' }));
    expect(input).toHaveValue('Candidate label');

    // value-only 回写：释放 draft 后由 knownLabels 提供乐观候选标签。
    await rendered.rerender({ ...baseProps, value: 'user-42' });
    expect(input).toHaveValue('Candidate label');

    // 后续 selectedOptions 的 canonical 标签（同 id、value 未变）必须接管显示。
    await rendered.rerender({ ...baseProps, value: 'user-42', selectedOptions: [canonical] });

    expect(rendered.container.querySelector('input.suu-dropdown__input')).toBe(input);
    expect(input).toHaveValue('Canonical label');
    expect(document.activeElement).toBe(input);
  });

  it('keeps the editing draft when only selectedItem resolves asynchronously', async () => {
    const item = { label: 'Alice Chen', value: 'user-42' };
    const signals: AbortSignal[] = [];
    const loadOptions = vi.fn(
      (_query: string, context: { signal: AbortSignal }) => {
        signals.push(context.signal);
        return new Promise<{ options: Array<{ label: string; value: string }> }>(() => undefined);
      }
    );
    const rows = (selectedItem: { label: string; value: string } | null) => [
      {
        key: 'search',
        title: 'Search',
        filter: filter.dropdownSearch({
          value: 'Alice Chen',
          selectedItem,
          status: selectedItem ? 'valid' : 'invalid',
          debounceMs: 0,
          loadOptions,
          onChange: vi.fn()
        })
      }
    ];

    const { rerender } = render(FilterTable, { props: { rows: rows(null) } });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input).toHaveValue('Alice Chen');
    input.focus();

    // 用户开始编辑：公共 control.value 仍是自由文本 'Alice Chen'。
    await fireEvent.input(input, { target: { value: 'Ali' } });
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith('Ali', expect.anything()));
    const pendingSignal = signals[signals.length - 1];
    expect(pendingSignal.aborted).toBe(false);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // 宿主只解析 selectedItem（公共 value 不变）：不能伪造根 value 变化。
    await rerender({ rows: rows(item) });

    expect(screen.getByRole('combobox')).toBe(input);
    expect(input).toHaveValue('Ali');
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(pendingSignal.aborted).toBe(false);
  });

  it('shows the label when only selectedItem resolves without a draft', async () => {
    const resolved = { label: 'Canonical Alice', value: 'user-42' };
    const rows = (selectedItem: { label: string; value: string } | null) => [
      {
        key: 'search',
        title: 'Search',
        filter: filter.dropdownSearch({
          value: 'user-42',
          selectedItem,
          status: selectedItem ? 'valid' : 'invalid',
          debounceMs: 0,
          loadOptions: () => ({ options: [] }),
          onChange: vi.fn()
        })
      }
    ];

    const { rerender } = render(FilterTable, { props: { rows: rows(null) } });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input).toHaveValue('user-42');

    await rerender({ rows: rows(resolved) });

    expect(screen.getByRole('combobox')).toBe(input);
    expect(input).toHaveValue('Canonical Alice');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
