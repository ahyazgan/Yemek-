import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const a = '11111111-1111-1111-1111-111111111111',
  b = '22222222-2222-2222-2222-222222222222',
  c = '33333333-3333-3333-3333-333333333333';
let db: PGlite;
const recipe = JSON.stringify({
  title: 'Test tarif',
  servings: 2,
  ingredients: ['100 g kabak'],
  steps: ['Kabağı pişir.'],
});
async function user(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
beforeEach(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${a}'),('${b}'),('${c}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(readFileSync('supabase/migrations/20261010185808_sofra_0008_community.sql', 'utf8'));
  await db.exec(
    `insert into public.community_profiles(user_id,handle,display_name,is_public) values('${a}','alice','Alice',false),('${b}','bob','Bob',false),('${c}','carol','Carol',true);`,
  );
  await db.query('insert into public.community_posts(owner_id,recipe) values($1,$2)', [a, recipe]);
});
afterEach(async () => {
  await db.close();
});
describe('Arkadaşlık, profil ve paylaşım erişimi', () => {
  it('anonim kullanıcı tariflere ve kullanıcı aramasına erişemez', async () => {
    await db.exec('set role anon;');
    await expect(db.query('select * from public.community_posts')).rejects.toThrow();
    await expect(db.query("select * from public.community_find('alice')")).rejects.toThrow();
  });
  it('başka hesap özel profil, tarif ve e-postayı okuyamaz; tam ad araması yalnızca kimlik kartı döndürür', async () => {
    await user(b);
    expect((await db.query('select * from public.community_posts')).rows).toHaveLength(0);
    expect(
      (await db.query(`select * from public.community_profiles where user_id='${a}'`)).rows,
    ).toHaveLength(0);
    const card = (await db.query<Record<string, unknown>>("select * from public.community_find('alice')")).rows[0];
    expect(Object.keys(card).sort()).toEqual(['display_name', 'handle', 'is_public', 'user_id']);
  });
  it('alıcı onayından önce özel paylaşım kapalıdır, onaydan sonra iki arkadaş görebilir', async () => {
    await user(b);
    await db.exec("select public.community_request('alice');");
    expect((await db.query('select * from public.community_posts')).rows).toHaveLength(0);
    await user(a);
    await db.exec(`select public.community_respond('${b}',true);`);
    await user(b);
    expect((await db.query('select * from public.community_posts')).rows).toHaveLength(1);
    await user(c);
    expect((await db.query('select * from public.community_posts')).rows).toHaveLength(0);
  });
  it('isteği gönderen kendi isteğini kabul edemez veya doğrudan tabloyu değiştiremez', async () => {
    await user(b);
    await db.exec("select public.community_request('alice');");
    await db.exec(`select public.community_respond('${a}',true);`);
    expect((await db.query('select status from public.community_friends')).rows).toEqual([
      { status: 'pending' },
    ]);
    await expect(
      db.exec("update public.community_friends set status='accepted'"),
    ).rejects.toThrow();
  });
  it('engelleme iki yönde aramayı ve paylaşımları kapatır, arkadaşlığı kaldırır', async () => {
    await user(b);
    await db.exec("select public.community_request('alice');");
    await user(a);
    await db.exec(
      `select public.community_respond('${b}',true); select public.community_block('${b}',true);`,
    );
    await user(b);
    expect((await db.query('select * from public.community_posts')).rows).toHaveLength(0);
    expect((await db.query("select * from public.community_find('alice')")).rows).toHaveLength(0);
    expect((await db.query('select * from public.community_connections()')).rows).toHaveLength(0);
    await expect(db.exec("select public.community_request('alice');")).rejects.toThrow();
    await user(a);
    await db.exec(`select public.community_block('${b}',false);`);
    expect((await db.query('select * from public.community_connections()')).rows).toHaveLength(0);
  });
  it('kimse başka hesabın profilini güncelleyemez, tarifini silemez veya adına yayın yapamaz', async () => {
    await user(b);
    await db.exec(
      `update public.community_profiles set is_public=true where user_id='${a}'; delete from public.community_posts where owner_id='${a}';`,
    );
    await expect(
      db.query('insert into public.community_posts(owner_id,recipe) values($1,$2)', [a, recipe]),
    ).rejects.toThrow();
    await user(a);
    expect((await db.query('select * from public.community_posts')).rows).toHaveLength(1);
    expect(
      (await db.query(`select is_public from public.community_profiles where user_id='${a}'`)).rows,
    ).toEqual([{ is_public: false }]);
  });
  it('bildirimler diğer kullanıcılara okunamaz, eksik paylaşım alanları reddedilir', async () => {
    await user(b);
    await db.exec(
      `insert into public.community_reports(reporter_id,target_id,reason) values('${b}','${a}','İçerik inceleme talebi');`,
    );
    await expect(db.query('select * from public.community_reports')).rejects.toThrow();
    await expect(
      db.exec(`insert into public.community_posts(owner_id,recipe) values('${b}','{}')`),
    ).rejects.toThrow();
  });
});
