import { spawnSync } from 'node:child_process';
import { demoEnvironment } from './build-environment.mjs';

const target = process.argv[2];
const flags = process.argv.slice(3);
const allowedFlags = new Set(['--no-wait', '--non-interactive']);
if (
  !['android', 'ios', 'simulator'].includes(target) ||
  flags.some((flag) => !allowedFlags.has(flag))
) {
  console.error(
    'Kullanım: node scripts/build-mobile.mjs android|ios|simulator [--no-wait] [--non-interactive]',
  );
  process.exitCode = 1;
} else {
  const profile = target === 'simulator' ? 'preview-simulator' : 'preview';
  const env = demoEnvironment();
  const check = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-release.ts', profile],
    { stdio: 'inherit', env },
  );
  if (check.error) throw check.error;
  if (check.status !== 0) {
    process.exitCode = check.status ?? 1;
  } else {
    // All shell arguments are fixed tokens or the allow-listed flags above.
    const build = spawnSync(
      'npx',
      [
        'eas-cli@latest',
        'build',
        '--profile',
        profile,
        '--platform',
        target === 'android' ? 'android' : 'ios',
        ...flags,
      ],
      { stdio: 'inherit', env, shell: process.platform === 'win32' },
    );
    if (build.error) throw build.error;
    process.exitCode = build.status ?? 1;
  }
}
