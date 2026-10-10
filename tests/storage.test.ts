import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../src/domain/state';
import { createRepository, STORAGE_KEY } from '../src/storage/repository';
describe('Yerel kayıt', () => {
  it('yoksa başlangıç durumunu yükler', async () => {
    const repo = createRepository({ getItem: async () => null, setItem: async () => {} });
    expect((await repo.load()).profile).toBeNull();
  });
  it('kayıt yeniden açılınca geri gelir', async () => {
    let raw: string | null = null;
    const driver = {
      getItem: async () => raw,
      setItem: async (_: string, s: string) => {
        raw = s;
      },
    };
    const state = initialState();
    state.profile = { people: 3, diets: ['vegetarian'], budget: 'economic' };
    await createRepository(driver).save(state);
    expect((await createRepository(driver).load()).profile?.people).toBe(3);
  });
  it('bozuk JSON üzerine otomatik yazmaz', async () => {
    const write = vi.fn();
    const repo = createRepository({ getItem: async () => '{bozuk', setItem: write });
    await expect(repo.load()).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
  });
  it('depolama okuma/yazma hatasını çağırana bildirir', async () => {
    const repo = createRepository({
      getItem: async () => {
        throw new Error('erişim');
      },
      setItem: async () => {
        throw new Error('dolu');
      },
    });
    await expect(repo.load()).rejects.toThrow('erişim');
    await expect(repo.save(initialState())).rejects.toThrow('dolu');
  });
  it('hızlı kayıtları sırayla tamamlar; eski veri yenisini ezmez', async () => {
    const writes: string[] = [];
    const repo = createRepository({
      getItem: async () => null,
      setItem: async (key, raw) => {
        expect(key).toBe(STORAGE_KEY);
        await new Promise((resolve) => setTimeout(resolve, 5));
        writes.push(raw);
      },
    });
    const first = initialState();
    const second = { ...first, profile: { people: 5, diets: [], budget: 'balanced' as const } };
    await Promise.all([repo.save(first), repo.save(second)]);
    expect(JSON.parse(writes[1]).profile.people).toBe(5);
  });
  it('başarısız kayıttan sonra tekrar deneme çalışır', async () => {
    let attempts = 0;
    const repo = createRepository({
      getItem: async () => null,
      setItem: async () => {
        if (++attempts === 1) throw new Error('geçici');
      },
    });
    await expect(repo.save(initialState())).rejects.toThrow();
    await expect(repo.save(initialState())).resolves.toBeUndefined();
  });
});
