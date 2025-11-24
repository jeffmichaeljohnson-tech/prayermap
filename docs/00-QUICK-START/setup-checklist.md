# PrayerMap MVP - Setup Checklist

**Last Updated:** December 2024

## Pre-Development Setup

### 1. Environment Variables

Create `.env` file in project root:

```bash
# Mapbox
VITE_MAPBOX_TOKEN=your_mapbox_token_here

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# AWS (if using S3)
VITE_AWS_REGION=us-east-1
VITE_AWS_BUCKET_NAME=prayermap-media
```

### 2. Mapbox Setup

- [ ] Create account at [mapbox.com](https://mapbox.com)
- [ ] Generate access token
- [ ] Add token to `.env` as `VITE_MAPBOX_TOKEN`
- [ ] Verify token has required scopes

### 3. Supabase Setup

- [ ] Create project at [supabase.com](https://supabase.com)
- [ ] Enable PostGIS extension in SQL Editor:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```
- [ ] Run schema migration (`docs/prayermap_schema_v2.sql`)
- [ ] Enable Realtime for `prayers` table
- [ ] Configure Sign in with Apple (see `/docs/04-AUTH/apple-sign-in-setup.md`)
- [ ] Copy project URL and anon key to `.env`

### 4. AWS S3 Setup (Optional - for media storage)

- [ ] Create S3 bucket
- [ ] Configure CORS policy
- [ ] Set up CloudFront distribution
- [ ] Configure IAM user with S3 permissions
- [ ] Add credentials to `.env`

### 5. Install Dependencies

```bash
npm install
```

### 6. Verify Installation

```bash
npm run dev
```

Visit `http://localhost:5173` - map should load.

## Development Workflow

### Daily Startup

1. Start dev server: `npm run dev`
2. Verify Supabase connection
3. Check Mapbox token is valid
4. Test geolocation in browser

### Before Committing

- [ ] Run linter: `npm run lint`
- [ ] Test map functionality
- [ ] Verify environment variables not committed
- [ ] Check console for errors

## Common Issues

### Map Not Loading

- Check `VITE_MAPBOX_TOKEN` is set
- Verify token is valid in Mapbox dashboard
- Check browser console for errors

### Supabase Connection Failed

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase project is active
- Verify network connectivity

### Geolocation Not Working

- Ensure HTTPS (required in production)
- Check browser permissions
- Verify `navigator.geolocation` is available

## Next Steps

- Read `/docs/00-QUICK-START/local-development.md`
- Review `/docs/01-MAPBOX/initialization.md`
- Check `/docs/02-SUPABASE/database-setup.md`

