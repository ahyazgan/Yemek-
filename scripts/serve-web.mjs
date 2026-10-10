import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.env.SOFRA_WEB_ROOT ?? 'dist');
if (!root.startsWith(resolve('.') + sep)) throw new Error('Önizleme klasörü proje içinde olmalı.');
const port = Number(process.env.SOFRA_PREVIEW_PORT ?? '8181');
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Geçersiz önizleme portu.');
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
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (extname(pathname) === '' ? '/index.html' : pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Sofra demo: http://127.0.0.1:${port}`));
