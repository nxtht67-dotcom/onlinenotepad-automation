import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { StorageEvidenceSnapshot } from './docxReporter.ts';

export type ReportFormat = 'word' | 'pdf' | 'both';

export interface PdfReportStep {
  description: string;
  screenshotPath?: string;
  timestamp: string;
}

export interface PdfReportVerification {
  description: string;
  status: 'PASS' | 'FAIL';
}

export interface PdfBugDetails {
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  expected: string;
  actual: string;
  recommendation: string;
  stackTrace?: string;
}

const COLORS = {
  darkBlue: '#1A365D',
  darkGray: '#2D3748',
  mediumGray: '#4A5568',
  lightGray: '#E2E8F0',
  green: '#38A169',
  red: '#E53E3E',
  redLight: '#FED7D7',
  white: '#FFFFFF',
  offWhite: '#F7FAFC',
};

export class PdfReporter {
  private testName: string;
  private browser: string;
  private envUrl: string;
  private startTime: Date;
  private endTime: Date | null = null;
  private status: 'PASS' | 'FAIL' = 'PASS';

  private steps: PdfReportStep[] = [];
  private verifications: PdfReportVerification[] = [];
  private consoleLogs: string[] = [];
  private networkLogs: string[] = [];
  private storageEvidence: StorageEvidenceSnapshot[] = [];
  private bugDetails: PdfBugDetails | null = null;

  constructor(testName: string, browser: string, envUrl: string) {
    this.testName = testName;
    this.browser = browser;
    this.envUrl = envUrl;
    this.startTime = new Date();
  }

