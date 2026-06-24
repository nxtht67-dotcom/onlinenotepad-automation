# OnlineNotepad QA Test Automation Tool - User Guide

Welcome to the automated test execution suite for **OnlineNotepad** (`https://staging.onlinenotepad.io`). 

This tool is designed for Software Quality Assurance (SQA) black-box testers to run automated test cases across different browsers, verify application behaviors (like note creation, logging in, image uploads, sync, and security), and automatically generate professional execution reports.

---

## How this Tool Helps SQA Teams

- **Eliminates Manual Regressions**: Automatically executes 19 complex scenarios in a visible browser.
- **Cross-Browser Verification**: Supports running tests in **Google Chrome**, **Mozilla Firefox**, and **Microsoft Edge**.
- **Evidence-Backed Bug Reports**: When a test fails, it captures screenshot evidence, browser console logs, network activity, and error details so developers can fix the bug immediately.
- **Dynamic Report Generation**: Generates styled execution files in Microsoft Word (`.docx`) and PDF (`.pdf`) formats showing pass/fail status and steps taken.

---

## First-Time Setup

Before running tests, ensure you have:
1. **Node.js** installed on your system.
2. Opened your command line (PowerShell/Terminal) in the folder, and run:
   ```powershell
   npm install
   npx playwright install
   ```

---

## How to Run Automated Tests

To launch the interactive automation suite:

```powershell
npm run test-cli
```

### Guided Steps:
1. **Select Browser**: Choose Chrome, Firefox, or Microsoft Edge.
2. **Select Test Case**: Choose one of the 19 registered test cases (categorized by function).
3. **Select Report Format**: Choose to output the final report in Word, PDF, or Both.
4. **Login Details (Only if needed)**: 
   - Some tests require logging in. If the test needs it, the tool will prompt you to type the email and password.
   - *Note: A CAPTCHA warning is shown for login tests. Since CAPTCHA requires human interaction, be ready to solve it manually in the opened browser if it appears.*
5. **Observe Execution**: The tool will open a headed browser window and perform all actions automatically. Do not close the browser manually while it is running.

---

## Description of the 19 Automated Test Cases

These scenarios cover critical user paths of the notepad:

### Category A: Guest User Scenarios (No Login Required)
- **1. Guest Note Persistence**: Checks that a note created as a guest remains saved in the notepad when you refresh the page.
- **10. Local Image Upload**: Verifies you can upload a local image file into the note editor and that it displays correctly.
- **11. Third Party Image Validation**: Verifies inserting a link to a remote image renders correctly without errors.

### Category B: Account Registration & Login Scenarios
- **2. Guest Note Assignment After Login**: Verifies that when a guest creates a note and then logs in, that note is automatically moved and assigned to their registered account.
- **4. Multiple Guest Notes Assignment**: Verifies that if a guest creates 3 separate notes and then signs in, all 3 notes are assigned to their account.
- **13. Account Switching**: Logs in User A, creates a note, logs out, and signs in User B, confirming that User A's notes are hidden from User B.

### Category C: Security & Note Ownership
- **3. Ownership Validation**: Confirms that if guest notes are assigned to Account A, Account B cannot view or access them under any circumstances.

### Category D: Server Synchronization & Advanced Behaviors
- **5. Sync Status Validation**: Validates that notes transition from "unsynced" (stored only locally in the browser) to "synced" (saved to the cloud database) once saved.
- **6. Sync Trigger On Open**: Confirms that opening a saved note refreshes the sync status and updates the modification times.
- **7. Cross Browser Sync**: Logs in the same account on two different sessions, verifying notes synced in Session A immediately appear in Session B.
- **8. Placeholder Notes**: Verifies note titles and metadata appear in the sidebar immediately, but the body text remains lazyloaded from the server until selected.
- **9. Lazy Loading Validation**: Confirms that clicking a placeholder note triggers a server request to fetch the actual content.
- **12. Delete Note Validation**: Deletes a note and verifies it is removed from both the sidebar list and the backend database.
- **14. Offline Mode**: Simulates turning off the internet. Creates a note in offline mode (saves locally), reconnects the internet, and verifies that the note automatically syncs to the server.
- **15. Multi Tab Validation**: Validates that editing a note in one browser tab updates the note content in another tab without data loss.
- **16. Browser Refresh During Sync**: Refreshes the browser during a sync request to verify that no duplicate notes are created and no data is corrupted.
- **17. Rapid Note Switching**: Rapidly switches between multiple notes to ensure the editor always loads the correct note content without lag.
- **18. Rapid Switching While Editing**: Edits a note and immediately switches away, verifying the draft contents are preserved.
- **19. Large Note Validation**: Tests the notepad limits with note sizes of 500KB, 900KB, 1MB, and 1.1MB, verifying that size limit warnings are shown for oversized notes.

---

## Reading the Test Reports

Upon completion, reports are saved under the `reports/` folder.

- **Word & PDF Reports**: Show a summary of the test name, status (PASS or FAIL), date, browser, and duration.
- **Reproduction Steps**: Lists every step performed during the test with timestamps and screenshots.
- **Database Snapshots**: Includes a structural representation of the notepad's local storage (IndexedDB) so you can verify the values saved on the machine.
- **Bug Ticket Logs (On Failure)**: If a test fails, the report compiles a red **BUG DETECTED** card, documenting the expected vs. actual result, a screenshot at the exact moment of failure, browser errors, and network logs.
