import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { parseState, recipeSchema } from '../src/storage/schema';
import { equipmentKeys, matchesEquipment } from '../src/domain/equipment';
import { recipes } from '../src/data/catalog';
import { upgradeCatalog } from '../src/domain/discovery';
import { suggestDinners } from '../src/domain/planning';
import { eligibleContent } from '../src/domain/content';
import {
  importExample,
  importIngredient,
  parseRecipeText,
  resolveImportRows,
} from '../src/domain/recipeImport';
import { buildShoppingList } from '../src/domain/logic';

describe('Ekipman ve eski kayıt uyumu', () => {
  it('katalogdaki tüm tarifler cihaz gereksinimini belirtir; yöntemle eşleşir', () => {
    for (const recipe of recipes) {
      expect(recipe.equipment, recipe.id).toBeDefined();
      expect(matchesEquipment(recipe, equipmentKeys)).toBe(true);
      expect(recipeSchema.safeParse(recipe).success).toBe(true);
    }
    expect(recipes.find((r) => r.id === 'tavuk')!.equipment).toEqual(['hob']);
    expect(recipes.find((r) => r.id === 'brokoli')!.equipment).toEqual(['hob', 'blender']);
  });
  it('tercih belirtilmemiş, boş ve yalnız ocak durumlarını ayırır', () => {
    const recipe = recipes[0];
    expect(matchesEquipment(recipe, null)).toBe(true);
    expect(matchesEquipment(recipe, [])).toBe(false);
    expect(matchesEquipment(recipe, ['hob'])).toBe(false);
    expect(matchesEquipment({ ...recipe, equipment: [] }, [])).toBe(true);
    expect(matchesEquipment({ ...recipe, equipment: undefined }, ['hob'])).toBe(false);
  });
  it('öneriler ekipman kısıtını gevşetmez ve planı değiştirmez', () => {
    const state = initialState();
    state.profile = { people: 2, diets: [], budget: 'balanced' };
    state.experience.equipment = ['hob'];
    const suggestions = suggestDinners(state, '2026-10-05', 7);
    for (const meal of suggestions.suggestions)
      expect(
        matchesEquipment(
          state.recipes.find((r) => r.id === meal.recipeId)!,
          ['hob'],
        ),
      ).toBe(true);
    expect(eligibleContent(state).some((r) => r.id === 'mercimek')).toBe(false);
    expect(reducer(state, { type: 'experience', value: { equipment: [] } }).meals).toEqual(
      state.meals,
    );
  });
  it('eski kayda varsayılan ekler, değişmiş yöntem ve açık silme kararını korur', () => {
    const state = initialState();
    const { equipment: _, ...legacy } = state.experience;
    state.recipes.forEach((r) => delete r.equipment);
    state.recipes[1].steps = ['Tamamen farklı yöntem.'];
    state.recipes[2].equipment = null;
    const updated = upgradeCatalog(parseState({ ...state, experience: legacy }));
    expect(updated.experience.equipment).toBeNull();
    expect(updated.recipes[0].equipment).toEqual(['hob', 'blender']);
    expect(updated.recipes[1].equipment).toBeUndefined();
    expect(updated.recipes[2].equipment).toBeNull();
    expect(() =>
      parseState({ ...state, experience: { ...legacy, equipment: ['oven', 'oven'] } }),
    ).toThrow();
  });
});

describe('Metinden tarif aktarımı', () => {
  it.each([
    ['250 g soğan', 'onion', '250'],
    ['0,5 kg soğan', 'onion', '500'],
    ['1.000 g soğan', 'onion', '1000'],
    ['1 1/2 kg soğan', 'onion', '1500'],
    ['½ kg soğan', 'onion', '500'],
    ['1½ kg soğan', 'onion', '1500'],
    ['- 12 gram zeytinyağı', 'oil', '12'],
    ['300 g haşlanmış nohut', 'chickpea', '300'],
  ])('%s açık gram/kilo ölçüsünü dönüştürür', (text, id, amount) => {
    expect(importIngredient(text)).toMatchObject({ ingredientId: id, grams: amount, warning: '' });
  });
  it.each([
    '1 bardak süt',
    '100 ml süt',
    '2 adet yumurta',
    '-100 g soğan',
    '0 g soğan',
    '1/0 kg soğan',
    '1,2,3 g soğan',
  ])('%s ölçüsünü tahmin etmez', (text) => {
    expect(importIngredient(text).grams).toBe('');
  });
  it('çiğ/haşlanmış bakliyatı, belirsiz ya da bilinmeyen malzemeyi yanlış eşleştirmez', () => {
    expect(importIngredient('250 g nohut').ingredientId).toBe('');
    expect(importIngredient('250 g kuru nohut').ingredientId).toBe('');
    expect(importIngredient('250 g fındık').ingredientId).toBe('');
    expect(importIngredient('250 g biber').ingredientId).toBe('');
  });
  it('yapılış satırlarını korur; şablon dışı, eksik, aşırı uzun metni reddeder', () => {
    const draft = parseRecipeText(importExample.replace(/\n/g, '\r\n'));
    expect(draft).toMatchObject({ title: 'Soğanlı bulgur pilavım', servings: '4', minutes: '30' });
    expect(draft.rows).toHaveLength(5);
    expect(draft.steps.split('\n')).toHaveLength(4);
    expect(() => parseRecipeText('Bir tarif URL adresi')).toThrow();
    expect(() => parseRecipeText('x'.repeat(20001))).toThrow();
    expect(() => parseRecipeText('Tarif\nMalzemeler\nYapılışı\nPişir.')).toThrow();
  });
  it('eksik miktar ya da eşleşme kaydedilmez, aynı malzeme birleştirilip porsiyonlanır', () => {
    const rows = ['100 g soğan', '0,2 kg soğan'].map((line) => importIngredient(line));
    expect(resolveImportRows(rows)).toEqual([{ ingredientId: 'onion', quantity: 300, unit: 'g' }]);
    expect(() => resolveImportRows([...rows, importIngredient('2 adet yumurta')])).toThrow('3.');
    expect(() => resolveImportRows([importIngredient('1 g fındık')])).toThrow();
    const state = initialState();
    const recipe = {
      ...recipes[0],
      id: 'custom-import',
      baseServings: 4,
      ingredients: resolveImportRows(rows),
    };
    state.recipes.push(recipe);
    state.meals = [
      { id: 'm', date: '2026-10-05', slot: 'dinner', servings: 2, recipeId: recipe.id },
    ];
    state.pantry.onion = 50;
    const list = buildShoppingList(state.meals, state.recipes, state.pantry);
    expect(list[0]).toMatchObject({ totalGrams: 150, pantryGrams: 50, grams: 100 });
  });
});
