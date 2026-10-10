import { AppState, Meal } from './model';
import { filterRecipes, mealsInWeek, weekDays } from './logic';
import { matchesExperience } from './experience';

export type DinnerDraft = Omit<Meal, 'id'>;

// A local, deterministic suggestion. Never relaxes dietary preferences or overwrites a meal.
export function suggestDinners(state: AppState, week: string, target: number, variation = 0) {
  if (!Number.isInteger(target) || target < 1 || target > 7) {
    throw new Error('Akşam sayısı 1–7 arasında olmalı.');
  }
  if (!state.profile) throw new Error('Önce sofra tercihleri gerekli.');
  const current = mealsInWeek(state, week);
  const dinners = current.filter((meal) => meal.slot === 'dinner');
  const needed = Math.max(0, target - dinners.length);
  const used = new Set(current.map((meal) => meal.recipeId));
  const candidates = filterRecipes(state.recipes, '', 'all', 'all', state.profile, true).filter(
    (recipe) =>
      !used.has(recipe.id) &&
      matchesExperience(recipe, state.experience) &&
      !['dessert', 'salad', 'side'].includes(recipe.category ?? 'main'),
  );
  const seed = [...week].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const offset = candidates.length
    ? (((seed + variation) % candidates.length) + candidates.length) % candidates.length
    : 0;
  const ordered = [...candidates.slice(offset), ...candidates.slice(0, offset)].sort(
    (a, b) =>
      Number(state.experience.tools.feedback[b.id] === 'prefer') -
      Number(state.experience.tools.feedback[a.id] === 'prefer'),
  );
  const dates = weekDays(week).filter((date) => !dinners.some((meal) => meal.date === date));
  const suggestions: DinnerDraft[] = ordered.slice(0, needed).map((recipe, index) => ({
    date: dates[index],
    slot: 'dinner',
    recipeId: recipe.id,
    servings: state.profile!.people,
  }));
  return {
    suggestions,
    existingCount: dinners.length,
    missingCount: Math.max(0, needed - suggestions.length),
    candidateCount: candidates.length,
  };
}
