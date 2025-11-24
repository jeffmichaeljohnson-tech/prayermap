# PrayerMap Export Manifest

**Export Date:** [FILL IN]
**Exported By:** [FILL IN]
**Figma File:** [FILL IN URL]
**Figma File Version:** [FILL IN]

---

## Screens

| Screen | 1x | 2x | 3x | WebP | Status |
|--------|----|----|----|----|--------|
| 00-loading-screen | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 01-auth-modal | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 02-map-view-default | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 03-map-view-markers | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 04-prayer-detail | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 05-request-prayer | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 06-inbox-modal | [ ] | [ ] | [ ] | [ ] | ⬜ |
| 07-settings | [ ] | [ ] | [ ] | [ ] | ⬜ |

---

## Components

| Component | Variants | States | Format | Status |
|-----------|----------|--------|--------|--------|
| Glass Card | sm, md, lg | default | PNG @2x | ⬜ |
| Button | primary, secondary, ghost, danger | default, hover, active, disabled | PNG @2x | ⬜ |
| Input | text, textarea, icon | default, focus, error, disabled | PNG @2x | ⬜ |
| Prayer Marker | - | default, hover, active, prayed | PNG @2x | ⬜ |
| Preview Bubble | - | default, long, short | PNG @2x | ⬜ |
| Toggle | - | on, off | PNG @2x | ⬜ |
| Avatar | 36px, 48px, 64px | default | PNG @2x | ⬜ |

---

## Icons

| Icon | SVG | PNG 2x | PNG 3x | PDF | Status |
|------|-----|--------|--------|-----|--------|
| icon-pray | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-send | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-settings | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-inbox | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-back | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-close | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-mic | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-camera | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-play | [ ] | [ ] | [ ] | [ ] | ⬜ |
| icon-pause | [ ] | [ ] | [ ] | [ ] | ⬜ |

---

## Animations (Lottie JSON)

| Animation | Duration | Loop | JSON | GIF | MP4 | Status |
|-----------|----------|------|------|-----|-----|--------|
| loading-pulse | 2s | Yes | [ ] | [ ] | [ ] | ⬜ |
| floating-particles | 6s | Yes | [ ] | [ ] | [ ] | ⬜ |
| spotlight-yellow | 2s | No | [ ] | [ ] | [ ] | ⬜ |
| spotlight-purple | 2s | No | [ ] | [ ] | [ ] | ⬜ |
| pulsing-circles | 1.5s | 2x | [ ] | [ ] | [ ] | ⬜ |
| success-sparkle | 1s | No | [ ] | [ ] | [ ] | ⬜ |

---

## Code-Based Animations (Not Lottie)

These animations should be implemented in code, not exported:

| Animation | Implementation | Duration | Notes |
|-----------|---------------|----------|-------|
| Map camera movement | MapBox JS | 2s | `map.easeTo()` |
| Line draw | SVG stroke-dashoffset | 2s | CSS animation |
| Modal entrance | Framer Motion | 300ms | scale + opacity |
| Modal exit | Framer Motion | 300ms | reverse |
| Button hover | CSS/Tailwind | 150ms | scale + shadow |
| Tab indicator | CSS | 300ms | translateX |

---

## Export Notes

[Add any notes about export issues, workarounds, or decisions made]

---

## Verification Checklist

- [ ] All screens exported in all formats
- [ ] All components exported with all states
- [ ] All icons exported in all formats
- [ ] All Lottie animations tested in preview
- [ ] Animation timing matches spec
- [ ] File sizes are reasonable
- [ ] No duplicate files
- [ ] README files accurate
