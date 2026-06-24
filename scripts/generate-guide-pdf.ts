import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

const COLORS = {
  darkBlue: '#1A365D',
  darkGray: '#2D3748',
  mediumGray: '#4A5568',
  lightGray: '#E2E8F0',
  green: '#38A169',
  red: '#E53E3E',
  white: '#FFFFFF',
  bgPanel: '#F7FAFC',
};

async function main() {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const outputPath = path.resolve('OnlineNotepad_QA_User_Guide.pdf');

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Title page Header banner
  doc
    .fillColor(COLORS.darkBlue)
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('ONLINENOTEPAD QA AUTOMATION FRAMEWORK', { align: 'center' });
  doc.moveDown(0.2);
  doc
    .fillColor(COLORS.mediumGray)
    .fontSize(12)
    .font('Helvetica')
    .text('Non-Technical User Guide & Test Specification for SQA Teams', { align: 'center' });
  
  doc.moveDown(0.5);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(COLORS.darkBlue)
    .lineWidth(2)
    .stroke();
  doc.moveDown(1);

  // SECTION 1: How this Tool Helps
  sectionHeader('1. How this Tool Helps SQA Teams');
  bulletPoint('Eliminates Manual Regressions', 'Automatically executes 19 complex scenarios in a visible browser.');
  bulletPoint('Cross-Browser Verification', 'Supports running tests in Google Chrome, Mozilla Firefox, and Microsoft Edge.');
  bulletPoint('Evidence-Backed Bug Reports', 'Captures screenshots, console logs, network activity, and stack traces on failures.');
  bulletPoint('Dynamic Reports', 'Generates Word (.docx) and PDF (.pdf) reports detailing exact pass/fail reasons.');

  // SECTION 2: First-Time Setup
  doc.moveDown(0.5);
  sectionHeader('2. First-Time Setup');
  paragraph('Before running the automation suite, ensure you have Node.js installed on your system. Open your command line (terminal) in this folder, and run:');
  codeBlock('npm install\nnpx playwright install');

  // SECTION 3: How to Run the Tests
  doc.moveDown(0.5);
  sectionHeader('3. How to Run Automated Tests');
  paragraph('To start the interactive program, run the following command:');
  codeBlock('npm run test-cli');
  paragraph('The tool will ask you to:');
  numberedPoint('1', 'Select Browser (Chrome, Firefox, or Edge)');
  numberedPoint('2', 'Select the Test Case (from the 19 registered test cases)');
  numberedPoint('3', 'Select Report Format (Word, PDF, or Both)');
  numberedPoint('4', 'Input Credentials (if authentication is required by the test)');
  paragraph('Note: For tests requiring login, you may see a CAPTCHA challenge in the browser. Since CAPTCHA is designed to block automation, you will need to manually solve the challenge inside the opened browser window to let the test proceed.');

  // Continues to test cases section

  // SECTION 4: Descriptions of the 19 Test Cases
  sectionHeader('4. Descriptions of the 19 Automated Test Cases');
  
  doc.fillColor(COLORS.darkBlue).fontSize(11).font('Helvetica-Bold').text('Guest User Scenarios (No Login Required)');
  doc.moveDown(0.3);
  testCase('1. Guest Note Persistence', 'Verifies that guest notes are saved locally in the browser and remain available when you refresh the page.');
  testCase('10. Local Image Upload', 'Verifies you can upload a local image file into the note editor and that it displays correctly.');
  testCase('11. Third Party Image Validation', 'Verifies inserting a link to a remote image renders correctly without errors.');

  doc.moveDown(0.5);
  doc.fillColor(COLORS.darkBlue).fontSize(11).font('Helvetica-Bold').text('Account Registration & Login Scenarios');
  doc.moveDown(0.3);
  testCase('2. Guest Note Assignment After Login', 'Verifies that guest notes are automatically assigned to the user account on sign-in.');
  testCase('4. Multiple Guest Notes Assignment', 'Verifies multiple guest notes are successfully transferred to the user account on sign-in.');
  testCase('13. Account Switching', 'Logs in User A, creates note, logs out, and signs in User B, confirming that User A\'s notes are isolated and hidden.');

  doc.moveDown(0.5);
  doc.fillColor(COLORS.darkBlue).fontSize(11).font('Helvetica-Bold').text('Security & Note Ownership');
  doc.moveDown(0.3);
  testCase('3. Ownership Validation', 'Confirms that if guest notes are assigned to Account A, Account B cannot view or access them under any circumstances.');

  // Continues to advanced sync section
  doc.fillColor(COLORS.darkBlue).fontSize(11).font('Helvetica-Bold').text('Server Synchronization & Advanced Behaviors');
  doc.moveDown(0.3);
  testCase('5. Sync Status Validation', 'Validates notes transition from "unsynced" (local storage) to "synced" (saved to cloud) once saved.');
  testCase('6. Sync Trigger On Open', 'Confirms opening a note refreshes the sync status and updates modification times.');
  testCase('7. Cross Browser Sync', 'Logs in same account in two browser instances, verifying notes synced in A immediately appear in B.');
  testCase('8. Placeholder Notes', 'Verifies note metadata appears in the sidebar first, keeping content absent (lazy-loaded) until selected.');
  testCase('9. Lazy Loading Validation', 'Confirms that clicking a placeholder note triggers a server request to fetch the actual content.');
  testCase('12. Delete Note Validation', 'Deletes a note, verifying it is removed from the sidebar and backend database.');
  testCase('14. Offline Mode', 'Simulates offline state. Creates note offline (saved locally), reconnects, and verifies it automatically syncs.');
  testCase('15. Multi Tab Validation', 'Validates editing a note in one tab updates content in another tab without data loss.');
  testCase('16. Browser Refresh During Sync', 'Refreshes browser mid-sync to verify no duplicate records are generated and no data is corrupted.');
  testCase('17. Rapid Note Switching', 'Switches notes rapidly, validating that previous pending sync requests are cancelled and the correct note loads.');
  testCase('18. Rapid Switching While Editing', 'Edits a note and switches away, verifying draft contents are preserved.');
  testCase('19. Large Note Validation', 'Tests notepad limits with note sizes of 500KB, 900KB, 1MB, and 1.1MB, checking that size warnings are displayed.');

  // SECTION 5: Reading the Reports
  doc.moveDown(1);
  sectionHeader('5. Understanding the QA Test Reports');
  paragraph('Every execution generates Word and/or PDF reports containing complete execution artifacts:');
  bulletPoint('Execution Metadata', 'Displays the test name, pass/fail status, date, browser, and duration.');
  bulletPoint('Reproduction Steps', 'Lists each step performed with a detailed explanation, time, and full-page screenshot.');
  bulletPoint('Database Snapshot', 'Parses the local browser IndexedDB database to display the internal records for verification.');
  bulletPoint('Bug Ticket Logs', 'For failures, compiles a red BUG DETECTED card documenting the expected vs actual result, screenshot, console logs, network requests, and stack trace.');

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`Guide PDF generated at: ${outputPath}`);
      resolve();
    });
    stream.on('error', reject);
  });

  // Helpers
  function sectionHeader(title: string) {
    doc
      .fillColor(COLORS.darkBlue)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(title);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .strokeColor(COLORS.darkBlue)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.6);
  }

  function paragraph(text: string) {
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(10)
      .font('Helvetica')
      .text(text, { align: 'justify', lineGap: 2 });
    doc.moveDown(0.5);
  }

  function bulletPoint(title: string, desc: string) {
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(`  •  ${title}: `, { continued: true })
      .font('Helvetica')
      .text(desc);
    doc.moveDown(0.3);
  }

  function numberedPoint(num: string, text: string) {
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(`  ${num}. `, { continued: true })
      .font('Helvetica')
      .text(text);
    doc.moveDown(0.3);
  }

  function testCase(name: string, desc: string) {
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(`  •  ${name}: `, { continued: true })
      .font('Helvetica')
      .text(desc);
    doc.moveDown(0.3);
  }

  function codeBlock(code: string) {
    const y = doc.y;
    const startX = 50;
    const width = 495;
    const height = doc.heightOfString(code, { width: width - 20 }) + 12;
    doc.rect(startX, y, width, height).fill(COLORS.bgPanel);
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(8.5)
      .font('Courier')
      .text(code, startX + 10, y + 6);
    doc.y = y + height;
    doc.moveDown(0.5);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
