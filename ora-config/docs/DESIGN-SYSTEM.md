# PrayerMap Design System

## Colors
- `heavenly-blue`: #E8F4F8 (backgrounds)
- `dawn-gold`: #F7E7CE (accents)
- `prayer-purple`: #D4C5F9 (highlights)
- `prayer-active`: #4A90E2 (interactive)
- `text-primary`: #2C3E50

## Glassmorphic Classes
```tsx
className="glass rounded-2xl p-6"        // Light glass
className="glass-strong rounded-3xl p-8" // Strong glass
```

## Animations
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
whileHover={{ scale: 1.02 }}
```

## Touch Targets
Minimum 44x44 points for mobile.
