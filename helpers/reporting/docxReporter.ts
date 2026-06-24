import * as fs from 'fs';
import * as path from 'path';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  ImageRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  HeadingLevel,
} from 'docx';

export interface ReportStep {
  description: string;
  screenshotPath?: string;
  timestamp: string;
}

export interface ReportVerification {
  description: string;
  status: 'PASS' | 'FAIL';
}

export interface BugDetails {
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  expected: string;
  actual: string;
  recommendation: string;
  stackTrace?: string;
}

export interface StorageEvidenceRecord {
  [key: string]: unknown;
}

export interface StorageEvidenceStore {
  storeName: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: string[];
  recordCount: number;
  sampleRecords: StorageEvidenceRecord[];
}

export interface StorageEvidenceSnapshot {
  databaseName: string;
  capturedAt: string;
  stores: StorageEvidenceStore[];
}

function sanitizeForDocx(text: string): string {
  return text
    .replace(/\u001B\[[0-9;]*m/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export class DocxReporter {
  private testName: string;
  private browser: string;
  private envUrl: string;
  private startTime: Date;
  private endTime: Date | null = null;
  private status: 'PASS' | 'FAIL' = 'PASS';
  
  private steps: ReportStep[] = [];
  private verifications: ReportVerification[] = [];
  private consoleLogs: string[] = [];
  private networkLogs: string[] = [];
  private storageEvidence: StorageEvidenceSnapshot[] = [];
  private bugDetails: BugDetails | null = null;

  constructor(testName: string, browser: string, envUrl: string) {
    this.testName = testName;
    this.browser = browser;
    this.envUrl = envUrl;
    this.startTime = new Date();
  }

  addStep(description: string, screenshotPath?: string) {
    this.steps.push({
      description: sanitizeForDocx(description),
      screenshotPath,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  addVerification(description: string, status: 'PASS' | 'FAIL' = 'PASS') {
    this.verifications.push({ description: sanitizeForDocx(description), status });
    if (status === 'FAIL') {
      this.status = 'FAIL';
    }
  }

  addConsoleLog(log: string) {
    this.consoleLogs.push(sanitizeForDocx(log));
  }

  addNetworkLog(log: string) {
    this.networkLogs.push(sanitizeForDocx(log));
  }

  addIndexedDBSnapshot(snapshot: StorageEvidenceSnapshot) {
    this.storageEvidence.push(snapshot);
  }

  setFailed(bug: BugDetails) {
    this.status = 'FAIL';
    this.bugDetails = {
      ...bug,
      title: sanitizeForDocx(bug.title),
      expected: sanitizeForDocx(bug.expected),
      actual: sanitizeForDocx(bug.actual),
      recommendation: sanitizeForDocx(bug.recommendation),
      stackTrace: bug.stackTrace ? sanitizeForDocx(bug.stackTrace) : undefined,
    };
  }

  async generateReport(): Promise<string> {
    this.endTime = new Date();
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    const durationSec = (durationMs / 1000).toFixed(2);

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header / Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "AUTOMATED QA TEST EXECUTION REPORT",
                bold: true,
                size: 28,
                color: "1A365D", // Dark Blue
              })
            ]
          }),

          // Metadata Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  this.createCell("Test Name", true, "E2E8F0"),
                  this.createCell(this.testName, false),
                  this.createCell("Status", true, "E2E8F0"),
                  this.createCell(this.status, true, undefined, this.status === 'PASS' ? '38A169' : 'E53E3E'), // Green/Red text
                ]
              }),
              new TableRow({
                children: [
                  this.createCell("Browser", true, "E2E8F0"),
                  this.createCell(this.browser, false),
                  this.createCell("Execution Date", true, "E2E8F0"),
                  this.createCell(this.startTime.toLocaleDateString(), false),
                ]
              }),
              new TableRow({
                children: [
                  this.createCell("Environment URL", true, "E2E8F0"),
                  this.createCell(this.envUrl, false),
                  this.createCell("Duration", true, "E2E8F0"),
                  this.createCell(`${durationSec} seconds`, false),
                ]
              }),
              new TableRow({
                children: [
                  this.createCell("Start Time", true, "E2E8F0"),
                  this.createCell(this.startTime.toLocaleTimeString(), false),
                  this.createCell("End Time", true, "E2E8F0"),
                  this.createCell(this.endTime.toLocaleTimeString(), false),
                ]
              })
            ]
          }),

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Conditional Section: Bug Details
          ...(this.status === 'FAIL' ? this.buildBugSection() : this.buildPassSection()),

          ...this.buildStorageEvidenceSection(),

          // Console Logs (Always attached if failure)
          ...(this.status === 'FAIL' ? this.buildLogsSection() : [])
        ]
      }]
    });

    // Make sure reports directory exists
    const reportsDir = path.resolve('reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Format filename: TestName_Date_Time.docx
    const sanitizedTestName = this.testName.replace(/[^a-zA-Z0-9]/g, '');
    const dateStr = this.startTime.toISOString().split('T')[0];
    const timeStr = this.startTime.toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-');
    const filename = `${sanitizedTestName}_${dateStr}_${timeStr}.docx`;
    const outputPath = path.join(reportsDir, filename);

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  }

  private createCell(text: string, bold = false, fillHex?: string, colorHex?: string): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: sanitizeForDocx(text),
              bold,
              color: colorHex || "2D3748",
              font: "Arial"
            })
          ]
        })
      ],
      shading: fillHex ? { fill: fillHex } : undefined,
    });
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

  private buildStorageEvidenceSection(): (Paragraph | Table)[] {
    const list: (Paragraph | Table)[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 250, after: 100 },
        children: [
          new TextRun({
            text: "Application Storage / IndexedDB Evidence",
            bold: true,
            size: 24,
            color: "1A365D",
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: "DevTools path: Inspect > Application > IndexedDB > OnlineNotepadDB",
            italics: true,
            color: "4A5568",
          })
        ]
      })
    ];

    if (this.storageEvidence.length === 0) {
      list.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "No IndexedDB snapshot was captured for this execution.",
              italics: true,
            })
          ]
        })
      );
      return list;
    }

    for (const snapshot of this.storageEvidence) {
      list.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                this.createCell("Database", true, "E2E8F0"),
                this.createCell(snapshot.databaseName),
                this.createCell("Captured At", true, "E2E8F0"),
                this.createCell(snapshot.capturedAt),
              ]
            })
          ]
        }),
        new Paragraph({ text: "", spacing: { after: 100 } })
      );

      list.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                this.createCell("Object Store", true, "E2E8F0"),
                this.createCell("Key Path", true, "E2E8F0"),
                this.createCell("Indexes", true, "E2E8F0"),
                this.createCell("Records", true, "E2E8F0"),
              ]
            }),
            ...snapshot.stores.map((store) =>
              new TableRow({
                children: [
                  this.createCell(store.storeName),
                  this.createCell(this.stringifyValue(store.keyPath)),
                  this.createCell(store.indexes.length > 0 ? store.indexes.join(", ") : "None"),
                  this.createCell(String(store.recordCount)),
                ]
              })
            )
          ]
        })
      );

      const notesStore = snapshot.stores.find((store) => store.storeName === 'notes');
      if (!notesStore) {
        continue;
      }

      list.push(
        new Paragraph({
          spacing: { before: 150, after: 75 },
          children: [
            new TextRun({
              text: "Object Store: notes",
              bold: true,
              color: "1A365D",
            })
          ]
        })
      );

      if (notesStore.sampleRecords.length === 0) {
        list.push(
          new Paragraph({
            children: [new TextRun({ text: "No note records found.", italics: true })]
          })
        );
        continue;
      }

      const fields = ['unique_id', 'title', 'userID', 'syncStatus', 'lastSyncedAt', 'created_at', 'deleted_at', 'contentLength'];
      list.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: fields.map((field) => this.createCell(field, true, "E2E8F0")),
            }),
            ...notesStore.sampleRecords.map((record) =>
              new TableRow({
                children: fields.map((field) => this.createCell(this.stringifyValue(record[field], 90))),
              })
            )
          ]
        })
      );
    }

    return list;
  }

  private buildPassSection(): (Paragraph | Table)[] {
    const list: (Paragraph | Table)[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "Execution Steps",
            bold: true,
            size: 24,
            color: "1A365D",
          })
        ]
      })
    ];

    // Execution Steps
    this.steps.forEach((step, idx) => {
      list.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true }),
            new TextRun({ text: `${step.description} (${step.timestamp})` })
          ]
        })
      );

      // Embed screenshot if available
      if (step.screenshotPath && fs.existsSync(step.screenshotPath)) {
        try {
          const imgData = fs.readFileSync(step.screenshotPath);
          list.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 150 },
              children: [
                new ImageRun({
                  data: imgData,
                  transformation: {
                    width: 480,
                    height: 270,
                  }
                })
              ]
            })
          );
        } catch (e) {
          list.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[Error loading screenshot: ${(e as Error).message}]`, color: 'E53E3E', italics: true })
              ]
            })
          );
        }
      }
    });

    // Verification Results
    list.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "Verification Results",
            bold: true,
            size: 24,
            color: "1A365D",
          })
        ]
      })
    );

    this.verifications.forEach((ver) => {
      list.push(
        new Paragraph({
          spacing: { before: 50, after: 50 },
          children: [
            new TextRun({ text: "[PASS] ", bold: true, color: "38A169" }),
            new TextRun({ text: `${ver.description} ` }),
            new TextRun({ text: `[${ver.status}]`, bold: true, color: ver.status === 'PASS' ? '38A169' : 'E53E3E' })
          ]
        })
      );
    });

    return list;
  }

  private buildBugSection(): (Paragraph | Table)[] {
    const bug = this.bugDetails || {
      title: "Unexpected Assertion Failure",
      severity: "High",
      expected: "Test assertion to succeed",
      actual: "Test assertion failed",
      recommendation: "Investigate component functionality"
    };

    const list: (Paragraph | Table)[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "BUG DETECTED",
            bold: true,
            size: 26,
            color: "E53E3E",
          })
        ]
      }),

      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            children: [
              this.createCell("Bug Title", true, "FED7D7"),
              this.createCell(bug.title, false),
            ]
          }),
          new TableRow({
            children: [
              this.createCell("Severity", true, "FED7D7"),
              this.createCell(bug.severity, true, undefined, "E53E3E"),
            ]
          }),
          new TableRow({
            children: [
              this.createCell("Expected Result", true, "FED7D7"),
              this.createCell(bug.expected, false),
            ]
          }),
          new TableRow({
            children: [
              this.createCell("Actual Result", true, "FED7D7"),
              this.createCell(bug.actual, false),
            ]
          }),
          new TableRow({
            children: [
              this.createCell("Recommendation", true, "FED7D7"),
              this.createCell(bug.recommendation, false),
            ]
          })
        ]
      }),

      new Paragraph({ text: "", spacing: { after: 200 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: "Reproduction Steps",
            bold: true,
            size: 22,
            color: "1A365D",
          })
        ]
      })
    ];

    // List reproduction steps from steps leading up to failure
    this.steps.forEach((step, idx) => {
      list.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true }),
            new TextRun({ text: step.description })
          ]
        })
      );
    });

    list.push(
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: "Failure Evidence",
            bold: true,
            size: 22,
            color: "1A365D",
          })
        ]
      })
    );

    // Embed the latest screenshot taken (which will represent the fail state)
    const lastStepWithScreenshot = [...this.steps].reverse().find(s => s.screenshotPath);
    if (lastStepWithScreenshot && lastStepWithScreenshot.screenshotPath && fs.existsSync(lastStepWithScreenshot.screenshotPath)) {
      try {
        const imgData = fs.readFileSync(lastStepWithScreenshot.screenshotPath);
        list.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Screenshot at failure point:", bold: true, italics: true })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 150 },
            children: [
              new ImageRun({
                data: imgData,
                transformation: {
                  width: 480,
                  height: 270,
                }
              })
            ]
          })
        );
      } catch (e) {
        list.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[Error loading screenshot: ${(e as Error).message}]`, color: 'E53E3E', italics: true })
            ]
          })
        );
      }
    }

    if (bug.stackTrace) {
      list.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [new TextRun({ text: "Stack Trace:", bold: true, color: "E53E3E" })]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: bug.stackTrace,
              font: "Courier New",
              size: 16,
              color: "4A5568"
            })
          ]
        })
      );
    }

    return list;
  }

  private buildLogsSection(): Paragraph[] {
    const list: Paragraph[] = [
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: "Browser Console Logs",
            bold: true,
            size: 22,
            color: "1A365D",
          })
        ]
      })
    ];

    if (this.consoleLogs.length === 0) {
      list.push(new Paragraph({ children: [new TextRun({ text: "No console logs captured.", italics: true })] }));
    } else {
      this.consoleLogs.forEach(log => {
        list.push(
          new Paragraph({
            children: [
              new TextRun({
                text: log,
                font: "Courier New",
                size: 16,
                color: "2D3748"
              })
            ]
          })
        );
      });
    }

    list.push(
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: "Network Logs",
            bold: true,
            size: 22,
            color: "1A365D",
          })
        ]
      })
    );

    if (this.networkLogs.length === 0) {
      list.push(new Paragraph({ children: [new TextRun({ text: "No network requests logged.", italics: true })] }));
    } else {
      this.networkLogs.forEach(log => {
        list.push(
          new Paragraph({
            children: [
              new TextRun({
                text: log,
                font: "Courier New",
                size: 16,
                color: "2D3748"
              })
            ]
          })
        );
      });
    }

    return list;
  }
}
