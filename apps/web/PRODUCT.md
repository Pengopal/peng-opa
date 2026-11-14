# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Operations and compliance staff (primary).** Non-technical people who own business and access rules: who gets a discount, which refunds pass without a manager, who may open an admin console. They write rules as sentences, test them, and publish. They never read or write Rego.
- **Engineers (integrators).** Connect their systems to PengOPA by creating an API key and calling one HTTPS endpoint, `POST /v1/decide/:policyKey`. Their job is a first successful call by copying a sample from the Connect page.
- **Salespeople (demo).** Open a populated demo workspace in one click and show live decision traffic to prospects.

## Product Purpose

PengOPA is a multi-tenant SaaS for managing business rules and access policies, powered by Open Policy Agent. Rules otherwise live as `if` statements scattered across services, where each change needs a ticket, a code change and a deploy. PengOPA lets the people who own the rules change them directly, and gives every connected system the same answer in milliseconds.

Success means:
1. A new user goes from sign-up to a live, tested policy in under 5 minutes (template path).
2. A developer makes a first successful decision call from a Connect sample with no other documentation.
3. A salesperson opens a populated demo workspace in one click and shows live traffic.
4. One workspace can never read, evaluate or affect another workspace's policies or data.

## Positioning

A plain-language rule editor in front of OPA. OPA supplies fast, tested, auditable decisions; PengOPA removes Rego from the job so ops staff can own rules, while engineers integrate through a single endpoint. Each workspace is a fully isolated tenant on one shared engine.

## Operating Context

- A workspace (tenant) holds policies, members, API keys, a decision log and change history.
- A policy is an ordered list of rules checked top to bottom; the first match decides. A rule is conditions (field, operator, value), Allow or Deny, a reason, and optional results such as a discount percentage. Field types (text, number, yes/no, date, list) decide which operators are offered.
- Workflow: start from a template or blank → edit the draft (autosaved) → test in **Try it** against the draft or live version → **Publish** (shows the diff against live) → numbered versions that can be compared, restored as a draft, or rolled back. Policies can be paused.
- **Home** shows decisions per day, allow rate, live policies and response time. **Activity** is the decision log (filter by policy, outcome, source, date; replay any decision in Try it) plus a **Changes** tab of who published, paused or rolled back what.
- **Connect** creates per-workspace API keys (shown once, revocable) and gives copy-ready samples in curl, JavaScript, Python and C#.
- Used on desktop and on phones and tablets; the app is responsive down to 375px.

## Capabilities and Constraints

- Roles: Owner (everything, incl. members, keys, deleting the workspace), Editor (policies, publish, test), Viewer (read-only plus Try it).
- Sign-in: email and password, optional "Continue with Google". Invites are emailed (Resend or SMTP) when configured, otherwise shown as a link to copy.
- Demo: one click creates **Acme Retail** with four live policies, two weeks of decision history and simulated live traffic that stops after ten minutes; **Reset** restores it. With `DEMO_PUBLIC=true` the sign-in page offers a shared read-only demo.
- Stack: React 19, Vite, TanStack Router and Query, Tailwind v4, shadcn/ui; NestJS server; PostgreSQL; OPA binary supervised by the server. No Docker.
- Out of scope today: billing, Arabic/RTL, SSO/SAML, raw Rego editing, nested condition groups, external data sources, outbound webhooks.

## Brand Commitments

- The product name is **PengOPA**, made by **Pengopal**. The name is fixed.
- The logo, palette, typography and every other visual element are open to change.
- Standing preference (chosen 2026-11-14): the category-standard SaaS look, executed at the craft level of **Linear, Vercel and Clerk**. Convention is the commitment; no themed world or novelty motif.

## Evidence on Hand

- Nine ready-made templates across Commerce, Access, Finance and HR (checkout discount, refund approval, admin console access, loan pre-approval and more), each with sample inputs.
- The Acme Retail demo workspace with realistic decision history.
- Product screenshots in `docs/images/`.
- There are no customers, testimonials, logos, benchmarks, pricing or certifications. Future work must not invent any.

## Product Principles

1. **Rules read like sentences.** Anything an ops person touches is phrased in their words, never Rego or JSON.
2. **Test before it's live.** Trying a change is always one step away, and publishing always shows what will change.
3. **Every decision is explainable.** For any answer, show which rule matched and why.
4. **Workspaces never leak.** Isolation is a product promise, not just an implementation detail.
5. **Engineers need one endpoint.** Integration stays copy, paste, call.
