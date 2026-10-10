import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { initialState, reducer } from '../src/domain/state';
import { dailyRecipe, relatedRecipes, storyRecipes } from '../src/domain/content';
import { recipes, ingredients } from '../src/data/catalog';
import { stories } from '../src/data/stories';
import { parseState, recipeSchema } from '../src/storage/schema';
import { upgradeCatalog } from '../src/domain/discovery';
import { createRepository } from '../src/storage/repository';
import { buildShoppingList } from '../src/domain/logic';
import { photoAliases } from '../src/data/catalog-airfryer';

describe('Ayrıntılı tarif içeriği', () => {
  it('40 tarifin görseli, benzersiz malzemeleri, süreleri ve özgün notları tutarlı', () => {
    expect(recipes).toHaveLength(40);
    expect(ingredients).toHaveLength(43);
    for (const recipe of recipes) {
      expect(recipeSchema.safeParse(recipe).success, recipe.id).toBe(true);
      expect(existsSync('assets/recipes/' + (photoAliases[recipe.id] ?? recipe.id) + '.png')).toBe(
        true,
      );
      expect(new Set(recipe.ingredients.map((p) => p.ingredientId)).size).toBe(
        recipe.ingredients.length,
      );
      expect(recipe.details!.tips.length).toBeGreaterThanOrEqual(2);
      expect(recipe.details!.servingSuggestion.length).toBeGreaterThan(10);
    }
  });
  it('bekleme süresini toplamdan düşürmek, negatif veya kesirli süre kabul edilmez', () => {
    const recipe = recipes.find((r) => r.id === 'irmik')!;
    expect(recipe.minutes).toBe(140);
    expect(recipeSchema.safeParse({ ...recipe, minutes: 20 }).success).toBe(false);
    expect(
      recipeSchema.safeParse({ ...recipe, details: { ...recipe.details, prepMinutes: -1 } })
        .success,
    ).toBe(false);
    expect(
      recipeSchema.safeParse({ ...recipe, details: { ...recipe.details, prepMinutes: 5.5 } })
        .success,
    ).toBe(false);
  });
  it('eski tariflere yalnızca içerikleri değişmemişse ayrıntı ekler; kişisel notlar ve silme kararı korunur', () => {
    const state = initialState();
    state.recipes = state.recipes.slice(0, 16).map(({ details, ...recipe }) => recipe);
    state.recipes[0].title = 'Annemin çorbası';
    state.recipes[1].ingredients[0].quantity = 999;
    state.recipes[2].minutes = 99;
    state.recipes[3].steps = ['Benim özel yöntemim'];
    state.recipes[4].details = null;
    const updated = upgradeCatalog(parseState(state));
    expect(updated.recipes[0].details).toEqual(recipes[0].details);
    expect(updated.recipes[0].title).toBe('Annemin çorbası');
    for (const i of [1, 2, 3]) expect(updated.recipes[i].details).toBeUndefined();
    expect(updated.recipes[4].details).toBeNull();
    expect(upgradeCatalog(updated)).toEqual(updated);
    updated.recipes[0].details!.tips[0] = 'Yerel değişiklik';
    expect(recipes[0].details!.tips[0]).not.toBe('Yerel değişiklik');
  });
  it('düzenlenen ayrıntıları kalıcı saklar; mevcut kayıtlı alışveriş kopyası değişmez', async () => {
    const state = initialState();
    state.savedLists = [
      {
        id: 's',
        name: 'Önceki liste',
        createdAt: '2026-10-10T00:00:00.000Z',
        week: '2026-10-05',
        checked: [],
        items: [],
      },
    ];
    const updated = reducer(state, {
      type: 'recipe',
      value: {
        ...state.recipes[0],
        minutes: 40,
        details: { ...state.recipes[0].details!, prepMinutes: 15, tips: ['Kendi püf noktam.'] },
      },
    });
    let raw: string | null = null;
    const repo = createRepository({
      getItem: async () => raw,
      setItem: async (_, value) => {
        raw = value;
      },
    });
    await repo.save(updated);
    expect((await repo.load()).recipes[0].details!.tips).toEqual(['Kendi püf noktam.']);
    expect(updated.savedLists).toEqual(state.savedLists);
  });
  it('yeni tarifleri birlikte ölçekler, ortak yoğurdu birleştirir ve stoğu yalnızca bir kez düşer', () => {
    const result = buildShoppingList(
      [
        { id: 'a', recipeId: 'yayla', date: '2026-10-05', slot: 'dinner', servings: 2 },
        { id: 'b', recipeId: 'semizotu', date: '2026-10-06', slot: 'dinner', servings: 2 },
      ],
      recipes,
      { yogurt: 150 },
    );
    expect(result.find((i) => i.ingredientId === 'yogurt')).toMatchObject({
      totalGrams: 400,
      pantryGrams: 150,
      grams: 250,
    });
  });
});

describe('Kişiye uygun keşif', () => {
  it('tüm seçkilerin tarif kimlikleri geçerli ve tekrarsız', () => {
    for (const story of stories) {
      expect(new Set(story.recipeIds).size).toBe(story.recipeIds.length);
      expect(story.recipeIds.every((id) => recipes.some((r) => r.id === id))).toBe(true);
    }
  });
  it('seçki ve benzer tarifler vegan, ekonomik, süre ve hariç malzeme tercihlerini gevşetmez', () => {
    const state = initialState();
    state.profile = { people: 2, diets: ['vegan'], budget: 'economic' };
    state.experience.excludedIngredients = ['onion'];
    state.experience.maxMinutes = 30;
    const selected = storyRecipes(state, ['semizotu', 'nohut', 'pirasa', 'coban', 'missing']);
    expect(selected.map((r) => r.id)).toEqual(['nohut']);
    const related = relatedRecipes(state, recipes[0]);
    for (const recipe of related) {
      expect(recipe.id).not.toBe(recipes[0].id);
      expect(recipe.diets).toContain('vegan');
      expect(recipe.budget).toBe('economic');
      expect(recipe.minutes).toBeLessThanOrEqual(30);
      expect(recipe.ingredients.some((p) => p.ingredientId === 'onion')).toBe(false);
    }
  });
  it('günün fikri aynı gün sabit kalır, ertesi gün değişir; boş sonuçta tarif uydurmaz', () => {
    const morning = new Date(2026, 9, 10, 1),
      evening = new Date(2026, 9, 10, 23);
    expect(dailyRecipe(recipes, morning)).toEqual(dailyRecipe(recipes, evening));
    expect(dailyRecipe(recipes, morning)?.id).not.toBe(
      dailyRecipe(recipes, new Date(2026, 9, 11))?.id,
    );
    expect(dailyRecipe([], morning)).toBeUndefined();
    expect(dailyRecipe([recipes[0]], morning)).toEqual(recipes[0]);
  });
});
