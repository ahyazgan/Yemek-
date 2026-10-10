-- Manual cross-device backups. Normalized core tables remain available for future realtime sync.
create table public.app_snapshots (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'version' and payload->'version' = '1'::jsonb and octet_length(payload::text) <= 5000000),
  updated_at timestamptz not null default now()
);
create table public.recipe_favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, recipe_id)
);
create table public.cooking_history (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id),
  cooked_at timestamptz not null default now(),
  rating smallint not null default 0 check (rating between 0 and 5),
  note text not null default '' check (char_length(note) <= 600)
);
create table public.user_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  excluded_ingredients text[] not null default '{}',
  max_minutes smallint check (max_minutes between 5 and 600),
  preferred_market text check (preferred_market in ('migros','trendyol','carrefoursa')),
  reminder_requested boolean not null default false,
  reminder_day smallint not null default 0 check (reminder_day between 0 and 6),
  reminder_time time not null default '18:00',
  updated_at timestamptz not null default now()
);
create table public.extra_shopping_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  name text not null check (char_length(trim(name)) between 1 and 100),
  quantity numeric not null check (quantity > 0 and quantity <= 1000000),
  unit text not null check (unit in ('adet','paket','g','ml')),
  checked boolean not null default false
);
create index cooking_history_owner_idx on public.cooking_history(owner_id);
create index extras_owner_week_idx on public.extra_shopping_items(owner_id,week_start);

alter table public.app_snapshots enable row level security;
alter table public.recipe_favorites enable row level security;
alter table public.cooking_history enable row level security;
alter table public.user_preferences enable row level security;
alter table public.extra_shopping_items enable row level security;
grant select, insert, update, delete on public.app_snapshots, public.recipe_favorites,
  public.cooking_history, public.user_preferences, public.extra_shopping_items to authenticated;
create policy snapshots_own on public.app_snapshots for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy favorites_own on public.recipe_favorites for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id));
create policy history_own on public.cooking_history for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id));
create policy preferences_own on public.user_preferences for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy extras_own on public.extra_shopping_items for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
