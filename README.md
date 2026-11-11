# peng-opa

Business rules and access policies, decided in milliseconds — a multi-tenant policy manager powered by the
[Open Policy Agent](https://www.openpolicyagent.org) engine, by Pengopal.

Ops and compliance teams build rules as sentences ("When customer tier is gold and order total is at least 200 →
allow, 15% discount"), test them in a Try-it panel, and publish. Their systems ask for decisions with one HTTPS call.

- **No Docker.** One Node process serves the API and the web app, and starts the bundled OPA binary next to it.
- **Multi-tenant.** Every workspace's data and OPA policies are isolated; API keys only see their own workspace.
- **Demo mode.** One click creates "Acme Retail" with four live policies, two weeks of history and live traffic.

Design: [`docs/superpowers/specs/2026-11-11-peng-opa-design.md`](docs/superpowers/specs/2026-11-11-peng-opa-design.md) ·
Build plan: [`docs/superpowers/plans/2026-11-11-peng-opa.md`](docs/superpowers/plans/2026-11-11-peng-opa.md)

## Quick start

Needs Node 22+, pnpm 10 and PostgreSQL 14+.

```bash
pnpm install                 # also downloads OPA 1.11.0 into tools/opa and checks its SHA-256
cp .env.example .env         # then set DATABASE_URL (and TEST_DATABASE_URL for tests)
createdb peng_opa            # or create it in pgAdmin
pnpm --filter server db:deploy
pnpm dev                     # API on :3000, web app on http://localhost:5180
```

Open http://localhost:5180, create an account, and pick **Explore the demo workspace** to look around.

### Production

```bash
pnpm build
pnpm start                   # runs migrations, then serves API + app on PORT (default 3000)
```

Set `APP_URL` to the address people use to reach it (it is used for sign-in and invite links).

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Long random string that signs sessions |
| `APP_URL` | Public URL of the app (dev: `http://localhost:5180`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional: "Continue with Google" |
| `OPA_PORT` | Port of the bundled OPA (default 8181, bound to 127.0.0.1) |
| `OPA_URL` | Optional: use an OPA you run yourself instead of the bundled one |
| `OPA_TOKEN` | Shared secret between the app and OPA |
| `RATE_LIMIT_RPS` | Decision requests per second per workspace (default 50) |
| `DEMO_PUBLIC` | `true` shows "Try the live demo" on the sign-in page (shared read-only demo) |
| `SMTP_URL` | Optional: send invite emails; without it, invite links are shown to copy |
| `TEST_DATABASE_URL` | Database the tests create and drop schemas in |

## Decision API

```http
POST /v1/decide/checkout-discount
Authorization: Bearer pk_live_…
Content-Type: application/json

{ "input": { "customer": { "tier": "gold" }, "order": { "total": 620 } } }
```

```json
{
  "allowed": true,
  "reason": "Gold loyalty discount",
  "outcomes": { "discount": 15 },
  "rule": "Gold customers on bigger orders",
  "policy": { "key": "checkout-discount", "version": 3 },
  "decisionId": "dec_…"
}
```

`POST /v1/decide/<key>/batch` takes `{ "inputs": [ … ] }` (up to 100). Errors are
`{ "error": { "code", "message" } }`:

| Status | Code | When |
|---|---|---|
| 401 | `invalid_api_key` | Missing, unknown or revoked key |
| 404 | `policy_not_found` | No policy with that key in the key's workspace |
| 409 | `policy_not_live` | The policy is a draft or paused |
| 413 | `payload_too_large` | Body over 64 KB |
| 422 | `invalid_input` | A field has the wrong type (e.g. `"620"` for a number) |
| 429 | `rate_limited` | Over the workspace's requests per second |
| 503 | `engine_unavailable` | OPA is down or restarting — retry shortly |

A field that is missing is not an error: conditions on it simply don't match.

## Tests

```bash
pnpm test                    # unit tests (shared rules, compiler, web components)
pnpm test:e2e                # API end-to-end against TEST_DATABASE_URL and a test-spawned OPA
pnpm build && pnpm test:e2e:web   # browser journeys (Playwright) against the production build
```

## Layout

| Path | What |
|---|---|
| `packages/shared` | Rule-set types, validation, input checking, sentences for rules |
| `apps/server` | NestJS API: auth, workspaces, policies, Rego compiler, OPA gateway and sync, decisions, templates, demo |
| `apps/web` | React app (Vite, TanStack Router/Query, shadcn/ui) in the Pengopal theme |
| `ops/opa/authz.rego` | OPA's own access rule: only the app's token may call it |
| `scripts/fetch-opa.mjs` | Downloads and verifies the OPA binary |
