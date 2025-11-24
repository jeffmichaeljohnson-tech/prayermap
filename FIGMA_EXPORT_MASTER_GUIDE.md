# 🎯 PrayerMap Figma Export Master Guide

**Created:** November 2024  
**Purpose:** Complete, organized export of all Figma assets for development  
**Tools Required:** Figma, LottieFiles Plugin, Lottielab Plugin

---

## 📊 PRE-EXPORT STATUS

### Previous Export Analysis
| Folder | Status | Action Needed |
|--------|--------|---------------|
| `01-SCREENS/2x/` | ✅ 15 screens | Verify completeness |
| `02-COMPONENTS/` | ❌ Empty | Full export needed |
| `03-ICONS/` | ❌ Empty | Full export needed |
| `04-ANIMATIONS/` | ❌ Empty | **CRITICAL - Lottie export needed** |
| `05-ILLUSTRATIONS/` | ❌ Empty | Export if applicable |
| `06-EFFECTS/` | ❌ Empty | CSS-based, not asset export |
| `07-WEB-OPTIMIZED/` | ❌ Empty | Generate after export |

---

## 🚀 PHASE 1: PLUGIN INSTALLATION (5 minutes)

### Step 1.1: Install LottieFiles Plugin

1. **Open Figma** (Desktop or Web)
2. **Press `Shift + I`** to open Resources panel
3. **Click "Plugins" tab**
4. **Search:** `LottieFiles`
5. **Click "Run"** or click **⋮ → Save plugin**

**Direct Link:** https://www.figma.com/community/plugin/809860933081065308/lottiefiles

### Step 1.2: Create LottieFiles Account

1. After running plugin, click **"Sign In"**
2. Go to https://lottiefiles.com/signup
3. Create FREE account (100K+ animations access)
4. Return to Figma, sign in via plugin

### Step 1.3: Install Lottielab Plugin

1. **Press `Shift + I`** again
2. **Search:** `Lottielab`
3. **Click "Run"** or **Save plugin**

**Direct Link:** https://www.figma.com/community/plugin/1307008445393559148/lottielab

### Step 1.4: Create Lottielab Account

1. Go to https://www.lottielab.com
2. Sign up for FREE account
3. Plugin will sync automatically

### Step 1.5: Install Bulk Export Plugin (Optional but Recommended)

1. **Press `Shift + I`**
2. **Search:** `Export Frames in One Click`
3. **Save plugin**

**Direct Link:** https://www.figma.com/community/plugin/1559839081755008974/export-frames-in-one-click

---

## 🗂️ PHASE 2: FIGMA FILE PREPARATION (15 minutes)

### Step 2.1: Open Your Figma File

1. Open "PrayerMap" Figma file
2. Review all pages in the left sidebar
3. Identify:
   - Screens page(s)
   - Components page
   - Icons/Assets page
   - Animations page (if exists)

### Step 2.2: Organize Layer Naming

**Naming Convention for Export:**
```
[category]/[subcategory]/[name]

Examples:
screens/loading/initial-state
screens/map/default-view
components/buttons/primary-default
icons/navigation/settings
animations/prayer/spotlight-beam
```

**Why This Matters:**
- Figma creates folders based on `/` in names
- Exports will be auto-organized
- Cursor/Claude can find files easily

### Step 2.3: Add Export Settings to All Frames

1. **Select a frame** you want to export
2. **Right panel → scroll to "Export"**
3. **Click "+"** to add export settings
4. **Configure:**
   - **Format:** PNG (for screens/components) or SVG (for icons)
   - **Suffix:** @1x, @2x, @3x
   
**Batch Method:**
1. Select ALL frames to export (Cmd/Ctrl + Click)
2. Add export settings once
3. Settings apply to all selected

---

## 📱 PHASE 3: STATIC SCREEN EXPORT (20 minutes)

### Step 3.1: Select All Screen Frames

1. Go to your **Screens** page in Figma
2. **Select all screen frames** (Cmd/Ctrl + A on that page, or manually select)
3. Ensure all frames have proper naming:
   ```
   00-loading-screen
   01-auth-modal
   02-map-view-default
   03-map-view-with-markers
   04-prayer-detail
   05-request-prayer
   06-inbox-modal
   07-settings
   ```

### Step 3.2: Configure Export Settings

For EACH screen frame, add these export configs:

| Scale | Suffix | Format | Purpose |
|-------|--------|--------|---------|
| 1x | @1x | PNG | Standard |
| 2x | @2x | PNG | Retina |
| 3x | @3x | PNG | Super Retina |
| 1x | (none) | WebP | Web optimized |

