import { FIELD_PATH_PATTERN, OPERATORS_BY_TYPE, OPERATOR_LABELS, OUTCOME_KEY_PATTERN } from "./operators";
import type { Condition, Field, Issue, IssueCode, Outcome, Result, Rule, RuleSet } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isValidDate = (v: unknown) => typeof v === "string" && DATE_PATTERN.test(v) && !Number.isNaN(Date.parse(v));
const isBlank = (v: unknown) => v === "" || v === null || v === undefined;

export function validateRuleSet(rs: RuleSet): Issue[] {
  const issues: Issue[] = [];
  const error = (code: IssueCode, path: string, message: string) => issues.push({ severity: "error", code, path, message });

  const fields = new Map<string, Field>();
  rs.fields.forEach((f, i) => {
    if (!FIELD_PATH_PATTERN.test(f.path)) {
      error("invalid_field_path", `fields[${i}].path`, `"${f.path}" must be lowercase words joined by dots, like customer.tier`);
    }
    if (fields.has(f.path)) error("duplicate_field", `fields[${i}].path`, `Field "${f.path}" is defined twice`);
    fields.set(f.path, f);
  });

  const outcomes = new Map<string, Outcome>();
  rs.outcomes.forEach((o, i) => {
    if (!OUTCOME_KEY_PATTERN.test(o.key)) {
      error("invalid_outcome_key", `outcomes[${i}].key`, `"${o.key}" must be lowercase letters, digits and underscores`);
    }
    if (outcomes.has(o.key)) error("duplicate_outcome", `outcomes[${i}].key`, `Result "${o.key}" is defined twice`);
    outcomes.set(o.key, o);
  });

  const checkResult = (result: Result, path: string, where: string) => {
    if (!isNonEmptyString(result.reason)) error("empty_reason", `${path}.reason`, `${where} needs a reason`);
    for (const [key, value] of Object.entries(result.outcomes)) {
      const outcome = outcomes.get(key);
      const at = `${path}.outcomes.${key}`;
      if (!outcome) {
        error("unknown_outcome", at, `${where} sets "${key}", which is not one of this policy's results`);
        continue;
      }
      const expected = outcome.type === "text" ? "string" : outcome.type === "number" ? "number" : "boolean";
      const ok = typeof value === expected && !(typeof value === "number" && !Number.isFinite(value));
      if (!ok) error("outcome_type_mismatch", at, `${where}: "${outcome.label}" must be a ${outcome.type} value`);
    }
  };

  const checkCondition = (c: Condition, path: string, where: string) => {
    const field = fields.get(c.field);
    if (!field) {
      error("unknown_field", `${path}.field`, `${where} uses "${c.field}", which is not one of this policy's fields`);
      return;
    }
    if (!OPERATORS_BY_TYPE[field.type].includes(c.op)) {
      error("invalid_operator", `${path}.op`, `${where}: "${OPERATOR_LABELS[c.op] ?? c.op}" can't be used with ${field.type} fields`);
      return;
    }
    const at = `${path}.value`;
    const v = c.value;
    const empty = () => error("empty_value", at, `${where} needs a value`);
    const invalid = (msg: string) => error("invalid_value", at, `${where}: ${msg}`);
    const inOptions = (values: string[]) => {
      if (!field.options || field.options.length === 0) return;
      const bad = values.filter((x) => !field.options!.includes(x));
      if (bad.length) {
        error("value_not_in_options", at, `${where}: ${bad.map((b) => `"${b}"`).join(", ")} is not an option of ${field.label}`);
      }
    };

    switch (c.op) {
      case "is":
      case "is_not":
        if (field.type === "yesno") {
          if (typeof v !== "boolean") invalid("choose yes or no");
        } else if (!isNonEmptyString(v)) empty();
        else inOptions([v]);
        return;
      case "contains":
      case "starts_with":
      case "ends_with":
      case "includes":
        if (!isNonEmptyString(v)) empty();
        else if (c.op === "includes") inOptions([v]);
        return;
      case "one_of":
      case "not_one_of":
      case "includes_any":
        if (!isStringList(v) || v.length === 0 || v.some((x) => x.trim() === "")) empty();
        else inOptions(v);
        return;
      case "eq":
      case "neq":
      case "gt":
      case "gte":
      case "lt":
      case "lte":
        if (isBlank(v)) empty();
        else if (typeof v !== "number" || !Number.isFinite(v)) invalid("enter a number");
        return;
      case "between":
        if (!Array.isArray(v) || v.length !== 2 || !v.every((x) => typeof x === "number" && Number.isFinite(x))) {
          invalid("enter a minimum and a maximum");
        } else if (v[0] >= v[1]) error("invalid_range", at, `${where}: the minimum must be less than the maximum`);
        return;
      case "before":
      case "after":
      case "on":
        if (isBlank(v)) empty();
        else if (!isValidDate(v)) invalid("enter a date like 2026-01-31");
        return;
      case "within_last_days":
      case "more_than_days_ago":
        if (isBlank(v)) empty();
        else if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) invalid("enter a whole number of days greater than 0");
        return;
      case "is_empty":
        if (typeof v !== "boolean") invalid("choose empty or not empty");
        return;
    }
  };

  const ruleIds = new Set<string>();
  rs.rules.forEach((rule, r) => {
    const where = `Rule ${r + 1}${rule.label ? ` (${rule.label})` : ""}`;
    if (ruleIds.has(rule.id)) error("duplicate_rule_id", `rules[${r}].id`, `${where} has the same id as another rule`);
    ruleIds.add(rule.id);
    if (!isNonEmptyString(rule.label)) error("empty_label", `rules[${r}].label`, `${where} needs a name`);
    if (rule.conditions.length === 0) error("no_conditions", `rules[${r}].conditions`, `${where} has no conditions`);
    rule.conditions.forEach((c, ci) => checkCondition(c, `rules[${r}].conditions[${ci}]`, `${where}, condition ${ci + 1}`));
    checkResult(rule.result, `rules[${r}].result`, where);
  });
  checkResult(rs.otherwise, "otherwise", "Otherwise");

  rs.rules.forEach((rule, r) => {
    const earlier = rs.rules.slice(0, r).findIndex((prev) => shadows(prev, rule));
    if (earlier !== -1) {
      issues.push({
        severity: "warning",
        code: "unreachable_rule",
        path: `rules[${r}]`,
        message: `Rule ${r + 1} can never match: rule ${earlier + 1} always matches first`,
      });
    }
  });

  return issues;
}

/** True when `earlier` matches every input `later` matches (certain cases only, no solver). */
function shadows(earlier: Rule, later: Rule): boolean {
  const effectivelyAll = (r: Rule) => r.match === "all" || r.conditions.length === 1;
  if (!effectivelyAll(earlier) || !effectivelyAll(later) || earlier.conditions.length === 0) return false;
  const key = (c: Condition) => JSON.stringify([c.field, c.op, c.value]);
  const laterKeys = new Set(later.conditions.map(key));
  return earlier.conditions.every((c) => laterKeys.has(key(c)));
}
