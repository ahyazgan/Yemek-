import { describe, expect, it } from 'vitest';
import { initialState } from '../src/domain/state';
import { parseState } from '../src/storage/schema';
import {
  createDemoHousehold,
  demoHome,
  demoInvite,
  DEMO_GUEST,
  DEMO_OWNER,
  emptyBoard,
  householdDemoSchema,
  joinDemoHousehold,
  manageDemoHousehold,
  previewDemoInvite,
  shareWeek,
  writeDemoBoard,
} from '../src/domain/household';
const week = '2026-10-05',
  now = Date.parse('2026-10-10T10:00:00Z');
function joined(role: 'editor' | 'viewer' = 'editor') {
  return joinDemoHousehold(
    demoInvite(createDemoHousehold('Bizim ev', 'Ben'), DEMO_OWNER, role, 'DEMO-test', now),
    'DEMO-test',
    'Diğer kişi',
    now,
  );
}
describe('Ortak haftanın yerel iş kuralları', () => {
  it('kişisel bilgileri aktarmaz, ortak malzemeleri birleştirip stoku yalnızca bir kez düşer', () => {
    const state = initialState();
    state.meals = [
      { id: 'm1', recipeId: 'mercimek', date: week, slot: 'lunch', servings: 2 },
      { id: 'm2', recipeId: 'mercimek', date: week, slot: 'dinner', servings: 2 },
    ];
    state.pantry = { onion: 30 };
    state.experience.extras = [
      { id: 'x', week, name: 'Peçete', quantity: 2, unit: 'paket', checked: true },
    ];
    const content = shareWeek(state, week);
    expect(content.menu).toHaveLength(2);
    expect(content.items.find((i) => i.name === 'Peçete')).toMatchObject({
      quantity: 2,
      unit: 'paket',
      checked: true,
    });
    expect(new Set(content.items.map((i) => i.id)).size).toBe(content.items.length);
    expect(Object.keys(content)).toEqual(['menu', 'items']);
    expect(Object.keys(content.menu[0]).sort()).toEqual(['date', 'servings', 'slot', 'title']);
    expect(
      content.items.every(
        (i) => Object.keys(i).sort().join(',') === 'checked,id,name,quantity,unit',
      ),
    ).toBe(true);
    const withoutPantry = shareWeek({ ...state, pantry: {} }, week);
    const onion = content.items.find((i) => i.name.toLocaleLowerCase('tr-TR').includes('soğan'))!;
    const original = withoutPantry.items.find((i) => i.id === onion.id)!;
    expect(original.quantity - onion.quantity).toBe(30);
  });
  it('davet iptal, süre, tek kullanım ve yetki kısıtını uygular', () => {
    const home = demoInvite(
      createDemoHousehold('Bizim ev', 'Ben'),
      DEMO_OWNER,
      'viewer',
      'DEMO-test',
      now,
    );
    expect(() => previewDemoInvite(home, 'DEMO-test', now + 86400000)).toThrow();
    const next = joinDemoHousehold(home, 'DEMO-test', 'İkinci kişi', now);
    expect(() => previewDemoInvite(next, 'DEMO-test', now)).toThrow();
    expect(() => demoInvite(next, DEMO_GUEST, 'editor', 'DEMO-other', now)).toThrow();
    expect(() => writeDemoBoard(next, DEMO_GUEST, emptyBoard(week))).toThrow();
    expect(() =>
      previewDemoInvite(manageDemoHousehold(home, DEMO_OWNER, 'revoke'), 'DEMO-test', now),
    ).toThrow();
  });
  it('eski sürüm başka üyenin işaretini ezmez, geçerli sürümden devam edilir', () => {
    let home = joined();
    const first = emptyBoard(week);
    first.content.items = [
      { id: 'bread', name: 'Ekmek', quantity: 1, unit: 'adet', checked: false },
    ];
    home = writeDemoBoard(home, DEMO_OWNER, first);
    const stale = demoHome(home, DEMO_GUEST, week)!.board;
    home = writeDemoBoard(home, DEMO_OWNER, {
      ...stale,
      content: { ...stale.content, items: [{ ...stale.content.items[0], checked: true }] },
    });
    expect(() => writeDemoBoard(home, DEMO_GUEST, stale)).toThrow('HOUSEHOLD_CONFLICT');
    expect(demoHome(home, DEMO_GUEST, week)!.board.content.items[0].checked).toBe(true);
  });
  it('yetki devri ve ayrılma kişisel veriye dokunmaz, çıkarılan kişi ortak veriyi okuyamaz', () => {
    let home = joined();
    expect(() => manageDemoHousehold(home, DEMO_OWNER, 'leave')).toThrow();
    home = manageDemoHousehold(home, DEMO_OWNER, 'transfer', DEMO_GUEST)!;
    expect(home.ownerId).toBe(DEMO_GUEST);
    home = manageDemoHousehold(home, DEMO_OWNER, 'leave')!;
    expect(demoHome(home, DEMO_OWNER, week)).toBe(null);
    expect(demoHome(home, DEMO_GUEST, week)?.members).toHaveLength(1);
  });
  it('eski yedekler açılır; yerel hane yedekte kalır; bozuk üyelik reddedilir', () => {
    const state = initialState();
    expect(parseState(state).householdDemo).toBeUndefined();
    state.householdDemo = joined();
    expect(parseState(JSON.parse(JSON.stringify(state))).householdDemo).toEqual(
      state.householdDemo,
    );
    expect(
      householdDemoSchema.safeParse({
        ...state.householdDemo,
        members: state.householdDemo.members.map((m) => ({ ...m, role: 'owner' })),
      }).success,
    ).toBe(false);
    expect(() => emptyBoard('2026-10-06')).toThrow();
  });
});
