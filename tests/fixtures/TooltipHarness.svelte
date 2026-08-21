<script lang="ts">
  import Tooltip from '../../src/lib/tooltip/Tooltip.svelte';

  export let triggerLabel = 'Help';
  export let image = false;
</script>

<Tooltip>
  <button type="button">{triggerLabel}</button>
  <svelte:fragment slot="content">
    {#if image}
      <img src="guide.png" alt="账号示例" />
    {:else}
      <span>暂时留空</span>
    {/if}
  </svelte:fragment>
</Tooltip>
