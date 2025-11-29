# Environment Variables - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Copy the Template

```bash
# Main app
cp .env.example .env.local

# Admin dashboard (optional)
cd admin && cp .env.example .env.local && cd ..
```

### Step 2: Get Your Credentials

#### Supabase (Required)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create new)
3. Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon/public` key → `VITE_SUPABASE_ANON_KEY`

#### Mapbox (Required)
1. Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Copy existing token or create new
3. Copy → `VITE_MAPBOX_TOKEN`

### Step 3: Add to .env.local

```bash
# Edit .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImFiYzEyMyJ9...
```

### Step 4: Start Developing

```bash
npm run dev
```

Done! 🎉

---

## 📋 Variable Checklist

### Required (App Won't Work Without These)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_MAPBOX_TOKEN`

### Optional (For Advanced Features)
- [ ] `VITE_APP_VERSION` - App version display
- [ ] `OPENAI_API_KEY` - Memory system embeddings
- [ ] `PINECONE_API_KEY` - Vector database
- [ ] `SESSION_ID` - Memory session tracking

### Testing Only
- [ ] `ADMIN_EMAIL` - E2E test credentials
- [ ] `ADMIN_PASSWORD` - E2E test credentials

---

## 🔒 Security Quick Tips

✅ **Safe to Expose (Client-Side)**
- `VITE_SUPABASE_URL` - Protected by RLS
- `VITE_SUPABASE_ANON_KEY` - Limited permissions
- `VITE_MAPBOX_TOKEN` - Public token

❌ **Never Expose (Server-Side)**
- `OPENAI_API_KEY` - Sensitive
- `PINECONE_API_KEY` - Sensitive
- `ADMIN_PASSWORD` - Credentials

🔐 **Best Practices**
- Use `.env.local` for development (gitignored)
- Set production vars in Vercel dashboard
- Never commit `.env.local` to git
- Use different projects for dev/staging/prod
- Add URL restrictions to Mapbox tokens

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
→ Check `.env.local` exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
→ Restart dev server: `npm run dev`

### "Mapbox token is not set"
→ Add `VITE_MAPBOX_TOKEN=pk.eyJ...` to `.env.local`
→ Restart dev server

### Variables not updating
→ Stop server (Ctrl+C)
→ Clear cache: `rm -rf node_modules/.vite`
→ Restart: `npm run dev`

---

## 📚 Full Documentation

For complete documentation, see:
- **[ENVIRONMENT_VARIABLES.md](/home/user/prayermap/docs/ENVIRONMENT_VARIABLES.md)** - Complete reference
- **[.env.example](/home/user/prayermap/.env.example)** - Template with comments
- **[admin/.env.example](/home/user/prayermap/admin/.env.example)** - Admin template

---

## 🚀 Deployment

### Vercel (Production)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project → Settings → Environment Variables
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_TOKEN`
4. Scope: Production
5. Deploy!

### Mobile (iOS/Android)

Variables are bundled during build:

```bash
# 1. Set variables in .env.local
# 2. Build web app
npm run build

# 3. Sync to mobile
npx cap sync

# 4. Open in IDE
npx cap open ios      # or android
```

---

**Need Help?** See full docs: [ENVIRONMENT_VARIABLES.md](/home/user/prayermap/docs/ENVIRONMENT_VARIABLES.md)
