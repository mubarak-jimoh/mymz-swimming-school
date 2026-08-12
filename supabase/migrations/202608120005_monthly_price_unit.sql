-- Phase 7: allow monthly catalogue pricing without implementing recurring billing.
-- Contains no data changes and preserves every existing price unit.

alter table public.lesson_types
  drop constraint if exists lesson_types_price_unit_check;

alter table public.lesson_types
  add constraint lesson_types_price_unit_check
  check (price_unit in ('lesson', 'swimmer', 'block', 'term', 'per_month'));
