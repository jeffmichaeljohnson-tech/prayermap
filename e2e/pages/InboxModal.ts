import type { Page, Locator } from '@playwright/test';

export class InboxModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly messageList: Locator;
  readonly unreadBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="inbox-modal"], text=/inbox|messages/i').first();
    this.closeButton = page.locator('[data-testid="close-inbox"], button:has-text("Close")').first();
    this.messageList = page.locator('[data-testid="response-list"], [class*="response"]');
    this.unreadBadge = page.locator('[data-testid="unread-badge"], [class*="badge"]');
  }

  async isVisible(): Promise<boolean> {
    return await this.modal.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async close() {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(300);
  }

  async getMessageCount(): Promise<number> {
    const messages = this.page.locator('[data-testid="inbox-message"], [class*="message"]');
    return await messages.count();
  }

  async clickMessage(index: number = 0) {
    const message = this.page.locator('[data-testid="inbox-message"], [class*="message"]').nth(index);
    if (await message.isVisible()) {
      await message.click();
      await this.page.waitForTimeout(500);
    }
  }

  async hasUnreadBadge(): Promise<boolean> {
    return await this.unreadBadge.isVisible().catch(() => false);
  }
}
