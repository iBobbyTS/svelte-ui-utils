/** Highlight a physical row and every merged cell that covers it. */
export function highlightTableRow(table: HTMLTableElement, enabled: boolean) {
  let stop: (() => void) | undefined;

  function update(active: boolean) {
    stop?.();
    stop = undefined;
    if (!active) return;
    const listeners = new AbortController();
    const { signal } = listeners;
    const hoverClass = 'suu-table__row-highlight';
    let highlighted = new Set<HTMLTableCellElement>();
    let pointer: { x: number; y: number } | undefined;

    function paint(row?: HTMLTableRowElement) {
      const cells = new Set(row?.cells);
      let previous = row?.parentElement?.classList.contains('suu-table__row-group')
        ? row.previousElementSibling as HTMLTableRowElement | null : null;
      for (let distance = 1; previous; distance++, previous = previous.previousElementSibling as HTMLTableRowElement | null) {
        for (const cell of previous.cells) if (cell.rowSpan > distance) cells.add(cell);
      }
      for (const cell of highlighted) if (!cells.has(cell)) cell.classList.remove(hoverClass);
      for (const cell of cells) if (!highlighted.has(cell)) cell.classList.add(hoverClass);
      highlighted = cells;
    }

    function hit(target: EventTarget | null, y: number) {
      const cell = target instanceof Element ? target.closest('td') : null;
      if (!cell || cell.closest('table') !== table || cell.classList.contains('suu-table__empty')) return paint();
      // The in-flow header is pointer transparent except for its controls.
      const header = table.tHead?.getBoundingClientRect();
      if (header && y >= header.top && y < header.bottom) return paint();
      let row = cell.parentElement as HTMLTableRowElement;
      for (let i = 1; i < cell.rowSpan && row.nextElementSibling && y >= row.getBoundingClientRect().bottom; i++) {
        row = row.nextElementSibling as HTMLTableRowElement;
      }
      paint(row);
    }

    function clear() {
      pointer = undefined;
      paint();
    }

    table.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      hit(event.target, event.clientY);
    }, { signal });
    table.addEventListener('pointerleave', clear, { signal });
    table.addEventListener('pointercancel', clear, { signal });
    document.addEventListener('scroll', () => {
      if (pointer) hit(document.elementFromPoint(pointer.x, pointer.y), pointer.y);
    }, { capture: true, passive: true, signal });
    stop = () => { listeners.abort(); clear(); };
  }

  update(enabled);
  return { update, destroy: () => stop?.() };
}
