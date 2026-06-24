import * as fs from 'fs';
import * as path from 'path';

export const AUTH_DIR = path.resolve('.auth');

export function getAuthStatePath(accountLabel = 'default'): string {
  const safeLabel = accountLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(AUTH_DIR, `${safeLabel}.json`);
}

export function authStateExists(accountLabel = 'default'): boolean {
  return fs.existsSync(getAuthStatePath(accountLabel));
}

export function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}
