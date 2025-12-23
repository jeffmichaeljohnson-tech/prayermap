# PrayerMap Landing Page - Quick Deployment Guide

## What You Have

A simple, minimal landing page for prayermap.net with:
- Coming Soon page
- Privacy Policy (App Store compliant)
- Terms of Service (App Store compliant)

## Deploy in 3 Steps

### 1. Test Locally (2 minutes)

```bash
cd apps/web-landing
python3 -m http.server 8000
```

Open http://localhost:8000 and verify everything looks good.

### 2. Deploy to Vercel (5 minutes)

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

You'll get a live URL instantly (like `prayermap.vercel.app`)

### 3. Add Custom Domain (10 minutes + DNS wait)

In Vercel Dashboard:
1. Go to your project → Settings → Domains
2. Add `prayermap.net` and `www.prayermap.net`
3. Vercel will show you DNS records to add

At your domain registrar:
1. Add the DNS records Vercel provides
2. Wait 24-48 hours for DNS to propagate

Done! Your landing page will be live at https://prayermap.net

## Optional: Update Content

Before deploying, you may want to:

1. **Test the pages** - Make sure privacy.html and terms.html look right
2. **Check the date** - Privacy and Terms show "December 22, 2025"

## When Your App Launches

Edit `index.html`:
1. Find the `.badge::after` CSS rule
2. Remove it (removes "COMING SOON" overlay)
3. Add real links to App Store and Google Play
4. Deploy update with `vercel --prod`

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **DNS Check:** https://www.whatsmydns.net
- **Contact:** This is super simple - you got this!

That's it! Simple and clean.
