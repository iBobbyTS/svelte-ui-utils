import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Toast from '../src/lib/toast/Toast.svelte';
import {
  createToastStore,
  getToastStackDirection,
  groupToastsByPosition,
  TOAST_POSITIONS
} from '../src/lib/toast/index.js';
import type { ToastItem } from '../src/lib/toast/index.js';

describe('toast store', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds, dismisses, and clears toasts', () => {
    const store = createToastStore();
    const first = store.success({ title: 'Saved', position: 'top-right', duration: 0 });
    const second = store.error({ message: 'Failed', position: 'bottom-left', duration: 0 });

    expect(get(store)).toHaveLength(2);
    expect(get(store)[0]?.variant).toBe('success');

    first.dismiss();
    expect(get(store).map((item) => item.id)).toEqual([second.id]);

    store.clear('bottom-left');
    expect(get(store)).toEqual([]);
  });

  it('auto-expires toasts with a positive duration', () => {
    vi.useFakeTimers();
    const store = createToastStore();

    store.info({ message: 'Temporary', duration: 250 });
    expect(get(store)).toHaveLength(1);

    vi.advanceTimersByTime(249);
    expect(get(store)).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(get(store)).toHaveLength(0);
  });

  it('groups toasts by position and exposes stack direction', () => {
    const store = createToastStore();
    store.info({ message: 'A', position: 'top-left', duration: 0 });
    store.info({ message: 'B', position: 'top-left', duration: 0 });
    store.info({ message: 'C', position: 'bottom-right', duration: 0 });

    const groups = groupToastsByPosition(get(store));

    expect(TOAST_POSITIONS).toContain('right-center');
    expect(groups['top-left'].map((item) => item.message)).toEqual(['A', 'B']);
    expect(groups['bottom-right'].map((item) => item.message)).toEqual(['C']);
    expect(getToastStackDirection('top-center')).toBe('down');
    expect(getToastStackDirection('bottom-center')).toBe('up');
  });

  it('updates existing toast options and reschedules duration', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const handle = store.info({ id: 'stable', message: 'Old', duration: 1000 });

    handle.update({ message: 'New', duration: 2000 });
    expect(get(store)[0]?.message).toBe('New');

    vi.advanceTimersByTime(1000);
    expect(get(store)).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(get(store)).toHaveLength(0);
  });

  it('anchors expiry at creation and refreshes the anchor when the timer resets', () => {
    vi.useFakeTimers();
    const store = createToastStore();
    const handle = store.info({ message: 'Anchored', duration: 1000 });

    const created = get(store)[0];
    expect(created?.createdAt).toBe(Date.now());
    expect(created?.expiresAt).toBe(Date.now() + 1000);

    vi.advanceTimersByTime(400);
    handle.update({ message: 'Refreshed', duration: 2000 });
    const updated = get(store)[0];
    expect(updated?.expiresAt).toBe(Date.now() + 2000);
  });
});

describe('toast component', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses localized close labels when no override is passed', () => {
    render(Toast, {
      props: {
        language: 'zh_cn',
        toast: {
          id: 'toast-1',
          title: 'Saved',
          message: '',
          variant: 'success',
          position: 'top-right',
          duration: 0,
          showCountdown: false,
          dismissible: true,
          ariaLive: 'polite',
          createdAt: Date.now(),
          expiresAt: Date.now()
        }
      }
    });

    expect(screen.getByRole('button', { name: '关闭通知' })).toBeTruthy();
  });

  it('resumes the countdown from the expiry anchor when remounted', () => {
    vi.useFakeTimers();
    const now = Date.now();

    render(Toast, {
      props: {
        toast: {
          id: 'toast-1',
          title: '',
          message: 'Temporary',
          variant: 'info',
          position: 'top-right',
          duration: 5000,
          showCountdown: true,
          dismissible: true,
          ariaLive: 'polite',
          createdAt: now - 2000,
          expiresAt: now + 3000
        }
      }
    });

    const countdown = document.querySelector('.suu-toast__countdown');
    expect(countdown?.getAttribute('style')).toContain('--suu-toast-duration: 5000ms');
    expect(countdown?.getAttribute('style')).toContain('animation-delay: -2000ms');
  });

  it('clamps a not-yet-started anchor to zero elapsed time', () => {
    vi.useFakeTimers();
    const now = Date.now();

    render(Toast, {
      props: {
        toast: {
          id: 'toast-1',
          title: '',
          message: 'Temporary',
          variant: 'info',
          position: 'top-right',
          duration: 5000,
          showCountdown: true,
          dismissible: true,
          ariaLive: 'polite',
          createdAt: now,
          expiresAt: now + 6000
        }
      }
    });

    const countdown = document.querySelector('.suu-toast__countdown');
    expect(countdown?.getAttribute('style')).toContain('animation-delay: -0ms');
  });

  it('falls back to a full countdown when the anchor is missing', () => {
    vi.useFakeTimers();

    render(Toast, {
      props: {
        toast: {
          id: 'toast-1',
          title: '',
          message: 'Temporary',
          variant: 'info',
          position: 'top-right',
          duration: 5000,
          showCountdown: true,
          dismissible: true,
          ariaLive: 'polite',
          createdAt: Date.now()
        } as ToastItem
      }
    });

    const countdown = document.querySelector('.suu-toast__countdown');
    expect(countdown?.getAttribute('style')).toContain('animation-delay: -0ms');
  });
});
