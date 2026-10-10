import { AppState, Budget, Ingredient, Meal, Profile, Recipe, ShoppingItem } from './model';
import { ingredients } from '../data/catalog';

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(day: string, amount: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + amount, 12));
}
export function weekStart(day = localDate(new Date())): string {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = new Date(y, m - 1, d, 12).getDay();
  return addDays(day, -((weekday + 6) % 7));
}
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function dateLabel(
  day: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' },
): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('tr-TR', options);
}
export function grams(quantity: number, unit: 'g' | 'kg'): number {
  if (!Number.isFinite(quantity) || quantity < 0)
    throw new Error('Miktar sıfır veya pozitif olmalı.');
  if (unit !== 'g' && unit !== 'kg') throw new Error('Desteklenmeyen ağırlık birimi.');
  return quantity * (unit === 'kg' ? 1000 : 1);
}
export function amountLabel(amount: number): string {
  return `${amount.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} g`;
}
const round = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
export function buildShoppingList(
  meals: Meal[],
  recipes: Recipe[],
  pantry: Record<string, number>,
  dictionary: Ingredient[] = ingredients,
): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>();
  for (const meal of meals) {
    if (!Number.isInteger(meal.servings) || meal.servings < 1 || meal.servings > 12)
      throw new Error('Porsiyon 1–12 arasında olmalı.');
    const recipe = recipes.find((r) => r.id === meal.recipeId);
    if (!recipe || recipe.baseServings <= 0)
      throw new Error('Tarif bulunamadı veya porsiyonu geçersiz.');
    for (const part of recipe.ingredients) {
      const ingredient = dictionary.find((i) => i.id === part.ingredientId);
      if (!ingredient) throw new Error(`Bilinmeyen malzeme: ${part.ingredientId}`);
      const current = totals.get(ingredient.id) ?? {
        ingredientId: ingredient.id,
        name: ingredient.name,
        category: ingredient.category,
        totalGrams: 0,
        pantryGrams: 0,
        grams: 0,
        recipeTitles: [],
      };
      current.totalGrams += (grams(part.quantity, part.unit) * meal.servings) / recipe.baseServings;
      if (!current.recipeTitles.includes(recipe.title)) current.recipeTitles.push(recipe.title);
      totals.set(ingredient.id, current);
    }
  }
  return [...totals.values()]
    .map((item) => {
      const available = pantry[item.ingredientId] ?? 0;
      if (!Number.isFinite(available) || available < 0) throw new Error('Evdeki miktar geçersiz.');
      // Önce tüm öğünleri birleştir; evdeki miktarı yalnızca bir kez düş.
      const used = Math.min(available, item.totalGrams);
      return {
        ...item,
        totalGrams: round(item.totalGrams),
        pantryGrams: round(used),
        grams: round(Math.max(0, item.totalGrams - used)),
      };
    })
    .sort(
      (a, b) => a.category.localeCompare(b.category, 'tr') || a.name.localeCompare(b.name, 'tr'),
    );
}
export function itemKey(item: ShoppingItem): string {
  return `${item.ingredientId}:${item.grams}`;
}
export function mealsInWeek(state: Pick<AppState, 'meals'>, week: string): Meal[] {
  const days = weekDays(week);
  return state.meals.filter((m) => days.includes(m.date));
}
export function filterRecipes(
  recipes: Recipe[],
  query: string,
  diet: string,
  budget: Budget | 'all',
  profile: Profile | null,
  personalized: boolean,
  dictionary: Ingredient[] = ingredients,
) {
  return recipes.filter(
    (r) =>
      [
        r.title,
        ...r.ingredients.map((p) => dictionary.find((i) => i.id === p.ingredientId)?.name ?? ''),
      ].some((text) =>
        text.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR').trim()),
      ) &&
      (diet === 'all' || r.diets.includes(diet as never)) &&
      (budget === 'all' || r.budget === budget) &&
      (!personalized ||
        !profile ||
        (profile.diets.every((d) => r.diets.includes(d)) &&
          (profile.budget !== 'economic' || r.budget === 'economic'))),
  );
}
