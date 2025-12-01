/**
 * Async testing utilities
 * Provides helpers for managing async operations and timing in tests
 */

import { vi } from 'vitest';

// ============================================================================
// Condition Waiting
// ============================================================================

/**
 * Wait for a condition to become true
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Check interval in milliseconds (default: 50)
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const result = await condition();

        if (result) {
          resolve();
        } else if (Date.now() - startTime >= timeout) {
          reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        } else {
          setTimeout(check, interval);
        }
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}

/**
 * Wait for an element to appear in the DOM
 * @param selector - CSS selector for the element
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForElement(
  selector: string,
  timeout = 5000
): Promise<Element> {
  let element: Element | null = null;

  await waitForCondition(() => {
    element = document.querySelector(selector);
    return element !== null;
  }, timeout);

  return element as Element;
}

/**
 * Wait for an element to be removed from the DOM
 * @param selector - CSS selector for the element
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForElementToBeRemoved(
  selector: string,
  timeout = 5000
): Promise<void> {
  await waitForCondition(() => {
    return document.querySelector(selector) === null;
  }, timeout);
}

/**
 * Wait for multiple elements to appear
 * @param selector - CSS selector for the elements
 * @param count - Expected number of elements
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForElements(
  selector: string,
  count: number,
  timeout = 5000
): Promise<NodeListOf<Element>> {
  let elements: NodeListOf<Element> | null = null;

  await waitForCondition(() => {
    elements = document.querySelectorAll(selector);
    return elements.length >= count;
  }, timeout);

  return elements as NodeListOf<Element>;
}

// ============================================================================
// Promise Utilities
// ============================================================================

/**
 * Flush all pending promises
 * Useful for ensuring all microtasks complete
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Create a deferred promise that can be resolved or rejected externally
 * Useful for controlling async flow in tests
 */
export function createDeferredPromise<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Wait for a specific amount of time
 * @param ms - Milliseconds to wait
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for the next tick
 * Useful for waiting for state updates
 */
export async function nextTick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// ============================================================================
// Network Utilities
// ============================================================================

/**
 * Wait for network to be idle (no pending requests)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForNetworkIdle(timeout = 5000): Promise<void> {
  // Track active fetch requests
  let activeRequests = 0;

  // Mock fetch to track requests
  const originalFetch = global.fetch;
  global.fetch = vi.fn(async (...args) => {
    activeRequests++;
    try {
      const result = await originalFetch(...args);
      return result;
    } finally {
      activeRequests--;
    }
  });

  try {
    await waitForCondition(() => activeRequests === 0, timeout);
  } finally {
    // Restore original fetch
    global.fetch = originalFetch;
  }
}

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Advance timers by a specific amount (works with vi.useFakeTimers())
 * @param ms - Milliseconds to advance
 */
export async function advanceTimersByTimeAsync(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await flushPromises();
}

/**
 * Run all pending timers (works with vi.useFakeTimers())
 */
export async function runAllTimersAsync(): Promise<void> {
  vi.runAllTimers();
  await flushPromises();
}

/**
 * Run only pending timers (works with vi.useFakeTimers())
 */
export async function runOnlyPendingTimersAsync(): Promise<void> {
  vi.runOnlyPendingTimers();
  await flushPromises();
}

// ============================================================================
// Polling Utilities
// ============================================================================

/**
 * Poll a function until it returns a truthy value
 * @param fn - Function to poll
 * @param interval - Polling interval in milliseconds (default: 100)
 * @param timeout - Maximum time to poll in milliseconds (default: 5000)
 */
export async function poll<T>(
  fn: () => T | Promise<T>,
  interval = 100,
  timeout = 5000
): Promise<T> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const result = await fn();

        if (result) {
          resolve(result);
        } else if (Date.now() - startTime >= timeout) {
          reject(new Error(`Polling timeout after ${timeout}ms`));
        } else {
          setTimeout(check, interval);
        }
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(check, interval);
        }
      }
    };

    check();
  });
}

/**
 * Poll until a value changes
 * @param fn - Function that returns the current value
 * @param initialValue - The initial value to compare against
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForValueChange<T>(
  fn: () => T | Promise<T>,
  initialValue: T,
  timeout = 5000
): Promise<T> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const currentValue = await fn();

        if (currentValue !== initialValue) {
          resolve(currentValue);
        } else if (Date.now() - startTime >= timeout) {
          reject(new Error(`Value did not change after ${timeout}ms`));
        } else {
          setTimeout(check, 50);
        }
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}

// ============================================================================
// Animation Frame Utilities
// ============================================================================

/**
 * Wait for the next animation frame
 */
export async function waitForAnimationFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

/**
 * Wait for multiple animation frames
 * @param count - Number of frames to wait (default: 1)
 */
export async function waitForAnimationFrames(count = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    await waitForAnimationFrame();
  }
}

// ============================================================================
// Batch Utilities
// ============================================================================

/**
 * Wait for all promises to settle (resolve or reject)
 * @param promises - Array of promises
 */
export async function waitForAll<T>(
  promises: Array<Promise<T>>
): Promise<Array<PromiseSettledResult<T>>> {
  return Promise.allSettled(promises);
}

/**
 * Wait for any promise to resolve
 * @param promises - Array of promises
 */
export async function waitForAny<T>(promises: Array<Promise<T>>): Promise<T> {
  return Promise.race(promises);
}

/**
 * Retry a function until it succeeds or max attempts reached
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param delayMs - Delay between attempts in milliseconds (default: 100)
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  maxAttempts = 3,
  delayMs = 100
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

// ============================================================================
// Timeout Utilities
// ============================================================================

/**
 * Add a timeout to a promise
 * @param promise - Promise to add timeout to
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMessage - Optional custom timeout message
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Execute a callback with a timeout
 * @param callback - Callback to execute
 * @param timeoutMs - Timeout in milliseconds
 */
export async function executeWithTimeout<T>(
  callback: () => T | Promise<T>,
  timeoutMs: number
): Promise<T> {
  return withTimeout(Promise.resolve(callback()), timeoutMs);
}
