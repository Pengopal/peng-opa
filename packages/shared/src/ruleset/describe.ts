import { OPERATOR_LABELS } from "./operators.js";
import type { Condition, Result, Rule, RuleSet } from "./types.js";

function value(c: Condition): string {
  const v = c.value;
  if (c.op === "between" && Array.isArray(v)) return `${v[0]} and ${v[1]}`;
  if (c.op === "within_last_days" || c.op === "more_than_days_ago") return `${v} days`;
  if (c.op === "is_empty") return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v ?? "");
}

function condition(c: Condition, rs: RuleSet): string {
  const label = rs.fields.find((f) => f.path === c.field)?.label ?? c.field;
  let op = OPERATOR_LABELS[c.op] ?? c.op;
  if (c.op === "within_last_days") op = "is within the last";
  if (c.op === "more_than_days_ago") return `${label} is more than ${value(c)} ago`;
  if (c.op === "is_empty") return `${label} ${c.value ? "is empty" : "is not empty"}`;
  return `${label} ${op} ${value(c)}`.trim();
}

/** "Allow · Discount % 15 · “Gold loyalty”" */
export function describeResult(result: Result, rs: RuleSet): string {
  const parts = [result.allowed ? "Allow" : "Deny"];
  for (const [key, v] of Object.entries(result.outcomes)) {
    const label = rs.outcomes.find((o) => o.key === key)?.label ?? key;
    parts.push(`${label} ${typeof v === "boolean" ? (v ? "yes" : "no") : v}`);
  }
  if (result.reason) parts.push(`“${result.reason}”`);
  return parts.join(" · ");
}

/** One plain sentence per rule, e.g. "When Customer tier is gold and Order total is more than 500 → Allow · Discount % 15 · “Gold loyalty”". */
export function describeRule(rule: Rule, rs: RuleSet): string {
  const joiner = rule.match === "all" ? " and " : " or ";
  return `When ${rule.conditions.map((c) => condition(c, rs)).join(joiner)} → ${describeResult(rule.result, rs)}`;
}
