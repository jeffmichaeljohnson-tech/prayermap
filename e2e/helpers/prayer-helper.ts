import type { Page } from '@playwright/test';

export interface PrayerData {
  title: string;
  content: string;
  isAnonymous?: boolean;
  category?: string;
}

export class PrayerHelper {
  constructor(private page: Page) {}

  async createPrayer(data: PrayerData) {
    // Open prayer creation modal/form
    await this.page.click('[data-testid="create-prayer-button"]');
    
    // Fill out prayer form
    await this.page.fill('[data-testid="prayer-title-input"]', data.title);
    await this.page.fill('[data-testid="prayer-content-input"]', data.content);
    
    // Set anonymity if specified
    if (data.isAnonymous !== undefined) {
      const anonymousToggle = this.page.locator('[data-testid="anonymous-toggle"]');
      const isCurrentlyAnonymous = await anonymousToggle.isChecked();
      if (isCurrentlyAnonymous !== data.isAnonymous) {
        await anonymousToggle.click();
      }
    }
    
    // Select category if specified
    if (data.category) {
      await this.page.selectOption('[data-testid="prayer-category-select"]', data.category);
    }
    
    // Submit prayer
    await this.page.click('[data-testid="submit-prayer-button"]');
    
    // Wait for prayer to be created and visible
    await this.page.waitForSelector(`text=${data.content}`, { timeout: 10000 });
  }

  async respondToPrayer(prayerId: string, response: string) {
    // Find and click on the specific prayer
    await this.page.click(`[data-prayer-id="${prayerId}"]`);
    
    // Fill response
    await this.page.fill('[data-testid="prayer-response-input"]', response);
    
    // Submit response
    await this.page.click('[data-testid="send-prayer-response"]');
    
    // Wait for response to be visible
    await this.page.waitForSelector(`text=${response}`, { timeout: 10000 });
  }

  async getPrayerIds(): Promise<string[]> {
    return await this.page.$$eval('[data-prayer-id]', elements => 
      elements.map(el => el.getAttribute('data-prayer-id')).filter(Boolean) as string[]
    );
  }

  async markPrayerAsRead(prayerId: string) {
    await this.page.click(`[data-prayer-id="${prayerId}"]`);
    
    const markReadButton = this.page.locator('[data-testid="mark-as-read"]');
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
    }
  }

  async getUnreadCount(): Promise<number> {
    const countElement = this.page.locator('[data-testid="inbox-unread-count"]');
    if (await countElement.isVisible()) {
      const text = await countElement.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  async waitForPrayerToAppear(content: string, timeout = 10000) {
    await this.page.waitForSelector(`text=${content}`, { timeout });
  }

  async waitForResponseToAppear(response: string, timeout = 10000) {
    await this.page.waitForSelector(`text=${response}`, { timeout });
  }
}