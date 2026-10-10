export function oauthCallbackCode(value: string, redirect: string) {
  const actual = new URL(value),
    expected = new URL(redirect);
  if (
    actual.protocol !== expected.protocol ||
    actual.host !== expected.host ||
    actual.pathname !== expected.pathname ||
    actual.username ||
    actual.password
  )
    throw new Error('Sofra:Giriş dönüş adresi doğrulanamadı.');
  if (actual.searchParams.has('error'))
    throw new Error('Sofra:Sosyal giriş tamamlanamadı. Tekrar deneyebilirsin.');
  const code = actual.searchParams.get('code');
  if (!code || code.length > 2048) throw new Error('Sofra:Giriş doğrulama kodu bulunamadı.');
  return code;
}
