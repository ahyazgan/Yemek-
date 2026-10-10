import { expect, Page, test } from '@playwright/test';
const key = '@yazgan/sofra/offline/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}

test('yeni seçkiden tarife, seçilen porsiyonla pişirmeye ve menüye geçiş', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await onboard(page);
  await page.getByRole('button', { name: 'Çorbayla başlayan sofralar seçkisini aç' }).click();
  await expect(page.getByText('Bu seçkiden sana uygun 6 tarif', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/17-sofra-fikirleri.png', fullPage: true });
  await page.getByRole('button', { name: 'Naneli yayla çorbası tarifini incele' }).click();
  await expect(page.getByTestId('recipe-timing').getByText('10 dk', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Püf noktaları', exact: true }).click();
  await expect(
    page.getByTestId('recipe-notes').getByText('Nasıl servis etsem?', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Porsiyon artır', exact: true }).click();
  await page.getByRole('button', { name: 'Pişirmeye başla' }).click();
  await page.getByRole('button', { name: '3 kişilik malzemeleri gör' }).click();
  await expect(
    page.getByTestId('cook-ingredients').getByText('300 g', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals[0]?.servings, key))
    .toBe(3);
  expect(errors).toEqual([]);
});

test('tarif süreleri ve püf noktaları düzenlenir, yenilemede korunur', async ({ page }) => {
  await onboard(page);
  await page.goto('/recipe/irmik');
  await expect(
    page.getByTestId('recipe-timing').getByText('120 dk', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tarifi düzenle', exact: true }).click();
  await page.getByRole('button', { name: 'Süre ve püf noktalarını düzenle' }).click();
  await page.getByRole('textbox', { name: 'Hazırlık (dk)', exact: true }).fill('10');
  await page
    .getByRole('textbox', { name: 'Püf noktaları (her satır ayrı)', exact: true })
    .fill('Kendi mutfak notum.');
  await page
    .getByRole('textbox', { name: 'Servis önerisi', exact: true })
    .fill('Küçük kaselerimde sun.');
  await page.getByRole('button', { name: 'Tarif değişikliklerini kaydet' }).click();
  await page.reload();
  await expect(page.getByText('145 dk', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Püf noktaları', exact: true }).click();
  await expect(page.getByText('Kendi mutfak notum.', { exact: true })).toBeVisible();
  await expect(page.getByText('Küçük kaselerimde sun.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/18-tarif-notlari.png', fullPage: true });
});

test('seçkiler tercihleri korur, boş sonuç ve yanlış adres kullanılabilir kalır', async ({
  page,
}) => {
  await onboard(page);
  await page.evaluate((k) => {
    const state = JSON.parse(localStorage.getItem(k)!);
    state.profile.diets = ['vegan'];
    state.experience.maxMinutes = 20;
    localStorage.setItem(k, JSON.stringify(state));
  }, key);
  await page.goto('/inspiration/corba');
  await expect(page.getByText('Tercihlerine uygun tarif kalmadı', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /tarifini incele$/ })).toHaveCount(0);
  await page.goto('/inspiration/olmayan');
  await expect(page.getByText('Seçki bulunamadı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tariflere dön', exact: true }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
});

test('eski düzenlenmiş tarifin içeriğine uygun olmayan notlar eklenmez; mobil taşma yok', async ({
  page,
}) => {
  await onboard(page);
  await page.evaluate((k) => {
    const state = JSON.parse(localStorage.getItem(k)!);
    state.recipes = state.recipes.slice(0, 16);
    for (const recipe of state.recipes) delete recipe.details;
    state.recipes[0].steps = ['Benim farklı pişirme yöntemim.'];
    localStorage.setItem(k, JSON.stringify(state));
  }, key);
  await page.goto('/recipe/mercimek');
  await expect(page.getByRole('button', { name: 'Püf noktaları', exact: true })).toHaveCount(0);
  await page.goto('/recipe/yayla');
  await expect(page.getByRole('button', { name: 'Püf noktaları', exact: true })).toBeVisible();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  await page.screenshot({ path: 'docs/screenshots/19-tarif-detay-masaustu.png', fullPage: true });
});
