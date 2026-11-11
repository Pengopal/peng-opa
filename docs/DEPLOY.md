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

1. In Railway, choose **New Project → Deploy from GitHub repo** and pick `Pengopal/peng-opa`, branch `main`.
2. In the same project, choose **New → Database → PostgreSQL**.

## 2. Set the variables

Open the peng-opa service, go to **Variables**, and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (a reference to the database you just added) |
| `APP_URL` | `https://opa.pengopal.com` |
| `BETTER_AUTH_SECRET` | A new random string of 32+ characters (for example `openssl rand -base64 48`) |
| `OPA_TOKEN` | Another new random string |
| `RATE_LIMIT_RPS` | Optional, default 50 |
| `DEMO_PUBLIC` | Optional: `true` for the shared read-only demo on the sign-in page |
| `SMTP_URL` | Optional: to send invite emails |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional: "Continue with Google" |

Do not set `PORT` (Railway sets it) or `OPA_URL` (the bundled OPA is used). Never reuse the secrets from your local
`.env`.

## 3. Deploy

Railway builds and deploys on every push to `main`. The first build takes a few minutes. Each start runs
`prisma migrate deploy` before the server comes up, so database changes ship with the code.

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

- **Google sign-in:** add `https://opa.pengopal.com/api/auth/callback/google` as an authorised redirect URI in the
  Google Cloud console.
- **Email verification:** before opening sign-up to the public, configure `SMTP_URL` — see
  [Known issues](known-issues.md).
- **Backups:** turn on backups for the Railway Postgres database.

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
