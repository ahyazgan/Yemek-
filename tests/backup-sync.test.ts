import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../src/domain/state';
import { AppState } from '../src/domain/model';
import { exportData } from '../src/domain/experience';
import { canonical, guardedRestore, parseBackup, sameState } from '../src/domain/backup';
import { CloudCopy, SnapshotConflictError, synchronize } from '../src/domain/sync';
import { createRepository } from '../src/storage/repository';
import { createSyncSettings, defaultSyncSettings } from '../src/storage/syncSettings';

const state = (people = 2): AppState => ({
  ...initialState(),
  profile: { people, diets: [], budget: 'balanced' as const },
});
const copy = (people = 2, revision = 1): CloudCopy => ({
  state: state(people),
  revision,
  updatedAt: '2026-10-10T10:00:00.000Z',
});
function fixture(localPeople: number, remote: CloudCopy | null) {
  let local = state(localPeople);
  let cloud = remote;
  const ports = {
    current: () => local,
    read: vi.fn(async () => cloud),
    write: vi.fn(async (next: typeof local, revision: number) => {
      if ((cloud?.revision ?? 0) !== revision) throw new SnapshotConflictError();
      cloud = { state: next, revision: revision + 1, updatedAt: '2026-10-10T11:00:00.000Z' };
      return cloud;
    }),
    replace: vi.fn(async (next: typeof local, expected: typeof local) => {
      if (local !== expected) throw new Error('changed');
      local = next;
    }),
    preserve: vi.fn(async () => {}),
  };
  return {
    ports,
    editLocal: (people: number) => {
      local = state(people);
    },
    editCloud: (value: CloudCopy) => {
      cloud = value;
    },
  };
}

