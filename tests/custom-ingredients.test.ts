import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { allIngredients, ingredientUses } from '../src/domain/ingredients';
import { parseState, recipeSchema, recipeSchemaFor } from '../src/storage/schema';
import { buildShoppingList, filterRecipes } from '../src/domain/logic';
import { parseRecipeText, resolveImportRows } from '../src/domain/recipeImport';
import { parseBackup } from '../src/domain/backup';
import { exportData } from '../src/domain/experience';

const walnut = { id: 'ingredient-walnut', name: 'Ceviz içi', category: 'Temel gıda' as const };
function fixture() {
  const state = reducer(initialState(), { type: 'ingredient', value: walnut });
  state.recipes.push({
    ...state.recipes[0],
    id: 'custom-walnut',
    title: 'Cevizli tarifim',
    baseServings: 4,
    ingredients: [{ ingredientId: walnut.id, quantity: 200, unit: 'g' }],
  });
  state.meals = [
    { id: 'a', recipeId: 'custom-walnut', servings: 2, slot: 'dinner', date: '2026-10-05' },
    { id: 'b', recipeId: 'custom-walnut', servings: 1, slot: 'dinner', date: '2026-10-06' },
  ];
  state.pantry[walnut.id] = 30;
  return state;
}
describe('Kişisel malzeme sözlüğü', () => {
  it('özel malzeme referanslarını yalnızca o hesabın sözlüğüyle doğrular', () => {
    const state = fixture();
    expect(parseState(state).customIngredients).toEqual([walnut]);
    const recipe = state.recipes.at(-1)!;
    expect(recipeSchema.safeParse(recipe).success).toBe(false);
    expect(recipeSchemaFor(allIngredients(state)).safeParse(recipe).success).toBe(true);
    expect(() => parseState({ ...state, customIngredients: [] })).toThrow();
  });
  it('ortak katalog kimliği, yinelenen kimlik/ad ve kopuk kayıt reddedilir', () => {
    const state = fixture();
    for (const customIngredients of [
      [{ ...walnut, id: 'onion' }],
      [walnut, walnut],
      [walnut, { ...walnut, id: 'ingredient-other', name: ' CEVİZ İÇİ ' }],
    ])
      expect(() => parseState({ ...state, customIngredients })).toThrow();
    expect(() => parseState({ ...state, pantry: { unknown: 10 } })).toThrow();
    expect(
      reducer(state, {
        type: 'ingredient',
        value: { ...walnut, id: 'ingredient-other', name: 'Ceviz içi' },
      }),
    ).toBe(state);
  });
  it('gramlar porsiyonla birleştirilir; stok bir kez düşer ve malzeme araması çalışır', () => {
    const state = fixture();
    const dictionary = allIngredients(state);
    expect(buildShoppingList(state.meals, state.recipes, state.pantry, dictionary)).toEqual([
      expect.objectContaining({ name: 'Ceviz içi', totalGrams: 150, pantryGrams: 30, grams: 120 }),
    ]);
    const renamed = state.recipes.map((r) =>
      r.id === 'custom-walnut' ? { ...r, title: 'Kendi yemeğim' } : r,
    );
    expect(
      filterRecipes(renamed, 'ceviz', 'all', 'all', null, false, dictionary).map((r) => r.id),
    ).toEqual(['custom-walnut']);
  });
  it('metinden aktarım yeni malzemeyi tanır ve yedekle taşır', () => {
    const state = fixture();
    const draft = parseRecipeText(
      'Cevizli tarif\nPorsiyon: 2\nSüre: 10\nMalzemeler\n0,2 kg ceviz içi\nYapılışı\nCevizi ince doğra.',
      allIngredients(state),
    );
    expect(resolveImportRows(draft.rows, allIngredients(state))).toEqual([
      { ingredientId: walnut.id, quantity: 200, unit: 'g' },
    ]);
    expect(parseBackup(exportData(state)).state.customIngredients).toEqual([walnut]);
  });
  it('kullanılan malzemeyi silemez; kullanılmayan sıfır stok temizlenir', () => {
    const state = fixture();
    expect(ingredientUses(state, walnut.id)).toHaveLength(2);
    expect(reducer(state, { type: 'deleteIngredient', id: walnut.id })).toBe(state);
    const unused = reducer(initialState(), { type: 'ingredient', value: walnut });
    unused.pantry[walnut.id] = 0;
    const removed = reducer(unused, { type: 'deleteIngredient', id: walnut.id });
    expect(removed.customIngredients).toEqual([]);
    expect(removed.pantry).not.toHaveProperty(walnut.id);
  });
  it('ad değişikliği tarif bağlantısını korur, kayıtlı alışveriş adı değişmez', () => {
    const state = fixture();
    state.savedLists = [
      {
        id: 'list',
        name: 'Eski liste',
        week: '2026-10-05',
        createdAt: new Date().toISOString(),
        items: buildShoppingList(state.meals, state.recipes, state.pantry, allIngredients(state)),
        checked: [],
      },
    ];
    const renamed = reducer(state, {
      type: 'ingredient',
      value: { ...walnut, name: 'Kavrulmamış ceviz içi' },
    });
    expect(parseState(renamed).savedLists[0].items[0].name).toBe('Ceviz içi');
    expect(
      buildShoppingList(renamed.meals, renamed.recipes, renamed.pantry, allIngredients(renamed))[0]
        .name,
    ).toBe('Kavrulmamış ceviz içi');
  });
  it('eski kayıtlar boş kişisel sözlükle açılır', () => {
    const { customIngredients: _, ...legacy } = initialState();
    expect(parseState(legacy).customIngredients).toEqual([]);
  });
});
