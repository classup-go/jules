-- ============================================
-- Script de Vérification Système de Devoirs
-- Exécutez ceci pour diagnostiquer les problèmes
-- ============================================

-- 1. VÉRIFIER LES TABLES EXISTENT
-- ============================================
SELECT
  'Tables vérification' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments') THEN '✅ assignments existe'
    ELSE '❌ assignments manquante'
  END as assignments_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions') THEN '✅ submissions existe'
    ELSE '❌ submissions manquante'
  END as submissions_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN '✅ notifications existe'
    ELSE '❌ notifications manquante'
  END as notifications_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN '✅ enrollments existe'
    ELSE '❌ enrollments manquante'
  END as enrollments_table;

-- 2. VÉRIFIER LES TRIGGERS
-- ============================================
SELECT
  'Triggers vérification' as check_type,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notify_assignment_published',
  'trigger_notify_submission_received',
  'trigger_notify_assignment_graded'
)
ORDER BY trigger_name;

-- 3. VÉRIFIER LES ENROLLMENTS
-- ============================================
SELECT
  'Enrollments actifs' as check_type,
  COUNT(*) as total_enrollments,
  COUNT(DISTINCT classroom_id) as classrooms_with_students,
  COUNT(DISTINCT student_id) as total_students
FROM enrollments
WHERE status = 'active';

-- 4. VÉRIFIER LES DEVOIRS ET LEURS CLASSES
-- ============================================
SELECT
  'Devoirs par classe' as check_type,
  c.id as classroom_id,
  c.title as classroom_title,
  COUNT(a.id) as assignments_count,
  COUNT(DISTINCT e.student_id) as enrolled_students
FROM classrooms c
LEFT JOIN assignments a ON a.classroom_id = c.id
LEFT JOIN enrollments e ON e.classroom_id = c.id AND e.status = 'active'
GROUP BY c.id, c.title
HAVING COUNT(a.id) > 0
ORDER BY c.title;

-- 5. VÉRIFIER LES NOTIFICATIONS ENVOYÉES
-- ============================================
SELECT
  'Notifications par type' as check_type,
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- 6. TEST: Simuler une notification pour un devoir
-- ============================================
-- Cette requête montre combien d'étudiants RECEVRAIENT une notification
-- pour chaque devoir publié

SELECT
  'Test notification' as check_type,
  a.id as assignment_id,
  a.title,
  a.status,
  c.title as classroom_title,
  COUNT(DISTINCT e.student_id) as students_who_would_receive_notification
FROM assignments a
JOIN classrooms c ON c.id = a.classroom_id
LEFT JOIN enrollments e ON e.classroom_id = a.classroom_id AND e.status = 'active'
WHERE a.status = 'published'
GROUP BY a.id, a.title, a.status, c.title
ORDER BY a.created_at DESC
LIMIT 10;

-- 7. DIAGNOSTIC: Devoirs sans classe assignée
-- ============================================
SELECT
  'Devoirs orphelins' as check_type,
  id,
  title,
  classroom_id,
  'ATTENTION: classroom_id est NULL !' as warning
FROM assignments
WHERE classroom_id IS NULL;

-- 8. DIAGNOSTIC: Étudiants sans enrollment
-- ============================================
SELECT
  'Utilisateurs étudiants' as check_type,
  COUNT(*) as total_students,
  COUNT(*) FILTER (
    WHERE id IN (SELECT student_id FROM enrollments WHERE status = 'active')
  ) as students_enrolled,
  COUNT(*) FILTER (
    WHERE id NOT IN (SELECT student_id FROM enrollments WHERE status = 'active')
  ) as students_not_enrolled
FROM users
WHERE role = 'student';

-- 9. RÉPARER: Re-créer le trigger de notification si nécessaire
-- ============================================
-- Copier-coller ce bloc si le trigger est cassé

DROP TRIGGER IF EXISTS trigger_notify_assignment_published ON assignments;
DROP FUNCTION IF EXISTS notify_assignment_published() CASCADE;

CREATE OR REPLACE FUNCTION notify_assignment_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Only notify when status changes from draft to published
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status = 'draft') THEN

    -- Debug: Log l'action
    RAISE NOTICE 'Devoir publié: % (classe: %)', NEW.title, NEW.classroom_id;

    -- Get all enrolled students in the classroom
    FOR v_student IN
      SELECT DISTINCT e.student_id
      FROM enrollments e
      WHERE e.classroom_id = NEW.classroom_id
        AND e.status = 'active'
    LOOP
      -- Create notification
      INSERT INTO notifications (
        user_id, type, title, message,
        assignment_id, classroom_id, action_url, priority
      )
      VALUES (
        v_student.student_id,
        'assignment_created',
        'Nouveau devoir disponible',
        'Le devoir "' || NEW.title || '" a été publié',
        NEW.id,
        NEW.classroom_id,
        '/student/assignments/' || NEW.id || '/submit?classroom=' || NEW.classroom_id,
        'normal'
      );

      v_count := v_count + 1;
    END LOOP;

    -- Debug: Log le nombre de notifications
    RAISE NOTICE 'Notifications créées: %', v_count;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_assignment_published
AFTER INSERT OR UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION notify_assignment_published();

-- 10. TEST FINAL: Créer un devoir test et vérifier
-- ============================================
-- NE PAS EXÉCUTER automatiquement - juste pour référence
-- Remplacez les IDs par vos vraies données

/*
-- Étape 1: Trouver un classroom_id et un teacher_id
SELECT id as classroom_id, teacher_id, title
FROM classrooms
LIMIT 1;

-- Étape 2: Vérifier qu'il y a des étudiants inscrits
SELECT student_id, status
FROM enrollments
WHERE classroom_id = 'VOTRE_CLASSROOM_ID';

-- Étape 3: Créer un devoir test
INSERT INTO assignments (
  classroom_id,
  teacher_id,
  title,
  description,
  max_points,
  due_date,
  status
)
VALUES (
  'VOTRE_CLASSROOM_ID',
  'VOTRE_TEACHER_ID',
  'TEST - Devoir de vérification',
  'Ceci est un test',
  100,
  NOW() + INTERVAL '7 days',
  'published'
)
RETURNING id;

-- Étape 4: Vérifier que les notifications ont été créées
SELECT * FROM notifications
WHERE type = 'assignment_created'
ORDER BY created_at DESC
LIMIT 10;
*/

-- ============================================
-- RÉSUMÉ
-- ============================================
SELECT
  '📊 RÉSUMÉ SYSTÈME' as section,
  (SELECT COUNT(*) FROM assignments) as total_assignments,
  (SELECT COUNT(*) FROM assignments WHERE status = 'published') as published_assignments,
  (SELECT COUNT(*) FROM enrollments WHERE status = 'active') as active_enrollments,
  (SELECT COUNT(*) FROM notifications WHERE type = 'assignment_created') as assignment_notifications_sent,
  (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM classrooms) as total_classrooms;
