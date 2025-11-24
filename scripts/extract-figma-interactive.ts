import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Interactive Figma Asset Extraction Script
 * 
 * Logs in and interacts with the Figma site to capture all screens
 * Requires actual user interactions (clicks) to navigate through states
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

interface ScreenCapture {
  name: string;
  description: string;
  action: (page: Page) => Promise<void>;
  waitFor?: string;
  delay?: number;
}

async function login(page: Page): Promise<void> {
  console.log('🔐 Logging in...');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Look for login elements - try multiple selectors
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    '#email',
    '[data-testid="email"]',
  ];
  
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[placeholder*="Password" i]',
    '#password',
    '[data-testid="password"]',
  ];
  
  const submitSelectors = [
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
    '[data-testid="submit"]',
  ];
  
  // Find and fill email
  let emailFilled = false;
  for (const selector of emailSelectors) {
    const emailInput = page.locator(selector).first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('test@testing.com');
      emailFilled = true;
      console.log(`  ✅ Found email field: ${selector}`);
      break;
    }
  }
  
  if (!emailFilled) {
    console.log('  ⚠️  Email field not found, trying to type anyway...');
    await page.keyboard.type('test@testing.com');
  }
  
  await page.waitForTimeout(500);
  
  // Find and fill password
  let passwordFilled = false;
  for (const selector of passwordSelectors) {
    const passwordInput = page.locator(selector).first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordInput.fill('testing');
      passwordFilled = true;
      console.log(`  ✅ Found password field: ${selector}`);
      break;
    }
  }
  
  if (!passwordFilled) {
    console.log('  ⚠️  Password field not found, trying to type anyway...');
    await page.keyboard.type('testing');
  }
  
  await page.waitForTimeout(500);
  
  // Find and click submit
  let submitted = false;
  for (const selector of submitSelectors) {
    const submitButton = page.locator(selector).first();
    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      submitted = true;
      console.log(`  ✅ Found submit button: ${selector}`);
      break;
    }
  }
  
  if (!submitted) {
    console.log('  ⚠️  Submit button not found, trying Enter key...');
    await page.keyboard.press('Enter');
  }
  
  // Wait for login to complete
  console.log('  ⏳ Waiting for login to complete...');
  await page.waitForTimeout(3000);
  
  // Check if we're logged in by looking for elements that appear after login
  const loggedInIndicators = [
    'text=Map',
    'text=Prayer',
    '[class*="map"]',
    '[class*="marker"]',
  ];
  
  let loggedIn = false;
  for (const indicator of loggedInIndicators) {
    if (await page.locator(indicator).first().isVisible({ timeout: 3000 }).catch(() => false)) {
      loggedIn = true;
      console.log('  ✅ Login successful!');
      break;
    }
  }
  
  if (!loggedIn) {
    console.log('  ⚠️  Login status unclear, continuing anyway...');
  }
  
  await page.waitForTimeout(2000);
}

async function captureScreen(page: Page, config: ScreenCapture): Promise<void> {
  console.log(`📸 Capturing: ${config.description}`);
  
  try {
    // Perform action
    await config.action(page);
    
    // Wait for specific element if specified
    if (config.waitFor) {
      await page.waitForSelector(config.waitFor, { timeout: 10000 }).catch(() => {
        console.warn(`  ⚠️  Could not find: ${config.waitFor}`);
      });
    }
    
    // Additional delay after action
    const delay = config.delay || 1500;
    await page.waitForTimeout(delay);
    
    // Capture screenshot
    const outputPath = path.join(SCREENS_DIR, config.name);
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png',
    });
    
    console.log(`  ✅ Saved: ${config.name}`);
  } catch (error) {
    console.error(`  ❌ Error capturing ${config.name}:`, error);
  }
}

async function closeModals(page: Page): Promise<void> {
  // Try multiple ways to close modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Try clicking close buttons
  const closeSelectors = [
    'button[aria-label*="close" i]',
    'button:has-text("×")',
    'button:has-text("Close")',
    '[class*="close"]',
  ];
  
  for (const selector of closeSelectors) {
    const closeBtn = page.locator(selector).first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(500);
      break;
    }
  }
  
  // Click outside modal if still open
  await page.mouse.click(100, 100);
  await page.waitForTimeout(500);
}

async function findAndClick(page: Page, selectors: string[], description: string, force = false): Promise<boolean> {
  for (const selector of selectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`  🖱️  Clicking: ${description} (${selector})`);
      try {
        await element.click({ force, timeout: 5000 });
        await page.waitForTimeout(1000);
        return true;
      } catch (error) {
        // Try force click if regular click fails
        if (!force) {
          console.log(`  ⚠️  Regular click failed, trying force click...`);
          try {
            await element.click({ force: true, timeout: 5000 });
            await page.waitForTimeout(1000);
            return true;
          } catch (e) {
            console.log(`  ⚠️  Force click also failed`);
          }
        }
      }
    }
  }
  console.log(`  ⚠️  Could not find or click: ${description}`);
  return false;
}

