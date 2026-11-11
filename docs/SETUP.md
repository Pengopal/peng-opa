# Setting up locally

peng-opa runs as one Node process plus PostgreSQL. There is no Docker: the server starts the bundled Open Policy
Agent binary itself.

## Requirements

| Tool | Version |
|---|---|
| Node.js | 22 or later |
| pnpm | 10 (the repo pins `pnpm@10.18.2` through `packageManager`) |
| PostgreSQL | 14 or later, running locally or reachable over the network |

## First run

1. **Install dependencies.** `postinstall` downloads OPA 1.11.0 for your platform into `tools/opa/` and checks it
   against its published SHA-256. If the download is blocked, run `node scripts/fetch-opa.mjs` again once you have
   access, or point `OPA_URL` at an OPA you run yourself.

   ```bash
   pnpm install
   ```

2. **Create your settings file** and fill in at least `DATABASE_URL`, `BETTER_AUTH_SECRET` and `OPA_TOKEN`.

   ```bash
   cp .env.example .env
   ```

3. **Create the database** (or use pgAdmin), then apply the migrations.

   ```bash
   createdb peng_opa
   ```

   ```bash
   pnpm --filter server db:deploy
   ```

4. **Start the API and the web app.** The API listens on port 3000; the web app on <http://localhost:5180> proxies
   `/api` and `/v1` to it.

   ```bash
   pnpm dev
   ```

5. Open <http://localhost:5180>, create an account, and choose **Explore the demo workspace**.

## Configuration

All settings are read from `.env` at the repository root.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Long random string that signs sessions. Changing it signs everyone out |
| `APP_URL` | Yes | Address people use to reach the app. Dev: `http://localhost:5180`; production: the server's own URL |
| `OPA_TOKEN` | Yes | Shared secret between the app and OPA |
| `OPA_PORT` | No | Port of the bundled OPA (default 8181, bound to 127.0.0.1) |
| `OPA_URL` | No | Use an OPA you run yourself instead of the bundled one |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Turns on "Continue with Google" |
| `RATE_LIMIT_RPS` | No | Decision requests per second per workspace (default 50) |
| `DEMO_PUBLIC` | No | `true` shows "Try the live demo" on the sign-in page (one shared, read-only account) |
| `SMTP_URL` | No | Sends invite emails. Without it, invites are shown as links to copy |
| `TEST_DATABASE_URL` | Tests only | A database the API tests may create and drop schemas in |

## Running the tests

| Command | What it runs | Needs |
|---|---|---|
| `pnpm test` | Unit tests: rule validation, the Rego compiler, web components | Nothing |
| `pnpm test:e2e` | API end-to-end tests, each run in its own schema, against a test-spawned OPA | `TEST_DATABASE_URL` |
| `pnpm build && pnpm test:e2e:web` | Browser journeys (Playwright) against the production build | `DATABASE_URL`, Chromium (`pnpm --filter web exec playwright install chromium`) |
| `pnpm typecheck` | TypeScript across every package | Nothing |

CI runs all four on every push and pull request (`.github/workflows/ci.yml`).

## Running in production

```bash
pnpm build
```

```bash
pnpm start
```

`pnpm start` applies any pending migrations, then serves the API and the built web app together on `PORT`
(default 3000). Set `APP_URL` to the public address, put a TLS-terminating proxy in front, and keep `.env` out of
version control.

To host it on Railway, follow [Deploying to Railway](DEPLOY.md).

Before opening sign-up to the public, configure `SMTP_URL` and turn on email verification — see
[Known issues](known-issues.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `engine_unavailable` (503) from every decision | OPA is starting or restarting; it retries with backoff. Check the server log for the OPA exit reason, and that `OPA_PORT` is free |
| "Prisma schema mismatch" or missing client after pulling | Run `pnpm install` (it regenerates the Prisma client), then `pnpm --filter server db:deploy` |
| Port 5180 already in use | Stop the other process; the dev server uses a fixed port so the API's sign-in links stay valid |
| Sign-in works but you land back on the sign-in page | `APP_URL` doesn't match the address in your browser |
