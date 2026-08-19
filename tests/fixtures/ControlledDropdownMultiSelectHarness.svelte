<script lang="ts">
  import { DropdownMultiSelect, type DropdownMultiValue } from '../../src/lib/dropdown/index.js';

  const options = [
    { label: 'Alpha', value: 'alpha' },
    { label: 'Beta', value: 'beta' }
  ];

  let selectedValues: DropdownMultiValue = ['alpha', 'beta'];
</script>

<DropdownMultiSelect
  value={selectedValues}
  {options}
  ariaLabel="Controlled choices"
  onChange={(values) => {
    selectedValues = values;
  }}
/>

<output aria-label="Selected values">{selectedValues.join(',')}</output>
