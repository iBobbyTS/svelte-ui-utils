<script lang="ts">
  import Toast from './Toast.svelte';
  import { groupToastsByPosition, getToastStackDirection, toast as defaultToastStore, TOAST_POSITIONS } from './store.js';
  import type { ToastPosition, ToastStore } from './types.js';

  export let store: ToastStore = defaultToastStore;
  export let positions: ToastPosition[] = TOAST_POSITIONS;

  $: groups = groupToastsByPosition($store);
</script>

{#each positions as position}
  {@const items = groups[position]}
  {#if items.length > 0}
    <div
      class={`suu-toast-region suu-toast-region--${position}`}
      data-position={position}
      data-stack={getToastStackDirection(position)}
      aria-live={position.includes('top') ? 'polite' : 'off'}
    >
      {#each items as item (item.id)}
        <Toast toast={item} onDismiss={store.dismiss} />
      {/each}
    </div>
  {/if}
{/each}
