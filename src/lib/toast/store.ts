import { writable } from 'svelte/store';
import type { ToastHandle, ToastItem, ToastOptions, ToastPosition, ToastStore, ToastVariant } from './types.js';

export const TOAST_POSITIONS: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'right-center',
  'bottom-right',
  'bottom-center',
  'bottom-left',
  'left-center'
];

const DEFAULT_DURATION = 5000;
const DEFAULT_POSITION: ToastPosition = 'top-right';

let nextToastId = 1;

function toToastOptions(options: ToastOptions | string, variant?: ToastVariant): ToastOptions {
  if (typeof options === 'string') {
    return { message: options, variant };
  }

  return { ...options, variant: variant ?? options.variant };
}

function normalizeToast(options: ToastOptions | string, variant?: ToastVariant): ToastItem {
  const next = toToastOptions(options, variant);
  const resolvedVariant = next.variant ?? 'info';

  return {
    id: next.id ?? `toast-${nextToastId++}`,
    title: next.title ?? '',
    message: next.message ?? '',
    variant: resolvedVariant,
    position: next.position ?? DEFAULT_POSITION,
    duration: next.duration ?? DEFAULT_DURATION,
    showCountdown: next.showCountdown ?? true,
    dismissible: next.dismissible ?? true,
    ariaLive: next.ariaLive ?? (resolvedVariant === 'error' ? 'assertive' : 'polite'),
    class: next.class,
    createdAt: Date.now()
  };
}

export function getToastStackDirection(position: ToastPosition): 'down' | 'up' {
  return position.startsWith('bottom') ? 'up' : 'down';
}

export function groupToastsByPosition(toasts: ToastItem[]): Record<ToastPosition, ToastItem[]> {
  const groups = Object.fromEntries(TOAST_POSITIONS.map((position) => [position, [] as ToastItem[]])) as unknown as Record<
    ToastPosition,
    ToastItem[]
  >;

  for (const item of toasts) {
    groups[item.position].push(item);
  }

  return groups;
}

export function createToastStore(): ToastStore {
  const { subscribe, update, set } = writable<ToastItem[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function clearTimer(id: string) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function schedule(item: ToastItem) {
    clearTimer(item.id);

    if (item.duration > 0) {
      timers.set(
        item.id,
        setTimeout(() => {
          dismiss(item.id);
        }, item.duration)
      );
    }
  }

  function dismiss(id: string) {
    clearTimer(id);
    update((items) => items.filter((item) => item.id !== id));
  }

  function showWithVariant(options: ToastOptions | string, variant?: ToastVariant): ToastHandle {
    const item = normalizeToast(options, variant);

    update((items) => [...items.filter((existing) => existing.id !== item.id), item]);
    schedule(item);

    return {
      id: item.id,
      dismiss: () => dismiss(item.id),
      update: (patch) => {
        update((items) =>
          items.map((existing) => {
            if (existing.id !== item.id) {
              return existing;
            }

            const next = { ...existing, ...patch };
            schedule(next);
            return next;
          })
        );
      }
    };
  }

  return {
    subscribe,
    show: (options) => showWithVariant(options),
    success: (options) => showWithVariant(options, 'success'),
    error: (options) => showWithVariant(options, 'error'),
    warning: (options) => showWithVariant(options, 'warning'),
    info: (options) => showWithVariant(options, 'info'),
    custom: (options) => showWithVariant(options, 'custom'),
    dismiss,
    clear: (position) => {
      update((items) => {
        const remaining = position ? items.filter((item) => item.position !== position) : [];
        const removed = position ? items.filter((item) => item.position === position) : items;
        for (const item of removed) {
          clearTimer(item.id);
        }
        return remaining;
      });

      if (!position) {
        timers.clear();
        set([]);
      }
    }
  };
}

export const toast = createToastStore();
