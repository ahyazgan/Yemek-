import { expect, test, Page } from '@playwright/test';

// Every Auth request is intercepted: no real account is created or email sent.
async function fakeAuth(page: Page, status = 200, body: unknown = {}) {
  const requests: { path: string; query: URLSearchParams; body: Record<string, unknown> }[] = [];
  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({
      path: url.pathname,
      query: url.searchParams,
      body: request.postDataJSON() ?? {},
    });
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'x-supabase-api-version': '2024-01-01',
        'access-control-expose-headers': 'x-supabase-api-version',
      },
      json: body,
    });
  });
  return requests;
}

test('yeniden doğrulama: PKCE, doğru dönüş adresi, bekleme ve adres düzeltme', async ({ page }) => {
  const requests = await fakeAuth(page);
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Doğrulama e-postası gelmedi', exact: true }).click();
  await expect(page.getByText('Doğrulama bağlantın', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/35-dogrulama-baglantisi.png' });
  await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill(' TEST@sofra.invalid ');
  await page.getByRole('button', { name: 'Doğrulama bağlantısı iste', exact: true }).click();
  await expect(page.getByText('Doğrulama adımı', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tekrar göndermek için/ })).toBeDisabled();
  expect(requests).toHaveLength(1);
  expect(requests[0].path).toBe('/auth/v1/resend');
  expect(requests[0].body).toMatchObject({
    type: 'signup',
    email: 'test@sofra.invalid',
    code_challenge_method: 's256',
  });
  expect(String(requests[0].body.code_challenge)).toHaveLength(43);
  expect(requests[0].query.get('redirect_to')).toBe('http://127.0.0.1:8181/auth/callback');
  await page.clock.fastForward(61_000);
  await page.getByRole('button', { name: 'Bağlantıyı tekrar iste', exact: true }).click();
  await expect(page.getByText(/İstek alındı/)).toBeVisible();
  expect(requests).toHaveLength(2);
  await page.getByRole('button', { name: 'E-posta adresini düzelt', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'E-posta', exact: true })).toHaveValue(
    'TEST@sofra.invalid',
  );
  await expect(
    page.getByRole('button', { name: 'Doğrulama bağlantısı iste', exact: true }),
  ).toBeDisabled();
});

test('şifre bağlantısı yeniden istenir; hiçbir kullanıcı varlığı iddia edilmez', async ({
  page,
}) => {
  const requests = await fakeAuth(page);
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/forgot-password');
  await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill('reset@sofra.invalid');
  await page.getByRole('button', { name: 'Yenileme bağlantısı iste', exact: true }).click();
  await expect(page.getByText(/Bu adres için uygun bir hesap varsa/)).toBeVisible();
  expect(requests[0].path).toBe('/auth/v1/recover');
  expect(requests[0].query.get('redirect_to')).toBe('http://127.0.0.1:8181/reset-password');
  await page.clock.fastForward(61_000);
  await page.getByRole('button', { name: 'Bağlantıyı tekrar iste', exact: true }).click();
  await expect(page.getByText(/İstek alındı/)).toBeVisible();
  expect(requests.map((r) => r.path)).toEqual(['/auth/v1/recover', '/auth/v1/recover']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('kayıttan sonra parolalar temizlenir ve ekran değişimi bekleme süresini sıfırlamaz', async ({
  page,
}) => {
  const requests = await fakeAuth(page, 200, {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'signup@sofra.invalid',
    identities: [],
  });
  await page.goto('/sign-up');
  await page.getByRole('textbox', { name: 'Adın', exact: true }).fill('Test Sofrası');
  await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill('signup@sofra.invalid');
  await page.getByLabel('Şifre', { exact: true }).fill('LocalTestOnly2026!');
  await page.getByLabel('Şifre tekrar', { exact: true }).fill('LocalTestOnly2026!');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(page.getByText('Doğrulama adımı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'E-posta adresini düzelt', exact: true }).click();
  await expect(page.getByLabel('Şifre', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Zaten hesabım var', exact: true }).click();
  await page.getByRole('button', { name: 'Doğrulama e-postası gelmedi', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Doğrulama bağlantısı iste', exact: true }),
  ).toBeDisabled();
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => Object.values(localStorage).join(' '))).not.toContain(
    'LocalTestOnly2026!',
  );
});

for (const [code, message] of [
  [
    'email_address_not_authorized',
    'E-posta gönderimi henüz kullanıma hazır değil. Şimdilik misafir olarak devam edebilirsin.',
  ],
  ['over_email_send_rate_limit', 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.'],
] as const) {
  test(`gönderim hatası başarı olarak gösterilmez: ${code}`, async ({ page }) => {
    const requests = await fakeAuth(page, code === 'over_email_send_rate_limit' ? 429 : 403, {
      code,
      msg: 'private server details',
    });
    await page.goto('/verify-email');
    await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill('test@sofra.invalid');
    await page.getByRole('button', { name: 'Doğrulama bağlantısı iste', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(message);
    await expect(page.getByText('Doğrulama adımı', { exact: true })).toHaveCount(0);
    expect(requests).toHaveLength(1);
    await expect(
      page.getByRole('button', { name: 'Doğrulama bağlantısı iste', exact: true }),
    ).toBeDisabled();
  });
}

test('süresi dolan hash bağlantısı ve kodsuz şifre ekranı güvenli dönüş sunar', async ({
  page,
}) => {
  const requests = await fakeAuth(page);
  await page.goto(
    '/auth/callback#error=access_denied&error_code=otp_expired&error_description=private-secret',
  );
  await expect(page.getByRole('alert')).toHaveText(
    'Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.',
  );
  await expect(page.getByText('private-secret')).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/36-gecersiz-baglanti.png' });
  await page.getByRole('button', { name: 'Yeni doğrulama bağlantısı iste', exact: true }).click();
  await expect(page.getByText('Doğrulama bağlantın', { exact: true })).toBeVisible();
  await page.goto('/reset-password');
  await expect(page.getByLabel('Yeni şifre', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Yeni şifre yenileme bağlantısı iste', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Yenileme bağlantısı iste', exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
});

test('başka tarayıcıdan gelen kod, doğrulandı denmeden yeni bağlantıya yönlendirir', async ({
  page,
}) => {
  const requests = await fakeAuth(page);
  await page.goto('/auth/callback?code=unusable-local-test-code');
  await expect(page.getByRole('alert')).toContainText(
    'işlemi başlattığın uygulamada veya tarayıcıda aç',
  );
  await expect(page.getByText('E-posta doğrulandı', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Yeni doğrulama bağlantısı iste', exact: true }),
  ).toBeEnabled();
  expect(requests).toHaveLength(0);
});
