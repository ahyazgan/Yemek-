import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
let db: PGlite;
const alice = '11111111-1111-4111-8111-111111111111',
  bob = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
    insert into auth.users values('${alice}'),('${bob}');
    insert into auth.sessions values('${session}','${alice}',null);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;
    alter default privileges in schema public grant all on functions to anon,authenticated;
    grant usage on schema public to service_role;`);
  for (const file of readdirSync('supabase/migrations')
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
  }
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
});
afterAll(async () => {
  await db?.close();
});
describe('En az yetki ve sunucu oturumu', () => {
  it('istemciler tabloyu topluca boşaltamaz, trigger veya foreign key kuramaz', async () => {
    const result =
      await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and (
      has_table_privilege('anon',c.oid,'TRUNCATE,TRIGGER,REFERENCES') or
      has_table_privilege('authenticated',c.oid,'TRUNCATE,TRIGGER,REFERENCES'))`);
    expect(result.rows).toEqual([]);
    await db.exec('set role authenticated');
    await expect(db.exec('truncate public.app_snapshots')).rejects.toThrow();
    await db.exec('reset role');
  });
  it('misafir yalnızca yayımlanmış kataloğu okuyabilir; kişisel tablonun izni yoktur', async () => {
    await db.exec('set role anon');
    expect((await db.query('select id from public.recipes')).rows).toHaveLength(40);
    await expect(db.query('select * from public.app_snapshots')).rejects.toThrow();
    await expect(
      db.exec("insert into public.ingredients values('bad','bad','Temel gıda','g')"),
    ).rejects.toThrow();
    await db.exec('reset role');
  });
  it('yeni tablo kendiliğinden anonim veya giriş yapmış kullanıcılara açılmaz', async () => {
    await db.exec('create table public.security_future_test(id int)');
    expect(
      (
        await db.query(`select has_table_privilege('anon','public.security_future_test','SELECT') as anon,
      has_table_privilege('authenticated','public.security_future_test','SELECT') as account`)
      ).rows,
    ).toEqual([{ anon: false, account: false }]);
    await db.exec('drop table public.security_future_test');
  });
  it('kendi snapshot RPC yazısı çalışır, başka hesap veriyi göremez', async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false)`,
    );
    await db.exec(`select public.save_app_snapshot('${alice}',0,'{"version":1}')`);
    expect((await db.query('select owner_id from public.app_snapshots')).rows).toEqual([
      { owner_id: alice },
    ]);
    await db.exec(`select set_config('request.jwt.claim.sub','${bob}',false)`);
    expect((await db.query('select owner_id from public.app_snapshots')).rows).toEqual([]);
    await db.exec('reset role');
  });
  it('oturum sorgusu yalnızca sunucuya açık; yanlış sahip, süresi dolan ve kaldırılan oturum reddedilir', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec('set role ' + role);
      await expect(
        db.query(`select public.server_session_active('${alice}','${session}')`),
      ).rejects.toThrow();
      await db.exec('reset role');
    }
    const active = async (owner = alice) => {
      await db.exec('set role service_role');
      const result = await db.query<{ active: boolean }>(
        'select public.server_session_active($1,$2) as active',
        [owner, session],
      );
      await db.exec('reset role');
      return result.rows[0].active;
    };
    expect(await active()).toBe(true);
    expect(await active(bob)).toBe(false);
    await db.exec(
      `update auth.sessions set not_after=now()-interval '1 second' where id='${session}'`,
    );
    expect(await active()).toBe(false);
    await db.exec(`delete from auth.sessions where id='${session}'`);
    expect(await active()).toBe(false);
  });
});
