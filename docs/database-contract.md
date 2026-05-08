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
- Canonical tenant stay model is now `rental_occupancies`.
- New deposit and billing flows must be occupancy-aware.
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
- `occupied` and `tenant_id` are still used by current UI for compatibility.
- Canonical stay history is no longer represented only by `rental_rooms.tenant_id`; use `rental_occupancies` for stay ownership.
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

## 2.3 `public.rental_occupancies`
Purpose: canonical tenant-stay record.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `tenant_id uuid` FK -> `public.rental_tenants.id`
- `status text` default `active`
  - allowed: `active | ended`
- `started_at timestamptz`
- `ended_at timestamptz nullable`
- `note text nullable`
- `created_at timestamptz`

Important notes:
- This is now the canonical model for one tenant staying in one room during a specific period.
- Current app flow creates an occupancy when tenant is assigned and ends it on checkout.
- There must be at most one active occupancy per room.
- Legacy rooms created before occupancy rollout may require data backfill if they still have `tenant_id` / `occupied` but no active occupancy.

---

## 2.4 `public.rental_billing_cycles`
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

## 2.5 `public.rental_room_bills`
Purpose: monthly room bill per occupancy per cycle.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `cycle_id uuid` FK -> `public.rental_billing_cycles.id`
- `occupancy_id uuid nullable` FK -> `public.rental_occupancies.id`
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
- Canonical ownership is now occupancy-aware: a current bill should resolve through `occupancy_id + cycle_id`.
- `room_id` remains present for compatibility and reporting.
- Payment state is derived from `status` and `paid_amount`.
- For tenant mobility rules, a bill is considered unpaid when `paid_amount < total_amount`.
- `cancelled` bills may be excluded from unpaid-tenant blocking rules.
- The legacy unique `(room_id, cycle_id)` constraint should no longer be treated as the desired business model once O3 migration is complete.
- Preferred uniqueness direction is occupancy-based for new billing ownership.

---

## 2.6 `public.rental_electricity_readings`
Purpose: monthly input readings per room per cycle.

Columns:
- `id uuid` PK
- `user_id uuid` FK -> `auth.users.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `cycle_id uuid` FK -> `public.rental_billing_cycles.id`
- `occupancy_id uuid nullable` FK -> `public.rental_occupancies.id`
- `start_index numeric`
- `end_index numeric`
- `consumption_kwh numeric generated`
- `created_at timestamptz`
- `water_m3 numeric`

Important notes:
- Readings are cycle-based, not month-string-based.
- ChotThang input should save to this table via `cycle_id` UUID.
- `occupancy_id` exists for occupancy-aware evolution, but current app flow still primarily inputs readings per room + cycle and resolves current active occupancy in app layer.

---

## 2.7 `public.rental_payments`
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
- Current safe mutation flow prefers bill-by-id operations instead of room+cycle mutations.

---

## 2.8 `public.rental_settings`
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

## 2.9 `public.invoice_settings`
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

## 2.10 `public.rental_deposits`
Purpose: tenant security deposit snapshot, separate from monthly bills.

Columns:
- `id uuid` PK
- `tenant_id uuid` FK -> `public.rental_tenants.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `occupancy_id uuid nullable` FK -> `public.rental_occupancies.id`
- `amount numeric` CHECK >= 0
- `status text` default `active`
  - allowed: `active | pending_settlement | settled`
- `note text nullable`
- `collected_at timestamp`
- `settled_at timestamp nullable`
- `created_at timestamp`
- `vacated_at timestamptz nullable`
- `settlement_note text nullable`

Important notes:
- Deposit is a separate domain from `rental_room_bills`.
- Deposit must NOT be netted into monthly bill totals or payment flows.
- Current active deposit lookup for room workflow should resolve through the room's active occupancy.
- `room_id` remains for compatibility and reporting, but current ownership direction is occupancy-aware.

---

## 2.11 `public.rental_deposit_transactions`
Purpose: deposit transaction history.

Columns:
- `id uuid` PK
- `deposit_id uuid` FK -> `public.rental_deposits.id`
- `room_id uuid` FK -> `public.rental_rooms.id`
- `tenant_id uuid` FK -> `public.rental_tenants.id`
- `occupancy_id uuid nullable` FK -> `public.rental_occupancies.id`
- `transaction_type text`
  - allowed: `create | refund`
- `amount numeric` CHECK > 0
- `note text nullable`
- `related_bill_id uuid nullable` FK -> `public.rental_room_bills.id`
- `created_at timestamptz`
- `updated_at timestamptz`

Important notes:
- This is the audit trail for deposit lifecycle.
- New transactions should carry occupancy context when available.

---

## 2.12 Other finance tables
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
   - create active occupancy in `rental_occupancies`
   - optionally create deposit linked to `occupancy_id`
7. Refetch room data
8. If tenant/deposit/occupancy creation fails after room creation, app should rollback the just-created partial state.

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
- Checkout / tenant change must end the active occupancy.
- New tenant assignment must create a new active occupancy.

