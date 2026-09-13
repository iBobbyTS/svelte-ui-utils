<script lang="ts">
  import {
    Dropdown,
    DropdownMultiSelect,
    type DropdownChangeHandler,
    type DropdownMultiChangeHandler
  } from '../../src/lib/dropdown/index.js';
  import type {
    DropdownLoadOptions,
    DropdownLoadOptionsResult
  } from '../../src/lib/index.js';

  const options = [
    { label: 'One', value: 'one' },
    { label: 'Two', value: 'two' }
  ];
  const handleSingle: DropdownChangeHandler = (_value) => undefined;
  const handleMultiple: DropdownMultiChangeHandler = (_values) => undefined;
  const loadOptions: DropdownLoadOptions = async (
    _query,
    { limit, signal }
  ): Promise<DropdownLoadOptionsResult> => {
    const response = await fetch(`/api/options?limit=${limit}`, { signal });
    return response.json() as Promise<DropdownLoadOptionsResult>;
  };
</script>

<Dropdown value="one" {options} onChange={handleSingle} />
<Dropdown value={['one']} multiselect {options} onChange={handleMultiple} />
<DropdownMultiSelect value={['one']} {options} onChange={handleMultiple} />
<Dropdown value="" search {loadOptions} ariaLabel="Search" onChange={handleSingle} />
