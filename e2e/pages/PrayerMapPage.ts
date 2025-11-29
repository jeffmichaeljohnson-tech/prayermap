import type { Page, Locator } from '@playwright/test';

export class PrayerMapPage {
  readonly page: Page;
  readonly mapCanvas: Locator;
  readonly requestPrayerButton: Locator;
  readonly inboxButton: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mapCanvas = page.locator('.mapboxgl-canvas, canvas').first();
    this.requestPrayerButton = page.locator(
      'button:has-text("Request Prayer"), button:has-text("Add Prayer"), [data-testid="request-prayer-button"]'
    ).first();
    this.inboxButton = page.locator(
      '[data-testid="inbox-button"], button:has-text("Inbox")'
    ).first();
    this.settingsButton = page.locator(
      '[data-testid="settings-button"], button:has-text("Settings")'
    ).first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForTimeout(5000); // Wait for map to load
  }

  async waitForMapLoad() {
    await this.mapCanvas.waitFor({ state: 'visible', timeout: 15000 });
  }

  async openPrayerRequestModal() {
    await this.requestPrayerButton.click();
    await this.page.waitForTimeout(500);
  }

  async openInbox() {
    if (await this.inboxButton.isVisible()) {
      await this.inboxButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async openSettings() {
    if (await this.settingsButton.isVisible()) {
      await this.settingsButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  // Methods for persistence testing

  async authenticateAsTestUser() {
    // Look for authentication button
    const authButton = this.page.locator('[data-testid="auth-button"], button:has-text("Sign In"), [data-testid="hamburger-menu"]').first();
    
    if (await authButton.isVisible()) {
      await authButton.click();
      await this.page.waitForTimeout(1000);
      
      // Look for email input and fill with test credentials
      const emailInput = this.page.locator('input[type="email"], input[placeholder*="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@prayermap.net');
        
        const passwordInput = this.page.locator('input[type="password"], input[placeholder*="password"]').first();
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('testpassword123');
          
          const submitButton = this.page.locator('button[type="submit"], button:has-text("Sign In")').first();
          await submitButton.click();
          await this.page.waitForTimeout(3000);
        }
      }
    }
    
    // Wait for authentication to complete
    await this.waitForAuthComplete();
  }

  async waitForAuthComplete() {
    // Wait for either the inbox button or another authenticated element
    await Promise.race([
      this.inboxButton.waitFor({ state: 'visible', timeout: 10000 }),
      this.page.locator('[data-testid="user-menu"], [data-testid="authenticated"]').waitFor({ state: 'visible', timeout: 10000 })
    ]);
  }

  async waitForAuthRestore() {
    // Wait for authentication to restore from localStorage after refresh
    await this.page.waitForTimeout(2000);
    await this.waitForAuthComplete();
  }

  async submitPrayer({ title, content }: { title: string; content: string }) {
    await this.openPrayerRequestModal();
    
    // Fill prayer form
    const titleInput = this.page.locator('input[placeholder*="title"], textarea[placeholder*="title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill(title);
    }
    
    const contentInput = this.page.locator('textarea[placeholder*="content"], textarea[placeholder*="prayer"]').first();
    if (await contentInput.isVisible()) {
      await contentInput.fill(content);
    }
    
    // Submit the prayer
    const submitButton = this.page.locator('button:has-text("Submit"), button:has-text("Post")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async clickPrayerMarker(index: number = 0) {
    const marker = this.page.locator('[data-testid="prayer-marker"], .mapboxgl-marker').nth(index);
    if (await marker.isVisible()) {
      await marker.click();
      await this.page.waitForTimeout(500);
    }
  }

  async panMap(deltaX: number, deltaY: number) {
    const box = await this.mapCanvas.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      await this.page.mouse.move(startX + deltaX, startY + deltaY);
      await this.page.mouse.up();

      await this.page.waitForTimeout(300);
    }
  }

  async zoomIn() {
    const zoomInButton = this.page.locator('.mapboxgl-ctrl-zoom-in, button:has-text("+")').first();
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  async zoomOut() {
    const zoomOutButton = this.page.locator('.mapboxgl-ctrl-zoom-out, button:has-text("-")').first();
    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  async getMarkerCount() {
    const markers = this.page.locator('[data-testid="prayer-marker"], .mapboxgl-marker');
    return await markers.count();
  }
}
