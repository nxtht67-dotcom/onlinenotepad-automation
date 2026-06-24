export interface TestCase {
  id: number;
  name: string;
  category: 'guest' | 'sync' | 'ownership' | 'images';
  requiresAuth: 'none' | 'single' | 'double';
  requiresCaptcha: boolean;
  specFile: string;
  testName: string;
  description: string;
}

export const testRegistry: TestCase[] = [
  {
    id: 1,
    name: "Guest Note Persistence",
    category: "guest",
    requiresAuth: "none",
    requiresCaptcha: false,
    specFile: "tests/guest/guest-persistence.spec.ts",
    testName: "Guest Note Persistence",
    description: "Open site as guest, create note, enter content, save, refresh, verify note exists and unique_id unchanged in IndexedDB."
  },
  {
    id: 2,
    name: "Guest Note Assignment After Login",
    category: "guest",
    requiresAuth: "single",
    requiresCaptcha: true,
    specFile: "tests/guest/guest-assignment.spec.ts",
    testName: "Guest Note Assignment After Login",
    description: "Create guest note, login, verify same note exists and userID is assigned in IndexedDB."
  },
  {
    id: 3,
    name: "Ownership Validation",
    category: "ownership",
    requiresAuth: "double",
    requiresCaptcha: true,
    specFile: "tests/ownership/ownership-validation.spec.ts",
    testName: "Ownership Validation",
    description: "Create guest note, login Account A, verify assignment, logout, login Account B, verify Account B cannot access Account A's note."
  },
  {
    id: 4,
    name: "Multiple Guest Notes Assignment",
    category: "guest",
    requiresAuth: "single",
    requiresCaptcha: true,
    specFile: "tests/guest/multiple-guest-assignment.spec.ts",
    testName: "Multiple Guest Notes Assignment",
    description: "Create 3 guest notes, login, verify all 3 are assigned to the user without duplicates."
  },
  {
    id: 5,
    name: "Sync Status Validation",
    category: "sync",
    requiresAuth: "single",   // Sync requires login — local data uploads to server on login
    requiresCaptcha: true,
    specFile: "tests/sync/sync-status.spec.ts",
    testName: "Sync Status Validation",
    description: "Login, create a note, verify syncStatus transitions correctly (0=Unsynced -> 1=Synced) after server upload in IndexedDB."
  },
  {
    id: 6,
    name: "Sync Trigger On Open",
    category: "sync",
    requiresAuth: "single",   // Sync requires login
    requiresCaptcha: true,
    specFile: "tests/sync/sync-trigger-open.spec.ts",
    testName: "Sync Trigger On Open",
    description: "Login, create a note, open it, and monitor network requests to ensure sync API is triggered and timestamps updated."
  },
  {
    id: 7,
    name: "Cross Browser Sync",
    category: "sync",
    requiresAuth: "single",
    requiresCaptcha: true,
    specFile: "tests/sync/cross-browser-sync.spec.ts",
    testName: "Cross Browser Sync",
    description: "Login A in context 1, create and sync note. Login A in context 2, verify synced notes appear consistently."
  },
  {
    id: 8,
    name: "Placeholder Notes",
    category: "sync",
    requiresAuth: "single",
    requiresCaptcha: true,
    specFile: "tests/sync/placeholder-notes.spec.ts",
    testName: "Placeholder Notes",
    description: "Login, verify that note metadata is visible in the sidebar, but note content is absent until selected (lazy-loaded from server)."
  },
  {
    id: 9,
    name: "Lazy Loading Validation",
    category: "sync",
    requiresAuth: "single",
    requiresCaptcha: true,
    specFile: "tests/sync/lazy-loading.spec.ts",
    testName: "Lazy Loading Validation",
    description: "Login, open a placeholder note and verify that the content is fetched only after opening, triggering network requests."
  },
  {
    id: 10,
    name: "Local Image Upload",
    category: "images",
    requiresAuth: "none",
    requiresCaptcha: false,
    specFile: "tests/images/local-image-upload.spec.ts",
    testName: "Local Image Upload",
    description: "Upload a local image in the editor, save, sync, and verify it renders correctly in the DOM."
  },
  {
    id: 11,
    name: "Third Party Image Validation",
    category: "images",
    requiresAuth: "none",
    requiresCaptcha: false,
    specFile: "tests/images/third-party-image.spec.ts",
    testName: "Third Party Image Validation",
    description: "Insert an external image URL in the editor, check rendering, and verify no upload API requests are fired."
  },
  {
    id: 12,
    name: "Delete Note Validation",
    category: "sync",
    requiresAuth: "single",   // Delete synced note requires login
    requiresCaptcha: true,
    specFile: "tests/sync/delete-note.spec.ts",
    testName: "Delete Note Validation",
    description: "Login, create note, allow it to sync to server, delete it, verify IndexedDB record removed and delete API executed."
  },
  {
    id: 13,
    name: "Account Switching",
    category: "ownership",
    requiresAuth: "double",
    requiresCaptcha: true,
    specFile: "tests/ownership/account-switching.spec.ts",
    testName: "Account Switching",
    description: "Login Account A, create a note, logout, login Account B, and verify Account A's notes are not visible."
  },
  {
    id: 14,
    name: "Offline Mode",
    category: "sync",
    requiresAuth: "single",   // Sync on reconnect requires login
    requiresCaptcha: true,
    specFile: "tests/sync/offline-mode.spec.ts",
    testName: "Offline Mode",
    description: "Login, disable internet connection, create/edit notes, re-enable internet, verify data preserved and synced to server."
  },
  {
    id: 15,
    name: "Multi Tab Validation",
    category: "sync",
    requiresAuth: "single",   // Server sync consistency across tabs requires login
    requiresCaptcha: true,
    specFile: "tests/sync/multi-tab.spec.ts",
    testName: "Multi Tab Validation",
    description: "Login, open 2 tabs, edit note in tab 1, open note in tab 2, verify sync consistency from server across both tabs."
  },
  {
    id: 16,
    name: "Browser Refresh During Sync",
    category: "sync",
    requiresAuth: "single",   // Sync to server requires login
    requiresCaptcha: true,
    specFile: "tests/sync/browser-refresh-sync.spec.ts",
    testName: "Browser Refresh During Sync",
    description: "Login, trigger a sync to server and immediately refresh the browser, verifying no data loss or duplicate records."
  },
  {
    id: 17,
    name: "Rapid Note Switching",
    category: "sync",
    requiresAuth: "single",   // Requires login for server sync requests to be observable
    requiresCaptcha: true,
    specFile: "tests/sync/rapid-note-switching.spec.ts",
    testName: "Rapid Note Switching",
    description: "Login, create multiple notes and switch rapidly, verifying correct content and that previous sync requests are cancelled."
  },
  {
    id: 18,
    name: "Rapid Switching While Editing",
    category: "sync",
    requiresAuth: "single",   // Requires login for real sync behaviour
    requiresCaptcha: true,
    specFile: "tests/sync/rapid-switching-editing.spec.ts",
    testName: "Rapid Switching While Editing",
    description: "Login, edit Note A, switch immediately to Note B, verify that the draft is preserved without content crossover."
  },
  {
    id: 19,
    name: "Large Note Validation",
    category: "sync",
    requiresAuth: "single",   // Upload limits enforced server-side
    requiresCaptcha: true,
    specFile: "tests/sync/large-note.spec.ts",
    testName: "Large Note Validation",
    description: "Login, test note contents of sizes 500KB, 900KB, 1MB, and 1.1MB, verifying server-side size limits and error messages."
  }
];
