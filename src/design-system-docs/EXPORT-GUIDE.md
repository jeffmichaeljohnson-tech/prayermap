# PrayerMap - Screen Export Guide

Complete guide for capturing high-resolution screen exports to complement your design handoff.

---

## 📋 Export Checklist

### Required Screens (8 Total)
- [ ] 01 - Loading Screen
- [ ] 02 - Auth Modal
- [ ] 03 - Map View (Default State)
- [ ] 03b - Map View (With Preview Bubble)
- [ ] 04 - Prayer Detail Modal (Default)
- [ ] 04b - Prayer Detail Modal (Form Expanded)
- [ ] 05 - Request Prayer Modal
- [ ] 06 - Inbox Modal (All Tab)
- [ ] 06b - Inbox Modal (Received Tab)

### Optional Screens (8 More)
- [ ] Prayer Marker (Default State)
- [ ] Prayer Marker (Hovered State)
- [ ] Prayer Marker (Prayed State)
- [ ] Prayer Animation (Frame 1 - Camera Movement)
- [ ] Prayer Animation (Frame 2 - Line Draw)
- [ ] Prayer Animation (Frame 3 - Spotlights)
- [ ] Connection Line (Default)
- [ ] Connection Line (Hovered with Tooltip)

---

## 🖥️ Export Method 1: From Running App (Recommended)

### Prerequisites
- App running locally (`npm run dev`)
- Chrome or Edge browser (best DevTools)
- Screen resolution 1920x1080 or higher

### Step-by-Step Process

#### Setup
1. **Open app** in Chrome/Edge
2. **Open DevTools:** Press `F12` or `Cmd/Ctrl + Shift + I`
3. **Open Device Toolbar:** Press `Cmd/Ctrl + Shift + M`
4. **Set viewport:**
   - Desktop captures: 1440x900 (16:10 ratio)
   - Mobile captures: 375x812 (iPhone X)

#### Capturing Screenshots

**Method A: Full Page Screenshot**
1. With DevTools open, press `Cmd/Ctrl + Shift + P`
2. Type "screenshot"
3. Select "Capture screenshot" (captures visible viewport)
4. File saves to Downloads folder

**Method B: Node Screenshot (Specific Element)**
1. Right-click on element in DevTools Elements panel
2. Select "Capture node screenshot"
3. Captures just that element with transparent background

**Method C: Manual Screenshot**
1. macOS: `Cmd + Shift + 4` → Drag to select area
2. Windows: `Win + Shift + S` → Drag to select area
3. Paste into image editor → Export as PNG

---

## 📸 Screen-by-Screen Export Instructions

### 01 - Loading Screen

**State to Capture:**
- Prayer hands emoji 🙏 visible
- "PrayerMap" text below
- White background
- Mid-pulse animation (prayer hands at normal scale)

**Viewport:** 1440x900  
**Export Settings:**
- Format: PNG
- Background: Opaque (white)
- Scale: 2x (2880x1800)
- Filename: `01-loading-screen@2x.png`

**How to Capture:**
1. Refresh app
2. Immediately open DevTools screenshot tool
3. Capture within first second (before it transitions)

**Alternative:** If too fast, comment out the setTimeout in App.tsx temporarily:
```javascript
// setTimeout(() => setIsLoading(false), 2000);
```

---

### 02 - Auth Modal

**State to Capture:**
- Modal centered on screen
- Floating particles visible and animated
- 🙏 emoji at top
- "Prayer. Shared." tagline
- "Sign in with Apple" button
- Blurred background

**Viewport:** 1440x900  
**Export Settings:**
- Format: PNG
- Background: Include backdrop blur
- Scale: 2x
- Filename: `02-auth-modal@2x.png`

**How to Capture:**
1. Wait for auth modal to appear
2. Let particles animate for 2-3 seconds
3. Capture full viewport
4. Particles should be in various positions

**Tip:** Take multiple captures and choose the best particle positioning

---

### 03 - Map View (Main Screen)

**State to Capture - Default:**
- Full map visible
- Multiple prayer markers (🙏) on map
- At least 2-3 connection lines visible
- Header with "Inbox" (with badge), "PrayerMap", "Settings"
- "Request Prayer" button at bottom center
- Beverly Hills, Michigan centered
- Zoom level 12

**Viewport:** 1440x900  
**Export Settings:**
- Format: PNG
- Scale: 2x
- Filename: `03-map-view-default@2x.png`

**How to Capture:**
1. Navigate to map view
2. Ensure at least 3-5 prayer markers visible
3. If using mock data, ensure connection lines are showing
4. Center map on Beverly Hills coordinates
5. Capture full viewport

