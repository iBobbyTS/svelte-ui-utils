import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SortableTableEnhancedHarness from './fixtures/SortableTableEnhancedHarness.svelte';

function rows() {
  return [
    { id: 'a', label: 'Alpha', preset: 'green' as const },
    { id: 'b', label: 'Beta', preset: 'yellow' as const },
    { id: 'c', label: 'Gamma', preset: 'red' as const, currentDisabled: true }
  ];
}

describe('SortableTableEnhanced', () => {
  it('inherits the base sortable table border container', () => {
    const { container } = render(SortableTableEnhancedHarness, {
      props: { items: rows().slice(0, 1) }
    });

    expect(container.querySelector('.suu-sortable-table-enhanced')?.parentElement).toHaveClass('suu-sortable-table-wrap');
  });

  it('forwards caller-provided drag and remove labels to the base controls', () => {
    render(SortableTableEnhancedHarness, {
      props: {
        items: rows().slice(0, 1),
        onRemove: vi.fn(),
        getDragLabel: (item, index) => `Reorder ${item.label} ${index + 1}`,
        getRemoveLabel: (item, index) => `Delete ${item.label} ${index + 1}`
      }
    });

    const drag = screen.getByRole('button', { name: 'Reorder Alpha 1' });
    const remove = screen.getByRole('button', { name: 'Delete Alpha 1' });
    expect(drag).toHaveAttribute('title', 'Reorder Alpha 1');
    expect(remove).toHaveAttribute('title', 'Delete Alpha 1');
  });

  it('renders one exclusive current group beside the drag handles and keeps instances independent', () => {
    const first = render(SortableTableEnhancedHarness, {
      props: { items: rows(), currentId: 'a', onCurrentChange: vi.fn() }
    });
    const firstRadios = within(first.container).getAllByRole<HTMLInputElement>('radio');
    expect(firstRadios).toHaveLength(3);
    expect(firstRadios.map((radio) => radio.name)).toEqual([firstRadios[0]!.name, firstRadios[0]!.name, firstRadios[0]!.name]);
    expect(firstRadios[0]).toBeChecked();
    expect(firstRadios[1]).not.toBeChecked();
    expect(firstRadios[2]).toBeDisabled();

    const firstDragCell = first.container.querySelector('[data-sortable-id="a"] .suu-sortable-table__drag-cell')!;
    expect(firstDragCell.children[0]).toHaveClass('suu-sortable-table__drag-handle');
    expect(firstDragCell.children[1]).toBe(firstRadios[0]);

    const second = render(SortableTableEnhancedHarness, {
      props: { items: rows().slice(0, 1), currentId: null, onCurrentChange: vi.fn() }
    });
    const secondRadio = within(second.container).getByRole<HTMLInputElement>('radio');
    expect(secondRadio.name).not.toBe(firstRadios[0]!.name);
  });

  it('emits current, remove and reorder through the controlled component', async () => {
    const onCurrentChange = vi.fn();
    const onRemove = vi.fn();
    const onReorder = vi.fn();
    const { container } = render(SortableTableEnhancedHarness, {
      props: { items: rows(), currentId: 'a', onCurrentChange, onRemove, onReorder }
    });

    await fireEvent.click(screen.getByRole('radio', { name: 'Set Beta current' }));
    expect(onCurrentChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Remove b' }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));

    const source = screen.getByRole('button', { name: 'Drag a' });
    const target = container.querySelector<HTMLElement>('[data-sortable-id="b"]')!;
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 })
    });
    const dataTransfer = { effectAllowed: '', setData: vi.fn() };
    await fireEvent.dragStart(source, { dataTransfer });
    await fireEvent.dragOver(target, { clientY: 90, dataTransfer });
    await fireEvent.drop(target, { clientY: 90, dataTransfer });
    expect(onReorder).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'b' }), expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'c' })],
      { sourceId: 'a', targetId: 'b', position: 'after' }
    );
  });

  it('applies semantic color presets and disables all owned controls globally', () => {
    const { container } = render(SortableTableEnhancedHarness, {
      props: { items: rows(), currentId: 'a', disabled: true, onCurrentChange: vi.fn(), onRemove: vi.fn() }
    });
    expect(container.querySelector('[data-sortable-id="a"]')).toHaveClass('suu-sortable-table-enhanced__row--green');
    expect(container.querySelector('[data-sortable-id="b"]')).toHaveClass('suu-sortable-table-enhanced__row--yellow');
    expect(container.querySelector('[data-sortable-id="c"]')).toHaveClass('suu-sortable-table-enhanced__row--red');
    expect(screen.getAllByRole('radio').every((radio) => radio.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByRole('button').every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it('keeps current display controlled when no write callback is provided', () => {
    const { container } = render(SortableTableEnhancedHarness, {
      props: { items: rows().slice(0, 1), currentId: null }
    });
    expect(within(container).getByRole('radio')).not.toBeChecked();
    expect(within(container).getByRole('radio')).toBeDisabled();

  });
});
