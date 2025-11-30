/**
 * Layout Shift Tracker
 * 
 * Tracks Cumulative Layout Shift (CLS) to ensure smooth animations
 * and prevent jarring layout changes that break the spiritual experience.
 * 
 * Reports to Datadog for performance analysis.
 */

import { datadogRum } from '@datadog/browser-rum';

/**
 * Track Cumulative Layout Shift (CLS)
 * 
 * CLS measures visual stability - lower is better
 * - Good: <0.1
 * - Needs improvement: 0.1-0.25
 * - Poor: >0.25
 */
export function trackLayoutShifts(): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}; // No-op if not supported
  }

  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];
  let sessionWindowStart = 0;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Only count layout shifts without recent user input
      if (!(entry as any).hadRecentInput) {
        const firstSessionEntry = clsEntries[0];
        const lastSessionEntry = clsEntries[clsEntries.length - 1];

        // If entries occurred less than 1 second apart and share the same source, merge them
        if (
          clsEntries.length &&
          entry.startTime - lastSessionEntry.startTime < 1000 &&
          entry.startTime - firstSessionEntry.startTime < 5000
        ) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        } else {
          // New session window
          if (clsValue > 0) {
            // Report previous session window
            datadogRum.addTiming('layout_shift.cls', clsValue);
            
            // Alert if CLS is high (>0.1 is poor)
            if (clsValue > 0.1) {
              datadogRum.addError(new Error(`High CLS: ${clsValue.toFixed(3)}`), {
                type: 'layout_shift',
                cls: clsValue.toFixed(3),
                entries: clsEntries.length,
                sessionStart: sessionWindowStart,
                sessionEnd: entry.startTime,
              });
            }
          }
          
          // Start new session window
          clsValue = (entry as any).value;
          clsEntries = [entry];
          sessionWindowStart = entry.startTime;
        }

        // Track individual layout shift
        datadogRum.addAction('layout_shift.occurred', () => {}, {
          value: (entry as any).value,
          sources: (entry as any).sources?.length || 0,
          startTime: entry.startTime,
        });
      }
    }
  });

  try {
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    console.warn('Layout shift tracking not supported:', error);
    return () => {};
  }

  return () => {
    // Report final CLS value before cleanup
    if (clsValue > 0) {
      datadogRum.addTiming('layout_shift.cls', clsValue);
    }
    observer.disconnect();
  };
}

/**
 * Track specific element layout shifts
 */
export function trackElementLayoutShift(
  elementSelector: string,
  elementName: string
): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const sources = (entry as any).sources || [];
      
      // Check if this layout shift affects our element
      const affectsElement = sources.some((source: any) => {
        const node = source.node;
        if (!node) return false;
        
        // Check if element or its children are affected
        const element = document.querySelector(elementSelector);
        if (!element) return false;
        
        return element.contains(node) || node.contains(element);
      });

      if (affectsElement && !(entry as any).hadRecentInput) {
        datadogRum.addAction(`layout_shift.${elementName}`, () => {}, {
          element: elementName,
          selector: elementSelector,
          value: (entry as any).value,
          sources: sources.length,
        });
      }
    }
  });

  try {
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    console.warn('Element layout shift tracking not supported:', error);
    return () => {};
  }

  return () => observer.disconnect();
}

