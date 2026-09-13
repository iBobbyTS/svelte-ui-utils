<svelte:options runes={false} />

<script context="module" lang="ts">
  // Mount order mirrors the native top layer: the last registered element is
  // the topmost dialog, and only it reacts to Escape, Tab, and backdrop clicks.
  const openDialogElements: HTMLDialogElement[] = [];

  const focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { DialogSize } from './types.js';

  export let open = false;
  export let title = '';
  export let description = '';
  export let closeLabel = 'Close dialog';
  export let size: DialogSize = 'md';
  export let padding: string | undefined = undefined;
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
  export let restoreFocusSelector: string | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  let dialogElement: HTMLDialogElement | undefined;
  let titleId = `suu-dialog-title-${Math.random().toString(36).slice(2)}`;
  let descriptionId = `suu-dialog-description-${Math.random().toString(36).slice(2)}`;
  let wasOpen = false;
  let previouslyFocusedElement: HTMLElement | null = null;
  let restoreFocusSelectorAtOpen: string | undefined;

  // The dialog element is the full-viewport top layer surface; the visual
  // backdrop and panel stay on their existing inner elements.
  const dialogResetStyle =
    'width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: none; background: transparent;';

  $: resolvedLabelledBy = labelledBy ?? (title ? titleId : undefined);
  $: resolvedDescribedBy =
    describedBy ?? (description ? descriptionId : undefined);
  $: backdropStyle =
    `--suu-dialog-backdrop-opacity: ${backdropOpacity}; --suu-dialog-backdrop-blur: ${backdropBlur};`;
  $: countdownStyle = `--suu-dialog-countdown-duration: ${Math.max(0, countdownDurationMs)}ms;`;
  $: if (open && !wasOpen) {
    wasOpen = true;
    if (typeof document !== 'undefined') {
      previouslyFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      restoreFocusSelectorAtOpen = restoreFocusSelector;
    }
    void focusDialog();
  } else if (!open && wasOpen) {
    wasOpen = false;
    void restoreFocus();
  }

  function presentDialog(element: HTMLDialogElement) {
    if (!openDialogElements.includes(element)) {
      openDialogElements.push(element);
    }
    if (typeof element.showModal === 'function') {
      if (!element.open) {
        element.showModal();
      }
    } else if (!element.hasAttribute('open')) {
      // jsdom does not implement showModal; the attribute keeps the element
      // rendered as an open dialog there.
      element.setAttribute('open', '');
    }

    return {
      destroy() {
        const index = openDialogElements.indexOf(element);
        if (index !== -1) {
          openDialogElements.splice(index, 1);
        }
      },
    };
  }

  async function focusDialog() {
    await tick();
    dialogElement?.focus();
  }

  async function restoreFocus() {
    const previousTarget = previouslyFocusedElement;
    const selectorAtOpen = restoreFocusSelectorAtOpen;
    previouslyFocusedElement = null;
    restoreFocusSelectorAtOpen = undefined;
    if (!previousTarget && !selectorAtOpen) {
      return;
    }

    await tick();
    const replacementTarget = selectorAtOpen
      ? document.querySelector(selectorAtOpen)
      : null;
    const target =
      replacementTarget instanceof HTMLElement
        ? replacementTarget
        : previousTarget?.isConnected
          ? previousTarget
          : null;
    target?.focus();
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

  function handleCancel(event: Event) {
    // Prevent the browser's own Escape close so the open prop stays the only
    // source of truth; only the topmost dialog receives this event natively.
    event.preventDefault();
    if (closeOnEscape) {
      requestClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !dialogElement) {
      return;
    }
    if (openDialogElements[openDialogElements.length - 1] !== dialogElement) {
      return;
    }

    event.preventDefault();
    const focusables = Array.from(
      dialogElement.querySelectorAll<HTMLElement>(focusableSelector),
    );
    if (focusables.length === 0) {
      dialogElement.focus();
      return;
    }

    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    const currentIndex = activeElement
      ? focusables.indexOf(activeElement)
      : -1;
    const nextIndex = event.shiftKey
      ? currentIndex <= 0
        ? focusables.length - 1
        : currentIndex - 1
      : currentIndex === -1 || currentIndex === focusables.length - 1
        ? 0
        : currentIndex + 1;
    focusables[nextIndex].focus();
  }
</script>

{#if open}
  <dialog
    bind:this={dialogElement}
    class="suu-dialog-root"
    style={dialogResetStyle}
    aria-labelledby={resolvedLabelledBy}
    aria-describedby={resolvedDescribedBy}
    tabindex="-1"
    use:presentDialog
    on:cancel={handleCancel}
    on:keydown={handleKeydown}
  >
    <div
      class="suu-dialog-backdrop"
      data-dimmed={dimBackdrop ? 'true' : 'false'}
      data-blurred={blurBackdrop ? 'true' : 'false'}
      style={backdropStyle}
      role="presentation"
      on:mousedown={handleBackdropMouseDown}
    >
      <div class={`suu-dialog suu-dialog--${size}`} style:--suu-dialog-padding={padding}>
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
  </dialog>
{/if}
