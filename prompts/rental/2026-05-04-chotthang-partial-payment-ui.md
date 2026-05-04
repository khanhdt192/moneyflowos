# Chốt tháng partial payment UI cleanup

## Scope

Patch only this file:

- `src/components/rental/tabs/ChotThang.tsx`

## Do not change

- Do not change schema.
- Do not change billing logic.
- Do not update docs.
- Do not modify unrelated modal sections.

## Context

In the bill detail modal, the `Thu tiền một phần` card currently has a layout issue:

- The `Ghi chú (tùy chọn)` input is too long and causes layout overflow.
- The `Ghi nhận` button is too small and placed awkwardly beside the amount input.
- The payment method select is on a separate row, making the form feel uneven.

## Required changes

### 1. Remove note input

Remove the visible `Ghi chú (tùy chọn)` input from the partial payment form.

Rules:

- Do not render the note input in the UI.
- If `payNote` state still exists elsewhere, leave it alone unless it becomes unused.
- When recording partial payment, pass `undefined` or an empty note as currently safe.

### 2. Align amount input and payment method select

Layout the first row as two columns:

- left: `Số tiền thu` input
- right: payment method select, currently showing `Tiền mặt`

Rules:

- They should sit on the same row on desktop.
- On narrow screens, stacking is acceptable if the current responsive layout already handles it.

### 3. Move `Ghi nhận` button below

Move the `Ghi nhận` button to its own row below the amount input and payment method select.

Button requirements:

- Full width.
- Black or dark background.
- White text.
- Rounded corners.
- Height similar to the `Đánh dấu đã thu đủ` primary button.

### 4. Keep card title

Keep the card title exactly:

- `Thu tiền một phần`

### 5. Keep existing payment behavior

Do not change payment behavior.

Rules:

- Do not change `handlePay` logic except for note handling if needed.
- Do not change validation.
- Do not change payment method logic.

## Expected UI

The final layout should be:

```text
[ Số tiền thu ]   [ Tiền mặt / Chuyển khoản ]
[                 Ghi nhận                  ]
```

## Manual test

1. Open `Chốt tháng`.
2. Open a confirmed or partially paid bill detail modal.
3. Verify the partial payment card title is `Thu tiền một phần`.
4. Verify `Ghi chú (tùy chọn)` is no longer visible.
5. Verify `Số tiền thu` and payment method select are on the same row on desktop.
6. Verify `Ghi nhận` is full width, dark background, and white text.
7. Verify entering a partial amount and clicking `Ghi nhận` still records payment correctly.