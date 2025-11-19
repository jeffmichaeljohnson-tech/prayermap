# 📁 PrayerMap Project Structure

## Complete File Tree

```
prayermap/
│
├── prayermap-web/                    # Frontend React App
│   ├── public/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── manifest.json
│   │   └── robots.txt
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   │   └── logo.svg
│   │   │   └── styles/
│   │   │       └── mapbox-custom.json    # Custom map style
│   │   │
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginModal.tsx
│   │   │   │   ├── SignupModal.tsx
│   │   │   │   └── AuthButtons.tsx
│   │   │   │
│   │   │   ├── map/
│   │   │   │   ├── Map.tsx               # Main map component
│   │   │   │   ├── PrayerMarker.tsx      # Individual marker
│   │   │   │   └── MarkerCluster.tsx     # Cluster component
│   │   │   │
│   │   │   ├── prayers/
│   │   │   │   ├── PrayerDetail.tsx      # Modal for prayer
│   │   │   │   ├── PrayerCard.tsx        # Card component
│   │   │   │   ├── PrayerList.tsx        # List view
│   │   │   │   ├── RequestPrayer.tsx     # Create prayer modal
│   │   │   │   ├── TextPrayerForm.tsx
│   │   │   │   ├── AudioRecorder.tsx
│   │   │   │   ├── VideoRecorder.tsx
│   │   │   │   └── MediaPlayer.tsx
│   │   │   │
│   │   │   ├── responses/
│   │   │   │   ├── ResponseList.tsx
│   │   │   │   ├── ResponseForm.tsx
│   │   │   │   └── ResponseCard.tsx
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   ├── NotificationDropdown.tsx
│   │   │   │   └── NotificationItem.tsx
│   │   │   │
│   │   │   ├── profile/
│   │   │   │   ├── UserProfile.tsx
│   │   │   │   ├── ProfileSettings.tsx
│   │   │   │   └── PrayerHistory.tsx
│   │   │   │
│   │   │   └── ui/
│   │   │       ├── Button.tsx            # Reusable button
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── GlassCard.tsx         # Glass effect card
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts                # Auth state & methods
│   │   │   ├── usePrayers.ts             # Prayer CRUD
│   │   │   ├── useResponses.ts           # Response CRUD
│   │   │   ├── useSupport.ts             # Support actions
│   │   │   ├── useNotifications.ts       # Notification management
│   │   │   ├── useGeolocation.ts         # User location
│   │   │   ├── useMediaRecorder.ts       # Audio/video recording
│   │   │   └── useRealtime.ts            # Supabase subscriptions
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts               # Supabase client
│   │   │   ├── types.ts                  # TypeScript types
│   │   │   ├── api.ts                    # API helper functions
│   │   │   ├── storage.ts                # Media upload helpers
│   │   │   ├── geolocation.ts            # Location utilities
│   │   │   ├── mapbox.ts                 # MapBox utilities
│   │   │   ├── validation.ts             # Form validation schemas (Zod)
│   │   │   └── constants.ts              # App constants
│   │   │
│   │   ├── stores/
│   │   │   ├── authStore.ts              # Auth Zustand store
│   │   │   ├── prayerStore.ts            # Prayer state
│   │   │   ├── notificationStore.ts      # Notification state
│   │   │   └── uiStore.ts                # UI state (modals, etc)
│   │   │
│   │   ├── utils/
│   │   │   ├── formatters.ts             # Date, distance formatters
│   │   │   ├── media.ts                  # Media processing
│   │   │   ├── permissions.ts            # Permission checks
│   │   │   └── analytics.ts              # Analytics helpers
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx                  # Main map view
│   │   │   ├── Profile.tsx               # User profile
│   │   │   ├── Settings.tsx              # Settings page
│   │   │   ├── NotFound.tsx              # 404 page
│   │   │   └── Landing.tsx               # Pre-auth landing
│   │   │
│   │   ├── App.tsx                       # Main app component
│   │   ├── main.tsx                      # Entry point
│   │   ├── index.css                     # Global styles
│   │   └── vite-env.d.ts                 # Vite types
│   │
│   ├── .env.local                        # Environment variables
│   ├── .env.example                      # Example env file
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── README.md
│
├── prayermap-ios/                    # Native iOS App (Phase 3)
│   ├── PrayerMap/
│   │   ├── App/
│   │   │   ├── PrayerMapApp.swift
│   │   │   └── ContentView.swift
│   │   │
│   │   ├── Views/
│   │   │   ├── Map/
│   │   │   │   ├── MapView.swift
│   │   │   │   └── PrayerAnnotation.swift
│   │   │   ├── Prayers/
│   │   │   │   ├── PrayerDetailView.swift
│   │   │   │   ├── CreatePrayerView.swift
│   │   │   │   └── PrayerListView.swift
│   │   │   └── Profile/
│   │   │       └── ProfileView.swift
│   │   │
│   │   ├── ViewModels/
│   │   │   ├── AuthViewModel.swift
│   │   │   ├── PrayerViewModel.swift
│   │   │   └── NotificationViewModel.swift
│   │   │
│   │   ├── Models/
│   │   │   ├── Prayer.swift
│   │   │   ├── User.swift
│   │   │   └── Notification.swift
│   │   │
│   │   ├── Services/
│   │   │   ├── SupabaseService.swift
│   │   │   ├── LocationService.swift
│   │   │   └── NotificationService.swift
│   │   │
│   │   ├── Utils/
│   │   │   ├── Extensions.swift
│   │   │   └── Constants.swift
│   │   │
│   │   └── Assets.xcassets/
│   │
│   ├── PrayerMap.xcodeproj/
│   └── Podfile                           # CocoaPods dependencies
│
├── docs/
│   ├── PRD_v2.md                         # Product Requirements Doc
│   ├── API_SPEC.md                       # API Documentation
│   ├── DESIGN_SYSTEM.md                  # Design guidelines
│   ├── IMPLEMENTATION_GUIDE.md           # Quick start guide
│   └── CONTRIBUTING.md                   # Contribution guidelines
│
├── database/
│   ├── schema.sql                        # Database schema
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_notifications.sql
│   │   └── 003_add_flags.sql
│   ├── seed_data.sql                     # Sample data for dev
│   └── functions/
│       ├── get_prayers_within_radius.sql
│       └── create_notification.sql
│
├── scripts/
│   ├── setup-dev.sh                      # Dev environment setup
│   ├── deploy-prod.sh                    # Production deployment
│   └── backup-db.sh                      # Database backup
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # CI/CD pipeline
│   │   ├── deploy-preview.yml            # PR previews
│   │   └── deploy-prod.yml               # Production deploy
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── legal/
│   ├── TERMS_OF_SERVICE.md
│   ├── PRIVACY_POLICY.md
│   └── COMMUNITY_GUIDELINES.md
│
├── marketing/
│   ├── landing-page/                     # Marketing site
│   ├── app-store/
│   │   ├── screenshots/
│   │   ├── app-preview-video.mp4
│   │   └── description.txt
│   └── press-kit/
│       ├── logo.svg
│       ├── logo.png
│       └── press-release.md
│
├── tests/                                # Test suite (future)
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── README.md                             # Project README
└── LICENSE                               # MIT License

```

