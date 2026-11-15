-- ============================================
-- Jules Class Go - Homework & Grading System
-- Execute these commands in Supabase SQL Editor
-- ============================================

-- 1. CREATE ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,

  -- Assignment details
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,

  -- Type and configuration
  assignment_type TEXT NOT NULL DEFAULT 'file_upload', -- 'file_upload', 'text', 'quiz', 'mixed'
  max_points INTEGER NOT NULL DEFAULT 100,
  passing_grade INTEGER DEFAULT 60,

  -- Dates
  published_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  late_submission_allowed BOOLEAN DEFAULT true,
  late_penalty_percent INTEGER DEFAULT 10, -- Penalty per day late

  -- Status and settings
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'closed'
  allow_resubmission BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 1,

  -- Resources
  resource_urls TEXT[], -- Array of file URLs (PDFs, docs, etc.)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Students can view published assignments in their enrolled classrooms
CREATE POLICY "Students view published assignments"
ON assignments FOR SELECT
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.classroom_id = assignments.classroom_id
    AND enrollments.student_id = auth.uid()
    AND enrollments.status = 'active'
  )
);

-- Teachers can manage their own assignments
CREATE POLICY "Teachers manage own assignments"
ON assignments FOR ALL
USING (teacher_id = auth.uid());


-- 2. CREATE SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Submission content
  submission_text TEXT,
  submission_files TEXT[], -- Array of file URLs

  -- Submission metadata
  attempt_number INTEGER DEFAULT 1,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT false,

  -- Grading
  status TEXT NOT NULL DEFAULT 'submitted', -- 'draft', 'submitted', 'graded', 'returned'
  grade INTEGER, -- Score received
  max_points INTEGER, -- Max points at time of submission
  percentage DECIMAL(5,2), -- Calculated percentage
  passed BOOLEAN,

  -- Feedback
  feedback_text TEXT,
  feedback_files TEXT[], -- Teacher can attach files
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(assignment_id, student_id, attempt_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_graded_by ON submissions(graded_by);

-- RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Students can view and manage their own submissions
CREATE POLICY "Students manage own submissions"
ON submissions FOR ALL
USING (student_id = auth.uid());

-- Teachers can view and grade submissions for their assignments
CREATE POLICY "Teachers grade own assignments"
ON submissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = submissions.assignment_id
    AND assignments.teacher_id = auth.uid()
  )
);


-- 3. CREATE SUBMISSION COMMENTS TABLE (Optional - for detailed feedback)
-- ============================================
CREATE TABLE IF NOT EXISTS submission_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  comment_text TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false, -- Only visible to student and teacher

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submission_comments ON submission_comments(submission_id);

-- RLS
ALTER TABLE submission_comments ENABLE ROW LEVEL SECURITY;

-- Students can view comments on their own submissions
CREATE POLICY "Students view own submission comments"
ON submission_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM submissions
    WHERE submissions.id = submission_comments.submission_id
    AND submissions.student_id = auth.uid()
  )
);

-- Teachers can view and add comments to their assignments' submissions
CREATE POLICY "Teachers manage assignment comments"
ON submission_comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM submissions
    JOIN assignments ON assignments.id = submissions.assignment_id
    WHERE submissions.id = submission_comments.submission_id
    AND assignments.teacher_id = auth.uid()
  )
);

-- Users can add comments to their own submissions
CREATE POLICY "Users add own comments"
ON submission_comments FOR INSERT
WITH CHECK (user_id = auth.uid());


-- 4. CREATE RUBRIC TABLE (Optional - for detailed grading criteria)
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,

  criterion_name TEXT NOT NULL,
  criterion_description TEXT,
  max_points INTEGER NOT NULL,
  order_index INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rubrics_assignment ON assignment_rubrics(assignment_id);

-- RLS
ALTER TABLE assignment_rubrics ENABLE ROW LEVEL SECURITY;

-- Anyone enrolled can view rubrics
CREATE POLICY "View assignment rubrics"
ON assignment_rubrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN enrollments ON enrollments.classroom_id = assignments.classroom_id
    WHERE assignments.id = assignment_rubrics.assignment_id
    AND (enrollments.student_id = auth.uid() OR assignments.teacher_id = auth.uid())
  )
);

-- Teachers manage rubrics for their assignments
CREATE POLICY "Teachers manage rubrics"
ON assignment_rubrics FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assignments
    WHERE assignments.id = assignment_rubrics.assignment_id
    AND assignments.teacher_id = auth.uid()
  )
);


-- 5. CREATE RUBRIC GRADES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rubric_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  rubric_id UUID NOT NULL REFERENCES assignment_rubrics(id) ON DELETE CASCADE,

  points_earned INTEGER NOT NULL,
  feedback TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(submission_id, rubric_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rubric_grades_submission ON rubric_grades(submission_id);

-- RLS
ALTER TABLE rubric_grades ENABLE ROW LEVEL SECURITY;

-- Students can view their own rubric grades
CREATE POLICY "Students view own rubric grades"
ON rubric_grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM submissions
    WHERE submissions.id = rubric_grades.submission_id
    AND submissions.student_id = auth.uid()
  )
);

