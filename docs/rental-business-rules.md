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
- chỉ hiển thị **tiền cọc hiện tại** của **active occupancy**
- chỉ hiển thị **hóa đơn hiện tại** của **active occupancy** trong kỳ đang xem

Tab Phòng **không** là nơi xử lý:

- quyết toán cọc
- lịch sử cọc
- hoàn cọc
- quản lý các khoản cọc chờ quyết toán
- thao tác thu tiền bill
- quản lý toàn bộ billing history

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

Tab Chốt tháng hiện phải resolve bill theo:
- **active occupancy + billing cycle**

không còn coi `room + cycle` là bill identity đủ dùng cho current workflow nữa.

---

## 2.3 Tiền cọc

Tab **Tiền cọc** quản lý tiền cọc **theo người thuê / theo occupancy**.

Tiền cọc:
- phát sinh khi tạo/gán người thuê vào phòng
- thuộc về một **occupancy cụ thể**
- có thể tồn tại tiếp ngay cả khi người thuê đã trả phòng
- có vòng đời riêng, tách khỏi vòng đời billing của phòng

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
- offset công nợ bill

---

## 2.4 Chi phí khác / Mẫu hóa đơn

Nhóm này quản lý:

- cấu hình chi phí dùng chung
- cấu hình mẫu hóa đơn / thông tin thanh toán
- dữ liệu cấu hình phục vụ bill/invoice

Nhóm này không quản lý:

- occupancy lifecycle
- trả phòng
- quyết toán cọc
- thanh toán bill cụ thể theo từng giao dịch

---

## 3. Lifecycle tách biệt

## 3.1 Room lifecycle

Room lifecycle phản ánh tình trạng sử dụng phòng ở mức hiện tại.

Các trạng thái nghiệp vụ chính ở mức logic:

- phòng trống
- phòng đang có người thuê
- phòng có thể phát sinh công nợ bill

Room lifecycle phục vụ:
- quản lý room master data
- hiển thị trạng thái phòng hiện tại
- gắn / gỡ người thuê hiện tại

Room lifecycle **không đồng nhất** với deposit lifecycle.
Room lifecycle **cũng không phải canonical stay history** nữa.

---

## 3.2 Occupancy lifecycle

Occupancy lifecycle phản ánh:

> một lần người thuê ở trong một phòng trong một khoảng thời gian cụ thể

Hiện tại dùng các status:

- `active`
- `ended`

Ý nghĩa:

### `active`
- đây là lượt ở hiện tại của người thuê trong phòng
- current room workflow phải resolve qua occupancy này
- deposit hiện tại và bill hiện tại phải gắn với occupancy này

### `ended`
- lượt ở đã kết thúc
- room có thể đã được gán người thuê mới
- historical deposit / bill vẫn thuộc occupancy cũ này

---

## 3.3 Deposit lifecycle

Deposit lifecycle phản ánh trạng thái của khoản cọc.

Hiện tại dùng các status:

- `active`
- `pending_settlement`
- `settled`

Ý nghĩa:

### `active`
- người thuê vẫn đang ở phòng
- khoản cọc đang được giữ như khoản cọc hiện tại của **active occupancy**

### `pending_settlement`
- người thuê đã trả phòng
- occupancy đã có thể ended
- khoản cọc chưa quyết toán xong
- phòng đã có thể được giải phóng cho người thuê mới
- khoản cọc lúc này thuộc domain **Tiền cọc**, không còn thuộc workflow hiện tại của tab Phòng

### `settled`
- khoản cọc đã xử lý xong
- không còn là cọc đang chờ nghiệp vụ tiếp theo

---

## 3.4 Bill lifecycle

Bill lifecycle phản ánh trạng thái hóa đơn tháng.

Các status hiện tại thuộc domain Chốt tháng.

Bill lifecycle phục vụ:
- xác nhận bill
- thu tiền
- theo dõi đã thu / còn thiếu

Current ownership rule:
- bill thuộc về **occupancy + cycle**
- current room workflow phải resolve bill theo **active occupancy + cycle**

