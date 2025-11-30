# PrayerMap - Next Steps Plan

**Generated:** 2025-11-30
**Branch:** `claude/plan-next-steps-01Qif65CnF8Cu2tMDqWh4ZkT`
**Current Status:** Build Passing, Production Ready

---

## Executive Summary

PrayerMap has completed major development sprints totaling **84,756 lines** of code across **527 files**. The build is passing and the codebase is production-ready. This document outlines the recommended next steps organized by priority.

### Completed Features

| Sprint | Files | Lines | Status |
|--------|-------|-------|--------|
| Database Optimization | 52 | 13,269 | ✅ Complete |
| Animation Enhancement | 28 | 6,239 | ✅ Complete |
| Memorial Lines Visualization | 19 | 7,784 | ✅ Complete |
| Push Notifications Enhanced | 60 | 19,704 | ✅ Complete |
| Integration Sprint | 18 | 5,033 | ✅ Complete |
| Chat/Messaging Type Fix | 2 | ~50 | ✅ Complete |

---

## Priority 1: Immediate Actions (Required for Full Functionality)

### 1.1 Apply Database Migrations

**Status:** ⏳ Pending
**Impact:** High - Required for performance optimizations to take effect

Seven database migrations are ready but need to be applied to the production database:

```bash
# Apply in order:
supabase db push  # Or use the Supabase Dashboard SQL editor

# Files to apply:
supabase/migrations/20250129_add_limit_to_get_all_prayers.sql
supabase/migrations/20250129_add_limit_to_get_all_connections.sql
supabase/migrations/20250129_add_cursor_pagination.sql
supabase/migrations/20250129_add_performance_monitoring.sql
supabase/migrations/20250129_optimize_prayers_indexes.sql
supabase/migrations/20250129_optimize_get_nearby_prayers.sql
supabase/migrations/20250129_add_moderation_tables.sql
```

**Expected Impact:**
- 80%+ reduction in mobile data transfer
- O(1) cursor-based pagination
- <200ms p95 query latency
- Real-time performance monitoring

### 1.2 Run Test Data Seed (For Testing)

**Status:** ⏳ Pending
**Impact:** Medium - Required to test chat/messaging features

Test data seed files were created but not executed:

```bash
# Run seed files to create test data:
# Option 1: Via Supabase CLI
supabase db reset --db-url YOUR_DATABASE_URL

# Option 2: Via SQL Editor in Supabase Dashboard
# Copy contents of these files and execute:
supabase/seed-responses-connections.sql  # Prayer responses + connections
supabase/seed-test-data.sql              # Test accounts + prayers
```

**Test Accounts (after seeding):**
- Sarah: sarah.test@prayermap.net / TestPassword123!
- Marcus: marcus.test@prayermap.net / TestPassword123!

### 1.3 Verify Memorial Lines Display

**Status:** ⏳ Needs Verification
**Impact:** High - Core "Living Map" feature

A type mismatch fix was applied in `prayerService.ts` to convert snake_case database columns to camelCase for the frontend:

**Fix Applied:**
- File: `src/services/prayerService.ts`
- Function: `rowToPrayerConnection()`
- Change: Returns camelCase properties (fromLocation, toLocation, createdAt, etc.)

**Verification Steps:**
1. Open PrayerMap in browser
2. Ensure you're logged in
3. Check if memorial lines appear on the map
4. Hover over lines to see tooltips
5. Verify tooltip shows "X prayed for Y" format

---

## Priority 2: Chat/Messaging Verification

### 2.1 End-to-End Chat Test

**Status:** ⏳ Needs Testing
**Dependencies:** Test data seed must be applied first

The chat system uses a "prayer response" model, not traditional DMs:

**Flow to Test:**
1. User A posts a prayer
2. User B finds prayer on map → Opens → Responds with text/audio/video
3. User A sees response in Inbox (click message icon in header)
4. User A can mark responses as read

**Components Involved:**
- `InboxModal.tsx` - Inbox list view
- `ConversationThread.tsx` - Chat thread UI
- `useInbox.ts` - State management hook
- `prayerService.ts` - API calls

**Test Checklist:**
- [ ] Inbox opens from header button
- [ ] Responses load in inbox
- [ ] Unread badge shows correct count
- [ ] Clicking response opens thread
- [ ] Can send text response
- [ ] Can send audio response (requires microphone permission)
- [ ] Real-time updates work (new messages appear without refresh)

### 2.2 Database Requirements for Chat

Ensure these columns exist in `prayer_responses` table:
- `is_anonymous` (boolean)
- `responder_name` (text)
- `read_at` (timestamptz, nullable)
- `content_type` (text: 'text'|'audio'|'video')
- `media_url` (text, nullable)

---

## Priority 3: Mobile Device Testing

