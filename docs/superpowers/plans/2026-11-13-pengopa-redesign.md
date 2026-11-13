# PengOPA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task that changes what the user sees is built with `ui-consistency:implementing` against `apps/web/UI-PATTERNS.md` and checked with `ui-consistency:verifying`.

**Goal:** Give peng-opa its own identity (PengOPA, split-shield logo), a responsive shell and pages that work on phones and desktops, and a public landing page.

**Architecture:** Tokens first (`index.css`), then shared pieces (`components/ui/*`, `DataList`, `ResponsiveSheet`, `Logo`), then the shell (`components/layout/*`), then one task per page. The landing page lives in the same Vite app at `/`; the dashboard moves to `/home`.

**Tech Stack:** React 19, TanStack Router/Query, Tailwind v4, shadcn (radix-ui), lucide-react, cmdk, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-pengopa-redesign-design.md`

## Global Constraints

- Product name in UI copy: **PengOPA**; company only as "by Pengopal" / "Pengopal Technologies".
- Colours only through tokens in `src/index.css`; no hex/oklch in components. Accent indigo `#4f46e5` light / `#818cf8` dark; allow/deny never use the accent.
- Fonts: `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` only (remove Inter/Lexend).
- Radius: controls 6px (`rounded-md`), cards/menus/tables 12px (`rounded-xl`), sheets 16px.
- Breakpoints: shell switches at `lg` (1024px); lists and sheets switch at `md` (768px).
- Page never scrolls horizontally at 390px wide; tap targets ≥ 44px on coarse pointers.
- No fabricated customer logos, testimonials or numbers on the landing page.
- Tests: essential only (user preference) — update broken ones, add only those named here.

## Review Focus

1. **Signed-in user opens `/`** (bookmark, sign-in redirect, OAuth return) → lands on `/home`, never sees the landing page flash then jump. Test in Task 5.
2. **`?redirect=` after sign-in pointing at `/`** → ends on `/home` (SignIn default `next` changes). Test in Task 5.
3. **Long names on phones** (workspace "Acme Retail (Demo)", long policy names, long matched-rule text) → truncate with ellipsis, no sideways scroll. Covered by the 390px e2e in Task 11.
4. **Bottom tab bar covering the last row / sticky "Test" button / toasts** on phones → content has bottom padding equal to the bar + safe area. Covered by the 390px e2e in Task 11 (last decision row clickable).
5. **Dragging rules on touch** → PointerSensor gets `activationConstraint: { delay: 200, tolerance: 6 }` so scrolling the rule list doesn't start a drag. Covered in Task 8.

---

### Task 1: Tokens and fonts

**Files:**
- Modify: `apps/web/src/index.css`, `apps/web/package.json`
- Modify: `apps/web/src/pages/connect/Connect.tsx:75` (code block `bg-sidebar` → `bg-code text-code-foreground`), `apps/web/src/pages/auth/AuthCard.tsx:8` (keep `bg-canvas`)

**Interfaces:**
- Produces: tokens `--background --canvas --foreground --card --popover --primary --primary-foreground --secondary --muted --muted-foreground --accent --border --input --ring --sidebar* --success --danger --warning (+ -foreground, -muted) --code --code-foreground --chart-1..5`; Tailwind `font-sans` = Geist, `font-mono` = Geist Mono; `--font-heading` removed.

- [ ] **Step 1:** `pnpm --filter web add @fontsource-variable/geist @fontsource-variable/geist-mono && pnpm --filter web remove @fontsource/inter @fontsource/lexend`
- [ ] **Step 2:** Rewrite `:root` / `.dark` with the spec §2 values (light: bg `#ffffff`, canvas `#f7f7f8`, sidebar `#f2f2f4`, border `#e6e6ea`, input `#d9d9df`, fg `#16161a`, muted-fg `#62626c`, primary `#4f46e5`, ring `#4f46e5`, secondary/accent `#f0f0f3`, warning `#b54708`/muted `#fef4e6`, code `#16161a`/fg `#ededf0`; dark: bg `#0c0c0e`, canvas `#0c0c0e`, card/popover `#141417`, sidebar `#101013`, border `#26262c`, input `#33333b`, fg `#ededf0`, muted-fg `#9a9aa4`, primary `#818cf8` with fg `#0c0c0e`, secondary/accent `#1c1c21`, warning `#fdb022`/muted `#3a2a0c`, code `#0a0a0c`). Sidebar active: `--sidebar-accent` = 8% accent wash (`color-mix(in oklch, var(--primary) 10%, transparent)`), `--sidebar-primary` = `var(--primary)`. Keep success/danger/chart values unchanged. Radius: `--radius: 0.75rem` with `--radius-md: 6px`, `--radius-lg: 8px`, `--radius-xl: 12px`, `--radius-2xl: 16px`.
- [ ] **Step 3:** Delete the `h1, h2, h3 { font-family }` rule and the `--font-heading`/`--color-gold` entries; replace any `font-heading` class (5 files) with nothing.
- [ ] **Step 4:** Run `pnpm --filter web typecheck && pnpm --filter web test` — expect PASS (no test asserts colours).
- [ ] **Step 5:** Commit `feat(web): PengOPA tokens and Geist fonts`.

