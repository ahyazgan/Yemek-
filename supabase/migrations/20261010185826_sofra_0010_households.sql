-- A household shares only explicitly published menu titles and shopping rows.
-- Personal snapshots, recipe photos, budgets and pantry inventories stay private.
create table public.shared_households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_revision bigint not null default 0
);
create table public.household_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.shared_households(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  role text not null check (role in ('owner','editor','viewer'))
);
create index household_member_home on public.household_members(household_id);
create table public.household_invites (
  household_id uuid primary key references public.shared_households(id) on delete cascade,
  token_hash text not null unique,
  role text not null check (role in ('editor','viewer')),
  expires_at timestamptz not null
);
create table public.household_boards (
  household_id uuid not null references public.shared_households(id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  revision integer not null check (revision > 0),
  content jsonb not null check (octet_length(content::text) <= 100000),
  primary key (household_id, week)
);
alter table public.shared_households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.household_boards enable row level security;
revoke all on public.shared_households, public.household_members, public.household_invites, public.household_boards from public, anon, authenticated;
grant select on public.shared_households, public.household_members, public.household_boards to authenticated;

create function public.hh_role(p_home uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.household_members where household_id = p_home and user_id = auth.uid()
$$;
revoke all on function public.hh_role(uuid) from public, anon;
grant execute on function public.hh_role(uuid) to authenticated;
create policy household_read on public.shared_households for select to authenticated using (public.hh_role(id) is not null);
create policy members_read on public.household_members for select to authenticated using (public.hh_role(household_id) is not null);
create policy board_read on public.household_boards for select to authenticated using (public.hh_role(household_id) is not null);

-- All mutating RPCs lock the household before checking membership. Revocation,
-- joins, ownership transfer and writes therefore serialize on the same row.
create function public.hh_actor(p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_actor is distinct from auth.uid() then raise exception 'HOUSEHOLD_AUTH'; end if;
end $$;
create function public.hh_lock(p_actor uuid, p_home uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare member_role text;
begin
  perform public.hh_actor(p_actor);
  perform 1 from public.shared_households where id=p_home for update;
  select role into member_role from public.household_members where user_id=p_actor and household_id=p_home;
  if member_role is null then raise exception 'HOUSEHOLD_ACCESS'; end if;
  return member_role;
end $$;
revoke all on function public.hh_actor(uuid), public.hh_lock(uuid,uuid) from public, anon, authenticated;

create function public.hh_valid_content(v jsonb, w date) returns boolean
language plpgsql immutable set search_path = '' as $$
declare row_value jsonb;
begin
  if v is null or jsonb_typeof(v) <> 'object' or octet_length(v::text)>100000
    or (select count(*) from jsonb_object_keys(v)) <> 2
    or jsonb_typeof(v->'menu') is distinct from 'array'
    or jsonb_typeof(v->'items') is distinct from 'array' then return false; end if;
  if jsonb_array_length(v->'menu')>14 or jsonb_array_length(v->'items')>200 then return false; end if;
  for row_value in select value from jsonb_array_elements(v->'items') loop
    if jsonb_typeof(row_value) <> 'object' or (select count(*) from jsonb_object_keys(row_value))<>5
      or jsonb_typeof(row_value->'id') is distinct from 'string'
      or coalesce(row_value->>'id','') !~ '^[a-zA-Z0-9-]{1,120}$'
      or jsonb_typeof(row_value->'name') is distinct from 'string'
      or char_length(btrim(coalesce(row_value->>'name',''))) not between 1 and 100
      or jsonb_typeof(row_value->'quantity') is distinct from 'number'
      or (row_value->>'quantity')::numeric <= 0 or (row_value->>'quantity')::numeric > 10000000
      or coalesce(row_value->>'unit','') not in ('g','ml','adet','paket')
      or jsonb_typeof(row_value->'checked') is distinct from 'boolean' then return false; end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(v->'items')) <> jsonb_array_length(v->'items') then return false; end if;
  for row_value in select value from jsonb_array_elements(v->'menu') loop
    if jsonb_typeof(row_value) <> 'object' or (select count(*) from jsonb_object_keys(row_value))<>4
      or coalesce(row_value->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
      or (row_value->>'date')::date < w or (row_value->>'date')::date >= w+7
      or coalesce(row_value->>'slot','') not in ('lunch','dinner')
      or jsonb_typeof(row_value->'title') is distinct from 'string'
      or char_length(btrim(coalesce(row_value->>'title',''))) not between 2 and 100
      or jsonb_typeof(row_value->'servings') is distinct from 'number'
      or (row_value->>'servings')::numeric not between 1 and 12
      or mod((row_value->>'servings')::numeric,1)<>0 then return false; end if;
  end loop;
  if (select count(distinct (value->>'date',value->>'slot')) from jsonb_array_elements(v->'menu')) <> jsonb_array_length(v->'menu') then return false; end if;
  return true;
exception when others then return false;
end $$;
revoke all on function public.hh_valid_content(jsonb,date) from public, anon, authenticated;

create function public.hh_get(p_actor uuid, p_week date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare home public.shared_households; board jsonb; people jsonb;
begin
  perform public.hh_actor(p_actor);
  if p_week is null or extract(isodow from p_week)<>1 then raise exception 'HOUSEHOLD_INPUT'; end if;
  select h.* into home from public.shared_households h join public.household_members m on m.household_id=h.id where m.user_id=p_actor;
  if home.id is null then return null; end if;
  select jsonb_agg(jsonb_build_object('id',user_id,'name',display_name,'role',role) order by display_name,user_id)
    into people from public.household_members where household_id=home.id;
  select jsonb_build_object('week',week,'revision',revision,'content',content) into board
    from public.household_boards where household_id=home.id and week=p_week;
  return jsonb_build_object('id',home.id,'name',home.name,'ownerId',home.owner_id,'members',people,
    'board',coalesce(board,jsonb_build_object('week',p_week,'revision',0,'content','{"menu":[],"items":[]}'::jsonb)));
end $$;

create function public.hh_create(p_actor uuid, p_name text, p_person text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare home_id uuid;
begin
  perform public.hh_actor(p_actor);
  if exists(select 1 from public.household_members where user_id=p_actor) then raise exception 'HOUSEHOLD_ALREADY'; end if;
  insert into public.shared_households(name,owner_id) values(btrim(p_name),p_actor) returning id into home_id;
  insert into public.household_members(user_id,household_id,display_name,role) values(p_actor,home_id,btrim(p_person),'owner');
  return home_id;
end $$;

create function public.hh_invite(p_actor uuid, p_home uuid, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare token text := replace(gen_random_uuid()::text,'-',''); expires timestamptz := clock_timestamp()+interval '24 hours';
begin
  if public.hh_lock(p_actor,p_home)<>'owner' then raise exception 'HOUSEHOLD_ACCESS'; end if;
  if p_role is null or p_role not in ('editor','viewer') then raise exception 'HOUSEHOLD_INPUT'; end if;
  insert into public.household_invites(household_id,token_hash,role,expires_at)
    values(p_home,encode(sha256(convert_to(token,'UTF8')),'hex'),p_role,expires)
    on conflict(household_id) do update set token_hash=excluded.token_hash,role=excluded.role,expires_at=excluded.expires_at;
  return jsonb_build_object('code',token,'expiresAt',expires,'role',p_role);
end $$;

create function public.hh_preview(p_actor uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform public.hh_actor(p_actor);
  if p_code is null or p_code !~ '^[0-9a-f]{32}$' then raise exception 'HOUSEHOLD_INVITE'; end if;
  select jsonb_build_object('name',h.name,'role',i.role,'expiresAt',i.expires_at) into result
    from public.household_invites i join public.shared_households h on h.id=i.household_id
    where i.token_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex') and i.expires_at>clock_timestamp();
  if result is null then raise exception 'HOUSEHOLD_INVITE'; end if;
  return result;
end $$;

create function public.hh_join(p_actor uuid, p_code text, p_person text) returns void
language plpgsql security definer set search_path = '' as $$
declare home_id uuid; invitation public.household_invites;
begin
  perform public.hh_actor(p_actor);
  if p_code is null or p_code !~ '^[0-9a-f]{32}$' then raise exception 'HOUSEHOLD_INVITE'; end if;
  select household_id into home_id from public.household_invites where token_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex');
  perform 1 from public.shared_households where id=home_id for update;
  select * into invitation from public.household_invites where household_id=home_id
    and token_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex') and expires_at>clock_timestamp();
  if invitation.household_id is null then raise exception 'HOUSEHOLD_INVITE'; end if;
  if exists(select 1 from public.household_members where user_id=p_actor) then raise exception 'HOUSEHOLD_ALREADY'; end if;
  if (select count(*) from public.household_members where household_id=home_id)>=12 then raise exception 'HOUSEHOLD_FULL'; end if;
  insert into public.household_members values(p_actor,home_id,btrim(p_person),invitation.role);
  delete from public.household_invites where household_id=home_id;
  update public.shared_households set event_revision=event_revision+1 where id=home_id;
end $$;

create function public.hh_manage(p_actor uuid, p_home uuid, p_action text, p_target uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare actor_role text;
begin
  actor_role := public.hh_lock(p_actor,p_home);
  if p_action='leave' then
    if actor_role='owner' then raise exception 'HOUSEHOLD_TRANSFER_FIRST'; end if;
    delete from public.household_members where user_id=p_actor and household_id=p_home;
  else
    if actor_role<>'owner' then raise exception 'HOUSEHOLD_ACCESS'; end if;
    if p_action='close' then delete from public.shared_households where id=p_home; return;
    elsif p_action='revoke' then delete from public.household_invites where household_id=p_home;
    elsif p_action in ('editor','viewer','remove','transfer') then
      if p_target is null or p_target=p_actor or not exists(select 1 from public.household_members where user_id=p_target and household_id=p_home) then raise exception 'HOUSEHOLD_INPUT'; end if;
      if p_action='remove' then delete from public.household_members where user_id=p_target and household_id=p_home;
      elsif p_action='transfer' then
        update public.shared_households set owner_id=p_target where id=p_home;
        update public.household_members set role=case when user_id=p_target then 'owner' else 'editor' end where household_id=p_home and user_id in (p_actor,p_target);
        delete from public.household_invites where household_id=p_home;
      else update public.household_members set role=p_action where user_id=p_target and household_id=p_home;
      end if;
    else raise exception 'HOUSEHOLD_INPUT'; end if;
  end if;
  update public.shared_households set event_revision=event_revision+1 where id=p_home;
end $$;

create function public.hh_write(p_actor uuid, p_home uuid, p_week date, p_expected integer, p_content jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if public.hh_lock(p_actor,p_home) not in ('owner','editor') then raise exception 'HOUSEHOLD_ACCESS'; end if;
  if p_week is null or extract(isodow from p_week)<>1 or not public.hh_valid_content(p_content,p_week) then raise exception 'HOUSEHOLD_INPUT'; end if;
  select revision into current_revision from public.household_boards where household_id=p_home and week=p_week;
  current_revision := coalesce(current_revision,0);
  if p_expected is distinct from current_revision then raise exception 'HOUSEHOLD_CONFLICT'; end if;
  if current_revision=0 and (select count(*) from public.household_boards where household_id=p_home)>=104 then raise exception 'HOUSEHOLD_LIMIT'; end if;
  insert into public.household_boards values(p_home,p_week,current_revision+1,p_content)
    on conflict(household_id,week) do update set revision=excluded.revision,content=excluded.content;
  update public.shared_households set event_revision=event_revision+1 where id=p_home;
  return current_revision+1;
end $$;

revoke all on function public.hh_get(uuid,date), public.hh_create(uuid,text,text), public.hh_invite(uuid,uuid,text),
  public.hh_preview(uuid,text), public.hh_join(uuid,text,text), public.hh_manage(uuid,uuid,text,uuid), public.hh_write(uuid,uuid,date,integer,jsonb) from public, anon;
grant execute on function public.hh_get(uuid,date), public.hh_create(uuid,text,text), public.hh_invite(uuid,uuid,text),
  public.hh_preview(uuid,text), public.hh_join(uuid,text,text), public.hh_manage(uuid,uuid,text,uuid), public.hh_write(uuid,uuid,date,integer,jsonb) to authenticated;

-- Supabase Realtime is optional; polling/foreground refresh also rechecks access.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_households'
  ) then alter publication supabase_realtime add table public.shared_households; end if;
end $$;
