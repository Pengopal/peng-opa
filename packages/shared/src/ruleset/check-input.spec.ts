import { describe, it, expect } from "vitest";
import { checkInput } from "./check-input.js";
import { sampleRuleSet } from "./fixtures.js";
import type { RuleSet } from "./types.js";

describe("checkInput", () => {
  it("numeric_string_is_type_error: text sent for a number field is rejected, not silently unmatched", () => {
    const r = checkInput(sampleRuleSet(), { customer: { tier: "gold" }, order: { total: "620" } });
    expect(r).toEqual({ typeErrors: [{ field: "order.total", expected: "number" }], missingFields: [] });
  });

  it("reports missing fields, including a missing parent object and null values; ignores extra fields", () => {
    expect(checkInput(sampleRuleSet(), { customer: { tier: null }, extra: 1 })).toEqual({
      typeErrors: [],
      missingFields: ["customer.tier", "order.total"],
    });
    expect(checkInput(sampleRuleSet(), "not an object")).toEqual({
      typeErrors: [{ field: "", expected: "object" }],
      missingFields: [],
    });
  });

  it("checks each field type, accepting YYYY-MM-DD or RFC 3339 dates", () => {
    const rs: RuleSet = {
      ...sampleRuleSet(),
      fields: [
        { path: "a.date", label: "D", type: "date" },
        { path: "a.flag", label: "F", type: "yesno" },
        { path: "a.tags", label: "T", type: "list" },
      ],
      rules: [],
    };
    expect(checkInput(rs, { a: { date: "2026-03-10", flag: true, tags: [] } }).typeErrors).toEqual([]);
    expect(checkInput(rs, { a: { date: "2026-03-10T08:00:00Z", flag: false, tags: ["x"] } }).typeErrors).toEqual([]);
    expect(checkInput(rs, { a: { date: "10/03/2026", flag: "yes", tags: "x" } }).typeErrors).toEqual([
      { field: "a.date", expected: "date" },
      { field: "a.flag", expected: "yesno" },
      { field: "a.tags", expected: "list" },
    ]);
  });
});
