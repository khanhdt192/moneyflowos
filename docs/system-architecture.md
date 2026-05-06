# MoneyFlowOS System Architecture

Tài liệu này mô tả kiến trúc hệ thống hiện tại của app MoneyFlowOS ở mức tổ chức code và luồng dữ liệu.

Mục tiêu:
- làm rõ ranh giới giữa DB, Supabase, service layer, hook và UI
- giúp AI/Codex sửa đúng tầng
- tránh nhét business logic sai chỗ

---

## 1. Kiến trúc tổng thể

MoneyFlowOS hiện đi theo hướng:

```text
Database (Postgres tables / views / constraints)
  ↓
Supabase client
  ↓
Service / action layer
  ↓
Hooks / state orchestration
  ↓
UI components / pages / tabs / modals
```

Nguồn sự thật cuối cùng:
- Database schema và dữ liệu trong Supabase

UI chỉ là lớp hiển thị và tương tác.
Không được coi UI state là source of truth sau mutation.

---

## 2. Vai trò của từng tầng

## 2.1 Database layer

Bao gồm:
- bảng dữ liệu
- view
- constraint
- foreign key
- check constraint
- index
- RLS / policy (nếu có)

Vai trò:
- lưu trạng thái thật
- đảm bảo data integrity
- chặn dữ liệu sai ở lớp cuối cùng

Rule:
- không đoán schema
- không tự bịa cột
- mọi thay đổi schema phải được thực hiện rõ ràng bằng SQL / migration

Nguồn tham chiếu:
- `docs/database-contract.md`

---

## 2.2 Supabase layer

Đây là lớp kết nối app với database.

Vai trò:
- query dữ liệu
- insert / update / delete
- gọi view / table thật
- trả lỗi thật từ DB về app

Rule:
- Supabase không phải nơi chứa business logic UI
- query phải bám schema thật
- không workaround schema bằng cách đoán field ở frontend

---

## 2.3 Service / action layer

Đây là lớp điều phối thao tác dữ liệu.

Ví dụ trách nhiệm phù hợp:
- create room
- assign tenant
- create deposit
- save electricity reading
- confirm bill
- record payment

Vai trò:
- gom logic thao tác dữ liệu
- gọi Supabase
- xử lý nhiều bước theo đúng thứ tự
- đảm bảo refetch / state sync sau mutation

Rule:
- business workflow nên nằm ở đây, không nên nằm rải rác trong JSX
- không nhét render logic vào service
- không nhét raw Supabase calls khắp UI nếu cùng một nghiệp vụ có thể gom lại

---

## 2.4 Hook / state orchestration layer

Đây là lớp nối giữa service và UI.

Vai trò:
- load data cho màn hình
- quản lý UI state
- map dữ liệu sang dạng component dễ dùng
- giữ local state tạm thời cho form / modal / selected item / editing mode

Ví dụ:
- selected room
- modal open/close
- month selected
- local input state
- edit mode / draft row state

Rule:
- hook không phải database source of truth
- hook không nên chứa SQL/schema assumptions sai
- hook nên gọi service/action thay vì tự ôm quá nhiều nghiệp vụ

---

## 2.5 UI layer

Bao gồm:
- layout shell
- pages
- tabs
- cards
- modals
- forms
- buttons
- table / row rendering

Vai trò:
- hiển thị dữ liệu
- nhận input người dùng
- gọi hook/action phù hợp
- enforce một phần validation ở mức input

Rule:
- UI không được tự bịa business rule
- UI không được tự đoán schema
- UI nên mỏng nhất có thể
- tab/page header, local tabs, local actions nên thuộc module tương ứng, không nên đẩy sai lên global shell nếu không phải global concern

---

## 3. Luồng dữ liệu chuẩn

## 3.1 Read flow

```text
Database
  → Supabase query
  → service / hook
  → UI render
```

Ví dụ:
- load room list
- load tenant info
- load billing summary
- load deposit status

## 3.2 Mutation flow

```text
UI input
  → input validation
  → handler guard
  → service/action
  → Supabase mutation
  → Database constraint check
  → refetch / sync state
  → UI update
```

Rule:
- mutation xong phải refetch hoặc sync state đúng
- không để stale UI
- không báo success khi mutation chưa hoàn tất

---

## 4. Validation placement

Validation phải tồn tại ở nhiều lớp:

### 4.1 Input/UI layer
Dùng để:
- chặn ký tự sai
- sanitize input
- giảm lỗi người dùng

### 4.2 Handler/service guard layer
Dùng để:
- chặn mutation sai trước khi gọi Supabase

### 4.3 Database layer
Dùng để:
- chặn dữ liệu sai ở lớp cuối cùng

Rule:
- không rely vào chỉ một lớp validation

Nguồn tham chiếu:
- `docs/rental-validation-rules.md`

---

## 5. Module organization rule

Mỗi module nên có ranh giới rõ giữa:

```text
module
  ├─ UI components
  ├─ hooks
  ├─ services/actions
  ├─ utils
  └─ docs/contracts
```

Trong giai đoạn hiện tại, code có thể vẫn còn component-driven.
Nhưng hướng chuẩn cần đi tới là:
- UI lo render
- hook lo orchestration
- service lo business workflow
- DB lo source of truth

---

## 6. Shell vs module rule

Global shell chỉ nên chứa:
- sidebar
- layout frame
- mobile sidebar state
- global toaster/dialog nếu thật sự global

Không nên nhét vào global shell:
- module-specific tabs
- module-specific month selector
- module-specific actions
- module-specific title nếu chúng không phải concern toàn app

Rule:
- header/tabs/actions thuộc module nào thì nên nằm ở module đó
- tránh fake navigation trong global shell

---

## 7. Current architectural direction of MoneyFlowOS

Hiện tại app đang theo hướng:

- Frontend-heavy orchestration
- Supabase-backed data layer
- Database là source of truth
- Docs đóng vai trò contract để AI/Codex sửa đúng tầng

Điểm mạnh hiện tại:
- DB contract đã được document
- validation rules đã tách riêng
- UI/UX spec đã có source of truth
- rental module đang dần tách util dùng chung

Điểm cần giữ:
- không để component file ôm toàn bộ business logic mãi về lâu dài
- tiếp tục tách shared util / service / hook khi module lớn lên

---

## 8. Khi thêm feature mới, phải quyết định đúng tầng

Trước khi code, luôn trả lời 5 câu hỏi:

1. Đây là rule ở DB, service, hook hay UI?
2. Có thay đổi schema không?
3. Có thay đổi business workflow không?
4. Có cần refetch / sync state sau mutation không?
5. Docs nào cần update?

---

## 9. Anti-patterns

Không làm các kiểu sau:

- nhét business workflow lớn trực tiếp vào JSX
- query Supabase lặp lại ở nhiều component cho cùng một nghiệp vụ
- dùng UI local state như source of truth sau mutation
- đưa module-specific navigation vào global shell một cách giả tạo
- để visual-only action không có behavior thật
- workaround schema bằng cách đoán field

---

## 10. Tài liệu liên quan

- `docs/database-contract.md`
- `docs/moneyflowos-ai-rules.md`
- `docs/rental-ui-ux-spec.md`
- `docs/rental-validation-rules.md`
- `docs/rental-handover.md`
