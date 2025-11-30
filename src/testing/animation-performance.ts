/**
 * Animation performance testing utilities
 * Verifies animations run at 60fps and complete correctly
 */

import type { Page } from '@playwright/test';

export interface AnimationMetrics {
  frameRate: number;
  duration: number;
  layoutShifts: number;
  jankyFrames: number;
}

/**
 * Animation performance testing utilities
 */
export class AnimationPerformance {
  /**
   * Measure animation frame rate
   * 
   * @param page - Playwright page instance
   * @param duration - Duration to measure in milliseconds
   * @returns Frame rate (frames per second)
   */
  static async measureFrameRate(
    page: Page,
    duration = 1000
  ): Promise<number> {
    const frameCount = await page.evaluate(async (dur) => {
      let frames = 0;
      let startTime: number | null = null;
      
      return new Promise<number>((resolve) => {
        const countFrames = (currentTime: number) => {
          if (startTime === null) {
            startTime = currentTime;
          }
          
          frames++;
          
          if (currentTime - startTime < dur) {
            requestAnimationFrame(countFrames);
          } else {
            const elapsed = currentTime - startTime;
            const fps = (frames / elapsed) * 1000;
            resolve(fps);
          }
        };
        
        requestAnimationFrame(countFrames);
        
        // Safety timeout
        setTimeout(() => {
          if (startTime !== null) {
            const elapsed = performance.now() - startTime;
            const fps = (frames / elapsed) * 1000;
            resolve(fps);
          } else {
            resolve(0);
          }
        }, dur + 1000);
      });
    }, duration);
    
    return frameCount;
  }
  
  /**
   * Verify animation completes within expected time
   * 
   * @param page - Playwright page instance
   * @param selector - CSS selector for animation element
   * @param expectedDuration - Expected duration in milliseconds
   * @param tolerance - Tolerance in milliseconds (default: 100ms)
   * @returns True if animation completes within expected time
   */
  static async verifyAnimationTiming(
    page: Page,
    selector: string,
    expectedDuration: number,
    tolerance = 100
  ): Promise<boolean> {
    const result = await page.evaluate(
      ({ sel, expected, tol }) => {
        return new Promise<{ duration: number; withinTolerance: boolean }>((resolve) => {
          const element = document.querySelector(sel);
          if (!element) {
            resolve({ duration: 0, withinTolerance: false });
            return;
          }
          
          const startTime = performance.now();
          
          // Wait for animation to complete
          const checkAnimation = () => {
            const style = window.getComputedStyle(element);
            const animation = style.animation || style.transition;
            const animationName = style.animationName || style.transitionProperty;
            
            // Check if animation is still running
            if (animation && animation !== 'none' && animationName && animationName !== 'none') {
              requestAnimationFrame(checkAnimation);
            } else {
              const duration = performance.now() - startTime;
              const withinTolerance = Math.abs(duration - expected) <= tol;
              resolve({ duration, withinTolerance });
            }
          };
          
          // Start checking
          requestAnimationFrame(checkAnimation);
          
          // Safety timeout
          setTimeout(() => {
            const duration = performance.now() - startTime;
            const withinTolerance = Math.abs(duration - expected) <= tol;
            resolve({ duration, withinTolerance });
          }, expected + tol + 1000);
        });
      },
      { sel: selector, expected: expectedDuration, tol: tolerance }
    );
    
    console.log(
      `Animation timing: ${result.duration.toFixed(0)}ms (expected: ${expectedDuration}ms ±${tolerance}ms)`
    );
    
    return result.withinTolerance;
  }
  
  /**
   * Verify animation doesn't cause layout shifts
   * 
   * @param page - Playwright page instance
   * @param selector - CSS selector for animation element
   * @param duration - Duration to monitor in milliseconds
   * @returns True if Cumulative Layout Shift (CLS) is < 0.1
   */
  static async verifyNoLayoutShift(
    page: Page,
    selector: string,
    duration = 1000
  ): Promise<boolean> {
    const layoutShift = await page.evaluate(
      ({ sel, dur }) => {
        return new Promise<number>((resolve) => {
          let cumulativeShift = 0;
          
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // Ignore layout shifts caused by user interaction
              if ((entry as any).hadRecentInput) continue;
              cumulativeShift += (entry as any).value;
            }
          });
          
          try {
            observer.observe({ entryTypes: ['layout-shift'] });
          } catch (error) {
            // PerformanceObserver might not be supported
            resolve(0);
            return;
          }
          
          // Wait for duration
          setTimeout(() => {
            observer.disconnect();
            resolve(cumulativeShift);
          }, dur);
        });
      },
      { sel: selector, dur: duration }
    );
    
    // CLS should be < 0.1 for good UX
    const passed = layoutShift < 0.1;
    console.log(`Layout shift (CLS): ${layoutShift.toFixed(3)} (target: <0.1)`);
    
    return passed;
  }
  
  /**
   * Get comprehensive animation metrics
   * 
   * @param page - Playwright page instance
   * @param selector - CSS selector for animation element
   * @param duration - Duration to measure in milliseconds
   * @returns Animation metrics
   */
  static async getAnimationMetrics(
    page: Page,
    selector: string,
    duration = 1000
  ): Promise<AnimationMetrics> {
    const [frameRate, layoutShifts] = await Promise.all([
      this.measureFrameRate(page, duration),
      this.verifyNoLayoutShift(page, selector, duration).then(shift => {
        // Get actual CLS value
        return page.evaluate(
          ({ sel, dur }) => {
            return new Promise<number>((resolve) => {
              let cumulativeShift = 0;
              
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if ((entry as any).hadRecentInput) continue;
                  cumulativeShift += (entry as any).value;
                }
              });
              
              try {
                observer.observe({ entryTypes: ['layout-shift'] });
              } catch {
                resolve(0);
                return;
              }
              
              setTimeout(() => {
                observer.disconnect();
                resolve(cumulativeShift);
              }, dur);
            });
          },
          { sel: selector, dur: duration }
        );
      }),
    ]);
    
    // Calculate janky frames (frames that took >16ms to render)
    const jankyFrames = await page.evaluate(async () => {
      let jankyCount = 0;
      let lastTime = performance.now();
      
      return new Promise<number>((resolve) => {
        const checkFrame = (currentTime: number) => {
          const frameTime = currentTime - lastTime;
          if (frameTime > 16) {
            jankyCount++;
          }
          lastTime = currentTime;
          
          requestAnimationFrame(checkFrame);
        };
        
        requestAnimationFrame(checkFrame);
        
        setTimeout(() => {
          resolve(jankyCount);
        }, 1000);
      });
    });
    
    return {
      frameRate,
      duration,
      layoutShifts,
      jankyFrames,
    };
  }
}

