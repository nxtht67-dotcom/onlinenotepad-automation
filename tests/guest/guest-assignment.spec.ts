import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Guest Note Assignment After Login', () => {
  test('Guest Note Assignment After Login', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Open as guest
    reporter.addStep('Navigate to OnlineNotepad as guest');
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Step 2: Create a note
    reporter.addStep('Creating a new note as guest');
    await homePage.createNewNote();
    const testTitle = `Guest Assign ${Date.now()}`;
    const testContent = 'Guest note for assignment validation.';
    await homePage.setNoteTitle(testTitle);
    await homePage.setNoteContent(testContent);
    await page.waitForTimeout(1500);
    let ssPath = await takeScreenshot(page, 'step2_guest_note_created');
    reporter.addStep('Guest note created', ssPath);

    // Step 3: Verify userID is 0 or null in IndexedDB
    const notesBefore = await IndexedDBHelper.getAllNotes(page);
    const guestNote = notesBefore.find(n => n.title === testTitle);
    expect(guestNote).toBeTruthy();
    const uniqueId = guestNote!.unique_id;

    const isGuestUserId = guestNote!.userID === 0 || guestNote!.userID === null;
    expect(isGuestUserId).toBeTruthy();
    reporter.addVerification('userID is 0 or null for guest note', 'PASS');

    // Step 4: Login
    reporter.addStep('Navigating to login');
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);

    const loginPage = new LoginPage(page);
    reporter.addStep(`Logging in with email: ${email} (waiting for CAPTCHA if shown)`);
    await loginPage.login(email, password);
    ssPath = await takeScreenshot(page, 'step4_logged_in');
    reporter.addStep('Login completed successfully', ssPath);

    // Step 5: Refresh
    reporter.addStep('Refreshing page after login');
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Verify: Same note exists
    const notesAfter = await IndexedDBHelper.getAllNotes(page);
    const assignedNote = notesAfter.find(n => n.unique_id === uniqueId);
    expect(assignedNote).toBeTruthy();
    reporter.addVerification('Same note exists after login (matched by unique_id)', 'PASS');

    // Verify: userID assigned (not 0/null)
    expect(assignedNote!.userID).toBeTruthy();
    expect(assignedNote!.userID).not.toBe(0);
    reporter.addVerification(`userID assigned: ${assignedNote!.userID}`, 'PASS');

    // Verify: No duplicate note
    const duplicates = notesAfter.filter(n => n.title === testTitle);
    expect(duplicates.length).toBe(1);
    reporter.addVerification('No duplicate notes created', 'PASS');

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Final verification complete', ssPath);
  });
});
