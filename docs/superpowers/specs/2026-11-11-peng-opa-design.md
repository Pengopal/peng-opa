# peng-opa — Design Spec

**Date:** 2026-11-11
**Status:** Approved in conversation, pending written-spec review
**Predecessor:** Dolf Technologies `opa-multi-tenant` (ideas reused, code rewritten)

## 1. Purpose

peng-opa is a multi-tenant SaaS for managing business and authorization rules, powered by Open Policy Agent (OPA). It is both a sellable product and a sales demo tool (built-in demo workspace).

**Primary users:** non-technical operations / compliance staff. They never need to read or write Rego.

**Success criteria**

1. A new user goes from sign-up to a live, tested policy in **under 5 minutes** (template path).
2. A developer makes a first successful API decision call by copying a sample from the Connect page, with no other documentation.
3. A salesperson can open a populated demo workspace in one click and show live traffic.
4. Workspace A can never read, evaluate, or affect workspace B's policies or data (verified by tests).

## 2. Scope

**In v1:** self sign-up, workspaces, members and roles, a no-code rule builder, Try-it panel, publish / versions / rollback, decision API with API keys, decision log and change history, template gallery, usage dashboard, demo mode.

**Out of v1:** billing, Arabic/RTL, SSO/SAML, raw Rego editing, nested condition groups, external data sources inside policies, the bundle-server distribution, outbound webhooks/alerts, sub-path deployment.

**Removed compared with Dolf:** Keycloak, HMAC request signing, Policy Groups, global Policy Inputs/Outputs/Input Groups, `tenant_code` in the request body.

## 3. Stack

| Layer | Choice |
|---|---|
| Backend | NestJS (TypeScript), Prisma, PostgreSQL |
| Auth | Better Auth (email/password + Google OAuth, sessions, invites) |
| Policy engine | OPA 1.x server (official Docker image), internal network only, token auth on |
| Frontend | React + Vite + TanStack Router + TanStack Query + shadcn/ui + Tailwind; Monaco for the Rego view; Recharts for charts |
| Monorepo | pnpm workspaces: `apps/server`, `apps/web`, `packages/shared` (RuleSet types + validation shared by both) |
| Tests | Vitest, Supertest, Testcontainers (Postgres, OPA), Playwright |
| Deploy | docker-compose: `app`, `postgres`, `opa` |

## 4. Architecture

```
Browser (React SPA) ──session cookie──▶ NestJS API ──Prisma──▶ Postgres
Customer systems ──Bearer API key──▶ POST /v1/decide/:policyKey
                                          │
                                   OpaGateway (interface)
                                          │ PUT /v1/policies/{id}, POST /v1/data/{path}
                                   OPA 1.x server (internal)
```

Policy distribution approach is **push** (approach A): the app pushes compiled Rego to OPA through the policy API. All OPA access goes through the `OpaGateway` interface, so a later move to a bundle server (approach B) changes only that module.

### 4.1 Backend modules

| Module | Responsibility | Depends on |
|---|---|---|
| `auth` | Better Auth setup, session guard, current-workspace resolution (header `x-workspace-id` checked against membership) | prisma |
| `workspaces` | Workspace CRUD, members, roles, invites, API keys (stored as SHA-256 hash + visible prefix) | prisma, auth |
| `policies` | Policy CRUD, draft autosave, publish, versions, rollback, pause/resume | rego-compiler, opa-gateway |
| `rego-compiler` | Pure function `compile(packageName, ruleSet) → string` plus `validate(ruleSet) → Issue[]`. No I/O. | shared |
| `opa-gateway` | `upsertPolicy`, `deletePolicy`, `evaluate`, `health`, `syncAll` | OPA HTTP |
| `decisions` | Public decide endpoints, playground evaluation, input type checking, async audit writer, rate limit | opa-gateway, prisma |
| `templates` | Template definitions (JSON in code), list/preview, "use template" → new Draft policy | policies |
| `insights` | Dashboard queries over `UsageDaily` and `Decision` | prisma |
| `demo` | Create/reset demo workspace, seed history, traffic simulator | templates, policies, decisions |

### 4.2 Tenant isolation

