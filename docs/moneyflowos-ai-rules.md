# MoneyFlowOS AI Rules

This file defines strict rules for any AI (Codex, Claude, Replit, etc.) working on MoneyFlowOS.

These rules are mandatory.
If there is any conflict between code assumptions and these rules, follow these rules.

---

## 1. Core philosophy

- Supabase schema is the source of truth.
- UI is only a representation layer.
- Database is the only reliable state.
- Never guess schema.
- Never invent columns.

---

## 2. Schema discipline rules

Before writing or modifying code:

You MUST:
1. Inspect current schema (or read docs/database-contract.md)
2. List the exact columns you will use
3. Confirm those columns actually exist

If any column is not confirmed:
- STOP
- Do NOT guess
- Do NOT fabricate fields

---

## 3. Rental domain rules

### 3.1 Tenant model

- rental_rooms does NOT store tenant name
- rental_rooms uses tenant_id (uuid)
- tenant name comes from rental_tenants.full_name

Forbidden:
- using rental_rooms.tenant
- storing tenant name directly in rental_rooms

---

### 3.2 Cycle model

- Billing uses UUID-based cycle_id
- UI may show YYYY-MM, but backend must convert to UUID

Forbidden:
- using YYYY-MM as database key
- bypassing rental_billing_cycles

---

### 3.3 Occupancy

- True occupancy = tenant assigned
- Use tenant relation (tenant_id) as primary signal
- occupied column is secondary and must be synced

---

### 3.4 Billing logic

- Bills belong to (room_id, cycle_id)
- Payment belongs to bill_id
- Electricity readings belong to (room_id, cycle_id)

Forbidden:
- mixing month string with bill logic
- writing bill logic without cycle_id

---

### 3.5 Floor handling (NEW)

- Floor must NOT default to 1 implicitly
- Floor should be derived from room name when possible
- Add Room flow must:
  - auto-detect floor from room name
  - show editable field `Tầng`
  - allow manual override

Forbidden:
- assuming all new rooms belong to floor 1
- ignoring detected floor when inserting into DB

---

### 3.6 Tenant mobility rules (NEW)

AI must enforce both rules when implementing tenant change / assignment:

1. Room-level guard:
- If current room bill exists and is unpaid (paidAmount < totalAmount):
  - do NOT allow changing tenant
  - do NOT allow removing tenant

2. Tenant-level global guard:
- A tenant must NOT be assignable to any other room if that tenant has any unpaid bill
- Unpaid means paidAmount < totalAmount
- Cancelled bills may be excluded if status exists

Forbidden:
- allowing tenant reassignment that bypasses unpaid bills
- implementing only room-level guard without tenant-level guard

---

## 4. View & query rules

### 4.1 Never assume view structure

Before using a view:
- verify which columns it exposes

Forbidden:
- filtering by a column that does not exist
- assuming view columns from memory or guess

---

### 4.2 rental_room_overview specific rules

- Must align with database-contract.md
- Must not reference rental_rooms.tenant
- Tenant display must come from rental_tenants.full_name

If the view is missing required fields:
- fix the SQL
- do not workaround in frontend

---

## 5. Mutation rules

After ANY mutation:

You MUST:
- refetch data
OR
- update state correctly

Forbidden:
- leaving stale UI state
- assuming DB updated state is already in UI

---

## 6. Error handling rules

- Always log real Supabase error (console.error)
- Do not swallow errors silently
- Do not show success before all steps succeed

---

## 7. Workflow rules for AI

Every task must follow this order:

Step 1: Inspect schema + relevant files
Step 2: Confirm assumptions
Step 3: Propose minimal changes
Step 4: Implement
Step 5: Ensure refetch / sync logic
Step 6: Perform DOC IMPACT CHECK

---

## 8. DOC IMPACT CHECK (MANDATORY)

After every task, AI must evaluate:

1. Does this change affect schema?
2. Does this change affect business workflow?
3. Does this change affect frontend ↔ DB contract?

Then explicitly answer:

- database-contract.md: update needed / not needed
- moneyflowos-ai-rules.md: update needed / not needed

If update needed:
- propose exact markdown changes

Forbidden:
- skipping this step
- finishing task without checking doc impact

---

## 9. Strict forbidden behaviors

AI must NEVER:

- invent new DB columns
- reintroduce deprecated fields
- infer IDs from text (e.g. match full_name to find id)
- ignore cycle_id in billing logic
- remove filters just to avoid errors
- modify unrelated modules

---

## 10. When uncertain

If you are not sure about schema or logic:

You MUST say:
- "I cannot verify this"
- "Schema does not confirm this field"

Do NOT guess.

---

## 11. Goal of these rules

- Prevent schema drift
- Prevent data corruption
- Keep MoneyFlowOS consistent and predictable
- Enable safe AI-assisted development
