import type { AppState, ExtraItem, Meal, Recipe, ShoppingItem } from './model';
import { buildShoppingList, grams, mealsInWeek, weekDays, filterRecipes } from './logic';
import { allIngredients } from './ingredients';
import { matchesExperience } from './experience';

export type PriceNote = { cents: number; packageGrams: number; recordedOn: string; source: string };
export type PantryDate = { date: string; kind: 'expiry' | 'opened' };
export type CookSession = {
  fingerprint: string;
  step: number;
  servings: number;
  deadline: number | null;
  seconds: number;
};
export type Staple = Pick<ExtraItem, 'id' | 'name' | 'quantity' | 'unit'>;
export type Companion = {
  budgets: Record<string, { totalCents: number; extrasCents: number }>;
  prices: Record<string, PriceNote>;
  expenses: { id: string; date: string; cents: number; store: string; note: string }[];
  staples: Staple[];
  pantryDates: Record<string, PantryDate>;
  feedback: Record<string, 'prefer' | 'avoid'>;
  cooking: Record<string, CookSession>;
  prepChecks: Record<string, string[]>;
};
export const emptyCompanion = (): Companion => ({
  budgets: {},
  prices: {},
  expenses: [],
  staples: [],
  pantryDates: {},
  feedback: {},
  cooking: {},
  prepChecks: {},
});
export const money = (cents: number) =>
  (cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  ' TL';
export function parseMoney(text: string): number | null {
  if (!/^\d{1,7}([,.]\d{1,2})?$/.test(text.trim())) return null;
  const cents = Math.round(Number(text.replace(',', '.')) * 100);
  return Number.isSafeInteger(cents) && cents <= 100000000 ? cents : null;
}
export function estimateBasket(items: ShoppingItem[], prices: Companion['prices']) {
  const lines = items
    .filter((i) => i.grams > 0 && i.ingredientId !== 'water')
    .map((item) => {
      const price = prices[item.ingredientId];
      const packages = price ? Math.ceil(item.grams / price.packageGrams) : null;
      return {
        ...item,
        price,
        packages,
        cents: price && packages !== null ? packages * price.cents : null,
      };
    });
  return {
    lines,
    cents: lines.reduce((sum, i) => sum + (i.cents ?? 0), 0),
    missing: lines.filter((i) => i.cents === null).length,
  };
}
export function recipeCost(recipe: Recipe, servings: number, prices: Companion['prices']) {
  let cents = 0;
  let missing = 0;
  for (const part of recipe.ingredients) {
    if (part.ingredientId === 'water') continue;
    const price = prices[part.ingredientId];
    if (!price) {
      missing++;
      continue;
    }
    cents +=
      ((grams(part.quantity, part.unit) * servings) / recipe.baseServings / price.packageGrams) *
      price.cents;
  }
  return { cents: Math.round(cents), missing };
}
export function weeklyEstimate(state: AppState, week: string, meals = mealsInWeek(state, week)) {
  return estimateBasket(
    buildShoppingList(meals, state.recipes, state.pantry, allIngredients(state)),
    state.experience.tools.prices,
  );
}
// Never treats missing prices as free, relaxes preferences, or modifies existing meals.
export function budgetDinners(state: AppState, week: string, target: number) {
  if (!state.profile || !Number.isInteger(target) || target < 1 || target > 7)
    throw new Error('Menü hedefi geçersiz.');
  const budget = state.experience.tools.budgets[week];
  const current = mealsInWeek(state, week);
  const existing = current.filter((m) => m.slot === 'dinner');
  const dates = weekDays(week).filter((d) => !existing.some((m) => m.date === d));
  const suggestions: Meal[] = [];
  const cap = budget ? budget.totalCents - budget.extrasCents : null;
  let candidates = filterRecipes(state.recipes, '', 'all', 'all', state.profile, true).filter(
    (r) =>
      matchesExperience(r, state.experience) &&
      !current.some((m) => m.recipeId === r.id) &&
      !['dessert', 'salad', 'side'].includes(r.category ?? 'main'),
  );
  while (suggestions.length < Math.max(0, target - existing.length) && candidates.length) {
    const ranked = candidates
      .map((r) => {
        const meal: Meal = {
          id: `budget-${week}-${r.id}`,
          recipeId: r.id,
          date: dates[suggestions.length],
          slot: 'dinner',
          servings: state.profile!.people,
        };
        return { meal, estimate: weeklyEstimate(state, week, [...current, ...suggestions, meal]) };
      })
      .filter((i) => i.estimate.missing === 0 && (cap === null || i.estimate.cents <= cap))
      .sort(
        (a, b) =>
          a.estimate.cents - b.estimate.cents || a.meal.recipeId.localeCompare(b.meal.recipeId),
      );
    if (!ranked.length) break;
    suggestions.push(ranked[0].meal);
    candidates = candidates.filter((r) => r.id !== ranked[0].meal.recipeId);
  }
  return {
    suggestions,
    missingCount: Math.max(0, target - existing.length - suggestions.length),
    estimate: weeklyEstimate(state, week, [...current, ...suggestions]),
  };
}
export function recipeFingerprint(recipe: Recipe) {
  return JSON.stringify([recipe.ingredients, recipe.steps, recipe.baseServings, recipe.minutes]);
}
export function preparationTasks(state: AppState, week: string) {
  const meals = mealsInWeek(state, week);
  return [...new Set(meals.map((m) => m.recipeId))].flatMap((id) => {
    const recipe = state.recipes.find((r) => r.id === id)!;
    const servings = meals.filter((m) => m.recipeId === id).reduce((sum, m) => sum + m.servings, 0);
    const signature = recipeFingerprint(recipe);
    return recipe.steps.map((text, step) => ({
      key: JSON.stringify([id, servings, signature, step]),
      recipe,
      servings,
      text,
      step,
    }));
  });
}
export function applyStaples(state: AppState, week: string): ExtraItem[] {
  return state.experience.tools.staples
    .map((item) => ({ ...item, id: `${item.id}:${week}`, week, checked: false }))
    .filter((item) => !state.experience.extras.some((i) => i.id === item.id));
}
export function pantryDateLabel(value: PantryDate, today: string) {
  if (value.kind === 'opened') return `Açılma tarihi: ${value.date}`;
  return value.date < today
    ? `Girilen tarih geçti: ${value.date}`
    : `Etiketteki tarih: ${value.date}`;
}