Bill lifecycle không quyết định trực tiếp deposit lifecycle, trừ khi sau này có nghiệp vụ quyết toán kết hợp.

---

## 4. Quy tắc nghiệp vụ hiện tại

## 4.1 Thêm người thuê mới vào phòng

Khi gán người thuê mới vào phòng:

- phòng chuyển sang trạng thái có người thuê
- tạo hoặc gán thông tin người thuê
- tạo **active occupancy** mới
- room vẫn đồng bộ `tenant_id` / `occupied` để hỗ trợ UI hiện tại
- có thể tạo tiền cọc ban đầu
- nếu tạo cọc thì cọc mới có status `active`
- khi tạo deposit mới phải tạo transaction `create`
- bill mới về sau phải gắn với occupancy mới này

---

## 4.2 Cọc ban đầu

Một khoản cọc mới:

- gắn với `tenant_id`
- gắn với `room_id`
- gắn với `occupancy_id`
- có `amount`
- có status ban đầu là `active`

Deposit transaction history hiện tại cần support tối thiểu:
- `create`
- `refund`
- `partial_refund`
- `forfeit`

---

## 4.3 Trả phòng

Khi người thuê trả phòng:

- được phép gỡ người thuê khỏi phòng ngay cả khi cọc chưa quyết toán
- khoản cọc **không bị xoá**
- khoản cọc chuyển từ:
  - `active`
  - sang `pending_settlement`
- `vacated_at` được set
- **active occupancy phải được end**
- room phải được giải phóng ngay để phục vụ current room workflow
- việc quyết toán cọc để xử lý sau trong tab **Tiền cọc**

Tab Phòng chỉ thực hiện:
- trả phòng
- end occupancy hiện tại
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
- cọc phải đúng với **active occupancy hiện tại**
- không hiển thị lại cọc cũ có status:
  - `pending_settlement`
  - `settled`
- không lấy cọc chỉ theo `room_id` như source of truth nữa

Nếu phòng không có active occupancy hoặc không có active deposit hiện tại:
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

## 4.5 Rule hiển thị bill ở tab Phòng

Trong tab Phòng / Room modal:

- chỉ hiển thị **bill hiện tại** của **active occupancy** trong kỳ đang xem
- không coi mọi bill có cùng `room + cycle` là bill hiện tại nữa
- bill của occupancy cũ không được leak sang tenant mới chỉ vì cùng phòng và cùng kỳ

Nếu phòng không có active occupancy:
- room workflow không có current bill owner

---

## 4.6 Rule của tab Tiền cọc

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
- occupancy đã ended
- phòng đã được gán cho người thuê khác

### 4.6.1 Quyết toán cọc giai đoạn 2A

Luồng quyết toán hiện tại hỗ trợ thủ công hoàn toàn bộ số tiền còn giữ cho khoản cọc có status `pending_settlement`.

Quy tắc:
- chỉ tab **Tiền cọc** thực hiện luồng này
- không quyết toán cọc `active`
- không trừ cọc vào bill
- không tự động net với công nợ phòng
- khi xác nhận, hệ thống tạo một transaction `refund` bằng đúng `remainingHeld`, sau đó cập nhật deposit thành `settled`, set `settled_at` và lưu `settlement_note`

### 4.6.2 Quyết toán cọc giai đoạn 2B

Luồng tiếp theo hỗ trợ **hoàn một phần** cho khoản cọc có status `pending_settlement`.

Quy tắc:
- chỉ tab **Tiền cọc** thực hiện luồng này
- không quyết toán cọc `active`
- không offset bill
- không tự động net với công nợ phòng
- người dùng nhập `refundAmount`
- hệ thống tính:
  - `forfeitAmount = remainingHeld - refundAmount`
- điều kiện hợp lệ:
  - `refundAmount > 0`
  - `refundAmount < remainingHeld`
  - nếu `refundAmount = remainingHeld` thì phải dùng luồng Phase 2A
- khi xác nhận, hệ thống tạo theo thứ tự:
  - một transaction `partial_refund` = `refundAmount`
  - một transaction `forfeit` = `forfeitAmount`
