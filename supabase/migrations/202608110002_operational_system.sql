-- Phase 3: commercial lesson model, settings, audit log and idempotent booking creation.
-- No lesson products, prices, staff, locations, availability or customers are seeded here.

alter table public.lesson_types alter column price_pence drop not null;
alter table public.lesson_types drop constraint if exists lesson_types_price_pence_check;
alter table public.lesson_types add constraint lesson_types_price_pence_check check (price_pence is null or price_pence >= 0);
alter table public.lesson_types
  add column currency char(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  add column booking_mode text not null default 'individual' check (booking_mode in ('individual','term','block','trial')),
  add column display_order integer not null default 0 check (display_order >= 0),
  add column minimum_age_months integer check (minimum_age_months is null or minimum_age_months >= 0),
  add column maximum_age_months integer check (maximum_age_months is null or maximum_age_months >= 0),
  add column capacity integer not null default 1 check (capacity > 0),
  add column featured boolean not null default false,
  add constraint lesson_types_age_range_check check (maximum_age_months is null or minimum_age_months is null or maximum_age_months >= minimum_age_months);

alter table public.instructors add column photo_path text;
alter table public.bookings add column idempotency_key uuid unique;

create table public.business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'MYMZ Swimming School',
  phone text not null default '07383 488189',
  email text,
  currency char(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  reservation_timeout_minutes integer not null default 15 check (reservation_timeout_minutes between 5 and 60),
  booking_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.business_settings (id) values (true) on conflict do nothing;
create trigger business_settings_updated before update on public.business_settings for each row execute function public.set_updated_at();
create view public.public_booking_settings as select currency,reservation_timeout_minutes,booking_enabled,payments_enabled from public.business_settings where id=true;
revoke all on public.public_booking_settings from public;
grant select on public.public_booking_settings to anon,authenticated;

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id text,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.business_settings enable row level security;
alter table public.admin_audit_log enable row level security;
create policy "admins manage business settings" on public.business_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());
create policy "admins add audit log" on public.admin_audit_log for insert to authenticated with check (public.is_admin() and admin_user_id = auth.uid());
grant select, update on public.business_settings to authenticated;
grant select, insert on public.admin_audit_log to authenticated;
grant insert, update on public.instructors, public.locations, public.customers, public.swimmers to authenticated;
create policy "admins manage customers" on public.customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage swimmers" on public.swimmers for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop function if exists public.create_booking(uuid,text,date,text,text,text,text,text);
create function public.create_booking(
  p_lesson_slot_id uuid, p_swimmer_name text, p_date_of_birth date, p_swimming_ability text,
  p_relevant_notes text, p_parent_guardian_name text, p_email text, p_phone text, p_idempotency_key uuid
) returns table (booking_id uuid, booking_reference text, amount_pence integer, status public.booking_status, reservation_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_swimmer uuid; v_booking uuid; v_reference text; v_amount integer; v_timeout integer; v_expiry timestamptz;
begin
  if p_idempotency_key is null then raise exception 'Idempotency key is required'; end if;
  return query select b.id,b.booking_reference,b.amount_pence,b.status,b.reservation_expires_at from public.bookings b where b.idempotency_key=p_idempotency_key;
  if found then return; end if;
  if nullif(trim(p_email),'') is null or nullif(trim(p_swimmer_name),'') is null or p_date_of_birth is null or p_date_of_birth >= current_date or nullif(trim(p_phone),'') is null or nullif(trim(p_swimming_ability),'') is null then raise exception 'Required booking details are invalid'; end if;
  if char_length(coalesce(p_relevant_notes,'')) > 1000 then raise exception 'Relevant notes are too long'; end if;
  select lt.price_pence, bs.reservation_timeout_minutes into v_amount,v_timeout
    from public.lesson_slots s join public.lesson_types lt on lt.id=s.lesson_type_id
    cross join public.business_settings bs
    where s.id=p_lesson_slot_id and s.active and lt.active and s.start_time>now() and bs.booking_enabled for update of s;
  if v_amount is null then raise exception 'Lesson is not available for online booking'; end if;
  insert into public.customers(parent_guardian_name,email,phone) values(nullif(trim(p_parent_guardian_name),''),lower(trim(p_email)),trim(p_phone)) returning id into v_customer;
  insert into public.swimmers(customer_id,swimmer_name,date_of_birth,swimming_ability,relevant_notes) values(v_customer,trim(p_swimmer_name),p_date_of_birth,trim(p_swimming_ability),nullif(trim(p_relevant_notes),'')) returning id into v_swimmer;
  v_reference := public.new_booking_reference(); v_expiry := now()+make_interval(mins=>v_timeout);
  insert into public.bookings(customer_id,swimmer_id,lesson_slot_id,booking_reference,status,payment_status,amount_pence,reservation_expires_at,idempotency_key)
    values(v_customer,v_swimmer,p_lesson_slot_id,v_reference,'pending','unpaid',v_amount,v_expiry,p_idempotency_key) returning id into v_booking;
  return query select v_booking,v_reference,v_amount,'pending'::public.booking_status,v_expiry;
end $$;
revoke all on function public.create_booking(uuid,text,date,text,text,text,text,text,uuid) from public;
grant execute on function public.create_booking(uuid,text,date,text,text,text,text,text,uuid) to service_role;

-- Prevent duplicate schedule rows without deleting or overwriting any existing booking.
create unique index lesson_slots_no_exact_duplicate_idx on public.lesson_slots (lesson_type_id,location_id,start_time);