### Task 2: Logo and brand assets

**Files:**
- Create: `apps/web/public/brand/pengopa-mark.svg`, `pengopa-logo.svg`, `apps/web/public/favicon.svg` (replace), `apple-touch-icon.png` (180), `icon-512.png`, `site.webmanifest`
- Modify: `apps/web/src/components/Logo.tsx`, `apps/web/index.html`, `README.md`, `apps/server/src/workspaces/mailer.ts` (+ `mailer.spec.ts` if it asserts the image URL)

**Interfaces:**
- Produces: `Logo({ variant?: "full" | "mark"; className?: string })` — inline SVG mark (`currentColor` outline, left half filled) + text `Peng` + `<span class="text-primary">OPA</span>`, `aria-label="PengOPA"`.

- [ ] **Step 1:** Draw the mark (viewBox `0 0 64 64`): shield path `M32 6 L54 14 V32 C54 45 45 54 32 59 C19 54 10 45 10 32 V14 Z`, stroke 5, round joins; left half filled. Favicon = mark in white on a `#16161a` 64px tile, `rx=14`. Render PNGs from the favicon SVG with Playwright's `page.screenshot` in a scratch script (not committed).
- [ ] **Step 2:** `index.html`: `<title>PengOPA</title>`, meta description "Business rules and access policies, decided in milliseconds.", `theme-color` light `#ffffff` / dark `#0c0c0e`, `viewport-fit=cover`, manifest + apple-touch links, OG title/description/image (`/brand/pengopa-logo.svg`).
- [ ] **Step 3:** Rewrite `Logo.tsx`; replace `logo-light/dark.svg` usages (`grep -rn "brand/logo" apps/web/src apps/server/src README.md`), then delete `logo-light.svg`, `logo-dark.svg`, `mark.svg` if nothing references them.
- [ ] **Step 4:** Mailer: header shows the new logo URL and `#4f46e5` button; run `pnpm --filter server test -- mailer` — PASS.
- [ ] **Step 5:** Commit `feat(brand): PengOPA split-shield logo, favicon and app icons`.

### Task 3: Shared pieces

**Files:**
- Modify: `src/components/ui/{button,tabs,table,badge,sheet,input,select}.tsx`, `src/components/{DecisionChip,StatusChip,PageHeader,EmptyState}.tsx`, `src/components/ui/sonner.tsx`
- Create: `src/lib/use-media-query.ts`, `src/components/DataList.tsx`, `src/components/ResponsiveSheet.tsx`, `src/components/DataList.spec.tsx`

