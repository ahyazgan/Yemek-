import { expect, Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const key = '@yazgan/sofra/offline/v1';
async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Soframı oluşturalım' }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
}
async function tab(page: Page, label: string) {
  if (label === 'Mutfağım')
    await page.getByRole('button', { name: 'Mutfağım', exact: true }).click();
  else await page.getByText(label, { exact: true }).last().click();
}
test('onboarding → iki tarif → stok düşümü → kayıt → yeniden açma', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await onboard(page);
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/01-kesfet.png' });
  await page.getByRole('button', { name: 'Kırmızı mercimek çorbası, 30 dakika' }).click();
  await expect(page.getByText('120 g', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/02-tarif.png' });
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await expect(page.getByText('1 öğün planlandı')).toBeVisible();
  await tab(page, 'Tarifler');
  await page.getByRole('button', { name: 'Sebzeli bulgur pilavı, 30 dakika' }).click();
  await page.getByRole('button', { name: 'Günü değiştir' }).click();
  await page.getByRole('button', { name: 'Öğle', exact: true }).click();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await expect(page.getByText('2 öğün planlandı')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/03-haftam.png' });
  await tab(page, 'Listem');
  await expect(page.getByRole('checkbox', { name: 'Soğan, 120 g', exact: true })).toBeVisible();
  await tab(page, 'Mutfağım');
  await page.getByRole('textbox', { name: 'Soğan · evdeki miktar (g)' }).fill('50');
  await page.getByRole('button', { name: 'Evdeki miktarı kaydet' }).click();
  await tab(page, 'Listem');
  await expect(page.getByRole('checkbox', { name: 'Soğan, 70 g', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tuz evde var', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Tuz,/ })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Soğan, 70 g', exact: true }).click();
  await page.getByRole('button', { name: 'Bu listeyi sakla' }).click();
  await page.getByRole('textbox', { name: 'Liste adı', exact: true }).fill('İlk haftam');
  await page.getByRole('button', { name: 'Listeyi kaydet', exact: true }).click();
  await expect(
    page.getByText('Liste kaydedildi. Menü değişse de bu kopya aynı kalır.'),
  ).toBeVisible();
  await page
    .getByRole('checkbox', { name: 'Kırmızı mercimek, 120 g', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/04-listem.png' });
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').savedLists?.length, key),
    )
    .toBe(1);
  await page.goto('/');
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
  await context.setOffline(true);
  await tab(page, 'Listem');
  await page.getByRole('button', { name: 'Kayıtlı', exact: true }).click();
  await page.getByRole('button', { name: 'İlk haftam listesini aç' }).click();
  await expect(page.getByRole('checkbox', { name: 'Soğan, 70 g', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Kırmızı mercimek, 120 g', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Kırmızı mercimek, 120 g', exact: true }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});
test('Türkçe arama, boş sonuç, porsiyon sınırları ve tarif düzenleme', async ({ page }) => {
  await onboard(page);
  await page.getByRole('textbox', { name: 'Tarif ara' }).fill('ISPANAK');
  await expect(page.getByRole('button', { name: 'Zeytinyağlı ıspanak, 30 dakika' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tarif ara' }).fill('xyzxyz');
  await expect(page.getByText('Biraz farklı bakalım')).toBeVisible();
  await page.getByRole('button', { name: 'Filtreleri temizle' }).click();
  await page.getByRole('button', { name: 'Kırmızı mercimek çorbası, 30 dakika' }).click();
  await page.getByRole('button', { name: 'Porsiyon azalt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Porsiyon azalt', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tarifi düzenle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tarif adı', exact: true }).fill('');
  await page.getByRole('button', { name: 'Tarif değişikliklerini kaydet' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('textbox', { name: 'Tarif adı', exact: true }).fill('Benim mercimek çorbam');
  await page.getByRole('textbox', { name: 'Kırmızı mercimek (g)', exact: true }).fill('300');
  await page.getByRole('button', { name: 'Tarif değişikliklerini kaydet' }).click();
  await expect(page.getByText('Benim mercimek çorbam', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('75 g', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').recipes?.[0]?.title, key),
    )
    .toBe('Benim mercimek çorbam');
});
test('bozuk kayıt otomatik silinmez; açık sıfırlamayla kurtarılır', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, '{invalid'), key);
  await page.goto('/');
  await expect(page.getByText('Kayıtlar okunamadı')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe('{invalid');
  await page.getByRole('button', { name: 'Sıfırlama seçenekleri' }).click();
  await page.getByRole('button', { name: 'Yerel veriyi sil ve yeniden başla' }).click();
  await expect(page.getByRole('button', { name: 'Devam et', exact: true })).toBeVisible();
});

test('planın boş durumundan yemek seçimi, hafta ayrımı ve öğün kaldırma', async ({ page }) => {
  await onboard(page);
  await tab(page, 'Listem');
  await expect(page.getByText('Önce sofranı planla', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Haftama git', exact: true }).click();
  await page
    .getByRole('button', { name: /Öğle yemek ekle$/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Tavada menemen, 20 dakika' }).click();
  await page.getByRole('button', { name: 'Menüme ekle', exact: true }).click();
  await expect(page.getByText('1 öğün planlandı')).toBeVisible();
  await page.getByRole('button', { name: 'Sonraki hafta', exact: true }).click();
  await expect(page.getByText('0 öğün planlandı')).toBeVisible();
  await page.getByRole('button', { name: 'Önceki hafta', exact: true }).click();
  await page.getByRole('button', { name: /Öğle öğününü kaldır$/ }).click();
  await expect(page.getByText('0 öğün planlandı')).toBeVisible();
});

test('kaydetme hatası görünür ve yeniden deneme kurtarır', async ({ page }) => {
  await onboard(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function () {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await tab(page, 'Mutfağım');
  await page.getByRole('textbox', { name: 'Soğan · evdeki miktar (g)' }).fill('125');
  await page.getByRole('button', { name: 'Evdeki miktarı kaydet' }).click();
  await expect(
    page.getByText('Değişiklikler cihazda kaydedilemedi. Uygulamayı kapatmadan tekrar dene.'),
  ).toBeVisible();
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await page.getByRole('button', { name: 'Kaydetmeyi tekrar dene' }).click();
  await expect(page.getByRole('button', { name: 'Kaydetmeyi tekrar dene' })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').pantry?.onion, key),
    )
    .toBe(125);
});

test('hızlı seçim ayrı günlere ekler; dolu menüyü ezmez; filtreler isteğe bağlıdır', async ({
  page,
}) => {
  await onboard(page);
  await expect(page.getByRole('switch', { name: 'Tercihlerime uygun tarifler' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filtrele', exact: true }).click();
  await page.getByRole('button', { name: 'Vegan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tavada menemen, 20 dakika' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tümü', exact: true }).click();
  await page.getByRole('button', { name: '40 tarifi göster', exact: true }).click();
  const titles = [
    'Kırmızı mercimek çorbası',
    'Tavada menemen',
    'Sebzeli bulgur pilavı',
    'Nohutlu pirinç pilavı',
    'Yoğurtlu kabak',
    'Sebzeli tavuk sote',
    'Zeytinyağlı ıspanak',
  ];
  for (const title of titles)
    await page.getByRole('button', { name: title + ' menüye ekle', exact: true }).click();
  await expect(page.getByText('7 öğün seçtin', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').meals?.length, key),
    )
    .toBe(7);
  const before = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals, key);
  expect(new Set(before.map((meal: { date: string }) => meal.date)).size).toBe(7);
  await page
    .getByRole('button', { name: 'Ev usulü kuru fasulye menüye ekle', exact: true })
    .click();
  await expect(page.getByText('Akşam menün dolu.', { exact: false })).toBeVisible();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals, key)).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Menümü gör', exact: true }).click();
  await expect(page.getByText('7 öğün planlandı')).toBeVisible();
});

test('dar telefon ve masaüstünde kartlar taşmaz; görseller yerel olarak yüklenir', async ({
  page,
}) => {
  await onboard(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('button', { name: /^Günün fikri:/ })).toBeInViewport();
  await page
    .getByRole('button', { name: 'Kırmızı mercimek çorbası menüye ekle', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'Kırmızı mercimek çorbası menüye ekle', exact: true }),
  ).toBeInViewport();
  const firstCard = page.getByRole('button', {
    name: 'Kırmızı mercimek çorbası, 30 dakika',
    exact: true,
  });
  const secondCard = page.getByRole('button', { name: 'Tavada menemen, 20 dakika', exact: true });
  await expect
    .poll(async () =>
      Math.abs((await firstCard.boundingBox())!.y - (await secondCard.boundingBox())!.y),
    )
    .toBeLessThan(2);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll(
          (images) =>
            images.length >= 8 &&
            images.every(
              (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/05-dar-telefon.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  const thirdCard = page.getByRole('button', {
    name: 'Sebzeli bulgur pilavı, 30 dakika',
    exact: true,
  });
  await expect
    .poll(async () =>
      Math.abs((await firstCard.boundingBox())!.y - (await thirdCard.boundingBox())!.y),
    )
    .toBeLessThan(2);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/06-masaustu.png' });
});

test('market seçimi yalnızca resmî siteyi açar; listeyi göndermez veya sipariş oluşturmaz', async ({
  page,
  context,
}) => {
  const destinations = [
    ['Migros', 'https://www.migros.com.tr/'],
    ['Trendyol', 'https://www.trendyol.com/'],
    ['CarrefourSA', 'https://www.carrefoursa.com/'],
  ];
  for (const [, url] of destinations) {
    await context.route(url, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>External navigation test</title>',
      }),
    );
  }
  await onboard(page);
  await page
    .getByRole('button', { name: 'Kırmızı mercimek çorbası menüye ekle', exact: true })
    .click();
  await tab(page, 'Listem');
  await expect(page.getByRole('button', { name: 'Market seç', exact: true })).toBeInViewport();
  await page.screenshot({ path: 'docs/screenshots/07-listeden-market.png' });
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').meals?.length, key),
    )
    .toBe(1);
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.getByRole('button', { name: 'Market seç', exact: true }).click();
  await expect(
    page.getByText('Listen otomatik olarak sepete aktarılmaz.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Sepet bağlantısı yok', { exact: true })).toHaveCount(3);
  await page.screenshot({ path: 'docs/screenshots/08-market-sec.png' });
  for (const [name, url] of destinations) {
    const link = page.getByRole('link', { name: name + ' sitesini aç', exact: true });
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(url);
    await popup.close();
  }
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('ortak tasarım: masaüstü gezinme ve tarif detayının telefon yerleşimi', async ({ page }) => {
  await onboard(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole('button', { name: 'Kırmızı mercimek çorbası, 30 dakika', exact: true })
    .click();
  const photo = page.getByTestId('recipe-photo');
  const summary = page.getByTestId('recipe-summary');
  await expect
    .poll(async () => (await photo.boundingBox())!.x > (await summary.boundingBox())!.x)
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Menüme ekle', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Tarifler', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('16px OutfitSemiBold')))
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/09-tarif-masaustu.png' });
  await page.getByRole('button', { name: 'Yapılışı', exact: true }).click();
  await expect(
    page.getByText('Mercimeği süzgeçte yıka. Soğan, havuç ve patatesi küçük doğra.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(async () => (await photo.boundingBox())!.y < (await summary.boundingBox())!.y)
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Menüme ekle', exact: true })).toBeInViewport();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Tarif ara' })).toBeVisible();
});

test('haftamı hazırla: öneriyi değiştir, ekle, öğünü değiştir ve listeye geç', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Haftamı hazırla', exact: true }).click();
  await expect(page.getByTestId('suggested-dinner')).toHaveCount(5);
  const firstSuggestions = await page.getByTestId('suggested-dinner').allTextContents();
  await page.getByRole('button', { name: 'Başka öneriler', exact: true }).click();
  expect(await page.getByTestId('suggested-dinner').allTextContents()).not.toEqual(
    firstSuggestions,
  );
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals.length, key)).toBe(
    0,
  );
  await page.getByText('Haftanı birlikte hazırlayalım', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/10-haftami-hazirla.png' });
  await page.getByRole('button', { name: '3 akşam', exact: true }).click();
  await expect(page.getByTestId('suggested-dinner')).toHaveCount(3);
  await page.getByRole('button', { name: '3 yemeği menüme ekle', exact: true }).click();
  await expect(page.getByText('3 öğün planlandı', { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals.length, key))
    .toBe(3);
  const original = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem(k)!).meals as {
        id: string;
        date: string;
        slot: string;
        recipeId: string;
        servings: number;
      }[],
    key,
  );
  const meal = original[0];
  const replacement =
    meal.recipeId === 'mercimek' ? 'Sebzeli bulgur pilavı' : 'Kırmızı mercimek çorbası';
  await page
    .getByRole('button', { name: meal.date + ' Akşam yemeğini değiştir', exact: true })
    .click();
  await page.getByRole('button', { name: replacement + ', 30 dakika', exact: true }).click();
  await page.getByRole('button', { name: 'Bu öğünü değiştir', exact: true }).click();
  await expect(page.getByText('3 öğün planlandı', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        ({ k, id }) =>
          JSON.parse(localStorage.getItem(k)!).meals.find((m: { id: string }) => m.id === id)
            ?.recipeId,
        { k: key, id: meal.id },
      ),
    )
    .not.toBe(meal.recipeId);
  const after = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).meals as typeof original,
    key,
  );
  expect(after.find((entry) => entry.id === meal.id)).toMatchObject({
    id: meal.id,
    date: meal.date,
    slot: meal.slot,
    servings: meal.servings,
  });
  expect(after.filter((entry) => entry.id !== meal.id)).toEqual(
    original.filter((entry) => entry.id !== meal.id),
  );
  await page.getByRole('button', { name: 'Alışveriş listemi gör', exact: true }).click();
  await expect(page.getByRole('checkbox').first()).toBeVisible();
  await page.getByRole('button', { name: 'Market seç', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Migros sitesini aç', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Migros sitesini aç', exact: true })).toBeVisible();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).meals.length, key)).toBe(
    3,
  );
});
