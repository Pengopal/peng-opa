import { allow, chance, deny, int, pick, rule, ruleSet, type Template } from "../template.types.js";

const CATEGORIES = ["travel", "meals", "software", "equipment", "other"];
const LEVELS = ["staff", "manager", "director"];
const LEAVE_TYPES = ["annual", "sick", "unpaid"];

export const loanPreApproval: Template = {
  id: "loan-pre-approval",
  name: "Loan pre-approval",
  category: "Finance",
  description: "Pre-approve loan applicants and pick their rate and limit.",
  ruleSet: ruleSet(
    [
      { path: "applicant.has_defaults", label: "Previous defaults", type: "yesno" },
      { path: "applicant.credit_score", label: "Credit score", type: "number" },
      { path: "applicant.annual_income", label: "Annual income", type: "number" },
    ],
    [
      { key: "rate", label: "Interest rate %", type: "number" },
      { key: "max_amount", label: "Maximum amount", type: "number" },
    ],
    [
      rule("r1", "Previous defaults", "all", [{ field: "applicant.has_defaults", op: "is", value: true }], deny("Previous defaults on record")),
      rule("r2", "Excellent credit", "all", [
        { field: "applicant.credit_score", op: "gte", value: 750 },
        { field: "applicant.annual_income", op: "gte", value: 60000 },
      ], allow("Pre-approved at our best rate", { rate: 5.5, max_amount: 50000 })),
      rule("r3", "Good credit", "all", [
        { field: "applicant.credit_score", op: "gte", value: 680 },
        { field: "applicant.annual_income", op: "gte", value: 40000 },
      ], allow("Pre-approved", { rate: 8.9, max_amount: 20000 })),
    ],
    deny("Does not meet the pre-approval criteria"),
  ),
  samples: [
    { name: "Has defaults", input: { applicant: { has_defaults: true, credit_score: 800, annual_income: 90000 } }, expect: { allowed: false, rule: "r1" } },
    { name: "Score 780, $75k", input: { applicant: { has_defaults: false, credit_score: 780, annual_income: 75000 } }, expect: { allowed: true, rule: "r2" } },
    { name: "Score 700, $45k", input: { applicant: { has_defaults: false, credit_score: 700, annual_income: 45000 } }, expect: { allowed: true, rule: "r3" } },
    { name: "Score 620", input: { applicant: { has_defaults: false, credit_score: 620, annual_income: 90000 } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({
    applicant: { has_defaults: chance(rng, 0.08), credit_score: int(rng, 520, 840), annual_income: int(rng, 20, 160) * 1000 },
  }),
};

export const expenseAutoApproval: Template = {
  id: "expense-auto-approval",
  name: "Expense auto-approval",
  category: "Finance",
  description: "Approve routine expenses without waiting for a manager.",
  ruleSet: ruleSet(
    [
      { path: "expense.amount", label: "Amount", type: "number" },
      { path: "expense.category", label: "Category", type: "text", options: CATEGORIES },
      { path: "employee.level", label: "Employee level", type: "text", options: LEVELS },
    ],
    [],
    [
      rule("r1", "Small expenses", "all", [{ field: "expense.amount", op: "lte", value: 50 }], allow("Small expenses are approved automatically")),
      rule("r2", "Manager travel", "all", [
        { field: "employee.level", op: "one_of", value: ["manager", "director"] },
        { field: "expense.category", op: "is", value: "travel" },
        { field: "expense.amount", op: "lte", value: 2000 },
      ], allow("Manager travel approved")),
      rule("r3", "Software under $500", "all", [
        { field: "expense.category", op: "is", value: "software" },
        { field: "expense.amount", op: "lte", value: 500 },
      ], allow("Software purchase approved")),
    ],
    deny("Needs manager approval"),
  ),
  samples: [
    { name: "$30 lunch", input: { expense: { amount: 30, category: "meals" }, employee: { level: "staff" } }, expect: { allowed: true, rule: "r1" } },
    { name: "Manager flight", input: { expense: { amount: 900, category: "travel" }, employee: { level: "manager" } }, expect: { allowed: true, rule: "r2" } },
    { name: "$300 software", input: { expense: { amount: 300, category: "software" }, employee: { level: "staff" } }, expect: { allowed: true, rule: "r3" } },
    { name: "Staff flight", input: { expense: { amount: 900, category: "travel" }, employee: { level: "staff" } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({
    expense: { amount: int(rng, 5, 2500), category: pick(rng, CATEGORIES) },
    employee: { level: pick(rng, LEVELS) },
  }),
};

export const leaveRequestApproval: Template = {
  id: "leave-request-approval",
  name: "Leave request approval",
  category: "HR",
  description: "Approve sick leave and short, well-planned annual leave automatically.",
  ruleSet: ruleSet(
    [
      { path: "request.type", label: "Leave type", type: "text", options: LEAVE_TYPES },
      { path: "request.days", label: "Days requested", type: "number" },
      { path: "request.notice_days", label: "Days of notice", type: "number" },
    ],
    [],
    [
      rule("r1", "Sick leave", "all", [{ field: "request.type", op: "is", value: "sick" }], allow("Sick leave is approved automatically")),
      rule("r2", "Short annual leave with notice", "all", [
        { field: "request.type", op: "is", value: "annual" },
        { field: "request.days", op: "lte", value: 5 },
        { field: "request.notice_days", op: "gte", value: 7 },
      ], allow("Approved: short leave with enough notice")),
    ],
    deny("Needs manager approval"),
  ),
  samples: [
    { name: "Sick day", input: { request: { type: "sick", days: 1, notice_days: 0 } }, expect: { allowed: true, rule: "r1" } },
    { name: "3 days, 2 weeks notice", input: { request: { type: "annual", days: 3, notice_days: 14 } }, expect: { allowed: true, rule: "r2" } },
    { name: "10 days annual", input: { request: { type: "annual", days: 10, notice_days: 30 } }, expect: { allowed: false, rule: null } },
    { name: "Unpaid leave", input: { request: { type: "unpaid", days: 2, notice_days: 30 } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({ request: { type: pick(rng, LEAVE_TYPES), days: int(rng, 1, 15), notice_days: int(rng, 0, 40) } }),
};
