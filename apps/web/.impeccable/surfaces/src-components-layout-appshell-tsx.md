---
version: 1
slug: "src-components-layout-appshell-tsx"
primary_target: "src/components/layout/AppShell.tsx"
related_targets: ["src/router.tsx"]
---

## Scope

PengOPA app screens: shell, Home, Policies, policy editor (Rules, Versions, Settings, Try it), Templates, Activity, Connect, Settings, sign-in/sign-up/invite, onboarding. Visitor mode: **Operate**. The public landing page is a separate Persuade surface with its own brief.

## Audience and task

Ops/compliance staff at a desk, a few times a month, changing a rule, testing it, publishing. Engineers creating a key and copying a sample. Salespeople showing the Acme Retail demo. Routes and navigation stay as they are; phone behavior and copy may improve.

## Constraints

Craft bar: Linear, Vercel, Clerk. Must not read as generic AI SaaS, or as dense/grey enterprise software. No invented customers, numbers or claims.

## Direction contract

THESIS: The category standard at Linear/Vercel/Clerk precision. Rules read as sentences and every decision explains itself in place. It refuses the default arrangement of every section boxed as a bordered card on a grey canvas.

OWN-WORLD: White ground, near-black ink, a cool neutral grey scale, and one indigo accent reserved for primary action, focus and selection. Allow and Deny are a coloured dot plus text, never filled pills. Structure comes from 1px dividers and spacing, not nested boxes. Radius 6 to 8px. Geist Sans at 13 to 14px for UI, Geist Mono for keys, values and code. 32px table rows, 32 to 36px controls.

STORY: The ops person opens a policy, reads each rule as a sentence, changes one value inline, runs Try it, sees which rule matched and why, and publishes after reading the diff. The engineer copies one sample and gets an answer.

FIRST VIEWPORT: Policy editor. 240px white sidebar (workspace switcher, search, nav). A 48px top bar with breadcrumb "Policies / Checkout discount", Live status, "Saved", and Rego and Publish on the right. Below, the rule list as divided rows: a number, the rule name, then one sentence with inline token pickers ("When customer tier is gold and order total is at least 200, allow with 15% discount"). Try it is a sticky 360px right column with Draft/Live, inputs and Run.

FORM: Category standard (canon), chosen by the user over the roll; seed:e465fca76afd026b. Signature interaction: running Try it marks the matched rule in the list (scrolled into view, accent bar, "Matched" tag) and briefly dims the rules it skipped above it. Motion grammar: 150 to 200ms ease-out, no bounce, honours reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
