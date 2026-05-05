# MoneyFlowOS Rental Handover Note

Project: MoneyFlowOS (rental module)

Current focus:
- Chốt tháng modal UI/UX refactor
- numeric input system (IME-safe + money formatting)

==================================================
UI/UX DIRECTION
==================================================

Layout:
- LEFT = full read-only bill summary
- RIGHT = workflow panel

LEFT SIDE (must always contain):
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
- read-only only
- no inputs
- no inline "Sửa"

--------------------------------------------------

RIGHT SIDE = 3 sections

1. Nhập điện nước
- ONLY when bill = null / draft
- hidden for confirmed / partial_paid / paid / cancelled
- default read-only
- click "Sửa" → editable

2. Thu tiền
- Đã thu
- Còn thiếu
- Số tiền thu
- Phương thức
- Ghi nhận

3. Hành động khác
- Đánh dấu đã thu đủ
- Xuất PDF

Panel rule:
- left and right must have equal height

==================================================
VALIDATION RULE
==================================================

Digits-only fields:
- điện
- nước
- SĐT

Money fields:
- giá thuê
- tiền cọc
- số tiền thu
- use formatMoneyInput / parseMoneyInput

IME rule:
- must work with Vietnamese keyboard

==================================================
WORKFLOW RULE
==================================================

ChatGPT:
- design logic
- write Codex prompts
- review PRs

User:
- run Codex
- run SQL
- verify UI

Codex:
- implement exactly per prompt
- no guessing

Supabase:
- only modified via explicit SQL

==================================================
PROMPT RULE
==================================================

Every prompt must:
- be explicit
- define scope
- define what NOT to change

==================================================
CURRENT STATE
==================================================

- PR45 rejected (bad UX)
- PR46 merged (numeric + money input fixed)
- next step: refine Chốt tháng right panel UI

==================================================
HANDOVER
==================================================

Confirm you understand this context before continuing.
