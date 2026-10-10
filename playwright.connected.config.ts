import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testDir: './e2e-connected',
  webServer: {
    ...base.webServer,
    command: 'node scripts/serve-web.mjs',
    url: 'http://127.0.0.1:' + (process.env.SOFRA_TEST_PORT ?? '8182'),
    reuseExistingServer: false,
    env: { SOFRA_PREVIEW_PORT: process.env.SOFRA_TEST_PORT ?? '8182', SOFRA_WEB_ROOT: 'dist' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-connected' }]],
});
