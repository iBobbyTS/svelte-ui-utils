import type { SortableListDropPosition, SortableListItem } from '../sortable-list/types.js';

export type SortableTableItem = SortableListItem;
export type SortableTableReorderDetail = { sourceId: string; targetId: string; position: SortableListDropPosition };
export type SortableTableHandle = { draggable: boolean; ondragstart: (event: DragEvent) => void; ondragend: () => void };
export type SortableTableRowClassGetter<Item extends SortableTableItem> = (
  item: Item,
  index: number
) => string | undefined | null;
export type SortableTableRowColorPreset = 'red' | 'yellow' | 'green';
export type SortableTableRowColorPresetGetter<Item extends SortableTableItem> = (
  item: Item,
  index: number
) => SortableTableRowColorPreset | undefined | null;
