<svelte:options runes={false} />

<script context="module" lang="ts">
  let dropdownInstanceCount = 0;
</script>

<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { getUiMessages, type UiLanguage } from '../i18n.js';
  import type {
    DropdownChangeHandler,
    DropdownInputStyle,
    DropdownItemLabelGetter,
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
    DropdownSearchChangeHandler,
    DropdownSelection,
    DropdownTriggerClickHandler,
    DropdownValue,
    DropdownVerticalAlign
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
  export let inputStyle: DropdownInputStyle = 'dropdown';
  export let getItemLabel: DropdownItemLabelGetter = (option) => option.label;
  export let loadOptions: DropdownLoadOptions | undefined = undefined;
  export let searchDebounceMs = 300;
  /** 单次搜索返回的选项上限；默认 50，传入更大值时不再受源码硬上限约束。 */
  export let searchLimit = 50;
  export let searchPlaceholder: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  /** Collapsed trigger summary text (e.g. a selection count); blank keeps the default labels. */
  export let triggerText: string | undefined = undefined;
  export let language: UiLanguage = 'en_us';
  export let loadingText: string | undefined = undefined;
  export let noResultsText: string | undefined = undefined;
  export let errorText: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let placement: DropdownPlacement = 'auto';
  export let menuAlign: DropdownMenuAlign = 'left';
  // Center is the historical layout; the modifier classes only exist for the
  // non-default values so existing consumers never see a class change.
  export let verticalAlign: DropdownVerticalAlign = 'center';
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
  export let onSearchChange: DropdownSearchChangeHandler | undefined = undefined;
  export let onTriggerClick: DropdownTriggerClickHandler | undefined = undefined;

  const viewportMargin = 20;
  const menuGap = 4;
  // The menu overhangs the trigger horizontally so its edges break from the
  // host layout's lines (table column borders, adjacent inputs) and read as an
  // independent floating layer instead of a continuation of the grid.
  const menuOutset = 4;
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
  // 在受控 value 尚未响应 onChange 时保留用户当前输入，避免
  // selectedText 的旧值在同一轮更新中覆盖输入框内容。
  let inputDraft: string | undefined;
  // 受控 value 的就地协调：记录组件刚通过 onChange 上报的选中/偏离变更。
  // 消费者把它回传时按 slot 消费；只有对不上的受控变更才视为真正的外部替换。
  // 两个单用途 echo slot，避免输入偏离覆盖待回传的选中变更：
  // - selection echo 持久到被消费 / 被新的选中覆盖 / 外部重置；
  // - divergence echo 只服务同步同 flush 回传，由自己的 generation + microtask
  //   过期，且不会触碰 selection slot。
  let pendingSelectionEcho: DropdownSelection | undefined = undefined;
  // selectOption 写入的乐观标签草稿。只有它仍是当前 inputDraft 时，selection
  // echo 被消费后才能释放，避免误清用户在回传前继续输入的新文本。
  let pendingSelectionDraft: string | undefined = undefined;
  let pendingDivergenceEcho: DropdownValue | undefined = undefined;
  let divergenceEchoGeneration = 0;
  let observedControlledValue: DropdownSelection | undefined = undefined;
  let controlledStateObserved = false;
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

  $: inputMode = search && inputStyle === 'input';
  // 受控 value/selectedItem 变化时就地协调，而不是让宿主重建组件：
  // - 回传我们自己刚上报的值（selection/divergence slot）→ 保留 draft/query/焦点；
  // - 真正的外部替换 → 重置 searchQuery/results/draft 并收起菜单。
  // 顺序约束（legacy 响应式同轮只按声明/依赖序执行一次，靠前的语句不会回头重算）：
  // 1) 本块必须排在 renderOptions/resolvedOptions/selectedText 之前：外部替换
  //    同步清空 searchOptions 与 knownLabels 后，这些派生语句才能在本轮读到
  //    新状态（否则 selectedText 会用旧标签算完并一直保留）；
  // 2) 本块必须排在 inputDisplayValue 之前：重置要在本轮立刻反映到显示值。
  $: {
    if (!controlledStateObserved) {
      controlledStateObserved = true;
      observedControlledValue = value;
    } else {
      const valueChanged = !sameDropdownSelection(observedControlledValue, value);
      // selectedOptions 后到只改善标签解析；只有 value 变化才可能是外部替换。
      // 单独的 selectedOptions 变化绝不能触发重置，否则会强关菜单并清掉 draft。
      observedControlledValue = value;
      if (valueChanged && inputMode && !multiselect) {
        const selectionMatched =
          pendingSelectionEcho !== undefined &&
          sameDropdownSelection(pendingSelectionEcho, value);
        const divergenceMatched =
          pendingDivergenceEcho !== undefined &&
          sameDropdownSelection(pendingDivergenceEcho, value);
        if (selectionMatched || divergenceMatched) {
          if (selectionMatched) {
            // selection 回传消费后释放乐观标签 draft，让 canonical label 经
            // selectedText / selectedOptions / knownLabels 接管显示。
            pendingSelectionEcho = undefined;
            if (pendingSelectionDraft !== undefined && inputDraft === pendingSelectionDraft) {
              inputDraft = undefined;
            }
            pendingSelectionDraft = undefined;
          }
          // divergence 回传必须保留用户当前的部分输入文本。
          if (divergenceMatched) {
            pendingDivergenceEcho = undefined;
          }
        } else {
          resetControlledSearchState();
        }
      }
    }
  }
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
    : displayLabelForValue(Array.isArray(value) ? '' : value, selectedOptions);
  // triggerText lets the caller summarize the collapsed button (e.g. "3
  // selected") instead of the joined labels; a blank value keeps the default
  // logic so existing consumers never see a behavior change.
  $: buttonLabelText = triggerText?.trim() ? triggerText : selectedText || placeholder || '';
  $: inputDisplayValue = inputMode
    ? (inputDraft ?? (searchQuery || (multiselect ? '' : selectedText)))
    : '';
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

  // nextSelectedOptions 显式传入（而不是只从闭包读取 selectedOptions），
  // 让 selectedText 的响应式语句把 selectedOptions 记为静态依赖：宿主的
  // selectedItem 异步解析后即便 value 未变，也能重新解析并显示标签。
  function displayLabelForValue(
    nextValue: DropdownValue,
    nextSelectedOptions: DropdownOption[] = selectedOptions
  ): string {
    const option = resolvedOptions.find((candidate) => candidate.value === nextValue) ??
      nextSelectedOptions.find((candidate) => candidate.value === nextValue);
    return option ? getItemLabel(option) : labelForValue(nextValue);
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
        const option = resolvedOptions.find((candidate) => candidate.value === nextValue) ??
          selectedOptions.find((candidate) => candidate.value === nextValue);
        texts.push(option ? getItemLabel(option) : label);
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

    if (inputMode) {
      inputDraft = getItemLabel(option);
    }
    if (search) {
      // 选中即结束本次搜索会话：清掉查询与结果，否则关闭块在 echo 消费并
      // 释放 draft 后会以 searchQuery 回退值把旧查询片段重新显示出来。
      clearSearchTimer();
      abortSearchController();
      searchQuery = '';
      searchOptions = [];
      searchOptionGroups = undefined;
      searchStatus = 'idle';
    }
    open = false;
    clearTypeaheadBuffer();
    emitSingleSelectionChange(option.value, 'selection');
    buttonElement?.focus();
  }

  function sameDropdownSelection(
    left: DropdownSelection | undefined,
    right: DropdownSelection
  ): boolean {
    if (Array.isArray(left) || Array.isArray(right)) {
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((nextValue, index) => nextValue === right[index])
      );
    }
    return left === right;
  }

  // 单值变更统一从这里上报，并记录已上报值供受控回传判别使用。
  // echo 生命周期按 **emit 来源** 分类，而不是按值本身（空字符串是合法的选项
  // value，例如 “全部/不限” 哨兵项，不能与输入偏离混淆）：
  // - divergence（handleSearchInput 的输入偏离清选）：只可能被同步同 flush 的
  //   回传消费（真实 UserSearchDropdown 在 onSearchChange 中同步清空受控选择）。
  //   当前 flush 结束后仍未消费即失效，与菜单开闭无关——否则菜单保持打开时，
  //   残留的偏离 echo 会吞掉宿主随后的独立外部清空。
  // - selection（selectOption 的真实选中，含 value === '' 的选项）：onChange 契约
  //   允许异步回传（消费者可能在 await/setTimeout 后写回 value），因此不主动
  //   过期；它只能被新的上报、回传消费或外部替换重置覆盖。边界：宿主“外部设置
  //   成与残留选中 echo 完全相同的 value”在受控 props 上与合法异步回写在语义上
  //   不可区分，按回传处理。
  // 过期边界必须在调用消费者之前登记：这里直接用 queueMicrotask 抢占
  // microtask 队首（tick 的 `await Promise.resolve()` 还要再晚一个 hop，会让
  // “await 一个 microtask 后才回写”的宿主抢先消费 echo）。同步同 flush 回写
  // 不受影响：触发本次输入更新的 Svelte flush 在该 microtask 之前已经入队/
  // 执行，协调块仍能看到 echo 并消费。
  function emitSingleSelectionChange(
    nextValue: DropdownValue,
    source: 'selection' | 'divergence'
  ) {
    if (onChange === undefined) {
      return;
    }
    if (source === 'selection') {
      // 新选中覆盖旧的 selection slot；输入偏离不会清掉它（C02）。
      pendingSelectionEcho = nextValue;
      pendingSelectionDraft = inputDraft;
    } else {
      pendingDivergenceEcho = nextValue;
      divergenceEchoGeneration += 1;
      const generation = divergenceEchoGeneration;
      queueMicrotask(() => {
        if (generation === divergenceEchoGeneration && pendingDivergenceEcho !== undefined) {
          pendingDivergenceEcho = undefined;
        }
      });
    }
    void (onChange as DropdownChangeHandler)(nextValue);
  }

  function clampSearchLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return 50;
    }
    return Math.max(1, Math.floor(limit));
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
      applySearchResult(result ?? {}, query);
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

  function mergeSelectedOptions(options: DropdownOption[]): DropdownOption[] {
    const merged = [...options];
    const seen = new Set(options.map((option) => option.value));
    for (const option of selectedOptions) {
      if (!seen.has(option.value)) {
        merged.push(option);
        seen.add(option.value);
      }
    }
    return merged;
  }

  function applySearchResult(result: DropdownLoadOptionsResult, query = '') {
    // optionGroups is the sole render source when present; empty groups stay hidden.
    const groups = Array.isArray(result.optionGroups)
      ? result.optionGroups.filter((group) => Array.isArray(group.options) && group.options.length > 0)
      : undefined;
    if (groups !== undefined) {
      if (query.trim()) {
        searchOptionGroups = groups;
      } else {
        const groupedOptions = groups.flatMap((group) => group.options);
        const groupedValues = new Set(groupedOptions.map((option) => option.value));
        const missingSelected = selectedOptions.filter((option) => !groupedValues.has(option.value));
        searchOptionGroups = missingSelected.length ? [...groups, { options: missingSelected }] : groups;
      }
      searchOptions = [];
    } else {
      searchOptionGroups = undefined;
      searchOptions = query.trim() ? (Array.isArray(result.options) ? result.options : []) : mergeSelectedOptions(Array.isArray(result.options) ? result.options : []);
    }
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
    if (inputMode && !multiselect) {
      // 单值输入模式下菜单收起只清理菜单结果与搜索状态，输入框保留用户
      // 当前文本（自由文本搜索），不要回退到旧的 selectedText。
      // 多选 inputMode 保持基线语义：关闭即清空查询与 draft（chips 由 value 渲染）。
      const hadDraft = inputDraft !== undefined || searchQuery !== '';
      if (hadDraft) {
        inputDraft = inputDraft ?? searchQuery;
      }
      searchQuery = '';
    } else {
      searchQuery = '';
      inputDraft = undefined;
    }
    searchOptions = [];
    searchOptionGroups = undefined;
    searchStatus = 'idle';
  }

  // beginSearchOnOpen 与 resetControlledSearchState 共享的搜索会话清理核心。
  // resetSearchOnClose 不能复用：它必须先捕获 draft 回退值再清空 searchQuery。
  function resetSearchSession() {
    clearSearchTimer();
    abortSearchController();
    searchQuery = '';
    inputDraft = undefined;
    searchOptions = [];
    searchOptionGroups = undefined;
    collapsedGroupIndexes = new Set();
    searchGroupsInitialized = false;
  }

  // 受控变更代表真正的外部替换/清空选择时，内部搜索状态必须回到初始态，
  // 避免旧 draft、旧结果、在途请求或上一数据源的标签记忆泄漏到新的选择上。
  function resetControlledSearchState() {
    resetSearchSession();
    pendingSelectionEcho = undefined;
    pendingSelectionDraft = undefined;
    pendingDivergenceEcho = undefined;
    searchStatus = 'idle';
    knownLabels.clear();
    open = false;
  }

  function beginSearchOnOpen() {
    resetSearchSession();
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
    if (search && !inputMode) {
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
        // 菜单打开时 Escape 只收起菜单：preventDefault 阻断浏览器对宿主 modal dialog 的
        // close request，stopPropagation 阻断冒泡到宿主弹窗的键盘监听，避免菜单与弹窗一起被关闭。
        event.preventDefault();
        event.stopPropagation();
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
        void onSearchChange?.(searchQuery);
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
    const nextQuery = (event.currentTarget as HTMLInputElement).value;
    inputDraft = nextQuery;
    if (inputMode && !multiselect && value !== '' && nextQuery !== selectedText) {
      emitSingleSelectionChange('', 'divergence');
    }
    searchQuery = nextQuery;
    if (inputMode) {
      if (nextQuery.trim()) {
        if (!open) {
          updateResolvedPlacement();
          open = true;
          activeValue = initialActiveValue();
        }
      } else {
        open = false;
      }
    }
    void onSearchChange?.(searchQuery);
    scheduleSearch(searchQuery);
  }

  function handleInputFocus() {
    // 输入模式下聚焦只准备输入；用户输入有效搜索词后才展开结果。
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      // 与触发按钮的 Escape 分支一致：收起菜单时阻断默认行为与冒泡，宿主弹窗不被连带关闭。
      event.preventDefault();
      event.stopPropagation();
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

  function handleMenuKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') {
      return;
    }
    // 焦点位于菜单内选项或分组折叠按钮时（这些元素自身没有键盘监听），
    // Escape 同样只收起菜单：阻断默认 close request 与冒泡，防止宿主 modal dialog 一并关闭。
    event.preventDefault();
    event.stopPropagation();
    open = false;
    buttonElement?.focus();
  }

  // panel 自身不可聚焦（焦点在选项按钮上流转），容器级 Escape 拦截用 action 挂载，
  // 避免编译器把 listbox 容器误判为需要 tabindex 的可聚焦元素。
  function menuEscapeGuard(node: HTMLElement) {
    node.addEventListener('keydown', handleMenuKeydown);
    return {
      destroy() {
        node.removeEventListener('keydown', handleMenuKeydown);
      }
    };
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

  // The panel is only part of the menu: the search box and the menu borders
  // also consume viewport budget. When the whole budget goes to the panel, the
  // total menu grows taller than the available space and an upward portal menu
  // computes a negative top that escapes the viewport. The difference between
  // the rendered menu and its panel is exactly that non-panel chrome, whatever
  // the current max-height is.
  function measureMenuChromeHeight(menu: HTMLElement): number {
    if (typeof window === 'undefined') {
      return 0;
    }
    const panelElement = menu.querySelector<HTMLElement>('.suu-dropdown__panel');
    if (!panelElement) {
      return 0;
    }
    return Math.max(
      0,
      menu.getBoundingClientRect().height - panelElement.getBoundingClientRect().height
    );
  }

  // The single source of the panel height budget. Writes both the reactive
  // style binding value and the inline property itself: the binding only lands
  // on the next flush, while callers that measure the menu right after this
  // call (portal placement, host-side repositioning) need the final height
  // immediately.
  function applyViewportFit(menu: HTMLElement, rect: DOMRect) {
    updateResolvedPlacement(rect);
    if (!fitViewport) {
      return;
    }
    const available =
      resolvedPlacement === 'up'
        ? rect.top - viewportMargin - menuGap
        : window.innerHeight - rect.bottom - viewportMargin - menuGap;
    const availablePanelHeight = available - measureMenuChromeHeight(menu);
    viewportPanelMaxHeight = `${Math.max(0, Math.floor(availablePanelHeight))}px`;
    menu.style.setProperty('--suu-dropdown-panel-max-height', viewportPanelMaxHeight);
  }

  // The panel max-height used to be written one tick after the menu mounted.
  // Hosts that reposition the menu (e.g. fixed-position overlays driven by a
  // MutationObserver) measure the menu inside that microtask window and lock in
  // the unclamped height, so the shrunken menu ends up misplaced. Settling the
  // height synchronously at mount makes every later measurement final.
  function mountViewportFit(node: HTMLDivElement) {
    if (fitViewport && open && typeof window !== 'undefined') {
      const rect = dropdownElement?.getBoundingClientRect();
      if (rect) {
        applyViewportFit(node, rect);
      }
    }
    return {};
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

    if (menuElement) {
      applyViewportFit(menuElement, rect);
    }
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
      portalMenuRight = `${Math.max(0, Math.round(window.innerWidth - rect.right - menuOutset))}px`;
    } else {
      portalMenuLeft = `${Math.max(0, Math.round(rect.left - menuOutset))}px`;
      portalMenuRight = undefined;
    }
    portalMenuWidth = `${Math.round(rect.width + menuOutset * 2)}px`;
  }

  function portalMenu(node: HTMLDivElement, enabled: boolean) {
    let resizeObserver: ResizeObserver | undefined;

    function hideMenuPopover() {
      if (typeof node.hidePopover !== 'function') {
        return;
      }
      try {
        node.hidePopover();
      } catch {
        // The menu never entered the top layer; hiding is already done.
      }
    }

    if (enabled && typeof document !== 'undefined') {
      // Keep the menu inside the component tree and lift it into the top layer
      // instead of moving it under document.body: body-mounted nodes stay inert
      // behind a modal <dialog>, even when they are promoted to a popover.
      if (typeof node.showPopover === 'function') {
        node.setAttribute('popover', 'manual');
        node.showPopover();
      }
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (open) void updateViewportPanelMaxHeight();
        });
        resizeObserver.observe(node);
      }
    }
    return {
      destroy() {
        resizeObserver?.disconnect();
        hideMenuPopover();
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
    verticalAlign !== 'center' ? `suu-dropdown--valign-${verticalAlign}` : '',
    className ?? ''
  ].filter(Boolean).join(' ')}
  style:--suu-dropdown-panel-max-height={viewportPanelMaxHeight}
  style:width
  style:min-width={minWidth}
  style:max-width={maxWidth}
  on:focusout={handleFocusout}
