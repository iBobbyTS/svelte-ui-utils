<svelte:options runes={false} />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import {
    formatParamDict,
    normalizeDropdownSearchValue,
    resolveDropdownSearchStatus,
  } from './state.js';
  import type {
    DropdownSearchChangeDetail,
    DropdownSearchEnterDetail,
    DropdownSearchItem,
    DropdownSearchItemValueGetter,
    DropdownSearchLoadOptions,
    DropdownSearchSelectedItemLabelGetter,
    DropdownSearchSelectedItemsChangeHandler,
    DropdownSearchStatus,
  } from './types.js';

  export let value = '';
  export let selectedItem: DropdownSearchItem | null = null;
  export let selectedItems: DropdownSearchItem[] = [];
  export let status: DropdownSearchStatus = 'empty';
  export let multiselect = false;
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
  export let language: UiLanguage = 'en_us';
  export let noResultsText: string | undefined = undefined;
  export let loadingText: string | undefined = undefined;
  export let clearLabel: string | undefined = undefined;
  export let searchOnExternalValueChange = false;
  export let width: string | undefined = undefined;
  export let minWidth: string | undefined = undefined;
  export let maxWidth: string | undefined = undefined;
  export let selectedItemsLabel = 'Selected items';
  export let removeSelectedItemLabel:
    | DropdownSearchSelectedItemLabelGetter
    | undefined = undefined;
  export let getItemValue: DropdownSearchItemValueGetter = (item) => item.title;
  export let onChange:
    | ((detail: DropdownSearchChangeDetail) => void)
    | undefined = undefined;
  export let onSelect: ((item: DropdownSearchItem) => void) | undefined =
    undefined;
  export let onDeselect: ((item: DropdownSearchItem) => void) | undefined =
    undefined;
  export let onSelectedItemsChange:
    | DropdownSearchSelectedItemsChangeHandler
    | undefined = undefined;
  export let onStatusChange:
    | ((status: DropdownSearchStatus) => void)
    | undefined = undefined;
  export let onInputBlur: ((event: FocusEvent) => void) | undefined = undefined;
  export let onEnter: ((detail: DropdownSearchEnterDetail) => void) | undefined =
    undefined;

  let options: DropdownSearchItem[] = [];
  let exactMatch: DropdownSearchItem | null = null;
  let focused = false;
  let inputValue = value;
  let inputElement: HTMLInputElement | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let blurTimer: ReturnType<typeof setTimeout> | undefined;
  let activeController: AbortController | undefined;
  let requestId = 0;
  let lastHandledValue = value;

  $: messages = getUiMessages(language);
  $: resolvedNoResultsText = noResultsText?.trim()
    ? noResultsText
    : messages.dropdownSearch.noResultsText;
  $: resolvedLoadingText = loadingText?.trim()
    ? loadingText
    : messages.dropdownSearch.loadingText;
  $: resolvedClearLabel = clearLabel?.trim()
    ? clearLabel
    : messages.dropdownSearch.clearLabel;
  $: resolvedListboxId = listboxId ?? (id ? `${id}-options` : undefined);
  $: hasQuery = normalizeDropdownSearchValue(value).length > 0;
  $: showOptions =
    focused &&
    !disabled &&
    hasQuery &&
    (options.length > 0 ||
      status === 'loading' ||
      (validate && hasQuery && options.length === 0));
  $: if (!validate && status !== 'empty' && status !== 'loading') {
    setStatus('empty');
  }
  $: if (value !== lastHandledValue && value !== inputValue) {
    handleIncomingValue(value);
  }

  function emitChange() {
    const detail = { value, selectedItem, selectedItems, status };
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
    if (!multiselect) {
      selectedItem = null;
    }
    exactMatch = null;
    options = [];
    const trimmed = normalizeDropdownSearchValue(nextValue);
    if (trimmed && trimmed.length >= minLength) {
      abortActiveSearch();
      setStatus('loading');
    } else {
      abortActiveSearch();
      setStatus(
        resolveDropdownSearchStatus({
          value,
          selectedItem,
          selectedItems,
          exactMatch,
          minLength,
          validate,
          multiselect,
        }),
      );
    }
    emitChange();
  }

  function clearSearchTimer() {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }
  }

  function clearBlurTimer() {
    if (blurTimer) {
      clearTimeout(blurTimer);
      blurTimer = undefined;
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
      setStatus(
        resolveDropdownSearchStatus({
          value: query,
          selectedItems,
          minLength,
          validate,
          multiselect,
        }),
      );
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
      const result = await loadOptions(trimmed, {
        limit,
        signal: controller.signal,
      });

      if (controller.signal.aborted || currentRequestId !== requestId) {
        return;
      }

      options = result.options ?? [];
      exactMatch = validate ? (result.exactMatch ?? null) : null;
      selectedItem =
        !multiselect && validate && exactMatch && !exactMatch.disabled
          ? exactMatch
          : null;
      setStatus(
        resolveDropdownSearchStatus({
          value,
          selectedItem,
          selectedItems,
          exactMatch: multiselect ? null : exactMatch,
          minLength,
          validate,
          multiselect,
        }),
      );
      emitChange();
    } catch (error) {
      if (controller.signal.aborted || currentRequestId !== requestId) {
        return;
      }

      options = [];
      exactMatch = null;
      selectedItem = null;
      setStatus(
        resolveDropdownSearchStatus({
          value: query,
          selectedItems,
          errored: true,
          minLength,
          validate,
          multiselect,
        }),
      );
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

  function handleInputValue(nextValue: string) {
    clearBlurTimer();
    focused = true;
    inputValue = nextValue;
    resetSearchState(nextValue);
    scheduleSearch(nextValue);
  }

  function handleInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    handleInputValue(input.value);
  }

  function handleBeforeInput() {
    setTimeout(() => {
      if (!inputElement || inputElement.value === lastHandledValue) {
        return;
      }

      handleInputValue(inputElement.value);
    }, 0);
  }

  function handleFocus() {
    clearBlurTimer();
    focused = true;
  }

  function handleBlur(event: FocusEvent) {
    onInputBlur?.(event);
    clearBlurTimer();
    blurTimer = setTimeout(() => {
      focused = document.activeElement === inputElement;
      blurTimer = undefined;
    }, 120);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || multiselect) {
      return;
    }

    onEnter?.({
      event,
      value,
      selectedItem,
      selectedItems,
      status,
      exactMatch,
      options,
    });
  }

  function selectItem(item: DropdownSearchItem) {
    if (item.disabled) {
      return;
    }

    if (multiselect) {
      toggleSelectedItem(item);
      return;
    }

    clearSearchTimer();
    abortActiveSearch();
    selectedItem = item;
    exactMatch = validate ? item : null;
    value = getItemValue(item);
    inputValue = value;
    lastHandledValue = value;
    setStatus(validate ? 'valid' : 'empty');
    focused = false;
    emitChange();
    onSelect?.(item);
  }

  function selectedItemKey(item: DropdownSearchItem): string {
    return String(item.id);
  }

  function isSelectedItem(item: DropdownSearchItem): boolean {
    const key = selectedItemKey(item);
    return selectedItems.some((selected) => selectedItemKey(selected) === key);
  }

  function resolveRemoveSelectedItemLabel(item: DropdownSearchItem): string {
    return removeSelectedItemLabel?.(item) ?? `Remove ${item.title}`;
  }

  function setSelectedItems(nextItems: DropdownSearchItem[]) {
    selectedItems = nextItems;
    void onSelectedItemsChange?.(selectedItems);
  }

  function toggleSelectedItem(item: DropdownSearchItem) {
    const selected = isSelectedItem(item);
    const nextItems = selected
      ? selectedItems.filter(
          (selectedItem) =>
            selectedItemKey(selectedItem) !== selectedItemKey(item),
        )
      : [...selectedItems, item];

    clearSearchTimer();
    abortActiveSearch();
    setSelectedItems(nextItems);
    selectedItem = null;
    exactMatch = null;
    value = '';
    inputValue = value;
    lastHandledValue = value;
    setStatus(
      resolveDropdownSearchStatus({
        value,
        selectedItems,
        minLength,
        validate,
        multiselect,
      }),
    );
    focused = true;
    emitChange();

    if (selected) {
      onDeselect?.(item);
    } else {
      onSelect?.(item);
    }

    inputElement?.focus();
  }

  function removeSelectedItem(item: DropdownSearchItem) {
    if (disabled || !multiselect) {
      return;
    }

    const nextItems = selectedItems.filter(
      (selectedItem) => selectedItemKey(selectedItem) !== selectedItemKey(item),
    );
    setSelectedItems(nextItems);
    setStatus(
      resolveDropdownSearchStatus({
        value,
        selectedItems,
        minLength,
        validate,
        multiselect,
      }),
    );
    emitChange();
    onDeselect?.(item);
    inputElement?.focus();
  }

  function clearSearch() {
    if (!hasQuery || disabled) {
      return;
    }

    clearSearchTimer();
    abortActiveSearch();
    value = '';
    inputValue = value;
    lastHandledValue = value;
    if (!multiselect) {
      selectedItem = null;
    }
    exactMatch = null;
    options = [];
    setStatus(
      resolveDropdownSearchStatus({
        value,
        selectedItem,
        selectedItems,
        exactMatch,
        minLength,
        validate,
        multiselect,
      }),
    );
    focused = true;
    emitChange();
    inputElement?.focus();
  }

  function handleIncomingValue(nextValue: string) {
    inputValue = nextValue;

    if (searchOnExternalValueChange) {
      handleExternalValue(nextValue);
      return;
    }

    lastHandledValue = nextValue;
  }

  function handleExternalValue(nextValue: string) {
    lastHandledValue = nextValue;
    inputValue = nextValue;
    if (!multiselect) {
      selectedItem = null;
    }
    exactMatch = null;
    options = [];

    clearSearchTimer();
    if (
      !normalizeDropdownSearchValue(nextValue) ||
      normalizeDropdownSearchValue(nextValue).length < minLength
    ) {
      setStatus(
        resolveDropdownSearchStatus({
          value: nextValue,
          selectedItem,
          selectedItems,
          exactMatch,
          minLength,
          validate,
          multiselect,
        }),
      );
      emitChange();
      return;
    }

    void runSearch(nextValue);
  }

  onDestroy(() => {
    clearSearchTimer();
    clearBlurTimer();
    abortActiveSearch();
  });

  onMount(() => {
    if (searchOnExternalValueChange && normalizeDropdownSearchValue(value)) {
      handleExternalValue(value);
    }
  });
