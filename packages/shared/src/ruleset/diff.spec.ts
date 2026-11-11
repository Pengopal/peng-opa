import { describe, it, expect } from "vitest";
import { diffRuleSets } from "./diff.js";
import { sampleRuleSet } from "./fixtures.js";

describe("diffRuleSets", () => {
  it("no_changes", () => {
    expect(diffRuleSets(sampleRuleSet(), sampleRuleSet())).toEqual([]);
  });

  it("added", () => {
    const next = sampleRuleSet();
    next.rules.push({ ...structuredClone(next.rules[1]), id: "r3", label: "New" });
    expect(diffRuleSets(sampleRuleSet(), next)).toEqual([{ ruleId: "r3", label: "New", kind: "added" }]);
  });

  it("removed", () => {
    const next = sampleRuleSet();
    next.rules.pop();
    expect(diffRuleSets(sampleRuleSet(), next)).toEqual([{ ruleId: "r2", label: "Big orders", kind: "removed" }]);
  });

  it("changed_condition_value", () => {
    const next = sampleRuleSet();
    next.rules[0].conditions[1].value = 600;
    expect(diffRuleSets(sampleRuleSet(), next)).toEqual([{ ruleId: "r1", label: "Gold customers", kind: "changed" }]);
  });

  it("moved_only", () => {
    const next = sampleRuleSet();
    next.rules.reverse();
    expect(diffRuleSets(sampleRuleSet(), next)).toEqual([
      { ruleId: "r2", label: "Big orders", kind: "moved" },
      { ruleId: "r1", label: "Gold customers", kind: "moved" },
    ]);
  });

  it("otherwise_changed", () => {
    const next = sampleRuleSet();
    next.otherwise.reason = "Not eligible";
    expect(diffRuleSets(sampleRuleSet(), next)).toEqual([{ ruleId: "otherwise", label: "Otherwise", kind: "changed" }]);
  });
});
