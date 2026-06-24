import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';

test.describe('Third Party Image Validation', () => {
  test('Third Party Image Validation', async ({ page, reporter, takeScreenshot, networkHelper }) => {
    const homePage = new HomePage(page);
    const imageUrl = 'https://placehold.co/160x90/png?text=OnlineNotepad';

    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep('Create a note for external image insertion');
    await homePage.createNewNote();
    await homePage.setNoteTitle(`External Image ${Date.now()}`);
    await homePage.setNoteContent('Third party image validation.');

    networkHelper.clearLogs();
    reporter.addStep(`Insert external image URL: ${imageUrl}`);
    await homePage.insertExternalImage(imageUrl, 'external image sample');
    await page.waitForTimeout(3000);

    const screenshotPath = await takeScreenshot(page, 'third_party_image_inserted');
    reporter.addStep('External image inserted', screenshotPath);

    const image = page.locator(`img[src*="placehold.co"], img[alt="external image sample"]`).first();
    await expect(image).toBeVisible();
    reporter.addVerification('External image renders in the editor', 'PASS');

    const unexpectedUploads = networkHelper
      .getLogs()
      .filter((log) => log.method === 'POST' && /upload|media|file/i.test(log.url));
    expect(unexpectedUploads.length).toBe(0);
    reporter.addVerification('No upload API request was triggered for third-party image URL', 'PASS');

    for (const log of networkHelper.getFormattedLogs().slice(0, 25)) {
      reporter.addNetworkLog(log);
    }
  });
});
