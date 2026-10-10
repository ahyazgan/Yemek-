import { expect, Page, test } from '@playwright/test';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
async function create(page: Page) {
  await page.goto('/list');
  await page.getByRole('button', { name: 'Ortak liste', exact: true }).click();
  await expect(page.getByText(/Yerel hane denemesi/)).toBeVisible();
  await page.getByLabel('Hane adı', { exact: true }).fill('Yazgan evi');
  await page.getByRole('button', { name: 'Hanemi oluştur', exact: true }).click();
  await expect(page.getByText('Yazgan evi', { exact: true })).toBeVisible();
}
async function join(page: Page, viewer = false) {
  await page.getByRole('button', { name: 'Ev halkı', exact: true }).click();
  if (viewer) await page.getByRole('button', { name: 'Görüntüleyen daveti', exact: true }).click();
  await page.getByRole('button', { name: 'Davet kodu oluştur', exact: true }).click();
  const code = await page.getByLabel('Oluşturulan davet kodu', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Davetli olarak dene', exact: true }).click();
  await expect(page.getByLabel('Davet kodu', { exact: true })).toHaveValue(code);
  await page.getByRole('button', { name: 'Daveti kontrol et', exact: true }).click();
  await page.getByRole('button', { name: 'Daveti kabul et ve katıl', exact: true }).click();
  await expect(page.getByText('Yazgan evi', { exact: true })).toBeVisible();
  return code;
}
test('hafta önizleme/onayla paylaşılır; iki deneme üyesi aynı listeyi görür; kayıt yenilemede korunur', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.goto('/recipe/mercimek?servings=2');
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await create(page);
  await page.getByRole('button', { name: 'Kendi haftamı haneye aktar', exact: true }).click();
  await expect(page.getByText(/1 öğün ve/)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Bu haftanın ortak kaydını değiştir', exact: true })
    .click();
  const onion = page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true });
  await expect(onion).toBeVisible();
  await join(page);
  await onion.click();
  await expect(onion).toBeChecked();
  await page.getByLabel('Ortak ürün adı', { exact: true }).fill('Peçete');
  await page.getByLabel('Ortak ürün miktarı', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'paket', exact: true }).click();
  await page.getByRole('button', { name: 'Ortak listeye ekle', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Peçete, 2 paket', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hane sahibi olarak dene', exact: true }).click();
  await expect(onion).toBeChecked();
  await page.reload();
  await expect(onion).toBeChecked();
  await page.getByRole('button', { name: 'Ortak menü', exact: true }).click();
  await expect(page.getByText('Kırmızı mercimek çorbası', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sonraki hafta', exact: true }).click();
  await expect(page.getByText('0 / 0 ürün alındı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Önceki hafta', exact: true }).click();
  await expect(onion).toBeChecked();
  await page.setViewportSize({ width: 320, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'docs/screenshots/30-ortak-liste.png', fullPage: true });
  await page.getByRole('button', { name: 'Kişisel listeme dön', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Soğan, 60 g', exact: true })).not.toBeChecked();
  expect(errors).toEqual([]);
});
test('görüntüleyen yazamaz; yönetici yetki verir; üye ayrılır ve tüketilmiş davet yeniden açılamaz', async ({
  page,
}) => {
  await onboard(page);
  await create(page);
  const code = await join(page, true);
  await expect(page.getByText(/Görüntüleyen üyesin/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ortak listeye ekle', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Hane sahibi olarak dene', exact: true }).click();
  await page.getByRole('button', { name: 'Ev halkı', exact: true }).click();
  await page
    .getByRole('button', { name: 'Deneme üyesi: düzenleme yetkisi ver', exact: true })
    .click();
  await page.getByRole('button', { name: 'Hane işlemini onayla', exact: true }).click();
  await page.getByRole('button', { name: 'Davetli olarak dene', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ortak listeye ekle', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ev halkı', exact: true }).click();
  await page.getByRole('button', { name: 'Haneden ayrıl', exact: true }).click();
  await page.getByRole('button', { name: 'Hane işleminden vazgeç', exact: true }).click();
  await expect(page.getByText('Deneme üyesi · Sen', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Haneden ayrıl', exact: true }).click();
  await page.getByRole('button', { name: 'Hane işlemini onayla', exact: true }).click();
  await page.getByLabel('Davet kodu', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Daveti kontrol et', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Daveti kabul et ve katıl', exact: true }),
  ).toHaveCount(0);
});
test('devirden sonra eski yönetici ayrılsın; yeni yönetici haneyi onayla kapatsın', async ({
  page,
}) => {
  await onboard(page);
  await create(page);
  await join(page);
  await page.getByRole('button', { name: 'Hane sahibi olarak dene', exact: true }).click();
  await page.getByRole('button', { name: 'Ev halkı', exact: true }).click();
  await page
    .getByRole('button', { name: 'Deneme üyesi: yöneticiliği devret', exact: true })
    .click();
  await page.getByRole('button', { name: 'Hane işlemini onayla', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Davet kodu oluştur', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Haneden ayrıl', exact: true }).click();
  await page.getByRole('button', { name: 'Hane işlemini onayla', exact: true }).click();
  await page.getByRole('button', { name: 'Davetli olarak dene', exact: true }).click();
  await page.getByRole('button', { name: 'Ev halkı', exact: true }).click();
  await page.getByRole('button', { name: 'Haneyi kapat', exact: true }).click();
  await page.getByRole('button', { name: 'Hane işlemini onayla', exact: true }).click();
  await expect(page.getByText('Yazgan evi', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Hanemi oluştur', exact: true })).toBeVisible();
});
test('iptal edilen davet katılım sağlamaz; eksik miktar kaydedilmez; eski bağlantıdan dönüş çalışır', async ({
  page,
}) => {
  await onboard(page);
  await create(page);
  await page.getByLabel('Ortak ürün adı', { exact: true }).fill('Süt');
  await page.getByLabel('Ortak ürün miktarı', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Ortak listeye ekle', exact: true }).click();
  await expect(page.getByText(/sıfırdan büyük/)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ev halkı', exact: true }).click();
  await page.getByRole('button', { name: 'Davet kodu oluştur', exact: true }).click();
  const code = await page.getByLabel('Oluşturulan davet kodu', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Geçerli daveti iptal et', exact: true }).click();
  await page.getByRole('button', { name: 'Davetli olarak dene', exact: true }).click();
  await page.getByLabel('Davet kodu', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Daveti kontrol et', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Daveti kabul et ve katıl', exact: true }),
  ).toHaveCount(0);
  await page.goto('/eski-bir-sofra-baglantisi');
  await expect(page.getByText('Bu sayfayı bulamadık', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Soframa dön', exact: true }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
});
