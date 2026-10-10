-- Keep existing RLS policies. Remove grants the mobile API never needs.
revoke truncate, references, trigger on all tables in schema public from public, anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
revoke all on public.profiles, public.weekly_plans, public.meals, public.pantry_items,
  public.weekly_checks, public.shopping_lists, public.shopping_list_items,
  public.user_preferences, public.recipe_favorites, public.cooking_history,
  public.extra_shopping_items, public.app_snapshots, public.recipe_collections,
  public.recipe_collection_items from anon;
-- Ingredients are a curated catalog; personal ingredients are stored in the owned snapshot.
revoke insert, update, delete on public.ingredients from authenticated;
revoke all on all sequences in schema public from anon, authenticated;
-- Future tables require an explicit grant as well as an RLS policy.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Only the account deletion server can ask about a specific session. Clients
-- cannot enumerate session identifiers or learn another user's session status.
create function public.server_session_active(expected_owner uuid, expected_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = expected_session and s.user_id = expected_owner
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function public.server_session_active(uuid,uuid) from public, anon, authenticated;
grant execute on function public.server_session_active(uuid,uuid) to service_role;
