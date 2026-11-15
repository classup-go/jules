-- ============================================
-- Jules Class Go - Notifications System
-- Execute these commands in Supabase SQL Editor
-- ============================================

-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL, -- 'assignment_created', 'assignment_due_soon', 'assignment_graded', 'submission_received', 'new_message', 'course_update'
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities (nullable for flexibility)
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,

  -- Action URL
  action_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Priority
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_assignment ON notifications(assignment_id) WHERE assignment_id IS NOT NULL;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (server-side only via service role)
CREATE POLICY "System inserts notifications"
ON notifications FOR INSERT
WITH CHECK (true);


-- ============================================
-- 2. FUNCTION TO CREATE NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_assignment_id UUID DEFAULT NULL,
  p_submission_id UUID DEFAULT NULL,
  p_classroom_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message,
    assignment_id, submission_id, classroom_id,
    action_url, priority
  )
  VALUES (
    p_user_id, p_type, p_title, p_message,
    p_assignment_id, p_submission_id, p_classroom_id,
    p_action_url, p_priority
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


-- ============================================
-- 3. TRIGGER: Notify students when assignment is published
-- ============================================
CREATE OR REPLACE FUNCTION notify_assignment_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
BEGIN
  -- Only notify when status changes from draft to published
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    -- Get all enrolled students in the classroom
    FOR v_student IN
      SELECT DISTINCT e.student_id
      FROM enrollments e
      WHERE e.classroom_id = NEW.classroom_id
        AND e.status = 'active'
    LOOP
      PERFORM create_notification(
        v_student.student_id,
        'assignment_created',
        'Nouveau devoir disponible',
        'Le devoir "' || NEW.title || '" a été publié',
        NEW.id,
        NULL,
        NEW.classroom_id,
        '/student/assignments/' || NEW.id || '/submit?classroom=' || NEW.classroom_id,
        'normal'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_assignment_published
AFTER INSERT OR UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION notify_assignment_published();


-- ============================================
-- 4. TRIGGER: Notify teacher when submission is received
-- ============================================
CREATE OR REPLACE FUNCTION notify_submission_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_student RECORD;
BEGIN
  -- Only on new submission
  IF TG_OP = 'INSERT' THEN
    -- Get assignment and student info
    SELECT a.*, u.display_name as student_name
    INTO v_assignment
    FROM assignments a
    LEFT JOIN users u ON u.id = NEW.student_id
    WHERE a.id = NEW.assignment_id;

    -- Notify teacher
    PERFORM create_notification(
      v_assignment.teacher_id,
      'submission_received',
      'Nouvelle soumission reçue',
      v_assignment.student_name || ' a soumis le devoir "' || v_assignment.title || '"',
      NEW.assignment_id,
      NEW.id,
      v_assignment.classroom_id,
      '/teacher/submissions/' || NEW.id || '/grade',
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_submission_received
AFTER INSERT ON submissions
FOR EACH ROW
EXECUTE FUNCTION notify_submission_received();


-- ============================================
-- 5. TRIGGER: Notify student when assignment is graded
-- ============================================
CREATE OR REPLACE FUNCTION notify_assignment_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
BEGIN
  -- Only when status changes to graded
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
    -- Get assignment info
    SELECT * INTO v_assignment
    FROM assignments
    WHERE id = NEW.assignment_id;

    -- Notify student
    PERFORM create_notification(
      NEW.student_id,
      'assignment_graded',
      'Devoir noté',
      'Votre devoir "' || v_assignment.title || '" a été noté : ' || NEW.grade || '/' || v_assignment.max_points,
      NEW.assignment_id,
      NEW.id,
      v_assignment.classroom_id,
      '/student/submissions/' || NEW.id,
      CASE WHEN NEW.passed THEN 'normal' ELSE 'high' END
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_assignment_graded
AFTER UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION notify_assignment_graded();


-- ============================================
-- 6. TRIGGER: Notify about upcoming assignment due date (24h before)
-- ============================================
-- This would typically be run via a scheduled job (cron)
-- Example function for manual execution or cron:
CREATE OR REPLACE FUNCTION notify_assignments_due_soon()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_student RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Find assignments due in 24 hours
  FOR v_assignment IN
    SELECT *
    FROM assignments
    WHERE status = 'published'
      AND due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND due_date > NOW()
  LOOP
    -- Get all students who haven't submitted yet
    FOR v_student IN
      SELECT DISTINCT e.student_id
      FROM enrollments e
      WHERE e.classroom_id = v_assignment.classroom_id
        AND e.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM submissions s
          WHERE s.assignment_id = v_assignment.id
            AND s.student_id = e.student_id
        )
    LOOP
      -- Check if notification already sent (avoid duplicates)
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_student.student_id
          AND assignment_id = v_assignment.id
          AND type = 'assignment_due_soon'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM create_notification(
          v_student.student_id,
          'assignment_due_soon',
          'Devoir à rendre bientôt',
          'Le devoir "' || v_assignment.title || '" est à rendre dans moins de 24h',
          v_assignment.id,
          NULL,
          v_assignment.classroom_id,
          '/student/assignments/' || v_assignment.id || '/submit?classroom=' || v_assignment.classroom_id,
          'high'
        );
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- To run this manually: SELECT notify_assignments_due_soon();
-- To schedule via cron (Supabase Dashboard -> Database -> Cron):
-- SELECT cron.schedule('notify-assignments-due', '0 * * * *', 'SELECT notify_assignments_due_soon()');


-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ============================================
-- 8. VIEW: Unread notification count per user
-- ============================================
CREATE OR REPLACE VIEW user_unread_notifications_count AS
SELECT
  user_id,
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_count
FROM notifications
WHERE is_read = false
GROUP BY user_id;


-- ============================================
-- DONE!
-- ============================================
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Create API endpoints in Next.js
-- 3. Create notification UI components
-- 4. Integrate with dashboards
