import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
const key = '@yazgan/sofra/offline/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
test('kendi fotoğrafını seç, kaydet, yeniden aç ve yalnızca tarif kopyasını kaldır', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Kendi fotoğrafımı ekle', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Galeriden fotoğraf seç', exact: true }).click();
  await (await chooser).setFiles(path.resolve('assets/recipes/mercimek.png'));
  await expect(page.getByTestId('photo-preview')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Fotoğraf açıklaması', exact: true })
    .fill('Kendi çorbam');
  await page.screenshot({ path: 'docs/screenshots/29-tarif-fotografi.png' });
  await page.getByRole('button', { name: 'Fotoğrafı kaydet', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Kendi çorbam', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((k) => {
        const photo = JSON.parse(localStorage.getItem(k)!).recipes.find(
          (r: { id: string }) => r.id === 'mercimek',
        ).photo;
        return (
          !!photo && photo.width <= 720 && photo.height <= 720 && photo.dataUri.length < 220000
        );
      }, key),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByRole('img', { name: 'Kendi çorbam', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fotoğrafımı düzenle', exact: true }).click();
  await page.getByRole('button', { name: 'Fotoğrafı kaldır', exact: true }).click();
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(page.getByTestId('photo-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Fotoğrafı kaldır', exact: true }).click();
  await page.getByRole('button', { name: 'Evet, tarif fotoğrafını kaldır', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kendi fotoğrafımı ekle', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Kendi fotoğrafımı ekle', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
const sourceRecipe = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Aktarılan bulgur pilavım',
  recipeYield: '4 porsiyon',
  totalTime: 'PT30M',
  author: { name: 'Kendi tarif defterim' },
  recipeIngredient: ['300 g pilavlık bulgur', '120 g soğan'],
  recipeInstructions: [
    { '@type': 'HowToStep', text: 'Soğanı ince doğra.' },
    { '@type': 'HowToStep', text: 'Bulguru ekle ve pişir.' },
  ],
};
test('kaynak tarifini seç, onayla, porsiyonuyla menüye al ve kaynağını paylaş', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/import-recipe');
  await page.getByRole('button', { name: 'Kaynak verisi', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Kaynak bağlantısı (isteğe bağlı)', exact: true })
    .fill('https://recipes.example.org/pilav');
  await page
    .getByRole('textbox', { name: 'Tarif kaynak verisi', exact: true })
    .fill(JSON.stringify({ '@graph': [sourceRecipe, { ...sourceRecipe, name: 'Diğer pilav' }] }));
  await page.getByRole('button', { name: 'Kaynak verisini incele', exact: true }).click();
  await expect(page.getByText('2 tarif bulundu', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Aktarılan bulgur pilavım taslağını incele', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Tarif defterime kaydet', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Tarif kaç kişilik?', exact: true })).toHaveValue(
    '4',
  );
  await page
    .getByRole('button', { name: 'Malzemeleri, gramajları ve adımları kontrol ettim', exact: true })
    .click();
  await page.getByRole('button', { name: 'Tarif defterime kaydet', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kaynak tarifi aç', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tarifi paylaş', exact: true }).click();
  await expect(page.getByText(/Kaynak: https:\/\/recipes.example.org\/pilav/)).toBeVisible();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await page.goto('/list');
  await expect(page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Pilavlık bulgur, 150 g', exact: true }),
  ).toBeVisible();
});
test('eksik miktar doldurulmadan içe aktarılan tarif kaydedilmez ve kapalı servis sahte yanıt üretmez', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/import-recipe');
  await page.getByRole('button', { name: 'Bağlantı', exact: true }).click();
  await expect(page.getByText(/hizmeti henüz kurulmadı/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Bağlantıdaki tarifleri getir', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Kaynak verisi', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tarif kaynak verisi', exact: true })
    .fill(JSON.stringify({ ...sourceRecipe, recipeIngredient: ['1 adet soğan'] }));
  await page.getByRole('button', { name: 'Kaynak verisini incele', exact: true }).click();
  await page
    .getByRole('button', { name: 'Aktarılan bulgur pilavım taslağını incele', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Malzemeleri, gramajları ve adımları kontrol ettim', exact: true })
    .click();
  await page.getByRole('button', { name: 'Tarif defterime kaydet', exact: true }).click();
  await expect(
    page.getByText('1. malzemenin eşleşmesini ve gram miktarını tamamla.'),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
