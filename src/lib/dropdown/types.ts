export type DropdownValue = string | number;

export type DropdownPlacement = 'auto' | 'up' | 'down';

export type DropdownMenuAlign = 'left' | 'right';

export interface DropdownOption {
  label: string;
  value: DropdownValue;
  disabled?: boolean;
}

export interface DropdownOptionGroup {
  label?: string;
  options: DropdownOption[];
}

export type DropdownChangeHandler = (value: DropdownValue) => void | Promise<void>;

export type DropdownTriggerClickHandler = (event: MouseEvent) => void;
