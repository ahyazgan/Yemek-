import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../app.config';
import { demoEnvironment, profileEnvironment } from '../scripts/build-environment.mjs';
const context = {
  config: { name: 'Sofra', slug: 'sofra' },
  projectRoot: '.',
  staticConfigPath: null,
  packageJsonPath: null,
};
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  for (const key of [
    'EAS_BUILD_PROFILE',
    'SOFRA_BUILD_VARIANT',
    'SOFRA_APP_ID',
    'SOFRA_APP_NAME',
    'SOFRA_APP_SCHEME',
    'SOFRA_EAS_PROJECT_ID',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_AUTH_REDIRECT_BASE',
    'EXPO_PUBLIC_GOOGLE_AUTH_ENABLED',
    'EXPO_PUBLIC_APPLE_AUTH_ENABLED',
    'EXPO_PUBLIC_COMMUNITY_ENABLED',
    'EXPO_PUBLIC_HOUSEHOLD_ENABLED',
    'EXPO_PUBLIC_RECIPE_IMPORT_ENABLED',
  ])
    vi.stubEnv(key, undefined);
  vi.stubEnv('EXPO_PUBLIC_AUTH_MODE', 'demo');
});
describe('Üretim derleme sınırı', () => {
  it('işletim sistemi yedeği ve şifresiz iOS ağ istisnası kapalıdır', () => {
    const result = config(context);
    expect(result.android?.allowBackup).toBe(false);
    expect(result.ios?.infoPlist?.NSAppTransportSecurity).toEqual({
      NSAllowsArbitraryLoads: false,
    });
  });
  it('yerel demo dış hesap olmadan açılır', () => {
    vi.stubEnv('EAS_BUILD_PROFILE', 'preview');
    expect(config(context).name).toBeTruthy();
  });
  it('eksik canlı ayarlar veya demo moduyla üretim üretmez', () => {
    vi.stubEnv('EAS_BUILD_PROFILE', 'production');
    vi.stubEnv('SOFRA_APP_ID', '');
    expect(() => config(context)).toThrow('eksik');
  });
  it('geçersiz paket kimliği reddedilir', () => {
    vi.stubEnv('SOFRA_APP_ID', '../invalid');
    expect(() => config(context)).toThrow('ters alan adı');
  });
  it('gerçek hesaplı pilot da eksik Supabase ve kimlik bilgisiyle üretilemez', () => {
    vi.stubEnv('EAS_BUILD_PROFILE', 'preview-connected');
    vi.stubEnv('SOFRA_APP_ID', '');
    expect(() => config(context)).toThrow('eksik');
  });
  it('tam üretim ayarında demo ve yanlış dönüş şeması reddedilir', () => {
    const values = {
      EAS_BUILD_PROFILE: 'production',
      SOFRA_APP_NAME: 'Sofra test',
      SOFRA_APP_ID: 'com.example.sofratest',
      SOFRA_APP_SCHEME: 'sofra-test',
      SOFRA_EAS_PROJECT_ID: '00000000-0000-4000-8000-000000000001',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      EXPO_PUBLIC_AUTH_REDIRECT_BASE: 'sofra-test://',
      EXPO_PUBLIC_AUTH_MODE: 'demo',
    };
    for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
    expect(() => config(context)).toThrow('demo');
    vi.stubEnv('EXPO_PUBLIC_AUTH_MODE', 'supabase');
    expect(config(context).ios?.bundleIdentifier).toBe('com.example.sofratest');
    vi.stubEnv('EXPO_PUBLIC_AUTH_REDIRECT_BASE', 'https://example.test');
    expect(() => config(context)).toThrow('dönüş adresi');
  });
  it('sunucu gizli anahtarı ve service_role pakete gömülemez', () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_secret_test');
    expect(() => config(context)).toThrow('Sunucu gizli');
    vi.stubEnv(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'header.' +
        Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') +
        '.signature',
    );
    expect(() => config(context)).toThrow('anon');
  });
  it('demo kimliği son marka seçilmeden canlı uygulamadan ayrı kurulur', () => {
    vi.stubEnv('SOFRA_BUILD_VARIANT', 'demo');
    vi.stubEnv('SOFRA_APP_ID', 'com.company.live');
    const result = config(context);
    expect(result.android?.package).toBe('com.yazgan.sofra.preview');
    expect(result.ios?.bundleIdentifier).toBe('com.yazgan.sofra.preview');
    expect(result.name).toBe('Sofra Deneme');
    expect(result.scheme).toBe('yazgan-sofra-demo');
  });
  it('demo dış hizmeti veya gerçek bağlantıyı yanlışlıkla açamaz', () => {
    vi.stubEnv('EAS_BUILD_PROFILE', 'preview');
    vi.stubEnv('EXPO_PUBLIC_AUTH_MODE', 'supabase');
    expect(() => config(context)).toThrow('demo hesap');
    vi.stubEnv('EXPO_PUBLIC_AUTH_MODE', 'demo');
    vi.stubEnv('EXPO_PUBLIC_HOUSEHOLD_ENABLED', 'true');
    expect(() => config(context)).toThrow('bayrakları');
    vi.stubEnv('EXPO_PUBLIC_HOUSEHOLD_ENABLED', 'false');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    expect(() => config(context)).toThrow('canlı bağlantı');
  });
  it('canlı profilde demo kimliği reddedilir', () => {
    vi.stubEnv('EAS_BUILD_PROFILE', 'production');
    vi.stubEnv('SOFRA_BUILD_VARIANT', 'demo');
    expect(() => config(context)).toThrow('demo uygulama kimliği');
  });
  it('demo export geliştirici makinesindeki dış hizmet ayarlarını taşımaz', () => {
    const source = {
      PATH: 'test-path',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_AUTH_MODE: 'supabase',
      EXPO_PUBLIC_HOUSEHOLD_ENABLED: 'true',
      EXPO_PUBLIC_FUTURE_SERVICE: 'private-configuration',
    };
    const result = demoEnvironment(source);
    expect(result.EXPO_PUBLIC_AUTH_MODE).toBe('demo');
    expect(result.EXPO_PUBLIC_HOUSEHOLD_ENABLED).toBe('false');
    expect(result.EXPO_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(result.EXPO_PUBLIC_FUTURE_SERVICE).toBeUndefined();
    expect(result.EXPO_NO_DOTENV).toBe('1');
    expect(result.PATH).toBe('test-path');
    expect(source.EXPO_PUBLIC_AUTH_MODE).toBe('supabase');
  });
  it('simülatör güvenli demo ayarlarını devralır; canlı pilot ayrı kalır', () => {
    expect(profileEnvironment('preview-simulator')).toEqual(profileEnvironment('preview'));
    expect(profileEnvironment('preview-connected')).toMatchObject({
      EXPO_PUBLIC_AUTH_MODE: 'supabase',
      SOFRA_BUILD_VARIANT: 'pilot',
      EXPO_PUBLIC_HOUSEHOLD_ENABLED: 'false',
    });
    expect(() => profileEnvironment('unknown')).toThrow();
  });
});
