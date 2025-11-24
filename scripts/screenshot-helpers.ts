/**
 * Helper functions to inject into the browser for screenshot capture
 * These make it easier to capture specific states
 */

export const screenshotHelpers = `
// Screenshot mode helpers
window.__SCREENSHOT_MODE__ = true;

// Helper to pause loading screen
window.__pauseLoadingScreen = function() {
  const app = document.querySelector('[data-testid="app"]') || document.body;
  const style = document.createElement('style');
  style.id = 'screenshot-pause';
  style.textContent = \`
    * {
      animation-play-state: paused !important;
      transition: none !important;
    }
  \`;
  document.head.appendChild(style);
};

// Helper to keep modal open
window.__keepModalOpen = function(modalSelector) {
  const modal = document.querySelector(modalSelector);
  if (modal) {
    modal.style.pointerEvents = 'auto';
    // Prevent auto-close
    const observer = new MutationObserver(() => {
      if (modal.style.display === 'none' || modal.hidden) {
        modal.style.display = 'block';
        modal.hidden = false;
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style', 'hidden'] });
  }
};

// Helper to dismiss auth modal
window.__dismissAuthModal = function() {
  const skipButton = document.querySelector('button:has-text("Skip"), button[aria-label*="skip" i]');
  if (skipButton) {
    (skipButton as HTMLButtonElement).click();
  }
  // Or set localStorage flag
  localStorage.setItem('authModalDismissed', 'true');
};

// Helper to simulate hover state
window.__hoverElement = function(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }
};

// Helper to expand form
window.__expandForm = function() {
  const textButton = document.querySelector('button:has-text("Text"), button[aria-label*="text" i]');
  if (textButton) {
    (textButton as HTMLButtonElement).click();
  }
};
`;

