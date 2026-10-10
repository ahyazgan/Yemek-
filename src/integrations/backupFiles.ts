import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { readBackupFile, type BackupFile, type SelectedBackup } from '../domain/backupFile';

export async function selectBackupFile(signal: AbortSignal): Promise<SelectedBackup | null> {
  if (signal.aborted) return null;
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    if (signal.aborted) return null;
    const value = await readBackupFile({
      name: asset.name,
      size: file.size,
      read: () => file.text(),
    });
    return signal.aborted ? null : value;
  } finally {
    // Remove only the picker's app-cache copy. Never modify the user's original document.
    const pickerCache = new Directory(Paths.cache, 'DocumentPicker').uri.replace(/\/$/, '') + '/';
    if (file.uri.startsWith(pickerCache) && file.exists) {
      try {
        file.delete();
      } catch {
        /* The OS can reclaim cache files later. */
      }
    }
  }
}

export async function saveBackupFile(backup: BackupFile, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      'Sofra:Bu cihazda dosya paylaşımı açılamıyor. Metin seçeneklerinden yedeğini kopyalayabilirsin.',
    );
  if (signal.aborted) return;
  const directory = new Directory(Paths.cache, 'sofra-backup-exports');
  directory.create({ idempotent: true });
  // Android recipients may read after the chooser closes. Leave a brief read window,
  // and reap old interrupted exports on the next export rather than deleting early.
  for (const old of directory.list()) {
    if (
      old instanceof File &&
      /^sofra-yedek-.*\.json$/.test(old.name) &&
      old.modificationTime !== null &&
      old.modificationTime < Date.now() - 3600000
    ) {
      try {
        old.delete();
      } catch {
        /* Best-effort cache cleanup. */
      }
    }
  }
  const file = new File(directory, backup.name);
  file.create();
  const remove = () => {
    try {
      if (file.exists) file.delete();
    } catch {
      /* OS cache eviction remains available. */
    }
  };
  try {
    file.write(backup.text);
    if (signal.aborted) {
      remove();
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Sofra yedeğini kaydet',
    });
    setTimeout(remove, 15 * 60 * 1000);
  } catch (error) {
    remove();
    throw error;
  }
}