const screens: ScreenCapture[] = [
  {
    name: '00-loading-screen@2x.png',
    description: 'Loading screen (before login)',
    action: async (page) => {
      // Just wait for loading screen
      await page.waitForTimeout(2000);
    },
    delay: 1000,
  },
  {
    name: '01-auth-modal@2x.png',
    description: 'Auth modal (login screen)',
    action: async (page) => {
      // Wait for auth modal to appear
      await page.waitForTimeout(2000);
    },
    delay: 2000,
  },
  {
    name: '02-map-view-default@2x.png',
    description: 'Map view after login (default state)',
    action: async (page) => {
      await login(page);
      // Wait for map to fully load
      await page.waitForTimeout(3000);
    },
    waitFor: '[class*="map"], canvas, [class*="marker"]',
    delay: 2000,
  },
  {
    name: '03-map-view-with-markers@2x.png',
    description: 'Map view with prayer markers visible',
    action: async (page) => {
      // Should already be on map, just wait for markers
      await page.waitForTimeout(2000);
    },
    delay: 1000,
  },
  {
    name: '04-map-view-marker-hover@2x.png',
    description: 'Map view with marker hover/preview bubble',
    action: async (page) => {
      // Try to hover over a marker
      const markerSelectors = [
        '[class*="marker"]',
        '[class*="prayer"]',
        'button[aria-label*="prayer" i]',
        '[data-prayer-marker]',
        'canvas', // Might need to click on canvas
      ];
      
      for (const selector of markerSelectors) {
        const markers = page.locator(selector);
        const count = await markers.count();
        if (count > 0) {
          console.log(`  Found ${count} elements matching: ${selector}`);
          await markers.first().hover();
          await page.waitForTimeout(500);
          break;
        }
      }
    },
    delay: 1000,
  },
  {
    name: '05-prayer-detail-modal@2x.png',
    description: 'Prayer detail modal (clicked marker)',
    action: async (page) => {
      // Close any open modals first
      await closeModals(page);
      await page.waitForTimeout(1000);
      
      // Try clicking on the map canvas where a marker might be
      // Click in the center area where markers typically appear
      const mapContainer = page.locator('canvas, [class*="map"]').first();
      if (await mapContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
        const box = await mapContainer.boundingBox();
        if (box) {
          // Click slightly off-center (where markers often are)
          await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
          await page.waitForTimeout(1000);
        }
      }
      
      // Also try clicking marker selectors
      const markerSelectors = [
        '[class*="marker"]',
        '[class*="prayer"]',
        'button[aria-label*="prayer" i]',
        '[data-prayer-marker]',
      ];
      
      await findAndClick(page, markerSelectors, 'prayer marker', true);
    },
    waitFor: 'text=miles, text=away, text=Posted, [class*="modal"]',
    delay: 2000,
  },
  {
    name: '06-prayer-detail-form-expanded@2x.png',
    description: 'Prayer detail modal with reply form expanded',
    action: async (page) => {
      // Click Text reply button
      const textButtonSelectors = [
        'button:has-text("Text")',
        '[class*="text"][class*="button"]',
        'button[aria-label*="text" i]',
        '[data-reply-type="text"]',
      ];
      
      await findAndClick(page, textButtonSelectors, 'Text reply button');
    },
    delay: 1500,
  },
  {
    name: '07-prayer-detail-with-text@2x.png',
    description: 'Prayer detail modal with text typed in form',
    action: async (page) => {
      // Type text in textarea
      const textareaSelectors = [
        'textarea',
        'input[type="text"]',
        '[contenteditable="true"]',
      ];
      
      for (const selector of textareaSelectors) {
        const textarea = page.locator(selector).first();
        if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
          await textarea.fill('Praying for you and your family during this time. May God\'s peace and comfort surround you.');
          await page.waitForTimeout(500);
          break;
        }
      }
    },
    delay: 1000,
  },
  {
    name: '08-request-prayer-modal@2x.png',
    description: 'Request prayer modal (empty form)',
    action: async (page) => {
      // Close any open modals first
      await closeModals(page);
      await page.waitForTimeout(1000);
      
      // Find and click Request Prayer button (floating button usually bottom-right)
      const requestButtonSelectors = [
        'button:has-text("Request Prayer")',
        'button:has-text("Request")',
        'button[aria-label="Request Prayer"]',
        '[class*="floating"]',
        '[class*="request"]',
        'button.fixed.bottom-8.right-8', // Common floating button position
        'button:has-text("+")',
      ];
      
      await findAndClick(page, requestButtonSelectors, 'Request Prayer button', true);
    },
    waitFor: 'text=Share, text=heart, text=Request Prayer',
    delay: 2000,
  },
  {
    name: '09-request-prayer-audio@2x.png',
    description: 'Request prayer modal with audio selected',
    action: async (page) => {
      // Click Audio button
      const audioButtonSelectors = [
        'button:has-text("Audio")',
        '[class*="audio"][class*="button"]',
        'button[aria-label*="audio" i]',
        '[data-content-type="audio"]',
      ];
      
      await findAndClick(page, audioButtonSelectors, 'Audio button');
    },
    delay: 1500,
  },
  {
    name: '10-request-prayer-video@2x.png',
    description: 'Request prayer modal with video selected',
    action: async (page) => {
      // Click Video button
      const videoButtonSelectors = [
        'button:has-text("Video")',
        '[class*="video"][class*="button"]',
        'button[aria-label*="video" i]',
        '[data-content-type="video"]',
      ];
      
      await findAndClick(page, videoButtonSelectors, 'Video button');
    },
    delay: 1500,
  },
  {
    name: '11-inbox-modal-all@2x.png',
    description: 'Inbox modal showing All tab',
    action: async (page) => {
      // Close any open modals
      await closeModals(page);
      await page.waitForTimeout(1000);
      
      // Find and click Inbox button (usually in header, top-left)
      const inboxButtonSelectors = [
        'button:has-text("Inbox")',
        'button[aria-label*="inbox" i]',
        '[data-testid="inbox"]',
        'svg.lucide-inbox', // Lucide icon
        'button:has(svg.lucide-inbox)', // Button containing inbox icon
      ];
      
      // Try clicking parent of icon if icon itself is found
      const inboxIcon = page.locator('svg.lucide-inbox, [class*="inbox"]').first();
      if (await inboxIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try to find parent button
        const parentButton = inboxIcon.locator('xpath=ancestor::button').first();
        if (await parentButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await parentButton.click({ force: true });
          await page.waitForTimeout(1000);
        } else {
          await inboxIcon.click({ force: true });
          await page.waitForTimeout(1000);
        }
      } else {
        await findAndClick(page, inboxButtonSelectors, 'Inbox button', true);
      }
    },
    waitFor: 'text=Inbox, text=All',
    delay: 2000,
  },
  {
    name: '12-inbox-modal-received@2x.png',
    description: 'Inbox modal showing Received tab',
    action: async (page) => {
      // Click Received tab
      const receivedTabSelectors = [
        'button:has-text("Received")',
        '[class*="received"][class*="tab"]',
        'button[aria-label*="received" i]',
      ];
      
      await findAndClick(page, receivedTabSelectors, 'Received tab');
    },
    delay: 1500,
  },
  {
    name: '13-inbox-modal-sent@2x.png',
    description: 'Inbox modal showing Sent tab',
    action: async (page) => {
      // Click Sent tab
      const sentTabSelectors = [
        'button:has-text("Sent")',
        '[class*="sent"][class*="tab"]',
        'button[aria-label*="sent" i]',
      ];
      
      await findAndClick(page, sentTabSelectors, 'Sent tab');
    },
    delay: 1500,
  },
  {
    name: '14-settings-screen@2x.png',
    description: 'Settings screen',
    action: async (page) => {
      // Close any open modals
      await closeModals(page);
      await page.waitForTimeout(1000);
      
      // Find and click Settings button (usually in header, top-right)
      const settingsButtonSelectors = [
        'button:has-text("Settings")',
        'button[aria-label*="settings" i]',
        '[data-testid="settings"]',
        'svg.lucide-settings', // Lucide icon
        'button:has(svg.lucide-settings)', // Button containing settings icon
      ];
      
      // Try clicking parent of icon if icon itself is found
      const settingsIcon = page.locator('svg.lucide-settings, [class*="settings"]').first();
      if (await settingsIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try to find parent button
        const parentButton = settingsIcon.locator('xpath=ancestor::button').first();
        if (await parentButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await parentButton.click({ force: true });
          await page.waitForTimeout(1000);
        } else {
          await settingsIcon.click({ force: true });
          await page.waitForTimeout(1000);
        }
      } else {
        await findAndClick(page, settingsButtonSelectors, 'Settings button', true);
      }
    },
    waitFor: 'text=Settings',
    delay: 2000,
  },
];

async function main() {
  console.log('🚀 Starting Interactive Figma Asset Extraction...');
  console.log(`🌐 Figma Site: ${FIGMA_SITE_URL}`);
  console.log(`📁 Export directory: ${ASSETS_DIR}\n`);
  
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    args: ['--force-device-scale-factor=2'],
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2.0,
    locale: 'en-US',
    colorScheme: 'light',
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to site
    console.log(`📍 Navigating to ${FIGMA_SITE_URL}...`);
    await page.goto(FIGMA_SITE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Capture each screen with interactions
    for (const screen of screens) {
      await captureScreen(page, screen);
      await page.waitForTimeout(1000); // Brief pause between captures
    }
    
    console.log('\n✨ Extraction complete!');
    console.log(`📁 Files saved to: ${SCREENS_DIR}`);
    console.log(`📸 Total screens captured: ${screens.length}`);
    console.log('\n📋 Next steps:');
    console.log('1. Review extracted screenshots');
    console.log('2. Run optimization: npm run optimize-figma-assets');
    console.log('3. Compare with app screenshots: npm run sync-figma-screenshots');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Keep browser open for a moment to see final state
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

main().catch(console.error);

