-- Optional editorial detail; existing recipes and ownership/RLS stay intact.
alter table public.recipes add column details jsonb;

create function public.valid_recipe_details(value jsonb, total_minutes integer)
returns boolean language plpgsql immutable set search_path = public as $$
declare key text; n integer;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) is distinct from 'object' then return false; end if;
  foreach key in array array['prepMinutes','cookMinutes','restMinutes'] loop
    if jsonb_typeof(value->key) is distinct from 'number' then return false; end if;
    if (value->>key) !~ '^[0-9]{1,3}$' then return false; end if;
    n := (value->>key)::integer;
    if n < 0 or n > 600 then return false; end if;
  end loop;
  if (value->>'prepMinutes')::integer + (value->>'cookMinutes')::integer +
     (value->>'restMinutes')::integer <> total_minutes then return false; end if;
  if jsonb_typeof(value->'difficulty') is distinct from 'string' or
     (value->>'difficulty') not in ('easy','medium') then return false; end if;
  if jsonb_typeof(value->'servingSuggestion') is distinct from 'string' then return false; end if;
  if length(value->>'servingSuggestion') > 600 then return false; end if;
  if jsonb_typeof(value->'tips') is distinct from 'array' then return false; end if;
  if jsonb_array_length(value->'tips') > 8 then return false; end if;
  if exists (select 1 from jsonb_array_elements(value->'tips') t
    where jsonb_typeof(t) <> 'string' or length(btrim(t #>> '{}')) not between 3 and 600)
    then return false; end if;
  return true;
end;
$$;
alter table public.recipes add constraint recipes_details_valid
  check (public.valid_recipe_details(details, minutes));
