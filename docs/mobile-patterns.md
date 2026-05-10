# MoneyFlowOS Mobile Patterns

This document defines the **shared mobile UI patterns** that should be reused across MoneyFlowOS.

Use this together with:
- `docs/ui-reference.md` for visual language and screen composition
- `docs/ui-tokens.md` for radius / spacing / button / input / color conventions

Purpose:
- give ChatGPT / Codex a concrete playbook for mobile UI work
- prevent desktop table thinking from leaking into mobile screens
- standardize how list, detail, action, and data-entry flows behave on small screens

This file is especially important for:
- rental mobile refactors
- any future operational tabs
- any new screen that has dense data on desktop but must still feel good on phone

---

## 1. Core mobile philosophy

MoneyFlowOS mobile should be:
- workflow-first
- touch-safe
- scan-friendly
- visually consistent with the desktop app shell
- lighter in density than desktop

Mobile is **not** a shrunk desktop screen.

When a desktop screen is table-heavy, the default mobile direction should be:
- summary cards
- grouped sections
- compact sticky controls
- bottom sheet or full-screen sheet for focused tasks

Not:
- smaller text
- more horizontal scroll
- compressed columns
- stacked hacks inside a desktop table row

---

## 2. Quick pattern map

| Situation | Use this mobile pattern | Notes |
|---|---|---|
| App-wide navigation | mobile drawer + sticky top header | reuse shell behavior |
| Page with many tabs | sticky horizontal pill tab bar | active tab centered if possible |
| Entity list | card list | one entity per card |
| Entity list with statuses | grouped card sections or chip-filtered cards | status must be obvious |
| Dense desktop table | dedicated mobile cards | do not default to horizontal table scroll |
| Focused details | bottom sheet or full-screen sheet | depends on complexity |
| Data entry for one item | sheet form | avoid inline table editing on mobile |
| Multiple quick filters | search + chips | same direction as TransactionList |
| Main single action | FAB or sticky footer CTA | depends on context |
| Destructive / risky actions | separated section or secondary step | never hide risk in tiny controls |

---

## 3. Navigation patterns

## 3.1 App shell on mobile

Use the existing app shell model:
- top sticky header
- menu button in header
- left mobile drawer with overlay
- quick primary action becomes FAB when appropriate

References:
- `src/components/layout/AppShell.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/TopHeader.tsx`

Rules:
- do not create a separate mobile navigation system for one module
- mobile drawer should preserve the same nav order as desktop sidebar
- keep the header compact

---

## 3.2 Module-level tab navigation on mobile

When a module has many tabs, mobile should use a **sticky horizontal pill tab bar**.

### Recommended behavior
- horizontal scroll allowed
- active tab visually strong
- edge fade or clipped hint is acceptable if tabs overflow
- bar stays sticky below the main header if needed
- active tab should auto-scroll into view if implementation is easy

### Good use cases
- rental tabs
- internal sub-sections within a large operations page

### Avoid
- squeezing many labels into a single row with tiny text
- forcing full-width equal tabs when labels are long
- using desktop tabs unchanged on mobile

### Recommended mobile rental direction
- `Tổng quan`
- `Phòng`
- `Chốt tháng`
- `Tiền cọc`
- `Mẫu HĐ`
- `Chi phí khác`

should become pill-style horizontal tabs on mobile, not a cramped desktop tab row.

---

## 4. Page composition patterns

## 4.1 Mobile page rhythm

Preferred structure:

1. page title / small intro
2. sticky local controls if needed
3. main card/list content
4. FAB or footer action if needed

Keep one-column layout as the default.

### Good structure
- title
- short description
- filters/chips
- list of cards

### Avoid
- title + subtitle + banner + tabs + filters + summary + table all above the fold
- deep nested cards inside cards inside cards without clear hierarchy

---

## 4.2 Section composition

On mobile, sections should usually be one of these:

### Pattern A — stacked cards
Used for:
- dashboard summary
- settings groups
- room list
- deposit list

### Pattern B — summary card + list below
Used for:
- monthly billing overviews
- reports-like screens
- debt status screens

### Pattern C — action cards first, data later
Used for:
- exports
- utility pages
- admin sub-pages

Reference direction:
- `ReportsPanel.tsx`
- `settings.tsx`

---

## 5. List patterns

## 5.1 Card list

Default mobile pattern for entity-heavy screens.

Each card should contain:
- primary identifier
- status
- 1–3 key facts
- primary action(s)
- optional secondary action

### Card list works best for
- rooms
- deposits
- bills
- cameras
- reports summaries

### Card anatomy
- title row
- metadata row(s)
- optional status pill
- action row

### Avoid
- placing 8+ fields visibly in every card
- repeating too much low-value metadata
- using cards that are visually dense like desktop rows

---

## 5.2 Grouped card list

Use when status/lifecycle matters more than raw sorting.

Example groups:
- active / empty rooms
- pending settlement / active deposit / settled deposit
- unpaid / partial / paid bills
- online / offline cameras

