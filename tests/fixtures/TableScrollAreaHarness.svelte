<script lang="ts">
  import { DataTable, DataTableScrollArea, type DataTableColumn, type DataTableColumnResize } from '../../src/lib/data-table/index.js';
  import { Dropdown } from '../../src/lib/dropdown/index.js';

  let { stickyHeader = true, pinDetails = false, showActions = false }: { stickyHeader?: boolean; pinDetails?: boolean; showActions?: boolean } = $props();
  let collapsed = $state(false);
  let widths = $state([220, 280, 310, 400]);
  const parts = [32, 12, 27, 35].map(size => Array.from({ length: size }, (_, id) => ({
    id, part: 'Cello', details: [{ name: 'Ali', audio: 'Ready', notes: 'Live' }, { name: 'Jun', audio: 'Ready', notes: 'Studio' }]
  })));
  const columns = $derived<DataTableColumn[]>([
    { key: 'part', header: 'Part' },
    { key: 'details', header: 'Players', subColumns: [
      { key: 'name', header: 'Name' }, { key: 'audio', header: 'Audio', pinLeft: pinDetails }, { key: 'notes', header: 'Notes' }
    ], getSubRows: (row: unknown) => (row as typeof parts[number][number]).details },
    ...(pinDetails ? [{ key: 'status', header: 'Status', pinLeft: true }] : [])
  ]);
  const tracks = $derived(pinDetails ? [...widths, 240] : widths);
  const index = (track: { columnKey: string; subColumnKey?: string }) => track.columnKey === 'part' ? 0 : ['name', 'audio', 'notes'].indexOf(track.subColumnKey ?? '') + 1;
  const resize: DataTableColumnResize = {
    getTrack: (track) => track.columnKey === 'status' ? undefined : { label: 'Resize ' + (track.subColumnKey ?? track.columnKey), minWidth: 80, maxWidth: 650 },
    onPreview: (track, width) => { widths[index(track)] = width; },
    onCommit: (track, width) => { widths[index(track)] = width; },
    onCancel: () => undefined
  };
</script>

<div style="height: 100dvh; --suu-table-scroll-area-inline-inset: 20px">
  <DataTableScrollArea label="Score tables">
    {#snippet header()}
      <header style:padding={collapsed ? '4px' : '20px'}>
        <button type="button" onclick={() => collapsed = !collapsed}>Toggle toolbar</button>
      </header>
    {/snippet}
    <div style="padding-inline: 20px">
      {#each parts as rows, i (i)}
        <section>
          <div data-suu-scroll-area-fixed-inline style="display:flex; align-items:center; justify-content:space-between">
            <h2>Movement {i + 1}</h2>
            <button type="button">Movement tools</button>
          </div>
          <DataTable {rows} {columns} {stickyHeader} columnTrackWidths={tracks} columnResize={resize} rowKey="id" pagination={false} pinFirstColumn />
        </section>
      {/each}
      {#if showActions}
        <DataTable rows={[parts[0][0], { ...parts[0][1], details: [] }]} {columns} {stickyHeader} columnTrackWidths={tracks} columnResize={resize} rowKey="id" pagination={false} pinFirstColumn>
          <svelte:fragment slot="subFooter" let:row>
            {#if (row as typeof parts[number][number]).details.length}
              <Dropdown triggerText="Add player" width="100%" options={[{ value: 'riley', label: 'Riley' }]} />
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="subEmpty">
            <button type="button" data-suu-table-pin-content>Invite player</button>
          </svelte:fragment>
        </DataTable>
      {/if}
    </div>
  </DataTableScrollArea>
</div>
