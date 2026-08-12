-- Phase 7: low-friction public enquiries with backward compatibility.
-- Existing split names, dates of birth and goals remain untouched and readable.

alter table public.enquiries
  add column swimmer_name text check (swimmer_name is null or char_length(swimmer_name) between 1 and 160),
  add column age_group text check (age_group is null or age_group in ('under_3','3_5','6_8','9_12','13_17','adult'));

alter table public.enquiries
  alter column swimmer_first_name drop not null,
  alter column swimmer_last_name drop not null,
  alter column date_of_birth drop not null;

alter table public.enquiries drop constraint if exists enquiries_swimming_level_check;
alter table public.enquiries add constraint enquiries_swimming_level_check
  check (swimming_level in (
    'complete_beginner','beginner','intermediate','confident_swimmer','not_sure',
    'building_confidence','short_distance','developing_technique'
  ));
alter table public.enquiries add constraint enquiries_swimmer_identity_check
  check (
    swimmer_name is not null or
    (swimmer_first_name is not null and swimmer_last_name is not null)
  );
alter table public.enquiries add constraint enquiries_age_information_check
  check (age_group is not null or date_of_birth is not null);

alter table public.swimmers
  add column age_group text check (age_group is null or age_group in ('under_3','3_5','6_8','9_12','13_17','adult'));
alter table public.swimmers alter column date_of_birth drop not null;
alter table public.swimmers add constraint swimmers_age_information_check
  check (date_of_birth is not null or age_group is not null);

create function public.create_enquiry_v2(
  p_swimmer_name text,p_age_group text,p_swimming_level text,p_lesson_type_id uuid,
  p_lesson_interest_text text,p_preferred_days text[],p_preferred_period text,
  p_contact_name text,p_email text,p_phone text,p_message text,p_marketing_consent boolean,
  p_idempotency_key uuid
) returns table(enquiry_id uuid,enquiry_reference text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_ref text;v_created timestamptz;
begin
  if p_idempotency_key is null then raise exception 'Invalid enquiry details'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 223));
  return query select e.id,e.reference,e.created_at from public.enquiries e where e.idempotency_key=p_idempotency_key;
  if found then return; end if;
  if nullif(trim(p_swimmer_name),'') is null or char_length(trim(p_swimmer_name))>160
    or p_age_group not in ('under_3','3_5','6_8','9_12','13_17','adult')
    or p_swimming_level not in ('complete_beginner','beginner','intermediate','confident_swimmer','not_sure')
    or nullif(trim(p_contact_name),'') is null or char_length(trim(p_contact_name))>160
    or nullif(trim(p_email),'') is null or char_length(trim(p_email))>254
    or nullif(trim(p_phone),'') is null or char_length(trim(p_phone))>30
    or p_preferred_period not in ('morning','afternoon','evening','flexible')
    or cardinality(p_preferred_days) not between 1 and 7
    or not (p_preferred_days <@ array['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::text[])
    or char_length(coalesce(p_message,''))>1000
  then raise exception 'Invalid enquiry details'; end if;
  if p_lesson_type_id is not null and not exists(select 1 from public.lesson_types where id=p_lesson_type_id and active)
    then raise exception 'Lesson interest is unavailable'; end if;
  v_ref:=public.new_enquiry_reference();
  insert into public.enquiries(
    reference,swimmer_name,age_group,swimming_level,lesson_type_id,lesson_interest_text,
    preferred_days,preferred_period,contact_name,email,phone,message,marketing_consent,
    privacy_acknowledged_at,idempotency_key
  ) values (
    v_ref,trim(p_swimmer_name),p_age_group,p_swimming_level,p_lesson_type_id,p_lesson_interest_text,
    p_preferred_days,p_preferred_period,trim(p_contact_name),lower(trim(p_email)),trim(p_phone),
    nullif(trim(p_message),''),coalesce(p_marketing_consent,false),now(),p_idempotency_key
  ) returning id,public.enquiries.created_at into v_id,v_created;
  return query select v_id,v_ref,v_created;
end $$;
revoke all on function public.create_enquiry_v2(text,text,text,uuid,text,text[],text,text,text,text,text,boolean,uuid) from public;
grant execute on function public.create_enquiry_v2(text,text,text,uuid,text,text[],text,text,text,text,text,boolean,uuid) to service_role;

create or replace function public.convert_enquiry_to_customer(p_enquiry_id uuid)
returns table(customer_id uuid,swimmer_id uuid) language plpgsql security definer set search_path='' as $$
declare e public.enquiries%rowtype;v_customer uuid;v_swimmer uuid;v_name text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into e from public.enquiries where id=p_enquiry_id for update;
  if e.id is null then raise exception 'Enquiry not found'; end if;
  if e.converted_customer_id is not null then return query select e.converted_customer_id,e.converted_swimmer_id;return;end if;
  v_name:=coalesce(nullif(trim(e.swimmer_name),''),trim(coalesce(e.swimmer_first_name,'')||' '||coalesce(e.swimmer_last_name,'')));
  insert into public.customers(parent_guardian_name,email,phone) values(e.contact_name,e.email,e.phone) returning id into v_customer;
  insert into public.swimmers(customer_id,swimmer_name,date_of_birth,age_group,swimming_ability,relevant_notes)
    values(v_customer,v_name,e.date_of_birth,e.age_group,e.swimming_level,nullif(substr(trim(coalesce(e.goal,'')||case when e.message is null then '' else E'\n'||e.message end),1,1000),''))
    returning id into v_swimmer;
  update public.enquiries set converted_customer_id=v_customer,converted_swimmer_id=v_swimmer,status='converted' where id=e.id;
  return query select v_customer,v_swimmer;
end $$;
revoke all on function public.convert_enquiry_to_customer(uuid) from public;
grant execute on function public.convert_enquiry_to_customer(uuid) to authenticated;
