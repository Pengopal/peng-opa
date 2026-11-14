# PengOPA Canon Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task that changes what the user sees runs under the **impeccable** skill: run `impeccable context` once per session from `apps/web`, and read `reference/craft-floor.md` immediately before the first UI edit.

**Goal:** Bring every PengOPA screen (app, sign-in/onboarding, landing) up to the craft level of Linear, Vercel and Clerk in the familiar SaaS style, with rules that read as sentences and decisions that explain themselves in place.

**Architecture:** Tokens and base components first (`src/index.css`, `components/ui/*`, `DecisionChip`, `PageHeader`), then the shell, then one task per page group, then the landing page (which gets its own impeccable surface round because it is a Persuade surface), then the impeccable finish review and DESIGN.md. Routes, navigation and data APIs do not change; no server changes.

**Tech Stack:** React 19, TanStack Router/Query, Tailwind v4, shadcn (radix-ui), lucide-react, Recharts, dnd-kit, Vitest + Testing Library, Playwright. Design tooling: impeccable 4.9.1 (`detect`, `surface-brief`, `concept-seed`, finish reviewer and documenter agents).

**Spec:** `apps/web/.impeccable/surfaces/src-components-layout-appshell-tsx.md` (direction contract) and `apps/web/PRODUCT.md` (product truth). The current look is the anti-reference: see `docs/images/*.png`.

