# Deploying to Railway

peng-opa runs as one long-lived service: the Node server serves the API and the web app, and keeps the bundled Open
Policy Agent running beside it. Railway fits that shape. Serverless hosts such as Vercel do not: they can't run OPA as
a child process, and they freeze the server between requests, which stops the audit-log flush and the OPA sync.

The repository carries everything Railway needs:

| File | What it does |
|---|---|
| `Dockerfile` | Installs dependencies (which downloads and verifies OPA for Linux), builds everything, and starts with `pnpm start` |
| `railway.json` | Builds from the Dockerfile, runs one replica, and waits for `/health` (database and OPA both up) before switching traffic |
| `.dockerignore` | Keeps `node_modules`, builds, `.env` and the Windows OPA binary out of the image |

Docker is only used by Railway's build. Local development still runs without it.

## 1. Create the project

1. In Railway, choose **New Project → Deploy from GitHub repo** and pick `Pengopal/peng-opa`, branch `main`. (After the first deploy, switch to deploying from GitHub Actions: see section 3.)
2. Create the database: either a [Neon](https://neon.tech) project (what opa.pengopal.com uses), or **New → Database →
   PostgreSQL** in the same Railway project.

## 2. Set the variables

Open the peng-opa service, go to **Variables**, and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon: the **direct** connection string (host without `-pooler`, with `?sslmode=require`); migrations need a direct connection. Railway Postgres: `${{Postgres.DATABASE_URL}}` |
| `APP_URL` | `https://opa.pengopal.com` |
| `BETTER_AUTH_SECRET` | A new random string of 32+ characters (for example `openssl rand -base64 48`) |
| `OPA_TOKEN` | Another new random string |
| `RATE_LIMIT_RPS` | Optional, default 50 |
| `DEMO_PUBLIC` | Optional: `true` for the shared read-only demo on the sign-in page |
| `RESEND_API_KEY`, `MAIL_FROM` | Optional: send invite emails through Resend (see below) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional: "Continue with Google" |

Do not set `PORT` (Railway sets it) or `OPA_URL` (the bundled OPA is used). Never reuse the secrets from your local
`.env`.

## 3. Deploy

GitHub Actions deploys every merge to `main`, but only after the `test` and `web-e2e` jobs pass (the `deploy` job in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). The first build takes a few minutes. Each start runs
`prisma migrate deploy` before the server comes up, so database changes ship with the code.

### Deploy from GitHub Actions (one-time setup)

1. **Railway: create a project token.** Open the project → **Settings → Tokens → Create token**, pick the
   **production** environment, and copy the token.
2. **Railway: note the service name.** It is the name on the peng-opa service card (for example `peng-opa`).
3. **GitHub: add an environment.** In `Pengopal/peng-opa` open **Settings → Environments → New environment**, name it
   `production`. Optionally add yourself under **Required reviewers** to approve each deploy, and limit
   **Deployment branches** to `main`.
4. **GitHub: add the secret and variables** to that `production` environment:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `RAILWAY_TOKEN` | the project token from step 1 |
   | Variable | `RAILWAY_SERVICE` | the service name from step 2 |
   | Variable | `APP_URL` | `https://opa.pengopal.com` (optional: the job then waits for `/health` to report db and OPA ok) |

5. **Railway: stop the second deploy.** Open the service → **Settings → Source** and disconnect the GitHub repo (or
   turn off automatic deploys for `main`). Otherwise Railway also deploys each push straight away, before the tests
   have run, and every merge deploys twice.

To deploy by hand (for example after a failed run), re-run the `deploy` job from the Actions tab, or run
`railway up --service <name>` from a checkout with the Railway CLI logged in.

If the deploy job fails with "Add the RAILWAY_TOKEN secret", step 4 is missing. If it fails during the build, the
Railway build log is printed in the job output.

Check the deployment is healthy: `https://<service>.up.railway.app/health` should return
`{"app":"ok","db":"ok","opa":"ok"}`.

## 4. Point opa.pengopal.com at it

1. In the service, open **Settings → Networking → Custom Domain**, enter `opa.pengopal.com`, and set the port to the
   one Railway shows for the service (it listens on `$PORT`).
2. Railway shows a **CNAME** target (and sometimes a TXT record for verification). At the DNS provider for
   `pengopal.com`, add:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `opa` | the target Railway shows |
   | TXT | the name Railway shows, if any | the value Railway shows |

   If `pengopal.com` is on Cloudflare, set the CNAME to **DNS only** (grey cloud) until Railway has issued the
   certificate.
3. Wait for Railway to show the domain as active with a certificate, then open <https://opa.pengopal.com>.

## 5. After the first deploy

- **Google sign-in and invite emails:** see the two sections below.
- **Email verification:** before opening sign-up to the public, set up email and turn on verification — see
  [Known issues](known-issues.md).
- **Backups:** Neon keeps point-in-time history (check the retention on your plan); on Railway Postgres, turn on
  backups.

## Invite emails with Resend

Railway blocks outbound SMTP on most plans, so peng-opa sends email through Resend's HTTPS API instead.

1. Sign in at [resend.com](https://resend.com) and open **Domains → Add Domain**. Use `pengopal.com` (or a
   subdomain such as `mail.pengopal.com`).
2. Add the DNS records Resend shows (an MX and TXT record for SPF, and a TXT record for DKIM) at the DNS provider for
   `pengopal.com`, then click **Verify**. Wait until the domain shows **Verified**.
3. Open **API Keys → Create API Key**, with **Sending access** restricted to that domain. Copy the key (`re_…`); it
   is shown once.
4. In Railway, set `RESEND_API_KEY` to the key and `MAIL_FROM` to a sender on the verified domain, for example
   `peng-opa <no-reply@pengopal.com>`. The app refuses to start with a key but no `MAIL_FROM`.
5. After the redeploy, invite someone from **Settings → Members**. The dialog says the email was sent; if Resend
   rejects it, the server log shows why and the invite link can still be copied.

## Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com), create or pick a project, then open **APIs &
   Services → OAuth consent screen**. Choose **External**, fill in the app name (peng-opa), support email and the
   authorised domain `pengopal.com`, and keep the default scopes (email, profile, openid). Publish it to
   **In production** so anyone can sign in, not only test users.
2. Open **Credentials → Create credentials → OAuth client ID**, type **Web application**:

   | Field | Value |
   |---|---|
   | Authorised JavaScript origins | `https://opa.pengopal.com` |
   | Authorised redirect URIs | `https://opa.pengopal.com/api/auth/callback/google` |

   For local development, also add `http://localhost:5180` and `http://localhost:5180/api/auth/callback/google`.
3. Copy the client ID and secret into Railway as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. After the redeploy,
   the sign-in page shows **Continue with Google**.

## Keep it to one replica

Rate limits and the OPA engine live inside each instance. Scaling to several replicas would give each its own limits
and its own OPA (kept in sync from the database every 60 seconds). One replica handles a lot of traffic; change this
only together with a shared rate-limit store.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails at `pnpm install` downloading OPA | GitHub was unreachable from the build; redeploy |
| Deploy never becomes healthy | Open the deploy logs: a missing variable is reported as `Missing required env var …`; a database error usually means `DATABASE_URL` isn't referencing the Postgres service |
| Sign-in fails or loops on the custom domain | `APP_URL` must be exactly `https://opa.pengopal.com` (no trailing slash), and you must open the app on that address |
| `/health` shows `"opa":"down"` | OPA is restarting; it retries with backoff. If it stays down, check the logs for the OPA exit reason |
