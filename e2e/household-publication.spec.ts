import { expect, test, Page } from '@playwright/test';

const publish = (page: Page) =>
  page.getByRole('button', { name: 'Kendi haftamı haneye aktar', exact: true });
const confirm = (page: Page) =>
  page.getByRole('button', { name: 'Bu haftanın ortak kaydını değiştir', exact: true });
async function household(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım', exact: true }).click();
  await page.goto('/recipe/mercimek?servings=2');
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await page.goto('/shared-household');
  await page.getByRole('button', { name: 'Hanemi oluştur', exact: true }).click();
  await publish(page).click();
  await confirm(page).click();
  await expect(page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true })).toBeVisible();
}
async function manualItem(page: Page) {
  await page.getByLabel('Ortak ürün adı', { exact: true }).fill('Peçete');
  await page.getByLabel('Ortak ürün miktarı', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'paket', exact: true }).click();
  await page.getByRole('button', { name: 'Ortak listeye ekle', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true }).check();
}

test('yeniden aktarımda ek ürünler ve ortak alındı işaretleri korunur', async ({ page }) => {
  await household(page);
  const onion = page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true });
  await onion.check();
  await manualItem(page);
  await publish(page).click();
  await expect(page.getByText('2 alındı işareti korunacak.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Ortak ek ürünleri koru', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Değişiklikleri göster', exact: true }).click();
  await expect(
    page.getByText('Korunacak · Peçete · 2 paket · Alındı', { exact: true }),
  ).toBeVisible();
  await confirm(page).click();
  await expect(onion).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true })).toBeChecked();
  await page.reload();
  await expect(onion).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true })).toBeChecked();
});

test('miktar değişikliği karşılaştırılır; iptal değiştirmez, onay tekrar kontrol ister', async ({
  page,
}) => {
  await household(page);
  await page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true }).check();
  await manualItem(page);
  await page.goto('/kitchen');
  await page.getByRole('textbox', { name: 'Soğan · evdeki miktar (g)', exact: true }).fill('30');
  await page.getByRole('button', { name: 'Evdeki miktarı kaydet', exact: true }).click();
  await page.goto('/shared-household');
  await publish(page).click();
  await expect(page.getByText(/1 üründe miktar veya birim değişti/)).toBeVisible();
  await page.getByRole('button', { name: 'Değişiklikleri göster', exact: true }).click();
  await expect(
    page.getByText('Değişecek · Soğan · 60 g → Soğan · 30 g', { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByText('AKTARMADAN ÖNCE', { exact: true }).scrollIntoViewIfNeeded();
  await page
    .getByText('AKTARMADAN ÖNCE', { exact: true })
    .locator('..')
    .screenshot({ path: 'docs/screenshots/37-ortak-hafta-karsilastirma.png' });
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Aktarımdan vazgeç', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true })).toBeChecked();
  await publish(page).click();
  await confirm(page).click();
  await expect(page.getByRole('checkbox', { name: 'Soğan, 30 g', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true })).toBeChecked();
});

test('önizleme sırasında ortak satır değişirse yeni karşılaştırma gerekir', async ({ page }) => {
  await household(page);
  await publish(page).click();
  await page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true }).check();
  await expect(page.getByRole('alert')).toHaveText(
    'Ortak liste bu sırada değişti. Güncel listeyle karşılaştırmayı yenile.',
  );
  await expect(confirm(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Karşılaştırmayı yenile', exact: true }).click();
  await expect(page.getByText('1 alındı işareti korunacak.', { exact: true })).toBeVisible();
  await confirm(page).click();
  await expect(page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true })).toBeChecked();
});

test('ek ürünleri çıkarma seçimi önce incelenir, yalnızca onayla uygulanır', async ({ page }) => {
  await household(page);
  await manualItem(page);
  await publish(page).click();
  await page.getByRole('checkbox', { name: 'Ortak ek ürünleri koru', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Değişiklikleri göster', exact: true }).click();
  await expect(
    page.getByText('Çıkarılacak · Peçete · 2 paket · Alındı işaretliydi', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true })).toBeChecked();
  await confirm(page).click();
  await expect(page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true })).toHaveCount(0);
});

test('kişisel liste değiştikten sonra eski karşılaştırma onaylanamaz', async ({ page }) => {
  await household(page);
  await publish(page).click();
  await page.getByRole('button', { name: 'Kişisel listeme dön', exact: true }).click();
  await page.getByRole('button', { name: 'Tuz evde var', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('alert')).toHaveText(
    'Kişisel menün veya alışverişin bu sırada değişti. Karşılaştırmayı yenile.',
  );
  await expect(confirm(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Karşılaştırmayı yenile', exact: true }).click();
  await page.getByRole('button', { name: 'Değişiklikleri göster', exact: true }).click();
  await expect(page.getByText(/^Çıkarılacak · Tuz/)).toBeVisible();
  await confirm(page).click();
  await expect(page.getByRole('checkbox', { name: /^Tuz,/ })).toHaveCount(0);
});
