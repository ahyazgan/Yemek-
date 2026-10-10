import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { buildShoppingList, itemKey } from '../src/domain/logic';
import { parseState } from '../src/storage/schema';
import {
  resolveShoppingScope,
  shoppingChangeIsCurrent,
  shoppingGroups,
  shoppingSession,
  type ShoppingChange,
  type ShoppingScope,
} from '../src/domain/shoppingSession';

const week: ShoppingScope = { kind: 'week', week: '2026-10-05' };
const saved: ShoppingScope = { kind: 'saved', id: 'list-test' };
function fixture() {
  const state = initialState();
  state.profile = { people: 2, diets: [], budget: 'balanced' };
  state.meals = [
    { id: 'meal-1', date: '2026-10-05', slot: 'dinner', recipeId: 'mercimek', servings: 2 },
  ];
  state.pantry = { onion: 30, salt: 1000 };
  state.experience.extras = [
    {
      id: 'extra-1',
      week: '2026-10-05',
      name: 'Kağıt havlu',
      quantity: 2,
      unit: 'paket',
      checked: false,
    },
    { id: 'extra-2', week: '2026-10-12', name: 'Süt', quantity: 500, unit: 'ml', checked: false },
  ];
  state.savedLists = [
    {
      id: 'list-test',
      name: 'Hafta sonu',
      week: '2026-10-05',
      createdAt: '2026-10-05T12:00:00Z',
      items: buildShoppingList(state.meals, state.recipes, {}),
      extras: [structuredClone(state.experience.extras[0])],
      checked: [],
    },
  ];
  return parseState(state);
}
function change(state = fixture(), scope = week, rowId = 'ingredient:onion'): ShoppingChange {
  const row = shoppingSession(state, scope)!.rows.find((row) => row.id === rowId)!;
  return { scope, rowId, fingerprint: row.fingerprint, from: row.checked, to: !row.checked };
}
const apply = (state: ReturnType<typeof fixture>, value: ShoppingChange) =>
  reducer(state, { type: 'shoppingCheck', value });

