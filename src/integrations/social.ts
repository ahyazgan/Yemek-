import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { authMode, authRedirect, getSupabase } from './supabase';
import { oauthCallbackCode } from '../auth/oauth';
export type SocialProvider = 'apple' | 'google';
export function socialEnabled(provider: SocialProvider) {
  const configured =
    provider === 'apple'
      ? process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true'
      : process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
  return (
    authMode === 'supabase' &&
    configured &&
    (Platform.OS === 'web' || Constants.appOwnership !== 'expo')
  );
}
export async function startSocialSignIn(
  provider: SocialProvider,
  exchange: (code: string) => Promise<void>,
) {
  if (!socialEnabled(provider))
    throw new Error('Sofra:Bu giriş sağlayıcısının kurulumu tamamlanmadı.');
  const redirectTo = authRedirect('auth/callback');
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Sofra:Giriş bağlantısı alınamadı.');
  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return false;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  await exchange(oauthCallbackCode(result.url, redirectTo));
  return true;
}
