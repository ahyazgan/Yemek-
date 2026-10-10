import { spawnSync } from 'node:child_process';
import { demoEnvironment } from './build-environment.mjs';
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
    env: demoEnvironment(),
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
