<svelte:options runes={false} />

<script lang="ts">
  import Modal from './Modal.svelte';
  import type { ConfirmDialogIntent, ModalSize } from './types.js';

  export let open = false;
  export let title = 'Confirm';
  export let message = '';
  export let confirmLabel = 'Confirm';
  export let cancelLabel = 'Cancel';
  export let closeLabel = 'Close dialog';
  export let intent: ConfirmDialogIntent = 'default';
  export let size: ModalSize = 'sm';
  export let confirmDisabled = false;
  export let cancelDisabled = false;
  export let dismissible = true;
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

<Modal
  {open}
  {title}
  {closeLabel}
  {size}
  {dismissible}
  description={message}
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
      class="suu-modal__button"
      disabled={cancelDisabled}
      on:click={handleCancel}
    >
      {cancelLabel}
    </button>
    <button
      type="button"
      class={`suu-modal__button suu-modal__button--primary suu-modal__button--${intent}`}
      disabled={confirmDisabled}
      on:click={handleConfirm}
    >
      {confirmLabel}
    </button>
  </svelte:fragment>
</Modal>
