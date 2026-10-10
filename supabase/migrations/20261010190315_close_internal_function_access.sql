-- Supabase default grants can grant authenticated EXECUTE independently of PUBLIC.
revoke all on function public.community_blocked(uuid,uuid) from public, anon, authenticated;
-- This optional platform event trigger must not be an application RPC.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
