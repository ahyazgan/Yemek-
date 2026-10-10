import { describe, expect, it, vi } from 'vitest';
import {
  createReminderController,
  ReminderPort,
  ScheduledReminder,
  weeklyTime,
} from '../src/domain/reminders';
import { recipeText, menuText } from '../src/domain/sharing';
import { allIngredients } from '../src/domain/ingredients';
import { initialState, reducer } from '../src/domain/state';
import { parseRecipeText, resolveImportRows } from '../src/domain/recipeImport';
import { parseState } from '../src/storage/schema';
function setup() {
  let list: ScheduledReminder[] = [];
  let granted = true;
  const port: ReminderPort = {
    list: async () => list,
    permission: vi.fn(async () => granted),
    schedule: vi.fn(async (owner, input) => {
      const id = String(Math.random());
      list.push({ id, owner, day: input.day, time: input.time });
      return id;
    }),
    cancel: vi.fn(async (id) => {
      list = list.filter((i) => i.id !== id);
    }),
  };
  return {
    port,
    controller: createReminderController(port),
    list: () => list,
    deny: () => {
      granted = false;
    },
  };
}
describe('Cihaz içi hatırlatma', () => {
  const input = { enabled: true, day: 0, time: '18:30' };
  it('Pazartesi/Pazar ve dakika eşlemesi, geçersiz gün/saat', () => {
    expect(weeklyTime(input)).toEqual({ weekday: 2, hour: 18, minute: 30 });
    expect(weeklyTime({ ...input, day: 6 })).toEqual({ weekday: 1, hour: 18, minute: 30 });
    expect(() => weeklyTime({ ...input, day: 7 })).toThrow();
    expect(() => weeklyTime({ ...input, time: '25:70' })).toThrow();
  });
  it('aynı plan tekrar kaydedilince tek bildirim kalır, kapatma iptal eder', async () => {
    const x = setup();
    await x.controller.setOwner('a');
    await x.controller.apply('a', input);
    await x.controller.apply('a', input);
    expect(x.list()).toHaveLength(1);
    await x.controller.apply('a', { ...input, enabled: false });
    expect(x.list()).toHaveLength(0);
  });
  it('izinsiz durumda mevcut planı silmez ve başarı dönmez', async () => {
    const x = setup();
    await x.controller.setOwner('a');
    await x.controller.apply('a', input);
    x.deny();
    await expect(x.controller.apply('a', input)).rejects.toThrow('izni');
    expect(x.list()).toHaveLength(1);
  });
  it('hesap değişiminde eski plan silinir; yeni hesapta kendiliğinden kurulmaz', async () => {
    const x = setup();
    await x.controller.setOwner('a');
    await x.controller.apply('a', input);
    await x.controller.setOwner('b');
    expect(x.list()).toHaveLength(0);
    await expect(x.controller.apply('a', input)).rejects.toThrow('Hesap değişti');
  });
  it('izin beklenirken hesap değişirse eski hesaba plan kurulmaz', async () => {
    const x = setup();
    await x.controller.setOwner('a');
    let release!: (value: boolean) => void;
    x.port.permission = () =>
      new Promise<boolean>((resolve) => {
        release = resolve;
      });
    const applying = x.controller.apply('a', input);
    await Promise.resolve();
    const switching = x.controller.setOwner('b');
    release(true);
    await expect(applying).rejects.toThrow('Hesap değişti');
    await switching;
    expect(x.port.schedule).not.toHaveBeenCalled();
  });
  it('OS planlama hatasında başarı dönmez', async () => {
    const x = setup();
    await x.controller.setOwner('a');
    x.port.schedule = async () => {
      throw new Error('OS');
    };
    await expect(x.controller.apply('a', input)).rejects.toThrow('OS');
  });
});
describe('Paylaşım ve içerik', () => {
  it('tarif paylaşımı seçilen porsiyona göre gramajla yeniden aktarılabilir', () => {
    const state = initialState(),
      recipe = state.recipes[0];
    const text = recipeText(recipe, allIngredients(state), 3);
    const draft = parseRecipeText(text, allIngredients(state));
    expect(Number(draft.servings)).toBe(3);
    expect(draft.rows).toHaveLength(recipe.ingredients.length);
    expect(resolveImportRows(draft.rows, allIngredients(state))).toHaveLength(
      recipe.ingredients.length,
    );
    expect(text).not.toContain('profile');
  });
  it('menü paylaşımı seçilen haftayla sınırlıdır ve hesap verisi içermez', () => {
    const state = initialState();
    state.meals = [
      { id: 'a', date: '2026-10-05', slot: 'dinner', recipeId: 'mercimek', servings: 3 },
      { id: 'b', date: '2026-10-12', slot: 'dinner', recipeId: 'menemen', servings: 2 },
    ];
    const text = menuText(state, '2026-10-05');
    expect(text).toContain('mercimek');
    expect(text).not.toContain('menemen');
    expect(text).toContain('3 kişilik');
  });
  it('kullanılmış veya katalog tarifi silinmez, kullanılmayan özel tarif temizlenir', () => {
    let state = initialState();
    expect(reducer(state, { type: 'deleteRecipe', id: 'mercimek' })).toBe(state);
    state = reducer(state, { type: 'recipe', value: { ...state.recipes[0], id: 'custom-a' } });
    state.experience.favorites = ['custom-a'];
    const deleted = reducer(state, { type: 'deleteRecipe', id: 'custom-a' });
    expect(deleted.recipes.some((r) => r.id === 'custom-a')).toBe(false);
    expect(parseState(deleted).experience.favorites).toEqual([]);
    state.meals = [
      { id: 'm', date: '2026-10-05', slot: 'dinner', recipeId: 'custom-a', servings: 2 },
    ];
    expect(reducer(state, { type: 'deleteRecipe', id: 'custom-a' })).toBe(state);
  });
});
