-- Final low-friction enquiry contract.
-- Apply after 202608120006_simplified_enquiries.sql.
-- Historical enquiry fields and values remain readable; new public enquiries use create_enquiry_v3.

alter table public.enquiries drop constraint if exists enquiries_swimming_level_check;
alter table public.enquiries add constraint enquiries_swimming_level_check
  check (swimming_level in (
    'complete_beginner','building_water_confidence','can_swim_independently','confident_swimmer','not_sure',
    'beginner','intermediate','building_confidence','short_distance','developing_technique'
  ));

create function public.create_enquiry_v3(
  p_swimmer_name text,
  p_age_group text,
  p_swimming_level text,
  p_preferred_days text[],
  p_preferred_period text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_idempotency_key uuid
) returns table(enquiry_id uuid,enquiry_reference text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_ref text;v_created timestamptz;
begin
  if p_idempotency_key is null then raise exception 'Invalid enquiry details'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 224));
  return query select e.id,e.reference,e.created_at from public.enquiries e where e.idempotency_key=p_idempotency_key;
  if found then return; end if;
  if nullif(trim(p_swimmer_name),'') is null or char_length(trim(p_swimmer_name))>160
    or p_age_group not in ('under_3','3_5','6_8','9_12','13_17','adult')
    or p_swimming_level not in ('complete_beginner','building_water_confidence','can_swim_independently','confident_swimmer','not_sure')
    or nullif(trim(p_contact_name),'') is null or char_length(trim(p_contact_name))>160
    or nullif(trim(p_email),'') is null or char_length(trim(p_email))>254
    or nullif(trim(p_phone),'') is null or char_length(trim(p_phone))>30
    or p_preferred_period not in ('morning','afternoon','evening','flexible')
    or cardinality(p_preferred_days) not between 1 and 7
    or not (p_preferred_days <@ array['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::text[])
    or char_length(coalesce(p_message,''))>1000
  then raise exception 'Invalid enquiry details'; end if;
  v_ref:=public.new_enquiry_reference();
  insert into public.enquiries(
    reference,swimmer_name,age_group,swimming_level,lesson_type_id,lesson_interest_text,
    preferred_days,preferred_period,contact_name,email,phone,message,marketing_consent,
    privacy_acknowledged_at,idempotency_key
  ) values (
    v_ref,trim(p_swimmer_name),p_age_group,p_swimming_level,null,'not_sure',
    p_preferred_days,p_preferred_period,trim(p_contact_name),lower(trim(p_email)),trim(p_phone),
    nullif(trim(p_message),''),false,now(),p_idempotency_key
  ) returning id,public.enquiries.created_at into v_id,v_created;
  return query select v_id,v_ref,v_created;
end $$;

revoke all on function public.create_enquiry_v3(text,text,text,text[],text,text,text,text,text,uuid) from public;
grant execute on function public.create_enquiry_v3(text,text,text,text[],text,text,text,text,text,uuid) to service_role;
