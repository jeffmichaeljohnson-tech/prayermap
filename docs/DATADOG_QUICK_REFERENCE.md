# Datadog Quick Reference - PrayerMap

> **Quick commands and checks** for Datadog integration

---

## 🔑 Environment Variables

**File**: `.env.local` (in project root)

```env
VITE_DATADOG_APP_ID=your_app_id_here
VITE_DATADOG_CLIENT_TOKEN=your_client_token_here
VITE_DATADOG_ENABLE_DEV=true
```

---

## ✅ Quick Verification

### Check Datadog is Initialized

**Browser Console**:
```javascript
// Should see this message:
✅ Datadog RUM initialized

// Or check manually:
window.datadogRum ? '✅ Datadog loaded' : '❌ Datadog not loaded'
```

### Send Test Event

```javascript
window.datadogRum?.addAction('test.prayermap', { test: true });
```

### Check Environment Variables

```javascript
console.log('App ID:', import.meta.env.VITE_DATADOG_APP_ID);
console.log('Client Token:', import.meta.env.VITE_DATADOG_CLIENT_TOKEN ? 'Set' : 'Missing');
```

---

## 🔗 Datadog Links

- **RUM Explorer**: https://app.datadoghq.com/rum/explorer
- **RUM Performance**: https://app.datadoghq.com/rum/performance
- **RUM Errors**: https://app.datadoghq.com/rum/errors
- **Create RUM App**: https://app.datadoghq.com/rum/application/create

---

## 📊 Key Metrics to Monitor

### Living Map Requirements

- **Real-time latency**: `supabase.realtime.*` actions < 2000ms
- **Prayer witness latency**: `living_map.prayer_witness_latency` < 2000ms
- **Animation smoothness**: `living_map.animation_smoothness` = 60fps
- **Memorial line creation**: `living_map.memorial_creation_latency` < 2000ms

### Performance Targets

- **First Contentful Paint**: < 1500ms
- **Time to Interactive**: < 2000ms
- **Page Load Time**: < 2000ms
- **Animation Frame Rate**: 60fps (16.67ms per frame)

---

## 🐛 Quick Troubleshooting

### Datadog Not Initializing?

1. Check `.env.local` exists in project root
2. Verify variable names are exact (case-sensitive)
3. Restart dev server: `npm run dev`
4. Hard refresh browser: Cmd+Shift+R

### No Data in Dashboard?

1. Wait 30-60 seconds (data delay)
2. Check browser console for errors
3. Verify credentials are correct
4. Check Datadog site is `datadoghq.com`

---

## 📝 Code Usage Examples

### Track Custom Event

```typescript
import { trackEvent } from '@/lib/datadog';

trackEvent('prayer.sent', {
  prayer_id: prayer.id,
  user_id: user.id,
  location: { lat, lng }
});
```

### Track Error

```typescript
import { trackError } from '@/lib/datadog';

try {
  await someOperation();
} catch (error) {
  trackError(error as Error, {
    context: 'prayer_creation',
    user_id: user.id
  });
}
```

### Trace Supabase Query

```typescript
import { traceSupabaseQuery } from '@/lib/datadog';

const result = await traceSupabaseQuery('getPrayers', async () => {
  return await supabase.from('prayers').select('*');
});
```

---

**Last Updated**: 2024-11-30

