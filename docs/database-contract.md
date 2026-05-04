# MoneyFlowOS Database Contract

Last updated from live Supabase inspection of project `moneyflowOS` (`cacvfzxrwwabaqyzelpr`) and current app behavior.

This file is the database source of truth for AI/codegen tasks.
If code assumptions conflict with this file, follow this file.
Do not invent columns.

---

## 1. Core principles

- Supabase/Postgres schema is the source of truth.
- Billing cycle source of truth is `rental_billing_cycles.id` (UUID), not `YYYY-MM` strings.
- UI may display `Tháng 04/2026`, but backend logic must resolve that to `cycle_id`.
- `rental_rooms` uses relational tenant data via `tenant_id`.
- `rental_rooms` does **not** have a tenant text column.
- Tenant display name comes from `rental_tenants.full_name`.
- Any SQL/view/query change must respect the actual schema below.

---

## 2. Public tables currently in use

## 2.1 `public.rental_rooms`
Purpose: room master data.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `name text`
- `rent numeric`
- `occupied boolean` default `false`
- `created_at timestamptz`
- `floor integer`
- `tenant_id uuid nullable` FK -> `public.rental_tenants.id`

Important notes:
- `rental_rooms` does **not** have `tenant` text column.
- `occupied` exists, but may become stale if not synced after tenant assignment changes.
- App logic should prefer tenant assignment (`tenant_id` / tenant relation) over raw `occupied` for display decisions when they conflict.
- `floor` must not be implicitly treated as `1` for new rooms.
- Current business direction is:
  - auto-detect `floor` from room name in Add Room flow
  - still allow manual override in UI
  - avoid silent DB defaults that turn `Phòng 201` into `floor = 1`

---

## 2.2 `public.rental_tenants`
Purpose: tenant master data.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `full_name text`
- `phone text nullable`
- `address text nullable`
- `created_at timestamptz nullable`

Important notes:
- Tenant name shown in UI must come from `full_name`.
- Room/tenant relation is `rental_rooms.tenant_id -> rental_tenants.id`.

---

## 2.3 `public.rental_billing_cycles`
...

## 2.10 `public.rental_deposits` (NEW - Phase 1)
Purpose: tenant security deposit records (separate from bills).

Columns:
- `id uuid` PK
- `tenant_id uuid` FK -> `public.rental_tenants.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `amount numeric` CHECK >= 0
- `status text` (`active | settled`)
- `note text nullable`
- `collected_at timestamptz`
- `settled_at timestamptz nullable`
- `created_at timestamptz`

Important rules (Phase 1):
- Deposit is NOT part of `rental_room_bills`
- Deposit must NOT be netted against monthly bill logic
- There must be at most ONE active deposit per room (enforced by DB unique partial index)
- Phase 1 only supports:
  - create deposit
  - read/display deposit
  - block tenant mutation when active deposit exists
- Phase 1 does NOT include:
  - refund logic
  - settlement workflow

---

## 3. Current rental business workflows

### 3.x Deposit (Phase 1)

When a tenant is assigned to a room:
- a deposit record must be created in `rental_deposits`

Behavior:
- if deposit creation fails → tenant assignment MUST be rolled back
- if active deposit exists → must block tenant change/remove

---

(remaining sections unchanged)