**Interfaces:**
- Produces:
  - `useMediaQuery(query: string, fallback = true): boolean` — `matchMedia` subscription; returns `fallback` where `matchMedia` is missing (jsdom ⇒ desktop, so existing tests keep seeing tables).
  - `useIsDesktop(): boolean` = `useMediaQuery("(min-width: 768px)")`.
  - `DataList<T>({ rows: T[]; rowKey(r: T): string; columns: DataColumn<T>[]; card: { title(r): ReactNode; meta?(r): ReactNode; trailing?(r): ReactNode }; onOpen?(r: T): void; rowActions?(r: T): ReactNode; label: string })`, `DataColumn<T> = { header: string; cell(r: T): ReactNode; className?: string; hideBelow?: "lg" }`. Desktop: `Table` in `rounded-xl border bg-card overflow-x-auto`, sticky header, whole row clickable (`onOpen`) with an inner `<button>` on the first cell for keyboard. Mobile: `<ul aria-label={label}>` of `<li><button>` cards.
  - `ResponsiveSheet({ open; onOpenChange; title: ReactNode; description?: ReactNode; children; className? })` — `SheetContent side={isDesktop ? "right" : "bottom"}`; bottom = `rounded-t-2xl max-h-[90svh] overflow-y-auto` with a drag-handle bar.
  - `PageHeader` gains `secondaryActions?: ReactNode` rendered inline ≥ sm and inside a `⋯` `DropdownMenu` below sm.
  - Button sizes: `sm h-8`, `default h-9`, `lg h-11`, `icon size-9`; `rounded-md`; `pointer-coarse:min-h-11` on default/lg/icon. Variants unchanged in name.
  - `TabsList variant="line"`: underline style (2px `bg-primary` bar under active), `overflow-x-auto` with hidden scrollbar, `w-full justify-start border-b`.
  - Toaster: `position` = `bottom-center` below md (via `useIsDesktop`), `top-right` otherwise; `offset` clears the tab bar.
  - `DecisionChip`: lucide `CircleCheck` / `CircleX` (`aria-hidden`) instead of emoji. `StatusChip`: pill with dot — Live `success`, Draft `muted-foreground`, Paused `warning`.

- [ ] **Step 1: Write the failing test** `DataList.spec.tsx`:
  - `"shows a table on desktop"`: default (no matchMedia) → `getByRole("table")`, header text present.
  - `"shows cards on phones and opens a row"`: stub `window.matchMedia` → `{ matches: false, addEventListener(){}, removeEventListener(){} }`; render 2 rows → `queryByRole("table")` null, `getByRole("list", { name: "Decisions" })`, click first card → `onOpen` called with row 0.
- [ ] **Step 2:** `pnpm --filter web test DataList` — FAIL (module missing).
- [ ] **Step 3:** Implement the pieces above; update `DecisionChip.spec.tsx` only if it asserts the emoji.
- [ ] **Step 4:** `pnpm --filter web test && pnpm --filter web typecheck` — PASS.
- [ ] **Step 5:** Commit `feat(web): responsive shared pieces (DataList, ResponsiveSheet, restyled controls)`.

### Task 4: App shell

**Files:**
- Create: `src/components/layout/nav.ts`, `BottomTabBar.tsx`, `MobileTopBar.tsx`, `MoreSheet.tsx`, `CommandPalette.tsx`
- Modify: `AppShell.tsx`, `Sidebar.tsx`, `UserMenu.tsx`, `WorkspaceSwitcher.tsx`, `EngineBanner.tsx`

**Interfaces:**
- Produces: `NAV: { to; label; icon; exact; group: "main" | "developers" | "footer"; mobileTab: boolean }[]` — Home `/home` (tab), Policies (tab), Templates, Activity (tab), Connect (developers), Settings (footer). `CommandPalette({ open, onOpenChange })` + global `⌘K`/`Ctrl+K` listener in AppShell. Sidebar collapsed state key `pengopa.sidebar.collapsed` (localStorage, try/catch).

- [ ] **Step 1:** Sidebar: `w-60` / collapsed `w-[60px]` icons with `Tooltip` labels; light `bg-sidebar border-r`; active = `bg-sidebar-accent text-primary`; footer "by Pengopal" (`text-xs text-muted-foreground`), hidden when collapsed. Search button opens the palette.
- [ ] **Step 2:** Below lg: `MobileTopBar` (mark, workspace name → switcher, search icon, avatar menu) sticky top; `BottomTabBar` fixed bottom (`h-16 pb-[env(safe-area-inset-bottom)] border-t bg-background/95 backdrop-blur`), 3 tabs + More → `MoreSheet` (bottom `ResponsiveSheet`) listing non-tab NAV, theme toggle, sign out. Main gets `pb-24 lg:pb-8`. Remove hamburger + left Sheet.
- [ ] **Step 3:** Palette: groups Pages (NAV), Policies (from `["policies"]` query), Actions (New policy → `/policies?new=blank`, Toggle theme), Workspaces (switch).
- [ ] **Step 4:** `pnpm --filter web test` — PASS (fix selectors that relied on the old menu button only).
- [ ] **Step 5:** Commit `feat(web): light sidebar, mobile tab bar and command palette`.

