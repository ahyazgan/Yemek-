import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { verifySecurityPatches } from '../scripts/security-patches.mjs';
const require = createRequire(import.meta.url);
const qsRequire = createRequire(require.resolve('query-string'));
const decode = qsRequire('decode-uri-component') as (value: string) => string;
const queryString = require('query-string');
describe('Bağımlılık uyumluluğu', () => {
  it('Router query-string CJS çözücüsü yamalı sürümü çağırır', () => {
    expect(qsRequire('decode-uri-component/package.json').version).toBe('0.5.0-sofra.1');
    expect(decode('%C3%A7orba')).toBe('çorba');
    expect(queryString.parse('name=%C3%A7orba&portions=3')).toEqual({
      name: 'çorba',
      portions: '3',
    });
    expect(queryString.parse('name=ev+usul%C3%BC')).toEqual({ name: 'ev usulü' });
    expect(() => decode(42 as unknown as string)).toThrow(TypeError);
  });
  it('uzun bozuk UTF-8 girdisi üstel çözümlemeye girmez', () => {
    const input = '%FF'.repeat(10000) + '%C3%A7';
    expect(decode(input)).toBe('%FF'.repeat(10000) + 'ç');
  }, 1000);
  it('xcode CommonJS uuid güncellemesiyle geçerli kimlik üretir', () => {
    const xcodeRequire = createRequire(require.resolve('xcode'));
    expect(xcodeRequire('uuid/package.json').version).toBe('11.1.1');
    const project = require('xcode').project('fixture.pbxproj');
    project.hash = { project: { objects: {} } };
    expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
  });
});

describe('Araç zinciri güvenlik düzeltmeleri', () => {
  it('kurulu tüm kopyalar beklenen sürüm ve yamalı içeriktedir', () => {
    expect(verifySecurityPatches()).toBe(5);
    expect(verifySecurityPatches(true)).toBe(5);
  });
  it('normal glob aralıkları ve iç içe seçenekler çalışır', () => {
    const braces = require('braces');
    expect(braces.expand('src/{a,{b,c}}/{1..2}.ts')).toEqual([
      'src/a/1.ts',
      'src/a/2.ts',
      'src/b/1.ts',
      'src/b/2.ts',
      'src/c/1.ts',
      'src/c/2.ts',
    ]);
    expect(require('micromatch')(['src/a.ts', 'src/b.js'], 'src/*.{ts,tsx}')).toEqual(['src/a.ts']);
  });
  it('derin dengeli/dengesiz brace ve parantez girdileri kontrollü reddedilir', () => {
    const braces = require('braces');
    for (const source of [
      '{'.repeat(4000) + 'x' + '}'.repeat(4000),
      '{'.repeat(4000),
      '('.repeat(4000) + 'x' + ')'.repeat(4000),
    ]) {
      for (const method of ['parse', 'compile', 'expand', 'stringify']) {
        expect(() => braces[method](source)).toThrow('security limit');
      }
    }
  }, 1000);
  it('doğrudan verilen derin AST de walker sınırını aşamaz', () => {
    const braces = require('braces');
    for (const method of ['compile', 'stringify', 'expand']) {
      let tree: object = { type: 'text', value: 'x' };
      for (let i = 0; i < 150; i++) tree = { type: 'root', nodes: [tree] };
      expect(() => braces[method](tree)).toThrow('security limit');
    }
  });
  it('geçerli RSA imzasını kabul eder, iç algoritmaya saklanmış fazladan veriyi reddeder', () => {
    const forge = require('node-forge');
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 65537 });
    const md = forge.md.sha256.create().update('security regression fixture');
    const digest = md.digest().getBytes();
    expect(keys.publicKey.verify(digest, keys.privateKey.sign(md))).toBe(true);
    const a = forge.asn1;
    const item = (type: number, value: unknown, constructed = false) =>
      a.create(a.Class.UNIVERSAL, type, constructed, value);
    const oid = item(a.Type.OID, a.oidToDer(forge.oids.sha256).getBytes());
    const nil = item(a.Type.NULL, '');
    for (const children of [[oid], [oid, nil]]) {
      const der = a
        .toDer(
          item(
            a.Type.SEQUENCE,
            [item(a.Type.SEQUENCE, children, true), item(a.Type.OCTETSTRING, digest)],
            true,
          ),
        )
        .getBytes();
      expect(keys.publicKey.verify(digest, keys.privateKey.sign(der, 'NONE'))).toBe(true);
    }
    for (const children of [
      [oid, nil, item(a.Type.OCTETSTRING, 'extra')],
      [oid, item(a.Type.OCTETSTRING, 'extra')],
    ]) {
      const der = a
        .toDer(
          item(
            a.Type.SEQUENCE,
            [item(a.Type.SEQUENCE, children, true), item(a.Type.OCTETSTRING, digest)],
            true,
          ),
        )
        .getBytes();
      expect(() => keys.publicKey.verify(digest, keys.privateKey.sign(der, 'NONE'))).toThrow(
        'DigestInfo',
      );
    }
  });
});
