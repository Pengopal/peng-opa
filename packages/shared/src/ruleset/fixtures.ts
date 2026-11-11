import type { RuleSet } from "./types.js";

/** A small valid rule set reused by tests across packages. */
export function sampleRuleSet(): RuleSet {
  return {
    schemaVersion: 1,
    fields: [
      { path: "customer.tier", label: "Customer tier", type: "text", options: ["gold", "silver", "bronze"] },
      { path: "order.total", label: "Order total", type: "number" },
    ],
    outcomes: [{ key: "discount", label: "Discount %", type: "number" }],
    rules: [
      {
        id: "r1",
        label: "Gold customers",
        match: "all",
        conditions: [
          { field: "customer.tier", op: "is", value: "gold" },
          { field: "order.total", op: "gt", value: 500 },
        ],
        result: { allowed: true, reason: "Gold loyalty", outcomes: { discount: 15 } },
      },
      {
        id: "r2",
        label: "Big orders",
        match: "any",
        conditions: [{ field: "order.total", op: "gte", value: 1000 }],
        result: { allowed: true, reason: "Big order", outcomes: { discount: 5 } },
      },
    ],
    otherwise: { allowed: false, reason: "No rule matched", outcomes: {} },
  };
}
