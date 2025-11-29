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
