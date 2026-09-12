import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dropdown, DropdownMultiSelect } from '../src/lib/dropdown/index.js';
import ControlledDropdownMultiSelectHarness from './fixtures/ControlledDropdownMultiSelectHarness.svelte';

describe('dropdown', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it('emits selected option changes', async () => {
    const onChange = vi.fn();

    render(Dropdown, {
      props: {
        value: 10,
        ariaLabel: 'Rows',
        options: [
          { label: '10', value: 10 },
          { label: '20', value: 20 }
        ],
        onChange
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Rows' }));
    await fireEvent.click(screen.getByRole('option', { name: '20' }));

    expect(onChange).toHaveBeenCalledWith(20);
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
    expect(menu?.parentElement).toBe(document.body);
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
    expect(onChange).toHaveBeenLastCalledWith(['alpha']);
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
