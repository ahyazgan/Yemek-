import { expect, test } from '@playwright/test';

test('demo doğrulama isteği dış hizmete gitmez ve hesap açıldığını iddia etmez', async ({
  page,
}) => {
  const authRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/')) authRequests.push(request.url());
  });
  await page.goto('/verify-email');
  await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill('demo@sofra.test');
  await page.getByRole('button', { name: 'Doğrulama bağlantısı iste', exact: true }).click();
  await expect(
    page.getByText('Bu bir ekran önizlemesidir. Gerçek e-posta veya şifre değişikliği yapılmadı.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Tekrar göndermek için/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Hesabıma git', exact: true }).click();
  await expect(page.getByText('Misafir olarak kullanıyorsun', { exact: true })).toBeVisible();
  expect(authRequests).toEqual([]);
});
