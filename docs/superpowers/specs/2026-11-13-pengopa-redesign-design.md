# PengOPA redesign — new identity, responsive app, landing page

## Context
peng-opa is live on Railway. It works, but it still looks like a Pengopal side tool: navy/gold company colours, an 85 KB traced-bitmap bird logo (blurry at favicon size), a dark navy sidebar, and on phones only a hamburger drawer. Wide condition rows and tables don't adapt well on small screens. There is **no landing page** — `/` is the signed-in dashboard and signed-out visitors bounce to `/sign-in`. The product is a sales demo and a tool for non-technical ops staff, so first impressions and phone use both matter.

Decided with the user (2026-11-13):
- **New product identity**, name **PengOPA**; Pengopal appears only as "by Pengopal".
- **Logo: split shield** (shield outline, left half filled = allow / right half open = deny).
- **Research source: public web** (Mobbin MCP needs a paid plan). Findings: Linear 2026 refresh, Vercel nav + Geist, Stripe dashboard, Permit.io / Oso / Cerbos / WorkOS landing pages, NN/g mobile-nav research, Zapier/Linear filter builders.
- **Approach: design system → shell → pages**, landing page in the same Vite app (no second service).

My calls (correct any): Geist Sans + Geist Mono fonts; indigo as the single accent; landing at `/` with signed-in users redirected to `/home`; no fabricated customer logos or stats on the landing page.