---

**State to Capture - With Preview Bubble:**
- Same as default
- Mouse hovering over one prayer marker
- Preview bubble visible above marker
- Marker scaled to 1.1x

**Filename:** `03-map-view-with-preview@2x.png`

**How to Capture:**
1. Hover over a prayer marker
2. Wait for preview bubble to appear (150ms)
3. Immediately capture
4. Preview should show user name and prayer content preview

---

### 04 - Prayer Detail Modal

**State to Capture - Default:**
- Modal open on map background
- Prayer content visible
- User avatar/emoji
- User name (or "Anonymous")
- Distance display: "X.X miles away"
- Reply type selector (Text, Voice, Video) - Text selected
- Reply form collapsed (not visible)
- "Send Prayer" button visible
- Close button (X) in top right

**Viewport:** 1440x900  
**Modal Width:** 448px  
**Export Settings:**
- Format: PNG
- Scale: 2x
- Filename: `04-prayer-detail-default@2x.png`

**How to Capture:**
1. Click any prayer marker to open modal
2. Ensure modal is fully loaded
3. Don't select any reply type yet
4. Capture full viewport (modal centered)

---

**State to Capture - Form Expanded:**
- Same modal
- Text reply type selected (with rainbow border animation)
- Reply form expanded showing textarea
- Textarea with placeholder: "Type your prayer here..."
- Anonymous toggle visible below textarea
- "Send Prayer" button at bottom

**Filename:** `04-prayer-detail-form-expanded@2x.png`

**How to Capture:**
1. In Prayer Detail Modal, click "Text" reply type
2. Wait for form to expand (300ms)
3. Capture when rainbow border is visible
4. Textarea should be empty with placeholder

**Optional - With Text:**
Create a third capture with typed text in textarea
**Filename:** `04-prayer-detail-with-text@2x.png`

---

### 05 - Request Prayer Modal

**State to Capture:**
- Modal open and centered
- Title: "Request Prayer"
- Title input (optional) - empty with placeholder
- Content type selector - Text selected
- Content textarea visible and empty
- Placeholder: "Share what's on your heart..."
- Anonymous toggle at bottom
- "Share Prayer Request" button enabled

**Viewport:** 1440x900  
**Modal Width:** 448px  
**Export Settings:**
- Format: PNG
- Scale: 2x
- Filename: `05-request-prayer-modal@2x.png`

**How to Capture:**
1. Click "Request Prayer" button on map
2. Modal should open empty
3. Text type selected by default
4. Capture full viewport

**Optional - Audio State:**
- Audio reply type selected
- Microphone icon visible in circle with gradient
- "Tap to record your prayer" text
- "Max 2 minutes" helper text
**Filename:** `05-request-prayer-audio@2x.png`

**Optional - Video State:**
- Video reply type selected
- Video icon visible
- "Tap to record video prayer" text
**Filename:** `05-request-prayer-video@2x.png`

---

### 06 - Inbox Modal

**State to Capture - All Tab:**
- Modal open showing "Inbox" title
- Tab system with "All" selected (white background)
- List of 3-4 prayer cards visible
- Each card showing:
  - Avatar circle
  - User name
  - Timestamp
  - Prayer content preview (2 lines)
  - Reply count
  - Unread badge (red dot) on at least one card
- Scrollbar visible if list is long

**Viewport:** 1440x900  
**Modal Width:** 512px  
**Height:** 600px max  
**Export Settings:**
- Format: PNG
- Scale: 2x
- Filename: `06-inbox-all-tab@2x.png`

**How to Capture:**
1. Click Inbox button in header
2. Ensure "All" tab is active
3. Should show mix of received/sent prayers
4. Capture full viewport

---

**State to Capture - Received Tab:**
- Same modal
- "Received" tab selected
- List showing only received prayers
- Unread badges visible

**Filename:** `06-inbox-received-tab@2x.png`

---

**Optional - Empty State:**
- Inbox with no prayers
- Empty state showing:
  - 🙏 emoji (large, faded)
  - "No prayers yet"
  - "Tap a prayer on the map to get started"

**Filename:** `06-inbox-empty-state@2x.png`

**How to Capture:**
1. Clear mock prayer data temporarily
2. Open inbox
3. Empty state should automatically show

---

## 🎨 Component Detail Exports (Optional)

### Prayer Marker States

**Default State:**
- 48px circle
- Glass background (white 80%)
- 🙏 emoji centered
- White border
- Medium shadow

