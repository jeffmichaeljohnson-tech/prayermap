---
name: prayermap-context
description: "Get context about the PrayerMap project architecture and conventions"
---

# PrayerMap Project Context

## Project Overview
PrayerMap is a web application built with:
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel

## Directory Structure
- `/src` - Main frontend application source
- `/admin` - Admin dashboard (separate React app)
- `/supabase` - Supabase migrations and functions
- `/docs` - Documentation

## Key Conventions
1. Use TypeScript strict mode
2. Follow React functional component patterns with hooks
3. Use Supabase client for all database operations
4. RLS (Row Level Security) policies for data access control
5. Environment variables prefixed with `VITE_` for frontend access

## Database
- Uses Supabase PostgreSQL
- Key tables: prayers, connections, profiles, media
- RPC functions for complex operations
- RLS policies for security

## When making changes:
1. Check existing patterns in similar files
2. Use existing Supabase service functions when available
3. Follow the established TypeScript interfaces
4. Test with existing data structures
