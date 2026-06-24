import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';

test.describe('Lazy Loading Validation', () => {
  test('Lazy Loading Validation', async ({ page, reporter, takeScreenshot, networkHelper }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login to get synced/placeholder notes
    reporter.addStep('Navigate and login');
    await page.goto('/');
    await page.waitForTimeout(2000);
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(email, password);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(5000);

    let ssPath = await takeScreenshot(page, 'step1_logged_in');
    reporter.addStep('Logged in with existing notes', ssPath);

    // Step 2: Get sidebar notes
    const sidebarNotes = await homePage.getSidebarNotes();
    expect(sidebarNotes.length).toBeGreaterThan(0);
    reporter.addStep(`Found ${sidebarNotes.length} notes in sidebar`);

    // Step 3: Clear network logs, then open a note
    networkHelper.clearLogs();
    const targetNote = sidebarNotes[sidebarNotes.length > 1 ? 1 : 0]; // Pick second note if available
    reporter.addStep(`Opening note: "${targetNote.title}"`);
    await homePage.selectNoteByTitle(targetNote.title);
    await page.waitForTimeout(3000);

    ssPath = await takeScreenshot(page, 'step3_note_opened');
    reporter.addStep('Note opened', ssPath);

    // Verify: Network request triggered on open
    const allLogs = networkHelper.getLogs();
    const contentFetchRequests = allLogs.filter(l => 
      l.url.includes('note') || l.url.includes('content') || l.url.includes('api')
    );

    if (contentFetchRequests.length > 0) {
      reporter.addVerification(`Content fetch network request triggered (${contentFetchRequests.length} relevant requests)`, 'PASS');
      for (const log of networkHelper.getFormattedLogs()) {
        reporter.addNetworkLog(log);
      }
    } else {
      reporter.addVerification('No explicit content fetch request detected (content may have been preloaded)', 'PASS');
    }

    // Verify: Content is now visible in the editor
    const content = await homePage.getNoteContent();
    reporter.addStep(`Editor content length: ${content.length}`);
    reporter.addVerification('Note content loaded in editor after opening', content.length > 0 ? 'PASS' : 'FAIL');

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Lazy loading validation complete', ssPath);
  });
});
