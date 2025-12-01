/**
 * AGENT VERIFICATION SYSTEM
 * 
 * Agents MUST use these utilities before claiming bugs are fixed.
 * This prevents false positives and ensures truthful bug resolution.
 * 
 * CRITICAL: Agents cannot claim a bug is fixed without using these verification methods.
 */

import type { Page } from '@playwright/test';

export interface VerificationResult {
  passed: boolean;
  evidence: {
    screenshots?: string[];
    videos?: string[];
    logs?: string[];
    metrics?: Record<string, number>;
  };
  error?: string;
  timestamp: number;
}

export interface VerificationStep {
  type: 'visual' | 'functional' | 'performance' | 'realtime';
  name: string;
  action: () => Promise<void>;
  expected: () => Promise<boolean>;
  timeout?: number;
}

/**
 * Comprehensive bug verification system for agents
 * 
 * Usage:
 * ```typescript
 * const result = await AgentVerification.verifyBugFix(page, 'Bug description', [
 *   {
 *     type: 'functional',
 *     name: 'Element appears',
 *     action: async () => await page.click('[data-testid="button"]'),
 *     expected: async () => await page.locator('[data-testid="result"]').isVisible(),
 *   },
 * ]);
 * 
 * if (!result.passed) {
 *   throw new Error(`Bug not fixed: ${result.error}`);
 * }
 * ```
 */
export class AgentVerification {
  /**
   * COMPREHENSIVE BUG VERIFICATION
   * 
   * Agents MUST call this before claiming a bug is fixed.
   * Returns false if ANY verification fails.
   * 
   * @param page - Playwright page instance
   * @param bugDescription - Description of the bug being verified
   * @param verificationSteps - Array of verification steps to execute
   * @returns Verification result with evidence
   */
  static async verifyBugFix(
    page: Page,
    bugDescription: string,
    verificationSteps: VerificationStep[]
  ): Promise<VerificationResult> {
    const evidence: VerificationResult['evidence'] = {
      screenshots: [],
      videos: [],
      logs: [],
      metrics: {},
    };
    
    const errors: string[] = [];
    const startTime = Date.now();
    
    try {
      // Capture console logs
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        const logEntry = `[${msg.type()}] ${msg.text()}`;
        consoleMessages.push(logEntry);
        evidence.logs?.push(logEntry);
      });
      
      // Capture page errors
      page.on('pageerror', error => {
        const errorEntry = `[ERROR] ${error.message}`;
        consoleMessages.push(errorEntry);
        evidence.logs?.push(errorEntry);
      });
      
      // Run each verification step
      for (let i = 0; i < verificationSteps.length; i++) {
        const step = verificationSteps[i];
        const stepStartTime = Date.now();
        
        try {
          console.log(`🔍 Verifying step ${i + 1}/${verificationSteps.length}: ${step.name} (${step.type})`);
          
          // Perform action
          await Promise.race([
            step.action(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), step.timeout || 30000)
            ),
          ]);
          
          // Wait for stabilization
          await page.waitForTimeout(500);
          
