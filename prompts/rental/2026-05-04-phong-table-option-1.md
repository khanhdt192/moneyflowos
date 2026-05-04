# Phòng table Option 1 cleanup

## Scope

Patch only this file:

- `src/components/rental/tabs/Phong.tsx`

## Do not change

- Do not change schema.
- Do not change billing logic.
- Do not update docs.
- Do not modify room modal behavior.
- Do not modify tenant management behavior.

## Context

The `Phòng` tab should focus on room inventory and tenant overview.

The table currently mixes room management with monthly billing details. It shows too many finance columns:

- `Tổng bill`
- `Thanh toán`
- `Nợ`

The product decision is to simplify the `Phòng` table using Option 1:

```text
Phòng | Khách thuê | Giá thuê | Công nợ | Trạng thái
```

Billing execution and detailed bill amounts belong in the `Chốt tháng` tab.

## Required changes

### 1. Update table headers

In `src/components/rental/tabs/Phong.tsx`, find the main room table header.

Current headers include:

- `Phòng`
- `Khách thuê`
- `Giá thuê`
- `Tổng bill`
- `Thanh toán`
- `Nợ`
- `Trạng thái`
- empty action/chevron column

Change them to exactly:

- `Phòng`
- `Khách thuê`
- `Giá thuê`
- `Công nợ`
- `Trạng thái`
- empty action/chevron column

### 2. Remove `Tổng bill` column

Remove the whole `Tổng bill` table cell from each room row.

Do not remove bill lookup logic if it is still needed to calculate debt/current balance.

### 3. Remove `Thanh toán` column

Remove the whole `Thanh toán` table cell from each room row.

Do not show paid amount in the `Phòng` table anymore.

### 4. Rename and keep debt as `Công nợ`

Keep a single balance/debt column named:

- `Công nợ`

Display rules:

- if room is empty: show `—`
- if no bill exists for current cycle: show `—`
- if debt > 0: show debt amount in red, semibold
- if debt === 0 and there is a bill: show `Không nợ` or `0đ` in green

Preferred display:

- debt > 0: `5.340.000đ`
- debt === 0 with bill: `Không nợ`
- no bill: `—`

### 5. Keep room cell pattern

Keep the current room cell pattern:

- Home icon in muted rounded square
- room name left aligned

Do not change room modal opening behavior.

### 6. Keep tenant cell pattern

Keep current tenant cell pattern:

- tenant full name
- phone underneath
- `—` when no tenant

### 7. Keep status badge

Keep status badge logic using:

- `Đang thuê`
- `Trống`
- `Nợ tiền`

Do not change `getRoomStatus` logic unless required by removed columns.

### 8. Update colSpan for empty state

The table now has 6 columns:

1. Phòng
2. Khách thuê
3. Giá thuê
4. Công nợ
5. Trạng thái
6. empty chevron/action column

Update the empty state row `colSpan` accordingly.

### 9. Keep hover row UI

Keep the existing row click behavior and hover style.

If the row already has the shared hover accent from recent patches, keep it.

Do not add persistent selected row state.

## Expected result

The `Phòng` table should show only:

```text
Phòng | Khách thuê | Giá thuê | Công nợ | Trạng thái | >
```

The table should no longer show:

- `Tổng bill`
- `Thanh toán`

## Manual test

1. Open tab `Phòng`.
2. Verify the table headers are:
   - `Phòng`
   - `Khách thuê`
   - `Giá thuê`
   - `Công nợ`
   - `Trạng thái`
3. Verify `Tổng bill` is gone.
4. Verify `Thanh toán` is gone.
5. Verify rooms with unpaid bills show red debt amount under `Công nợ`.
6. Verify rooms with fully paid bills show `Không nợ` or green `0đ`.
7. Verify rooms without bill show `—`.
8. Verify clicking a room row still opens the room detail modal.
9. Verify tenant actions inside the room modal still work.