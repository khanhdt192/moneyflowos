create table if not exists public.rental_deposits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.rental_tenants(id),
  room_id uuid not null references public.rental_rooms(id),
  amount numeric not null check (amount >= 0),
  status text not null default 'active' check (status in ('active', 'settled')),
  note text null,
  collected_at timestamp with time zone not null default now(),
  settled_at timestamp with time zone null,
  created_at timestamp with time zone not null default now()
);

create index if not exists rental_deposits_tenant_id_idx on public.rental_deposits(tenant_id);
create index if not exists rental_deposits_room_id_idx on public.rental_deposits(room_id);
create index if not exists rental_deposits_status_idx on public.rental_deposits(status);
