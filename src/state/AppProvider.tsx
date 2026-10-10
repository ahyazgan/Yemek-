import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../domain/model';
import { Action, initialState, reducer } from '../domain/state';
import { createRepository, RecoveryCopy } from '../storage/repository';
import { weekStart } from '../domain/logic';
import { parseState } from '../storage/schema';
import { upgradeCatalog } from '../domain/discovery';
import { guardedRestore } from '../domain/backup';

type ReplaceOptions = { expected?: AppState; preserve?: boolean };

type Store = {
  state: AppState;
  dispatch: (action: Action) => void;
  ready: boolean;
  loadError: boolean;
  saveError: boolean;
  retry: () => void;
  reset: () => Promise<void>;
  replace: (value: AppState, options?: ReplaceOptions) => Promise<void>;
  getState: () => AppState;
  saveRecovery: (value: AppState, reason: string) => Promise<void>;
  readRecovery: () => Promise<RecoveryCopy | null>;
  clearRecovery: () => Promise<void>;
  clearAccountData: () => Promise<void>;
  week: string;
  setWeek: (week: string) => void;
};
const Context = createContext<Store | null>(null);
export function AppProvider({
  children,
  storageKey,
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const [repository] = useState(() => createRepository(AsyncStorage, storageKey));
  const [state, setState] = useState(initialState);
  const currentState = useRef(state);
  const mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [week, setWeek] = useState(weekStart);
  const [retryCount, setRetryCount] = useState(0);
  const generation = useRef(0);
  const load = useCallback(
    () =>
      repository
        .load()
        .then((loaded) => {
          if (!mounted.current) return;
          currentState.current = loaded;
          setState(loaded);
          setLoadError(false);
          setReady(true);
        })
        .catch(() => setLoadError(true)),
    [repository],
  );
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  useEffect(() => {
    if (!ready) return;
    const current = ++generation.current;
    repository
      .save(state)
      .then(() => {
        if (current === generation.current) setSaveError(false);
      })
      .catch(() => {
        if (current === generation.current) setSaveError(true);
      });
  }, [state, ready, repository, retryCount]);
  const dispatch = useCallback((action: Action) => {
    const next = parseState(reducer(currentState.current, action));
    currentState.current = next;
    setState(next);
  }, []);
  const getState = useCallback(() => currentState.current, []);
  const reset = async () => {
    const fresh = initialState();
    try {
      await repository.save(fresh);
      currentState.current = fresh;
      setState(fresh);
      setLoadError(false);
      setReady(true);
    } catch {
      setLoadError(true);
    }
  };
  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        ready,
        loadError,
        saveError,
        retry: () => (ready ? setRetryCount((n) => n + 1) : void load()),
        reset,
        getState,
        saveRecovery: repository.saveRecovery,
        readRecovery: repository.readRecovery,
        clearRecovery: repository.clearRecovery,
        clearAccountData: async () => {
          // Deletion may invalidate Auth and unmount this provider before the request returns.
          // Complete cleanup on this captured account's repository even after unmount.
          const fresh = initialState();
          currentState.current = fresh;
          if (mounted.current) setState(fresh);
          await repository.save(fresh);
        },
        replace: async (value, options = {}) => {
          if (!mounted.current)
            throw new Error('Sofra:Hesap değişti. İşlemi yeni oturumda tekrar başlat.');
          const expected = options.expected ?? currentState.current;
          const next = upgradeCatalog(parseState(value));
          await guardedRestore(expected, next, {
            current: () => currentState.current,
            preserve: (previous) =>
              options.preserve === false
                ? Promise.resolve()
                : repository.saveRecovery(previous, 'Geri yükleme öncesi'),
            commit: async (value) => {
              if (!mounted.current) throw new Error('Sofra:Hesap değişti. İşlem iptal edildi.');
              currentState.current = value;
              setState(value);
              try {
                await repository.save(value);
              } catch (error) {
                if (currentState.current === value) {
                  currentState.current = expected;
                  setState(expected);
                }
                setSaveError(true);
                throw error;
              }
            },
          });
        },
        week,
        setWeek,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider gerekli');
  return value;
}
