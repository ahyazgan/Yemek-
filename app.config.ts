import type { ConfigContext, ExpoConfig } from 'expo/config';
// These values are public build metadata, never server credentials.
export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.EAS_BUILD_PROFILE === 'production';
  const connectedPreview = process.env.EAS_BUILD_PROFILE === 'preview-connected';
  const appId = process.env.SOFRA_APP_ID?.trim();
  const scheme = process.env.SOFRA_APP_SCHEME?.trim();
  const projectId = process.env.SOFRA_EAS_PROJECT_ID?.trim();
  const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (publicKey?.startsWith('sb_secret_'))
    throw new Error(
      'Sunucu gizli anahtarı uygulama paketine eklenemez. Publishable anahtar kullan.',
    );
  if (publicKey?.split('.').length === 3) {
    let role: unknown;
    try {
      role = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString('utf8')).role;
    } catch {
      throw new Error('Supabase public anahtar biçimi doğrulanamadı.');
    }
    if (role !== 'anon')
      throw new Error('Legacy Supabase anahtarı yalnızca anon rolünde olabilir.');
  }
  if (appId && !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(appId))
    throw new Error('SOFRA_APP_ID ters alan adı biçiminde olmalı.');
  if (scheme && !/^[a-z][a-z0-9+.-]*$/.test(scheme))
    throw new Error('SOFRA_APP_SCHEME geçerli bir bağlantı şeması olmalı.');
  if (
    projectId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)
  )
    throw new Error('SOFRA_EAS_PROJECT_ID UUID biçiminde olmalı.');
  if (production || connectedPreview) {
    const required = [
      'SOFRA_APP_NAME',
      'SOFRA_APP_ID',
      'SOFRA_APP_SCHEME',
      'SOFRA_EAS_PROJECT_ID',
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_AUTH_REDIRECT_BASE',
    ];
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length) throw new Error('Canlı derleme ayarları eksik: ' + missing.join(', '));
    if (process.env.EXPO_PUBLIC_AUTH_MODE !== 'supabase')
      throw new Error('Üretim derlemesi demo hesap moduyla açılamaz.');
    const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_BASE!;
    if (!redirect.startsWith(scheme + '://'))
      throw new Error('Native üretim dönüş adresi SOFRA_APP_SCHEME ile aynı olmalı.');
    const backend = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!);
    if (backend.protocol !== 'https:' || backend.username || backend.password)
      throw new Error('Üretim Supabase adresi geçerli HTTPS olmalı.');
  }
  return {
    ...config,
    name: process.env.SOFRA_APP_NAME?.trim() || config.name || 'Sofra · Yazgan',
    slug: config.slug || 'sofra',
    scheme: scheme || config.scheme,
    ios: { ...config.ios, ...(appId ? { bundleIdentifier: appId } : {}) },
    android: { ...config.android, ...(appId ? { package: appId } : {}) },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) },
  };
};
