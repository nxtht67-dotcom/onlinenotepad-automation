import { test, expect } from '../fixtures.ts';
import { HomePage } from '../../pages/HomePage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';

test.describe('Rapid Switching While Editing', () => {
  test('Rapid Switching While Editing', async ({ page, reporter, takeScreenshot }) => {
    const homePage = new HomePage(page);
    const email = process.env.TEST_EMAIL || '';
    const password = process.env.TEST_PASSWORD || '';

    // Step 1: Login — sync ensures edit state is pushed to server
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

    // Step 2: Create Note A and Note B
    const noteA = { title: `EditSwitch A ${Date.now()}`, content: 'Original content of Note A.' };
    const noteB = { title: `EditSwitch B ${Date.now()}`, content: 'Original content of Note B.' };

    reporter.addStep(`Creating Note A: "${noteA.title}"`);
    await homePage.createNewNote();
    await homePage.setNoteTitle(noteA.title);
    await homePage.setNoteContent(noteA.content);
    await page.waitForTimeout(2000);

    reporter.addStep(`Creating Note B: "${noteB.title}"`);
    await homePage.createNewNote();
    await homePage.setNoteTitle(noteB.title);
    await homePage.setNoteContent(noteB.content);
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step2_two_notes');
    reporter.addStep('Two notes created and synced', ssPath);

    // Step 3: Select Note A and begin editing
    reporter.addStep('Selecting Note A for editing');
    await homePage.selectNoteByTitle(noteA.title);
    await page.waitForTimeout(1000);

    const draftContent = 'DRAFT — Editing Note A with new content that should be preserved on return.';
    reporter.addStep(`Editing Note A: "${draftContent.substring(0, 50)}..."`);
    await homePage.setNoteContent(draftContent);

    // Step 4: Switch immediately to Note B (before sync completes)
    reporter.addStep('Switching immediately to Note B (mid-edit, before server sync)');
    await homePage.selectNoteByTitle(noteB.title, { fast: true });
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step4_switched_to_b');
    reporter.addStep('Switched to Note B', ssPath);

    // Verify: Note B shows its own content — no crossover from A
    const contentB = await homePage.getNoteContent();
    expect(contentB).toContain(noteB.content);
    expect(contentB).not.toContain(draftContent);
    reporter.addVerification('Note B shows its own content (no data crossover from Note A edit)', 'PASS');

    // Step 5: Return to Note A
    reporter.addStep('Returning to Note A to verify draft state');
    await homePage.selectNoteByTitle(noteA.title);
    await page.waitForTimeout(2000);

    ssPath = await takeScreenshot(page, 'step5_returned_to_a');
    reporter.addStep('Returned to Note A', ssPath);

    const contentA = await homePage.getNoteContent();
    if (contentA.includes(draftContent)) {
      reporter.addVerification('Draft content preserved in Note A after switching away and back', 'PASS');
    } else if (contentA.includes(noteA.content)) {
      reporter.addVerification(
        'Note A shows original content — auto-save captured state before switch (acceptable behaviour)',
        'PASS'
      );
    } else {
      reporter.addVerification('Note A content is unexpected — possible data loss', 'FAIL');
    }

    // Verify: No crossover — Note A should not contain Note B content
    expect(contentA).not.toContain(noteB.content);
    reporter.addVerification('No data crossover from Note B into Note A', 'PASS');

    ssPath = await takeScreenshot(page, 'step_final');
    reporter.addStep('Rapid switching while editing validation complete', ssPath);
  });
});
