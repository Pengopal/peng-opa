import type { Condition, Field, RuleSet } from "@peng/shared";

/**
 * Golden fixtures: rule sets with inputs and the decision real OPA must return.
 * Input strings "$daysAgo:N" are replaced with an RFC 3339 timestamp N days before now.
 */
export interface GoldenCase {
  input: unknown;
  expect: { allowed: boolean; rule: string | null; outcomes?: Record<string, unknown> };
}
export interface GoldenFixture {
  name: string;
  ruleSet: RuleSet;
  cases: GoldenCase[];
}

const yes = { allowed: true, rule: "r1" };
const no = { allowed: false, rule: null };

/** One rule "r1" (allow) with a single condition; otherwise deny. */
function single(name: string, field: Field, cond: Omit<Condition, "field">, cases: [unknown, boolean][]): GoldenFixture {
  const wrap = (v: unknown) => (v === undefined ? {} : { x: { v } });
  return {
    name,
    ruleSet: {
      schemaVersion: 1,
      fields: [{ ...field, path: "x.v" }],
      outcomes: [],
      rules: [{ id: "r1", label: name, match: "all", conditions: [{ field: "x.v", ...cond }], result: { allowed: true, reason: "ok", outcomes: {} } }],
      otherwise: { allowed: false, reason: "No rule matched", outcomes: {} },
    },
    cases: cases.map(([v, m]) => ({ input: wrap(v), expect: m ? yes : no })),
  };
}

const text: Field = { path: "x.v", label: "V", type: "text" };
const num: Field = { path: "x.v", label: "V", type: "number" };
const date: Field = { path: "x.v", label: "V", type: "date" };
const list: Field = { path: "x.v", label: "V", type: "list" };
const yesno: Field = { path: "x.v", label: "V", type: "yesno" };
const MISSING = undefined;

