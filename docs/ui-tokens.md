# MoneyFlowOS UI Tokens

This document defines the **shared UI tokens and implementation conventions** that already exist in the current MoneyFlowOS app.

It should be used together with:
- `docs/ui-reference.md` for design patterns and screen composition
- this file for **exact-ish implementation guidance** such as radius, spacing, card density, inputs, button sizing, semantic colors, and responsive behavior

Goal:
- help ChatGPT / Codex avoid inventing inconsistent UI
- help future screens match the existing mobile-friendly parts of the app
- reduce “close but not quite” visual drift across modules

Important:
- this file is based on the **current codebase**, not a brand-new design system
- when current code is inconsistent, prefer the **dominant existing pattern** rather than inventing a new one

---

## 1. Primary source files

These files were used as the main references when writing this token file:

### Global CSS and theme
- `src/styles.css`

### Shell / layout / responsive navigation
- `src/components/layout/AppShell.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/TopHeader.tsx`

### Strong mobile-friendly screens/components
- `src/components/budget/BudgetBuilder.tsx`
- `src/components/dashboard/KpiCard.tsx`
- `src/components/transactions/TransactionList.tsx`
- `src/components/goals/GoalsBoard.tsx`
- `src/components/reports/ReportsPanel.tsx`
- `src/routes/settings.tsx`

---

## 2. Token philosophy

MoneyFlowOS currently follows a **soft premium fintech UI**.

The dominant visual traits are:
- generous radii
- light borders
- soft premium shadows
- muted neutral backgrounds
- strong but controlled semantic accent colors
- compact but readable density
- mobile-friendly touch targets

When implementing new UI:
- reuse these tokens first
- do not create a parallel “rental-only token set” unless intentionally approved later

---

## 3. Radius tokens

Defined in `src/styles.css`:

