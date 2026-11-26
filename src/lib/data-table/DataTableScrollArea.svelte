<script lang="ts">
  import { setContext, type Snippet } from 'svelte';
  import { tableScrollAreaContext } from './scroll-area-context.js';

  let { label, header, children, viewport = $bindable() }: {
    label: string;
    header?: Snippet;
    children: Snippet;
    viewport?: HTMLDivElement;
  } = $props();

  setContext(tableScrollAreaContext, true);
</script>

<div class="suu-table-scroll-area">
  {#if header}<div class="suu-table-scroll-area__header">{@render header()}</div>{/if}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (键盘用户需能聚焦并滚动整个表格区域。) -->
  <div class="suu-table-scroll-area__viewport" bind:this={viewport} role="region" aria-label={label} tabindex="0">
    <div class="suu-table-scroll-area__content">{@render children()}</div>
  </div>
</div>
