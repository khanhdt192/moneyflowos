-- Ensure rental_room_overview is cycle-scoped and exposes cycle_id for month-based filtering
create or replace view public.rental_room_overview as
select
  c.id as cycle_id,
  r.id as room_id,
  r.name,
  r.floor,
  t.full_name as tenant,
  r.tenant_id,
  b.id as bill_id,
  b.status as bill_status,
  b.total_amount,
  b.electricity_amount,
  b.water_amount,
  b.wifi_amount,
  b.cleaning_amount,
  b.other_amount
from public.rental_billing_cycles c
join public.rental_rooms r
  on r.user_id = c.user_id
left join public.rental_tenants t
  on r.tenant_id = t.id
left join public.rental_room_bills b
  on b.cycle_id = c.id
 and b.room_id = r.id
 and b.user_id = c.user_id;
