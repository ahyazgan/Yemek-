import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { parseState, extraSchema } from '../src/storage/schema';
import { matchesExperience, shoppingText, timerRemaining } from '../src/domain/experience';
import { suggestDinners } from '../src/domain/planning';
import { accountStorageKey, credentialsSchema, signUpSchema } from '../src/auth/contracts';
import { createRepository } from '../src/storage/repository';
import { notifications, socialAuth } from '../src/integrations/services';
describe('Mobil özellikler', () => {
  it('eski kayıtları yeni alanlarla veri kaybetmeden yükler', () => {
    const old = initialState();
    old.profile = { people: 3, diets: [], budget: 'balanced' };
    const { experience: _, ...legacy } = old;
    const restored = parseState(legacy);
    expect(restored.experience.favorites).toEqual([]);
    expect(restored.profile).toEqual(old.profile);
    expect(restored.recipes).toEqual(old.recipes);
  });
  it('favori ekleme ve çıkarma kalıcı biçimde doğrulanır', () => {
    const state = reducer(initialState(), { type: 'favorite', id: 'mercimek' });
    expect(parseState(state).experience.favorites).toEqual(['mercimek']);
    expect(reducer(state, { type: 'favorite', id: 'mercimek' }).experience.favorites).toEqual([]);
  });
  it('süre ve istenmeyen malzemeler önerilerde asla gevşetilmez', () => {
    const state = initialState();
    // Deliberately small pool tests missing slots without relaxing the filters.
    state.recipes = state.recipes.filter((r) =>
      ['mercimek', 'menemen', 'nohut', 'tavuk', 'cilbir'].includes(r.id),
    );
    state.profile = { people: 2, diets: [], budget: 'balanced' };
    state.experience.maxMinutes = 30;
    state.experience.excludedIngredients = ['onion'];
    const suggestions = suggestDinners(state, '2026-10-05', 7);
    for (const meal of suggestions.suggestions)
      expect(
        matchesExperience(
          state.recipes.find((r) => r.id === meal.recipeId)!,
          state.experience,
        ),
      ).toBe(true);
    expect(suggestions.missingCount).toBeGreaterThan(0);
  });
  it('tüm malzemeler elenirse boş öneri döner', () => {
    const state = initialState();
    state.profile = { people: 2, diets: [], budget: 'balanced' };
    state.experience.excludedIngredients = [
      ...new Set(state.recipes.flatMap((r) => r.ingredients.map((i) => i.ingredientId))),
    ];
    expect(suggestDinners(state, '2026-10-05', 3).suggestions).toEqual([]);
  });
  it('yeni tarif eklenebilir ve planlanabilir', () => {
    const recipe = { ...initialState().recipes[0], id: 'custom-test', title: 'Benim çorbam' };
    const state = reducer(initialState(), { type: 'recipe', value: recipe });
    expect(parseState(state).recipes).toHaveLength(initialState().recipes.length + 1);
    expect(
      reducer(state, { type: 'recipe', value: { ...recipe, title: 'Yeni isim' } }).recipes,
    ).toHaveLength(initialState().recipes.length + 1);
  });
  it('ek ürün gramaja zorlanmaz ve kaydedilmiş kopyadan bağımsızdır', () => {
    const item = {
      id: 'x',
      week: '2026-10-05',
      name: 'Deterjan',
      quantity: 2,
      unit: 'paket' as const,
      checked: false,
    };
    const state = reducer(initialState(), { type: 'extra', value: item });
    const saved = reducer(state, {
      type: 'saveList',
      value: {
        id: 'l',
        name: 'Ev',
        week: item.week,
        createdAt: '2026-10-10T00:00:00Z',
        items: [],
        extras: [item],
        checked: [],
      },
    });
    const removed = reducer(saved, { type: 'removeExtra', id: 'x' });
    expect(removed.experience.extras).toEqual([]);
    expect(removed.savedLists[0].extras).toEqual([item]);
    expect(shoppingText('Ev', [], [], [item])).toContain('Deterjan · 2 paket');
    expect(
      reducer(removed, { type: 'checkSavedExtra', id: 'l', extraId: 'x' }).savedLists[0].extras![0]
        .checked,
    ).toBe(true);
  });
  it.each([0, -2, NaN, Infinity])('ek ürün için geçersiz miktarı reddeder: %s', (quantity) => {
    expect(
      extraSchema.safeParse({
        id: 'a',
        week: '2026-10-05',
        name: 'Kahve',
        quantity,
        unit: 'paket',
        checked: false,
      }).success,
    ).toBe(false);
  });
  it('pişirme çift kayıtta yinelenmez; puan ve not korunur', () => {
    const value = {
      id: 'c',
      recipeId: 'mercimek',
      at: '2026-10-10T00:00:00Z',
      rating: 5,
      note: 'Biraz limon',
    };
    const state = reducer(initialState(), { type: 'cooked', value });
    expect(parseState(reducer(state, { type: 'cooked', value })).experience.cooked).toEqual([
      value,
    ]);
  });
  it('sayaç duvar saatini kullanır, geciken interval süreyi uzatmaz', () => {
    expect(timerRemaining(61000, 31000, 60)).toBe(30);
    expect(timerRemaining(61000, 81000, 60)).toBe(0);
    expect(timerRemaining(null, 81000, 12)).toBe(12);
  });
  it('geçersiz hatırlatma saati reddedilir', () => {
    const state = initialState();
    state.experience.reminder.time = '27:80';
    expect(() => parseState(state)).toThrow();
  });
  it('misafir, demo ve gerçek hesaplar birbirinin verisini yüklemez', async () => {
    const data = new Map<string, string>();
    const driver = {
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        data.set(k, v);
      },
    };
    const a = { id: 'alice', email: 'alice@example.test', name: 'Alice' };
    const b = { id: 'bob', email: 'bob@example.test', name: 'Bob' };
    const state = initialState();
    state.experience.favorites = ['mercimek'];
    const guest = createRepository(driver, accountStorageKey('demo', null));
    const alice = createRepository(driver, accountStorageKey('supabase', a));
    const bob = createRepository(driver, accountStorageKey('supabase', b));
    await guest.save(state);
    expect((await alice.load()).experience.favorites).toEqual([]);
    await alice.save(state);
    expect((await bob.load()).experience.favorites).toEqual([]);
    expect(accountStorageKey('demo', a)).not.toEqual(accountStorageKey('supabase', a));
  });
  it('hesap formu geçersiz girdileri reddeder, e-postayı normalize eder', () => {
    expect(credentialsSchema.safeParse({ email: 'a', password: 'short' }).success).toBe(false);
    expect(
      signUpSchema.safeParse({ name: 'A', email: 'a@example.test', password: '12345678' }).success,
    ).toBe(false);
    expect(
      credentialsSchema.parse({ email: 'USER@example.test', password: '12345678' }).email,
    ).toBe('user@example.test');
  });
  it('bağlanmamış sağlayıcılar sahte başarı dönmez', async () => {
    expect(notifications.available).toBe(false);
    expect(socialAuth.available).toBe(false);
    await expect(notifications.schedule({ day: 0, time: '18:00' })).rejects.toThrow();
    await expect(socialAuth.signIn('google')).rejects.toThrow();
  });
});
