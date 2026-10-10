import { describe, expect, it, vi } from 'vitest';
import { initialState, reducer } from '../src/domain/state';
import { parseState, recipeSchema } from '../src/storage/schema';
import { withRecipePhoto, MAX_PHOTO_LENGTH } from '../src/domain/recipeMedia';
import { parseBackup } from '../src/domain/backup';
import { extractPageRecipes, pageRecipeDraft } from '../src/domain/recipePage';
import { resolveImportRows } from '../src/domain/recipeImport';
import { allIngredients } from '../src/domain/ingredients';
import { recipeText } from '../src/domain/sharing';
import { allowedPageUrl, createImportHandler } from '../supabase/functions/import-recipe/handler';
const json = {
  '@type': ['CreativeWork', 'Recipe'],
  name: 'Soğanlı bulgur pilavı',
  recipeYield: '4 porsiyon',
  totalTime: 'PT30M',
  recipeIngredient: ['300 g pilavlık bulgur', '120 g soğan'],
  recipeInstructions: [
    {
      '@type': 'HowToSection',
      itemListElement: [
        { '@type': 'HowToStep', text: 'Soğanı <b>doğra</b>.' },
        { '@type': 'HowToStep', text: 'Bulguru ekle &amp; pişir.' },
      ],
    },
  ],
  author: { '@type': 'Person', name: 'Tarif sahibi' },
};
const photo = {
  dataUri: 'data:image/jpeg;base64,/9j/aaaa',
  width: 1,
  height: 1,
  caption: 'Kendi fotoğrafım',
};
const html = (data: unknown) =>
  '<script type="application/ld+json">' +
  JSON.stringify(data).replace(/</g, '\\u003c') +
  '</script>';
