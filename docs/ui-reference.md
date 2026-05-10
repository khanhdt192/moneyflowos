# MoneyFlowOS UI Reference

This document captures the **current UI language and interaction patterns** already working well across the main MoneyFlowOS app.

It is intended to be a shared reference for:
- future ChatGPT / Codex UI work
- rental module mobile refactors
- keeping new screens aligned with the existing app instead of introducing a second design language

This is **not** a business-rules file.
This is a **UI / layout / interaction reference**.

---

## 1. Purpose

MoneyFlowOS already has a strong UI baseline in these areas:
- Dashboard
- Giao dịch
- Mục tiêu
- Báo cáo
- Cài đặt
- App shell / header / sidebar / mobile drawer

These screens should be treated as the **visual and interaction source of truth** when designing new UI.

Especially for rental mobile work:
- do **not** design rental UI in isolation
- do **not** fall back to raw responsive tables as the primary mobile solution
- instead, adapt rental screens to the same card / sheet / shell / sticky / filter patterns already used successfully in the main app

---

## 2. Quick reference map

Use this section first when implementing UI.

| Need | Best existing reference | Why |
|---|---|---|
| App shell, responsive navigation, mobile drawer | `src/components/layout/AppShell.tsx`, `AppSidebar.tsx`, `TopHeader.tsx` | Shared navigation, sticky header, mobile drawer, FAB |
| KPI row | `src/components/budget/BudgetBuilder.tsx`, `src/components/dashboard/KpiCard.tsx` | Premium summary cards with strong hierarchy |
| Search + chips filter bar | `src/components/transactions/TransactionList.tsx` | Compact and mobile-friendly filter pattern |
| Card grid / item cards | `src/components/goals/GoalsBoard.tsx` | Strong card-based entity presentation |
| Simple settings / admin page | `src/routes/settings.tsx` | Clean, calm management UI |
| Action cards above data | `src/components/reports/ReportsPanel.tsx` | Good “action first, data below” pattern |
| Desktop table inside premium shell | `TransactionList.tsx`, `ReportsPanel.tsx` | Desktop-only table direction that still feels on-brand |
| Empty states | `TransactionList.tsx` | Calm, centered, non-noisy empty state |
| Mobile primary action | `AppShell.tsx`, `TopHeader.tsx` | FAB / primary CTA split by breakpoint |

---

## 3. Core design principles

## 3.1 One app, one visual language

All modules should feel like one product.

Use the same:
- card radius
- spacing rhythm
- border treatment
- header density
- muted text hierarchy
- CTA emphasis
- chip / pill style
- empty state tone
- motion style

Avoid creating a separate design language for rental.

**Concrete references**
- Shared shell and navigation: `src/components/layout/AppShell.tsx`, `AppSidebar.tsx`, `TopHeader.tsx`
- Dashboard premium card language: `src/components/budget/BudgetBuilder.tsx`
- Goal cards: `src/components/goals/GoalsBoard.tsx`
- Settings cards: `src/routes/settings.tsx`

---

## 3.2 Desktop and mobile are different layouts, not one squeezed table

The main app works well on mobile because it does **not** try to preserve dense desktop table layouts everywhere.

Direction:
- Desktop can remain more data-dense
- Mobile should prefer:
  - cards
  - stacked sections
  - bottom sheets / drawers
  - clear touch targets
  - sticky lightweight controls

Important:
- do not treat `overflow-x-auto` on large tables as a complete mobile solution
- horizontal table scroll is acceptable only as a fallback, not the default mobile experience

**Concrete interpretation for rental**
- Desktop rental can keep tables for `Phòng`, `Chốt tháng`, `Tiền cọc`
- Mobile rental should render separate list/card layouts instead of just shrinking those tables

**Recommended implementation pattern**
- `XxxTab.tsx` = container
- `XxxDesktopTable.tsx` = existing desktop presentation
- `XxxMobileCards.tsx` = new mobile presentation

---

## 3.3 Visual hierarchy first

The current app consistently uses 3 layers:

1. **Page shell / major section**
2. **Card / panel**
3. **In-card content and controls**

New screens should keep this hierarchy obvious.

**Concrete references**
- Page shell + content rhythm: `src/routes/cash-flow.tsx`, `goals.tsx`, `reports.tsx`, `settings.tsx`
- Hero panel + side panel: `src/components/budget/BudgetBuilder.tsx`
- Card-only content page: `src/components/goals/GoalsBoard.tsx`

