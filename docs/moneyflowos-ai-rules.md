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
- Project-specific docs/rules in this repo override generic coding guidelines.
- Do not ask clarifying questions if the answer can be verified from repo docs or code.
- If repo docs/code still do not confirm an assumption, say so clearly instead of guessing.

---

## 2. Required files to read first

Before any rental task, always read:
- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`

If the task touches rental business ownership or workflow boundaries, also read:
- `docs/rental-business-rules.md`

---

## 3. General coding behavior

### 3.1 Think before coding
Before implementing:
- state important assumptions explicitly
- verify assumptions from repo docs/code first
- if multiple interpretations exist, surface them instead of silently picking one
- if a simpler approach exists, prefer it
- if something is still unclear after verification, stop and say exactly what is unclear

### 3.2 Simplicity first
- write the minimum code that solves the requested problem
- do not add extra features, abstractions, flexibility, or configurability that were not requested
- do not add speculative error handling for scenarios that are not part of the task
- if the solution feels overcomplicated, simplify it

### 3.3 Surgical changes
When editing existing code:
- touch only what is needed for the requested task
- do not refactor unrelated code
- do not clean up adjacent code just because you noticed it
- match the existing local style unless the task explicitly asks for a broader refactor
- remove only the unused code/imports created by your own change
- if you notice unrelated issues, mention them separately instead of changing them

### 3.4 Goal-driven execution
For non-trivial tasks:
- translate the task into explicit success criteria
- prefer verifiable checks already available in the repo
- do not invent or add tests unless the task asks for tests or the repo already supports that pattern
- use practical verification such as build/typecheck/manual flow expectations when appropriate

---

## 4. Rental domain rules

### 4.1 Tenant model
- `rental_rooms` does NOT store tenant name text.
- Use `tenant_id`.
- Tenant display name comes from `rental_tenants.full_name`.

Forbidden:
- using `rental_rooms.tenant`
- storing tenant name directly in `rental_rooms`

### 4.2 Billing cycle model
- Billing uses UUID `cycle_id`.
- UI may show month/year, but backend logic must resolve to `rental_billing_cycles.id`.

Forbidden:
- using `YYYY-MM` as the final DB key
- bypassing `rental_billing_cycles`

### 4.3 Occupancy
- Canonical occupancy = tenant assigned.
- Prefer `tenant_id` over raw `occupied` if they conflict.
- Service layer must keep `occupied` synchronized.

### 4.4 Tenant mobility guards
- Do NOT allow changing/removing tenant when the current room has an unpaid bill.
- Do NOT allow assigning a tenant who has unpaid bills elsewhere.
- Active deposit also blocks tenant change/remove in tab `Phòng`.

### 4.5 Deposit domain
- Deposit belongs to `public.rental_deposits`.
- Deposit is separate from monthly bills and payments.
- Do NOT net deposit into bill totals.
- Basic settlement currently belongs only to tab `Tiền cọc`: only `pending_settlement` deposits may be fully refunded or partially refunded/forfeited and marked `settled`; do not settle `active` deposits or net deposits into bills.
- Partial deposit settlement must create one `partial_refund` transaction and one `forfeit` transaction, then update the deposit to `settled`; if mutation steps fail, rollback the settlement transactions from that attempt.
- Enforce one active deposit per room.

### 4.6 Chốt tháng edit lock
Billing inputs are editable only when:
- room is occupied
- effective bill status is `null` or `draft`

Billing inputs must be locked when status is:
- `confirmed`
- `partial_paid`
- `paid`
- `cancelled`

---

## 5. Validation rules AI must respect

### 5.1 Digits-only fields
Apply digits-only input rules to:
- điện
- nước
- SĐT

### 5.2 Money fields
Apply money-input formatting rules to:
- giá thuê
- tiền cọc
- số tiền thu

Use shared helpers from the codebase when available.
Do not re-implement duplicate local helper logic without a reason.

### 5.3 Save-level guards
Do not rely only on input type.
Keep save-level validation for:
- no negative values
- `end >= start`
- payment amount `> 0`
- payment amount `<= remaining`
- bill edit lock

---

## 6. Query and view rules

- Verify exact columns before using any table or view.
- Never filter by a column that the view does not expose.
- Never infer IDs from text matching.
- Never workaround schema problems in frontend by guessing data shape.

---

## 7. Mutation rules

After any successful mutation:
- refetch data
OR
- update state correctly

Forbidden:
- stale UI after mutation
- success toast before all required steps succeed
- swallowing real errors silently

---

## 8. Supabase schema change rules

When adding or changing Supabase tables, AI must treat these as separate required steps:
1. schema / columns / constraints / indexes
2. foreign keys
3. RLS policies
4. app-layer usage validation

Required rule:
- creating a new table is NOT complete until RLS policies are reviewed and added explicitly

For every new table used by the frontend or client-side Supabase calls, AI must check:
- whether RLS is enabled
- whether SELECT policy exists
- whether INSERT policy exists
- whether UPDATE policy exists
- whether DELETE policy exists when needed

Do NOT assume a new table is usable just because SQL table creation succeeded.

When proposing DB SQL for a new table, AI should either:
- include RLS policy SQL in the same DB task
OR
- explicitly state that RLS policy creation is a required follow-up before app code can use the table

---

## 9. Prompt rules for Codex

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

## 10. DOC IMPACT CHECK

After each task, evaluate whether these docs need updates:
- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`

If no update is needed, say so.
If update is needed, update the docs explicitly.

---

## 11. When uncertain

Say one of these clearly:
- `I cannot verify this`
- `Schema does not confirm this field`

Do not guess.