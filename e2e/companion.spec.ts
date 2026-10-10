import { test, expect, Page } from '@playwright/test';
import { initialState } from '../src/domain/state';
import { weekStart } from '../src/domain/logic';
import { AppState } from '../src/domain/model';
const key = '@yazgan/sofra/offline/v1';
async function seed(page: Page, configure?: (state: AppState) => void) {
  const state = initialState();
  state.profile = { people: 2, diets: [], budget: 'balanced' };
  configure?.(state);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Devam et', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), key)).not.toBeNull();
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key,
    state,
  });
}
test('bütçe, paket fiyatı ve harcama kaydı yeniden açılınca korunur', async ({ page }) => {
  await seed(page, (state) => {
    state.meals = [
      { id: 'a', recipeId: 'mercimek', servings: 2, date: weekStart(), slot: 'dinner' },
    ];
  });
  await page.goto('/budget');
  await page.getByRole('textbox', { name: 'Haftalık hedef (TL)', exact: true }).fill('500');
  await page.getByRole('textbox', { name: 'Ek ürünlere ayırdığım (TL)', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Bütçemi kaydet', exact: true }).click();
  await page.getByRole('button', { name: 'Soğan fiyatını düzenle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Paket fiyatı (TL)', exact: true }).fill('12');
  await page.getByRole('textbox', { name: 'Paket ağırlığı (g)', exact: true }).fill('50');
  await page.getByRole('button', { name: 'Fiyat notunu kaydet', exact: true }).click();
  await expect(page.getByText(/2 paket · 24,00 TL/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Harcama tutarı (TL)', exact: true }).fill('150,25');
  await page
    .getByRole('textbox', { name: 'Market veya açıklama', exact: true })
    .fill('Test alışverişi');
  await page.getByRole('button', { name: 'Harcamayı kaydet', exact: true }).click();
  await expect(page.getByText('Harcama, girdiğin tarihin haftasına kaydedildi.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Haftalık hedef (TL)', exact: true })).toHaveValue(
    '500',
  );
  await expect(page.getByText('Test alışverişi · 150,25 TL')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/24-butce.png' });
});

test('yeni araçlar dar telefona sığar ve gezinirken uygulama hatası üretmez', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 800 });
  await seed(page, (state) => {
    state.meals = [
      { id: 'a', recipeId: 'mercimek', servings: 2, date: weekStart(), slot: 'dinner' },
    ];
  });
  for (const path of [
    '/budget',
    '/batch-prep',
    '/staples',
    '/menu-assistant',
    '/basket-review',
    '/ready-to-cook',
    '/recipe-notes/mercimek',
    '/community',
    '/list',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Sofra ana sayfa' })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    if (path === '/list') await page.screenshot({ path: 'docs/screenshots/27-liste-araclari.png' });
    if (path === '/batch-prep')
      await page.screenshot({ path: 'docs/screenshots/28-toplu-hazirlik.png' });
  }
  expect(errors).toEqual([]);
});
test('düzenli ürün aynı haftada çoğalmaz ve listeye geçer', async ({ page }) => {
  await seed(page);
  await page.goto('/staples');
  await page.getByRole('textbox', { name: 'Düzenli ürün adı', exact: true }).fill('Filtre kahve');
  await page.getByRole('button', { name: 'paket', exact: true }).click();
  await page.getByRole('button', { name: 'Düzenli ürünü kaydet', exact: true }).click();
  await page.getByRole('button', { name: 'Düzenli ürünleri bu haftaya ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Düzenli ürünleri bu haftaya ekle', exact: true }).click();
  await expect(page.getByText('Bu ürünler zaten bu haftanın listesinde.')).toBeVisible();
  await page.goto('/list');
  await expect(page.getByRole('checkbox', { name: /Filtre kahve/ })).toHaveCount(1);
});
test('pişirme adımı ve sayaç ekran kapatılıp açılınca korunur', async ({ page }) => {
  await seed(page);
  await page.goto('/cook/mercimek?servings=2');
  await page.getByRole('button', { name: 'Sonraki adım', exact: true }).click();
  await page.getByRole('button', { name: 'Sayacı başlat', exact: true }).click();
  await page.goto('/');
  await page.goto('/cook/mercimek?servings=2');
  await expect(page.getByText('ADIM 2 / 4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sayacı duraklat', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sayacı duraklat', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/25-pisirme.png' });
});
test('önerme tercihi kaldırılabilir; alternatif ayrı tarife dönüşür', async ({ page }) => {
  await seed(page);
  await page.goto('/recipe/fasulye');
  await page.getByRole('button', { name: 'Malzeme alternatiflerini gör', exact: true }).click();
  await page
    .getByRole('button', { name: 'Salçalı nohut yemeği kopyasını oluştur', exact: true })
    .click();
  await expect(
    page.getByText('Salçalı nohut yemeği', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bunu önerme', exact: true }).click();
  await page.goto('/taste');
  await expect(page.getByText('Salçalı nohut yemeği · Önerme')).toBeVisible();
  await page
    .getByRole('button', { name: 'Salçalı nohut yemeği tercihini kaldır', exact: true })
    .click();
  await expect(page.getByText('Salçalı nohut yemeği · Önerme')).toHaveCount(0);
});
test('besin notu kaynakla saklanır ve tarif değişince eski değer gösterilmez', async ({ page }) => {
  await seed(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Video / besin notu ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Besin notu ekle', exact: true }).click();
  for (const [name, value] of [
    ['Enerji (kcal)', '123'],
    ['Protein (g)', '5'],
    ['Karbonhidrat (g)', '20'],
    ['Yağ (g)', '3'],
    ['Besin bilgisinin kaynağı', 'Kullanıcının test notu'],
  ])
    await page.getByRole('textbox', { name, exact: true }).fill(value);
  await page.getByRole('button', { name: 'Tarif notlarını kaydet', exact: true }).click();
  await expect(page.getByText('123 kcal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tarifi düzenle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Kırmızı mercimek (g)', exact: true }).fill('300');
  await page.getByRole('button', { name: 'Tarif değişikliklerini kaydet', exact: true }).click();
  await expect(page.getByText('123 kcal', { exact: true })).toHaveCount(0);
});
test('asistan isteği önizler, belirsiz isteği reddeder ve yalnızca onayla menü ekler', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/menu-assistant');
  await page.getByRole('textbox', { name: 'Menü isteğin', exact: true }).fill('vegan olmasın');
  await page.getByRole('button', { name: 'İsteğime göre öner', exact: true }).click();
  await expect(page.getByText(/Bu isteği güvenle eşleştiremedim/)).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Menü isteğin', exact: true })
    .fill('3 akşam, 2 kişilik, 30 dakika, fırınsız');
  await page.getByRole('button', { name: 'İsteğime göre öner', exact: true }).click();
  await expect(page.getByText('İsteğini böyle anladım')).toBeVisible();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals.length, key)).toBe(
    0,
  );
  await page.screenshot({ path: 'docs/screenshots/26-asistan.png' });
  await page.getByRole('button', { name: 'Bu önerileri menüme ekle', exact: true }).click();
  await expect(page.getByText('3 öğün planlandı')).toBeVisible();
});
test('toplu hazırlık ve tarihli stok kalıcıdır; kapalı market ve topluluk gerçek veri taklit etmez', async ({
  page,
}) => {
  await seed(page, (state) => {
    state.meals = [
      { id: 'a', recipeId: 'mercimek', servings: 2, date: weekStart(), slot: 'dinner' },
    ];
  });
  await page.goto('/batch-prep');
  await page
    .getByRole('checkbox', { name: 'Kırmızı mercimek çorbası adım 1', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Kırmızı mercimek çorbası adım 1', exact: true }),
  ).toBeChecked();
  await page.goto('/kitchen');
  await page.getByRole('textbox', { name: 'Soğan · evdeki miktar (g)', exact: true }).fill('50');
  await page
    .getByRole('textbox', { name: 'Malzeme tarihi (YYYY-AA-GG, isteğe bağlı)', exact: true })
    .fill('2026-12-20');
  await page.getByRole('button', { name: 'Evdeki miktarı kaydet', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Etiketteki tarih: 2026-12-20')).toBeVisible();
  await page.goto('/basket-review');
  await expect(page.getByText(/Bu bir sipariş sepeti değildir/)).toBeVisible();
  await page.goto('/community');
  await expect(page.getByText(/Demo kişiler veya sahte paylaşımlar gösterilmiyor/)).toBeVisible();
});
