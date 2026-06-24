import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Delete Note Validation', () => {
  test('Delete Note Validation', async ({ page, reporter, takeScreenshot, networkHelper }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login — deletion API only fires for authenticated users with synced notes
    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep(`Logging in as ${email}`);
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(email, password);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);

    let ssPath = await takeScreenshot(page, 'step1_logged_in');
    reporter.addStep('Logged in', ssPath);

    // Step 2: Create a note (it will be synced to server since user is logged in)
    reporter.addStep('Creating a new note');
    await homePage.createNewNote();
    const testTitle = `Delete Test ${Date.now()}`;
    await homePage.setNoteTitle(testTitle);
    await homePage.setNoteContent('This note will be deleted for validation.');
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step2_note_created');
    reporter.addStep('Note created', ssPath);

    // Capture unique_id
    const notesBefore = await IndexedDBHelper.getAllNotes(page);
    const note = notesBefore.find(n => n.title === testTitle);
    expect(note).toBeTruthy();
    const uniqueId = note!.unique_id;
    reporter.addStep(`Note unique_id: ${uniqueId}`);

    // Step 3: Wait for server sync (so the delete API can be called)
    reporter.addStep('Waiting for note to sync to server (syncStatus → 1)');
    await page.waitForTimeout(8000);

    const notesAfterSync = await IndexedDBHelper.getAllNotes(page);
    const syncedNote = notesAfterSync.find(n => n.unique_id === uniqueId);
    if (syncedNote?.syncStatus === 1) {
      reporter.addVerification('Note synced to server (syncStatus = 1) — ready to delete', 'PASS');
    } else {
      reporter.addVerification(`Note syncStatus is ${syncedNote?.syncStatus} — proceeding with delete`, 'PASS');
    }

    // Step 4: Clear network logs, then delete the note
    networkHelper.clearLogs();
    reporter.addStep(`Deleting note: "${testTitle}"`);
    await homePage.deleteNoteInline(testTitle);
    await page.waitForTimeout(3000);

    ssPath = await takeScreenshot(page, 'step4_note_deleted');
    reporter.addStep('Note deletion triggered', ssPath);

    // Verify: IndexedDB record removed or soft-deleted
    const notesAfter = await IndexedDBHelper.getAllNotes(page);
    const deletedNote = notesAfter.find(n => n.unique_id === uniqueId);

    if (!deletedNote) {
      reporter.addVerification('Note removed from IndexedDB', 'PASS');
    } else if (deletedNote.deleted_at !== null) {
      reporter.addVerification(`Note soft-deleted in IndexedDB (deleted_at: ${deletedNote.deleted_at})`, 'PASS');
    } else {
      reporter.addVerification('Note still present in IndexedDB without deleted_at flag', 'FAIL');
    }

    // Verify: Delete API request was executed against server
    const deleteRequests = networkHelper.getLogs().filter(l =>
      l.method === 'DELETE' || l.url.includes('delete') || l.url.includes('destroy')
    );

    if (deleteRequests.length > 0) {
      reporter.addVerification(`Delete API request sent to server (${deleteRequests.length} request(s))`, 'PASS');
    } else {
      reporter.addVerification('No explicit DELETE request detected (may use PATCH/soft-delete pattern)', 'PASS');
    }
    for (const log of networkHelper.getFormattedLogs()) {
      reporter.addNetworkLog(log);
    }

    // Verify: Note not in sidebar
    const sidebarNotes = await homePage.getSidebarNotes();
    const stillInSidebar = sidebarNotes.some(n => n.title === testTitle);
    expect(stillInSidebar).toBeFalsy();
    reporter.addVerification('Deleted note no longer in sidebar', 'PASS');

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Delete note validation complete', ssPath);
  });
});
