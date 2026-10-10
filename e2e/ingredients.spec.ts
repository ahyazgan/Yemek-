import { expect, Page, test } from '@playwright/test';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
test('katalog dışı malzeme aktarılır, tarif ve stok alışveriş hesabında birleşir', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await onboard(page);
  await page.goto('/import-recipe');
  await page
    .getByRole('textbox', { name: 'Tarif metni' })
    .fill(
      'Cevizli tarifim\nPorsiyon: 4\nSüre: 10\nMalzemeler\n200 g ceviz içi\nYapılışı\nCevizi ince doğra ve servis et.',
    );
  await page.getByRole('button', { name: 'Tarifi incele' }).click();
  await page.getByRole('button', { name: 'Yeni malzeme oluştur', exact: true }).click();
  await page.getByRole('textbox', { name: 'Yeni malzemenin adı' }).fill('Ceviz içi');
  await page.getByRole('button', { name: 'Temel gıda', exact: true }).click();
  await page.getByRole('button', { name: 'Malzemeyi defterime ekle' }).click();
  await expect(page.getByText('Eşleşen: Ceviz içi', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Malzemeleri, gramajları ve adımları kontrol ettim' })
    .click();
  await page.getByRole('button', { name: 'Tarif defterime kaydet' }).click();
  await expect(page.getByText('100 g', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await page.goto('/kitchen');
  await page.getByRole('textbox', { name: 'Malzeme ara', exact: true }).fill('ceviz');
  await page.getByRole('button', { name: 'Ceviz içi', exact: true }).click();
  await page.getByRole('textbox', { name: 'Ceviz içi · evdeki miktar (g)' }).fill('30');
  await page.getByRole('button', { name: 'Evdeki miktarı kaydet' }).click();
  await page.goto('/list');
  await expect(page.getByRole('checkbox', { name: 'Ceviz içi, 70 g', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Ceviz içi, 70 g', exact: true })).toBeVisible();
  await page.goto('/ingredients');
  await expect(page.getByRole('button', { name: 'Ceviz içi malzemesini sil' })).toBeDisabled();
  await page.getByRole('button', { name: 'Ceviz içi adını düzenle' }).click();
  await page.getByRole('textbox', { name: 'Malzemenin yeni adı' }).fill('Kavrulmamış ceviz içi');
  await page.getByRole('button', { name: 'Malzeme adını kaydet' }).click();
  await page.goto('/list');
  await expect(
    page.getByRole('checkbox', { name: 'Kavrulmamış ceviz içi, 70 g', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('kullanılmayan kişisel malzeme eklenir, iptal edilip silinebilir', async ({ page }) => {
  await onboard(page);
  await page.goto('/ingredients');
  await page.getByRole('button', { name: 'Yeni malzeme oluştur', exact: true }).click();
  await page.getByRole('textbox', { name: 'Yeni malzemenin adı' }).fill('Badem içi');
  await page.getByRole('button', { name: 'Malzemeyi defterime ekle' }).click();
  await expect(page.getByRole('alert')).toContainText('alışveriş bölümünü seç');
  await page.getByRole('button', { name: 'Temel gıda', exact: true }).click();
  await page.getByRole('button', { name: 'Malzemeyi defterime ekle' }).click();
  await page.getByRole('button', { name: 'Badem içi malzemesini sil' }).click();
  await page.getByRole('button', { name: 'Silmekten vazgeç', exact: true }).click();
  await expect(page.getByText('Badem içi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Badem içi malzemesini sil' }).click();
  await page.getByRole('button', { name: 'Malzemeyi silmeyi onayla' }).click();
  await expect(page.getByText('Badem içi', { exact: true })).toHaveCount(0);
});
