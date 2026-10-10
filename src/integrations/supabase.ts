import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { parseState } from '../storage/schema';
import { AppState } from '../domain/model';
import { CloudCopy, SnapshotConflictError } from '../domain/sync';
import { upgradeCatalog } from '../domain/discovery';
import { ensureNotAborted, withDeadline } from './deadline';

export const authMode = process.env.EXPO_PUBLIC_AUTH_MODE === 'supabase' ? 'supabase' : 'demo';
let client: SupabaseClient | null = null;
const storage =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };
export function getSupabase() {
  if (authMode !== 'supabase') throw new Error('Sofra:Demo modunda bulut bağlantısı kapalı.');
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https:\/\//.test(url))
    throw new Error('Sofra:Supabase bağlantısı henüz ayarlanmadı.');
  client = createClient(url, key, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}
export function authRedirect(path: 'auth/callback' | 'reset-password') {
  const base = process.env.EXPO_PUBLIC_AUTH_REDIRECT_BASE;
  if (!base) throw new Error('Sofra:Giriş dönüş adresi henüz ayarlanmadı.');
  return base.replace(/\/$/, '') + '/' + path;
}
async function assertCloudOwner(owner: string, signal: AbortSignal) {
  const db = getSupabase();
  const { data: auth, error: authError } = await db.auth.getUser();
  ensureNotAborted(signal);
  if (authError || auth.user?.id !== owner)
    throw new Error('Sofra:Hesap oturumu değişti veya doğrulanamadı. Yeniden giriş yap.');
  return db;
}
async function assertCurrentOwner(db: SupabaseClient, owner: string, signal: AbortSignal) {
  ensureNotAborted(signal);
  const { data, error } = await db.auth.getSession();
  ensureNotAborted(signal);
  if (error || data.session?.user.id !== owner)
    throw new Error('Sofra:Hesap değişti. Eşitlemeyi tekrar başlat.');
}
export async function writeCloudSnapshot(
  owner: string,
  state: AppState,
  expectedRevision: number,
): Promise<CloudCopy> {
  return withDeadline(async (signal) => {
    const db = await assertCloudOwner(owner, signal);
    await assertCurrentOwner(db, owner, signal);
    const payload = parseState(state);
    const { data, error } = await db
      .rpc('save_app_snapshot', {
        expected_owner: owner,
        expected_revision: expectedRevision,
        new_payload: payload,
      })
      .abortSignal(signal)
      .single();
    await assertCurrentOwner(db, owner, signal);
    if (error?.code === '40001') throw new SnapshotConflictError();
    if (error) throw error;
    const row = data as { revision?: unknown; updated_at?: unknown } | null;
    const revision = Number(row?.revision);
    const updatedAt = String(row?.updated_at ?? '');
    if (!Number.isSafeInteger(revision) || revision < 1 || !Number.isFinite(Date.parse(updatedAt)))
      throw new Error('Sofra:Bulut yanıtı doğrulanamadı. Yeniden kontrol et.');
    return { state: payload, revision, updatedAt: new Date(updatedAt).toISOString() };
  }, 'Sofra:Bulut yanıtı gecikti. Kayıt sunucuya ulaşmış olabilir; yeniden eşitlemede güncel kopya önce kontrol edilir.');
}
export async function readCloudSnapshot(owner: string): Promise<CloudCopy | null> {
  return withDeadline(async (signal) => {
    const db = await assertCloudOwner(owner, signal);
    await assertCurrentOwner(db, owner, signal);
    const { data, error } = await db
      .from('app_snapshots')
      .select('payload,updated_at,revision')
      .eq('owner_id', owner)
      .abortSignal(signal)
      .maybeSingle();
    await assertCurrentOwner(db, owner, signal);
    if (error) throw error;
    if (!data) return null;
    const revision = Number(data.revision);
    if (
      !Number.isSafeInteger(revision) ||
      revision < 1 ||
      !Number.isFinite(Date.parse(data.updated_at))
    )
      throw new Error('Sofra:Bulut kopyasının sürüm bilgisi okunamadı.');
    return {
      state: upgradeCatalog(parseState(data.payload)),
      revision,
      updatedAt: new Date(data.updated_at).toISOString(),
    };
  }, 'Sofra:Bulut kopyası zamanında okunamadı. Cihazdaki kayıtların korunuyor; bağlantını kontrol edip tekrar dene.');
}