describe('Alışveriş oturumu', () => {
  it('hafta tarihini ve tekil kaynak parametresini doğrular', () => {
    expect(resolveShoppingScope({}, '2026-10-05')).toEqual(week);
    expect(resolveShoppingScope({ savedList: 'list-test' }, '2026-10-05')).toEqual(saved);
    for (const value of ['2026-02-30', '2026-10-06', '', 'bad']) {
      expect(resolveShoppingScope({ week: value }, '2026-10-05')).toBeNull();
    }
    expect(resolveShoppingScope({ week: ['2026-10-05', '2026-10-12'] }, '2026-10-05')).toBeNull();
    expect(resolveShoppingScope({ savedList: ['list-test'] }, '2026-10-05')).toBeNull();
    expect(
      resolveShoppingScope({ savedList: 'list-test', week: '2026-10-05' }, '2026-10-05'),
    ).toBeNull();
    expect(resolveShoppingScope({ savedList: '' }, '2026-10-05')).toBeNull();
  });
  it('evden karşılananı çıkarır, net gramajı ve yalnızca bu haftanın ek ürününü gösterir', () => {
    const result = shoppingSession(fixture(), week)!;
    expect(result.rows.find((r) => r.id === 'ingredient:onion')).toMatchObject({
      amount: '30 g',
      item: { totalGrams: 60, pantryGrams: 30 },
    });
    expect(result.rows.some((r) => r.id === 'ingredient:salt')).toBe(false);
    expect(result.rows.find((r) => r.id === 'extra:extra-1')).toMatchObject({ amount: '2 paket' });
    expect(result.rows.some((r) => r.id === 'extra:extra-2')).toBe(false);
    expect(result.covered).toBe(1);
  });
  it('arayüz filtresi toplam ilerlemeyi değiştirmez; eski miktar işareti sayılmaz', () => {
    const state = fixture();
    state.checked['2026-10-05'] = ['onion:60', 'ghost:42'];
    state.experience.extras[0].checked = true;
    const result = shoppingSession(state, week)!;
    expect(result.done).toBe(1);
    expect(result.remaining).toBe(result.rows.length - 1);
    expect(shoppingGroups(result.rows, 'SOĞAN', true)[0].rows).toHaveLength(1);
    expect(result.done).toBe(1);
  });
  it('Türkçe ve Türkçe harfsiz çok sözcüklü ürün arar, boş sonucu tamamlandı saymaz', () => {
    const result = shoppingSession(fixture(), week)!;
    expect(shoppingGroups(result.rows, 'sogan', true)[0].rows[0].name).toBe('Soğan');
    expect(shoppingGroups(result.rows, '  KAGIT  havlu ', true)[0].rows[0].name).toBe(
      'Kağıt havlu',
    );
    expect(shoppingGroups(result.rows, 'olmayan', true)).toEqual([]);
    expect(result.remaining).toBeGreaterThan(0);
  });
  it('yalnız ek ürünle ve boş listede çalışır, ml birimini korur', () => {
    const state = fixture();
    state.meals = [];
    const result = shoppingSession(state, { kind: 'week', week: '2026-10-12' })!;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe('500 ml');
    state.experience.extras[1].quantity = 0.0001;
    expect(shoppingSession(state, { kind: 'week', week: '2026-10-12' })!.rows[0].amount).toBe(
      '0,0001 ml',
    );
    expect(shoppingSession(state, { kind: 'week', week: '2026-10-19' })).toMatchObject({
      rows: [],
      done: 0,
      remaining: 0,
    });
  });
  it('tarif işaretini kalıcı modele yazar; tekrar gelen aynı işlemi iki kez uygulamaz', () => {
    const state = fixture();
    const value = change(state);
    const next = apply(state, value);
    expect(next.checked['2026-10-05']).toContain('onion:30');
    expect(apply(next, value)).toBe(next);
    expect(shoppingSession(parseState(JSON.parse(JSON.stringify(next))), week)!.done).toBe(1);
    expect(state.checked).toEqual({});
  });
  it('geri alma yalnızca son işareti kaldırır; başka ürünleri korur', () => {
    const state = fixture();
    const value = change(state);
    let next = apply(state, value);
    next = apply(next, change(next, week, 'extra:extra-1'));
    const restored = apply(next, { ...value, from: true, to: false });
    expect(restored.checked['2026-10-05']).not.toContain('onion:30');
    expect(restored.experience.extras[0].checked).toBe(true);
  });
  it('stok veya porsiyon değişince eski işareti ve geri almayı reddeder', () => {
    const state = fixture();
    const value = change(state);
    const next = apply(state, value);
    next.pantry.onion = 20;
    expect(shoppingChangeIsCurrent(next, { ...value, from: true, to: false })).toBe(false);
    expect(apply(next, value)).toBe(next);
    expect(shoppingSession(next, week)!.rows.find((r) => r.id === value.rowId)?.checked).toBe(
      false,
    );
    state.meals[0].servings = 4;
    expect(apply(state, value)).toBe(state);
  });
  it('ek ürün miktarı/birimi veya işareti sonradan değişince eski geri almayı reddeder', () => {
    const state = fixture();
    const value = change(state, week, 'extra:extra-1');
    const next = apply(state, value);
    const undo = { ...value, from: true, to: false };
    expect(shoppingChangeIsCurrent(next, undo)).toBe(true);
    next.experience.extras[0].unit = 'adet';
    expect(apply(next, undo)).toBe(next);
    const changedAgain = apply(state, value);
    changedAgain.experience.extras[0].checked = false;
    expect(shoppingChangeIsCurrent(changedAgain, undo)).toBe(false);
  });
  it('kayıtlı kopya güncel menü ve stoktan bağımsızdır; kaydedilen adı ve yemekleri korur', () => {
    const state = fixture();
    state.meals = [];
    state.pantry.onion = 999;
    const result = shoppingSession(state, saved)!;
    expect(result.name).toBe('Hafta sonu');
    expect(result.rows.find((r) => r.id === 'ingredient:onion')).toMatchObject({
      amount: '60 g',
      item: { recipeTitles: ['Kırmızı mercimek çorbası'] },
    });
    expect(shoppingGroups(result.rows, '', false).at(-1)?.category).toBe('Diğer ürünler');
  });
  it('kayıtlı tarif/ek ürün işaretleri aktif listeye ve başka kayıtlı listeye geçmez', () => {
    const state = fixture();
    state.savedLists.push({ ...structuredClone(state.savedLists[0]), id: 'list-other' });
    let next = apply(state, change(state, saved));
    next = apply(next, change(next, saved, 'extra:extra-1'));
    expect(shoppingSession(next, saved)!.done).toBe(2);
    expect(shoppingSession(next, week)!.done).toBe(0);
    expect(shoppingSession(next, { kind: 'saved', id: 'list-other' })!.done).toBe(0);
    expect(parseState(next)).toEqual(next);
    expect(next.savedLists[0].checked).toContain(
      itemKey(next.savedLists[0].items.find((i) => i.ingredientId === 'onion')!),
    );
  });
  it('silinmiş liste veya ürünü eski işlemle yeniden oluşturmaz', () => {
    const state = fixture();
    const savedChange = change(state, saved);
    state.savedLists = [];
    expect(shoppingSession(state, saved)).toBeNull();
    expect(apply(state, savedChange)).toBe(state);
    const extraChange = change(state, week, 'extra:extra-1');
    state.experience.extras = [];
    expect(apply(state, extraChange)).toBe(state);
  });
  it('aynı adlı ürünleri, ek ürünü ve gram/ml miktarlarını birleştirmez', () => {
    const state = fixture();
    state.experience.extras.push({
      id: 'extra-onion',
      name: 'Soğan',
      week: '2026-10-05',
      quantity: 30,
      unit: 'g',
      checked: true,
    });
    const result = shoppingSession(state, week)!;
    expect(result.rows.filter((r) => r.name === 'Soğan')).toHaveLength(2);
    expect(result.done).toBe(1);
    expect(result.rows.find((r) => r.id === 'ingredient:onion')?.checked).toBe(false);
  });
});
