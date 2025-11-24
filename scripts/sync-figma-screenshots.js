#!/usr/bin/env node

/**
 * Sync Figma Assets with App Screenshots
 * 
 * Compares Figma exports with app screenshots to ensure consistency
 * and identify any discrepancies.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const FIGMA_ASSETS_DIR = path.join(PROJECT_ROOT, 'figma-assets', '01-SCREENS', '2x');
const APP_SCREENSHOTS_DIR = path.join(process.env.HOME || '', 'Downloads', 'prayermap-exports', 'screens');

/**
 * Get list of screenshots from a directory
 */
function getScreenshots(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.png') || file.endsWith('.webp'))
        .map(file => ({
            name: file,
            path: path.join(dir, file),
            size: fs.statSync(path.join(dir, file)).size,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Compare screenshots and generate report
 */
function compareScreenshots() {
    console.log('🔄 Comparing Figma assets with app screenshots...\n');
    
    const figmaScreens = getScreenshots(FIGMA_ASSETS_DIR);
    const appScreens = getScreenshots(APP_SCREENSHOTS_DIR);
    
    console.log(`📸 Figma screens: ${figmaScreens.length}`);
    console.log(`📸 App screenshots: ${appScreens.length}\n`);
    
    // Create comparison report
    const report = {
        figmaCount: figmaScreens.length,
        appCount: appScreens.length,
        figmaScreens: figmaScreens.map(s => s.name),
        appScreens: appScreens.map(s => s.name),
        missingInFigma: [],
        missingInApp: [],
        matches: [],
    };
    
    // Find matches
    const appScreenNames = new Set(appScreens.map(s => s.name));
    const figmaScreenNames = new Set(figmaScreens.map(s => s.name));
    
    figmaScreens.forEach(figma => {
        if (appScreenNames.has(figma.name)) {
            report.matches.push(figma.name);
        } else {
            report.missingInApp.push(figma.name);
        }
    });
    
    appScreens.forEach(app => {
        if (!figmaScreenNames.has(app.name)) {
            report.missingInFigma.push(app.name);
        }
    });
    
    // Generate markdown report
    const reportPath = path.join(PROJECT_ROOT, 'figma-assets', '00-DOCUMENTATION', '06-SCREENSHOT-COMPARISON.md');
    const reportContent = `# Screenshot Comparison Report

**Generated:** ${new Date().toISOString()}

## Summary

- **Figma Screens:** ${report.figmaCount}
- **App Screenshots:** ${report.appCount}
- **Matches:** ${report.matches.length}
- **Missing in Figma:** ${report.missingInFigma.length}
- **Missing in App:** ${report.missingInApp.length}

## Matches

${report.matches.length > 0 ? report.matches.map(name => `- ✅ ${name}`).join('\n') : 'None'}

## Missing in Figma

These screenshots exist from the app but not in Figma exports:

${report.missingInFigma.length > 0 ? report.missingInFigma.map(name => `- ⚠️  ${name}`).join('\n') : 'None'}

## Missing in App

These Figma exports don't have corresponding app screenshots:

${report.missingInApp.length > 0 ? report.missingInApp.map(name => `- ⚠️  ${name}`).join('\n') : 'None'}

## Recommendations

${report.missingInFigma.length > 0 ? `1. Export missing screens from Figma: ${report.missingInFigma.join(', ')}` : '1. All app screenshots have Figma counterparts ✅'}
${report.missingInApp.length > 0 ? `2. Capture missing app screenshots: ${report.missingInApp.join(', ')}` : '2. All Figma screens have app screenshots ✅'}

## Usage Notes

- **Figma Assets:** Use for design reference, component isolation, and design tokens
- **App Screenshots:** Use for implementation verification and real-world rendering
- **Both Together:** Ensure pixel-perfect implementation

## File Locations

- **Figma Assets:** \`${FIGMA_ASSETS_DIR}\`
- **App Screenshots:** \`${APP_SCREENSHOTS_DIR}\`
`;

    fs.writeFileSync(reportPath, reportContent);
    
    console.log('📊 Comparison Report:');
    console.log(`   Matches: ${report.matches.length}`);
    console.log(`   Missing in Figma: ${report.missingInFigma.length}`);
    console.log(`   Missing in App: ${report.missingInApp.length}`);
    console.log(`\n📄 Full report: ${reportPath}\n`);
    
    return report;
}

// Run comparison
try {
    compareScreenshots();
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

