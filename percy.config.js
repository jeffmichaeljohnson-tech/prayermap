/**
 * Percy Visual Regression Testing Configuration
 * 
 * Install: npm install --save-dev @percy/cli @percy/playwright
 * 
 * Usage:
 * - Run tests: npm run test:visual
 * - Update snapshots: npm run test:visual:update
 */

module.exports = {
  version: 2,
  discovery: {
    allowedHostnames: ['localhost', '127.0.0.1'],
    networkIdleTimeout: 750,
  },
  snapshot: {
    widths: [375, 768, 1280], // Mobile, tablet, desktop
    minHeight: 1024,
    percyCSS: `
      /* Hide dynamic content that changes between runs */
      [data-testid="timestamp"],
      [data-testid="relative-time"],
      .timestamp {
        visibility: hidden;
      }
      
      /* Hide loading spinners in snapshots */
      [data-testid="loading"],
      .loading-spinner {
        display: none;
      }
    `,
    // Enable JavaScript for dynamic content
    enableJavaScript: true,
  },
  // CI configuration
  ci: {
    // Fail build on visual differences (set to false for initial setup)
    failOnDiff: false,
  },
};

