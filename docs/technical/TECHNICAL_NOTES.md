# 🔧 PrayerMap Technical Notes

**Important technical details for developers**

---

## 📏 Distance Units

### Overview

PrayerMap uses a **dual-unit system** where:
- **User-facing display**: Always **MILES**
- **Database storage**: Always **KILOMETERS**

### Conversion

**Formula**: `kilometers = miles × 1.60934`

**Common Conversions**:
- 1 mile = 1.60934 km
- 5 miles = 8.05 km (≈ 8 km)
- 10 miles = 16.09 km (≈ 16 km)
- 15 miles = 24.14 km (≈ 24 km)
- 30 miles = 48.28 km (≈ 48 km) ← **Default**
- 50 miles = 80.47 km (≈ 80 km)
- 100 miles = 160.93 km (≈ 161 km) ← **Maximum**

### Default Radius

- **User Display**: 30 miles
- **Database Value**: 48 km
- **Column**: `users.notification_radius_km` (DEFAULT: 48)

### Maximum Radius

- **User Display**: 100 miles
- **Database Value**: 161 km
- **Constraint**: `notification_radius_km <= 161`

### Implementation

**Frontend (React/TypeScript)**:
```typescript
// User selects radius in miles
const radiusMiles = 30;

// Convert to km for database
const radiusKm = Math.round(radiusMiles * 1.60934); // 48

// Call database function
await supabase.rpc('get_prayers_within_radius', {
  lat: userLat,
  lng: userLng,
  radius_km: radiusKm // Pass km value
});
```

**Backend (PostgreSQL Function)**:
```sql
-- Function accepts radius in KILOMETERS
CREATE FUNCTION get_prayers_within_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 48 -- 30 miles
)
```

**Display Distance**:
```typescript
// Database returns distance_km
const distanceKm = prayer.distance_km; // e.g., 12.5

// Convert to miles for display
const distanceMiles = (distanceKm / 1.60934).toFixed(1); // "7.8 miles"
```

### Settings UI

**Notification Radius Options** (shown to user in miles):
- 1 mile (stored as 1.6 km)
- 5 miles (stored as 8 km)
- 10 miles (stored as 16 km)
- 15 miles (stored as 24 km)
- 30 miles (stored as 48 km) ← Default
- 50 miles (stored as 80 km)

**Implementation**:
```typescript
const RADIUS_OPTIONS = [
  { miles: 1, km: 2 },
  { miles: 5, km: 8 },
  { miles: 10, km: 16 },
  { miles: 15, km: 24 },
  { miles: 30, km: 48 }, // Default
  { miles: 50, km: 80 },
];

// When user selects radius
function updateNotificationRadius(miles: number) {
  const option = RADIUS_OPTIONS.find(r => r.miles === miles);
  await supabase
    .from('users')
    .update({ notification_radius_km: option.km })
    .eq('user_id', userId);
}
```

### Why This Design?

1. **User Experience**: US users expect miles (imperial system)
2. **Database Consistency**: PostGIS works best with metric (kilometers)
3. **International Ready**: Easy to add km display for international users later
4. **Precision**: Kilometers provide more precise storage for geospatial calculations

---

## 🗄️ Database Schema Notes

### Column Naming

All distance-related columns use `_km` suffix:
- `notification_radius_km` (not `notification_radius_miles`)
- `distance_km` (returned from functions)

### Function Parameters

All geospatial functions accept kilometers:
- `get_prayers_within_radius(radius_km INTEGER)`
- `prayer_distance_km(prayer_id_1, prayer_id_2)`

---

## ✅ Verification Checklist

When implementing distance features:

- [ ] UI always displays "miles" to users
- [ ] Database always stores kilometers
- [ ] Conversion happens in frontend before API calls
- [ ] Conversion happens in frontend after receiving data
- [ ] Comments explain the conversion
- [ ] Default value is 48 km (30 miles)
- [ ] Max value is 161 km (100 miles)
- [ ] Settings page shows miles but saves km

---

**Last Updated**: November 2025  
**Version**: 2.0

