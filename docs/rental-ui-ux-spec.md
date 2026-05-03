# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the **Cho thuê** module.

It exists to prevent UI drift between tabs such as **Phòng** and **Chốt tháng**.
If a code change conflicts with this file, follow this file unless the product decision has been intentionally changed.

---

## 1. Scope

This spec currently applies to:
- tab `Phòng`
- tab `Chốt tháng`

It focuses on:
- page layout
- detail interaction pattern
- section structure
- button hierarchy
- action placement
- UI consistency rules

It does **not** define database schema or billing formulas.
Those belong to:
- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`

---

## 2. Core UX principle

The rental module should feel like **one system**, not separate mini-apps.

For similar entities such as a room, both tabs must follow the same interaction pattern:

- scan in a table
- click a row
- open a centered detail modal
- perform deeper actions inside that modal

Forbidden inconsistency:
- one tab uses right drawer while another uses inline expansion for the same kind of detail flow
- one tab edits inline while another jumps to detached sub-layouts for equivalent actions

---

## 3. Shared desktop pattern

### 3.1 List pattern
Both tabs should keep a compact table for scanning.

Rules:
- table is the overview layer
- modal is the detail/action layer
- rows should feel clickable
- selected row should have stronger visual feedback than normal hover
- row helper text may be used when helpful, e.g. `Click để xem chi tiết`

### 3.2 Modal pattern
Both tabs should use a centered rectangular modal.

Recommended desktop behavior:
- width: about `960px` to `1100px`
- max height: about `80vh` to `90vh`
- backdrop dimmed
- rounded corners
- body scroll inside modal, not full page scroll if possible

### 3.3 Modal structure
Preferred structure:
- header
- body
- footer or sticky action area

Rules:
- header should contain title and only essential top-level controls
- body should contain section cards
- main actions must be visible early, not buried below long content

---

## 4. Button hierarchy system

All rental UI should reuse one button system.

### 4.1 Primary button
Use for the single most important action in the current state.

Examples:
- `Thu tiền`
- `Lưu`
- `Lưu thay đổi`

Style:
- filled / high emphasis
- only one clearly dominant primary action per modal state

### 4.2 Secondary button
Use for normal actions that matter but are not the main action.

Examples:
- `Sửa phòng`
- `Sửa người thuê`
- `Đổi người thuê`
- `Chốt bill`

Style:
- outline or light background
- lower emphasis than primary

### 4.3 Destructive button
Use only for risky or destructive actions.

Examples:
- `Xóa người thuê khỏi phòng`
- `Xóa phòng`
- `Đánh dấu phòng trống` only if it behaves as a disruptive status action

Style:
- red border/text or destructive emphasis
- must not visually compete with primary action

### 4.4 Utility button
Use for support actions.

Examples:
- `PDF`
- `Đóng`
- `Hủy`

Style:
- light / small / low emphasis

### 4.5 Forbidden button patterns
- duplicate actions with the same meaning in the same modal
- two primary buttons competing visually in one state
- utility action styled like a primary action
- destructive action visually stronger than the main business action unless intentional

---

## 5. Tab `Phòng`

### 5.1 Purpose
This tab is for:
- room overview
- tenant overview
- room/tenant maintenance
- quick visibility into current month bill state

### 5.2 Table columns
The table should stay compact and scan-friendly.

Preferred columns:
- `Phòng`
- `Khách thuê`
- `Giá thuê`
- `Tổng bill`
- `Thanh toán` or `Đã thu`
- `Nợ` or `Còn thiếu`
- `Trạng thái`

Rules:
- detailed edit UI must not live inside the table
- row click opens room detail modal

### 5.3 Room detail modal layout
Preferred desktop layout:
- 2 columns

#### Left column
Use for information sections:
1. `Thông tin phòng`
2. `Khách thuê`
3. `Hóa đơn tháng này`

#### Right column
Use for `Thao tác nhanh`.

Important rule:
- the user must see key actions immediately after opening the modal
- actions must not be hidden below the fold in normal desktop usage

### 5.4 Room info editing
When clicking `Sửa phòng`:
- edit directly inside the existing `Thông tin phòng` section
- do not replace the whole modal with a new edit screen
- do not open a detached mini form below unrelated sections

Editable fields:
- `Tên phòng`
- `Giá thuê`

Actions for room inline edit:
- `Hủy`
- `Lưu`

### 5.5 Tenant section editing
When clicking `Sửa người thuê`:
- edit directly inside the `Khách thuê` section
- do not open a detached form block below the section

When there is no tenant:
- `Thêm người thuê` should also work directly inside the `Khách thuê` section

Editable fields:
- `Họ tên`
- `Số điện thoại`
- `Địa chỉ`

Actions for tenant inline edit/create:
- `Hủy`
- `Lưu`

### 5.6 Tenant change flow
`Đổi người thuê` may use a select/input inside the `Khách thuê` section.

Rule:
- it should stay visually grouped with tenant information
- it should not look like a random detached form elsewhere in the modal

### 5.7 Room status action rule
Room status UI must stay consistent with the actual visible source of truth.

Practical rule for current app:
- if visible room occupancy is derived from tenant relation, then status action must not behave as a blind `occupied` toggle
- do not allow UI to show `Đang thuê` while a just-clicked action implies the room is now empty

### 5.8 Current month bill section
The `Hóa đơn tháng này` section should show a compact financial summary only.

Preferred rows:
- `Tiền thuê`
- `Tiền điện`
- `Nước`
- `Wifi`
- `Vệ sinh`
- `Tổng`
- `Đã thu`
- `Còn thiếu`

Rule:
- this section is informational
- primary maintenance actions belong in `Thao tác nhanh`, not mixed into the bill card

---

## 6. Tab `Chốt tháng`

### 6.1 Purpose
This tab is for:
- monthly readings
- draft bill review
- bill confirmation
- payment collection
- PDF export

### 6.2 Table columns
Preferred compact columns:
- `Phòng`
- `Khách thuê`
- `Số đầu`
- `Số cuối`
- `Nước`
- `Tổng bill`
- `Trạng thái`
- `Thao tác`

Rule:
- the table is only for scanning and quick cues
- deep work happens in the modal

### 6.3 Chốt tháng modal structure
Preferred content order:
1. summary block
2. input block
3. bill breakdown
4. payment block / action block

### 6.4 Input section must be explicit
Do not show 3 unlabeled floating inputs.

Required grouping:
- section title: `Nhập chỉ số`

Inside that section:
- subgroup `Nhập điện`
  - `Số đầu điện`
  - `Số cuối điện`
  - optional helper row for consumption
- subgroup `Nhập nước`
  - `Nước (m³)`

### 6.5 Tầng 1 rule
For rooms where electricity is fixed:
- do not make electricity look like broken or missing input
- show explicit helper text, e.g. `Điện tầng 1 tính cố định`

### 6.6 Bill action hierarchy
Recommended hierarchy:
- primary:
  - `Thu tiền` if payable
  - otherwise `Chốt bill` if draft and confirmable
- secondary:
  - `Chốt bill` only when it is not already the primary action
- utility:
  - `PDF`
  - `Đóng`

Forbidden:
- rendering two `Chốt bill` buttons with different emphasis in the same state
- making `PDF` look as important as the main business action

### 6.7 Bill breakdown section
This section should list the monetary components clearly.

Preferred rows:
- `Tiền thuê`
- `Điện`
- `Nước`
- `Wifi`
- `Vệ sinh`
- `Phụ phí` if present
- `Tổng cộng`

### 6.8 Payment section
Payment UI should appear only when relevant.

If payment is allowed:
- show `Đã thu`
- show `Còn thiếu`
- show payment input/actions clearly

Rule:
- payment section must not visually compete with the reading input section
- payment collection is downstream of reading/bill state

---

## 7. Action placement rules

### 7.1 Main actions must be visible early
Do not place the most important actions so low that users must scroll before discovering them.

This is especially important for:
- room maintenance actions in tab `Phòng`
- bill/payment actions in tab `Chốt tháng`

### 7.2 Sticky action panel is allowed
For desktop modal layouts, a right-side sticky action panel is acceptable and recommended when the content column is long.

### 7.3 Do not scatter actions
Avoid distributing related actions across:
- header
- middle of content
- bottom of modal

unless each placement has a clear role.

---

## 8. Consistency rules

### 8.1 Similar actions should appear in similar places
Examples:
- edit room -> action panel
- edit tenant -> action panel, form inline in tenant section
- confirm bill -> action area in Chốt tháng modal

### 8.2 Similar cards should look similar
`Thông tin phòng`, `Khách thuê`, `Hóa đơn tháng này`, `Nhập chỉ số` should all use one family of section styling.

### 8.3 Similar statuses should look similar
Status chips should keep consistent colors and meaning across both tabs.

### 8.4 Avoid detached surprise forms
Do not open forms in unexpected places after clicking an action.

Examples of bad UX:
- click `Sửa người thuê` and a new block appears far below current context
- click `Sửa phòng` and whole modal switches to a disconnected edit state

---

## 9. Known anti-patterns

Avoid these in the rental module:
- duplicate edit actions for the same purpose in one modal
- detached form blocks unrelated to the clicked section
- action buttons hidden too low in the modal
- 3 plain inputs without clear semantic grouping
- using a modal for one tab and drawer/inline expansion for another equivalent tab
- stale modal data after mutation when the main list/store has already updated

---

## 10. AI implementation rules for UI tasks

When AI changes rental UI:
1. keep `database-contract.md` as data source of truth
2. keep business logic untouched unless task explicitly says otherwise
3. follow this UI spec for structure and hierarchy
4. do not invent a new interaction pattern if one is already defined here
5. prefer patching existing layout toward this spec instead of redesigning freely

---

## 11. When this file must be updated

Update this file when:
- the module changes from modal to another official detail pattern
- button hierarchy changes intentionally
- action placement rules change intentionally
- tab `Phòng` or `Chốt tháng` gets a new official section structure
- mobile-specific behavior is formally defined

No update needed for:
- minor spacing tweaks
- typography polish
- color tuning without structural UX changes
