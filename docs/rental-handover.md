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

### Bill
Current ownership:
- bill belongs to occupancy + billing cycle
- current room workflow should resolve bill through active occupancy

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

### O3
DB constraint migration:
- moving away from legacy `(room_id, cycle_id)` uniqueness
- direction is occupancy-aware bill ownership

==================================================
IMPORTANT BUSINESS RULES
==================================================

## Current room workflow

Room modal should only show:
- current active occupancy deposit
- current active occupancy bill

Old occupancy data must not leak into:
- current tenant
- current room bill
- current room deposit

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

==================================================
UI / UX DIRECTION
==================================================

Layout:
- LEFT = full read-only bill summary
- RIGHT = workflow panel

LEFT SIDE:
- Tiền thuê
- Tiền điện
- Tiền nước
- Wifi
- Vệ sinh
- Phụ phí khác
- Tổng
- Đã thu
- Còn thiếu

Rules:
- read-only only
- no inputs
- no inline "Sửa"

--------------------------------------------------

RIGHT SIDE = 3 sections

1. Nhập điện nước
- ONLY when bill = null / draft
- hidden for confirmed / partial_paid / paid / cancelled
- default read-only
- click "Sửa" → editable

2. Thu tiền
- Đã thu
- Còn thiếu
- Số tiền thu
- Phương thức
- Ghi nhận

3. Hành động khác
- Đánh dấu đã thu đủ
- Xuất PDF

Panel rule:
- left and right must have equal height

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

Current focus after occupancy migration:
- O3 regression testing
- occupancy-aware billing verification
- occupancy-aware deposit verification
- cleanup remaining legacy room-centric assumptions

==================================================
IMPORTANT MIGRATION NOTE
==================================================

Legacy rooms created before occupancy rollout may still contain:
- `tenant_id`
- `occupied = true`

without active occupancy rows.

Those datasets require occupancy backfill before current occupancy-aware billing workflow works correctly.

==================================================
HANDOVER
==================================================

Current architecture direction is now occupancy-aware.

When touching:
- billing
- deposits
- checkout
- current room workflow

prefer:
- active occupancy ownership

over:
- broad room-based assumptions.
