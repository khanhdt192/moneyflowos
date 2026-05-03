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
Purpose: monthly billing cycle registry.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `month integer` CHECK 1..12
- `year integer` CHECK 2000..3000
- `status text` default `draft` (`draft | finalized`)
- `closed_at timestamptz nullable`
- `created_at timestamptz`

Important notes:
- This is the UUID bridge for month/year-based UI.
- ChotThang and bill logic should resolve `YYYY-MM` -> `cycle_id` here.

---

## 2.4 `public.rental_room_bills`
Purpose: monthly room bill per room per cycle.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `cycle_id uuid` FK -> `public.rental_billing_cycles.id`
- `rent_amount numeric`
- `electricity_amount numeric`
- `water_amount numeric`
- `wifi_amount numeric`
- `cleaning_amount numeric`
- `other_amount numeric`
- `total_amount numeric`
- `paid_amount numeric`
- `note text nullable`
- `created_at timestamptz`
- `status text` default `draft`
  - allowed: `draft | confirmed | partial_paid | paid | cancelled`
- `confirmed_at timestamptz nullable`
- `paid_at timestamptz nullable`

Important notes:
- Bill status in UI must map from this table or from views built on top of it.
- Payment state is derived from `status` and `paid_amount`.

---

## 2.5 `public.rental_electricity_readings`
Purpose: monthly input readings per room per cycle.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `cycle_id uuid` FK -> `public.rental_billing_cycles.id`
- `start_index numeric`
- `end_index numeric`
- `consumption_kwh numeric generated`
- `created_at timestamptz`
- `water_m3 numeric`

Important notes:
- Readings are cycle-based, not month-string-based.
- ChotThang input should save to this table via `cycle_id` UUID.

---

