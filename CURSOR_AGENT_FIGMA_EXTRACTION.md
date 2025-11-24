# CURSOR AGENT PROMPT: Figma Asset Extraction & Optimization for PrayerMap

## MISSION

You are a Senior Design Systems Engineer tasked with extracting, optimizing, and organizing ALL visual assets from PrayerMap's Figma designs at world-class quality standards. Your goal is to create a production-ready asset library that enables pixel-perfect implementation with maximum performance and zero ambiguity.

## CORE OBJECTIVE

Extract EVERY visual asset from Figma at the highest possible quality, organize into a developer-friendly structure, optimize for web/mobile performance, and document each asset's purpose and implementation guidelines. This is the DEFINITIVE visual reference that will ensure the built product matches the design vision exactly.

## PROJECT CONTEXT

**Design System:**
- Style: Glassmorphic aesthetic with heavenly colors (soft blues, purples, golds)
- Key Features:
  - 6-second cinematic prayer animation
  - Memorial lines with rainbow gradients
  - Custom prayer markers with multiple states
  - Particle effects in auth modal
  - Floating glassmorphic UI elements

**Platforms:** Web (responsive), iOS (future), Android (future)
**Target Resolutions:** Desktop (1440px+), Tablet (768-1439px), Mobile (375-767px)

**Technical Requirements:**
- React 18 + TypeScript components
- Mapbox GL JS for mapping
- Framer Motion for animations
- Tailwind CSS for styling
- Retina/HiDPI display support (2x, 3x)
- Integration with existing screenshot automation system

## PHASE 1: FIGMA AUDIT & INVENTORY

### Step 1: Access & Document Figma Structure

**Actions:**
1. Open the PrayerMap Figma file
2. Document the complete file structure:
   - List all pages
   - List all frames within each page
   - Identify component library location
   - Identify design tokens (colors, typography, spacing)
   - Note any variants or component states

**Create inventory document:** `00-FIGMA-INVENTORY.md`

**Critical Screens to Identify:**
- Loading Screen (with animation frames)
- Auth Modal (with particles in multiple states)
- Map View - Default State
- Map View - With Preview Bubble
- Map View - With Active Marker
- Prayer Detail Modal - Collapsed
- Prayer Detail Modal - Text Form Expanded
- Prayer Detail Modal - Audio State
- Prayer Detail Modal - Video State
- Request Prayer Modal - Empty
- Request Prayer Modal - Text Entry
- Request Prayer Modal - Audio Recording
- Request Prayer Modal - Video Recording
- Inbox Modal - All Tab
- Inbox Modal - Received Tab
- Inbox Modal - Sent Tab
- Inbox Modal - Empty State
- Settings Page - All Sections
- Success/Confirmation States

## PHASE 2: EXPORT CONFIGURATION

### Step 2: Set Up Optimal Export Settings

**For Full Screens (Raster):**
```
Format: PNG
Scale: 1x, 2x, 3x (export all three)
Naming: {screen-name}@{scale}x.png
Color Space: sRGB
Background: Transparent (where applicable)
Compression: None (we'll optimize later)
```

**For Components:**
```
Icons: SVG (optimized, cleaned paths)
Buttons: PNG @1x, @2x, @3x
Markers: PNG @1x, @2x, @3x with transparent background
Illustrations: SVG (if vector) or PNG @2x (if raster effects)
Glassmorphic Elements: PNG @2x with alpha channel
```

**For Animation Frames:**
```
Format: PNG sequence
Scale: 2x only (1x is unnecessary, 3x too large)
Naming: {animation-name}-frame-{number}@2x.png
Frame Rate: 30fps or 60fps (document which)
Duration: 6 seconds = 180 frames @30fps or 360 frames @60fps
```

**For Design Tokens:**
Export as JSON with complete color palette, typography, spacing, and effects.

## PHASE 3: EXTRACTION PROCESS

### Step 3: Export All Assets Systematically

**Method 1: Frame Export (For Full Screens)**
1. Select frame in Figma
2. In right panel, scroll to "Export"
3. Add export settings:
   - Click "+" to add export preset
   - Set suffix: @1x, @2x, @3x
   - Set format: PNG
   - Click "Export [Frame Name]"

