# MoneyFlowOS Rental Business Rules

Tài liệu này là **source of truth về nghiệp vụ** cho module **Cho thuê**.

Mục tiêu:
- tách rõ nghiệp vụ khỏi UI spec và kiến trúc hệ thống
- giúp AI/Codex sửa đúng rule
- tránh trộn business rule vào component/UI một cách ngầm định

---

## 1. Phạm vi module Cho thuê

Module Cho thuê hiện gồm 4 domain chính:

1. **Phòng**
2. **Chốt tháng**
3. **Tiền cọc**
4. **Chi phí khác / Mẫu hóa đơn**

Mỗi domain có trách nhiệm riêng và không được ôm nghiệp vụ của domain khác.

---

## 2. Domain ownership

## 2.1 Phòng

Tab **Phòng** quản lý:

- danh sách phòng
- trạng thái phòng hiện tại
- người thuê hiện tại của phòng
- giá thuê
- thao tác thêm phòng / sửa phòng
- thao tác gán người thuê / trả phòng
- chỉ hiển thị **tiền cọc hiện tại** nếu đó là cọc active của người thuê đang ở phòng

Tab Phòng **không** là nơi xử lý:

- quyết toán cọc
- lịch sử cọc
- hoàn cọc
- quản lý các khoản cọc chờ quyết toán
- thao tác thu tiền bill

---

## 2.2 Chốt tháng

Tab **Chốt tháng** quản lý:

- bill theo kỳ
- chỉ số điện / nước
- xác nhận bill
- thu tiền
- trạng thái bill
- lịch sử thanh toán theo bill

Tab Chốt tháng **không** quản lý:

- vòng đời người thuê
- trả phòng
- quyết toán cọc
- trạng thái phòng

---

## 2.3 Tiền cọc

Tab **Tiền cọc** quản lý tiền cọc **theo người thuê**.

Tiền cọc:
- phát sinh khi tạo/gán người thuê vào phòng
- có thể tồn tại tiếp ngay cả khi người thuê đã trả phòng
- có vòng đời riêng, tách khỏi vòng đời occupancy của phòng

Tab Tiền cọc quản lý:

- danh sách khoản cọc
- trạng thái cọc
- lịch sử giao dịch cọc
- các khoản cọc chờ quyết toán
- các khoản cọc đã quyết toán

Tab Tiền cọc **không** quản lý:

- bill hàng tháng
- chỉ số điện nước
- trạng thái occupancy hiện tại của phòng

---

## 2.4 Chi phí khác / Mẫu hóa đơn

Nhóm này quản lý:

- cấu hình chi phí dùng chung
- cấu hình mẫu hóa đơn / thông tin thanh toán
- dữ liệu cấu hình phục vụ bill/invoice

Nhóm này không quản lý:

- occupancy
- trả phòng
- quyết toán cọc
- thanh toán bill cụ thể theo từng giao dịch

---

## 3. Lifecycle tách biệt

## 3.1 Room lifecycle

Room lifecycle phản ánh tình trạng sử dụng phòng.

Các trạng thái nghiệp vụ chính ở mức logic:

- phòng trống
- phòng đang có người thuê
- phòng có thể phát sinh công nợ bill

Room lifecycle phục vụ:
- quản lý occupancy
- gán / gỡ người thuê
- hiển thị trạng thái phòng hiện tại

Room lifecycle **không đồng nhất** với deposit lifecycle.

---

## 3.2 Deposit lifecycle

Deposit lifecycle phản ánh trạng thái của khoản cọc.

Hiện tại dùng các status:

- `active`
- `pending_settlement`
- `settled`

Ý nghĩa:

### `active`
- người thuê vẫn đang ở phòng
- khoản cọc đang được giữ như khoản cọc hiện tại

### `pending_settlement`
- người thuê đã trả phòng
- khoản cọc chưa quyết toán xong
- phòng đã có thể được giải phóng cho người thuê mới
- khoản cọc lúc này thuộc domain **Tiền cọc**, không còn thuộc workflow hiện tại của tab Phòng

### `settled`
- khoản cọc đã xử lý xong
- không còn là cọc đang chờ nghiệp vụ tiếp theo

---

## 3.3 Bill lifecycle

Bill lifecycle phản ánh trạng thái hóa đơn tháng.

Các status hiện tại thuộc domain Chốt tháng.

Bill lifecycle phục vụ:
- xác nhận bill
- thu tiền
- theo dõi đã thu / còn thiếu

Bill lifecycle không quyết định trực tiếp deposit lifecycle, trừ khi sau này có nghiệp vụ quyết toán kết hợp.

---

## 4. Quy tắc nghiệp vụ hiện tại

## 4.1 Thêm người thuê mới vào phòng

Khi gán người thuê mới vào phòng:

- phòng chuyển sang trạng thái có người thuê
- tạo thông tin người thuê
- có thể tạo tiền cọc ban đầu
- nếu tạo cọc thì cọc mới có status `active`
- khi tạo deposit mới phải tạo transaction `create`

