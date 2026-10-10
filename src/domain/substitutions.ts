import type { AppState, Recipe } from './model';
import { recipes as catalog } from '../data/catalog';
import { recipeFingerprint } from './companion';
import { matchesExperience } from './experience';

const variants = [
  {
    id: 'fasulye-nohut',
    recipeId: 'fasulye',
    from: 'bean',
    to: 'chickpea',
    title: 'Salçalı nohut yemeği',
    note: '700 g haşlanmış fasulye yerine 700 g haşlanmış nohut. Kuru bakliyat için geçerli değildir.',
    find: /fasulye/giu,
    word: 'nohut',
  },
  {
    id: 'coban-dereotu',
    recipeId: 'coban',
    from: 'parsley',
    to: 'dill',
    title: 'Dereotlu çoban salatası',
    note: '20 g maydanoz yerine 20 g dereotu. Yeşilliği aynı aşamada ekle.',
    find: /maydanozu|maydanoz/giu,
    word: 'dereotu',
  },
  {
    id: 'kisir-dereotu',
    recipeId: 'kisir',
    from: 'parsley',
    to: 'dill',
    title: 'Dereotlu kısır',
    note: '35 g maydanoz yerine 35 g dereotu. Diğer miktarlar ve dinlendirme süresi değişmez.',
    find: /maydanozu|maydanoz/giu,
    word: 'dereotu',
  },
] as const;
export function availableSubstitutions(state: AppState, recipe: Recipe) {
  const original = catalog.find((r) => r.id === recipe.id);
  if (!original || recipeFingerprint(original) !== recipeFingerprint(recipe)) return [];
  return variants
    .filter((v) => v.recipeId === recipe.id)
    .map((v) => ({
      ...v,
      recipe: {
        ...recipe,
        title: v.title,
        description: v.note,
        details: null,
        enrichment: null,
        photo: null,
        ingredients: recipe.ingredients.map((i) =>
          i.ingredientId === v.from ? { ...i, ingredientId: v.to } : { ...i },
        ),
        steps: recipe.steps.map((step) => step.replace(v.find, v.word)),
      } satisfies Recipe,
    }))
    .filter(
      (v) =>
        matchesExperience(v.recipe, state.experience) &&
        (state.profile?.diets ?? []).every((d) => v.recipe.diets.includes(d)),
    );
}
