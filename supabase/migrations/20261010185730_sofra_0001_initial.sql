-- Sofra / Yazgan: gelecekteki Supabase eşitlemesi için şema. Demo bu DB'ye bağlanmaz.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  people smallint not null check (people between 1 and 12),
  diets text[] not null default '{}' check (diets <@ array['vegetarian','vegan','glutenFree']),
  budget text not null check (budget in ('economic','balanced','flexible')),
  updated_at timestamptz not null default now()
);
create table public.ingredients (
  id text primary key,
  name text not null,
  category text not null check (category in ('Sebze & meyve','Bakliyat & tahıl','Süt & yumurta','Et & tavuk','Temel gıda')),
  base_unit text not null default 'g' check (base_unit = 'g')
);
create table public.recipes (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  published boolean not null default false,
  title text not null check (char_length(trim(title)) between 2 and 100),
  description text not null,
  minutes smallint not null check (minutes between 1 and 600),
  base_servings smallint not null check (base_servings between 1 and 12),
  diets text[] not null default '{}' check (diets <@ array['vegetarian','vegan','glutenFree']),
  budget text not null check (budget in ('economic','balanced','flexible')),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  art text not null check (art in ('soup','rice','stew','greens','eggs')),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) > 0),
  updated_at timestamptz not null default now(),
  check ((owner_id is null and published) or (owner_id is not null and not published))
);
create table public.recipe_ingredients (
  recipe_id text not null references public.recipes(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id),
  quantity_grams numeric(14,4) not null check (quantity_grams > 0 and quantity_grams <= 10000000000),
  primary key (recipe_id, ingredient_id)
);
create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  unique (owner_id, week_start), unique (id, owner_id, week_start)
);
create table public.meals (
  id text primary key,
  plan_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  day date not null check (day >= week_start and day < week_start + 7),
  slot text not null check (slot in ('lunch','dinner')),
  recipe_id text not null references public.recipes(id),
  servings smallint not null check (servings between 1 and 12),
  foreign key (plan_id, owner_id, week_start) references public.weekly_plans(id, owner_id, week_start) on delete cascade,
  unique (plan_id, day, slot)
);
create table public.pantry_items (
  owner_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id),
  grams numeric(14,4) not null check (grams >= 0 and grams <= 10000000),
  updated_at timestamptz not null default now(),
  primary key (owner_id, ingredient_id)
);
create table public.weekly_checks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  ingredient_id text not null references public.ingredients(id),
  required_grams numeric(14,4) not null check (required_grams >= 0),
  primary key (owner_id, week_start, ingredient_id, required_grams)
);
create table public.shopping_lists (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.shopping_list_items (
  list_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id),
  name_snapshot text not null,
  category_snapshot text not null,
  total_grams numeric(14,4) not null check (total_grams >= 0),
  pantry_grams numeric(14,4) not null check (pantry_grams >= 0 and pantry_grams <= total_grams),
  grams numeric(14,4) not null check (grams >= 0),
  recipe_titles_snapshot text[] not null,
  checked boolean not null default false,
  foreign key (list_id, owner_id) references public.shopping_lists(id, owner_id) on delete cascade,
  primary key (list_id, ingredient_id),
  check (abs(grams - (total_grams - pantry_grams)) <= 0.1)
);

create index recipes_owner_idx on public.recipes(owner_id);
create index recipe_ingredients_ingredient_idx on public.recipe_ingredients(ingredient_id);
create index meals_owner_idx on public.meals(owner_id);
create index meals_recipe_idx on public.meals(recipe_id);
create index shopping_lists_owner_idx on public.shopping_lists(owner_id);
create index shopping_list_items_owner_idx on public.shopping_list_items(owner_id);

alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.meals enable row level security;
alter table public.pantry_items enable row level security;
alter table public.weekly_checks enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.ingredients, public.recipes, public.recipe_ingredients to anon, authenticated;
grant insert, update, delete on public.recipes, public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.profiles, public.weekly_plans, public.meals,
  public.pantry_items, public.weekly_checks, public.shopping_lists, public.shopping_list_items to authenticated;

create policy profiles_own on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ingredients_read on public.ingredients for select to anon, authenticated using (true);
create policy recipes_read on public.recipes for select to anon, authenticated
  using (published or owner_id = (select auth.uid()));
create policy recipes_insert on public.recipes for insert to authenticated
  with check (owner_id = (select auth.uid()) and not published);
create policy recipes_update on public.recipes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and not published);
create policy recipes_delete on public.recipes for delete to authenticated using (owner_id = (select auth.uid()));
create policy recipe_parts_read on public.recipe_ingredients for select to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy recipe_parts_write on public.recipe_ingredients for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = (select auth.uid())));
create policy plans_own on public.weekly_plans for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy meals_own on public.meals for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.recipes r where r.id = recipe_id));
create policy pantry_own on public.pantry_items for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy checks_own on public.weekly_checks for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy lists_own on public.shopping_lists for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy list_items_own on public.shopping_list_items for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
