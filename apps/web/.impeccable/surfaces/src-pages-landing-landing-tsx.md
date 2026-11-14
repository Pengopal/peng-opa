---
version: 1
slug: "src-pages-landing-landing-tsx"
primary_target: "src/pages/landing/Landing.tsx"
related_targets: ["src/pages/landing/LandingNav.tsx","src/pages/landing/DecisionPreview.tsx"]
---

## Scope

PengOPA public landing page at `/` for signed-out visitors. Visitor mode: **Persuade**. Shares tokens, type and the decision-square logo with the app surface.

## Audience and task

Ops and compliance leads deciding whether they could own their rules without engineers; engineers checking the API is one call with a reason attached; salespeople sending prospects to the demo. Each should find their line in the first viewport and their proof further down.

## Constraints

Craft bar: Linear, Vercel, Clerk. No customer logos, testimonials, pricing, metrics or invented claims. Every example is real product data from the Checkout discount template and is labelled as demo data. Sign up is the primary action; Open the demo appears only when the public demo is switched on.

## Direction contract

THESIS: One real decision explains itself top to bottom, and the page follows that trail: the input, the rules checked in order, the answer with its reason, the call that asked for it.

OWN-WORLD: The app's world: white ground, near-black ink, cool greys, one indigo accent for action and the matched rule. Allow is a green dot plus text. Structure from 1px dividers and spacing, no card grids, no icon tiles, no eyebrows, no gradients.

STORY: The visitor reads the headline, sees a gold customer's $250 order run through Checkout discount, watches rule 1 match while rules 2 and 3 are never reached, reads "Allowed, 15% discount, Gold loyalty discount", then scrolls to who does what (ops writes, engineers call, sales demos), the nine real templates, and how workspaces are kept apart.

FIRST VIEWPORT: Headline "Write the rule once. Every system gets the same answer." with the lead, Sign up and Open the demo, and a divided three-line list (Ops, Engineers, Sales) on the left. On the right the decision trail: Input, Rules in order (rule 1 tinted with "Matched", the rest dimmed as "Not reached", then Otherwise), Answer, Call.

FORM: Decision trail, the assigned option, picked by the user on the decision page; seed:a44884fcf6ee2661. Signature: the trail panel with the matched rule tinted and skipped rules dimmed, the same grammar as Try it in the editor. Motion: none beyond hover colour; nothing autoplays.

FINISH: reviewed with the app at the end of the redesign; documented in DESIGN.md.