export const goldenFixtures: GoldenFixture[] = [
  // text — a missing field never matches, including for negated operators
  single("text_is", text, { op: "is", value: "gold" }, [["gold", true], ["silver", false], [MISSING, false]]),
  single("text_is_not", text, { op: "is_not", value: "gold" }, [["silver", true], ["gold", false], [MISSING, false]]),
  single("text_one_of", text, { op: "one_of", value: ["a", "b"] }, [["b", true], ["c", false]]),
  single("text_not_one_of", text, { op: "not_one_of", value: ["a", "b"] }, [["c", true], ["a", false], [MISSING, false]]),
  single("text_contains", text, { op: "contains", value: "ell" }, [["hello", true], ["help", false]]),
  single("text_starts_with", text, { op: "starts_with", value: "he" }, [["hello", true], ["oh", false]]),
  single("text_ends_with", text, { op: "ends_with", value: "lo" }, [["hello", true], ["low", false]]),
  // number
  single("num_eq", num, { op: "eq", value: 5 }, [[5, true], [5.0, true], [6, false], ["5", false]]),
  single("num_neq", num, { op: "neq", value: 5 }, [[6, true], [5, false], [MISSING, false]]),
  single("num_gt", num, { op: "gt", value: 500 }, [[501, true], [500, false]]),
  single("num_gte", num, { op: "gte", value: 500 }, [[500, true], [499.99, false]]),
  single("num_lt", num, { op: "lt", value: 10 }, [[9, true], [10, false]]),
  single("num_lte", num, { op: "lte", value: 10 }, [[10, true], [11, false]]),
  single("num_between", num, { op: "between", value: [10, 20] }, [[10, true], [20, true], [21, false]]),
  // yes/no
  single("yesno_is_true", yesno, { op: "is", value: true }, [[true, true], [false, false], ["true", false]]),
  single("yesno_is_false", yesno, { op: "is", value: false }, [[false, true], [true, false], [MISSING, false]]),
  // dates: "before D" = before D starts, "after D" = from the next day, "on D" = during D (UTC)
  single("date_before", date, { op: "before", value: "2026-03-10" }, [["2026-03-09", true], ["2026-03-10T00:00:00Z", false]]),
  single("date_after", date, { op: "after", value: "2026-03-10" }, [["2026-03-11T00:00:00Z", true], ["2026-03-10T23:59:59Z", false]]),
  single("date_on", date, { op: "on", value: "2026-03-10" }, [["2026-03-10T12:00:00Z", true], ["2026-03-10", true], ["2026-03-11", false]]),
  single("date_within_last_days", date, { op: "within_last_days", value: 7 }, [["$daysAgo:3", true], ["$daysAgo:8", false], ["not a date", false]]),
  single("date_more_than_days_ago", date, { op: "more_than_days_ago", value: 30 }, [["$daysAgo:31", true], ["$daysAgo:2", false]]),
  // list
  single("list_includes", list, { op: "includes", value: "admin" }, [[["user", "admin"], true], [["user"], false], ["admin", false]]),
  single("list_includes_any", list, { op: "includes_any", value: ["a", "b"] }, [[["x", "b"], true], [["x"], false], [[], false]]),
  single("list_is_empty", list, { op: "is_empty", value: true }, [[[], true], [["x"], false], [MISSING, false]]),
  single("list_is_not_empty", list, { op: "is_empty", value: false }, [[["x"], true], [[], false]]),
  // structure
  {
    name: "first_match_wins_and_any_vs_all",
    ruleSet: {
      schemaVersion: 1,
      fields: [
        { path: "customer.tier", label: "Tier", type: "text" },
        { path: "order.total", label: "Total", type: "number" },
      ],
      outcomes: [{ key: "discount", label: "Discount", type: "number" }],
      rules: [
        {
          id: "gold",
          label: "Gold and big",
          match: "all",
          conditions: [
            { field: "customer.tier", op: "is", value: "gold" },
            { field: "order.total", op: "gt", value: 500 },
          ],
          result: { allowed: true, reason: "Gold", outcomes: { discount: 15 } },
        },
        {
          id: "either",
          label: "Gold or big",
          match: "any",
          conditions: [
            { field: "customer.tier", op: "is", value: "gold" },
            { field: "order.total", op: "gte", value: 1000 },
          ],
          result: { allowed: true, reason: "Either", outcomes: { discount: 5 } },
        },
      ],
      otherwise: { allowed: false, reason: "No rule matched", outcomes: { discount: 0 } },
    },
    cases: [
      { input: { customer: { tier: "gold" }, order: { total: 2000 } }, expect: { allowed: true, rule: "gold", outcomes: { discount: 15 } } },
      { input: { customer: { tier: "gold" }, order: { total: 100 } }, expect: { allowed: true, rule: "either", outcomes: { discount: 5 } } },
      { input: { customer: { tier: "bronze" }, order: { total: 1000 } }, expect: { allowed: true, rule: "either" } },
      { input: { customer: { tier: "bronze" }, order: { total: 999 } }, expect: { allowed: false, rule: null, outcomes: { discount: 0 } } },
      { input: {}, expect: { allowed: false, rule: null } },
    ],
  },
];

// Two "includes any of" conditions in one ALL rule (review finding: duplicate `some item` var).
goldenFixtures.push({
  name: "two_includes_any_all",
  ruleSet: {
    schemaVersion: 1,
    fields: [
      { path: "user.roles", label: "Roles", type: "list" },
      { path: "user.groups", label: "Groups", type: "list" },
    ],
    outcomes: [],
    rules: [
      {
        id: "r1",
        label: "both",
        match: "all",
        conditions: [
          { field: "user.roles", op: "includes_any", value: ["admin", "ops"] },
          { field: "user.groups", op: "includes_any", value: ["eu"] },
        ],
        result: { allowed: true, reason: "ok", outcomes: {} },
      },
    ],
    otherwise: { allowed: false, reason: "No rule matched", outcomes: {} },
  },
  cases: [
    { input: { user: { roles: ["ops"], groups: ["eu", "us"] } }, expect: { allowed: true, rule: "r1" } },
    { input: { user: { roles: ["ops"], groups: ["us"] } }, expect: { allowed: false, rule: null } },
  ],
});
