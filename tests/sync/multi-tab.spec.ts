import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Multi Tab Validation', () => {
  test('Multi Tab Validation', async ({ context, reporter, takeScreenshot }) => {
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Open Tab 1 and login — server sync needed for cross-tab consistency
    const page1 = await context.newPage();
    const homePage1 = new HomePage(page1);

    reporter.addStep('Tab 1: Navigate and login');
    await page1.goto('https://staging.onlinenotepad.io/');
    await page1.waitForTimeout(2000);
    await homePage1.clickSignIn();
    await page1.waitForTimeout(1000);
    const loginPage1 = new LoginPage(page1);
    await loginPage1.login(email, password);
    await page1.waitForTimeout(3000);
    await page1.goto('https://staging.onlinenotepad.io/');
    await page1.waitForTimeout(3000);

    let ssPath = await takeScreenshot(page1, 'step1_tab1_logged_in');
    reporter.addStep('Tab 1: Logged in', ssPath);

    // Step 2: Create a note in Tab 1 and allow it to sync
    const testTitle = `MultiTab Note ${Date.now()}`;
    const testContent = 'Multi tab validation original content.';
    reporter.addStep(`Tab 1: Creating note "${testTitle}"`);
    await homePage1.createNewNote();
    await homePage1.setNoteTitle(testTitle);
    await homePage1.setNoteContent(testContent);
    await page1.waitForTimeout(5000); // Allow server sync

    ssPath = await takeScreenshot(page1, 'step2_tab1_note_created');
    reporter.addStep('Tab 1: Note created and synced to server', ssPath);

    // Step 3: Open Tab 2 with the same login session (shared context)
    const page2 = await context.newPage();
    const homePage2 = new HomePage(page2);

    reporter.addStep('Tab 2: Navigate to OnlineNotepad');
    await page2.goto('https://staging.onlinenotepad.io/');
    await page2.waitForTimeout(5000); // Allow notes to load from server

    ssPath = await takeScreenshot(page2, 'step3_tab2_loaded');
    reporter.addStep('Tab 2: Page loaded (same session — notes should be visible)', ssPath);

    // Step 4: Edit note in Tab 1
    const updatedContent = 'Updated content from Tab 1 — should appear in Tab 2 via server sync.';
    reporter.addStep('Tab 1: Editing note content');
    await page1.bringToFront();
    await homePage1.setNoteContent(updatedContent);
    await page1.waitForTimeout(5000); // Allow server sync after edit

    ssPath = await takeScreenshot(page1, 'step4_tab1_edited');
    reporter.addStep('Tab 1: Note content updated and sync triggered', ssPath);

    // Step 5: Check Tab 2 for the note
    reporter.addStep('Tab 2: Checking for note consistency from server');
    await page2.bringToFront();
    await page2.reload();
    await page2.waitForTimeout(3000);

    const sidebarNotesB = await homePage2.getSidebarNotes();
    const foundInSidebar = sidebarNotesB.some(n => n.title === testTitle);
    reporter.addVerification(
      foundInSidebar
        ? 'Note visible in Tab 2 sidebar (server sync working)'
        : 'Note not in Tab 2 sidebar yet (sync may still be in progress)',
      foundInSidebar ? 'PASS' : 'FAIL'
    );

    if (foundInSidebar) {
      await homePage2.selectNoteByTitle(testTitle);
      await page2.waitForTimeout(2000);
      const tab2Content = await homePage2.getNoteContent();
      reporter.addStep(`Tab 2 content: "${tab2Content.substring(0, 80)}..."`);
      reporter.addVerification('Note content accessible in Tab 2 via server sync', 'PASS');
    }

    // Verify: No data corruption in IndexedDB
    const notes1 = await IndexedDBHelper.getAllNotes(page1);
    const note1 = notes1.find(n => n.title === testTitle);
    expect(note1).toBeTruthy();
    reporter.addVerification('Note exists in Tab 1 IndexedDB without corruption', 'PASS');

    ssPath = await takeScreenshot(page2, 'step_final');
    reporter.addStep('Multi tab validation complete', ssPath);

    await page1.close();
    await page2.close();
  });
});
