import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../src/domain/state';
const fake = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  abortSignal: vi.fn(),
  then: vi.fn(),
  result: vi.fn(),
}));
vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => ({}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: fake, rpc: fake.rpc, from: fake.from }),
}));
const actor = 'account-a';
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('EXPO_PUBLIC_AUTH_MODE', 'supabase');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_example');
  fake.getUser.mockResolvedValue({ data: { user: { id: actor } }, error: null });
  fake.getSession.mockResolvedValue({ data: { session: { user: { id: actor } } }, error: null });
  for (const method of ['rpc', 'from', 'select', 'eq', 'limit', 'single', 'maybeSingle'] as const)
    fake[method].mockReturnValue(fake);
  fake.abortSignal.mockReturnValue(fake);
  fake.then.mockImplementation((resolve, reject) => fake.result().then(resolve, reject));
  fake.result.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe('Bulut kopyasının hesap ve bekleme sınırı', () => {
  it('doğrulanmayan hesap yazı gönderemez', async () => {
    fake.getUser.mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null });
    const api = await import('../src/integrations/supabase');
    await expect(api.writeCloudSnapshot(actor, initialState(), 0)).rejects.toThrow('oturumu');
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it('bekleme süresi dolduktan sonra gelen doğrulama yazı başlatamaz', async () => {
    vi.useFakeTimers();
    let resolve!: (value: unknown) => void;
    fake.getUser.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const api = await import('../src/integrations/supabase');
    const result = api.writeCloudSnapshot(actor, initialState(), 0).catch((e) => e);
    await vi.advanceTimersByTimeAsync(12001);
    expect((await result).message).toContain('ulaşmış olabilir');
    resolve({ data: { user: { id: actor } }, error: null });
    await vi.runAllTimersAsync();
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it('sunucu yazısı sürerken zaman aşımı olursa iptal sinyali gönderir, tekrar yazmaz', async () => {
    vi.useFakeTimers();
    fake.result.mockImplementation(() => new Promise(() => {}));
    const api = await import('../src/integrations/supabase');
    const result = api.writeCloudSnapshot(actor, initialState(), 4).catch((e) => e);
    await vi.advanceTimersByTimeAsync(12001);
    expect((await result).message).toContain('güncel kopya');
    expect(fake.abortSignal.mock.calls[0][0].aborted).toBe(true);
    expect(fake.rpc).toHaveBeenCalledOnce();
    expect(fake.rpc).toHaveBeenCalledWith(
      'save_app_snapshot',
      expect.objectContaining({
        expected_owner: actor,
        expected_revision: 4,
      }),
    );
  });
  it('beklerken değişen hesabın okuma sonucu yeni hesaba sunulmaz', async () => {
    fake.getSession
      .mockResolvedValueOnce({ data: { session: { user: { id: actor } } }, error: null })
      .mockResolvedValueOnce({ data: { session: { user: { id: 'account-b' } } }, error: null });
    const api = await import('../src/integrations/supabase');
    await expect(api.readCloudSnapshot(actor)).rejects.toThrow('Hesap değişti');
  });
  it('sürüm çakışması korunur ve yazı tekrarlanmaz', async () => {
    fake.result.mockResolvedValue({ data: null, error: { code: '40001' } });
    const api = await import('../src/integrations/supabase');
    await expect(api.writeCloudSnapshot(actor, initialState(), 2)).rejects.toThrow(
      'Başka bir cihaz',
    );
    expect(fake.rpc).toHaveBeenCalledOnce();
  });
  it('geçerli sunucu sürümünü döndürür ve zamanlayıcıyı bırakmaz', async () => {
    vi.useFakeTimers();
    fake.result.mockResolvedValue({
      data: { revision: 3, updated_at: '2026-10-10T12:00:00Z' },
      error: null,
    });
    const api = await import('../src/integrations/supabase');
    const result = await api.writeCloudSnapshot(actor, initialState(), 2);
    expect(result.revision).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe('Bağlantı kontrolü yalnızca okur', () => {
  it('demo hiçbir dış istek göndermez', async () => {
    vi.stubEnv('EXPO_PUBLIC_AUTH_MODE', 'demo');
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    const result = await checkAccountConnection();
    expect(result.every((r) => r.status === 'waiting')).toBe(true);
    expect(fake.getUser).not.toHaveBeenCalled();
    expect(fake.from).not.toHaveBeenCalled();
  });
  it('eksik ayarı çalışıyor gibi göstermez', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', '');
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    expect((await checkAccountConnection())[0].status).toBe('error');
    expect(fake.from).not.toHaveBeenCalled();
  });
  it('giriş yapmamış kullanıcıdan yedek istemez', async () => {
    fake.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    expect((await checkAccountConnection())[1].status).toBe('waiting');
    expect(fake.getUser).not.toHaveBeenCalled();
    expect(fake.from).not.toHaveBeenCalled();
  });
  it('yalnızca kendi yedek tablosuna boş HEAD isteği gönderir; payload almaz', async () => {
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    expect((await checkAccountConnection()).every((r) => r.status === 'ok')).toBe(true);
    expect(fake.select).toHaveBeenCalledWith('owner_id,revision,updated_at', { head: true });
    expect(fake.eq).toHaveBeenCalledWith('owner_id', actor);
    expect(fake.limit).toHaveBeenCalledWith(0);
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it('tablo/yetki hatasını yedek hazır olarak sunmaz, ham hata veya anahtar göstermez', async () => {
    fake.result.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'secret sample' },
    });
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    const result = await checkAccountConnection();
    expect(result[2].status).toBe('error');
    expect(JSON.stringify(result)).not.toContain('secret sample');
  });
  it('doğrulama uzarsa hata sonucu gelir ve veritabanına ilerlemez', async () => {
    vi.useFakeTimers();
    fake.getUser.mockImplementation(() => new Promise(() => {}));
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    const result = checkAccountConnection();
    await vi.advanceTimersByTimeAsync(12001);
    expect((await result)[1].status).toBe('error');
    expect(fake.from).not.toHaveBeenCalled();
  });
  it('ekran kapatılınca kontrol kesilir ve sonraki isteğe geçmez', async () => {
    fake.getUser.mockImplementation(() => new Promise(() => {}));
    const { checkAccountConnection } = await import('../src/integrations/connectionCheck');
    const controller = new AbortController();
    const result = checkAccountConnection(controller.signal).catch((e) => e);
    controller.abort();
    expect((await result).message).toContain('durduruldu');
    expect(fake.from).not.toHaveBeenCalled();
  });
});
