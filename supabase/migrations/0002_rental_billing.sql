-- Rental billing: settings, cycle, room bill, electricity readings

create table if not exists public.rental_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_electricity_rate numeric(18, 2) not null default 3500,
  water_total numeric(18, 2) not null default 0,
  wifi_total numeric(18, 2) not null default 0,
  cleaning_total numeric(18, 2) not null default 0,
  other_total numeric(18, 2) not null default 0,
  allocation_rule text not null default 'equal_occupied',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_settings_allocation_rule_chk
    check (allocation_rule in ('equal_occupied', 'by_occupants', 'by_weight'))
);

create table if not exists public.rental_billing_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 3000),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, month, year)
);

create table if not exists public.rental_room_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rental_rooms(id) on delete cascade,
  cycle_id uuid not null references public.rental_billing_cycles(id) on delete cascade,
  rent_amount numeric(18, 2) not null default 0,
  electricity_amount numeric(18, 2) not null default 0,
  water_amount numeric(18, 2) not null default 0,
  wifi_amount numeric(18, 2) not null default 0,
  cleaning_amount numeric(18, 2) not null default 0,
  other_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  paid_amount numeric(18, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (room_id, cycle_id)
);

create table if not exists public.rental_electricity_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rental_rooms(id) on delete cascade,
  cycle_id uuid not null references public.rental_billing_cycles(id) on delete cascade,
  start_index numeric(18, 2) not null default 0,
  end_index numeric(18, 2) not null default 0,
  consumption_kwh numeric(18, 2) generated always as (greatest(end_index - start_index, 0)) stored,
  created_at timestamptz not null default now(),
  constraint rental_electricity_index_chk check (end_index >= start_index),
  unique (room_id, cycle_id)
);

create index if not exists rental_billing_cycles_user_idx on public.rental_billing_cycles (user_id, year desc, month desc);
create index if not exists rental_room_bills_user_cycle_idx on public.rental_room_bills (user_id, cycle_id);
create index if not exists rental_electricity_user_cycle_idx on public.rental_electricity_readings (user_id, cycle_id);

alter table public.rental_settings enable row level security;
alter table public.rental_billing_cycles enable row level security;
alter table public.rental_room_bills enable row level security;
alter table public.rental_electricity_readings enable row level security;

create policy "rental_settings_select_own" on public.rental_settings
  for select using (auth.uid() = user_id);
create policy "rental_settings_insert_own" on public.rental_settings
  for insert with check (auth.uid() = user_id);
create policy "rental_settings_update_own" on public.rental_settings
  for update using (auth.uid() = user_id);
create policy "rental_settings_delete_own" on public.rental_settings
  for delete using (auth.uid() = user_id);

create policy "rental_cycles_select_own" on public.rental_billing_cycles
  for select using (auth.uid() = user_id);
create policy "rental_cycles_insert_own" on public.rental_billing_cycles
  for insert with check (auth.uid() = user_id);
create policy "rental_cycles_update_own" on public.rental_billing_cycles
  for update using (auth.uid() = user_id);
create policy "rental_cycles_delete_own" on public.rental_billing_cycles
  for delete using (auth.uid() = user_id);

create policy "rental_bills_select_own" on public.rental_room_bills
  for select using (auth.uid() = user_id);
create policy "rental_bills_insert_own" on public.rental_room_bills
  for insert with check (auth.uid() = user_id);
create policy "rental_bills_update_own" on public.rental_room_bills
  for update using (auth.uid() = user_id);
create policy "rental_bills_delete_own" on public.rental_room_bills
  for delete using (auth.uid() = user_id);

create policy "rental_readings_select_own" on public.rental_electricity_readings
  for select using (auth.uid() = user_id);
create policy "rental_readings_insert_own" on public.rental_electricity_readings
  for insert with check (auth.uid() = user_id);
create policy "rental_readings_update_own" on public.rental_electricity_readings
  for update using (auth.uid() = user_id);
create policy "rental_readings_delete_own" on public.rental_electricity_readings
  for delete using (auth.uid() = user_id);
