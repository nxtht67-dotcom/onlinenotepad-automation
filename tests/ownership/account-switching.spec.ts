import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Account Switching', () => {
  test('Account Switching', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);

    const emailA = process.env.TEST_EMAIL || '';
    const passwordA = process.env.TEST_PASSWORD || '';
    const emailB = process.env.TEST_EMAIL_B || '';
    const passwordB = process.env.TEST_PASSWORD_B || '';

    // Step 1: Login Account A
    reporter.addStep('Navigate to OnlineNotepad');
    await page.goto('/');
    await page.waitForTimeout(2000);

    reporter.addStep('Logging in as Account A');
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    const loginPage = new LoginPage(page);
    await loginPage.login(emailA, passwordA);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    let ssPath = await takeScreenshot(page, 'step1_account_a');
    reporter.addStep('Account A logged in', ssPath);

    // Step 2: Create a note
    reporter.addStep('Creating note as Account A');
    await homePage.createNewNote();
    const testTitle = `AcctSwitch Note ${Date.now()}`;
    await homePage.setNoteTitle(testTitle);
    await homePage.setNoteContent('Account switching validation content.');
    await page.waitForTimeout(1500);

    const notesA = await IndexedDBHelper.getAllNotes(page);
    const noteA = notesA.find(n => n.title === testTitle);
    expect(noteA).toBeTruthy();
    reporter.addVerification('Note created by Account A', 'PASS');

    ssPath = await takeScreenshot(page, 'step2_note_created');
    reporter.addStep('Note created by Account A', ssPath);

    // Step 3: Logout
    reporter.addStep('Logging out of Account A');
    await homePage.clickLogout();
    await page.waitForTimeout(2000);
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Step 4: Login Account B
    reporter.addStep('Logging in as Account B');
    await homePage.clickSignIn();
    await page.waitForTimeout(1000);
    await loginPage.login(emailB, passwordB);
    await page.waitForTimeout(3000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    ssPath = await takeScreenshot(page, 'step4_account_b');
    reporter.addStep('Account B logged in', ssPath);

    // Verify: Account A notes not visible in Account B's sidebar
    const sidebarNotes = await homePage.getSidebarNotes();
    const accountANoteVisible = sidebarNotes.some(n => n.title === testTitle);
    expect(accountANoteVisible).toBeFalsy();
    reporter.addVerification('Account A note not visible in Account B sidebar', 'PASS');

    // Verify: IndexedDB does not contain Account A's note for Account B
    const notesB = await IndexedDBHelper.getAllNotes(page);
    const noteInB = notesB.find(n => n.title === testTitle);
    if (!noteInB) {
      reporter.addVerification('Account A note not in Account B IndexedDB', 'PASS');
    } else {
      reporter.addVerification('Account A note found in Account B IndexedDB (possible data leak)', 'FAIL');
    }

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Final verification complete', ssPath);
  });
});
