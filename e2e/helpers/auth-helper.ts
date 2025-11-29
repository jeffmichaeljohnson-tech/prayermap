import type { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async signInWithEmail(email: string, password: string) {
    // Navigate to sign in page
    await this.page.click('[data-testid="sign-in-button"]');
    
    // Fill in email and password
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    // Submit form
    await this.page.click('[data-testid="submit-auth-form"]');
    
    // Wait for successful authentication
    await this.page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });
  }

  async signOut() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="sign-out-button"]');
    await this.page.waitForSelector('[data-testid="sign-in-button"]');
  }

  async createAccount(email: string, password: string, displayName?: string) {
    await this.page.click('[data-testid="sign-up-button"]');
    
    if (displayName) {
      await this.page.fill('[data-testid="display-name-input"]', displayName);
    }
    
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    await this.page.click('[data-testid="submit-auth-form"]');
    await this.page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });
  }

  async isSignedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-avatar"]', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}