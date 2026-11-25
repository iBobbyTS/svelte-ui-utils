<svelte:options runes={false} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import { getAriaSort, getCellValue, getSubCellValue, toggleSort } from './state.js';
  import type {
    DataTableCellValue,
    DataTableColumn,
    DataTableHorizontalAlign,
    DataTableLayout,
    DataTableRowAttributes,
    DataTableRowKey,
    DataTableSortChangeHandler,
    DataTableSubColumn,
    DataTableVerticalAlign,
    SortState
  } from './types.js';

  export let rows: unknown[] = [];
  export let columns: DataTableColumn[] = [];
  export let sort: SortState | null = null;
  export let showHeader = true;
  export let zebra = true;
  export let hoverable = true;
  export let bordered = true;
  export let verticalSeparators = false;
  export let tableLayout: DataTableLayout = 'auto';
  export let stickyHeader = true;
  export let stickyHeaderTop: string | undefined = undefined;
  export let stickyHeaderOffset: string | undefined = undefined;
  export let preserveScrollOnSort = true;
  export let language: UiLanguage = 'en_us';
  export let emptyText: string | undefined = undefined;
  export let rowKey: DataTableRowKey | undefined = undefined;
  export let rowClass: string | ((row: unknown, index: number) => string | undefined | null) | undefined = undefined;
  export let rowAttributes: DataTableRowAttributes | undefined = undefined;
  export let onSortChange: DataTableSortChangeHandler | undefined = undefined;
  /**
   * Set by `DataTable` from its own `subFooter` slot presence: the add-control
   * row only exists when the caller supplies that slot.
   */
  export let subFooterEnabled = false;

  interface ResolvedSubRowGroup {
    column: DataTableColumn;
    grouped: boolean;
    subColumns: readonly DataTableSubColumn[];
    subRows: readonly unknown[];
  }

  interface ResolvedHeaderCell {
    id: string;
    column: DataTableColumn;
    subColumn: DataTableSubColumn | null;
    colSpan: number | undefined;
    rowSpan: number | undefined;
    scope: 'col' | 'colgroup';
    headerClass: string | undefined;
    horizontalAlign: DataTableHorizontalAlign;
    verticalAlign: DataTableVerticalAlign;
    nowrap: string | undefined;
    firstColumn: string | undefined;
    groupHeader: string | undefined;
    style: string | undefined;
  }

  let scrollRestoreSequence = 0;
  let sortPending = false;
  let tableWrapElement: HTMLDivElement;
  let tableElement: HTMLTableElement | undefined = undefined;
  let stickyHeaderVisible = false;
  let stickyHeaderLeft = 0;
  let stickyHeaderWidth = 0;
  let stickyHeaderColumnWidths: number[] = [];
  let stickyHeaderTrackGroups: number[][] = [];
  let stickyHeaderTrackOffset = 0;
  let stickyHeaderUpdateFrame: number | null = null;
  let stickyHeaderOffsetProbe: HTMLSpanElement | undefined = undefined;
  $: messages = getUiMessages(language);
  $: resolvedEmptyText = emptyText ?? messages.table.emptyText;
  $: resolvedStickyHeaderTop = stickyHeaderOffset ?? stickyHeaderTop;
  $: grouped = columns.some((column) => isGroupedColumn(column));
  $: trackCount = countTracks(columns);
  $: showSubHeaderRow = showHeader && grouped;
  $: showSubFooterRow = subFooterEnabled && grouped;
  $: emptyColspan = Math.max(1, grouped ? trackCount : columns.length);
  // 主表和吸顶副本共用同一份表头模型，避免两处表头结构漂移；只有副本带测量宽度。
  $: headerRows = buildHeaderRows(columns, undefined, grouped);
  $: cloneHeaderRows = buildHeaderRows(columns, grouped ? undefined : stickyHeaderColumnWidths, grouped);

  function isGroupedColumn(column: DataTableColumn) {
    return (column.subColumns?.length ?? 0) > 0;
  }

  function countTracks(tableColumns: readonly DataTableColumn[]) {
    return tableColumns.reduce((total, column) => total + (isGroupedColumn(column) ? (column.subColumns?.length ?? 1) : 1), 0);
  }

  function buildHeaderRows(tableColumns: readonly DataTableColumn[], widths: number[] | undefined, isGrouped: boolean) {
    const firstRow: ResolvedHeaderCell[] = [];
    const secondRow: ResolvedHeaderCell[] = [];

    tableColumns.forEach((column, columnIndex) => {
      const measuredWidth = widths?.[columnIndex];
      const widthStyle = measuredWidth ? `width: ${measuredWidth}px; min-width: ${measuredWidth}px; max-width: ${measuredWidth}px;` : undefined;
      const subColumns = isGroupedColumn(column) ? (column.subColumns ?? []) : [];

      if (subColumns.length > 0) {
        firstRow.push({
          id: column.key,
          column,
          subColumn: null,
          colSpan: subColumns.length,
          rowSpan: undefined,
          scope: 'colgroup',
          headerClass: column.headerClass,
          horizontalAlign: resolveHeaderHorizontalAlign(column),
          verticalAlign: resolveHeaderVerticalAlign(column),
          nowrap: undefined,
          firstColumn: isGrouped && columnIndex === 0 ? 'true' : undefined,
          groupHeader: 'true',
          // 父表头横跨的子列轨宽度由各子列决定，父单元格本身不写死宽度。
          style: undefined
        });

        subColumns.forEach((subColumn, subColumnIndex) => {
          secondRow.push({
            id: `${column.key}::${subColumn.key}`,
            column,
            subColumn,
            colSpan: undefined,
            rowSpan: undefined,
            scope: 'col',
            headerClass: subColumn.headerClass,
            horizontalAlign: subColumn.headerHorizontalAlign ?? 'left',
            verticalAlign: 'middle',
            nowrap: subColumn.nowrap === false ? 'false' : 'true',
            firstColumn: isGrouped && columnIndex === 0 && subColumnIndex === 0 ? 'true' : undefined,
            groupHeader: undefined,
            style: undefined
          });
        });

        return;
      }

      firstRow.push({
        id: column.key,
        column,
        subColumn: null,
        colSpan: undefined,
        rowSpan: isGrouped ? 2 : undefined,
        scope: 'col',
        headerClass: column.headerClass,
        horizontalAlign: resolveHeaderHorizontalAlign(column),
        verticalAlign: resolveHeaderVerticalAlign(column),
        nowrap: undefined,
        firstColumn: isGrouped && columnIndex === 0 ? 'true' : undefined,
        groupHeader: undefined,
        style: widthStyle
      });
    });

    return secondRow.length > 0 ? [firstRow, secondRow] : [firstRow];
  }

  function resolveSubRowGroups(row: unknown): ResolvedSubRowGroup[] {
    return columns.map((column) => {
      const groupedColumn = isGroupedColumn(column);
      return {
        column,
        grouped: groupedColumn,
        subColumns: groupedColumn ? (column.subColumns ?? []) : [],
        subRows: groupedColumn ? (column.getSubRows?.(row, column) ?? []) : []
      };
    });
  }

  function resolveMaxSubRows(groups: readonly ResolvedSubRowGroup[]) {
    return groups.reduce((max, group) => Math.max(max, group.subRows.length), 0);
  }

  // 首个子行与父行其它单元格共用第一物理行，因此续行数是首行以外的物理行数。
  function resolveContinuationRowCount(maxSubRows: number) {
    return Math.max(0, maxSubRows - 1);
  }

  function resolveSubRowOffsets(continuationRows: number) {
    const offsets: number[] = [];
    for (let offset = 1; offset <= continuationRows; offset += 1) {
      offsets.push(offset);
    }
    return offsets;
  }

  function resolveBodyRowCount(continuationRows: number) {
    return 1 + continuationRows + (showSubFooterRow ? 1 : 0);
  }

  function resolveFillerRowSpan(group: ResolvedSubRowGroup, continuationRows: number) {
    return continuationRows - group.subRows.length + 1;
  }

  function resolveStickyHeaderTracks(header: HTMLTableSectionElement) {
    const [firstRow, secondRow] = Array.from(header.rows) as HTMLTableRowElement[];
    let secondRowIndex = 0;

    return columns.map((column, columnIndex) => {
      if (column.subColumns?.length) {
        return column.subColumns.map(() => secondRow?.cells[secondRowIndex++]?.getBoundingClientRect().width ?? 0);
      }
      return [firstRow?.cells[columnIndex]?.getBoundingClientRect().width ?? 0];
    });
  }

  function restoreScrollPosition(scrollX: number, scrollY: number, sequence: number) {
    if (!preserveScrollOnSort || typeof window === 'undefined' || sequence !== scrollRestoreSequence) {
      return;
    }

    window.scrollTo(scrollX, scrollY);
  }

  function queueScrollRestore(scrollX: number, scrollY: number, sequence: number) {
    if (!preserveScrollOnSort || typeof window === 'undefined') {
      return;
    }

    const restore = () => restoreScrollPosition(scrollX, scrollY, sequence);
    restore();
    window.requestAnimationFrame?.(restore);
    setTimeout(restore, 0);
    setTimeout(restore, 50);
  }

  function updateStickyHeader() {
    if (!showHeader || !stickyHeader || typeof window === 'undefined' || !tableElement) {
      stickyHeaderVisible = false;
      return;
    }

    const header = tableElement.tHead;
    const firstHeaderCell = header?.querySelector('th');
    if (!header || !firstHeaderCell) {
      stickyHeaderVisible = false;
      return;
    }

    const tableRect = tableElement.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const stickyTop = stickyHeaderOffsetProbe?.getBoundingClientRect().top ?? 0;
    const nextVisible = headerRect.top <= stickyTop && tableRect.bottom > stickyTop + headerRect.height;
    stickyHeaderVisible = nextVisible;

    if (!nextVisible) {
      return;
    }

    if (grouped) {
      // 固定副本裁剪到滚动容器内侧，副本内的表格跟随原表的横向位置。
      const wrapLeft = tableWrapElement.getBoundingClientRect().left + tableWrapElement.clientLeft;
      stickyHeaderLeft = Math.max(wrapLeft, tableRect.left);
      stickyHeaderWidth = Math.max(0, Math.min(wrapLeft + tableWrapElement.clientWidth, tableRect.right) - stickyHeaderLeft);
      stickyHeaderTrackOffset = tableRect.left - stickyHeaderLeft;
      stickyHeaderTrackGroups = resolveStickyHeaderTracks(header);
      return;
    }

    stickyHeaderLeft = tableRect.left;
    stickyHeaderWidth = tableRect.width;
    stickyHeaderColumnWidths = Array.from(header.querySelectorAll('th')).map((cell) => cell.getBoundingClientRect().width);
  }

  function queueStickyHeaderUpdate() {
    if (typeof window === 'undefined') {
      return;
    }

    if (stickyHeaderUpdateFrame !== null) {
      window.cancelAnimationFrame(stickyHeaderUpdateFrame);
    }

    stickyHeaderUpdateFrame = window.requestAnimationFrame(() => {
      stickyHeaderUpdateFrame = null;
      updateStickyHeader();
    });
  }

  async function handleSort(column: DataTableColumn) {
    if (!column.sortable || sortPending) {
      return;
    }

    const shouldPreserveScroll = preserveScrollOnSort && typeof window !== 'undefined';
    const scrollX = shouldPreserveScroll ? window.scrollX : 0;
    const scrollY = shouldPreserveScroll ? window.scrollY : 0;
    const sequence = shouldPreserveScroll ? scrollRestoreSequence + 1 : scrollRestoreSequence;
    scrollRestoreSequence = sequence;

    sortPending = true;
    try {
      const sortResult = onSortChange?.(toggleSort(sort, column.key));
      if (shouldPreserveScroll) queueScrollRestore(scrollX, scrollY, sequence);
      if (sortResult) await sortResult;
    } finally {
      sortPending = false;
      if (shouldPreserveScroll) queueScrollRestore(scrollX, scrollY, sequence);
    }
  }

  function resolveRowKey(row: unknown, index: number) {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }

    if (rowKey && row && typeof row === 'object' && rowKey in row) {
      return (row as Record<string, unknown>)[rowKey] as string | number;
    }

    return index;
  }

  function resolveRowClass(row: unknown, index: number) {
    if (typeof rowClass === 'function') {
      return rowClass(row, index) ?? '';
    }

    return rowClass ?? '';
  }

  function resolveRowAttributes(row: unknown, index: number) {
    return rowAttributes?.(row, index) ?? {};
  }

  function resolveCellClass(column: DataTableColumn, row: unknown, value: DataTableCellValue) {
    if (typeof column.class === 'function') {
      return column.class(row, value, column) ?? '';
    }

    return column.class ?? '';
  }

  function resolveHeaderHorizontalAlign(column: DataTableColumn): DataTableHorizontalAlign {
    return column.headerHorizontalAlign ?? 'left';
  }

  function resolveHeaderVerticalAlign(column: DataTableColumn): DataTableVerticalAlign {
    return column.headerVerticalAlign ?? 'middle';
  }

  function resolveCellHorizontalAlign(column: DataTableColumn) {
    return column.cellHorizontalAlign ?? 'left';
  }

  function resolveCellVerticalAlign(column: DataTableColumn) {
    return column.cellVerticalAlign ?? 'top';
  }

  function resolveSubCellClass(subColumn: DataTableSubColumn) {
    return subColumn.class ? `suu-table__sub-cell ${subColumn.class}` : 'suu-table__sub-cell';
  }

  function resolveSubCellHorizontalAlign(subColumn: DataTableSubColumn) {
    return subColumn.cellHorizontalAlign ?? 'left';
  }

  function resolveSubCellVerticalAlign(subColumn: DataTableSubColumn) {
    return subColumn.cellVerticalAlign ?? 'top';
  }

  function firstColumnAttribute(columnIndex: number) {
    return grouped && columnIndex === 0 ? 'true' : undefined;
  }

  onMount(() => {
    const update = () => queueStickyHeaderUpdate();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
      if (grouped || entries.some(({ target }) => target === tableElement)) update();
    }) : undefined;

    if (tableElement) {
      observer?.observe(tableElement);
    }
    observer?.observe(tableWrapElement);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    queueStickyHeaderUpdate();

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
      if (stickyHeaderUpdateFrame !== null) {
        window.cancelAnimationFrame(stickyHeaderUpdateFrame);
      }
    };
  });

  $: {
    rows;
    columns;
    sort;
    showHeader;
    stickyHeader;
    resolvedStickyHeaderTop;
    queueStickyHeaderUpdate();
  }
