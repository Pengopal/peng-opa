import { expect, test } from "vitest";
import { outcomeRow, toSentence } from "./sentence";

test("a template rule line reads as a sentence with its reason apart", () => {
  expect(toSentence("When Customer tier is gold → Allow · Discount % 15 · “Gold loyalty discount”")).toEqual({
    sentence: "When Customer tier is gold, allow with 15% discount",
    reason: "“Gold loyalty discount”",
  });
  expect(toSentence("When Order total is at least 150 → Allow")).toEqual({ sentence: "When Order total is at least 150, allow", reason: undefined });
  expect(toSentence("When Refund amount is at most 100 → Allow · Needs review no").sentence).toBe("When Refund amount is at most 100, allow");
  expect(toSentence("When Refund amount is above 500 → Allow · Needs review yes").sentence).toBe("When Refund amount is above 500, allow with needs review");
});

test("a Try it outcome shows its label and unit, not the raw key", () => {
  const defs = [{ key: "discount", label: "Discount %", type: "number" as const }, { key: "needs_review", label: "Needs review", type: "yesno" as const }];
  expect(outcomeRow("discount", 15, defs)).toEqual(["Discount", "15%"]);
  expect(outcomeRow("needs_review", true, defs)).toEqual(["Needs review", "yes"]);
  expect(outcomeRow("unknown", 3, defs)).toEqual(["unknown", "3"]);
});
