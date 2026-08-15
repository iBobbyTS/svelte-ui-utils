import type { Snippet } from 'svelte';

export type SortableListItem = { id: string };
export type SortableListDropPosition = 'before' | 'after';

export type SortableListHandleProps = {
  draggable: boolean;
  ondragstart: (event: DragEvent) => void;
  ondragend: () => void;
};

export type SortableListReorderDetail = {
  sourceId: string;
  targetId: string;
  position: SortableListDropPosition;
};

export type SortableListReorderHandler<Item extends SortableListItem> = (
  items: Item[],
  detail: SortableListReorderDetail
) => void | Promise<void>;

export type SortableListItemClassGetter<Item extends SortableListItem> = (
  item: Item,
  index: number
) => string | undefined | null;

export type SortableListChildren<Item extends SortableListItem> = Snippet<[
  Item,
  number,
  SortableListHandleProps
]>;
