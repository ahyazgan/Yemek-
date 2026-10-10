import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import appConfig from '../app.config';
import { profileEnvironment } from './build-environment.mjs';
import { verifySecurityPatches } from './security-patches.mjs';
import { runSecurityAudit } from './security-audit.mjs';

const profile = process.argv[2] || 'preview';
try {
  verifySecurityPatches();
  if (profile === 'production') runSecurityAudit(true);
  Object.assign(process.env, profileEnvironment(profile), { EAS_BUILD_PROFILE: profile });
  const root = process.cwd();
  const config = appConfig({
    config: JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo,
    projectRoot: root,
    staticConfigPath: path.join(root, 'app.json'),
    packageJsonPath: path.join(root, 'package.json'),
  });
  for (const file of [
    'assets/sofra-icon.png',
    'package-lock.json',
    '.easignore',
    'vendor/decode-uri-component-0.5.0-sofra.1.tgz',
    'supabase/functions/_shared/recipePage.ts',
    'security/patches.json',
    'scripts/security-patches.mjs',
  ])
    if (!existsSync(path.join(root, file))) throw new Error('Gerekli dosya eksik: ' + file);
  if (!config.android?.package || !config.ios?.bundleIdentifier)
    throw new Error('Android/iOS uygulama kimliği eksik.');
  const excludedSources = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--ignored',
      '--exclude-from=.easignore',
      '-z',
      '--',
      'src',
      'assets',
      'vendor',
      'security',
      'scripts/security-patches.mjs',
      'package.json',
      'package-lock.json',
      'app.json',
      'app.config.ts',
      'babel.config.js',
      'metro.config.js',
      'tsconfig.json',
      'supabase/functions/_shared',
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  if (excludedSources.length)
    throw new Error('Derleme kaynağı .easignore ile dışlanmış: ' + excludedSources.join(', '));
  console.log('Yerel derleme ayarları doğrulandı: ' + profile);
  console.log('Ad: ' + config.name);
  console.log('Android: ' + config.android.package);
  console.log('iOS: ' + config.ios.bundleIdentifier);
  console.log('Bağlantı şeması: ' + config.scheme);
  if (!config.extra?.eas?.projectId)
    throw new Error('EAS projesi bağlı değil. Önce npx eas-cli@latest init çalıştır.');
  console.log(
    'EAS proje kimliği mevcut. Hesap yetkisi, kota ve imza bu yerel kontrolde doğrulanmaz.',
  );
  console.log('Bu kontrol APK/IPA üretmez; fiziksel cihaz testinin yerine geçmez.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Derleme ayarı doğrulanamadı.');
  process.exitCode = 1;
}
