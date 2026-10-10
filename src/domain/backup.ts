import { z } from 'zod';
import { AppState } from './model';
import { stateSchema } from '../storage/schema';
import { upgradeCatalog } from './discovery';

export const MAX_BACKUP_LENGTH = 5000000;
const envelopeSchema = z.object({
  application: z.literal('Sofra'),
  exportedAt: z.iso.datetime(),
  data: stateSchema,
});
export function parseBackup(text: string) {
  if (text.length > MAX_BACKUP_LENGTH)
    throw new Error('Sofra:Yedek en fazla 5 milyon karakter olabilir.');
  try {
    // Files exported by some text editors contain a UTF-8 BOM.
    const backup = envelopeSchema.parse(JSON.parse(text.replace(/^\uFEFF/, '')));
    return { state: upgradeCatalog(backup.data), exportedAt: backup.exportedAt };
  } catch {
    throw new Error(
      'Sofra:Bu geçerli bir Sofra yedeği değil veya bu sürümle uyumlu değil. Mevcut kayıtların değiştirilmedi.',
    );
  }
}
export function stateSummary(state: AppState) {
  return `${state.recipes.length} tarif · ${state.meals.length} öğün · ${state.savedLists.length} kayıtlı liste · ${Object.values(state.pantry).filter((amount) => amount > 0).length} stok kalemi`;
}
// JSONB returns object keys in a different order. Arrays retain intentional user ordering.
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return (
    '{' +
    Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonical(object[key]))
      .join(',') +
    '}'
  );
}
export function sameState(a: AppState, b: AppState) {
  return canonical(a) === canonical(b);
}

export async function guardedRestore(
  expected: AppState,
  next: AppState,
  ports: {
    current: () => AppState;
    preserve: (state: AppState) => Promise<void>;
    commit: (state: AppState) => Promise<void>;
  },
) {
  const check = () => {
    if (ports.current() !== expected)
      throw new Error(
        'Sofra:Bu sırada cihazdaki kayıtlar değişti. Güncel kopyayı yeniden inceleyip tekrar dene.',
      );
  };
  check();
  await ports.preserve(expected);
  check();
  await ports.commit(next);
}