### Step 3.3: Export Screens

**Method A: Native Export**
1. With all screens selected
2. Press **Cmd/Ctrl + Shift + E**
3. Choose destination: `figma-assets/01-SCREENS/`
4. Click **Export**

**Method B: Plugin Export (Recommended for organization)**
1. Right-click → Plugins → **Export Frames in One Click**
2. Plugin auto-organizes by sections
3. Export to `figma-assets/01-SCREENS/`

### Step 3.4: Verify Screen Exports

After export, you should have:
```
figma-assets/01-SCREENS/
├── 1x/
│   ├── 00-loading-screen.png
│   ├── 01-auth-modal.png
│   └── ...
├── 2x/
│   ├── 00-loading-screen@2x.png
│   ├── 01-auth-modal@2x.png
│   └── ...
├── 3x/
│   ├── 00-loading-screen@3x.png
│   ├── 01-auth-modal@3x.png
│   └── ...
└── webp/
    ├── 00-loading-screen.webp
    └── ...
```

---

## 🧩 PHASE 4: COMPONENT EXPORT (20 minutes)

### Step 4.1: Identify All Components

**PrayerMap Core Components:**
- [ ] Glass Card (variants: sm, md, lg)
- [ ] Button (variants: primary, secondary, ghost, danger)
- [ ] Input Field (variants: single, multi, with-icon)
- [ ] Prayer Marker (states: default, hover, active, prayed)
- [ ] Preview Bubble (variants: default, long, short, anonymous)
- [ ] Toggle Switch (states: on, off)
- [ ] Avatar (sizes: 36px, 48px, 64px)
- [ ] Modal Container
- [ ] Tab Bar
- [ ] Prayer Card (inbox item)

### Step 4.2: Export Component States

For each component, export ALL states:

1. **Select component** in Figma
2. **If it has variants**, select the component SET (parent frame)
3. Add export settings: **PNG @2x** and **SVG**
4. Name using: `components/[type]/[variant]-[state]`

**Example for Button:**
```
components/buttons/primary-default@2x.png
components/buttons/primary-hover@2x.png
components/buttons/primary-active@2x.png
components/buttons/primary-disabled@2x.png
components/buttons/secondary-default@2x.png
...
```

### Step 4.3: Export to Correct Folder

1. Press **Cmd/Ctrl + Shift + E**
2. Destination: `figma-assets/02-COMPONENTS/`
3. Export

---

## 🎨 PHASE 5: ICON EXPORT (15 minutes)

### Step 5.1: Identify All Icons

**PrayerMap Icons Needed:**
- [ ] Navigation icons (home, inbox, settings, back)
- [ ] Action icons (pray, send, record, play, pause)
- [ ] Status icons (check, error, warning, info)
- [ ] Media icons (camera, microphone, video)
- [ ] Utility icons (close, menu, more, search)
- [ ] Prayer emoji (🙏)
- [ ] Special icons (spotlight, connection line endpoints)

### Step 5.2: Configure Icon Export

For icons, export as:

| Format | Size | Purpose |
|--------|------|---------|
| SVG | Original | Web (scalable) |
| PNG @2x | 48px | iOS/Android fallback |
| PNG @3x | 72px | iOS/Android fallback |
| PDF | Original | iOS native vector |

### Step 5.3: Export Icons

1. Select all icon frames/components
2. Add export settings (SVG primary, PNG backup)
3. Press **Cmd/Ctrl + Shift + E**
4. Destination: `figma-assets/03-ICONS/`

**Expected Structure:**
```
figma-assets/03-ICONS/
├── svg/
│   ├── icon-pray.svg
│   ├── icon-send.svg
│   ├── icon-settings.svg
│   └── ...
├── png/
│   ├── 2x/
│   │   ├── icon-pray@2x.png
│   │   └── ...
│   └── 3x/
│       ├── icon-pray@3x.png
│       └── ...
└── pdf/
    ├── icon-pray.pdf
    └── ...
```

---

## ✨ PHASE 6: ANIMATION EXPORT WITH LOTTIE (30 minutes)

### THIS IS THE CRITICAL PHASE FOR YOUR APP

### Step 6.1: List All Animations Required

**From 05-INTERACTIONS-AND-ANIMATIONS.md:**

