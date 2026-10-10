import { extractPageRecipes } from '../_shared/recipePage.ts';
type Dependencies = {
  verify: (token: string) => Promise<string | null>;
  consume: (userId: string) => Promise<boolean>;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  allowedOrigins: string[];
  timeoutMs?: number;
};
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), { status, headers });
function urlAddress(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.port ||
    u.hostname.endsWith('.') ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(u.hostname) ||
    /^[\d.]+$/.test(u.hostname) ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i.test(u.hostname)
  )
    throw new Error('Geçerli bir herkese açık HTTPS tarif adresi gir.');
  u.hash = '';
  return u;
}
export function allowedPageUrl(value: string, origins: string[]) {
  if (value.length > 2000) throw new Error('Bağlantı çok uzun.');
  const u = urlAddress(value);
  // Exact, operator-approved origins only. Never accept arbitrary hosts or wildcard subdomains.
  const allowed = origins.map((value) => {
    const source = urlAddress(value.trim());
    if (source.pathname !== '/' || source.search) throw new Error('Kaynak kurulumu geçersiz.');
    return source.origin;
  });
  if (!allowed.includes(u.origin))
    throw new Error('Bu tarif sitesi henüz desteklenen kaynaklar arasında değil.');
  return u;
}
async function limitedBody(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) throw new Error('İçerik okunamadı.');
  const reader = body.getReader(),
    decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0,
    result = '';
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) throw new Error('İçerik çok büyük.');
      result += decoder.decode(next.value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function createImportHandler(deps: Dependencies) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { message: 'POST gerekli.' });
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return reply(401, { message: 'Önce gerçek hesabına giriş yap.' });
    try {
      const owner = await deps.verify(token);
      if (!owner) return reply(401, { message: 'Oturum doğrulanamadı.' });
      if (!deps.allowedOrigins.length)
        return reply(503, { message: 'Tarif kaynağı bağlantısı henüz kurulmadı.' });
      let url: URL;
      try {
        const input = JSON.parse(await limitedBody(request.body, 4096));
        if (typeof input.url !== 'string') throw new Error('Tarif bağlantısı gerekli.');
        url = allowedPageUrl(input.url, deps.allowedOrigins);
      } catch (e) {
        return reply(400, { message: e instanceof Error ? e.message : 'Bağlantı okunamadı.' });
      }
      if (!(await deps.consume(owner)))
        return reply(429, {
          message: 'Dakikalık aktarım sınırına ulaştın. Biraz sonra tekrar dene.',
        });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 10000);
      try {
        for (let hop = 0; hop <= 3; hop++) {
          const response = await deps.fetch(url.href, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              Accept: 'text/html,application/ld+json,application/json',
              'User-Agent': 'Sofra-Recipe-Import/0.1',
            },
          });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            await response.body?.cancel();
            const location = response.headers.get('location');
            if (!location || hop === 3)
              throw new Error('Tarif bağlantısının yönlendirmesi tamamlanamadı.');
            url = allowedPageUrl(new URL(location, url).href, deps.allowedOrigins);
            continue;
          }
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error('Kaynak sayfa okunamadı. Metni yapıştırarak devam edebilirsin.');
          }
          const type = response.headers.get('content-type') ?? '';
          if (!/^(text\/html|application\/(?:ld\+)?json)(;|$)/i.test(type)) {
            await response.body?.cancel();
            throw new Error('Bu bağlantıda desteklenen tarif sayfası bulunamadı.');
          }
          if (Number(response.headers.get('content-length') ?? 0) > 1000000) {
            await response.body?.cancel();
            throw new Error('Kaynak sayfa çok büyük.');
          }
          const html = await limitedBody(response.body, 1000000);
          return reply(200, { recipes: extractPageRecipes(html), sourceUrl: url.href });
        }
        throw new Error('Kaynak okunamadı.');
      } catch (e) {
        return reply(422, {
          message: controller.signal.aborted
            ? 'Kaynak zamanında yanıt vermedi. Tekrar deneyebilirsin.'
            : e instanceof Error
              ? e.message
              : 'Tarif okunamadı.',
        });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return reply(503, { message: 'Aktarım hizmetine ulaşılamadı. Biraz sonra tekrar dene.' });
    }
  };
}
