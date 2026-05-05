# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the Cho thuê module.

---

## 1. Core UX model

The rental module must behave as ONE consistent system.

Key rule:
- Phòng = management
- Chốt tháng = billing & payment

---

## 2. Shared modal system

Phòng modal and Chốt tháng modal must share:
- same modal shell
- sticky header
- one close button
- same spacing and card system
- 2-column layout on desktop

Layout rule:
- LEFT = data (read-only summary)
- RIGHT = workflow / actions

---

## 3. Tab Phòng

### 3.1 Purpose
- room management
- tenant management
- deposit management

### 3.2 Billing rule
Phòng is VIEW ONLY for billing.

Forbidden:
- payment actions
- confirm bill actions

Use navigation:
- "Thông tin hoá đơn" → open Chốt tháng

### 3.3 Tenant rules
- cannot change/remove tenant if:
  - room has unpaid bill
  - OR active deposit exists

### 3.4 Deposit (Phase 1)
- show deposit in room modal
- deposit is read-only after creation
- no refund / settlement UI

---

## 4. Tab Chốt tháng (FINAL DIRECTION)

### 4.1 Header
Format:
- Phòng 201 • Tên người thuê • Hóa đơn tháng MM/YYYY • [Status]

Rules:
- compact
- one line
- status is a badge

---

### 4.2 Two-column layout

LEFT:
- full read-only summary

RIGHT:
- workflow panel

Both sides must have equal visual height.

---

### 4.3 LEFT – Tổng hợp hóa đơn

Must always include:
- Tiền thuê
- Tiền điện
- Tiền nước
- Wifi
- Vệ sinh
- Phụ phí khác
- Tổng
- Đã thu
- Còn thiếu

Rules:
- read-only
- no inputs
- no "Sửa"
- label left / value right
- "Còn thiếu" must be emphasized

---

### 4.4 RIGHT – Workflow panel

3 sections only:

#### A. Nhập điện nước

Visible ONLY when bill status is:
- null
- draft

Hidden when:
- confirmed
- partial_paid
- paid
- cancelled

Behavior:
- default = read-only display
- click "Sửa" → editable
- Save / Cancel

---

#### B. Thu tiền

Show when payment is allowed.

Includes:
- Đã thu
- Còn thiếu
- Số tiền thu
- Phương thức

Primary action:
- Ghi nhận

---

#### C. Hành động khác

- Đánh dấu đã thu đủ
- Xuất PDF

Rules:
- separate from payment section
- secondary hierarchy only

---

## 5. Button hierarchy

- Primary = main action (Chốt / Ghi nhận)
- Secondary = normal actions
- Utility = light actions (PDF)

---

## 6. Anti-patterns

Avoid:
- mixing input into summary
- inline "Sửa" in summary
- duplicate information across left/right
- unclear action hierarchy
- multiple modal styles in same module

---

## 7. Summary

Phòng = quản lý
Chốt tháng = thanh toán
