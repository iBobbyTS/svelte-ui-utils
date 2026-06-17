<script lang="ts">
  import type { DropdownChangeHandler, DropdownOption, DropdownPlacement, DropdownValue } from './types.js';

  export let id: string | undefined = undefined;
  export let value: DropdownValue = '';
  export let options: DropdownOption[] = [];
  export let ariaLabel: string | undefined = undefined;
  export let placement: DropdownPlacement = 'down';
  export let disabled = false;
  export let onChange: DropdownChangeHandler | undefined = undefined;

  let open = false;
  let activeValue: DropdownValue = value;
  let buttonElement: HTMLButtonElement | undefined;

  $: selectedOption = options.find((option) => option.value === value);
  $: selectedText = selectedOption?.label ?? String(value);
  $: if (!open) {
    activeValue = selectedOption?.value ?? firstEnabledOption()?.value ?? value;
  }

  function firstEnabledOption(): DropdownOption | undefined {
    return options.find((option) => !option.disabled);
  }

  function activeOptionIndex(nextActiveValue: DropdownValue): number {
    const index = options.findIndex((option) => option.value === nextActiveValue && !option.disabled);
    if (index >= 0) {
      return index;
    }
    const fallbackIndex = options.findIndex((option) => option.value === value && !option.disabled);
    if (fallbackIndex >= 0) {
      return fallbackIndex;
    }
    return options.findIndex((option) => !option.disabled);
  }

  function moveActiveOption(offset: number) {
    const enabledOptions = options.filter((option) => !option.disabled);
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
    open = !open;
    activeValue = selectedOption?.value ?? firstEnabledOption()?.value ?? value;
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
        open = true;
        activeValue = selectedOption?.value ?? firstEnabledOption()?.value ?? value;
      }
      moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const index = activeOptionIndex(activeValue);
      const option = index >= 0 ? options[index] : undefined;
      if (option) {
        selectOption(option);
      }
    }
  }

  function handleFocusout(event: FocusEvent) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    open = false;
  }
</script>

<span class="suu-dropdown" on:focusout={handleFocusout}>
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
    on:click={toggleOpen}
    on:keydown={handleKeydown}
  >
    <span>{selectedText}</span>
    <span class="suu-dropdown__chevron" aria-hidden="true"></span>
  </button>

  {#if open}
    <div
      class="suu-dropdown__menu"
      class:suu-dropdown__menu--up={placement === 'up'}
      class:suu-dropdown__menu--down={placement === 'down'}
    >
      <div class="suu-dropdown__panel" role="listbox" aria-label={ariaLabel}>
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
            {option.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</span>