**Branch:** `feat/canon-redesign`, cut from `feat/redesign` (PR Pengopal/peng-opa#4 is still open). Open a separate PR into `main` after #4 merges; rebase if needed.

## Global Constraints

- Product name **PengOPA**; "by Pengopal" only in the sidebar footer and landing footer. Logo may be redrawn (Task 9); the name may not change.
- Craft bar: Linear, Vercel, Clerk. Convention is the commitment: no themed motifs (cards-as-paper, stamps, tickets, glows, gradients, glass).
- Colours only through tokens in `src/index.css`; no hex, `black/…` or `white/…` in components.
- Light tokens: `--background #ffffff`, `--canvas #ffffff`, `--sidebar #fafafa`, `--foreground #0a0a0b`, `--muted #f4f4f5`, `--muted-foreground #71717a`, `--border #e4e4e7`, `--input #e4e4e7`, `--primary #4f46e5`, `--ring #4f46e5`, `--success #15803d`, `--danger #dc2626`, `--warning #b45309`, `--sidebar-accent #f0f0f2`.
- Dark tokens: `--background #0a0a0b`, `--canvas #0a0a0b`, `--sidebar #0f0f11`, `--foreground #fafafa`, `--muted #18181b`, `--muted-foreground #a1a1aa`, `--border #27272a`, `--input #27272a`, `--primary #818cf8`, `--ring #818cf8`, `--success #4ade80`, `--danger #f87171`, `--warning #fbbf24`, `--sidebar-accent #1c1c1f`.
- Indigo is reserved for the primary action, focus rings, selection and the matched-rule marker. Never for nav highlight, chart series, or Allow/Deny.
- Allow/Deny everywhere = 6px dot + text in `success`/`danger` (`DecisionChip`), never a filled pill.
- Structure from 1px `border` dividers and spacing; a bordered box only where content is a separate object (a dialog, a code block, a template). No card-inside-card.
- Type: Geist Sans; Geist Mono only for keys, values, code and IDs. Scale 12 / 13 / 14 / 16 / 20 / 24px; body 14px; table text 13px; page titles 20px semibold in the page header.
- Sizes: buttons and inputs 32px (`h-8`), primary page actions 32px, table rows 40px, nav items 32px; touch targets stay ≥ 44px on `pointer: coarse` (keep the existing rule).
- Radius: controls 6px, panels/menus/dialogs 8px, sheets 12px.
- Motion: 150–200ms ease-out; no bounce; everything respects `prefers-reduced-motion`.
- Routes, navigation sections, roles and behaviour stay as they are. Copy may be tightened, never invent facts or numbers.
- Tests: essential only (user preference). Update tests that break because markup changed; add only the tests named in this plan.

## Review Focus

1. **Duplicate rule names** in one policy → the matched-rule marker goes on the first rule with that name, never on two rows. Test in Task 4.
2. **Try it result from Live while the draft differs** → the marker only shows when the result's target is `draft` (the list shows the draft). Test in Task 4.
3. **Yesterday had zero decisions** → the Home metric shows no percentage change (not "Infinity%" or "NaN%"). Test in Task 3.
4. **Activity date preset "Today" near midnight / in a non-UTC timezone** → range starts at local midnight. Test in Task 6.
5. **Inline token picker on a phone** → the popover stays inside a 375px viewport and the sentence wraps instead of scrolling sideways. Covered by the existing `mobile.spec.ts` horizontal-scroll check, extended in Task 10.

---

### Task 1: Tokens and base components

**Files:**
- Modify: `apps/web/src/index.css` (`:root` and `.dark` token values per Global Constraints)
- Modify: `apps/web/src/components/ui/button.tsx` (default size `h-8 px-3 text-sm`, `sm` = `h-7`, `lg` = `h-9`)
- Modify: `apps/web/src/components/ui/input.tsx`, `select.tsx` (trigger `h-8`), `tabs.tsx` (line variant: 2px `foreground` underline, 13px labels), `badge.tsx` (neutral outline badge only), `card.tsx` (add `variant: "plain"` = no border, no shadow, no padding change)
- Modify: `apps/web/src/components/DecisionChip.tsx`
- Modify: `apps/web/src/components/StatusChip.tsx` (same dot + text pattern: Live = success, Draft = muted, Paused = warning)
- Test: `apps/web/src/components/DecisionChip.spec.tsx`

**Interfaces:**
- Produces: `DecisionChip({ allowed, className })` unchanged signature, new markup `<span data-decision="allow|deny"><span aria-hidden class="size-1.5 rounded-full bg-success|bg-danger"/>Allowed|Denied</span>`. `Card` accepts `variant?: "default" | "plain"`.

- [ ] **Step 1: Create the branch** — `git switch feat/redesign && git switch -c feat/canon-redesign`.
- [ ] **Step 2: Write the failing test** in `DecisionChip.spec.tsx`:

```tsx
it("shows a coloured dot and text, not a filled pill", () => {
  render(<DecisionChip allowed={false} />);
  const chip = screen.getByText("Denied").closest("[data-decision]")!;
  expect(chip).toHaveAttribute("data-decision", "deny");
  expect(chip.className).not.toMatch(/\bbg-/);
  expect(chip.querySelector("[aria-hidden]")).toHaveClass("bg-danger");
});
```

- [ ] **Step 3: Run** `pnpm --filter web test DecisionChip` → FAIL.
- [ ] **Step 4: Implement** tokens, base component sizes and the new `DecisionChip`/`StatusChip` markup.
- [ ] **Step 5: Run** `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint` → all PASS (fix tests that only broke on class names).
- [ ] **Step 6: Commit** — `git commit -m "feat(web): canon tokens, compact controls, dot decision chips"`.

### Task 2: App shell and page header

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx` (background `sidebar`, active item = `sidebar-accent` grey + `foreground` text + 500 weight, 32px items, 13px labels, section label 12px muted)
- Modify: `apps/web/src/components/layout/AppShell.tsx` (content area `bg-background`, max width 1200px for list pages, editor full width)
- Modify: `apps/web/src/components/PageHeader.tsx`
- Modify: `apps/web/src/components/layout/WorkspaceSwitcher.tsx`, `UserMenu.tsx`, `MobileTopBar.tsx`, `BottomTabBar.tsx` (token and size alignment only)

**Interfaces:**
- Produces: `PageHeader({ title, description?, breadcrumb?: { label: string; to?: string }[], status?: ReactNode, actions?: ReactNode })`. Breadcrumb renders above the title as 13px muted links separated by `/`; title 20px semibold; description 14px muted, one line; actions right-aligned; bottom divider `border-b` with 16px padding.

- [ ] **Step 1: Implement** the sidebar, shell and `PageHeader` changes; move the policy editor's back link into `breadcrumb: [{ label: "Policies", to: "/policies" }, { label: policy.name }]`.
- [ ] **Step 2: Run** `pnpm --filter web test && pnpm --filter web typecheck` → PASS (`router.spec.tsx` still finds nav links by name).
- [ ] **Step 3: Look** at Home and the editor at 1440×900 and 390×844 in the browser pane; fix overlap or truncation.
- [ ] **Step 4: Commit** — `git commit -m "feat(web): quieter shell and breadcrumb page header"`.

### Task 3: Home

**Files:**
- Modify: `apps/web/src/pages/home/insights.ts` (add `dayDelta`)
- Modify: `apps/web/src/pages/home/StatTiles.tsx` → one divided strip of four metrics (no boxes), each with a 14-day sparkline (decisions, allow rate) or plain value (live policies, p95), and the change vs yesterday
- Modify: `apps/web/src/pages/home/DecisionsChart.tsx` (Allowed = `success`, Denied = `danger` at 70% opacity, 6px radius top, hover tooltip with exact counts, x-axis labels `Nov 3` style every other day)
- Modify: `apps/web/src/pages/home/SetupChecklist.tsx` (inline horizontal checklist; done items show a `success` check, no strikethrough; hidden when all three are done — keep current hide rule)
- Modify: `apps/web/src/pages/home/RecentDecisions.tsx` (divided list, `DecisionChip`, absolute time in `title`)
- Modify: `apps/web/src/pages/home/Home.tsx` (page header without the redundant description; two-column `chart | latest` at ≥1024px)
- Test: `apps/web/src/pages/home/Home.spec.tsx`

**Interfaces:**
- Produces: `dayDelta(days: DayPoint[], pick: (d: DayPoint) => number): { today: number; yesterday: number; pct: number | null }` — `days` sorted oldest→newest, today is the last item; `pct` is `null` when yesterday is 0 or fewer than 2 days exist; otherwise `Math.round(((today - yesterday) / yesterday) * 100)`.

- [ ] **Step 1: Write the failing tests** in `Home.spec.tsx`:

```ts
describe("dayDelta", () => {
  const d = (allowed: number, denied: number) => ({ date: "x", allowed, denied });
  const total = (p: DayPoint) => p.allowed + p.denied;
  it("compares today with yesterday", () => {
    expect(dayDelta([d(50, 50), d(60, 90)], total)).toEqual({ today: 150, yesterday: 100, pct: 50 });
  });
  it("has no percentage when yesterday was zero", () => {
    expect(dayDelta([d(0, 0), d(3, 1)], total).pct).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter web test Home` → FAIL (`dayDelta` not exported).
- [ ] **Step 3: Implement** `dayDelta`, then the Home components above. The delta renders as `+50% vs yesterday` in `muted-foreground`; no red/green on the delta (decision volume has no good direction).
- [ ] **Step 4: Run** `pnpm --filter web test && pnpm --filter web typecheck` → PASS.
- [ ] **Step 5: Look** at Home with the demo workspace at 1440 and 390 wide, light and dark.
- [ ] **Step 6: Commit** — `git commit -m "feat(web): home metrics with trend, calmer chart and lists"`.

### Task 4: Policy editor — sentence rules and the matched-rule marker

**Files:**
- Create: `apps/web/src/pages/policy-editor/TokenSelect.tsx`
- Create: `apps/web/src/pages/policy-editor/matched-rule.ts`
- Modify: `apps/web/src/pages/policy-editor/ConditionRow.tsx` (renders `field` `operator` `value` as inline tokens in one sentence; remove-condition button appears on row hover/focus)
- Modify: `apps/web/src/pages/policy-editor/RuleCard.tsx` → a divided row, not a bordered card: drag handle and number in a 40px gutter, editable name, the sentence ("When … and …"), then "then **Allow** with Discount % `15`" and reason; ALL/ANY becomes an inline token ("all"/"any of these")
- Modify: `apps/web/src/pages/policy-editor/RuleList.tsx` (accepts `matchedRuleId`; "Otherwise" row in the same style; keeps dnd-kit sensors incl. `activationConstraint: { delay: 200, tolerance: 6 }`)
- Modify: `apps/web/src/pages/policy-editor/PolicyEditor.tsx` (`EditorContext` gains try state; tabs use `variant="line"`; uses `PageHeader` breadcrumb)
- Modify: `apps/web/src/pages/policy-editor/try-it/TryItPanel.tsx`, `ResultCard.tsx`, `InputForm.tsx` (calls `ctx.setTryResult`; result shows `DecisionChip`, reason, "Rule N · name", latency; inputs `h-8`, empty placeholder "Not sent" kept)
- Test: `apps/web/src/pages/policy-editor/editor.spec.tsx`, `apps/web/src/pages/policy-editor/try-it/try-it.spec.tsx`

**Interfaces:**
- Produces: `TokenSelect<T extends string>({ value: T; options: { value: T; label: string }[]; onChange(v: T): void; ariaLabel: string; disabled?: boolean })` — a ghost button showing the label with a dotted underline, opening a `Popover` + `Command` list; keyboard: Enter/Space opens, arrows move, Enter picks, Esc closes.
- Produces: `matchedRuleId(ruleSet: RuleSet, result: TryResult | null): string | null` — `null` when `result` is null, `result.target !== "draft"`, or `result.rule` is null; otherwise the `id` of the **first** rule whose `label === result.rule`.
- Produces: `EditorContext` adds `tryResult: TryResult | null` and `setTryResult(r: TryResult | null): void`; cleared when the draft changes.
- Consumes: `DecisionChip` (Task 1), `PageHeader` breadcrumb (Task 2).

- [ ] **Step 1: Write the failing tests.** In `editor.spec.tsx`:

```ts
describe("matchedRuleId", () => {
  const rs = { ...sampleRuleSet(), rules: [
    { ...sampleRuleSet().rules[0], id: "a", label: "Gold" },
    { ...sampleRuleSet().rules[1], id: "b", label: "Gold" },
  ] };
  const r = (over: Partial<TryResult>) => ({ allowed: true, reason: "", outcomes: {}, rule: "Gold", policy: { key: "k", version: 1 }, decisionId: "d", target: "draft", latencyMs: 1, missingFields: [], typeErrors: [], ...over }) as TryResult;
  it("marks the first rule with that name", () => expect(matchedRuleId(rs, r({}))).toBe("a"));
  it("marks nothing for a live result", () => expect(matchedRuleId(rs, r({ target: "live" }))).toBeNull());
  it("marks nothing when no rule matched", () => expect(matchedRuleId(rs, r({ rule: null }))).toBeNull());
});
```

In `try-it.spec.tsx` (uses the existing mocked `/try` response for rule "Gold customers"):

```ts
it("marks the matched rule in the list after a draft run", async () => {
  // render the editor with TryItPanel in the side slot, click Run
  const row = await screen.findByRole("article", { name: /Gold customers/ });
  expect(row).toHaveAttribute("data-matched", "true");
  expect(within(row).getByText("Matched")).toBeVisible();
});
```

- [ ] **Step 2: Run** `pnpm --filter web test editor try-it` → FAIL.
- [ ] **Step 3: Implement** `matchedRuleId`, `TokenSelect`, the context state, and the row redesign. Matched row: 2px `primary` left bar, "Matched" 12px `primary` text next to the name, `scrollIntoView({ block: "nearest", behavior })` with `behavior = "auto"` under reduced motion; rules above it fade to 60% opacity for 600ms then return.
- [ ] **Step 4: Run** `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint` → PASS (update selectors in `editor.spec.tsx`/`publishing.spec.tsx` that targeted the old selects; keep aria labels "Field", "Operator", "Value").
- [ ] **Step 5: Look** at the editor with "Checkout discount" at 1440, 1024 (Try it in the sheet) and 390 wide; run Try it with Gold/250 and check the marker, keyboard-only editing of one condition, and the popover staying on screen at 390.
- [ ] **Step 6: Commit** — `git commit -m "feat(web): rules as sentences with inline pickers; Try it marks the matched rule"`.

### Task 5: Policies, Templates, Versions and Publish

**Files:**
- Modify: `apps/web/src/pages/policies/PoliciesList.tsx` (`DataList` rows: name + mono key, `StatusChip`, 7-day decisions with a 40px sparkline, updated time; primary "New policy" in the header)
- Modify: `apps/web/src/pages/templates/TemplateGallery.tsx` (category as line tabs with counts; template = bordered 8px panel with title, one-line description, up to three rule sentences in 13px muted text with Allow/Deny dots, and a secondary "Use template" button aligned bottom-left; 3 columns ≥1280, 2 ≥768, 1 below)
- Modify: `apps/web/src/pages/policy-editor/VersionsTab.tsx`, `VersionCompare.tsx`, `PublishDialog.tsx` (divided version list with number, who, when, `StatusChip`; diff entries as added/changed/moved/removed rows with a 2px coloured left bar: success/primary/muted/danger)

- [ ] **Step 1: Implement** the three page areas.
- [ ] **Step 2: Run** `pnpm --filter web test && pnpm --filter web typecheck` → PASS (`policies.spec.tsx`, `publishing.spec.tsx` updated only for markup).
- [ ] **Step 3: Look** at each at 1440 and 390 wide.
- [ ] **Step 4: Commit** — `git commit -m "feat(web): policies, templates and versions in the canon style"`.

### Task 6: Activity

**Files:**
- Create: `apps/web/src/pages/activity/date-range.ts`
- Modify: `apps/web/src/pages/activity/Activity.tsx` (filter bar: `Policy`, `Decision`, `Source` as compact `h-8` dropdown buttons showing the current value, plus a date-range dropdown with presets; active filters show a "Clear" link; no native date inputs; table 40px rows, time column shows relative time with the absolute time in a tooltip; "Changes" tab as a divided timeline with avatars)
- Modify: `apps/web/src/pages/activity/DecisionDetailSheet.tsx` (sections divided, input/outcome JSON in the code style)
- Test: `apps/web/src/pages/activity/activity.spec.tsx`

**Interfaces:**
- Produces: `type RangePreset = "today" | "7d" | "30d" | "all"`; `rangeFor(preset: RangePreset, now: Date): { from?: string; to?: string }` — ISO strings; `today` → `from` = local midnight of `now`; `7d`/`30d` → `from` = local midnight 6/29 days before `now`; `all` → `{}`; `to` always omitted.
- Consumes: the existing Activity filter state (`from`/`to` query params keep their meaning).

- [ ] **Step 1: Write the failing test** in `activity.spec.tsx`:

```ts
it("starts 'today' at local midnight", () => {
  const now = new Date(2026, 10, 14, 23, 59);
  expect(new Date(rangeFor("today", now).from!).getTime()).toBe(new Date(2026, 10, 14, 0, 0).getTime());
  expect(new Date(rangeFor("7d", now).from!).getTime()).toBe(new Date(2026, 10, 8, 0, 0).getTime());
  expect(rangeFor("all", now)).toEqual({});
});
```

- [ ] **Step 2: Run** `pnpm --filter web test activity` → FAIL.
- [ ] **Step 3: Implement** `rangeFor` and the Activity changes (phone keeps the Filters sheet from the last redesign, restyled).
- [ ] **Step 4: Run** `pnpm --filter web test && pnpm --filter web typecheck` → PASS.
- [ ] **Step 5: Look** at Activity at 1440 and 390 wide with filters active and with an empty result.
- [ ] **Step 6: Commit** — `git commit -m "feat(web): activity filter bar with date presets"`.

### Task 7: Connect and Settings

**Files:**
- Modify: `apps/web/src/pages/connect/Connect.tsx` (two-column at ≥1024: left "Make a decision" steps 1-2-3 — pick policy, copy endpoint, run a sample — right a code panel with language line tabs and Copy; request and response shown as two tabs of the code panel; error note as a short list under it)
- Modify: `apps/web/src/pages/connect/ApiKeysCard.tsx` (section with divider, not a card; empty state with one sentence and "Create key")
- Modify: `apps/web/src/pages/settings/Settings.tsx`, `MembersCard.tsx`, `DemoControls.tsx`, `DangerZone.tsx` (sections separated by dividers, label column 240px on the left at ≥1024 like Vercel settings; Danger zone keeps its bordered `danger` panel)

- [ ] **Step 1: Implement** both pages.
- [ ] **Step 2: Run** `pnpm --filter web test && pnpm --filter web typecheck` → PASS (`settings.spec.tsx` markup updates only).
- [ ] **Step 3: Look** at both at 1440, 768 and 390 wide (Members role select must stay usable on phones).
- [ ] **Step 4: Commit** — `git commit -m "feat(web): connect and settings in the canon style"`.

### Task 8: Sign-in, sign-up, invite and onboarding

**Files:**
- Modify: `apps/web/src/pages/auth/AuthCard.tsx` (Clerk-style: centred 400px panel on `background`, logo above, title 20px, Google button first when enabled, "or" divider, fields, primary button full width, footer link; the right-hand marketing panel and `DecisionPreview` are removed from auth)
- Modify: `apps/web/src/pages/auth/SignIn.tsx`, `SignUp.tsx`, `AcceptInvite.tsx` (field order and copy only as needed)
- Modify: `apps/web/src/pages/onboarding/CreateWorkspace.tsx`, `Welcome.tsx` (same centred panel; Welcome offers three choices as a divided list: Start from a template, Open the demo, Start blank)

- [ ] **Step 1: Implement** the auth and onboarding screens.
- [ ] **Step 2: Run** `pnpm --filter web test && pnpm --filter web typecheck` → PASS.
- [ ] **Step 3: Run** `pnpm --filter web e2e --project chromium` → PASS (sign-up journey).
- [ ] **Step 4: Look** at sign-in with and without Google configured, at 1440 and 390 wide, light and dark.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): centred sign-in and onboarding"`.

### Task 9: Logo and landing page

The landing page is a **Persuade** surface: its composition is decided with the user before building.

**Files:**
- Modify: `apps/web/src/components/Logo.tsx`, `apps/web/public/brand/*.svg`, `apps/web/public/favicon.svg`, `docs/images/pengopa-logo-card.svg`
- Modify: `apps/web/src/pages/landing/Landing.tsx`, `LandingNav.tsx`, `DecisionPreview.tsx`
- Create: `apps/web/.impeccable/surfaces/` brief for `src/pages/landing/Landing.tsx` (via `impeccable surface-brief write`)

- [ ] **Step 1: Logo.** Redraw as a simple geometric mark plus "PengOPA" wordmark in Geist 600, single ink colour with the accent only on the mark; export `pengopa-mark.svg`, `pengopa-logo.svg`, favicon, and the README card. Get the user's OK on the mark before Step 2.
- [ ] **Step 2: Surface round.** From `apps/web`, run `impeccable concept-seed --scope surface --mode persuade`, present the dealt structures on the decision page with HTML sketches (1440×900), and wait for the user's pick. Write the landing brief with its direction contract (FORM line carries the printed seed reference).
- [ ] **Step 3: Build** the chosen structure: nav, hero showing the real product (the sentence rule editor and a decision explaining itself, built from real components with labelled demo data), how-it-works for the three audiences (ops writes, engineers call, sales demos), templates strip from the real nine templates, isolation section from the README's isolation table, final CTA (Sign up / Open the demo). No customer logos, testimonials, pricing or metrics.
- [ ] **Step 4: Run** `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web e2e` → PASS (`router.spec.tsx` landing assertions updated for copy only).
- [ ] **Step 5: Look** at the landing page at 1440, 768 and 390 wide, light and dark.
- [ ] **Step 6: Commit** — `git commit -m "feat(web): new logo and landing page"`.

### Task 10: Finish — detector, review, DESIGN.md, screenshots, PR

**Files:**
- Modify: `apps/web/e2e/mobile.spec.ts` (after editing a condition through the inline picker, assert `document.documentElement.scrollWidth <= 390` again)
- Create: `apps/web/DESIGN.md`, `apps/web/.impeccable/design.json` (by the documenter)
- Modify: `docs/images/{home,editor,activity,connect,templates}.png`, `README.md` (only if screenshots' captions change)

- [ ] **Step 1: Extend** `mobile.spec.ts` as above; run `pnpm --filter web e2e` → PASS.
- [ ] **Step 2: Detector.** From `apps/web`, run `impeccable detect --json src`; fix mechanical findings; keep the rest for the reviewer.
- [ ] **Step 3: Capture** `apps/web/.impeccable/review/desktop.png` (1440×900) and `mobile.png` (390×844) of the editor after a Try-it run, plus Home, Activity and the landing page (one file per surface and viewport); open each to confirm it shows what its name says.
- [ ] **Step 4: Finish review.** Spawn `impeccable:impeccable-finish-reviewer` fresh with: the original request, the confirmed answers (users, scope, brand, benchmarks Linear/Vercel/Clerk), both surface briefs, the screenshot paths, detector findings, `canon.html` as the critique reference, and the craft-floor path. Apply its disposition (fix → one batch, recapture, verdict pass; two rounds max, then ask the user).
- [ ] **Step 5: DESIGN.md.** Spawn `impeccable:impeccable-documenter` with the project root `apps/web`, the briefs, PRODUCT.md and the write boundary; verify `DESIGN.md` and `.impeccable/design.json` both exist with tokens.
- [ ] **Step 6: Regenerate** `docs/images/*.png` at 1440×900 from the demo workspace.
- [ ] **Step 7: Verify** `pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm --filter web e2e` → all PASS.
- [ ] **Step 8: Commit and open the PR** — commit `PRODUCT.md`, `DESIGN.md`, `.impeccable/config.json` (if any), `.impeccable/surfaces/`, `.impeccable/design.json`; never `.impeccable/mocks/`, `questions/`, `review/`. Push `feat/canon-redesign` and create the PR with `gh pr create --base main` (full path `C:\Program Files\GitHub CLI\gh.exe` if `gh` is not on PATH), then bind it to the session.
