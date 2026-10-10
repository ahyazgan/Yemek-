import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { recipes, ingredients } from '../src/data/catalog';
import {
  matchesTheme,
  pantryMatch,
  pantrySuggestions,
  upgradeCatalog,
} from '../src/domain/discovery';
import { parseState, recipeSchema } from '../src/storage/schema';
import { createRepository } from '../src/storage/repository';
import { suggestDinners } from '../src/domain/planning';
import { filterRecipes } from '../src/domain/logic';

describe('Genişleyen katalog ve kişisel kayıtlar', () => {
  it('40 tarifin tümü geçerli; her malzeme ve kategori tanımlı', () => {
    expect(recipes).toHaveLength(40);
    expect(new Set(recipes.map((r) => r.id)).size).toBe(40);
    for (const r of recipes) {
      expect(recipeSchema.safeParse(r).success).toBe(true);
      expect(r.category).toBeTruthy();
      expect(r.ingredients.every((p) => ingredients.some((i) => i.id === p.ingredientId))).toBe(
        true,
      );
    }
  });
  it('eski 8 tarifi yükseltir; kullanıcının başlık, miktar, stok ve öğünlerini değiştirmez', async () => {
    const old = initialState();
    old.recipes = old.recipes.slice(0, 8).map(({ category, ...r }) => r);
    old.recipes[0].title = 'Annemin mercimeği';
    old.recipes[0].ingredients[0].quantity = 123;
    old.meals = [
      { id: 'm', date: '2026-10-05', slot: 'dinner', recipeId: 'mercimek', servings: 3 },
    ];
    old.pantry = { onion: 50 };
    const { collections, ...legacyExperience } = old.experience;
    void collections;
    const raw = JSON.stringify({ ...old, experience: legacyExperience });
    const loaded = await createRepository({
      getItem: async () => raw,
      setItem: async () => {},
    }).load();
    expect(loaded.recipes).toHaveLength(40);
    expect(loaded.recipes[0]).toMatchObject({ title: 'Annemin mercimeği', category: 'soup' });
    expect(loaded.recipes[0].ingredients[0].quantity).toBe(123);
    expect(loaded.meals).toEqual(old.meals);
    expect(loaded.pantry).toEqual(old.pantry);
    expect(loaded.experience.collections).toEqual([]);
    expect(upgradeCatalog(loaded)).toEqual(loaded);
  });
  it('kişisel tarifin kategorisini korur; yeni katalog kopyası kaynağı değiştirmez', () => {
    const state = initialState();
    state.recipes = [{ ...state.recipes[0], id: 'custom-demo', category: 'dessert' }];
    const next = upgradeCatalog(state);
    expect(next.recipes[0].category).toBe('dessert');
    next.recipes.find((r) => r.id === 'ezogelin')!.ingredients[0].quantity = 1;
    expect(recipes.find((r) => r.id === 'ezogelin')!.ingredients[0].quantity).toBe(160);
  });
  it('malzeme adı ve Türkçe büyük harfle tarif arar', () => {
    const matches = filterRecipes(recipes, 'MAYDANOZ', 'all', 'all', null, false);
    expect(matches.map((r) => r.id)).toEqual([
      'kisir',
      'coban',
      'makarna',
      'peynirli-krep',
      'piyaz',
      'nohut-salatasi',
    ]);
  });
  it('hızlı, bitkisel ve tatlı seçkileri gerçek tarif özelliklerinden türetilir', () => {
    expect(recipes.filter((r) => matchesTheme(r, 'quick')).map((r) => r.id)).toEqual([
      'menemen',
      'coban',
      'makarna',
      'semizotu',
      'cilbir',
      'peynirli-biber',
      'piyaz',
      'nohut-salatasi',
      'cacik',
    ]);
    expect(recipes.filter((r) => matchesTheme(r, 'dessert')).map((r) => r.id)).toEqual([
      'sutlac',
      'irmik',
      'un-helvasi',
    ]);
    expect(
      recipes.filter((r) => matchesTheme(r, 'plant')).every((r) => r.diets.includes('vegan')),
    ).toBe(true);
  });
  it('otomatik akşam menüsünde salata, tatlı veya yan yemek tek başına önerilmez', () => {
    const state = initialState();
    state.profile = { people: 2, diets: [], budget: 'balanced' };
    for (let variant = 0; variant < 16; variant++) {
      const result = suggestDinners(state, '2026-10-05', 7, variant);
      expect(result.suggestions).toHaveLength(7);
      for (const meal of result.suggestions)
        expect(['salad', 'side', 'dessert']).not.toContain(
          state.recipes.find((r) => r.id === meal.recipeId)!.category,
        );
    }
  });
});
describe('Miktara dayalı mutfak önerileri', () => {
  const recipe = recipes.find((r) => r.id === 'omlet')!;
  it('kısmi stok bir malzemenin tamamına yetmiş gibi sayılmaz', () => {
    const match = pantryMatch(
      recipe,
      { potato: 300, egg: 100, oil: 20, salt: 3, blackpepper: 1 },
      2,
    );
    expect(match).toMatchObject({ covered: 4, total: 5, partial: 5, missing: 1 });
    expect(match.parts.find((p) => p.ingredientId === 'egg')!.missing).toBe(100);
  });
  it('kişi sayısı değişince eksik miktar yeniden hesaplanır', () => {
    const pantry = { potato: 150, egg: 100, oil: 10, salt: 1.5, blackpepper: 0.5 };
    expect(pantryMatch(recipe, pantry, 1).missing).toBe(0);
    expect(pantryMatch(recipe, pantry, 2).missing).toBe(5);
  });
  it('su hariç tutulur; aynı malzemenin gram ve kilogramı birleştirilir', () => {
    const r = {
      ...recipe,
      ingredients: [
        { ingredientId: 'water', quantity: 500, unit: 'g' as const },
        { ingredientId: 'potato', quantity: 0.1, unit: 'kg' as const },
        { ingredientId: 'potato', quantity: 50, unit: 'g' as const },
      ],
    };
    expect(pantryMatch(r, { potato: 120 }, 2)).toMatchObject({ total: 1, missing: 1, covered: 0 });
    expect(pantryMatch(r, { potato: 120 }, 2).parts[0].missing).toBe(30);
  });
  it('stok yoksa öneri yok; tümü hazır tarif sıralamada önce gelir; stok tüketilmez', () => {
    expect(pantrySuggestions(recipes, {}, 2)).toEqual([]);
    const pantry = { potato: 300, egg: 200, oil: 20, salt: 3, blackpepper: 1 };
    const before = JSON.stringify(pantry);
    expect(pantrySuggestions(recipes, pantry, 2)[0].recipe.id).toBe('omlet');
    expect(JSON.stringify(pantry)).toBe(before);
  });
});
describe('Özel tarif koleksiyonları', () => {
  it('oluşturma, ad değiştirme ve üyelik çevrimdışı kayıtla korunur', async () => {
    let state = reducer(initialState(), {
      type: 'collection',
      value: { id: 'c', name: '  Akşamlar  ', recipeIds: ['mercimek', 'mercimek', 'olmayan'] },
    });
    expect(state.experience.collections[0]).toEqual({
      id: 'c',
      name: 'Akşamlar',
      recipeIds: ['mercimek'],
    });
    state = reducer(state, { type: 'collectionRecipe', id: 'c', recipeId: 'nohut' });
    state = reducer(state, {
      type: 'collection',
      value: { ...state.experience.collections[0], name: 'Kolay tarifler' },
    });
    let raw = '';
    const repo = createRepository({
      getItem: async () => raw,
      setItem: async (_, v) => {
        raw = v;
      },
    });
    await repo.save(state);
    expect((await repo.load()).experience.collections).toEqual([
      { id: 'c', name: 'Kolay tarifler', recipeIds: ['mercimek', 'nohut'] },
    ]);
    expect(
      reducer(state, { type: 'collectionRecipe', id: 'c', recipeId: 'nohut' }).experience
        .collections[0].recipeIds,
    ).toEqual(['mercimek']);
  });
  it('koleksiyon silmek tarifleri, favorileri ve menüyü silmez', () => {
    let state = reducer(initialState(), {
      type: 'collection',
      value: { id: 'c', name: 'Bir sayfa', recipeIds: ['mercimek'] },
    });
    state = reducer(state, { type: 'favorite', id: 'mercimek' });
    const next = reducer(state, { type: 'deleteCollection', id: 'c' });
    expect(next.recipes).toEqual(state.recipes);
    expect(next.meals).toEqual(state.meals);
    expect(next.experience.favorites).toEqual(['mercimek']);
    expect(next.experience.collections).toEqual([]);
  });
  it('bozuk koleksiyon ilişkileri ve yinelenen kimlikler kayda kabul edilmez', () => {
    const state = initialState();
    state.experience.collections = [{ id: 'c', name: 'Bozuk', recipeIds: ['olmayan'] }];
    expect(() => parseState(state)).toThrow();
    state.experience.collections = [
      { id: 'c', name: 'Bir', recipeIds: [] },
      { id: 'c', name: 'İki', recipeIds: [] },
    ];
    expect(() => parseState(state)).toThrow();
  });
});
