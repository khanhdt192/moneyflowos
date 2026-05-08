# MoneyFlowOS Rental Handover Note

Project: MoneyFlowOS (rental module)

==================================================
CURRENT ARCHITECTURE DIRECTION
==================================================

Canonical domain ownership direction:

```text
Room
→ physical room / current room state

Occupancy
→ one tenant stay in one room during a period

Deposit
→ owned by occupancy

Bill
→ owned by occupancy + billing cycle

Reading
→ owned by occupancy + billing cycle for current workflow
```

Current room workflow should resolve through:
- active occupancy
- not broad room-only assumptions

---

## Current practical meaning

### Room
Represents:
- current room state
- current assigned tenant
- room master data

`rental_rooms.tenant_id` and `occupied` still exist for backward UI compatibility.

### Occupancy
Represents:
- one tenant staying in one room during a specific period

Current statuses:
- `active`
- `ended`

### Deposit
Current ownership:
- deposit belongs to occupancy
- room modal should only show active occupancy deposit
- deposit detail modal belongs to tab `Tiền cọc`

### Bill
Current ownership:
- bill belongs to occupancy + billing cycle
- current room workflow should resolve bill through active occupancy

### Reading
Current ownership:
- reading belongs to occupancy + billing cycle for current workflow
- Chốt tháng should hydrate only the active occupancy reading

==================================================
CURRENT IMPLEMENTATION STATUS
==================================================

Completed:

### O1
DB foundation:
- `rental_occupancies`
- `occupancy_id` added to:
  - deposits
  - bills
  - deposit transactions
  - readings

### O2A
Occupancy app-layer lifecycle:
- create occupancy on assign tenant
- end occupancy on checkout
- deposit linked to occupancy

### O2B
Deposit occupancy-awareness:
- current room deposit lookup uses active occupancy
- checkout moves current occupancy deposit to `pending_settlement`
- old deposits no longer leak into current room workflow

### O2C
Billing occupancy-awareness:
- new bills linked to occupancy
- room modal bill lookup uses active occupancy
- Chốt tháng prefers active occupancy bill
- current bill ownership no longer assumes only `room + cycle`

### O2D / Reading fix
Reading occupancy-awareness:
- new readings linked to occupancy
- Chốt tháng hydrates readings by active occupancy
- old readings no longer leak into new tenant workflow in the same room + cycle

### O3
DB/data cleanup direction:
- moved away from legacy `(room_id, cycle_id)` assumption for current bill ownership
- legacy data may still need audit / cleanup / backfill depending on environment
- regression checklist is now documented in `docs/rental-regression-checklist.md`

### O4 / Deposit detail modal polish
UI polish completed for deposit detail modal:
- deposit detail modal now follows the shared rental modal language more closely
- sticky header + explicit close button
- desktop 2-column layout
- left side now owns the full read-only snapshot:
  - deposit summary
  - status/date information
  - notes
  - transaction history
- right side is now reserved as the future deposit action/workflow panel
- business logic remains unchanged

==================================================
IMPORTANT BUSINESS RULES
==================================================

## Current room workflow

Room modal should only show:
- current active occupancy deposit
- current active occupancy bill

Chốt tháng should only hydrate:
- current active occupancy reading
- current active occupancy bill

Old occupancy data must not leak into:
- current tenant
- current room bill
- current room deposit
- current reading form

---

## Checkout

Checkout flow must:
1. move deposit to `pending_settlement`
2. end occupancy
3. clear room tenant

Deposit settlement is handled later in tab `Tiền cọc`.

---

## Billing

Current billing ownership:

```text
occupancy + cycle
```

not:

```text
room + cycle
```

for current room workflow.

---

## Reading

Current reading ownership for current workflow:

```text
occupancy + cycle
```

not:

```text
room + cycle
```

for Chốt tháng hydration.

==================================================
UI / UX DIRECTION
==================================================

Layout direction already established for detail modals:
- LEFT = read-only summary / information
- RIGHT = workflow / actions

Current known UI direction:
- Room detail modal should feel consistent with Bill detail modal
- Deposit detail modal now uses the same modal language direction
- avoid ad-hoc layout differences across detail modals in the rental module

Current visual reference:
- deposit detail modal is now a valid reference for spacing, hierarchy, and section grouping
- its current structure is:
  - LEFT = full read-only snapshot + notes + history
  - RIGHT = reserved action/workflow shell for the next deposit phase
- Room/Bill detail modals should be polished toward the same visual standard

Current next UI/UX priority:
- review and improve **Room detail modal** and **Bill detail modal**
- align both modals with the newer deposit detail modal standard
- improve consistency of spacing, border/shadow rhythm, hierarchy, and action grouping across all rental detail modals

==================================================
VALIDATION RULE
==================================================

Digits-only fields:
- điện
- nước
- SĐT

Money fields:
- giá thuê
- tiền cọc
- số tiền thu
- use formatMoneyInput / parseMoneyInput

IME rule:
- must work with Vietnamese keyboard

==================================================
WORKFLOW RULE
==================================================

ChatGPT:
- design logic
- write Codex prompts
- review PRs
- review DB migrations
- keep docs synchronized with architecture direction

User:
- run Codex
- run SQL
- verify UI
- verify business workflow

Codex:
- implement exactly per prompt
- no guessing

Supabase:
- only modified via explicit SQL
- new tables require explicit RLS review/policies

==================================================
CURRENT PRIORITIES
==================================================

Occupancy migration core is now considered functionally complete for current workflow.

Current focus after occupancy migration:
- continue O3 regression testing when needed
- use `docs/rental-regression-checklist.md` for post-PR validation
- optionally audit / clean legacy data in older environments
- continue polishing the shared rental modal system
- improve **Room detail modal** and **Bill detail modal** so they match the newer deposit detail modal standard

==================================================
IMPORTANT MIGRATION NOTE
==================================================

Legacy data created before occupancy rollout may still contain:
- `tenant_id` / `occupied` without active occupancy rows
- deposits with `occupancy_id = null`
- bills with `occupancy_id = null`
- readings with `occupancy_id = null`
- deposit transactions with `occupancy_id = null`

Those datasets may require:
- occupancy backfill
- deposit backfill
- bill/reading cleanup
- transaction cleanup

depending on the environment.

==================================================
NEXT RECOMMENDED TASK
==================================================

Recommended next task:
- polish `Phòng` detail modal UI/UX
- polish `Chốt tháng` / bill detail modal UI/UX
- align Room/Bill detail modals with the newer deposit detail modal language
- keep business logic stable while improving the shared modal system

==================================================
HANDOVER
==================================================

Current architecture direction is occupancy-aware and the core flow has been tested through:

1. add room + tenant + deposit
2. save readings
3. create bill
4. mark paid
5. checkout
6. assign new tenant in same room + same cycle
7. save readings again

This flow is now passing in the current environment.

Deposit detail modal polish and layout cleanup have been merged, so the current UI consistency task is no longer `Tiền cọc` first.

When touching:
- billing
- deposits
- readings
- checkout
- current room workflow

prefer:
- active occupancy ownership

over:
- broad room-based assumptions.
