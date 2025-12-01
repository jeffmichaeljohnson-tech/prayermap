/**
 * MSW (Mock Service Worker) server setup for Node.js testing environment
 * Configures request interception for API mocking during tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { afterAll, afterEach, beforeAll } from 'vitest';

// ============================================================================
// Server Setup
// ============================================================================

/**
 * Create MSW server with default handlers
 */
export const server = setupServer(...handlers);

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Start server before all tests
 */
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn on unhandled requests during development
  });
});

/**
 * Reset handlers after each test to ensure test isolation
 */
afterEach(() => {
  server.resetHandlers();
});

/**
 * Clean up and close server after all tests
 */
afterAll(() => {
  server.close();
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Enable request logging for debugging
 * Call this in specific tests when you need to see what requests are being made
 */
export function enableRequestLogging(): void {
  server.events.on('request:start', ({ request }) => {
    console.log('[MSW] Request:', request.method, request.url);
  });

  server.events.on('request:match', ({ request }) => {
    console.log('[MSW] Request matched:', request.method, request.url);
  });

  server.events.on('request:unhandled', ({ request }) => {
    console.log('[MSW] Unhandled request:', request.method, request.url);
  });

  server.events.on('response:mocked', ({ request, response }) => {
    console.log('[MSW] Response:', request.method, request.url, response.status);
  });
}

/**
 * Disable request logging
 */
export function disableRequestLogging(): void {
  server.events.removeAllListeners();
}

/**
 * Reset all request handlers to defaults
 */
export function resetToDefaultHandlers(): void {
  server.resetHandlers(...handlers);
}

/**
 * Track all requests made during a test
 * Returns a function that returns all captured requests
 */
export function trackRequests(): () => Array<{ method: string; url: string }> {
  const requests: Array<{ method: string; url: string }> = [];

  server.events.on('request:start', ({ request }) => {
    requests.push({
      method: request.method,
      url: request.url,
    });
  });

  return () => requests;
}

/**
 * Wait for a specific request to be made
 * @param method - HTTP method to wait for
 * @param urlPattern - URL pattern to match (string or regex)
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export function waitForRequest(
  method: string,
  urlPattern: string | RegExp,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${method} ${urlPattern}`));
    }, timeout);

    const handler = ({ request }: { request: Request }) => {
      const matches =
        request.method === method &&
        (typeof urlPattern === 'string'
          ? request.url.includes(urlPattern)
          : urlPattern.test(request.url));

      if (matches) {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      server.events.removeListener('request:start', handler);
    };

    server.events.on('request:start', handler);
  });
}

/**
 * Count requests matching a pattern
 * @param method - HTTP method to count
 * @param urlPattern - URL pattern to match (string or regex)
 */
export function countRequests(
  method: string,
  urlPattern: string | RegExp
): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;

    const handler = ({ request }: { request: Request }) => {
      const matches =
        request.method === method &&
        (typeof urlPattern === 'string'
          ? request.url.includes(urlPattern)
          : urlPattern.test(request.url));

      if (matches) {
        count++;
      }
    };

    server.events.on('request:start', handler);

    // Return count after a short delay to capture all requests
    setTimeout(() => {
      server.events.removeListener('request:start', handler);
      resolve(count);
    }, 100);
  });
}

// ============================================================================
// Export Server Instance
// ============================================================================

export default server;
