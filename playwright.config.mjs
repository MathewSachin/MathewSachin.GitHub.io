import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  use: {
    baseURL: 'http://localhost:4000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 4000 --directory _site',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
