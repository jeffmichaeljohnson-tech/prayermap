# PrayerMap Supabase Reference

Quick reference for Supabase operations.

## Tables

| Table | Purpose |
|-------|---------|
| `prayers` | Prayer requests with location |
| `prayer_responses` | Responses to prayers |
| `prayer_connections` | Visual map connections |
| `profiles` | User profiles |

## Key RPC Functions

- `create_prayer(...)` - Create with PostGIS location
- `get_nearby_prayers(lat, lng, radius)` - Geospatial query
- `create_prayer_connection(...)` - Create map connection
- `mark_response_as_read(id)` - Update inbox

## Query Pattern

```typescript
const { data, error } = await supabase
  .from('prayers')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

## Subscription Pattern

```typescript
const channel = supabase
  .channel('prayers')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'prayers' },
    () => refetchData()
  )
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```
