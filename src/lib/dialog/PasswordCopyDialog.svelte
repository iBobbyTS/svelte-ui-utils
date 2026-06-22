<svelte:options runes={false} />

<script lang="ts">
  import Dialog from './Dialog.svelte';
  import type { DialogSize } from './types.js';

  export let open = false;
  export let title = 'Copy password';
  export let message = '';
  export let value = '';
  export let valueLabel = 'Password';
  export let copyLabel = 'Copy';
  export let copiedLabel = 'Copied';
  export let doneLabel = 'Done';
  export let closeLabel = 'Close dialog';
  export let size: DialogSize = 'sm';
  export let dismissible = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let dimBackdrop = true;
  export let blurBackdrop = false;
  export let backdropOpacity: number | string = 0.46;
  export let backdropBlur = '6px';
  export let onClose: (() => void) | undefined = undefined;
  export let onCopy: (() => void | Promise<void>) | undefined = undefined;

  let copied = false;
  let previousValue = '';

  $: if (open && value !== previousValue) {
    previousValue = value;
    copied = false;
  }

  async function copyValue() {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value);
    copied = true;
    await onCopy?.();
  }

  function handleClose() {
    copied = false;
    onClose?.();
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
  onClose={handleClose}
>
  <div class="suu-password-copy-dialog">
    {#if message}
      <p class="suu-password-copy-dialog__message">{message}</p>
    {/if}

    <section class="suu-password-copy-dialog__value" aria-label={valueLabel}>
      {#if valueLabel}
        <div class="suu-password-copy-dialog__label">{valueLabel}</div>
      {/if}
      <code class="suu-password-copy-dialog__code">{value}</code>
    </section>
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="suu-dialog__button"
      on:click={handleClose}
    >
      {doneLabel}
    </button>
    <button
      type="button"
      class="suu-dialog__button suu-dialog__button--primary"
      disabled={!value}
      on:click={copyValue}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  </svelte:fragment>
</Dialog>
