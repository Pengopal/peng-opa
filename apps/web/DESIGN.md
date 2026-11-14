---
name: PengOPA
description: Plain-language business rules in front of Open Policy Agent; every decision explains itself.
colors:
  primary: "#4f46e5"
  primary-foreground: "#ffffff"
  matched-tint: "#f4f4fd"
  background: "#ffffff"
  foreground: "#0a0a0b"
  muted: "#f4f4f5"
  muted-foreground: "#71717a"
  border: "#e4e4e7"
  sidebar: "#fafafa"
  sidebar-accent: "#f0f0f2"
  success: "#15803d"
  success-muted: "#ecfdf3"
  danger: "#dc2626"
  danger-muted: "#fef2f2"
  warning: "#b45309"
  warning-muted: "#fffbeb"
  code: "#0a0a0b"
  code-foreground: "#ededf0"
  chart-allowed: "oklch(0.50 0.12 160)"
  chart-denied: "oklch(0.76 0.14 55)"
typography:
  display:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  subtitle:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  lead:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-ghost:
    textColor: "{colors.foreground}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "32px"
  sentence-token:
    textColor: "{colors.foreground}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.md}"
    padding: "0 6px"
    height: "28px"
  decision-allowed:
    textColor: "{colors.success}"
    typography: "{typography.label}"
  decision-denied:
    textColor: "{colors.danger}"
    typography: "{typography.label}"
  rule-row:
    backgroundColor: "{colors.background}"
    padding: "16px 12px 16px 0"
  rule-row-matched:
    backgroundColor: "{colors.matched-tint}"
    padding: "16px 12px 16px 0"
  table-row:
    typography: "{typography.body}"
    padding: "8px"
    height: "32px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    width: "240px"
---

# Design System: PengOPA

## Overview

**Creative North Star: "The Self-Explaining Decision"**

PengOPA is the category-standard SaaS look executed at the precision of Linear, Vercel and Clerk: a white ground, near-black ink, a cool zinc grey scale and one indigo accent. The world has no theme or motif; its character comes from what it refuses. Sections are not boxed as bordered cards on a grey canvas. Structure is drawn with 1px dividers and spacing, and the one place the accent carries meaning beyond action is the matched rule, where a decision shows the path it took.

The signature grammar is shared by the app and the landing page: rules are written as sentences with inline dotted-underline tokens, a run marks the rule that matched with a faint indigo tint and the word "Matched", and the rules it never reached are dimmed. Allow and Deny are never filled pills; they are a coloured dot followed by the word. Density is working-tool density (13 to 14px UI type, 32px rows and controls) without the grey, gridded look of enterprise software.

Light is the default theme. Dark is opt-in from the account menu (light, dark or system), stored per browser and applied with a `.dark` class on the root.

**Key Characteristics:**
- White ground, near-black ink, cool zinc neutrals, one indigo accent
- Structure from 1px dividers and spacing, not nested cards
- Allow/Deny as a coloured dot plus a word
- Matched rule: 6% primary tint plus a "Matched" label; skipped rules dimmed "Not reached"
- Geist for everything, Geist Mono only for keys, values and code
- 32px controls and table rows; 6 to 8px radius
- Light by default, dark opt-in

## Colors

A neutral zinc ramp on white with a single indigo voice; green, red and amber appear only as meaning, never as decoration.

### Primary
- **Decision Indigo** (`primary`): primary buttons, focus rings, selection, links, the logo mark, the "Matched" label. In dark it lifts to a lighter indigo so it holds contrast on near-black.
- **Matched Tint** (`matched-tint`): the primary at 6% over the ground (`bg-primary/[0.06]`). Used only to mark the rule a decision matched, in the policy editor and in the landing decision trail.

### Neutral
- **Paper White** (`background`): page ground, cards, popovers, rule rows. The canvas and the card are the same white; there is no grey page behind white boxes.
- **Ink** (`foreground`): body text, headings, the wordmark.
- **Zinc Wash** (`muted`): hover fills, secondary buttons, raw JSON blocks, active token pickers.
- **Zinc Slate** (`muted-foreground`): descriptions, breadcrumbs, column headers, rule numbers, "Not reached".
- **Hairline** (`border`): every divider, table rule, input stroke and the few remaining framed panels.
- **Sidebar Mist** (`sidebar`, `sidebar-accent`): the app sidebar ground and its active item fill; the only off-white surface in the shell.
- **Code Night** (`code`, `code-foreground`): the dark code-block surface used for Connect samples and the Rego view, in both themes.

