import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
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
