-- MYMZ Swimming School booking foundation
-- Production migration: contains no customers, swimmers, bookings or fabricated availability.
create extension if not exists pgcrypto;

create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'refunded', 'failed');

create table public.lesson_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  price_pence integer not null check (price_pence >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.instructors (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 2 and 120),
  bio text not null default '', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 2 and 160),
  address text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.lesson_slots (
  id uuid primary key default gen_random_uuid(), lesson_type_id uuid not null references public.lesson_types(id) on delete restrict,
  instructor_id uuid references public.instructors(id) on delete restrict, location_id uuid not null references public.locations(id) on delete restrict,
  start_time timestamptz not null, end_time timestamptz not null, capacity integer not null check (capacity > 0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (end_time > start_time)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), parent_guardian_name text,
  email text not null check (email = lower(email) and char_length(email) <= 254), phone text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.swimmers (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete restrict,
  swimmer_name text not null, date_of_birth date not null check (date_of_birth < current_date), swimming_ability text not null,
  relevant_notes text check (relevant_notes is null or char_length(relevant_notes) <= 1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (customer_id, id)
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete restrict,
  swimmer_id uuid not null, lesson_slot_id uuid not null references public.lesson_slots(id) on delete restrict,
  booking_reference text not null unique, status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid', amount_pence integer not null check (amount_pence >= 0),
  reservation_expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'confirmed' or payment_status in ('paid', 'unpaid')),
  foreign key (customer_id, swimmer_id) references public.swimmers(customer_id, id) on delete restrict
);
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index lesson_slots_catalog_idx on public.lesson_slots (lesson_type_id, start_time) where active;
create index lesson_slots_location_idx on public.lesson_slots (location_id, start_time);
create index bookings_slot_capacity_idx on public.bookings (lesson_slot_id, status, reservation_expires_at);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_swimmer_idx on public.bookings (swimmer_id);
create index bookings_upcoming_idx on public.bookings (status, created_at desc);
create index customers_email_idx on public.customers (lower(email));

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger lesson_types_updated before update on public.lesson_types for each row execute function public.set_updated_at();
create trigger instructors_updated before update on public.instructors for each row execute function public.set_updated_at();
create trigger locations_updated before update on public.locations for each row execute function public.set_updated_at();
create trigger lesson_slots_updated before update on public.lesson_slots for each row execute function public.set_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger swimmers_updated before update on public.swimmers for each row execute function public.set_updated_at();
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- Public availability exposes only operational catalogue data, never customer records.
-- This deliberately uses the view owner's rights so the aggregate can count bookings despite
-- private booking RLS. Only the safe columns listed below are exposed; no PII leaves the view.
create view public.available_lesson_slots as
select s.id, s.lesson_type_id, s.start_time, s.end_time, s.capacity, s.location_id,
  l.name as location_name, l.address as location_address, i.name as instructor_name,
  greatest(s.capacity - count(b.id)::integer, 0) as spaces_available
from public.lesson_slots s
join public.lesson_types lt on lt.id = s.lesson_type_id and lt.active
join public.locations l on l.id = s.location_id and l.active
left join public.instructors i on i.id = s.instructor_id and i.active
left join public.bookings b on b.lesson_slot_id = s.id and
  (b.status = 'confirmed' or (b.status = 'pending' and b.reservation_expires_at > now()))
where s.active and s.start_time > now()
group by s.id, l.name, l.address, i.name
having s.capacity - count(b.id) > 0;

alter table public.lesson_types enable row level security; alter table public.instructors enable row level security;
alter table public.locations enable row level security; alter table public.lesson_slots enable row level security;
alter table public.customers enable row level security; alter table public.swimmers enable row level security;
alter table public.bookings enable row level security; alter table public.admin_users enable row level security;

create policy "public reads active lesson types" on public.lesson_types for select to anon, authenticated using (active);
create policy "public reads active instructors" on public.instructors for select to anon, authenticated using (active);
create policy "public reads active locations" on public.locations for select to anon, authenticated using (active);
create policy "public reads future active slots" on public.lesson_slots for select to anon, authenticated using (active and start_time > now());
create policy "admins manage lesson types" on public.lesson_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage instructors" on public.instructors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage locations" on public.locations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage lesson slots" on public.lesson_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read customers" on public.customers for select to authenticated using (public.is_admin());
create policy "admins read swimmers" on public.swimmers for select to authenticated using (public.is_admin());
create policy "admins manage bookings" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins see own role" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- Atomic capacity enforcement. The row lock serialises contenders for the final place.
create function public.enforce_slot_capacity() returns trigger language plpgsql security definer set search_path = '' as $$
declare slot_capacity integer; current_count integer;
begin
  if new.status not in ('pending', 'confirmed') then return new; end if;
  select capacity into slot_capacity from public.lesson_slots where id = new.lesson_slot_id and active for update;
  if slot_capacity is null then raise exception 'Lesson slot is not available' using errcode = 'P0001'; end if;
  select count(*) into current_count from public.bookings
    where lesson_slot_id = new.lesson_slot_id and id <> new.id
    and (status = 'confirmed' or (status = 'pending' and reservation_expires_at > now()));
  if current_count >= slot_capacity then raise exception 'Lesson slot is full' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger booking_capacity_guard before insert or update of lesson_slot_id, status on public.bookings
for each row execute function public.enforce_slot_capacity();

create function public.new_booking_reference() returns text language plpgsql set search_path = '' as $$
declare ref text;
begin loop
  ref := 'MYMZ-' || to_char(now(), 'YYMM') || '-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8));
  exit when not exists (select 1 from public.bookings where booking_reference = ref);
end loop; return ref; end $$;

-- Future server endpoint calls this RPC. It never accepts price/capacity/status from the browser.
create function public.create_booking(
  p_lesson_slot_id uuid, p_swimmer_name text, p_date_of_birth date, p_swimming_ability text,
  p_relevant_notes text, p_parent_guardian_name text, p_email text, p_phone text
) returns table (booking_id uuid, booking_reference text, amount_pence integer, status public.booking_status)
language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_swimmer uuid; v_booking uuid; v_reference text; v_amount integer;
begin
  if p_email is null or p_swimmer_name is null or p_date_of_birth is null or p_phone is null then raise exception 'Required booking details missing'; end if;
  select lt.price_pence into v_amount from public.lesson_slots s join public.lesson_types lt on lt.id=s.lesson_type_id
    where s.id=p_lesson_slot_id and s.active and lt.active and s.start_time>now() for update of s;
  if v_amount is null then raise exception 'Lesson slot is not available'; end if;
  insert into public.customers(parent_guardian_name,email,phone) values(nullif(trim(p_parent_guardian_name),''),lower(trim(p_email)),trim(p_phone)) returning id into v_customer;
  insert into public.swimmers(customer_id,swimmer_name,date_of_birth,swimming_ability,relevant_notes)
    values(v_customer,trim(p_swimmer_name),p_date_of_birth,trim(p_swimming_ability),nullif(trim(p_relevant_notes),'')) returning id into v_swimmer;
  v_reference := public.new_booking_reference();
  insert into public.bookings(customer_id,swimmer_id,lesson_slot_id,booking_reference,status,payment_status,amount_pence,reservation_expires_at)
    values(v_customer,v_swimmer,p_lesson_slot_id,v_reference,'pending','unpaid',v_amount,now()+interval '15 minutes') returning id into v_booking;
  return query select v_booking,v_reference,v_amount,'pending'::public.booking_status;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.lesson_types, public.instructors, public.locations, public.lesson_slots, public.available_lesson_slots to anon, authenticated;
grant select, insert, update, delete on public.lesson_types, public.instructors, public.locations, public.lesson_slots, public.bookings to authenticated;
grant select on public.customers, public.swimmers, public.admin_users to authenticated;
revoke all on function public.create_booking(uuid,text,date,text,text,text,text,text) from public;
revoke all on function public.new_booking_reference() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.enforce_slot_capacity() from public;
revoke all on function public.set_updated_at() from public;
-- Enable only when the production server endpoint has rate limiting/abuse protection:
-- grant execute on function public.create_booking(uuid,text,date,text,text,text,text,text) to anon;
grant execute on function public.create_booking(uuid,text,date,text,text,text,text,text) to service_role;
grant execute on function public.is_admin() to authenticated;