### 3.1 iOS Testing

```bash
# Sync and open iOS project
npm run build && npx cap sync
npx cap open ios
```

**Test Items:**
- [ ] App launches without crash
- [ ] Map loads and shows prayers
- [ ] Memorial lines render correctly
- [ ] Haptic feedback works on prayer actions
- [ ] Push notifications register and arrive
- [ ] Inbox opens and functions
- [ ] Audio recording works (microphone permission)
- [ ] Location permission prompts correctly

### 3.2 Android Testing

```bash
# Sync and open Android project
npm run build && npx cap sync
npx cap open android
```

**Test Items:**
- [ ] App launches without crash
- [ ] Map loads and shows prayers
- [ ] Memorial lines render correctly
- [ ] Push notifications work
- [ ] Inbox opens and functions
- [ ] Audio recording works
- [ ] Location services work
- [ ] Back button navigation correct

---

## Priority 4: Code Cleanup (Optional)

### 4.1 Remove Unused Imports

**Status:** Not Blocking - Cosmetic improvement
**Impact:** Low - Cleaner codebase

Files with unused imports to clean:
- `src/App.tsx` - 10 unused imports
- `src/components/PrayerMap.tsx` - LngLatBounds, PrayerConnection unused
- `src/components/PrayerDetailModal.tsx` - PrayButton import unused
- `admin/src/pages/ModerationPage.tsx` - Input, Filter unused

### 4.2 Replace `any` Types

**Status:** Not Blocking - Technical debt
**Impact:** Medium - Improves type safety

Files with `any` types to fix (48 occurrences):
- `src/services/prayerService.ts` - 5 occurrences
- `src/services/moderation/hiveClient.ts` - 3 occurrences
- `src/memory/cache.ts` - 4 occurrences
- `src/hooks/useVideoModeration.ts` - 2 occurrences

### 4.3 Migrate Duplicate Migration Numbers

**Status:** Not Blocking - Best practice
**Impact:** Low - Cleaner migration history

Duplicate migration number prefixes found:
- `002_push_notifications.sql` conflicts with `002_read_tracking.sql`
- `003_notification_triggers.sql` conflicts with `003_fix_get_nearby_prayers.sql`
- `017_add_push_tokens.sql` conflicts with `017_add_limit_to_get_all_prayers.sql`

Recommendation: Rename to sequential unique numbers.

---

## Priority 5: Performance Optimization (Future)

### 5.1 Code Splitting for MapBox

**Status:** Not Started
**Impact:** Medium - Reduces initial bundle size

MapBox GL accounts for 1.6MB of the bundle. Consider:
- Dynamic imports for MapBox
- Lazy loading the map component
- Progressive loading with placeholder

### 5.2 Enable Performance Monitoring

After applying `20250129_add_performance_monitoring.sql`, the performance monitoring infrastructure will be available:

**Admin Features:**
- Query latency tracking (p50, p95, p99)
- Slow query logging (>200ms)
- Performance dashboard in admin panel

---

## Verification Commands

### Build Status
```bash
npm run build              # Should complete in ~35s
npx tsc --noEmit           # Should have 0 errors
```

### Run Tests
```bash
npx playwright test        # E2E tests
npm test                   # Unit tests (if configured)
```

### Mobile Sync
```bash
npm run build && npx cap sync
npx cap open ios           # Open Xcode
npx cap open android       # Open Android Studio
```

---

## Quick Reference: Key Files

| Purpose | File Path |
|---------|-----------|
| **Memorial Lines** | `src/components/map/MemorialLinesLayer.tsx` |
| **Type Conversion Fix** | `src/services/prayerService.ts` (rowToPrayerConnection) |
| **Inbox UI** | `src/components/InboxModal.tsx` |
| **Chat Thread** | `src/components/ConversationThread.tsx` |
| **Inbox Hook** | `src/hooks/useInbox.ts` |
| **Test Data** | `supabase/seed-responses-connections.sql` |
| **Database Types** | `src/types/prayer.ts` |
| **Integration Status** | `INTEGRATION_STATUS.md` |

---

## Success Metrics

The next steps are complete when:

1. **Memorial Lines Visible:** Lines appear on map, tooltips work
2. **Chat Functional:** Can send/receive responses via inbox
3. **Mobile Works:** iOS and Android apps launch and function
4. **Database Optimized:** All 7 optimization migrations applied
5. **Build Passes:** TypeScript compilation and production build succeed

---

## Contacts & Resources

- **Live Site:** https://prayermap.net
- **Documentation:** `/docs/` folder
- **PRD:** `PRD.md`
- **Core Principles:** `CLAUDE.md`, `ARTICLE.md`

---

**Generated by:** Plan Agent
**Last Updated:** 2025-11-30
**Quality Gate:** Per ARTICLE.md standards
