import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { Dropdown } from '../src/lib/dropdown/index.js';

describe('dropdown', () => {
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
