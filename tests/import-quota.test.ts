import { beforeAll, afterAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
let db: PGlite;
const user = '11111111-1111-1111-1111-111111111111';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${user}');
    create table public.recipes(id uuid primary key);`);
  await db.exec(readFileSync('supabase/migrations/20261010185812_sofra_0009_recipe_media_import.sql', 'utf8'));
});
afterAll(async () => {
  await db?.close();
});
it('yalnızca sunucu kotayı tüketebilir; istemci sıfırlayamaz', async () => {
  await db.exec('set role authenticated');
  await expect(db.query('select public.consume_recipe_import($1)', [user])).rejects.toThrow();
  await expect(db.exec('select * from public.recipe_import_quotas')).rejects.toThrow();
  await expect(db.exec('delete from public.recipe_import_quotas')).rejects.toThrow();
  await db.exec('reset role; set role anon');
  await expect(db.query('select public.consume_recipe_import($1)', [user])).rejects.toThrow();
  await db.exec('reset role');
});
it('aynı dakikada en fazla on istek kabul edilir; süre geçince yenilenir', async () => {
  await db.exec('set role service_role');
  for (let i = 0; i < 10; i++)
    expect(
      (await db.query<{ ok: boolean }>('select public.consume_recipe_import($1) as ok', [user]))
        .rows[0].ok,
    ).toBe(true);
  expect(
    (await db.query<{ ok: boolean }>('select public.consume_recipe_import($1) as ok', [user]))
      .rows[0].ok,
  ).toBe(false);
  await db.exec(
    "reset role; update public.recipe_import_quotas set window_at=clock_timestamp()-interval '2 minutes'; set role service_role;",
  );
  expect(
    (await db.query<{ ok: boolean }>('select public.consume_recipe_import($1) as ok', [user]))
      .rows[0].ok,
  ).toBe(true);
  await db.exec('reset role');
});
it('hesap silinince kota kaydı kalmaz', async () => {
  await db.query('delete from auth.users where id=$1', [user]);
  expect((await db.query('select * from public.recipe_import_quotas')).rows).toEqual([]);
});
