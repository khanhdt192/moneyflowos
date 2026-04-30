-- Production rental upgrade: extended settings, bill status machine, payments, invoice settings

-- ── 1. Extend rental_settings ───────────────────────────────────────────────
alter table public.rental_settings
  add column if not exists water_rate_per_m3   numeric(18,2) not null default 24000,
  add column if not exists wifi_per_room        numeric(18,2) not null default 0,
  add column if not exists cleaning_per_room    numeric(18,2) not null default 0,
  add column if not exists other_per_room       numeric(18,2) not null default 0,
  add column if not exists other_name           text not null default 'Phụ phí',
  add column if not exists t1_electricity_bill  numeric(18,2) not null default 0,
  add column if not exists t1_has_wifi          boolean not null default false,
  add column if not exists t1_wifi_per_room     numeric(18,2) not null default 0,
  add column if not exists t1_cleaning          numeric(18,2) not null default 0,
  add column if not exists t1_other_name        text not null default 'Phụ phí',
  add column if not exists t1_other_per_room    numeric(18,2) not null default 0,
  add column if not exists bank_name            text not null default '',
  add column if not exists bank_account         text not null default '',
  add column if not exists bank_holder          text not null default '',
  add column if not exists bank_qr_url          text not null default '',
  add column if not exists bank_note_template   text not null default 'Phong {room} T{month}/{year}';

-- ── 2. Add water_m3 to electricity readings ──────────────────────────────────
alter table public.rental_electricity_readings
  add column if not exists water_m3 numeric(18,2) not null default 0;

-- ── 3. Add bill status + timestamps to room bills ────────────────────────────
alter table public.rental_room_bills
  add column if not exists status       text not null default 'draft'
    check (status in ('draft','confirmed','partial_paid','paid','cancelled')),
  add column if not exists confirmed_at timestamptz,
  add column if not exists paid_at      timestamptz;

-- ── 4. Payments table ────────────────────────────────────────────────────────
create table if not exists public.rental_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  bill_id        uuid not null references public.rental_room_bills(id) on delete cascade,
  room_id        uuid not null references public.rental_rooms(id) on delete cascade,
  amount         numeric(18,2) not null check (amount > 0),
  payment_method text not null default 'cash',
  note           text,
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists rental_payments_bill_idx on public.rental_payments (bill_id);
create index if not exists rental_payments_user_idx on public.rental_payments (user_id);

alter table public.rental_payments enable row level security;

create policy "rental_payments_select_own" on public.rental_payments
  for select using (auth.uid() = user_id);
create policy "rental_payments_insert_own" on public.rental_payments
  for insert with check (auth.uid() = user_id);
create policy "rental_payments_update_own" on public.rental_payments
  for update using (auth.uid() = user_id);
create policy "rental_payments_delete_own" on public.rental_payments
  for delete using (auth.uid() = user_id);

-- ── 5. Invoice settings table ─────────────────────────────────────────────────
create table if not exists public.invoice_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  property_name  text not null default '',
  address        text not null default '',
  contact_phone  text not null default '',
  logo_url       text not null default '',
  footer_note    text not null default 'Cảm ơn quý khách đã thanh toán đúng hạn.',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.invoice_settings enable row level security;

create policy "invoice_settings_select_own" on public.invoice_settings
  for select using (auth.uid() = user_id);
create policy "invoice_settings_insert_own" on public.invoice_settings
  for insert with check (auth.uid() = user_id);
create policy "invoice_settings_update_own" on public.invoice_settings
  for update using (auth.uid() = user_id);
create policy "invoice_settings_delete_own" on public.invoice_settings
  for delete using (auth.uid() = user_id);