---

## 4. App shell patterns

## 4.1 Sidebar + mobile drawer

Current shell direction:
- desktop: persistent left sidebar
- mobile: slide-in drawer with overlay

Rules:
- desktop sidebar stays fixed/sticky and visually stable
- mobile drawer should feel like the mobile equivalent of the same navigation, not a different system
- overlay + close control are required

Do:
- keep mobile drawer width moderate
- close drawer on navigation
- preserve the same nav order and active state logic as desktop

Avoid:
- a second unrelated mobile nav taxonomy
- multiple competing mobile nav systems in the same app

**Concrete reference**
- `src/components/layout/AppSidebar.tsx`

**Patterns to copy**
- shared nav items between desktop and mobile
- overlay on mobile
- explicit close action
- active nav row with stronger visual emphasis

---

## 4.2 Top header

Current strong patterns:
- sticky header
- translucent / blurred background
- compact action cluster on the right
- month selector moves to a separate row on mobile

Rules:
- header should stay compact
- avoid tall hero headers inside every page
- mobile-specific controls can move into a second row if needed
- keep the first row focused on identity + top actions

Good reference behaviors:
- mobile menu button appears only on smaller screens
- larger search input is desktop-only
- quick-add becomes FAB on mobile

**Concrete reference**
- `src/components/layout/TopHeader.tsx`

**Patterns to copy**
- sticky compact header
- action density changes by breakpoint
- mobile-only second row when needed

---

## 4.3 Mobile FAB

The app already uses a floating action button for quick add on mobile.

Guideline:
- use FAB only for a truly primary, high-frequency action
- use one FAB maximum per screen context
- if used in rental, the action must be obvious and safe

Good use cases:
- Thêm phòng
- Giao dịch mới

Bad use cases:
- destructive actions
- ambiguous multi-action shortcuts

**Concrete reference**
- `src/components/layout/AppShell.tsx`

---

## 5. Page shell patterns

## 5.1 Standard page width

The app generally uses centered constrained widths:
- `max-w-6xl` for broader data pages
- `max-w-3xl` for settings / narrower forms

Guideline:
- keep page width intentional
- do not let content stretch edge-to-edge on desktop unless there is a strong reason

**Concrete references**
- broad page: `src/routes/cash-flow.tsx`, `goals.tsx`, `reports.tsx`
- narrow page: `src/routes/settings.tsx`

---

## 5.2 Page header pattern

The existing app consistently uses:
- page title
- one-line supportive description
- short and calm copy

Rules:
- title should be strong and concise
- subtitle should explain purpose, not repeat the title
- do not overload page headers with too many buttons if those actions already exist inside the page body

**Concrete references**
- `src/routes/cash-flow.tsx`
- `src/routes/goals.tsx`
- `src/routes/reports.tsx`
- `src/routes/settings.tsx`

---

## 6. Card system

## 6.1 Card style

Current app direction:
- rounded corners are generous
- borders are light but present
- shadows are soft and premium, not heavy
- cards are often the primary layout building block

Use:
- rounded-2xl / rounded-3xl feel
- subtle border + shadow
- internal padding that gives breathing room

Avoid:
- sharp rectangular utility blocks mixed into otherwise soft UI
- inconsistent radii between adjacent cards in the same page

**Concrete references**
- `src/routes/settings.tsx`
- `src/components/goals/GoalsBoard.tsx`
- `src/components/reports/ReportsPanel.tsx`
- `src/components/transactions/TransactionList.tsx`

---

## 6.2 Card content density

Cards in the good parts of the app follow a clear pattern:
- title / micro-label
- main value or action
- small secondary explanatory text

Keep cards scannable.

Avoid:
- dumping too many unrelated controls into one card
- combining summary + edit form + destructive actions in the same visual block when they should be separated

**Good examples**
- `ActionCard` in `ReportsPanel.tsx`
- `GoalCard` in `GoalsBoard.tsx`
- settings sections in `settings.tsx`

---

## 7. KPI cards

Dashboard KPI cards are a strong reference.

Patterns to preserve:
- compact top icon area
- strong numeric value
- short uppercase micro-label
- secondary explanatory line
- optional sparkline / delta without overwhelming the card

