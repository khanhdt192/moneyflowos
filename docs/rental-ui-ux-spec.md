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

### 3.1 Tenant edit UX (UPDATED)

When editing tenant:
- Must edit directly inside Khách thuê section
- Must show labels (NOT placeholder-only):
  - Họ tên
  - Số điện thoại
  - Địa chỉ

Forbidden:
- placeholder-only inputs
- detached form appearing outside section

---

### 3.2 Tenant action rules (UPDATED)

#### Room-level guard
If current room bill is unpaid:
- disable:
  - Đổi người thuê
  - Xóa người thuê
- show helper text:
  "Chỉ thao tác người thuê khi hóa đơn tháng này đã thanh toán đủ"

#### Tenant-level global guard
When selecting tenant to assign/change:
- tenants with unpaid bills must be:
  - disabled in UI
  - clearly marked

Recommended labels:
- "Đang nợ bill"
- "Còn nợ bill phòng khác"

Forbidden:
- allowing user to assign a tenant that still has unpaid bills

---

### 3.3 Form consistency rule

All edit forms must:
- use label + input pattern
- match Sửa phòng style

---

## 4. Button hierarchy (unchanged)

- Primary: main action
- Secondary: normal actions
- Destructive: red actions
- Utility: light actions

---

## 5. Anti-patterns (UPDATED)

Avoid:
- stale form data after mutation
- hidden action logic not reflected in UI
- allowing invalid tenant assignment (debt bypass)

---

## 6. AI UI rules (UPDATED)

AI must:
- follow label + input pattern
- enforce tenant debt guard visually
- sync UI state after mutation

---

## 7. Summary

UI must reflect:
- real tenant state
- real payment state
- business rules (debt guard)

If UI allows an action that backend should not allow, it is a bug.
