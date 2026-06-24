import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

function maximizedDesktopChrome(): PlaywrightTestConfig['use'] {
  const { deviceScaleFactor: _deviceScaleFactor, viewport: _viewport, ...desktopChrome } =
    devices['Desktop Chrome'];

  return {
    ...desktopChrome,
    channel: 'chrome',
    viewport: null,
    launchOptions: {
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    },
  };
}

export default defineConfig({
  testDir: '../tests',
  timeout: 360000, // 6 minutes — allows manual Cloudflare verification during login
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  retries: 1, // 1 retry for flakiness
  workers: 1, // run one test at a time
  reporter: [['list']],
  use: {
    baseURL: 'https://staging.onlinenotepad.io',
    headless: false, // ALL tests run in headed mode as required
    viewport: null,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: maximizedDesktopChrome(),
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'edge',
      use: {
        ...maximizedDesktopChrome(),
        channel: 'msedge', // Run Microsoft Edge
      },
    },
  ],
});
