export const columnResizeKeyboardEvent = 'suu-column-resize-keyboard';

/** Mount a shared guide for tagged resize handles on an in-flow or custom sticky header. */
export function mountDataTableColumnResizeGuide(
  scrollContainer: HTMLElement,
  table: HTMLTableElement,
  header: HTMLElement
) {
  const guide = document.createElement('div');
  guide.className = 'suu-table-column-resize-guide';
  guide.hidden = true;
  guide.setAttribute('aria-hidden', 'true');
  scrollContainer.classList.add('suu-table-wrap--resize-guide');
  header.classList.add('suu-table-resize-guide-header');
  scrollContainer.append(guide);

  const listeners = new AbortController();
  const { signal } = listeners;
  let hovered: HTMLElement | null = null;
  let captured: HTMLElement | null = null;
  let pointerFocused: HTMLElement | null = null;
  let activeSubHandle: HTMLElement | null = null;
  let activePinnedCell: HTMLTableCellElement | null = null;
  let activeTrackIsLast = false;

  function handleAt(target: EventTarget | null) {
    const handle = target instanceof Element ? target.closest<HTMLElement>('[data-suu-resize-track]') : null;
    return handle && header.contains(handle) ? handle : null;
  }

  function syncGuideBlock() {
    const tableRect = table.getBoundingClientRect();
    // The visible sub-header edge can move relative to the table when sticky.
    const start = Math.max(tableRect.top, activeSubHandle?.getBoundingClientRect().top ?? tableRect.top);
    const scrollOrigin = scrollContainer.getBoundingClientRect().top + scrollContainer.clientTop - scrollContainer.scrollTop;
    guide.style.insetBlockStart = (start - scrollOrigin) + 'px';
    guide.style.blockSize = Math.max(0, tableRect.bottom - start) + 'px';
  }

  function syncGuideInline(edge: number, last: boolean) {
    const origin = scrollContainer.getBoundingClientRect().left + scrollContainer.clientLeft - scrollContainer.scrollLeft;
    guide.style.left = (edge - origin - (last ? 2 : 1)) + 'px';
  }

  function sync() {
    // A detached capture target can receive lostpointercapture outside the header.
    captured = handleAt(captured);
    hovered = handleAt(hovered);
    const focused = handleAt(document.activeElement);
    const keyboard = focused !== pointerFocused && focused?.matches(':focus-visible') ? focused : null;
    const columns = table.querySelectorAll(':scope > colgroup > col');
    function resolveTrack(handle: HTMLElement | null) {
      if (!handle) return;
      const index = Number(handle.dataset.suuResizeTrack);
      const column = columns[index];
      handle.toggleAttribute('data-suu-resize-track-missing', !column);
      if (column) return { handle, column, index };
    }
    const track = resolveTrack(captured) ?? resolveTrack(hovered) ?? resolveTrack(keyboard);
    guide.hidden = !track;
    if (!track) {
      activeSubHandle = null;
      activePinnedCell = null;
      return;
    }
    const { handle, index, column } = track;
    // 共用视口里以真实表头格为准：固定列会偏离 col，部分浏览器也不提供 col 的坐标。
    const nativeCell = scrollContainer.classList.contains('suu-table-wrap--shared-scroll') ? handle.closest('th') : null;
    activePinnedCell = nativeCell?.hasAttribute('data-suu-pinned') ||
      (index === 0 && table.classList.contains('suu-table--pin-first-column')) ? nativeCell : null;
    // Inset the last edge to avoid adding overflow.
    activeTrackIsLast = index === columns.length - 1;
    syncGuideInline((nativeCell ?? column).getBoundingClientRect().right, activeTrackIsLast);
    activeSubHandle = handle.hasAttribute('data-suu-resize-sub-column') ? handle : null;
    syncGuideBlock();
  }

  window.addEventListener('scroll', () => {
    if (activeSubHandle && !guide.hidden) syncGuideBlock();
    if (activePinnedCell && !guide.hidden) {
      syncGuideInline(activePinnedCell.getBoundingClientRect().right, activeTrackIsLast);
    }
  }, { capture: true, passive: true, signal });
  header.addEventListener('pointerover', (event) => {
    hovered = handleAt(event.target);
    sync();
  }, { signal });
  header.addEventListener('pointerout', (event) => {
    hovered = handleAt(event.relatedTarget);
    sync();
  }, { signal });
  header.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button === 0) pointerFocused = handleAt(event.target);
  }, { signal, capture: true });
  header.addEventListener('gotpointercapture', (event) => {
    captured = handleAt(event.target);
    sync();
  }, { signal });
  header.addEventListener('lostpointercapture', (event) => {
    captured = null;
    hovered = event.pointerType === 'mouse' ? handleAt(document.elementFromPoint(event.clientX, event.clientY)) : null;
    sync();
  }, { signal });
  header.addEventListener('focusin', sync, { signal });
  header.addEventListener('focusout', (event) => {
    if (event.target === pointerFocused) pointerFocused = null;
    queueMicrotask(() => { if (!signal.aborted) sync(); });
  }, { signal });
  header.addEventListener(columnResizeKeyboardEvent, () => {
    pointerFocused = null;
    sync();
  }, { signal });

  return {
    sync,
    get visible() { return !guide.hidden; },
    destroy() {
      listeners.abort();
      guide.remove();
      scrollContainer.classList.remove('suu-table-wrap--resize-guide');
      header.classList.remove('suu-table-resize-guide-header');
    }
  };
}
