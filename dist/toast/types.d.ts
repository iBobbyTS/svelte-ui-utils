import type { Readable } from 'svelte/store';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'right-center' | 'bottom-right' | 'bottom-center' | 'bottom-left' | 'left-center';
export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'custom';
export interface ToastOptions {
    id?: string;
    title?: string;
    message?: string;
    variant?: ToastVariant;
    position?: ToastPosition;
    duration?: number;
    showCountdown?: boolean;
    dismissible?: boolean;
    ariaLive?: 'polite' | 'assertive';
    class?: string;
}
export interface ToastItem extends Required<Omit<ToastOptions, 'class'>> {
    id: string;
    createdAt: number;
    class?: string;
}
export interface ToastHandle {
    id: string;
    dismiss: () => void;
    update: (patch: Partial<ToastOptions>) => void;
}
export interface ToastStore extends Readable<ToastItem[]> {
    show: (options: ToastOptions | string) => ToastHandle;
    success: (options: ToastOptions | string) => ToastHandle;
    error: (options: ToastOptions | string) => ToastHandle;
    warning: (options: ToastOptions | string) => ToastHandle;
    info: (options: ToastOptions | string) => ToastHandle;
    custom: (options: ToastOptions | string) => ToastHandle;
    dismiss: (id: string) => void;
    clear: (position?: ToastPosition) => void;
}
//# sourceMappingURL=types.d.ts.map