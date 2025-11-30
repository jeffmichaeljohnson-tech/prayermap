# IMPLEMENTATION-GUIDE.md - Setup, Patterns & Standards

> **Step-by-step guide for implementing PrayerMap features.** This covers setup procedures, coding patterns, and quality standards.

> **Prerequisites:** Read [ARTICLE.md](./ARTICLE.md) first, then [PROJECT-GUIDE.md](./PROJECT-GUIDE.md).

---

## 🚀 Initial Setup

### Development Environment
```bash
# 1. Clone repository
git clone https://github.com/your-org/prayermap.git
cd prayermap

# 2. Install dependencies
npm install
cd admin && npm install && cd ..

# 3. Environment setup
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# 4. Start development
npm run dev              # Main app (localhost:5173)
cd admin && npm run dev  # Admin app (localhost:5174)
```

### Database Setup
```bash
# 1. Install Supabase CLI
npm install -g @supabase/cli

# 2. Link to project
npx supabase link --project-ref YOUR_PROJECT_ID

# 3. Pull latest schema
npx supabase db pull

# 4. Run migrations
npx supabase db push
```

### Mobile Setup (Optional)
```bash
# 1. Add mobile platforms
npx cap add ios
npx cap add android

# 2. Install mobile plugins
npm install @capacitor/camera @capacitor/geolocation @capacitor/haptics

# 3. Sync to mobile
npm run build && npx cap sync

# See MOBILE-GUIDE.md for detailed mobile setup
```

---

## 🏗️ Architecture Patterns

### Component File Structure
```typescript
// PrayerCard.tsx - Standard component structure
import { useState } from 'react';                    // React imports first
import { motion } from 'framer-motion';             // External libraries
import { supabase } from '@/lib/supabase';          // Internal absolute imports
import { Prayer } from '@/types/prayer';            // Type imports
import './PrayerCard.css';                          // Relative imports last

// 1. Types & Interfaces
interface PrayerCardProps {
  prayer: Prayer;
  onPrayClick: (prayerId: string) => void;
  className?: string;
}

// 2. Main Component
export function PrayerCard({ prayer, onPrayClick, className }: PrayerCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Component logic here
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`prayer-card ${className}`}
    >
      {/* Component JSX */}
    </motion.div>
  );
}

// 3. Subcomponents (if small and related)
function PrayerActions({ onPray }: { onPray: () => void }) {
  return (
    <div className="prayer-actions">
      <button onClick={onPray}>🙏 Pray</button>
    </div>
  );
}

// 4. Helper functions
function formatPrayerTime(date: Date): string {
  return new Intl.RelativeTimeFormat('en').format(/* ... */);
}
```

### State Management Decision Tree
```typescript
// Use this decision tree for state management:

// 1. LOCAL COMPONENT STATE (React useState/useReducer)
// ✅ Use for: Form inputs, toggle states, temporary UI state
const [isOpen, setIsOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState('');

// 2. SERVER STATE (React Query)  
// ✅ Use for: All data from Supabase, API calls, caching
const { data: prayers } = useQuery({
  queryKey: ['prayers', filters],
  queryFn: () => prayerService.getPrayers(filters)
});

// 3. GLOBAL CLIENT STATE (Zustand)
// ✅ Use for: Auth state, user preferences, UI state that crosses components
const { user, signIn, signOut } = useAuthStore();
const { theme, language, setTheme } = usePreferencesStore();

// ❌ DON'T use Context for: Server state, frequently changing state
// ❌ DON'T use Zustand for: Data from APIs, temporary component state
```

### Service Layer Pattern
```typescript
// prayerService.ts - API service pattern
import { supabase } from '@/lib/supabase';
import { Prayer, PrayerFilters } from '@/types/prayer';

export const prayerService = {
  // Get prayers with filters
  async getPrayers(filters: PrayerFilters): Promise<Prayer[]> {
    let query = supabase
      .from('prayers')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (filters.location) {
      // PostGIS query for location-based filtering
      query = query.rpc('prayers_near_location', {
        lat: filters.location.lat,
        lng: filters.location.lng,
        radius_km: filters.radius || 10
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Create new prayer
  async createPrayer(prayer: Omit<Prayer, 'id' | 'created_at'>): Promise<Prayer> {
    const { data, error } = await supabase
      .from('prayers')
      .insert(prayer)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Subscribe to prayer updates
  subscribeToPrayers(callback: (payload: any) => void) {
    return supabase
      .channel('prayers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'prayers' },
        callback
      )
      .subscribe();
  }
};
```

---

## 🎨 Design System Implementation

