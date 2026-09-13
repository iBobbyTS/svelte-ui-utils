<svelte:options runes={false} />

<script context="module" lang="ts">
  let dropdownInstanceCount = 0;
</script>

<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type {
    DropdownChangeHandler,
    DropdownLoadOptions,
    DropdownLoadOptionsResult,
    DropdownLoadStatus,
    DropdownMenuAlign,
    DropdownMultiChangeHandler,
    DropdownMultiValue,
    DropdownOption,
    DropdownOptionGroup,
    DropdownPlacement,
    DropdownSelectionChangeHandler,
    DropdownSelection,
    DropdownTriggerClickHandler,
    DropdownValue
  } from './types.js';

  export let id: string | undefined = undefined;
  export let value: DropdownSelection = '';
  export let multiselect = false;
  export let options: DropdownOption[] = [];
  export let optionGroups: DropdownOptionGroup[] | undefined = undefined;
  /** Labels for controlled values that are not present in the current search result. */
  export let selectedOptions: DropdownOption[] = [];
  export let groupsCollapsedByDefault: 'true' | 'false' | 'auto' = 'false';
  export let search = false;
  export let loadOptions: DropdownLoadOptions | undefined = undefined;
  export let searchDebounceMs = 300;
  export let searchLimit = 10;
  export let searchPlaceholder: string | undefined = undefined;
  export let language: UiLanguage = 'en_us';
  export let loadingText: string | undefined = undefined;
  export let noResultsText: string | undefined = undefined;
  export let errorText: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let placement: DropdownPlacement = 'auto';
  export let menuAlign: DropdownMenuAlign = 'left';
  export let fitViewport = true;
  export let fitContent = true;
  export let disabled = false;
  export let name: string | undefined = undefined;
  export let required = false;
  export let width: string | undefined = undefined;
  export let minWidth: string | undefined = undefined;
  export let maxWidth: string | undefined = undefined;
  export let className: string | undefined = undefined;
  export let portal = false;
  export let onChange: DropdownSelectionChangeHandler | undefined = undefined;
  export let onTriggerClick: DropdownTriggerClickHandler | undefined = undefined;

  const viewportMargin = 20;
  const menuGap = 6;
  const instanceId = ++dropdownInstanceCount;

  let open = false;
  let activeValue: DropdownValue = '';
  let dropdownElement: HTMLSpanElement | undefined;
  let buttonElement: HTMLButtonElement | undefined;
  let menuElement: HTMLDivElement | undefined;
  let resolvedPlacement: Exclude<DropdownPlacement, 'auto'> = placement === 'up' ? 'up' : 'down';
  let viewportPanelMaxHeight: string | undefined = undefined;
  let portalMenuTop = '-9999px';
  let portalMenuLeft: string | undefined = undefined;
  let portalMenuRight: string | undefined = undefined;
  let portalMenuWidth: string | undefined = undefined;
  let removeOpenViewportListeners: (() => void) | undefined = undefined;
  let removeOutsidePointerListener: (() => void) | undefined = undefined;
  let typeaheadBuffer = '';
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
  let typeaheadGeneration = 0;
  let collapsedGroupIndexes = new Set<number>();
  // Whether the current open session has already seeded auto group collapse
  // from a search response; once true, the user's manual toggles own the set.
  let searchGroupsInitialized = false;
  let searchQuery = '';
  let searchStatus: DropdownLoadStatus = 'idle';
  let searchOptions: DropdownOption[] = [];
  let searchOptionGroups: DropdownOptionGroup[] | undefined = undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchController: AbortController | undefined;
  let searchRequestId = 0;
  let searchInputElement: HTMLInputElement | undefined;
  const knownLabels = new Map<DropdownValue, string>();
  // Keep the buffer long enough for users to type multi-character aliases
  // while the menu is rendering a large option list.
  const typeaheadTimeoutMs = 1000;

  $: messages = getUiMessages(language);
  $: resolvedLoadingText = loadingText?.trim() ? loadingText : messages.dropdownSearch.loadingText;
  $: resolvedNoResultsText = noResultsText?.trim() ? noResultsText : messages.dropdownSearch.noResultsText;
  $: resolvedErrorText = errorText?.trim() ? errorText : 'Failed to load options';
  $: resolvedListboxId = id ? `${id}-listbox` : search ? `suu-dropdown-listbox-${instanceId}` : undefined;
  // Search results fully replace the instantiated options while searching;
  // outside of search mode the caller-provided options stay authoritative.
  $: renderOptions = search ? searchOptions : options;
  $: renderOptionGroups = search ? searchOptionGroups : optionGroups;
  $: resolvedOptions = renderOptionGroups === undefined ? renderOptions : renderOptionGroups.flatMap((group) => group.options);
  $: visibleOptions = renderOptionGroups === undefined
    ? renderOptions
    : renderOptionGroups.flatMap((group, groupIndex) => group.label && collapsedGroupIndexes.has(groupIndex) ? [] : group.options);
  $: trackOptionLabels(resolvedOptions);
  $: trackOptionLabels(selectedOptions);
  $: rawSelectedValues = normalizeSelectedValues(multiselect && Array.isArray(value) ? value : []);
  $: selectedValues = orderSelectedValues(resolvedOptions, rawSelectedValues);
  $: selectedValueSet = new Set(rawSelectedValues);
  $: selectedOption = Array.isArray(value) ? undefined : resolvedOptions.find((option) => option.value === value);
  $: selectedText = multiselect
    ? selectedLabelTexts(selectedValues).join(', ')
    : labelForValue(Array.isArray(value) ? '' : value);
  $: if (!open) {
    activeValue = initialActiveValue();
  }
  $: {
    placement;
    if (open) {
      enableOpenViewportTracking();
      if (multiselect || search) {
        enableOutsidePointerDismissal();
      }
      void updateViewportPanelMaxHeight();
    } else {
      disableOpenViewportTracking();
      disableOutsidePointerDismissal();
      if (search) {
        resetSearchOnClose();
      }
      resolvedPlacement = placement === 'up' ? 'up' : 'down';
      viewportPanelMaxHeight = undefined;
    }
  }

  function firstEnabledOption(): DropdownOption | undefined {
    return visibleOptions.find((option) => !option.disabled);
  }

  function normalizeSelectedValues(nextValues: DropdownMultiValue): DropdownMultiValue {
    const seen = new Set<DropdownValue>();
    const normalized: DropdownMultiValue = [];
    for (const nextValue of nextValues) {
      if (!seen.has(nextValue)) {
        seen.add(nextValue);
        normalized.push(nextValue);
      }
    }
    return normalized;
  }

  // Selected values are reported in option order, but values that are not
  // present in the current options (e.g. picked during an earlier async
  // search) are preserved at the end instead of being dropped.
  function orderSelectedValues(
    nextOptions: DropdownOption[],
    nextSelected: DropdownMultiValue
  ): DropdownMultiValue {
    const selectedSet = new Set(nextSelected);
    const ordered = nextOptions
      .filter((option) => selectedSet.has(option.value))
      .map((option) => option.value);
    const orderedSet = new Set(ordered);
    for (const nextValue of nextSelected) {
      if (!orderedSet.has(nextValue)) {
        ordered.push(nextValue);
      }
    }
    return ordered;
  }

  function trackOptionLabels(nextOptions: DropdownOption[]) {
    for (const option of nextOptions) {
      knownLabels.set(option.value, option.label);
    }
  }

  function labelForValue(nextValue: DropdownValue): string {
    const option = resolvedOptions.find((candidate) => candidate.value === nextValue);
    return option?.label ?? knownLabels.get(nextValue) ?? String(nextValue);
  }

  // Multiselect trigger text only lists values whose label is known; values
  // without one never render a raw fallback string into the trigger.
  function selectedLabelTexts(nextValues: DropdownMultiValue): string[] {
    const texts: string[] = [];
    for (const nextValue of nextValues) {
      const label =
        resolvedOptions.find((candidate) => candidate.value === nextValue)?.label ??
        knownLabels.get(nextValue);
      if (label !== undefined) {
        texts.push(label);
      }
    }
    return texts;
  }

  function initialActiveValue(): DropdownValue {
    return initialActiveValueFor(visibleOptions, resolvedOptions);
  }

  function initialActiveValueFor(
    nextVisibleOptions: DropdownOption[],
    nextResolvedOptions: DropdownOption[]
  ): DropdownValue {
    const firstSelectedEnabled = nextVisibleOptions.find(
      (option) => selectedValueSet.has(option.value) && !option.disabled
    );
    const selectedFallback = Array.isArray(value)
      ? undefined
      : nextResolvedOptions.find((option) => option.value === value);
    return firstSelectedEnabled?.value ?? selectedFallback?.value ?? nextVisibleOptions.find((option) => !option.disabled)?.value ?? '';
  }

  function isOptionSelected(option: DropdownOption): boolean {
    return multiselect ? selectedValueSet.has(option.value) : option.value === value;
  }

  function activeOptionIndex(nextActiveValue: DropdownValue): number {
    const index = visibleOptions.findIndex((option) => option.value === nextActiveValue && !option.disabled);
    if (index >= 0) {
      return index;
    }
    const fallbackIndex = visibleOptions.findIndex(
      (option) => isOptionSelected(option) && !option.disabled
    );
    if (fallbackIndex >= 0) {
      return fallbackIndex;
    }
    return visibleOptions.findIndex((option) => !option.disabled);
  }

  function moveActiveOption(offset: number) {
    const enabledOptions = visibleOptions.filter((option) => !option.disabled);
    if (enabledOptions.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, enabledOptions.findIndex((option) => option.value === activeValue));
    const nextIndex = (currentIndex + offset + enabledOptions.length) % enabledOptions.length;
    activeValue = enabledOptions[nextIndex]?.value ?? activeValue;
    scrollActiveOptionIntoView();
  }

  function clearTypeaheadBuffer() {
    typeaheadBuffer = '';
    typeaheadGeneration += 1;
    if (typeaheadTimer !== undefined) {
      clearTimeout(typeaheadTimer);
      typeaheadTimer = undefined;
    }
  }

  function scheduleTypeaheadReset() {
    const generation = ++typeaheadGeneration;
    if (typeaheadTimer !== undefined) {
      clearTimeout(typeaheadTimer);
    }
    typeaheadTimer = setTimeout(() => {
      if (generation !== typeaheadGeneration) {
        return;
      }
      typeaheadBuffer = '';
      typeaheadTimer = undefined;
    }, typeaheadTimeoutMs);
  }

  function scrollActiveOptionIntoView() {
    void tick().then(() => {
      if (!open || typeof document === 'undefined') {
        return;
      }
      const activeElement = Array.from(
        menuElement?.querySelectorAll<HTMLElement>('.suu-dropdown__option') ?? []
      ).find((element) => element.dataset.value === String(activeValue));
      activeElement?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  function normalizeTypeaheadKey(key: string): string {
    return key.startsWith('Key') && key.length === 4
      ? key.slice(3).toLocaleLowerCase()
      : key.toLocaleLowerCase();
  }

  function handleTypeahead(key: string) {
    const normalizedKey = normalizeTypeaheadKey(key);
    const nextBuffer = `${typeaheadBuffer}${normalizedKey}`;
    const findMatch = (prefix: string) =>
      visibleOptions.find(
        (option) =>
          !option.disabled &&
          [option.searchText, option.label]
            .filter((text): text is string => text !== undefined)
            .some((text) => text.toLocaleLowerCase().startsWith(prefix))
      );
    const match = findMatch(nextBuffer) ?? findMatch(normalizedKey);

    typeaheadBuffer = match ? (findMatch(nextBuffer) ? nextBuffer : normalizedKey) : nextBuffer;
    scheduleTypeaheadReset();
    if (!match) {
      return;
    }

    if (!open) {
      openMenu();
    }
    activeValue = match.value;
    scrollActiveOptionIntoView();
  }

  function selectOption(option: DropdownOption) {
    if (option.disabled) {
      return;
    }
    activeValue = option.value;
    if (multiselect) {
      const nextSelected = new Set(selectedValues);
      if (nextSelected.has(option.value)) {
        nextSelected.delete(option.value);
      } else {
        nextSelected.add(option.value);
      }
      const nextValues = orderSelectedValues(resolvedOptions, [...nextSelected]);
      clearTypeaheadBuffer();
      void (onChange as DropdownMultiChangeHandler | undefined)?.(nextValues);
      return;
    }

    open = false;
    clearTypeaheadBuffer();
    void (onChange as DropdownChangeHandler | undefined)?.(option.value);
    buttonElement?.focus();
  }

  function clampSearchLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return 10;
    }
    return Math.min(50, Math.max(1, Math.floor(limit)));
  }

  function clearSearchTimer() {
    if (searchTimer !== undefined) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }
  }

  function abortSearchController() {
    if (searchController !== undefined) {
      searchController.abort();
      searchController = undefined;
    }
  }

  function scheduleSearch(query: string) {
    clearSearchTimer();
    searchTimer = setTimeout(() => {
      searchTimer = undefined;
      void runSearch(query);
    }, Math.max(0, Math.floor(searchDebounceMs)));
  }

  async function runSearch(query: string) {
    if (!search || loadOptions === undefined) {
      return;
    }
    abortSearchController();
    const currentRequestId = ++searchRequestId;
    const controller = new AbortController();
    searchController = controller;
    searchStatus = 'loading';

    try {
      const result = await loadOptions(query, {
        limit: clampSearchLimit(searchLimit),
        signal: controller.signal
      });
      // Stale or cancelled responses must never touch the UI.
      if (controller.signal.aborted || currentRequestId !== searchRequestId) {
        return;
      }
      searchStatus = 'success';
      applySearchResult(result ?? {});
    } catch {
      if (controller.signal.aborted || currentRequestId !== searchRequestId) {
        return;
      }
      searchOptions = [];
      searchOptionGroups = undefined;
      searchStatus = 'error';
    } finally {
      if (searchController === controller) {
        searchController = undefined;
      }
    }
  }

  function applySearchResult(result: DropdownLoadOptionsResult) {
    // optionGroups is the sole render source when present; empty groups stay hidden.
    const groups = Array.isArray(result.optionGroups)
      ? result.optionGroups.filter((group) => Array.isArray(group.options) && group.options.length > 0)
      : undefined;
    searchOptionGroups = groups;
    searchOptions = groups === undefined && Array.isArray(result.options) ? result.options : [];
    // Only the first valid grouped response of an open session seeds the auto
    // collapse state; later responses just swap groups so manual collapse and
    // expand choices survive query refreshes within the same session.
    if (!searchGroupsInitialized && groups !== undefined && groups.length > 0) {
      searchGroupsInitialized = true;
      initializeCollapsedGroups(groups);
    }
    const nextResolvedOptions = groups === undefined ? searchOptions : groups.flatMap((group) => group.options);
    const nextVisibleOptions = groups === undefined
      ? searchOptions
      : groups.flatMap((group, groupIndex) => group.label && collapsedGroupIndexes.has(groupIndex) ? [] : group.options);
    activeValue = initialActiveValueFor(nextVisibleOptions, nextResolvedOptions);
    scrollActiveOptionIntoView();
  }

  function resetSearchOnClose() {
    clearSearchTimer();
    abortSearchController();
    searchQuery = '';
    searchOptions = [];
    searchOptionGroups = undefined;
    searchStatus = 'idle';
  }

  function beginSearchOnOpen() {
    searchQuery = '';
    searchOptions = [];
    searchOptionGroups = undefined;
    collapsedGroupIndexes = new Set();
    searchGroupsInitialized = false;
    clearSearchTimer();
    abortSearchController();
    if (loadOptions === undefined) {
      searchStatus = 'idle';
      return;
    }
    // The empty query fires immediately on every expand.
    void runSearch('');
  }

  function openMenu() {
    updateResolvedPlacement();
    if (search) {
      beginSearchOnOpen();
    } else {
      initializeCollapsedGroups(renderOptionGroups);
    }
    open = true;
    activeValue = initialActiveValue();
    if (search) {
      void tick().then(() => {
        searchInputElement?.focus();
      });
    }
  }

  function toggleOpen() {
    if (disabled) {
      return;
    }
    clearTypeaheadBuffer();
    if (!open) {
      openMenu();
      return;
    }
    open = false;
    activeValue = initialActiveValue();
  }

  function isGroupCollapsed(groupIndex: number): boolean {
    return collapsedGroupIndexes.has(groupIndex);
  }

  function initializeCollapsedGroups(nextOptionGroups: DropdownOptionGroup[] | undefined) {
    if (nextOptionGroups === undefined || groupsCollapsedByDefault === 'false') {
      collapsedGroupIndexes = new Set();
      return;
    }
    if (groupsCollapsedByDefault === 'true') {
      collapsedGroupIndexes = new Set(
        nextOptionGroups.flatMap((group, index) => group.label ? [index] : [])
      );
      return;
    }
    collapsedGroupIndexes = new Set(
      nextOptionGroups.flatMap((group, index) =>
        group.label && group.options.some((option) => isOptionSelected(option)) ? [] : group.label ? [index] : []
      )
    );
  }

  function toggleGroup(groupIndex: number) {
    const next = new Set(collapsedGroupIndexes);
    if (next.has(groupIndex)) next.delete(groupIndex);
    else next.add(groupIndex);
    collapsedGroupIndexes = next;
  }

  function handleTriggerClick(event: MouseEvent) {
    onTriggerClick?.(event);
    toggleOpen();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (disabled) {
      return;
    }

    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        open = false;
      }
      clearTypeaheadBuffer();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openMenu();
      }
      moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (
      ((event.key.length === 1 && event.key !== ' ') ||
        (event.key.startsWith('Key') && event.key.length === 4)) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (search) {
        const wasOpen = open;
        if (!wasOpen) {
          openMenu();
        }
        searchQuery = wasOpen ? `${searchQuery}${normalizeTypeaheadKey(event.key)}` : normalizeTypeaheadKey(event.key);
        scheduleSearch(searchQuery);
        return;
      }
      handleTypeahead(event.key);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const index = activeOptionIndex(activeValue);
      const option = index >= 0 ? visibleOptions[index] : undefined;
      if (option) {
        selectOption(option);
      }
    }
  }

  function handleSearchInput(event: Event) {
    searchQuery = (event.currentTarget as HTMLInputElement).value;
    scheduleSearch(searchQuery);
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
      buttonElement?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const index = activeOptionIndex(activeValue);
      const option = index >= 0 ? visibleOptions[index] : undefined;
      if (option) {
        selectOption(option);
      }
    }
  }

  function handleFocusout(event: FocusEvent) {
    const nextTarget = event.relatedTarget;
    if (portal && nextTarget instanceof Node && menuElement?.contains(nextTarget)) {
      return;
    }
    if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    open = false;
  }

  function isTriggerInViewport() {
    if (typeof window === 'undefined') {
      return true;
    }

    const rect = dropdownElement?.getBoundingClientRect();
    if (!rect) {
      return true;
    }

    if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.right === 0 && rect.bottom === 0 && rect.left === 0) {
      return true;
    }

    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  function updateResolvedPlacement(rect = dropdownElement?.getBoundingClientRect()) {
    if (placement !== 'auto') {
      resolvedPlacement = placement;
      return;
    }
    if (!rect || typeof window === 'undefined') {
      resolvedPlacement = 'down';
      return;
    }

    const availableAbove = rect.top - viewportMargin - menuGap;
    const availableBelow = window.innerHeight - rect.bottom - viewportMargin - menuGap;
    resolvedPlacement = availableBelow >= availableAbove ? 'down' : 'up';
  }

  async function updateViewportPanelMaxHeight() {
    await tick();

    if (!open || typeof window === 'undefined') {
      return;
    }

    if (!isTriggerInViewport()) {
      open = false;
      return;
    }

    const rect = dropdownElement?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    updateResolvedPlacement(rect);
    if (!fitViewport) {
      updatePortalPosition(rect);
      return;
    }

    const available =
      resolvedPlacement === 'up'
        ? rect.top - viewportMargin - menuGap
        : window.innerHeight - rect.bottom - viewportMargin - menuGap;
    viewportPanelMaxHeight = `${Math.max(0, Math.floor(available))}px`;
    // Portal menus are moved under document.body, so the reactive style
    // binding on the original root cannot reach them before this measurement.
    // Apply the value directly first; otherwise the first upward open can
    // measure the fallback 100vh height and place the menu above the viewport.
    menuElement?.style.setProperty('--suu-dropdown-panel-max-height', viewportPanelMaxHeight);
    updatePortalPosition(rect);
  }

  function updatePortalPosition(rect: DOMRect) {
    if (!portal || typeof window === 'undefined') {
      return;
    }

    const menuHeight = menuElement?.getBoundingClientRect().height ?? 0;
    portalMenuTop = `${Math.round(
      resolvedPlacement === 'up' ? rect.top - menuHeight - menuGap : rect.bottom + menuGap
    )}px`;
    if (menuAlign === 'right') {
      portalMenuLeft = undefined;
      portalMenuRight = `${Math.round(window.innerWidth - rect.right)}px`;
    } else {
      portalMenuLeft = `${Math.round(rect.left)}px`;
      portalMenuRight = undefined;
    }
    portalMenuWidth = fitContent ? undefined : `${Math.round(rect.width)}px`;
  }

  function portalMenu(node: HTMLDivElement, enabled: boolean) {
    if (enabled && typeof document !== 'undefined') {
      document.body.appendChild(node);
    }
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }

  function enableOpenViewportTracking() {
    if (removeOpenViewportListeners || typeof window === 'undefined') {
      return;
    }

    const handleViewportChange = () => {
      void updateViewportPanelMaxHeight();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    removeOpenViewportListeners = () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      removeOpenViewportListeners = undefined;
    };
  }

  function disableOpenViewportTracking() {
    removeOpenViewportListeners?.();
  }

  function enableOutsidePointerDismissal() {
    if (removeOutsidePointerListener || typeof document === 'undefined') {
      return;
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (dropdownElement?.contains(target) || menuElement?.contains(target)) {
        return;
      }
      open = false;
      if (search) {
        buttonElement?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer, true);
    removeOutsidePointerListener = () => {
      document.removeEventListener('pointerdown', handleOutsidePointer, true);
      removeOutsidePointerListener = undefined;
    };
  }

  function disableOutsidePointerDismissal() {
    removeOutsidePointerListener?.();
  }

  onDestroy(() => {
    disableOpenViewportTracking();
    disableOutsidePointerDismissal();
    clearTypeaheadBuffer();
    clearSearchTimer();
    abortSearchController();
  });
</script>

<span
  bind:this={dropdownElement}
  class={[
    'suu-dropdown',
    multiselect ? 'suu-dropdown--multiselect' : '',
    search ? 'suu-dropdown--search' : '',
    width !== undefined || minWidth !== undefined || maxWidth !== undefined
      ? 'suu-dropdown--sized'
      : '',
    className ?? ''
  ].filter(Boolean).join(' ')}
  style:--suu-dropdown-panel-max-height={viewportPanelMaxHeight}
  style:width
  style:min-width={minWidth}
  style:max-width={maxWidth}
  on:focusout={handleFocusout}
>
  <button
    bind:this={buttonElement}
    {id}
    type="button"
    class="suu-dropdown__button"
    {disabled}
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    data-value={Array.isArray(value) ? value.map(String).join(',') : String(value)}
    on:click={handleTriggerClick}
    on:keydown={handleKeydown}
  >
    <span class="suu-dropdown__label">{selectedText}</span>
    <span class="suu-dropdown__chevron" aria-hidden="true"></span>
  </button>

  {#if name !== undefined && !multiselect}
    <input
      class="suu-visually-hidden"
      type="text"
      name={name}
      value={String(value)}
      required={required}
      disabled={disabled}
      tabindex="-1"
      aria-label={ariaLabel}
    />
  {/if}

  {#if open}
    <div
      bind:this={menuElement}
      use:portalMenu={portal}
      class="suu-dropdown__menu"
      class:suu-dropdown__menu--portal={portal}
      class:suu-dropdown__menu--up={resolvedPlacement === 'up'}
      class:suu-dropdown__menu--down={resolvedPlacement === 'down'}
      class:suu-dropdown__menu--left={menuAlign === 'left'}
      class:suu-dropdown__menu--right={menuAlign === 'right'}
      class:suu-dropdown__menu--fit-content={fitContent}
      style:--suu-dropdown-menu-top={portalMenuTop}
      style:--suu-dropdown-menu-left={portalMenuLeft}
      style:--suu-dropdown-menu-right={portalMenuRight}
      style:--suu-dropdown-menu-width={portalMenuWidth}
      style:--suu-dropdown-panel-max-height={viewportPanelMaxHeight}
    >
      {#if search}
        <div class="suu-dropdown__search">
          <svg class="suu-dropdown__search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m16 16 4 4"></path>
          </svg>
          <input
            bind:this={searchInputElement}
            class="suu-dropdown__search-input"
            type="text"
            value={searchQuery}
            placeholder={searchPlaceholder ?? ''}
            aria-label={ariaLabel}
            autocomplete="off"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={resolvedListboxId}
            on:input={handleSearchInput}
            on:keydown={handleSearchKeydown}
          />
        </div>
      {/if}
      <div
        class="suu-dropdown__panel"
        id={resolvedListboxId}
        role="listbox"
        aria-label={ariaLabel}
        aria-multiselectable={multiselect || undefined}
      >
        {#if search && searchStatus === 'loading'}
          <div class="suu-dropdown__status suu-dropdown__status--loading" aria-live="polite">
            <span class="suu-dropdown__spinner" aria-hidden="true"></span>
            <span>{resolvedLoadingText}</span>
          </div>
        {:else if search && searchStatus === 'error'}
          <div class="suu-dropdown__status suu-dropdown__status--error" role="alert">{resolvedErrorText}</div>
        {:else if search && resolvedOptions.length === 0}
          <div class="suu-dropdown__status suu-dropdown__status--empty">{resolvedNoResultsText}</div>
        {:else if renderOptionGroups === undefined}
          {#each renderOptions as option}
            <button
              type="button"
              class="suu-dropdown__option"
              class:suu-dropdown__option--active={option.value === activeValue}
              class:suu-dropdown__option--disabled={option.disabled}
              role="option"
              aria-selected={multiselect ? selectedValueSet.has(option.value) : option.value === value}
              aria-disabled={option.disabled}
              disabled={option.disabled}
              data-value={String(option.value)}
              on:mousedown|preventDefault={() => undefined}
              on:mouseenter={() => {
                if (!option.disabled) {
                  activeValue = option.value;
                }
              }}
              on:click={() => selectOption(option)}
            >
              {#if multiselect}
                <span
                  class="suu-dropdown__checkbox"
                  data-checked={multiselect ? selectedValueSet.has(option.value) : option.value === value}
                  aria-hidden="true"
                ></span>
              {/if}
              <span class="suu-dropdown__label">{option.label}</span>
            </button>
          {/each}
        {:else}
          {#each renderOptionGroups as group, groupIndex}
            <div class="suu-dropdown__group" role="group" aria-label={group.label}>
              {#if group.label}
                <button
                  type="button"
                  class="suu-dropdown__group-label"
                  aria-expanded={!collapsedGroupIndexes.has(groupIndex)}
                  on:click|stopPropagation={() => toggleGroup(groupIndex)}
                >
                  <span>{group.label}</span>
                  <span class="suu-dropdown__group-chevron" aria-hidden="true"></span>
                </button>
              {/if}
              {#if !group.label || !collapsedGroupIndexes.has(groupIndex)}
                {#each group.options as option, optionIndex}
                <button
                  type="button"
                  class="suu-dropdown__option"
                  class:suu-dropdown__option--group-first={Boolean(group.label) && optionIndex === 0}
                  class:suu-dropdown__option--active={option.value === activeValue}
                  class:suu-dropdown__option--disabled={option.disabled}
                  role="option"
                  aria-selected={multiselect ? selectedValueSet.has(option.value) : option.value === value}
                  aria-disabled={option.disabled}
                  disabled={option.disabled}
                  data-value={String(option.value)}
                  on:mousedown|preventDefault={() => undefined}
                  on:mouseenter={() => {
                    if (!option.disabled) {
                      activeValue = option.value;
                    }
                  }}
                  on:click={() => selectOption(option)}
                >
                  {#if multiselect}
                    <span
                      class="suu-dropdown__checkbox"
                      data-checked={multiselect ? selectedValueSet.has(option.value) : option.value === value}
                      aria-hidden="true"
                    ></span>
                  {/if}
                  <span class="suu-dropdown__label">{option.label}</span>
                </button>
                {/each}
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</span>
