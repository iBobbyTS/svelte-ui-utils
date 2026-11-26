import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import { DataTable, DataTableColumnResizeHandle, mountDataTableColumnResizeGuide } from '../src/lib/data-table/index.js';

it('guides grouped leaf tracks from the visible sub-header without affecting ordinary columns', async () => {
  const { container } = render(DataTable, {
    rows: [],
    columns: [
      { key: 'part', header: 'Part' },
      { key: 'details', header: 'Details', subColumns: [{ key: 'name' }, { key: 'note' }] }
    ],
    columnTrackWidths: [80, 60, 120],
    stickyHeader: false,
    pagination: false
  });
  const wrap = container.querySelector<HTMLElement>('.suu-table-wrap')!;
  const table = wrap.querySelector('table')!;
  const header = document.createElement('div');
  container.append(header);
  const props = { width: 80, minWidth: 40, maxWidth: 300, onPreview: vi.fn(), onCommit: vi.fn(), onCancel: vi.fn() };
  render(DataTableColumnResizeHandle, { target: header, props: { ...props, label: 'Resize part', guideTrack: { index: 0 } } });
  render(DataTableColumnResizeHandle, { target: header, props: { ...props, label: 'Resize note', guideTrack: { index: 2, subColumn: true } } });
  render(DataTableColumnResizeHandle, { target: header, props: { ...props, label: 'Resize standalone' } });
  render(DataTableColumnResizeHandle, { target: header, props: { ...props, label: 'Resize missing', guideTrack: { index: 4 } } });

  wrap.scrollLeft = 25;
  vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue(new DOMRect(30, 100, 100, 150));
  const tableRect = vi.spyOn(table, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 100, 260, 300));
  const columns = table.querySelectorAll('col');
  vi.spyOn(columns[0], 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 100, 80, 300));
  vi.spyOn(columns[2], 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 120, 300));
  const note = screen.getByRole('separator', { name: 'Resize note' });
  const noteRect = vi.spyOn(note, 'getBoundingClientRect').mockReturnValue(new DOMRect(215, 142, 10, 30));

  const guideController = mountDataTableColumnResizeGuide(wrap, table, header);
  const guide = wrap.querySelector<HTMLElement>('.suu-table-column-resize-guide')!;
  try {
    expect(guide).toHaveAttribute('hidden');
    await fireEvent.pointerOver(screen.getByRole('separator', { name: 'Resize standalone' }));
    expect(guide).toHaveAttribute('hidden');

    await fireEvent.pointerOver(note);
    expect(guide).not.toHaveAttribute('hidden');
    expect(guide.style.left).toBe('213px');
    expect(guide.style.insetBlockStart).toBe('42px');
    expect(guide.style.blockSize).toBe('258px');
    wrap.scrollTop = 50;
    tableRect.mockReturnValue(new DOMRect(20, 50, 260, 300));
    noteRect.mockReturnValue(new DOMRect(215, 160, 10, 30));
    wrap.dispatchEvent(new Event('scroll'));
    expect(guide.style.insetBlockStart).toBe('110px');
    expect(guide.style.blockSize).toBe('190px');

    // A detached handle may not deliver lostpointercapture to the header.
    note.dispatchEvent(new Event('gotpointercapture', { bubbles: true }));
    note.remove();
    const part = screen.getByRole('separator', { name: 'Resize part' });
    await fireEvent.pointerOver(part);
    expect(guide.style.left).toBe('94px');
    expect(guide.style.insetBlockStart).toBe('0px');
    expect(guide.style.blockSize).toBe('300px');
    await fireEvent.pointerOut(part);
    expect(guide).toHaveAttribute('hidden');

    const missing = screen.getByRole('separator', { name: 'Resize missing' });
    await fireEvent.pointerOver(missing);
    expect(guide).toHaveAttribute('hidden');
    expect(missing).toHaveAttribute('data-suu-resize-track-missing');
    part.focus();
    expect(guide).not.toHaveAttribute('hidden');
    expect(guide.style.left).toBe('94px');
  } finally {
    guideController.destroy();
  }
  expect(wrap).not.toContainElement(guide);
  expect(wrap).not.toHaveClass('suu-table-wrap--resize-guide');
  expect(header).not.toHaveClass('suu-table-resize-guide-header');
});