## 2.6 `public.rental_payments`
Purpose: payment records against room bills.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `bill_id uuid` FK -> `public.rental_room_bills.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `amount numeric` CHECK > 0
- `payment_method text` default `cash`
- `note text nullable`
- `paid_at timestamptz`
- `created_at timestamptz`

Important notes:
- Partial payments are allowed.
- Recording payment must refetch bill/UI state afterward.

---

## 2.7 `public.rental_settings`
Purpose: rental cost configuration and bank transfer settings.

Columns currently present:
- `user_id uuid` PK
- `default_electricity_rate numeric`
- `water_total numeric`
- `wifi_total numeric`
- `cleaning_total numeric`
- `other_total numeric`
- `allocation_rule text`
- `created_at timestamptz`
- `updated_at timestamptz`
- `water_rate_per_m3 numeric`
- `wifi_per_room numeric`
- `cleaning_per_room numeric`
- `other_per_room numeric`
- `other_name text`
- `t1_electricity_bill numeric`
- `t1_has_wifi boolean`
- `t1_wifi_per_room numeric`
- `t1_cleaning numeric`
- `t1_other_name text`
- `t1_other_per_room numeric`
- `bank_name text`
- `bank_account text`
- `bank_holder text`
- `bank_qr_url text`
- `bank_note_template text`

Important notes:
- Tầng 1 / ground floor has special cost logic.
- `other_name` and `t1_other_name` are display labels.
- Transfer settings are stored here, not in a separate table.

---

## 2.8 `public.invoice_settings`
Purpose: invoice template settings.

Columns:
- `user_id uuid` PK
- `property_name text`
- `address text`
- `contact_phone text`
- `logo_url text`
- `footer_note text`
- `created_at timestamptz`
- `updated_at timestamptz`

---

## 2.9 Other finance tables
Still present but not the main focus of current rental workflows:
- `public.profiles`
- `public.transactions`
- `public.budget_items`
- `public.goals`

AI should avoid touching these unless the task is explicitly outside rental flows.

---

## 3. Current rental business workflows

## 3.1 Add room
Expected app behavior:
1. User enters room name and rent
2. App auto-detects `floor` from room name when possible
3. UI shows visible field `Tầng`
4. User may manually override detected `floor`
5. Create room in `rental_rooms`
6. If user chose “Thêm người thuê ngay”:
   - create tenant in `rental_tenants`
   - assign `tenant_id` to room
7. Refetch room data
8. If tenant creation fails after room creation, app should rollback/delete the just-created room so user does not see partial success.

Important rules:
- Do not use a tenant string field in `rental_rooms`.
- Tenant creation must include `user_id`.
- `floor` should be passed explicitly during room creation when available.
- Do not rely on DB default `floor = 1` for new rooms.

### Floor auto-detect rule
Current business rule for room-name-based detection:
- `Tầng 1` or `Phòng tầng 1` -> `floor = 1`
- If room name contains a numeric token with at least 3 digits:
  - use the first digit as floor
  - examples:
    - `Phòng 201` -> `2`
    - `Phòng 305` -> `3`
    - `Phòng 503` -> `5`
- If detection is unreliable -> use `null` and let user set manually

---

## 3.2 Tenant CRUD in tab Phòng
Supported business actions:
- Edit tenant info
- Remove tenant from room
- Change tenant for a room
- Add tenant to an empty room

Rules:
- Removing tenant from room should normally unassign room only (`tenant_id = null`), not hard-delete tenant record.
- Edit current tenant must use real tenant ID, not text matching.
- Occupancy display should prefer tenant assignment.

---

## 3.3 Chốt tháng (monthly billing)
Expected flow:
1. User chooses month/year in UI
2. App resolves `month/year` -> `rental_billing_cycles.id` UUID
3. User inputs readings to `rental_electricity_readings`
4. Bill is created/updated in `rental_room_bills`
5. User confirms bill
6. User records payments in `rental_payments`

Rules:
- All month-based logic must resolve to `cycle_id` UUID.
- Never use `YYYY-MM` as final database key.
- After mutation, UI must refetch or sync state.

---

## 3.4 Payment flow
Rules:
- Bill must exist before payment is recorded.
- Payment actions must update/refetch bill state after success.
- `partial_paid` and `paid` are bill statuses, not separate tables.

---

## 4. Occupancy rules

Canonical business meaning:
- A room should be considered occupied when it has an assigned tenant.

Practical app rule:
- Prefer `tenant_id` / tenant relation over raw `occupied` for UI display and interaction enable/disable logic.
- Service layer should keep `occupied` synchronized when assigning/removing tenant.

Examples:
- `assignTenant(roomId, tenantId)` should set:
  - `tenant_id = tenantId`
  - `occupied = true`
- `removeTenant(roomId)` should set:
  - `tenant_id = null`
  - `occupied = false`

---

## 5. ChotThang / month-view contract

ChotThang is month-based. Therefore any month-scoped room overview data must remain cycle-scoped.

Required business contract for room-overview-style data used by ChotThang:
- `cycle_id`
- `room_id`
- `name`
- `floor`
- `tenant`
- `tenant_id`
- `bill_id`
- `bill_status`
- `total_amount`
- `electricity_amount`
- `water_amount`
- `wifi_amount`
- `cleaning_amount`
- `other_amount`

Important note:
- During live inspection, the currently existing `public.rental_room_overview` was observed to expose:
  - `room_id`
  - `name`
  - `floor`
  - `tenant`
  - `tenant_id`
  - `bill_id`
  - `bill_status`
  - `total_amount`
  - `electricity_amount`
  - `water_amount`
  - `wifi_amount`
  - `cleaning_amount`
  - `other_amount`
- It did **not** expose `cycle_id` at the time of inspection.
- This is a known contract mismatch because the frontend month-based hook expects cycle-scoped filtering.

AI rule:
- If touching `rental_room_overview`, do not guess.
- Recreate/fix it using real schema relations only.
- Never reference nonexistent `rental_rooms.tenant`.
- Tenant text must come from `rental_tenants.full_name`.

---

## 6. Known anti-patterns / forbidden assumptions

Never do these in MoneyFlowOS:
- Assume `rental_rooms.tenant` exists
- Reintroduce string-based tenant storage in rooms
- Use `YYYY-MM` as the final foreign-key value for billing logic
- Filter a view by a column that the view does not actually expose
- Infer tenant ID from `full_name + phone + address` text matching
- Treat local UI state as database truth after mutation without refetch
- Assume unnamed/new rooms should default to `floor = 1`

---

## 7. Safe coding checklist for AI

Before changing rental code, verify all of the following:
1. Which table/view is the source of truth?
2. Which exact columns exist right now?
3. Is the flow UUID-based for cycle logic?
4. Is tenant data relational (`tenant_id`) or string-based?
5. Does the view/query actually expose the fields being filtered on?
6. After mutation, is there a refetch or equivalent sync?
7. If room creation is being changed, does the flow preserve floor detection + manual override behavior?

If any assumption is unsupported by this file or live schema, stop and say so.
