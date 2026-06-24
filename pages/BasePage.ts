import { Page, Locator } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(url: string) {
    await this.page.goto(url);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async waitForSelector(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  async click(selector: string | Locator) {
    if (typeof selector === 'string') {
      await this.page.click(selector);
    } else {
      await selector.click();
    }
  }

  async fill(selector: string | Locator, text: string) {
    if (typeof selector === 'string') {
      await this.page.fill(selector, text);
    } else {
      await selector.fill(text);
    }
  }

  async getText(selector: string | Locator): Promise<string> {
    if (typeof selector === 'string') {
      return (await this.page.textContent(selector)) || '';
    } else {
      return (await selector.textContent()) || '';
    }
  }

  async isVisible(selector: string | Locator): Promise<boolean> {
    if (typeof selector === 'string') {
      return await this.page.isVisible(selector);
    } else {
      return await selector.isVisible();
    }
  }
}
