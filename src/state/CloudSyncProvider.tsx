import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './AppProvider';
import { useAuth } from '../auth/AuthProvider';
import { accountStorageKey, authMessage } from '../auth/contracts';
import { readCloudSnapshot, writeCloudSnapshot } from '../integrations/supabase';
import { createSyncSettings, defaultSyncSettings, SyncSettings } from '../storage/syncSettings';
import { synchronize, SyncConflict } from '../domain/sync';

type SyncContext = {
  available: boolean;
  loaded: boolean;
  busy: boolean;
  settings: SyncSettings;
  conflict: SyncConflict | null;
  error: string;
  message: string;
  run: (side?: 'local' | 'remote') => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  clear: () => Promise<void>;
};
const Context = createContext<SyncContext | null>(null);
export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const app = useApp();
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  }, [app]);
  const owner = auth.user?.id ?? '';
  const available = auth.mode === 'supabase' && !!owner;
  const [repository] = useState(() =>
    createSyncSettings(AsyncStorage, accountStorageKey(auth.mode, auth.user)),
  );
  const [settings, setSettings] = useState(defaultSyncSettings);
  const metadata = useRef(settings);
  const [loaded, setLoaded] = useState(!available);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const alive = useRef(true);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const conflictRef = useRef<SyncConflict | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    alive.current = true;
    if (!available) {
      return () => {
        alive.current = false;
      };
    }
    void repository
      .load()
      .then((value) => {
        if (alive.current) {
          metadata.current = value;
          setSettings(value);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive.current)
          setError(
            'Eşitleme ayarları okunamadı. Cihazdaki kayıtların korunuyor; eşitleme ayarını sıfırlayabilirsin.',
          );
      });
    return () => {
      alive.current = false;
    };
  }, [available, repository]);
  const run = useCallback(
    async (side?: 'local' | 'remote') => {
      if (
        !available ||
        running.current ||
        !alive.current ||
        !appRef.current.ready ||
        appRef.current.saveError
      )
        return;
      running.current = true;
      setBusy(true);
      setError('');
      setMessage('');
      try {
        const ensureActive = () => {
          if (!alive.current) throw new Error('Sofra:Hesap değişti. Eşitleme durduruldu.');
        };
        const result = await synchronize(
          {
            current: () => {
              ensureActive();
              return appRef.current.getState();
            },
            read: () => {
              ensureActive();
              return readCloudSnapshot(owner);
            },
            write: (value, revision) => {
              ensureActive();
              return writeCloudSnapshot(owner, value, revision);
            },
            replace: (value, expected) => {
              ensureActive();
              return appRef.current.replace(value, { expected });
            },
            preserve: (value, reason) => {
              ensureActive();
              return appRef.current.saveRecovery(value, reason);
            },
          },
          metadata.current.anchor,
          side && conflictRef.current ? { side, conflict: conflictRef.current } : undefined,
        );
        ensureActive();
        if (result.kind === 'conflict') {
          conflictRef.current = result.conflict;
          setConflict(result.conflict);
          setMessage('İki farklı sofra var. Kopyaları inceleyip hangisiyle devam edeceğini seç.');
        } else {
          const next = {
            ...metadata.current,
            anchor: result.anchor,
            lastSync: new Date().toISOString(),
          };
          await repository.save(next);
          ensureActive();
          metadata.current = next;
          setSettings(next);
          conflictRef.current = null;
          setConflict(null);
          setMessage(
            result.kind === 'downloaded'
              ? 'Buluttaki güncel sofra bu cihaza alındı.'
              : result.kind === 'uploaded'
                ? 'Cihazdaki sofran buluta kaydedildi.'
                : 'Bu cihaz ve bulut aynı sofrayı kullanıyor.',
          );
        }
      } catch (e) {
        if (alive.current) setError(authMessage(e));
      } finally {
        running.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [available, owner, repository],
  );
  useEffect(() => {
    if (
      !available ||
      !loaded ||
      !settings.enabled ||
      !app.ready ||
      app.saveError ||
      conflictRef.current
    )
      return;
    const timer = setTimeout(() => {
      void run();
    }, 1500);
    return () => clearTimeout(timer);
  }, [available, loaded, settings.enabled, app.state, app.ready, app.saveError, run]);
  useEffect(() => {
    if (!available || !loaded || !settings.enabled) return;
    const refresh = () => {
      if (!conflictRef.current && NativeAppState.currentState === 'active') void run();
    };
    const timer = setInterval(refresh, 60000);
    const listener = NativeAppState.addEventListener('change', (value) => {
      if (value === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [available, loaded, settings.enabled, run]);
  return (
    <Context.Provider
      value={{
        available,
        loaded,
        busy,
        settings,
        conflict,
        error,
        message,
        run,
        setEnabled: async (enabled) => {
          if (!available || running.current) return;
          running.current = true;
          setBusy(true);
          try {
            const next = { ...metadata.current, enabled };
            await repository.save(next);
            metadata.current = next;
            setSettings(next);
            setError('');
          } finally {
            running.current = false;
            if (alive.current) setBusy(false);
          }
        },
        clear: async () => {
          if (running.current) throw new Error('Sofra:Eşitleme tamamlanınca tekrar dene.');
          await repository.clear();
          const next = defaultSyncSettings();
          metadata.current = next;
          setSettings(next);
          setLoaded(true);
          setError('');
          conflictRef.current = null;
          setConflict(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCloudSync() {
  const value = useContext(Context);
  if (!value) throw new Error('CloudSyncProvider gerekli');
  return value;
}
