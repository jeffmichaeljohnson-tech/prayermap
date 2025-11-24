# 📸 High-Resolution Screenshot Capture Guide

Complete guide for capturing PrayerMap screens at retina quality (2x resolution).

## 🚀 Automated Method (Recommended)

The fastest and most consistent way to capture all screenshots.

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Keep this running in one terminal.

3. **Run the automation script:**
   ```bash
   npm run screenshots
   ```

### What Happens

- Playwright launches a browser with 1440x900 viewport at 2x DPR
- Automatically navigates through all screens
- Captures screenshots at 2880x1800 resolution
- Saves to `~/Downloads/prayermap-exports/screens/`

### Output

All screenshots are saved with `@2x` suffix:
- `01-loading-screen@2x.png`
- `02-auth-modal@2x.png`
- `03-map-view-default@2x.png`
- etc.

## 🎯 Manual Method (Chrome DevTools)

If automation doesn't work or you need more control:

### Setup

1. **Open Chrome DevTools:**
   - Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)

2. **Enable Device Toolbar:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - Type "Show Device Toolbar" and select it
   - Or press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)

3. **Configure Viewport:**
   - Click device dropdown → Select "Responsive"
   - Set width: `1440`
   - Set height: `900`
   - Set DPR: `2.0` (look for "DPR: 2" dropdown)

### Capture Each Screen

For each screen:

1. Navigate to the screen state
2. Wait for animations/loading to complete
3. Press `Cmd+Shift+P` → Type "Capture screenshot" → Enter
4. Screenshot downloads automatically
5. Move to export folder and rename

### Screen-by-Screen Instructions

#### 01: Loading Screen
- **Action:** Refresh page (`Cmd+R`)
- **Timing:** Capture within 1 second (or pause animation)
- **Save as:** `01-loading-screen@2x.png`

#### 02: Auth Modal
- **Action:** Wait for modal to appear after loading
- **Timing:** Wait 2-3 seconds for particles to animate
- **Save as:** `02-auth-modal@2x.png`

#### 03: Map View (Default)
- **Action:** Dismiss auth modal (click Skip or outside)
- **Timing:** Wait for map tiles to load (3-4 seconds)
- **Save as:** `03-map-view-default@2x.png`

#### 03b: Map View with Preview Bubble
- **Action:** Hover over a prayer marker (🙏)
- **Timing:** Wait 150ms for preview bubble
- **Save as:** `03-map-view-with-preview@2x.png`

#### 04: Prayer Detail Modal (Default)
- **Action:** Click any prayer marker
- **Timing:** Wait for modal to fully open
- **Save as:** `04-prayer-detail-default@2x.png`

#### 04b: Prayer Detail Modal (Form Expanded)
- **Action:** Click "Text" reply button (if available)
- **Timing:** Wait 300ms for form expansion
- **Save as:** `04-prayer-detail-form-expanded@2x.png`

#### 04c: Prayer Detail Modal (With Text)
- **Action:** Type text in textarea
- **Timing:** After typing, wait 300ms
- **Save as:** `04-prayer-detail-with-text@2x.png`

#### 05: Request Prayer Modal
- **Action:** Click "+" button (bottom-right)
- **Timing:** Wait for modal to open
- **Save as:** `05-request-prayer-modal@2x.png`

#### 05b: Request Prayer Modal (Audio)
- **Action:** Click "Audio" content type button
- **Timing:** Wait for UI to update
- **Save as:** `05-request-prayer-audio@2x.png`

#### 05c: Request Prayer Modal (Video)
- **Action:** Click "Video" content type button
- **Timing:** Wait for UI to update
- **Save as:** `05-request-prayer-video@2x.png`

## 📁 File Organization

```
~/Downloads/prayermap-exports/
├── screens/
│   ├── 01-loading-screen@2x.png
│   ├── 02-auth-modal@2x.png
│   ├── 03-map-view-default@2x.png
│   └── ... (all screen exports)
├── components/
│   └── (component detail captures - optional)
└── animations/
    └── (animation frame captures - optional)
```

## 🛠️ Troubleshooting

### Problem: Screenshots are blurry
**Solution:** 
- Ensure DPR is set to 2.0 in DevTools
- Check that `deviceScaleFactor: 2.0` is in automation script

### Problem: Can't capture loading screen (too fast)
**Solution:**
- Use automation script (it reloads page)
- Or temporarily comment out `setTimeout` in `App.tsx`:
  ```typescript
  // Comment this out temporarily:
  // setTimeout(() => setIsLoading(false), 2000);
  ```

### Problem: Modal closes before screenshot
**Solution:**
- Use automation script (includes delays)
- Or pause JavaScript execution in DevTools:
  - Sources tab → Click pause button
  - Take screenshot
  - Resume execution

### Problem: Can't find prayer markers
**Solution:**
- Markers might be canvas-based (Mapbox)
- Try clicking on map center area
- Use automation script (handles multiple fallbacks)

### Problem: File sizes too large (>2MB)
**Solution:**
- Use ImageOptim (Mac) or TinyPNG (Web) to compress
- Lossless compression can reduce 30-70% file size

## ✅ Checklist

### Minimum Required (8 screens)
- [ ] 01-loading-screen@2x.png
- [ ] 02-auth-modal@2x.png
- [ ] 03-map-view-default@2x.png
- [ ] 04-prayer-detail-default@2x.png
- [ ] 04-prayer-detail-form-expanded@2x.png (if available)
- [ ] 05-request-prayer-modal@2x.png
- [ ] 05-request-prayer-audio@2x.png (if available)
- [ ] 05-request-prayer-video@2x.png (if available)

### Recommended Additions
- [ ] 03-map-view-with-preview@2x.png
- [ ] 04-prayer-detail-with-text@2x.png

## 🎨 Post-Processing

After capturing, optimize images:

1. **ImageOptim (Mac, Free):**
   - Download from https://imageoptim.com
   - Drag all PNGs into window
   - Automatically compresses losslessly

2. **TinyPNG (Web, Free):**
   - Go to https://tinypng.com
   - Upload up to 20 PNGs (max 5MB each)
   - Download compressed versions

## 📤 Upload to GitHub

```bash
cd ~/Desktop
git add prayermap-exports/
git commit -m "Add high-res screen exports"
git push
```

## 💡 Pro Tips

1. **Use automation for consistency** - Same viewport, same timing
2. **Capture multiple angles** - Take 2-3 shots of animated screens
3. **Verify resolution** - Check file properties (should be 2880x1800)
4. **Keep originals** - Don't overwrite until you've verified quality
5. **Test on different devices** - Ensure screenshots look good on retina displays

## 🔧 Advanced: Customizing Automation

Edit `scripts/capture-screenshots.ts` to:
- Add new screenshots
- Change viewport size
- Adjust delays
- Modify selectors
- Add custom actions

See `scripts/README.md` for detailed documentation.

