import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TooltipHarness from './fixtures/TooltipHarness.svelte';

describe('tooltip', () => {
  it('shows slotted content on hover and hides it after leaving', async () => {
    render(TooltipHarness);

    const trigger = screen.getByRole('button', { name: 'Help' });
    const root = screen.getByRole('group');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await fireEvent.mouseEnter(root);
    expect(screen.getByRole('tooltip')).toHaveTextContent('暂时留空');
    expect(trigger.parentElement).toHaveAttribute(
      'aria-describedby',
      screen.getByRole('tooltip').id,
    );

    await fireEvent.mouseLeave(root);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows content while the trigger is focused and provides tooltip semantics', async () => {
    render(TooltipHarness, { props: { triggerLabel: 'Bilibili help', image: true } });

    const trigger = screen.getByRole('button', { name: 'Bilibili help' });
    await fireEvent.focusIn(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toContainElement(screen.getByRole('img', { name: '账号示例' }));

    await fireEvent.focusOut(trigger, { relatedTarget: document.body });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
