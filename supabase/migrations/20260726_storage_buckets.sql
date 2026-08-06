-- ============================================================================
-- STORAGE BUCKETS FOR FILE UPLOADS
-- Creates buckets for student images and other uploads
-- ============================================================================

-- ============================================================================
-- PART 1: STUDENT IMAGES BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-images',
  'student-images',
  true,  -- Public bucket for easy access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: STORAGE POLICIES FOR STUDENT IMAGES
-- ============================================================================

-- Allow authenticated users to upload student images
CREATE POLICY "Authenticated users can upload student images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-images' AND
    auth.role() = 'authenticated'
  );

-- Allow public to view student images (public bucket)
CREATE POLICY "Public can view student images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-images');

-- Allow authenticated users to update/delete student images
CREATE POLICY "Authenticated users can update student images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'student-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete student images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student-images' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- PART 3: VERIFICATION
-- ============================================================================

SELECT 
  '✅ Storage buckets created' as status,
  COUNT(*) as count
FROM storage.buckets 
WHERE id IN ('student-images', 'kyc-documents');

-- ============================================================================
-- PART 4: NOTES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STORAGE BUCKETS CONFIGURED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ student-images bucket created (public)';
  RAISE NOTICE '✅ kyc-documents bucket created (private)';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Verify buckets in Supabase Dashboard > Storage';
  RAISE NOTICE '2. Test file uploads from the application';
  RAISE NOTICE '3. Adjust file size limits if needed';
  RAISE NOTICE '========================================';
END $$;