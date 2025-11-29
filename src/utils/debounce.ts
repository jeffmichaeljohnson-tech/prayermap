/**
 * Debounce utility - delays function execution until after a specified delay
 * Used for performance optimization when handling frequent events like map movements
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds before executing the function
 * @returns Debounced version of the function
 *
 * @example
 * const debouncedSave = debounce(() => saveData(), 300);
 * window.addEventListener('resize', debouncedSave);
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
