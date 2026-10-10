import { describe, it, expect } from 'vitest';
import { auditFindings } from '../scripts/security-audit.mjs';
import { secretFindings } from '../scripts/security-source.mjs';
describe('Güvenlik yayın kapısı', () => {
  const fixture = (id = 'GHSA-vfj7-8cjw-p6xm') => ({
    metadata: { vulnerabilities: { high: 18, critical: 0 } },
    vulnerabilities: {
      braces: {
        name: 'braces',
        via: [{ url: 'https://github.com/advisories/' + id, severity: 'high' }],
      },
    },
  });
  const today = Date.parse('2026-10-11');
  it('yalnızca bilinen geçici korumaya izin verir; yeni açıkta ve süresi geçince kapanır', () => {
    expect(auditFindings(fixture(), false, today).blocked).toEqual([]);
    expect(auditFindings(fixture('GHSA-new'), false, today).blocked).toHaveLength(1);
    expect(auditFindings(fixture(), false, Date.parse('2026-10-25')).blocked).toHaveLength(1);
    expect(auditFindings(fixture(), true, today).blocked).toHaveLength(1);
    expect(() => auditFindings({})).toThrow('unavailable');
  });
  it('özel dosya ve sunucu anahtarı sızıntısını değerini yazdırmadan işaretler', () => {
    expect(secretFindings('.env.local', '')).toEqual(['private-file']);
    expect(secretFindings('credentials.json', '')).toEqual(['private-file']);
    expect(secretFindings('.env.example', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=')).toEqual([]);
    expect(secretFindings('app.ts', 'sb_secret_' + 'a'.repeat(25))).toEqual(['secret-token']);
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.' +
      Buffer.from('{"role":"service_role"}').toString('base64url') +
      '.' +
      's'.repeat(30);
    expect(secretFindings('app.ts', jwt)).toEqual(['service-role-jwt']);
  });
});