</script>

<div
  bind:this={tableWrapElement}
  class:suu-table-wrap--borderless={!bordered}
  class="suu-table-wrap"
  style:--suu-table-sticky-top={resolvedStickyHeaderTop}
  on:scroll={grouped && stickyHeader && showHeader ? queueStickyHeaderUpdate : undefined}
>
  <span bind:this={stickyHeaderOffsetProbe} class="suu-table__sticky-offset-probe" aria-hidden="true"></span>

  {#if showHeader && stickyHeaderVisible}
    <div
      class="suu-table__sticky-clone"
      style:left={`${stickyHeaderLeft}px`}
      style:width={`${stickyHeaderWidth}px`}
      aria-hidden="true"
    >
      <table
        class:suu-table--layout-auto={tableLayout === 'auto'}
        class:suu-table--layout-fixed={tableLayout === 'fixed'}
        class:suu-table--sticky-header={stickyHeader}
        class:suu-table--grouped={grouped}
        class:suu-table--zebra={zebra}
        class:suu-table--plain={!zebra}
        class:suu-table--hoverable={hoverable}
        class:suu-table--vertical-separators={verticalSeparators}
        class="suu-table"
        style:width={grouped ? `${stickyHeaderTrackGroups.flat().reduce((total, width) => total + width, 0)}px` : undefined}
        style:transform={grouped ? `translateX(${stickyHeaderTrackOffset}px)` : undefined}
      >
        {#if grouped}
          {#each stickyHeaderTrackGroups as tracks}
            <colgroup>
              {#each tracks as trackWidth}
                <col style:width={`${trackWidth}px`} />
              {/each}
            </colgroup>
          {/each}
        {/if}
        <thead>
          {#each cloneHeaderRows as headerRow, headerRowIndex (headerRowIndex)}
            <tr>
              {#each headerRow as cell (cell.id)}
                <th
                  aria-sort={cell.subColumn === null && cell.column.sortable ? getAriaSort(sort, cell.column.key) : undefined}
                  class={cell.headerClass}
                  colspan={cell.colSpan}
                  data-horizontal-align={cell.horizontalAlign}
                  data-nowrap={cell.nowrap}
                  data-suu-first-column={cell.firstColumn}
                  data-suu-group-header={cell.groupHeader}
                  data-vertical-align={cell.verticalAlign}
                  rowspan={cell.rowSpan}
                  scope={cell.scope}
                  style={cell.style}
                >
                  {#if cell.subColumn}
                    {cell.subColumn.header}
                  {:else if cell.column.sortable}
                    <button class="suu-table__sort-button" type="button" disabled={sortPending} on:click={() => handleSort(cell.column)}>
                      <span><slot name="header" column={cell.column} {sort}>{cell.column.header}</slot></span>
                      <span class="suu-table__sort-indicator" aria-hidden="true">
                        {#if sort?.key === cell.column.key && sort.direction === 'asc'}
                          <svg class="suu-table__sort-icon suu-table__sort-icon--asc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                            <path d="M5 9.5 8 6.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                          </svg>
                        {:else if sort?.key === cell.column.key}
                          <svg class="suu-table__sort-icon suu-table__sort-icon--desc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                            <path d="m5 6.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                          </svg>
                        {:else}
                          <svg class="suu-table__sort-icon suu-table__sort-icon--both" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                            <path d="M5 6.5 8 3.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                            <path d="m5 9.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                          </svg>
                        {/if}
                      </span>
                    </button>
                  {:else}
                    <slot name="header" column={cell.column} {sort}>{cell.column.header}</slot>
                  {/if}
                </th>
              {/each}
            </tr>
          {/each}
        </thead>
      </table>
    </div>
  {/if}

  <table
    bind:this={tableElement}
    class:suu-table--layout-auto={tableLayout === 'auto'}
    class:suu-table--layout-fixed={tableLayout === 'fixed'}
    class:suu-table--sticky-header={stickyHeader}
    class:suu-table--sticky-header-shadowed={showHeader && stickyHeaderVisible}
    class:suu-table--grouped={grouped}
    class:suu-table--zebra={zebra}
    class:suu-table--plain={!zebra}
    class:suu-table--hoverable={hoverable}
    class:suu-table--vertical-separators={verticalSeparators}
    class="suu-table"
  >
    {#if grouped}
      {#each columns as column (column.key)}
        <colgroup>
          {#if isGroupedColumn(column)}
            {#each column.subColumns ?? [] as subColumn (subColumn.key)}
              <col style:width={subColumn.width} />
            {/each}
          {:else}
            <col />
          {/if}
        </colgroup>
      {/each}
    {/if}
    {#if showHeader}
      <thead>
        {#each headerRows as headerRow, headerRowIndex (headerRowIndex)}
          <tr>
            {#each headerRow as cell (cell.id)}
              <th
                aria-sort={cell.subColumn === null && cell.column.sortable ? getAriaSort(sort, cell.column.key) : undefined}
                class={cell.headerClass}
                colspan={cell.colSpan}
                data-horizontal-align={cell.horizontalAlign}
                data-nowrap={cell.nowrap}
                data-suu-first-column={cell.firstColumn}
                data-suu-group-header={cell.groupHeader}
                data-vertical-align={cell.verticalAlign}
                rowspan={cell.rowSpan}
                scope={cell.scope}
                style={cell.style}
              >
                {#if cell.subColumn}
                  {cell.subColumn.header}
                {:else if cell.column.sortable}
                  <button class="suu-table__sort-button" type="button" disabled={sortPending} on:click={() => handleSort(cell.column)}>
                    <span><slot name="header" column={cell.column} {sort}>{cell.column.header}</slot></span>
                    <span class="suu-table__sort-indicator" aria-hidden="true">
                      {#if sort?.key === cell.column.key && sort.direction === 'asc'}
                        <svg class="suu-table__sort-icon suu-table__sort-icon--asc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M5 9.5 8 6.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                        </svg>
                      {:else if sort?.key === cell.column.key}
                        <svg class="suu-table__sort-icon suu-table__sort-icon--desc" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="m5 6.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                        </svg>
                      {:else}
                        <svg class="suu-table__sort-icon suu-table__sort-icon--both" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M5 6.5 8 3.5l3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                          <path d="m5 9.5 3 3 3-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                        </svg>
                      {/if}
                    </span>
                  </button>
                {:else}
                  <slot name="header" column={cell.column} {sort}>{cell.column.header}</slot>
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </thead>
    {/if}
    {#if rows.length > 0}
      {#if grouped}
        {#each rows as row, rowIndex (resolveRowKey(row, rowIndex))}
          {@const rowGroups = resolveSubRowGroups(row)}
          {@const maxSubRows = resolveMaxSubRows(rowGroups)}
          {@const continuationRows = resolveContinuationRowCount(maxSubRows)}
          {@const bodyRowCount = resolveBodyRowCount(continuationRows)}
          <tbody class="suu-table__row-group" data-suu-row-index={rowIndex}>
            <tr {...resolveRowAttributes(row, rowIndex)} class={resolveRowClass(row, rowIndex)}>
              {#each rowGroups as group, columnIndex (group.column.key)}
                {#if group.grouped}
                  {#if group.subRows.length === 0}
                    <!-- 回退格覆盖首行和续行，页脚有自己独立的单元格。 -->
                    <td
                      class="suu-table__sub-empty"
                      colspan={group.subColumns.length}
                      data-suu-first-column={firstColumnAttribute(columnIndex)}
                      data-suu-group-cell="true"
                      rowspan={1 + continuationRows}
                    >
                      <slot name="subEmpty" {row} column={group.column} />
                    </td>
                  {:else}
                    {#each group.subColumns as subColumn, subColumnIndex (subColumn.key)}
                      {@const subRow = group.subRows[0]}
                      {@const value = getSubCellValue(subRow, subColumn)}
                      <td
                        class={resolveSubCellClass(subColumn)}
                        data-horizontal-align={resolveSubCellHorizontalAlign(subColumn)}
                        data-suu-first-column={columnIndex === 0 && subColumnIndex === 0 ? 'true' : undefined}
                        data-suu-group-cell="true"
                        data-vertical-align={resolveSubCellVerticalAlign(subColumn)}
                        data-nowrap={subColumn.nowrap === false ? 'false' : 'true'}
                      >
                        <slot name="subCell" {row} column={group.column} {subRow} subRowIndex={0} {subColumn} {subColumnIndex} {value}>
                          {value as string}
                        </slot>
                      </td>
                    {/each}
                  {/if}
                {:else}
                  {@const value = getCellValue(row, group.column)}
                  <td
                    class={resolveCellClass(group.column, row, value)}
                    data-horizontal-align={resolveCellHorizontalAlign(group.column)}
                    data-suu-first-column={firstColumnAttribute(columnIndex)}
                    data-vertical-align={resolveCellVerticalAlign(group.column)}
                    data-nowrap={group.column.nowrap === false ? 'false' : 'true'}
                    rowspan={bodyRowCount}
                  >
                    <slot name="cell" {row} column={group.column} {value}>{value as string}</slot>
                  </td>
                {/if}
              {/each}
            </tr>
            {#each resolveSubRowOffsets(continuationRows) as subRowIndex}
              <tr class="suu-table__sub-row" data-suu-sub-row-index={subRowIndex}>
                {#each rowGroups as group, columnIndex (group.column.key)}
                  {#if group.grouped}
                    {#if subRowIndex < group.subRows.length}
                      {#each group.subColumns as subColumn, subColumnIndex (subColumn.key)}
                        {@const subRow = group.subRows[subRowIndex]}
                        {@const value = getSubCellValue(subRow, subColumn)}
                        <td
                          class={resolveSubCellClass(subColumn)}
                          data-horizontal-align={resolveSubCellHorizontalAlign(subColumn)}
                          data-suu-first-column={columnIndex === 0 && subColumnIndex === 0 ? 'true' : undefined}
                          data-suu-group-cell="true"
                          data-vertical-align={resolveSubCellVerticalAlign(subColumn)}
                          data-nowrap={subColumn.nowrap === false ? 'false' : 'true'}
                        >
                          <slot name="subCell" {row} column={group.column} {subRow} {subRowIndex} {subColumn} {subColumnIndex} {value}>
                            {value as string}
                          </slot>
                        </td>
                      {/each}
                    {:else if subRowIndex === group.subRows.length}
                      <td
                        class="suu-table__sub-filler"
                        colspan={group.subColumns.length}
                        data-suu-first-column={firstColumnAttribute(columnIndex)}
                        data-suu-group-cell="true"
                        rowspan={resolveFillerRowSpan(group, continuationRows)}
                      ></td>
                    {/if}
                  {/if}
                {/each}
              </tr>
            {/each}
            {#if showSubFooterRow}
              <tr class="suu-table__sub-footer">
                {#each rowGroups as group, columnIndex (group.column.key)}
                  {#if group.grouped}
                    <td
                      class="suu-table__sub-footer-cell"
                      colspan={group.subColumns.length}
                      data-suu-first-column={firstColumnAttribute(columnIndex)}
                      data-suu-group-cell="true"
                    >
                      <slot name="subFooter" {row} column={group.column} />
                    </td>
                  {/if}
                {/each}
              </tr>
            {/if}
          </tbody>
        {/each}
      {:else}
        <tbody>
          {#each rows as row, rowIndex (resolveRowKey(row, rowIndex))}
            <tr {...resolveRowAttributes(row, rowIndex)} class={resolveRowClass(row, rowIndex)}>
              {#each columns as column (column.key)}
                {@const value = getCellValue(row, column)}
                <td
                  class={resolveCellClass(column, row, value)}
                  data-horizontal-align={resolveCellHorizontalAlign(column)}
                  data-vertical-align={resolveCellVerticalAlign(column)}
                  data-nowrap={column.nowrap === false ? 'false' : 'true'}
                >
                  <slot name="cell" {row} {column} {value}>{value as string}</slot>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      {/if}
    {:else}
      <tbody>
        <tr>
          <td class="suu-table__empty" colspan={emptyColspan}>{resolvedEmptyText}</td>
        </tr>
      </tbody>
    {/if}
  </table>
</div>
