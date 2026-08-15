<script lang="ts">
  import OrderedListEditor from '../../src/lib/ordered-list/OrderedListEditor.svelte';

  export let items = [{ id: 'first', value: 'First' }, { id: 'second', value: 'Second' }];
  export let removed = '';
</script>

<OrderedListEditor {items} allowRemoveLast={true} onremove={(id) => (removed = id)}>
  {#snippet children(item)}
    <input aria-label={item.id} value={item.value} />
  {/snippet}
</OrderedListEditor>
<output data-removed>{removed}</output>