describe('Özel fotoğraf ve kaynaklı tarif', () => {
  it('eski kaydı korur; fotoğrafın yedek/geri yükleme yolculuğu kayıpsızdır', () => {
    const initial = initialState();
    expect(parseState(initial).recipes[0].photo).toBeUndefined();
    const changed = withRecipePhoto(initial, 'mercimek', photo);
    const state = parseState(reducer(initial, { type: 'recipe', value: changed }));
    const restored = parseBackup(
      JSON.stringify({ application: 'Sofra', exportedAt: new Date().toISOString(), data: state }),
    );
    expect(restored.state.recipes.find((r) => r.id === 'mercimek')?.photo).toEqual(photo);
    expect(initial.recipes.find((r) => r.id === 'mercimek')?.photo).toBeUndefined();
    expect(withRecipePhoto(state, 'mercimek', null).photo).toBeNull();
  });
  it('fotoğraf veri türü, tekil/toplam boyut sınırı ve olmayan tarifi reddeder', () => {
    const state = initialState();
    expect(() =>
      withRecipePhoto(state, 'mercimek', { ...photo, dataUri: 'data:image/svg+xml,<svg/>' }),
    ).toThrow();
    expect(() =>
      withRecipePhoto(state, 'mercimek', { ...photo, dataUri: 'https://example.com/x.jpg' }),
    ).toThrow();
    expect(() =>
      withRecipePhoto(state, 'mercimek', {
        ...photo,
        dataUri: photo.dataUri + 'a'.repeat(MAX_PHOTO_LENGTH),
      }),
    ).toThrow();
    expect(() => withRecipePhoto(state, 'missing', photo)).toThrow();
    state.recipes.slice(0, 10).forEach((r) => {
      r.photo = { ...photo, dataUri: photo.dataUri + 'a'.repeat(210000) };
    });
    expect(() => parseState(state)).toThrow();
    expect(() => withRecipePhoto(state, state.recipes[11].id, photo)).toThrow('alanın doldu');
  });
  it('fotoğraf güncellemesi aynı sırada değişmiş tarifi eski haline döndürmez', () => {
    const state = initialState();
    state.recipes[0].title = 'Sonradan değişen başlık';
    expect(withRecipePhoto(state, state.recipes[0].id, photo).title).toBe(
      'Sonradan değişen başlık',
    );
  });
  it('kaynak bağlantısı şemada korunur ve paylaşım metnine katılır', () => {
    const state = initialState();
    const recipe = recipeSchema.parse({
      ...state.recipes[0],
      source: {
        url: 'https://recipes.example.org/pilav',
        author: 'Yazar',
        importedAt: new Date().toISOString(),
      },
    });
    expect(recipeText(recipe, allIngredients(state), 2)).toContain(
      'Kaynak: https://recipes.example.org/pilav',
    );
    expect(
      recipeSchema.safeParse({
        ...recipe,
        source: { ...recipe.source, url: 'javascript:alert(1)' },
      }).success,
    ).toBe(false);
  });
});
describe('Recipe JSON-LD taslağı', () => {
  it('JSON, graph ve iç içe adımları okur; gramları onay taslağına taşır', () => {
    const result = extractPageRecipes(html({ '@graph': [{ '@type': 'WebPage' }, json] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      servings: '4',
      minutes: '30',
      author: 'Tarif sahibi',
      steps: ['Soğanı doğra.', 'Bulguru ekle & pişir.'],
    });
    const draft = pageRecipeDraft(result[0], allIngredients(initialState()));
    expect(resolveImportRows(draft.rows).find((r) => r.ingredientId === 'onion')?.quantity).toBe(
      120,
    );
  });
  it('birden fazla tarifi kullanıcıya seçtirir ve yineleneni çoğaltmaz', () => {
    const result = extractPageRecipes(
      JSON.stringify([json, json, { ...json, name: 'Diğer pilav' }]),
    );
    expect(result.map((r) => r.title)).toEqual(['Soğanlı bulgur pilavı', 'Diğer pilav']);
  });
  it('ölçü, kişi ve süre tahmin etmez', () => {
    const result = extractPageRecipes(
      JSON.stringify({
        ...json,
        recipeYield: '20 kurabiye',
        totalTime: 'yaklaşık yarım saat',
        recipeIngredient: ['1 bardak soğan'],
      }),
    )[0];
    expect(result.servings).toBe('');
    expect(result.minutes).toBe('');
    expect(pageRecipeDraft(result, allIngredients(initialState())).rows[0].grams).toBe('');
  });
  it('süre toplamını yalnızca iki parça da açık olduğunda kullanır', () => {
    expect(
      extractPageRecipes(
        JSON.stringify({ ...json, totalTime: null, prepTime: 'PT10M', cookTime: 'PT1H5M' }),
      )[0].minutes,
    ).toBe('75');
    expect(
      extractPageRecipes(JSON.stringify({ ...json, totalTime: null, prepTime: 'PT10M' }))[0]
        .minutes,
    ).toBe('');
  });
  it('bozuk bloktan sonra geçerli bloğu bulur; script çalıştırmaz ve etiketi temizler', () => {
    const result = extractPageRecipes(
      '<script type="application/ld+json">{bad</script>' +
        html({
          ...json,
          name: 'Pilav &amp; sebze',
          recipeInstructions: '<script>throw 1</script><p>Önce hazırla.</p><p>Sonra pişir.</p>',
        }),
    );
    expect(result[0].title).toBe('Pilav & sebze');
    expect(result[0].steps).toEqual(['Önce hazırla.', 'Sonra pişir.']);
    expect(() => extractPageRecipes('<script>window.evil=true</script>')).toThrow('bulunamadı');
  });
  it('aşırı içerik, malzeme/adım ve iç içe derinliği sınırlar', () => {
    expect(() => extractPageRecipes('a'.repeat(1000001))).toThrow('büyük');
    expect(() =>
      extractPageRecipes(JSON.stringify({ ...json, recipeIngredient: Array(61).fill('1 g tuz') })),
    ).toThrow('sınır');
    let deep: unknown = json;
    for (let i = 0; i < 35; i++) deep = { child: deep };
    expect(() => extractPageRecipes(JSON.stringify(deep))).toThrow('büyük');
  });
});
const origins = ['https://recipes.example.org'];
function request(
  body: unknown = { url: 'https://recipes.example.org/pilav' },
  token = 'Bearer real-session',
) {
  return new Request('https://edge.example.org/import-recipe', {
    method: 'POST',
    headers: { Authorization: token },
    body: JSON.stringify(body),
  });
}
function deps() {
  return {
    verify: vi.fn(async () => 'owner-1' as string | null),
    consume: vi.fn(async () => true),
    fetch: vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(html(json), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
    allowedOrigins: origins,
  };
}
describe('Tarif aktarım sunucusu', () => {
  it('yalnızca kurulu tam HTTPS origin adresini kabul eder', () => {
    expect(allowedPageUrl('https://recipes.example.org/a#steps', origins).href).toBe(
      'https://recipes.example.org/a',
    );
    for (const url of [
      'http://recipes.example.org/a',
      'https://recipes.example.org.evil.org/',
      'https://evil.org/',
      'https://u:p@recipes.example.org/',
      'https://127.0.0.1/',
      'https://[::1]/',
      'https://recipes.example.org:8443/',
      'https://sub.recipes.example.org/',
    ])
      expect(() => allowedPageUrl(url, origins)).toThrow();
  });
  it('giriş ve servis kurulumu yoksa ağ çağrısı yapmaz', async () => {
    const d = deps();
    d.verify.mockResolvedValue(null);
    expect((await createImportHandler(d)(request())).status).toBe(401);
    expect(d.fetch).not.toHaveBeenCalled();
    d.verify.mockResolvedValue('owner-1');
    d.allowedOrigins = [];
    expect((await createImportHandler(d)(request())).status).toBe(503);
    expect(d.consume).not.toHaveBeenCalled();
  });
  it('kaynak metnini çalıştırmadan döndürür; kullanıcı tokenını kaynağa iletmez', async () => {
    const d = deps();
    const response = await createImportHandler(d)(request());
    expect(response.status).toBe(200);
    expect((await response.json()).recipes[0].title).toBe(json.name);
    expect(d.consume).toHaveBeenCalledWith('owner-1');
    expect(d.fetch.mock.calls[0][1]?.redirect).toBe('manual');
    expect(JSON.stringify(d.fetch.mock.calls)).not.toContain('real-session');
  });
  it('kota doluysa çağrıyı durdurur ve body boyutunu sınırlar', async () => {
    const d = deps();
    d.consume.mockResolvedValue(false);
    expect((await createImportHandler(d)(request())).status).toBe(429);
    expect(d.fetch).not.toHaveBeenCalled();
    expect((await createImportHandler(d)(request({ url: 'a'.repeat(5000) }))).status).toBe(400);
  });
  it('yönlendirmelerde tekrar izin kontrolü yapar, içerideki adresi çekmez', async () => {
    const d = deps();
    d.fetch.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }),
    );
    expect((await createImportHandler(d)(request())).status).toBe(422);
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });
  it('aynı izinli kaynağa yönlendirmeyi takip eder ve son URLyi korur', async () => {
    const d = deps();
    d.fetch.mockResolvedValueOnce(
      new Response(null, { status: 301, headers: { location: '/yenisi' } }),
    );
    const result = await createImportHandler(d)(request());
    expect(result.status).toBe(200);
    expect((await result.json()).sourceUrl).toBe('https://recipes.example.org/yenisi');
  });
  it('yanlış MIME, sunucu hatası ve aşırı akış boyutunu reddeder', async () => {
    for (const response of [
      new Response('bad', { headers: { 'Content-Type': 'image/png' } }),
      new Response('bad', { status: 403 }),
      new Response('x'.repeat(1000001), { headers: { 'Content-Type': 'text/html' } }),
    ]) {
      const d = deps();
      d.fetch.mockResolvedValueOnce(response);
      expect((await createImportHandler(d)(request())).status).toBe(422);
    }
  });
  it('zaman aşımında kaynağı iptal eder', async () => {
    const d = deps();
    d.fetch.mockImplementation(
      async (_, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const result = await createImportHandler({ ...d, timeoutMs: 5 })(request());
    expect(result.status).toBe(422);
    expect((await result.json()).message).toContain('zamanında');
  });
});