### Color System (Ethereal Glass)
```css
/* TailwindCSS configuration - tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary palette
        'heavenly-blue': '#E8F4F8',
        'dawn-gold': '#F7E7CE',
        'prayer-purple': '#D4C5F9',
        
        // Text colors
        'text-primary': '#2C3E50',
        'text-secondary': '#7F8C8D',
        
        // Glass effects
        'glass': 'rgba(255, 255, 255, 0.7)',
        'glass-border': 'rgba(255, 255, 255, 0.3)',
      },
      backdropBlur: {
        'glass': '10px',
      },
      fontFamily: {
        'display': ['Cinzel', 'serif'],    // Spiritual, elegant headings
        'body': ['Inter', 'sans-serif'],    // Clean, readable body
      }
    }
  }
}
```

### Glass Morphism Components
```typescript
// GlassCard.tsx - Reusable glass effect component
export function GlassCard({ 
  children, 
  className = '', 
  blur = 'glass' 
}: GlassCardProps) {
  return (
    <div className={`
      bg-glass backdrop-blur-${blur} 
      border border-glass-border 
      rounded-lg shadow-lg
      ${className}
    `}>
      {children}
    </div>
  );
}

// Usage example
<GlassCard className="p-6">
  <h2 className="font-display text-xl text-text-primary">Prayer Request</h2>
  <p className="font-body text-text-secondary">Prayer content...</p>
</GlassCard>
```

### Animation Standards
```typescript
// animationConfig.ts - Consistent animation settings
export const ANIMATION_CONFIG = {
  // Timing
  TIMING: {
    FAST: 150,      // Hover states, micro-interactions
    NORMAL: 200,    // Default transitions  
    MEDIUM: 300,    // Modals, cards
    SLOW: 500,      // Page transitions, large animations
  },
  
  // Easing
  EASING: {
    OUT: 'easeOut',        // Most common - elements entering
    IN_OUT: 'easeInOut',   // Bi-directional animations
    SPRING: { type: 'spring', stiffness: 300, damping: 30 }
  },
  
  // Common variants
  VARIANTS: {
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    
    scaleIn: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 }
    },
    
    slideIn: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' }
    }
  }
};

// Usage example
<motion.div
  variants={ANIMATION_CONFIG.VARIANTS.fadeInUp}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ duration: ANIMATION_CONFIG.TIMING.MEDIUM / 1000 }}
>
  Content here
</motion.div>
```

---

## 🔒 Security Implementation

### Row Level Security (RLS) Patterns
```sql
-- Example RLS policies for prayers table
CREATE POLICY "Public prayers are viewable by everyone" ON prayers
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own prayers" ON prayers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prayers" ON prayers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prayers" ON prayers
  FOR DELETE USING (auth.uid() = user_id);
```

### Input Validation with Zod
```typescript
// schemas/prayer.ts - Input validation schemas
import { z } from 'zod';

export const prayerSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
    
  body: z.string()
    .min(10, 'Prayer must be at least 10 characters')
    .max(1000, 'Prayer must be less than 1000 characters'),
    
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional()
  }).optional(),
  
  is_public: z.boolean().default(true),
  is_anonymous: z.boolean().default(false)
});

export type PrayerInput = z.infer<typeof prayerSchema>;

// Usage in components
function CreatePrayerForm() {
  const [formData, setFormData] = useState<Partial<PrayerInput>>({});
  
  const handleSubmit = async (data: PrayerInput) => {
    try {
      const validatedData = prayerSchema.parse(data);
      await prayerService.createPrayer(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        setErrors(error.errors);
      }
    }
  };
}
```

---

## 📱 Responsive Design Patterns

### Mobile-First Breakpoints
```css
/* Use Tailwind responsive prefixes */
.prayer-grid {
  @apply grid grid-cols-1;        /* Mobile: 1 column */
  @apply md:grid-cols-2;          /* Tablet: 2 columns */
  @apply xl:grid-cols-3;          /* Desktop: 3 columns */
  @apply 2xl:grid-cols-4;         /* Large: 4 columns */
}

/* Touch target sizes */
.btn-touch {
  @apply min-h-[44px] min-w-[44px]; /* iOS minimum touch target */
  @apply px-4 py-2;                  /* Comfortable padding */
}

/* Safe area handling for mobile */
.safe-area {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### Interactive States
```typescript
// InteractiveButton.tsx - Standard button with all states
export function InteractiveButton({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <motion.button
      className={`
        btn-touch font-medium rounded-lg transition-all duration-200
        ${variant === 'primary' ? 'bg-prayer-purple text-white' : 'bg-gray-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
      `}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
```

---

## ⚡ Performance Standards

### Bundle Size Optimization
```bash
# Analyze bundle size
npm run build
npm run analyze   # Use webpack-bundle-analyzer

# Target sizes:
# Main bundle: < 500KB gzipped
# Vendor bundle: < 200KB gzipped
# Total initial load: < 700KB gzipped
```

### Code Splitting Patterns
```typescript
// Lazy load non-critical components
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const PrayerDetailModal = lazy(() => import('./PrayerDetailModal'));

// Route-based code splitting
const router = createBrowserRouter([
  {
    path: '/',
    element: <MapView />,  // Critical - loaded immediately
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminDashboard />
      </Suspense>
    ),
  },
]);

// Component-based code splitting
function PrayerMap() {
  const [showDetail, setShowDetail] = useState(false);
  
  return (
    <div>
      <MapView />
      {showDetail && (
        <Suspense fallback={<DetailSkeleton />}>
          <PrayerDetailModal />
        </Suspense>
      )}
    </div>
  );
}
```

### Performance Monitoring
```typescript
// usePerformance.ts - Performance monitoring hook
export function usePerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      console.log(`${componentName} render time: ${duration.toFixed(2)}ms`);
      
      // Log to monitoring service
      if (duration > 100) {
        console.warn(`Slow render detected: ${componentName} took ${duration}ms`);
      }
    };
  }, [componentName]);
}

