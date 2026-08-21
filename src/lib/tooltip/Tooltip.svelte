<svelte:options runes={false} />

<script lang="ts">
  import { onDestroy } from 'svelte';

  let rootElement: HTMLSpanElement | undefined;
  let panelElement: HTMLDivElement | undefined;
  let hovered = false;
  let focused = false;
  let visible = false;
  let panelId = `suu-tooltip-${Math.random().toString(36).slice(2)}`;
  let frame = 0;

  $: visible = hovered || focused;

  function updatePosition() {
    if (!visible || !rootElement || !panelElement || typeof window === 'undefined') {
      return;
    }

    const trigger = rootElement.getBoundingClientRect();
    const panel = panelElement.getBoundingClientRect();
    const gap = 8;
    const canPlaceAbove = trigger.top >= panel.height + gap;
    const top = canPlaceAbove ? trigger.top - panel.height - gap : trigger.bottom + gap;
    const left = Math.min(
      Math.max(gap, trigger.left + (trigger.width - panel.width) / 2),
      window.innerWidth - panel.width - gap,
    );

    panelElement.style.setProperty('--suu-tooltip-top', `${Math.max(gap, top)}px`);
    panelElement.style.setProperty('--suu-tooltip-left', `${Math.max(gap, left)}px`);
  }

  function schedulePosition() {
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updatePosition);
  }

  function showFromHover() {
    hovered = true;
    schedulePosition();
  }

  function hideFromHover() {
    hovered = false;
  }

  function focusIn() {
    focused = true;
    schedulePosition();
  }

  function focusOut(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && rootElement?.contains(next)) return;
    focused = false;
  }

  function handleViewportChange() {
    schedulePosition();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      cancelAnimationFrame(frame);
    }
  });
</script>

<span
  bind:this={rootElement}
  class="suu-tooltip"
  role="group"
  aria-describedby={visible && $$slots.content ? panelId : undefined}
  on:mouseenter={showFromHover}
  on:mouseleave={hideFromHover}
  on:focusin={focusIn}
  on:focusout={focusOut}
>
  <slot />

  {#if visible && $$slots.content}
    <div bind:this={panelElement} class="suu-tooltip__panel" id={panelId} role="tooltip">
      <slot name="content" />
    </div>
  {/if}
</span>
