import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../app.config';
const context = {
  config: { name: 'Sofra', slug: 'sofra' },
  projectRoot: '.',
  staticConfigPath: null,
  packageJsonPath: null,
};
afterEach(() => vi.unstubAllEnvs());
describe('Üretim derleme sınırı', () => {
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
});
