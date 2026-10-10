import { readBackupFile, type BackupFile, type SelectedBackup } from '../domain/backupFile';

export async function saveBackupFile(file: BackupFile, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  const url = URL.createObjectURL(
    new Blob([file.text], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Let the browser consume the URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

export function selectBackupFile(signal: AbortSignal): Promise<SelectedBackup | null> {
  if (signal.aborted) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt,application/json,text/plain';
    input.setAttribute('aria-label', 'Sofra yedek dosyası');
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    const cleanup = () => {
      input.remove();
      signal.removeEventListener('abort', cancel);
    };
    const cancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(null);
    };
    input.addEventListener('cancel', cancel, { once: true });
    signal.addEventListener('abort', cancel, { once: true });
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        if (!file) return cancel();
        void readBackupFile({ name: file.name, size: file.size, read: () => file.text() })
          .then((value) => {
            if (!settled) {
              settled = true;
              cleanup();
              resolve(value);
            }
          })
          .catch((error: unknown) => {
            if (!settled) {
              settled = true;
              cleanup();
              reject(error);
            }
          });
      },
      { once: true },
    );
    try {
      input.click();
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });
}
