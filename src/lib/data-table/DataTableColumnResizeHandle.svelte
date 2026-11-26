<script lang="ts">
  import { columnResizeKeyboardEvent } from './column-resize-guide.js';

  let { label, width, minWidth, maxWidth, disabled = false, guideTrack, onPreview, onCommit, onCancel } = $props<{
    label: string;
    width: number;
    minWidth: number;
    maxWidth: number;
    disabled?: boolean;
    /** Leaf-track index and optional sub-header start for a mounted full-column guide. */
    guideTrack?: { index: number; subColumn?: boolean };
    onPreview: (width: number) => void;
    onCommit: (width: number) => void;
    onCancel: () => void;
  }>();

  let drag = $state<{ id: number; x: number; width: number } | null>(null);
  const clamp = (value: number) => Math.max(minWidth, Math.min(maxWidth, Math.round(value)));

  function start(event: PointerEvent) {
    if (disabled || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    element.focus({ preventScroll: true });
    element.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, width };
  }

  function move(event: PointerEvent) {
    if (drag?.id === event.pointerId) onPreview(clamp(drag.width + event.clientX - drag.x));
  }

  function end(event: PointerEvent) {
    if (drag?.id !== event.pointerId) return;
    const next = clamp(drag.width + event.clientX - drag.x);
    const changed = next !== drag.width;
    drag = null;
    if (changed) onCommit(next);
    else onCancel();
  }

  function cancel(id: number) {
    if (drag?.id !== id) return;
    drag = null;
    onCancel();
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && drag) {
      event.preventDefault();
      const { id } = drag;
      cancel(id);
      const element = event.currentTarget as HTMLElement;
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
      return;
    }
    if (disabled || drag) return;
    const step = event.shiftKey ? 24 : 8;
    const next = event.key === 'ArrowLeft' ? clamp(width - step)
      : event.key === 'ArrowRight' ? clamp(width + step)
      : event.key === 'Home' ? minWidth : event.key === 'End' ? maxWidth : null;
    if (next == null) return;
    event.preventDefault();
    if (guideTrack) {
      event.currentTarget?.dispatchEvent(new Event(columnResizeKeyboardEvent, { bubbles: true }));
    }
    if (next !== width) onCommit(next);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (A focusable separator with aria-valuenow is an adjustable splitter.) -->
<div
  class="handle"
  class:dragging={drag !== null}
  role="separator"
  tabindex="0"
  aria-label={label}
  aria-orientation="vertical"
  aria-valuemin={minWidth}
  aria-valuemax={maxWidth}
  aria-valuenow={width}
  aria-disabled={disabled || undefined}
  data-suu-resize-track={guideTrack?.index}
  data-suu-resize-sub-column={guideTrack?.subColumn ? '' : undefined}
  onpointerdown={start}
  onpointermove={move}
  onpointerup={end}
  onpointercancel={(event) => cancel(event.pointerId)}
  onlostpointercapture={(event) => cancel(event.pointerId)}
  onkeydown={keydown}
></div>

<style>
  .handle { position: absolute; inset: 0; cursor: col-resize; touch-action: none; user-select: none; }
  .handle::after { content: ''; position: absolute; inset: 0 50%; width: 2px; background: transparent; }
  .handle:is(:hover, :focus-visible, .dragging)::after { background: var(--suu-color-accent, currentColor); }
  :global(.suu-table-resize-guide-header) .handle[data-suu-resize-track]:not([data-suu-resize-track-missing]) { outline: none; }
  :global(.suu-table-resize-guide-header) .handle[data-suu-resize-track]:not([data-suu-resize-track-missing])::after { display: none; }
  .handle[aria-disabled='true'] { cursor: default; }
</style>
