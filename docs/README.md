# PrayerMap MVP Documentation

**Comprehensive technical documentation for PrayerMap MVP development**

## 📚 Documentation Structure

### 00-QUICK-START
- **setup-checklist.md** - Initial setup and environment configuration
- **environment-variables.md** - Environment variable reference
- **local-development.md** - Local development workflow

### 01-MAPBOX
- **initialization.md** - Map initialization and configuration
- **markers-and-popups.md** - Custom markers and popups
- **geolocation.md** - User location tracking
- **layers-and-styling.md** - GeoJSON layers and styling
- **events.md** - Map events and interactions
- **real-time-updates.md** - Dynamic map updates
- **code-snippets.md** - Quick reference snippets

### 02-SUPABASE
- **database-setup.md** - Database configuration
- **postgis-queries.md** - Spatial queries and radius searches
- **real-time-subscriptions.md** - Real-time data subscriptions
- **authentication.md** - User authentication
- **storage.md** - File storage (if using Supabase Storage)
- **row-level-security.md** - RLS policies
- **typescript-types.md** - Type generation
- **code-snippets.md** - Quick reference snippets

### 03-AWS
- **s3-setup.md** - S3 bucket configuration
- **browser-uploads.md** - Direct browser uploads
- **cloudfront-cdn.md** - CDN setup
- **media-optimization.md** - Media compression and optimization
- **code-snippets.md** - Quick reference snippets

### 04-AUTH
- **apple-sign-in-setup.md** - Apple Sign In configuration
- **supabase-integration.md** - Supabase OAuth integration
- **testing-guide.md** - Authentication testing

### 05-FRONTEND
- **react-patterns.md** - React 18 patterns and hooks
- **typescript-setup.md** - TypeScript configuration
- **custom-hooks.md** - Custom React hooks
- **performance.md** - Performance optimization
- **code-snippets.md** - Quick reference snippets

### 06-BUILD
- **vite-configuration.md** - Vite build configuration
- **environment-setup.md** - Environment management
- **deployment.md** - Deployment guide

### 07-REFERENCE
- **postgis-functions.md** - PostGIS function reference
- **api-endpoints.md** - API endpoint documentation
- **troubleshooting.md** - Common issues and solutions

## 🚀 Quick Start

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Fill in your credentials
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Read Documentation**
   - Start with `/docs/00-QUICK-START/setup-checklist.md`
   - Then review relevant sections for your task

## 📖 Documentation Standards

All documentation follows these standards:

- ✅ **Official Sources Only** - All information from official documentation
- ✅ **Version Specific** - Exact library versions noted
- ✅ **Copy-Paste Ready** - All code examples work without modification
- ✅ **PrayerMap Context** - Examples tailored to PrayerMap use cases
- ✅ **Error Handling** - Common errors and solutions included
- ✅ **Performance Notes** - Optimization strategies documented
- ✅ **Security Notes** - Security considerations highlighted

## 🔍 Finding What You Need

### By Task

- **Setting up map**: `/docs/01-MAPBOX/initialization.md`
- **Adding markers**: `/docs/01-MAPBOX/markers-and-popups.md`
- **Location queries**: `/docs/02-SUPABASE/postgis-queries.md`
- **Real-time updates**: `/docs/02-SUPABASE/real-time-subscriptions.md`
- **User auth**: `/docs/04-AUTH/apple-sign-in-setup.md`
- **Media uploads**: `/docs/03-AWS/browser-uploads.md`

### By Technology

- **Mapbox**: `/docs/01-MAPBOX/`
- **Supabase**: `/docs/02-SUPABASE/`
- **AWS**: `/docs/03-AWS/`
- **React**: `/docs/05-FRONTEND/`
- **Vite**: `/docs/06-BUILD/`

## 📝 Contributing

When adding new documentation:

1. Follow the existing structure and format
2. Include official source links
3. Add PrayerMap-specific examples
4. Include error handling and troubleshooting
5. Update this README if adding new sections

## 🔗 External Resources

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Supabase Docs](https://supabase.com/docs)
- [PostGIS Docs](https://postgis.net/documentation/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)

## 📞 Support

For questions or issues:
1. Check `/docs/07-REFERENCE/troubleshooting.md`
2. Review relevant section documentation
3. Check official documentation links

---

**Last Updated:** December 2024  
**Version:** MVP v2.0

