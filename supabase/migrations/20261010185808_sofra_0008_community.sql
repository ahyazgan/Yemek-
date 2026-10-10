-- Optional community: private by default, explicit publishing; never exposes account email or snapshots.
create table public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z][a-z0-9_]{2,29}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  bio text not null default '' check (char_length(bio) <= 300),
  is_public boolean not null default false
);
create table public.community_friends (
  requester_id uuid not null references public.community_profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.community_profiles(user_id) on delete cascade,
  status text not null check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key(requester_id,recipient_id), check (requester_id <> recipient_id)
);
create table public.community_blocks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references public.community_profiles(user_id) on delete cascade,
  primary key(owner_id,blocked_id), check (owner_id <> blocked_id)
);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.community_profiles(user_id) on delete cascade,
  recipe jsonb not null check (jsonb_typeof(recipe) = 'object' and recipe ?& array['title','ingredients','steps'] and jsonb_typeof(recipe->'title') = 'string' and jsonb_typeof(recipe->'ingredients') = 'array' and jsonb_typeof(recipe->'steps') = 'array' and octet_length(recipe::text) <= 50000),
  created_at timestamptz not null default now()
);
create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references public.community_profiles(user_id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz not null default now()
);
create index community_posts_owner on public.community_posts(owner_id);
create index community_friends_recipient on public.community_friends(recipient_id);
create unique index community_friends_pair on public.community_friends(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
alter table public.community_profiles enable row level security;
alter table public.community_friends enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_reports enable row level security;

create function public.community_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.community_blocks where (owner_id=a and blocked_id=b) or (owner_id=b and blocked_id=a));
$$;
create function public.community_can_read(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (auth.uid()=target or (
    not public.community_blocked(auth.uid(),target) and (
      exists(select 1 from public.community_profiles where user_id=target and is_public) or
      exists(select 1 from public.community_friends where status='accepted' and ((requester_id=auth.uid() and recipient_id=target) or (recipient_id=auth.uid() and requester_id=target)))
    )
  ));
$$;
revoke all on function public.community_blocked(uuid,uuid), public.community_can_read(uuid) from public,anon;
grant execute on function public.community_can_read(uuid) to authenticated;
create policy community_profile_read on public.community_profiles for select to authenticated using(public.community_can_read(user_id));
create policy community_profile_insert on public.community_profiles for insert to authenticated with check(user_id=auth.uid());
create policy community_profile_update on public.community_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy community_friends_read on public.community_friends for select to authenticated using(requester_id=auth.uid() or recipient_id=auth.uid());
create policy community_blocks_read on public.community_blocks for select to authenticated using(owner_id=auth.uid());
create policy community_posts_read on public.community_posts for select to authenticated using(public.community_can_read(owner_id));
create policy community_posts_insert on public.community_posts for insert to authenticated with check(owner_id=auth.uid());
create policy community_posts_delete on public.community_posts for delete to authenticated using(owner_id=auth.uid());
create policy community_reports_insert on public.community_reports for insert to authenticated with check(reporter_id=auth.uid());
revoke all on public.community_profiles, public.community_friends, public.community_blocks, public.community_posts, public.community_reports from anon,authenticated;
grant select,insert,update on public.community_profiles to authenticated;
grant select on public.community_friends, public.community_blocks to authenticated;
grant select,insert,delete on public.community_posts to authenticated;
grant insert on public.community_reports to authenticated;

-- Private accounts can be found by exact handle only, returning a minimal identity card.
create function public.community_find(person_handle text) returns table(user_id uuid,handle text,display_name text,is_public boolean)
language sql stable security definer set search_path = '' as $$
  select p.user_id,p.handle,p.display_name,p.is_public from public.community_profiles p
  where auth.uid() is not null and p.handle=lower(trim(person_handle)) and not public.community_blocked(auth.uid(),p.user_id) limit 1;
$$;
create function public.community_request(person_handle text) returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.community_profiles where user_id=auth.uid()) then raise exception 'Profile required'; end if;
  select p.user_id into target from public.community_profiles p where p.handle=lower(trim(person_handle));
  if target is null or target=auth.uid() or public.community_blocked(auth.uid(),target) then raise exception 'Unavailable profile'; end if;
  if exists(select 1 from public.community_friends where requester_id=target and recipient_id=auth.uid()) then raise exception 'Incoming request already exists'; end if;
  if (select count(*) from public.community_friends where requester_id=auth.uid() and status='pending') >= 100 then raise exception 'Request limit'; end if;
  insert into public.community_friends(requester_id,recipient_id,status) values(auth.uid(),target,'pending') on conflict do nothing;
end;
$$;
create function public.community_respond(requester uuid,accept_request boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.community_blocked(auth.uid(),requester) then raise exception 'Unavailable request'; end if;
  if accept_request then update public.community_friends set status='accepted' where requester_id=requester and recipient_id=auth.uid() and status='pending';
  else delete from public.community_friends where requester_id=requester and recipient_id=auth.uid() and status='pending'; end if;
end;
$$;
create function public.community_connections() returns table(user_id uuid,handle text,display_name text,status text,incoming boolean)
language sql stable security definer set search_path = '' as $$
  select p.user_id,p.handle,p.display_name,f.status,f.recipient_id=auth.uid()
  from public.community_friends f join public.community_profiles p on p.user_id=case when f.requester_id=auth.uid() then f.recipient_id else f.requester_id end
  where auth.uid() is not null and (f.requester_id=auth.uid() or f.recipient_id=auth.uid()) and not public.community_blocked(auth.uid(),p.user_id);
$$;
create function public.community_remove(person uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.community_friends where (requester_id=auth.uid() and recipient_id=person) or (recipient_id=auth.uid() and requester_id=person);
end;
$$;
create function public.community_block(person uuid,blocked boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or person=auth.uid() then raise exception 'Invalid block'; end if;
  if blocked then
    insert into public.community_blocks(owner_id,blocked_id) values(auth.uid(),person) on conflict do nothing;
    perform public.community_remove(person);
  else delete from public.community_blocks where owner_id=auth.uid() and blocked_id=person; end if;
end;
$$;
revoke all on function public.community_find(text),public.community_request(text),public.community_respond(uuid,boolean),public.community_connections(),public.community_remove(uuid),public.community_block(uuid,boolean) from public,anon;
grant execute on function public.community_find(text),public.community_request(text),public.community_respond(uuid,boolean),public.community_connections(),public.community_remove(uuid),public.community_block(uuid,boolean) to authenticated;
