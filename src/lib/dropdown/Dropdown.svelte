<svelte:options runes={false} />

<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import type {
    DropdownChangeHandler,
    DropdownMenuAlign,
    DropdownOption,
    DropdownOptionGroup,
    DropdownPlacement,
    DropdownTriggerClickHandler,
    DropdownValue
  } from './types.js';

  export let id: string | undefined = undefined;
  export let value: DropdownValue = '';
  export let options: DropdownOption[] = [];
  export let optionGroups: DropdownOptionGroup[] | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let placement: DropdownPlacement = 'auto';
  export let menuAlign: DropdownMenuAlign = 'left';
  export let fitViewport = true;
  export let fitContent = false;
  export let disabled = false;
  export let width: string | undefined = undefined;
  export let minWidth: string | undefined = undefined;
  export let maxWidth: string | undefined = undefined;
  export let className: string | undefined = undefined;
  export let portal = false;
  export let onChange: DropdownChangeHandler | undefined = undefined;
  export let onTriggerClick: DropdownTriggerClickHandler | undefined = undefined;

  const viewportMargin = 20;
  const menuGap = 6;

  let open = false;
  let activeValue: DropdownValue = value;
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

  $: resolvedOptions = optionGroups === undefined ? options : optionGroups.flatMap((group) => group.options);
  $: selectedOption = resolvedOptions.find((option) => option.value === value);
  $: selectedText = selectedOption?.label ?? String(value);
  $: if (!open) {
    activeValue = selectedOption?.value ?? firstEnabledOption()?.value ?? value;
  }
  $: {
    placement;
    if (open) {
      enableOpenViewportTracking();
      void updateViewportPanelMaxHeight();
    } else {
      disableOpenViewportTracking();
      resolvedPlacement = placement === 'up' ? 'up' : 'down';
      viewportPanelMaxHeight = undefined;
    }
  }

  function firstEnabledOption(): DropdownOption | undefined {
    return resolvedOptions.find((option) => !option.disabled);
  }

  function activeOptionIndex(nextActiveValue: DropdownValue): number {
    const index = resolvedOptions.findIndex((option) => option.value === nextActiveValue && !option.disabled);
    if (index >= 0) {
      return index;
    }
    const fallbackIndex = resolvedOptions.findIndex((option) => option.value === value && !option.disabled);
    if (fallbackIndex >= 0) {
      return fallbackIndex;
    }
    return resolvedOptions.findIndex((option) => !option.disabled);
  }

  function moveActiveOption(offset: number) {
    const enabledOptions = resolvedOptions.filter((option) => !option.disabled);
    if (enabledOptions.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, enabledOptions.findIndex((option) => option.value === activeValue));
    const nextIndex = (currentIndex + offset + enabledOptions.length) % enabledOptions.length;
    activeValue = enabledOptions[nextIndex]?.value ?? activeValue;
  }

  function selectOption(option: DropdownOption) {
    if (option.disabled) {
      return;
    }
    open = false;
    activeValue = option.value;
    void onChange?.(option.value);
    buttonElement?.focus();
  }

  function toggleOpen() {
    if (disabled) {
      return;
    }
    if (!open) {
      updateResolvedPlacement();
    }
    open = !open;
    activeValue = selectedOption?.value ?? firstEnabledOption()?.value ?? value;
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
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        updateResolvedPlacement();
        open = true;
        activeValue = selectedOption?.value ?? firstEnabledOption()?.value ?? value;
      }
      moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const index = activeOptionIndex(activeValue);
      const option = index >= 0 ? resolvedOptions[index] : undefined;
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

  onDestroy(disableOpenViewportTracking);
</script>

<span
  bind:this={dropdownElement}
  class={[
    'suu-dropdown',
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
    data-value={String(value)}
    on:click={handleTriggerClick}
    on:keydown={handleKeydown}
  >
    <span class="suu-dropdown__label">{selectedText}</span>
    <span class="suu-dropdown__chevron" aria-hidden="true"></span>
  </button>

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
    >
      <div class="suu-dropdown__panel" role="listbox" aria-label={ariaLabel}>
        {#if optionGroups === undefined}
          {#each options as option}
            <button
              type="button"
              class="suu-dropdown__option"
              class:suu-dropdown__option--active={option.value === activeValue}
              class:suu-dropdown__option--disabled={option.disabled}
              role="option"
              aria-selected={option.value === value}
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
              <span class="suu-dropdown__label">{option.label}</span>
            </button>
          {/each}
        {:else}
          {#each optionGroups as group}
            <div class="suu-dropdown__group" role="group" aria-label={group.label}>
              {#if group.label}
                <div class="suu-dropdown__group-label">{group.label}</div>
              {/if}
              {#each group.options as option}
                <button
                  type="button"
                  class="suu-dropdown__option"
                  class:suu-dropdown__option--active={option.value === activeValue}
                  class:suu-dropdown__option--disabled={option.disabled}
                  role="option"
                  aria-selected={option.value === value}
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
                  <span class="suu-dropdown__label">{option.label}</span>
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</span>
