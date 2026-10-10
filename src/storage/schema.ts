import { z } from 'zod';
import { ingredients } from '../data/catalog';
import { AppState, Ingredient } from '../domain/model';
import { ingredientNameKey } from '../domain/ingredients';
import { companionSchema } from './companionSchema';
import { householdDemoSchema } from '../domain/household';
import {
  photoSchema,
  photoUsage,
  MAX_PHOTOS_LENGTH,
  recipeSourceSchema,
} from '../domain/recipeMedia';
const id = z.string().min(1);
const ingredientId = id;
const amount = z.number().finite().min(0).max(10000000);
const diet = z.enum(['vegetarian', 'vegan', 'glutenFree']);
const budget = z.enum(['economic', 'balanced', 'flexible']);
const equipment = z
  .array(z.enum(['hob', 'oven', 'blender', 'fridge', 'airfryer', 'multicooker']))
  .max(6)
  .refine((items) => new Set(items).size === items.length, 'Ekipmanlar yinelenemez');
const category = z.enum([
  'Sebze & meyve',
  'Bakliyat & tahıl',
  'Süt & yumurta',
  'Et & tavuk',
  'Temel gıda',
]);
export const customIngredientSchema = z.object({
  id: z
    .string()
    .regex(/^ingredient-[a-zA-Z0-9-]+$/)
    .max(100),
  name: z.string().trim().min(2).max(100),
  category,
});
const date = z.iso.date();
export const extraSchema = z.object({
  id,
  week: date,
  name: z.string().trim().min(1).max(100),
  quantity: z.number().finite().positive().max(1000000),
  unit: z.enum(['adet', 'paket', 'g', 'ml']),
  checked: z.boolean(),
});
export const experienceSchema = z.object({
  tools: companionSchema.prefault({}),
  equipment: equipment.nullable().default(null),
  collections: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(1).max(60),
        recipeIds: z.array(id),
      }),
    )
    .default([]),
  favorites: z.array(id).default([]),
  excludedIngredients: z.array(ingredientId).default([]),
  maxMinutes: z.number().int().min(5).max(600).nullable().default(null),
  extras: z.array(extraSchema).default([]),
  cooked: z
    .array(
      z.object({
        id,
        recipeId: id,
        at: z.iso.datetime(),
        rating: z.number().int().min(0).max(5),
        note: z.string().max(600),
      }),
    )
    .default([]),
  preferredMarket: z.enum(['migros', 'trendyol', 'carrefoursa']).nullable().default(null),
  reminder: z
    .object({
      enabled: z.boolean(),
      day: z.number().int().min(0).max(6),
      time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .default({ enabled: false, day: 0, time: '18:00' }),
});
export const profileSchema = z.object({
  people: z.number().int().min(1).max(12),
  diets: z.array(diet),
  budget,
});
const recipeRecordSchema = z
  .object({
    photo: photoSchema.nullable().optional(),
    source: recipeSourceSchema.nullable().optional(),
    enrichment: z
      .object({
        fingerprint: z.string().max(200000),
        video: z
          .object({
            url: z
              .url()
              .max(2000)
              .refine((value) => {
                const u = new URL(value);
                return u.protocol === 'https:' && !u.username && !u.password;
              }),
            credit: z.string().trim().min(2).max(200),
          })
          .nullable(),
        nutrition: z
          .object({
            kcal: z.number().finite().min(0).max(10000),
            protein: z.number().finite().min(0).max(1000),
            carbs: z.number().finite().min(0).max(1000),
            fat: z.number().finite().min(0).max(1000),
            source: z.string().trim().min(3).max(300),
            recordedOn: z.iso.date(),
          })
          .nullable(),
      })
      .nullable()
      .optional(),
    equipment: equipment.nullable().optional(),
    details: z
      .object({
        prepMinutes: z.number().int().min(0).max(600),
        cookMinutes: z.number().int().min(0).max(600),
        restMinutes: z.number().int().min(0).max(600),
        difficulty: z.enum(['easy', 'medium']),
        tips: z.array(z.string().trim().min(3).max(600)).max(8),
        servingSuggestion: z.string().trim().max(600),
      })
      .nullable()
      .optional(),
    category: z.enum(['main', 'soup', 'breakfast', 'salad', 'side', 'dessert']).optional(),
    id,
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().min(5).max(600),
    minutes: z.number().int().min(1).max(600),
    baseServings: z.number().int().min(1).max(12),
    diets: z.array(diet),
    budget,
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    art: z.enum(['soup', 'rice', 'stew', 'greens', 'eggs']),
    ingredients: z
      .array(
        z.object({
          ingredientId,
          quantity: amount.refine((n) => n > 0),
          unit: z.enum(['g', 'kg']),
        }),
      )
      .min(1),
    steps: z.array(z.string().trim().min(3).max(2000)).min(1),
  })
  .superRefine((recipe, ctx) => {
    const d = recipe.details;
    if (d && d.prepMinutes + d.cookMinutes + d.restMinutes !== recipe.minutes)
      ctx.addIssue({
        code: 'custom',
        path: ['details'],
        message: 'Hazırlık, pişirme ve bekleme sürelerinin toplamı toplam süreye eşit olmalı.',
      });
  });
