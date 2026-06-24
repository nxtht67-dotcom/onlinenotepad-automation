import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Browser Refresh During Sync', () => {
  test('Browser Refresh During Sync', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login — server sync only happens for authenticated users
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
    reporter.addStep('Logged in — server sync active', ssPath);

    // Step 2: Create a note (will sync to server)
    const testTitle = `RefreshSync ${Date.now()}`;
    reporter.addStep(`Creating note: "${testTitle}"`);
    await homePage.createNewNote();
    await homePage.setNoteTitle(testTitle);
    await homePage.setNoteContent('Content for browser refresh during server sync test.');
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step2_note_created');
    reporter.addStep('Note created, server sync initiated', ssPath);

    // Capture data before refresh
    const notesBefore = await IndexedDBHelper.getAllNotes(page);
    const noteBefore = notesBefore.find(n => n.title === testTitle);
    expect(noteBefore).toBeTruthy();
    const uniqueId = noteBefore!.unique_id;
    const countBefore = notesBefore.filter(n => n.unique_id === uniqueId).length;
    reporter.addStep(`Before refresh: unique_id=${uniqueId}, syncStatus=${noteBefore!.syncStatus}`);

    // Step 3: Edit content to trigger a new sync, then immediately refresh
    reporter.addStep('Editing note to trigger sync request, then refreshing immediately');
    await homePage.setNoteContent('Updated content — refreshing during server sync upload.');
    // Minimal delay — we want to catch the sync mid-flight
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(4000);

    ssPath = await takeScreenshot(page, 'step3_after_refresh');
    reporter.addStep('Page refreshed mid-sync', ssPath);

    // Verify: No data loss
    const notesAfter = await IndexedDBHelper.getAllNotes(page);
    const noteAfter = notesAfter.find(n => n.unique_id === uniqueId);
    expect(noteAfter).toBeTruthy();
    reporter.addVerification('Note still exists after refresh mid-sync (no data loss)', 'PASS');

    // Verify: No duplicate records
    const duplicates = notesAfter.filter(n => n.unique_id === uniqueId);
    expect(duplicates.length).toBe(countBefore);
    reporter.addVerification(`No duplicate records created (count: ${duplicates.length})`, 'PASS');

    // Verify: Content accessible
    await homePage.selectNoteByTitle(testTitle);
    await page.waitForTimeout(1500);
    const content = await homePage.getNoteContent();
    expect(content.length).toBeGreaterThan(0);
    reporter.addVerification('Note content accessible after refresh during sync', 'PASS');

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Browser refresh during sync validation complete', ssPath);
  });
});