### Task 5: Routing — dashboard to `/home`

**Files:**
- Modify: `src/router.tsx`, `Sidebar`/`nav.ts`, `WorkspaceSwitcher.tsx:39`, `pages/onboarding/Welcome.tsx:23`, `pages/auth/SignIn.tsx:19,77`, `pages/auth/AcceptInvite.tsx:30,58`, `pages/settings/DangerZone.tsx:26`, `e2e/journeys.spec.ts` (`goto("/")` → `goto("/home")`)
- Create: `src/pages/landing/Landing.tsx` (placeholder hero for now), `src/router.spec.tsx`

**Interfaces:**
- Produces: `landingRoute` (path `/`, public, `beforeLoad`: session ⇒ `redirect({ to: "/home" })`); `homeRoute` path `/home`. Server SPA fallback must serve `/home` — check `apps/server/src/configure-app.ts` static/fallback config.

- [ ] **Step 1: Write the failing tests** `router.spec.tsx` (mock `@/lib/auth` `authClient.getSession`):
  - `"signed-out visitor sees the landing page at /"` → heading "Business rules, decided in milliseconds" visible.
  - `"signed-in user at / goes to /home"` → `router.state.location.pathname === "/home"`.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement routes and every `to: "/"` change; SignIn default `next` = `"/home"`, demo `assign("/home")`. **Step 4:** `pnpm --filter web test` — PASS.
- [ ] **Step 5:** Commit `feat(web): public landing route; dashboard moves to /home`.

### Task 6: Landing page

**Files:**
- Create: `src/pages/landing/{Landing,LandingNav,Hero,DecisionPreview,HowItWorks,Features,Audiences,FinalCta,LandingFooter}.tsx`

**Interfaces:**
- Consumes: `Logo`, `Button`, `DecisionChip`, `CopyButton`, `api("/api/demo/public-login", { method: "POST", body: {} })` (same as SignIn).

- [ ] **Step 1:** Build sections per spec §6 with copy: hero h1 "Business rules, decided in milliseconds"; sub "Write discounts, approvals and access rules in plain language. Test them, publish them, and let your apps ask PengOPA what to do."; CTAs "Get started" (→ `/sign-up`) and "Try the live demo" (demo login → `/home`, shows "Opening demo…" while pending, `ErrorText` on failure). `DecisionPreview`: input chips `customer.tier = gold`, `order.total = 250` → rule "Gold customers on bigger orders" → `DecisionChip allowed` + "15% discount" + "8 ms" (labelled "Example"). How it works: 3 steps. Features: 6 cards (icons lucide). Audiences: ops vs developers with `curl -X POST …/v1/decide/checkout-discount` snippet in `bg-code`. Footer: "PengOPA by Pengopal Technologies", Sign in, Guides (GitHub docs links).
- [ ] **Step 2:** Nav anchors `#how`, `#features`, `#developers`; below md the anchors move into a `Sheet` menu. Layout: `max-w-6xl mx-auto px-4 sm:px-6`; hero 2 columns ≥ lg, stacked below.
- [ ] **Step 3:** `pnpm --filter web test` — PASS (Task 5 test asserts the h1).
- [ ] **Step 4:** Commit `feat(web): PengOPA landing page`.

### Task 7: Home, Policies, Templates

**Files:** `pages/home/{Home,StatTiles,DecisionsChart,RecentDecisions,SetupChecklist}.tsx`, `pages/policies/PoliciesList.tsx`, `pages/templates/TemplateGallery.tsx` (+ their specs only if selectors break)

- [ ] **Step 1:** Home: tiles `grid grid-cols-2 lg:grid-cols-4 gap-3`; chart card full width (keep 14d — API has no range param), legend under chart; RecentDecisions rows `divide-y` with truncate; checklist as progress card (n of 3 + bar).
- [ ] **Step 2:** Policies: `DataList` (columns Name, Status, Live version · edited, Decisions 7d; card: name / "Live v3 · edited 2h ago" / StatusChip); open → editor. Templates: grid `sm:grid-cols-2 lg:grid-cols-3`, category chips `overflow-x-auto`.
- [ ] **Step 3:** `pnpm --filter web test` — PASS. **Step 4:** Commit `feat(web): responsive home, policies and templates`.