### Grouped lists are better than a giant flat list when
- status drives action priority
- users need quick operational scanning

### Avoid
- too many groups on one mobile screen
- groups with only one item if grouping adds no value

---

## 5.3 Summary-first cards

Used when each item has one key metric and one next action.

Examples:
- room occupancy
- monthly bill total
- deposit amount and lifecycle status

Pattern:
- title
- strong numeric or status signal
- muted supporting line
- action footer

---

## 6. Detail patterns

## 6.1 Bottom sheet

Use a bottom sheet when:
- the user is drilling into a single item
- the content is focused
- the next action is immediate
- the screen should still feel connected to the list below

Good examples in future rental usage:
- room quick detail
- deposit quick detail
- bill action menu
- payment input

### Bottom sheet is best when
- there are a few sections
- one or two main actions exist
- user may want to dismiss quickly and return to the list

---

## 6.2 Full-screen sheet

Use a full-screen sheet when:
- the detail content is long
- there are multiple form fields
- the workflow has more than one meaningful step
- user needs more focus than a partial sheet provides

Good examples:
- room detail with multiple actions
- chốt tháng entry form
- invoice config on mobile
- full deposit settlement flow

### Full-screen sheet pattern
- sticky header
- scrollable content
- sticky footer CTA when needed

Avoid tiny centered desktop-style dialogs on mobile.

---

## 6.3 Expand-in-place blocks

Use sparingly.

Good for:
- showing extra metadata
- lightweight reveal of notes / history

Bad for:
- major edit flows
- long forms
- operational actions with validation

If a flow is important, use a sheet instead.

---

## 7. Data entry patterns

## 7.1 Sheet form

Default mobile pattern for single-item editing or entry.

Use when user needs to:
- input reading values
- edit room fields
- confirm deposit settlement values
- adjust a config item

Pattern:
- header with title and close
- form fields stacked vertically
- labels above inputs
- one clear primary CTA
- optional secondary/destructive action separated visually

---

## 7.2 Inline editing on mobile

Allowed only when:
- there are very few fields
- fields are easy to tap
- row height remains comfortable
- the user does not need to compare many columns while editing

In practice, MoneyFlowOS should be conservative here.

### Recommendation
- desktop can keep inline editing where already good
- mobile should usually move editing into a sheet

This is especially true for rental operational tables.

---

## 7.3 Sticky action footer

Use when the form is long enough that the primary action may scroll off-screen.

Good for:
- room edit sheet
- billing entry sheet
- deposit settlement sheet

Do not overuse sticky footers when content is short.

---

## 8. Filter and control patterns

## 8.1 Search + chips

This is the strongest existing mobile filter direction in the app.

Reference:
- `src/components/transactions/TransactionList.tsx`

Use for:
- room status filter
- bill status filter
- deposit status filter
- camera area filter

Pattern:
- search first if needed
- chips below
- active chip very obvious
- keep chip labels short

---

## 8.2 Sticky control row

Use when filters or context controls must remain visible while scrolling.

Examples:
- rental tab bar
- month selector + status filters
- room status chips

Rules:
- keep it short
- do not stack too many sticky rows
- avoid consuming too much vertical space

---

## 8.3 Month/context selector on mobile

If desktop has more spacious controls, mobile may move them into:
- a second header row
- a dedicated sticky filter row
- a small sheet selector

Reference direction:
- `TopHeader.tsx` already moves the month selector into a mobile-only row

---

## 9. Action patterns

## 9.1 FAB

Use only for a truly primary high-frequency action.

Good examples:
- add room
- new transaction

Bad examples:
- delete room
- settle deposit
- open ambiguous action menu

If the screen has no obvious single dominant action, skip the FAB.

---

## 9.2 Card footer actions

Preferred for mobile cards.

Typical layout:
- one primary button
- one secondary button
- or one primary button + small utility action

Good examples:
- `Chi tiết` + `Thu tiền`
- `Nhập số` + `Chi tiết`
- `Quyết toán` + `Xem cọc`

Avoid showing too many same-priority buttons in one row.

---

## 9.3 Overflow / more actions menu

Use only for non-primary actions.

Good for:
- rename
- archive
- copy
- less common utilities

Not for:
- the main workflow step
- a required next action users perform every day

---

## 10. Table-to-mobile conversion rules

This is one of the most important sections.

When converting a desktop table to mobile, choose one of these mappings.

## 10.1 Desktop table → entity cards

Use when rows represent stable objects.

Examples:
- rooms
- deposits
- camera sources

Desktop:
- multi-column table

Mobile:
- one card per entity
- title, status, key info, actions

---

## 10.2 Desktop table → workflow cards

Use when rows represent operational tasks.

Examples:
- billing month entry
- unpaid invoices
- maintenance tasks

Desktop:
- inline editable / status-rich table

Mobile:
- one task card per item
- summary of current state
- action button opens sheet for focused entry

This is the best pattern for `Chốt tháng`.

---

## 10.3 Desktop table → grouped lifecycle cards

Use when statuses form a lifecycle.

