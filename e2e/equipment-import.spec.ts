import { expect, Page, test } from '@playwright/test';
const key = '@yazgan/sofra/offline/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}

test('ekipman seçimi kalıcıdır; olmayan cihaz detayda görünür ve önerilerde elenir', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/equipment');
  await page.getByRole('button', { name: 'Ekipmanlarıma göre öner', exact: true }).click();
  await page.getByRole('button', { name: 'Fırın', exact: true }).click();
  await page.getByRole('button', { name: 'Blender', exact: true }).click();
  await page.getByRole('button', { name: 'Buzdolabı', exact: true }).click();
  await page.getByRole('button', { name: 'Airfryer', exact: true }).click();
  await page.getByRole('button', { name: 'Çok amaçlı pişirici', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.equipment, key),
    )
    .toEqual(['hob']);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ocak', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.screenshot({ path: 'docs/screenshots/20-ekipmanlar.png', fullPage: true });
  await page.goto('/recipe/mercimek');
  await expect(page.getByText(/Mutfağında seçili olmayan: Blender/)).toBeVisible();
  await page.goto('/inspiration/corba');
  await expect(
    page.getByRole('button', { name: 'Kırmızı mercimek çorbası tarifini incele' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Naneli yayla çorbası tarifini incele' }),
  ).toBeVisible();
});

test('metinden tarif eklenir, miktarlar birleştirilir, plan ve listede ölçeklenir', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await onboard(page);
  await page.goto('/my-recipes');
  await page.getByRole('button', { name: 'Tarif aktar' }).click();
  await page
    .getByRole('textbox', { name: 'Tarif metni' })
    .fill(
      'Test soğan yemeği\nPorsiyon: 4\nSüre: 20 dk\nMalzemeler\n100 g soğan\n0,2 kg soğan\nYapılışı\nSoğanı doğra ve yumuşayana kadar pişir.',
    );
  await page.getByRole('button', { name: 'Tarifi incele' }).click();
  await expect(page.getByRole('button', { name: 'Tarif defterime kaydet' })).toBeDisabled();
  await page.getByRole('button', { name: 'Ekipman bilgisini belirt' }).click();
  await page.getByRole('button', { name: 'Ocak', exact: true }).click();
  await page
    .getByRole('button', { name: 'Malzemeleri, gramajları ve adımları kontrol ettim' })
    .click();
  await page.getByRole('button', { name: 'Tarif defterime kaydet' }).click();
  await expect(
    page.getByTestId('recipe-summary').getByText('Test soğan yemeği', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('150 g', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await page.goto('/list');
  await expect(page.getByText('150 g', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('150 g', { exact: true })).toBeVisible();
  const recipe = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem(k)!).recipes.find(
        (r: { title: string }) => r.title === 'Test soğan yemeği',
      ),
    key,
  );
  expect(recipe.ingredients).toEqual([{ ingredientId: 'onion', quantity: 300, unit: 'g' }]);
  expect(recipe.equipment).toEqual(['hob']);
  expect(errors).toEqual([]);
});

test('belirsiz ölçü kaydetmeyi engeller; düzeltmeden sonra onay yeniden istenir', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/import-recipe');
  await page
    .getByRole('textbox', { name: 'Tarif metni' })
    .fill(
      'Sütlü tarifim\nPorsiyon: 2\nSüre: 15 dk\nMalzemeler\n1 bardak süt\nYapılışı\nSütü tencerede ısıt.',
    );
  await page.getByRole('button', { name: 'Tarifi incele' }).click();
  await expect(page.getByRole('textbox', { name: '1. malzeme gram miktarı' })).toHaveValue('');
  await page
    .getByRole('button', { name: 'Malzemeleri, gramajları ve adımları kontrol ettim' })
    .click();
  await page.getByRole('button', { name: 'Tarif defterime kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('1. malzemenin eşleşmesini');
  await page.getByRole('textbox', { name: '1. malzeme gram miktarı' }).fill('200');
  await expect(page.getByRole('button', { name: 'Tarif defterime kaydet' })).toBeDisabled();
  await page.screenshot({ path: 'docs/screenshots/21-tarif-aktarimi.png', fullPage: true });
  await page
    .getByRole('button', { name: 'Malzemeleri, gramajları ve adımları kontrol ettim' })
    .click();
  await page.getByRole('button', { name: 'Tarif defterime kaydet' }).click();
  await expect(page.getByText('Sütlü tarifim', { exact: true })).toBeVisible();
});

test('malzeme eşleştirme, örnek şablon ve küçük ekran düzeni kullanılabilir', async ({ page }) => {
  await onboard(page);
  await page.goto('/import-recipe');
  await page.getByRole('button', { name: 'Örnek metni kullan' }).click();
  await page.getByRole('button', { name: 'Tarifi incele' }).click();
  await page.getByRole('button', { name: '1. malzemeyi seç / değiştir' }).click();
  await page.getByRole('textbox', { name: '1. malzeme için ara' }).fill('bulgur');
  await page
    .getByTestId('import-row-0')
    .getByRole('button', { name: 'Pilavlık bulgur', exact: true })
    .click();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  await page.getByRole('button', { name: 'Metne geri dön' }).click();
  await expect(page.getByRole('textbox', { name: 'Tarif metni' })).toContainText(
    'Soğanlı bulgur pilavım',
  );
});
