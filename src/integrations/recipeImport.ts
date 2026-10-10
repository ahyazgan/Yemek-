import { z } from 'zod';
import { authMode, getSupabase } from './supabase';
import { recipeSourceSchema } from '../domain/recipeMedia';
export const urlImportEnabled =
  authMode === 'supabase' && process.env.EXPO_PUBLIC_RECIPE_IMPORT_ENABLED === 'true';
const resultSchema = z.object({
  sourceUrl: recipeSourceSchema.shape.url,
  recipes: z
    .array(
      z.object({
        title: z.string().min(2).max(100),
        author: z.string().max(200),
        servings: z.string().max(2),
        minutes: z.string().max(3),
        ingredients: z.array(z.string().min(1).max(500)).min(1).max(60),
        steps: z.array(z.string().min(3).max(2000)).min(1).max(40),
      }),
    )
    .min(1)
    .max(10),
});
export async function importRecipeUrl(url: string) {
  if (!urlImportEnabled)
    throw new Error('Bağlantıdan aktarım için Supabase hizmeti henüz kurulmadı.');
  if (!recipeSourceSchema.shape.url.safeParse(url.trim()).success)
    throw new Error('Geçerli bir HTTPS tarif bağlantısı gir.');
  const db = getSupabase();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user) throw new Error('Önce gerçek hesabına giriş yap.');
  const { data, error } = await db.functions.invoke('import-recipe', { body: { url: url.trim() } });
  if (error) {
    let message = 'Tarif aktarılamadı. Bağlantını ve desteklenen kaynağı kontrol et.';
    try {
      const payload = await error.context?.json();
      if (typeof payload?.message === 'string' && payload.message.length < 300)
        message = payload.message;
    } catch {
      /* Keep a usable fallback when the gateway response is not JSON. */
    }
    throw new Error(message);
  }
  const { data: current } = await db.auth.getUser();
  if (current.user?.id !== auth.user.id) throw new Error('Hesap değişti. Aktarımı yeniden başlat.');
  return resultSchema.parse(data);
}
