import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { observeNativeRefresh, observeSession } from './sessionLifecycle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Account,
  accountSchema,
  credentialsSchema,
  signUpSchema,
  DEMO_SESSION_KEY,
  parseAuthEmail,
} from './contracts';
import { createEmailRequestGate } from './emailRequests';
import { authMode, authRedirect, getSupabase } from '../integrations/supabase';
import { SocialProvider, startSocialSignIn } from '../integrations/social';

type Auth = {
  user: Account | null;
  ready: boolean;
  error: string;
  recovery: boolean;
  mode: typeof authMode;
  signIn: (email: string, password: string) => Promise<void>;
  signInSocial: (provider: SocialProvider) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<void>;
  emailRetryAt: number;
  confirmDemo: (name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  requestReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  callback: (code: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
// Auth changes remount the account-scoped store. Exchange a one-time code only once.
const exchanges = new Map<string, Promise<void>>();
async function exchangeCode(code: string) {
  if (authMode === 'demo')
    throw new Error('Sofra:Demo modunda gerçek doğrulama bağlantısı açılamaz.');
  if (!code) throw new Error('Sofra:Bağlantı eksik veya geçersiz. Yeni bir bağlantı iste.');
  let pending = exchanges.get(code);
  if (!pending) {
    pending = getSupabase()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) throw error;
      });
    exchanges.set(code, pending);
  }
  await pending;
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const emailGate = useRef(createEmailRequestGate());
  const [emailRetryAt, setEmailRetryAt] = useState(0);
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    const init = async () => {
      try {
        if (authMode === 'demo') {
          const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
          if (raw && alive) setUser(accountSchema.parse(JSON.parse(raw)));
          if (alive) setReady(true);
        } else {
          const db = getSupabase();
          const failed = () => {
            if (alive)
              setError(
                'Hesap oturumu yüklenemedi. Bağlantını kontrol edip yeniden giriş yapabilirsin.',
              );
          };
          const stopSession = observeSession<Session>(
            {
              subscribe: (listener) => {
                const { data } = db.auth.onAuthStateChange(listener);
                return () => data.subscription.unsubscribe();
              },
              read: async () => {
                const { data, error } = await db.auth.getSession();
                return { session: data.session, error };
              },
            },
            {
              session: (event, session) => {
                setError('');
                setUser(
                  session?.user
                    ? {
                        id: session.user.id,
                        email: session.user.email ?? '',
                        name: String(session.user.user_metadata?.display_name ?? ''),
                      }
                    : null,
                );
                if (event === 'PASSWORD_RECOVERY') setRecovery(true);
                if (event === 'SIGNED_OUT') setRecovery(false);
              },
              ready: () => setReady(true),
              error: failed,
            },
          );
          cleanup = stopSession;
          const stopRefresh = observeNativeRefresh(
            Platform.OS,
            {
              currentState: NativeAppState.currentState,
              subscribe: (listener) => {
                const subscription = NativeAppState.addEventListener('change', listener);
                return () => subscription.remove();
              },
            },
            { start: () => db.auth.startAutoRefresh(), stop: () => db.auth.stopAutoRefresh() },
            failed,
          );
          cleanup = () => {
            stopSession();
            stopRefresh();
          };
        }
      } catch {
        if (alive)
          setError(
            'Hesap oturumu yüklenemedi. Bağlantı ayarlarını kontrol et; misafir olarak devam edebilirsin.',
          );
        if (alive) setReady(true);
      }
    };
    void init();
    return () => {
      alive = false;
      cleanup();
    };
  }, []);
  const saveDemo = async (account: Account) => {
    await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(accountSchema.parse(account)));
    setUser(account);
    setError('');
  };
  const value: Auth = {
    user,
    ready,
    error,
    recovery,
    mode: authMode,
    emailRetryAt,
    async signIn(email, password) {
      const input = credentialsSchema.parse({ email: email.trim(), password });
      if (authMode === 'demo')
        return saveDemo({ id: 'demo', email: input.email, name: 'Demo kullanıcısı' });
      const { error: failure } = await getSupabase().auth.signInWithPassword(input);
      if (failure) throw failure;
    },
    async signUp(name, email, password) {
      const input = signUpSchema.parse({ name, email: email.trim(), password });
      if (authMode === 'demo') return false;
      return emailGate.current.run(async () => {
        const { data, error: failure } = await getSupabase().auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: { display_name: input.name },
            emailRedirectTo: authRedirect('auth/callback'),
          },
        });
        if (failure) throw failure;
        return !!data.session;
      }, setEmailRetryAt);
    },
    async resendConfirmation(email) {
      const address = parseAuthEmail(email);
      await emailGate.current.run(async () => {
        if (authMode === 'demo') return;
        const { error: failure } = await getSupabase().auth.resend({
          type: 'signup',
          email: address,
          options: { emailRedirectTo: authRedirect('auth/callback') },
        });
        if (failure) throw failure;
      }, setEmailRetryAt);
    },
    async confirmDemo(name, email) {
      if (authMode !== 'demo') throw new Error('Sofra:Bu işlem yalnızca demoda kullanılabilir.');
      await saveDemo({ id: 'demo', name, email });
    },
    async signOut() {
      if (authMode === 'demo') await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      else {
        const { error: failure } = await getSupabase().auth.signOut({ scope: 'local' });
        if (failure) throw failure;
      }
      setUser(null);
      setRecovery(false);
    },
    async updateName(name) {
      if (!user) throw new Error('Sofra:Önce giriş yap.');
      if (name.trim().length < 2 || name.trim().length > 60)
        throw new Error('Sofra:Adın 2–60 karakter olmalı.');
      if (authMode === 'demo') await saveDemo({ ...user, name: name.trim() });
      else {
        const { error: failure } = await getSupabase().auth.updateUser({
          data: { display_name: name.trim() },
        });
        if (failure) throw failure;
      }
    },
    async requestReset(email) {
      const address = parseAuthEmail(email);
      if (authMode === 'demo') {
        setRecovery(true);
        return;
      }
      await emailGate.current.run(async () => {
        const { error: failure } = await getSupabase().auth.resetPasswordForEmail(address, {
          redirectTo: authRedirect('reset-password'),
        });
        if (failure) throw failure;
      }, setEmailRetryAt);
    },
    callback: exchangeCode,
    signInSocial: (provider) => startSocialSignIn(provider, exchangeCode),
    async updatePassword(password) {
      credentialsSchema.shape.password.parse(password);
      if (authMode !== 'demo') {
        const { error: failure } = await getSupabase().auth.updateUser({ password });
        if (failure) throw failure;
      }
      setRecovery(false);
    },
    async deleteAccount() {
      if (!user) throw new Error('Sofra:Önce giriş yap.');
      if (authMode !== 'demo') {
        const { error: failure } = await getSupabase().functions.invoke('delete-account', {
          body: { confirmation: 'DELETE' },
        });
        if (failure) throw failure;
      }
      // The screen clears only this account's local data before navigating away.
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider gerekli');
  return value;
}
