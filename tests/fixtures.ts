import { test as base, Page, ConsoleMessage } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { DocxReporter } from '../helpers/reporting/docxReporter.ts';
import { PdfReporter } from '../helpers/reporting/pdfReporter.ts';
import { NetworkHelper } from '../helpers/network/network.helper.ts';
import { IndexedDBHelper } from '../helpers/indexeddb/indexeddb.helper.ts';

const BASE_URL = 'https://staging.onlinenotepad.io';

export const test = base.extend<{
  reporter: DocxReporter;
  networkHelper: NetworkHelper;
  screenshotsDir: string;
  takeScreenshot: (page: Page, stepName: string) => Promise<string>;
}>({
  networkHelper: async ({ page }, use) => {
    const helper = new NetworkHelper(page);
    helper.startCapture();
    await use(helper);
  },

  reporter: async ({ page, networkHelper }, use, testInfo) => {
    const browserName = process.env.TEST_BROWSER || 'chromium';
    const testCaseName = process.env.TEST_CASE_NAME || testInfo.title;
    const reportFormat = (process.env.REPORT_FORMAT || 'word') as 'word' | 'pdf' | 'both';

    // Always create docxReporter (acts as the primary data collector)
    const docxReporter = new DocxReporter(testCaseName, browserName, BASE_URL);
    // Create pdf reporter if needed
    const pdfReporter = (reportFormat === 'pdf' || reportFormat === 'both')
      ? new PdfReporter(testCaseName, browserName, BASE_URL)
      : null;

    const consoleListener = (message: ConsoleMessage) => {
      docxReporter.addConsoleLog(`[${message.type()}] ${message.text()}`);
      pdfReporter?.addConsoleLog(`[${message.type()}] ${message.text()}`);
    };

    page.on('console', consoleListener);

    // We surface docxReporter as the primary reporter fixture
    // Tests use reporter.addStep / addVerification, which we mirror to pdf
    // We wrap it so all calls propagate to both.
    const proxy = new Proxy(docxReporter, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;

        return (...args: unknown[]) => {
          const result = (value as (...a: unknown[]) => unknown).apply(target, args);
          if (pdfReporter && typeof (pdfReporter as unknown as Record<string, unknown>)[prop as string] === 'function') {
            (pdfReporter as unknown as Record<string, (...a: unknown[]) => unknown>)[prop as string]?.(...args);
          }
          return result;
        };
      }
    });

    await use(proxy as DocxReporter);

    // ── Post-test: capture IndexedDB snapshot ──
    try {
      if (!page.isClosed()) {
        const snapshot = await IndexedDBHelper.getDatabaseSnapshot(page, 'OnlineNotepadDB', 20);
        docxReporter.addIndexedDBSnapshot(snapshot);
        // PDF reporter doesn't have IndexedDB section, just log it
      }
    } catch (error) {
      docxReporter.addConsoleLog(`Unable to capture IndexedDB snapshot: ${(error as Error).message}`);
    }

    // ── Post-test: handle failures ──
    if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
      const screenshotsDir = path.resolve('screenshots');
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

      const failureScreenshotPath = path.join(
        screenshotsDir,
        `failure_${testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.png`
      );

      try {
        await page.screenshot({ path: failureScreenshotPath, fullPage: true });
        docxReporter.addStep('Failure-state screenshot captured', failureScreenshotPath);
        pdfReporter?.addStep('Failure-state screenshot captured', failureScreenshotPath);
      } catch (error) {
        docxReporter.addConsoleLog(`Failed to capture failure screenshot: ${(error as Error).message}`);
      }

      for (const log of networkHelper.getFormattedLogs().slice(-75)) {
        docxReporter.addNetworkLog(log);
        pdfReporter?.addNetworkLog(log);
      }

      const bugPayload = {
        title: `${testCaseName} - Assertion Failure`,
        severity: 'High' as const,
        expected: 'Test should pass all assertions',
        actual: testInfo.error?.message || 'Unknown failure',
        recommendation: 'Investigate the failing assertion and the application behavior',
        stackTrace: testInfo.error?.stack || '',
      };
      docxReporter.setFailed(bugPayload);
      pdfReporter?.setFailed(bugPayload);
    }

    page.off('console', consoleListener);

    // ── Generate reports ──
    const generatedPaths: string[] = [];

    if (reportFormat === 'word' || reportFormat === 'both') {
      const docxPath = await docxReporter.generateReport();
      generatedPaths.push(docxPath);
    }
    if (pdfReporter && (reportFormat === 'pdf' || reportFormat === 'both')) {
      const pdfPath = await pdfReporter.generateReport();
      generatedPaths.push(pdfPath);
    }

    for (const p of generatedPaths) {
      console.log(`\n📄 Report generated: ${p}\n`);
    }
  },

  screenshotsDir: async ({}, use) => {
    const dir = path.resolve('screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await use(dir);
  },

  takeScreenshot: async ({}, use) => {
    const fn = async (page: Page, stepName: string): Promise<string> => {
      const dir = path.resolve('screenshots');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const sanitized = stepName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(dir, `${sanitized}_${Date.now()}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      return filePath;
    };

    await use(fn);
  },
});

export { expect } from '@playwright/test';
