export type FieldType = "text" | "number" | "yesno" | "date" | "list";
export type OutcomeType = "text" | "number" | "yesno";

export type TextOperator = "is" | "is_not" | "one_of" | "not_one_of" | "contains" | "starts_with" | "ends_with";
export type NumberOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between";
export type YesNoOperator = "is";
export type DateOperator = "before" | "after" | "on" | "within_last_days" | "more_than_days_ago";
export type ListOperator = "includes" | "includes_any" | "is_empty";
export type Operator = TextOperator | NumberOperator | YesNoOperator | DateOperator | ListOperator;

export interface Field {
  /** Dot path into `input`, e.g. "customer.tier". */
  path: string;
  label: string;
  type: FieldType;
  /** Allowed values for text and list fields. */
  options?: string[];
}

export interface Outcome {
  key: string;
  label: string;
  type: OutcomeType;
}

export type OutcomeValue = string | number | boolean;

export interface Result {
  allowed: boolean;
  reason: string;
  outcomes: Record<string, OutcomeValue>;
}

export interface Condition {
  field: string;
  op: Operator;
  /**
   * text: string, or string[] for one_of/not_one_of · number: number, or [min, max] for between ·
   * yesno: boolean · date: "YYYY-MM-DD" (or RFC 3339), or whole days for the *_days operators ·
   * list: string for includes, string[] for includes_any, boolean for is_empty (true = empty).
   */
  value: unknown;
}

export interface Rule {
  id: string;
  label: string;
  match: "all" | "any";
  conditions: Condition[];
  result: Result;
}

export interface RuleSet {
  schemaVersion: 1;
  fields: Field[];
  outcomes: Outcome[];
  rules: Rule[];
  otherwise: Result;
}

export type IssueCode =
  | "invalid_field_path"
  | "duplicate_field"
  | "invalid_outcome_key"
  | "duplicate_outcome"
  | "unknown_field"
  | "invalid_operator"
  | "empty_value"
  | "invalid_value"
  | "invalid_range"
  | "value_not_in_options"
  | "no_conditions"
  | "unknown_outcome"
  | "outcome_type_mismatch"
  | "empty_reason"
  | "empty_label"
  | "duplicate_rule_id"
  | "unreachable_rule";

export interface Issue {
  severity: "error" | "warning";
  code: IssueCode;
  /** Location inside the RuleSet, e.g. "rules[0].conditions[1].value". */
  path: string;
  message: string;
}

export interface RuleChange {
  ruleId: string;
  label: string;
  kind: "added" | "removed" | "changed" | "moved";
}

export function emptyRuleSet(): RuleSet {
  return {
    schemaVersion: 1,
    fields: [],
    outcomes: [],
    rules: [],
    otherwise: { allowed: false, reason: "No rule matched", outcomes: {} },
  };
}
