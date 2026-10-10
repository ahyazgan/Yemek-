-- Revision-checked snapshots. All writes go through this RPC; legacy blind upserts fail closed.
alter table public.app_snapshots add column revision bigint not null default 1 check (revision > 0 and revision <= 9007199254740991);
revoke insert, update, delete on public.app_snapshots from authenticated;

create function public.save_app_snapshot(expected_owner uuid, expected_revision bigint, new_payload jsonb)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
begin
  if owner is null or expected_owner is distinct from owner then
    raise exception 'Unauthorized snapshot owner' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    begin
      return query insert into public.app_snapshots as s(owner_id,payload,revision,updated_at)
        values (owner,new_payload,1,clock_timestamp()) returning s.revision,s.updated_at;
    exception when unique_violation then
      raise exception 'Snapshot conflict' using errcode = '40001';
    end;
  else
    return query update public.app_snapshots as s set payload=new_payload,revision=s.revision+1,updated_at=clock_timestamp()
      where s.owner_id=owner and s.revision=expected_revision returning s.revision,s.updated_at;
    if not found then raise exception 'Snapshot conflict' using errcode = '40001'; end if;
  end if;
end;
$$;
revoke all on function public.save_app_snapshot(uuid,bigint,jsonb) from public, anon;
grant execute on function public.save_app_snapshot(uuid,bigint,jsonb) to authenticated;