// Usage
function PrayerCard() {
  usePerformance('PrayerCard');
  // Component logic...
}
```

---

## 🧪 Testing Patterns

### Component Testing
```typescript
// PrayerCard.test.tsx - Component testing pattern
import { render, screen, fireEvent } from '@testing-library/react';
import { PrayerCard } from './PrayerCard';

describe('PrayerCard', () => {
  const mockPrayer = {
    id: '1',
    title: 'Test Prayer',
    body: 'Please pray for healing',
    user_id: 'user1',
    created_at: new Date().toISOString(),
    is_public: true
  };

  it('displays prayer content correctly', () => {
    render(<PrayerCard prayer={mockPrayer} onPrayClick={jest.fn()} />);
    
    expect(screen.getByText('Test Prayer')).toBeInTheDocument();
    expect(screen.getByText('Please pray for healing')).toBeInTheDocument();
  });

  it('calls onPrayClick when pray button is clicked', () => {
    const onPrayClick = jest.fn();
    render(<PrayerCard prayer={mockPrayer} onPrayClick={onPrayClick} />);
    
    fireEvent.click(screen.getByText('🙏 Pray'));
    expect(onPrayClick).toHaveBeenCalledWith('1');
  });
});
```

### E2E Testing with Playwright
```typescript
// tests/prayer-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and view prayer', async ({ page }) => {
  // Go to app
  await page.goto('/');
  
  // Create prayer
  await page.click('[data-testid="create-prayer-btn"]');
  await page.fill('[data-testid="prayer-title"]', 'Test Prayer');
  await page.fill('[data-testid="prayer-body"]', 'Please pray for healing');
  await page.click('[data-testid="submit-prayer"]');
  
  // Verify prayer appears on map
  await expect(page.locator('[data-testid="prayer-marker"]')).toBeVisible();
  
  // Click marker to open prayer
  await page.click('[data-testid="prayer-marker"]');
  await expect(page.locator('text=Test Prayer')).toBeVisible();
});
```

---

## 📊 Quality Gates

### Code Quality Standards
```bash
# All code must pass these checks before merge:

# 1. TypeScript strict mode (no `any`, ever)
npx tsc --noEmit

# 2. ESLint with no errors
npm run lint

# 3. Prettier formatting
npm run format

# 4. Unit tests passing
npm test

# 5. E2E tests passing
npx playwright test

# 6. Bundle size under limit
npm run build && npm run size-check
```

### Performance Gates
```typescript
// Performance thresholds (enforced in CI/CD)
const PERFORMANCE_THRESHOLDS = {
  FIRST_CONTENTFUL_PAINT: 1500,  // ms
  TIME_TO_INTERACTIVE: 2000,     // ms
  LARGEST_CONTENTFUL_PAINT: 2500, // ms
  CUMULATIVE_LAYOUT_SHIFT: 0.1,  // score
  BUNDLE_SIZE: 500,              // KB gzipped
};

// Lighthouse CI configuration
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}],
      },
    },
  },
};
```

---

## 🚀 Deployment Pipeline

### Environment Configuration
```bash
# .env.local (development)
VITE_SUPABASE_URL=your-dev-supabase-url
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_MAPBOX_TOKEN=your-mapbox-token

# .env.production (Vercel environment variables)
VITE_SUPABASE_URL=your-prod-supabase-url
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_MAPBOX_TOKEN=your-mapbox-token
```

### Build Process
```bash
# Vercel build commands (vercel.json)
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}

# Build steps:
# 1. Install dependencies
# 2. Type checking
# 3. Linting
# 4. Unit tests
# 5. Build application
# 6. Size analysis
# 7. E2E tests (on preview)
```

---

## 🔧 Development Tools Configuration

### VS Code Settings
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Git Hooks
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint-staged

# lint-staged configuration in package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,json,css,md}": ["prettier --write"]
  }
}
```

---

## 🔗 Related Documentation

- **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Main project navigation
- **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - Mobile deployment specifics
- **[AI-AGENTS.md](./AI-AGENTS.md)** - AI agent coordination
- **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Observability and monitoring
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

---

**Last Updated:** 2024-11-30  
**Version:** 1.0 (Comprehensive implementation guide)  
**Next Review:** After major architecture changes