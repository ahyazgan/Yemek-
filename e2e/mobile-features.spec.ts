import { expect, Page, test } from '@playwright/test';
const guestKey = '@yazgan/sofra/offline/v1';
const demoKey = '@yazgan/sofra/demo/demo/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
test('hesap: kayıt, doğrulama, profil, çıkış, tekrar giriş ve silme', async ({ page }) => {
  await onboard(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Favorilerime ekle', exact: true }).click();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await page.getByRole('textbox', { name: 'Adın', exact: true }).fill('Deneme Sofrası');
  await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill('test@sofra.test');
  await page.getByLabel('Şifre', { exact: true }).fill('OrnekSifre123');
  await page.getByLabel('Şifre tekrar', { exact: true }).fill('Farkli123');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Şifreler aynı olmalı.');
  await page.getByLabel('Şifre tekrar', { exact: true }).fill('OrnekSifre123');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(page.getByText('Doğrulama adımı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Demo doğrulamasını tamamla', exact: true }).click();
  await expect(page.getByText('test@sofra.test', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Görünen ad', exact: true }).fill('Yeni Adım');
  await page.getByRole('button', { name: 'Profilimi kaydet', exact: true }).click();
  await expect(page.getByText('Profilin güncellendi.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/11-hesap.png' });
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.favorites, demoKey),
  ).toEqual([]);
  const stored = await page.evaluate(() => Object.values(localStorage).join(' '));
  expect(stored).not.toContain('OrnekSifre123');
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.getByText('Misafir olarak kullanıyorsun', { exact: true })).toBeVisible();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.favorites, guestKey),
  ).toEqual(['mercimek']);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/12-giris.png' });
  await page.getByRole('button', { name: 'Örnek bilgileri doldur', exact: true }).click();
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByText('demo@sofra.test', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Çıkış yap', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hesabımı sil', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Hesabı ve verilerini kalıcı sil' }),
  ).toBeDisabled();
  await page.getByRole('textbox', { name: 'Silme onayı' }).fill('SİL');
  await page.getByRole('button', { name: 'Hesabı ve verilerini kalıcı sil' }).click();
  await expect(page.getByText('Misafir olarak kullanıyorsun', { exact: true })).toBeVisible();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.favorites, guestKey),
  ).toEqual(['mercimek']);
});
test('şifre yenileme demo akışı gerçek şifre veya e-posta saklamaz', async ({ page }) => {
  await onboard(page);
  await page.goto('/forgot-password');
  await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill('demo@sofra.test');
  await page.getByRole('button', { name: 'Yenileme bağlantısı iste' }).click();
  await page.getByRole('button', { name: 'Demo şifre yenileme ekranını aç' }).click();
  await page.getByLabel('Yeni şifre', { exact: true }).fill('YeniDemo123');
  await page.getByLabel('Şifre tekrar', { exact: true }).fill('YeniDemo123');
  await page.getByRole('button', { name: 'Yeni şifreyi kaydet' }).click();
  await expect(page.getByText('Şifre adımı tamamlandı', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.values(localStorage).join(' '))).not.toContain(
    'YeniDemo123',
  );
});
test('favoriler, pişirme sayacı, puan ve geçmiş yeniden açılınca korunur', async ({ page }) => {
  await onboard(page);
  await page.goto('/recipe/mercimek');
  await page.getByRole('button', { name: 'Favorilerime ekle', exact: true }).click();
  await page.goto('/favorites');
  await page
    .getByRole('button', { name: 'Kırmızı mercimek çorbası tarifini aç', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pişirmeye başla' }).click();
  await page.getByRole('button', { name: '1 dakika', exact: true }).click();
  await page.getByRole('button', { name: 'Sayacı başlat' }).click();
  await expect(page.getByRole('button', { name: 'Sayacı duraklat' })).toBeVisible();
  await page.getByRole('button', { name: 'Sayacı duraklat' }).click();
  await page.screenshot({ path: 'docs/screenshots/13-pisirme.png' });
  while (await page.getByRole('button', { name: 'Sonraki adım' }).count())
    await page.getByRole('button', { name: 'Sonraki adım' }).click();
  await page.getByRole('button', { name: '5 yıldız', exact: true }).click();
  await page.getByRole('textbox', { name: 'Bir sonraki sefere notum' }).fill('Biraz daha limon.');
  await page.getByRole('button', { name: 'Pişirdim, kaydet' }).click();
  await page.getByRole('button', { name: 'Pişirdiklerimi gör' }).click();
  await page.reload();
  await expect(page.getByText('Biraz daha limon.', { exact: true })).toBeVisible();
});
test('ek ürün, kayıtlı liste kopyası ve paylaşım metni', async ({ page }) => {
  await onboard(page);
  await page.goto('/list');
  await page.getByRole('button', { name: 'Ek ürün ekle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Ek ürün adı', exact: true }).fill('Kahve');
  await page.getByRole('textbox', { name: 'Ek ürün miktarı', exact: true }).fill('2');
  await page.getByRole('button', { name: 'paket', exact: true }).click();
  await page.getByRole('button', { name: 'Ek ürünü kaydet', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Kahve, 2 paket', exact: true }).click();
  await page.getByRole('button', { name: 'Listeyi paylaş', exact: true }).click();
  await expect(page.getByLabel('Paylaşılacak metin', { exact: true })).toHaveValue(
    /✓ Kahve · 2 paket/,
  );
  await page.getByRole('button', { name: 'Bu listeyi sakla', exact: true }).click();
  await page.getByRole('textbox', { name: 'Liste adı', exact: true }).fill('Kahve listem');
  await page.getByRole('button', { name: 'Listeyi kaydet', exact: true }).click();
  await page.getByRole('button', { name: 'Kahve ek ürününü çıkar', exact: true }).click();
  await page.getByRole('button', { name: 'Kayıtlı', exact: true }).click();
  await page.getByRole('button', { name: 'Kahve listem listesini aç' }).click();
  await expect(page.getByRole('checkbox', { name: 'Kahve, 2 paket', exact: true })).toBeChecked();
});
test('yeni tarif, malzeme ve pişirme adımı oluşturulur', async ({ page }) => {
  await onboard(page);
  await page.goto('/new-recipe');
  await page.getByRole('textbox', { name: 'Tarif adı', exact: true }).fill('Ev usulü pilav');
  await page
    .getByRole('textbox', { name: 'Kısa açıklama', exact: true })
    .fill('Sade bir ev pilavı.');
  await page.getByRole('textbox', { name: 'Tarife malzeme ekle', exact: true }).fill('pirinç');
  await page.getByRole('button', { name: '+ Pirinç', exact: true }).click();
  await page.getByRole('textbox', { name: 'Pirinç (g)', exact: true }).fill('200');
  await page
    .getByRole('textbox', { name: 'Yapılışı (her satır ayrı bir adım)', exact: true })
    .fill('Pirinci yıka.\nUygun miktarda su ile pişir.');
  await page.getByRole('button', { name: 'Yeni tarifi kaydet', exact: true }).click();
  await expect(page.getByText('Ev usulü pilav', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ev usulü pilav', { exact: true })).toBeVisible();
  await page.goto('/my-recipes');
  await expect(
    page.getByRole('button', { name: 'Ev usulü pilav tarifini aç', exact: true }),
  ).toBeVisible();
});
test('kişisel tercihler ve bildirim taslağı kaydolur, servisler açıkmış gibi görünmez', async ({
  page,
}) => {
  await onboard(page);
  await page.goto('/taste');
  await page.getByRole('button', { name: '20 dk', exact: true }).click();
  await page.getByRole('textbox', { name: 'İstemediğin malzemeyi ara' }).fill('yumurta');
  await page.getByRole('button', { name: 'Yumurta (kabuksuz)', exact: true }).click();
  await page.goto('/');
  await expect(
    page
      .getByTestId('recipe-grid')
      .getByRole('button', { name: 'Tavada menemen, 20 dakika', exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId('recipe-grid')
      .getByRole('button', { name: 'Domates soslu makarna, 20 dakika', exact: true }),
  ).toBeVisible();
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Hatırlatma isteği kapalı' }).click();
  await page.getByRole('textbox', { name: 'Saat (SS:DD)' }).fill('19:30');
  await page.getByRole('button', { name: 'Hatırlatma tercihini kaydet' }).click();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Saat (SS:DD)' })).toHaveValue('19:30');
  await page.goto('/services');
  await expect(page.getByText('Üyelik ve ödeme', { exact: true })).toBeVisible();
});
