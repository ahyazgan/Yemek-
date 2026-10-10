import { AppState, Ingredient, Recipe } from './model';
import { dateLabel, grams, mealsInWeek } from './logic';

export function recipeText(recipe: Recipe, dictionary: Ingredient[], servings: number) {
  if (!Number.isInteger(servings) || servings < 1 || servings > 12)
    throw new Error('Porsiyon 1–12 arasında olmalı.');
  const lines = recipe.ingredients.map((part) => {
    const item = dictionary.find((i) => i.id === part.ingredientId);
    if (!item) throw new Error('Tarifte bilinmeyen malzeme var.');
    const amount =
      Math.round(((grams(part.quantity, part.unit) * servings) / recipe.baseServings) * 100) / 100;
    return `${String(amount).replace('.', ',')} g ${item.name}`;
  });
  return [
    recipe.title,
    `Porsiyon: ${servings}`,
    `Süre: ${recipe.minutes} dk`,
    ...(recipe.source
      ? [
          'Kaynak: ' + recipe.source.url,
          ...(recipe.source.author ? ['Yazar: ' + recipe.source.author] : []),
        ]
      : []),
    '',
    'Malzemeler',
    ...lines,
    '',
    'Yapılışı',
    ...recipe.steps.map((step, i) => `${i + 1}. ${step}`),
  ].join('\n');
}
export function menuText(state: AppState, week: string) {
  const meals = mealsInWeek(state, week)
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || (a.slot === b.slot ? 0 : a.slot === 'lunch' ? -1 : 1),
    );
  return [
    `Haftanın menüsü · ${dateLabel(week, { day: 'numeric', month: 'long' })}`,
    ...meals.map(
      (meal) =>
        `${dateLabel(meal.date, { weekday: 'long' })} · ${meal.slot === 'lunch' ? 'Öğle' : 'Akşam'}: ${state.recipes.find((r) => r.id === meal.recipeId)?.title ?? 'Tarif'} (${meal.servings} kişilik)`,
    ),
    '',
    'Paylaşıldığı andaki menü kopyasıdır; sonraki değişiklikler otomatik güncellenmez.',
  ].join('\n');
}
export function recipeUses(state: AppState, id: string) {
  return [
    ...(state.meals.some((m) => m.recipeId === id) ? ['menü planında'] : []),
    ...(state.experience.cooked.some((m) => m.recipeId === id) ? ['pişirme geçmişinde'] : []),
  ];
}
