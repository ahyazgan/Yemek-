import { statSync } from 'node:fs';
import { recipes, ingredients } from '../src/data/catalog';
import { stories } from '../src/data/stories';
import { initialState } from '../src/domain/state';
import { parseState } from '../src/storage/schema';
import { ingredientNameKey } from '../src/domain/ingredients';
import { photoAliases } from '../src/data/catalog-airfryer';
parseState(initialState());
if (new Set(ingredients.map((i) => ingredientNameKey(i.name))).size !== ingredients.length)
  throw new Error('Katalogda tekrarlanan malzeme adı var.');
let imageBytes = 0;
for (const recipe of recipes) {
  if (new Set(recipe.ingredients.map((i) => i.ingredientId)).size !== recipe.ingredients.length)
    throw new Error(recipe.id + ': aynı malzeme tekrarlanıyor.');
  if (!recipe.details || recipe.equipment == null || !recipe.details.tips.length)
    throw new Error(recipe.id + ': yayın ayrıntıları/ekipman eksik.');
  if (!photoAliases[recipe.id]) imageBytes += statSync('assets/recipes/' + recipe.id + '.png').size;
  else statSync('assets/recipes/' + photoAliases[recipe.id] + '.png');
}
for (const story of stories)
  for (const id of [story.cover, ...story.recipeIds])
    if (!recipes.some((r) => r.id === id)) throw new Error(story.id + ': bilinmeyen tarif ' + id);
console.log(
  JSON.stringify(
    {
      status: 'passed',
      recipes: recipes.length,
      ingredients: ingredients.length,
      stories: stories.length,
      imageMiB: +(imageBytes / 1024 / 1024).toFixed(2),
      note: 'Şema ve ilişkiler doğrulandı. Mutfak denemesi, alerjen etiketi veya canlı yayın onayı değildir.',
    },
    null,
    2,
  ),
);
