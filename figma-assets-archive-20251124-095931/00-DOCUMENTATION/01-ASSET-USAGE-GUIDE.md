# PrayerMap Asset Usage Guide

**Last Updated:** [Date]
**Version:** 1.0

---

## Overview

This guide provides comprehensive instructions for using PrayerMap visual assets in development. All assets are optimized for web performance and organized for maximum developer velocity.

## Quick Reference

- **Screens:** `figma-assets/01-SCREENS/`
- **Components:** `figma-assets/02-COMPONENTS/`
- **Icons:** `figma-assets/03-ICONS/`
- **Animations:** `figma-assets/04-ANIMATIONS/`
- **Design Tokens:** `figma-assets/00-DOCUMENTATION/02-DESIGN-TOKENS.json`

## Responsive Image Loading

### React Component Example

```tsx
import { useState, useEffect } from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function ResponsiveImage({ src, alt, className, priority = false }: ResponsiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageSrcSet, setImageSrcSet] = useState<string>('');
  
  useEffect(() => {
    // Generate srcSet for different resolutions
    const basePath = src.replace('@2x.png', '');
    const srcSet = [
      `${basePath}@1x.png 1x`,
      `${basePath}@2x.png 2x`,
      `${basePath}@3x.png 3x`,
    ].join(', ');
    
    setImageSrcSet(srcSet);
    setImageSrc(`${basePath}@2x.png`); // Default to 2x
  }, [src]);
  
  return (
    <img
      src={imageSrc}
      srcSet={imageSrcSet}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
```

### WebP with Fallback

```tsx
export function OptimizedImage({ src, alt, className }: ResponsiveImageProps) {
  const basePath = src.replace('@2x.png', '');
  
  return (
    <picture>
      {/* AVIF - Best compression */}
      <source srcSet={`${basePath}@2x.avif`} type="image/avif" />
      
      {/* WebP - Good compression, wide support */}
      <source srcSet={`${basePath}@2x.webp`} type="image/webp" />
      
      {/* PNG - Fallback */}
      <img
        src={`${basePath}@2x.png`}
        alt={alt}
        className={className}
        loading="lazy"
      />
    </picture>
  );
}
```

## Screens

### Loading Screen

**Files:**
- `01-SCREENS/2x/01-loading-screen@2x.png`
- `01-SCREENS/2x/01-loading-screen@2x.webp`

**Usage:**
```tsx
import loadingScreen from '@/assets/figma-assets/01-SCREENS/2x/01-loading-screen@2x.png';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-heavenly-blue">
      <img
        src={loadingScreen}
        alt="Loading PrayerMap"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
```

**Dimensions:** 2880x1800 (@2x)
**File Size:** ~200 KB (optimized)

---

### Auth Modal

**Files:**
- `01-SCREENS/2x/02-auth-modal@2x.png`

**Usage:**
```tsx
import authModal from '@/assets/figma-assets/01-SCREENS/2x/02-auth-modal@2x.png';

// Use as background reference or component guide
```

---

## Components

### Prayer Marker

**Files:**
- `02-COMPONENTS/markers/2x/prayer-marker-default@2x.png`
- `02-COMPONENTS/markers/2x/prayer-marker-hover@2x.png`
- `02-COMPONENTS/markers/2x/prayer-marker-active@2x.png`
- `02-COMPONENTS/markers/2x/prayer-marker-prayed@2x.png`

**States:**
1. **Default:** Blue glow, 🙏 emoji, scale 1.0
2. **Hover:** Brighter glow, scale 1.2
3. **Active:** Rainbow border, scale 1.3
4. **Prayed:** Gold border, checkmark overlay

**Implementation:**
```tsx
import { motion } from 'framer-motion';
import defaultMarker from '@/assets/figma-assets/02-COMPONENTS/markers/2x/prayer-marker-default@2x.png';
import hoverMarker from '@/assets/figma-assets/02-COMPONENTS/markers/2x/prayer-marker-hover@2x.png';
import activeMarker from '@/assets/figma-assets/02-COMPONENTS/markers/2x/prayer-marker-active@2x.png';
import prayedMarker from '@/assets/figma-assets/02-COMPONENTS/markers/2x/prayer-marker-prayed@2x.png';

interface PrayerMarkerProps {
  state: 'default' | 'hover' | 'active' | 'prayed';
  position: { lat: number; lng: number };
  onClick: () => void;
}

export function PrayerMarker({ state, position, onClick }: PrayerMarkerProps) {
  const markerSrc = {
    default: defaultMarker,
    hover: hoverMarker,
    active: activeMarker,
    prayed: prayedMarker,
  }[state];
  
  return (
    <motion.div
      className="prayer-marker"
      initial={{ scale: 1 }}
      animate={{ scale: state === 'hover' ? 1.2 : state === 'active' ? 1.3 : 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
    >
      <img
        src={markerSrc}
        alt="Prayer marker"
        className="w-12 h-12"
        draggable={false}
      />
    </motion.div>
  );
}
```

