<svelte:options runes={false} />

<script lang="ts">
  import { tick } from 'svelte';
  import Dialog from './Dialog.svelte';
  import type { DialogInputType, DialogSize } from './types.js';

  export let open = false;
  export let title = 'Input required';
  export let message = '';
  export let inputValue = '';
  export let inputType: DialogInputType = 'text';
  export let inputLabel = '';
  export let placeholder = '';
  export let confirmLabel = 'Confirm';
  export let cancelLabel = 'Cancel';
  export let closeLabel = 'Close dialog';
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
  export let autofocus = true;
  export let onConfirm: ((value: string) => void | Promise<void>) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;

  let inputElement: HTMLInputElement | undefined;
  let inputId = `suu-input-dialog-input-${Math.random().toString(36).slice(2)}`;
  let wasOpen = false;

  $: if (open && !wasOpen) {
    wasOpen = true;
    void focusInput();
  } else if (!open && wasOpen) {
    wasOpen = false;
  }

  async function focusInput() {
    if (!autofocus) {
      return;
    }

    await tick();
    inputElement?.focus();
    inputElement?.select();
  }

  function handleClose() {
    onClose?.();
  }

  function handleCancel() {
    onCancel?.();
    onClose?.();
  }

  function handleConfirm() {
    if (confirmDisabled) {
      return;
    }

    void onConfirm?.(inputValue);
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
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
  description={message}
  onClose={handleClose}
>
  <div class="suu-input-dialog">
    {#if message}
      <p class="suu-input-dialog__message">{message}</p>
    {/if}
    <label class="suu-input-dialog__field" for={inputId}>
      {#if inputLabel}
        <span>{inputLabel}</span>
      {/if}
      <input
        bind:this={inputElement}
        id={inputId}
        type={inputType}
        bind:value={inputValue}
        {placeholder}
        on:keydown={handleInputKeydown}
      />
    </label>
  </div>

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
      class="suu-dialog__button suu-dialog__button--primary"
      disabled={confirmDisabled}
      on:click={handleConfirm}
    >
      {confirmLabel}
    </button>
  </svelte:fragment>
</Dialog>