**Export:**
- Size: 96x96 @ 2x (includes shadow)
- Background: Transparent
- Filename: `component-prayer-marker-default@2x.png`

**How to Capture:**
1. Use "Capture node screenshot" on marker element
2. Include shadow in selection

---

**Hovered State:**
- Scaled to 1.1x
- Larger shadow
- Preview bubble above (optional in this export)

**Filename:** `component-prayer-marker-hover@2x.png`

---

**Prayed State:**
- Gold border (3px)
- Checkmark overlay in top-right
- 16px gold circle with white checkmark

**Filename:** `component-prayer-marker-prayed@2x.png`

---

### Preview Bubble

**State to Capture:**
- Glassmorphic bubble
- Arrow pointing down
- User name: "Sarah"
- Prayer preview: "Please pray for my mother who is recovering..."
- Max 2 lines of text

**Export:**
- Size: ~280x80 @ 2x (varies by content)
- Background: Transparent (includes glassmorphic background)
- Filename: `component-preview-bubble@2x.png`

---

### Prayer Animation Frames (Advanced)

**Frame 1 - Camera Movement (2 seconds in):**
- Map tilted to 60° pitch
- Zoomed to show both user and prayer location
- Both locations in view

**Filename:** `animation-frame-1-camera@2x.png`

**How to Capture:**
1. Trigger prayer send
2. Take screenshot at exactly 2 seconds
3. Map should be tilted and zoomed

---

**Frame 2 - Line Drawing (3 seconds in):**
- Curved line partially drawn
- Line is gold-to-purple gradient
- Pulsing circles at endpoints

**Filename:** `animation-frame-2-line-draw@2x.png`

**How to Capture:**
1. Take screenshot at 3 seconds into animation
2. Line should be ~50% drawn

---

**Frame 3 - Spotlights (5 seconds in):**
- Yellow spotlight at prayer location
- Purple spotlight at user location
- Both beams visible

**Filename:** `animation-frame-3-spotlights@2x.png`

**How to Capture:**
1. Take screenshot at 5 seconds
2. Both spotlights at full brightness

---

### Connection Line States

**Default State:**
- Curved rainbow gradient line on map
- 2px stroke width
- Opacity 0.8

**Filename:** `component-connection-line-default@2x.png`

---

**Hovered State:**
- Brighter gradient
- 3px stroke width
- Glow effect
- Tooltip showing:
  - "Prayer from Sarah"
  - "Prayed by John"
  - "3 days ago"

**Filename:** `component-connection-line-hover@2x.png`

**How to Capture:**
1. Hover over a connection line on map
2. Wait for tooltip to appear
3. Capture with tooltip visible

---

## 🎨 Export Method 2: From Figma

If you have Figma designs prepared:

### Figma Export Settings

1. **Select frame/screen**
2. **Right panel** → Scroll to Export section
3. **Click "+" to add export setting**

**Settings:**
- **Format:** PNG
- **Scale:** 2x
- **Suffix:** @2x (automatic)

4. **Click "Export [frame name]"**

### Batch Export
1. Select multiple frames
2. Set export settings (applies to all)
3. Click "Export X layers"
4. Figma exports as ZIP

---

## 📱 Mobile Screen Exports (Optional)

### Mobile Viewport Settings
- **iPhone 14 Pro:** 393x852
- **iPhone SE:** 375x667
- **Pixel 7:** 412x915

### Screens to Export
Same screens as desktop, but showing mobile-specific behaviors:
- Bottom sheet modals (slide up)
- Touch-friendly button sizes
- Mobile map gestures

**Filename Convention:**
`01-loading-screen-mobile@2x.png`

---

## 🎬 Animation Sequence Exports (Advanced)

### Creating Animation Frame Sequence

For the 6-second prayer animation, export frames at key moments:

**Frame Times:**
- 0.0s - Start (map default)
- 1.0s - Camera moving
- 2.0s - Camera at destination, line starts
- 3.0s - Line 50% drawn
- 4.0s - Line complete, spotlights start
- 5.0s - Spotlights full brightness
- 6.0s - Complete, back to normal

**Tools:**
- **Screen recording:** Use OBS Studio, QuickTime, or built-in screen recorder
- **Frame extraction:** Use VLC or FFmpeg to extract frames
- **Video editor:** iMovie, Premiere, or After Effects

**Command for FFmpeg:**
```bash
ffmpeg -i prayer-animation.mp4 -vf fps=1 frame-%d.png
```
This extracts 1 frame per second from video.

---

## 🎨 Image Optimization (Post-Export)

### Recommended Tools