**Method 2: Component Export (For Reusable Elements)**
1. Select component in Figma
2. Right-click → "Copy/Paste as" → "Copy as PNG" (@2x by default)
3. OR use Export panel with specific settings
4. For SVG icons:
   - Ensure "Outline Stroke" is checked
   - Ensure "Simplify Stroke" is checked
   - Export as SVG
   - Clean up SVG code (remove unnecessary groups, IDs)

**Method 3: Bulk Export (For Efficiency)**
- Use Figma plugin: "Batch Export" or "Export Kit"
- Configure export presets
- Select multiple frames/components
- Export all at once

**Method 4: Design Tokens Export**
- Use Figma plugin: "Design Tokens" or "Style Dictionary"
- Export color styles, text styles, effects
- Generate JSON file
- Verify all values are correct

## PHASE 4: POST-PROCESSING & OPTIMIZATION

### Step 4: Optimize All Assets

**For PNG Files:**
```bash
# Install ImageOptim CLI (Mac)
brew install imageoptim-cli

# Optimize all PNGs
imageoptim --quality 85-100 --no-imageoptim **/*.png
```

**Target Compression:**
- Screens: 100-300 KB per @2x image (aim for <200 KB)
- Components: 20-100 KB per @2x image
- Icons: <10 KB each

**For SVG Files:**
```bash
# Install SVGO
npm install -g svgo

# Optimize directory
svgo -f ./icons -o ./icons-optimized
```

**For Animation Frames:**
Create sprite sheets OR convert to video format (WebM/MP4) for 80-90% file size reduction.

## PHASE 5: ORGANIZATION & DOCUMENTATION

### Step 5: Create Production-Ready Directory Structure

```
prayermap-assets/
│
├── 00-DOCUMENTATION/
│   ├── 00-FIGMA-INVENTORY.md
│   ├── 01-ASSET-USAGE-GUIDE.md
│   ├── 02-DESIGN-TOKENS.json
│   ├── 03-COMPONENT-SPECS.md
│   ├── 04-ANIMATION-SPECS.md
│   └── 05-OPTIMIZATION-REPORT.md
│
├── 01-SCREENS/
│   ├── 1x/
│   ├── 2x/
│   └── 3x/
│
├── 02-COMPONENTS/
│   ├── buttons/
│   ├── inputs/
│   ├── markers/
│   ├── modals/
│   └── cards/
│
├── 03-ICONS/
│   ├── svg/
│   └── png/
│
├── 04-ANIMATIONS/
│   ├── prayer-animation/
│   ├── loading-animation/
│   └── particle-effects/
│
├── 05-ILLUSTRATIONS/
│   ├── backgrounds/
│   ├── patterns/
│   └── decorative/
│
├── 06-EFFECTS/
│   ├── glassmorphism/
│   ├── gradients/
│   └── shadows/
│
└── 07-WEB-OPTIMIZED/
    ├── webp/
    └── avif/
```

### Step 6: Generate WebP and AVIF Versions

```bash
# Install cwebp (WebP encoder)
brew install webp

# Convert PNG to WebP (lossy, better compression)
cwebp -q 85 input.png -o output.webp

# Batch convert
for file in 02-COMPONENTS/**/*.png; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
done
```

```bash
# Install avif encoder
npm install -g avif

# Convert PNG to AVIF
avif --input=input.png --output=output.avif --quality=85
```

## PHASE 6: INTEGRATION WITH EXISTING SYSTEM

### Step 7: Coordinate with Screenshot Automation

**Important:** We already have automated screenshot capture from the running app. Figma exports should:

1. **Complement, not duplicate** - Use Figma for:
   - Design reference (original intent)
   - Component isolation
   - Animation frame extraction
   - Design tokens
   - Icons and illustrations

2. **Use app screenshots for:**
   - Final implementation verification
   - Real-world rendering
   - Browser-specific rendering
   - Performance testing

3. **Cross-reference:**
   - Compare Figma exports with app screenshots
   - Document any discrepancies
   - Ensure pixel-perfect implementation

**Integration Points:**
- Figma assets → Design system reference
- App screenshots → Implementation verification
- Both → Complete documentation

## PHASE 7: DOCUMENTATION

### Step 8: Create Asset Usage Guide

Create comprehensive guides for:
1. **Asset Usage Guide** - How to use each asset in React/TypeScript
2. **Component Specifications** - Exact dimensions, states, interactions
3. **Animation Specifications** - Timeline, keyframes, implementation
4. **Design Tokens** - Colors, typography, spacing for Tailwind
5. **Optimization Report** - File sizes, compression stats, performance impact

