<script lang="ts">
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type { ToastItem } from './types.js';

  export let toast: ToastItem;
  export let onDismiss: (id: string) => void = () => {};
  export let language: UiLanguage = 'en_us';
  export let closeLabel: string | undefined = undefined;

  $: messages = getUiMessages(language);
  $: resolvedCloseLabel = closeLabel ?? messages.toast.closeLabel;
  $: countdownStyle = `--suu-toast-duration: ${toast.duration}ms`;
</script>

<article
  class={`suu-toast suu-toast--${toast.variant} ${toast.class ?? ''}`}
  role={toast.variant === 'error' ? 'alert' : 'status'}
  aria-live={toast.ariaLive}
>
  <div class="suu-toast__accent" aria-hidden="true"></div>
  <div class="suu-toast__content">
    {#if toast.title}
      <div class="suu-toast__title">{toast.title}</div>
    {/if}
    {#if toast.message}
      <div class="suu-toast__message">{toast.message}</div>
    {/if}
  </div>
  {#if toast.dismissible}
    <button class="suu-toast__close" type="button" aria-label={resolvedCloseLabel} on:click={() => onDismiss(toast.id)}>
      <span aria-hidden="true">&times;</span>
    </button>
  {/if}
  {#if toast.showCountdown && toast.duration > 0}
    <div class="suu-toast__countdown" style={countdownStyle} aria-hidden="true"></div>
  {/if}
</article>
