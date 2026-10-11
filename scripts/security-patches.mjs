import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (text) => createHash('sha256').update(text).digest('hex');

// Keep upstream versions/advisories visible. Fail closed on any upstream drift.
export function verifySecurityPatches(apply = false) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'security/patches.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
  let checked = 0;
  for (const patch of manifest) {
    const locations = Object.keys(lock.packages).filter(
      (path) =>
        path === `node_modules/${patch.package}` || path.endsWith(`/node_modules/${patch.package}`),
    );
    if (!locations.length) throw new Error(`Security patch dependency missing: ${patch.package}`);
    for (const location of locations) {
      const meta = JSON.parse(readFileSync(resolve(root, location, 'package.json'), 'utf8'));
      if (meta.version !== patch.version)
        throw new Error(`Review security patch for ${patch.package}@${meta.version}`);
      const path = resolve(root, location, patch.file);
      const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
      if (hash(source) === patch.afterHash) {
        checked++;
        continue;
      }
      if (!apply || hash(source) !== patch.beforeHash)
        throw new Error(`Security patch absent or source changed: ${location}/${patch.file}`);
      let updated = source;
      for (const edit of patch.edits) {
        const count = updated.split(edit.before).length - 1;
        if (count !== edit.count)
          throw new Error(`Security patch context mismatch: ${patch.package}/${patch.file}`);
        updated = updated.split(edit.before).join(edit.after);
      }
      if (hash(updated) !== patch.afterHash) throw new Error('Security patch result mismatch');
      writeFileSync(path, updated);
      checked++;
    }
  }
  return checked;
}
