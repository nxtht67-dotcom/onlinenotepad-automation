import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Guest Note Persistence', () => {
  test('Guest Note Persistence', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);

    // Step 1: Open site as guest
    reporter.addStep('Navigate to OnlineNotepad as guest');
    await page.goto('/');
    await page.waitForTimeout(2000);
    let ssPath = await takeScreenshot(page, 'step1_open_site');
    reporter.addStep('Site opened as guest', ssPath);

    // Step 2: Create a new note
    reporter.addStep('Click create new note button');
    await homePage.createNewNote();
    await page.waitForTimeout(1000);

    // Step 3: Enter title and content
    const testTitle = `Test Note ${Date.now()}`;
    const testContent = 'This is a test note for guest persistence validation.';
    reporter.addStep(`Setting note title: "${testTitle}"`);
    await homePage.setNoteTitle(testTitle);
    reporter.addStep(`Typing note content: "${testContent}"`);
    await homePage.setNoteContent(testContent);
    await page.waitForTimeout(1500);
    ssPath = await takeScreenshot(page, 'step3_note_created');
    reporter.addStep('Note title and content entered', ssPath);

    // Step 4: Capture unique_id from IndexedDB before refresh
    const notesBefore = await IndexedDBHelper.getAllNotes(page);
    expect(notesBefore.length).toBeGreaterThan(0);
    const createdNote = notesBefore.find(n => n.title === testTitle);
    expect(createdNote).toBeTruthy();
    const uniqueIdBefore = createdNote!.unique_id;
    reporter.addStep(`IndexedDB record found with unique_id: ${uniqueIdBefore}`);
    reporter.addVerification('IndexedDB record exists before refresh', 'PASS');

    // Step 5: Refresh the page
    reporter.addStep('Refreshing the page');
    await page.reload();
    await page.waitForTimeout(3000);
    ssPath = await takeScreenshot(page, 'step5_after_refresh');
    reporter.addStep('Page refreshed', ssPath);

    // Verify: Note exists after refresh
    const notesAfter = await IndexedDBHelper.getAllNotes(page);
    const noteAfter = notesAfter.find(n => n.unique_id === uniqueIdBefore);
    expect(noteAfter).toBeTruthy();
    reporter.addVerification('Note exists in IndexedDB after refresh', 'PASS');

    // Verify: Content preserved
    expect(noteAfter!.title).toBe(testTitle);
    reporter.addVerification('Note title preserved after refresh', 'PASS');

    // Verify: unique_id unchanged
    expect(noteAfter!.unique_id).toBe(uniqueIdBefore);
    reporter.addVerification('unique_id unchanged after refresh', 'PASS');

    // Select the note in sidebar and verify content is visible
    await homePage.selectNoteByTitle(testTitle);
    await page.waitForTimeout(1000);
    const displayedContent = await homePage.getNoteContent();
    expect(displayedContent).toContain(testContent);
    reporter.addVerification('Note content preserved and visible in editor', 'PASS');

    ssPath = await takeScreenshot(page, 'step_final_verification');
    reporter.addStep('Final verification complete', ssPath);
  });
});