- Every tenant-owned table has `workspaceId`. A Prisma client extension adds the `workspaceId` filter to every query on tenant-owned tables, using the request's current workspace; queries without a workspace context throw.
- OPA package naming: `t_<workspaceShortId>.<policy_key_snake>`; OPA policy id: `t_<shortId>/<policyKey>`. Draft playground runs use `t_<shortId>._draft_<policyShortId>`.
- The public decide endpoint works out the workspace **only** from the API key. Any workspace or tenant identifier in the body is ignored.
- Roles: OWNER (everything, including members, keys, delete workspace), EDITOR (policies, publish, test), VIEWER (read only and the Try-it panel).

## 5. Data model

```prisma
model Workspace     { id, name, slug @unique, shortId @unique, isDemo Boolean, createdAt }
model Member        { id, workspaceId, userId, role Role, createdAt   @@unique([workspaceId, userId]) }
model Invite        { id, workspaceId, email, role, token @unique, expiresAt, acceptedAt? }
model ApiKey        { id, workspaceId, name, prefix, hash @unique, lastUsedAt?, revokedAt?, createdAt }

model Policy        { id, workspaceId, key, name, description?, status PolicyStatus,
                      draft Json /* RuleSet */, liveVersionId?, opaHash?, createdAt, updatedAt
                      @@unique([workspaceId, key]) }
model PolicyVersion { id, policyId, number Int, ruleSet Json, rego Text, note?,
                      publishedById, publishedAt   @@unique([policyId, number]) }
model PolicyEvent   { id, workspaceId, policyId, type EventType, actorId, fromVersion?, toVersion?, createdAt }
model SamplePayload { id, policyId, name, input Json }

model Decision      { id, workspaceId, policyId, versionNumber?, source Source, input Json,
                      result Json, allowed Boolean, matchedRule?, missingFields String[],
                      latencyMs Int, createdAt   @@index([workspaceId, createdAt]) }
model UsageDaily    { workspaceId, policyId, date, total, allowed, denied, p95LatencyMs
                      @@id([workspaceId, policyId, date]) }

enum Role         { OWNER EDITOR VIEWER }
enum PolicyStatus { DRAFT LIVE PAUSED }
enum Source       { API PLAYGROUND DEMO }
enum EventType    { CREATED PUBLISHED ROLLED_BACK PAUSED RESUMED DELETED }
```

Better Auth owns `User`, `Session`, `Account`, `Verification`.

`Policy.key`: lowercase letters, digits and hyphens, 3–60 chars, unique per workspace, cannot be changed after the first publish.

### 5.1 RuleSet (shared type, `packages/shared`)

```ts
type FieldType = "text" | "number" | "yesno" | "date" | "list";

interface RuleSet {
  schemaVersion: 1;
  fields:   { path: string; label: string; type: FieldType; options?: string[] }[];
  outcomes: { key: string; label: string; type: "text" | "number" | "yesno" }[];
  rules: {
    id: string; label: string; match: "all" | "any";
    conditions: { field: string; op: Operator; value: unknown }[];
    result: Result;
  }[];
  otherwise: Result;
}
interface Result { allowed: boolean; reason: string; outcomes: Record<string, string | number | boolean> }
```

- `field.path` is a dot path into `input` (for example `customer.tier`), with segments `[a-z][a-z0-9_]*`.
- Operators per type:

  | Type | Operators |
  |---|---|
  | text | is, is_not, one_of, not_one_of, contains, starts_with, ends_with |
  | number | eq, neq, gt, gte, lt, lte, between |
  | yesno | is |
  | date | before, after, on, within_last_days, more_than_days_ago |
  | list (array input) | includes, includes_any, is_empty |

- Rules are evaluated in order and the **first match wins**. `otherwise` applies when no rule matches.
- Conditions in a rule are combined by one `all` or `any`; there are no nested groups in v1.

## 6. Rego compilation

The output for a policy looks like:

```rego
package t_ab12cd.checkout_discount
import rego.v1

default decision := {"allowed": false, "reason": "No rule matched", "outcomes": {}, "rule": null}

decision := {"allowed": true, "reason": "Gold loyalty", "outcomes": {"discount": 15}, "rule": "r1"} if {
  r1
} else := {...} if {
  r2
}

# rule r1, match: all → one body containing every condition
r1 if {
  input.customer.tier == "gold"
  input.order.total > 500
}

# rule r2, match: any → one body per condition (Rego ORs bodies of the same rule)
r2 if input.customer.tier == "silver"
r2 if input.order.total > 1000
```

