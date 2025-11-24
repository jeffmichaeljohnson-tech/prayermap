# Figma Asset Extraction - Quick Start Guide

## Overview

This guide provides a streamlined approach to extracting high-quality assets from Figma for PrayerMap development.

## Prerequisites

1. **Access to PrayerMap Figma file**
2. **Figma Desktop App** (recommended for better export quality)
3. **Required Tools:**
   - ImageOptim (Mac) or TinyPNG (Web)
   - SVGO (for SVG optimization)
   - cwebp (for WebP conversion)
   - FFmpeg (for video conversion)

## Quick Extraction Workflow

### 1. Initial Setup (5 minutes)

```bash
# Install optimization tools
brew install imageoptim-cli webp svgo ffmpeg
npm install -g avif
```

### 2. Export Priority Order

**High Priority (Do First):**
1. Design Tokens (colors, typography, spacing)
2. Icons (SVG format)
3. Prayer Marker components (all states)
4. Loading screen
5. Auth modal

**Medium Priority:**
6. All screen frames (@2x resolution)
7. UI components (buttons, inputs, cards)
8. Animation frames

**Low Priority:**
9. Illustrations and decorative elements
10. Multiple resolution variants (@1x, @3x)

### 3. Export Settings

**For Screens:**
- Format: PNG
- Scale: @2x (primary), @1x and @3x (optional)
- Background: Transparent where applicable

**For Icons:**
- Format: SVG (preferred) or PNG @2x
- Stroke: Outline and simplify
- Clean paths: Remove unnecessary groups

**For Components:**
- Format: PNG @2x
- Background: Transparent
- Include all states (default, hover, active, disabled)

### 4. Quick Optimization

```bash
# Navigate to exports folder
cd ~/Downloads/prayermap-exports/figma-assets

# Optimize PNGs
find . -name "*.png" -exec imageoptim {} \;

# Optimize SVGs
svgo -f ./icons -o ./icons-optimized

# Convert to WebP
for file in **/*.png; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
done
```

### 5. Organization

Create this structure:
```
figma-assets/
├── design-tokens.json
├── icons/
│   └── svg/
├── components/
│   └── markers/
├── screens/
│   └── 2x/
└── animations/
    └── frames/
```

## Integration with Existing Screenshots

**Figma Assets Use Cases:**
- Design reference and specifications
- Component isolation for development
- Animation frame extraction
- Design token extraction
- Icon library

**App Screenshots Use Cases:**
- Implementation verification
- Real-world rendering reference
- Browser-specific testing
- Performance benchmarking

**Best Practice:** Use both together:
- Figma → "What should it look like?"
- Screenshots → "What does it actually look like?"

## Quality Checklist

Before considering extraction complete:

- [ ] All critical screens exported
- [ ] All icons exported as SVG
- [ ] Design tokens extracted to JSON
- [ ] Components exported with all states
- [ ] Animation frames extracted (if applicable)
- [ ] Files optimized (60%+ size reduction)
- [ ] WebP versions created
- [ ] Files organized in proper structure
- [ ] Documentation created
- [ ] Cross-referenced with app screenshots

## Common Issues & Solutions

**Issue:** Exported images are blurry
**Solution:** Ensure @2x or @3x scale is selected, check Figma zoom level

**Issue:** SVG files are too large
**Solution:** Run SVGO optimization, remove unnecessary groups/IDs

**Issue:** Animation frames too many/large
**Solution:** Export key frames only, or convert to video format

**Issue:** Design tokens incomplete
**Solution:** Use Figma plugin "Design Tokens" for comprehensive export

## Next Steps

1. Complete high-priority exports
2. Optimize and organize assets
3. Create usage documentation
4. Integrate with development workflow
5. Test in application

## Support

For detailed instructions, see: `CURSOR_AGENT_FIGMA_EXTRACTION.md`

