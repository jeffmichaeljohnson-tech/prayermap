---
name: ui-design-system
description: UI design system toolkit for creating consistent, accessible, and scalable interfaces. Includes design token generation, component documentation, responsive design calculations, and developer handoff tools. Use for creating design systems, maintaining visual consistency, and facilitating design-dev collaboration.
---

# UI Design System

Professional toolkit for creating and maintaining scalable design systems.

## Core Capabilities

- Design token generation (colors, typography, spacing)
- Component system architecture
- Responsive design calculations
- Accessibility compliance (WCAG 2.1 AA)
- Developer handoff documentation

## Design Tokens

### Color System
```css
:root {
  /* Primary - Prayer/Spiritual */
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-900: #0c4a6e;

  /* Secondary - Community */
  --color-secondary-500: #8b5cf6;

  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;
}
```

### Typography Scale
```css
:root {
  /* Font Families */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Cal Sans', var(--font-sans);

  /* Type Scale (1.25 ratio) */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### Spacing System (8pt Grid)
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### Responsive Breakpoints
```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

## Component Patterns

### Button Variants
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
}
```

### Card Component
```typescript
interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}
```

### Prayer Card (Domain-Specific)
```typescript
interface PrayerCardProps {
  prayer: Prayer;
  variant?: 'compact' | 'full';
  showLocation?: boolean;
  showActions?: boolean;
  onPrayClick?: () => void;
}
```

## Accessibility Guidelines

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

### Focus States
```css
.focusable:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Screen Reader Support
- Use semantic HTML elements
- Add aria-labels for icon buttons
- Announce dynamic content changes
- Provide skip links

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Animation Tokens
```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;

  /* Easings */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

## Shadow System
```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```
