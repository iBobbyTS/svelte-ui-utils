<script lang="ts">
  import { onDestroy } from 'svelte';
  import { formatParamDict, resolveDropdownSearchStatus } from './state.js';
  import type {
    DropdownSearchChangeDetail,
    DropdownSearchItem,
    DropdownSearchLoadOptions,
    DropdownSearchStatus
  } from './types.js';

  export let value = '';
  export let selectedItem: DropdownSearchItem | null = null;
  export let status: DropdownSearchStatus = 'empty';
  export let placeholder = '';
  export let debounceMs = 500;
  export let limit = 10;
  export let minLength = 1;
  export let loadOptions: DropdownSearchLoadOptions;
  export let id: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let disabled = false;
  export let noResultsText = 'No results';
  export let loadingText = 'Loading...';
  export let onChange: ((detail: DropdownSearchChangeDetail) => void) | undefined = undefined;
  export let onSelect: ((item: DropdownSearchItem) => void) | undefined = undefined;
  export let onStatusChange: ((status: DropdownSearchStatus) => void) | undefined = undefined;

  let options: DropdownSearchItem[] = [];
  let exactMatch: DropdownSearchItem | null = null;
  let focused = false;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let activeController: AbortController | undefined;
  let requestId = 0;

  $: hasQuery = value.trim().length > 0;
  $: showOptions = focused && !disabled && (options.length > 0 || status === 'loading' || (hasQuery && status === 'invalid'));

  function emitChange() {
    const detail = { value, selectedItem, status };
    onChange?.(detail);
  }

  function setStatus(nextStatus: DropdownSearchStatus) {
    if (status !== nextStatus) {
      status = nextStatus;
      onStatusChange?.(status);
    }
  }

  function resetSearchState(nextValue: string) {
    value = nextValue;
    selectedItem = null;
    exactMatch = null;
    options = [];
    setStatus(resolveDropdownSearchStatus({ value, selectedItem, exactMatch, minLength }));
    emitChange();
  }

  function clearSearchTimer() {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }
  }

  function abortActiveSearch() {
    if (activeController) {
      activeController.abort();
      activeController = undefined;
    }
  }

  async function runSearch(query: string) {
    const trimmed = query.trim();

    if (!trimmed || trimmed.length < minLength) {
      abortActiveSearch();
      options = [];
      exactMatch = null;
      setStatus(resolveDropdownSearchStatus({ value: query, minLength }));
      emitChange();
      return;
    }

    abortActiveSearch();
    const currentRequestId = ++requestId;
    const controller = new AbortController();
    activeController = controller;
    setStatus('loading');
    emitChange();

    try {
      const result = await loadOptions(trimmed, { limit, signal: controller.signal });

      if (controller.signal.aborted || currentRequestId !== requestId) {
        return;
      }

      options = result.options ?? [];
      exactMatch = result.exactMatch ?? null;
      selectedItem = exactMatch && !exactMatch.disabled ? exactMatch : null;
      setStatus(resolveDropdownSearchStatus({ value, selectedItem, exactMatch, minLength }));
      emitChange();
    } catch (error) {
      if (controller.signal.aborted || currentRequestId !== requestId) {
        return;
      }

      options = [];
      exactMatch = null;
      selectedItem = null;
      setStatus('error');
      emitChange();
    } finally {
      if (activeController === controller) {
        activeController = undefined;
      }
    }
  }

  function scheduleSearch(query: string) {
    clearSearchTimer();
    searchTimer = setTimeout(() => {
      void runSearch(query);
    }, debounceMs);
  }

  function handleInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    resetSearchState(input.value);
    scheduleSearch(input.value);
  }

  function selectItem(item: DropdownSearchItem) {
    if (item.disabled) {
      return;
    }

    clearSearchTimer();
    abortActiveSearch();
    selectedItem = item;
    exactMatch = item;
    value = item.title;
    setStatus('valid');
    focused = false;
    emitChange();
    onSelect?.(item);
  }

  onDestroy(() => {
    clearSearchTimer();
    abortActiveSearch();
  });
</script>

<div class={`suu-dropdown-search suu-dropdown-search--${status}`} data-status={status}>
  <div class="suu-dropdown-search__field">
    <input
      class="suu-dropdown-search__input"
      {id}
      {name}
      {value}
      {placeholder}
      {disabled}
      autocomplete="off"
      aria-autocomplete="list"
      aria-expanded={showOptions}
      aria-invalid={status === 'invalid' || status === 'error'}
      on:input={handleInput}
      on:focus={() => (focused = true)}
      on:blur={() => setTimeout(() => (focused = false), 120)}
    />
    <span class="suu-dropdown-search__status" aria-hidden="true"></span>
  </div>

  {#if showOptions}
    <div class="suu-dropdown-search__menu" role="listbox">
      {#if status === 'loading'}
        <div class="suu-dropdown-search__empty">{loadingText}</div>
      {:else if options.length > 0}
        {#each options as option (option.id)}
          <button
            type="button"
            class="suu-dropdown-search__option"
            class:suu-dropdown-search__option--disabled={option.disabled}
            role="option"
            aria-selected={selectedItem?.id === option.id}
            disabled={option.disabled}
            on:mousedown|preventDefault={() => selectItem(option)}
          >
            <span class="suu-dropdown-search__title">{option.title}</span>
            {#if formatParamDict(option.param_dict).length > 0}
              <span class="suu-dropdown-search__meta">{formatParamDict(option.param_dict).join(' · ')}</span>
            {/if}
          </button>
        {/each}
      {:else}
        <div class="suu-dropdown-search__empty">{noResultsText}</div>
      {/if}
    </div>
  {/if}
</div>