---

## 🗂️ File Responsibilities

### Core Files You'll Interact With Daily

**`src/App.tsx`**
- Main application component
- Routing logic
- Global providers (Auth, Query, etc.)

**`src/components/map/Map.tsx`**
- MapBox integration
- Render prayer markers
- Handle map interactions

**`src/hooks/usePrayers.ts`**
- Fetch prayers within radius
- Create new prayers
- Update prayer status

**`src/lib/supabase.ts`**
- Supabase client configuration
- Auth helpers
- Storage helpers

**`src/lib/types.ts`**
- All TypeScript interfaces
- Enums
- Type guards

---

## 📦 Key Dependencies

### Production Dependencies
```json
{
  "@supabase/supabase-js": "^2.39.0",       // Backend client
  "mapbox-gl": "^3.0.0",                     // Maps
  "framer-motion": "^10.16.0",               // Animations
  "zustand": "^4.4.0",                       // State management
  "@tanstack/react-query": "^5.0.0",        // Data fetching
  "react-hook-form": "^7.48.0",              // Forms
  "zod": "^3.22.0",                          // Validation
  "lucide-react": "^0.292.0"                 // Icons
}
```

### Dev Dependencies
```json
{
  "@types/mapbox-gl": "^3.0.0",
  "@types/react": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "autoprefixer": "^10.4.0",
  "postcss": "^8.4.0"
}
```

