-- Discovery categories and private recipe collections. The demo uses local state;
-- authenticated manual snapshots already include these fields.
alter table public.recipes add column category text not null default 'main'
  check (category in ('main','soup','breakfast','salad','side','dessert'));
update public.recipes set category = case id
 when 'mercimek' then 'soup' when 'menemen' then 'breakfast' when 'kabak' then 'side'
 else category end where owner_id is null;

create table public.recipe_collections (
 id text primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 60),
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table public.recipe_collection_items (
 collection_id text not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 recipe_id text not null references public.recipes(id) on delete cascade,
 primary key(collection_id,recipe_id),
 foreign key(collection_id,owner_id) references public.recipe_collections(id,owner_id) on delete cascade
);
create index collections_owner_idx on public.recipe_collections(owner_id);
create index collection_items_owner_idx on public.recipe_collection_items(owner_id);
alter table public.recipe_collections enable row level security;
alter table public.recipe_collection_items enable row level security;
grant select,insert,update,delete on public.recipe_collections,public.recipe_collection_items to authenticated;
create policy collections_own on public.recipe_collections for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy collection_items_own on public.recipe_collection_items for all to authenticated
 using(owner_id=(select auth.uid()))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.recipes r where r.id=recipe_id));
