import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackupFile, MAX_BACKUP_BYTES } from '../src/domain/backupFile';
import { initialState } from '../src/domain/state';

const fake = vi.hoisted(() => ({
  pick: vi.fn(),
  available: vi.fn(),
  share: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  size: 100,
  uri: 'file:///cache/DocumentPicker/copy.json',
}));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: fake.pick }));
vi.mock('expo-sharing', () => ({ isAvailableAsync: fake.available, shareAsync: fake.share }));
vi.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = true;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get size() {
      return fake.size;
    }
    text() {
      return fake.read();
    }
    write(text: string) {
      fake.write(text);
    }
    create() {}
    delete() {
      fake.remove(this.uri);
    }
  }
  class Directory extends File {
    list() {
      return [];
    }
  }
  return { File, Directory, Paths: { cache: { uri: 'file:///cache' } } };
});
import { saveBackupFile, selectBackupFile } from '../src/integrations/backupFiles';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  fake.size = 100;
  fake.read.mockResolvedValue(createBackupFile(initialState()).text);
  fake.pick.mockResolvedValue({ canceled: false, assets: [{ name: 'yedek.json', uri: fake.uri }] });
  fake.available.mockResolvedValue(true);
  fake.share.mockResolvedValue(undefined);
  fake.write.mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Telefon dosya sınırı', () => {
  it('seçimi iptal etmek veri okuma veya silme başlatmaz', async () => {
    fake.pick.mockResolvedValue({ canceled: true, assets: null });
    expect(await selectBackupFile(new AbortController().signal)).toBeNull();
    expect(fake.read).not.toHaveBeenCalled();
    expect(fake.remove).not.toHaveBeenCalled();
  });
  it('büyük dosyayı belleğe okumaz, sadece önbellek kopyasını temizler', async () => {
    fake.size = MAX_BACKUP_BYTES + 1;
    await expect(selectBackupFile(new AbortController().signal)).rejects.toThrow('15 MB');
    expect(fake.read).not.toHaveBeenCalled();
    expect(fake.remove).toHaveBeenCalledWith(fake.uri);
  });
  it('önbellek dışındaki kullanıcının asıl dosyasını silmez', async () => {
    fake.pick.mockResolvedValue({
      canceled: false,
      assets: [{ name: 'yedek.json', uri: 'file:///documents/original.json' }],
    });
    expect((await selectBackupFile(new AbortController().signal))?.state).toEqual(initialState());
    expect(fake.remove).not.toHaveBeenCalled();
  });
  it('hesap/ekran değişince geç gelen dosyayı yeni ekrana döndürmez', async () => {
    const controller = new AbortController();
    fake.read.mockImplementation(async () => {
      controller.abort();
      return createBackupFile(initialState()).text;
    });
    expect(await selectBackupFile(controller.signal)).toBeNull();
    expect(fake.remove).toHaveBeenCalledWith(fake.uri);
  });
  it('paylaşım yoksa özel veriyi diske yazmaz', async () => {
    fake.available.mockResolvedValue(false);
    await expect(
      saveBackupFile(createBackupFile(initialState()), new AbortController().signal),
    ).rejects.toThrow('dosya paylaşımı');
    expect(fake.write).not.toHaveBeenCalled();
  });
  it('yazma veya paylaşım hatasında geçici dosyayı temizler', async () => {
    for (const step of ['write', 'share'] as const) {
      if (step === 'write')
        fake.write.mockImplementationOnce(() => {
          throw new Error('disk');
        });
      else fake.share.mockRejectedValueOnce(new Error('share'));
      await expect(
        saveBackupFile(createBackupFile(initialState()), new AbortController().signal),
      ).rejects.toThrow();
    }
    expect(fake.remove).toHaveBeenCalledTimes(2);
  });
  it('alıcıya okuma süresi bırakıp geçici dosyayı daha sonra temizler', async () => {
    await saveBackupFile(createBackupFile(initialState()), new AbortController().signal);
    expect(fake.remove).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(fake.remove).toHaveBeenCalledOnce();
  });
});
