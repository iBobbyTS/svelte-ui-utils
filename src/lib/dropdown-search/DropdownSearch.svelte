<script lang="ts">
  import { onDestroy } from 'svelte';
  import { formatParamDict, normalizeDropdownSearchValue, resolveDropdownSearchStatus } from './state.js';
  import type {
    DropdownSearchChangeDetail,
    DropdownSearchItem,
    DropdownSearchItemValueGetter,
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
  export let ariaLabel: string | undefined = undefined;
  export let listboxId: string | undefined = undefined;
  export let disabled = false;
  export let noResultsText = 'No results';
  export let loadingText = 'Loading...';
  export let searchOnExternalValueChange = false;
  export let getItemValue: DropdownSearchItemValueGetter = (item) => item.title;
  export let onChange: ((detail: DropdownSearchChangeDetail) => void) | undefined = undefined;
  export let onSelect: ((item: DropdownSearchItem) => void) | undefined = undefined;
  export let onStatusChange: ((status: DropdownSearchStatus) => void) | undefined = undefined;
  export let onInputBlur: ((event: FocusEvent) => void) | undefined = undefined;

  let options: DropdownSearchItem[] = [];
  let exactMatch: DropdownSearchItem | null = null;
  let focused = false;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let activeController: AbortController | undefined;
  let requestId = 0;
  let lastHandledValue = value;

  $: resolvedListboxId = listboxId ?? (id ? `${id}-options` : undefined);
  $: hasQuery = normalizeDropdownSearchValue(value).length > 0;
  $: showOptions = focused && !disabled && (options.length > 0 || status === 'loading' || (hasQuery && status === 'invalid'));
  $: if (searchOnExternalValueChange && value !== lastHandledValue) {
    handleExternalValue(value);
  }

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
    lastHandledValue = nextValue;
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
    const trimmed = normalizeDropdownSearchValue(query);

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
    value = getItemValue(item);
    lastHandledValue = value;
    setStatus('valid');
    focused = false;
    emitChange();
    onSelect?.(item);
  }

  function handleExternalValue(nextValue: string) {
    lastHandledValue = nextValue;
    selectedItem = null;
    exactMatch = null;
    options = [];

    clearSearchTimer();
    if (!normalizeDropdownSearchValue(nextValue) || normalizeDropdownSearchValue(nextValue).length < minLength) {
      setStatus(resolveDropdownSearchStatus({ value: nextValue, selectedItem, exactMatch, minLength }));
      emitChange();
      return;
    }

    void runSearch(nextValue);
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
      aria-label={ariaLabel}
      {disabled}
      autocomplete="off"
      aria-autocomplete="list"
      aria-controls={resolvedListboxId}
      aria-expanded={showOptions}
      aria-invalid={status === 'invalid' || status === 'error'}
      on:input={handleInput}
      on:focus={() => (focused = true)}
      on:blur={(event) => {
        onInputBlur?.(event);
        setTimeout(() => (focused = false), 120);
      }}
    />
    <span class="suu-dropdown-search__status" aria-hidden="true"></span>
  </div>

  {#if showOptions}
    <div class="suu-dropdown-search__menu" id={resolvedListboxId} role="listbox">
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