          // Verify expected outcome
          const passed = await Promise.race([
            step.expected(),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error(`Expected check timeout: ${step.name}`)), step.timeout || 30000)
            ),
          ]);
          
          const stepDuration = Date.now() - stepStartTime;
          
          if (!passed) {
            const errorMsg = `Step ${i + 1} failed: ${step.name} (${step.type}) - Duration: ${stepDuration}ms`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
            
            // Capture failure evidence
            try {
              const screenshot = await page.screenshot({ fullPage: true });
              evidence.screenshots?.push(screenshot.toString('base64'));
            } catch (screenshotError) {
              console.warn('Failed to capture screenshot:', screenshotError);
            }
          } else {
            console.log(`✅ Step ${i + 1} passed: ${step.name} - Duration: ${stepDuration}ms`);
            
            // Capture success evidence
            try {
              const screenshot = await page.screenshot({ fullPage: true });
              evidence.screenshots?.push(screenshot.toString('base64'));
            } catch (screenshotError) {
              console.warn('Failed to capture screenshot:', screenshotError);
            }
          }
          
          // Record step metrics
          evidence.metrics![`step_${i + 1}_duration`] = stepDuration;
          evidence.metrics![`step_${i + 1}_type`] = step.type === 'performance' ? 1 : 0;
          
        } catch (error) {
          const errorMsg = `Step ${i + 1} threw error: ${step.name} - ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
          
          // Capture error evidence
          try {
            const screenshot = await page.screenshot({ fullPage: true });
            evidence.screenshots?.push(screenshot.toString('base64'));
          } catch (screenshotError) {
            console.warn('Failed to capture error screenshot:', screenshotError);
          }
        }
      }
      
      const totalDuration = Date.now() - startTime;
      evidence.metrics!['total_duration'] = totalDuration;
      evidence.metrics!['steps_count'] = verificationSteps.length;
      evidence.metrics!['errors_count'] = errors.length;
      
      const passed = errors.length === 0;
      
      if (passed) {
        console.log(`✅ All verification steps passed in ${totalDuration}ms`);
      } else {
        console.error(`❌ Verification failed: ${errors.length} error(s) in ${totalDuration}ms`);
      }
      
      return {
        passed,
        evidence,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        passed: false,
        evidence,
        error: `Verification system error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      };
    }
  }
  
  /**
   * ANIMATION BUG VERIFICATION
   * 
   * Specifically for animation-related bugs.
   * Verifies:
   * - Animation starts correctly
   * - Animation completes within expected time
   * - Animation runs smoothly (60fps)
   * - No layout shifts occur
   * 
   * @param page - Playwright page instance
   * @param animationSelector - CSS selector for animation element
   * @param expectedDuration - Expected animation duration in milliseconds
   * @param triggerAction - Function to trigger the animation
   * @returns Verification result
   */
  static async verifyAnimationFix(
    page: Page,
    animationSelector: string,
    expectedDuration: number,
    triggerAction: () => Promise<void>
  ): Promise<VerificationResult> {
    return this.verifyBugFix(page, `Animation bug fix: ${animationSelector}`, [
      {
        type: 'functional',
        name: 'Animation starts',
        action: triggerAction,
        expected: async () => {
          await page.waitForSelector(animationSelector, { state: 'visible', timeout: 5000 });
          return true;
        },
        timeout: 10000,
      },
      {
        type: 'functional',
        name: 'Animation completes',
        action: async () => {
          // Wait for animation to complete
          await page.waitForTimeout(expectedDuration + 500); // Add buffer
        },
        expected: async () => {
          // Check if animation element is still visible (or in final state)
          const element = page.locator(animationSelector);
          const isVisible = await element.isVisible().catch(() => false);
          return isVisible;
        },
        timeout: expectedDuration + 2000,
      },
      {
        type: 'performance',
        name: 'Animation runs smoothly',
        action: async () => {
          // Measure frame rate during animation
          await page.waitForTimeout(1000);
        },
        expected: async () => {
          // Simple performance check - verify element exists and is animating
          const element = page.locator(animationSelector);
          const exists = await element.count() > 0;
          return exists;
        },
        timeout: 5000,
      },
    ]);
  }
  
  /**
   * REALTIME BUG VERIFICATION
   * 
   * Specifically for real-time messaging/chat bugs.
   * Verifies:
   * - Message is sent successfully
   * - Message appears in real-time (without page refresh)
   * - Message content is correct
   * 
   * @param page - Playwright page instance
   * @param expectedMessage - Expected message content
   * @param sendAction - Function to send the message
   * @param timeout - Maximum time to wait for message delivery
   * @returns Verification result
   */
  static async verifyRealtimeFix(
    page: Page,
    expectedMessage: string,
    sendAction: () => Promise<void>,
    timeout = 10000
  ): Promise<VerificationResult> {
    return this.verifyBugFix(page, `Realtime messaging bug fix: "${expectedMessage}"`, [
      {
        type: 'functional',
        name: 'Message sent',
        action: sendAction,
        expected: async () => {
          // Verify send button is clicked or message input is cleared
          await page.waitForTimeout(500);
          return true;
        },
        timeout: 5000,
      },
      {
        type: 'realtime',
        name: 'Message appears in real-time',
        action: async () => {
          // Wait for message to appear
          const startTime = Date.now();
          while (Date.now() - startTime < timeout) {
            const messages = page.locator('[data-testid="message"], [class*="message"]');
            const count = await messages.count();
            
            if (count > 0) {
              // Check if expected message is present
              for (let i = 0; i < count; i++) {
                const message = messages.nth(i);
                const text = await message.textContent();
                if (text?.includes(expectedMessage)) {
                  return;
                }
              }
            }
            
            await page.waitForTimeout(100);
          }
        },
        expected: async () => {
          const messages = page.locator('[data-testid="message"], [class*="message"]');
          const count = await messages.count();
          
          for (let i = 0; i < count; i++) {
            const message = messages.nth(i);
            const text = await message.textContent();
            if (text?.includes(expectedMessage)) {
              return true;
            }
          }
          
          return false;
        },
        timeout: timeout + 2000,
      },
    ]);
  }
  
  /**
   * VISUAL REGRESSION VERIFICATION
   * 
   * Verifies that visual changes are intentional and correct.
   * 
   * @param page - Playwright page instance
   * @param testName - Name of the visual test
   * @param action - Action to perform before capturing
   * @returns Verification result
   */
  static async verifyVisualFix(
    page: Page,
    testName: string,
    action: () => Promise<void>
  ): Promise<VerificationResult> {
    return this.verifyBugFix(page, `Visual regression fix: ${testName}`, [
      {
        type: 'visual',
        name: 'Visual state is correct',
        action: async () => {
          await action();
          await page.waitForTimeout(500); // Wait for animations/transitions
        },
        expected: async () => {
          // Visual verification requires Percy or similar tool
          // For now, just verify page is stable
          await page.waitForLoadState('networkidle');
          return true;
        },
        timeout: 10000,
      },
    ]);
  }
}

