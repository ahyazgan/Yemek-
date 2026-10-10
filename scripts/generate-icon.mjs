import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
// Özgün, yerel geometrik uygulama simgesi: kase ve yaprak.
const n = 1024,
  pixels = Buffer.alloc((n * 4 + 1) * n);
const circle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
for (let y = 0; y < n; y++)
  for (let x = 0; x < n; x++) {
    let c = [35, 79, 59, 255];
    if (circle(x, y, 512, 530, 315)) c = [223, 232, 184, 255];
    if (circle(x, y, 512, 530, 262)) c = [247, 245, 239, 255];
    if (circle(x, y, 512, 530, 218)) c = [209, 131, 77, 255];
    if (
      ((x - 470) / 84) ** 2 + ((y - 470) / 38) ** 2 < 1 ||
      ((x - 557) / 38) ** 2 + ((y - 429) / 81) ** 2 < 1
    )
      c = [35, 79, 59, 255];
    const at = y * (n * 4 + 1) + 1 + x * 4;
    c.forEach((v, i) => (pixels[at + i] = v));
  }
function crc(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([length, t, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(n);
header.writeUInt32BE(n, 4);
header[8] = 8;
header[9] = 6;
writeFileSync(
  'assets/sofra-icon.png',
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);
