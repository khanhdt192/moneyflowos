# MoneyFlowOS Rental Validation Rules

This document defines the validation rules for the **Cho thuê** module.

It is the validation source of truth for rental UI, handlers, and service-layer guard logic.

If validation behavior in code conflicts with this file, follow this file.
Do not invent extra validation rules without checking the database contract and rental UX spec.

---

## 1. Scope

This document applies to:
- Tab `Phòng`
- Tab `Chốt tháng`
- Rental tenant assignment flows
- Rental deposit input flows
- Rental payment input flows

This document does **not** change database schema by itself.
Database constraints remain the final protection layer.

---

## 2. Validation philosophy

Rental validation must exist in **3 layers**:

1. **Input/UI layer**
- prevent obviously invalid characters as early as possible
- reduce accidental bad input

2. **Handler / mutation guard layer**
- validate again before calling actions/services
- do not rely only on HTML input type

3. **Database layer**
- DB constraints are the final guard against corrupted data

App code must never assume the UI already prevented bad input.
Every important mutation must be guarded again before save.

---

## 3. General character rules

### 3.1 Numeric money / meter / quantity fields

Fields of this type must not accept:
- letters
- scientific notation (`e`, `E`)
- plus/minus signs when the domain does not allow negative values
- punctuation or special characters that are not explicitly supported by the current field

Current rental business direction:
- rent
- deposit
- electricity readings
- water quantity
- payment amount

must all be treated as **non-negative numeric input**.

Practical rule:
- do not rely only on `type="number"`
- validate both at input-change level and before mutation

### 3.2 Phone number fields

Phone number fields must accept:
- digits only

Do not allow:
- letters
- spaces
- `+`
- `-`
- parentheses
- punctuation
- other special characters

Phone remains optional unless a screen explicitly requires it.
If phone is entered, it must be digits-only.

### 3.3 Text fields

Text fields such as room name or tenant full name must:
- trim leading/trailing whitespace before validation and save
- reject whitespace-only values when the field is required

---

## 4. Tab Phòng validation rules

## 4.1 Add room / edit room

### Required fields
- `room.name` is required
- `room.rent` is required in practice

### Rules
- room name must be trimmed
- room name must not be empty after trim
- rent must be a valid number
- rent must be `>= 0`
- rent must not save `NaN`
- rent must not accept letters or invalid special characters

### Room floor
- floor detection follows the business rule in `database-contract.md`
- if floor is manually entered/overridden, it should be numeric and valid for the UI flow
- do not silently coerce unrelated invalid text into a floor value

---

## 4.2 Tenant create / edit in Phòng

### Required fields
- `tenant.full_name` is required

### Optional fields
- `tenant.phone`
- `tenant.address`

### Rules
- full name must be trimmed
- full name must not be empty after trim
- phone may be empty
- if phone is entered, it must contain digits only
- address may remain optional

---

## 4.3 Add tenant / change tenant with deposit

### Deposit amount
- deposit amount is required in current Phase 1 flows
- deposit amount must be a valid number
- deposit amount must be `>= 0`
- deposit amount must not save `NaN`
- deposit amount must not accept letters or invalid special characters

### Deposit note
- optional
- free text

### Existing tenant assignment guard
Validation must still respect the current rental business rules:
- tenant with unpaid bill must not be assignable
- active deposit must block tenant mutation according to Phase 1 deposit rules

Validation must not weaken those business guards.

---

## 5. Tab Chốt tháng validation rules

## 5.1 Bill editability lock

Billing inputs are editable only when:
- the room is occupied
- AND the effective bill status is missing/null or exactly `draft`

Billing inputs must be locked when bill status is:
- `confirmed`
- `partial_paid`
- `paid`
- `cancelled`

This lock applies to:
- main table inputs
- detail modal inline edit controls

The lock must exist in both:
- UI state
- handler-level guard logic

---

## 5.2 Electricity / water input rules

### Fields
- `start_index`
- `end_index`
- `water_m3`

### Rules
- `start_index >= 0`
- `end_index >= 0`
- `water_m3 >= 0`
- `end_index >= start_index`

### Character rules
These fields must not accept:
- letters
- negative sign
- `e` / `E`
- invalid special characters

### Save behavior
If invalid:
- do not mutate
- do not continue to downstream save logic
- do not call the save mutation

---

## 5.3 Payment amount rules

### Field
- payment amount in `Chốt tháng`

### Rules
- amount must be a valid number
- amount must be `> 0`
- amount must not exceed remaining bill amount
- amount must not accept letters or invalid special characters

Validation must happen before payment mutation.

---

## 6. Recommended user-facing error messages

Use short and consistent toasts where possible.

Recommended messages:
- Required text field empty:
  - `Vui lòng nhập thông tin bắt buộc`
- Room name invalid:
  - `Tên phòng không được để trống`
- Tenant full name invalid:
  - `Họ tên người thuê không được để trống`
- Invalid numeric input:
  - `Chỉ được nhập số hợp lệ`
- Negative numeric input:
  - `Không được nhập số âm`
- Invalid electricity range:
  - `Số cuối phải lớn hơn hoặc bằng số đầu`
- Invalid phone:
  - `Số điện thoại chỉ được chứa chữ số`
- Invalid deposit:
  - `Vui lòng nhập tiền cọc hợp lệ`
- Invalid payment:
  - `Nhập số tiền hợp lệ`

Projects may refine wording, but should keep meaning consistent.

---

## 7. Implementation guidance for AI / Codex

When implementing rental validation:

1. Read first:
- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`
- `docs/rental-ui-ux-spec.md`
- this file

2. Prefer minimal changes
- patch only the relevant rental files
- avoid broad refactors

3. Validate twice
- once at input/change level
- once again before mutation

4. Do not weaken business guards
- unpaid bill guards
- deposit mutation lock
- bill edit lock

5. Do DOC IMPACT CHECK after changes
- especially when new validation rules are introduced

---

## 8. Current high-priority validation checklist

The current rental module should ensure all of the following:

### Phòng
- [ ] room name not empty
- [ ] rent valid and non-negative
- [ ] tenant full name not empty
- [ ] tenant phone digits-only when provided
- [ ] deposit valid and non-negative

### Chốt tháng
- [ ] bill edit lock by effective bill status
- [ ] start/end/water non-negative
- [ ] end >= start
- [ ] invalid numeric characters blocked
- [ ] payment amount valid, positive, and not over remaining

---

## 9. Relationship to DB constraints

This document does not replace DB constraints.

The database remains the final source of truth and final protection layer.
If frontend validation and DB constraints disagree:
- verify actual schema
- update code to match DB contract
- then update docs if needed