-- Teachers manage rubric grades
CREATE POLICY "Teachers manage rubric grades"
ON rubric_grades FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM submissions
    JOIN assignments ON assignments.id = submissions.assignment_id
    WHERE submissions.id = rubric_grades.submission_id
    AND assignments.teacher_id = auth.uid()
  )
);


-- 6. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update submission percentage when grade changes
CREATE OR REPLACE FUNCTION calculate_submission_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND NEW.max_points IS NOT NULL AND NEW.max_points > 0 THEN
    NEW.percentage := (NEW.grade::DECIMAL / NEW.max_points::DECIMAL) * 100;
    NEW.passed := NEW.percentage >= (
      SELECT passing_grade FROM assignments WHERE id = NEW.assignment_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_submission_percentage
BEFORE INSERT OR UPDATE OF grade, max_points ON submissions
FOR EACH ROW
EXECUTE FUNCTION calculate_submission_percentage();


-- Function to check if submission is late
CREATE OR REPLACE FUNCTION check_submission_late()
RETURNS TRIGGER AS $$
DECLARE
  assignment_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT due_date INTO assignment_due_date
  FROM assignments
  WHERE id = NEW.assignment_id;

  IF NEW.submitted_at > assignment_due_date THEN
    NEW.is_late := true;
  ELSE
    NEW.is_late := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_submission_late_trigger
BEFORE INSERT OR UPDATE OF submitted_at ON submissions
FOR EACH ROW
EXECUTE FUNCTION check_submission_late();


-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER submissions_updated_at
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER submission_comments_updated_at
BEFORE UPDATE ON submission_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


-- 7. VIEWS FOR ANALYTICS
-- ============================================

-- View: Assignment statistics
CREATE OR REPLACE VIEW assignment_statistics AS
SELECT
  a.id as assignment_id,
  a.title,
  a.classroom_id,
  a.teacher_id,
  a.due_date,
  a.max_points,
  COUNT(DISTINCT s.student_id) as total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.student_id END) as graded_count,
  COUNT(DISTINCT CASE WHEN s.is_late THEN s.student_id END) as late_submissions,
  ROUND(AVG(s.percentage), 2) as average_grade,
  COUNT(DISTINCT CASE WHEN s.passed THEN s.student_id END) as passed_count
FROM assignments a
LEFT JOIN submissions s ON s.assignment_id = a.id
GROUP BY a.id, a.title, a.classroom_id, a.teacher_id, a.due_date, a.max_points;


-- View: Student assignment overview
CREATE OR REPLACE VIEW student_assignment_overview AS
SELECT
  e.student_id,
  a.id as assignment_id,
  a.title,
  a.classroom_id,
  a.due_date,
  a.max_points,
  a.status as assignment_status,
  s.id as submission_id,
  s.status as submission_status,
  s.grade,
  s.percentage,
  s.passed,
  s.is_late,
  s.submitted_at,
  s.feedback_text,
  CASE
    WHEN s.id IS NULL THEN 'not_submitted'
    WHEN s.status = 'submitted' THEN 'pending_grading'
    WHEN s.status = 'graded' THEN 'graded'
    ELSE s.status
  END as overall_status
FROM enrollments e
JOIN assignments a ON a.classroom_id = e.classroom_id
LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
WHERE e.status = 'active' AND a.status = 'published';


-- 8. STORAGE BUCKET FOR HOMEWORK FILES
-- ============================================
-- Note: Create bucket 'homework-files' in Supabase Dashboard
-- Then apply these policies:

-- Policy: Authenticated users can upload homework files
-- CREATE POLICY "Students upload homework files"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'homework-files'
--   AND auth.role() = 'authenticated'
-- );

-- Policy: Users can read files they uploaded or are assigned to them
-- CREATE POLICY "Users read own homework files"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'homework-files'
--   AND (
--     auth.uid()::text = (storage.foldername(name))[1]
--     OR EXISTS (
--       SELECT 1 FROM submissions
--       WHERE submissions.student_id = auth.uid()
--       OR submissions.graded_by = auth.uid()
--     )
--   )
-- );


-- 9. VERIFICATION QUERIES
-- ============================================

-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('assignments', 'submissions', 'submission_comments', 'assignment_rubrics', 'rubric_grades');

-- Check views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('assignment_statistics', 'student_assignment_overview');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('assignments', 'submissions', 'submission_comments', 'assignment_rubrics', 'rubric_grades');


-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Next steps:
-- 1. Create 'homework-files' bucket in Supabase Dashboard (PRIVATE)
-- 2. Apply storage policies
-- 3. Test API endpoints
-- 4. Create UI components
-- ============================================
