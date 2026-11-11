import { allow, chance, deny, int, pick, rule, ruleSet, type Template } from "../template.types.js";

const ROLES = ["admin", "support", "engineer", "viewer"];
const PLANS = ["free", "pro", "enterprise"];
const FEATURES = ["reports", "api", "sso", "audit_log"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const adminConsoleAccess: Template = {
  id: "admin-console-access",
  name: "Admin console access",
  category: "Access",
  description: "Only admins and support staff with MFA may open the admin console.",
  ruleSet: ruleSet(
    [
      { path: "user.mfa_enabled", label: "MFA enabled", type: "yesno" },
      { path: "user.roles", label: "Roles", type: "list", options: ROLES },
    ],
    [],
    [
      rule("r1", "MFA required", "all", [{ field: "user.mfa_enabled", op: "is", value: false }], deny("Multi-factor authentication is required")),
      rule("r2", "Admins", "all", [{ field: "user.roles", op: "includes", value: "admin" }], allow("Admins have full access")),
      rule("r3", "Support staff", "all", [{ field: "user.roles", op: "includes", value: "support" }], allow("Support staff have access")),
    ],
    deny("The admin console is limited to admins and support"),
  ),
  samples: [
    { name: "Admin without MFA", input: { user: { mfa_enabled: false, roles: ["admin"] } }, expect: { allowed: false, rule: "r1" } },
    { name: "Admin with MFA", input: { user: { mfa_enabled: true, roles: ["engineer", "admin"] } }, expect: { allowed: true, rule: "r2" } },
    { name: "Support with MFA", input: { user: { mfa_enabled: true, roles: ["support"] } }, expect: { allowed: true, rule: "r3" } },
    { name: "Engineer", input: { user: { mfa_enabled: true, roles: ["engineer"] } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({
    user: { mfa_enabled: chance(rng, 0.85), roles: ROLES.filter(() => chance(rng, 0.3)) },
  }),
};

export const featureAccessByPlan: Template = {
  id: "feature-access-by-plan",
  name: "Feature access by plan",
  category: "Access",
  description: "Turn features on or off depending on the customer's plan.",
  ruleSet: ruleSet(
    [
      { path: "account.plan", label: "Plan", type: "text", options: PLANS },
      { path: "feature.name", label: "Feature", type: "text", options: FEATURES },
    ],
    [],
    [
      rule("r1", "Enterprise gets everything", "all", [{ field: "account.plan", op: "is", value: "enterprise" }], allow("Included in Enterprise")),
      rule("r2", "Pro features", "all", [
        { field: "account.plan", op: "is", value: "pro" },
        { field: "feature.name", op: "one_of", value: ["reports", "api"] },
      ], allow("Included in Pro")),
      rule("r3", "Reports for everyone", "all", [{ field: "feature.name", op: "is", value: "reports" }], allow("Included in every plan")),
    ],
    deny("Upgrade your plan to use this feature"),
  ),
  samples: [
    { name: "Enterprise SSO", input: { account: { plan: "enterprise" }, feature: { name: "sso" } }, expect: { allowed: true, rule: "r1" } },
    { name: "Pro API", input: { account: { plan: "pro" }, feature: { name: "api" } }, expect: { allowed: true, rule: "r2" } },
    { name: "Free reports", input: { account: { plan: "free" }, feature: { name: "reports" } }, expect: { allowed: true, rule: "r3" } },
    { name: "Pro audit log", input: { account: { plan: "pro" }, feature: { name: "audit_log" } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({ account: { plan: pick(rng, PLANS) }, feature: { name: pick(rng, FEATURES) } }),
};

export const workingHoursAccess: Template = {
  id: "working-hours-access",
  name: "Working-hours access",
  category: "Access",
  description: "Allow access during business hours, and any time for on-call staff.",
  ruleSet: ruleSet(
    [
      { path: "user.on_call", label: "On call", type: "yesno" },
      { path: "request.weekday", label: "Weekday", type: "text", options: DAYS },
      { path: "request.hour", label: "Hour (0–23)", type: "number" },
    ],
    [],
    [
      rule("r1", "On-call staff", "all", [{ field: "user.on_call", op: "is", value: true }], allow("On-call staff have access at any time")),
      rule("r2", "Business hours", "all", [
        { field: "request.weekday", op: "one_of", value: ["mon", "tue", "wed", "thu", "fri"] },
        { field: "request.hour", op: "between", value: [9, 17] },
      ], allow("Within business hours")),
    ],
    deny("Access is limited to business hours"),
  ),
  samples: [
    { name: "On call, Sunday night", input: { user: { on_call: true }, request: { weekday: "sun", hour: 23 } }, expect: { allowed: true, rule: "r1" } },
    { name: "Tuesday 10:00", input: { user: { on_call: false }, request: { weekday: "tue", hour: 10 } }, expect: { allowed: true, rule: "r2" } },
    { name: "Saturday 10:00", input: { user: { on_call: false }, request: { weekday: "sat", hour: 10 } }, expect: { allowed: false, rule: null } },
    { name: "Monday 20:00", input: { user: { on_call: false }, request: { weekday: "mon", hour: 20 } }, expect: { allowed: false, rule: null } },
  ],
  generateInput: (rng) => ({ user: { on_call: chance(rng, 0.1) }, request: { weekday: pick(rng, DAYS), hour: int(rng, 0, 23) } }),
};
