export type DropdownValue = string | number;

export type DropdownMultiValue = DropdownValue[];

export type DropdownSelection = DropdownValue | DropdownMultiValue;

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

export type DropdownMultiChangeHandler = (value: DropdownMultiValue) => void | Promise<void>;

export type DropdownSelectionChangeHandler = {
	bivarianceHack(value: DropdownSelection): void | Promise<void>;
}['bivarianceHack'];

export type DropdownTriggerClickHandler = (event: MouseEvent) => void;
