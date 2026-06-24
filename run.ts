import prompts from 'prompts';
import { spawn } from 'child_process';
import * as path from 'path';
import { testRegistry, TestCase } from './config/testRegistry.ts';

type BrowserChoice = 'chromium' | 'firefox' | 'edge';
type ReportFormat = 'word' | 'pdf' | 'both';

const browserChoices: { title: string; value: BrowserChoice }[] = [
  { title: 'Chromium', value: 'chromium' },
  { title: 'Firefox', value: 'firefox' },
  { title: 'Microsoft Edge', value: 'edge' },
];

const reportFormatChoices: { title: string; value: ReportFormat }[] = [
  { title: 'Word (.docx)', value: 'word' },
  { title: 'PDF (.pdf)',   value: 'pdf'  },
  { title: 'Both (Word + PDF)', value: 'both' },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printBanner() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      OnlineNotepad QA Automation Framework             ║');
  console.log('║      Target: https://staging.onlinenotepad.io          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
}

function printCaptchaWarning(testCase: TestCase) {
  if (testCase.requiresCaptcha) {
    console.log('');
    console.log('⚠️  ─────────────────────────────────────────────────────────');
    console.log('⚠️  CAPTCHA NOTICE');
    console.log('⚠️  This test case requires login. The staging site may show');
    console.log('⚠️  a CAPTCHA challenge during authentication.');
    console.log('⚠️  CAPTCHA handling is not automated — you may need to solve');
    console.log('⚠️  it manually if it appears. This will be automated in a');
    console.log('⚠️  future update.');
    console.log('⚠️  ─────────────────────────────────────────────────────────');
    console.log('');
  }
}

async function askCredentials(testCase: TestCase): Promise<Record<string, string>> {
  if (testCase.requiresAuth === 'none') {
    return {};
  }

  if (testCase.requiresAuth === 'single') {
    const response = await prompts([
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
      console.log('Credentials cancelled.');
      process.exit(1);
    }

    return {
      TEST_EMAIL: response.email,
      TEST_PASSWORD: response.password,
    };
  }

  // double — Account A and Account B
  console.log('');
  console.log('This test requires credentials for two separate accounts.');
  console.log('');

  const response = await prompts([
    {
      type: 'text',
      name: 'emailA',
      message: 'Account A Email:',
      validate: (value) => value.trim().length > 0 || 'Account A email is required',
    },
    {
      type: 'password',
      name: 'passwordA',
      message: 'Account A Password:',
      validate: (value) => value.length > 0 || 'Account A password is required',
    },
    {
      type: 'text',
      name: 'emailB',
      message: 'Account B Email:',
      validate: (value) => value.trim().length > 0 || 'Account B email is required',
    },
    {
      type: 'password',
      name: 'passwordB',
      message: 'Account B Password:',
      validate: (value) => value.length > 0 || 'Account B password is required',
    },
  ]);

  if (!response.emailA || !response.passwordA || !response.emailB || !response.passwordB) {
    console.log('Credentials cancelled.');
    process.exit(1);
  }

  return {
    TEST_EMAIL: response.emailA,
    TEST_PASSWORD: response.passwordA,
    TEST_EMAIL_B: response.emailB,
    TEST_PASSWORD_B: response.passwordB,
  };
}

async function main() {
  printBanner();

  // ── Step 1: Select browser ──
  const browserResponse = await prompts({
    type: 'select',
    name: 'browser',
    message: 'Step 1 — Select Browser:',
    choices: browserChoices,
  });

  if (!browserResponse.browser) {
    console.log('Browser selection cancelled.');
    process.exit(1);
  }

  // ── Step 2: Select test case ──
  console.log('');
  const testResponse = await prompts({
    type: 'select',
    name: 'testId',
    message: 'Step 2 — Select Test Case:',
    choices: testRegistry.map((tc) => ({
      title: `${String(tc.id).padStart(2, ' ')}. ${tc.name}${tc.requiresCaptcha ? '  ⚠️  (requires login — captcha may appear)' : ''}`,
      description: tc.description,
      value: tc.id,
    })),
  });

  if (!testResponse.testId) {
    console.log('Test case selection cancelled.');
    process.exit(1);
  }

  const selectedTest = testRegistry.find((tc) => tc.id === testResponse.testId);
  if (!selectedTest) {
    throw new Error(`Unknown test case id: ${testResponse.testId}`);
  }

  // ── Step 3: Report format ──
  console.log('');
  const formatResponse = await prompts({
    type: 'select',
    name: 'format',
    message: 'Step 3 — Select Report Format:',
    choices: reportFormatChoices,
  });

  if (!formatResponse.format) {
    console.log('Report format selection cancelled.');
    process.exit(1);
  }

  const reportFormat: ReportFormat = formatResponse.format;

  // ── Step 4: Captcha warning (before asking credentials) ──
  printCaptchaWarning(selectedTest);

  // ── Step 5: Credentials (if required) ──
  const credentialEnv = await askCredentials(selectedTest);

  // ── Step 6: Run ──
  const configPath = path.join('config', 'playwright.config.ts');
  const grepPattern = escapeRegExp(selectedTest.testName);
  const playwrightCli = path.join('node_modules', '.bin', 'playwright');

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`  Test Case : ${selectedTest.name}`);
  console.log(`  Browser   : ${browserResponse.browser}`);
  console.log(`  Report    : ${reportFormat === 'word' ? 'Word (.docx)' : reportFormat === 'pdf' ? 'PDF (.pdf)' : 'Both (Word + PDF)'}`);
  console.log(`  Mode      : Headed (visible browser)`);
  if (selectedTest.requiresCaptcha) {
    console.log(`  ⚠️  Captcha : May appear — solve manually if prompted`);
  }
  console.log('─────────────────────────────────────────────────────────');
  console.log('');

  const child = spawn(
    playwrightCli,
    [
      'test',
      '--config', configPath,
      '--project', browserResponse.browser,
      '--grep', grepPattern,
    ],
    {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        ...credentialEnv,
        TEST_BROWSER: browserResponse.browser,
        TEST_CASE_NAME: selectedTest.name,
        REPORT_FORMAT: reportFormat,
      },
    }
  );

  child.on('error', (error) => {
    console.error(`Failed to launch Playwright: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log('');
    console.log(`✅ Report(s) saved in the reports/ directory.`);
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
