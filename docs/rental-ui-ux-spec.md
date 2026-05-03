# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the **Cho thuê** module.

---

## 1. Core UX principle

The rental module should feel like one system.

---

## 2. Top-level navigation (NEW)

The rental module must use ONE flattened top-level tab bar.

Required top-level tabs in this exact order:
- Tổng quan
- Phòng
- Chốt tháng
- Chi phí khác
- Mẫu hóa đơn
- Báo cáo

Rules:
- do NOT keep a top-level `Cài đặt` tab
- do NOT keep a second nested tab bar for rental settings pages
- `Chi phí khác` and `Mẫu hóa đơn` must live at the same level as `Phòng` and `Chốt tháng`
- the rental module should not require an extra container/settings layer before users reach those screens

Responsibility mapping:
- `Tổng quan`: overview / summary
- `Phòng`: room management, tenant management, rent editing
- `Chốt tháng`: readings, bill confirmation, payment actions
- `Chi phí khác`: extra cost settings, fixed recurring charges, non-rent cost rules
- `Mẫu hóa đơn`: invoice template, payment display info, bank/QR display, invoice presentation settings
- `Báo cáo`: reporting

Forbidden:
- `Phòng & giá` as a separate navigation destination
- `Thanh toán & hóa đơn` as a nested tab label under a rental settings screen
- a visible second segmented control for rental settings in the normal rental flow

---

## 3. Shared modal system (UPDATED)

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

## 4. Tab Phòng

### 4.1 Header UX

Phòng detail modal must use a sticky header:
- left: room name
- right: close button
- header has its own background
- header has bottom border

Close button:
- larger click area
- neutral light-gray background
- not destructive (not red)

### 4.2 Header content

Use the same compact header style family as Chốt tháng, but with Phòng-specific content:
- `Phòng 201 • Tên người thuê • Số điện thoại`

Rules:
- room name is visually strongest
- tenant name and phone are lighter secondary text
- one-line layout
- compact sticky header

---

### 4.3 Tenant edit UX

When editing tenant:
- Must edit directly inside Khách thuê section
- Must show labels (NOT placeholder-only):
  - Họ tên
  - Số điện thoại
  - Địa chỉ

---

### 4.4 Thông tin phòng

Must match Khách thuê UI pattern:
- same section title
- same padding
- label-left / value-right rows

Forbidden:
- nested box layout

---

### 4.5 Tenant action rules

Room-level guard:
- unpaid bill → disable change/remove tenant

Tenant-level guard:
- tenant with unpaid bill → cannot be assigned

---

### 4.6 Bill section

Title format:
- Hóa đơn tháng MM/YYYY

Status badge:
- draft → Nháp
- confirmed/partial_paid → Chưa thu
- paid → Đã thu

If no bill:
- show "Chưa có hóa đơn"

---

### 4.7 Bill actions

Phòng tab is VIEW ONLY for billing.

Forbidden:
- payment actions
- confirm bill actions

Use navigation button:
- "Thông tin hoá đơn"

---

### 4.8 Navigation to Chốt tháng

Click "Thông tin hoá đơn":
- close Phòng modal
- switch to Chốt tháng
- open SAME room + SAME cycle detail

Fallback:
- still switch tab
- highlight correct room

---

### 4.9 Form consistency rule

All forms:
- label + input pattern

---

## 5. Tab Chốt tháng (UPDATED)

### 5.1 Shared shell consistency

Chốt tháng detail modal must match Phòng detail modal in:
- sticky header structure
- close button style
- section card styling
- label/value row styling
- overall spacing rhythm
- right-side sticky action panel concept on desktop

### 5.2 Header content

Use a compact one-line header in this format:
- `Phòng 201 • Tên người thuê • Hóa đơn tháng 05/2026 • [Nháp]`

Rules:
- room name is visually strongest
- tenant + bill month are lighter secondary text
- status is shown as a badge/chip
- keep header compact/smaller in height
- keep only one close button

### 5.3 Left column structure

Required section order:
1. Tổng hợp hóa đơn

Do NOT keep a separate top `Thông tin phòng` block.
Do NOT keep a separate `Chi tiết hóa đơn` block above if it duplicates edit behavior already available in the table.

### 5.4 Edit surface rule (IMPORTANT)

The monthly table is the primary edit surface for electricity/water input.

Therefore, the Chốt tháng detail modal must NOT duplicate a second primary edit surface for the same values.

Rules:
- do not keep editable electricity/water inputs both in the table and in the modal by default
- the modal should primarily review bill details and support bill actions
- if a future explicit edit mode is ever added, it must be intentional and secondary, not the default state

### 5.5 Tổng hợp hóa đơn section

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
- electricity and water rows must be visually grouped clearly inside the summary so users can immediately distinguish the 2 blocks

### 5.6 Right action panel

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

## 6. Button hierarchy

- Primary: main action
- Secondary: normal actions
- Destructive: red actions
- Utility: light actions

Additional rule:
- Phòng uses navigation instead of payment execution
- Chốt tháng owns payment execution
- both tabs must still use the same visual button system

---

## 7. Anti-patterns

Avoid:
- stale UI
- invalid tenant assignment
- payment actions in Phòng
- two modals in the same module feeling like different products
- duplicate close buttons
- blank modal shells
- duplicate edit surfaces for the same electricity/water fields
- nested card-inside-card bill edit UI in Chốt tháng
- extra navigation depth caused by a rental `Cài đặt` container tab
- a separate `Phòng & giá` destination when rent editing already belongs to `Phòng`

---

## 8. AI UI rules

AI must:
- keep payment in Chốt tháng
- use navigation instead of direct payment in Phòng
- preserve shared modal shell consistency across Phòng and Chốt tháng
- keep section cards and row patterns aligned across both modals
- avoid duplicating electricity/water edit UI across table and modal
- preserve the flattened top-level rental navigation with no nested settings bar in the normal rental flow

---

## 9. Summary

Phòng = quản lý
Chốt tháng = thanh toán

The action ownership differs, but the modal UI language must stay unified.
The Chốt tháng table remains the default edit surface for electricity/water, while the modal focuses on bill review and bill actions.
The rental workspace must use one flat top-level navigation row: Tổng quan, Phòng, Chốt tháng, Chi phí khác, Mẫu hóa đơn, Báo cáo.