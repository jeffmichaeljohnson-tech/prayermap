import { useEffect, useState } from 'react';

/**
 * Hook to detect user's preference for reduced motion
 *
 * Returns true if the user has enabled "Reduce Motion" in their system settings.
 * This hook respects WCAG 2.1 AA accessibility guidelines by detecting the
 * prefers-reduced-motion media query.
 *
 * @returns {boolean} True if user prefers reduced motion, false otherwise
 *
 * @example
 * ```tsx
 * const reducedMotion = useReducedMotion();
 *
 * <motion.div
 *   animate={{ opacity: 1 }}
 *   transition={reducedMotion ? { duration: 0 } : { duration: 0.4 }}
 * />
 * ```
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    // Initialize with current preference
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    // Guard for SSR environments
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    // Use addEventListener for modern browsers
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, []);

  return reducedMotion;
}
