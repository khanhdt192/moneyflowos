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

## 4. Tab Chốt tháng (NEW)

### 4.1 Shared shell consistency

Chốt tháng detail modal must match Phòng detail modal in:
- sticky header structure
- close button style
- section card styling
- label/value row styling
- overall spacing rhythm
- right-side sticky action panel concept on desktop

### 4.2 Header content

Recommended structure:
- title: room name
- supporting bill context shown directly below or near the title:
  - Hóa đơn tháng MM/YYYY

Do not use a completely different header style from Phòng.

### 4.3 Left column structure

Required section order:
1. Thông tin bill / phòng / khách thuê
2. Nhập chỉ số
3. Chi tiết bill

These sections must use the same visual section family as Phòng.

### 4.4 Nhập chỉ số

Do not use floating raw inputs.

Required grouping:
- Nhập điện
  - Số đầu điện
  - Số cuối điện
- Nhập nước
  - Nước (m³)

If tầng 1 uses fixed electricity:
- show explicit helper text
- do not make the field look broken or missing

### 4.5 Bill detail section

This section should use the same label-left / value-right row pattern as other data sections.

Preferred rows:
- Tiền thuê
- Điện
- Nước
- Wifi
- Vệ sinh
- Phụ phí
- Tổng cộng
- Đã thu
- Còn thiếu
- Trạng thái bill

### 4.6 Right action panel

The Chốt tháng right column should stay visually aligned with Phòng's right column.

Allowed action types:
- primary: Thu tiền or Chốt bill depending on state
- secondary: the remaining normal bill action
- utility: PDF, Đóng

Forbidden:
- duplicated primary actions
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

---

## 7. AI UI rules

AI must:
- keep payment in Chốt tháng
- use navigation instead of direct payment in Phòng
- preserve shared modal shell consistency across Phòng and Chốt tháng
- keep section cards and row patterns aligned across both modals

---

## 8. Summary

Phòng = quản lý
Chốt tháng = thanh toán

The action ownership differs, but the modal UI language must stay unified.