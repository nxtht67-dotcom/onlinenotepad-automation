import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.ts';

export class HomePage extends BasePage {
  // Selectors
  private newNoteBtn = 'button.create__new__note';
  private noteTitleInput = 'input#doc__title';
  private editorContent = '.ContentEditable__root[role="textbox"]';
  
  // Account Menu
  private accountDropdownToggle = 'button.custom__dropdown__toggle__btn';
  private signInLink = 'a#loginBtn';
  private signOutBtn = '.custom__dropdown__menu__item.logout, button:has-text("Logout"), button:has-text("Sign out")';
  
  // Sidebar
  private sidebarNotesSelector = 'a.sidebar-notes';
  private activeSidebarNoteSelector = 'a.sidebar-notes.active';
  private sidebarNoteIndexByTitle = new Map<string, number>();

  // Deletion Modal
  private confirmDeleteBtn = 'button.confirm-btn, .dynamic-modal-footer-btns.confirm-btn';
  private cancelDeleteBtn = 'button.cancel-btn, .dynamic-modal-footer-btns.cancel-btn';

  // Toolbar & Image Insertion
  private insertDropdownBtn = 'button[aria-label="Insert specialized editor node"]';
  private imageOptionBtn = 'button.item[title="Image"]';
  
  // Image Modal
  private fileTabBtn = 'button.Button__root:has-text("File")';
  private urlTabBtn = 'button.Button__root:has-text("URL")';
  private imageModalUrlInput = 'input#image-modal-url-input';
  private imageModalAltInput = 'input#image-modal-alt-text-input';
  private fileInputSelector = 'input.Input__input[type="file"], input.Input__input:not([id])';
  private confirmInsertBtn = 'button.Button__root:has-text("Confirm")';
  
  // Save status / sync status indicators
  private syncStatusIndicator = '.sync-status-indicator'; // adjust if needed

  constructor(page: Page) {
    super(page);
  }

  async createNewNote() {
    await this.click(this.newNoteBtn);
    await this.page.waitForTimeout(1000); // Wait for note to initialize
  }

  async setNoteTitle(title: string) {
    await this.fill(this.noteTitleInput, title);
    // Press tab or enter to trigger blur/change events to ensure it writes to IndexedDB
    await this.page.locator(this.noteTitleInput).press('Tab');
    await this.page.waitForTimeout(500);
  }

  async getNoteTitle(): Promise<string> {
    return await this.page.inputValue(this.noteTitleInput);
  }

  async setNoteContent(content: string, options?: { bulk?: boolean }) {
    const useBulk = options?.bulk ?? content.length > 1000;

    await this.click(this.editorContent);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');

    if (useBulk) {
      await this.insertBulkEditorContent(content);
    } else {
      await this.page.keyboard.type(content, { delay: 0 });
    }

    await this.page.waitForTimeout(useBulk ? 1000 : 500);
  }

  private async insertBulkEditorContent(content: string) {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    try {
      await this.page.evaluate(async (text) => {
        await navigator.clipboard.writeText(text);
      }, content);
      await this.page.keyboard.press('Control+V');
      await this.page.waitForTimeout(500);

      const insertedLength = (await this.getNoteContent()).length;
      if (insertedLength < Math.min(content.length, 50)) {
        throw new Error('Clipboard paste did not populate the editor');
      }
      return;
    } catch {
      const chunkSize = 100_000;
      for (let offset = 0; offset < content.length; offset += chunkSize) {
        await this.page.keyboard.insertText(content.slice(offset, offset + chunkSize));
      }
    }
  }

  async getNoteContent(): Promise<string> {
    return await this.getText(this.editorContent);
  }

  async openAccountMenu() {
    await this.click(this.accountDropdownToggle);
  }

  async clickSignIn() {
    await this.openAccountMenu();
    await this.click(this.signInLink);
  }

  async clickLogout() {
    await this.openAccountMenu();
    await this.click(this.signOutBtn);
    await this.page.waitForTimeout(1000);
  }

