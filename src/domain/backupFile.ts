import type { AppState } from './model';
import { MAX_BACKUP_LENGTH, parseBackup } from './backup';
import { stateSchema } from '../storage/schema';

// A UTF-16 code unit needs at most three UTF-8 bytes. Keep legacy text backups valid.
export const MAX_BACKUP_BYTES = MAX_BACKUP_LENGTH * 3;
export type BackupFile = { name: string; text: string; bytes: number };
export type SelectedBackup = ReturnType<typeof parseBackup> & { name: string; bytes: number };

export function utf8Size(text: string) {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function backupSizeLabel(bytes: number) {
  return bytes < 1000000
    ? `${Math.max(1, Math.ceil(bytes / 1000))} KB`
    : `${(bytes / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`;
}

export function createBackupFile(state: AppState, now = new Date()): BackupFile {
  // Export only schema-defined personal state, never a session or unknown runtime fields.
  const data = stateSchema.parse(state);
  const exportedAt = now.toISOString();
  const text = JSON.stringify({ application: 'Sofra', exportedAt, data });
  if (text.length > MAX_BACKUP_LENGTH)
    throw new Error(
      'Sofra:Yedeğin boyut sınırını aşıyor. Kullanmadığın kişisel fotoğrafları veya eski kayıtları azaltıp tekrar dene.',
    );
  return {
    name: `sofra-yedek-${exportedAt.replace(/[:.]/g, '-')}.json`,
    text,
    bytes: utf8Size(text),
  };
}

export async function readBackupFile(source: {
  name: string;
  size: number;
  read: () => Promise<string>;
}): Promise<SelectedBackup> {
  if (!/\.(json|txt)$/i.test(source.name))
    throw new Error(
      'Sofra:Bir Sofra yedeği seç (.json veya .txt). Fotoğraf ve PDF dosyaları yedek olarak kullanılamaz.',
    );
  if (!Number.isSafeInteger(source.size) || source.size <= 0 || source.size > MAX_BACKUP_BYTES)
    throw new Error('Sofra:Boş olmayan, en fazla 15 MB büyüklüğünde bir Sofra yedeği seç.');
  const text = await source.read();
  if (text.length > MAX_BACKUP_LENGTH)
    throw new Error('Sofra:Yedek en fazla 5 milyon karakter olabilir.');
  const bytes = utf8Size(text);
  if (bytes > MAX_BACKUP_BYTES) throw new Error('Sofra:Yedek en fazla 15 MB olabilir.');
  const value = parseBackup(text);
  return {
    ...value,
    bytes,
    name: source.name
      .split(/[\\/]/)
      .pop()!
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(-120),
  };
}

export function backupComparison(current: AppState, incoming: AppState) {
  const metrics: { label: string; count: (value: AppState) => number }[] = [
    { label: 'Tarif', count: (v) => v.recipes.length },
    { label: 'Planlı öğün', count: (v) => v.meals.length },
    { label: 'Kayıtlı liste', count: (v) => v.savedLists.length },
    { label: 'Stok kalemi', count: (v) => Object.values(v.pantry).filter((n) => n > 0).length },
    { label: 'Favori', count: (v) => v.experience.favorites.length },
    { label: 'Kişisel fotoğraf', count: (v) => v.recipes.filter((r) => !!r.photo).length },
  ];
  return metrics.map(({ label, count }) => ({
    label,
    current: count(current),
    incoming: count(incoming),
  }));
}
