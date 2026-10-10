import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  [
    'node_modules/expo/bin/cli',
    'export',
    '--clear',
    '--platform',
    'web',
    '--output-dir',
    'work/demo-web',
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_AUTH_MODE: 'demo' },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