### Task 8: Policy editor

**Files:** `pages/policy-editor/{PolicyEditor,RuleCard,RuleList,ConditionRow,ResultEditor,VersionsTab,VersionCompare,FieldsDrawer}.tsx`, `try-it/TryItPanel.tsx`

- [ ] **Step 1:** Header: back link, name + StatusChip + Saved indicator; Publish = primary, Rego → `PageHeader`-style overflow below sm. Tabs `variant="line"`.
- [ ] **Step 2:** ConditionRow: `grid gap-2 sm:flex sm:flex-wrap`; on phones field/operator/value full width, remove button top-right of the condition card. ResultEditor Allow/Deny → segmented toggle with icons. RuleCard header compact.
- [ ] **Step 3:** RuleList PointerSensor `activationConstraint: { delay: 200, tolerance: 6 }`.
- [ ] **Step 4:** Try-it: `lg:` right column as now; below lg a sticky bottom "Test" button (`fixed bottom-20 inset-x-4`, above tab bar) opening `ResponsiveSheet` titled "Try it" containing `TryItPanel`. FieldsDrawer → `ResponsiveSheet`. VersionCompare stacked below md.
- [ ] **Step 5:** `pnpm --filter web test` — PASS (editor/try-it/publishing specs; fix only selector breaks). **Step 6:** Commit `feat(web): policy editor works on phones`.

### Task 9: Activity and Connect

**Files:** `pages/activity/{Activity,DecisionDetailSheet}.tsx`, `pages/connect/{Connect,ApiKeysCard}.tsx`

- [ ] **Step 1:** Activity: tabs `line`; filters inline ≥ md, below md a "Filters" button with active count opening `ResponsiveSheet` + removable chips row; decisions via `DataList` (card: policy name / relative time · matched rule / DecisionChip); Changes as a list with avatar initials. Detail → `ResponsiveSheet`.
- [ ] **Step 2:** Connect: keys via `DataList` (revoke in row actions); endpoint field with `CopyButton`; language tabs `line`; code block `bg-code overflow-x-auto font-mono`.
- [ ] **Step 3:** `pnpm --filter web test` — PASS. **Step 4:** Commit `feat(web): responsive activity and connect`.

### Task 10: Settings, auth, onboarding

**Files:** `pages/settings/*.tsx`, `pages/auth/{AuthCard,SignIn,SignUp,AcceptInvite}.tsx`, `pages/onboarding/{CreateWorkspace,Welcome}.tsx`

- [ ] **Step 1:** Settings: sections General / Members / Demo / Danger zone with sticky left section links ≥ md, stacked below; members via `DataList` with role `Select` in a cell.
- [ ] **Step 2:** AuthCard: ≥ lg split — form left, right panel `bg-sidebar` with `Logo`, value line, and `DecisionPreview` (from Task 6); single column below lg with `Logo` above the card.
- [ ] **Step 3:** `pnpm --filter web test` — PASS. **Step 4:** Commit `feat(web): settings and auth redesign`.

### Task 11: Phone journey, screenshots, verification

**Files:** `apps/web/e2e/mobile.spec.ts` (new), `apps/web/playwright.config.ts` (add project `mobile` with `viewport 390×844, hasTouch, isMobile`, running only `mobile.spec.ts`), `docs/images/*.png`, `README.md`

- [ ] **Step 1: Write the test** `"phone: edit a condition and test it"`: `signUpWithWorkspace`, `useCheckoutTemplate`; assert `document.documentElement.scrollWidth <= 390`; change the first condition value to `300`; tap "Test"; pick sample "Gold, $250"; Run → "Denied"/"Allowed" text visible; tap "Activity" in the tab bar → first decision card visible and tappable above the tab bar.
- [ ] **Step 2:** `pnpm test:e2e:web` — both projects PASS.
- [ ] **Step 3:** In the built-in browser, walk every page at 390×844, 768×1024, 1440×900, light and dark; then `ui-consistency:verifying` over all pages.
- [ ] **Step 4:** Replace `docs/images/*.png` (home, editor, activity, connect, templates + landing) and the README logo; `pnpm typecheck && pnpm lint && pnpm test`.
- [ ] **Step 5:** Commit `test(web): phone journey; docs: new screenshots`.
