import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dropdown } from '../src/lib/dropdown/index.js';

describe('dropdown', () => {
  afterEach(() => {
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

  it('aligns the menu left edge with the trigger when requested', async () => {
    const { container } = render(Dropdown, {
      props: {
        value: 'active',
        ariaLabel: 'Status',
        menuAlign: 'left',
        options: [{ label: 'Active', value: 'active' }]
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Status' }));

    const menu = container.querySelector('.suu-dropdown__menu');
    expect(menu?.classList.contains('suu-dropdown__menu--left')).toBe(true);
    expect(menu?.classList.contains('suu-dropdown__menu--right')).toBe(false);
  });

  it('can fit the menu panel to the available viewport below the trigger', async () => {
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
});
