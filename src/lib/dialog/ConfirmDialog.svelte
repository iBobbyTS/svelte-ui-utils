<svelte:options runes={false} />

<script lang="ts">
  import Dialog from './Dialog.svelte';
  import type { ConfirmDialogIntent, DialogSize } from './types.js';

  export let open = false;
  export let title = 'Confirm';
  export let message = '';
  export let confirmLabel = 'Confirm';
  export let cancelLabel = 'Cancel';
  export let closeLabel = 'Close dialog';
  export let intent: ConfirmDialogIntent = 'default';
  export let size: DialogSize = 'sm';
  export let confirmDisabled = false;
  export let cancelDisabled = false;
  export let dismissible = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let dimBackdrop = true;
  export let blurBackdrop = false;
  export let backdropOpacity: number | string = 0.46;
  export let backdropBlur = '6px';
  export let showCountdown = false;
  export let countdownDurationMs = 0;
  export let countdownLabel = 'Dialog countdown';
  export let onConfirm: (() => void | Promise<void>) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  function handleClose() {
    onClose?.();
  }

  function handleCancel() {
    onCancel?.();
    onClose?.();
  }

  function handleConfirm() {
    void onConfirm?.();
  }
</script>

<Dialog
  {open}
  {title}
  {closeLabel}
  {size}
  {dismissible}
  {closeOnBackdrop}
  {closeOnEscape}
  {dimBackdrop}
  {blurBackdrop}
  {backdropOpacity}
  {backdropBlur}
  {showCountdown}
  {countdownDurationMs}
  {countdownLabel}
  onClose={handleClose}
>
  <slot>
    {#if message}
      <p class="suu-confirm-dialog__message">{message}</p>
    {/if}
  </slot>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="suu-dialog__button"
      disabled={cancelDisabled}
      on:click={handleCancel}
    >
      {cancelLabel}
    </button>
    <button
      type="button"
      class={`suu-dialog__button suu-dialog__button--primary suu-dialog__button--${intent}`}
      disabled={confirmDisabled}
      on:click={handleConfirm}
    >
      {confirmLabel}
    </button>
  </svelte:fragment>
</Dialog>
