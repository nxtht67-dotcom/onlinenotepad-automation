import { Page, Request, Response } from '@playwright/test';

export interface NetworkLog {
  method: string;
  url: string;
  status?: number;
  timestamp: string;
  requestBody?: string;
  responseBody?: string;
}

export class NetworkHelper {
  private logs: NetworkLog[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start capturing all network requests/responses on the page.
   */
  startCapture() {
    this.logs = [];

    this.page.on('request', (request: Request) => {
      this.logs.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString(),
        requestBody: request.postData() || undefined,
      });
    });

    this.page.on('response', (response: Response) => {
      const matchIdx = this.logs.findIndex(
        (l) => l.url === response.url() && !l.status
      );
      if (matchIdx !== -1) {
        this.logs[matchIdx].status = response.status();
      }
    });
  }

  /**
   * Return all captured network logs.
   */
  getLogs(): NetworkLog[] {
    return [...this.logs];
  }

  /**
   * Return logs matching a URL substring.
   */
  getLogsByUrl(urlSubstring: string): NetworkLog[] {
    return this.logs.filter((l) => l.url.includes(urlSubstring));
  }

  /**
   * Return formatted log strings for report embedding.
   */
  getFormattedLogs(): string[] {
    return this.logs.map(
      (l) =>
        `[${l.timestamp}] ${l.method} ${l.url} -> ${l.status ?? 'pending'}`
    );
  }

  /**
   * Wait for a request matching URL substring, with timeout.
   */
  async waitForRequest(
    urlSubstring: string,
    timeout = 15000
  ): Promise<Request> {
    return await this.page.waitForRequest(
      (req) => req.url().includes(urlSubstring),
      { timeout }
    );
  }

  /**
   * Wait for a response matching URL substring, with timeout.
   */
  async waitForResponse(
    urlSubstring: string,
    timeout = 15000
  ): Promise<Response> {
    return await this.page.waitForResponse(
      (res) => res.url().includes(urlSubstring),
      { timeout }
    );
  }

  /**
   * Check if any request matching the URL was fired.
   */
  hasRequestTo(urlSubstring: string): boolean {
    return this.logs.some((l) => l.url.includes(urlSubstring));
  }

  /**
   * Clear all stored logs.
   */
  clearLogs() {
    this.logs = [];
  }
}
