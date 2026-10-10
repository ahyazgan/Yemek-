-- Existing snapshot payloads remain compatible; the application supplies optional defaults.
create or replace function public.valid_equipment(items text[]) returns boolean
language sql immutable set search_path = '' as $$
  select items is null or (
    items <@ array['hob','oven','blender','fridge','airfryer','multicooker']::text[]
    and array_position(items,null) is null
    and cardinality(items) = (select count(distinct item) from unnest(items) item)
  );
$$;
alter table public.recipes add column enrichment jsonb
  check (enrichment is null or jsonb_typeof(enrichment) = 'object');
-- Companion data is private inside app_snapshots.payload.experience.tools. No public grants.
