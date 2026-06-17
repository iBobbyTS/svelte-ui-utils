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
  export let validate = true;
  export let loadOptions: DropdownSearchLoadOptions;
  export let id: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let listboxId: string | undefined = undefined;
  export let disabled = false;
  export let noResultsText = 'No results';
  export let loadingText = 'Loading...';
  export let clearLabel = 'Clear';
  export let searchOnExternalValueChange = false;
  export let width: string | undefined = undefined;
  export let minWidth: string | undefined = undefined;
  export let maxWidth: string | undefined = undefined;
  export let getItemValue: DropdownSearchItemValueGetter = (item) => item.title;
  export let onChange: ((detail: DropdownSearchChangeDetail) => void) | undefined = undefined;
  export let onSelect: ((item: DropdownSearchItem) => void) | undefined = undefined;
  export let onStatusChange: ((status: DropdownSearchStatus) => void) | undefined = undefined;
  export let onInputBlur: ((event: FocusEvent) => void) | undefined = undefined;

  let options: DropdownSearchItem[] = [];
  let exactMatch: DropdownSearchItem | null = null;
  let focused = false;
  let inputElement: HTMLInputElement | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let activeController: AbortController | undefined;
  let requestId = 0;
  let lastHandledValue = value;

  $: resolvedListboxId = listboxId ?? (id ? `${id}-options` : undefined);
  $: hasQuery = normalizeDropdownSearchValue(value).length > 0;
  $: showOptions = focused && !disabled && (options.length > 0 || status === 'loading' || (hasQuery && status === 'invalid'));
  $: if (!validate && status !== 'empty' && status !== 'loading') {
    setStatus('empty');
  }
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
    setStatus(resolveDropdownSearchStatus({ value, selectedItem, exactMatch, minLength, validate }));
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
      setStatus(resolveDropdownSearchStatus({ value: query, minLength, validate }));
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
      exactMatch = validate ? (result.exactMatch ?? null) : null;
      selectedItem = validate && exactMatch && !exactMatch.disabled ? exactMatch : null;
      setStatus(resolveDropdownSearchStatus({ value, selectedItem, exactMatch, minLength, validate }));
      emitChange();
    } catch (error) {
      if (controller.signal.aborted || currentRequestId !== requestId) {
        return;
      }

      options = [];
      exactMatch = null;
      selectedItem = null;
      setStatus(resolveDropdownSearchStatus({ value: query, errored: true, minLength, validate }));
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
    exactMatch = validate ? item : null;
    value = getItemValue(item);
    lastHandledValue = value;
    setStatus(validate ? 'valid' : 'empty');
    focused = false;
    emitChange();
    onSelect?.(item);
  }

  function clearSearch() {
    if (!hasQuery || disabled) {
      return;
    }

    clearSearchTimer();
    abortActiveSearch();
    value = '';
    lastHandledValue = value;
    selectedItem = null;
    exactMatch = null;
    options = [];
    setStatus(resolveDropdownSearchStatus({ value, selectedItem, exactMatch, minLength, validate }));
    focused = true;
    emitChange();
    inputElement?.focus();
  }

  function handleExternalValue(nextValue: string) {
    lastHandledValue = nextValue;
    selectedItem = null;
    exactMatch = null;
    options = [];

    clearSearchTimer();
    if (!normalizeDropdownSearchValue(nextValue) || normalizeDropdownSearchValue(nextValue).length < minLength) {
      setStatus(resolveDropdownSearchStatus({ value: nextValue, selectedItem, exactMatch, minLength, validate }));
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

<div
  class={`suu-dropdown-search suu-dropdown-search--${status}`}
  class:suu-dropdown-search--has-clear={hasQuery && !disabled}
  data-status={status}
  style:width
  style:min-width={minWidth}
  style:max-width={maxWidth}
>
  <div class="suu-dropdown-search__field">
    <svg class="suu-dropdown-search__icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m16 16 4 4"></path>
    </svg>
    <input
      bind:this={inputElement}
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
    {#if hasQuery && !disabled}
      <button
        type="button"
        class="suu-dropdown-search__clear"
        aria-label={clearLabel}
        title={clearLabel}
        on:mousedown|preventDefault
        on:click={clearSearch}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m6 6 8 8M14 6l-8 8"></path>
        </svg>
      </button>
    {/if}
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
