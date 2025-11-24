#!/bin/bash

# PrayerMap Figma Export - Folder Preparation Script
# Run this BEFORE exporting from Figma to ensure clean organization

echo "🎯 PrayerMap Figma Export Preparation"
echo "======================================"

# Set the project directory
PROJECT_DIR="/Users/computer/jeffmichaeljohnson-tech/projects/prayermap"
ASSETS_DIR="$PROJECT_DIR/figma-assets"
ARCHIVE_DIR="$PROJECT_DIR/figma-assets-archive-$(date +%Y%m%d-%H%M%S)"

# Check if figma-assets exists and has content
if [ -d "$ASSETS_DIR" ]; then
    echo ""
    echo "📦 Found existing figma-assets directory"
    echo "   Checking for previous exports..."
    
    # Count files in subdirectories
    SCREEN_COUNT=$(find "$ASSETS_DIR/01-SCREENS" -type f 2>/dev/null | wc -l | tr -d ' ')
    COMPONENT_COUNT=$(find "$ASSETS_DIR/02-COMPONENTS" -type f 2>/dev/null | wc -l | tr -d ' ')
    ICON_COUNT=$(find "$ASSETS_DIR/03-ICONS" -type f 2>/dev/null | wc -l | tr -d ' ')
    ANIMATION_COUNT=$(find "$ASSETS_DIR/04-ANIMATIONS" -type f 2>/dev/null | wc -l | tr -d ' ')
    
    echo ""
    echo "   Previous Export Status:"
    echo "   ├── Screens: $SCREEN_COUNT files"
    echo "   ├── Components: $COMPONENT_COUNT files"
    echo "   ├── Icons: $ICON_COUNT files"
    echo "   └── Animations: $ANIMATION_COUNT files"
    
    echo ""
    echo "📁 Archiving previous exports to:"
    echo "   $ARCHIVE_DIR"
    
    # Move old directory to archive
    mv "$ASSETS_DIR" "$ARCHIVE_DIR"
    
    echo "   ✅ Previous exports archived"
fi

# Create fresh directory structure
echo ""
echo "🗂️  Creating fresh export directory structure..."

mkdir -p "$ASSETS_DIR/00-DOCUMENTATION"
mkdir -p "$ASSETS_DIR/01-SCREENS/1x"
mkdir -p "$ASSETS_DIR/01-SCREENS/2x"
mkdir -p "$ASSETS_DIR/01-SCREENS/3x"
mkdir -p "$ASSETS_DIR/01-SCREENS/webp"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/buttons"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/cards"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/inputs"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/markers"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/modals"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/toggles"
mkdir -p "$ASSETS_DIR/02-COMPONENTS/avatars"
mkdir -p "$ASSETS_DIR/03-ICONS/svg"
mkdir -p "$ASSETS_DIR/03-ICONS/png/2x"
mkdir -p "$ASSETS_DIR/03-ICONS/png/3x"
mkdir -p "$ASSETS_DIR/03-ICONS/pdf"
mkdir -p "$ASSETS_DIR/04-ANIMATIONS/loading"
mkdir -p "$ASSETS_DIR/04-ANIMATIONS/auth"
mkdir -p "$ASSETS_DIR/04-ANIMATIONS/prayer-animation"
mkdir -p "$ASSETS_DIR/04-ANIMATIONS/modals"
mkdir -p "$ASSETS_DIR/04-ANIMATIONS/micro-interactions"
mkdir -p "$ASSETS_DIR/04-ANIMATIONS/previews"
mkdir -p "$ASSETS_DIR/05-ILLUSTRATIONS/backgrounds"
mkdir -p "$ASSETS_DIR/05-ILLUSTRATIONS/decorative"
mkdir -p "$ASSETS_DIR/06-EFFECTS"
mkdir -p "$ASSETS_DIR/07-WEB-OPTIMIZED"

echo "   ✅ Directory structure created"

# Create README for each directory
cat > "$ASSETS_DIR/00-DOCUMENTATION/README.md" << 'EOF'
# PrayerMap Figma Asset Documentation

