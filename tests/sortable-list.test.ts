import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SortableListHarness from './fixtures/SortableListHarness.svelte';
import TableSortableListHarness from './fixtures/TableSortableListHarness.svelte';

type DragData = {
  effectAllowed: string;
  dropEffect: string;
  setData: ReturnType<typeof vi.fn>;
  getData: ReturnType<typeof vi.fn>;
};

function makeDragEvent(type: string, clientY: number, dataTransfer: DragData): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientY', { configurable: true, value: clientY });
  Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dataTransfer });
  return event;
}

function setBounds(element: Element, top = 0, height = 100): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ top, bottom: top + height, left: 0, right: 100, width: 100, height })
  });
}

describe('SortableList', () => {
  it('reorders before and after the target midpoint and reports the detail', async () => {
    const onReorder = vi.fn();
    render(SortableListHarness, {
      props: { items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], onReorder }
    });
    const rows = () => [...document.querySelectorAll<HTMLElement>('[data-sortable-id]')];
    const transfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: vi.fn() };
    const handleC = screen.getByRole('button', { name: 'C' });
    const itemA = () => document.querySelector<HTMLElement>('[data-sortable-id="a"]')!;
    setBounds(itemA());
    await fireEvent(handleC, makeDragEvent('dragstart', 0, transfer));
    await fireEvent(itemA(), makeDragEvent('dragover', 10, transfer));
    expect(itemA()).toHaveClass('suu-sortable-list__item--drop-before');
    await fireEvent(itemA(), makeDragEvent('drop', 10, transfer));
    expect(rows().map((row) => row.dataset.sortableId)).toEqual(['c', 'a', 'b']);
    expect(document.querySelector('.suu-sortable-list__item--dragging')).toBeNull();
    expect(document.querySelector('.suu-sortable-list__item--drop-before, .suu-sortable-list__item--drop-after')).toBeNull();
    expect(onReorder).toHaveBeenCalledWith(
      [{ id: 'c', label: 'C' }, { id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      { sourceId: 'c', targetId: 'a', position: 'before' }
    );

    const handleCNow = screen.getByRole('button', { name: 'C' });
    const itemB = () => document.querySelector<HTMLElement>('[data-sortable-id="b"]')!;
    setBounds(itemB());
    await fireEvent(handleCNow, makeDragEvent('dragstart', 0, transfer));
    await fireEvent(itemB(), makeDragEvent('dragover', 90, transfer));
    await fireEvent(itemB(), makeDragEvent('drop', 90, transfer));
    expect(rows().map((row) => row.dataset.sortableId)).toEqual(['a', 'b', 'c']);
    expect(onReorder).toHaveBeenLastCalledWith(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      { sourceId: 'c', targetId: 'b', position: 'after' }
    );
    await fireEvent(handleCNow, makeDragEvent('dragstart', 0, transfer));
    expect(document.querySelector('.suu-sortable-list__item--dragging')).toBeInTheDocument();
    await fireEvent(handleCNow, makeDragEvent('dragend', 0, transfer));
    expect(document.querySelector('.suu-sortable-list__item--dragging')).toBeNull();
    expect(document.querySelector('.suu-sortable-list__item--drop-before, .suu-sortable-list__item--drop-after')).toBeNull();
  });

  it('does not reorder when disabled or dropped on itself and clears drag state', async () => {
    const onReorder = vi.fn();
    const { container } = render(SortableListHarness, {
      props: { disabled: true, items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], onReorder }
    });
    const handle = screen.getByRole('button', { name: 'A' });
    const item = container.querySelector<HTMLElement>('[data-sortable-id="a"]')!;
    const transfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: vi.fn() };
    await fireEvent(handle, makeDragEvent('dragstart', 0, transfer));
    await fireEvent(item, makeDragEvent('drop', 90, transfer));
    expect(onReorder).not.toHaveBeenCalled();
    expect(item).not.toHaveClass('suu-sortable-list__item--dragging');
    expect(handle).toHaveAttribute('draggable', 'false');
  });

  it('renders direct table rows and keeps the handle contract in table markup', async () => {
    const onReorder = vi.fn();
    render(TableSortableListHarness, {
      props: { items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], onReorder }
    });
    const rowA = document.querySelector<HTMLElement>('tbody > tr[data-sortable-id="a"]');
    const rowB = document.querySelector<HTMLElement>('tbody > tr[data-sortable-id="b"]');
    expect(rowA).toBeInTheDocument();
    expect(rowB).toBeInTheDocument();
    setBounds(rowB!);
    const transfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: vi.fn() };
    await fireEvent(screen.getByRole('button', { name: 'A' }), makeDragEvent('dragstart', 0, transfer));
    await fireEvent(rowB!, makeDragEvent('dragover', 90, transfer));
    await fireEvent(rowB!, makeDragEvent('drop', 90, transfer));
    expect(onReorder).toHaveBeenCalledWith(
      [{ id: 'b', label: 'B' }, { id: 'a', label: 'A' }],
      { sourceId: 'a', targetId: 'b', position: 'after' }
    );
  });
});
