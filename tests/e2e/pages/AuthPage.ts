import type { Page, Locator } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly loginTab: Locator;
  readonly signUpTab: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly appleSignInButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginTab = page.locator('button:has-text("Login")');
    this.signUpTab = page.locator('button:has-text("Sign Up")');
    this.nameInput = page.locator('input[placeholder="First Name"]');
    this.emailInput = page.locator('input[placeholder="Email Address"]');
    this.passwordInput = page.locator('input[placeholder="Password"]');
    this.submitButton = page.locator('button:has-text("Enter PrayerMap"), button:has-text("Join PrayerMap")').first();
    this.appleSignInButton = page.locator('button:has-text("Sign in with Apple")');
    this.errorMessage = page.locator('text=/error|invalid|incorrect/i');
    this.successMessage = page.locator('text=/success|check your email/i');
  }

  async goto() {
    await this.page.goto('/');
  }

  async switchToLogin() {
    await this.loginTab.click();
    await this.page.waitForTimeout(300);
  }

  async switchToSignUp() {
    await this.signUpTab.click();
    await this.page.waitForTimeout(300);
  }

  async login(email: string, password: string) {
    await this.switchToLogin();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async signUp(name: string, email: string, password: string) {
    await this.switchToSignUp();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async signInWithApple() {
    await this.appleSignInButton.click();
    await this.page.waitForTimeout(1000);
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  async hasSuccess(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }
}
