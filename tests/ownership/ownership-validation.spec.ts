import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Ownership Validation', () => {
  test('Ownership Validation', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);

    const emailA = process.env.TEST_EMAIL || '';
    const passwordA = process.env.TEST_PASSWORD || '';
    const emailB = process.env.TEST_EMAIL_B || '';
    const passwordB = process.env.TEST_PASSWORD_B || '';

    // Step 1: Create guest note
    reporter.addStep('Navigate to OnlineNotepad as guest');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep('Creating guest note');
    await homePage.createNewNote();
    const testTitle = `Ownership Test ${Date.now()}`;
    await homePage.setNoteTitle(testTitle);
    await homePage.setNoteContent('Ownership validation test content.');
    await page.waitForTimeout(1500);

    const notesBefore = await IndexedDBHelper.getAllNotes(page);
    const guestNote = notesBefore.find(n => n.title === testTitle);
    expect(guestNote).toBeTruthy();
    const uniqueId = guestNote!.unique_id;
    let ssPath = await takeScreenshot(page, 'step1_guest_note');
    reporter.addStep('Guest note created', ssPath);

    // Step 2: Login Account A
    reporter.addStep('Logging in as Account A');
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(emailA, passwordA);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    ssPath = await takeScreenshot(page, 'step2_account_a_logged_in');
    reporter.addStep('Account A logged in', ssPath);

    // Step 3: Verify assignment to Account A
    const notesA = await IndexedDBHelper.getAllNotes(page);
    const noteA = notesA.find(n => n.unique_id === uniqueId);
    expect(noteA).toBeTruthy();
    expect(noteA!.userID).toBeTruthy();
    expect(noteA!.userID).not.toBe(0);
    const userIdA = noteA!.userID;
    reporter.addVerification(`Note assigned to Account A with userID: ${userIdA}`, 'PASS');

    // Step 4: Logout
    reporter.addStep('Logging out of Account A');
    await homePage.clickLogout();
    await page.waitForTimeout(2000);
    await page.goto('/');
    await page.waitForTimeout(2000);
    ssPath = await takeScreenshot(page, 'step4_logged_out');
    reporter.addStep('Account A logged out', ssPath);

    // Step 5: Login Account B
    reporter.addStep('Logging in as Account B');
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    await loginPage.login(emailB, passwordB);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    ssPath = await takeScreenshot(page, 'step5_account_b_logged_in');
    reporter.addStep('Account B logged in', ssPath);

    // Verify: Account B cannot access the note
    const notesB = await IndexedDBHelper.getAllNotes(page);
    const noteB = notesB.find(n => n.unique_id === uniqueId);

    // The note should either not exist for Account B, or if it exists, the userID should still be A's
    if (noteB) {
      // If note appears in B's IndexedDB, its userID should still be A's
      expect(noteB.userID).toBe(userIdA);
      reporter.addVerification('Note present in IndexedDB but ownership remains Account A', 'PASS');
    } else {
      reporter.addVerification('Note not accessible to Account B (not in IndexedDB)', 'PASS');
    }

    // Verify via sidebar that the note is not listed for Account B
    const sidebarNotes = await homePage.getSidebarNotes();
    const foundInSidebar = sidebarNotes.some(n => n.title === testTitle);
    // For ownership isolation, note should not appear in Account B's sidebar
    reporter.addVerification(
      foundInSidebar 
        ? 'Note unexpectedly found in Account B sidebar - potential isolation issue' 
        : 'Note not visible in Account B sidebar - ownership isolation confirmed',
      foundInSidebar ? 'FAIL' : 'PASS'
    );

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Final verification complete', ssPath);
  });
});
