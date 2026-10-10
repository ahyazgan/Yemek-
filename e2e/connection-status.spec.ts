import { expect, test } from '@playwright/test';

test('bağlantı kontrolü demoda dürüst durum ve yedek yolunu gösterir', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/supabase\.(co|com)/.test(request.url())) external.push(request.url());
  });
  await page.goto('/services');
  await page.getByRole('button', { name: 'Bağlantıyı kontrol et', exact: true }).click();
  await expect(page.getByText('Gerçek hesap · Bekliyor', { exact: true })).toBeVisible();
  await expect(page.getByText('Bulut yedeği · Bekliyor', { exact: true })).toBeVisible();
  expect(external).toEqual([]);
  await page.getByRole('button', { name: 'Dosyayla yedekle', exact: true }).click();
  await expect(page).toHaveURL(/\/backups$/);
});

test('dar telefon bağlantı sonuçları taşmadan okunur; yenilenince eski onay kalmaz', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/services');
  await page.getByRole('button', { name: 'Bağlantıyı kontrol et', exact: true }).click();
  await expect(page.getByText('Bulut yedeği · Bekliyor', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/33-baglanti-kontrolu.png' });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Bağlantıyı kontrol et', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Bulut yedeği · Bekliyor', { exact: true })).toHaveCount(0);
});
