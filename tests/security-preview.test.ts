import { beforeAll, afterAll, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createPreviewServer } from '../scripts/serve-web.mjs';
let server: Server, base: string;
const directory = resolve('work/security-preview-fixture');
beforeAll(async () => {
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'index.html'), '<p>demo</p>');
  await writeFile(resolve(directory, 'app.js'), 'fixture');
  await writeFile(resolve(directory, '.env.json'), 'private-fixture');
  server = await createPreviewServer(directory);
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
afterAll(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  }
  await rm(directory, { recursive: true, force: true });
});
it('yalnızca kayıtlı statik dosyaları ve SPA sayfasını sunar', async () => {
  expect(await (await fetch(base + '/recipe/mercimek')).text()).toBe('<p>demo</p>');
  expect(await (await fetch(base + '/app.js')).text()).toBe('fixture');
  expect((await fetch(base + '/package.json')).status).toBe(404);
  const head = await fetch(base + '/app.js', { method: 'HEAD' });
  expect(await head.text()).toBe('');
  expect(head.headers.get('x-content-type-options')).toBe('nosniff');
});
it('gizli dosya, traversal, POST ve farklı host reddedilir', async () => {
  expect((await fetch(base + '/.env.json')).status).toBe(403);
  expect((await fetch(base + '/%2e%2e%5cpackage.json')).status).toBe(403);
  expect((await fetch(base + '/', { method: 'POST' })).status).toBe(405);
  const status = await new Promise<number | undefined>((done, reject) => {
    const req = request(base + '/', { headers: { Host: 'evil.example' } }, (res) => {
      res.resume();
      done(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  expect(status).toBe(403);
});
