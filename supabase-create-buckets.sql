-- ============================================
-- Jules Class Go - Storage Buckets Creation
-- Execute these commands in Supabase SQL Editor
-- ============================================

-- 1. CREATE AVATARS BUCKET (PUBLIC)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- PUBLIC bucket for profile pictures
  5242880, -- 5MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];


-- 2. CREATE VIDEOS-PRIVATE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos-private',
  'videos-private',
  false, -- PRIVATE bucket
  524288000, -- 500MB (500 * 1024 * 1024)
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];


-- 2. CREATE HOMEWORK-FILES BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-files',
  'homework-files',
  false, -- PRIVATE bucket
  52428800, -- 50MB (50 * 1024 * 1024)
  NULL -- Allow all file types
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;


-- 3. CREATE VIDEO-THUMBNAILS BUCKET (Optional)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-thumbnails',
  'video-thumbnails',
  true, -- PUBLIC bucket for performance
  5242880, -- 5MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];


-- 4. UPDATE COURSES BUCKET TO PRIVATE (if exists)
-- ============================================
UPDATE storage.buckets
SET public = false
WHERE id = 'courses';


-- 5. STORAGE POLICIES FOR VIDEOS-PRIVATE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users read videos" ON storage.objects;

-- Policy: Authenticated users can upload videos
CREATE POLICY "Authenticated users upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos-private'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can read videos (via signed URLs)
CREATE POLICY "Authenticated users read videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos-private'
  AND auth.role() = 'authenticated'
);


-- 6. STORAGE POLICIES FOR HOMEWORK-FILES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Users read own homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers read student homework" ON storage.objects;

-- Policy: Authenticated users can upload homework files
CREATE POLICY "Students upload homework files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'homework-files'
  AND auth.role() = 'authenticated'
);

-- Policy: Users can read their own uploaded files
CREATE POLICY "Users read own homework files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'homework-files'
  AND (
    -- User owns the file (file path starts with their user ID)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is authenticated (teachers can see via assignments)
    auth.role() = 'authenticated'
  )
);

-- Policy: Users can delete their own files
CREATE POLICY "Users delete own homework files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 7. STORAGE POLICIES FOR VIDEO-THUMBNAILS (Public bucket)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload thumbnails" ON storage.objects;

-- Policy: Anyone can read thumbnails
CREATE POLICY "Public read thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-thumbnails');

-- Policy: Authenticated users can upload thumbnails
CREATE POLICY "Authenticated upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-thumbnails'
  AND auth.role() = 'authenticated'
);


-- 8. STORAGE POLICIES FOR AVATARS (Public bucket)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

-- Policy: Anyone can read avatars (public bucket)
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload their own avatar
CREATE POLICY "Authenticated upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 9. STORAGE POLICIES FOR COURSES BUCKET
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users upload courses" ON storage.objects;
DROP POLICY IF EXISTS "Users read course files" ON storage.objects;

-- Policy: Authenticated users can upload to courses bucket
CREATE POLICY "Authenticated users upload courses"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'courses'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can read course files
CREATE POLICY "Users read course files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'courses'
  AND auth.role() = 'authenticated'
);


-- 9. VERIFICATION QUERIES
-- ============================================

-- Check buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('videos-private', 'homework-files', 'video-thumbnails', 'courses', 'avatars')
ORDER BY id;

-- Check storage policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;

-- Count objects in each bucket
SELECT bucket_id, COUNT(*) as file_count
FROM storage.objects
GROUP BY bucket_id;


-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Buckets created:
-- 1. avatars (PUBLIC, 5MB, profile pictures)
-- 2. videos-private (PRIVATE, 500MB, video files)
-- 3. homework-files (PRIVATE, 50MB, all files)
-- 4. video-thumbnails (PUBLIC, 5MB, images)
-- 5. courses (PRIVATE, for PDFs and docs)
--
-- All policies applied for secure access
-- ============================================
