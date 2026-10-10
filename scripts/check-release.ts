import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import appConfig from '../app.config';
import { profileEnvironment } from './build-environment.mjs';

const profile = process.argv[2] || 'preview';
try {
  Object.assign(process.env, profileEnvironment(profile), { EAS_BUILD_PROFILE: profile });
  const root = process.cwd();
  const config = appConfig({
    config: JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo,
    projectRoot: root,
    staticConfigPath: path.join(root, 'app.json'),
    packageJsonPath: path.join(root, 'package.json'),
  });
  for (const file of ['assets/sofra-icon.png', 'package-lock.json', '.easignore'])
    if (!existsSync(path.join(root, file))) throw new Error('Gerekli dosya eksik: ' + file);
  if (!config.android?.package || !config.ios?.bundleIdentifier)
    throw new Error('Android/iOS uygulama kimliği eksik.');
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
