import { expect, Page, test } from '@playwright/test';
const key = '@yazgan/sofra/offline/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
test('keşif seçkileri, malzeme araması, kategori ve süre sıralaması', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  const grid = page.getByTestId('recipe-grid');
  await expect(grid.getByRole('button', { name: /dakika$/ })).toHaveCount(40);
  await page.getByRole('button', { name: /^Vaktim az seçkisi/ }).click();
  await expect(grid.getByRole('button', { name: /dakika$/ })).toHaveCount(9);
  await page.getByRole('button', { name: 'En hızlı önce', exact: true }).click();
  await expect(grid.getByRole('button', { name: /dakika$/ }).first()).toHaveAccessibleName(
    'Naneli cacık, 10 dakika',
  );
  await page.getByRole('button', { name: 'Hepsi', exact: true }).click();
  await page.getByPlaceholder('Canın ne çekiyor?').fill('MAYDANOZ');
  await expect(grid.getByRole('button', { name: /dakika$/ })).toHaveCount(6);
  await page.getByPlaceholder('Canın ne çekiyor?').fill('');
  await page.getByRole('button', { name: 'Tatlı', exact: true }).click();
  await expect(grid.getByRole('button', { name: /dakika$/ })).toHaveCount(3);
  await expect(grid.getByRole('button', { name: 'Tarçınlı ev sütlacı, 165 dakika' })).toBeVisible();
  await page.getByRole('button', { name: 'Hepsi', exact: true }).click();
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll((imgs) =>
          imgs.every(
            (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/14-zengin-kesif-mobil.png' });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: 'docs/screenshots/15-zengin-kesif-masaustu.png' });
  expect(errors).toEqual([]);
});
test('tariften koleksiyon oluştur, adını ve üyeliğini değiştir, sil; favori korunur', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Favorilerime ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Koleksiyona ekle', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Yeni koleksiyon adı', exact: true })
    .fill('Pratik sofram');
  await page.getByRole('button', { name: 'Oluştur ve tarifi ekle', exact: true }).click();
  await page.goto('/collections');
  await page.getByRole('button', { name: 'Pratik sofram koleksiyonunu aç', exact: true }).click();
  await page.getByRole('button', { name: 'Adını değiştir', exact: true }).click();
  await page.getByRole('textbox', { name: 'Yeni koleksiyon adı', exact: true }).fill('Hafta içi');
  await page.getByRole('button', { name: 'Koleksiyon adını kaydet', exact: true }).click();
  await page.getByRole('button', { name: 'Tarif ekle / çıkar', exact: true }).click();
  await page.getByRole('button', { name: 'Nohutlu pirinç pilavı', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Nohutlu pirinç pilavı tarifini aç', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/16-koleksiyon.png' });
  await page.getByRole('button', { name: 'Tarif ekle / çıkar', exact: true }).click();
  await page.getByRole('button', { name: 'Kırmızı mercimek çorbası', exact: true }).click();
  await page.getByRole('button', { name: 'Tarif ekle / çıkar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kırmızı mercimek çorbası tarifini aç', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Koleksiyonu sil', exact: true }).click();
  await page.getByRole('button', { name: 'Evet, koleksiyonu sil', exact: true }).click();
  await expect(page.getByText('Koleksiyonlarım', { exact: true })).toBeVisible();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.favorites, key),
  ).toEqual(['mercimek']);
});
test('stok önerisi porsiyonla değişir, seçilen porsiyon menüye ve alışverişe taşınır', async ({
  page,
}) => {
  await onboard(page);
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.pantry = { potato: 300, egg: 200, oil: 20, salt: 3, blackpepper: 1 };
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.goto('/pantry-recipes');
  await page
    .getByRole('button', { name: 'Sadece tüm malzemeleri yeterli olanlar', exact: true })
    .click();
  await expect(page.getByTestId('pantry-suggestion')).toHaveCount(1);
  await expect(page.getByText('5/5 malzemenin miktarı yeterli')).toBeVisible();
  await page.getByRole('button', { name: 'Kişi sayısı artır', exact: true }).click();
  await expect(page.getByText('Tüm malzemeleri yeten tarif yok', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Sadece tüm malzemeleri yeterli olanlar', exact: true })
    .click();
  const card = page.getByTestId('pantry-suggestion').filter({ hasText: 'Patatesli tava omleti' });
  await card.getByRole('button', { name: 'Eksik miktarları gör', exact: true }).click();
  await expect(card.getByText('150 g', { exact: true })).toBeVisible();
  await expect(card.getByText('100 g', { exact: true })).toBeVisible();
  await card
    .getByRole('button', { name: 'Patatesli tava omleti tarifini aç', exact: true })
    .click();
  await expect(
    page.getByTestId('recipe-summary').getByLabel('3 kişi', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await page.goto('/list');
  await expect(page.getByRole('checkbox', { name: 'Patates, 150 g', exact: true })).toBeVisible();
});
test('eski kullanıcıda katalog yenilenir, kişisel tarif ve menü kaybolmaz', async ({ page }) => {
  await onboard(page);
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.recipes = s.recipes.slice(0, 8);
    for (const r of s.recipes) delete r.category;
    s.recipes[0].title = 'Annemin mercimeği';
    s.pantry = { onion: 77 };
    s.experience.favorites = ['mercimek'];
    delete s.experience.collections;
    s.meals = [
      { id: 'eski', date: '2026-10-05', slot: 'dinner', recipeId: 'mercimek', servings: 4 },
    ];
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Annemin mercimeği, 30 dakika', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).recipes.length, key))
    .toBe(40);
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
  expect(saved.pantry.onion).toBe(77);
  expect(saved.meals[0].id).toBe('eski');
  expect(saved.experience.favorites).toEqual(['mercimek']);
  expect(saved.experience.collections).toEqual([]);
});
