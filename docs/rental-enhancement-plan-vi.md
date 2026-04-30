# Kế hoạch nâng cấp tính năng Cho thuê phòng

## 1) Mục tiêu
- Biến module **Cho thuê** từ theo dõi tiền thuê cơ bản thành module **quản lý hóa đơn phòng trọ đầy đủ** theo kỳ (tháng).
- Hỗ trợ tính và phân bổ các chi phí:
  - Tiền điện theo từng phòng (chỉ số đầu/cuối kỳ).
  - Tiền nước dùng chung.
  - Tiền wifi dùng chung.
  - Tiền dọn vệ sinh (có thể theo phòng hoặc chung).
  - Các phụ phí khác (rác, gửi xe, dịch vụ...).
- Tạo được **phiếu thu/hoá đơn phòng** rõ ràng, có lịch sử, và đối soát thu/thiếu.

## 2) Phạm vi chức năng đề xuất

### 2.1. Cấu hình chi phí (Cost Configuration)
Thêm khối cấu hình ở màn hình Cho thuê:
- **Giá điện / kWh** (mặc định toàn nhà, cho phép override theo phòng).
- **Nước chung / tháng**: nhập tổng số tiền hoặc tổng m3 + đơn giá.
- **Wifi chung / tháng**: tổng tiền cố định.
- **Dọn vệ sinh**:
  - Cách 1: phí cố định / phòng / tháng.
  - Cách 2: phí chung rồi chia theo quy tắc.
- **Phụ phí khác**: tên phí + số tiền + quy tắc phân bổ.

### 2.2. Quy tắc phân bổ chi phí chung
Cần có 3 rule ngay từ đầu:
1. **Chia đều theo phòng đang thuê**.
2. **Chia theo số người ở** (cần thêm trường số người/phòng).
3. **Chia theo hệ số phòng** (phòng lớn/nhỏ khác nhau).

> Khuyến nghị MVP: dùng rule (1) trước, sau đó mở rộng dần.

### 2.3. Chỉ số điện từng phòng
Mỗi phòng có:
- Chỉ số điện đầu kỳ.
- Chỉ số điện cuối kỳ.
- Số kWh tiêu thụ = cuối - đầu.
- Tiền điện phòng = kWh × đơn giá điện.

Yêu cầu validation:
- Chỉ số cuối kỳ không được nhỏ hơn đầu kỳ.
- Cảnh báo khi chênh lệch bất thường so với 3 tháng trước.

### 2.4. Bảng tính tiền theo kỳ (Billing Run)
Thêm khái niệm **Kỳ thanh toán** (VD: 05/2026):
- Snapshot dữ liệu phòng tại thời điểm chốt kỳ.
- Tính tự động:
  - Tiền thuê.
  - Tiền điện từng phòng.
  - Phần chi phí chung phân bổ (nước/wifi/vệ sinh/phụ phí).
- Kết quả theo từng phòng:
  - Tổng phải thu.
  - Đã thu.
  - Còn thiếu.

### 2.5. Phiếu phòng / hóa đơn phòng
Mỗi phòng mỗi tháng có 1 phiếu:
- Tiền thuê: xxx
- Điện: xxx (kWh + đơn giá)
- Nước: xxx
- Wifi: xxx
- Vệ sinh: xxx
- Khác: xxx
- **Tổng cộng: xxx**

Hành động:
- Đánh dấu đã thu một phần / toàn bộ.
- Thêm ghi chú (chuyển khoản, nợ gối đầu...).

### 2.6. Dashboard chuyên cho thuê nâng cao
Bổ sung các chỉ số:
- Doanh thu thực thu tháng.
- Công nợ cuối tháng.
- Top phòng nợ cao.
- Chi phí vận hành chung (nước/wifi/vệ sinh) và biên lợi nhuận ròng.
- ARPU/phòng (doanh thu trung bình/phòng đang thuê).

## 3) Đề xuất thay đổi dữ liệu (Data model)

## 3.1. Room
Thêm trường:
- `occupants` (số người ở)
- `allocationWeight` (hệ số phân bổ)
- `electricityRateOverride` (tùy chọn)

## 3.2. Property-level rental settings
Bảng cấu hình chung:
- `defaultElectricityRate`
- `waterMode` (`fixed_total` | `metered_total`)
- `waterFixedTotal`
- `wifiFixedTotal`
- `cleaningMode` (`fixed_per_room` | `shared_total`)
- `cleaningValue`
- `allocationRule` (`equal_occupied` | `by_occupants` | `by_weight`)

