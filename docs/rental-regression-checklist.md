# MoneyFlowOS Rental Regression Checklist

Tài liệu này dùng để test regression cho module **Cho thuê** sau occupancy migration.

Mục tiêu:
- giúp verify nhanh các flow cốt lõi sau mỗi PR
- tránh bug leak dữ liệu giữa tenant cũ và tenant mới
- đảm bảo current room workflow luôn resolve đúng qua **active occupancy**

---

## 1. Nguyên tắc chung

Khi test các flow hiện tại, cần ghi nhớ:

- current room workflow phải resolve qua **active occupancy**
- deposit hiện tại phải thuộc **active occupancy**
- bill hiện tại phải thuộc **active occupancy + cycle**
- reading hiện tại phải thuộc **active occupancy + cycle**
- dữ liệu của occupancy cũ không được leak sang tenant mới chỉ vì cùng phòng hoặc cùng kỳ

---

## 2. Checklist regression

## A. Room / occupancy

### A1. Tạo phòng trống
- Tạo một phòng mới không gán tenant
- Verify:
  - tạo room thành công
  - `tenant_id = null`
  - `occupied = false`

### A2. Tạo phòng + người thuê ngay
- Tạo phòng mới và thêm người thuê ngay
- Verify:
  - room có `tenant_id`
  - `occupied = true`
  - có đúng **1 active occupancy**

### A3. Checkout người thuê
- Thực hiện trả phòng
- Verify:
  - room `tenant_id = null`
  - `occupied = false`
  - occupancy cũ chuyển `ended`

### A4. Gán người thuê mới vào cùng phòng
- Gán tenant mới vào lại phòng cũ
- Verify:
  - tạo occupancy mới `active`
  - occupancy cũ vẫn giữ lịch sử
  - không có hơn 1 active occupancy trong cùng 1 phòng

---

## B. Deposit

### B1. Thêm người thuê + cọc
- Gán người thuê vào phòng và nhập tiền cọc
- Verify:
  - tạo `rental_deposits`
  - `status = active`
  - có `occupancy_id`
  - có transaction `create`

### B2. Checkout người thuê có cọc
- Trả phòng
- Verify:
  - deposit cũ chuyển `pending_settlement`
  - `vacated_at` có giá trị
  - deposit cũ không còn là current deposit của phòng

### B3. Gán tenant mới cùng phòng
- Gán tenant mới vào lại phòng
- Verify:
  - deposit mới là `active`
  - deposit cũ vẫn còn trong tab `Tiền cọc`
  - deposit cũ không hiện ở tab `Phòng`

### B4. Verify tab Tiền cọc
- Mở tab `Tiền cọc`
- Verify:
  - vẫn thấy cả deposit cũ và mới
  - deposit cũ = `pending_settlement`
  - deposit mới = `active`

---

## C. Reading

### C1. Nhập điện nước cho phòng có active occupancy
- Nhập chỉ số điện nước
- Verify:
  - tạo `rental_electricity_readings`
  - có `occupancy_id`

### C2. Checkout tenant cũ, thêm tenant mới cùng phòng cùng kỳ
- Trả phòng tenant A
- Gán tenant B vào cùng phòng trong cùng tháng
- Mở `Chốt tháng`
- Verify:
  - reading cũ của tenant A **không hydrate lại**
  - form điện nước reset sạch cho occupancy mới

---

## D. Bill

### D1. Sau khi nhập điện nước
- Verify:
  - tạo bill draft
  - bill có `occupancy_id`

### D2. Chốt bill
- Thực hiện xác nhận bill
- Verify:
  - status `confirmed`

### D3. Thu tiền một phần
- Ghi nhận thanh toán một phần
- Verify:
  - status `partial_paid`

### D4. Thu đủ / đánh dấu đã thu đủ
- Thanh toán hết bill
- Verify:
  - status `paid`
  - `paid_amount = total_amount`

### D5. Checkout tenant cũ, thêm tenant mới cùng phòng cùng kỳ, nhập điện nước lại
- Verify:
  - bill mới tạo cho occupancy mới
  - bill cũ không leak sang tenant mới
  - Room modal chỉ hiện bill của active occupancy hiện tại

---

## E. Tenant mobility guards

### E1. Khi current bill chưa thanh toán hết
- Verify:
  - không cho đổi tenant
  - không cho xóa tenant khỏi phòng

### E2. Khi deposit active còn tồn tại
- Verify:
  - guard vẫn hoạt động đúng theo workflow hiện tại

### E3. Khi bill đã paid và deposit đã xử lý đúng
- Verify:
  - cho checkout
  - cho gán tenant mới

---

## F. Full regression flow

Test full flow sau:

1. thêm phòng + tenant + cọc
2. nhập điện nước
3. tạo bill
4. mark paid
5. checkout
6. thêm tenant mới cùng phòng cùng kỳ
7. nhập điện nước lại

Verify toàn bộ:
- reading mới sạch
- bill mới đúng occupancy
- deposit cũ `pending_settlement`
- deposit mới `active`
- room modal không dính data tenant cũ

---

## 3. Kết quả mong đợi

Nếu toàn bộ checklist pass, có thể coi occupancy migration core đang ổn định cho current workflow:

- occupancy
- deposit
- bill
- reading

Nếu fail ở bất kỳ bước nào, cần kiểm tra lại:
- current data có legacy row không
- `occupancy_id` có bị null không
- current lookup có còn broad room-based assumption không