### Tenant mobility rules
These rules apply to tenant reassignment and tenant removal actions in tab `Phòng`.

#### Room-level guard
If the current occupancy-owned bill for the current cycle is unpaid:
- do NOT allow `Đổi người thuê`
- do NOT allow `Xóa người thuê khỏi phòng`
- unpaid means `paidAmount < totalAmount`

#### Tenant-level global debt guard
A tenant must NOT be assignable to another room if that tenant has any unpaid bill in the system.

Practical rule:
- when selecting an existing tenant for reassignment or assignment,
  tenants with unpaid bills must be blocked from selection
- `cancelled` bills may be excluded from this blocking rule
- current blocking logic should prefer occupancy-owned current bills, not broad room+cycle matches

Rationale:
- this prevents moving a tenant with debt from one room into another room and bypassing unpaid bill handling

---

## 3.3 Deposit

Expected flow:
1. User assigns a tenant to a room
2. App ensures there is an active occupancy
3. App creates a deposit record in `rental_deposits` linked to `occupancy_id`
4. App creates initial deposit transaction `create`
5. App refetches room data
6. On checkout:
   - move active occupancy deposit to `pending_settlement`
   - end occupancy
   - unassign room tenant
7. If deposit creation fails after assignment:
   - app must rollback occupancy / assignment as needed
   - if the tenant was newly created in the same flow, app should rollback/delete that tenant to avoid partial success

Important rules:
- Deposit is independent from monthly billing and payment collection.
- Current room deposit lookup should resolve through active occupancy.
- Deposit tab owns `active | pending_settlement | settled` visibility.

---

## 3.4 Chốt tháng (monthly billing)
Expected flow:
1. User chooses month/year in UI
2. App resolves `month/year` -> `rental_billing_cycles.id` UUID
3. User inputs readings to `rental_electricity_readings`
4. App resolves the room's active occupancy
5. Bill is created/updated in `rental_room_bills` for `occupancy_id + cycle_id`
6. User confirms bill
7. User records payments in `rental_payments`

Rules:
- All month-based logic must resolve to `cycle_id` UUID.
- Never use `YYYY-MM` as final database key.
- Current bill for a room workflow should resolve through active occupancy + cycle.
- Mutations that confirm/pay/reset should prefer bill-by-id operations.
- After mutation, UI must refetch or sync state.

---

## 3.5 Payment flow
Rules:
- Bill must exist before payment is recorded.
- Payment actions must update/refetch bill state after success.
- `partial_paid` and `paid` are bill statuses, not separate tables.
- Current safe payment mutation should target a specific bill ID.

---

## 4. Occupancy rules

Canonical business meaning:
- An occupancy is one tenant staying in one room during a specific period.

Practical app rule:
- Current room UI may still use `tenant_id` / `occupied` for compatibility, but canonical stay ownership is `rental_occupancies`.
- Service layer should keep `occupied` synchronized when assigning/removing tenant.
- New room workflow and current billing/deposit workflows should resolve through active occupancy.

Examples:
- `assignTenant(roomId, tenantId)` should lead to:
  - `tenant_id = tenantId`
  - `occupied = true`
  - create active occupancy
- `removeTenant(roomId)` should lead to:
  - end active occupancy
  - `tenant_id = null`
  - `occupied = false`

---

## 5. ChotThang / month-view contract

ChotThang is month-based. Therefore any month-scoped room overview data must remain cycle-scoped.

Required business contract for current room billing logic:
- `cycle_id`
- `room_id`
- `occupancy_id`
- `bill_id`
- `bill_status`
- `total_amount`
- `paid_amount`
- bill amount components

Important note:
- Current UI no longer should assume `room_id + cycle_id` is sufficient to identify the active bill owner.
- Current bill resolution should prefer `active occupancy + cycle`.
- If touching helper views or queries, do not guess and do not reintroduce room-only bill identity.

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
- Allow tenant reassignment to bypass unpaid bill rules
- Treat current bill identity as only `room_id + cycle_id`
- Treat current deposit identity as only `room_id`

---

## 7. Safe coding checklist for AI

Before changing rental code, verify all of the following:
1. Which table/view is the source of truth?
2. Which exact columns exist right now?
3. Is the flow UUID-based for cycle logic?
4. Is tenant data relational (`tenant_id`) or string-based?
5. Is current ownership room-based or occupancy-based?
6. Does the view/query actually expose the fields being filtered on?
7. After mutation, is there a refetch or equivalent sync?
8. If room creation is being changed, does the flow preserve floor detection + manual override behavior?
9. If tenant reassignment is being changed, does the flow respect both room-level and tenant-level unpaid-bill guards?
10. If billing/deposit logic is touched, does it resolve through active occupancy when the task is about current room workflow?

If any assumption is unsupported by this file or live schema, stop and say so.
