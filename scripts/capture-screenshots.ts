import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * High-Resolution Screenshot Capture Script for PrayerMap
 * 
 * Captures all screens at 2x retina resolution (2880x1800)
 * Viewport: 1440x900 with devicePixelRatio: 2.0
 */

const BASE_URL = process.env.VITE_BASE_URL || 'http://localhost:5173';
const EXPORT_DIR = path.join(process.env.HOME || process.cwd(), 'Downloads', 'prayermap-exports');
const SCREENS_DIR = path.join(EXPORT_DIR, 'screens');
const COMPONENTS_DIR = path.join(EXPORT_DIR, 'components');
const ANIMATIONS_DIR = path.join(EXPORT_DIR, 'animations');

// Ensure directories exist
[EXPORT_DIR, SCREENS_DIR, COMPONENTS_DIR, ANIMATIONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface ScreenshotConfig {
  name: string;
  description: string;
  waitFor?: string;
  action?: (page: Page) => Promise<void>;
  delay?: number;
  selector?: string;
}

const screenshots: ScreenshotConfig[] = [
  // Screen 1: Loading Screen
  {
    name: '01-loading-screen@2x.png',
    description: 'Loading screen with prayer hands',
    action: async (page) => {
      // Reload page to capture loading screen
      await page.reload({ waitUntil: 'domcontentloaded' });
      // Wait for loading text to appear
      await page.waitForSelector('text=Loading PrayerMap', { timeout: 5000 }).catch(() => {});
    },
    delay: 800, // Wait for animation to settle
  },
  
  // Screen 2: Auth Modal
  {
    name: '02-auth-modal@2x.png',
    description: 'Auth modal with floating particles',
    action: async (page) => {
      // Wait for auth modal to appear
      await page.waitForSelector('text=Sign in, text=Sign up', { timeout: 10000 }).catch(() => {});
      // Wait for particles to animate
      await page.waitForTimeout(2000);
    },
    delay: 500,
  },
  
  // Screen 3: Map View (Default)
  {
    name: '03-map-view-default@2x.png',
    description: 'Full map with markers and header',
    action: async (page) => {
      // Dismiss auth modal by clicking skip or outside
      const skipButton = page.locator('text=Skip, button:has-text("Skip")').first();
      if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      } else {
        // Try clicking outside modal
        await page.click('body', { position: { x: 100, y: 100 } });
        await page.waitForTimeout(1000);
      }
      // Wait for map to fully load
      await page.waitForTimeout(4000);
    },
    delay: 1000,
  },
  
  // Screen 3b: Map View with Preview Bubble
  {
    name: '03-map-view-with-preview@2x.png',
    description: 'Map with hover preview bubble',
    action: async (page) => {
      // Find prayer markers - they might be canvas elements or divs
      // Try multiple selectors
      const markerSelectors = [
        '[data-prayer-marker]',
        '.prayer-marker',
        '[class*="marker"]',
        'button[aria-label*="prayer" i]',
        '.mapboxgl-marker',
      ];
      
      let markerFound = false;
      for (const selector of markerSelectors) {
        const markers = page.locator(selector);
        const count = await markers.count();
        if (count > 0) {
          await markers.first().hover();
          await page.waitForTimeout(300);
          markerFound = true;
          break;
        }
      }
      
      if (!markerFound) {
        // Try clicking on map center area where markers might be
        const mapContainer = page.locator('.mapboxgl-map, [class*="map"]').first();
        if (await mapContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await mapContainer.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(300);
          }
        }
      }
    },
    delay: 300,
  },
  
  // Screen 4: Prayer Detail Modal (Default)
  {
    name: '04-prayer-detail-default@2x.png',
    description: 'Prayer detail modal without form expanded',
    action: async (page) => {
      // Close any open modals first
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Try to click a prayer marker
      const markerSelectors = [
        '[data-prayer-marker]',
        '.prayer-marker',
        '[class*="marker"]',
        'button[aria-label*="prayer" i]',
      ];
      
      let clicked = false;
      for (const selector of markerSelectors) {
        const markers = page.locator(selector);
        const count = await markers.count();
        if (count > 0) {
          await markers.first().click();
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        // Try clicking on map where a marker might be
        const mapContainer = page.locator('.mapboxgl-map, [class*="map"]').first();
        if (await mapContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await mapContainer.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          }
        }
      }
      
      // Wait for modal to appear
      await page.waitForSelector('text=miles away, text=Posted by', { timeout: 5000 }).catch(() => {});
    },
    delay: 800,
  },
  
  // Screen 4b: Prayer Detail Modal (Form Expanded) - Only if reply types exist
  {
    name: '04-prayer-detail-form-expanded@2x.png',
    description: 'Prayer detail modal with reply form expanded',
    action: async (page) => {
      // Check if Text reply button exists (Figma version)
      const textButton = page.locator('button:has-text("Text"), button[aria-label*="text" i]').first();
      if (await textButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textButton.click();
        await page.waitForTimeout(400);
      } else {
        console.log('⚠️  Reply form not found - skipping this screenshot');
      }
    },
    delay: 500,
  },
  
  // Screen 4c: Prayer Detail Modal (With Text Typed)
  {
    name: '04-prayer-detail-with-text@2x.png',
    description: 'Prayer detail modal with text typed in form',
    action: async (page) => {
      // Type text in textarea if it exists
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textarea.fill('Praying for you and your family during this time. May God\'s peace and comfort surround you.');
        await page.waitForTimeout(300);
      }
    },
    delay: 300,
  },
  
  // Screen 5: Request Prayer Modal
  {
    name: '05-request-prayer-modal@2x.png',
    description: 'Request prayer modal with empty form',
    action: async (page) => {
      // Close any open modals first
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Find Request Prayer button - FloatingButton with aria-label="Request Prayer"
      const requestButton = page.locator(
        'button[aria-label="Request Prayer"], ' +
        'button:has-text("Request Prayer"), ' +
        'button[aria-label*="request" i], ' +
        'button[aria-label*="prayer" i], ' +
        'button.fixed.bottom-8.right-8, ' +
        '[class*="floating"]'
      ).first();
      
      if (await requestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await requestButton.click();
        await page.waitForTimeout(800);
      } else {
        // Try keyboard shortcut or other method
        console.log('⚠️  Request Prayer button not found');
      }
    },
    waitFor: 'text=Share what\'s on your heart, text=Request Prayer',
    delay: 500,
  },
  
  // Screen 5b: Request Prayer Modal (Audio State) - Only if content type selector exists
  {
    name: '05-request-prayer-audio@2x.png',
    description: 'Request prayer modal with audio selected',
    action: async (page) => {
      const audioButton = page.locator('button:has-text("Audio"), button[aria-label*="audio" i]').first();
      if (await audioButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await audioButton.click();
        await page.waitForTimeout(400);
      }
    },
    delay: 300,
  },
  
  // Screen 5c: Request Prayer Modal (Video State)
  {
    name: '05-request-prayer-video@2x.png',
    description: 'Request prayer modal with video selected',
    action: async (page) => {
      const videoButton = page.locator('button:has-text("Video"), button[aria-label*="video" i]').first();
      if (await videoButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await videoButton.click();
        await page.waitForTimeout(400);
      }
    },
    delay: 300,
  },
];

