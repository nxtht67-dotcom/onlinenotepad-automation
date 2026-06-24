# 🗒️ OnlineNotepad QA Automation Suite

Automated black-box test runner for [`staging.onlinenotepad.io`](https://staging.onlinenotepad.io) — executes 19 test scenarios, captures evidence on failure, and generates Word/PDF reports.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 Automated Regression | Runs 19 complex scenarios hands-free in a real browser |
| 🌐 Cross-Browser | Supports Chrome, Firefox, and Edge |
| 📸 Evidence Capture | Screenshots, console logs, and network activity on failure |
| 📄 Report Generation | Outputs styled `.docx` and/or `.pdf` execution reports |

---

## ⚙️ Setup (First Time Only)

Requires **Node.js** installed on your machine.

```powershell
npm install
npx playwright install
```

---

## ▶️ Running Tests

```powershell
npm run test-cli
```

The CLI will walk you through 4 steps:

1. **Select Browser** — Chrome, Firefox, or Edge
2. **Select Test Case** — Pick from 19 scenarios
3. **Select Report Format** — Word, PDF, or Both
4. **Enter Login Credentials** *(only if the selected test requires a logged-in account)*

> ⚠️ **CAPTCHA Notice:** Login tests may trigger a CAPTCHA. Keep an eye on the browser window — you may need to solve it manually before the test can proceed.

The browser window will open and run automatically. **Do not close it mid-test.**

---

## 🧪 Test Cases

### Category A — Guest User
| # | Name | Description |
|---|---|---|
| 1 | Guest Note Persistence | Note survives a page refresh without an account |
| 10 | Local Image Upload | Upload a local image into the editor and verify it renders |
| 11 | Third-Party Image | Insert a remote image URL and confirm it loads correctly |

### Category B — Registration & Login
| # | Name | Description |
|---|---|---|
| 2 | Guest Note Assignment After Login | Guest note auto-migrates to account on sign-in |
| 4 | Multiple Guest Notes Assignment | All 3 guest notes transfer to the account after login |
| 13 | Account Switching | User A's notes are not visible after switching to User B |

### Category C — Security & Ownership
| # | Name | Description |
|---|---|---|
| 3 | Ownership Validation | Account B cannot access notes assigned to Account A |

### Category D — Sync & Advanced Behaviors
| # | Name | Description |
|---|---|---|
| 5 | Sync Status Validation | Note transitions from `unsynced` → `synced` after save |
| 6 | Sync Trigger On Open | Opening a note refreshes sync status and timestamps |
| 7 | Cross-Browser Sync | Notes synced in Session A appear instantly in Session B |
| 8 | Placeholder Notes | Sidebar shows titles immediately; body lazy-loads on select |
| 9 | Lazy Loading Validation | Clicking a placeholder fires the correct server fetch request |
| 12 | Delete Note Validation | Deleted note is removed from sidebar and backend database |
| 14 | Offline Mode | Note created offline auto-syncs once connection is restored |
| 15 | Multi-Tab Validation | Edits in Tab A reflect in Tab B without data loss |
| 16 | Browser Refresh During Sync | Refreshing mid-sync creates no duplicates or corruption |
| 17 | Rapid Note Switching | Rapidly switching notes always loads the correct content |
| 18 | Rapid Switching While Editing | Draft content is preserved when switching away mid-edit |
| 19 | Large Note Validation | Tests 500 KB, 900 KB, 1 MB, 1.1 MB — validates size warnings |

---

## 📊 Reading Reports

Reports are saved to the `reports/` folder after each run.

| Section | What It Shows |
|---|---|
| **Summary** | Test name, status (PASS / FAIL), date, browser, duration |
| **Reproduction Steps** | Every action taken with timestamps and screenshots |
| **Database Snapshots** | IndexedDB structure at time of test for local storage verification |
| **Bug Ticket** *(on failure)* | Expected vs. actual result, failure screenshot, console errors, network logs |
