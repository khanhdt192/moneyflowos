# MoneyFlowOS AI Rules

This file defines the mandatory working rules for AI tools on MoneyFlowOS.

If code assumptions conflict with these rules, follow these rules.

---

## 1. Core rules

- Supabase schema is the source of truth.
- Never guess schema.
- Never invent columns.
- Do not change schema unless explicitly requested.
- Do not change business logic unless explicitly requested.
- Keep changes minimal and scoped.

---

## 2. Required files to read first

Before any rental task, always read:
- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`

---

## 3. Rental domain rules

### 3.1 Tenant model
- `rental_rooms` does NOT store tenant name text.
- Use `tenant_id`.
- Tenant display name comes from `rental_tenants.full_name`.

Forbidden:
- using `rental_rooms.tenant`
- storing tenant name directly in `rental_rooms`

### 3.2 Billing cycle model
- Billing uses UUID `cycle_id`.
- UI may show month/year, but backend logic must resolve to `rental_billing_cycles.id`.

Forbidden:
- using `YYYY-MM` as the final DB key
- bypassing `rental_billing_cycles`

### 3.3 Occupancy
- Canonical occupancy = tenant assigned.
- Prefer `tenant_id` over raw `occupied` if they conflict.
- Service layer must keep `occupied` synchronized.

### 3.4 Tenant mobility guards
- Do NOT allow changing/removing tenant when the current room has an unpaid bill.
- Do NOT allow assigning a tenant who has unpaid bills elsewhere.
- Active deposit also blocks tenant change/remove in tab `Phòng`.

### 3.5 Deposit domain
- Deposit belongs to `public.rental_deposits`.
- Deposit is separate from monthly bills and payments.
- Do NOT net deposit into bill totals.
- Enforce one active deposit per room.

### 3.6 Chốt tháng edit lock
Billing inputs are editable only when:
- room is occupied
- effective bill status is `null` or `draft`

Billing inputs must be locked when status is:
- `confirmed`
- `partial_paid`
- `paid`
- `cancelled`

---

## 4. Validation rules AI must respect

### 4.1 Digits-only fields
Apply digits-only input rules to:
- điện
- nước
- SĐT

### 4.2 Money fields
Apply money-input formatting rules to:
- giá thuê
- tiền cọc
- số tiền thu

Use shared helpers from the codebase when available.
Do not re-implement duplicate local helper logic without a reason.

### 4.3 Save-level guards
Do not rely only on input type.
Keep save-level validation for:
- no negative values
- `end >= start`
- payment amount `> 0`
- payment amount `<= remaining`
- bill edit lock

---

## 5. Query and view rules

- Verify exact columns before using any table or view.
- Never filter by a column that the view does not expose.
- Never infer IDs from text matching.
- Never workaround schema problems in frontend by guessing data shape.

---

## 6. Mutation rules

After any successful mutation:
- refetch data
OR
- update state correctly

Forbidden:
- stale UI after mutation
- success toast before all required steps succeed
- swallowing real errors silently

---

## 7. Prompt rules for Codex

Every Codex prompt must:
1. start with the required file-reading block
2. include an `IMPORTANT` block
3. define:
   - GOAL
   - CURRENT PROBLEM
   - REQUIRED FIX
   - RULES
   - SCOPE
   - EXPECTED RESULT
4. clearly say what must NOT change

Avoid vague instructions like:
- "improve UI"
- "clean this up"

Be explicit.

---

## 8. DOC IMPACT CHECK

After each task, evaluate whether these docs need updates:
- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`

If no update is needed, say so.
If update is needed, update the docs explicitly.

---

## 9. When uncertain

Say one of these clearly:
- `I cannot verify this`
- `Schema does not confirm this field`

Do not guess.