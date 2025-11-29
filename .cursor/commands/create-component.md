# Create React Component

Generate a new React component following PrayerMap patterns.

## Usage
`/create-component <ComponentName>`

## Component Template

Generate a component with:
1. TypeScript interface for props
2. Proper imports
3. Glassmorphic styling
4. Framer Motion animations
5. Loading and error states
6. Accessibility attributes

## Generated Structure

```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface {ComponentName}Props {
  // Define props based on component purpose
  className?: string;
  onAction?: () => void;
}

export function {ComponentName}({ className, onAction }: {ComponentName}Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Implementation
      onAction?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [onAction]);

  if (loading) {
    return (
      <div className={cn("glass rounded-2xl p-6 animate-pulse", className)}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("glass rounded-2xl p-6 text-red-500", className)}>
        {error}
      </div>
    );
  }

  return (
    <motion.div
      className={cn("glass rounded-2xl p-6", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Component content */}
    </motion.div>
  );
}
```

## File Location
Components should be created in `src/components/`

## Checklist
After creating:
- [ ] Update exports if needed
- [ ] Add to parent component
- [ ] Test rendering
- [ ] Check TypeScript compilation
