import { mountDataTableColumnResizeGuide } from './column-resize-guide.js';

type HeaderOptions = {
  pinned: boolean;
  anchor?: HTMLElement | null;
  offset?: string;
  resize: boolean;
};

function blockScrollport(wrap: HTMLElement): HTMLElement | undefined {
  for (let node = wrap.parentElement; node && node !== document.documentElement; node = node.parentElement) {
    if (node === document.scrollingElement) break;
    if (/^(auto|scroll|hidden|overlay)$/.test(getComputedStyle(node).overflowY)) return node;
  }
}

export function manageTableHeader(head: HTMLTableSectionElement, initial: HeaderOptions) {
  const table = head.parentElement as HTMLTableElement;
  const wrap = table.parentElement!;
  let dispose: (() => void) | undefined;
  let options: HeaderOptions | undefined;

  function update(next: HeaderOptions) {
    if (options && next.pinned === options.pinned && next.anchor === options.anchor &&
      next.offset === options.offset && next.resize === options.resize) return;
    options = next;
    dispose?.();
    dispose = undefined;
    if (!next.pinned && !next.resize) return;

    const { pinned, anchor } = next;
    const guide = next.resize ? mountDataTableColumnResizeGuide(wrap, table, head) : undefined;
    const controller = new AbortController();
    const { signal } = controller;
    const timeline = pinned && typeof globalThis.CSS?.supports === 'function' &&
      CSS.supports('view-timeline: --suu-table-block block') &&
      CSS.supports('animation-range: exit-crossing 0% exit-crossing calc(100% - 1px)');
    const offsetProbe = wrap.querySelector<HTMLElement>(':scope > .suu-table__sticky-offset-probe')!;
    let scrollport: HTMLElement | undefined;
    let travel = 0;
    let inset = 0;
    let frame = 0;

    const scrollportTop = () => (scrollport?.getBoundingClientRect().top ?? 0) + (scrollport?.clientTop ?? 0);

    const syncFallback = () => {
      const start = anchor?.getBoundingClientRect().bottom ?? scrollportTop() + inset;
      const offset = start - table.getBoundingClientRect().top;
      head.style.setProperty('--suu-table-header-y', Math.min(travel, Math.max(0, offset)) + 'px');
    };

    const syncLayout = () => {
      if (pinned) {
        scrollport = blockScrollport(wrap);
        const wrapRect = wrap.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        travel = Math.max(0, tableRect.height - head.getBoundingClientRect().height);
        if (anchor) {
          const anchorStyle = getComputedStyle(anchor);
          const anchorRect = anchor.getBoundingClientRect();
          inset = anchorStyle.position === 'fixed'
            ? anchorRect.bottom - scrollportTop()
            : (parseFloat(anchorStyle.top) || 0) + anchorRect.height;
        } else inset = parseFloat(getComputedStyle(offsetProbe).top) || 0;
        if (timeline) {
          wrap.style.setProperty('--suu-table-header-inset', (inset - (tableRect.top - wrapRect.top)) + 'px');
          wrap.style.setProperty('--suu-table-header-end', (wrapRect.height - travel) + 'px');
          head.style.setProperty('--suu-table-header-travel', travel + 'px');
        } else syncFallback();
      }
      guide?.sync();
    };

    if (pinned) {
      document.addEventListener('scroll', (event) => {
        if (event.target !== (scrollport ?? document)) return;
        if (!timeline) {
          syncFallback();
          guide?.sync();
        } else if (guide?.visible && !frame) {
          // Sample the translated sub-header after the browser updates the vertical timeline.
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => { frame = 0; guide.sync(); });
          });
        }
      }, { capture: true, passive: true, signal });
    }
    window.addEventListener('resize', syncLayout, { signal });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(syncLayout);
    for (const target of [wrap, table, head, anchor]) if (target) observer?.observe(target);
    syncLayout();

    dispose = () => {
      controller.abort();
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      guide?.destroy();
      head.style.removeProperty('--suu-table-header-y');
      head.style.removeProperty('--suu-table-header-travel');
      wrap.style.removeProperty('--suu-table-header-inset');
      wrap.style.removeProperty('--suu-table-header-end');
    };
  }

  update(initial);
  return { update, destroy: () => dispose?.() };
}
