-- ============================================================================
-- PrayerMap Storage Bucket Setup
-- ============================================================================
-- Run this in the Supabase SQL Editor to create the storage bucket for
-- audio and video prayer recordings.
-- ============================================================================

-- Note: Storage bucket creation must be done via Supabase Dashboard or API
-- Go to Storage > New Bucket and create a bucket named "prayers"
-- Make sure to check "Public bucket" to allow public access to files

-- ============================================================================
-- Storage Policies for the 'prayers' bucket
-- ============================================================================
-- These policies control who can upload, read, and delete files

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload prayer media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prayers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read prayer media (prayers are public)
CREATE POLICY "Anyone can view prayer media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prayers');

-- Allow users to update their own files
CREATE POLICY "Users can update their own prayer media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'prayers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own prayer media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'prayers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- IMPORTANT: Manual Step Required
-- ============================================================================
-- Before running these policies, you MUST create the storage bucket first:
--
-- 1. Go to your Supabase Dashboard
-- 2. Click on "Storage" in the left sidebar
-- 3. Click "New Bucket"
-- 4. Name: prayers
-- 5. Check "Public bucket" (to allow public read access)
-- 6. Click "Create bucket"
-- 7. Then run this SQL file to set up the policies
-- ============================================================================
