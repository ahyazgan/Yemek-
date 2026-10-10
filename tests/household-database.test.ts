import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const a = '11111111-1111-1111-1111-111111111111',
  b = '22222222-2222-2222-2222-222222222222',
  c = '33333333-3333-3333-3333-333333333333';
let db: PGlite, home: string;
const week = '2026-10-05';
const content = {
  menu: [{ date: week, slot: 'dinner', title: 'Mercimek', servings: 2 }],
  items: [{ id: 'onion', name: 'Soğan', quantity: 60, unit: 'g', checked: false }],
};
async function user(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
  );
}
async function rpc(name: string, args: unknown[]) {
  const r = await db.query<{ value: unknown }>(
    `select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as value`,
    args,
  );
  return r.rows[0].value;
}
async function invite(role = 'editor') {
  await user(a);
  return (await rpc('hh_invite', [a, home, role])) as { code: string };
}
async function join(person = b, role = 'editor') {
  const code = (await invite(role)).code;
  await user(person);
  await rpc('hh_join', [person, code, 'Üye adı']);
}
beforeEach(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${a}'),('${b}'),('${c}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(readFileSync('supabase/migrations/20261010185826_sofra_0010_households.sql', 'utf8'));
  await user(a);
  home = (await rpc('hh_create', [a, 'Bizim ev', 'Ev sahibi'])) as string;
});
afterEach(async () => {
  await db.close();
});
describe('Ortak hanede gerçek PostgreSQL yetkileri', () => {
  it('anonim/başka hesap haneyi, üyeleri, listeyi ve davet sırrını okuyamaz', async () => {
    await rpc('hh_write', [a, home, week, 0, JSON.stringify(content)]);
    await user(b);
    for (const table of ['shared_households', 'household_members', 'household_boards'])
      expect((await db.query('select * from public.' + table)).rows).toHaveLength(0);
    await expect(db.query('select * from public.household_invites')).rejects.toThrow();
    expect(await rpc('hh_get', [b, week])).toBe(null);
    await expect(rpc('hh_get', [a, week])).rejects.toThrow('HOUSEHOLD_AUTH');
    await db.exec('reset role; set role anon');
    await expect(rpc('hh_get', [a, week])).rejects.toThrow();
  });
  it('davet önce yalnızca hane adı/rol/süre gösterir, açık kabulden sonra menü görünür', async () => {
    await rpc('hh_write', [a, home, week, 0, JSON.stringify(content)]);
    const { code } = await invite();
    await user(b);
    const preview = (await rpc('hh_preview', [b, code])) as Record<string, unknown>;
    expect(Object.keys(preview).sort()).toEqual(['expiresAt', 'name', 'role']);
    expect(await rpc('hh_get', [b, week])).toBe(null);
    await rpc('hh_join', [b, code, 'İkinci kişi']);
    expect(
      ((await rpc('hh_get', [b, week])) as { board: { content: unknown } }).board.content,
    ).toEqual(content);
    await user(c);
    await expect(rpc('hh_join', [c, code, 'Üçüncü kişi'])).rejects.toThrow('HOUSEHOLD_INVITE');
  });
  it('yenilenen, iptal edilen ve süresi dolan davet kullanılamaz; ham kod depolanmaz', async () => {
    const first = await invite();
    const second = await invite('viewer');
    await expect(rpc('hh_preview', [a, first.code])).rejects.toThrow('HOUSEHOLD_INVITE');
    await db.exec('reset role');
    const rows = (
      await db.query<{ token_hash: string }>('select token_hash from public.household_invites')
    ).rows;
    expect(rows[0].token_hash).not.toBe(second.code);
    expect(rows[0].token_hash).toHaveLength(64);
    await db.exec("update public.household_invites set expires_at=now()-interval '1 second'");
    await user(b);
    await expect(rpc('hh_join', [b, second.code, 'Üye adı'])).rejects.toThrow('HOUSEHOLD_INVITE');
    const third = await invite();
    await rpc('hh_manage', [a, home, 'revoke', null]);
    await user(b);
    await expect(rpc('hh_join', [b, third.code, 'Üye adı'])).rejects.toThrow('HOUSEHOLD_INVITE');
  });
  it('görüntüleyen yazamaz, düzenleyen listeyi değiştirir fakat davet/yetki yönetemez', async () => {
    await join(b, 'viewer');
    await expect(rpc('hh_write', [b, home, week, 0, JSON.stringify(content)])).rejects.toThrow(
      'HOUSEHOLD_ACCESS',
    );
    await expect(rpc('hh_manage', [b, home, 'transfer', a])).rejects.toThrow('HOUSEHOLD_ACCESS');
    await expect(rpc('hh_invite', [b, home, 'editor'])).rejects.toThrow('HOUSEHOLD_ACCESS');
    await user(a);
    await rpc('hh_manage', [a, home, 'editor', b]);
    await user(b);
    expect(await rpc('hh_write', [b, home, week, 0, JSON.stringify(content)])).toBe(1);
    await expect(db.exec("update public.household_members set role='owner'")).rejects.toThrow();
    await expect(db.exec('update public.household_boards set revision=100')).rejects.toThrow();
  });
  it('aynı sürümden gelen ikinci yazı ilk değişikliği ezmez; haftalar bağımsızdır', async () => {
    await join();
    await user(a);
    await rpc('hh_write', [a, home, week, 0, JSON.stringify(content)]);
    await user(b);
    await expect(
      rpc('hh_write', [b, home, week, 0, JSON.stringify({ ...content, items: [] })]),
    ).rejects.toThrow('HOUSEHOLD_CONFLICT');
    expect(
      await rpc('hh_write', [
        b,
        home,
        week,
        1,
        JSON.stringify({ ...content, items: [{ ...content.items[0], checked: true }] }),
      ]),
    ).toBe(2);
    expect(
      await rpc('hh_write', [b, home, '2026-10-12', 0, JSON.stringify({ menu: [], items: [] })]),
    ).toBe(1);
    expect(
      ((await rpc('hh_get', [b, week])) as { board: { revision: number } }).board.revision,
    ).toBe(2);
  });
  it('üyeden çıkarma erişimi ve yazmayı keser; kendi ayrılma hakkı vardır', async () => {
    await join();
    await user(a);
    await rpc('hh_manage', [a, home, 'remove', b]);
    await user(b);
    expect(await rpc('hh_get', [b, week])).toBe(null);
    await expect(rpc('hh_write', [b, home, week, 0, JSON.stringify(content)])).rejects.toThrow(
      'HOUSEHOLD_ACCESS',
    );
    await join();
    await rpc('hh_manage', [b, home, 'leave', null]);
    expect(await rpc('hh_get', [b, week])).toBe(null);
  });
  it('yönetici önce devreder; yeni yönetici kalır, eski hesap silinince hane korunur', async () => {
    await join();
    await user(a);
    await expect(rpc('hh_manage', [a, home, 'leave', null])).rejects.toThrow(
      'HOUSEHOLD_TRANSFER_FIRST',
    );
    await rpc('hh_manage', [a, home, 'transfer', b]);
    await expect(rpc('hh_invite', [a, home, 'editor'])).rejects.toThrow('HOUSEHOLD_ACCESS');
    await db.exec(`reset role; delete from auth.users where id='${a}'`);
    await user(b);
    const result = (await rpc('hh_get', [b, week])) as { ownerId: string; members: unknown[] };
    expect(result.ownerId).toBe(b);
    expect(result.members).toHaveLength(1);
  });
  it('haneyi kapatma veya yönetici hesabını silme tüm ortak veriyi temizler', async () => {
    await join();
    await invite();
    await rpc('hh_write', [a, home, week, 0, JSON.stringify(content)]);
    await rpc('hh_manage', [a, home, 'close', null]);
    await user(b);
    expect(await rpc('hh_get', [b, week])).toBe(null);
    await user(a);
    home = (await rpc('hh_create', [a, 'Yeni ev', 'Ev sahibi'])) as string;
    await invite();
    await rpc('hh_write', [a, home, week, 0, JSON.stringify(content)]);
    await db.exec(`reset role; delete from auth.users where id='${a}'`);
    for (const table of [
      'shared_households',
      'household_members',
      'household_invites',
      'household_boards',
    ])
      expect((await db.query('select * from public.' + table)).rows).toHaveLength(0);
  });
  it('bozuk/tekrarlanan/başka haftadan/özel alan içeren içerik kabul edilmez', async () => {
    for (const bad of [
      {},
      { ...content, privateNotes: 'secret' },
      { ...content, items: [content.items[0], content.items[0]] },
      { ...content, items: [{ ...content.items[0], quantity: 0 }] },
      { ...content, menu: [{ ...content.menu[0], date: '2026-10-12' }] },
      { ...content, menu: [{ ...content.menu[0], servings: 1.5 }] },
      {
        ...content,
        items: Array.from({ length: 201 }, (_, n) => ({ ...content.items[0], id: 'i' + n })),
      },
    ])
      await expect(rpc('hh_write', [a, home, week, 0, JSON.stringify(bad)])).rejects.toThrow(
        'HOUSEHOLD_INPUT',
      );
    await expect(
      rpc('hh_write', [a, home, '2026-10-06', 0, JSON.stringify(content)]),
    ).rejects.toThrow('HOUSEHOLD_INPUT');
  });
  it('bir kişi yalnızca bir haneye katılabilir; kendi rolünü değiştiremez', async () => {
    await expect(rpc('hh_create', [a, 'İkinci ev', 'Ev sahibi'])).rejects.toThrow(
      'HOUSEHOLD_ALREADY',
    );
    await expect(rpc('hh_manage', [a, home, 'viewer', a])).rejects.toThrow('HOUSEHOLD_INPUT');
    await expect(rpc('hh_invite', [a, home, 'owner'])).rejects.toThrow('HOUSEHOLD_INPUT');
  });
});
