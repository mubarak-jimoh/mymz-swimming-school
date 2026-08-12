-- Phase 4: private customer enquiries and configurable public price presentation.
-- No competitor prices, MYMZ products, enquiries or other production records are seeded.

alter table public.lesson_types
  add column price_unit text not null default 'lesson'
    check (price_unit in ('lesson','swimmer','block','term')),
  add column price_from boolean not null default false;

create type public.enquiry_status as enum ('new','contacted','follow_up','converted','closed');

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  swimmer_first_name text not null check (char_length(swimmer_first_name) between 1 and 80),
  swimmer_last_name text not null check (char_length(swimmer_last_name) between 1 and 80),
  date_of_birth date not null check (date_of_birth < current_date),
  swimming_level text not null check (swimming_level in ('complete_beginner','building_confidence','short_distance','developing_technique','confident_swimmer','not_sure')),
  goal text check (goal is null or char_length(goal) <= 500),
  lesson_type_id uuid references public.lesson_types(id) on delete set null,
  lesson_interest_text text not null check (lesson_interest_text = 'not_sure' or char_length(lesson_interest_text) between 1 and 120),
  preferred_days text[] not null default '{}'::text[] check (preferred_days <@ array['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::text[]),
  preferred_period text not null check (preferred_period in ('morning','afternoon','evening','flexible')),
  contact_name text not null check (char_length(contact_name) between 2 and 160),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  phone text not null check (char_length(phone) between 8 and 30),
  message text check (message is null or char_length(message) <= 1000),
  status public.enquiry_status not null default 'new',
  marketing_consent boolean not null default false,
  privacy_acknowledged_at timestamptz not null,
  idempotency_key uuid not null unique,
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','partial','failed','not_configured')),
  notification_error text,
  converted_customer_id uuid references public.customers(id) on delete set null,
  converted_swimmer_id uuid references public.swimmers(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index enquiries_status_created_idx on public.enquiries (status,created_at desc);
create index enquiries_lesson_created_idx on public.enquiries (lesson_type_id,created_at desc);
create index enquiries_email_idx on public.enquiries (lower(email));
create trigger enquiries_updated before update on public.enquiries for each row execute function public.set_updated_at();

alter table public.enquiries enable row level security;
create policy "admins manage enquiries" on public.enquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.enquiries from anon,authenticated;
grant select,update on public.enquiries to authenticated;

create function public.new_enquiry_reference() returns text language plpgsql set search_path='' as $$
declare ref text;
begin loop
  ref := 'MYMZ-E-' || to_char(now(),'YYMM') || '-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,8));
  exit when not exists(select 1 from public.enquiries where reference=ref);
end loop; return ref; end $$;
revoke all on function public.new_enquiry_reference() from public;

create function public.create_enquiry(
  p_swimmer_first_name text,p_swimmer_last_name text,p_date_of_birth date,p_swimming_level text,p_goal text,
  p_lesson_type_id uuid,p_lesson_interest_text text,p_preferred_days text[],p_preferred_period text,
  p_contact_name text,p_email text,p_phone text,p_message text,p_marketing_consent boolean,p_idempotency_key uuid
) returns table(enquiry_id uuid,enquiry_reference text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_ref text;v_created timestamptz;
begin
  return query select e.id,e.reference,e.created_at from public.enquiries e where e.idempotency_key=p_idempotency_key;
  if found then return; end if;
  if p_idempotency_key is null or nullif(trim(p_swimmer_first_name),'') is null or nullif(trim(p_swimmer_last_name),'') is null or p_date_of_birth is null or p_date_of_birth>=current_date or nullif(trim(p_contact_name),'') is null or nullif(trim(p_email),'') is null or nullif(trim(p_phone),'') is null then raise exception 'Invalid enquiry details'; end if;
  if p_lesson_type_id is not null and not exists(select 1 from public.lesson_types where id=p_lesson_type_id and active) then raise exception 'Lesson interest is unavailable'; end if;
  v_ref:=public.new_enquiry_reference();
  insert into public.enquiries(reference,swimmer_first_name,swimmer_last_name,date_of_birth,swimming_level,goal,lesson_type_id,lesson_interest_text,preferred_days,preferred_period,contact_name,email,phone,message,marketing_consent,privacy_acknowledged_at,idempotency_key)
  values(v_ref,trim(p_swimmer_first_name),trim(p_swimmer_last_name),p_date_of_birth,p_swimming_level,nullif(trim(p_goal),''),p_lesson_type_id,p_lesson_interest_text,p_preferred_days,p_preferred_period,trim(p_contact_name),lower(trim(p_email)),trim(p_phone),nullif(trim(p_message),''),coalesce(p_marketing_consent,false),now(),p_idempotency_key)
  returning id,public.enquiries.created_at into v_id,v_created;
  return query select v_id,v_ref,v_created;
end $$;
revoke all on function public.create_enquiry(text,text,date,text,text,uuid,text,text[],text,text,text,text,text,boolean,uuid) from public;
grant execute on function public.create_enquiry(text,text,date,text,text,uuid,text,text[],text,text,text,text,text,boolean,uuid) to service_role;

create function public.convert_enquiry_to_customer(p_enquiry_id uuid)
returns table(customer_id uuid,swimmer_id uuid) language plpgsql security definer set search_path='' as $$
declare e public.enquiries%rowtype;v_customer uuid;v_swimmer uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into e from public.enquiries where id=p_enquiry_id for update;
  if e.id is null then raise exception 'Enquiry not found'; end if;
  if e.converted_customer_id is not null then return query select e.converted_customer_id,e.converted_swimmer_id;return;end if;
  insert into public.customers(parent_guardian_name,email,phone) values(e.contact_name,e.email,e.phone) returning id into v_customer;
  insert into public.swimmers(customer_id,swimmer_name,date_of_birth,swimming_ability,relevant_notes) values(v_customer,trim(e.swimmer_first_name||' '||e.swimmer_last_name),e.date_of_birth,e.swimming_level,nullif(substr(trim(coalesce(e.goal,'')||case when e.message is null then '' else E'\n'||e.message end),1,1000),'')) returning id into v_swimmer;
  update public.enquiries set converted_customer_id=v_customer,converted_swimmer_id=v_swimmer,status='converted' where id=e.id;
  return query select v_customer,v_swimmer;
end $$;
revoke all on function public.convert_enquiry_to_customer(uuid) from public;
grant execute on function public.convert_enquiry_to_customer(uuid) to authenticated;
