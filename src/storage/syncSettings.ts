import { z } from 'zod';
import { stateSchema } from './schema';
import { StorageDriver } from './repository';
import { upgradeCatalog } from '../domain/discovery';
import { SyncAnchor } from '../domain/sync';
export type SyncSettings = { enabled: boolean; anchor: SyncAnchor; lastSync: string | null };
export const defaultSyncSettings = (): SyncSettings => ({
  enabled: false,
  anchor: null,
  lastSync: null,
});
const schema = z.object({
  enabled: z.boolean(),
  lastSync: z.iso.datetime().nullable(),
  anchor: z
    .object({
      state: stateSchema,
      revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .nullable(),
});
export function createSyncSettings(driver: StorageDriver, accountKey: string) {
  const key = accountKey + '/sync';
  let queue: Promise<void> = Promise.resolve();
  const write = (text: string) => {
    const task = queue.catch(() => undefined).then(() => driver.setItem(key, text));
    queue = task;
    return task;
  };
  return {
    async load(): Promise<SyncSettings> {
      const raw = await driver.getItem(key);
      if (!raw || raw === 'null') return defaultSyncSettings();
      const value = schema.parse(JSON.parse(raw));
      return {
        ...value,
        anchor: value.anchor
          ? { ...value.anchor, state: upgradeCatalog(value.anchor.state) }
          : null,
      };
    },
    async save(value: SyncSettings) {
      await write(JSON.stringify(schema.parse(value)));
    },
    async clear() {
      await write('null');
    },
  };
}
