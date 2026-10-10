import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { suggestDinners } from '../src/domain/planning';
import { weekDays } from '../src/domain/logic';
import { AppState, Meal } from '../src/domain/model';
import { parseState } from '../src/storage/schema';

const week = '2026-10-05';
const stateWithProfile = (): AppState => ({
  ...initialState(),
  profile: { people: 3, diets: [], budget: 'balanced' },
});
const existing: Meal = {
  id: 'existing',
  date: week,
  slot: 'dinner',
  recipeId: 'mercimek',
  servings: 6,
};

describe('Haftalık öneriler', () => {
  it('beş farklı yemeği ayrı akşamlara ve hane porsiyonuna yerleştirir', () => {
    const result = suggestDinners(stateWithProfile(), week, 5);
    expect(result.suggestions).toHaveLength(5);
    expect(new Set(result.suggestions.map((meal) => meal.recipeId)).size).toBe(5);
    expect(result.suggestions.map((meal) => meal.date)).toEqual(weekDays(week).slice(0, 5));
    expect(result.suggestions.every((meal) => meal.slot === 'dinner' && meal.servings === 3)).toBe(
      true,
    );
    expect(result.missingCount).toBe(0);
  });
  it('beslenme ve ekonomik tercihini seçenek az olsa da gevşetmez', () => {
    const state = stateWithProfile();
    // Keep this a scarcity case as the shipped catalog grows.
    state.recipes = state.recipes.filter((r) =>
      ['mercimek', 'bulgur', 'nohut', 'tavuk'].includes(r.id),
    );
    state.profile = { people: 2, diets: ['vegan', 'glutenFree'], budget: 'economic' };
    const result = suggestDinners(state, week, 7);
    for (const meal of result.suggestions) {
      const recipe = state.recipes.find((candidate) => candidate.id === meal.recipeId)!;
      expect(recipe.diets).toContain('vegan');
      expect(recipe.diets).toContain('glutenFree');
      expect(recipe.budget).toBe('economic');
    }
    expect(result.missingCount).toBe(7 - result.suggestions.length);
    expect(result.missingCount).toBeGreaterThan(0);
  });
  it('mevcut öğünleri korur, öğledeki yemeği tekrarlamaz ve diğer haftayı karıştırmaz', () => {
    const state = stateWithProfile();
    state.meals = [
      existing,
      { ...existing, id: 'lunch', slot: 'lunch', recipeId: 'bulgur' },
      { ...existing, id: 'next', date: '2026-10-12' },
    ];
    const before = JSON.stringify(state);
    const result = suggestDinners(state, week, 5);
    expect(result.existingCount).toBe(1);
    expect(result.suggestions).toHaveLength(4);
    expect(
      result.suggestions.every(
        (meal) => meal.date !== week && !['mercimek', 'bulgur'].includes(meal.recipeId),
      ),
    ).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('hedef doluyken daha az hedef seçilmesi mevcut yemekleri silmez', () => {
    const state = stateWithProfile();
    state.meals = weekDays(week).map((date, i) => ({ ...existing, id: String(i), date }));
    expect(suggestDinners(state, week, 3)).toMatchObject({
      suggestions: [],
      existingCount: 7,
      missingCount: 0,
    });
  });
  it('alternatif öneri farklı seçim verir; başlangıç verisini değiştirmez', () => {
    const state = stateWithProfile();
    const first = suggestDinners(state, week, 3, 0);
    expect(suggestDinners(state, week, 3, 1).suggestions).not.toEqual(first.suggestions);
    expect(suggestDinners(state, week, 3, 0)).toEqual(first);
    expect(state.meals).toEqual([]);
  });
  it('uygun tarif yokken açık eksik sayısı verir', () => {
    const state = stateWithProfile();
    state.profile!.diets = ['vegan'];
    state.recipes = state.recipes.filter((recipe) => recipe.id === 'tavuk');
    expect(suggestDinners(state, week, 5)).toMatchObject({ suggestions: [], missingCount: 5 });
  });
  it.each([0, 8, 1.5])('geçersiz akşam sayısını reddeder: %s', (target) => {
    expect(() => suggestDinners(stateWithProfile(), week, target)).toThrow('1–7');
  });
  it('profil olmadan öneri üretmez', () => {
    expect(() => suggestDinners(initialState(), week, 5)).toThrow('tercihleri');
  });
});

describe('Önerileri tek işlemde ekleme', () => {
  it('beklerken dolan öğünü ezmez ve çift tıklamada çoğaltmaz', () => {
    const state = stateWithProfile();
    const values = suggestDinners(state, week, 5).suggestions.map((meal, index) => ({
      ...meal,
      id: 'new-' + index,
    }));
    state.meals = [existing];
    const next = reducer(state, { type: 'addMeals', values: [...values, values[1]] });
    expect(next.meals).toHaveLength(5);
    expect(next.meals.find((meal) => meal.date === week)).toEqual(existing);
    expect(reducer(next, { type: 'addMeals', values })).toBe(next);
    expect(() => parseState(next)).not.toThrow();
    expect(next.savedLists).toBe(state.savedLists);
    expect(next.pantry).toBe(state.pantry);
  });
});
