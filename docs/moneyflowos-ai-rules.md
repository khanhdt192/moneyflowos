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

---

## 8. Strict forbidden behaviors

AI must NEVER:

- invent new DB columns
- reintroduce deprecated fields
- infer IDs from text (e.g. match full_name to find id)
- ignore cycle_id in billing logic
- remove filters just to avoid errors
- modify unrelated modules

---

## 9. When uncertain

If you are not sure about schema or logic:

You MUST say:
- "I cannot verify this"
- "Schema does not confirm this field"

Do NOT guess.

---

## 10. Goal of these rules

- Prevent schema drift
- Prevent data corruption
- Keep MoneyFlowOS consistent and predictable
- Enable safe AI-assisted development
