<svelte:options runes={false} />

<script lang="ts">
  import FilterControl from './FilterControl.svelte';
  import type { UiLanguage } from '../i18n.js';
  import type { FilterTableRow } from './types.js';

  export let rows: FilterTableRow[] = [];
  export let language: UiLanguage = 'en_us';
</script>

<div class="suu-filter-table">
  <div class="suu-filter-table__filters-wrap">
    <table class="suu-filter-table__filters">
      <tbody>
        {#each rows as row (row.key)}
          <tr>
            <th scope="row">{row.title}</th>
            <td>
              <FilterControl control={row.filter} {language} />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
