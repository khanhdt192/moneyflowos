# MoneyFlowOS Rental UI/UX Spec

This document is the UI/UX source of truth for the **Cho thuê** module.

---

## 4.10 Deposit (Phase 1)

In tab Phòng:

Display:
- show a "Tiền cọc" section in room modal
- show amount and status if active deposit exists
- show "—" if no deposit

Input:
- when adding tenant (new or existing):
  - must input deposit
  - default = 1 month rent
  - user can edit

Behavior:
- if active deposit exists:
  - disable change tenant
  - disable remove tenant

Restrictions (Phase 1):
- no refund button
- no settlement action
- deposit is read-only once created

---

(remaining content unchanged)
