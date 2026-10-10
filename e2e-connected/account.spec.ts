import { expect, test } from '@playwright/test';

test('gerçek hesap modu açılır, oturumsuz bağlantıyı hazırmış gibi göstermez', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/services');
  await page.getByRole('button', { name: 'Bağlantıyı kontrol et', exact: true }).click();
  await expect(page.getByText('Gerçek hesap modu seçili.', { exact: true })).toBeVisible();
  await expect(page.getByText('Gerçek hesap · Bekliyor', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Giriş yaptıktan sonra hesabını sunucuda doğrulayabiliriz.', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/34-canli-hesap-baglantisi.png' });
});

test('giriş gerçek Auth sunucusuna gider ve geçersiz hesabı kabul etmez', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByText(/Demo hesap ·/)).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'E-posta', exact: true })
    .fill('connection-probe@sofra.invalid');
  await page.getByLabel('Şifre', { exact: true }).fill('InvalidConnectionProbe2026!');
  const response = page.waitForResponse(
    (r) =>
      r.url().includes('ndwkiuopnefwreucbyku.supabase.co/auth/v1/token') &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  expect((await response).status()).toBe(400);
  await expect(page.getByRole('alert')).toHaveText('E-posta veya şifre doğru değil.');
});
