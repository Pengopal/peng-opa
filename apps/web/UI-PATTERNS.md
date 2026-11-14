# PengOPA web — UI checklist

Every page in `src/pages` follows these lines. Rewritten for the 2026-11-13 redesign
(`docs/superpowers/specs/2026-11-13-pengopa-redesign-design.md`, approved by the user);
the shared pieces that already existed keep their roles. Updated for the 2026-11-14 canon redesign; the full design system is in `DESIGN.md`. "Settled by" names what decided each line.

| Role | Use | Settled by |
|---|---|---|
| Page frame | Rendered inside `AppShell`: light sidebar ≥ lg (collapsible rail), top bar + bottom tab bar below lg. Page content only, no own outer padding | redesign spec §4 |
| Navigation entries | One source: `NAV` in `components/layout/nav.ts`; sidebar, bottom tab bar, More sheet and ⌘K palette all read it | redesign spec §4 |
| Page title | `PageHeader` — optional breadcrumb, one `h1` with optional status, description, actions on the right, a 1px rule under it; `compact` on working screens (the policy editor) | canon redesign |
| Primary action | At most one `Button` (default = accent) per view; others `secondary`/`ghost` | redesign spec §3 |
| Sections inside a page | Plain `section` with an `h2`, separated by 1px dividers and spacing; `SettingsSection` (label column + content) on settings pages. Never a card inside a card or a sheet | canon redesign |
| Section switch inside a page | `TabsList variant="line"` (existing variant, restyled as an underline); scrolls sideways on phones, never wraps | redesign spec §3 |
| View switch of the same content | `TabsList` default variant (segmented, 2–4 options) | redesign spec §3 |
| Allowed / denied | `DecisionChip` — 6px coloured dot + the word, never a filled pill or a hand-written green/red span; accent colour never means allow/deny | canon redesign |
| Policy status | `StatusChip` — dot + text | canon redesign |
| Matched rule | Primary tint at 6% plus a "Matched" label; skipped rules dimmed. No coloured side bars wider than 1px | canon redesign |
| Lists of records | `DataList` — flat table ≥ md (32px-scale rows, `border-b` dividers, `⋯` row actions), stacked rows below md; tap/click opens the detail | canon redesign |
| Detail / side panels | `ResponsiveSheet` — right panel ≥ md, bottom sheet below md | redesign spec §3 |
| Empty lists | `EmptyState` with the action that fills the list | existing piece |
| Failed request | `ErrorText` inside the page/dialog; transient success → `toast` (sonner) | existing piece (22 files) |
| Loading | `Skeleton` shaped like the content; buttons show "…ing" text and are disabled while pending | existing piece (12 files) |
| Data | TanStack Query: keys `[resource, ...params]`; writes via `useMutation` + `invalidateQueries`; API through `api()` only | unchanged |
| Role-gated actions | `can(current.role, "EDITOR")` hides actions a viewer can't use | spec §4.2 |
| Forms | `Label` + `Input`/`Select`/`Textarea` stacked in `grid gap-2`; native `required`/`minLength`; server message via `ErrorText` | unchanged |
| Dialogs | shadcn `Dialog`; destructive confirms use `AlertDialog` | shadcn |
| Navigation links | TanStack `Link`; navigating buttons use `Button asChild` + `Link`. Dashboard is `/home`; `/` is the public landing page | redesign spec §6 |
| Icons | lucide-react, `size-4`, decorative ones `aria-hidden` | unchanged |
| Brand | `Logo` (`variant="full"` mark + "PengOPA" wordmark, or `"mark"`); never the old Pengopal images | redesign spec §1 |

## Values

- **Theme:** custom properties in `src/index.css` only; no hex/oklch literals in components. Token names: `background`, `canvas`, `foreground`, `card`, `primary` (indigo accent), `muted(-foreground)`, `border`, `input`, `ring`, `sidebar*`, `success`/`danger`/`warning` (+ `-muted`), `code` (code-block surface), `chart-1` allowed, `chart-2` denied.
- **Neutrals** cool zinc grays; light is default, dark opt-in from the account menu.
- **Spacing:** Tailwind's 4px scale. Page sections `gap-6`, inside a card `gap-4`, field to field `gap-2`.
- **Radius:** controls `rounded-md` (6px), panels and tables `rounded-lg` (8px), dialogs 12px, sheets 16px top corners.
- **Elevation:** hairline borders on in-page surfaces; shadows only on popovers, dialogs, sheets and sticky mobile bars.
- **Type:** Geist Sans everywhere, Geist Mono only for keys, values, paths and code. Page title `text-xl font-semibold tracking-tight` (PageHeader only); section title `text-sm font-medium`; body `text-sm`/13px; hints `text-xs text-muted-foreground`. No eyebrows.
- **Touch:** controls are at least 44px tall on coarse pointers (handled in `button`, `input`, `select`); page never scrolls sideways — wide content scrolls inside its own box.
- **Dates:** relative ("edited 2h ago", `formatRelative`), absolute on hover/detail.

## Not copied

- shadcn's demo blocks and Vite starter styles.
- The old navy/gold Pengopal palette and Lexend/Inter fonts.
