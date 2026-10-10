import { expect, Page, test } from '@playwright/test';
const key = '@yazgan/sofra/offline/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
test('yedek önizleme, iptal, geri yükleme ve geri alma kopyası', async ({ page }) => {
  await onboard(page);
  const backup = await page.evaluate((k) => {
    const data = JSON.parse(localStorage.getItem(k)!);
    data.profile.people = 5;
    data.experience.favorites = ['mercimek'];
    return JSON.stringify({ application: 'Sofra', exportedAt: new Date().toISOString(), data });
  }, key);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Yedek ve geri yükleme', exact: true }).click();
  await page.getByRole('button', { name: 'Metinle aktarım seçenekleri' }).click();
  await page.getByRole('textbox', { name: 'Sofra yedek metni' }).fill(backup);
  await page.getByRole('button', { name: 'Yedeği incele' }).click();
  await expect(page.getByTestId('backup-preview')).toBeVisible();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).profile.people, key)).toBe(
    2,
  );
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(page.getByTestId('backup-preview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Yedeği incele' }).click();
  await page.getByRole('button', { name: 'Bu yedeği geri yükle' }).click();
  await expect(page.getByText(/Yedek geri yüklendi/)).toBeVisible();
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).profile.people, key))
    .toBe(5);
  await page.reload();
  await page.getByRole('button', { name: 'Son geri alma kopyasını incele' }).click();
  await page.screenshot({ path: 'docs/screenshots/22-yedek-geri-yukleme.png', fullPage: true });
  await page.getByRole('button', { name: 'Bu yedeği geri yükle' }).click();
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).profile.people, key))
    .toBe(2);
});
test('hatalı yedek ve dolu depolama mevcut sofrayı değiştirmez', async ({ page }) => {
  await onboard(page);
  await page.goto('/backups');
  await page.getByRole('button', { name: 'Metinle aktarım seçenekleri' }).click();
  await page.getByRole('textbox', { name: 'Sofra yedek metni' }).fill('{bad json');
  await page.getByRole('button', { name: 'Yedeği incele' }).click();
  await expect(page.getByRole('alert')).toContainText('geçerli bir Sofra yedeği değil');
  const backup = await page.evaluate((k) => {
    const data = JSON.parse(localStorage.getItem(k)!);
    data.profile.people = 9;
    return JSON.stringify({ application: 'Sofra', exportedAt: new Date().toISOString(), data });
  }, key);
  await page.getByRole('textbox', { name: 'Sofra yedek metni' }).fill(backup);
  await page.getByRole('button', { name: 'Yedeği incele' }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, value) {
      if (k.endsWith('/recovery')) throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, k, value);
    };
  });
  await page.getByRole('button', { name: 'Bu yedeği geri yükle' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).profile.people, key)).toBe(
    2,
  );
});
test('misafir yedeği hesaba bilinçli taşınır, çıkış ve hesap silme misafiri değiştirmez', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Favorilerime ekle', exact: true }).click();
  const backup = await page.evaluate(
    (k) =>
      JSON.stringify({
        application: 'Sofra',
        exportedAt: new Date().toISOString(),
        data: JSON.parse(localStorage.getItem(k)!),
      }),
    key,
  );
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Örnek bilgileri doldur', exact: true }).click();
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await page.getByRole('button', { name: 'Yedek ve geri yükleme', exact: true }).click();
  await page.getByRole('button', { name: 'Metinle aktarım seçenekleri' }).click();
  await page.getByRole('textbox', { name: 'Sofra yedek metni' }).fill(backup);
  await page.getByRole('button', { name: 'Yedeği incele' }).click();
  await page.getByRole('button', { name: 'Bu yedeği geri yükle' }).click();
  await expect(page.getByText(/Yedek geri yüklendi/)).toBeVisible();
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Şimdi eşitle' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Hesabımı sil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Silme onayı' }).fill('SİL');
  await page.getByRole('button', { name: 'Hesabı ve verilerini kalıcı sil' }).click();
  await expect(page.getByText('Misafir olarak kullanıyorsun', { exact: true })).toBeVisible();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.favorites, key),
  ).toEqual(['mercimek']);
  expect(
    await page.evaluate(() => localStorage.getItem('@yazgan/sofra/demo/demo/v1/recovery')),
  ).toBe('null');
  expect(await page.evaluate(() => localStorage.getItem('@yazgan/sofra/demo/demo/v1/sync'))).toBe(
    'null',
  );
});
