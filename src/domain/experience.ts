import { AppState, Experience, ExtraItem, Recipe, ShoppingItem } from './model';
import { amountLabel, itemKey } from './logic';
import { matchesEquipment } from './equipment';
export function matchesExperience(recipe: Recipe, preferences: Experience) {
  return (
    preferences.tools.feedback[recipe.id] !== 'avoid' &&
    matchesEquipment(recipe, preferences.equipment) &&
    (!preferences.maxMinutes || recipe.minutes <= preferences.maxMinutes) &&
    !recipe.ingredients.some((i) => preferences.excludedIngredients.includes(i.ingredientId))
  );
}
export function shoppingText(
  title: string,
  items: ShoppingItem[],
  checked: string[],
  extras: ExtraItem[] = [],
) {
  return (
    title +
    '\n\n' +
    [
      ...items.map(
        (i) => (checked.includes(itemKey(i)) ? '✓ ' : '☐ ') + i.name + ' · ' + amountLabel(i.grams),
      ),
      ...extras.map((i) => (i.checked ? '✓ ' : '☐ ') + i.name + ' · ' + i.quantity + ' ' + i.unit),
    ].join('\n')
  );
}
export function exportData(state: AppState) {
  return JSON.stringify(
    { application: 'Sofra', exportedAt: new Date().toISOString(), data: state },
    null,
    2,
  );
}
export function timerRemaining(deadline: number | null, now: number, paused: number) {
  return deadline === null ? paused : Math.max(0, Math.ceil((deadline - now) / 1000));
}
