import { expect, test, type Page } from '@playwright/test';
import { initialState } from '../src/domain/state';
import { addDays, buildShoppingList, weekStart } from '../src/domain/logic';
import type { AppState } from '../src/domain/model';

const key = '@yazgan/sofra/offline/v1';
const start = (page: Page) => page.getByRole('button', { name: 'Alışverişe başla', exact: true });
const product = (page: Page, name = 'Soğan, 30 g') =>
  page.getByRole('checkbox', { name, exact: true });
async function seed(page: Page, configure?: (state: AppState) => void) {
  const state = initialState();
  state.profile = { people: 2, diets: [], budget: 'balanced' };
  state.meals = [
    { id: 'meal-test', date: weekStart(), slot: 'dinner', recipeId: 'mercimek', servings: 2 },
  ];
  state.pantry = { onion: 30, salt: 1000 };
  state.experience.extras = [
    {
      id: 'extra-test',
      week: weekStart(),
      name: 'Kağıt havlu',
      quantity: 2,
      unit: 'paket',
      checked: false,
    },
  ];
  configure?.(state);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Devam et', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), key)).not.toBeNull();
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key,
    state,
  });
  await page.goto('/list');
  return state;
}

test('haftalık listeden açılır; kalanlar ve geri alma ana listeye kalıcı yansır', async ({
  page,
}) => {
  await seed(page);
  await start(page).click();
  await expect(page.getByText('Listeni takip et', { exact: true })).toBeVisible();
  await product(page).click();
  await expect(product(page)).toHaveCount(0);
  await expect(page.getByText('Soğan alındı olarak işaretlendi.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Son işareti geri al', exact: true }).click();
  await expect(product(page)).not.toBeChecked();
  await product(page).click();
  await page.getByRole('button', { name: 'Liste düzenlemeye dön', exact: true }).click();
  await expect(product(page)).toBeChecked();
  await page.reload();
  await expect(product(page)).toBeChecked();
  await start(page).click();
  await page.getByRole('button', { name: /^Tümü \(/ }).click();
  await expect(product(page)).toBeChecked();
});

test('Türkçe arama, kaynak yemek ve net gramaj; arama sonucu toplamı değiştirmez', async ({
  page,
}) => {
  await seed(page);
  await start(page).click();
  const before = await page.getByTestId('shopping-progress').textContent();
  await page.getByRole('textbox', { name: 'Listede ürün ara', exact: true }).fill('sogan');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('button', { name: 'Soğan hangi yemeklerde?', exact: true }).click();
  await expect(page.getByText('Kırmızı mercimek çorbası', { exact: true })).toBeVisible();
  await expect(page.getByText('Toplam ihtiyaç: 60 g', { exact: true })).toBeVisible();
  await expect(page.getByText('Evden karşılanan: 30 g', { exact: true })).toBeVisible();
  expect(await page.getByTestId('shopping-progress').textContent()).toBe(before);
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({ path: 'docs/screenshots/38-alisveris-modu.png' });
  await page.getByRole('textbox', { name: 'Listede ürün ara', exact: true }).fill('KAGIT');
  await expect(product(page, 'Kağıt havlu, 2 paket')).toBeVisible();
  await page.getByRole('textbox', { name: 'Listede ürün ara', exact: true }).fill('olmayan ürün');
  await expect(page.getByText('Bu görünümde ürün bulunamadı', { exact: true })).toBeVisible();
  await expect(page.getByText('Listen tamamlandı', { exact: true })).toHaveCount(0);
});

test('yalnız ek ürünle çevrimdışı işaretleme, tamamlama ve işareti kaldırma', async ({
  page,
  context,
}) => {
  await seed(page, (state) => {
    state.meals = [];
  });
  await start(page).click();
  await expect(page.getByText('1 ürün kaldı', { exact: true })).toBeVisible();
  await context.setOffline(true);
  await product(page, 'Kağıt havlu, 2 paket').click();
  await expect(page.getByText('Listen tamamlandı', { exact: true })).toBeVisible();
  await expect(page.getByText('1 / 1 ürün işaretlendi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tüm ürünleri göster', exact: true }).click();
  await product(page, 'Kağıt havlu, 2 paket').uncheck();
  await expect(page.getByText('1 ürün kaldı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Son işareti geri al', exact: true }).click();
  await expect(product(page, 'Kağıt havlu, 2 paket')).toBeChecked();
  await context.setOffline(false);
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.extras[0].checked, key),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByText('Listen tamamlandı', { exact: true })).toBeVisible();
});

