import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Multiple Guest Notes Assignment', () => {
  test('Multiple Guest Notes Assignment', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Open as guest
    reporter.addStep('Navigate to OnlineNotepad as guest');
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Create 3 guest notes
    const noteIds: string[] = [];
    const noteTitles: string[] = [];

    for (let i = 1; i <= 3; i++) {
      const title = `Multi Guest Note ${i} - ${Date.now()}`;
      noteTitles.push(title);

      reporter.addStep(`Creating guest note ${i}: "${title}"`);
      await homePage.createNewNote();
      await homePage.setNoteTitle(title);
      await homePage.setNoteContent(`Content for guest note number ${i}`);
      await page.waitForTimeout(1500);
    }

    let ssPath = await takeScreenshot(page, 'step1_three_guest_notes');
    reporter.addStep('Three guest notes created', ssPath);

    // Capture unique IDs
    const notesBefore = await IndexedDBHelper.getAllNotes(page);
    for (const title of noteTitles) {
      const note = notesBefore.find(n => n.title === title);
      expect(note).toBeTruthy();
      noteIds.push(note!.unique_id);
    }
    reporter.addVerification('All 3 guest notes exist in IndexedDB', 'PASS');

    // Step 2: Login
    reporter.addStep('Navigating to login');
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);

    const loginPage = new LoginPage(page);
    reporter.addStep(`Logging in with email: ${email}`);
    await loginPage.login(email, password);
    await page.waitForTimeout(3000);

    // Refresh
    await page.goto('/');
    await page.waitForTimeout(3000);
    ssPath = await takeScreenshot(page, 'step2_logged_in');
    reporter.addStep('Logged in and page refreshed', ssPath);

    // Verify: All notes assigned
    const notesAfter = await IndexedDBHelper.getAllNotes(page);

    for (let i = 0; i < noteIds.length; i++) {
      const note = notesAfter.find(n => n.unique_id === noteIds[i]);
      expect(note).toBeTruthy();
      expect(note!.userID).toBeTruthy();
      expect(note!.userID).not.toBe(0);
      reporter.addVerification(`Note "${noteTitles[i]}" assigned with userID: ${note!.userID}`, 'PASS');
    }

    // Verify: No duplicates
    for (const title of noteTitles) {
      const dupes = notesAfter.filter(n => n.title === title);
      expect(dupes.length).toBe(1);
    }
    reporter.addVerification('No duplicate notes created for any of the 3 notes', 'PASS');

    // Verify: Same account ownership
    const userIds = noteIds.map(id => notesAfter.find(n => n.unique_id === id)!.userID);
    const allSameOwner = userIds.every(uid => uid === userIds[0]);
    expect(allSameOwner).toBeTruthy();
    reporter.addVerification('All 3 notes belong to the same user account', 'PASS');

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Final verification complete', ssPath);
  });
});