The `rule` value OPA returns is the rule id (`r1`); the decisions module maps it to the rule's label from the version's RuleSet before responding.

- `any` rules are emitted as several bodies of the same helper rule (OR in Rego); `all` rules as one body.
- String values go through JSON encoding; field paths are checked against the allowed pattern before use. This prevents Rego injection.
- Compiled Rego is pushed to OPA; OPA's compile errors are surfaced as a publish failure. Golden tests (section 10) are the main correctness check.
- `opaHash` (SHA-256 of the pushed Rego) is stored on the Policy for sync comparison.

## 7. User experience

### 7.1 Navigation
Sidebar: **Home · Policies · Activity · Connect · Settings**. A workspace switcher sits at the top; demo workspaces show a "Demo" badge.

### 7.2 First run
1. Sign-up (email/password or Google) → workspace name → Welcome screen.
2. Welcome cards: **Start from a template** (recommended) · **Start blank** · **Explore the demo workspace**.
3. Home shows the setup checklist until all three steps are done: Test a policy → Publish → Make your first API call (detected from the first `source = API` decision).

### 7.3 Pages

| Page | Contents |
|---|---|
| Home | Checklist (until done); tiles: decisions today, allow rate, live policies, p95 response time; 14-day decisions chart (allowed/denied stacked); 5 most recent decisions |
| Policies | List with name, status chip, "Live vN · edited X ago", decisions in the last 7 days; "New policy" → Template or Blank |
| Templates | Gallery grouped by category with a plain-sentence preview of the rules; "Use template" |
| Policy editor | Section 7.4; tabs Rules / Versions / Settings |
| Activity | Decisions tab (filters: policy, allowed/denied, source, date range; side-panel detail with input, result, matched rule, version, missing fields, "Replay in playground"); Changes tab (PolicyEvent list) |
| Connect | API keys (create → shown once, copy, revoke); endpoint URL; code samples in curl/JS/Python/C# with the chosen policy key and a sample input filled in |
| Settings | Workspace name; members, invites, roles; danger zone (delete workspace; for demo workspaces, "Reset demo" and "Simulate traffic") |

### 7.4 Policy editor
- **Two columns:** rules list on the left, Try-it panel on the right (stacked on narrow screens).
- **Each rule is a card:** "When ALL / ANY of: [field] [operator] [value] …  Then ✅ Allow / ⛔ Deny · outcomes · reason". Drag to reorder; the "Otherwise" card is fixed at the bottom.
- **Field picker** lists the policy's fields; typing an unknown path offers "Create field '<path>' (<type>)". Value input matches the field type (dropdown for options, number box, date picker, yes/no toggle, tag input for one_of).
- **Fields and Results** are managed in a drawer (label, path or key, type, options).
- **Try-it panel:** a form generated from the fields, a samples dropdown (save/load `SamplePayload`), Run → result card (Allowed/Denied chip, matched rule, outcomes, Draft or Live label, latency) and a collapsible raw JSON view. It evaluates the **draft** by default; you can toggle to the live version.
- **Autosave** the draft (debounced 1.5 s) with a "Saved / Unsaved" indicator. A "Draft changes" dot shows when the draft differs from the live version.
- **Publish:** check for validation issues (blocking: empty values, unknown fields, type mismatches; warning: unreachable rules) → summary of changes → optional note → publish.
- **Versions tab:** list, view, compare any two (rule-level, side by side), "Restore as draft", "Roll back live to vN" (creates a new version that copies vN).
- **Rego view:** read-only Monaco toggle showing the generated Rego for the draft or the selected version.
- **Visual:** shadcn base, light-first with a dark mode; Allowed/Denied always shown as green ✅ / red ⛔ chips.

## 8. Decision API

`POST /v1/decide/:policyKey` with header `Authorization: Bearer pk_live_…`

Request: `{ "input": { … } }` (max 64 KB).

Response 200:
```json
{ "allowed": true, "reason": "Gold loyalty", "outcomes": { "discount": 15 },
  "rule": "Gold customers", "policy": { "key": "checkout-discount", "version": 3 },
  "decisionId": "dec_…" }
```

Errors: `{ "error": { "code", "message" } }`

