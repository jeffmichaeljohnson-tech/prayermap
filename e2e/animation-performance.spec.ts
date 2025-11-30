import { test, expect, type Page } from '@playwright/test';
import { AnimationPerformance } from '../src/testing/animation-performance';

/**
 * Animation Performance E2E Tests
 * 
 * Validates that PrayerMap's spiritual animations maintain 60fps
 * and provide a beautiful experience across all devices.
 */

// Performance thresholds for different test scenarios
const PERFORMANCE_THRESHOLDS = {
  prayer_animation: {
    minFps: 55,
    maxJankRate: 10,
    maxDuration: 6500, // 6 seconds + 500ms tolerance
    maxLayoutShift: 0.1
  },
  modal_transitions: {
    minFps: 58,
    maxJankRate: 5,
    maxDuration: 500,
    maxLayoutShift: 0.05
  },
  map_interactions: {
    minFps: 50, // Lower threshold for complex map operations
    maxJankRate: 15,
    maxDuration: 300,
    maxLayoutShift: 0.1
  }
} as const;

test.describe('Animation Performance Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to fully load
    await page.waitForSelector('[data-testid="prayer-map"]', { timeout: 10000 });
    
    // Allow time for initial setup and reduce interference
    await page.waitForTimeout(1000);
  });

  test('Prayer animation maintains 60fps target', async ({ page }) => {
    console.log('🎯 Testing prayer animation performance...');
    
    // Click on the map to open prayer request modal
    await page.locator('[data-testid="prayer-map"]').click({
      position: { x: 300, y: 300 }
    });
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="prayer-request-modal"]');
    
    // Fill in prayer request
    await page.fill('[data-testid="prayer-title-input"]', 'Test Prayer for Animation');
    await page.fill('[data-testid="prayer-content-textarea"]', 'Testing the beautiful 6-second prayer animation flow');
    
    // Start performance monitoring
    const fps = await AnimationPerformance.measureFrameRate(page, 7000); // Monitor for full animation + buffer
    
    // Trigger the prayer animation
    await page.click('[data-testid="submit-prayer-button"]');
    
    // Wait for animation to start
    await page.waitForSelector('[data-testid="prayer-animation-layer"]', { timeout: 2000 });
    
    // Measure animation timing
    const animationTiming = await AnimationPerformance.verifyAnimationTiming(
      page,
      '[data-testid="prayer-animation-layer"]',
      6000, // Expected 6-second animation
      500   // 500ms tolerance
    );
    
    // Verify no layout shifts during animation
    const noLayoutShift = await AnimationPerformance.verifyNoLayoutShift(
      page,
      '[data-testid="prayer-animation-layer"]',
      7000
    );
    
    // Get comprehensive animation metrics
    const metrics = await AnimationPerformance.getAnimationMetrics(
      page,
      '[data-testid="prayer-animation-layer"]',
      6000
    );
    
    // Performance assertions
    expect(fps, `FPS should be at least ${PERFORMANCE_THRESHOLDS.prayer_animation.minFps} (actual: ${fps.toFixed(1)})`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.prayer_animation.minFps);
    
    expect(animationTiming, 'Animation should complete within expected timeframe').toBe(true);
    
    expect(noLayoutShift, `Layout shift should be minimal (< ${PERFORMANCE_THRESHOLDS.prayer_animation.maxLayoutShift})`).toBe(true);
    
    expect(metrics.jankRate, `Jank rate should be below ${PERFORMANCE_THRESHOLDS.prayer_animation.maxJankRate}% (actual: ${metrics.jankRate.toFixed(1)}%)`).toBeLessThan(PERFORMANCE_THRESHOLDS.prayer_animation.maxJankRate);
    
    // Log performance results
    console.log('✅ Prayer Animation Performance Results:');
    console.log(`   FPS: ${fps.toFixed(1)} (target: ≥${PERFORMANCE_THRESHOLDS.prayer_animation.minFps})`);
    console.log(`   Jank Rate: ${metrics.jankRate.toFixed(1)}% (target: <${PERFORMANCE_THRESHOLDS.prayer_animation.maxJankRate}%)`);
    console.log(`   Layout Shift: ${metrics.layoutShifts.toFixed(3)} (target: <${PERFORMANCE_THRESHOLDS.prayer_animation.maxLayoutShift})`);
    console.log(`   Janky Frames: ${metrics.jankyFrames}/${metrics.frameCount}`);
  });

  test('Modal transitions are smooth and fast', async ({ page }) => {
    console.log('🎯 Testing modal transition performance...');
    
    // Measure FPS during modal opening
    const modalOpenTest = async () => {
      const fpsPromise = AnimationPerformance.measureFrameRate(page, 1000);
      
      // Open prayer request modal
      await page.click('[data-testid="prayer-map"]', { position: { x: 200, y: 200 } });
      await page.waitForSelector('[data-testid="prayer-request-modal"]');
      
      return await fpsPromise;
    };
    
    const openFps = await modalOpenTest();
    
    // Verify modal animation timing
    const modalAnimationTiming = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();
        const modal = document.querySelector('[data-testid="prayer-request-modal"]');
        
        if (modal) {
          const observer = new MutationObserver(() => {
            const style = window.getComputedStyle(modal);
            if (style.opacity === '1') {
              observer.disconnect();
              resolve(performance.now() - startTime);
            }
          });
          
          observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
          
          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(performance.now() - startTime);
          }, 1000);
        } else {
          resolve(0);
        }
      });
    });
    
    // Close modal and measure FPS
    const modalCloseTest = async () => {
      const fpsPromise = AnimationPerformance.measureFrameRate(page, 1000);
      
      await page.click('[data-testid="close-modal-button"]');
      await page.waitForSelector('[data-testid="prayer-request-modal"]', { state: 'hidden' });
      
      return await fpsPromise;
    };
    
    const closeFps = await modalCloseTest();
    
    // Performance assertions
    expect(openFps, `Modal open FPS should be at least ${PERFORMANCE_THRESHOLDS.modal_transitions.minFps} (actual: ${openFps.toFixed(1)})`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.modal_transitions.minFps);
    
    expect(closeFps, `Modal close FPS should be at least ${PERFORMANCE_THRESHOLDS.modal_transitions.minFps} (actual: ${closeFps.toFixed(1)})`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.modal_transitions.minFps);
    
    expect(modalAnimationTiming, `Modal should open within ${PERFORMANCE_THRESHOLDS.modal_transitions.maxDuration}ms (actual: ${modalAnimationTiming.toFixed(0)}ms)`).toBeLessThan(PERFORMANCE_THRESHOLDS.modal_transitions.maxDuration);
    
    console.log('✅ Modal Transition Performance Results:');
    console.log(`   Open FPS: ${openFps.toFixed(1)} (target: ≥${PERFORMANCE_THRESHOLDS.modal_transitions.minFps})`);
    console.log(`   Close FPS: ${closeFps.toFixed(1)} (target: ≥${PERFORMANCE_THRESHOLDS.modal_transitions.minFps})`);
    console.log(`   Animation Time: ${modalAnimationTiming.toFixed(0)}ms (target: <${PERFORMANCE_THRESHOLDS.modal_transitions.maxDuration}ms)`);
  });

  test('Map interactions maintain smooth performance', async ({ page }) => {
    console.log('🎯 Testing map interaction performance...');
    
    // Test map zoom performance
    const zoomTest = async () => {
      const fpsPromise = AnimationPerformance.measureFrameRate(page, 2000);
      
      // Perform multiple zoom operations
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, -300); // Zoom in
        await page.waitForTimeout(200);
        await page.mouse.wheel(0, 300);  // Zoom out
        await page.waitForTimeout(200);
      }
      
      return await fpsPromise;
    };
    
    const zoomFps = await zoomTest();
    
    // Test map pan performance
    const panTest = async () => {
      const fpsPromise = AnimationPerformance.measureFrameRate(page, 2000);
      
      // Perform drag operations
      await page.mouse.move(300, 300);
      await page.mouse.down();
      
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(300 + i * 20, 300 + i * 20);
        await page.waitForTimeout(100);
      }
      
      await page.mouse.up();
      
      return await fpsPromise;
    };
    
    const panFps = await panTest();
    
    // Performance assertions
    expect(zoomFps, `Map zoom FPS should be at least ${PERFORMANCE_THRESHOLDS.map_interactions.minFps} (actual: ${zoomFps.toFixed(1)})`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.map_interactions.minFps);
    
    expect(panFps, `Map pan FPS should be at least ${PERFORMANCE_THRESHOLDS.map_interactions.minFps} (actual: ${panFps.toFixed(1)})`).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.map_interactions.minFps);
    
    console.log('✅ Map Interaction Performance Results:');
    console.log(`   Zoom FPS: ${zoomFps.toFixed(1)} (target: ≥${PERFORMANCE_THRESHOLDS.map_interactions.minFps})`);
    console.log(`   Pan FPS: ${panFps.toFixed(1)} (target: ≥${PERFORMANCE_THRESHOLDS.map_interactions.minFps})`);
  });

  test('Multiple concurrent animations maintain performance', async ({ page }) => {
    console.log('🎯 Testing concurrent animation performance...');
    
    // Create multiple prayer markers by submitting several prayers quickly
    const createMultiplePrayers = async () => {
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="prayer-map"]', { 
          position: { x: 250 + i * 50, y: 250 + i * 50 } 
        });
        
        await page.waitForSelector('[data-testid="prayer-request-modal"]');
        await page.fill('[data-testid="prayer-title-input"]', `Prayer ${i + 1}`);
        await page.fill('[data-testid="prayer-content-textarea"]', `Content for prayer ${i + 1}`);
        
        // Submit without waiting for animation to complete
        await page.click('[data-testid="submit-prayer-button"]');
        await page.waitForTimeout(500); // Brief pause between submissions
      }
    };
    
    // Measure FPS during concurrent animations
    const concurrentFpsPromise = AnimationPerformance.measureFrameRate(page, 8000);
    
    await createMultiplePrayers();
    
    const concurrentFps = await concurrentFpsPromise;
    
    // Get metrics for concurrent animations
    const concurrentMetrics = await AnimationPerformance.getAnimationMetrics(
      page,
      'body', // Monitor entire page
      8000
    );
    
    // Performance assertions for concurrent scenarios
    const concurrentMinFps = PERFORMANCE_THRESHOLDS.prayer_animation.minFps * 0.9; // 10% tolerance for concurrent
    expect(concurrentFps, `Concurrent animation FPS should be at least ${concurrentMinFps.toFixed(1)} (actual: ${concurrentFps.toFixed(1)})`).toBeGreaterThanOrEqual(concurrentMinFps);
    
    expect(concurrentMetrics.jankRate, `Concurrent jank rate should be reasonable (actual: ${concurrentMetrics.jankRate.toFixed(1)}%)`).toBeLessThan(20);
    
    console.log('✅ Concurrent Animation Performance Results:');
    console.log(`   FPS: ${concurrentFps.toFixed(1)} (target: ≥${concurrentMinFps.toFixed(1)})`);
    console.log(`   Jank Rate: ${concurrentMetrics.jankRate.toFixed(1)}% (target: <20%)`);
    console.log(`   Total Frames: ${concurrentMetrics.frameCount}`);
    console.log(`   Janky Frames: ${concurrentMetrics.jankyFrames}`);
  });

  test('Device-specific optimization works correctly', async ({ page, browserName }) => {
    console.log('🎯 Testing device-specific animation optimization...');
    
    // Simulate different device conditions
    await page.emulate({
      viewport: { width: 375, height: 667 }, // iPhone dimensions
      deviceScaleFactor: 2
    });
    
    // Simulate slower connection to trigger optimizations
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 50); // Add 50ms delay
    });
    
    // Trigger prayer animation with device optimization
    await page.click('[data-testid="prayer-map"]', { position: { x: 200, y: 300 } });
    await page.waitForSelector('[data-testid="prayer-request-modal"]');
    
    await page.fill('[data-testid="prayer-title-input"]', 'Mobile Optimized Prayer');
    await page.fill('[data-testid="prayer-content-textarea"]', 'Testing mobile animation optimization');
    
    // Check if reduced complexity is applied
    const hasOptimizations = await page.evaluate(() => {
      // Check for GPU acceleration indicators
      const animationLayer = document.querySelector('[data-testid="prayer-animation-layer"]');
      if (!animationLayer) return false;
      
      const style = window.getComputedStyle(animationLayer);
      return style.willChange.includes('transform') && 
             style.transform.includes('translateZ');
    });
    
    // Start animation and measure performance
    const mobileFps = await AnimationPerformance.measureFrameRate(page, 7000);
    
    await page.click('[data-testid="submit-prayer-button"]');
    await page.waitForSelector('[data-testid="prayer-animation-layer"]');
    
    // Mobile should maintain at least 45 FPS (reduced expectation)
    const mobileMinFps = browserName === 'webkit' ? 40 : 45; // iOS Safari gets more tolerance
    expect(mobileFps, `Mobile FPS should be at least ${mobileMinFps} (actual: ${mobileFps.toFixed(1)})`).toBeGreaterThanOrEqual(mobileMinFps);
    
    expect(hasOptimizations, 'GPU optimizations should be applied on mobile').toBe(true);
    
    console.log('✅ Mobile Optimization Performance Results:');
    console.log(`   Mobile FPS: ${mobileFps.toFixed(1)} (target: ≥${mobileMinFps})`);
    console.log(`   GPU Optimizations: ${hasOptimizations ? 'Applied' : 'Not Applied'}`);
  });

  test('Reduced motion preference is respected', async ({ page }) => {
    console.log('🎯 Testing reduced motion accessibility...');
    
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Trigger prayer submission
    await page.click('[data-testid="prayer-map"]', { position: { x: 300, y: 300 } });
    await page.waitForSelector('[data-testid="prayer-request-modal"]');
    
    await page.fill('[data-testid="prayer-title-input"]', 'Reduced Motion Prayer');
    await page.fill('[data-testid="prayer-content-textarea"]', 'Testing accessibility with reduced motion');
    
    const startTime = Date.now();
    await page.click('[data-testid="submit-prayer-button"]');
    
    // Wait for any instant changes
    await page.waitForTimeout(100);
    const endTime = Date.now();
    
    const animationDuration = endTime - startTime;
    
    // With reduced motion, animation should complete almost instantly
    expect(animationDuration, 'Reduced motion should complete quickly').toBeLessThan(500);
    
    // Verify that prayer was still submitted successfully
    const successIndicator = await page.waitForSelector('[data-testid="prayer-submitted-success"]', { timeout: 2000 });
    expect(successIndicator).toBeTruthy();
    
    console.log('✅ Reduced Motion Test Results:');
    console.log(`   Animation Duration: ${animationDuration}ms (target: <500ms)`);
    console.log(`   Prayer Submission: Successful`);
  });
});

/**
 * Performance regression tests
 * These tests run on every PR to ensure performance doesn't degrade
 */
test.describe('Performance Regression Tests', () => {
  test('Animation performance baseline', async ({ page }) => {
    // This test establishes performance baselines and fails if significant regressions are detected
    await page.goto('/');
    await page.waitForSelector('[data-testid="prayer-map"]');
    
    // Measure baseline FPS
    const baselineFps = await AnimationPerformance.measureFrameRate(page, 3000);
    
    // Store baseline (in a real scenario, this would be compared against stored baselines)
    console.log(`📊 Performance Baseline: ${baselineFps.toFixed(1)} FPS`);
    
    // Fail if below minimum acceptable performance
    expect(baselineFps, 'Baseline FPS must meet minimum standards').toBeGreaterThanOrEqual(30);
  });
});