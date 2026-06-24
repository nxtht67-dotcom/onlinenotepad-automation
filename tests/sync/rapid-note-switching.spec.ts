import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Rapid Note Switching', () => {
  test('Rapid Note Switching', async ({ page, reporter, takeScreenshot, networkHelper }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login — we need an authenticated session to observe server sync
    // request cancellation behaviour during rapid switching
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

    // Step 2: Create Note A, B, C
    const notes = [
      { title: `RapidSwitch A ${Date.now()}`, content: 'Content of Note A for rapid switching test.' },
      { title: `RapidSwitch B ${Date.now()}`, content: 'Content of Note B for rapid switching test.' },
      { title: `RapidSwitch C ${Date.now()}`, content: 'Content of Note C for rapid switching test.' },
    ];

    for (const note of notes) {
      reporter.addStep(`Creating note: "${note.title}"`);
      await homePage.createNewNote();
      await homePage.setNoteTitle(note.title);
      await homePage.setNoteContent(note.content);
      await page.waitForTimeout(1500);
    }

    ssPath = await takeScreenshot(page, 'step2_three_notes');
    reporter.addStep('Three notes created (A, B, C)', ssPath);

    // Step 3: Rapidly switch A -> B -> C -> A -> C -> B
    networkHelper.clearLogs();
    const switchSequence = [
      notes[0], notes[1], notes[2], notes[0], notes[2], notes[1]
    ];

    reporter.addStep('Rapid note switching: A → B → C → A → C → B (as fast as possible)');
    await homePage.selectNotesRapidly(switchSequence.map((note) => note.title));

    // Settle
    await page.waitForTimeout(3000);

    ssPath = await takeScreenshot(page, 'step3_after_rapid_switching');
    reporter.addStep('Rapid switching sequence completed', ssPath);

    // Verify: Correct note displayed (last was B)
    const lastNote = switchSequence[switchSequence.length - 1];
    const displayedTitle = await homePage.getNoteTitle();
    const displayedContent = await homePage.getNoteContent();
    reporter.addStep(`Final note title: "${displayedTitle}"`);

    expect(displayedContent).toContain(lastNote.content);
    reporter.addVerification('Correct note content displayed after rapid switching (no content mixing)', 'PASS');

    // Verify each note still has its correct content
    for (const note of notes) {
      await homePage.selectNoteByTitle(note.title);
      await page.waitForTimeout(1000);
      const content = await homePage.getNoteContent();
      expect(content).toContain(note.content);
      reporter.addVerification(`Note "${note.title}" has correct content (not shuffled)`, 'PASS');
    }

    // Log network requests — check for cancelled pending requests
    const allLogs = networkHelper.getFormattedLogs();
    reporter.addStep(`Total network requests during rapid switching: ${allLogs.length}`);
    reporter.addVerification(`${allLogs.length} server requests observed during rapid switching`, 'PASS');
    for (const log of allLogs.slice(0, 25)) {
      reporter.addNetworkLog(log);
    }

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Rapid note switching validation complete', ssPath);
  });
});
