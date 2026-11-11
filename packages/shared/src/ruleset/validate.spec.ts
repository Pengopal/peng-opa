import { describe, it, expect } from "vitest";
import { validateRuleSet } from "./validate.js";
import { sampleRuleSet } from "./fixtures.js";
import type { RuleSet } from "./types.js";

const codes = (rs: RuleSet) => validateRuleSet(rs).map((i) => `${i.severity}:${i.code}`);

describe("validateRuleSet", () => {
  it("valid_ruleset_has_no_issues", () => {
    expect(validateRuleSet(sampleRuleSet())).toEqual([]);
  });

  it("bad_field_path", () => {
    const rs = sampleRuleSet();
    rs.fields[0].path = "Customer.Tier";
    rs.rules[0].conditions[0].field = "Customer.Tier";
    const issue = validateRuleSet(rs).find((i) => i.code === "invalid_field_path");
    expect(issue).toMatchObject({ severity: "error", path: "fields[0].path" });
  });

  it("operator_not_allowed_for_type", () => {
    const rs = sampleRuleSet();
    rs.rules[0].conditions[0] = { field: "customer.tier", op: "gt", value: "gold" };
    expect(validateRuleSet(rs)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "invalid_operator", path: "rules[0].conditions[0].op" }),
    );
  });

  it("empty_value", () => {
    const rs = sampleRuleSet();
    rs.fields[0].options = undefined;
    rs.rules[0].conditions[0].value = "";
    expect(validateRuleSet(rs)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "empty_value", path: "rules[0].conditions[0].value" }),
    );
  });

  it("between_needs_min_lt_max", () => {
    const rs = sampleRuleSet();
    rs.rules[0].conditions[1] = { field: "order.total", op: "between", value: [10, 5] };
    expect(codes(rs)).toContain("error:invalid_range");
  });

  it("field_removed_but_used", () => {
    const rs = sampleRuleSet();
    rs.fields = rs.fields.filter((f) => f.path !== "order.total");
    expect(validateRuleSet(rs)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "unknown_field", path: "rules[0].conditions[1].field" }),
    );
  });

  it("outcome_removed_but_used", () => {
    const rs = sampleRuleSet();
    rs.outcomes = [];
    expect(validateRuleSet(rs)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "unknown_outcome", path: "rules[0].result.outcomes.discount" }),
    );
  });

  it("outcome_type_mismatch", () => {
    const rs = sampleRuleSet();
    rs.rules[0].result.outcomes.discount = "fifteen";
    expect(codes(rs)).toContain("error:outcome_type_mismatch");
  });

  it("option_not_in_options", () => {
    const rs = sampleRuleSet();
    rs.fields[0].options = ["gold", "silver"];
    rs.rules[0].conditions[0].value = "platinum";
    expect(codes(rs)).toContain("error:value_not_in_options");
  });

  it("unreachable_rule", () => {
    const rs = sampleRuleSet();
    rs.rules[1] = { ...structuredClone(rs.rules[0]), id: "r2", label: "Copy" };
    expect(validateRuleSet(rs)).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "unreachable_rule", path: "rules[1]" }),
    );
  });

  it("unreachable_rule_not_flagged_for_any_rule_with_extra_options", () => {
    const rs = sampleRuleSet();
    // r2 is "any" with a superset of r1's conditions: still reachable (it can match on the extra condition alone).
    rs.rules[1] = {
      ...structuredClone(rs.rules[0]),
      id: "r2",
      match: "any",
      conditions: [...structuredClone(rs.rules[0].conditions), { field: "order.total", op: "gte", value: 1000 }],
    };
    expect(codes(rs)).not.toContain("warning:unreachable_rule");
  });

  it("empty_reason", () => {
    const rs = sampleRuleSet();
    rs.otherwise.reason = "  ";
    expect(validateRuleSet(rs)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "empty_reason", path: "otherwise.reason" }),
    );
  });

  it("duplicate_rule_id", () => {
    const rs = sampleRuleSet();
    rs.rules[1].id = "r1";
    expect(codes(rs)).toContain("error:duplicate_rule_id");
  });

  it("rule_without_conditions", () => {
    const rs = sampleRuleSet();
    rs.rules[0].conditions = [];
    expect(codes(rs)).toContain("error:no_conditions");
  });
});