| Animation | Duration | Complexity | Export Tool |
|-----------|----------|------------|-------------|
| Loading Screen Pulse | 2s loop | Simple | LottieFiles |
| Auth Modal Particles | 6s loop | Medium | LottieFiles |
| Button Hover/Press | 150ms | Simple | CSS/Framer |
| Modal Entrance | 300ms | Simple | CSS/Framer |
| Prayer Send Spotlight | 2s | Medium | Lottielab |
| **Prayer Animation (6-sec)** | 6s | **COMPLEX** | **Lottielab** |
| Line Draw Animation | 2s | Medium | Lottielab |
| Pulsing Circles | 1.5s loop | Simple | LottieFiles |
| Tab Indicator Slide | 300ms | Simple | CSS |

### Step 6.2: Simple Animations via LottieFiles

**For: Loading Pulse, Particles, Pulsing Circles**

1. **In Figma**, select frames that make up the animation
2. **Right-click → Plugins → LottieFiles**
3. **Go to "Export to Lottie" tab**
4. **Choose:**
   - Single frame with animated presets, OR
   - Multiple frames (for frame-by-frame)
5. **Preview** the animation
6. **Click "Download"** → Choose format:
   - **Lottie JSON** (primary - smallest)
   - **dotLottie** (alternative)
   - **GIF** (fallback)
   - **MP4** (fallback)
7. **Save to:** `figma-assets/04-ANIMATIONS/`

### Step 6.3: Complex Animations via Lottielab

**For: Prayer Animation (6-second), Spotlight, Line Draw**

1. **In Figma**, select the frames/elements for animation
2. **Right-click → Plugins → Lottielab**
3. **Click "Import to Lottielab"**
4. **Opens Lottielab web editor**

**In Lottielab Editor:**

5. **Build Animation Timeline:**
   - Add keyframes for position, scale, opacity, rotation
   - Set easing curves
   - Preview in real-time

6. **For Prayer Animation (6 seconds):**
   ```
   TIMELINE BREAKDOWN:
   0-2s: Camera movement (map pan/zoom - may need code, not Lottie)
   2-4s: Line draw animation
   4-6s: Spotlight beams + return
   ```
   
   **Note:** The camera movement is MapBox-controlled via JavaScript. 
   Export the **visual overlay effects** as Lottie:
   - Spotlight beams (2 separate Lottie files)
   - Pulsing circles (1 Lottie file)
   - Line drawing (SVG animation via code is better)

7. **Export from Lottielab:**
   - Click **"Export"** button
   - Choose **"Lottie JSON"**
   - Download file
   - Save to `figma-assets/04-ANIMATIONS/`

### Step 6.4: Animation File Naming Convention

```
figma-assets/04-ANIMATIONS/
├── loading/
│   ├── loading-pulse.json          ← Lottie JSON
│   ├── loading-pulse.gif           ← Fallback
│   └── loading-pulse-preview.mp4   ← For documentation
├── auth/
│   ├── floating-particles.json
│   └── floating-particles.gif
├── prayer-animation/
│   ├── spotlight-yellow.json       ← Prayer location beam
│   ├── spotlight-purple.json       ← User location beam
│   ├── pulsing-circles.json        ← Endpoint pulses
│   ├── success-sparkle.json        ← ✨ animation
│   └── prayer-complete-preview.mp4 ← Full sequence preview
├── modals/
│   ├── modal-enter.json            ← (if needed, usually CSS)
│   └── modal-exit.json
└── micro-interactions/
    ├── button-press.json           ← (usually CSS better)
    └── tab-switch.json             ← (usually CSS better)
```

### Step 6.5: Test Lottie Files

**Before finalizing, test each Lottie file:**

1. Go to https://lottiefiles.com/preview
2. Drag & drop your JSON file
3. Verify:
   - Animation plays correctly
   - Loop works (if intended)
   - Colors are correct
   - Timing matches spec

---

## 🔧 PHASE 7: FINAL ORGANIZATION & VERIFICATION (15 minutes)

### Step 7.1: Create Export Manifest

After all exports, create an inventory file:

```
figma-assets/EXPORT-MANIFEST.md

# PrayerMap Export Manifest
**Export Date:** [DATE]
**Exported By:** [NAME]
**Figma File Version:** [VERSION/DATE]

## Screens (15 total)
- [x] 00-loading-screen (1x, 2x, 3x, webp)
- [x] 01-auth-modal (1x, 2x, 3x, webp)
- [x] 02-map-view-default
- [x] 03-map-view-with-markers
- [x] 04-prayer-detail
- [x] 05-request-prayer
- [x] 06-inbox-modal
- [x] 07-settings
...

## Components
- [x] Glass Card (all variants)
- [x] Button (all states)
...

## Icons (SVG + PNG)
- [x] icon-pray
- [x] icon-send
...

## Animations (Lottie JSON)
- [x] loading-pulse.json (2s, loop)
- [x] floating-particles.json (6s, loop)
- [x] spotlight-yellow.json (2s, once)
- [x] spotlight-purple.json (2s, once)
- [x] pulsing-circles.json (1.5s, 2x)
- [x] success-sparkle.json (1s, once)

## Not Exported (Code-Based)
- Camera movement (MapBox JavaScript)
- Line drawing (SVG stroke-dashoffset)
- Modal transitions (Framer Motion)
- Button hovers (Tailwind/CSS)
```

