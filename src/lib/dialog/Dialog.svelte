<svelte:options runes={false} />

<script lang="ts">
  import { tick } from 'svelte';
  import type { DialogSize } from './types.js';

  export let open = false;
  export let title = '';
  export let description = '';
  export let closeLabel = 'Close dialog';
  export let size: DialogSize = 'md';
  export let dismissible = true;
  export let showCloseButton = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let dimBackdrop = true;
  export let blurBackdrop = false;
  export let backdropOpacity: number | string = 0.46;
  export let backdropBlur = '6px';
  export let showCountdown = false;
  export let countdownDurationMs = 0;
  export let countdownLabel = 'Dialog countdown';
  export let labelledBy: string | undefined = undefined;
  export let describedBy: string | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  let dialogElement: HTMLElement | undefined;
  let titleId = `suu-dialog-title-${Math.random().toString(36).slice(2)}`;
  let descriptionId = `suu-dialog-description-${Math.random().toString(36).slice(2)}`;
  let wasOpen = false;
  let previouslyFocusedElement: HTMLElement | null = null;

  $: resolvedLabelledBy = labelledBy ?? (title ? titleId : undefined);
  $: resolvedDescribedBy =
    describedBy ?? (description ? descriptionId : undefined);
  $: backdropStyle =
    `--suu-dialog-backdrop-opacity: ${backdropOpacity}; --suu-dialog-backdrop-blur: ${backdropBlur};`;
  $: countdownStyle = `--suu-dialog-countdown-duration: ${Math.max(0, countdownDurationMs)}ms;`;
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
    if (open && event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      requestClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="suu-dialog-backdrop"
    data-dimmed={dimBackdrop ? 'true' : 'false'}
    data-blurred={blurBackdrop ? 'true' : 'false'}
    style={backdropStyle}
    role="presentation"
    on:mousedown={handleBackdropMouseDown}
  >
    <div
      bind:this={dialogElement}
      class={`suu-dialog suu-dialog--${size}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={resolvedLabelledBy}
      aria-describedby={resolvedDescribedBy}
      tabindex="-1"
    >
      {#if showCountdown && countdownDurationMs > 0}
        <div
          class="suu-dialog__countdown"
          style={countdownStyle}
          role="timer"
          aria-label={countdownLabel}
        ></div>
      {/if}
      <header class="suu-dialog__header">
        <div class="suu-dialog__heading">
          {#if title}
            <h2 class="suu-dialog__title" id={titleId}>{title}</h2>
          {/if}
          {#if description}
            <p class="suu-dialog__description" id={descriptionId}>
              {description}
            </p>
          {/if}
        </div>
        {#if showCloseButton && dismissible}
          <button
            type="button"
            class="suu-dialog__close"
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

      <div class="suu-dialog__body">
        <slot />
      </div>

      {#if $$slots.footer}
        <footer class="suu-dialog__footer">
          <slot name="footer" />
        </footer>
      {/if}
    </div>
  </div>
{/if}
