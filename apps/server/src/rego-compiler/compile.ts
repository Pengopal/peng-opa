import { FIELD_PATH_PATTERN, validateRuleSet, type Condition, type Issue, type Result, type Rule, type RuleSet } from "@peng/shared";

export class RuleSetInvalidError extends Error {
  constructor(public readonly issues: Issue[]) {
    super(`Rule set has ${issues.length} error(s): ${issues.map((i) => i.message).join("; ")}`);
  }
}

const DAY_NS = 86_400_000_000_000;
const lit = (v: unknown) => JSON.stringify(v);

/** Rego for a decision object; JSON is valid Rego term syntax and escapes every string. */
const decisionTerm = (result: Result, ruleId: string | null) =>
  lit({ allowed: result.allowed, reason: result.reason, outcomes: result.outcomes, rule: ruleId });

/**
 * Compile a rule set to a Rego module whose `decision` is the first matching rule's result,
 * or `otherwise`. Throws RuleSetInvalidError when validation reports any error.
 */
export function compileRuleSet(packageName: string, rs: RuleSet): string {
  const errors = validateRuleSet(rs).filter((i) => i.severity === "error");
  if (errors.length) throw new RuleSetInvalidError(errors);

  const out: string[] = [`package ${packageName}`, "", "import rego.v1", ""];
  out.push(`default decision := ${decisionTerm(rs.otherwise, null)}`, "");

  if (rs.rules.length > 0) {
    rs.rules.forEach((rule, i) => {
      out.push(`${i === 0 ? "decision" : "} else"} := ${decisionTerm(rule.result, rule.id)} if {`, `  r_${i}`);
    });
    out.push("}", "");
    rs.rules.forEach((rule, i) => out.push(...helperRule(rule, i), ""));
  }

  if (usesDates(rs)) out.push(...DATE_HELPERS, "");
  return out.join("\n");
}

function helperRule(rule: Rule, index: number): string[] {
  const name = `r_${index}`;
  const lines = [`# ${lit(rule.label)} (match ${rule.match})`];
  if (rule.match === "all") {
    lines.push(`${name} if {`, ...rule.conditions.flatMap((c) => conditionLines(c).map((l) => `  ${l}`)), "}");
  } else {
    // Several bodies of the same rule are ORed by Rego.
    for (const c of rule.conditions) lines.push(`${name} if {`, ...conditionLines(c).map((l) => `  ${l}`), "}");
  }
  return lines;
}

function ref(path: string) {
  if (!FIELD_PATH_PATTERN.test(path)) throw new Error(`invalid field path ${path}`);
  return "input" + path.split(".").map((seg) => `[${lit(seg)}]`).join("");
}

/** Start of the given day (UTC) in ns, or the exact instant when a time is given. */
function instantNs(value: string) {
  return Date.parse(value.includes("T") ? value : `${value}T00:00:00Z`) * 1_000_000;
}

/** Statements that hold only when the condition matches; a missing field never matches. */
function conditionLines(c: Condition): string[] {
  const x = ref(c.field);
  const v = c.value;
  switch (c.op) {
    case "is":
      return [`${x} == ${lit(v)}`];
    case "is_not":
      return [`is_string(${x})`, `${x} != ${lit(v)}`];
    case "one_of":
      return [`${x} in ${setLit(v as string[])}`];
    case "not_one_of":
      return [`is_string(${x})`, `not ${x} in ${setLit(v as string[])}`];
    case "contains":
      return [`contains(${x}, ${lit(v)})`];
    case "starts_with":
      return [`startswith(${x}, ${lit(v)})`];
    case "ends_with":
      return [`endswith(${x}, ${lit(v)})`];
    case "eq":
      return [`is_number(${x})`, `${x} == ${lit(v)}`];
    case "neq":
      return [`is_number(${x})`, `${x} != ${lit(v)}`];
    case "gt":
      return [`is_number(${x})`, `${x} > ${lit(v)}`];
    case "gte":
      return [`is_number(${x})`, `${x} >= ${lit(v)}`];
    case "lt":
      return [`is_number(${x})`, `${x} < ${lit(v)}`];
    case "lte":
      return [`is_number(${x})`, `${x} <= ${lit(v)}`];
    case "between": {
      const [min, max] = v as [number, number];
      return [`is_number(${x})`, `${x} >= ${lit(min)}`, `${x} <= ${lit(max)}`];
    }
    case "before":
      return [`_ns(${x}) < ${instantNs(v as string)}`];
    case "after": {
      const s = v as string;
      return s.includes("T") ? [`_ns(${x}) > ${instantNs(s)}`] : [`_ns(${x}) >= ${instantNs(s) + DAY_NS}`];
    }
    case "on": {
      const start = instantNs((v as string).slice(0, 10));
      return [`_ns(${x}) >= ${start}`, `_ns(${x}) < ${start + DAY_NS}`];
    }
    case "within_last_days":
      return [`time.now_ns() - _ns(${x}) <= ${(v as number) * DAY_NS}`];
    case "more_than_days_ago":
      return [`time.now_ns() - _ns(${x}) > ${(v as number) * DAY_NS}`];
    case "includes":
      return [`is_array(${x})`, `${lit(v)} in ${x}`];
    case "includes_any":
      return [`is_array(${x})`, `some item in ${x}`, `item in ${setLit(v as string[])}`];
    case "is_empty":
      return [`is_array(${x})`, v === true ? `count(${x}) == 0` : `count(${x}) > 0`];
  }
}

const setLit = (values: string[]) => `{${values.map(lit).join(", ")}}`;

const DATE_OPS = new Set(["before", "after", "on", "within_last_days", "more_than_days_ago"]);
const usesDates = (rs: RuleSet) => rs.rules.some((r) => r.conditions.some((c) => DATE_OPS.has(c.op)));

/** Accept "YYYY-MM-DD" (UTC midnight) or RFC 3339 input dates. */
const DATE_HELPERS = [
  "_ns(s) := time.parse_rfc3339_ns(s) if {",
  "  is_string(s)",
  '  contains(s, "T")',
  "}",
  "",
  "_ns(s) := time.parse_ns(\"2006-01-02\", s) if {",
  "  is_string(s)",
  '  not contains(s, "T")',
  "}",
];
