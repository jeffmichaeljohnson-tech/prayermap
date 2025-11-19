#!/bin/bash
# Script to apply PrayerMap schema to Supabase
# This script reads the schema file and provides instructions

echo "📋 PrayerMap Schema Application Script"
echo "======================================"
echo ""
echo "This script will help you apply the database schema."
echo ""
echo "Option 1: Apply via Supabase Dashboard (Recommended)"
echo "----------------------------------------------------"
echo "1. Open: https://supabase.com/dashboard/project/oomrmfhvsxtxgqqthisz/sql/new"
echo "2. Copy the contents of: docs/prayermap_schema_v2.sql"
echo "3. Paste into SQL Editor"
echo "4. Click 'Run'"
echo ""
echo "Option 2: Apply via Supabase CLI"
echo "---------------------------------"
echo "If you have Supabase CLI installed:"
echo "  supabase db push"
echo ""
echo "Schema file location: docs/prayermap_schema_v2.sql"
echo ""
echo "After applying, verify with:"
echo "  - Check tables exist: users, prayers, prayer_support, etc."
echo "  - Check RLS is enabled on all tables"
echo "  - Check PostGIS extension is enabled"
echo ""

