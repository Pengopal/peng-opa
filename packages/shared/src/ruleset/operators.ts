import type { FieldType, Operator } from "./types.js";

export const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  text: ["is", "is_not", "one_of", "not_one_of", "contains", "starts_with", "ends_with"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  yesno: ["is"],
  date: ["before", "after", "on", "within_last_days", "more_than_days_ago"],
  list: ["includes", "includes_any", "is_empty"],
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  is: "is",
  is_not: "is not",
  one_of: "is one of",
  not_one_of: "is not one of",
  contains: "contains",
  starts_with: "starts with",
  ends_with: "ends with",
  eq: "equals",
  neq: "does not equal",
  gt: "is more than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  between: "is between",
  before: "is before",
  after: "is after",
  on: "is on",
  within_last_days: "is within the last N days",
  more_than_days_ago: "is more than N days ago",
  includes: "includes",
  includes_any: "includes any of",
  is_empty: "is empty",
};

export const FIELD_PATH_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
export const OUTCOME_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
