import type { SortableListDropPosition, SortableListItem } from '../sortable-list/types.js';

export type SortableTableItem = SortableListItem;
export type SortableTableReorderDetail = { sourceId: string; targetId: string; position: SortableListDropPosition };
export type SortableTableHandle = { draggable: boolean; ondragstart: (event: DragEvent) => void; ondragend: () => void };
