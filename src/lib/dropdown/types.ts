export type DropdownValue = string | number;

export type DropdownPlacement = 'up' | 'down';

export interface DropdownOption {
  label: string;
  value: DropdownValue;
  disabled?: boolean;
}

export type DropdownChangeHandler = (value: DropdownValue) => void | Promise<void>;
