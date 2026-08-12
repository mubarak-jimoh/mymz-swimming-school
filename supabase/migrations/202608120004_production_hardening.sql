-- Phase 6 corrective migration: concurrency, expiry and distributed abuse controls.
-- Apply after migrations 001, 002 and 003. Contains no business/customer seed data.

-- New references use 48 random bits. Existing references remain valid.
create or replace function public.new_booking_reference() returns text language plpgsql set search_path = '' as $$
declare ref text;
begin loop
  ref := 'MYMZ-' || to_char(now(), 'YYMM') || '-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));
  exit when not exists (select 1 from public.bookings where booking_reference = ref);
end loop; return ref; end $$;
revoke all on function public.new_booking_reference() from public;

create or replace function public.new_enquiry_reference() returns text language plpgsql set search_path='' as $$
declare ref text;
begin loop
  ref := 'MYMZ-E-' || to_char(now(),'YYMM') || '-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,12));
  exit when not exists(select 1 from public.enquiries where reference=ref);
end loop; return ref; end $$;
revoke all on function public.new_enquiry_reference() from public;

-- Re-check capacity when an expiry is extended, not only when slot/status changes.
drop trigger if exists booking_capacity_guard on public.bookings;
create trigger booking_capacity_guard
before insert or update of lesson_slot_id, status, reservation_expires_at on public.bookings
for each row execute function public.enforce_slot_capacity();

-- Idempotency advisory locks serialise identical submissions before their first lookup.
create or replace function public.create_booking(
  p_lesson_slot_id uuid, p_swimmer_name text, p_date_of_birth date, p_swimming_ability text,
  p_relevant_notes text, p_parent_guardian_name text, p_email text, p_phone text, p_idempotency_key uuid
) returns table (booking_id uuid, booking_reference text, amount_pence integer, status public.booking_status, reservation_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_swimmer uuid; v_booking uuid; v_reference text; v_amount integer; v_timeout integer; v_expiry timestamptz;
begin
  if p_idempotency_key is null then raise exception 'Idempotency key is required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 173));
  return query select b.id,b.booking_reference,b.amount_pence,b.status,b.reservation_expires_at from public.bookings b where b.idempotency_key=p_idempotency_key;
  if found then return; end if;
  if nullif(trim(p_email),'') is null or char_length(trim(p_email)) > 254 or nullif(trim(p_swimmer_name),'') is null or char_length(trim(p_swimmer_name)) > 160 or p_date_of_birth is null or p_date_of_birth >= current_date or nullif(trim(p_phone),'') is null or char_length(trim(p_phone)) > 30 or nullif(trim(p_swimming_ability),'') is null or char_length(trim(p_swimming_ability)) > 120 then raise exception 'Required booking details are invalid'; end if;
  if char_length(coalesce(p_relevant_notes,'')) > 1000 or char_length(coalesce(p_parent_guardian_name,'')) > 160 then raise exception 'Booking details are too long'; end if;
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

create or replace function public.create_enquiry(
  p_swimmer_first_name text,p_swimmer_last_name text,p_date_of_birth date,p_swimming_level text,p_goal text,
  p_lesson_type_id uuid,p_lesson_interest_text text,p_preferred_days text[],p_preferred_period text,
  p_contact_name text,p_email text,p_phone text,p_message text,p_marketing_consent boolean,p_idempotency_key uuid
) returns table(enquiry_id uuid,enquiry_reference text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_ref text;v_created timestamptz;
begin
  if p_idempotency_key is null then raise exception 'Invalid enquiry details'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 197));
  return query select e.id,e.reference,e.created_at from public.enquiries e where e.idempotency_key=p_idempotency_key;
  if found then return; end if;
  if nullif(trim(p_swimmer_first_name),'') is null or char_length(trim(p_swimmer_first_name)) > 80 or nullif(trim(p_swimmer_last_name),'') is null or char_length(trim(p_swimmer_last_name)) > 80 or p_date_of_birth is null or p_date_of_birth>=current_date or nullif(trim(p_contact_name),'') is null or char_length(trim(p_contact_name)) > 160 or nullif(trim(p_email),'') is null or char_length(trim(p_email)) > 254 or nullif(trim(p_phone),'') is null or char_length(trim(p_phone)) > 30 then raise exception 'Invalid enquiry details'; end if;
  if char_length(coalesce(p_goal,'')) > 500 or char_length(coalesce(p_message,'')) > 1000 or cardinality(p_preferred_days) > 7 then raise exception 'Enquiry details are too long'; end if;
  if p_lesson_type_id is not null and not exists(select 1 from public.lesson_types where id=p_lesson_type_id and active) then raise exception 'Lesson interest is unavailable'; end if;
  v_ref:=public.new_enquiry_reference();
  insert into public.enquiries(reference,swimmer_first_name,swimmer_last_name,date_of_birth,swimming_level,goal,lesson_type_id,lesson_interest_text,preferred_days,preferred_period,contact_name,email,phone,message,marketing_consent,privacy_acknowledged_at,idempotency_key)
  values(v_ref,trim(p_swimmer_first_name),trim(p_swimmer_last_name),p_date_of_birth,p_swimming_level,nullif(trim(p_goal),''),p_lesson_type_id,p_lesson_interest_text,p_preferred_days,p_preferred_period,trim(p_contact_name),lower(trim(p_email)),trim(p_phone),nullif(trim(p_message),''),coalesce(p_marketing_consent,false),now(),p_idempotency_key)
  returning id,public.enquiries.created_at into v_id,v_created;
  return query select v_id,v_ref,v_created;
