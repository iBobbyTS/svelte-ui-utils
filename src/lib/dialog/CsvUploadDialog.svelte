<svelte:options runes={false} />

<script lang="ts">
  import Dialog from './Dialog.svelte';
  import type { DialogSize } from './types.js';

  export let open = false;
  export let title = 'Upload CSV';
  export let description = '';
  export let closeLabel = 'Close dialog';
  export let size: DialogSize = 'lg';
  export let dismissible = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let dimBackdrop = true;
  export let blurBackdrop = false;
  export let backdropOpacity: number | string = 0.46;
  export let backdropBlur = '6px';
  export let templateUrl: string | undefined = undefined;
  export let templateDownloadName: string | undefined = undefined;
  export let downloadTemplateLabel = 'Download template';
  export let fileLabel = 'Select CSV file';
  export let uploadLabel = 'Upload';
  export let cancelLabel = 'Cancel';
  export let doneLabel = 'Done';
  export let uploadAnotherLabel = 'Upload another';
  export let instructionsTitle = 'Instructions';
  export let instructions: string[] = [];
  export let accept = '.csv,text/csv';
  export let missingFileMessage = 'Please select a CSV file.';
  export let uploadFailedMessage = 'Upload failed. Please try again.';
  export let successMessage = 'Upload completed.';
  export let externalError = '';
  export let disabled = false;
  export let onUpload: ((file: File) => void | Promise<void>) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;
  export let onClose: (() => void) | undefined = undefined;
  export let onFileChange: ((file: File | null) => void) | undefined = undefined;

  let selectedFile: File | null = null;
  let fileInput: HTMLInputElement | undefined;
  let localError = '';
  let localUploading = false;
  let uploadComplete = false;

  $: isBusy = disabled || localUploading;
  $: effectiveError = externalError || localError;

  function resetFileState() {
    selectedFile = null;
    localError = '';
    uploadComplete = false;
    if (fileInput) {
      fileInput.value = '';
    }
    onFileChange?.(null);
  }

  function handleClose() {
    resetFileState();
    onClose?.();
  }

  function handleCancel() {
    resetFileState();
    onCancel?.();
    onClose?.();
  }

  function handleFileChange(event: Event) {
    const target = event.currentTarget;
    selectedFile = target instanceof HTMLInputElement
      ? target.files?.[0] ?? null
      : null;
    localError = '';
    uploadComplete = false;
    onFileChange?.(selectedFile);
  }

  async function handleUpload() {
    if (!selectedFile) {
      localError = missingFileMessage;
      return;
    }

    localError = '';
    localUploading = true;

    try {
      await onUpload?.(selectedFile);
      uploadComplete = true;
    } catch (error) {
      localError = error instanceof Error ? error.message : uploadFailedMessage;
    } finally {
      localUploading = false;
    }
  }
</script>

<Dialog
  {open}
  {title}
  {description}
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
  <div class="suu-csv-upload-dialog">
    {#if templateUrl}
      <div class="suu-csv-upload-dialog__center">
        <a
          class="suu-dialog__button"
          href={templateUrl}
          download={templateDownloadName}
        >
          {downloadTemplateLabel}
        </a>
      </div>
    {/if}

    <label class="suu-csv-upload-dialog__field">
      <span>{fileLabel}</span>
      <input
        bind:this={fileInput}
        type="file"
        {accept}
        disabled={isBusy}
        on:change={handleFileChange}
      />
    </label>

    {#if selectedFile}
      <p class="suu-csv-upload-dialog__selected">{selectedFile.name}</p>
    {/if}

    {#if $$slots.preview}
      <slot name="preview" file={selectedFile} uploading={localUploading} complete={uploadComplete} />
    {/if}

    {#if effectiveError}
      <div class="suu-dialog__alert suu-dialog__alert--error" role="alert">
        {effectiveError}
      </div>
    {/if}

    {#if localUploading}
      <div class="suu-dialog__status" role="status">
        <span class="suu-dialog__spinner" aria-hidden="true"></span>
        <span>{uploadLabel}...</span>
      </div>
    {/if}

    {#if uploadComplete}
      <div class="suu-dialog__alert suu-dialog__alert--success" role="status">
        {successMessage}
      </div>
    {/if}

    {#if instructions.length > 0}
      <section class="suu-csv-upload-dialog__instructions" aria-label={instructionsTitle}>
        <h3>{instructionsTitle}</h3>
        <ul>
          {#each instructions as instruction}
            <li>{instruction}</li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="suu-dialog__button"
      disabled={isBusy}
      on:click={handleCancel}
    >
      {uploadComplete ? doneLabel : cancelLabel}
    </button>
    {#if uploadComplete}
      <button
        type="button"
        class="suu-dialog__button suu-dialog__button--primary"
        disabled={isBusy}
        on:click={resetFileState}
      >
        {uploadAnotherLabel}
      </button>
    {:else}
      <button
        type="button"
        class="suu-dialog__button suu-dialog__button--primary"
        disabled={isBusy || !selectedFile}
        on:click={handleUpload}
      >
        {uploadLabel}
      </button>
    {/if}
  </svelte:fragment>
</Dialog>
