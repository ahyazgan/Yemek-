-- NULL means unknown/not configured; an empty array means no appliances required/available.
create function public.valid_equipment(items text[]) returns boolean
language sql immutable set search_path = '' as $$
  select items is null or (
    items <@ array['hob','oven','blender','fridge']::text[]
    and array_position(items,null) is null
    and cardinality(items) = (select count(distinct item) from unnest(items) item)
  );
$$;
alter table public.recipes add column equipment text[] check (public.valid_equipment(equipment));
alter table public.user_preferences add column equipment text[] check (public.valid_equipment(equipment));
