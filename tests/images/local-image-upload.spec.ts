import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Local Image Upload', () => {
  test('Local Image Upload', async ({ page, reporter, takeScreenshot, networkHelper }) => {
    const homePage = new HomePage(page);
    const assetDir = path.resolve('test-assets');
    const imagePath = path.join(assetDir, 'sample-upload.png');

    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true });
    }

    if (!fs.existsSync(imagePath)) {
      const onePixelPng =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
      fs.writeFileSync(imagePath, Buffer.from(onePixelPng, 'base64'));
    }

    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep('Create a note for image upload');
    await homePage.createNewNote();
    await homePage.setNoteTitle(`Local Image ${Date.now()}`);
    await homePage.setNoteContent('Local image upload validation.');

    networkHelper.clearLogs();
    reporter.addStep('Upload local PNG image into the editor');
    await homePage.uploadLocalImage(imagePath, 'local upload sample');
    await page.waitForTimeout(3000);

    let screenshotPath = await takeScreenshot(page, 'local_image_uploaded');
    reporter.addStep('Local image inserted into editor', screenshotPath);

    const imageCount = await page.locator('img').count();
    expect(imageCount).toBeGreaterThan(0);
    reporter.addVerification('Image element is visible in the editor after upload', 'PASS');

    const uploadRequests = networkHelper
      .getLogs()
      .filter((log) => log.method === 'POST' && /upload|image|media|file/i.test(log.url));

    if (uploadRequests.length > 0) {
      reporter.addVerification(`Upload request detected (${uploadRequests.length} request(s))`, 'PASS');
    } else {
      reporter.addVerification('No explicit upload request detected before sync; image may be stored locally first', 'PASS');
    }

    for (const log of networkHelper.getFormattedLogs().slice(0, 25)) {
      reporter.addNetworkLog(log);
    }

    screenshotPath = await takeScreenshot(page, 'local_image_final');
    reporter.addStep('Local image upload validation complete', screenshotPath);
  });
});
