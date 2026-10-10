import { describe, expect, it, vi } from 'vitest';
import { createEmailRequestGate, readAuthLink } from '../src/auth/emailRequests';
import { authMessage, parseAuthEmail } from '../src/auth/contracts';

describe('E-posta istekleri', () => {
  it('eşzamanlı istekleri ve bir dakika içindeki tekrarları göndermeden engeller', async () => {
    let now = 0;
    let finish!: (value: string) => void;
    const gate = createEmailRequestGate(() => now);
    const start = vi.fn();
    const request = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = gate.run(request, start);
    expect(start).toHaveBeenCalledWith(60_000);
    await expect(gate.run(request, start)).rejects.toThrow('bekle');
    now = 61_000;
    await expect(gate.run(request, start)).rejects.toThrow('bekle');
    finish('tamam');
    expect(await pending).toBe('tamam');
    expect(request).toHaveBeenCalledTimes(1);
    await expect(gate.run(async () => 'ikinci', start)).resolves.toBe('ikinci');
    await expect(gate.run(request, start)).rejects.toThrow('bekle');
  });
  it('başarısız denemeden sonra da bekler, süre sonunda tekrar deneyebilir', async () => {
    let now = 100;
    const gate = createEmailRequestGate(() => now);
    await expect(
      gate.run(async () => {
        throw new Error('SMTP');
      }, vi.fn()),
    ).rejects.toThrow('SMTP');
    now = 60_099;
    await expect(gate.run(async () => true, vi.fn())).rejects.toThrow('bekle');
    now = 60_100;
    await expect(gate.run(async () => true, vi.fn())).resolves.toBe(true);
  });
  it('gönderim adresini doğrular ve normalize eder', () => {
    expect(parseAuthEmail('  DEMO@sofra.test  ')).toBe('demo@sofra.test');
    expect(() => parseAuthEmail('yanlış')).toThrow('Geçerli bir e-posta');
  });
});

describe('E-posta bağlantısı', () => {
  it('geçerli kodu ve kodsuz açılışı ayırt eder', () => {
    expect(readAuthLink({ code: 'abc-123' })).toEqual({ code: 'abc-123', failed: false });
    expect(readAuthLink({})).toEqual({ code: '', failed: false });
  });
  it.each([
    { code: ['ilk', 'ikinci'] },
    { code: '' },
    { code: 'a'.repeat(2049) },
    { error_description: ['hata'] },
    { '#': 'x'.repeat(4097) },
  ])('bozuk veya tekrarlı alanlarla kod değişimi yapmaz: %j', (params) => {
    expect(readAuthLink(params)).toEqual({ code: '', failed: true });
  });
  it('query ve hash hatalarına koddan önce öncelik verir; ham metni geri döndürmez', () => {
    for (const params of [
      { code: 'valid', error: 'access_denied', error_description: 'secret' },
      { code: 'valid', '#': 'error_code=otp_expired&error_description=secret' },
      { '#': '#error=access_denied' },
    ]) {
      const result = readAuthLink(params);
      expect(result).toEqual({ code: '', failed: true });
      expect(JSON.stringify(result)).not.toContain('secret');
    }
  });
});

describe('Güvenli, anlaşılır hesap hataları', () => {
  it.each([
    ['email_address_not_authorized', 'hazır değil'],
    ['over_email_send_rate_limit', 'Biraz sonra'],
    ['otp_expired', 'Yeni bir bağlantı'],
    ['flow_state_expired', 'Yeni bir bağlantı'],
    ['pkce_code_verifier_not_found', 'başlattığın'],
    ['weak_password', 'güçlü değil'],
    ['same_password', 'farklı olmalı'],
  ])('%s için ham sunucu mesajını göstermez', (code, expected) => {
    const message = authMessage({ code, message: 'secret backend detail' });
    expect(message).toContain(expected);
    expect(message).not.toContain('secret');
  });
  it('bilinmeyen sunucu hatasını genel mesajla sınırlar', () => {
    expect(authMessage(new Error('password=secret'))).not.toContain('secret');
  });
});
