import { ingredients } from '../data/catalog';
import { AppState } from './model';

export function allIngredients(state: Pick<AppState, 'customIngredients'>) {
  return [...ingredients, ...state.customIngredients];
}
export function ingredientNameKey(name: string) {
  return name.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}
export function ingredientUses(state: AppState, id: string): string[] {
  const uses: string[] = [];
  const recipes = state.recipes.filter((r) =>
    r.ingredients.some((p) => p.ingredientId === id),
  ).length;
  if (recipes) uses.push(`${recipes} tarifte kullanılıyor`);
  const lists = state.savedLists.filter((list) =>
    list.items.some((item) => item.ingredientId === id),
  ).length;
  if (lists) uses.push(`${lists} kayıtlı listede bulunuyor`);
  if ((state.pantry[id] ?? 0) > 0) uses.push('Evdeki miktarı sıfırdan büyük');
  if (state.experience.excludedIngredients.includes(id))
    uses.push('Damak zevki filtresinde seçili');
  return uses;
}
