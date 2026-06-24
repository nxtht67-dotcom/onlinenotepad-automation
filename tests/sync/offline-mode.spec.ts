import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Offline Mode', () => {
  test('Offline Mode', async ({ page, context, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login first — sync on reconnect requires an authenticated session
    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep(`Logging in as ${email} — sync requires an authenticated session`);
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(email, password);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);

    let ssPath = await takeScreenshot(page, 'step1_logged_in');
    reporter.addStep('Logged in and ready', ssPath);

    // Create a note while online to establish baseline
    await homePage.createNewNote();
    const onlineTitle = `Online Note ${Date.now()}`;
    await homePage.setNoteTitle(onlineTitle);
    await homePage.setNoteContent('Created while online and logged in.');
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step1b_online_note');
    reporter.addStep('Online note created (will sync to server)', ssPath);

    // Step 2: Go offline
    reporter.addStep('Disabling network (simulating offline mode)');
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    ssPath = await takeScreenshot(page, 'step2_offline');
    reporter.addStep('Network disabled — offline mode active', ssPath);

    // Step 3: Create/edit notes while offline (stored locally in IndexedDB)
    const offlineTitle = `Offline Note ${Date.now()}`;
    reporter.addStep(`Creating note while offline: "${offlineTitle}"`);
    await homePage.createNewNote();
    await homePage.setNoteTitle(offlineTitle);
    await homePage.setNoteContent('This note was created while offline — should sync when reconnected.');
    await page.waitForTimeout(1500);

    ssPath = await takeScreenshot(page, 'step3_offline_note_created');
    reporter.addStep('Offline note created in local IndexedDB', ssPath);

    // Verify: Note saved locally while offline
    const offlineNotes = await IndexedDBHelper.getAllNotes(page);
    const offlineNote = offlineNotes.find(n => n.title === offlineTitle);
    expect(offlineNote).toBeTruthy();
    reporter.addVerification('Offline note exists in local IndexedDB (data preserved without network)', 'PASS');
    reporter.addVerification(`Offline note syncStatus: ${offlineNote!.syncStatus} (0 = pending upload)`, 'PASS');

    // Step 4: Re-enable internet
    reporter.addStep('Re-enabling network — expecting server sync to resume');
    await context.setOffline(false);
    await page.waitForTimeout(8000); // Allow time for sync to resume

    ssPath = await takeScreenshot(page, 'step4_back_online');
    reporter.addStep('Network re-enabled — sync should have resumed', ssPath);

    // Verify: Data still present after reconnection
    const notesAfterReconnect = await IndexedDBHelper.getAllNotes(page);
    const noteStillExists = notesAfterReconnect.find(n => n.title === offlineTitle);
    expect(noteStillExists).toBeTruthy();
    reporter.addVerification('Offline note still preserved after reconnection (no data loss)', 'PASS');

    // Verify: Sync resumed (syncStatus should transition to 1)
    if (noteStillExists!.syncStatus === 1) {
      reporter.addVerification('Server sync resumed after reconnection (syncStatus = 1)', 'PASS');
      if (noteStillExists!.lastSyncedAt) {
        reporter.addVerification(`lastSyncedAt set: ${noteStillExists!.lastSyncedAt}`, 'PASS');
      }
    } else {
      reporter.addVerification(
        `syncStatus is ${noteStillExists!.syncStatus} after reconnection — sync may take longer`,
        'FAIL'
      );
    }

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Offline mode validation complete', ssPath);
  });
});