>
  {#if inputMode}
    {#if multiselect && selectedValues.length > 0}
      <div class="suu-dropdown__selected-items">
        {#each selectedValues as selectedValue}
          {@const selectedOption = resolvedOptions.find((option) => option.value === selectedValue) ?? selectedOptions.find((option) => option.value === selectedValue)}
          {#if selectedOption}
            <span class="suu-dropdown__selected-item">
              <span>{getItemLabel(selectedOption)}</span>
              <button
                type="button"
                class="suu-dropdown__selected-remove"
                aria-label={`Remove ${getItemLabel(selectedOption)}`}
                on:mousedown|preventDefault
                on:click={() => selectOption(selectedOption)}
              >×</button>
            </span>
          {/if}
        {/each}
      </div>
    {/if}
    <div class="suu-dropdown__input-field">
      <input
        bind:this={searchInputElement}
        {id}
        class="suu-dropdown__input"
        type="text"
        value={inputDisplayValue}
        placeholder={searchPlaceholder ?? placeholder ?? ''}
        aria-label={ariaLabel}
        autocomplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={resolvedListboxId}
        {disabled}
        on:focus={handleInputFocus}
        on:input={handleSearchInput}
        on:keydown={handleSearchKeydown}
      />
    </div>
  {:else}
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
    <span class="suu-dropdown__label">{buttonLabelText}</span>
    <span class="suu-dropdown__chevron" aria-hidden="true"></span>
  </button>
  {/if}

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
      use:mountViewportFit
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
      {#if search && !inputMode}
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
        use:menuEscapeGuard
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
                  <span class="suu-dropdown__group-title">{group.label}</span>
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
