import { expect, Page, test } from '@playwright/test';
import { createBackupFile } from '../src/domain/backupFile';
import { initialState } from '../src/domain/state';

const key = '@yazgan/sofra/offline/v1';
async function choose(page: Page, name: string, buffer: Buffer) {
  const waiting = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Yedek dosyası seç', exact: true }).click();
  await (await waiting).setFiles({ name, mimeType: 'application/json', buffer });
}
function sample() {
  const state = initialState();
  state.profile = { people: 4, diets: ['vegetarian'], budget: 'balanced' };
  state.experience.favorites = ['mercimek'];
  state.recipes[0] = {
    ...state.recipes[0],
    title: 'Şölen çorbası 🥣',
    photo: {
      dataUri: 'data:image/jpeg;base64,/9j/AAAA',
      width: 20,
      height: 20,
      caption: 'Kişisel fotoğraf',
    },
  };
  return createBackupFile(state);
}

test('ilk açılışta dosyadan geri yükleme, indirme ve boş oturuma yeniden taşıma', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Yedeğimden devam et' }).click();
  const file = sample();
  await choose(page, file.name, Buffer.from(file.text));
  await expect(page.getByTestId('backup-preview')).toContainText('4 kişilik sofra');
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).profile, key)).toBeNull();
  await page.getByRole('button', { name: 'Bu yedeği geri yükle' }).click();
  await expect(page.getByText(/Yedek geri yüklendi/)).toBeVisible();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Yedek dosyasını kaydet', exact: true }).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/^sofra-yedek-.*\.json$/);
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(chunk as Buffer);
  const downloaded = Buffer.concat(chunks);
  const content = JSON.parse(downloaded.toString('utf8'));
  expect(content.data.recipes[0].title).toBe('Şölen çorbası 🥣');
  expect(content.data.recipes[0].photo.caption).toBe('Kişisel fotoğraf');
  expect(Object.keys(content)).toEqual(['application', 'exportedAt', 'data']);
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Yedeğimden devam et' }).click();
  await choose(page, download.suggestedFilename(), downloaded);
  await page.getByRole('button', { name: 'Bu yedeği geri yükle' }).click();
  await expect(page.getByText(/Yedek geri yüklendi/)).toBeVisible();
  await page.getByRole('button', { name: 'Soframa dön', exact: true }).click();
  await expect(page.getByPlaceholder('Canın ne çekiyor?')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).experience.favorites, key),
    )
    .toEqual(['mercimek']);
});

test('yanlış, bozuk ve büyük dosya mevcut kayıtları değiştirmez; ardından geçerli dosya açılır', async ({
  page,
}) => {
  await page.goto('/backups');
  await expect(page.getByRole('button', { name: 'Yedek dosyası seç' })).toBeVisible();
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  for (const [name, content, message] of [
    ['fotograf.png', 'not a backup', 'Bir Sofra yedeği seç'],
    ['yedek.json', '{broken', 'geçerli bir Sofra yedeği değil'],
    ['buyuk.json', 'a'.repeat(15000001), '15 MB'],
  ]) {
    await choose(page, name, Buffer.from(content));
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByTestId('backup-preview')).toHaveCount(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  }
  await choose(page, 'eski-yedek.TXT', Buffer.from('\uFEFF' + sample().text));
  await expect(page.getByTestId('backup-preview')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
});

test('dosya seçimi iptali ve sayfadan ayrılma bekleyen işlemi temizler', async ({ page }) => {
  await page.goto('/backups');
  let waiting = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Yedek dosyası seç' }).click();
  await waiting;
  await page.locator('input[type=file]').dispatchEvent('cancel');
  await expect(page.getByRole('button', { name: 'Yedek dosyası seç' })).toBeEnabled();
  waiting = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Yedek dosyası seç' }).click();
  await waiting;
  await page.getByRole('button', { name: 'Dosya seçimini iptal et' }).click();
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Soframı oluşturmaya dön' }).click();
  await page.getByRole('button', { name: 'Yedeğimden devam et' }).click();
  waiting = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Yedek dosyası seç' }).click();
  await waiting;
  await page.goBack();
  await expect(page.getByText('Kaç kişilik bir sofra?', { exact: true })).toBeVisible();
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Yedeğimden devam et' }).click();
  await expect(page.getByRole('button', { name: 'Yedek dosyası seç' })).toBeEnabled();
});

test('indirme hatası başarı göstermez ve metin alternatifi kullanılabilir', async ({ page }) => {
  await page.goto('/backups');
  await expect(page.getByRole('button', { name: 'Yedek dosyasını kaydet' })).toBeVisible();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('blocked');
    };
  });
  await page.getByRole('button', { name: 'Yedek dosyasını kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('İşlem tamamlanamadı');
  await expect(page.getByText(/İndirme başlatıldı/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Metinle aktarım seçenekleri' }).click();
  await page.getByRole('button', { name: 'Yedek metnini göster' }).click();
  const content = JSON.parse(
    await page.getByRole('textbox', { name: 'Kopyalanacak yedek' }).inputValue(),
  );
  expect(content.application).toBe('Sofra');
  expect(content.data.recipes).toHaveLength(40);
});

test('320px ekranda yedek ve karşılaştırma taşmaz, dosya adı çalıştırılmaz', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/backups');
  await expect(page.getByRole('button', { name: 'Yedek dosyası seç' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/31-yedek-dosyasi.png' });
  await choose(
    page,
    '<script>alert(1)</script>çok-uzun-bir-yedek-dosyasi.json',
    Buffer.from(sample().text),
  );
  await expect(page.getByTestId('backup-preview')).toBeVisible();
  await expect(page.getByTestId('backup-preview')).toContainText('Favori');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(dialogs).toEqual([]);
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await choose(page, 'sofra-yedek-2026-10-10.json', Buffer.from(sample().text));
  await expect(page.getByTestId('backup-preview')).toBeVisible();
  await expect(page.getByText('ÖNCE KONTROL ET', { exact: true })).toBeInViewport();
  await page.screenshot({ path: 'docs/screenshots/32-yedek-karsilastirma.png' });
});
