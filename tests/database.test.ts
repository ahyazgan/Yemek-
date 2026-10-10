import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { recipes } from '../src/data/catalog';
const alice = '11111111-1111-1111-1111-111111111111';
const bob = '22222222-2222-2222-2222-222222222222';
let db: PGlite;
async function asUser(user: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${alice}'),('${bob}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(readFileSync('supabase/migrations/20261010185730_sofra_0001_initial.sql', 'utf8'));
  await db.exec(
    readFileSync('supabase/migrations/20261010185736_sofra_0002_mobile_features.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185740_sofra_0003_discovery_collections.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185743_sofra_0004_recipe_details.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185750_sofra_0005_equipment.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185753_sofra_0006_snapshot_sync.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185757_sofra_0007_companion.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185808_sofra_0008_community.sql', 'utf8'),
  );
  await db.exec('create role service_role');
  await db.exec(
    readFileSync('supabase/migrations/20261010185812_sofra_0009_recipe_media_import.sql', 'utf8'),
  );
  await db.exec(
    readFileSync('supabase/migrations/20261010185826_sofra_0010_households.sql', 'utf8'),
  );
  // Supabase's default privileges can add a direct authenticated grant.
  await db.exec('grant execute on function public.community_blocked(uuid,uuid) to authenticated;');
  await db.exec(
    readFileSync('supabase/migrations/20261010190315_close_internal_function_access.sql', 'utf8'),
  );
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
});
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL şeması ve RLS', () => {
  it('iç engelleme sorgusu RPC olarak başka kişilerin ilişkilerini açmaz', async () => {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('authenticated','public.community_blocked(uuid,uuid)','EXECUTE') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
  it('bulut yazısı sürüm karşılaştırır, aynı anda eski kopyayla yazmayı ve sahip taklidini reddeder', async () => {
    await asUser(alice);
    const first = await db.query<{ revision: number }>(
      `select * from public.save_app_snapshot('${alice}',0,'{"version":1,"label":"first"}')`,
    );
    expect(Number(first.rows[0].revision)).toBe(1);
    await expect(
      db.exec(`select * from public.save_app_snapshot('${alice}',0,'{"version":1}')`),
    ).rejects.toThrow('Snapshot conflict');
    await db.exec(
      `select * from public.save_app_snapshot('${alice}',1,'{"version":1,"label":"second"}')`,
    );
    await expect(
      db.exec(
        `select * from public.save_app_snapshot('${alice}',1,'{"version":1,"label":"stale"}')`,
      ),
    ).rejects.toThrow('Snapshot conflict');
    expect(
      (
        await db.query<{ label: string }>(
          "select payload->>'label' as label from public.app_snapshots",
        )
      ).rows[0].label,
    ).toBe('second');
    await expect(
      db.exec(`select * from public.save_app_snapshot('${alice}',2,'{"version":2}')`),
    ).rejects.toThrow();
    await expect(db.exec("update public.app_snapshots set payload='{}'")).rejects.toThrow();
    await asUser(bob);
    await expect(
      db.exec(`select * from public.save_app_snapshot('${alice}',2,'{"version":1}')`),
    ).rejects.toThrow('Unauthorized snapshot owner');
    expect((await db.query('select * from public.app_snapshots')).rows).toHaveLength(0);
    await db.exec('reset role; set role anon;');
    await expect(
      db.exec(`select * from public.save_app_snapshot('${alice}',0,'{"version":1}')`),
    ).rejects.toThrow();
    await db.exec('reset role; delete from public.app_snapshots;');
  });
  it('ekipman değerlerini doğrular ve kullanıcı tercihlerini diğer hesaba açmaz', async () => {
    await db.exec('reset role;');
    expect(
      (await db.query("select equipment from public.recipes where id='brokoli'")).rows,
    ).toEqual([{ equipment: ['hob', 'blender'] }]);
    expect(
      (await db.query("select public.valid_equipment(array['airfryer','multicooker']) as valid"))
        .rows,
    ).toEqual([{ valid: true }]);
    for (const items of [['toaster'], ['hob', 'hob'], [null]]) {
      expect(
        (
          await db.query<{ valid: boolean }>('select public.valid_equipment($1::text[]) as valid', [
            items,
          ])
        ).rows[0].valid,
      ).toBe(false);
    }
    await expect(
      db.exec("update public.recipes set equipment=array['invalid'] where id='mercimek'"),
    ).rejects.toThrow();
    await asUser(alice);
    await db.exec(
      `insert into public.user_preferences(owner_id,equipment) values ('${alice}',array['hob']) on conflict (owner_id) do update set equipment=excluded.equipment`,
    );
    await asUser(bob);
    expect((await db.query('select equipment from public.user_preferences')).rows).toHaveLength(0);
    await db.exec('reset role;');
    await db.exec('delete from public.user_preferences');
  });
  it('tarif ayrıntıları ve süre toplamı veritabanında doğrulanır', async () => {
    await db.exec('reset role;');
    const result = await db.query<{ details: { restMinutes: number } }>(
      "select details from public.recipes where id='irmik'",
    );
    expect(result.rows[0].details.restMinutes).toBe(120);
    for (const invalid of [
      {},
      { ...recipes[0].details, restMinutes: 100 },
      { ...recipes[0].details, tips: [12] },
      { ...recipes[0].details, prepMinutes: -1 },
    ]) {
      const validation = await db.query<{ valid: boolean }>(
        'select public.valid_recipe_details($1::jsonb,30) as valid',
        [JSON.stringify(invalid)],
      );
      expect(validation.rows[0].valid).toBe(false);
    }
    await expect(
      db.exec("update public.recipes set details='{}' where id='mercimek'"),
    ).rejects.toThrow();
    await asUser(alice);
    await expect(
      db.exec("update public.recipes set details=null where id='irmik'"),
    ).resolves.toBeDefined();
    expect(
      (await db.query<{ details: unknown }>("select details from public.recipes where id='irmik'"))
        .rows[0].details,
    ).not.toBeNull();
  });
  it('koleksiyonlar ve üyelikleri hesaplar arasında görünmez; sahibi silince üyelikler kaldırılır', async () => {
    await asUser(alice);
    await db.exec(
      `insert into public.recipe_collections(id,owner_id,name) values ('collection-a','${alice}','Akşamlar'); insert into public.recipe_collection_items values ('collection-a','${alice}','mercimek');`,
    );
    await asUser(bob);
    expect((await db.query('select * from public.recipe_collections')).rows).toHaveLength(0);
    expect((await db.query('select * from public.recipe_collection_items')).rows).toHaveLength(0);
    await expect(
      db.exec(
        `insert into public.recipe_collection_items values ('collection-a','${bob}','nohut')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into public.recipe_collection_items values ('collection-a','${alice}','nohut')`,
      ),
    ).rejects.toThrow();
    await db.exec('reset role; set role anon;');
    await expect(db.query('select * from public.recipe_collections')).rejects.toThrow();
    await asUser(alice);
    await db.exec("delete from public.recipe_collections where id='collection-a'");
    expect((await db.query('select * from public.recipe_collection_items')).rows).toHaveLength(0);
    expect((await db.query("select * from public.recipes where id='mercimek'")).rows).toHaveLength(
      1,
    );
  });
  it('koleksiyona başka hesabın özel tarifi eklenemez', async () => {
    await asUser(alice);
    await db.exec(
      `insert into public.recipes(id,owner_id,title,description,minutes,base_servings,budget,color,art,steps) values ('private-collection','${alice}','Özel yemek','Demo',20,2,'economic','#AABBCC','soup','["Pişir"]');`,
    );
    await asUser(bob);
    await db.exec(
      `insert into public.recipe_collections(id,owner_id,name) values ('collection-b','${bob}','Bob');`,
    );
    await expect(
      db.exec(
        `insert into public.recipe_collection_items values ('collection-b','${bob}','private-collection')`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `insert into public.recipe_collection_items values ('collection-b','${bob}','sutlac')`,
    );
    expect((await db.query("select category from public.recipes where id='sutlac'")).rows).toEqual([
      { category: 'dessert' },
    ]);
  });
  it('yeni mobil tablolar misafir erişimini ve hesaplar arası okumayı engeller', async () => {
    await asUser(alice);
    await db.exec(
      `select * from public.save_app_snapshot('${alice}',0,'{"version":1}'); insert into public.recipe_favorites values ('${alice}','mercimek',now()); insert into public.user_preferences(owner_id) values ('${alice}'); insert into public.cooking_history(id,owner_id,recipe_id) values ('cook-test','${alice}','mercimek'); insert into public.extra_shopping_items values ('extra-test','${alice}','2026-10-05','Kahve',2,'paket',false);`,
    );
    await asUser(bob);
    for (const table of [
      'app_snapshots',
      'recipe_favorites',
      'user_preferences',
      'cooking_history',
      'extra_shopping_items',
    ])
      expect((await db.query('select * from public.' + table)).rows).toHaveLength(0);
    await expect(
      db.exec(
        `insert into public.app_snapshots(owner_id,payload) values ('${alice}','{"version":1}')`,
      ),
    ).rejects.toThrow();
    await db.exec('reset role; set role anon;');
    await expect(db.query('select * from public.app_snapshots')).rejects.toThrow();
  });
  it('anonim kullanıcı yalnızca yayımlanmış kataloğu okur', async () => {
    await db.exec('set role anon;');
    expect((await db.query('select * from public.recipes')).rows).toHaveLength(recipes.length);
    await expect(
      db.exec(`insert into public.profiles values ('${alice}',2,'{}','balanced',now())`),
    ).rejects.toThrow();
  });
  it('kullanıcı kendi profilini yazar, başka kullanıcının profilini göremez', async () => {
    await asUser(alice);
    await db.exec(
      `insert into public.profiles(user_id,people,budget) values ('${alice}',2,'balanced')`,
    );
    await asUser(bob);
    expect((await db.query('select * from public.profiles')).rows).toHaveLength(0);
    await expect(
      db.exec(
        `insert into public.profiles(user_id,people,budget) values ('${alice}',5,'economic')`,
      ),
    ).rejects.toThrow();
  });
  it('özel tarif ve malzemeleri diğer kullanıcıya açılmaz', async () => {
    await asUser(alice);
    await db.exec(
      `insert into public.recipes(id,owner_id,title,description,minutes,base_servings,budget,color,art,steps) values ('private','${alice}','Özel çorba','Demo',20,2,'economic','#AABBCC','soup','["Pişir"]'); insert into public.recipe_ingredients values ('private','salt',2);`,
    );
    await asUser(bob);
    expect((await db.query("select * from public.recipes where id='private'")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select * from public.recipe_ingredients where recipe_id='private'")).rows,
    ).toHaveLength(0);
  });
  it('istemci ortak kataloğu değiştiremez ve özel tarifi yayımlayamaz', async () => {
    await asUser(alice);
    await db.exec("update public.recipes set title='Değişti' where id='mercimek'");
    expect(
      (await db.query<{ title: string }>("select title from public.recipes where id='mercimek'"))
        .rows[0].title,
    ).toBe('Kırmızı mercimek çorbası');
    await expect(
      db.exec("update public.recipes set published=true where id='private'"),
    ).rejects.toThrow();
    await expect(
      db.exec("insert into public.recipe_ingredients values ('mercimek','rice',100)"),
    ).rejects.toThrow();
  });
  it('öğün plan sahibine ve haftasına bağlıdır', async () => {
    await asUser(alice);
    const plan = (
      await db.query<{ id: string }>(
        `insert into public.weekly_plans(owner_id,week_start) values ('${alice}','2026-10-05') returning id`,
      )
    ).rows[0].id;
    await db.exec(
      `insert into public.meals values ('meal-a','${plan}','${alice}','2026-10-05','2026-10-05','dinner','mercimek',2)`,
    );
    await expect(
      db.exec(
        `insert into public.meals values ('meal-bad','${plan}','${alice}','2026-10-05','2026-10-12','dinner','mercimek',2)`,
      ),
    ).rejects.toThrow();
    await asUser(bob);
    await expect(
      db.exec(
        `insert into public.meals values ('meal-hijack','${plan}','${bob}','2026-10-05','2026-10-06','dinner','mercimek',2)`,
      ),
    ).rejects.toThrow();
    expect((await db.query('select * from public.meals')).rows).toHaveLength(0);
  });
  it('kullanıcı başka birinin özel tarifini planlayamaz', async () => {
    await asUser(bob);
    const plan = (
      await db.query<{ id: string }>(
        `insert into public.weekly_plans(owner_id,week_start) values ('${bob}','2026-10-05') returning id`,
      )
    ).rows[0].id;
    await expect(
      db.exec(
        `insert into public.meals values ('private-hijack','${plan}','${bob}','2026-10-05','2026-10-05','dinner','private',2)`,
      ),
    ).rejects.toThrow();
  });
  it('liste alt satırları başka kullanıcının listesine bağlanamaz', async () => {
    await asUser(alice);
    await db.exec(
      `insert into public.shopping_lists(id,owner_id,name,week_start) values ('list-a','${alice}','Hafta','2026-10-05')`,
    );
    await asUser(bob);
    await expect(
      db.exec(
        `insert into public.shopping_list_items(list_id,owner_id,ingredient_id,name_snapshot,category_snapshot,total_grams,pantry_grams,grams,recipe_titles_snapshot) values ('list-a','${bob}','salt','Tuz','Temel gıda',5,0,5,'{}')`,
      ),
    ).rejects.toThrow();
  });
  it('negatif stok ve yinelenen öğün DB tarafından reddedilir', async () => {
    await asUser(alice);
    await expect(
      db.exec(
        `insert into public.pantry_items(owner_id,ingredient_id,grams) values ('${alice}','salt',-1)`,
      ),
    ).rejects.toThrow();
    const plan = (await db.query<{ id: string }>('select id from public.weekly_plans')).rows[0].id;
    await expect(
      db.exec(
        `insert into public.meals values ('duplicate','${plan}','${alice}','2026-10-05','2026-10-05','dinner','menemen',2)`,
      ),
    ).rejects.toThrow();
  });
});
