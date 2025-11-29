import type { Page, Locator } from '@playwright/test';

export class PrayerRequestModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly textTypeButton: Locator;
  readonly audioTypeButton: Locator;
  readonly videoTypeButton: Locator;
  readonly titleInput: Locator;
  readonly contentTextarea: Locator;
  readonly anonymousSwitch: Locator;
  readonly submitButton: Locator;
  readonly recordButton: Locator;
  readonly stopButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('text=Request Prayer, text=Add Prayer').first();
    this.closeButton = page.locator('[data-testid="close-modal"], button:has-text("Close")').first();
    this.textTypeButton = page.locator('[data-testid="text-type-button"], button:has-text("Text")').first();
    this.audioTypeButton = page.locator('[data-testid="audio-type-button"], button:has-text("Audio")').first();
    this.videoTypeButton = page.locator('[data-testid="video-type-button"], button:has-text("Video")').first();
    this.titleInput = page.locator('[data-testid="prayer-title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    this.contentTextarea = page.locator('[data-testid="prayer-content"], textarea[placeholder*="prayer"], textarea[placeholder*="heart"]').first();
    this.anonymousSwitch = page.locator('[data-testid="anonymous-switch"], text=anonymous >> .. >> button').first();
    this.submitButton = page.locator('button:has-text("Add to Map"), button:has-text("Submit"), [data-testid="submit-prayer"]').first();
    this.recordButton = page.locator('[data-testid="record-button"], button:has-text("Record")').first();
    this.stopButton = page.locator('[data-testid="stop-button"], button:has-text("Stop")').first();
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

  async selectTextType() {
    await this.textTypeButton.click();
    await this.page.waitForTimeout(300);
  }

  async selectAudioType() {
    await this.audioTypeButton.click();
    await this.page.waitForTimeout(300);
  }

  async selectVideoType() {
    await this.videoTypeButton.click();
    await this.page.waitForTimeout(300);
  }

  async submitTextPrayer(title: string, content: string, anonymous: boolean = false) {
    await this.selectTextType();

    if (await this.titleInput.isVisible()) {
      await this.titleInput.fill(title);
    }

    await this.contentTextarea.fill(content);

    if (anonymous && await this.anonymousSwitch.isVisible()) {
      await this.anonymousSwitch.click();
    }

    await this.submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async recordAudio(durationMs: number = 2000) {
    await this.selectAudioType();

    if (await this.recordButton.isVisible()) {
      await this.recordButton.click();
      await this.page.waitForTimeout(durationMs);

      if (await this.stopButton.isVisible()) {
        await this.stopButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async submitAudioPrayer(durationMs: number = 2000, title: string = '') {
    await this.recordAudio(durationMs);

    if (title && await this.titleInput.isVisible()) {
      await this.titleInput.fill(title);
    }

    await this.submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
