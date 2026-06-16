import { writable } from 'svelte/store';
export const TOAST_POSITIONS = [
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
const DEFAULT_POSITION = 'top-right';
let nextToastId = 1;
function toToastOptions(options, variant) {
    if (typeof options === 'string') {
        return { message: options, variant };
    }
    return { ...options, variant: variant ?? options.variant };
}
function normalizeToast(options, variant) {
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
export function getToastStackDirection(position) {
    return position.startsWith('bottom') ? 'up' : 'down';
}
export function groupToastsByPosition(toasts) {
    const groups = Object.fromEntries(TOAST_POSITIONS.map((position) => [position, []]));
    for (const item of toasts) {
        groups[item.position].push(item);
    }
    return groups;
}
export function createToastStore() {
    const { subscribe, update, set } = writable([]);
    const timers = new Map();
    function clearTimer(id) {
        const timer = timers.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.delete(id);
        }
    }
    function schedule(item) {
        clearTimer(item.id);
        if (item.duration > 0) {
            timers.set(item.id, setTimeout(() => {
                dismiss(item.id);
            }, item.duration));
        }
    }
    function dismiss(id) {
        clearTimer(id);
        update((items) => items.filter((item) => item.id !== id));
    }
    function showWithVariant(options, variant) {
        const item = normalizeToast(options, variant);
        update((items) => [...items.filter((existing) => existing.id !== item.id), item]);
        schedule(item);
        return {
            id: item.id,
            dismiss: () => dismiss(item.id),
            update: (patch) => {
                update((items) => items.map((existing) => {
                    if (existing.id !== item.id) {
                        return existing;
                    }
                    const next = { ...existing, ...patch };
                    schedule(next);
                    return next;
                }));
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