### Step 7.2: Archive Previous Exports

If there are conflicting files from previous exports:

```bash
# In terminal, from prayermap directory:
mv figma-assets figma-assets-archive-$(date +%Y%m%d)
mkdir -p figma-assets/{01-SCREENS/{1x,2x,3x,webp},02-COMPONENTS,03-ICONS/{svg,png},04-ANIMATIONS/{loading,auth,prayer-animation,modals,micro-interactions},05-DOCUMENTATION}
```

### Step 7.3: Final Folder Structure

```
figma-assets/
├── 00-DOCUMENTATION/
│   ├── EXPORT-MANIFEST.md
│   ├── DESIGN-TOKENS.json
│   └── ANIMATION-SPECS.md
├── 01-SCREENS/
│   ├── 1x/
│   ├── 2x/
│   ├── 3x/
│   └── webp/
├── 02-COMPONENTS/
│   ├── buttons/
│   ├── cards/
│   ├── inputs/
│   ├── markers/
│   └── modals/
├── 03-ICONS/
│   ├── svg/
│   ├── png/2x/
│   ├── png/3x/
│   └── pdf/
├── 04-ANIMATIONS/
│   ├── loading/
│   ├── auth/
│   ├── prayer-animation/
│   ├── modals/
│   └── micro-interactions/
└── 05-WEB-OPTIMIZED/
    └── (generated via build tools)
```

---

## ✅ EXPORT CHECKLIST

### Before Export
- [ ] LottieFiles plugin installed
- [ ] Lottielab plugin installed  
- [ ] LottieFiles account created
- [ ] Lottielab account created
- [ ] Figma file layers properly named
- [ ] Export settings added to all frames

### Screen Export
- [ ] All 8+ screens exported
- [ ] @1x, @2x, @3x versions created
- [ ] WebP versions created
- [ ] Verified in correct folders

### Component Export
- [ ] All component variants exported
- [ ] All states captured
- [ ] PNG @2x format

### Icon Export
- [ ] SVG primary format
- [ ] PNG fallbacks @2x, @3x
- [ ] PDF for iOS native

### Animation Export
- [ ] Loading pulse animation
- [ ] Auth particles animation
- [ ] Prayer spotlight animations (2)
- [ ] Pulsing circles animation
- [ ] Success sparkle animation
- [ ] All tested in Lottie preview

### Documentation
- [ ] Export manifest created
- [ ] Design tokens JSON exported
- [ ] Previous exports archived

---

## 🚨 IMPORTANT NOTES

### What CAN'T Be Exported as Lottie
1. **MapBox camera movements** → Must be JavaScript
2. **Real-time line drawing** → Better as SVG with `stroke-dashoffset`
3. **Interactive state machines** → Use Framer Motion or CSS

### What SHOULD Be Lottie
1. **Visual overlay effects** (spotlights, particles)
2. **Loading animations** (pulses, spinners)
3. **Success/completion animations** (sparkles, checkmarks)
4. **Decorative animations** (floating elements)

### iOS Implementation
```javascript
// React Native with lottie-react-native
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./assets/animations/loading-pulse.json')}
  autoPlay
  loop
  style={{ width: 200, height: 200 }}
/>
```

### Web Implementation
```javascript
// React with @lottiefiles/react-lottie-player
import { Player } from '@lottiefiles/react-lottie-player';

<Player
  src="/animations/loading-pulse.json"
  autoplay
  loop
  style={{ width: 200, height: 200 }}
/>
```

---

## 📞 TROUBLESHOOTING

**LottieFiles plugin not exporting?**
- Ensure frames are selected, not groups
- Check that frame doesn't have complex effects (gradients may not export)

**Lottielab import failing?**
- Flatten complex vectors before import
- Remove unsupported effects (heavy blur, complex masks)

**Animation looks different than Figma?**
- Lottie doesn't support all Figma effects
- May need to simplify gradients
- Check that fonts are outlined

---

**Next Step:** Run this process in your Figma file and report back when complete. I'll help verify the exports and integrate them into the codebase!
