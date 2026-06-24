import { expect, Page } from '@playwright/test';
import { BasePage } from './BasePage.ts';

const DEFAULT_CAPTCHA_TIMEOUT_MS = 5 * 60 * 1000;
const TURNSTILE_RESPONSE_INPUT = 'input[name="cf-turnstile-response"]';

export class LoginPage extends BasePage {
  private emailInput = 'input#auth-email';
  private passwordInput = 'input#auth-password';
  private loginSubmitBtn = 'button#auth-login-submit';
  private createNoteButton = 'button.create__new__note';
  private signInLink = 'a#loginBtn';
  private errorMessage = '.auth-error-msg';

  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string, captchaTimeoutMs = DEFAULT_CAPTCHA_TIMEOUT_MS) {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);

    console.log('\n>>> Cloudflare verification required.');
    console.log('>>> 1) Complete the Cloudflare checkbox on the login page.');
    console.log('>>> 2) Wait until verification succeeds (no "Verification failed" message).');
    console.log('>>> 3) Click "Sign In" yourself, OR let the test click it after verification passes.');
    console.log('>>> The test waits up to 5 minutes.\n');

    const turnstilePresent = await this.page.locator(TURNSTILE_RESPONSE_INPUT).count() > 0;

    if (turnstilePresent) {
      await this.waitForTurnstileToken(captchaTimeoutMs);
      const submitDisabled = await this.page.locator(this.loginSubmitBtn).isDisabled().catch(() => false);
      if (!submitDisabled) {
        await this.click(this.loginSubmitBtn);
      }
    } else {
      console.log('>>> No Cloudflare widget detected. Click Sign In manually if needed.\n');
    }

    await this.waitForLoginSuccess(captchaTimeoutMs);
  }

  private async waitForTurnstileToken(timeoutMs: number) {
    await expect
      .poll(
        async () => {
          const token = await this.page.locator(TURNSTILE_RESPONSE_INPUT).inputValue().catch(() => '');
          return token.trim().length > 0;
        },
        {
          timeout: timeoutMs,
          intervals: [1000, 2000, 3000],
          message:
            'Cloudflare verification did not complete. Complete the checkbox, click Troubleshoot if needed, then retry.',
        }
      )
      .toBe(true);
  }

  async waitForLoginSuccess(timeoutMs: number) {
    await expect
      .poll(
        async () => this.isLoggedIn(),
        {
          timeout: timeoutMs,
          intervals: [1000, 2000, 3000],
          message: 'Timed out waiting for login. Complete Cloudflare verification and sign in.',
        }
      )
      .toBe(true);
  }

  private async isLoggedIn(): Promise<boolean> {
    const createNoteVisible = await this.page.locator(this.createNoteButton).isVisible().catch(() => false);
    if (!createNoteVisible) {
      return false;
    }

    const onLoginPage = this.page.url().includes('/login');
    const authFormVisible = await this.page.locator(this.emailInput).isVisible().catch(() => false);
    const signInVisible = await this.page.locator(this.signInLink).isVisible().catch(() => false);

    if (!onLoginPage && !authFormVisible) {
      return true;
    }

    return !authFormVisible && !signInVisible;
  }

  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.errorMessage)) {
      return await this.getText(this.errorMessage);
    }
    return '';
  }
}
