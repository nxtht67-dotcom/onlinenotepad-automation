import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Sync Status Validation', () => {
  test('Sync Status Validation', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login — sync only occurs for authenticated users uploading to server
    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep(`Logging in as ${email} to enable server sync`);
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(email, password);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);

    let ssPath = await takeScreenshot(page, 'step1_logged_in');
    reporter.addStep('Logged in — server sync enabled', ssPath);

    // Step 2: Create a new note (now as authenticated user)
    reporter.addStep('Creating a new note as logged-in user');
    await homePage.createNewNote();
    const testTitle = `Sync Status ${Date.now()}`;
    await homePage.setNoteTitle(testTitle);
    await homePage.setNoteContent('Sync status validation test content.');
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step2_note_created');
    reporter.addStep('Note created', ssPath);

    // Step 3: Check initial syncStatus in IndexedDB (should be 0 = pending upload)
    const notes = await IndexedDBHelper.getAllNotes(page);
    const note = notes.find(n => n.title === testTitle);
    expect(note).toBeTruthy();

    const initialSync = note!.syncStatus;
    reporter.addStep(`Initial syncStatus: ${initialSync} (0 = unsynced/pending upload to server)`);
    reporter.addVerification(
      `syncStatus initial value is ${initialSync} (expected 0 for not-yet-synced)`,
      initialSync === 0 ? 'PASS' : 'FAIL'
    );

    // Step 4: Wait for server sync to complete
    reporter.addStep('Waiting for server sync to complete (up to 10s)');
    await page.waitForTimeout(10000);

    // Re-check syncStatus — after server upload it should be 1
    const notesAfterWait = await IndexedDBHelper.getAllNotes(page);
    const noteAfterWait = notesAfterWait.find(n => n.unique_id === note!.unique_id);
    expect(noteAfterWait).toBeTruthy();

    reporter.addStep(`syncStatus after server sync wait: ${noteAfterWait!.syncStatus}`);

    if (noteAfterWait!.syncStatus === 1) {
      reporter.addVerification('syncStatus transitioned to 1 (synced to server)', 'PASS');
    } else {
      reporter.addVerification(
        `syncStatus is still ${noteAfterWait!.syncStatus} after wait — server sync may be delayed`,
        'FAIL'
      );
    }

    // Verify lastSyncedAt timestamp was set
    if (noteAfterWait!.lastSyncedAt) {
      reporter.addVerification(`lastSyncedAt set: ${noteAfterWait!.lastSyncedAt}`, 'PASS');
    } else {
      reporter.addVerification('lastSyncedAt not set after sync', 'FAIL');
    }

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Sync status validation complete', ssPath);
  });
});