Rules:
- KPI cards should prioritize one main number only
- labels should stay short
- secondary text should clarify context, not compete with the main value

If rental uses KPI cards, they should follow the same anatomy.

**Concrete references**
- `src/components/budget/BudgetBuilder.tsx`
- `src/components/dashboard/KpiCard.tsx`

**Copy this for rental**
- top icon badge
- large main number
- muted support line
- no more than one secondary line

---

## 8. Filters and control bars

## 8.1 Search + chips pattern

`TransactionList` is a strong reference for filter UI:
- search field inside a rounded card
- filter chips underneath
- compact controls with clear active state

Rules:
- mobile filters should be chip-based where possible
- active chip must be visually obvious
- search and filters should sit together when they belong to the same query context

Avoid:
- placing related filters in widely separated areas
- using dropdowns for every filter when a few chips would scan faster

**Concrete reference**
- `src/components/transactions/TransactionList.tsx`

**Copy this for rental mobile**
- room status chips
- bill status chips
- deposit status chips
- mobile search/filter grouped in one block

---

## 8.2 Sticky controls on mobile

For mobile-heavy workflows, sticky mini control bars are preferred over repeating controls throughout the list.

Good candidates:
- tab chips
- status chips
- month selector
- section toggle

**Concrete reference direction**
- Sticky header behavior: `TopHeader.tsx`
- Month selector split by breakpoint: `TopHeader.tsx`

**Apply to rental**
- sticky rental tab bar
- sticky month/status filter row on mobile

---

## 9. Data presentation patterns

## 9.1 Desktop tables are acceptable

The main app still uses tables where appropriate:
- transaction list
- reports table

So tables are not forbidden.

But they work because:
- desktop has the space
- the table is contained inside a styled card
- surrounding filters / summaries / actions are clean

**Concrete references**
- `src/components/transactions/TransactionList.tsx`
- `src/components/reports/ReportsPanel.tsx`

---

## 9.2 Mobile should prefer card lists over raw tables

When the content is action-heavy or harder to scan on small screens, mobile should use card lists instead of preserving the desktop table.

This is especially relevant for rental screens.

Recommended mobile approach:
- desktop: keep table if already good
- mobile: render card list with the same data and actions in a more usable structure

**Direct guidance for rental**
- `Phòng` → room cards
- `Chốt tháng` → billing workflow cards
- `Tiền cọc` → deposit lifecycle cards

---

## 9.3 Contained table pattern

If a table remains on desktop, keep these rules:
- table sits inside a rounded bordered card
- header row is visually lighter than body emphasis
- row hover is subtle
- actions do not dominate each row
- empty state is centered and calm

**Concrete references**
- `TransactionList.tsx`
- `ReportsPanel.tsx`

---

## 10. Forms and field styling

## 10.1 Input style

Shared good patterns across the app:
- rounded-xl inputs
- medium height
- clear border
- visible focus ring
- calm placeholder text

Rules:
- keep field spacing generous enough for touch
- labels are small, uppercase or muted, but still readable
- forms should not feel cramped on mobile

**Concrete references**
- `src/routes/settings.tsx`
- `src/components/goals/GoalsBoard.tsx`
- `src/components/transactions/TransactionList.tsx`

---

## 10.2 Form grouping

Good forms in the app group fields by intent.

Patterns:
- small label above field
- related fields visually clustered
- primary action at the end of the form block

Avoid:
- long uninterrupted sequences of fields without grouping
- placing destructive actions next to primary save actions unless clearly separated

**Concrete references**
- edit and create states in `GoalsBoard.tsx`
- account/data settings in `settings.tsx`

---

## 11. Buttons and action hierarchy

## 11.1 Primary actions

Current app pattern:
- filled dark button
- strong contrast
- medium-large touch target
- often slightly elevated / animated

Use for:
- create
- save
- primary next step

**Concrete references**
- save button in `settings.tsx`
- create/save actions in `GoalsBoard.tsx`
- quick add button in `TopHeader.tsx`

## 11.2 Secondary actions

Current app pattern:
- bordered or softer background button
- visually lighter than primary

Use for:
- filter actions
- helper actions
- non-destructive utilities

**Concrete references**
- logout button in `settings.tsx`
- action cards are secondary utilities in `ReportsPanel.tsx`

## 11.3 Icon-only actions

