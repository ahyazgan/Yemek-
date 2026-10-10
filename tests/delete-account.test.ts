import { describe, expect, it, vi } from 'vitest';
import { createDeleteHandler } from '../supabase/functions/delete-account/handler';
import { boundedText, verifiedSessionId } from '../supabase/functions/_shared/requestSafety';
const request = (body: object, token = 'test-token') =>
  new Request('https://example.test/delete-account', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
describe('Hesap silme sunucu sınırı', () => {
  it('istemcinin yolladığı kullanıcı kimliğini yok sayar, doğrulanmış hesabı siler', async () => {
    const remove = vi.fn(async () => {});
    const handler = createDeleteHandler({
      verify: async (token) => (token === 'test-token' ? 'alice' : null),
      revoke: async () => {},
      remove,
    });
    expect((await handler(request({ confirmation: 'DELETE', userId: 'bob' }))).status).toBe(200);
    expect(remove).toHaveBeenCalledWith('alice');
  });
  it('kimliksiz, sahte ve onaysız istekler silme yapamaz', async () => {
    const remove = vi.fn(async () => {});
    const handler = createDeleteHandler({
      verify: async (token) => (token === 'test-token' ? 'alice' : null),
      revoke: async () => {},
      remove,
    });
    expect((await handler(new Request('https://example.test', { method: 'POST' }))).status).toBe(
      401,
    );
    expect((await handler(request({ confirmation: 'DELETE' }, 'invalid'))).status).toBe(401);
    expect((await handler(request({ confirmation: 'YES' }))).status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });
  it('sağlayıcı hatasını başarı gibi göstermez veya ayrıntılarını sızdırmaz', async () => {
    const handler = createDeleteHandler({
      verify: async () => 'alice',
      revoke: async () => {},
      remove: async () => {
        throw new Error('private-secret');
      },
    });
    const response = await handler(request({ confirmation: 'DELETE' }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private-secret');
  });
  it('preflight ve diğer HTTP yöntemleri hesap silmez', async () => {
    const remove = vi.fn(async () => {});
    const handler = createDeleteHandler({
      verify: async () => 'alice',
      revoke: async () => {},
      remove,
    });
    expect((await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status).toBe(
      204,
    );
    expect(await handler(new Request('https://example.test'))).toHaveProperty('status', 405);
    expect(remove).not.toHaveBeenCalled();
  });
});

it('oturumları kapatmadan silmez; kapatma başarısızsa hesabı korur', async () => {
  const calls: string[] = [];
  const remove = vi.fn(async () => {
    calls.push('delete');
  });
  const revoke = vi.fn(async () => {
    calls.push('revoke');
  });
  const handler = createDeleteHandler({ verify: async () => 'alice', revoke, remove });
  expect((await handler(request({ confirmation: 'DELETE' }))).status).toBe(200);
  expect(calls).toEqual(['revoke', 'delete']);
  expect(revoke).toHaveBeenCalledWith('test-token');
  remove.mockClear();
  revoke.mockRejectedValue(new Error('offline'));
  expect((await handler(request({ confirmation: 'DELETE' }))).status).toBe(500);
  expect(remove).not.toHaveBeenCalled();
});

it('bozuk JSON oturumları kapatmaz veya hesabı silmez', async () => {
  const revoke = vi.fn();
  const remove = vi.fn();
  const handler = createDeleteHandler({ verify: async () => 'alice', revoke, remove });
  const response = await handler(
    new Request('https://example.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: '{invalid',
    }),
  );
  expect(response.status).toBe(400);
  expect(revoke).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it('büyük, yanıltıcı uzunluklu istek ve uzun token hesabı silemez', async () => {
  const verify = vi.fn(async () => 'alice'),
    revoke = vi.fn(),
    remove = vi.fn();
  const handler = createDeleteHandler({ verify, revoke, remove });
  const large = request({ confirmation: 'DELETE', padding: 'x'.repeat(5000) });
  large.headers.set('Content-Length', '20');
  expect((await handler(large)).status).toBe(400);
  verify.mockClear();
  expect((await handler(request({ confirmation: 'DELETE' }, 'x'.repeat(8193)))).status).toBe(401);
  expect(verify).not.toHaveBeenCalled();
  expect(revoke).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
it('istek gövdesi sonsuza kadar beklemez ve okuma iptal edilir', async () => {
  const cancel = vi.fn();
  await expect(boundedText(new ReadableStream({ cancel }), 4096, 10)).rejects.toThrow('timed out');
  expect(cancel).toHaveBeenCalled();
});
it('sunucuda doğrulanan tokenın oturum alanını sıkı biçimde çözer', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const token = (payload: unknown) =>
    'header.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.signature';
  expect(verifiedSessionId(token({ session_id: id }))).toBe(id);
  for (const payload of [{}, { session_id: 'invalid' }, { session_id: 123 }])
    expect(verifiedSessionId(token(payload))).toBeNull();
  expect(verifiedSessionId('invalid')).toBeNull();
});