## Step 0 — paperwork the workflow requires
1. Write this design as `docs/superpowers/specs/2026-11-13-pengopa-redesign-design.md` (commit on a new branch `feat/redesign` cut from `main` after `feat/resend-email` merges, or from `feat/resend-email` if it hasn't).
2. Run `ui-consistency:finding-patterns` against the current `apps/web/UI-PATTERNS.md`, then **rewrite UI-PATTERNS.md** with the new values/roles below so every later page task checks against it.
3. `superpowers:writing-plans` → per-page task list; execute with `ui-consistency:implementing` + `verifying`.

## 1. Brand and logo
- `apps/web/public/brand/pengopa-mark.svg` — hand-drawn split shield, ~1 KB, viewBox 64×64, uses `currentColor` for the outline/fill so it themes.
- `pengopa-logo.svg` (mark + "PengOPA" wordmark, Geist 600, for README / emails / OG), `favicon.svg` (mark on ink tile, rounded 14px), `apple-touch-icon.png` 180px, `icon-512.png`, and `site.webmanifest` (name, theme colour, icons) so it pins nicely on phones.
- `src/components/Logo.tsx` rewritten: `<Logo variant="full|mark" />` = inline SVG mark + live-text wordmark "Peng**OPA**" (OPA in accent). Drop `logo-light/dark.svg`, `mark.svg` usage (keep files only if README/emails still need them — update README `<img>` to the new logo).
- Email template in `apps/server/src/workspaces/mailer.ts`: swap header to the new logo URL/colours (small change; check `mailer.spec.ts`).
- `index.html`: title "PengOPA", meta description, theme-color, `viewport-fit=cover`, OG tags.

## 2. Design tokens (`apps/web/src/index.css`)
Rewrite `:root` / `.dark` values; keep the same token **names** so components keep working.
- **Neutrals:** warm low-saturation grays (Linear 2026). Light: background `#ffffff`, canvas `#f7f7f8`, sidebar `#f2f2f4` (a notch dimmer than content), border `#e6e6ea`, input `#d9d9df`, foreground `#16161a`, muted-fg `#62626c`. Dark: canvas `#0c0c0e`, card `#141417`, sidebar `#101013`, border `#26262c`, fg `#ededf0`, muted-fg `#9a9aa4`.
- **Accent (single):** indigo — `--primary #4f46e5` / hover `#4338ca` light; `#818cf8` dark with dark fg. `--ring` = accent. Remove `--gold`/`--canvas` navy usages.
- **Semantic:** keep `success`/`danger` (+ `-muted`) and the validated `chart-1`/`chart-2` pair as-is (allow/deny never use the accent). Add `warning` (+muted) for "Draft changes / Paused".
- **Radius:** explicit scale — controls `rounded-md` = 6px, cards/menus `rounded-xl` = 12px, sheets 16px.
- **Elevation:** hairline borders on in-page surfaces; shadow only on popovers, dialogs, sheets, sticky mobile bars.
- **Type:** Geist Sans (via `@fontsource-variable/geist`) for all text, Geist Mono for keys/paths/code. Scale: page title 24/600 (20 on phones), section 16/600, body 14, hint 12. Replace Lexend/Inter imports and the `h1,h2,h3` font rule.
- Safe-area utilities for the bottom bar (`pb-[env(safe-area-inset-bottom)]`).

## 3. Shared components (`apps/web/src/components/ui/*` + app components)
- **Button:** variants default (accent) / secondary (bordered) / ghost / destructive; sizes `sm 32px`, `default 36px`, `lg 44px`; on coarse pointers min 44px tap target. One primary button per view (rule goes into UI-PATTERNS).
- **Tabs:** add `variant` prop to `tabs.tsx` — `underline` for page sections (editor Rules/Versions/Settings, Activity Decisions/Changes, Connect languages) and `segmented` for view switches of the same content (Try-it Draft/Live). Underline tabs scroll horizontally on phones with the active tab scrolled into view; never wrap.
- **Badge / StatusChip / DecisionChip:** fully rounded pills, tinted bg + dot/icon + text (never colour alone). Allow/Deny result picker in `ResultEditor.tsx` becomes a 2-option segmented control with icons.
- **Table:** 40px rows, sticky header, hover row, right-aligned `⋯` row-action menu; wrapper `rounded-xl border` with its own horizontal scroll (page never scrolls sideways).
- **New `DataList` component** (`src/components/DataList.tsx`): one column config → `Table` at ≥ md, stacked card list (primary line, secondary line, trailing chip, tap → detail) below md. Used by Activity decisions, Policies list, Members, API keys.
- **Sheet:** `ResponsiveSheet` helper — right side panel ≥ md, bottom sheet (rounded top, drag handle, max-h 90svh) below md. Used by DecisionDetailSheet, FieldsDrawer, mobile Try-it, "More" menu.
- **PageHeader:** title + description + actions; on phones secondary actions collapse into a `⋯` menu, primary stays.
- **EmptyState, Card, Input/Select/Textarea, Skeleton, Sonner:** restyle only via tokens (toasts move to `bottom-center` on phones).

## 4. App shell (`components/layout/*`)
- **Desktop (≥ lg):** light sidebar 240px, collapsible to 60px icon rail (state in localStorage, try/catch). Order: Logo · WorkspaceSwitcher · **Home, Policies, Templates, Activity** · group "Developers": **Connect** · bottom: Settings, UserMenu (theme toggle lives here), "by Pengopal". Active item = accent-tinted bg + accent icon (no gold bar).
- **⌘K command palette** (existing `ui/command.tsx` + cmdk): jump to pages, policies by name, "New policy", switch workspace, toggle theme. Search button in sidebar header.
- **Mobile (< lg):** top bar = mark + workspace name (opens switcher) + search + avatar; **bottom tab bar** with Home · Policies · Activity · More (More = bottom sheet with Templates, Connect, Settings, theme, sign out). Remove the hamburger. Content gets bottom padding for the bar.
- `EngineBanner` restyled as a slim warning bar.
- Nav source of truth stays the `NAV` array in `Sidebar.tsx` (add `group`, `mobileTab` flags) so sidebar, tab bar, More sheet and palette share it.

## 5. Page passes (each = one task, checked against new UI-PATTERNS)
- **Home** (`pages/home/*`): stat tiles 2×2 on phones / 4-up desktop with small trend text; chart card full width with segmented 7d/14d (if API allows, else keep 14d) ; recent decisions as DataList-style rows; SetupChecklist as a progress card.
- **Policies list:** DataList (name, status pill, "Live v3 · edited 2h ago", 7-day decisions); "New policy" primary button; templates entry point.
- **Templates:** card grid 1/2/3 cols, category chips scroll horizontally on phones.
- **Policy editor** (`pages/policy-editor/*`): header with status pill + Saved indicator; actions (Rego, Publish) — Publish primary, Rego into `⋯` on phones. **ConditionRow** stacks field/operator/value vertically on < sm with the remove button top-right; RuleCard compact header (drag handle, number, name, menu). Try-it: right column ≥ lg; below lg a **sticky "Test" button** opening a bottom sheet with the same `TryItPanel`. Confirm dnd-kit has Touch/Pointer sensor with activation delay for phones. Versions/compare: side-by-side ≥ md, stacked below.
- **Activity:** filter bar — desktop inline selects; phones a "Filters (n)" button opening a bottom sheet + active-filter chips; decisions via DataList; Changes as a timeline list; detail in ResponsiveSheet.
- **Connect:** API keys DataList, endpoint copy field, code samples with underline language tabs and horizontally scrolling code block (Geist Mono).
- **Settings:** sectioned page (General, Members, Demo, Danger zone) with left section nav ≥ md, stacked on phones; members DataList with role select.
- **Auth + onboarding** (`pages/auth/*`, `pages/onboarding/*`): split layout ≥ lg (form left, brand panel right with mark + one-line value prop + sample decision card), single column on phones; Welcome cards restyled.

## 6. Landing page (new, public)
- **Routing (`src/router.tsx`):** new public `landingRoute` at `/` whose `beforeLoad` checks `authClient.getSession()` and redirects signed-in users to `/home`. Move dashboard `homeRoute` to `/home`. Update every `to: "/"` / `assign("/")`: `Sidebar.tsx`, `WorkspaceSwitcher.tsx:39`, `Welcome.tsx:23`, `SignIn.tsx:19,77`, `AcceptInvite.tsx:30,58`, `DangerZone.tsx:26`, `e2e/journeys.spec.ts:30`, `test/render.tsx` default path if tests rely on it. Check the Nest SPA fallback serves `/home` (it should — same as other client routes).
- **Files:** `src/pages/landing/Landing.tsx` + section components in the same folder.
- **Sections** (Permit.io/Oso structure, no clichés):
  1. Top nav: Logo, "How it works", "Features", "Developers" anchors, Sign in, **Get started** (primary). Collapses to a sheet menu on phones.
  2. Hero: headline about business rules decided in milliseconds without code; sub-line for ops teams; CTAs **Get started** + **Try the live demo** (reuses `POST /api/demo/public-login`, same as SignIn). Right side: a live-built (HTML, not screenshot) **decision card** — input JSON chips → matched rule "Gold customers on bigger orders" → Allowed pill + "8 ms". Stacks under the copy on phones.
  3. How it works — 3 steps: Pick a template → Test with sample data → Connect with one API call.
  4. Feature grid (2×3): no-code rule editor, test before you publish, versions & one-click rollback, activity log, team roles & workspaces, built on Open Policy Agent.
  5. Two audiences: "For ops teams" (editor visual) / "For developers" (short `curl POST /v1/decide/checkout-discount` snippet with copy button).
  6. Final CTA band + footer ("PengOPA by Pengopal Technologies", links to docs guides in repo/GitHub, sign in).
- Light theme first, respects dark; all copy plain-language; no fake logos, testimonials or numbers.

## 7. Tests (essential only, per user preference)
- Update existing specs broken by the move of Home to `/home` and by renamed labels (`Home.spec.tsx`, `editor.spec.tsx`, `activity.spec.tsx`, `settings.spec.tsx`, `e2e/journeys.spec.ts`).
- Add: landing redirects a signed-in user to `/home` and shows the hero to a signed-out one; `DataList` renders cards below md / table at md (one test); mobile e2e journey in Playwright at 390×844 — open a policy, edit a condition, open Test sheet, run, see result.

## Verification
- `pnpm typecheck && pnpm lint && pnpm test` and `pnpm test:e2e:web` green.
- `pnpm dev`, then in the built-in browser walk every page at **390×844 (mobile preset)**, **768×1024**, and **1440×900**, light and dark: no horizontal page scroll, bottom bar never covers content, tap targets ≥ 44px, focus rings visible, landing hero → demo login works, signed-in `/` → `/home`.
- `ui-consistency:verifying` pass over all pages against the rewritten UI-PATTERNS.md; replace `docs/images/*.png` screenshots and README logo.
- Favicon/apple-touch icon checked in tab and on a phone "Add to home screen".

## Critical files
`apps/web/src/index.css` · `apps/web/UI-PATTERNS.md` · `apps/web/index.html` · `apps/web/public/brand/*` · `src/components/Logo.tsx` · `src/components/ui/{button,tabs,table,sheet,badge}.tsx` · `src/components/{DataList,ResponsiveSheet,PageHeader,DecisionChip,StatusChip}.tsx` · `src/components/layout/{AppShell,Sidebar,UserMenu,WorkspaceSwitcher,EngineBanner}.tsx` (+ new `BottomTabBar.tsx`, `CommandPalette.tsx`) · `src/router.tsx` · `src/pages/landing/*` (new) · `src/pages/policy-editor/{ConditionRow,RuleCard,ResultEditor,PolicyEditor}.tsx` + `try-it/TryItPanel.tsx` · `src/pages/activity/*` · `apps/server/src/workspaces/mailer.ts` · `README.md`.
