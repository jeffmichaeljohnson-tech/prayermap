import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Automated Figma Asset Extraction Script
 * 
 * Extracts high-resolution screenshots from published Figma site
 * https://list-mood-10532075.figma.site
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIGMA_SITE_URL = 'https://list-mood-10532075.figma.site';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'figma-assets');
const SCREENS_DIR = path.join(ASSETS_DIR, '01-SCREENS', '2x');

// Ensure directories exist
[ASSETS_DIR, SCREENS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface ScreenConfig {
  name: string;
  description: string;
  url?: string;
  selector?: string;
  waitFor?: string;
  action?: (page: Page) => Promise<void>;
  delay?: number;
}

const screens: ScreenConfig[] = [
  {
    name: '01-loading-screen@2x.png',
    description: 'Loading screen with prayer hands',
    waitFor: 'text=Loading, text=PrayerMap',
    delay: 1000,
  },
  {
    name: '02-auth-modal@2x.png',
    description: 'Auth modal with floating particles',
    waitFor: 'text=Sign in, text=Sign up, text=Apple',
    delay: 2000, // Wait for particles to animate
  },
  {
    name: '03-map-view-default@2x.png',
    description: 'Full map with markers and header',
    action: async (page) => {
      // Try to dismiss auth modal if present
      const skipButton = page.locator('text=Skip, button:has-text("Skip")').first();
      if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      // Wait for map to load
      await page.waitForTimeout(3000);
    },
    delay: 1000,
  },
  {
    name: '03-map-view-with-preview@2x.png',
    description: 'Map with hover preview bubble',
    action: async (page) => {
      // Try to hover over a marker
      const markers = page.locator('[class*="marker"], [class*="prayer"], button').first();
      if (await markers.isVisible({ timeout: 2000 }).catch(() => false)) {
        await markers.hover();
        await page.waitForTimeout(300);
      }
    },
    delay: 300,
  },
  {
    name: '04-prayer-detail-default@2x.png',
    description: 'Prayer detail modal without form expanded',
    action: async (page) => {
      // Try to click a prayer marker
      const markers = page.locator('[class*="marker"], [class*="prayer"], button').first();
      if (await markers.isVisible({ timeout: 2000 }).catch(() => false)) {
        await markers.click();
        await page.waitForTimeout(500);
      }
    },
    waitFor: 'text=miles, text=away, text=Posted',
    delay: 800,
  },
  {
    name: '04-prayer-detail-form-expanded@2x.png',
    description: 'Prayer detail modal with reply form expanded',
    action: async (page) => {
      // Click Text reply button if exists
      const textButton = page.locator('text=Text, button:has-text("Text")').first();
      if (await textButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textButton.click();
        await page.waitForTimeout(400);
      }
    },
    delay: 500,
  },
  {
    name: '05-request-prayer-modal@2x.png',
    description: 'Request prayer modal with empty form',
    action: async (page) => {
      // Close any open modals
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      // Find Request Prayer button
      const requestButton = page.locator(
        'text=Request Prayer, text=Request, button:has-text("Prayer"), [class*="floating"], [class*="request"]'
      ).first();
      if (await requestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await requestButton.click();
        await page.waitForTimeout(800);
      }
    },
    waitFor: 'text=Share, text=heart',
    delay: 500,
  },
  {
    name: '05-request-prayer-audio@2x.png',
    description: 'Request prayer modal with audio selected',
    action: async (page) => {
      const audioButton = page.locator('text=Audio, button:has-text("Audio")').first();
      if (await audioButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await audioButton.click();
        await page.waitForTimeout(400);
      }
    },
    delay: 300,
  },
  {
    name: '05-request-prayer-video@2x.png',
    description: 'Request prayer modal with video selected',
    action: async (page) => {
      const videoButton = page.locator('text=Video, button:has-text("Video")').first();
      if (await videoButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await videoButton.click();
        await page.waitForTimeout(400);
      }
    },
    delay: 300,
  },
  {
    name: '06-inbox-all-tab@2x.png',
    description: 'Inbox modal showing all prayers',
    action: async (page) => {
      // Close any open modals
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      // Find inbox button
      const inboxButton = page.locator(
        'text=Inbox, [class*="inbox"], button:has-text("Inbox")'
      ).first();
      if (await inboxButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inboxButton.click();
        await page.waitForTimeout(800);
      }
    },
    waitFor: 'text=Inbox, text=All',
    delay: 500,
  },
  {
    name: '06-inbox-received-tab@2x.png',
    description: 'Inbox modal showing received tab',
    action: async (page) => {
      const receivedTab = page.locator('text=Received, button:has-text("Received")').first();
      if (await receivedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await receivedTab.click();
        await page.waitForTimeout(400);
      }
    },
    delay: 300,
  },
];

async function captureScreen(page: Page, config: ScreenConfig): Promise<void> {
  console.log(`📸 Capturing: ${config.description}`);
  
  try {
    // Navigate to specific URL if provided
    if (config.url) {
      await page.goto(config.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
    
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
    const outputPath = path.join(SCREENS_DIR, config.name);
    await page.screenshot({
      path: outputPath,
      fullPage: true, // Capture full page for Figma site
      type: 'png',
    });
    
    console.log(`✅ Saved: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error capturing ${config.name}:`, error);
  }
}

async function extractAllScreens(page: Page): Promise<void> {
  console.log('\n🖼️  Extracting all screens...\n');
  
  // Navigate to main page first
  console.log(`📍 Navigating to ${FIGMA_SITE_URL}...`);
  await page.goto(FIGMA_SITE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Try to find navigation or frame selector
  // Figma sites often have frame navigation
  const frames = await page.locator('[class*="frame"], [class*="page"], [data-frame]').all();
  console.log(`Found ${frames.length} potential frames`);
  
  // Capture each configured screen
  for (const screen of screens) {
    await captureScreen(page, screen);
    await page.waitForTimeout(1000); // Brief pause between captures
  }
}

async function extractComponents(page: Page): Promise<void> {
  console.log('\n🧩 Extracting components...\n');
  
  const componentsDir = path.join(ASSETS_DIR, '02-COMPONENTS');
  
  // Try to find component library or isolated components
  // This is more exploratory - we'll capture what we can find
  
  const componentSelectors = [
    '[class*="button"]',
    '[class*="marker"]',
    '[class*="modal"]',
    '[class*="card"]',
    '[class*="input"]',
  ];
  
  for (const selector of componentSelectors) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      console.log(`Found ${elements.length} elements matching: ${selector}`);
      // Could capture individual elements here if needed
    }
  }
}

async function main() {
  console.log('🚀 Starting Figma asset extraction...');
  console.log(`🌐 Figma Site: ${FIGMA_SITE_URL}`);
  console.log(`📁 Export directory: ${ASSETS_DIR}\n`);
  
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
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
    // Extract all screens
    await extractAllScreens(page);
    
    // Try to extract components (exploratory)
    await extractComponents(page);
    
    console.log('\n✨ Extraction complete!');
    console.log(`📁 Files saved to: ${SCREENS_DIR}`);
    console.log('\n📋 Next steps:');
    console.log('1. Review extracted screenshots');
    console.log('2. Run optimization: npm run optimize-figma-assets');
    console.log('3. Compare with app screenshots: npm run sync-figma-screenshots');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run when executed directly
main().catch(console.error);