test('kayıtlı liste modu haftanın işaretlerini ve stok hesabını değiştirmez', async ({ page }) => {
  await seed(page, (state) => {
    state.savedLists = [
      {
        id: 'list-test',
        name: 'Hafta sonu',
        week: weekStart(),
        createdAt: new Date().toISOString(),
        items: buildShoppingList(state.meals, state.recipes, {}),
        extras: structuredClone(state.experience.extras),
        checked: [],
      },
    ];
  });
  await page.getByRole('button', { name: 'Kayıtlı', exact: true }).click();
  await page.getByRole('button', { name: 'Hafta sonu listesini aç', exact: true }).click();
  await start(page).click();
  await expect(product(page, 'Soğan, 60 g')).toBeVisible();
  await product(page, 'Soğan, 60 g').click();
  await product(page, 'Kağıt havlu, 2 paket').click();
  await page.reload();
  await page.getByRole('button', { name: /^Tümü \(/ }).click();
  await expect(product(page, 'Soğan, 60 g')).toBeChecked();
  await expect(product(page, 'Kağıt havlu, 2 paket')).toBeChecked();
  await page.getByRole('button', { name: 'Liste düzenlemeye dön', exact: true }).click();
  await expect(page.getByText('Hafta sonu', { exact: true })).toBeVisible();
  await page.goto('/list');
  await expect(product(page)).not.toBeChecked();
  await expect(product(page, 'Kağıt havlu, 2 paket')).not.toBeChecked();
});

test('açık oturumda stok değişirse eski miktarın geri alma düğmesi kaybolur', async ({ page }) => {
  await seed(page);
  await start(page).click();
  await product(page).click();
  await page.getByRole('button', { name: 'Mutfağım', exact: true }).click();
  await page.getByRole('textbox', { name: 'Soğan · evdeki miktar (g)', exact: true }).fill('45');
  await page.getByRole('button', { name: 'Evdeki miktarı kaydet', exact: true }).click();
  await page.goBack();
  await expect(
    page.getByText('Ürün değiştiği için son işaret geri alınamaz.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Son işareti geri al', exact: true })).toHaveCount(
    0,
  );
  await expect(product(page, 'Soğan, 15 g')).not.toBeChecked();
});

test('hafta kaynakta sabit kalır, hatalı veya silinmiş liste güvenli boş ekran gösterir', async ({
  page,
}) => {
  await seed(page, (state) => {
    state.experience.extras.push({
      id: 'extra-next',
      week: addDays(weekStart(), 7),
      name: 'Süt',
      quantity: 500,
      unit: 'ml',
      checked: false,
    });
  });
  await page.getByRole('button', { name: 'Sonraki hafta', exact: true }).click();
  await start(page).click();
  await expect(product(page, 'Süt, 500 ml')).toBeVisible();
  await page.reload();
  await product(page, 'Süt, 500 ml').click();
  await page.getByRole('button', { name: 'Liste düzenlemeye dön', exact: true }).click();
  await expect(product(page, 'Süt, 500 ml')).toBeChecked();
  await expect(product(page, 'Kağıt havlu, 2 paket')).toHaveCount(0);
  await page.goto('/shopping-mode?savedList=missing');
  await expect(page.getByText('Liste bulunamadı', { exact: true })).toBeVisible();
  await page.goto('/shopping-mode?week=bozuk');
  await expect(page.getByText('Liste bağlantısı geçersiz', { exact: true })).toBeVisible();
  await page.goto('/shopping-mode?week=2026-02-30');
  await expect(page.getByText('Liste bağlantısı geçersiz', { exact: true })).toBeVisible();
});

test('320 px uzun ürün ve liste adları taşmaz; boş hafta tamamlandı demez', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 800 });
  await seed(page, (state) => {
    state.meals = [];
    state.experience.extras[0].name = 'Çok uzun isimli mutfak temizlik ve alışveriş malzemesi';
  });
  await start(page).click();
  await expect(page.getByRole('checkbox')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('checkbox').click();
  await expect(page.getByText('Listen tamamlandı', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/shopping-mode?week=2030-01-07');
  await expect(page.getByText('Alınacak ürün yok', { exact: true })).toBeVisible();
  await expect(page.getByText('Listen tamamlandı', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
