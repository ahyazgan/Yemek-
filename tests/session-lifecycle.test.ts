import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeNativeRefresh, observeSession } from '../src/auth/sessionLifecycle';

function fixture() {
  let event = (_event: string, _session: string | null) => {};
  let resolve!: (value: { session: string | null; error: unknown }) => void;
  const promise = new Promise<{ session: string | null; error: unknown }>((r) => {
    resolve = r;
  });
  const unsubscribe = vi.fn();
  const callbacks = { session: vi.fn(), ready: vi.fn(), error: vi.fn() };
  const stop = observeSession<string>(
    {
      subscribe: (listener) => {
        event = listener;
        return unsubscribe;
      },
      read: () => promise,
    },
    callbacks,
  );
  return {
    event: (name: string, session: string | null) => event(name, session),
    resolve,
    stop,
    callbacks,
    unsubscribe,
  };
}
afterEach(() => vi.useRealTimers());
describe('Hesap açılışı ve güncel oturum', () => {
  it.each([
    ['SIGNED_OUT', null],
    ['SIGNED_IN', 'new-account'],
    ['PASSWORD_RECOVERY', 'recovery'],
  ])('%s olayı geciken eski kopyadan önceliklidir', async (event, session) => {
    vi.useFakeTimers();
    const f = fixture();
    f.event(event!, session);
    f.resolve({ session: 'old-account', error: null });
    await vi.runAllTimersAsync();
    expect(f.callbacks.session.mock.calls).toEqual([[event, session]]);
    expect(f.callbacks.ready).toHaveBeenCalledOnce();
    expect(f.callbacks.error).not.toHaveBeenCalled();
    f.stop();
  });
  it('olay yoksa saklı oturumu bir kez yükler ve zamanlayıcıyı temizler', async () => {
    vi.useFakeTimers();
    const f = fixture();
    f.resolve({ session: 'account', error: null });
    await vi.runAllTimersAsync();
    expect(f.callbacks.session).toHaveBeenCalledWith('BOOTSTRAP', 'account');
    expect(f.callbacks.error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    f.stop();
  });
  it('bekleme sınırından sonra ekran açılır; sonraki gerçek olay hâlâ alınır', async () => {
    vi.useFakeTimers();
    const f = fixture();
    await vi.advanceTimersByTimeAsync(12000);
    expect(f.callbacks.ready).toHaveBeenCalledOnce();
    expect(f.callbacks.error).toHaveBeenCalledOnce();
    f.resolve({ session: 'late-copy', error: null });
    await vi.runAllTimersAsync();
    expect(f.callbacks.session).not.toHaveBeenCalled();
    f.event('SIGNED_IN', 'fresh');
    expect(f.callbacks.session).toHaveBeenCalledWith('SIGNED_IN', 'fresh');
    f.stop();
  });
  it('kapanan gözlemci geç yanıtı ve yeni olayı uygulamaz', async () => {
    vi.useFakeTimers();
    const f = fixture();
    f.stop();
    f.event('SIGNED_IN', 'other');
    f.resolve({ session: 'old', error: null });
    await vi.runAllTimersAsync();
    expect(f.callbacks.session).not.toHaveBeenCalled();
    expect(f.callbacks.ready).not.toHaveBeenCalled();
    expect(f.unsubscribe).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('yükleme hatası ekranı kilitlemez', async () => {
    vi.useFakeTimers();
    const f = fixture();
    f.resolve({ session: null, error: new Error('storage failed') });
    await vi.runAllTimersAsync();
    expect(f.callbacks.error).toHaveBeenCalledOnce();
    expect(f.callbacks.ready).toHaveBeenCalledOnce();
    f.stop();
  });
});
describe('Telefon ve tarayıcıda yenileme', () => {
  it('web görünürlük yönetimini Supabase üzerinde bırakır', () => {
    const visibility = { currentState: 'active', subscribe: vi.fn() };
    const refresh = { start: vi.fn(), stop: vi.fn() };
    observeNativeRefresh('web', visibility, refresh, vi.fn())();
    expect(visibility.subscribe).not.toHaveBeenCalled();
    expect(refresh.start).not.toHaveBeenCalled();
    expect(refresh.stop).not.toHaveBeenCalled();
  });
  it('arka planda açılan telefonda durur, öne gelince başlar, kapanınca temizlenir', () => {
    let change = (_state: string) => {};
    const remove = vi.fn();
    const refresh = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const cleanup = observeNativeRefresh(
      'android',
      {
        currentState: 'background',
        subscribe: (listener) => {
          change = listener;
          return remove;
        },
      },
      refresh,
      vi.fn(),
    );
    expect(refresh.stop).toHaveBeenCalledOnce();
    change('active');
    expect(refresh.start).toHaveBeenCalledOnce();
    change('inactive');
    cleanup();
    expect(refresh.stop).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenCalledOnce();
  });
});