---

## 4.2 Cọc ban đầu

Một khoản cọc mới:

- gắn với `tenant_id`
- gắn với `room_id`
- có `amount`
- có status ban đầu là `active`

Deposit transaction history hiện tại theo hướng đơn giản chỉ cần support:
- `create`
- `refund`

---

## 4.3 Trả phòng

Khi người thuê trả phòng:

- được phép gỡ người thuê khỏi phòng ngay cả khi cọc chưa quyết toán
- phòng phải được giải phóng ngay để phục vụ occupancy workflow
- khoản cọc **không bị xoá**
- khoản cọc chuyển từ:
  - `active`
  - sang `pending_settlement`
- `vacated_at` được set
- việc quyết toán cọc để xử lý sau trong tab **Tiền cọc**

Tab Phòng chỉ thực hiện:
- trả phòng
- giải phóng room
- chuyển cọc sang trạng thái chờ quyết toán

Tab Phòng **không** thực hiện:
- hoàn cọc
- quyết toán cọc
- xử lý lịch sử cọc

---

## 4.4 Rule hiển thị cọc ở tab Phòng

Trong tab Phòng / Room modal:

- chỉ hiển thị **cọc active hiện tại**
- cọc phải đúng với **người thuê hiện đang ở phòng**
- không hiển thị lại cọc cũ có status:
  - `pending_settlement`
  - `settled`

Nếu phòng không có active deposit hiện tại:
- `Đã cọc = —`
- `Trạng thái = —`

Room modal chỉ hiển thị tối thiểu:
- Đã cọc
- Trạng thái

Room modal không hiển thị:
- lịch sử cọc
- giao dịch cọc
- chi tiết quyết toán cọc

---

## 4.5 Rule của tab Tiền cọc

Tab Tiền cọc là nơi hiển thị đầy đủ các khoản cọc với status:

- `active`
- `pending_settlement`
- `settled`

Tab này là owner của:
- cọc đang giữ
- cọc chờ quyết toán
- cọc đã quyết toán
- lịch sử giao dịch cọc

Tab Tiền cọc phải tiếp tục nhìn thấy khoản cọc ngay cả khi:
- người thuê đã rời phòng
- phòng đã được gán cho người thuê khác

---

## 4.6 Rule của Chốt tháng

Tab Chốt tháng chỉ xử lý:
- bill
- thanh toán bill
- điện nước
- trạng thái bill

Tab Chốt tháng hiện không quyết toán cọc.

---

## 5. Current UI-level business mapping

## 5.1 Tab order hiện tại

Thứ tự tab nghiệp vụ hiện tại:

- Tổng quan
- Phòng
- Chốt tháng
- Tiền cọc
- Chi phí khác
- Mẫu hóa đơn
- Báo cáo

---

## 5.2 Ý nghĩa tab

- **Phòng** = quản lý occupancy hiện tại
- **Chốt tháng** = billing & payment
- **Tiền cọc** = deposit lifecycle theo người thuê
- **Chi phí khác / Mẫu hóa đơn** = cấu hình

---

## 6. Dữ liệu cốt lõi

## 6.1 Deposit snapshot

`rental_deposits` hiện là snapshot hiện tại của khoản cọc, gồm các field quan trọng như:

- `tenant_id`
- `room_id`
- `amount`
- `status`
- `collected_at`
- `vacated_at`
- `settled_at`
- `settlement_note`

---

## 6.2 Deposit transaction history

`rental_deposit_transactions` là lịch sử giao dịch cọc.

Hiện tại business flow đơn giản hóa về:
- `create`
- `refund`

Transaction history là nền cho:
- audit
- hiển thị timeline
- quyết toán về sau

---

## 7. Những thứ chưa làm ở giai đoạn hiện tại

Các nghiệp vụ sau **chưa phải source of truth hiện tại**:

- settlement workflow đầy đủ
- checkout workflow hoàn chỉnh
- tự động trừ bill vào cọc
- giữ lại cọc theo hư hỏng
- partial settlement phức tạp
- automation đa bước khi trả phòng

Nếu triển khai các phần này sau, phải update file này.

---

## 8. Anti-rules

Không làm các kiểu sau:

- dùng tab Phòng để quản lý full deposit lifecycle
- hiển thị cọc `pending_settlement` như cọc hiện tại của phòng
- dùng tab Chốt tháng để quyết toán cọc
- xoá deposit khi người thuê trả phòng
- đồng nhất room lifecycle với deposit lifecycle
- coi UI state là source of truth của nghiệp vụ

---

## 9. Quy tắc update docs

Khi có thay đổi ở một trong các nghiệp vụ sau, phải update file này:

- room checkout / trả phòng
- deposit status lifecycle
- deposit transaction types
- settlement flow
- tab/domain ownership
- rule chuyển đổi giữa Phòng và Tiền cọc

---

## 10. Tài liệu liên quan

- `docs/database-contract.md`
- `docs/system-architecture.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`
