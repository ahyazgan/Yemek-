import { describe, expect, it } from 'vitest';
import { recipes } from '../src/data/catalog';
import { expansionRecipes } from '../src/data/catalog-expansion';
import { stories } from '../src/data/stories';
import { storyRecipes } from '../src/domain/content';
import { buildShoppingList } from '../src/domain/logic';
import { initialState, reducer } from '../src/domain/state';
import { createRepository } from '../src/storage/repository';
import { parseState } from '../src/storage/schema';

describe('40 tariflik katalog', () => {
  it('14 ek tarif altı kategoriyi tamamlar; tarif başlıkları benzersizdir', () => {
    expect(expansionRecipes).toHaveLength(14);
    expect(new Set(recipes.map((r) => r.title)).size).toBe(40);
    const counts = Object.fromEntries(
      ['breakfast', 'soup', 'main', 'salad', 'side', 'dessert'].map((category) => [
        category,
        expansionRecipes.filter((r) => r.category === category).length,
      ]),
    );
    expect(counts).toEqual({ breakfast: 3, soup: 2, main: 4, salad: 2, side: 2, dessert: 1 });
    expect(stories).toHaveLength(8);
  });

  it('26 tarifli kaydı yükler; kişisel tarif, not, malzeme, öğün ve kayıtlı listeyi korur', async () => {
    const old = initialState();
    old.recipes = old.recipes.slice(0, 26);
    old.recipes[0].title = 'Benim mercimeğim';
    old.recipes[0].ingredients[0].quantity = 123;
    old.recipes[0].details!.tips = ['Kendi notum'];
    old.customIngredients = [{ id: 'ingredient-tahin', name: 'Tahin', category: 'Temel gıda' }];
    old.recipes.push({
      ...old.recipes[0],
      id: 'custom-kase',
      title: 'Tahinli kasem',
      ingredients: [{ ingredientId: 'ingredient-tahin', quantity: 30, unit: 'g' }],
    });
    old.meals = [
      { id: 'm', date: '2026-10-05', slot: 'lunch', recipeId: 'custom-kase', servings: 2 },
    ];
    old.pantry = { yogurt: 150, 'ingredient-tahin': 10 };
    old.experience.favorites = ['mercimek', 'custom-kase'];
    old.experience.collections = [{ id: 'c', name: 'Benim seçimim', recipeIds: ['custom-kase'] }];
    old.savedLists = [
      {
        id: 's',
        name: 'Önceki alışveriş',
        createdAt: '2026-10-10T12:00:00.000Z',
        week: '2026-10-05',
        checked: [],
        items: [],
      },
    ];
    let raw = JSON.stringify(parseState(old));
    const repo = createRepository({
      getItem: async () => raw,
      setItem: async (_, value) => {
        raw = value;
      },
    });
    const loaded = await repo.load();
    expect(loaded.recipes).toHaveLength(41);
    expect(loaded.recipes.slice(0, 27)).toEqual(old.recipes);
    for (const field of [
      'customIngredients',
      'meals',
      'pantry',
      'savedLists',
      'experience',
    ] as const)
      expect(loaded[field]).toEqual(old[field]);
    const changed = reducer(loaded, {
      type: 'recipe',
      value: {
        ...loaded.recipes.find((r) => r.id === 'cilbir')!,
        title: 'Çılbırım',
      },
    });
    await repo.save(changed);
    expect(await repo.load()).toEqual(changed);
  });

  it('çılbır ve cacık porsiyonları ortak yoğurdu birleştirir, evdekini bir kez çıkarır', () => {
    const result = buildShoppingList(
      [
        { id: 'a', recipeId: 'cilbir', date: '2026-10-05', slot: 'lunch', servings: 1 },
        { id: 'b', recipeId: 'cacik', date: '2026-10-06', slot: 'dinner', servings: 2 },
      ],
      recipes,
      { yogurt: 150 },
    );
    expect(result.find((r) => r.ingredientId === 'yogurt')).toMatchObject({
      totalGrams: 400,
      pantryGrams: 150,
      grams: 250,
      recipeTitles: ['Sarımsaklı yoğurtlu çılbır', 'Naneli cacık'],
    });
    expect(result.filter((r) => r.ingredientId === 'yogurt')).toHaveLength(1);
    expect(result.find((r) => r.ingredientId === 'egg')?.grams).toBe(100);
    expect(result.find((r) => r.ingredientId === 'cucumber')?.grams).toBe(150);
  });

  it('yeni seçkiler ekipman, beslenme ve hariç malzemeleri gözetir', () => {
    const state = initialState();
    state.profile = { people: 2, diets: ['vegan'], budget: 'economic' };
    const cold = stories.find((s) => s.id === 'soguk-sofralar')!;
    expect(storyRecipes(state, cold.recipeIds).map((r) => r.id)).toEqual([
      'piyaz',
      'nohut-salatasi',
    ]);
    state.experience.excludedIngredients = ['onion'];
    expect(storyRecipes(state, cold.recipeIds).map((r) => r.id)).toEqual(['nohut-salatasi']);
    state.profile.diets = [];
    state.profile.budget = 'balanced';
    state.experience.equipment = ['hob'];
    expect(storyRecipes(state, stories.find((s) => s.id === 'firin')!.recipeIds)).toEqual([]);
  });
});