export function recipeSchemaFor(dictionary: Ingredient[] = ingredients) {
  const known = new Set(dictionary.map((item) => item.id));
  return recipeRecordSchema.superRefine((recipe, ctx) => {
    if (recipe.ingredients.some((part) => !known.has(part.ingredientId)))
      ctx.addIssue({ code: 'custom', message: 'Bilinmeyen malzeme' });
  });
}
export const recipeSchema = recipeSchemaFor();
const item = z.object({
  ingredientId,
  name: z.string(),
  category,
  totalGrams: amount,
  pantryGrams: amount,
  grams: amount,
  recipeTitles: z.array(z.string()),
});
export const stateSchema = z
  .object({
    householdDemo: householdDemoSchema.nullable().optional(),
    customIngredients: z.array(customIngredientSchema).max(300).default([]),
    version: z.literal(1),
    experience: experienceSchema.prefault({}),
    profile: profileSchema.nullable(),
    recipes: z.array(recipeRecordSchema).min(1),
    meals: z.array(
      z.object({
        id,
        date,
        slot: z.enum(['lunch', 'dinner']),
        recipeId: id,
        servings: z.number().int().min(1).max(12),
      }),
    ),
    pantry: z.record(ingredientId, amount),
    checked: z.record(date, z.array(z.string())),
    savedLists: z.array(
      z.object({
        id,
        name: z.string().trim().min(1).max(100),
        createdAt: z.iso.datetime(),
        week: date,
        items: z.array(item),
        extras: z.array(extraSchema).optional(),
        checked: z.array(z.string()),
      }),
    ),
  })
  .superRefine((state, ctx) => {
    if (photoUsage(state.recipes) > MAX_PHOTOS_LENGTH)
      ctx.addIssue({ code: 'custom', message: 'Tarif fotoğrafları toplam alan sınırını aşıyor.' });
    const dictionary = [...ingredients, ...state.customIngredients];
    const known = new Set(dictionary.map((item) => item.id));
    if (
      known.size !== dictionary.length ||
      new Set(dictionary.map((item) => ingredientNameKey(item.name))).size !== dictionary.length
    )
      ctx.addIssue({ code: 'custom', message: 'Malzeme kimliği veya adı yineleniyor.' });
    if (
      state.recipes.some((r) => r.ingredients.some((p) => !known.has(p.ingredientId))) ||
      Object.keys(state.pantry).some((key) => !known.has(key)) ||
      state.experience.excludedIngredients.some((key) => !known.has(key)) ||
      state.savedLists.some((list) => list.items.some((item) => !known.has(item.ingredientId)))
    )
      ctx.addIssue({ code: 'custom', message: 'Bilinmeyen malzemeye bağlı kayıt var.' });
    const recipeIds = new Set(state.recipes.map((r) => r.id));
    const tools = state.experience.tools;
    if (
      [...Object.keys(tools.prices), ...Object.keys(tools.pantryDates)].some(
        (key) => !known.has(key),
      ) ||
      [...Object.keys(tools.feedback), ...Object.keys(tools.cooking)].some(
        (key) => !recipeIds.has(key),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Bütçe veya mutfak kaydının bağlantısı geçersiz.' });
    const slots = state.meals.map((m) => `${m.date}:${m.slot}`);
    const collectionIds = state.experience.collections.map((c) => c.id);
    if (
      new Set(collectionIds).size !== collectionIds.length ||
      state.experience.collections.some(
        (c) =>
          new Set(c.recipeIds).size !== c.recipeIds.length ||
          c.recipeIds.some((id) => !recipeIds.has(id)),
      )
    ) {
      ctx.addIssue({ code: 'custom', message: 'Koleksiyon ilişkileri geçersiz.' });
    }
    if (
      recipeIds.size !== state.recipes.length ||
      new Set(slots).size !== slots.length ||
      state.meals.some((m) => !recipeIds.has(m.recipeId))
    )
      ctx.addIssue({ code: 'custom', message: 'Tarif/plan ilişkileri geçersiz.' });
  });
export function parseState(value: unknown): AppState {
  return stateSchema.parse(value);
}