- sau đó cập nhật deposit thành `settled`, set `settled_at` và lưu `settlement_note`

Ý nghĩa nghiệp vụ:
- phần hoàn lại cho khách được ghi nhận riêng
- phần không hoàn được xem là khoản giữ lại cuối cùng của quyết toán
- sau khi xử lý xong, deposit không còn ở trạng thái `pending_settlement`

---

## 4.7 Rule của Chốt tháng

Tab Chốt tháng chỉ xử lý:
- bill
- thanh toán bill
- điện nước
- trạng thái bill

Tab Chốt tháng hiện không quyết toán cọc.

Current rule:
- nhập điện nước / tạo bill draft phải resolve qua **active occupancy**
- confirm/pay/reset nên target bill theo **bill id** hoặc theo **occupancy-aware identity**, không dùng broad room+cycle mutation cho current workflow

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

- **Phòng** = quản lý current room workflow
- **Chốt tháng** = billing & payment
- **Tiền cọc** = deposit lifecycle theo tenant stay / occupancy
- **Chi phí khác / Mẫu hóa đơn** = cấu hình

---

## 6. Dữ liệu cốt lõi

## 6.1 Occupancy snapshot

`rental_occupancies` là canonical record cho một lần người thuê ở trong một phòng.

Field quan trọng:
- `room_id`
- `tenant_id`
- `status`
- `started_at`
- `ended_at`

---

## 6.2 Deposit snapshot

`rental_deposits` hiện là snapshot hiện tại của khoản cọc, gồm các field quan trọng như:

- `tenant_id`
- `room_id`
- `occupancy_id`
- `amount`
- `status`
- `collected_at`
- `vacated_at`
- `settled_at`
- `settlement_note`

---

## 6.3 Deposit transaction history

`rental_deposit_transactions` là lịch sử giao dịch cọc.

Hiện tại business flow cần support:
- `create`
- `refund`
- `partial_refund`
- `forfeit`

Transaction history là nền cho:
- audit
- hiển thị timeline
- quyết toán về sau

---

## 6.4 Bill snapshot

`rental_room_bills` hiện là snapshot của bill tháng.

Field ownership quan trọng:
- `room_id`
- `cycle_id`
- `occupancy_id`
- `status`
- `total_amount`
- `paid_amount`

Current rule:
- bill identity cho current workflow phải đi theo **occupancy + cycle**

---

## 7. Những thứ chưa làm ở giai đoạn hiện tại

Các nghiệp vụ sau **chưa phải source of truth hiện tại**:

- settlement workflow đầy đủ ngoài Phase 2A / 2B
- offset bill từ tiền cọc
- tự động trừ bill vào cọc
- giữ lại cọc theo nhiều lý do chi tiết/phân loại
- automation đa bước khi trả phòng
- full historical data migration cho toàn bộ dữ liệu cũ trước occupancy rollout

Nếu triển khai các phần này sau, phải update file này.

---

## 8. Anti-rules

Không làm các kiểu sau:

- dùng tab Phòng để quản lý full deposit lifecycle
- hiển thị cọc `pending_settlement` như cọc hiện tại của phòng
- dùng tab Chốt tháng để quyết toán cọc
- offset cọc vào bill trong phase hiện tại
- xoá deposit khi người thuê trả phòng
- đồng nhất room lifecycle với deposit lifecycle
- coi UI state là source of truth của nghiệp vụ
- coi `room_id + cycle_id` là bill identity đủ dùng cho current room workflow
- coi `room_id` là deposit identity đủ dùng cho current room workflow
- gắn bill/cọc hiện tại của occupancy cũ vào tenant mới chỉ vì cùng phòng

---

## 9. Quy tắc update docs

Khi có thay đổi ở một trong các nghiệp vụ sau, phải update file này:

- room checkout / trả phòng
- occupancy lifecycle
- deposit status lifecycle
- deposit transaction types
- settlement flow
- billing ownership rules
- tab/domain ownership
- rule chuyển đổi giữa Phòng và Tiền cọc

---

## 10. Tài liệu liên quan

- `docs/database-contract.md`
- `docs/system-architecture.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`
