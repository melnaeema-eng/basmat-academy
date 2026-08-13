-- ============================================================
-- Basmat Alnawabigh Academy - Sprint 2 Video Fix
-- Allow Admin to manage MP4 files in course-videos bucket
-- ============================================================

DROP POLICY IF EXISTS "Admin upload course videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin update course videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete course videos" ON storage.objects;

CREATE POLICY "Admin upload course videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
);

CREATE POLICY "Admin update course videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
);

CREATE POLICY "Admin delete course videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin'
  )
);
