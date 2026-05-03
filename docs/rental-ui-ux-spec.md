# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the **Cho thuê** module.

---

## 1. Core UX principle

The rental module should feel like one system.

---

## 2. Shared modal system (UPDATED)

Both `Phòng` detail modal and `Chốt tháng` detail modal must use the same modal shell and the same design language.

Required shared rules:
- centered modal
- sticky header
- one close button only
- same header height family
- same header padding rhythm
- same body padding rhythm
- 2-column layout on desktop
- left = data sections
- right = action panel
- same section card family
- same label/value row family
- same button hierarchy family

The two modals may differ in business content, but they must not feel like two separate products.

---

## 3. Tab Phòng

### 3.1 Header UX

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

### 3.2 Tenant edit UX

When editing tenant:
- Must edit directly inside Khách thuê section
- Must show labels (NOT placeholder-only):
  - Họ tên
  - Số điện thoại
  - Địa chỉ

---

### 3.3 Thông tin phòng

Must match Khách thuê UI pattern:
- same section title
- same padding
- label-left / value-right rows

Forbidden:
- nested box layout

---

### 3.4 Tenant action rules

Room-level guard:
- unpaid bill → disable change/remove tenant

Tenant-level guard:
- tenant with unpaid bill → cannot be assigned

---

### 3.5 Bill section

Title format:
- Hóa đơn tháng MM/YYYY

Status badge:
- draft → Nháp
- confirmed/partial_paid → Chưa thu
- paid → Đã thu

If no bill:
- show "Chưa có hóa đơn"

---

### 3.6 Bill actions

Phòng tab is VIEW ONLY for billing.

Forbidden:
- payment actions
- confirm bill actions

Use navigation button:
- "Thông tin hoá đơn"

---

### 3.7 Navigation to Chốt tháng

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

## 4. Tab Chốt tháng (UPDATED)

### 4.1 Shared shell consistency

Chốt tháng detail modal must match Phòng detail modal in:
- sticky header structure
- close button style
- section card styling
- label/value row styling
- overall spacing rhythm
- right-side sticky action panel concept on desktop

### 4.2 Header content

Use a compact one-line header in this format:
- `Phòng 201 • Tên người thuê • Hóa đơn tháng 05/2026 • [Nháp]`

Rules:
- room name is visually strongest
- tenant + bill month are lighter secondary text
- status is shown as a badge/chip
- keep header compact/smaller in height
- keep only one close button

### 4.3 Left column structure

Required section order:
1. Tổng hợp hóa đơn

Do NOT keep a separate top `Thông tin phòng` block.
Do NOT keep a separate `Chi tiết hóa đơn` block above if it duplicates edit behavior already available in the table.

### 4.4 Edit surface rule (IMPORTANT)

The monthly table is the primary edit surface for electricity/water input.

Therefore, the Chốt tháng detail modal must NOT duplicate a second primary edit surface for the same values.

Rules:
- do not keep editable electricity/water inputs both in the table and in the modal by default
- the modal should primarily review bill details and support bill actions
- if a future explicit edit mode is ever added, it must be intentional and secondary, not the default state

### 4.5 Tổng hợp hóa đơn section

This section is read-only.

It must include:
- Tiền thuê
- Điện
- Số đầu
- Số cuối
- Nước
- Số m³
- Wifi
- Vệ sinh
- Phụ phí khác
- Tổng
- Đã thu
- Còn thiếu

Rules:
- use one label-left / value-right row pattern
- align all numeric values to the right
- allow `Số đầu`, `Số cuối`, and `Số m³` to have an explicit small edit affordance at the right side of their rows if product chooses to support quick inline correction from the summary section
- if quick edit is supported, it should happen from this summary area only, not from a separate duplicate bill-detail form above
- `Tổng hợp hóa đơn` remains the single main body section on the left

### 4.6 Right action panel

The Chốt tháng right column should stay visually aligned with Phòng's right column.

Allowed action types:
- primary: Thu tiền or Chốt bill depending on state
- secondary: the remaining normal bill action
- utility: PDF

Forbidden:
- duplicated primary actions
- extra `Đóng` button when the modal already has a header close button
- action hierarchy that differs wildly from Phòng modal

---

## 5. Button hierarchy

- Primary: main action
- Secondary: normal actions
- Destructive: red actions
- Utility: light actions

Additional rule:
- Phòng uses navigation instead of payment execution
- Chốt tháng owns payment execution
- both tabs must still use the same visual button system

---

## 6. Anti-patterns

Avoid:
- stale UI
- invalid tenant assignment
- payment actions in Phòng
- two modals in the same module feeling like different products
- duplicate close buttons
- blank modal shells
- duplicate edit surfaces for the same electricity/water fields
- nested card-inside-card bill edit UI in Chốt tháng

---

## 7. AI UI rules

AI must:
- keep payment in Chốt tháng
- use navigation instead of direct payment in Phòng
- preserve shared modal shell consistency across Phòng and Chốt tháng
- keep section cards and row patterns aligned across both modals
- avoid duplicating electricity/water edit UI across table and modal

---

## 8. Summary

Phòng = quản lý
Chốt tháng = thanh toán

The action ownership differs, but the modal UI language must stay unified.
The Chốt tháng table remains the default edit surface for electricity/water, while the modal focuses on bill review and bill actions.