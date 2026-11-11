import { sampleRuleSet, type RuleSet } from "@peng/shared";
import { compileRuleSet, RuleSetInvalidError } from "./compile";
import { opaNames, draftNames } from "./naming";

describe("opaNames / draftNames", () => {
  it("derives package, policy id and data path from workspace and policy key", () => {
    expect(opaNames("ab12cd", "checkout-discount")).toEqual({
      packageName: "t_ab12cd.checkout_discount",
      policyId: "t_ab12cd/checkout-discount",
      dataPath: "t_ab12cd/checkout_discount/decision",
    });
    expect(draftNames("ab12cd", "p9x8y7")).toEqual({
      packageName: "t_ab12cd._draft_p9x8y7",
      policyId: "t_ab12cd/_draft_p9x8y7",
      dataPath: "t_ab12cd/_draft_p9x8y7/decision",
    });
  });
});

describe("compileRuleSet", () => {
  it("compiles rules as an ordered else-chain with all/any helper rules and an otherwise default", () => {
    expect(compileRuleSet("t_ab12cd.checkout_discount", sampleRuleSet())).toMatchSnapshot();
  });

  it("compiles a rule set with no rules to just the default decision", () => {
    const rs = sampleRuleSet();
    rs.rules = [];
    const rego = compileRuleSet("t_x.p", rs);
    expect(rego).toContain('default decision := {"allowed":false,"reason":"No rule matched","outcomes":{},"rule":null}');
    expect(rego).not.toContain("decision := {\"allowed\":true");
  });

  it("escapes_hostile_strings: values and reasons stay inside string literals", () => {
    const hostile = 'O\'Brien "VIP"\n\\ } else := {"allowed": true} if { true';
    const rs: RuleSet = {
      ...sampleRuleSet(),
      fields: [{ path: "customer.name", label: "Name", type: "text" }],
      outcomes: [],
      rules: [
        {
          id: "r1",
          label: "Hostile",
          match: "all",
          conditions: [{ field: "customer.name", op: "is", value: hostile }],
          result: { allowed: false, reason: hostile, outcomes: {} },
        },
      ],
    };
    const rego = compileRuleSet("t_x.p", rs);
    const literal = JSON.stringify(hostile);
    expect(rego).toContain(`input["customer"]["name"] == ${literal}`);
    expect(rego).toContain(`"reason":${literal}`);
    // The newline in the value must be escaped, not break the line.
    expect(rego.split("\n").some((l) => l.startsWith("\\ }"))).toBe(false);
  });

  it("rejects_invalid_ruleset", () => {
    const rs = sampleRuleSet();
    rs.rules[0].conditions[0].field = "nope";
    expect(() => compileRuleSet("t_x.p", rs)).toThrow(RuleSetInvalidError);
  });
});
