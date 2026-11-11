# Contributing to peng-opa

Thanks for helping. This page covers how the repository is laid out, how to run it, and the rules every change
follows.

## Getting set up

Follow [docs/SETUP.md](docs/SETUP.md). You'll need Node 22, pnpm 10 and PostgreSQL, plus a second database for the
API tests (`TEST_DATABASE_URL`).

## Repository layout

| Path | What lives there |
|---|---|
| `packages/shared` | Rule-set types, validation, input checking, and the sentences rules are shown as. Used by both apps |
| `apps/server` | NestJS API: auth, workspaces, policies, the Rego compiler, the OPA gateway and sync, decisions, templates, demo |
| `apps/server/prisma` | Database schema and migrations |
| `apps/server/test` | API end-to-end tests and the golden Rego fixtures |
| `apps/web` | React app (Vite, TanStack Router and Query, shadcn/ui, Tailwind) |
| `apps/web/e2e` | Playwright browser journeys |
| `ops/opa/authz.rego` | OPA's own access rule: only the app's token may call it |
| `scripts/fetch-opa.mjs` | Downloads and verifies the OPA binary |
| `docs/` | Setup, guides, the design spec and the build log |

## Making a change

1. **Branch** from `main` (`feat/…`, `fix/…`, `docs/…`).
2. **Write the failing test first**, then the code. Bug fixes start with a test that reproduces the bug.
3. **Keep tests useful.** Test behaviour people depend on — isolation, decisions, publishing, what the user sees —
   not implementation details. One good test beats five shallow ones.
4. **Run the checks** before pushing:

   ```bash
   pnpm typecheck
   ```

   ```bash
   pnpm test
   ```

   ```bash
   pnpm test:e2e
   ```

   Run `pnpm build && pnpm test:e2e:web` too when you change a page.
5. **Open a pull request** against `main` with what changed, why, and how you tested it. CI must be green.

## Rules every change follows

- **Workspace isolation is not optional.** Tenant-owned tables carry `workspaceId`, and queries go through the scoped
  Prisma client. Use `prisma.unscoped` only where a workspace can't apply (sign-in, the public decision API's key
  lookup, demo setup), and say why in the code. The public API takes its workspace from the API key, never from the
  request.
- **Database changes are migrations.** Edit `schema.prisma`, run `pnpm --filter server db:migrate`, and commit the
  generated migration.
- **Rego changes are golden-tested.** If you change the compiler, update the fixtures in `apps/server/test/golden`
  and check the new output by eye.
- **Plain-language UI.** The people using this are ops staff, not engineers: say "Allow", "Publish", "Response time",
  not "effect", "deploy", "p95". Follow the page patterns in [apps/web/UI-PATTERNS.md](apps/web/UI-PATTERNS.md) and
  use the theme tokens in `apps/web/src/index.css`, not literal colours.
- **Errors from the decision API** keep the `{ "error": { "code", "message" } }` shape, and new codes are added to
  [Connect your app](docs/guides/connect-your-app.md).
- **No secrets in the repo.** Settings belong in `.env`; add new ones to `.env.example` with a safe placeholder and
  to [docs/SETUP.md](docs/SETUP.md).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org): `feat(editor): …`, `fix(decisions): …`,
`docs: …`, `test: …`, `chore: …`. Keep the subject under 72 characters and explain the why in the body.

## Reporting problems

- **Bugs:** open an issue with steps to reproduce, what you expected, and what happened.
- **Security problems:** don't open a public issue. Email the Pengopal team privately with the details.
