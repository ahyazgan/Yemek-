import { z } from 'zod';
import { authMode, getSupabase } from './supabase';
import { recipeText } from '../domain/sharing';
import type { Ingredient, Recipe } from '../domain/model';
export const communityEnabled =
  authMode === 'supabase' && process.env.EXPO_PUBLIC_COMMUNITY_ENABLED === 'true';
export const communityProfileSchema = z.object({
  user_id: z.uuid(),
  handle: z.string().regex(/^[a-z][a-z0-9_]{2,29}$/),
  display_name: z.string().trim().min(2).max(60),
  bio: z.string().max(300),
  is_public: z.boolean(),
});
export type CommunityProfile = z.infer<typeof communityProfileSchema>;
const identitySchema = communityProfileSchema.omit({ bio: true });
const connectionSchema = identitySchema
  .omit({ is_public: true })
  .extend({ status: z.enum(['pending', 'accepted']), incoming: z.boolean() });
export type Connection = z.infer<typeof connectionSchema>;
const sharedRecipeSchema = z.object({
  title: z.string().min(2).max(100),
  servings: z.number().int().min(1).max(12),
  ingredients: z.array(z.string().max(300)).min(1).max(100),
  steps: z.array(z.string().max(2000)).min(1).max(100),
});
const postSchema = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  recipe: sharedRecipeSchema,
  created_at: z.iso.datetime({ offset: true }),
});
export type CommunityPost = z.infer<typeof postSchema>;
async function client() {
  if (!communityEnabled) throw new Error('Sofra:Arkadaşlık bağlantısı henüz ayarlanmadı.');
  const db = getSupabase();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error('Sofra:Önce gerçek hesabına giriş yap.');
  return { db, owner: data.user.id };
}
export async function communityHome() {
  const { db, owner } = await client();
  const [profile, connections, posts, blocks] = await Promise.all([
    db.from('community_profiles').select('*').eq('user_id', owner).maybeSingle(),
    db.rpc('community_connections'),
    db.from('community_posts').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('community_blocks').select('blocked_id').eq('owner_id', owner),
  ]);
  for (const result of [profile, connections, posts, blocks]) if (result.error) throw result.error;
  return {
    profile: profile.data ? communityProfileSchema.parse(profile.data) : null,
    connections: z.array(connectionSchema).parse(connections.data ?? []),
    posts: z.array(postSchema).parse(posts.data ?? []),
    blocked: z.array(z.object({ blocked_id: z.uuid() })).parse(blocks.data ?? []),
  };
}
export async function saveCommunityProfile(value: Omit<CommunityProfile, 'user_id'>) {
  const { db, owner } = await client();
  const row = communityProfileSchema.parse({ ...value, user_id: owner });
  const { error } = await db.from('community_profiles').upsert(row);
  if (error) throw error;
}
export async function findCommunityProfile(handle: string) {
  const { db } = await client();
  const { data, error } = await db.rpc('community_find', {
    person_handle: handle.trim().toLowerCase(),
  });
  if (error) throw error;
  return z.array(identitySchema).parse(data ?? []);
}
export async function communityAction(
  kind: 'request' | 'accept' | 'reject' | 'remove' | 'block' | 'unblock',
  person: string,
) {
  const { db } = await client();
  const args =
    kind === 'request'
      ? (['community_request', { person_handle: person }] as const)
      : kind === 'accept' || kind === 'reject'
        ? (['community_respond', { requester: person, accept_request: kind === 'accept' }] as const)
        : kind === 'remove'
          ? (['community_remove', { person }] as const)
          : (['community_block', { person, blocked: kind === 'block' }] as const);
  const { error } = await db.rpc(args[0], args[1]);
  if (error) throw error;
}
export function publicRecipe(recipe: Recipe, dictionary: Ingredient[]) {
  const lines = recipeText(recipe, dictionary, recipe.baseServings).split('\n');
  const start = lines.indexOf('Malzemeler'),
    end = lines.indexOf('Yapılışı');
  return sharedRecipeSchema.parse({
    title: recipe.title,
    servings: recipe.baseServings,
    ingredients: lines.slice(start + 1, end).filter(Boolean),
    steps: recipe.steps,
  });
}
export async function publishRecipe(recipe: Recipe, dictionary: Ingredient[]) {
  const { db, owner } = await client();
  const { error } = await db
    .from('community_posts')
    .insert({ owner_id: owner, recipe: publicRecipe(recipe, dictionary) });
  if (error) throw error;
}
export async function removeCommunityPost(id: string) {
  const { db, owner } = await client();
  const { error } = await db.from('community_posts').delete().eq('id', id).eq('owner_id', owner);
  if (error) throw error;
}
export async function reportCommunityProfile(target: string, reason: string) {
  if (reason.trim().length < 5 || reason.length > 500)
    throw new Error('Sofra:Bildirim nedeni 5–500 karakter olmalı.');
  const { db, owner } = await client();
  const { error } = await db
    .from('community_reports')
    .insert({ reporter_id: owner, target_id: target, reason: reason.trim() });
  if (error) throw error;
}
