import { expect, Page, test } from '@playwright/test';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
test('tarif porsiyonla paylaşılır, kopyası bağımsız düzenlenir ve onayla silinir', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/recipe/mercimek?servings=3');
  await page.getByRole('button', { name: 'Tarifi paylaş', exact: true }).click();
  const text = await page.getByLabel('Paylaşılacak metin', { exact: true }).inputValue();
  expect(text).toContain('Porsiyon: 3');
  expect(text).toContain('Malzemeler');
  expect(text).toContain('Yapılışı');
  await page.getByRole('button', { name: 'Kendi kopyamı oluştur' }).click();
  await expect(page.getByLabel('Tarif adı', { exact: true })).toHaveValue(/Kopyam/);
  await page.getByLabel('Tarif adı', { exact: true }).fill('Paylaşım çorbam');
  await page.getByRole('button', { name: 'Tarif değişikliklerini kaydet' }).click();
  await page.goto('/my-recipes');
  await page.getByRole('button', { name: 'Paylaşım çorbam tarifini sil' }).click();
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Paylaşım çorbam tarifini aç' })).toBeVisible();
  await page.getByRole('button', { name: 'Paylaşım çorbam tarifini sil' }).click();
  await page.getByRole('button', { name: 'Tarifi kalıcı sil' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Paylaşım çorbam tarifini aç' })).toHaveCount(0);
  await page.goto('/recipe/mercimek');
  await expect(page.getByText('Kırmızı mercimek çorbası', { exact: true })).toBeVisible();
});
test('hane paylaşımı doğru haftanın menü ve listesini içerir, 320px genişliğe sığar', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Ev halkıyla paylaş', exact: true }).click();
  await page.getByRole('button', { name: 'Menüyü paylaş', exact: true }).click();
  await expect(page.getByLabel('Paylaşılacak metin')).toHaveValue(/Kırmızı mercimek çorbası/);
  await expect(page.getByText(/Davet ve ortak liste için Ortak soframızı aç/)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'docs/screenshots/23-hane-paylasimi.png', fullPage: true });
});
test('bozuk URL yüzünden yönlendirme kilitlenmez ve tarayıcı hatırlatma planlamaz', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await onboard(page);
  await page.goto('/recipe/mercimek?slot=invalid&date=invalid&servings=999');
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await expect(page.getByText('1 öğün planlandı', { exact: true })).toBeVisible();
  const meals = await page.evaluate(
    () => JSON.parse(localStorage.getItem('@yazgan/sofra/offline/v1')!).meals,
  );
  expect(meals[0].slot).toBe('dinner');
  expect(meals[0].servings).toBe(2);
  expect(meals[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await page.goto('/notifications?test=' + '%FF'.repeat(120));
  await expect(page.getByText(/Tarayıcıda bildirim planlanmaz/)).toBeVisible();
  await page.getByLabel('Saat (SS:DD)').fill('29:99');
  await page.getByRole('button', { name: 'Hatırlatma tercihini kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('Geçerli');
  await page.getByLabel('Saat (SS:DD)').fill('18:30');
  await page.getByRole('button', { name: 'Hatırlatma tercihini kaydet' }).click();
  await page.reload();
  await expect(page.getByLabel('Saat (SS:DD)')).toHaveValue('18:30');
  expect(errors).toEqual([]);
});