**ImageOptim (Mac, Free)**
- Drag and drop PNGs
- Lossless compression
- Reduces file size 30-70%

**TinyPNG (Web, Free)**
- https://tinypng.com
- Upload PNGs (max 5MB each)
- Lossy but high quality

**Squoosh (Web, Free)**
- https://squoosh.app
- Browser-based
- Compare before/after

### Target Sizes
- **Full screens:** 500KB - 1MB each
- **Components:** 50KB - 200KB each
- **Icons:** 10KB - 50KB each

---

## 📐 Resolution & Format Guide

### Desktop Screens
- **Standard:** 1440x900 @ 2x = 2880x1800
- **Alternative:** 1920x1080 @ 2x = 3840x2160

### Modals
- **Prayer Detail:** 448px width @ 2x = 896px
- **Inbox:** 512px width @ 2x = 1024px
- **Request Prayer:** 448px width @ 2x = 896px

### Components
- **Prayer Marker:** 48px @ 2x = 96px
- **Preview Bubble:** ~280px width @ 2x
- **Icons:** 24px @ 2x = 48px

### Format Specifications
- **Format:** PNG-24 (full color with alpha)
- **Color Profile:** sRGB
- **DPI:** 144 (2x) or 216 (3x)
- **Compression:** Lossless preferred

---

## 🗂️ File Naming Convention

### Pattern
```
[number]-[screen-name]-[state]-[viewport]@[scale]x.png
```

### Examples
```
01-loading-screen@2x.png
02-auth-modal@2x.png
03-map-view-default@2x.png
03-map-view-with-preview@2x.png
04-prayer-detail-default@2x.png
04-prayer-detail-form-expanded@2x.png
05-request-prayer-modal@2x.png
06-inbox-all-tab@2x.png
06-inbox-received-tab@2x.png
component-prayer-marker-default@2x.png
component-prayer-marker-hover@2x.png
animation-frame-1-camera@2x.png
```

---

## ✅ Quality Checklist

Before considering an export complete:

### Visual Quality
- [ ] No pixelation or blur
- [ ] Text is crisp and readable
- [ ] Colors match design system
- [ ] Glassmorphic effects visible
- [ ] Shadows rendered correctly
- [ ] No cut-off elements

### Technical Quality
- [ ] Correct resolution (2x or 3x)
- [ ] Proper file format (PNG)
- [ ] File size reasonable (<1MB for screens)
- [ ] Correct filename with @2x suffix
- [ ] sRGB color profile
- [ ] Optimized/compressed

### Content Quality
- [ ] Correct state captured
- [ ] All key elements visible
- [ ] Animations at right frame (if applicable)
- [ ] Background appropriate (opaque or transparent)
- [ ] Representative content (not lorem ipsum)

---

## 🚀 Quick Start (TL;DR)

**Fastest way to get exports:**

1. **Run app:** `npm run dev`
2. **Open Chrome DevTools:** F12
3. **For each screen:**
   - Navigate to that screen
   - Press `Cmd/Ctrl + Shift + P`
   - Type "screenshot"
   - Select "Capture screenshot"
4. **Rename files** according to convention
5. **Optimize images** with ImageOptim or TinyPNG
6. **Organize** into folder structure

**Time estimate:** 30-60 minutes for all screens

---

## 📞 Troubleshooting

### Issue: Screenshots are blurry
**Solution:** Ensure you're using 2x viewport scale or capturing at higher resolution

### Issue: Glassmorphic effects don't show
**Solution:** Ensure backdrop-filter is enabled in browser (Chrome flags)

### Issue: Animations too fast to capture
**Solution:** Use browser DevTools Performance panel → Slow motion (0.1x speed)

### Issue: File sizes too large
**Solution:** Use TinyPNG or ImageOptim to compress

### Issue: Can't capture modal with background
**Solution:** Use full viewport screenshot, not node screenshot

---

## 🎯 Priority Export List

If time is limited, export these first:

### High Priority (Must Have)
1. Map View (default)
2. Prayer Detail Modal (default)
3. Request Prayer Modal
4. Auth Modal
5. Inbox Modal (all tab)

### Medium Priority (Should Have)
6. Loading Screen
7. Prayer Detail Modal (form expanded)
8. Map View (with preview)

### Low Priority (Nice to Have)
9. Component states (markers, bubbles)
10. Animation frames
11. Mobile variants

---

**Now you're ready to create beautiful, high-resolution exports that perfectly complement your comprehensive documentation! 🎨✨**

**See FOLDER-STRUCTURE.md for how to organize these files.**
