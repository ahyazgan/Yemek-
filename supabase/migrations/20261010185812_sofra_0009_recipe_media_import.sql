-- Private photo/source fields are mirrored by app_snapshots in the current app.
alter table public.recipes add column photo jsonb;
alter table public.recipes add column source jsonb;
alter table public.recipes add constraint recipe_photo_limit check (photo is null or octet_length(photo::text) <= 225000);
alter table public.recipes add constraint recipe_source_limit check (source is null or octet_length(source::text) <= 5000);

-- Server-owned quota: a user cannot reset it or consume another user's allowance.
create table public.recipe_import_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_at timestamptz not null,
  requests integer not null check (requests between 1 and 10)
);
alter table public.recipe_import_quotas enable row level security;
revoke all on public.recipe_import_quotas from public, anon, authenticated;
create function public.consume_recipe_import(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare at_time timestamptz := clock_timestamp(); used integer;
begin
  insert into public.recipe_import_quotas as quota(user_id, window_at, requests)
  values (p_user_id, at_time, 1)
  on conflict (user_id) do update set
    window_at = case when quota.window_at <= at_time - interval '1 minute' then at_time else quota.window_at end,
    requests = case when quota.window_at <= at_time - interval '1 minute' then 1 else quota.requests + 1 end
  where quota.window_at <= at_time - interval '1 minute' or quota.requests < 10
  returning requests into used;
  return used is not null;
end;
$$;
revoke all on function public.consume_recipe_import(uuid) from public, anon, authenticated;
grant execute on function public.consume_recipe_import(uuid) to service_role;
