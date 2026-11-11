# peng-opa web — UI checklist

Every page in `src/pages` follows these lines. Settled at Task 19; later pages extend it.
"Settled by" names what decided each line (no earlier pages existed, so the spec §7 page
shapes — approved by the user — and the plan's named pieces are the authorities).

| Role | Use | Settled by |
|---|---|---|
| Page frame | Rendered inside `AppShell` (sidebar ≥ lg, sheet + menu button below lg); page content only, no own outer padding | plan Task 19 |
| Page title | `PageHeader` — one `h1`, optional description line, actions on the right, wraps on phones | plan Task 19 |
| Sections inside a page | shadcn `Card` (`CardHeader` › `CardTitle` as `h2`) | spec §7 (cards), shadcn |
| Allowed / denied | `DecisionChip` — never a hand-written green/red span | spec §7 visual direction |
| Policy status | `StatusChip` | plan Task 19 |
| Empty lists | `EmptyState` with the action that fills the list | plan Task 19 |
| Failed request | `ErrorText` (shadcn `Alert`, destructive) inside the page/dialog; transient success → `toast` from sonner | Task 19 |
| Loading | shadcn `Skeleton` shaped like the content; buttons show "…ing" text and are disabled while pending | Task 19 |
| Data | TanStack Query: `useQuery` with keys `[resource, ...params]`; writes via `useMutation` + `invalidateQueries` | Task 19 |
| API calls | `api()` from `@/lib/api` only (adds workspace header, maps 401) | Task 19 |
| Role-gated actions | `can(current.role, "EDITOR")` hides actions a viewer can't use (server still enforces) | spec §4.2 |
| Forms | `Label` + `Input`/`Select`/`Textarea` stacked in `grid gap-2`; native `required`/`minLength`; server message shown via `ErrorText` | Task 19 sign-in/up |
| Dialogs | shadcn `Dialog`; destructive confirms use `AlertDialog` | shadcn |
| Navigation links | TanStack `Link`; buttons that navigate use `Button asChild` + `Link` | Task 19 |
| Icons | lucide-react, `size-4`, decorative ones `aria-hidden` | shadcn preset (lucide) |

## Values

- Colours only through theme tokens in `src/index.css` (`primary`, `muted-foreground`, `success`, `danger`, `*-muted`, `chart-1` allowed, `chart-2` denied). No hex/oklch literals in components.
- Spacing on Tailwind's 4px scale (`gap-2`, `gap-4`, `p-6` …). Radius via `rounded-md/lg/xl` (token based).
- Type: `text-2xl font-semibold` page title (PageHeader only); `text-sm` body; `text-xs text-muted-foreground` hints.
- Dates: relative for "edited 2h ago" (`formatRelative` in `@/lib/format`), absolute on hover/detail.

## Not copied

- shadcn's demo blocks and Vite starter styles.
