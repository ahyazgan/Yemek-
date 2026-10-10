import { expect, test, type Page } from '@playwright/test';
import { initialState } from '../src/domain/state';
import { addDays, weekStart } from '../src/domain/logic';
import type { AppState } from '../src/domain/model';

const key = '@yazgan/sofra/offline/v1';
async function seed(page: Page, setup?: (state: AppState) => void) {
  const state = initialState();
  state.profile = { people: 2, diets: [], budget: 'balanced' };
  setup?.(state);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Devam et', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), key)).not.toBeNull();
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key,
    state,
  });
  await page.goto('/');
}

test('yeni kahvaltı seçkisinden çılbırı porsiyonla planla; cacıkla ortak yoğurt birleştirilir', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page, (state) => {
    state.pantry = { yogurt: 150 };
    state.meals = [
      {
        id: 'cacik-meal',
        date: addDays(weekStart(), 1),
        slot: 'dinner',
        recipeId: 'cacik',
        servings: 2,
      },
    ];
  });
  await page.getByRole('button', { name: 'Kahvaltıya bir tabak daha seçkisini aç' }).click();
  await expect(page.getByText('Bu seçkiden sana uygun 5 tarif', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: 'docs/screenshots/39-kahvalti-seckisi.png' });
  await page.getByRole('button', { name: 'Sarımsaklı yoğurtlu çılbır tarifini incele' }).click();
  await page.getByRole('button', { name: 'Porsiyon azalt', exact: true }).click();
  await expect(page.getByTestId('recipe-photo').locator('img')).toHaveAttribute('src', /cilbir/);
  await page.getByTestId('recipe-photo').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/40-yeni-tarif.png' });
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (k) =>
          JSON.parse(localStorage.getItem(k)!).meals.find(
            (m: { recipeId: string }) => m.recipeId === 'cilbir',
          )?.servings,
        key,
      ),
    )
    .toBe(1);
  await page.goto('/list');
  await page.getByRole('button', { name: 'Alışverişe başla', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Yoğurt, 250 g', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yoğurt hangi yemeklerde?', exact: true }).click();
  await expect(page.getByText('Toplam ihtiyaç: 400 g', { exact: true })).toBeVisible();
  await expect(page.getByText('Evden karşılanan: 150 g', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Naneli cacık · Sarımsaklı yoğurtlu çılbır', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Yoğurt, 250 g', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('26 tarifli kayıt 40 olur; kişisel değişiklikler korunur ve yeni görseller mobilde yüklenir', async ({
  page,
}) => {
  await seed(page, (state) => {
    state.recipes = state.recipes.slice(0, 26);
    state.recipes[0].title = 'Annemin mercimeği';
    state.pantry = { onion: 77 };
    state.experience.favorites = ['mercimek'];
  });
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).recipes.length, key))
    .toBe(40);
  await expect(
    page.getByRole('button', { name: 'Annemin mercimeği, 30 dakika', exact: true }),
  ).toBeVisible();
  await page.goto('/inspiration/soguk-sofralar');
  await expect(page.getByRole('button', { name: /tarifini incele$/ })).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  await page.reload();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
  expect(saved.pantry.onion).toBe(77);
  expect(saved.experience.favorites).toEqual(['mercimek']);
  expect(saved.recipes).toHaveLength(40);
});
