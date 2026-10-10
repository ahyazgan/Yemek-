import { AppState, Recipe, RecipeCategory } from './model';
import { grams } from './logic';
import { recipes as catalog } from '../data/catalog';

export const recipeCategoryLabels: Record<RecipeCategory, string> = {
  main: 'Ana yemek',
  soup: 'Çorba',
  breakfast: 'Kahvaltı',
  salad: 'Salata',
  side: 'Yan yemek',
  dessert: 'Tatlı',
};
export type DiscoveryTheme = 'all' | 'quick' | 'economic' | 'plant' | RecipeCategory;
export const discoveryThemes: {
  id: DiscoveryTheme;
  title: string;
  subtitle: string;
  cover: string;
  color: string;
}[] = [
  {
    id: 'quick',
    title: 'Vaktim az',
    subtitle: '20 dakika ve altında',
    cover: 'makarna',
    color: '#FAD8CE',
  },
  {
    id: 'economic',
    title: 'Bereketli sofralar',
    subtitle: 'Ekonomik tarif fikirleri',
    cover: 'nohut',
    color: '#F9E9AD',
  },
  {
    id: 'plant',
    title: 'Bol bol sebze',
    subtitle: 'Bitkisel tarifleri keşfet',
    cover: 'kisir',
    color: '#DEE8CB',
  },
  {
    id: 'breakfast',
    title: 'Kahvaltı keyfi',
    subtitle: 'Güne güzel başla',
    cover: 'omlet',
    color: '#E7DEF0',
  },
];
export function matchesTheme(recipe: Recipe, theme: DiscoveryTheme) {
  if (theme === 'all') return true;
  if (theme === 'quick') return recipe.minutes <= 20;
  if (theme === 'economic') return recipe.budget === 'economic';
  if (theme === 'plant') return recipe.diets.includes('vegan');
  return (recipe.category ?? 'main') === theme;
}
// Add new catalog entries without changing a user's edits, meals or custom recipes.
export function upgradeCatalog(state: AppState): AppState {
  const existing = new Set(state.recipes.map((r) => r.id));
  return {
    ...state,
    recipes: [
      ...state.recipes.map((r) => {
        const original = catalog.find((c) => c.id === r.id);
        // Only enrich unchanged cooking content. Never attach outdated advice to a user's edits.
        const compatible =
          original &&
          r.minutes === original.minutes &&
          r.baseServings === original.baseServings &&
          JSON.stringify(r.ingredients) === JSON.stringify(original.ingredients) &&
          JSON.stringify(r.steps) === JSON.stringify(original.steps);
        return {
          ...r,
          category: r.category ?? original?.category ?? 'main',
          ...(r.equipment === undefined && compatible && original.equipment
            ? { equipment: [...original.equipment] }
            : {}),
          ...(r.details === undefined && compatible && original.details
            ? { details: { ...original.details, tips: [...original.details.tips] } }
            : {}),
        };
      }),
      ...catalog
        .filter((r) => !existing.has(r.id))
        .map((r) => ({
          ...r,
          ingredients: r.ingredients.map((i) => ({ ...i })),
          steps: [...r.steps],
          diets: [...r.diets],
          ...(r.equipment ? { equipment: [...r.equipment] } : {}),
          ...(r.details ? { details: { ...r.details, tips: [...r.details.tips] } } : {}),
        })),
    ],
  };
}
export function pantryMatch(recipe: Recipe, pantry: AppState['pantry'], servings: number) {
  const required = new Map<string, number>();
  for (const item of recipe.ingredients) {
    if (item.ingredientId === 'water') continue; // Water is shown in the recipe, not a pantry purchase.
    required.set(
      item.ingredientId,
      (required.get(item.ingredientId) ?? 0) +
        (grams(item.quantity, item.unit) * servings) / recipe.baseServings,
    );
  }
  const parts = [...required].map(([ingredientId, needed]) => ({
    ingredientId,
    needed,
    available: Math.min(needed, Math.max(0, pantry[ingredientId] ?? 0)),
    missing: Math.max(0, needed - Math.max(0, pantry[ingredientId] ?? 0)),
  }));
  const covered = parts.filter((p) => p.missing < 0.0001).length;
  const partial = parts.filter((p) => p.available > 0).length;
  return {
    parts,
    covered,
    partial,
    total: parts.length,
    missing: parts.length - covered,
    ratio: parts.length ? covered / parts.length : 0,
  };
}
export function pantrySuggestions(recipes: Recipe[], pantry: AppState['pantry'], servings: number) {
  return recipes
    .map((recipe) => ({ recipe, match: pantryMatch(recipe, pantry, servings) }))
    .filter((r) => r.match.partial > 0)
    .sort(
      (a, b) =>
        b.match.ratio - a.match.ratio ||
        a.match.missing - b.match.missing ||
        a.recipe.minutes - b.recipe.minutes,
    );
}
