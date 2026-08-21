import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TooltipHarness from './fixtures/TooltipHarness.svelte';

describe('tooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows slotted content on hover and hides it after leaving', async () => {
    render(TooltipHarness);

    const trigger = screen.getByRole('button', { name: 'Help' });
    const root = screen.getByRole('group');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await fireEvent.mouseEnter(root);
    expect(screen.getByRole('tooltip')).toHaveTextContent('暂时留空');
    expect(trigger).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    expect(root).not.toHaveAttribute('aria-describedby');

    await fireEvent.mouseLeave(root);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('shows content while the trigger is focused and provides tooltip semantics', async () => {
    render(TooltipHarness, {
      props: { triggerLabel: 'Bilibili help', image: true, imageText: '图片填写说明' },
    });

    const trigger = screen.getByRole('button', { name: 'Bilibili help' });
    await fireEvent.focusIn(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('图片填写说明');
    expect(tooltip).toContainElement(screen.getByRole('img', { name: '账号示例' }));

    await fireEvent.focusOut(trigger, { relatedTarget: document.body });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('repositions after panel size changes and keeps the panel within the viewport', async () => {
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

    render(TooltipHarness);
    const root = screen.getByRole('group');
    const trigger = screen.getByRole('button', { name: 'Help' });
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 30,
      left: 150,
      right: 170,
      width: 20,
      height: 20,
      x: 150,
      y: 10,
      toJSON: () => {},
    });
    await fireEvent.mouseEnter(root);

    const panel = screen.getByRole('tooltip');
    let panelHeight = 40;
    vi.spyOn(panel, 'getBoundingClientRect').mockImplementation(() => ({
      top: 0,
      bottom: panelHeight,
      left: 0,
      right: 220,
      width: 220,
      height: panelHeight,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    resizeCallback?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const initialTop = Number.parseFloat(panel.style.getPropertyValue('--suu-tooltip-top'));
    expect(initialTop).toBeGreaterThanOrEqual(8);

    panelHeight = window.innerHeight - 18;
    resizeCallback?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const top = Number.parseFloat(panel.style.getPropertyValue('--suu-tooltip-top'));
    expect(top).not.toBe(initialTop);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top + panelHeight).toBeLessThanOrEqual(window.innerHeight - 8);
    expect(trigger).toHaveAttribute('aria-describedby', panel.id);
  });
});
