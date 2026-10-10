import { writeFileSync } from 'node:fs';
import { ingredients, recipes } from '../src/data/catalog';
import { grams } from '../src/domain/logic';
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const array = (values: string[]) => `array[${values.map(quote).join(',')}]::text[]`;
let sql = '-- Otomatik üretildi: npm run db:seed:generate. Kaynak: src/data/catalog.ts\n';
sql +=
  'insert into public.ingredients (id,name,category) values\n' +
  ingredients.map((i) => `(${quote(i.id)},${quote(i.name)},${quote(i.category)})`).join(',\n') +
  '\non conflict (id) do nothing;\n';
sql +=
  'insert into public.recipes (id,owner_id,published,title,description,minutes,base_servings,diets,budget,color,art,category,steps,details,equipment) values\n' +
  recipes
    .map(
      (r) =>
        `(${quote(r.id)},null,true,${quote(r.title)},${quote(r.description)},${r.minutes},${r.baseServings},${array(r.diets)},${quote(r.budget)},${quote(r.color)},${quote(r.art)},${quote(r.category ?? 'main')},${quote(JSON.stringify(r.steps))}::jsonb,${r.details ? quote(JSON.stringify(r.details)) + '::jsonb' : 'null'},${r.equipment ? array(r.equipment) : 'null'})`,
    )
    .join(',\n') +
  '\non conflict (id) do nothing;\n';
sql +=
  'insert into public.recipe_ingredients (recipe_id,ingredient_id,quantity_grams) values\n' +
  recipes
    .flatMap((r) =>
      r.ingredients.map(
        (p) => `(${quote(r.id)},${quote(p.ingredientId)},${grams(p.quantity, p.unit)})`,
      ),
    )
    .join(',\n') +
  '\non conflict (recipe_id,ingredient_id) do nothing;\n';
writeFileSync('supabase/seed.sql', sql, 'utf8');
console.log(
  `${recipes.length} tarif, ${ingredients.length} malzeme için supabase/seed.sql üretildi.`,
);