Examples:
- deposits
- approval queues
- service requests

Desktop:
- sortable lifecycle table

Mobile:
- grouped card sections by status
- each card shows amount/date/status/next action

This is the best pattern for `Tiền cọc`.

---

## 10.4 Desktop table remains desktop-only

Sometimes the best mobile decision is not to show the whole table structure at all.

Instead:
- show summary cards and drill-down
- keep full raw table on desktop only

This is acceptable if the mobile pattern still covers the main user workflow.

---

## 11. Rental mapping

## 11.1 Rental top tabs

Mobile pattern:
- sticky horizontal pill tab bar
- compact but obvious active state
- scrollable horizontally

Do not reuse the desktop tab row unchanged.

---

## 11.2 Tab Phòng

Desktop direction:
- table or denser list remains acceptable

Mobile direction:
- room cards
- top-level filters: all / active / empty / debt if useful
- tap card or button to open room detail sheet

Room card should usually show:
- room name
- occupancy status
- tenant summary if occupied
- rent / debt / current bill snippet if relevant
- one or two actions max

Best future pattern:
- card list + full-screen room detail sheet

---

## 11.3 Tab Chốt tháng

Desktop direction:
- table + inline editing can remain if already working well

Mobile direction:
- billing workflow cards
- each card shows:
  - room
  - tenant
  - reading summary
  - bill summary/status
  - action to enter/edit reading
- tapping the action opens a focused sheet for data entry

Do not preserve the full inline-edit table on mobile.

This is the most important mobile conversion in rental.

---

## 11.4 Tab Tiền cọc

Desktop direction:
- table can remain

Mobile direction:
- grouped lifecycle cards by status:
  - active / holding
  - pending settlement
  - settled
- card opens deposit detail sheet
- settlement action should be clear and isolated

Do not show deposit data as a compressed desktop row on mobile.

---

## 11.5 Tab Mẫu hoá đơn

Mobile direction:
- stacked form cards
- preview below or in collapsible section
- QR / preview area should not push the main form too far down unnecessarily

Pattern:
- settings/admin mobile pattern
- similar spirit to `settings.tsx` + `ReportsPanel.tsx`

---

## 11.6 Tab Chi phí khác

Mobile direction:
- grouped settings cards
- one logical settings cluster per card
- avoid long uninterrupted form walls

This should follow the settings page pattern more than the table pattern.

---

## 12. Camera module mapping

If MoneyFlowOS later adds a camera tab for common areas, mobile should follow:
- camera cards by area
- online/offline status pill
- preview or snapshot area
- tap to open full-screen viewer sheet if needed

Desktop table is not the right starting point for camera.

Best pattern:
- grouped cards by area or purpose

---

## 13. Mobile anti-patterns

Do not do these on mobile:
- preserve raw multi-column tables as the main experience
- force users to horizontally scroll as the normal workflow
- hide key actions behind tiny icon-only buttons
- place too many equal-priority actions on one card
- use desktop modals unchanged on phone
- show long forms without grouping or spacing
- stack too many sticky bars and consume the whole screen top
- mix summary, editing, and destructive actions in one cramped block

---

## 14. Mobile implementation checklist

Before merging a mobile UI change, check:

1. Is the mobile screen using cards/sheets instead of a squeezed table?
2. Are tap targets comfortable?
3. Is the primary action obvious?
4. Is the status visible without opening details?
5. Is the list easy to scan with one hand?
6. Are filters simple and sticky only when useful?
7. Does the sheet/detail flow feel focused and not overloaded?
8. Is desktop unchanged if the task was intended to be mobile-only?
9. Does the screen still match the shell/card language from the rest of the app?
10. Is the mobile pattern chosen intentionally from this file, rather than improvised?

---

## 15. Recommended prompt addon for Codex

Use this in future mobile-focused UI prompts:

> Follow `docs/mobile-patterns.md` for mobile layout and interaction choices. Prefer dedicated mobile card/sheet patterns over shrinking desktop tables. Keep desktop UI intact unless the task explicitly asks to refactor desktop too.

And when the task is rental-specific:

> For rental mobile, use: sticky pill tab bar for module tabs, room cards for `Phòng`, workflow cards + entry sheet for `Chốt tháng`, and grouped lifecycle cards + detail sheet for `Tiền cọc`.

---

## 16. Relationship to other docs

### `docs/ui-reference.md`
Use for:
- visual language
- reference components
- app-level design direction

### `docs/ui-tokens.md`
Use for:
- radius
- spacing
- button/input styles
- color/shadow conventions

### `docs/mobile-patterns.md`
Use for:
- deciding which mobile layout pattern to use
- converting desktop-heavy screens into mobile-safe workflows
- avoiding improvisation during mobile refactors

---

## 17. Next practical use

This file should be referenced directly before starting:
- rental mobile phase A: top tab bar
- rental mobile phase B: tab Phòng
- rental mobile phase C: tab Tiền cọc
- rental mobile phase D: tab Chốt tháng

If future mobile work starts drifting, update this file first before continuing implementation.