  addStep(description: string, screenshotPath?: string) {
    this.steps.push({
      description: description.replace(/\u001B\[[0-9;]*m/g, ''),
      screenshotPath,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  addVerification(description: string, status: 'PASS' | 'FAIL' = 'PASS') {
    this.verifications.push({ description, status });
    if (status === 'FAIL') this.status = 'FAIL';
  }

  addConsoleLog(log: string) {
    this.consoleLogs.push(log);
  }

  addNetworkLog(log: string) {
    this.networkLogs.push(log);
  }

  addIndexedDBSnapshot(snapshot: StorageEvidenceSnapshot) {
    this.storageEvidence.push(snapshot);
  }

  setFailed(bug: PdfBugDetails) {
    this.status = 'FAIL';
    this.bugDetails = bug;
  }

  async generateReport(): Promise<string> {
    this.endTime = new Date();
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    const durationSec = (durationMs / 1000).toFixed(2);

    const reportsDir = path.resolve('reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const sanitizedTestName = this.testName.replace(/[^a-zA-Z0-9]/g, '');
    const dateStr = this.startTime.toISOString().split('T')[0];
    const timeStr = this.startTime
      .toLocaleTimeString('en-US', { hour12: false })
      .replace(/:/g, '-');
    const filename = `${sanitizedTestName}_${dateStr}_${timeStr}.pdf`;
    const outputPath = path.join(reportsDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── Title ──
    doc
      .fillColor(COLORS.darkBlue)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('AUTOMATED QA TEST EXECUTION REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor(COLORS.darkBlue)
      .lineWidth(2)
      .stroke();
    doc.moveDown(1);

    // ── Metadata Table ──
    const metaRows: [string, string, string, string][] = [
      ['Test Name', this.testName, 'Status', this.status],
      ['Browser', this.browser, 'Execution Date', this.startTime.toLocaleDateString()],
      ['Environment URL', this.envUrl, 'Duration', `${durationSec} seconds`],
      ['Start Time', this.startTime.toLocaleTimeString(), 'End Time', this.endTime.toLocaleTimeString()],
    ];

    this.drawMetaTable(doc, metaRows);
    doc.moveDown(1.5);

    // ── Conditional content ──
    if (this.status === 'FAIL') {
      this.buildBugSection(doc);
    } else {
      this.buildPassSection(doc);
    }

    // ── IndexedDB Evidence ──
    this.buildStorageEvidenceSection(doc);

    // ── Logs (on failure) ──
    if (this.status === 'FAIL') {
      this.buildLogsSection(doc);
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return outputPath;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private drawMetaTable(doc: PDFKit.PDFDocument, rows: [string, string, string, string][]) {
    const colWidths = [110, 175, 110, 150];
    const rowHeight = 20;
    const startX = 50;
    let y = doc.y;

    for (const [label1, val1, label2, val2] of rows) {
      const cells: { text: string; isLabel: boolean }[] = [
        { text: label1, isLabel: true },
        { text: val1, isLabel: false },
        { text: label2, isLabel: true },
        { text: val2, isLabel: false },
      ];

      let x = startX;
      cells.forEach((cell, i) => {
        const fill = cell.isLabel ? COLORS.lightGray : COLORS.white;
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke(fill, '#CBD5E0');
        doc
          .fillColor(cell.text === 'PASS' ? COLORS.green : cell.text === 'FAIL' ? COLORS.red : COLORS.darkGray)
          .fontSize(9)
          .font(cell.isLabel ? 'Helvetica-Bold' : 'Helvetica')
          .text(cell.text, x + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });

      y += rowHeight;
    }

    doc.y = y;
    doc.x = startX;
  }

  private sectionHeading(doc: PDFKit.PDFDocument, title: string, color = COLORS.darkBlue) {
    doc.moveDown(1.5);
    doc
      .fillColor(color)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(title);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .strokeColor(color)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);
  }

  private stringifyValue(value: unknown, maxLength = 180): string {
    if (value === null || value === undefined) {
      return String(value);
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text) {
      return '';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  private drawGrid(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[]) {
    const startX = 50;
    const cellPadding = 4;
    const fontSize = 7;
    doc.fontSize(fontSize).font('Helvetica');

    // Helper to calculate cell text height based on wrapper width
    const getRowHeight = (row: string[]) => {
      let maxHeight = 14;
      row.forEach((cellText, colIdx) => {
        const w = colWidths[colIdx] - cellPadding * 2;
        const textH = doc.heightOfString(cellText || '', { width: w });
        if (textH + cellPadding * 2 > maxHeight) {
          maxHeight = textH + cellPadding * 2;
        }
      });
      return maxHeight;
    };

    let y = doc.y;
    const pageHeight = doc.page.height;
    const bottomMargin = doc.page.margins.bottom;
    const limit = pageHeight - bottomMargin;

    // Draw header row
    const headerHeight = getRowHeight(headers);
    if (y + headerHeight > limit) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    let x = startX;
    headers.forEach((header, colIdx) => {
      const w = colWidths[colIdx];
      doc.rect(x, y, w, headerHeight).fillAndStroke(COLORS.lightGray, '#CBD5E0');
      doc
        .fillColor(COLORS.darkGray)
        .font('Helvetica-Bold')
        .text(header, x + cellPadding, y + cellPadding, { width: w - cellPadding * 2 });
      x += w;
    });
    y += headerHeight;

    // Draw data rows
    doc.font('Helvetica');
    for (const row of rows) {
      const rowHeight = getRowHeight(row);
      if (y + rowHeight > limit) {
        doc.addPage();
        y = doc.page.margins.top;

        // Re-draw headers on new page
        let hX = startX;
        headers.forEach((header, colIdx) => {
          const w = colWidths[colIdx];
          doc.rect(hX, y, w, headerHeight).fillAndStroke(COLORS.lightGray, '#CBD5E0');
          doc
            .fillColor(COLORS.darkGray)
            .font('Helvetica-Bold')
            .text(header, hX + cellPadding, y + cellPadding, { width: w - cellPadding * 2 });
          hX += w;
        });
        y += headerHeight;
      }

      x = startX;
      row.forEach((cellText, colIdx) => {
        const w = colWidths[colIdx];
        doc.rect(x, y, w, rowHeight).fillAndStroke(COLORS.white, '#CBD5E0');
        doc
          .fillColor(COLORS.darkGray)
          .text(cellText || '', x + cellPadding, y + cellPadding, { width: w - cellPadding * 2 });
        x += w;
      });
      y += rowHeight;
    }

    doc.y = y;
  }

  private buildStorageEvidenceSection(doc: PDFKit.PDFDocument) {
    this.sectionHeading(doc, 'Application Storage / IndexedDB Evidence');
    doc
      .fillColor(COLORS.mediumGray)
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text('DevTools path: Inspect > Application > IndexedDB > OnlineNotepadDB');
    doc.moveDown(0.5);

    if (this.storageEvidence.length === 0) {
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text('No IndexedDB snapshot was captured for this execution.');
      doc.moveDown(1);
      return;
    }

    for (const snapshot of this.storageEvidence) {
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Database: ${snapshot.databaseName}   |   Captured At: ${snapshot.capturedAt}`);
      doc.moveDown(0.4);

      // Stores summary table
      const storesHeaders = ['Object Store', 'Key Path', 'Indexes', 'Records'];
      const storesRows = snapshot.stores.map(store => [
        store.storeName,
        this.stringifyValue(store.keyPath, 50),
        store.indexes.length > 0 ? store.indexes.join(', ') : 'None',
        String(store.recordCount),
      ]);
      const storesWidths = [120, 120, 175, 80]; // Total = 495
      this.drawGrid(doc, storesHeaders, storesRows, storesWidths);
      doc.moveDown(1);

      // Notes store records details
      const notesStore = snapshot.stores.find(s => s.storeName === 'notes');
      if (notesStore) {
        doc
          .fillColor(COLORS.darkBlue)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Object Store: notes');
        doc.moveDown(0.4);

        if (notesStore.sampleRecords.length === 0) {
          doc
            .fillColor(COLORS.darkGray)
            .fontSize(9)
            .font('Helvetica-Oblique')
            .text('No note records found.');
          doc.moveDown(1);
        } else {
          const notesHeaders = ['unique_id', 'title', 'userID', 'syncStatus', 'lastSyncedAt', 'created_at', 'deleted_at', 'contentLength'];
          const notesRows = notesStore.sampleRecords.map(record => [
            this.stringifyValue(record.unique_id, 36),
            this.stringifyValue(record.title, 50),
            this.stringifyValue(record.userID, 10),
            this.stringifyValue(record.syncStatus, 5),
            this.stringifyValue(record.lastSyncedAt, 25),
            this.stringifyValue(record.created_at, 25),
            this.stringifyValue(record.deleted_at, 25),
            this.stringifyValue(record.contentLength, 10),
          ]);
          const notesWidths = [100, 85, 35, 35, 70, 70, 50, 50]; // Total = 495
          this.drawGrid(doc, notesHeaders, notesRows, notesWidths);
          doc.moveDown(1);
        }
      }
    }
  }

  private buildPassSection(doc: PDFKit.PDFDocument) {
    this.sectionHeading(doc, 'Execution Steps');

    this.steps.forEach((step, idx) => {
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${idx + 1}. `, { continued: true })
        .font('Helvetica')
        .text(`${step.description}  `, { continued: true })
        .fillColor(COLORS.mediumGray)
        .fontSize(8)
        .text(`(${step.timestamp})`);

      // Embed screenshot if available
      if (step.screenshotPath && fs.existsSync(step.screenshotPath)) {
        try {
          doc.moveDown(0.3);
          const imgWidth = 400;
          doc.image(step.screenshotPath, { width: imgWidth, align: 'center' });
          doc.moveDown(0.5);
        } catch {
          doc
            .fillColor(COLORS.red)
            .fontSize(8)
            .text('[Screenshot could not be embedded]');
        }
      }

      doc.moveDown(0.3);
    });

    this.sectionHeading(doc, 'Verification Results');

    this.verifications.forEach((ver) => {
      const icon = ver.status === 'PASS' ? '✔' : '✘';
      const color = ver.status === 'PASS' ? COLORS.green : COLORS.red;
      doc
        .fillColor(color)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${icon} `, { continued: true })
        .fillColor(COLORS.darkGray)
        .font('Helvetica')
        .text(`${ver.description}  `, { continued: true })
        .fillColor(color)
        .font('Helvetica-Bold')
        .text(`[${ver.status}]`);
      doc.moveDown(0.2);
    });
  }

  private buildBugSection(doc: PDFKit.PDFDocument) {
    const bug = this.bugDetails || {
      title: 'Unexpected Assertion Failure',
      severity: 'High' as const,
      expected: 'Test assertion to succeed',
      actual: 'Test assertion failed',
      recommendation: 'Investigate component functionality',
    };

    this.sectionHeading(doc, '🔴 BUG DETECTED', COLORS.red);

    const bugRows: [string, string][] = [
      ['Bug Title', bug.title],
      ['Severity', bug.severity],
      ['Expected Result', bug.expected],
      ['Actual Result', bug.actual],
      ['Recommendation', bug.recommendation],
    ];

    const startX = 50;
    const labelWidth = 130;
    const valueWidth = 365;
    const rowPadding = 6;

    for (const [label, value] of bugRows) {
      const textHeight = Math.max(
        20,
        doc.heightOfString(value, { width: valueWidth - 8 }) + rowPadding * 2
      );
      const y = doc.y;

      // Label cell
      doc.rect(startX, y, labelWidth, textHeight).fillAndStroke(COLORS.redLight, '#FEB2B2');
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(label, startX + 4, y + rowPadding, { width: labelWidth - 8 });

      // Value cell
      doc.rect(startX + labelWidth, y, valueWidth, textHeight).fillAndStroke(COLORS.white, '#FEB2B2');
      doc
        .fillColor(label === 'Severity' ? COLORS.red : COLORS.darkGray)
        .fontSize(9)
        .font('Helvetica')
        .text(value, startX + labelWidth + 4, y + rowPadding, { width: valueWidth - 8 });

      doc.y = y + textHeight;
    }

    doc.moveDown(1);

    this.sectionHeading(doc, 'Reproduction Steps');
    this.steps.forEach((step, idx) => {
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${idx + 1}. `, { continued: true })
        .font('Helvetica')
        .text(step.description);
      doc.moveDown(0.2);
    });

    this.sectionHeading(doc, 'Failure Evidence');

    // Embed the last screenshot
    const lastWithSS = [...this.steps].reverse().find((s) => s.screenshotPath);
    if (lastWithSS?.screenshotPath && fs.existsSync(lastWithSS.screenshotPath)) {
      try {
        doc
          .fillColor(COLORS.mediumGray)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Screenshot at failure point:');
        doc.moveDown(0.3);
        doc.image(lastWithSS.screenshotPath, { width: 400, align: 'center' });
        doc.moveDown(0.5);
      } catch {
        doc.fillColor(COLORS.red).text('[Screenshot could not be embedded]');
      }
    }

    if (bug.stackTrace) {
      doc.moveDown(0.5);
      doc.fillColor(COLORS.red).fontSize(9).font('Helvetica-Bold').text('Stack Trace:');
      doc.moveDown(0.2);
      doc
        .fillColor(COLORS.mediumGray)
        .fontSize(7)
        .font('Courier')
        .text(bug.stackTrace.slice(0, 2000), { lineBreak: true });
    }
  }

  private buildLogsSection(doc: PDFKit.PDFDocument) {
    if (this.consoleLogs.length > 0) {
      this.sectionHeading(doc, 'Browser Console Logs');
      this.consoleLogs.slice(0, 80).forEach((log) => {
        doc.fillColor(COLORS.darkGray).fontSize(7).font('Courier').text(log, { lineBreak: true });
      });
    }

    if (this.networkLogs.length > 0) {
      this.sectionHeading(doc, 'Network Logs');
      this.networkLogs.slice(0, 80).forEach((log) => {
        doc.fillColor(COLORS.darkGray).fontSize(7).font('Courier').text(log, { lineBreak: true });
      });
    }
  }
}