This folder contains all documentation related to the Figma exports.

## Files
- `EXPORT-MANIFEST.md` - Complete inventory of all exported assets
- `DESIGN-TOKENS.json` - Exported design tokens (colors, spacing, etc.)
- `ANIMATION-SPECS.md` - Animation timing and specifications

## Export Date
[TO BE FILLED AFTER EXPORT]
EOF

cat > "$ASSETS_DIR/01-SCREENS/README.md" << 'EOF'
# Screen Exports

All screen designs exported from Figma.

## Formats
- `/1x/` - Standard resolution
- `/2x/` - Retina (iOS @2x, Android hdpi)
- `/3x/` - Super Retina (iOS @3x, Android xhdpi)
- `/webp/` - Web-optimized format

## Naming Convention
`[order]-[screen-name]@[scale].png`

Example: `01-auth-modal@2x.png`
EOF

cat > "$ASSETS_DIR/02-COMPONENTS/README.md" << 'EOF'
# Component Exports

All reusable UI components exported from Figma.

## Folders
- `/buttons/` - All button variants and states
- `/cards/` - Glass cards and containers
- `/inputs/` - Form inputs and fields
- `/markers/` - Prayer markers for map
- `/modals/` - Modal containers and overlays
- `/toggles/` - Toggle switches and checkboxes
- `/avatars/` - User avatar components

## Naming Convention
`[component]-[variant]-[state]@2x.png`

Example: `button-primary-hover@2x.png`
EOF

cat > "$ASSETS_DIR/03-ICONS/README.md" << 'EOF'
# Icon Exports

All icons exported from Figma.

## Formats
- `/svg/` - Scalable Vector Graphics (PRIMARY for web)
- `/png/2x/` - PNG at 2x scale
- `/png/3x/` - PNG at 3x scale  
- `/pdf/` - PDF vector (for iOS native)

## Naming Convention
`icon-[name].svg`

Example: `icon-pray.svg`
EOF

cat > "$ASSETS_DIR/04-ANIMATIONS/README.md" << 'EOF'
# Animation Exports

All animations exported as Lottie JSON files.

## Folders
- `/loading/` - Loading screen animations
- `/auth/` - Authentication flow animations
- `/prayer-animation/` - Prayer send sequence animations
- `/modals/` - Modal transitions (if Lottie)
- `/micro-interactions/` - Small UI animations
- `/previews/` - MP4/GIF previews for documentation

## Naming Convention
`[animation-name].json`

Example: `loading-pulse.json`

## Implementation
```javascript
// React Native
import LottieView from 'lottie-react-native';
<LottieView source={require('./loading-pulse.json')} autoPlay loop />

// Web
import { Player } from '@lottiefiles/react-lottie-player';
<Player src="/animations/loading-pulse.json" autoplay loop />
```
EOF

echo ""
echo "📝 Created README files for each directory"

# Create the export manifest template
cat > "$ASSETS_DIR/00-DOCUMENTATION/EXPORT-MANIFEST.md" << 'EOF'
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
EOF

echo "   ✅ Created export manifest template"

# Final summary
echo ""
echo "======================================"
echo "✅ PREPARATION COMPLETE!"
echo "======================================"
echo ""
echo "📁 New directory structure created at:"
echo "   $ASSETS_DIR"
echo ""
if [ -d "$ARCHIVE_DIR" ]; then
    echo "📦 Previous exports archived at:"
    echo "   $ARCHIVE_DIR"
    echo ""
fi
echo "📋 Next Steps:"
echo "   1. Open Figma Desktop"
echo "   2. Install LottieFiles plugin (Shift+I → search 'LottieFiles')"
echo "   3. Install Lottielab plugin (Shift+I → search 'Lottielab')"
echo "   4. Follow FIGMA_EXPORT_MASTER_GUIDE.md"
echo "   5. Export to the directories created above"
echo ""
echo "🔗 Plugin Links:"
echo "   LottieFiles: https://www.figma.com/community/plugin/809860933081065308"
echo "   Lottielab:   https://www.figma.com/community/plugin/1307008445393559148"
echo ""
