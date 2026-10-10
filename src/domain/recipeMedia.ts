import { z } from 'zod';
import type { AppState, Recipe } from './model';
export const MAX_PHOTO_LENGTH = 220000;
export const MAX_PHOTOS_LENGTH = 2000000;
export const photoSchema = z.object({
  dataUri: z
    .string()
    .max(MAX_PHOTO_LENGTH)
    .regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/),
  width: z.number().int().min(1).max(720),
  height: z.number().int().min(1).max(720),
  caption: z.string().trim().max(140),
});
export type RecipePhoto = z.infer<typeof photoSchema>;
export const recipeSourceSchema = z.object({
  url: z
    .url()
    .max(2000)
    .refine((value) => {
      const u = new URL(value);
      return u.protocol === 'https:' && !u.username && !u.password && !u.port;
    }),
  author: z.string().trim().max(200),
  importedAt: z.iso.datetime(),
});
export function photoUsage(recipes: Recipe[]) {
  return recipes.reduce((total, recipe) => total + (recipe.photo?.dataUri.length ?? 0), 0);
}
export function withRecipePhoto(state: AppState, id: string, photo: RecipePhoto | null): Recipe {
  const current = state.recipes.find((r) => r.id === id);
  if (!current) throw new Error('Tarif artık mevcut değil.');
  const next = { ...current, photo: photo ? photoSchema.parse(photo) : null };
  if (
    photoUsage(state.recipes.filter((r) => r.id !== id)) + (next.photo?.dataUri.length ?? 0) >
    MAX_PHOTOS_LENGTH
  )
    throw new Error('Fotoğraf alanın doldu. Önce kullanmadığın tarif fotoğraflarını kaldır.');
  return next;
}
