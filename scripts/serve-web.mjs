import { createServer } from 'node:http';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};
export async function createPreviewServer(directory) {
  const workspace = await realpath('.');
  const root = await realpath(directory);
  if (!root.startsWith(workspace + sep)) throw new Error('Önizleme klasörü proje içinde olmalı.');
  // Snapshot exported assets once. Request input never reaches a filesystem
  // operation. Symlinks and private/dot files never enter the allowlist.
  const assets = new Map();
  async function collect(folder, prefix = '') {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = join(folder, entry.name),
        url = prefix + '/' + entry.name;
      if (entry.isDirectory()) await collect(path, url);
      else if (entry.isFile() && Object.hasOwn(mime, extname(entry.name)))
        assets.set(url, { body: await readFile(path), type: mime[extname(entry.name)] });
    }
  }
  await collect(root);
  if (!assets.has('/index.html')) throw new Error('Önizleme paketi bulunamadı.');
  return createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method || '')) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (
        pathname.includes('\0') ||
        pathname.split(/[\\/]/).some((part) => part === '..' || part.startsWith('.'))
      ) {
        res.writeHead(403);
        res.end();
        return;
      }
      const asset = assets.get(extname(pathname) === '' ? '/index.html' : pathname);
      if (!asset) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': asset.type, 'Content-Length': asset.body.length });
      res.end(req.method === 'HEAD' ? undefined : asset.body);
    } catch {
      res.writeHead(400);
      res.end('Invalid request');
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const roots = { dist: 'dist', 'work/demo-web': 'work/demo-web' };
  const directory = roots[process.env.SOFRA_WEB_ROOT || 'dist'];
  if (!directory) throw new Error('Önizleme yalnızca dist veya work/demo-web paketini açar.');
  const port = Number(process.env.SOFRA_PREVIEW_PORT || '8181');
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Geçersiz önizleme portu.');
  (await createPreviewServer(directory)).listen(port, '127.0.0.1', () =>
    console.log('Sofra demo: http://127.0.0.1:' + port),
  );
}
