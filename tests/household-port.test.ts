import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyBoard } from '../src/domain/household';
const fake = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
  abortSignal: vi.fn(),
}));
vi.mock('../src/integrations/supabase', () => ({
  authMode: 'supabase',
  getSupabase: () => ({ auth: fake, rpc: fake.rpc }),
}));
const actor = '11111111-1111-1111-1111-111111111111';
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('EXPO_PUBLIC_HOUSEHOLD_ENABLED', 'true');
  fake.getUser.mockResolvedValue({ data: { user: { id: actor } }, error: null });
  fake.getSession.mockResolvedValue({ data: { session: { user: { id: actor } } } });
  fake.rpc.mockReturnValue({ abortSignal: fake.abortSignal });
  fake.abortSignal.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe('Hane bağlantısında oturum ve hata sınırı', () => {
  it('kapalı bağlantı ve değişmiş oturum hiçbir RPC göndermez', async () => {
    vi.stubEnv('EXPO_PUBLIC_HOUSEHOLD_ENABLED', 'false');
    const closed = await import('../src/integrations/household');
    await expect(closed.connectedHouseholdPort(actor).load('2026-10-05')).rejects.toThrow(
      'kurulmadı',
    );
    expect(fake.rpc).not.toHaveBeenCalled();
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_HOUSEHOLD_ENABLED', 'true');
    fake.getUser.mockResolvedValue({ data: { user: { id: 'different' } }, error: null });
    const open = await import('../src/integrations/household');
    await expect(open.connectedHouseholdPort(actor).load('2026-10-05')).rejects.toThrow(
      'HOUSEHOLD_AUTH',
    );
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it('yanıt beklenirken değişen hesabın sonucu yeni ekrana verilmez', async () => {
    fake.getSession.mockResolvedValue({ data: { session: { user: { id: 'different' } } } });
    const { connectedHouseholdPort } = await import('../src/integrations/household');
    await expect(connectedHouseholdPort(actor).load('2026-10-05')).rejects.toThrow(
      'HOUSEHOLD_AUTH',
    );
  });
  it('yazı aktör ve beklenen sürümü taşır; çakışmada otomatik tekrar yapılmaz', async () => {
    fake.abortSignal.mockResolvedValue({ data: null, error: { message: 'HOUSEHOLD_CONFLICT' } });
    const { connectedHouseholdPort, householdMessage } =
      await import('../src/integrations/household');
    await expect(
      connectedHouseholdPort(actor).write('house', emptyBoard('2026-10-05')),
    ).rejects.toEqual({ message: 'HOUSEHOLD_CONFLICT' });
    expect(fake.rpc).toHaveBeenCalledOnce();
    expect(fake.rpc).toHaveBeenCalledWith(
      'hh_write',
      expect.objectContaining({ p_actor: actor, p_expected: 0 }),
    );
    expect(householdMessage({ message: 'HOUSEHOLD_CONFLICT' })).toContain('başka bir kişi');
  });
  it('bozuk sunucu verisi hazır hane gibi gösterilmez', async () => {
    fake.abortSignal.mockResolvedValue({ data: { id: 'house', members: [] }, error: null });
    const { connectedHouseholdPort } = await import('../src/integrations/household');
    await expect(connectedHouseholdPort(actor).load('2026-10-05')).rejects.toThrow();
  });
  it('uzayan RPC iptal sinyali alır ve yazı yeniden gönderilmez', async () => {
    vi.useFakeTimers();
    fake.abortSignal.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () =>
            resolve({ data: null, error: { message: 'aborted' } }),
          ),
        ),
    );
    const { connectedHouseholdPort } = await import('../src/integrations/household');
    const result = connectedHouseholdPort(actor)
      .load('2026-10-05')
      .catch((e) => e);
    await vi.advanceTimersByTimeAsync(12001);
    expect(await result).toEqual({ message: 'aborted' });
    expect(fake.rpc).toHaveBeenCalledOnce();
  });
});
