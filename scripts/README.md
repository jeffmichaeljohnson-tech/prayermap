# Screenshot Capture Automation

Automated high-resolution screenshot capture for PrayerMap using Playwright.

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, run the screenshot script:**
   ```bash
   npm run screenshots
   ```

3. **Screenshots will be saved to:**
   ```
   ~/Downloads/prayermap-exports/screens/
   ```

## What Gets Captured

The script automatically captures all required screens at **2x retina resolution** (2880x1800):

### Required Screens (8)
- ✅ `01-loading-screen@2x.png` - Loading screen with prayer hands
- ✅ `02-auth-modal@2x.png` - Auth modal with floating particles
- ✅ `03-map-view-default@2x.png` - Full map with markers
- ✅ `04-prayer-detail-default@2x.png` - Prayer detail modal
- ✅ `04-prayer-detail-form-expanded@2x.png` - Prayer detail with form (if available)
- ✅ `05-request-prayer-modal@2x.png` - Request prayer modal
- ✅ `05-request-prayer-audio@2x.png` - Request prayer modal (audio state)
- ✅ `05-request-prayer-video@2x.png` - Request prayer modal (video state)

### Optional Screens
- `03-map-view-with-preview@2x.png` - Map with hover preview bubble
- `04-prayer-detail-with-text@2x.png` - Prayer detail with text typed

## Configuration

### Viewport Settings
- **Viewport:** 1440x900
- **Device Pixel Ratio:** 2.0
- **Output Resolution:** 2880x1800 (2x retina)

### Customization

Edit `scripts/capture-screenshots.ts` to:
- Change viewport size
- Add/remove screenshots
- Adjust delays
- Modify selectors

## Troubleshooting

### Screenshots are blurry
- Ensure `deviceScaleFactor: 2.0` is set in the script
- Check that browser args include `--force-device-scale-factor=2`

### Can't find elements
- The script uses multiple fallback selectors
- Check browser console for errors
- Run with `headless: false` to see what's happening

### Loading screen too fast
- The script reloads the page to capture loading screen
- If still too fast, increase the delay in the config

### Modals close before capture
- The script includes delays and waits for elements
- If modals still close, check for auto-dismiss logic in components

## Manual Capture (Alternative)

If automation doesn't work, you can manually capture using Chrome DevTools:

1. Open Chrome DevTools (`F12` or `Cmd+Option+I`)
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
3. Type "Show Device Toolbar" and select it
4. Set dimensions: 1440 x 900
5. Set DPR: 2.0
6. Navigate to each screen
7. Press `Cmd+Shift+P` → "Capture screenshot"

## File Organization

```
~/Downloads/prayermap-exports/
├── screens/          # Main screen captures
├── components/       # Component detail captures (manual)
└── animations/       # Animation frame captures (manual)
```

## Post-Processing

After capture, optimize images:

**Mac (ImageOptim):**
```bash
# Install ImageOptim from https://imageoptim.com
# Drag PNGs into ImageOptim window
```

**Web (TinyPNG):**
- Go to https://tinypng.com
- Upload PNGs (max 20 at once, 5MB each)
- Download compressed versions

## Notes

- The script waits for network idle before capturing
- Some screens may require manual intervention if selectors change
- Map markers might be canvas-based and require coordinate-based clicking
- Auth modal dismissal may need adjustment based on your implementation

