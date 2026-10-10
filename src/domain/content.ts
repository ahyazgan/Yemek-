import { AppState, Recipe } from './model';
import { filterRecipes } from './logic';
import { matchesExperience } from './experience';

export function eligibleContent(state: AppState): Recipe[] {
  return filterRecipes(state.recipes, '', 'all', 'all', state.profile, true).filter((recipe) =>
    matchesExperience(recipe, state.experience),
  );
}
export function storyRecipes(state: AppState, ids: string[]) {
  const eligible = eligibleContent(state);
  return ids.flatMap((id) => {
    const recipe = eligible.find((r) => r.id === id);
    return recipe ? [recipe] : [];
  });
}
export function dailyRecipe(recipes: Recipe[], date = new Date()): Recipe | undefined {
  const mains = recipes.filter((r) => !['dessert', 'side', 'salad'].includes(r.category ?? 'main'));
  const candidates = mains.length ? mains : recipes;
  if (!candidates.length) return undefined;
  // Calendar date in the user's local timezone; stable for the whole day, without networking.
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return candidates[((day % candidates.length) + candidates.length) % candidates.length];
}
export function relatedRecipes(state: AppState, source: Recipe) {
  const ids = new Set(
    source.ingredients
      .map((p) => p.ingredientId)
      .filter((id) => !['water', 'salt', 'oil', 'blackpepper'].includes(id)),
  );
  return eligibleContent(state)
    .filter((r) => r.id !== source.id)
    .map((recipe) => ({
      recipe,
      score:
        (recipe.category === source.category ? 3 : 0) +
        recipe.ingredients.filter((p) => ids.has(p.ingredientId)).length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.recipe.minutes - b.recipe.minutes)
    .slice(0, 3)
    .map((r) => r.recipe);
}
