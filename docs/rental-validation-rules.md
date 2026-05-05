# MoneyFlowOS Rental Validation Rules

This document defines validation rules for the Cho thuê module.

If code behavior conflicts with this file, follow this file.

---

## 1. Validation model

Validation must exist in 3 layers:

1. Input layer (sanitize / restrict)
2. Handler layer (validate before mutation)
3. Database layer (final protection)

Do not rely on only one layer.

---

## 2. Input rules

### 2.1 Digits-only fields

Apply to:
- điện (số đầu / số cuối)
- nước (m³)
- SĐT

Rules:
- digits only
- no letters
- no +, -, e, E

Implementation:
- use sanitizeDigitsInput
- do NOT rely on type="number"

---

### 2.2 Money fields

Apply to:
- giá thuê
- tiền cọc
- số tiền thu

Rules:
- allow thousands separator (.)
- display format: 1.700.000
- sanitize to digits before processing
- parse to number before save

Helpers:
- sanitizeDigitsInput
- formatMoneyInput
- parseMoneyInput

IME rule:
- must work with Vietnamese keyboard (Mac)

---

### 2.3 Text fields

- trim whitespace
- reject empty values when required

---

## 3. Business validation rules

### 3.1 Bill edit lock

Editable only when:
- bill status = null or draft

Locked when:
- confirmed
- partial_paid
- paid
- cancelled

---

### 3.2 Electricity / water

- start >= 0
- end >= 0
- water >= 0
- end >= start

If invalid:
- do NOT save
- do NOT call mutation

---

### 3.3 Payment

- amount > 0
- amount <= remaining

---

### 3.4 Tenant rules

- cannot assign tenant with unpaid bill
- cannot change/remove tenant when:
  - room has unpaid bill
  - OR active deposit exists

---

### 3.5 Deposit

- amount >= 0
- required in current flow

---

## 4. Error messages (recommended)

- "Chỉ được nhập số hợp lệ"
- "Không được nhập số âm"
- "Số cuối phải lớn hơn hoặc bằng số đầu"
- "Nhập số tiền hợp lệ"
- "Tên phòng không được để trống"
- "Họ tên người thuê không được để trống"

Keep messages short and consistent.

---

## 5. Implementation rules for AI

- always sanitize input
- always validate before mutation
- do not weaken business guards
- do not add unnecessary validation

---

## 6. Checklist

Phòng:
- room name valid
- rent valid
- tenant name valid
- phone digits-only
- deposit valid

Chốt tháng:
- edit lock works
- electricity/water valid
- payment valid