Use sparingly.

Rules:
- should have clear hover/tap affordance
- should not be the only discoverable path for a core workflow
- destructive icon-only actions need extra clarity

**Concrete references**
- row delete action in `TransactionList.tsx`
- edit/close icons in `GoalsBoard.tsx`

---

## 12. Motion and interaction feel

The app already uses motion tastefully in places like goals and transactions.

Direction:
- transitions should feel premium and light
- motion supports clarity, not spectacle

Good motion:
- fade/slide in cards
- progress bar animation
- soft hover lift
- slight scale feedback on primary CTAs

Avoid:
- dramatic bouncy motion in serious finance workflows
- inconsistent animation speeds between pages

**Concrete references**
- `GoalsBoard.tsx`
- `TransactionList.tsx`

---

## 13. Copy style

The current app UI copy generally works best when it is:
- concise
- supportive
- not robotic
- not over-explanatory

Rules:
- labels should be short
- helper text should be one line where possible
- empty states should sound calm and encouraging
- destructive text should be direct and unambiguous

**Concrete references**
- page subtitles in route files
- helper text in `settings.tsx`
- empty state in `TransactionList.tsx`

---

## 14. Empty states

Current strong pattern:
- centered content
- simple icon / emoji / soft visual
- short title
- one short explanation

Rules:
- avoid overdesigned empty states
- use them to guide next action
- keep emotional tone light and optimistic

**Concrete reference**
- `TransactionList.tsx`

**Use this style in rental**
- no rooms yet
- no bills for month
- no deposits yet
- no camera sources yet

---

## 15. Settings page pattern

The settings screen is a strong reference for simple mobile-friendly management UI.

Patterns to reuse:
- narrow page width
- separate cards for account / data management / about
- card-internal action alignment is clear
- destructive actions get their own tone and spacing

Rules:
- settings-like screens should feel calm and dependable
- do not mix too many high-risk actions into one visual area

**Concrete reference**
- `src/routes/settings.tsx`

---

## 16. Reports page pattern

The reports page is a strong example of:
- action cards at top
- large contained data table below
- clear page title and description

Rules:
- action cards should be visually tappable and self-explanatory
- export/print utilities should sit above or beside the data they affect

**Concrete reference**
- `src/components/reports/ReportsPanel.tsx`

**Apply to rental**
- invoice exports
- camera quick actions
- rental utilities should look like action cards, not raw admin buttons

---

## 17. Goals page pattern

The goals page is a strong example of:
- card grid as primary content model
- add-new card integrated into the grid
- edit mode becoming an in-place card state rather than a totally separate page
- strong use of color, progress, and compact summaries

Rules:
- card-based domains should preserve visual rhythm and balance
- add-new states should feel like part of the same system
- progress should be visually strong but not noisy

**Concrete reference**
- `src/components/goals/GoalsBoard.tsx`

**Apply to rental where useful**
- room card lists
- deposit lifecycle cards
- utility settings blocks

---

## 18. Dashboard pattern

The dashboard (`BudgetBuilder`) is the best reference for the app's premium visual direction.

Key patterns:
- KPI strip first
- hero visualization in a premium card
- secondary tools in side panel
- insights below
- constrained page width with breathing room

Rules:
- use dashboard density only where the screen truly benefits from it
- not every page needs a hero block
- premium does not mean crowded

**Concrete reference**
- `src/components/budget/BudgetBuilder.tsx`

**Apply to rental**
- `Tổng quan` can borrow KPI strip and section rhythm
- do not copy the dashboard hero block blindly into rental tabs that need operational clarity instead

---

## 19. Mobile-specific UI rules

## 19.1 Mobile should be workflow-first

On mobile, prioritize:
- one-column layouts
- touch-safe targets
- scannable cards
- sticky lightweight controls
- bottom drawers / sheets when the workflow is focused

**Concrete reference direction**
- shell and header already adapt cleanly to mobile: `AppShell.tsx`, `TopHeader.tsx`, `AppSidebar.tsx`

## 19.2 Avoid desktop table thinking on mobile

Do not assume that making the text smaller or wrapping the table in `overflow-x-auto` is enough.

For mobile-heavy workflows, prefer:
- stacked cards
- summary rows
- primary action buttons visible in card footer or sheet footer

## 19.3 Mobile modal direction

