import type { Ingredient } from './model';
import { importIngredient, type ImportDraft } from './recipeImport';
import type { PageRecipe } from '../../supabase/functions/_shared/recipePage';
export { extractPageRecipes } from '../../supabase/functions/_shared/recipePage';
export type { PageRecipe } from '../../supabase/functions/_shared/recipePage';
export function pageRecipeDraft(recipe: PageRecipe, dictionary: Ingredient[]): ImportDraft {
  return {
    title: recipe.title,
    servings: recipe.servings,
    minutes: recipe.minutes,
    rows: recipe.ingredients.map((row) => importIngredient(row, dictionary)),
    steps: recipe.steps.join('\n'),
  };
}
