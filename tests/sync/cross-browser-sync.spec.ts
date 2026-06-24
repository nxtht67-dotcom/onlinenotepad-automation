import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { IndexedDBHelper } from '../../helpers/indexeddb/indexeddb.helper.ts';

test.describe('Cross Browser Sync', () => {
  test('Cross Browser Sync', async ({ browser, reporter, takeScreenshot }) => {
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Browser Context A (simulating Browser A)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const homeA = new HomePage(pageA);
    const loginA = new LoginPage(pageA);

    // Step 1: Login in Context A
    reporter.addStep('Context A: Navigate and login');
    await pageA.goto('https://staging.onlinenotepad.io/');
    await pageA.waitForTimeout(2000);
    await homeA.clickSignIn();
    await pageA.waitForTimeout(1000);
    await loginA.login(email, password);
    await pageA.waitForTimeout(3000);
    await pageA.goto('https://staging.onlinenotepad.io/');
    await pageA.waitForTimeout(3000);

    let ssPath = await takeScreenshot(pageA, 'step1_contextA_logged_in');
    reporter.addStep('Context A logged in', ssPath);

    // Step 2: Create notes in Context A
    const testTitle = `CrossSync Note ${Date.now()}`;
    reporter.addStep(`Context A: Creating note "${testTitle}"`);
    await homeA.createNewNote();
    await homeA.setNoteTitle(testTitle);
    await homeA.setNoteContent('Cross browser sync validation content.');
    await pageA.waitForTimeout(2000);

    ssPath = await takeScreenshot(pageA, 'step2_note_created_contextA');
    reporter.addStep('Note created in Context A', ssPath);

    // Step 3: Wait for sync
    reporter.addStep('Waiting for sync to complete');
    await pageA.waitForTimeout(5000);

    const notesA = await IndexedDBHelper.getAllNotes(pageA);
    const noteA = notesA.find(n => n.title === testTitle);
    expect(noteA).toBeTruthy();
    reporter.addVerification('Note exists in Context A IndexedDB', 'PASS');

    // Browser Context B (simulating Browser B)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const homeB = new HomePage(pageB);
    const loginB = new LoginPage(pageB);

    // Step 4: Login in Context B with same account
    reporter.addStep('Context B: Navigate and login with same account');
    await pageB.goto('https://staging.onlinenotepad.io/');
    await pageB.waitForTimeout(2000);
    await homeB.clickSignIn();
    await pageB.waitForTimeout(1000);
    await loginB.login(email, password);
    await pageB.waitForTimeout(3000);
    await pageB.goto('https://staging.onlinenotepad.io/');
    await pageB.waitForTimeout(5000);

    ssPath = await takeScreenshot(pageB, 'step4_contextB_logged_in');
    reporter.addStep('Context B logged in', ssPath);

    // Verify: Synced notes appear in Context B
    const sidebarNotesB = await homeB.getSidebarNotes();
    const foundInSidebar = sidebarNotesB.some(n => n.title === testTitle);
    
    if (foundInSidebar) {
      reporter.addVerification('Synced note appears in Context B sidebar', 'PASS');
    } else {
      // Check IndexedDB as fallback
      const notesB = await IndexedDBHelper.getAllNotes(pageB);
      const noteB = notesB.find(n => n.title === testTitle);
      if (noteB) {
        reporter.addVerification('Synced note found in Context B IndexedDB', 'PASS');
      } else {
        reporter.addVerification('Synced note not found in Context B - sync may be delayed', 'FAIL');
      }
    }

    ssPath = await takeScreenshot(pageB, 'step_final');
    reporter.addStep('Cross browser sync validation complete', ssPath);

    // Cleanup contexts
    await contextA.close();
    await contextB.close();
  });
});
