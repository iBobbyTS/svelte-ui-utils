import type { ToastItem, ToastPosition, ToastStore } from './types.js';
export declare const TOAST_POSITIONS: ToastPosition[];
export declare function getToastStackDirection(position: ToastPosition): 'down' | 'up';
export declare function groupToastsByPosition(toasts: ToastItem[]): Record<ToastPosition, ToastItem[]>;
export declare function createToastStore(): ToastStore;
export declare const toast: ToastStore;
//# sourceMappingURL=store.d.ts.map