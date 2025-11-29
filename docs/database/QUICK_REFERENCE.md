# Database Documentation Quick Reference

## Documentation Index

This directory contains comprehensive database documentation for PrayerMap.

### Available Guides

1. **[TYPE_REGENERATION.md](./TYPE_REGENERATION.md)** - TypeScript type generation and management
   - When to regenerate types
   - New function signatures (2025-11-29 optimization sprint)
   - Manual vs automatic generation
   - Best practices for type safety

2. **[RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)** - Database function implementation
   - Complete function reference
   - SQL implementations
   - Performance considerations
   - Testing procedures

3. **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** - Performance optimization strategies
   - Query optimization techniques
   - Index management
   - Performance monitoring
   - Troubleshooting guide

## Quick Command Reference

### Type Generation
```bash
# Generate types from remote database
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Generate from local database
npx supabase gen types typescript --local > src/types/database.ts
```

### Database Management
```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Reset database
npx supabase db reset
```

### Performance Testing
```bash
# Run performance tests
npm run test:performance

# Generate performance report
npm run test:performance:report
```

## New Functions (2025-11-29)

| Function | Purpose | Args |
|----------|---------|------|
| `get_all_prayers` | Fetch all prayers with limit | `limit_count?: number` |
| `get_all_connections` | Fetch prayer connections | `limit_count?: number` |
| `get_prayers_paginated` | Cursor-based pagination | `page_size?, cursor_id?, cursor_created_at?` |
| `get_performance_stats` | Performance metrics | `start_date?, end_date?` |

## Type File Location

**Main Types:** `/home/user/prayermap/src/types/database.ts`

## Related Files

- **Schema:** `/home/user/prayermap/prayermap_schema_v2.sql`
- **Migrations:** `/home/user/prayermap/supabase/migrations/`
- **Edge Functions:** `/home/user/prayermap/supabase/functions/`

## Support

For questions or issues:
1. Check the specific guide in this directory
2. Review the main schema file
3. Consult the Supabase documentation: https://supabase.com/docs

---

**Last Updated:** 2025-11-29
