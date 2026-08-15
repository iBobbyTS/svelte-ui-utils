import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SortableTableHarness from './fixtures/SortableTableHarness.svelte';

type DragData = {
  effectAllowed: string;
  setData: ReturnType<typeof vi.fn>;
  setDragImage: ReturnType<typeof vi.fn>;
};

function dragEvent(type: string, clientY: number, dataTransfer: DragData): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientY', { configurable: true, value: clientY });
  Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dataTransfer });
  return event;
}

describe('SortableTable', () => {
  it('keeps default drag and remove labels on aria-label and title', () => {
    render(SortableTableHarness, {
      props: { items: [{ id: 'a', label: 'Alpha' }], onRemove: vi.fn() }
    });

    const drag = screen.getByRole('button', { name: 'Drag a' });
    const remove = screen.getByRole('button', { name: 'Remove a' });
    expect(drag).toHaveAttribute('title', 'Drag a');
    expect(remove).toHaveAttribute('title', 'Remove a');
  });

  it('uses caller-provided drag and remove labels with item and index', () => {
    render(SortableTableHarness, {
      props: {
        items: [{ id: 'internal-a', label: 'Alpha' }],
        onRemove: vi.fn(),
        getDragLabel: (item, index) => `Reorder ${item.label} row ${index + 1}`,
        getRemoveLabel: (item, index) => `Delete ${item.label} row ${index + 1}`
      }
    });

    const drag = screen.getByRole('button', { name: 'Reorder Alpha row 1' });
    const remove = screen.getByRole('button', { name: 'Delete Alpha row 1' });
    expect(drag).toHaveAttribute('title', 'Reorder Alpha row 1');
    expect(remove).toHaveAttribute('title', 'Delete Alpha row 1');
  });

  it('keeps browser drag feedback native and table-row state stable', async () => {
    const onReorder = vi.fn();
    render(SortableTableHarness, {
      props: { items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], onReorder }
    });
    const transfer = { effectAllowed: '', setData: vi.fn(), setDragImage: vi.fn() };
    const source = document.querySelector<HTMLElement>('[data-sortable-id="a"]')!;
    const target = document.querySelector<HTMLElement>('[data-sortable-id="b"]')!;
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 })
    });

    await fireEvent(screen.getByRole('button', { name: 'Drag a' }), dragEvent('dragstart', 0, transfer));
    expect(transfer.setDragImage).not.toHaveBeenCalled();
    expect(source).toHaveClass('suu-sortable-table__row--dragging');

    await fireEvent(target, dragEvent('dragover', 10, transfer));
    expect(target).toHaveClass('suu-sortable-table__row--drop-before');
    await fireEvent(target, dragEvent('drop', 10, transfer));

    expect(onReorder).toHaveBeenCalledWith(
      [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      { sourceId: 'a', targetId: 'b', position: 'before' }
    );
    expect(document.querySelector('.suu-sortable-table__row--dragging')).toBeNull();
    expect(document.querySelector('.suu-sortable-table__row--drop-before')).toBeNull();
  });
});
