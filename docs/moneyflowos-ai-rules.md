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

### 3.7 Deposit (Phase 1)

AI must treat deposit as a separate domain from billing.

Rules:
- store in `public.rental_deposits`
- do NOT mix deposit into `rental_room_bills`
- do NOT net deposit into payment flows
- enforce ONE active deposit per room

Behavior:
- creating tenant assignment + deposit must be atomic (or rollback-safe)
- if deposit creation fails → rollback tenant assignment
- active deposit must block tenant change/remove

Phase 1 limitations:
- no refund flow
- no settlement UI

Forbidden:
- auto-deduct deposit into bills
- creating multiple active deposits per room

---

## 7. Workflow rules for AI

Step 1 MUST read ALL:
- docs/database-contract.md
- docs/moneyflowos-ai-rules.md
- docs/rental-ui-ux-spec.md

(remaining content unchanged)
