# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the **Cho thuê** module.

---

## 1. Core UX principle

The rental module should feel like one system.

---

## 2. Modal pattern

- Use centered modal
- 2-column layout
- Left: data
- Right: actions

---

## 3. Tab Phòng

### 3.1 Header UX (NEW)

Phòng detail modal must use a sticky header:
- left: room name
- right: close button
- header has its own background
- header has bottom border

Close button:
- larger click area
- neutral light-gray background
- not destructive (not red)

---

### 3.2 Tenant edit UX (UPDATED)

When editing tenant:
- Must edit directly inside Khách thuê section
- Must show labels (NOT placeholder-only):
  - Họ tên
  - Số điện thoại
  - Địa chỉ

---

### 3.3 Thông tin phòng (NEW)

Must match Khách thuê UI pattern:
- same section title
- same padding
- label-left / value-right rows

Forbidden:
- nested box layout

---

### 3.4 Tenant action rules (UPDATED)

Room-level guard:
- unpaid bill → disable change/remove tenant

Tenant-level guard:
- tenant with unpaid bill → cannot be assigned

---

### 3.5 Bill section (NEW)

Title format:
- Hóa đơn tháng MM/YYYY

Status badge:
- draft → Nháp
- confirmed/partial_paid → Chưa thu
- paid → Đã thu

If no bill:
- show "Chưa có hóa đơn"

---

### 3.6 Bill actions (NEW)

Phòng tab is VIEW ONLY for billing.

Forbidden:
- payment actions
- confirm bill actions

Use navigation button:
- "Thông tin hoá đơn"

---

### 3.7 Navigation to Chốt tháng (NEW)

Click "Thông tin hoá đơn":
- close Phòng modal
- switch to Chốt tháng
- open SAME room + SAME cycle detail

Fallback:
- still switch tab
- highlight correct room

---

### 3.8 Form consistency rule

All forms:
- label + input pattern

---

## 4. Button hierarchy

- Primary: main action
- Secondary: normal actions
- Destructive: red actions

---

## 5. Anti-patterns

Avoid:
- stale UI
- invalid tenant assignment
- payment actions in Phòng

---

## 6. AI UI rules

AI must:
- keep payment in Chốt tháng
- use navigation instead of direct payment

---

## 7. Summary

Phòng = quản lý
Chốt tháng = thanh toán

UI must respect this separation.