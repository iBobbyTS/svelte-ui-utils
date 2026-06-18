<svelte:options runes={false} />

<script lang="ts">
  import { tick } from 'svelte';
  import type { ModalSize } from './types.js';

  export let open = false;
  export let title = '';
  export let description = '';
  export let closeLabel = 'Close dialog';
  export let size: ModalSize = 'md';
  export let dismissible = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let labelledBy: string | undefined = undefined;
  export let describedBy: string | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  let dialogElement: HTMLElement | undefined;
  let titleId = `suu-modal-title-${Math.random().toString(36).slice(2)}`;
  let descriptionId = `suu-modal-description-${Math.random().toString(36).slice(2)}`;
  let wasOpen = false;
  let previouslyFocusedElement: HTMLElement | null = null;

  $: resolvedLabelledBy = labelledBy ?? (title ? titleId : undefined);
  $: resolvedDescribedBy =
    describedBy ?? (description ? descriptionId : undefined);
  $: if (open && !wasOpen) {
    wasOpen = true;
    void focusDialog();
  } else if (!open && wasOpen) {
    wasOpen = false;
    restoreFocus();
  }

  async function focusDialog() {
    if (typeof document !== 'undefined') {
      previouslyFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }

    await tick();
    dialogElement?.focus();
  }

  function restoreFocus() {
    previouslyFocusedElement?.focus();
    previouslyFocusedElement = null;
  }

  function requestClose() {
    if (!dismissible) {
      return;
    }

    onClose?.();
  }

  function handleBackdropMouseDown(event: MouseEvent) {
    if (!closeOnBackdrop || event.target !== event.currentTarget) {
      return;
    }

    requestClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      requestClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="suu-modal-backdrop"
    role="presentation"
    on:mousedown={handleBackdropMouseDown}
  >
    <div
      bind:this={dialogElement}
      class={`suu-modal suu-modal--${size}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={resolvedLabelledBy}
      aria-describedby={resolvedDescribedBy}
      tabindex="-1"
    >
      <header class="suu-modal__header">
        <div class="suu-modal__heading">
          {#if title}
            <h2 class="suu-modal__title" id={titleId}>{title}</h2>
          {/if}
          {#if description}
            <p class="suu-modal__description" id={descriptionId}>
              {description}
            </p>
          {/if}
        </div>
        {#if dismissible}
          <button
            type="button"
            class="suu-modal__close"
            aria-label={closeLabel}
            title={closeLabel}
            on:click={requestClose}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m6 6 8 8M14 6l-8 8"></path>
            </svg>
          </button>
        {/if}
      </header>

      <div class="suu-modal__body">
        <slot />
      </div>

      {#if $$slots.footer}
        <footer class="suu-modal__footer">
          <slot name="footer" />
        </footer>
      {/if}
    </div>
  </div>
{/if}
