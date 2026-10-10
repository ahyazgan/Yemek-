import { defineConfig, devices } from '@playwright/test';
const testPort = process.env.SOFRA_TEST_PORT ?? '8182';
const baseURL = `http://127.0.0.1:${testPort}`;
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node scripts/serve-web.mjs',
    url: baseURL,
    env: { SOFRA_PREVIEW_PORT: testPort, SOFRA_WEB_ROOT: 'work/demo-web' },
    reuseExistingServer: false,
  },
});
