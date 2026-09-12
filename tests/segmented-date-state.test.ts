import { assert, test } from "vitest";

import { composeSegmentedDate, splitSegmentedDate } from "../src/lib/segmented-date/state.js";

test("month segmented dates preserve year-only, month-only, and complete values", () => {
    assert.equal(composeSegmentedDate({ year: "2026", month: "", day: "" }, "month"), "2026");
    assert.equal(composeSegmentedDate({ year: "", month: "6", day: "" }, "month"), "06");
    assert.equal(composeSegmentedDate({ year: "2026", month: "6", day: "" }, "month"), "2026-06");

    assert.deepEqual(splitSegmentedDate("2026", "month"), { year: "2026", month: "", day: "" });
    assert.deepEqual(splitSegmentedDate("06", "month"), { year: "", month: "06", day: "" });
    assert.deepEqual(splitSegmentedDate("2026-06", "month"), { year: "2026", month: "06", day: "" });
});
