import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Enhanced Figma Asset Extraction Script
 * 
 * Intelligently extracts assets from published Figma site by:
 * 1. Discovering all frames/pages
 * 2. Capturing each frame at high resolution
 * 3. Extracting individual components
 * 4. Capturing interactive states
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIGMA_SITE_URL = 'https://list-mood-10532075.figma.site';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'figma-assets');
const SCREENS_DIR = path.join(ASSETS_DIR, '01-SCREENS', '2x');
const COMPONENTS_DIR = path.join(ASSETS_DIR, '02-COMPONENTS', 'markers', '2x');

// Ensure directories exist
[ASSETS_DIR, SCREENS_DIR, COMPONENTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface DiscoveredFrame {
  name: string;
  selector: string;
  index: number;
}

async function discoverFrames(page: Page): Promise<DiscoveredFrame[]> {
  console.log('🔍 Discovering frames and pages...\n');
  
  const frames: DiscoveredFrame[] = [];
  
  // Common Figma site selectors
  const frameSelectors = [
    '[class*="frame"]',
    '[class*="page"]',
    '[data-frame]',
    '[data-page]',
    'iframe',
    '[role="img"]',
    'canvas',
  ];
  
  for (const selector of frameSelectors) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      console.log(`Found ${elements.length} elements with selector: ${selector}`);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const name = await element.getAttribute('data-name') || 
                    await element.getAttribute('aria-label') ||
                    await element.getAttribute('alt') ||
                    `frame-${i + 1}`;
        
        frames.push({
          name: name.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
          selector: `${selector}:nth-of-type(${i + 1})`,
          index: i,
        });
      }
    }
  }
  
  // Also try to find navigation elements that might switch frames
  const navButtons = await page.locator(
    'button, [role="button"], [class*="nav"], [class*="tab"], [class*="frame"]'
  ).all();
  
  console.log(`Found ${navButtons.length} potential navigation elements`);
  console.log(`Total frames discovered: ${frames.length}\n`);
  
  return frames;
}

async function captureFullPage(page: Page, name: string): Promise<void> {
  const outputPath = path.join(SCREENS_DIR, `${name}@2x.png`);
  
  try {
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png',
    });
    console.log(`✅ Captured: ${name}`);
  } catch (error) {
    console.error(`❌ Error capturing ${name}:`, error);
  }
}

async function captureElement(page: Page, selector: string, name: string, outputDir: string): Promise<void> {
  try {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      const outputPath = path.join(outputDir, `${name}@2x.png`);
      await element.screenshot({
        path: outputPath,
        type: 'png',
      });
      console.log(`✅ Captured component: ${name}`);
    }
  } catch (error) {
    // Silently fail - element might not exist
  }
}

async function extractWithInteractions(page: Page): Promise<void> {
  console.log('🎬 Extracting screens with interactions...\n');
  
  // Navigate to main page
  await page.goto(FIGMA_SITE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Capture initial state
  await captureFullPage(page, '00-initial-state');
  
  // Try common interactions
  const interactions = [
    {
      name: '01-loading-screen',
      action: async () => {
        // Reload to catch loading state
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
      },
    },
    {
      name: '02-auth-modal',
      action: async () => {
        // Wait for auth modal to appear
        await page.waitForTimeout(2000);
      },
    },
    {
      name: '03-map-view',
      action: async () => {
        // Try to dismiss modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        // Try clicking skip
        const skip = page.locator('text=Skip').first();
        if (await skip.isVisible({ timeout: 1000 }).catch(() => false)) {
          await skip.click();
        }
        await page.waitForTimeout(2000);
      },
    },
    {
      name: '04-prayer-detail',
      action: async () => {
        // Try clicking a marker
        const markers = page.locator('button, [class*="marker"], [class*="prayer"]').first();
        if (await markers.isVisible({ timeout: 2000 }).catch(() => false)) {
          await markers.click();
          await page.waitForTimeout(1000);
        }
      },
    },
    {
      name: '05-request-prayer',
      action: async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        const requestBtn = page.locator('text=Request, text=Prayer, [class*="floating"]').first();
        if (await requestBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await requestBtn.click();
          await page.waitForTimeout(1000);
        }
      },
    },
  ];
  
  for (const interaction of interactions) {
    console.log(`📸 Capturing: ${interaction.name}`);
    await interaction.action();
    await captureFullPage(page, interaction.name);
    await page.waitForTimeout(1000);
  }
}

async function extractComponents(page: Page): Promise<void> {
  console.log('\n🧩 Extracting individual components...\n');
  
  // Navigate to main page
  await page.goto(FIGMA_SITE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Try to find and capture components
  const componentTypes = [
    { selector: '[class*="marker"]', name: 'prayer-marker', dir: COMPONENTS_DIR },
    { selector: '[class*="button"]', name: 'button', dir: path.join(ASSETS_DIR, '02-COMPONENTS', 'buttons', '2x') },
    { selector: '[class*="modal"]', name: 'modal', dir: path.join(ASSETS_DIR, '02-COMPONENTS', 'modals', '2x') },
  ];
  
  for (const component of componentTypes) {
    if (!fs.existsSync(component.dir)) {
      fs.mkdirSync(component.dir, { recursive: true });
    }
    
    const elements = await page.locator(component.selector).all();
    console.log(`Found ${elements.length} ${component.name} elements`);
    
    for (let i = 0; i < Math.min(elements.length, 5); i++) {
      const selector = `${component.selector}:nth-of-type(${i + 1})`;
      await captureElement(page, selector, `${component.name}-${i + 1}`, component.dir);
    }
  }
}

async function main() {
  console.log('🚀 Starting Enhanced Figma Asset Extraction...');
  console.log(`🌐 Figma Site: ${FIGMA_SITE_URL}`);
  console.log(`📁 Export directory: ${ASSETS_DIR}\n`);
  
  const browser = await chromium.launch({
    headless: false,
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
    // Discover frames
    const frames = await discoverFrames(page);
    
    // Extract with interactions
    await extractWithInteractions(page);
    
    // Extract components
    await extractComponents(page);
    
    console.log('\n✨ Extraction complete!');
    console.log(`📁 Screens saved to: ${SCREENS_DIR}`);
    console.log(`📁 Components saved to: ${COMPONENTS_DIR}`);
    console.log('\n📋 Next steps:');
    console.log('1. Review extracted assets');
    console.log('2. Run optimization: npm run optimize-figma-assets');
    console.log('3. Compare with app screenshots: npm run sync-figma-screenshots');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

