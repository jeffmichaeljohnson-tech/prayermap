# Create Component

Create a new React component following PrayerMap patterns.

## Component Structure
```typescript
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ComponentProps } from '@/types';

interface ComponentNameProps {
  // Define props with TypeScript
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // 1. Hooks first
  // 2. Derived state
  // 3. Handlers
  // 4. Render

  return (
    <motion.div className={cn('glass rounded-xl p-4')}>
      {/* Content */}
    </motion.div>
  );
}
```

## Requirements
- Use TypeScript with explicit prop interfaces
- Use Tailwind CSS for styling (no inline styles)
- Use Framer Motion for animations
- Use `cn()` utility for conditional classes
- Keep under 100 lines - split if larger
- Handle loading/error states for async operations
- Ensure touch targets are >= 44px
- Include proper accessibility attributes

## File Location
Place in `src/components/[category]/ComponentName.tsx`