### Semantic
- **Allow Green** (`success`, `success-muted`): the Allowed dot and word, the Live status dot.
- **Deny Red** (`danger`, `danger-muted`): the Denied dot and word, errors, the danger settings panel.
- **Paused Amber** (`warning`, `warning-muted`): the Paused status dot, rule warnings.
- **Chart pair** (`chart-allowed`, `chart-denied`): allowed and denied series on Home and Activity charts, validated for colour-vision deficiency (deutan/protan delta E 18.2 in light, 9.7 in dark).

### Named Rules
**The One Voice Rule.** Indigo means action, focus, selection or "this rule matched". It never means allow, deny or status.

**The Meaning-Only Rule.** Green, red and amber are reserved for decision outcome and policy status. They are never used as decorative category colours.

## Typography

**Display Font:** Geist Variable (with system-ui)
**Body Font:** Geist Variable (with system-ui)
**Label/Mono Font:** Geist Mono Variable (with ui-monospace)

**Character:** One neutral grotesque carries every role through weight and size alone, set tight (`tracking-tight`) at heading sizes; the mono is a second voice used only where the text is machine data.

### Hierarchy
- **Display** (600, 2.25rem on phones, 3rem from sm, 3.25rem from lg, line-height 1.05): the landing hero headline only.
- **Headline** (600, 1.5rem to 1.875rem): landing section headings and the closing call to action.
- **Title** (600, 1.25rem): the one `h1` per app page, set by PageHeader.
- **Subtitle** (500, 14px): in-page section headings (SettingsSection, panels), rule names, button labels.
- **Lead** (400, 15px): the line under a landing heading.
- **Body** (400, 14px): app body text, table cells, rule sentences. Below md, inputs render at 16px to avoid zoom on phones.
- **Label** (500, 13px): breadcrumbs, DecisionChip and StatusChip words, descriptions under section titles.
- **Caption** (400, 12px): column headers, hints, the "Matched" and "Not reached" labels, metadata lines.
- **Mono** (400, 12.5px): JSON inputs, endpoint paths, API keys, rule numbers in the decision trail.

### Named Rules
**The Data-Only Mono Rule.** Geist Mono is for keys, values, paths and code. Headings, labels, buttons and prose are always Geist.

**The Tabular Rule.** Tables and anything marked `data-numeric` use tabular figures so numbers align in columns.

## Layout

The app shell is a 240px sidebar (collapsing to a 68px rail) from lg, and a top bar plus bottom tab bar below lg. Page content sits in a `max-w-6xl` column with 16px, 24px and 32px side padding at phone, sm and lg widths. Every page opens with PageHeader: optional breadcrumb, one title with an inline status, a muted line beneath, actions on the right, and a 1px rule under it (the policy editor uses the compact variant without the rule).

Spacing is Tailwind's 4px scale. Field to field 8px, within a section 16px, between page sections 24px, settings blocks separated by 32px of padding and a divider. Settings use a two-column grid on wide screens: a 240px title-and-explanation column and the controls beside it.

Lists of records are a table from md up (32px header row, 8px cell padding, 1px row dividers) and a divided list of 56px tappable rows below md. Nothing scrolls the page sideways; wide content scrolls inside its own box. The app is responsive to 375px and controls grow to 44px on coarse pointers.

The landing page uses the same column: each section is a `border-t` band with 64px (80px from sm) vertical padding, the heading and lead in an 18rem column on the left and the content on the right.

**The Divider Rule.** Sections are separated by a 1px rule and space. If a block would need a border on all four sides to read as a group, the layout is wrong first.

## Elevation & Depth

The system is flat at rest. In-page surfaces carry no shadow; depth is expressed by dividers and by the single off-white sidebar. Shadows appear only on things that float above the page.

### Shadow Vocabulary
- **Hairline lift** (`shadow-xs`): primary buttons only.
- **Floating menu** (`shadow-md` plus a 1px ring at 10% ink): popovers, selects, dropdown menus, token pickers.
- **Sheet** (`shadow-lg`): side and bottom sheets, dialogs, and a rule while it is being dragged.

**The Float-Only Rule.** A shadow means the element is above the page (menu, sheet, dialog, drag). Nothing sitting in the page flow gets one.

## Shapes