</script>

<div
  class={`suu-dropdown-search suu-dropdown-search--${status}`}
  class:suu-dropdown-search--multi={multiselect}
  class:suu-dropdown-search--has-clear={hasQuery && !disabled}
  data-status={status}
  data-multiselect={multiselect}
  style:width
  style:min-width={minWidth}
  style:max-width={maxWidth}
>
  {#if multiselect && selectedItems.length > 0}
    <div
      class="suu-dropdown-search__selected-items"
      aria-label={selectedItemsLabel}
    >
      {#each selectedItems as item (item.id)}
        <span class="suu-dropdown-search__selected-item">
          <span class="suu-dropdown-search__selected-title">{item.title}</span>
          {#if !disabled}
            <button
              type="button"
              class="suu-dropdown-search__selected-remove"
              aria-label={resolveRemoveSelectedItemLabel(item)}
              title={resolveRemoveSelectedItemLabel(item)}
              on:mousedown|preventDefault
              on:click={() => removeSelectedItem(item)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m6 6 8 8M14 6l-8 8"></path>
              </svg>
            </button>
          {/if}
        </span>
      {/each}
    </div>
  {/if}

  <div class="suu-dropdown-search__field">
    <svg
      class="suu-dropdown-search__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m16 16 4 4"></path>
    </svg>
    <input
      bind:this={inputElement}
      class="suu-dropdown-search__input"
      {id}
      {name}
      bind:value={inputValue}
      {placeholder}
      aria-label={ariaLabel}
      {disabled}
      autocomplete="off"
      aria-autocomplete="list"
      aria-controls={resolvedListboxId}
      aria-expanded={showOptions}
      aria-invalid={status === 'invalid' || status === 'error'}
      on:beforeinput={handleBeforeInput}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:focus={handleFocus}
      on:blur={handleBlur}
    />
    {#if hasQuery && !disabled}
      <button
        type="button"
        class="suu-dropdown-search__clear"
        aria-label={resolvedClearLabel}
        title={resolvedClearLabel}
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
    <div class="suu-dropdown-search__menu">
      <div
        class="suu-dropdown-search__menu-panel"
        id={resolvedListboxId}
        role="listbox"
        aria-multiselectable={multiselect}
      >
        {#if status === 'loading'}
          <div
            class="suu-dropdown-search__empty suu-dropdown-search__empty--loading"
            aria-live="polite"
          >
            <span class="suu-dropdown-search__spinner" aria-hidden="true"
            ></span>
            <span>{resolvedLoadingText}</span>
          </div>
        {:else if options.length > 0}
          {#each options as option (option.id)}
            <button
              type="button"
              class="suu-dropdown-search__option"
              class:suu-dropdown-search__option--disabled={option.disabled}
              class:suu-dropdown-search__option--selected={multiselect &&
                isSelectedItem(option)}
              role="option"
              aria-selected={multiselect
                ? isSelectedItem(option)
                : selectedItem?.id === option.id}
              disabled={option.disabled}
              on:mousedown|preventDefault={() => selectItem(option)}
            >
              {#if multiselect}
                <span class="suu-dropdown-search__check" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8"></path>
                  </svg>
                </span>
              {/if}
              <span class="suu-dropdown-search__title">{option.title}</span>
              {#if formatParamDict(option.param_dict).length > 0}
                <span class="suu-dropdown-search__meta"
                  >{formatParamDict(option.param_dict).join(' · ')}</span
                >
              {/if}
            </button>
          {/each}
        {:else}
          <div class="suu-dropdown-search__empty">{resolvedNoResultsText}</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
