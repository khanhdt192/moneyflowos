# MoneyFlowOS Rental Handover Note

Project: MoneyFlowOS (rental module)

Current focus:
- Refactor Chốt tháng modal (UI/UX + validation)

Status:
- PR 45 has been rejected due to bad UX
- Need to redesign right-side panel cleanly

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
- no inline "Sửa"
- no inputs

--------------------------------------------------

RIGHT SIDE = 3 sections

1. Nhập điện nước
- ONLY show when bill status = null / draft
- HIDE completely when:
  - confirmed
  - partial_paid
  - paid
  - cancelled

- Default: read-only
- Click "Sửa" → editable
- Save / Cancel

2. Thu tiền
- show when bill supports payment
- includes:
  - Đã thu
  - Còn thiếu
  - Số tiền thu
  - Phương thức
  - Ghi nhận

3. Hành động khác
- Đánh dấu đã thu đủ
- Xuất PDF
- must be separate from payment

--------------------------------------------------

Panel rule:
- Left and right must have equal visual height

==================================================
VALIDATION RULE
==================================================

All numeric inputs:
- digits only
- no letters
- no special characters
- no +, -, e, E
- must handle IME (Mac Vietnamese keyboard)

Use:
- type="text"
- inputMode="numeric"
- sanitizeDigitsInput(value.replace(/\\D/g, ""))

Fields:
- điện, nước
- tiền thuê
- tiền cọc
- số tiền thu
- SĐT

==================================================
WORKFLOW RULE (IMPORTANT)
==================================================

You (ChatGPT):
- design logic
- write Codex prompts
- review PRs

User:
- run Codex
- run SQL on Supabase
- verify UI

Codex:
- implement code changes
- follow prompt strictly
- do not invent logic

Supabase:
- only changed via explicit SQL
- never auto-modified

==================================================
CODEX PROMPT FORMAT (MANDATORY)
==================================================

Every prompt must follow:

1. Read these files first:
- docs/database-contract.md
- docs/moneyflowos-ai-rules.md
- docs/rental-ui-ux-spec.md
- docs/rental-validation-rules.md

2. IMPORTANT section:
- no schema change
- no business logic change
- no docs update

3. Clear sections:
- GOAL
- CURRENT PROBLEM
- REQUIRED FIX
- RULES
- SCOPE
- EXPECTED RESULT

4. No vague wording:
- no "improve UI"
- must specify exact behavior

5. Always state:
- what to change
- what NOT to change

==================================================
CURRENT ISSUE
==================================================

- Need to redesign ChotThang modal right panel
- Fix IME numeric input bug (Mac Vietnamese keyboard)
- Ensure validation is robust

==================================================
HANDOVER INSTRUCTION
==================================================

Confirm you understand this context before continuing.