---

## 🔧 Configuration Files

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PrayerMap',
        short_name: 'PrayerMap',
        theme_color: '#E8F4F8',
        background_color: '#FFFFFF',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 🚀 Development Workflow

### 1. Start Development
```bash
cd prayermap-web
npm run dev
```

### 2. Work on Feature
```bash
# Create feature branch
git checkout -b feature/prayer-audio-recording

# Make changes to:
# - src/components/prayers/AudioRecorder.tsx
# - src/hooks/useMediaRecorder.ts
# - src/lib/storage.ts

# Test locally
npm run dev

# Commit
git add .
git commit -m "feat: Add audio prayer recording"
git push origin feature/prayer-audio-recording
```

### 3. Deploy Preview
```bash
# GitHub Actions automatically deploys preview
# Check PR for preview URL
```

### 4. Merge to Production
```bash
# After PR approval
git checkout main
git merge feature/prayer-audio-recording
git push origin main

# Vercel auto-deploys to production
```

---

## 📊 Code Organization Principles

### Component Structure
```typescript
// ✅ Good: Single responsibility
function PrayerCard({ prayer }: Props) {
  return (
    <div className="glass-card p-4">
      <PrayerTitle title={prayer.title} />
      <PrayerBody text={prayer.text_body} />
      <PrayerActions prayerId={prayer.prayer_id} />
    </div>
  );
}

// ❌ Bad: Too many responsibilities
function PrayerCard({ prayer }: Props) {
  const [isSupported, setIsSupported] = useState(false);
  const handleSupport = async () => { /* API call */ };
  const handleResponse = () => { /* Open modal */ };
  // ... 200 lines of code
}
```

### Hook Structure
```typescript
// ✅ Good: Focused hook
function usePrayerSupport(prayerId: number) {
  const mutation = useMutation({
    mutationFn: () => supabase.from('prayer_support').insert({ prayer_id: prayerId }),
    onSuccess: () => queryClient.invalidateQueries(['prayer', prayerId])
  });
  return mutation;
}

// ❌ Bad: God hook
function usePrayers() {
  // Fetching, creating, updating, deleting, supporting, responding...
  // 500 lines of code
}
```

### Naming Conventions
- **Components**: PascalCase (`PrayerCard`, `UserProfile`)
- **Hooks**: camelCase with `use` prefix (`usePrayers`, `useAuth`)
- **Utilities**: camelCase (`formatDistance`, `uploadMedia`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_PRAYER_LENGTH`, `DEFAULT_RADIUS`)
- **Types**: PascalCase (`Prayer`, `User`, `MediaType`)

---

## 🎯 Where to Start

### Day 1: Setup
1. Clone repo
2. Install dependencies
3. Set up Supabase
4. Run migrations
5. Start dev server
6. See map with markers

### Day 2: Core Features
7. Add authentication UI
8. Complete prayer creation
9. Implement prayer detail modal
10. Add "Prayer Sent" action

### Day 3: Media
11. Implement audio recording
12. Implement video recording
13. Add media player
14. Test on mobile

### Day 4: Responses
15. Build response form
16. Display responses
17. Test response flow

### Day 5: Notifications
18. Build notification UI
19. Implement Supabase realtime
20. Test notification flow

### Week 2: Polish
21. Glassmorphic design
22. Animations
23. Error handling
24. Loading states
25. Mobile optimization

---

## 📚 Helpful Resources

**Folder Deep Dives**:
- `/docs` - All documentation
- `/database` - SQL files and migrations
- `/src/components` - All UI components
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utilities and helpers

**Key Files to Bookmark**:
- `src/lib/types.ts` - All TypeScript types
- `src/lib/constants.ts` - Configuration values
- `docs/API_SPEC.md` - Complete API reference
- `database/schema.sql` - Database structure

---

**Ready to dive in!** 🚀

Start with `/docs/IMPLEMENTATION_GUIDE.md` for a 30-minute quick start, then build from there. The structure is designed to scale from MVP to millions of users.

Every file has a clear purpose. Every component is focused. Every abstraction is intentional.

Let's build something beautiful. 🙏✨
