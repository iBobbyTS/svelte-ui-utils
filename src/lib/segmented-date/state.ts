export type SegmentedDatePrecision = "year" | "month" | "day";

export type SegmentedDateParts = {
    year: string;
    month: string;
    day: string;
};

const EMPTY_PARTS: SegmentedDateParts = { year: "", month: "", day: "" };

function normalizePart(value: string): string {
    return value.normalize("NFKC").trim();
}

export function splitSegmentedDate(
    value: string,
    precision: SegmentedDatePrecision,
): SegmentedDateParts {
    const normalized = value.normalize("NFKC").trim();
    const patterns = {
        year: /^([^-]*)$/,
        month: /^([^-]*)-([^-]*)$/,
        day: /^([^-]*)-([^-]*)-([^-]*)$/,
    } as const;
    const match = normalized.match(patterns[precision]);
    if (!match) {
        if (precision === "month" && /^\d{4}$/.test(normalized)) {
            return { year: normalized, month: "", day: "" };
        }
        if (precision === "month" && /^\d{1,2}$/.test(normalized)) {
            return { year: "", month: normalized, day: "" };
        }
        return { ...EMPTY_PARTS };
    }

    return {
        year: match[1] ?? "",
        month: precision === "year" ? "" : (match[2] ?? ""),
        day: precision === "day" ? (match[3] ?? "") : "",
    };
}

export function composeSegmentedDate(
    parts: SegmentedDateParts,
    precision: SegmentedDatePrecision,
): string {
    const year = normalizePart(parts.year);
    const month = normalizePart(parts.month);
    const day = normalizePart(parts.day);

    if (!year && (precision === "year" || !month) && (precision !== "day" || !day)) {
        return "";
    }
    if (precision === "year") return year;
    if (precision === "month") {
        if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(month)) {
            return `${year}-${month.padStart(2, "0")}`;
        }
        if (/^\d{4}$/.test(year) && !month) return year;
        if (!year && /^\d{1,2}$/.test(month)) return month.padStart(2, "0");
        return `${year}-${month}`;
    }
    if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(month) && /^\d{1,2}$/.test(day)) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return `${year}-${month}-${day}`;
}

export function parsePastedSegmentedDate(
    value: string,
    precision: SegmentedDatePrecision,
): SegmentedDateParts | null {
    const normalized = value.normalize("NFKC").trim();
    const patterns = {
        year: /^(\d{4})$/,
        month: /^(?:(\d{4})[-/.](\d{1,2})|(\d{1,2}))$/,
        day: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/,
    } as const;
    const match = normalized.match(patterns[precision]);
    if (!match) return null;

    return {
        year: match[1] ?? "",
        month: precision === "year" ? "" : (match[2] ?? match[3]).padStart(2, "0"),
        day: precision === "day" ? match[3].padStart(2, "0") : "",
    };
}
