<script lang="ts">
  import {
    Dropdown,
    DropdownMultiSelect,
    type DropdownChangeHandler,
    type DropdownMultiChangeHandler
  } from '../../src/lib/dropdown/index.js';

  const options = [
    { label: 'One', value: 'one' },
    { label: 'Two', value: 'two' }
  ];
  const handleSingle: DropdownChangeHandler = (_value) => undefined;
  const handleMultiple: DropdownMultiChangeHandler = (_values) => undefined;
</script>

<Dropdown value="one" {options} onChange={handleSingle} />
<Dropdown value={['one']} multiselect {options} onChange={handleMultiple} />
<DropdownMultiSelect value={['one']} {options} onChange={handleMultiple} />
