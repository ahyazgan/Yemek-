import { describe, expect, it } from 'vitest';
import { recipes } from '../src/data/catalog';
import {
  addDays,
  buildShoppingList,
  filterRecipes,
  grams,
  itemKey,
  mealsInWeek,
  weekStart,
} from '../src/domain/logic';
import { initialState, reducer } from '../src/domain/state';
import { Meal, Recipe } from '../src/domain/model';
import { parseState, recipeSchema } from '../src/storage/schema';
import { markets } from '../src/integrations/markets';
const meal = (
  recipeId = 'mercimek',
  servings = 4,
  date = '2026-10-05',
  slot: Meal['slot'] = 'dinner',
): Meal => ({ id: `${date}-${slot}`, recipeId, servings, date, slot });
describe('Alışveriş hesabı', () => {
  it('porsiyona göre gramajı ölçekler', () => {
    expect(
      buildShoppingList([meal('mercimek', 2)], recipes, {}).find((i) => i.ingredientId === 'lentil')
        ?.grams,
    ).toBe(120);
  });
  it('ortak malzemeyi birleştirir, evdeki miktarı bir kez düşer', () => {
    const item = buildShoppingList([meal(), meal('bulgur', 2, '2026-10-06')], recipes, {
      onion: 100,
    }).find((i) => i.ingredientId === 'onion');
    expect(item).toMatchObject({ totalGrams: 180, pantryGrams: 100, grams: 80 });
    expect(item?.recipeTitles).toHaveLength(2);
  });
  it('aynı tarif farklı günlerde tekrarlanırsa iki kez sayar', () => {
    expect(
      buildShoppingList([meal(), meal('mercimek', 4, '2026-10-06')], recipes, {}).find(
        (i) => i.ingredientId === 'lentil',
      )?.grams,
    ).toBe(480);
  });
  it('fazla stok negatif ihtiyaç oluşturmaz ve stoğu değiştirmez', () => {
    const pantry = { lentil: 500 };
    const item = buildShoppingList([meal()], recipes, pantry).find(
      (i) => i.ingredientId === 'lentil',
    );
    expect(item?.grams).toBe(0);
    expect(item?.pantryGrams).toBe(240);
    expect(pantry.lentil).toBe(500);
  });
  it('kg ve gramı aynı tabanda birleştirir', () => {
    const recipe: Recipe = {
      ...recipes[0],
      ingredients: [
        { ingredientId: 'onion', quantity: 0.1, unit: 'kg' },
        { ingredientId: 'onion', quantity: 50, unit: 'g' },
      ],
    };
    expect(buildShoppingList([meal()], [recipe], {})[0].grams).toBe(150);
  });
  it('yuvarlamayı toplamdan sonra yapar', () => {
    const r = {
      ...recipes[0],
      baseServings: 3,
      ingredients: [{ ingredientId: 'salt', quantity: 1, unit: 'g' as const }],
    };
    expect(
      buildShoppingList(
        [meal('mercimek', 1), meal('mercimek', 1, '2026-10-06'), meal('mercimek', 1, '2026-10-07')],
        [r],
        {},
      )[0].grams,
    ).toBe(1);
  });
  it('boş menü boş liste verir', () => expect(buildShoppingList([], recipes, {})).toEqual([]));
  it.each([0, -1, NaN, Infinity, 1.5, 13])('geçersiz porsiyonu reddeder: %s', (n) =>
    expect(() => buildShoppingList([meal('mercimek', n)], recipes, {})).toThrow(),
  );
  it('bilinmeyen tarifi sessizce atlamaz', () =>
    expect(() => buildShoppingList([meal('missing')], recipes, {})).toThrow());
  it('geçersiz stok veya birimi reddeder', () => {
    expect(() => buildShoppingList([meal()], recipes, { salt: -1 })).toThrow();
    expect(() => grams(1, 'ml' as 'g')).toThrow();
  });
  it('miktar değişince tamamlandı işareti geçersizleşir', () => {
    const a = buildShoppingList([meal()], recipes, {});
    const b = buildShoppingList([meal('mercimek', 2)], recipes, {});
    expect(itemKey(a[0])).not.toBe(itemKey(b[0]));
  });
});
describe('Plan, tercihler ve veri doğrulama', () => {
  it('pazar dahil haftayı pazartesiden başlatır', () => {
    expect(weekStart('2026-10-11')).toBe('2026-10-05');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('haftalar birbirine karışmaz', () => {
    const state = { meals: [meal(), meal('menemen', 2, '2026-10-12')] };
    expect(mealsInWeek(state, '2026-10-05')).toHaveLength(1);
  });
  it('aynı gün/öğünü değiştirir; diğer öğünü korur', () => {
    let state = initialState();
    state = reducer(state, { type: 'meal', value: meal() });
    state = reducer(state, { type: 'meal', value: meal('menemen') });
    state = reducer(state, { type: 'meal', value: meal('bulgur', 4, '2026-10-05', 'lunch') });
    expect(state.meals).toHaveLength(2);
    expect(state.meals[0].recipeId).toBe('menemen');
  });
  it('Türkçe I/ı ve İ/i araması çalışır', () => {
    expect(filterRecipes(recipes, 'ISPANAK', 'all', 'all', null, false)[0].id).toBe('ispanak');
  });
  it('vegan + glutensiz + ekonomik tercihini birlikte uygular', () => {
    const found = filterRecipes(
      recipes,
      '',
      'all',
      'all',
      { people: 2, diets: ['vegan', 'glutenFree'], budget: 'economic' },
      true,
    );
    expect(
      found.every(
        (r) =>
          r.diets.includes('vegan') && r.diets.includes('glutenFree') && r.budget === 'economic',
      ),
    ).toBe(true);
    expect(found.length).toBeGreaterThan(0);
  });
  it('başlangıç kataloğu şemaya uygundur', () =>
    expect(() => parseState(initialState())).not.toThrow());
  it('negatif tarif miktarını ve gelecekteki kayıt sürümünü reddeder', () => {
    expect(
      recipeSchema.safeParse({
        ...recipes[0],
        ingredients: [{ ingredientId: 'salt', quantity: -1, unit: 'g' }],
      }).success,
    ).toBe(false);
    expect(() => parseState({ ...initialState(), version: 2 })).toThrow();
  });
  it('geçersiz tarih ve kopuk tarif referansı reddedilir', () => {
    expect(() => parseState({ ...initialState(), meals: [meal('missing')] })).toThrow();
    expect(() =>
      parseState({ ...initialState(), meals: [meal('mercimek', 4, '2026-02-30')] }),
    ).toThrow();
  });
  it('tarif değişse de kaydedilmiş liste korunur', () => {
    let state = initialState();
    const items = buildShoppingList([meal()], state.recipes, {});
    state = reducer(state, {
      type: 'saveList',
      value: {
        id: 'saved',
        name: 'Hafta',
        week: '2026-10-05',
        createdAt: new Date().toISOString(),
        items,
        checked: [],
      },
    });
    state = reducer(state, {
      type: 'recipe',
      value: { ...state.recipes[0], title: 'Yeni tarif', ingredients: [] },
    });
    expect(state.savedLists[0].items).toEqual(items);
    expect(state.savedLists[0].items[0].recipeTitles).not.toContain('Yeni tarif');
  });
  it('kayıtlı listelerin onay işaretleri ayrı tutulur', () => {
    let state = initialState();
    state = reducer(state, {
      type: 'saveList',
      value: {
        id: 'saved',
        name: 'Hafta',
        week: '2026-10-05',
        createdAt: new Date().toISOString(),
        items: [],
        checked: [],
      },
    });
    state = reducer(state, { type: 'checkSaved', id: 'saved', key: 'onion:100' });
    expect(state.savedLists[0].checked).toEqual(['onion:100']);
    expect(state.checked).toEqual({});
  });
});
describe('Market erişimi', () => {
  it.each(markets)(
    '$capability.label varsayılan olarak kapalı ve çağrı reddedilir',
    async (market) => {
      expect(market.capability.enabled).toBe(false);
      await expect(market.prepareBasket([])).rejects.toThrow('Sipariş oluşturulmadı');
    },
  );
});
