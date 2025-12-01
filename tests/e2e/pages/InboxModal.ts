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

  // Additional methods for persistence testing

  async waitForVisible() {
    await this.modal.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getUnreadCount(): Promise<number> {
    try {
      const badgeText = await this.unreadBadge.textContent();
      if (badgeText) {
        const match = badgeText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async getFirstMessage(): Promise<{ text: string; timestamp: string } | null> {
    try {
      const firstMessage = this.page.locator('[data-testid="inbox-message"], [class*="message"]').first();
      if (await firstMessage.isVisible()) {
        const text = await firstMessage.textContent() || '';
        const timestamp = await firstMessage.getAttribute('data-timestamp') || new Date().toISOString();
        return { text, timestamp };
      }
      return null;
    } catch {
      return null;
    }
  }

  async selectFirstMessage() {
    const firstMessage = this.page.locator('[data-testid="inbox-message"], [class*="message"]').first();
    if (await firstMessage.isVisible()) {
      await firstMessage.click();
      await this.page.waitForTimeout(1000); // Allow time for mark as read
    }
  }

  async getMessageOrder(): Promise<Array<{ text: string; timestamp: string }>> {
    const messages: Array<{ text: string; timestamp: string }> = [];
    const messageElements = this.page.locator('[data-testid="inbox-message"], [class*="message"]');
    const count = await messageElements.count();
    
    for (let i = 0; i < count; i++) {
      const message = messageElements.nth(i);
      const text = await message.textContent() || '';
      const timestamp = await message.getAttribute('data-timestamp') || new Date().toISOString();
      messages.push({ text, timestamp });
    }
    
    return messages;
  }
}