Prefer:
- bottom sheets
- full-height sheets for detail flows
- sticky sheet header and sticky action footer when needed

Avoid:
- tiny floating desktop dialogs squeezed onto mobile

---

## 20. How this applies to Rental module

Rental should borrow the **same UI language**, not invent a new one.

### 20.1 What rental should reuse directly

Reuse from the core app:
- shell/header/drawer behavior
- rounded card system
- KPI card anatomy
- filter chip patterns
- primary vs secondary action hierarchy
- empty state style
- mobile FAB logic where appropriate
- page width discipline

### 20.2 What rental should adapt for mobile

Rental has more operational workflows and more desktop tables.

Therefore:
- desktop rental may keep tables where already good
- mobile rental should render separate card-based layouts for:
  - Phòng
  - Chốt tháng
  - Tiền cọc

### 20.3 Rental mobile refactor rule

Use this pattern:
- container keeps logic and state
- desktop component keeps current table UI
- mobile component renders cards/sheets

Do not deeply rewrite working desktop UI just to support mobile.

### 20.4 Pattern mapping for rental

| Rental screen | Reuse pattern from core app | Recommended mobile form |
|---|---|---|
| Tổng quan | `BudgetBuilder`, KPI cards, top-level section rhythm | KPI + action cards + short issue lists |
| Phòng | `GoalsBoard` card entities + settings-style calm detail blocks | room cards + detail sheet |
| Chốt tháng | `TransactionList` filters + card workflow | billing cards + input sheet |
| Tiền cọc | `GoalsBoard` / lifecycle card thinking | deposit cards grouped by status |
| Mẫu hoá đơn | `ReportsPanel` action card + settings-like form blocks | stacked form cards + preview section |
| Chi phí khác | `settings.tsx` management blocks | grouped settings cards |

---

## 21. Anti-patterns

Do not introduce these:

- a second unrelated visual language inside rental
- harsh square utility UI mixed into the current soft card system
- raw mobile tables as the primary experience
- overuse of horizontal scrolling as the mobile strategy
- mixing summary + edit + destructive actions in one cramped block
- overly dense modal content on mobile
- duplicate primary actions in multiple places on the same screen
- giant hero sections on every page
- inconsistent CTA colors and radii between modules

---

## 22. Practical checklist for future UI work

Before changing or adding a screen, check:

1. Does it visually belong to the same app shell?
2. Does it use the same card, radius, border, and shadow language?
3. Is the page header concise and consistent?
4. Are primary and secondary actions clearly separated?
5. On mobile, is the layout workflow-first instead of table-first?
6. If a desktop table exists, is mobile getting its own adapted layout?
7. Are filters/search/chips grouped clearly?
8. Are empty states calm and useful?
9. Does the interaction feel light and premium, not noisy?
10. If this is rental, does it reuse the main app UI language rather than inventing a rental-only style?
11. Is there already a better reference component in this file that should be copied before inventing a new pattern?

---

## 23. Guidance for Codex / AI tasks

When generating UI changes, prefer prompts that explicitly say:

- match existing MoneyFlowOS shell and card language
- preserve desktop where already good
- add mobile-specific layouts as separate presentation components
- use card-based mobile patterns instead of raw responsive tables
- keep business logic unchanged unless explicitly requested
- avoid broad refactors unrelated to the requested screen
- cite which existing components should be used as visual references

### Recommended prompt addon

When asking Codex to build UI, include a line like:

> Match the UI language documented in `docs/ui-reference.md`. Use concrete references from `TopHeader.tsx`, `AppSidebar.tsx`, `TransactionList.tsx`, `GoalsBoard.tsx`, `ReportsPanel.tsx`, `settings.tsx`, and `BudgetBuilder.tsx` instead of inventing a new design language.

---

## 24. Recommended next use of this file

Use this file as a companion reference whenever working on:
- rental mobile refactor
- new dashboard-adjacent screens
- navigation polish
- settings or report-like pages
- card/list/detail layouts

If the core app visual language evolves later, this file should be updated so future work stays consistent.

---

## 25. Future expansion ideas for this document

This file can be extended later with:
- a shared spacing scale
- a preferred radius scale
- a shared button taxonomy
- bottom-sheet behavior rules
- mobile-only do/don't screenshots
- a component-by-component "copy this / do not copy this" matrix
