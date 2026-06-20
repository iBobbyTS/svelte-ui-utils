<svelte:options runes={false} />

<script lang="ts">
  import Dialog from './Dialog.svelte';
  import type { DialogSize } from './types.js';

  export let open = false;
  export let title = '';
  export let imageUrl = '';
  export let fileName = '';
  export let alt = '';
  export let closeLabel = 'Close dialog';
  export let downloadLabel = 'Download';
  export let size: DialogSize = 'lg';
  export let dismissible = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let dimBackdrop = true;
  export let blurBackdrop = false;
  export let backdropOpacity: number | string = 0.46;
  export let backdropBlur = '6px';
  export let downloadable = true;
  export let onClose: (() => void) | undefined = undefined;

  $: resolvedTitle = title || fileName;
  $: resolvedAlt = alt || fileName || title || 'Image preview';

  function handleDownload() {
    if (!imageUrl || typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
</script>

<Dialog
  {open}
  title={resolvedTitle}
  {closeLabel}
  {size}
  {dismissible}
  {closeOnBackdrop}
  {closeOnEscape}
  {dimBackdrop}
  {blurBackdrop}
  {backdropOpacity}
  {backdropBlur}
  onClose={onClose}
>
  <div class="suu-image-preview-dialog">
    {#if imageUrl}
      <img src={imageUrl} alt={resolvedAlt} />
    {/if}
  </div>

  <svelte:fragment slot="footer">
    {#if downloadable}
      <button
        type="button"
        class="suu-dialog__button suu-dialog__button--primary"
        disabled={!imageUrl}
        on:click={handleDownload}
      >
        {downloadLabel}
      </button>
    {/if}
  </svelte:fragment>
</Dialog>
