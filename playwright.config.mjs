import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.mjs', '**/*.spec.js'],
  use: {
    baseURL: 'http://localhost:4000',
    permissions: ['camera', 'microphone'],
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--auto-select-desktop-capture-source=Entire screen',
          ],
        },
      },
    },
  ],
  webServer: {
    // Serve from Astro's dist/ output; fall back to _site/ for legacy Jekyll builds
    command: 'python3 -m http.server 4000 --directory dist',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});