---

## Icons

### SVG Icons (Preferred)

**Files:**
- `03-ICONS/svg/prayer-hands.svg`
- `03-ICONS/svg/inbox.svg`
- `03-ICONS/svg/settings.svg`

**Usage:**
```tsx
import PrayerHandsIcon from '@/assets/figma-assets/03-ICONS/svg/prayer-hands.svg?react';

export function IconExample() {
  return (
    <PrayerHandsIcon 
      className="w-6 h-6 text-primary-blue"
      aria-hidden="true"
    />
  );
}
```

### PNG Icons (Fallback)

```tsx
import prayerHandsIcon from '@/assets/figma-assets/03-ICONS/png/2x/prayer-hands@2x.png';

<img
  src={prayerHandsIcon}
  alt="Prayer hands"
  className="w-6 h-6"
/>
```

---

## Design Tokens Integration

### Tailwind Configuration

```javascript
// tailwind.config.js
const designTokens = require('./figma-assets/00-DOCUMENTATION/02-DESIGN-TOKENS.json');

module.exports = {
  theme: {
    extend: {
      colors: {
        'primary-blue': designTokens.colors.primary.blue,
        'primary-purple': designTokens.colors.primary.purple,
        'primary-gold': designTokens.colors.primary.gold,
        'heavenly-blue': designTokens.colors.heavenly.blue,
        'heavenly-purple': designTokens.colors.heavenly.purple,
        'heavenly-gold': designTokens.colors.heavenly.gold,
      },
      fontFamily: {
        primary: designTokens.typography.fontFamily.primary.split(', '),
        secondary: designTokens.typography.fontFamily.secondary.split(', '),
      },
      fontSize: designTokens.typography.fontSize,
      spacing: designTokens.spacing,
      blur: designTokens.effects.blur,
      boxShadow: designTokens.effects.shadow,
    },
  },
};
```

### CSS Variables

```css
/* styles/design-tokens.css */
:root {
  /* Colors */
  --color-primary-blue: #6B7FFF;
  --color-primary-purple: #C5A8FF;
  --color-primary-gold: #FFD700;
  
  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;
  
  /* Effects */
  --blur-sm: 4px;
  --blur-md: 12px;
  --blur-lg: 24px;
}
```

---

## Performance Optimization

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Preloading Critical Assets

```tsx
// In index.html or main.tsx
<link rel="preload" as="image" href="/assets/figma-assets/01-SCREENS/2x/01-loading-screen@2x.webp" />
```

### Image Optimization Checklist

- [ ] Use WebP format with PNG fallback
- [ ] Implement lazy loading for below-the-fold images
- [ ] Use appropriate resolution (@2x for retina)
- [ ] Compress images (target: <200 KB per screen)
- [ ] Use srcSet for responsive images
- [ ] Add proper alt text for accessibility

---

## Accessibility

### Image Alt Text Guidelines

```tsx
// Decorative images
<img src={decorativeImage} alt="" aria-hidden="true" />

// Informative images
<img src={prayerMarker} alt="Prayer request marker" />

// Complex images (use aria-describedby)
<img 
  src={mapView} 
  alt="PrayerMap showing prayer requests"
  aria-describedby="map-description"
/>
<p id="map-description" className="sr-only">
  Interactive map displaying prayer requests within 30 miles
</p>
```

---

## Troubleshooting

### Images Not Loading

1. Check file paths (case-sensitive)
2. Verify files exist in correct directory
3. Check import paths in Vite config
4. Ensure assets are in `public` or imported correctly

### Blurry Images

1. Use @2x or @3x resolution for retina displays
2. Ensure proper srcSet configuration
3. Check image dimensions match display size

### Large File Sizes

1. Run optimization script: `npm run optimize-figma-assets`
2. Use WebP format
3. Consider lazy loading
4. Compress further if needed

---

## Next Steps

1. Review component specifications: `03-COMPONENT-SPECS.md`
2. Review animation specifications: `04-ANIMATION-SPECS.md`
3. Check optimization report: `05-OPTIMIZATION-REPORT.md`
4. Compare with app screenshots: `06-SCREENSHOT-COMPARISON.md`