- base radius: `--radius: 1rem`
- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-2xl`
- `--radius-3xl`
- `--radius-4xl`

### Recommended practical usage

#### `rounded-full`
Use for:
- chips
- status pills
- compact delta badges
- small inline counters

References:
- filter chips in `TransactionList.tsx`
- delta pill in `KpiCard.tsx`

#### `rounded-xl`
Use for:
- standard inputs
- standard buttons
- icon buttons
- small inner utility blocks
- badge containers with rectangular shape

References:
- inputs in `settings.tsx`
- action buttons in `TopHeader.tsx`
- icon buttons in `GoalsBoard.tsx`
- KPI icon container in `KpiCard.tsx`

#### `rounded-2xl`
Use for:
- medium cards
- table container cards
- summary cells
- action cards

References:
- `TransactionList.tsx`
- `ReportsPanel.tsx`
- `KpiCard.tsx`

#### `rounded-3xl`
Use for:
- major feature cards
- premium section shells
- goal cards
- settings sections
- hero/large layout panels

References:
- `GoalsBoard.tsx`
- `BudgetBuilder.tsx`
- `settings.tsx`

### Recommendation for rental

#### Desktop
- table containers: `rounded-2xl`
- major modal sections / large panels: `rounded-2xl` or `rounded-3xl`

#### Mobile
- entity cards: `rounded-2xl`
- full-width major blocks: `rounded-2xl`
- sheets / full-height overlays: keep outer shell system-consistent, inner sections `rounded-2xl`

### Do not do
- mix `rounded-md` / `rounded-lg` heavily into main screen cards
- use sharp corners for a new module while the rest of the app stays soft

---

## 4. Shadow tokens

Defined in `src/styles.css`:

- `shadow-card`
- `shadow-elevated`
- `shadow-glow`

### `shadow-card`
Default card shadow.

Use for:
- most cards
- tables inside cards
- summary blocks
- forms in standard sections

References:
- `KpiCard.tsx`
- `GoalsBoard.tsx`
- `ReportsPanel.tsx`
- `TransactionList.tsx`
- `settings.tsx`

### `shadow-elevated`
Use for hover/emphasis or stronger CTA elevation.

Use for:
- hover state on premium cards
- elevated call-to-action surfaces
- mobile FAB

References:
- hover state in `KpiCard.tsx`
- hover state in `GoalsBoard.tsx`
- FAB in `AppShell.tsx`

### `shadow-glow`
Use sparingly for highlighted brand surfaces.

References:
- brand icon area in `AppSidebar.tsx`

### Recommendation for rental
- default to `shadow-card`
- use `shadow-elevated` only on hover/focus/important lift states
- do not add heavy custom drop shadows per tab

---

## 5. Color tokens

Defined in `src/styles.css`.

### Neutral UI tokens
- `background`
- `foreground`
- `card`
- `card-foreground`
- `muted`
- `muted-foreground`
- `border`
- `input`
- `ring`
- `primary`
- `primary-foreground`
- `destructive`
- `destructive-foreground`

### Semantic category colors
- `income`
- `needs`
- `wants`
- `savings`
- `investments`
- `warning`
- `unallocated`

Soft versions:
- `income-soft`
- `needs-soft`
- `wants-soft`
- `savings-soft`
- `investments-soft`
- `unallocated-soft`

### Current usage pattern

#### `foreground` / dark filled CTA
Used for the strongest primary action.

References:
- save button in `settings.tsx`
- create/save in `GoalsBoard.tsx`
- quick add button in `TopHeader.tsx`
- FAB in `AppShell.tsx`

#### `background + border + subtle hover`
Used for secondary actions.

References:
- icon buttons in `TopHeader.tsx`
- logout button in `settings.tsx`
- secondary utility controls throughout the app

#### Semantic accents
Used for:
- KPI accents
- summary dots
- category indicators
- positive/negative amount coloring
- action card icon backgrounds

References:
- `KpiCard.tsx`
- `TransactionList.tsx`
- `ReportsPanel.tsx`
- `GoalsBoard.tsx`

### Recommendation for rental statuses
Use the existing palette instead of inventing a new one:

- active / paid / success → `income`
- debt / overdue / destructive → `needs`
- warning / pending settlement / draft attention → `warning` or `wants`
- informational / saved config / structural context → `savings` or `investments`
- neutral / archived / inactive → `muted-foreground` + neutral background

### Do not do
- assign random hex colors per new rental status
- create vivid saturated UI that overpowers the rest of the app

---

## 6. Typography tokens

### Font family
Defined in `src/styles.css`:
- display font stack uses Inter / SF Pro Display / Geist / system sans

### General direction
- headings: bold, slightly tighter tracking
- body: readable, restrained
- helper text: muted and compact
- tabular numeric content uses `.num`

### `num` utility
Defined in `src/styles.css`.

Use for:
- currency values
- counters
- bill totals
- KPI values when appropriate
- percentages / rates where alignment matters

References:
- `KpiCard.tsx`
- `TransactionList.tsx`
- `ReportsPanel.tsx`
- `GoalsBoard.tsx`

### Recommended text hierarchy

#### Page title
- current pattern: `text-2xl font-bold tracking-tight`
- references: route files (`cash-flow.tsx`, `goals.tsx`, `reports.tsx`, `settings.tsx`)

#### Page subtitle
- current pattern: `mt-1 text-sm text-muted-foreground`
- keep short, 1 line if possible

#### Section title
- often `text-base font-bold tracking-tight`
- references: `settings.tsx`, `ReportsPanel.tsx`, `GoalsBoard.tsx`

#### Micro-label / overline
- often `text-[10px]` or `text-[11px]`
- often uppercase + tracking-wider + muted
- references: `KpiCard.tsx`, `settings.tsx`, `GoalsBoard.tsx`, `TransactionList.tsx`

#### Helper text
- usually `text-[11px]`, `text-[12px]`, or `text-sm` depending on emphasis
- always muted unless destructive or strongly contextual

#### Main KPI number
- in dashboard cards currently around `text-[26px]` or similar strong emphasis
- reference: `KpiCard.tsx`

### Recommendation for rental
- use the same page title and helper text scale as the rest of the app
- avoid introducing overly tiny finance-dashboard text in mobile rental cards

---

## 7. Spacing tokens

The codebase does not yet define a named spacing scale document, but the dominant spacing rhythm is clear.

### Page-level vertical rhythm
Common patterns:
- `space-y-5`
- `space-y-6`

References:
- `BudgetBuilder.tsx`
- `TransactionList.tsx`
- `ReportsPanel.tsx`
- `settings.tsx`

### Grid gaps
Common patterns:
- `gap-3`
- `gap-4`
- `gap-5`

Use:
- `gap-3` for compact summary grids and action clusters
- `gap-4` for major card grids and page sections
- `gap-5` for more premium, roomy dashboard composition

### Card padding
Common patterns:
- `p-4` for compact cards / mobile-friendly cards
- `p-5` for standard premium cards
- `p-6` for large or hero sections

References:
- `TransactionList.tsx`: mixed `p-3`, `p-4`, `p-5`
- `ReportsPanel.tsx`: `p-5`
- `settings.tsx`: `p-5`
- `BudgetBuilder.tsx`: `p-4` on mobile, `sm:p-6` on larger

### Recommended practical usage

#### Mobile card
- `p-4`

#### Standard content card
- `p-5`

#### Large hero / premium section
- `p-4 sm:p-6`

### Internal spacing
Common patterns:
- `mt-1`, `mt-1.5`, `mt-2`, `mt-3`, `mt-4`, `mt-5`
- use short increments for text hierarchy
- use larger increments for block separation

---

## 8. Width and layout tokens

### Page width
Dominant patterns:
- `max-w-6xl` for broad app pages
- `max-w-3xl` for settings / simple admin pages

References:
- `cash-flow.tsx`
- `goals.tsx`
- `reports.tsx`
- `settings.tsx`

### Main content padding
Defined in `AppShell.tsx`:
- `px-4 py-5`
- `sm:px-6`
- `lg:px-8 lg:py-6`

This is the app-wide shell spacing baseline.

### Recommendation
- new feature pages should fit inside the same shell spacing unless there is a strong reason not to
- rental should not define a completely different content padding system

---

## 9. Input tokens

### Height
Dominant patterns:
- text input / select: `h-10` or `h-11`
- mobile-safe primary fields lean toward `h-11`

References:
- `settings.tsx`
- `GoalsBoard.tsx`
- `TransactionList.tsx`
- `TopHeader.tsx`

### Shape
- `rounded-xl`

### Border / background
- `border border-border`
- `bg-background`
- disabled often uses `bg-background/40` or similar muted variant

### Focus state
- current dominant pattern: `focus:ring-2 focus:ring-ring/40`

### Recommendation for rental
- keep all editable fields within this token family
- do not create custom tiny inputs for tables on mobile
- if mobile data entry is needed, move it to a sheet with `h-11` inputs

---

## 10. Button tokens

### Primary button
Dominant pattern:
- dark or strong filled surface
- `rounded-xl`
- usually `h-10`
- medium/strong font weight

References:
- `settings.tsx`
- `GoalsBoard.tsx`
- `TopHeader.tsx`

### Secondary button
Dominant pattern:
- bordered
- background or card-toned
- `rounded-xl`
- `h-10`

References:
- `settings.tsx`
- `TopHeader.tsx`

### Icon button
Dominant pattern:
- `h-8 w-8` for row actions
- `h-10 w-10` for major toolbar actions
- `rounded-lg` or `rounded-xl` depending on emphasis

References:
- `TransactionList.tsx`
- `TopHeader.tsx`
- `GoalsBoard.tsx`

### FAB
Pattern:
- `h-14 w-14`
- fixed bottom-right
- only mobile
- strong contrast + `shadow-elevated`

Reference:
- `AppShell.tsx`

### Recommendation for rental
- desktop inline row actions may stay compact
- mobile must use at least standard tap-safe sizing (`h-10` / `h-11` feel)
- do not hide core actions as icon-only in mobile cards

---

## 11. Chip and pill tokens

### Filter chips
Dominant pattern:
- `rounded-full`
- compact horizontal padding
- clear active/inactive state
- small but bold text

Reference:
- `TransactionList.tsx`

### Delta / micro-status pills
Dominant pattern:
- `rounded-full`
- small size
- semantic tint background
- small icon optional

Reference:
- `KpiCard.tsx`

### Recommendation for rental
Use pills for:
- room status
- bill status
- deposit status
- mobile tab/status filters

Do not use pills for:
- large action buttons
- multi-line information blocks

---

## 12. Table tokens

Desktop tables are still part of the design language.

### Containment
- table should sit inside a rounded card container
- table should not feel like a naked spreadsheet dumped into the page

References:
- `TransactionList.tsx`
- `ReportsPanel.tsx`

### Header row
Dominant pattern:
- lighter background (`bg-background/40` or similar)
- small uppercase text
- muted color
- strong readability

### Row behavior
Dominant pattern:
- subtle hover background
- thin border separators
- actions hidden or de-emphasized until hover where appropriate on desktop

### Empty state inside table card
Dominant pattern:
- centered
- calm
- supportive

### Recommendation for rental
- desktop can continue using this table pattern
- mobile should not rely on it as the primary experience

---

## 13. Motion tokens

### Existing motion style
The codebase currently uses small tasteful motion with `framer-motion`.

References:
- `KpiCard.tsx`
- `GoalsBoard.tsx`
- `TransactionList.tsx`

### Dominant motion behaviors
- fade + slight slide on entry
- hover lift
- progress animation
- subtle scale on strong actions

### Recommendation
- use motion only where it improves clarity
- do not make rental screens flashy
- preserve calm, premium movement

---

## 14. Background / glass tokens

Defined in `src/styles.css`:
- `bg-hero`
- `glass`
- `ring-soft`

### `bg-hero`
Use for:
- shell/background enhancement
- large premium surfaces

References:
- `AppShell.tsx`
- `BudgetBuilder.tsx`

### `glass`
Available utility, but should be used carefully.

### `ring-soft`
Useful for soft inset border effect if needed.

### Recommendation for rental
- do not overuse gradients or glass effects
- rental should stay operational and clean, not more decorative than the main dashboard

---

## 15. Responsive behavior tokens

### Shell breakpoints visible in code
Current code heavily uses:
- `sm:`
- `md:`
- `lg:`
- `xl:`

### Common responsive patterns

#### Mobile-only
- FAB visible only under `lg`
- drawer menu visible only under `lg`
- month selector row shown only under `md`

References:
- `AppShell.tsx`
- `TopHeader.tsx`
- `AppSidebar.tsx`

#### Grid expansion
- `sm:grid-cols-2`
- `md:grid-cols-2`
- `xl:grid-cols-3`
- `xl:grid-cols-[1fr_360px]`

References:
- `BudgetBuilder.tsx`
- `GoalsBoard.tsx`
- `ReportsPanel.tsx`

### Recommendation for rental mobile refactor
Use responsive split at the presentation layer:
- desktop/table component
- mobile/card component

Do not try to “massage” the same table into working on all breakpoints.

---

## 16. Empty state tokens

### Dominant anatomy
- soft icon or emoji
- concise title
- supportive muted line
- centered layout
- generous vertical padding

Reference:
- `TransactionList.tsx`

### Recommended usage
For rental empty states:
- no room data
- no bill data for current month
- no deposits yet
- no camera feeds configured

Keep tone calm and helpful.

---

## 17. Rental-specific token guidance

Rental should inherit the app token system.

### Use these token defaults first

#### Page shell
- same shell spacing as app
- same constrained widths unless the tab truly needs more density

#### Card lists on mobile
- `rounded-2xl`
- `shadow-card`
- `p-4`
- `space-y-3` or `space-y-4`

#### Detail sheets / panels
- use same card language internally
- group sections with `rounded-2xl` blocks
- avoid dense multi-column layouts on mobile

#### Table desktop mode
- keep contained table card pattern
- use app-style header row and hover

#### Filters
- use chip pattern from `TransactionList.tsx`
- active state must be strong and unmistakable

#### KPI / summaries
- use `KpiCard` anatomy from dashboard
- avoid inventing a second summary-card style just for rental

---

## 18. Common do / do not rules

### Do
- use `rounded-xl`, `rounded-2xl`, `rounded-3xl` consistently
- use `shadow-card` as the default shadow
- use `text-muted-foreground` for helper copy
- use `.num` for important numeric UI
- use `focus:ring-2 focus:ring-ring/40` for fields
- use card-contained layouts for data-heavy sections
- reuse chip/filter/action-card patterns from existing screens

### Do not
- introduce random radii or random hex colors
- use small dense tap targets on mobile
- let rental become visually harsher than the rest of the app
- depend on horizontal table scrolling as the mobile strategy
- use many bespoke one-off status styles when semantic tokens already exist

---

## 19. Fast implementation defaults for Codex

When Codex needs a quick default and no stronger screen-specific requirement exists, use:

### Standard card
- `rounded-2xl border border-border bg-card p-4 shadow-card`

### Premium / major card
- `rounded-3xl border border-border bg-card p-5 shadow-card`

### Standard input
- `h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40`

### Secondary button
- `h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium`

### Primary button
- `h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background`

### Toolbar icon button
- `grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground`

### Filter chip inactive
- `rounded-full border border-border bg-card text-muted-foreground px-3 py-1.5 text-[12px] font-semibold`

### Filter chip active
- `rounded-full border border-transparent bg-foreground text-background px-3 py-1.5 text-[12px] font-semibold`

These should still be adjusted if the reference component clearly uses a stronger local pattern.

---

## 20. Recommended prompt addon for UI tasks

Use this in future UI prompts:

> Match the tokens and implementation conventions in `docs/ui-tokens.md` and the pattern guidance in `docs/ui-reference.md`. Prefer the existing MoneyFlowOS tokens for radius, shadows, spacing, chip styling, buttons, inputs, and responsive layout instead of inventing a new visual language.

---

## 21. Future improvements to this token file

This file can later be expanded with:
- explicit z-index conventions
- bottom-sheet header/footer tokens
- modal sizing rules by breakpoint
- a formal status-color matrix for rental and camera modules
- a spacing matrix with preferred `space-y-*` mappings by use case
- a button taxonomy table

But for now, this file should already be enough to guide consistent UI work grounded in the current codebase.