end $$;
revoke all on function public.create_enquiry(text,text,date,text,text,uuid,text,text[],text,text,text,text,text,boolean,uuid) from public;
grant execute on function public.create_enquiry(text,text,date,text,text,uuid,text,text[],text,text,text,text,text,boolean,uuid) to service_role;

-- Shared, database-backed limiter for server endpoints. No PII is stored: callers
-- supply a one-way HMAC digest of the client address, scoped per endpoint.
create table public.request_rate_limits (
  scope text not null check (scope in ('enquiry','booking')),
  client_key text not null check (char_length(client_key) = 64),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, client_key)
);
alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from anon, authenticated;

create function public.consume_rate_limit(p_scope text,p_client_key text,p_limit integer,p_window_seconds integer)
returns table(allowed boolean,retry_after_seconds integer) language plpgsql security definer set search_path='' as $$
declare v_now timestamptz:=clock_timestamp();v_started timestamptz;v_count integer;
begin
  if p_scope not in ('enquiry','booking') or char_length(p_client_key)<>64 or p_limit not between 1 and 100 or p_window_seconds not between 10 and 86400 then raise exception 'Invalid rate limit request'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_scope||':'||p_client_key, 211));
  select window_started_at,request_count into v_started,v_count from public.request_rate_limits where scope=p_scope and client_key=p_client_key;
  if v_started is null or v_started + make_interval(secs=>p_window_seconds) <= v_now then
    insert into public.request_rate_limits(scope,client_key,window_started_at,request_count) values(p_scope,p_client_key,v_now,1)
    on conflict(scope,client_key) do update set window_started_at=excluded.window_started_at,request_count=1;
    return query select true,p_window_seconds; return;
  end if;
  update public.request_rate_limits set request_count=request_count+1 where scope=p_scope and client_key=p_client_key returning request_count into v_count;
  return query select v_count<=p_limit,greatest(1,ceil(extract(epoch from (v_started+make_interval(secs=>p_window_seconds)-v_now)))::integer);
end $$;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to service_role;

-- Safe and repeatable cleanup. Expired unpaid reservations become cancelled and no
-- longer consume capacity. Invoke from Supabase Cron or another trusted scheduler.
create function public.expire_pending_bookings() returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  update public.bookings set status='cancelled',updated_at=now()
  where status='pending' and payment_status in ('unpaid','failed') and reservation_expires_at<=now();
  get diagnostics v_count=row_count; return v_count;
end $$;
revoke all on function public.expire_pending_bookings() from public;
grant execute on function public.expire_pending_bookings() to service_role;
