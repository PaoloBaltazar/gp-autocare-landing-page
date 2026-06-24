import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// Static site served with Python's http.server; tests run against this URL.
const PORT = 8000;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
