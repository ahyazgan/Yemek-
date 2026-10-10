import { AppState } from '../domain/model';
import { initialState } from '../domain/state';
import { parseState } from './schema';
import { upgradeCatalog } from '../domain/discovery';
export const STORAGE_KEY = '@yazgan/sofra/offline/v1';
export interface StorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export type RecoveryCopy = { state: AppState; createdAt: string; reason: string };
export function createRepository(driver: StorageDriver, key = STORAGE_KEY) {
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    const pending = queue.catch(() => undefined).then(task);
    queue = pending;
    return pending;
  };
  return {
    async readRecovery(): Promise<RecoveryCopy | null> {
      const raw = await driver.getItem(key + '/recovery');
      if (!raw || raw === 'null') return null;
      const copy = JSON.parse(raw);
      if (
        typeof copy.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(copy.createdAt)) ||
        typeof copy.reason !== 'string'
      )
        throw new Error('Sofra:Geri alma kopyası okunamadı.');
      return {
        state: upgradeCatalog(parseState(copy.state)),
        createdAt: copy.createdAt,
        reason: copy.reason,
      };
    },
    saveRecovery(state: AppState, reason: string): Promise<void> {
      const raw = JSON.stringify({
        state: parseState(state),
        createdAt: new Date().toISOString(),
        reason,
      });
      return enqueue(() => driver.setItem(key + '/recovery', raw));
    },
    clearRecovery(): Promise<void> {
      return enqueue(() => driver.setItem(key + '/recovery', 'null'));
    },
    async load(): Promise<AppState> {
      const raw = await driver.getItem(key);
      if (raw === null) return initialState();
      // Geçersiz veya gelecekteki sürümdeki veriyi sessizce silmeyiz.
      return upgradeCatalog(parseState(JSON.parse(raw)));
    },
    save(state: AppState): Promise<void> {
      const raw = JSON.stringify(parseState(state));
      return enqueue(() => driver.setItem(key, raw));
    },
  };
}
