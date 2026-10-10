import { describe, expect, it } from 'vitest';
import {
  prepareHouseholdPublication,
  publicationBoard,
  publicationIsCurrent,
  publicationSourceIsCurrent,
} from '../src/domain/householdPublication';
import { initialState } from '../src/domain/state';
import {
  createDemoHousehold,
  demoHome,
  DEMO_OWNER,
  writeDemoBoard,
  shareWeek,
  type BoardContent,
  type SharedItem,
} from '../src/domain/household';

const week = '2026-10-05';
function item(id: string, name = 'Soğan', quantity = 60, checked = true): SharedItem {
  return { id, name, quantity, checked, unit: 'g' };
}
function home(items: SharedItem[], menu: BoardContent['menu'] = []) {
  const store = writeDemoBoard(createDemoHousehold('Bizim ev', 'Ben'), DEMO_OWNER, {
    week,
    revision: 0,
    content: { items, menu },
  });
  return demoHome(store, DEMO_OWNER, week)!;
}
describe('Ortak haftayı karşılaştırarak aktarma', () => {
  it('kişisel stok değişimini fark eder; paylaşılmayan favoriyi değişiklik saymaz', () => {
    const state = initialState();
    state.meals = [{ id: 'meal', recipeId: 'mercimek', date: week, slot: 'dinner', servings: 2 }];
    const preview = prepareHouseholdPublication(home([]), shareWeek(state, week));
    state.experience.favorites = ['mercimek'];
    expect(publicationSourceIsCurrent(preview, shareWeek(state, week))).toBe(true);
    state.pantry.onion = 30;
    expect(publicationSourceIsCurrent(preview, shareWeek(state, week))).toBe(false);
  });
  it('satır sırası değişse de işareti ürün adına bağlar; kişisel işaret ortak işareti ezmez', () => {
    const before = home([item('recipe-0', 'Soğan'), item('recipe-1', 'Tuz', 5, false)]);
    const result = prepareHouseholdPublication(before, {
      menu: [],
      items: [item('recipe-0', 'Tuz', 5, true), item('recipe-1', 'Soğan', 60, false)],
    });
    expect(result.content.items.map((i) => [i.name, i.checked])).toEqual([
      ['Tuz', false],
      ['Soğan', true],
    ]);
    expect(result.preservedChecks).toBe(1);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });
  it('miktar veya birim değiştiyse eski alındı işaretini sıfırlar', () => {
    const before = home([item('recipe-0'), item('extra-0', 'Süt', 2)]);
    const result = prepareHouseholdPublication(before, {
      menu: [],
      items: [item('recipe-0', 'Soğan', 120), { ...item('extra-0', 'Süt', 2), unit: 'paket' }],
    });
    expect(result.content.items.every((i) => !i.checked)).toBe(true);
    expect(result.changed).toHaveLength(2);
    expect(result.resetChecks).toBe(2);
  });
  it('ev halkının ek ürünlerini ve farklı birimlerini aynen korur, tahminle birleştirmez', () => {
    const manual = { ...item('shared-123', 'Süt', 2), unit: 'paket' as const };
    const before = home([manual]);
    const result = prepareHouseholdPublication(before, {
      menu: [],
      items: [item('extra-0', 'Süt', 500)],
    });
    expect(result.content.items).toHaveLength(2);
    expect(result.content.items[1]).toEqual(manual);
    expect(result.preservedChecks).toBe(1);
    expect(result.removed).toHaveLength(0);
  });
  it('ek ürün koruması kapatılırsa çıkarılacaklar açıkça listelenir; girdi değişmez', () => {
    const before = home([item('shared-a', 'Peçete')]);
    const snapshot = structuredClone(before);
    const result = prepareHouseholdPublication(before, { menu: [], items: [] }, false);
    expect(result.content.items).toHaveLength(0);
    expect(result.removed).toEqual(before.board.content.items);
    expect(before).toEqual(snapshot);
  });
  it('aynı adlı belirsiz satırlarda işaret tahmin etmez; eski satırları çıkarılanlarda gösterir', () => {
    const before = home([item('extra-0', 'Süt', 1), item('extra-1', 'Süt', 2)]);
    const result = prepareHouseholdPublication(before, {
      menu: [],
      items: [item('extra-0', 'Süt', 2)],
    });
    expect(result.ambiguous).toBe(1);
    expect(result.content.items[0].checked).toBe(false);
    expect(result.removed).toHaveLength(2);
    expect(result.added).toHaveLength(1);
  });
  it('Türkçe büyük/küçük harfi eşleştirir ama tarife ait ürünü kişisel ekstra sanmaz', () => {
    const before = home([item('recipe-0', 'ISPANAK'), item('extra-0', 'Ispanak', 60, false)]);
    const result = prepareHouseholdPublication(before, {
      menu: [],
      items: [item('extra-0', 'ıspanak', 60, true), item('recipe-0', 'ıspanak', 60, false)],
    });
    expect(result.content.items.map((i) => i.checked)).toEqual([false, true]);
  });
  it('menüde tarih/öğüne göre ekleme, çıkarma ve porsiyon değişimini ayırır', () => {
    const menu: BoardContent['menu'] = [
      { date: week, slot: 'dinner', title: 'Çorba', servings: 2 },
      { date: week, slot: 'lunch', title: 'Pilav', servings: 2 },
    ];
    const result = prepareHouseholdPublication(home([], menu), {
      items: [],
      menu: [
        { ...menu[0], servings: 4 },
        { date: '2026-10-06', slot: 'dinner', title: 'Nohut', servings: 2 },
      ],
    });
    expect(result.changedMeals[0].before.servings).toBe(2);
    expect(result.changedMeals[0].after.servings).toBe(4);
    expect(result.addedMeals[0].title).toBe('Nohut');
    expect(result.removedMeals[0].title).toBe('Pilav');
  });
  it('önizlemeden sonra farklı hane/hafta/sürümde kayda izin vermez', () => {
    const before = home([item('recipe-0')]);
    const result = prepareHouseholdPublication(before, { menu: [], items: [] });
    expect(publicationBoard(result, before).revision).toBe(1);
    for (const current of [
      { ...before, id: 'other-home' },
      { ...before, board: { ...before.board, revision: 2 } },
      { ...before, board: { ...before.board, week: '2026-10-12' } },
    ]) {
      expect(publicationIsCurrent(result, current)).toBe(false);
      expect(() => publicationBoard(result, current)).toThrow('HOUSEHOLD_CONFLICT');
    }
  });
  it('birleşim 200 ürünü aşarsa inceleme yapılabilir ama kaydedilemez; koruma kapatılınca sığar', () => {
    const before = home([item('shared-1')]);
    const incoming = {
      menu: [],
      items: Array.from({ length: 200 }, (_, i) => item(`recipe-${i}`, `Ürün ${i}`)),
    };
    const result = prepareHouseholdPublication(before, incoming);
    expect(result.issue).toContain('200');
    expect(() => publicationBoard(result, before)).toThrow();
    const reduced = prepareHouseholdPublication(before, incoming, false);
    expect(reduced.issue).toBe('');
    expect(publicationBoard(reduced, before).content.items).toHaveLength(200);
  });
  it('kişisel kaynak ile önizleme birbirinden bağımsızdır ve başka haftanın öğünü reddedilir', () => {
    const before = home([]);
    const source = { menu: [], items: [item('recipe-0')] };
    const result = prepareHouseholdPublication(before, source);
    source.items[0].quantity = 999;
    expect(result.content.items[0].quantity).toBe(60);
    expect(() =>
      prepareHouseholdPublication(before, {
        items: [],
        menu: [{ date: '2026-10-12', slot: 'dinner', title: 'Çorba', servings: 2 }],
      }),
    ).toThrow();
  });
});
