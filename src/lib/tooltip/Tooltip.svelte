<svelte:options runes={false} />

<script lang="ts">
  import { afterUpdate, onDestroy } from 'svelte';

  let rootElement: HTMLSpanElement | undefined;
  let panelElement: HTMLDivElement | undefined;
  let hovered = false;
  let focused = false;
  let visible = false;
  let panelId = `suu-tooltip-${Math.random().toString(36).slice(2)}`;
  let frame = 0;
  let triggerElement: HTMLElement | undefined;
  let panelObserver: ResizeObserver | undefined;

  $: visible = hovered || focused;

  function updatePosition() {
    if (!visible || !rootElement || !panelElement || typeof window === 'undefined') {
      return;
    }

    const trigger = rootElement.getBoundingClientRect();
    const panel = panelElement.getBoundingClientRect();
    const gap = 8;
    const canPlaceAbove = trigger.top >= panel.height + gap;
    const preferredTop = canPlaceAbove ? trigger.top - panel.height - gap : trigger.bottom + gap;
    const maxTop = Math.max(gap, window.innerHeight - panel.height - gap);
    const top = Math.min(maxTop, Math.max(gap, preferredTop));
    const maxLeft = Math.max(gap, window.innerWidth - panel.width - gap);
    const left = Math.min(
      Math.max(gap, trigger.left + (trigger.width - panel.width) / 2),
      maxLeft,
    );

    panelElement.style.setProperty('--suu-tooltip-top', `${top}px`);
    panelElement.style.setProperty('--suu-tooltip-left', `${left}px`);
  }

  function schedulePosition() {
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updatePosition);
  }

  function showFromHover() {
    hovered = true;
    triggerElement = findTrigger();
    schedulePosition();
  }

  function hideFromHover() {
    hovered = false;
  }

  function focusIn(event: FocusEvent) {
    focused = true;
    triggerElement = event.target instanceof HTMLElement ? event.target : findTrigger();
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

  function findTrigger() {
    return rootElement?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) ?? undefined;
  }

  function syncDescription() {
    if (!rootElement || !$$slots.content) return;
    const nextTrigger = triggerElement ?? findTrigger();
    if (triggerElement && triggerElement !== nextTrigger) {
      removePanelDescription(triggerElement);
    }
    triggerElement = nextTrigger;
    if (triggerElement) {
      if (visible) addPanelDescription(triggerElement);
      else removePanelDescription(triggerElement);
    }
  }

  function addPanelDescription(element: HTMLElement) {
    const ids = new Set((element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
    ids.add(panelId);
    element.setAttribute('aria-describedby', [...ids].join(' '));
  }

  function removePanelDescription(element: HTMLElement) {
    const ids = (element.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== panelId);
    if (ids.length > 0) element.setAttribute('aria-describedby', ids.join(' '));
    else element.removeAttribute('aria-describedby');
  }

  function syncPanelObserver() {
    panelObserver?.disconnect();
    panelObserver = undefined;
    if (visible && panelElement && typeof ResizeObserver !== 'undefined') {
      panelObserver = new ResizeObserver(() => schedulePosition());
      panelObserver.observe(panelElement);
    }
    syncDescription();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
  }

  afterUpdate(syncPanelObserver);

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      cancelAnimationFrame(frame);
    }
    panelObserver?.disconnect();
    if (triggerElement) removePanelDescription(triggerElement);
  });
</script>

<span
  bind:this={rootElement}
  class="suu-tooltip"
  role="group"
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
