# PrayerMap Landing Page

Simple, minimal "Coming Soon" landing page for prayermap.net

## What's Included

- **index.html** - Main landing page (Coming Soon)
- **privacy.html** - Privacy Policy (required for App Store)
- **terms.html** - Terms of Service (required for App Store)
- **vercel.json** - Deployment configuration

## Quick Start

### Test Locally

```bash
# Using Python
python3 -m http.server 8000

# Or using npx
npx serve . -p 8000
```

Open http://localhost:8000

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/web-landing
vercel --prod
```

### Configure Domain

1. Go to Vercel project settings
2. Add custom domain: `prayermap.net`
3. Update DNS records at your registrar
4. Wait for DNS propagation

## Features

- Minimal, clean design matching PrayerMap ethereal style
- Mobile responsive
- App Store placeholders (Coming Soon badges)
- Links to Privacy Policy and Terms of Service
- No build process needed - pure HTML/CSS

## Customization

All content is in a single HTML file for easy editing. Colors and styles match the existing PrayerMap aesthetic:

- Blue (#4A90E2)
- Purple (#9B59B6)
- Gold (#F5D76E)
- Soft gradient background

## When App Launches

Update `index.html` to:
1. Remove "COMING SOON" overlays from badges
2. Add actual App Store and Google Play links
3. Optionally add screenshots/video

That's it!