## 3.3. Billing cycle & line items
- `rental_billing_cycles`
  - `id`, `month`, `year`, `status`, `closedAt`
- `rental_room_bills`
  - `roomId`, `cycleId`, `rentAmount`, `electricityAmount`, `waterAmount`, `wifiAmount`, `cleaningAmount`, `otherAmount`, `totalAmount`, `paidAmount`, `note`
- `rental_electricity_readings`
  - `roomId`, `cycleId`, `startIndex`, `endIndex`, `consumptionKwh`

## 4) Lộ trình triển khai (ưu tiên)

### Phase 1 (MVP: 1–2 sprint)
- UI cấu hình phí chung + đơn giá điện.
- Nhập chỉ số điện đầu/cuối kỳ từng phòng.
- Tính tổng hóa đơn phòng (thuê + điện + nước + wifi + vệ sinh) theo rule chia đều phòng đang thuê.
- Màn hình danh sách hóa đơn tháng + trạng thái đã thu/chưa thu.

### Phase 2
- Thêm rule chia theo số người / hệ số.
- Thu tiền một phần nhiều lần.
- Cảnh báo phòng nợ kéo dài.
- Xuất CSV hóa đơn tháng.

### Phase 3
- Tự động nhắc thu tiền (notification).
- Dự báo doanh thu ròng theo tỷ lệ lấp đầy + lịch sử tiêu thụ điện.
- So sánh kỳ này với kỳ trước (variance analysis).

## 5) Đề xuất UX/UI cụ thể cho màn hình hiện tại
- Trên mỗi card phòng, thêm dòng phụ:
  - Điện tháng này (kWh, tiền)
  - Phí chung phân bổ
  - Tổng phải thu tháng
- Thêm CTA “**Chốt tiền tháng**” ở đầu trang.
- Khi bấm vào phòng mở Drawer “Chi tiết hóa đơn phòng”.
- Trong stats top bar, đổi từ chỉ “Thu nhập tháng” thành:
  - `Phải thu`
  - `Đã thu`
  - `Còn thiếu`

## 6) Logic tính mẫu (MVP)
Giả sử có `N` phòng đang thuê trong tháng:
- `waterPerRoom = totalWater / N`
- `wifiPerRoom = totalWifi / N`
- `cleaningPerRoom = totalCleaning / N` (hoặc fixed theo phòng)

Với từng phòng `r`:
- `electricityAmount(r) = (endIndex - startIndex) * electricityRate`
- `totalBill(r) = rent + electricityAmount + waterPerRoom + wifiPerRoom + cleaningPerRoom + otherAllocated`

## 7) KPI đo hiệu quả sau khi triển khai
- Giảm thời gian chốt tiền tháng (phút/kỳ).
- Tỷ lệ thu đúng hạn.
- Tỷ lệ sai sót khi tính tiền (điều chỉnh thủ công).
- Tỷ lệ phòng có dữ liệu điện đầy đủ theo kỳ.

## 8) Gợi ý triển khai kỹ thuật trong code hiện tại
- Mở rộng `finance-types` để thêm các entity billing/settings cho rental.
- Mở rộng `finance-store` với action:
  - `setRentalSettings`
  - `recordElectricityReading`
  - `generateBillingCycle`
  - `markRoomBillPaid`
- Tạo components mới:
  - `RentalSettingsPanel`
  - `RentalBillingTable`
  - `RoomBillDrawer`

## 9) Rủi ro & kiểm soát
- **Thiếu dữ liệu đầu vào** (quên nhập điện): khóa chốt kỳ nếu chưa đủ dữ liệu tối thiểu.
- **Sai rule phân bổ**: hiển thị rule rõ ràng trên mỗi hóa đơn.
- **Thay đổi giá giữa tháng**: lưu snapshot theo kỳ, không phụ thuộc cấu hình hiện tại.

## 10) Đề xuất bắt đầu ngay
1. Chốt chuẩn công thức MVP (rule chia đều phòng đang thuê).
2. Thiết kế DB/type cho billing cycle + room bill.
3. Build luồng nhập điện + chốt kỳ + danh sách hóa đơn.
4. Sau khi dùng thật 1–2 tháng, mới mở rộng rule chia nâng cao.
