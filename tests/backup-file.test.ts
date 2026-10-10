import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../src/domain/state';
import { exportData } from '../src/domain/experience';
import { MAX_BACKUP_LENGTH, parseBackup } from '../src/domain/backup';
import {
  backupComparison,
  createBackupFile,
  MAX_BACKUP_BYTES,
  readBackupFile,
  utf8Size,
} from '../src/domain/backupFile';

describe('Taşınabilir Sofra yedeği', () => {
  it('Türkçe, emoji ve kişisel fotoğrafı kayıpsız taşır; oturum alanlarını dışarı almaz', async () => {
    const state = initialState();
    state.profile = { people: 3, diets: [], budget: 'balanced' };
    state.recipes[0] = {
      ...state.recipes[0],
      title: 'Şölen çorbası 🥣',
      photo: {
        dataUri: 'data:image/jpeg;base64,/9j/AAAA',
        width: 20,
        height: 20,
        caption: 'İlk denemem',
      },
    };
    const backup = createBackupFile({ ...state, token: 'never-export-this' } as typeof state);
    expect(backup.name).toMatch(/^sofra-yedek-[\dTZ-]+\.json$/);
    expect(backup.text).not.toContain('never-export-this');
    expect(backup.bytes).toBe(Buffer.byteLength(backup.text));
    expect(backup.bytes).toBeGreaterThan(backup.text.length);
    const imported = await readBackupFile({
      name: backup.name,
      size: backup.bytes,
      read: async () => backup.text,
    });
    expect(imported.state).toEqual(state);
  });
  it('eski metin, UTF-8 BOM ve büyük harfli dosya uzantısını kabul eder', async () => {
    const text = '\uFEFF' + exportData(initialState());
    expect(
      (await readBackupFile({ name: 'Sofram.TXT', size: utf8Size(text), read: async () => text }))
        .state,
    ).toEqual(initialState());
  });
  it.each([0, -1, Infinity, NaN, MAX_BACKUP_BYTES + 1])(
    'uygunsuz boyut %s iken dosyayı okumaz',
    async (size) => {
      const read = vi.fn(async () => '');
      await expect(readBackupFile({ name: 'yedek.json', size, read })).rejects.toThrow('15 MB');
      expect(read).not.toHaveBeenCalled();
    },
  );
  it('yanlış tür ve içeriği, yanıltıcı boyutu ve gelecek sürümü reddeder', async () => {
    const read = vi.fn(async () => exportData(initialState()));
    await expect(readBackupFile({ name: 'yedek.pdf', size: 20, read })).rejects.toThrow('.json');
    expect(read).not.toHaveBeenCalled();
    for (const text of [
      '<html>not a backup</html>',
      '{bad',
      exportData({ ...initialState(), version: 2 } as never),
    ])
      await expect(
        readBackupFile({ name: 'yedek.json', size: text.length, read: async () => text }),
      ).rejects.toThrow('geçerli bir Sofra yedeği');
    await expect(
      readBackupFile({
        name: 'yedek.json',
        size: 100,
        read: async () => 'a'.repeat(MAX_BACKUP_LENGTH + 1),
      }),
    ).rejects.toThrow('5 milyon');
  });
  it('dışa aktarırken geri yüklenemeyecek kadar büyük bir dosya üretmez', () => {
    const state = initialState();
    state.recipes[0].steps = Array.from({ length: 2600 }, () => 'a'.repeat(2000));
    expect(() => createBackupFile(state)).toThrow('boyut sınırını');
  });
  it('karşılaştırma fotoğraf/favori sayısını gösterir, boş stoğu saymaz ve kayıtları değiştirmez', () => {
    const current = initialState();
    const incoming = parseBackup(exportData(current)).state;
    incoming.experience.favorites = ['mercimek'];
    incoming.pantry = { onion: 0, salt: 10 };
    const before = JSON.stringify([current, incoming]);
    const comparison = backupComparison(current, incoming);
    expect(comparison).toContainEqual({ label: 'Favori', current: 0, incoming: 1 });
    expect(comparison).toContainEqual({ label: 'Stok kalemi', current: 0, incoming: 1 });
    expect(JSON.stringify([current, incoming])).toBe(before);
  });
});