async function captureScreenshot(
  page: Page,
  config: ScreenshotConfig,
  outputPath: string
): Promise<void> {
  console.log(`📸 Capturing: ${config.description}`);
  
  try {
    // Perform action if specified
    if (config.action) {
      await config.action(page);
    }
    
    // Wait for specific element if specified
    if (config.waitFor) {
      await page.waitForSelector(config.waitFor, { timeout: 10000 }).catch(() => {
        console.warn(`⚠️  Could not find: ${config.waitFor}`);
      });
    }
    
    // Additional delay
    if (config.delay) {
      await page.waitForTimeout(config.delay);
    }
    
    // Capture screenshot at 2x resolution
    // Note: deviceScaleFactor is set in context, so this will be 2880x1800 (1440*2 x 900*2)
    await page.screenshot({
      path: outputPath,
      fullPage: false,
      type: 'png',
      // Playwright automatically uses deviceScaleFactor from context
    });
    
    console.log(`✅ Saved: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error capturing ${config.name}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting screenshot capture...');
  console.log(`📁 Export directory: ${EXPORT_DIR}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging - set to true for automated runs
    args: ['--force-device-scale-factor=2'], // Ensure 2x scaling
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2.0, // 2x retina resolution (results in 2880x1800 screenshots)
    locale: 'en-US',
    colorScheme: 'light',
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log(`\n📍 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Inject helper script to control app state
    await page.addInitScript(() => {
      (window as any).__SCREENSHOT_MODE__ = true;
    });
    
    // Capture each screenshot
    for (const config of screenshots) {
      const outputPath = path.join(SCREENS_DIR, config.name);
      await captureScreenshot(page, config, outputPath);
      await page.waitForTimeout(1000); // Brief pause between captures
    }
    
    console.log('\n✨ Screenshot capture complete!');
    console.log(`📁 Files saved to: ${SCREENS_DIR}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run when executed directly
main().catch(console.error);

export { main };