describe('Yedek ve güvenli geri yükleme', () => {
  it('dışa aktarımı doğrular; hatalı ve gelecek sürüm kaydını reddeder', () => {
    expect(parseBackup(exportData(state())).state).toEqual(state());
    for (const value of [
      '{broken',
      '{}',
      JSON.stringify({ application: 'Other', exportedAt: new Date().toISOString(), data: state() }),
      exportData({ ...state(), version: 2 } as never),
    ])
      expect(() => parseBackup(value)).toThrow();
    expect(() => parseBackup(' '.repeat(5000001))).toThrow('5 milyon');
  });
  it('bozuk tarif/öğün ilişkisi hiçbir depolama işleminden önce reddedilir', () => {
    const value = state();
    value.meals = [
      { id: 'bad', recipeId: 'missing', date: '2026-10-05', slot: 'dinner', servings: 2 },
    ];
    expect(() => parseBackup(exportData(value))).toThrow();
  });
  it('yedek saklanamazsa veya beklerken cihaz değişirse eski kopya üzerine yazmaz', async () => {
    const before = state();
    const next = state(3);
    let current = before;
    const commit = vi.fn(async () => {});
    await expect(
      guardedRestore(before, next, {
        current: () => current,
        commit,
        preserve: async () => {
          throw new Error('disk full');
        },
      }),
    ).rejects.toThrow('disk full');
    expect(commit).not.toHaveBeenCalled();
    await expect(
      guardedRestore(before, next, {
        current: () => current,
        commit,
        preserve: async () => {
          current = state(4);
        },
      }),
    ).rejects.toThrow('kayıtlar değişti');
    expect(commit).not.toHaveBeenCalled();
    expect(current.profile?.people).toBe(4);
  });
  it('geri alma kopyası ve eşitleme ayarları hesaplar arasında yalıtılır, silinebilir', async () => {
    const data = new Map<string, string>();
    const driver = {
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const a = createRepository(driver, 'a');
    const b = createRepository(driver, 'b');
    await a.saveRecovery(state(), 'Önceki sofra');
    expect((await a.readRecovery())!.state.profile?.people).toBe(2);
    expect(await b.readRecovery()).toBeNull();
    await a.clearRecovery();
    expect(await a.readRecovery()).toBeNull();
    const syncA = createSyncSettings(driver, 'a');
    const syncB = createSyncSettings(driver, 'b');
    await syncA.save({ enabled: true, anchor: copy(), lastSync: null });
    expect((await syncB.load()).enabled).toBe(false);
    await syncA.clear();
    expect(await syncA.load()).toEqual(defaultSyncSettings());
  });
});

describe('Çakışmalı ve çevrimdışı bulut eşitlemesi', () => {
  it('JSONB nesne anahtar sırasını önemsemez, dizi sırasını korur', () => {
    expect(canonical({ b: [1, 2], a: 3 })).toBe(canonical({ a: 3, b: [1, 2] }));
    expect(canonical([1, 2])).not.toBe(canonical([2, 1]));
    const first = state();
    first.pantry = { onion: 10, salt: 2 };
    const second = state();
    second.pantry = { salt: 2, onion: 10 };
    expect(sameState(first, second)).toBe(true);
  });
  it('boş buluta ilk kaydı yükler; aynı kopyayı tekrar yazmaz', async () => {
    const { ports } = fixture(2, null);
    const result = await synchronize(ports, null);
    expect(result.kind).toBe('uploaded');
    expect(await synchronize(ports, null)).toMatchObject({ kind: 'synced' });
    expect(ports.write).toHaveBeenCalledTimes(1);
  });
  it('yeni cihazda farklı kopyaları onaysız değiştirmez', async () => {
    const { ports } = fixture(2, copy(3));
    expect((await synchronize(ports, null)).kind).toBe('conflict');
    expect(ports.write).not.toHaveBeenCalled();
    expect(ports.replace).not.toHaveBeenCalled();
  });
  it('yalnızca yerel değiştiyse yükler, yalnızca bulut değiştiyse indirir', async () => {
    const upload = fixture(3, copy());
    expect((await synchronize(upload.ports, copy())).kind).toBe('uploaded');
    const download = fixture(2, copy(4, 2));
    expect((await synchronize(download.ports, copy())).kind).toBe('downloaded');
    expect(download.ports.current().profile?.people).toBe(4);
  });
  it('iki taraf değişince iki kopyayı korur; açık seçimden önce alternatif yedeklenir', async () => {
    const { ports } = fixture(3, copy(4, 2));
    const result = await synchronize(ports, copy());
    if (result.kind !== 'conflict') throw new Error('Expected conflict');
    expect(ports.write).not.toHaveBeenCalled();
    expect(
      (await synchronize(ports, copy(), { side: 'local', conflict: result.conflict })).kind,
    ).toBe('uploaded');
    expect(ports.preserve).toHaveBeenCalledWith(state(4), 'Bulut çakışmasında önceki kopya');
  });
  it('seçim ekranı açıkken bulut veya cihaz değişirse yeniden inceleme ister', async () => {
    for (const side of ['local', 'remote'] as const) {
      const f = fixture(3, copy(4, 2));
      const result = await synchronize(f.ports, copy());
      if (result.kind !== 'conflict') throw new Error('Expected conflict');
      f.editCloud(copy(5, 3));
      expect((await synchronize(f.ports, copy(), { side, conflict: result.conflict })).kind).toBe(
        'conflict',
      );
      expect(f.ports.write).not.toHaveBeenCalled();
      expect(f.ports.replace).not.toHaveBeenCalled();
      f.editLocal(6);
      expect((await synchronize(f.ports, copy(), { side, conflict: result.conflict })).kind).toBe(
        'conflict',
      );
    }
  });
  it('sunucuda sürüm çakışması sonradan olursa yeniden okur, ezmez', async () => {
    const f = fixture(3, copy());
    f.ports.write.mockImplementationOnce(async () => {
      f.editCloud(copy(5, 2));
      throw new SnapshotConflictError();
    });
    expect(await synchronize(f.ports, copy())).toMatchObject({
      kind: 'conflict',
      conflict: { remote: { revision: 2 } },
    });
    expect(f.ports.current().profile?.people).toBe(3);
  });
  it('ağ hatası yerel veriye dokunmaz; tekrar deneme son değişikliği yükler', async () => {
    const f = fixture(3, copy());
    f.ports.read.mockRejectedValueOnce(new Error('offline'));
    await expect(synchronize(f.ports, copy())).rejects.toThrow('offline');
    expect(f.ports.current().profile?.people).toBe(3);
    f.editLocal(4);
    expect((await synchronize(f.ports, copy())).kind).toBe('uploaded');
  });
  it('bulut kaydı silindiyse eski cihaz sessizce yeniden oluşturmaz', async () => {
    const f = fixture(3, null);
    expect((await synchronize(f.ports, copy())).kind).toBe('conflict');
    expect(f.ports.write).not.toHaveBeenCalled();
  });
  it('yükleme sürerken yeni yerel değişiklik senkron olmuş sayılmaz', async () => {
    const f = fixture(3, copy());
    const write = f.ports.write.getMockImplementation()!;
    f.ports.write.mockImplementationOnce(async (next, rev) => {
      f.editLocal(4);
      return write(next, rev);
    });
    const result = await synchronize(f.ports, copy());
    if (result.kind === 'conflict') throw new Error('Unexpected conflict');
    expect(result.anchor.state.profile?.people).toBe(3);
    expect(f.ports.current().profile?.people).toBe(4);
    expect((await synchronize(f.ports, result.anchor)).kind).toBe('uploaded');
  });
});
