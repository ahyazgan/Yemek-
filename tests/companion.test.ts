import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { parseState, recipeSchema } from '../src/storage/schema';
import {
  applyStaples,
  budgetDinners,
  estimateBasket,
  parseMoney,
  preparationTasks,
  recipeCost,
  recipeFingerprint,
  weeklyEstimate,
} from '../src/domain/companion';
import { ingredients } from '../src/data/catalog';
import { availableSubstitutions } from '../src/domain/substitutions';
import { assistantMenu, parseMenuRequest } from '../src/domain/menuAssistant';
import { suggestDinners } from '../src/domain/planning';
import { oauthCallbackCode } from '../src/auth/oauth';
import { printableHtml } from '../src/domain/print';
import { commerce, matchOfficialOffers, officialCheckoutUrl } from '../src/integrations/commerce';
const week = '2026-10-05';
function setup() {
  const state = initialState();
  state.profile = { people: 2, diets: [], budget: 'balanced' };
  for (const i of ingredients)
    state.experience.tools.prices[i.id] = {
      cents: 1000,
      packageGrams: 1000,
      recordedOn: week,
      source: 'Test fixture',
    };
  state.experience.tools.budgets[week] = { totalCents: 50000, extrasCents: 1000 };
  return state;
}
describe('Bütçe, mutfak ve öneri bütünlüğü', () => {
  it('eski v1 kayıtlarına boş alanlar ekler ve mevcut veriyi korur', () => {
    const state = setup();
    const { tools: _, ...legacy } = state.experience;
    const result = parseState({ ...state, experience: legacy });
    expect(result.experience.tools.prices).toEqual({});
    expect(result.recipes).toEqual(state.recipes);
  });
  it('TL girişinde küsuratı korur, belirsiz ayırıcı ve negatifi reddeder', () => {
    expect(parseMoney('12,34')).toBe(1234);
    expect(parseMoney('12.3')).toBe(1230);
    for (const value of ['', '-2', '1.000,00', '1e4', '1,345', 'Infinity'])
      expect(parseMoney(value)).toBeNull();
  });
  it('ortak malzemeyi toplayıp stoğu düşer, pakete bir kez yuvarlar', () => {
    const state = setup();
    state.meals = [
      { id: 'a', recipeId: 'mercimek', date: week, slot: 'lunch', servings: 2 },
      { id: 'b', recipeId: 'bulgur', date: week, slot: 'dinner', servings: 2 },
    ];
    state.pantry.onion = 50;
    state.experience.tools.prices.onion = {
      cents: 1200,
      packageGrams: 50,
      recordedOn: week,
      source: 'Test',
    };
    const row = weeklyEstimate(state, week).lines.find((i) => i.ingredientId === 'onion')!;
    expect(row.grams).toBe(70);
    expect(row.packages).toBe(2);
    expect(row.cents).toBe(2400);
  });
  it('eksik fiyat sıfır sayılmaz, su hariç tutulur ve ücretsiz fiyat açıkça kabul edilir', () => {
    const state = setup();
    state.meals = [{ id: 'a', recipeId: 'mercimek', date: week, slot: 'dinner', servings: 2 }];
    delete state.experience.tools.prices.lentil;
    expect(weeklyEstimate(state, week).missing).toBe(1);
    expect(weeklyEstimate(state, week).lines.some((i) => i.ingredientId === 'water')).toBe(false);
    state.experience.tools.prices.lentil = {
      cents: 0,
      packageGrams: 1000,
      recordedOn: week,
      source: 'Test',
    };
    expect(weeklyEstimate(state, week).missing).toBe(0);
  });
  it('malzeme maliyetini porsiyonla ölçekler; paket alışverişiyle karıştırmaz', () => {
    const state = setup();
    const recipe = state.recipes[0];
    expect(recipeCost(recipe, 4, state.experience.tools.prices).cents).toBe(611);
    expect(recipeCost(recipe, 2, state.experience.tools.prices).cents).toBe(306);
  });
  it('menü bütçeyi aşmaz, ek ürün payı ayrılır, mevcut öğün korunur', () => {
    const state = setup();
    state.experience.tools.budgets[week] = { totalCents: 15000, extrasCents: 5000 };
    state.meals = [{ id: 'a', recipeId: 'mercimek', date: week, slot: 'dinner', servings: 2 }];
    const before = JSON.stringify(state);
    const result = budgetDinners(state, week, 5);
    expect(result.estimate.cents).toBeLessThanOrEqual(10000);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.suggestions.every((m) => m.date !== week && m.recipeId !== 'mercimek')).toBe(
      true,
    );
  });
  it('bütçeli öneri eksik fiyatla veya yetersiz hedefle ekleme yapmaz', () => {
    const state = setup();
    state.experience.tools.prices = {};
    expect(budgetDinners(state, week, 5).suggestions).toEqual([]);
    const priced = setup();
    priced.experience.tools.budgets[week].totalCents = 1000;
    priced.experience.tools.budgets[week].extrasCents = 1000;
    expect(budgetDinners(priced, week, 3).suggestions).toEqual([]);
  });
  it('bütçe taşması, bilinmeyen malzeme ve yinelenen kimlik kalıcı kayda geçemez', () => {
    const state = setup();
    state.experience.tools.budgets[week].extrasCents = 50001;
    expect(() => parseState(state)).toThrow();
    const other = setup();
    other.experience.tools.pantryDates.unknown = { date: week, kind: 'expiry' };
    expect(() => parseState(other)).toThrow();
  });
  it('düzenli ürünleri aynı haftaya yeniden eklemez, diğer haftada ayrı oluşturur', () => {
    const state = setup();
    state.experience.tools.staples = [{ id: 'x', name: 'Kahve', quantity: 1, unit: 'paket' }];
    const first = applyStaples(state, week);
    state.experience.extras = first;
    expect(applyStaples(state, week)).toEqual([]);
    expect(applyStaples(state, '2026-10-12')).toHaveLength(1);
  });
  it('hazırlık porsiyonları birleşir, değişen porsiyon eski işaretleri geçersiz kılar', () => {
    const state = setup();
    state.meals = [
      { id: 'a', recipeId: 'mercimek', date: week, slot: 'lunch', servings: 2 },
      { id: 'b', recipeId: 'mercimek', date: week, slot: 'dinner', servings: 3 },
    ];
    const first = preparationTasks(state, week);
    expect(first[0].servings).toBe(5);
    expect(first).toHaveLength(state.recipes[0].steps.length);
    state.meals[0].servings = 4;
    expect(preparationTasks(state, week)[0].key).not.toBe(first[0].key);
  });
  it('kaçınılan tarif hiçbir kişisel menüye girmez, tercih edilen öne alınır', () => {
    const state = setup();
    state.experience.tools.feedback.mercimek = 'avoid';
    state.experience.tools.feedback.fasulye = 'prefer';
    const result = suggestDinners(state, week, 3);
    expect(result.suggestions[0].recipeId).toBe('fasulye');
    expect(result.suggestions.some((m) => m.recipeId === 'mercimek')).toBe(false);
  });
  it('kullanılmayan kişisel tarif silinince geri bildirim ve pişirme oturumu temizlenir', () => {
    let state = setup();
    const recipe = { ...state.recipes[0], id: 'custom-remove' };
    state.recipes.push(recipe);
    state.experience.tools.feedback[recipe.id] = 'avoid';
    state.experience.tools.cooking[recipe.id] = {
      fingerprint: recipeFingerprint(recipe),
      step: 0,
      servings: 2,
      deadline: null,
      seconds: 300,
    };
    state = reducer(state, { type: 'deleteRecipe', id: recipe.id });
    expect(() => parseState(state)).not.toThrow();
    expect(state.experience.tools.feedback).toEqual({});
  });
  it('alternatifte hem malzeme hem adım değişir; özgün tarif ve tercih korunur', () => {
    const state = setup();
    const recipe = state.recipes.find((r) => r.id === 'fasulye')!;
    const result = availableSubstitutions(state, recipe)[0];
    expect(result.recipe.ingredients.some((p) => p.ingredientId === 'bean')).toBe(false);
    expect(result.recipe.steps.join(' ')).toContain('nohut');
    expect(recipe.steps.join(' ')).toContain('fasulye');
    state.experience.excludedIngredients = ['chickpea'];
    expect(availableSubstitutions(state, recipe)).toEqual([]);
  });
  it('değiştirilmiş tarife eski alternatif uygulanmaz', () => {
    const state = setup();
    const recipe = state.recipes.find((r) => r.id === 'fasulye')!;
    recipe.steps[0] = 'Farklı bir hazırlık';
    expect(availableSubstitutions(state, recipe)).toEqual([]);
  });
  it('video ve besin bilgisinde kaynak, HTTPS ve sayı sınırları zorunlu', () => {
    const recipe = setup().recipes[0];
    expect(
      recipeSchema.safeParse({
        ...recipe,
        enrichment: {
          fingerprint: recipeFingerprint(recipe),
          video: { url: 'javascript:alert(1)', credit: 'Test' },
          nutrition: null,
        },
      }).success,
    ).toBe(false);
    expect(
      recipeSchema.safeParse({
        ...recipe,
        enrichment: {
          fingerprint: recipeFingerprint(recipe),
          video: null,
          nutrition: { kcal: 100, protein: 5, carbs: 12, fat: 2, source: '', recordedOn: week },
        },
      }).success,
    ).toBe(false);
  });
});
describe('Menü asistanı ve izinli bağlantı sözleşmeleri', () => {
  it('yazdırma HTML metnindeki kullanıcı içeriği kod olarak çalışmaz', () => {
    const html = printableHtml('<script>alert(1)</script>', '<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });
  it('desteklenen Türkçe isteği çözer; belirsiz veya olumsuz ifadeyi tahmin etmez', () => {
    expect(parseMenuRequest('3 akşam, 2 kişilik, 30 dakika, vegan, fırınsız')).toEqual({
      evenings: 3,
      people: 2,
      minutes: 30,
      diets: ['vegan'],
      noOven: true,
    });
    for (const text of [
      'vegan olmasın',
      'diyabet için 3 akşam',
      '20 akşam',
      '3 akşam 5 akşam',
      '2 kişilik 1 dakika',
    ])
      expect(() => parseMenuRequest(text)).toThrow();
  });
  it('asistan mevcut diyet ve süre sınırını gevşetmez, onaysız menü eklemez', () => {
    const state = setup();
    state.profile!.diets = ['vegan'];
    state.experience.maxMinutes = 20;
    const before = JSON.stringify(state);
    const result = assistantMenu(state, week, parseMenuRequest('5 akşam, 60 dakika'));
    for (const meal of result.suggestions) {
      const recipe = state.recipes.find((r) => r.id === meal.recipeId)!;
      expect(recipe.diets).toContain('vegan');
      expect(recipe.minutes).toBeLessThanOrEqual(20);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('OAuth dönüşünde yanlış host/yol, sağlayıcı hatası ve boş kod reddedilir', () => {
    expect(oauthCallbackCode('sofra://auth/callback?code=abc', 'sofra://auth/callback')).toBe(
      'abc',
    );
    for (const url of [
      'sofra://evil/callback?code=abc',
      'sofra://auth/else?code=abc',
      'sofra://auth/callback?error=denied',
      'sofra://auth/callback',
    ])
      expect(() => oauthCallbackCode(url, 'sofra://auth/callback')).toThrow();
  });
  it('resmî ödeme adresinde host taklidi ve kimlik bilgisi engellenir', () => {
    expect(
      officialCheckoutUrl('https://www.migros.com.tr/checkout', ['www.migros.com.tr']),
    ).toContain('/checkout');
    for (const u of [
      'https://www.migros.com.tr.evil.test/',
      'https://evil@www.migros.com.tr/',
      'http://www.migros.com.tr/',
    ])
      expect(() => officialCheckoutUrl(u, ['www.migros.com.tr'])).toThrow();
  });
  it('market izin olmadan katalog veya sipariş üretmez', async () => {
    expect((await commerce.capability('migros')).authorized).toBe(false);
    await expect(commerce.orders('migros')).rejects.toThrow('oluşturulmadı');
  });
  it('ürün eşleştirme güncel mağaza, promosyon koşulu ve stok sınırını uygular', () => {
    const item = {
      ingredientId: 'onion',
      name: 'Soğan',
      category: 'Sebze & meyve' as const,
      grams: 1200,
      pantryGrams: 0,
      totalGrams: 1200,
      recipeTitles: [],
    };
    const offer = {
      market: 'migros',
      storeId: '1',
      productId: 'a',
      ingredientId: 'onion',
      title: 'Test ürün',
      packageGrams: 500,
      priceCents: 2000,
      currency: 'TRY',
      available: true,
      maxPackages: 10,
      observedAt: '2026-10-10T10:00:00.000Z',
      expiresAt: '2026-10-10T11:00:00.000Z',
      promotion: null,
    };
    const offers = [
      offer,
      { ...offer, productId: 'stale', expiresAt: '2026-10-10T10:05:00.000Z' },
      {
        ...offer,
        productId: 'promo',
        promotion: { label: 'Test', conditions: 'Üye', eligible: false },
      },
      { ...offer, productId: 'stock', maxPackages: 2 },
    ];
    const rows = matchOfficialOffers(
      [item],
      offers,
      'migros',
      '1',
      Date.parse('2026-10-10T10:30:00.000Z'),
    );
    expect(rows[0].alternatives).toHaveLength(1);
    expect(rows[0].alternatives[0]).toMatchObject({
      packages: 3,
      totalCents: 6000,
      surplusGrams: 300,
    });
    expect(estimateBasket([], {}).missing).toBe(0);
  });
});
