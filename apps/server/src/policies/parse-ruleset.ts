import { BadRequestException } from "@nestjs/common";
import type { RuleSet } from "@peng/shared";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isResult = (v: unknown) => isObj(v) && typeof v.allowed === "boolean" && typeof v.reason === "string" && isObj(v.outcomes);

/**
 * Structural check of an incoming rule set (shapes and types only). Content problems such as
 * empty values or unknown fields are reported by validateRuleSet as issues, not rejected here.
 */
export function parseRuleSet(v: unknown): RuleSet {
  const bad = (what: string): never => {
    throw new BadRequestException(`ruleSet is malformed: ${what}`);
  };
  if (!isObj(v)) bad("expected an object");
  const rs = v as Record<string, unknown>;
  if (rs.schemaVersion !== 1) bad("schemaVersion must be 1");
  if (!Array.isArray(rs.fields) || !rs.fields.every((f) => isObj(f) && typeof f.path === "string" && typeof f.label === "string" && typeof f.type === "string")) {
    bad("fields must be a list of { path, label, type }");
  }
  if (!Array.isArray(rs.outcomes) || !rs.outcomes.every((o) => isObj(o) && typeof o.key === "string" && typeof o.label === "string" && typeof o.type === "string")) {
    bad("outcomes must be a list of { key, label, type }");
  }
  if (
    !Array.isArray(rs.rules) ||
    !rs.rules.every(
      (r) =>
        isObj(r) &&
        typeof r.id === "string" &&
        typeof r.label === "string" &&
        (r.match === "all" || r.match === "any") &&
        Array.isArray(r.conditions) &&
        r.conditions.every((c) => isObj(c) && typeof c.field === "string" && typeof c.op === "string" && "value" in c) &&
        isResult(r.result),
    )
  ) {
    bad("rules must be a list of { id, label, match, conditions, result }");
  }
  if (!isResult(rs.otherwise)) bad("otherwise must be { allowed, reason, outcomes }");
  if (JSON.stringify(v).length > 200_000) bad("too large");
  return v as unknown as RuleSet;
}
