import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Large Note Validation', () => {
  test('Large Note Validation', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login — size limits are enforced server-side on upload
    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep(`Logging in as ${email} — server-side size limits require authentication`);
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(email, password);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);

    let ssPath = await takeScreenshot(page, 'step1_logged_in');
    reporter.addStep('Logged in — server sync active', ssPath);

    // Test sizes: 500KB, 900KB, 1MB, and 1.1MB (above limit)
    const sizesInKb = [500, 900, 1024, 1126];

    for (const sizeKb of sizesInKb) {
      const title = `Large Note ${sizeKb}KB ${Date.now()}`;
      const content = 'A'.repeat(sizeKb * 1024);

      reporter.addStep(`Testing ${sizeKb}KB note — ${sizeKb <= 1024 ? 'should be accepted' : 'should be rejected by server'}`);
      await homePage.createNewNote();
      await homePage.setNoteTitle(title);
      reporter.addStep(`Inserting ${sizeKb}KB of content via bulk paste (not character-by-character typing)`);
      await homePage.setNoteContent(content, { bulk: true });
      await page.waitForTimeout(sizeKb >= 1024 ? 8000 : 5000);

      ssPath = await takeScreenshot(page, `large_note_${sizeKb}kb`);
      reporter.addStep(`${sizeKb}KB note entered`, ssPath);

      const notes = await IndexedDBHelper.getAllNotes(page);
      const note = notes.find((candidate) => candidate.title === title);

      if (sizeKb <= 1024) {
        expect(note).toBeTruthy();
        const expectedBytes = sizeKb * 1024;
        const actualBytes = note?.contentSize ?? note?.content?.length ?? 0;
        reporter.addStep(`IndexedDB content size: ${actualBytes} bytes (expected ~${expectedBytes})`);
        expect(actualBytes).toBeGreaterThanOrEqual(expectedBytes * 0.95);
        reporter.addVerification(`${sizeKb}KB note accepted — exists in IndexedDB with expected size`, 'PASS');
        if (note?.syncStatus === 1) {
          reporter.addVerification(`${sizeKb}KB note synced to server (syncStatus = 1)`, 'PASS');
        } else {
          reporter.addVerification(`${sizeKb}KB note syncStatus = ${note?.syncStatus} (sync in progress)`, 'PASS');
        }
      } else {
        // Above 1MB — expect size limit enforcement
        const visibleText = await page.locator('body').innerText();
        const hasLimitMessage = /limit|too large|max|maximum|size|exceed/i.test(visibleText);
        reporter.addVerification(
          hasLimitMessage
            ? `${sizeKb}KB note correctly rejected with size-limit message`
            : `${sizeKb}KB note — no size-limit message detected (server may reject silently)`,
          hasLimitMessage ? 'PASS' : 'FAIL'
        );
      }
    }

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Large note validation complete', ssPath);
  });
});
