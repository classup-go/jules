-- ============================================
-- Migration 006: Course-Level Enrollment System
-- ============================================
-- Date: 2026-01-24
-- Description: Modify enrollments to support course-level purchases
--              Each course can be purchased individually
-- ============================================

-- ============================================
-- 1. BACKUP EXISTING ENROLLMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS enrollments_backup_20260124 AS
SELECT * FROM enrollments;

COMMENT ON TABLE enrollments_backup_20260124 IS 'Backup avant migration course-level enrollment - 2026-01-24';

-- ============================================
-- 2. ADD COURSE_ID TO ENROLLMENTS
-- ============================================

-- Add course_id column (nullable for now to allow existing data)
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Create composite index for student + course lookup
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course
ON enrollments(student_id, course_id)
WHERE course_id IS NOT NULL;

-- ============================================
-- 3. MIGRATE EXISTING CLASSROOM ENROLLMENTS TO COURSE ENROLLMENTS
-- ============================================

-- For each existing enrollment, create an enrollment for each course in that classroom
INSERT INTO enrollments (student_id, classroom_id, course_id, payment_id, payment_required, payment_completed_at, enrolled_at, progress, status, created_at, updated_at)
SELECT
  e.student_id,
  e.classroom_id,
  c.id as course_id,
  e.payment_id,
  CASE
    WHEN c.access_type = 'premium' THEN true
    ELSE false
  END as payment_required,
  e.payment_completed_at,
  e.enrolled_at,
  0 as progress,
  e.status,
  NOW() as created_at,
  NOW() as updated_at
FROM enrollments e
INNER JOIN courses c ON c.classroom_id = e.classroom_id
WHERE e.course_id IS NULL  -- Only migrate old enrollments without course_id
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. ADD UNIQUE CONSTRAINT
-- ============================================

-- Prevent duplicate enrollments for same student + course
-- Drop existing constraint if it exists
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_classroom_unique;

-- Add new unique constraint for student + course
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_student_course_unique
ON enrollments(student_id, course_id)
WHERE course_id IS NOT NULL;

-- ============================================
-- 5. UPDATE TRANSACTIONS FOR COURSE-LEVEL TRACKING
-- ============================================

-- Add course_id to transactions for better tracking
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Migrate existing transactions: link to the first course of the classroom
UPDATE transactions t
SET course_id = (
  SELECT c.id
  FROM courses c
  WHERE c.classroom_id = (t.metadata->>'classroom_id')::uuid
  ORDER BY c.created_at
  LIMIT 1
)
WHERE t.payment_type = 'course_enrollment'
  AND t.course_id IS NULL
  AND t.metadata->>'classroom_id' IS NOT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_transactions_course_id ON transactions(course_id);

-- ============================================
-- 6. UPDATE COURSES TABLE
-- ============================================

-- Add enrolled_count at course level (not just classroom level)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0;

-- Calculate current enrollment counts per course
UPDATE courses c
SET enrolled_count = (
  SELECT COUNT(DISTINCT e.student_id)
  FROM enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_courses_enrolled_count ON courses(enrolled_count DESC);

-- ============================================
-- 7. CREATE FUNCTION TO AUTO-UPDATE ENROLLED_COUNT
-- ============================================

CREATE OR REPLACE FUNCTION update_course_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count on new enrollment
    IF NEW.course_id IS NOT NULL AND NEW.status = 'active' THEN
      UPDATE courses
      SET enrolled_count = COALESCE(enrolled_count, 0) + 1,
          updated_at = NOW()
      WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF NEW.course_id IS NOT NULL THEN
      IF OLD.status != 'active' AND NEW.status = 'active' THEN
        -- Status changed to active: increment
        UPDATE courses
        SET enrolled_count = COALESCE(enrolled_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.course_id;
      ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
        -- Status changed from active: decrement
        UPDATE courses
        SET enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0),
            updated_at = NOW()
        WHERE id = NEW.course_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count on deletion
    IF OLD.course_id IS NOT NULL AND OLD.status = 'active' THEN
      UPDATE courses
      SET enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0),
          updated_at = NOW()
      WHERE id = OLD.course_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_course_enrolled_count ON enrollments;
CREATE TRIGGER trigger_update_course_enrolled_count
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_course_enrolled_count();

-- ============================================
-- 8. ADD COMMENT FOR CLARITY
-- ============================================

COMMENT ON COLUMN enrollments.course_id IS 'Course-level enrollment: each course must be enrolled/purchased individually';
COMMENT ON COLUMN enrollments.classroom_id IS 'Classroom reference maintained for organizational purposes';
COMMENT ON COLUMN courses.enrolled_count IS 'Number of active students enrolled in this specific course';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check enrollment distribution
-- SELECT
--   c.classroom_id,
--   cl.title as classroom_title,
--   c.title as course_title,
--   c.enrolled_count,
--   COUNT(e.id) as actual_enrollments
-- FROM courses c
-- INNER JOIN classrooms cl ON cl.id = c.classroom_id
-- LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
-- GROUP BY c.id, c.classroom_id, cl.title, c.title, c.enrolled_count;

-- Check for students with multiple course enrollments in same classroom
-- SELECT
--   e.student_id,
--   e.classroom_id,
--   COUNT(DISTINCT e.course_id) as courses_enrolled
-- FROM enrollments e
-- WHERE e.course_id IS NOT NULL
-- GROUP BY e.student_id, e.classroom_id;