**Each guide must include:**
- TypeScript/React code examples
- Tailwind CSS integration
- Mapbox GL JS integration (for map-specific assets)
- Framer Motion integration (for animations)
- Performance considerations
- Accessibility notes
- Mobile-specific considerations

## QUALITY STANDARDS

**For Each Asset:**
- ✅ Pixel-perfect to Figma design
- ✅ Multiple resolutions (@1x, @2x, @3x)
- ✅ Optimized for web (60-80% size reduction)
- ✅ Multiple formats (PNG, WebP, AVIF, SVG)
- ✅ Documented with usage examples
- ✅ Tested on retina and non-retina displays
- ✅ Validated in Chrome, Safari, Firefox
- ✅ Mobile-optimized versions

## EXECUTION CHECKLIST

### Phase 1: Audit
- [ ] Access Figma file
- [ ] Document page structure
- [ ] List all frames
- [ ] List all components
- [ ] Extract design tokens
- [ ] Create inventory document

### Phase 2: Configuration
- [ ] Set up export presets for screens
- [ ] Set up export presets for components
- [ ] Set up export presets for icons
- [ ] Set up export presets for animations
- [ ] Configure SVG export settings

### Phase 3: Extraction
- [ ] Export all screens (@1x, @2x, @3x)
- [ ] Export all components (@1x, @2x, @3x)
- [ ] Export all icons (SVG + PNG)
- [ ] Export animation frames
- [ ] Export design tokens (JSON)

### Phase 4: Optimization
- [ ] Optimize PNGs (ImageOptim/TinyPNG)
- [ ] Optimize SVGs (SVGO)
- [ ] Create WebP versions
- [ ] Create AVIF versions
- [ ] Create sprite sheets for animations
- [ ] Convert animations to video

### Phase 5: Organization
- [ ] Create directory structure
- [ ] Move files to correct locations
- [ ] Rename files according to convention
- [ ] Verify all files present
- [ ] Create missing files if needed

### Phase 6: Documentation
- [ ] Complete asset inventory
- [ ] Create usage guide
- [ ] Document component specifications
- [ ] Document animation specifications
- [ ] Generate optimization report
- [ ] Create design tokens documentation

### Phase 7: Integration
- [ ] Cross-reference with app screenshots
- [ ] Document discrepancies
- [ ] Create comparison guide
- [ ] Ensure consistency

### Phase 8: Quality Assurance
- [ ] Visual comparison (optimized vs original)
- [ ] Test on retina displays
- [ ] Test on non-retina displays
- [ ] Test in multiple browsers
- [ ] Test on mobile devices
- [ ] Run Lighthouse audit

### Phase 9: Delivery
- [ ] Upload to GitHub repository
- [ ] Upload to Claude Project Knowledge
- [ ] Share summary with team
- [ ] Provide access instructions
- [ ] Archive original Figma exports

## SUCCESS CRITERIA

✅ **Complete:** All assets extracted at highest quality
✅ **Organized:** Assets in developer-friendly structure
✅ **Optimized:** 60-80% file size reduction
✅ **Documented:** Comprehensive usage guides created
✅ **Integrated:** Coordinated with screenshot automation
✅ **Tested:** All assets validated on multiple devices/browsers
✅ **Delivered:** Assets uploaded to repository and Claude
✅ **Performance:** Lighthouse Performance score 95+ with assets

## TECHNICAL INTEGRATION NOTES

**React/TypeScript Integration:**
- All code examples must be TypeScript-compatible
- Use React 18 patterns (hooks, Suspense)
- Include proper type definitions
- Follow existing code style

**Tailwind CSS Integration:**
- Design tokens must map to Tailwind config
- Include custom utility classes
- Document color palette usage
- Provide spacing scale

**Mapbox GL JS Integration:**
- Map-specific assets (markers, overlays)
- Custom layer styling
- Popup/marker integration
- Performance considerations

**Framer Motion Integration:**
- Animation sequences
- Transition specifications
- Performance optimization
- Reduced motion support

## BEGIN EXTRACTION

Start immediately with Phase 1. Work systematically through each phase, checking off items as you complete them.

**Remember:** World-class quality comes from attention to detail. Every asset must be:
- Pixel-perfect to the Figma design
- Optimized for web performance
- Documented for developer clarity
- Tested across devices and browsers
- Integrated with existing development workflow

**GO.** Extract the DEFINITIVE visual asset library for PrayerMap.