Gently rounded and consistent: controls and sentence tokens at 6px, the framed panels that remain (decision trail, danger zone, cards, popovers) at 8px, dialogs at 12px. Status dots are 6px circles. Dividers are always 1px. The logo is a 52-unit square with a 14-unit corner, cut on the diagonal: the filled half a yes, the outlined half a no, drawn in indigo beside an ink wordmark.

**The No-Bar Rule.** No coloured side stripe wider than 1px on any row, card or callout. Emphasis is a tint plus a word.

## Components

### Buttons
Quiet and precise.
- **Shape:** gently rounded (6px), 32px tall (28px small, 36px large, 44px minimum on touch).
- **Primary:** indigo fill, white label, 14px medium; at most one per view. Hover drops to 90% opacity, press nudges 1px down.
- **Secondary / Ghost / Outline:** zinc wash fill, transparent with a zinc wash hover, or a hairline stroke on white.
- **Focus:** indigo border plus a 3px indigo ring at 50%.
- **Destructive:** 10% red tint with red text, never a solid red fill.

### Decision and Status chips
- **DecisionChip:** a 6px dot and the word "Allowed" (green) or "Denied" (red), 13px medium, word and dot both in the outcome colour. The only way an outcome is shown.
- **StatusChip:** a 6px dot (Live green, Draft grey, Paused amber) beside the status word in ink.

### Inputs / Fields
- **Style:** 1px hairline stroke, transparent ground, 6px radius, 32px tall.
- **Focus:** indigo border plus a 3px indigo ring at 50%.
- **Error / Disabled:** red border and red ring at 20%; disabled at 50% opacity on a wash.
- **Inline variant:** rule names render borderless until hover or focus, so the rule reads as text.

### Navigation
- **Sidebar:** Sidebar Mist ground, workspace switcher, search, then nav items; the active item takes the sidebar accent fill.
- **Breadcrumb:** 13px muted, slash separators, the current page in ink.
- **Tabs:** section switches are underline tabs (a 1px ink line under the active tab); view switches are a small segmented control.

### Rule row (signature)
A rule is a divided row that reads as a sentence: a muted number and drag handle in a 40px gutter, the editable name, then "When customer tier is gold and order total is at least 200, allow with 15% discount", where every variable word is a sentence token. Rules stack with 1px dividers, never as separate cards.

### Sentence token
The variable word in a rule sentence: 14px medium, a dotted underline at 60% slate offset 4px, 28px tall with 6px padding and radius, a zinc wash on hover and while its picker is open.

### Try it and the decision trail (signature)
Running Try it on the draft scrolls the matched rule into view, tints it with Matched Tint and adds a caption-size indigo "Matched" label; the rules above it briefly dim (opacity 0.6 back to 1 over 600ms, ease-out, skipped under reduced motion). The result reads top down after a divider: the DecisionChip with target and latency, the quoted reason, then a key/value list naming the matched rule and its results. The landing page shows the same grammar statically in the decision trail: a framed 8px panel of labelled steps (Input, Rules in order, Answer, Call) split by 1px rules, the matched rule tinted with "Matched" and the later rules dimmed to 70% with "Not reached".

### Motion
State transitions run 150 to 200ms ease-out with no bounce; reduced motion is honoured. The landing page has no motion beyond hover colour and nothing autoplays.

## Do's and Don'ts

### Do:
- **Do** show every outcome with DecisionChip: a 6px coloured dot plus the word Allowed or Denied.
- **Do** mark the matched rule with the 6% primary tint and a "Matched" label, and dim the rules it skipped as "Not reached".
- **Do** build structure from 1px dividers and spacing; group with a divider and a heading.
- **Do** keep one primary (indigo) button per view.
- **Do** use Geist Mono only for keys, values, paths and code.
- **Do** design and check light first; dark is opt-in and must hold the same rules.
- **Do** keep tables and controls at 32px, growing to 44px on touch.

### Don't:
- **Don't** render Allow or Deny as filled pills or badges.
- **Don't** use a coloured side bar wider than 1px to mark a matched, selected or warning row.
- **Don't** nest cards inside cards or box every section on a grey canvas.
- **Don't** add eyebrows or kicker labels above headings, sparklines, or icons in tinted tiles.
- **Don't** use indigo to mean allow, deny or status.
- **Don't** put shadows on in-page surfaces.
- **Don't** use mono for headings, buttons or prose.
