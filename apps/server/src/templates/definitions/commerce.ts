import { allow, chance, deny, int, pick, rule, ruleSet, type Template } from "../template.types.js";

const TIERS = ["gold", "silver", "bronze"];
const COUNTRIES = ["US", "CA", "GB", "DE", "FR", "AE", "SA"];

export const checkoutDiscount: Template = {
  id: "checkout-discount",
  name: "Checkout discount",
  category: "Commerce",
  description: "Give loyal and first-time customers a discount at checkout.",
  ruleSet: ruleSet(
    [
      { path: "customer.tier", label: "Customer tier", type: "text", options: TIERS },
      { path: "customer.first_order", label: "First order", type: "yesno" },
      { path: "order.total", label: "Order total", type: "number" },
    ],
    [{ key: "discount", label: "Discount %", type: "number" }],
    [
      rule("r1", "Gold customers on bigger orders", "all", [
        { field: "customer.tier", op: "is", value: "gold" },
        { field: "order.total", op: "gte", value: 200 },
      ], allow("Gold loyalty discount", { discount: 15 })),
      rule("r2", "First order welcome", "all", [{ field: "customer.first_order", op: "is", value: true }], allow("Welcome discount on a first order", { discount: 10 })),
      rule("r3", "Silver customers", "all", [
        { field: "customer.tier", op: "is", value: "silver" },
        { field: "order.total", op: "gte", value: 100 },
      ], allow("Silver loyalty discount", { discount: 5 })),
    ],
    deny("No discount applies", { discount: 0 }),
  ),
  samples: [
    { name: "Gold, $250", input: { customer: { tier: "gold", first_order: false }, order: { total: 250 } }, expect: { allowed: true, rule: "r1" } },
    { name: "New bronze customer", input: { customer: { tier: "bronze", first_order: true }, order: { total: 40 } }, expect: { allowed: true, rule: "r2" } },
    { name: "Silver, $120", input: { customer: { tier: "silver", first_order: false }, order: { total: 120 } }, expect: { allowed: true, rule: "r3" } },
    { name: "Bronze, $50", input: { customer: { tier: "bronze", first_order: false }, order: { total: 50 } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({
    customer: { tier: pick(rng, TIERS), first_order: chance(rng, 0.15) },
    order: { total: int(rng, 10, 600) },
  }),
};

export const freeShipping: Template = {
  id: "free-shipping",
  name: "Free shipping eligibility",
  category: "Commerce",
  description: "Decide when an order ships for free.",
  ruleSet: ruleSet(
    [
      { path: "customer.is_member", label: "Member", type: "yesno" },
      { path: "order.country", label: "Shipping country", type: "text", options: COUNTRIES },
      { path: "order.total", label: "Order total", type: "number" },
    ],
    [],
    [
      rule("r1", "Members ship free", "all", [{ field: "customer.is_member", op: "is", value: true }], allow("Members always ship free")),
      rule("r2", "Large domestic orders", "all", [
        { field: "order.country", op: "one_of", value: ["US", "CA"] },
        { field: "order.total", op: "gte", value: 50 },
      ], allow("Free shipping on domestic orders over $50")),
      rule("r3", "Very large orders anywhere", "all", [{ field: "order.total", op: "gte", value: 150 }], allow("Free international shipping over $150")),
    ],
    deny("A shipping fee applies"),
  ),
  samples: [
    { name: "Member, small order", input: { customer: { is_member: true }, order: { country: "DE", total: 20 } }, expect: { allowed: true, rule: "r1" } },
    { name: "US, $60", input: { customer: { is_member: false }, order: { country: "US", total: 60 } }, expect: { allowed: true, rule: "r2" } },
    { name: "France, $200", input: { customer: { is_member: false }, order: { country: "FR", total: 200 } }, expect: { allowed: true, rule: "r3" } },
    { name: "UK, $60", input: { customer: { is_member: false }, order: { country: "GB", total: 60 } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({
    customer: { is_member: chance(rng, 0.25) },
    order: { country: pick(rng, COUNTRIES), total: int(rng, 5, 300) },
  }),
};

export const refundApproval: Template = {
  id: "refund-approval",
  name: "Refund approval",
  category: "Commerce",
  description: "Approve small refunds automatically and send the rest to a person.",
  ruleSet: ruleSet(
    [
      { path: "refund.amount", label: "Refund amount", type: "number" },
      { path: "refund.days_since_purchase", label: "Days since purchase", type: "number" },
      { path: "customer.tier", label: "Customer tier", type: "text", options: TIERS },
    ],
    [{ key: "needs_review", label: "Needs review", type: "yesno" }],
    [
      rule("r1", "Outside the refund window", "all", [{ field: "refund.days_since_purchase", op: "gt", value: 30 }], deny("Outside the 30-day refund window", { needs_review: false })),
      rule("r2", "Small refunds", "all", [{ field: "refund.amount", op: "lte", value: 100 }], allow("Small refund approved automatically", { needs_review: false })),
      rule("r3", "Gold customers up to $500", "all", [
        { field: "customer.tier", op: "is", value: "gold" },
        { field: "refund.amount", op: "lte", value: 500 },
      ], allow("Gold customer refund approved", { needs_review: false })),
    ],
    deny("Needs manual review", { needs_review: true }),
  ),
  samples: [
    { name: "Late request", input: { refund: { amount: 20, days_since_purchase: 45 }, customer: { tier: "gold" } }, expect: { allowed: false, rule: "r1" } },
    { name: "$80 refund", input: { refund: { amount: 80, days_since_purchase: 5 }, customer: { tier: "bronze" } }, expect: { allowed: true, rule: "r2" } },
    { name: "Gold, $400", input: { refund: { amount: 400, days_since_purchase: 10 }, customer: { tier: "gold" } }, expect: { allowed: true, rule: "r3" } },
    { name: "Silver, $400", input: { refund: { amount: 400, days_since_purchase: 10 }, customer: { tier: "silver" } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({
    refund: { amount: int(rng, 5, 800), days_since_purchase: int(rng, 0, 45) },
    customer: { tier: pick(rng, TIERS) },
  }),
};
