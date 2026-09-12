<script lang="ts">
    import { untrack } from "svelte";
    import {
        composeSegmentedDate,
        parsePastedSegmentedDate,
        splitSegmentedDate,
        type SegmentedDatePrecision,
    } from "./state.js";

    let {
        value = $bindable(""),
        precision = "day",
        name,
        id,
        required = false,
        readonly = false,
        disabled = false,
        ariaLabel,
        yearLabel,
        monthLabel,
        dayLabel,
        yearPlaceholder = "YYYY",
        monthPlaceholder = "MM",
        dayPlaceholder = "DD",
        submitParts = false,
        autocomplete,
        class: className = "",
        inputClass = "",
        onvalueinput,
    } = $props<{
        value?: string;
        precision?: SegmentedDatePrecision;
        name: string;
        id?: string;
        required?: boolean;
        readonly?: boolean;
        disabled?: boolean;
        ariaLabel: string;
        yearLabel: string;
        monthLabel?: string;
        dayLabel?: string;
        yearPlaceholder?: string;
        monthPlaceholder?: string;
        dayPlaceholder?: string;
        submitParts?: boolean;
        autocomplete?: "bday";
        class?: string;
        inputClass?: string;
        onvalueinput?: (value: string) => void;
    }>();

    let year = $state("");
    let month = $state("");
    let day = $state("");

    $effect(() => {
        const parts = splitSegmentedDate(value, precision);
        // Keep partially entered segments while the child is emitting an incomplete value.
        const current = untrack(() => composeSegmentedDate({ year, month, day }, precision));
        if (value !== current) {
            year = parts.year;
            month = parts.month;
            day = parts.day;
        }
    });

    function updateValue() {
        const nextValue = composeSegmentedDate({ year, month, day }, precision);
        if (nextValue === value) return;
        value = nextValue;
        onvalueinput?.(value);
    }

    function handleInput(part: SegmentedDatePrecision, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const normalized = input.value.normalize("NFKC").replace(/\D/g, "")
            .slice(0, part === "year" ? 4 : 2);
        input.value = normalized;
        if (part === "year") year = normalized;
        if (part === "month") month = normalized;
        if (part === "day") day = normalized;
        updateValue();
    }

    function handleBlur(part: "month" | "day") {
        if (part === "month" && /^\d$/.test(month)) month = month.padStart(2, "0");
        if (part === "day" && /^\d$/.test(day)) day = day.padStart(2, "0");
        updateValue();
    }

    function handlePaste(event: ClipboardEvent) {
        const parts = parsePastedSegmentedDate(
            event.clipboardData?.getData("text") ?? "",
            precision,
        );
        if (!parts) return;
        event.preventDefault();
        year = parts.year;
        month = parts.month;
        day = parts.day;
        updateValue();
    }
</script>

{#if !submitParts}
    <input type="hidden" {name} {value} {disabled} />
{/if}

<div
    class={["suu-segmented-date", className]}
    data-precision={precision}
    role="group"
    aria-label={ariaLabel}
>
    <input
        class={["suu-segmented-date__input", inputClass]}
        class:suu-segmented-date__input--default={!inputClass}
        type="text"
        name={submitParts ? `${name}Year` : undefined}
        {id}
        bind:value={year}
        oninput={(event) => handleInput("year", event)}
        onpaste={handlePaste}
        inputmode="numeric"
        pattern="[0-9][0-9][0-9][0-9]"
        maxlength="4"
        placeholder={yearPlaceholder}
        aria-label={yearLabel}
        autocomplete={autocomplete ? "bday-year" : undefined}
        {required}
        {readonly}
        {disabled}
    />
    {#if precision !== "year"}
        <input
            class={["suu-segmented-date__input", inputClass]}
        class:suu-segmented-date__input--default={!inputClass}
            type="text"
            name={submitParts ? `${name}Month` : undefined}
            bind:value={month}
            oninput={(event) => handleInput("month", event)}
            onblur={() => handleBlur("month")}
            onpaste={handlePaste}
            inputmode="numeric"
            pattern="[0-9][0-9]?"
            maxlength="2"
            placeholder={monthPlaceholder}
            aria-label={monthLabel}
            autocomplete={autocomplete ? "bday-month" : undefined}
            {required}
            {readonly}
            {disabled}
        />
    {/if}
    {#if precision === "day"}
        <input
            class={["suu-segmented-date__input", inputClass]}
        class:suu-segmented-date__input--default={!inputClass}
            type="text"
            name={submitParts ? `${name}Day` : undefined}
            bind:value={day}
            oninput={(event) => handleInput("day", event)}
            onblur={() => handleBlur("day")}
            onpaste={handlePaste}
            inputmode="numeric"
            pattern="[0-9][0-9]?"
            maxlength="2"
            placeholder={dayPlaceholder}
            aria-label={dayLabel}
            autocomplete={autocomplete ? "bday-day" : undefined}
            {required}
            {readonly}
            {disabled}
        />
    {/if}
</div>

<style>
    .suu-segmented-date { display: grid; min-width: 0; gap: 0.5rem; }
    .suu-segmented-date[data-precision="year"] { grid-template-columns: minmax(0, 1fr); }
    .suu-segmented-date[data-precision="month"] { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
    .suu-segmented-date[data-precision="day"] { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); }
    .suu-segmented-date__input { min-width: 0; width: 100%; box-sizing: border-box; }
    .suu-segmented-date__input--default {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--suu-color-border);
        border-radius: var(--suu-radius);
        background: var(--suu-color-bg);
        color: var(--suu-color-text);
        font: inherit;
    }
    .suu-segmented-date__input--default:focus-visible { outline: 2px solid var(--suu-color-accent); outline-offset: 2px; }
</style>
