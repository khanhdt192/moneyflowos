# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the Cho thuê module.

---

## 1. Core UX model

The rental module must behave as ONE consistent system.

Key rule:
- Phòng = management
- Chốt tháng = billing & payment
- Tiền cọc = deposit lifecycle / settlement tracking

---

## 2. Shared modal system

Phòng modal, Chốt tháng modal, and Tiền cọc detail modal must share:
- same modal shell
- sticky header
- one explicit close button
- same spacing and card system
- same section heading style
- same border / shadow rhythm
- 2-column layout on desktop

Layout rule:
- LEFT = data (read-only summary / information)
- RIGHT = workflow / actions

Direction:
- all rental detail modals should feel like one shared system
- avoid ad-hoc layout differences across domains

---

## 3. Shared modal visual rules

### 3.1 Header
Rules:
- sticky header
- compact density
- one clear title line
- status badge aligned in header area
- one explicit close button

### 3.2 Section cards
Rules:
- use consistent rounded corners
- use consistent border treatment
- use light shadow rhythm consistently
- consistent internal padding
- consistent spacing between sections

### 3.3 Section headings
Rules:
- compact uppercase labels allowed
- muted foreground hierarchy
- consistent spacing above and below headings

### 3.4 Two-column direction
Desktop:
- LEFT = read-only summary / history
- RIGHT = workflow / action area

Mobile:
- stack vertically

---

## 4. Tab Phòng

### 4.1 Purpose
- room management
- tenant management
- deposit management

### 4.2 Billing rule
Phòng is VIEW ONLY for billing.

Forbidden:
- payment actions
- confirm bill actions

Use navigation:
- "Thông tin hoá đơn" → open Chốt tháng

### 4.3 Tenant rules
- cannot change/remove tenant if:
  - room has unpaid bill
  - OR active deposit exists

### 4.4 Deposit (Phase 1)
- show deposit in room modal
- deposit is read-only after creation
- no refund / settlement UI

### 4.5 Room modal direction
LEFT:
- room summary
- tenant summary
- bill/deposit references

RIGHT:
- workflow actions
- checkout flow
- utility actions

Rules:
- keep workflow/actions separated from read-only summary
- avoid mixing editable controls into summary sections

---

## 5. Tab Chốt tháng (FINAL DIRECTION)

### 5.1 Header
Format:
- Phòng 201 • Tên người thuê • Hóa đơn tháng MM/YYYY • [Status]

Rules:
- compact
- one line
- status is a badge

---

### 5.2 Two-column layout

LEFT:
- full read-only summary

RIGHT:
- workflow panel

Both sides must have equal visual height.

---

### 5.3 LEFT – Tổng hợp hóa đơn

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

### 5.4 RIGHT – Workflow panel

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

## 6. Tab Tiền cọc

### 6.1 Purpose
- deposit lifecycle tracking
- settlement visibility
- deposit transaction history

### 6.2 Detail modal direction
LEFT:
- full read-only deposit snapshot
- deposit summary
- status/date information
- notes
- transaction history

RIGHT:
- action/workflow panel for deposit lifecycle tasks
- for `pending_settlement`, show a compact settlement workflow selector for `Hoàn toàn bộ` and `Hoàn một phần`
- full-refund mode keeps the existing settlement note input and primary action: `Hoàn toàn bộ & quyết toán`
- partial-refund mode shows refund amount, settlement note, live refund/forfeit preview, and primary action: `Quyết toán một phần`
- for `active`, show a read-only message that settlement becomes available after checkout
- for `settled`, show a narrow read-only action-state message only

### 6.3 Rules
- deposit detail modal should follow the same shared modal system as Room/Bill
- avoid duplicating read-only information across both sides
- all current read-only information belongs on the left side
- the right side should contain only the narrow workflow/action state for the current deposit status
- do not fill the right side with redundant utility/read-only sections just to satisfy layout

---

## 7. Button hierarchy

- Primary = main action (Chốt / Ghi nhận)
- Secondary = normal actions
- Utility = light actions (PDF)

---

## 8. Anti-patterns

Avoid:
- mixing input into summary
- inline "Sửa" in summary
- duplicate information across left/right
- unclear action hierarchy
- multiple modal styles in same module
- inconsistent border/shadow/card systems across rental modals
- filling workflow panels with duplicated read-only information

---

## 9. Summary

Phòng = quản lý
Chốt tháng = thanh toán
Tiền cọc = vòng đời tiền cọc
