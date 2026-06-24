import prompts from 'prompts';
import { chromium } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.ts';
import { ensureAuthDir, getAuthStatePath } from '../helpers/auth/authPaths.ts';

const BASE_URL = 'https://staging.onlinenotepad.io';

async function main() {
  const response = await prompts([
    {
      type: 'text',
      name: 'label',
      message: 'Auth profile label (used for filename):',
      initial: 'default',
    },
    {
      type: 'text',
      name: 'email',
      message: 'Email:',
      validate: (value) => value.trim().length > 0 || 'Email is required',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      validate: (value) => value.length > 0 || 'Password is required',
    },
  ]);

  if (!response.email || !response.password) {
    console.log('Auth setup cancelled.');
    process.exit(1);
  }

  ensureAuthDir();
  const outputPath = getAuthStatePath(response.label);

  console.log('\nOpening Chrome for manual Cloudflare verification...');
  console.log('1. Complete the Cloudflare checkbox if shown.');
  console.log('2. Click Sign In after verification succeeds.');
  console.log('3. This script saves your session for reuse in later test runs.\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: null,
  });
  const page = await context.newPage();

  await page.goto('/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(response.email, response.password);

  await context.storageState({ path: outputPath });
  await browser.close();

  console.log(`\nSaved auth session: ${outputPath}`);
  console.log('Tests that start logged-in can reuse this file.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
