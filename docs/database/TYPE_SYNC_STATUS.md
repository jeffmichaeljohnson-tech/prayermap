# Database Type Synchronization Status

## Current Status: ⚠️ Types Need Updating

**Last Schema Update:** 2025-11-29 (Database Optimization Sprint)
**Last Type Regeneration:** Unknown (manual types in use)

## New Functions Requiring Type Definitions

The following RPC functions were added but are **not yet reflected** in `/home/user/prayermap/src/types/database.ts`:

### ❌ Missing Type Definitions

1. **get_all_prayers(limit_count)**
   - Migration: `017_add_limit_to_get_all_prayers.sql`
   - Status: Function deployed, types missing

2. **get_all_connections(limit_count)**
   - Migration: `018_add_get_all_connections.sql`
   - Status: Function deployed, types missing

3. **get_prayers_paginated(page_size, cursor_id, cursor_created_at)**
   - Migration: `019_add_cursor_pagination.sql`
   - Status: Function deployed, types missing

4. **get_performance_stats(start_date, end_date)**
   - Migration: `020_add_performance_monitoring.sql`
   - Status: Function deployed, types missing

### ✅ Existing Type Definitions

Currently defined in `src/types/database.ts`:
- `get_nearby_prayers` (with optimized limit_count parameter)
- `create_prayer_connection`
- `cleanup_expired_connections`

## Action Required

### Option 1: Automatic Type Generation (Recommended)

```bash
# Generate types from production database
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Verify types compile
npx tsc --noEmit
```

### Option 2: Manual Type Addition

Copy the type definitions from [TYPE_REGENERATION.md](./TYPE_REGENERATION.md) section "Manual Type Definition Template" into `src/types/database.ts`.

**Estimated Time:** 5 minutes

## Current Type File Analysis

**Location:** `/home/user/prayermap/src/types/database.ts`

**Current Contents:**
- ✅ Tables: prayers, prayer_responses, prayer_connections
- ✅ Functions: get_nearby_prayers, create_prayer_connection, cleanup_expired_connections
- ❌ New Functions: Missing 4 new RPC functions
- ⚠️ Geography Types: Using `unknown` (acceptable, but could use helper types)

## Recommended NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "db:types": "npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts",
    "db:types:local": "npx supabase gen types typescript --local > src/types/database.ts",
    "db:types:verify": "npx tsc --noEmit",
    "db:sync": "npm run db:types && npm run db:types:verify"
  }
}
```

**Usage:**
```bash
# Regenerate types from production
npm run db:types

# Regenerate from local Supabase
npm run db:types:local

# Verify types compile
npm run db:types:verify

# Full sync and verify
npm run db:sync
```

## Impact of Missing Types

### Current Impact: ⚠️ Medium

**What's Working:**
- Functions can still be called using generic RPC syntax
- TypeScript won't error, but no autocomplete/type safety

**What's Not Working:**
- No autocomplete for new function arguments
- No return type inference
- Increased risk of runtime errors from typos
- Harder to discover available functions

### Example: Without Types

```typescript
// ❌ No autocomplete, no type safety
const { data, error } = await supabase.rpc('get_all_prayers', {
  limit_count: 100  // Typo here won't be caught!
});

// data type is unknown, no autocomplete
console.log(data[0].title);  // Could error at runtime
```

### Example: With Types

```typescript
// ✅ Full autocomplete and type safety
const { data, error } = await supabase.rpc('get_all_prayers', {
  limit_count: 100  // Autocomplete suggests parameter
});

// data type is inferred automatically
console.log(data[0].title);  // Type-safe, autocomplete works
```

## Migration Path

### Step 1: Backup Current Types
```bash
cp src/types/database.ts src/types/database.backup.ts
```

### Step 2: Regenerate Types
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### Step 3: Verify No Breaking Changes
```bash
npx tsc --noEmit
```

### Step 4: Test Type Imports
```bash
# Run build to ensure all imports work
npm run build
```

### Step 5: Update Services (if needed)

Check these files for RPC usage:
- `/home/user/prayermap/src/services/prayerService.ts`
- `/home/user/prayermap/src/services/userService.ts`
- `/home/user/prayermap/src/hooks/usePrayers.ts`

## Documentation References

| Document | Purpose | Status |
|----------|---------|--------|
| [TYPE_REGENERATION.md](./TYPE_REGENERATION.md) | Complete type regeneration guide | ✅ Up to date |
| [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md) | Database function reference | ℹ️ Check if exists |
| [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) | Performance optimization guide | ℹ️ Check if exists |
| [NEARBY_PRAYERS_OPTIMIZATION.md](./NEARBY_PRAYERS_OPTIMIZATION.md) | Specific optimization example | ✅ Exists |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Quick command reference | ✅ Up to date |

## Next Steps

### Immediate (Required)
1. ✅ Type regeneration guide created
2. ⏳ Regenerate types from production database
3. ⏳ Add npm scripts to package.json
4. ⏳ Verify types compile

### Short-term (Recommended)
1. ⏳ Update services to use new typed functions
2. ⏳ Add type safety tests
3. ⏳ Document type regeneration in CI/CD pipeline

### Long-term (Nice to Have)
1. ⏳ Automate type regeneration on schema changes
2. ⏳ Add type validation to pre-commit hooks
3. ⏳ Create type changelog for breaking changes

## Questions & Support

**Q: Do I need to regenerate types for every migration?**
A: Only if the migration adds/modifies RPC functions, tables, or views. Column additions within existing tables may not require regeneration.

**Q: What if automatic generation fails?**
A: Use the manual type definitions provided in [TYPE_REGENERATION.md](./TYPE_REGENERATION.md).

**Q: How do I get the Supabase project ID?**
A: Find it in the Supabase dashboard URL or in your `.env` file as `VITE_SUPABASE_PROJECT_ID`.

**Q: Can I use the types from local Supabase?**
A: Yes, use `npm run db:types:local`, but ensure local schema matches production.

---

**Created:** 2025-11-29
**Author:** Supabase Types Regeneration Agent
**Sprint:** Database Optimization for Mobile Performance
**Priority:** Medium (no runtime errors, but limits type safety)