| Status | Code | When |
|---|---|---|
| 401 | invalid_api_key | Missing, unknown or revoked key |
| 404 | policy_not_found | No policy with that key in the key's workspace |
| 409 | policy_not_live | Policy is DRAFT or PAUSED |
| 413 | payload_too_large | Body > 64 KB |
| 422 | invalid_input | A field present in input has the wrong type for its definition |
| 429 | rate_limited | Over the workspace limit (default 50 rps, token bucket, env-configurable) |
| 503 | engine_unavailable | OPA unreachable or timed out (2 s) |

- Missing fields are **not** an error: conditions on them don't match. They're recorded in `Decision.missingFields`.
- `POST /v1/decide/:policyKey/batch` with `{ "inputs": [ … ] }` (max 100) returns `{ "results": [ … ] }` in the same order.
- Audit writes are asynchronous: decisions are queued in memory and written in batches every 1 s or every 200 records, with the `UsageDaily` upsert in the same transaction. On shutdown the queue is written out before exit. If the process crashes, at most about 1 s of audit rows can be lost; this is accepted for v1.
- Internal API for the SPA lives under `/api/*` (session-authenticated) and is not part of the public contract.

## 9. Demo mode

- **"Explore the demo workspace"** creates "Acme Retail (Demo)" (`isDemo = true`) owned by the current user, with 4 Live policies from templates: checkout discount, refund approval, admin console access, loan pre-approval.
- **History:** about 3,000 backdated decisions over 14 days with a realistic daily pattern, plus matching `UsageDaily` rows.
- **Simulate traffic:** toggle on Settings and Home; sends about 1 request/s per demo workspace through the real decision path (`source = DEMO`) with randomised inputs from template sample generators; switches off automatically after 10 minutes.
- **Reset demo:** deletes and recreates the demo workspace's content.
- **`DEMO_PUBLIC=true`** (optional env setting): enables a "Try the live demo" button on the sign-in page that logs into a shared demo workspace as VIEWER, without sign-up.

## 10. Reliability

- **OPA sync:** `syncAll` runs on startup, every 60 s, and after OPA health recovers. It lists OPA policies, compares them with the Live versions' `opaHash`, pushes missing or changed ones and deletes extra `t_*` ones.
- **Publish order:** validate → compile → push to OPA → on success, create the version, set it live and write an event, in one database transaction. If the push fails, nothing in the database changes.
- **Pause:** removes the policy from OPA; decide returns 409. Resume pushes the live version again.
- **Draft playground paths** are overwritten on each run; an hourly sweep deletes `_draft_` policies not used in the last hour.
- **Health:** `GET /health` (app + database + OPA). The SPA shows a banner when the engine is unavailable.

## 11. Testing

| Layer | Tooling | Coverage |
|---|---|---|
| Shared validation | Vitest | RuleSet validation: each operator/type pair, bad paths, unreachable-rule warning |
| Compiler unit | Vitest | Every operator, all/any, rule order, otherwise, string escaping, Rego snapshot tests |
| Golden (engine) | Vitest + Testcontainers OPA | Every template and fixture compiled, pushed, evaluated against expected decisions |
| API e2e | Supertest + Testcontainers Postgres/OPA | Sign-up → policy → publish → decide → Decision row; rollback; pause → 409; cross-workspace key → 404; revoked key → 401; invalid input → 422 |
| UI e2e | Playwright | (1) template → test → publish via first-run flow, (2) edit rule → Try-it shows the new result, (3) demo create → reset |
| CI | GitHub Actions | lint, typecheck, unit, golden, e2e, docker build |

## 12. Deployment

- `docker-compose.yml` with `app` (Nest serves the built SPA at `/`), `postgres:16`, `openpolicyagent/opa:1.x` (no public port, `--authentication=token`).
- Migrations run on app start; one `.env.example` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPA_URL`, `OPA_TOKEN`, `RATE_LIMIT_RPS`, `DEMO_PUBLIC`, `SMTP_URL` (invites; if unset, invite links are shown for manual copy).

## 13. Template gallery (v1 set)

| Category | Template |
|---|---|
| Commerce | Checkout discount, Free-shipping eligibility, Refund approval |
| Access | Admin console access, Feature access by plan, Working-hours access |
| Finance | Loan pre-approval, Expense auto-approval |
| HR | Leave request approval |

Each template has: name, category, description, RuleSet, 3+ sample inputs with expected decisions (used by golden tests), and a sample generator for demo traffic.