  async getSidebarNotes(): Promise<{ title: string; uniqueId: string }[]> {
    const list = this.page.locator(this.sidebarNotesSelector);
    const count = await list.count();
    const notes: { title: string; uniqueId: string }[] = [];
    
    for (let i = 0; i < count; i++) {
      const el = list.nth(i);
      const titleText = await el.locator('span').first().textContent() || '';
      const href = await el.getAttribute('href') || '';
      // Href usually contains something like '/note/uuid' or has unique_id stored elsewhere
      const uniqueId = href.split('/').pop() || '';
      notes.push({ title: titleText.trim(), uniqueId });
    }
    return notes;
  }

  async refreshSidebarNoteIndex() {
    this.sidebarNoteIndexByTitle.clear();
    const notes = await this.getSidebarNotes();
    notes.forEach((note, index) => {
      this.sidebarNoteIndexByTitle.set(note.title, index);
    });
  }

  private async resolveSidebarNoteIndex(title: string): Promise<number> {
    let index = this.sidebarNoteIndexByTitle.get(title);
    if (index !== undefined) {
      return index;
    }

    const notes = await this.getSidebarNotes();
    index = notes.findIndex((note) => note.title === title);
    if (index === -1) {
      throw new Error(`Note with title "${title}" not found in sidebar`);
    }

    this.sidebarNoteIndexByTitle.set(title, index);
    return index;
  }

  async selectNoteByTitle(title: string, options?: { fast?: boolean; waitMs?: number }) {
    const index = await this.resolveSidebarNoteIndex(title);
    const noteLink = this.page.locator(this.sidebarNotesSelector).nth(index);

    if (options?.fast) {
      await noteLink.click({ noWaitAfter: true });
      return;
    }

    await noteLink.click();
    await this.page.waitForTimeout(options?.waitMs ?? 1000);
  }

  async selectNotesRapidly(titles: string[]) {
    await this.refreshSidebarNoteIndex();

    for (const title of titles) {
      const index = this.sidebarNoteIndexByTitle.get(title);
      if (index === undefined) {
        throw new Error(`Note with title "${title}" not found in sidebar`);
      }
      await this.page.locator(this.sidebarNotesSelector).nth(index).click({ noWaitAfter: true });
    }
  }

  async deleteNoteInline(title: string) {
    const notes = await this.getSidebarNotes();
    const index = notes.findIndex(n => n.title === title);
    if (index === -1) {
      throw new Error(`Note with title "${title}" not found in sidebar for deletion`);
    }
    
    const noteEl = this.page.locator(this.sidebarNotesSelector).nth(index);
    // Hover over the note to reveal the delete button
    await noteEl.hover();
    
    // Locate the delete button inside it
    const deleteBtn = noteEl.locator('button.deleteBtn');
    await deleteBtn.click();
    
    // Confirm deletion in modal
    await this.click(this.confirmDeleteBtn);
    await this.page.waitForTimeout(1000);
  }

  async openInsertDropdown() {
    await this.click(this.insertDropdownBtn);
  }

  async clickImageOption() {
    await this.click(this.imageOptionBtn);
  }

  async insertExternalImage(url: string, altText = '') {
    await this.openInsertDropdown();
    await this.clickImageOption();
    
    // Select URL Tab
    await this.click(this.urlTabBtn);
    
    // Fill URL and Alt Text
    await this.fill(this.imageModalUrlInput, url);
    if (altText) {
      await this.fill(this.imageModalAltInput, altText);
    }
    
    // Confirm
    await this.click(this.confirmInsertBtn);
    await this.page.waitForTimeout(1000);
  }

  async uploadLocalImage(filePath: string, altText = '') {
    await this.openInsertDropdown();
    await this.clickImageOption();
    
    // Select File Tab
    await this.click(this.fileTabBtn);
    
    // Upload File
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.locator(this.fileInputSelector).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    
    if (altText) {
      await this.fill(this.imageModalAltInput, altText);
    }
    
    // Confirm
    await this.click(this.confirmInsertBtn);
    await this.page.waitForTimeout(1000);
  }
}
