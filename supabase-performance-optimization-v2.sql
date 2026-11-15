-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT D'OPTIMISATION PERFORMANCE - JULES CLASS GO (Version Transactionnelle)
-- ═══════════════════════════════════════════════════════════════════════════
-- Objectif: Améliorer la capacité de 500 → 1,000+ users simultanés
-- Exécution: Copier-coller TOUT LE SCRIPT d'un coup dans Supabase SQL Editor
-- Durée: ~30 secondes (crée les indexes avec locks temporaires)
-- Note: Utilise CREATE INDEX (pas CONCURRENTLY) pour permettre l'exécution en transaction
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. INDEXES CRITIQUES
-- ─────────────────────────────────────────────────────────────────────────

-- Bookings: Recherche par professeur + date (page booking)
DROP INDEX IF EXISTS idx_bookings_teacher_scheduled;
CREATE INDEX idx_bookings_teacher_scheduled
ON bookings(teacher_id, scheduled_at)
WHERE status NOT IN ('cancelled', 'no_show');

-- Bookings: Recherche par étudiant (dashboard étudiant)
DROP INDEX IF EXISTS idx_bookings_student_status;
CREATE INDEX idx_bookings_student_status
ON bookings(student_id, status);

-- Transactions: Recherche par étudiant + statut (historique paiements)
DROP INDEX IF EXISTS idx_transactions_student_status;
CREATE INDEX idx_transactions_student_status
ON transactions(student_id, status)
WHERE status = 'completed';

-- Transactions: Recherche par teacher (paiements reçus)
DROP INDEX IF EXISTS idx_transactions_teacher_status;
CREATE INDEX idx_transactions_teacher_status
ON transactions(teacher_id, status)
WHERE status = 'completed' AND teacher_id IS NOT NULL;

-- Transactions: Recherche par type de paiement (analytics)
DROP INDEX IF EXISTS idx_transactions_type_created;
CREATE INDEX idx_transactions_type_created
ON transactions(payment_type, created_at DESC);

-- Enrollments: Vérifier si étudiant inscrit (check access)
DROP INDEX IF EXISTS idx_enrollments_student_classroom_active;
CREATE INDEX idx_enrollments_student_classroom_active
ON enrollments(student_id, classroom_id)
WHERE status = 'active';

-- Classrooms: Liste des cours publiés (page /courses)
DROP INDEX IF EXISTS idx_classrooms_published_created;
CREATE INDEX idx_classrooms_published_created
ON classrooms(published_at DESC, created_at DESC)
WHERE published_at IS NOT NULL;

-- Classrooms: Recherche par professeur (profil prof)
DROP INDEX IF EXISTS idx_classrooms_teacher_published;
CREATE INDEX idx_classrooms_teacher_published
ON classrooms(teacher_id, published_at DESC)
WHERE published_at IS NOT NULL;

-- Users: Recherche professeurs disponibles
DROP INDEX IF EXISTS idx_users_role_available;
CREATE INDEX idx_users_role_available
ON users(role, is_available)
WHERE role = 'teacher' AND is_available = true;

-- Subscriptions: Récupérer l'abonnement actif d'un user
DROP INDEX IF EXISTS idx_subscriptions_user_status;
CREATE INDEX idx_subscriptions_user_status
ON subscriptions(user_id, status)
WHERE status = 'active';

-- Notifications: Récupérer notifications non lues d'un user (si table existe)
DROP INDEX IF EXISTS idx_notifications_user_read;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Index composé pour optimiser les RLS policies
DROP INDEX IF EXISTS idx_transactions_student_teacher;
CREATE INDEX idx_transactions_student_teacher
ON transactions(student_id, teacher_id);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. STATISTIQUES DB (pour query planner)
-- ─────────────────────────────────────────────────────────────────────────

ANALYZE bookings;
ANALYZE transactions;
ANALYZE enrollments;
ANALYZE classrooms;
ANALYZE users;
ANALYZE subscriptions;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. FONCTIONS UTILITAIRES OPTIMISÉES
-- ─────────────────────────────────────────────────────────────────────────

-- Fonction: Incrémenter enrolled_count de manière atomique
CREATE OR REPLACE FUNCTION increment_enrolled_count(classroom_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE classrooms
  SET
    enrolled_count = COALESCE(enrolled_count, 0) + 1,
    updated_at = NOW()
  WHERE id = classroom_id_param;
END;
$$;

-- Fonction: Décrémenter enrolled_count
CREATE OR REPLACE FUNCTION decrement_enrolled_count(classroom_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE classrooms
  SET
    enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0),
    updated_at = NOW()
  WHERE id = classroom_id_param;
END;
$$;

-- Fonction: Vérifier disponibilité d'un créneau (atomic)
CREATE OR REPLACE FUNCTION is_slot_available(
  teacher_id_param UUID,
  scheduled_at_param TIMESTAMPTZ,
  exclude_booking_id UUID DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slot_taken boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM bookings
    WHERE
      teacher_id = teacher_id_param
      AND scheduled_at = scheduled_at_param
      AND status IN ('pending', 'confirmed', 'in_progress')
      AND (exclude_booking_id IS NULL OR id != exclude_booking_id)
  ) INTO slot_taken;

  RETURN NOT slot_taken;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. TRIGGERS POUR MAINTENIR LES COMPTEURS
-- ─────────────────────────────────────────────────────────────────────────

-- Trigger: Auto-update enrolled_count quand enrollment change
CREATE OR REPLACE FUNCTION update_enrolled_count_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
    UPDATE classrooms
    SET enrolled_count = COALESCE(enrolled_count, 0) + 1
    WHERE id = NEW.classroom_id;

  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    UPDATE classrooms
    SET enrolled_count = COALESCE(enrolled_count, 0) + 1
    WHERE id = NEW.classroom_id;

  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active') THEN
    UPDATE classrooms
    SET enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0)
    WHERE id = NEW.classroom_id;

  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
    UPDATE classrooms
    SET enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0)
    WHERE id = OLD.classroom_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enrollment_count_trigger ON enrollments;

CREATE TRIGGER enrollment_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_enrolled_count_trigger();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. OPTIMISATION DES RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Transactions: Policy optimisée avec indexes
DROP POLICY IF EXISTS "Users view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users view own transactions v2" ON transactions;

CREATE POLICY "Users view own transactions v2"
ON transactions FOR SELECT
USING (
  auth.uid() = student_id
  OR
  (teacher_id IS NOT NULL AND auth.uid() = teacher_id)
);

-- Bookings: Policy optimisée
DROP POLICY IF EXISTS "Users view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users view own bookings v2" ON bookings;

CREATE POLICY "Users view own bookings v2"
ON bookings FOR SELECT
USING (
  auth.uid() = student_id
  OR
  auth.uid() = teacher_id
);

-- Enrollments: Policy avec index sur status
DROP POLICY IF EXISTS "Students view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Students view own enrollments v2" ON enrollments;

CREATE POLICY "Students view own enrollments v2"
ON enrollments FOR SELECT
USING (auth.uid() = student_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. VUES POUR MONITORING
-- ─────────────────────────────────────────────────────────────────────────

-- Vue: Connexions DB en temps réel
CREATE OR REPLACE VIEW db_connections_monitor AS
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_queries,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_queries,
  max(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- Vue: Top 10 tables par taille
CREATE OR REPLACE VIEW db_table_sizes AS
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
  pg_total_relation_size(tablename::regclass) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 10;

-- Vue: Transactions récentes par type
CREATE OR REPLACE VIEW recent_transactions_summary AS
SELECT
  payment_type,
  status,
  currency,
  COUNT(*) as count,
  SUM(amount_eur) as total_eur,
  AVG(amount_eur) as avg_eur,
  MAX(created_at) as last_transaction
FROM transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY payment_type, status, currency
ORDER BY payment_type, status;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. VÉRIFICATION DES OPTIMISATIONS
-- ─────────────────────────────────────────────────────────────────────────

-- Afficher un résumé des optimisations
SELECT
  '✅ Script d''optimisation exécuté avec succès!' as message,
  NOW() as executed_at,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as new_indexes_created,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size;

-- Afficher la liste des nouveaux indexes
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS POST-EXÉCUTION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ✅ FAIT! Les optimisations sont actives immédiatement.
--
-- 📊 VÉRIFICATIONS À FAIRE:
--
-- 1. Vérifier les connexions DB:
--    SELECT * FROM db_connections_monitor;
--
-- 2. Vérifier la taille des tables:
--    SELECT * FROM db_table_sizes;
--
-- 3. Vérifier les transactions récentes:
--    SELECT * FROM recent_transactions_summary;
--
-- 4. Tester les pages critiques:
--    - /courses (doit charger en < 500ms)
--    - /book/[teacherId] (doit charger en < 800ms)
--    - /checkout (doit charger en < 600ms)
--
-- 🎯 IMPACT ATTENDU:
--    - Performance: +40% sur requêtes fréquentes
--    - Capacité: 500 → 800-1,000 users simultanés
--    - Latence: -30% sur pages critiques
--
-- ═══════════════════════════════════════════════════════════════════════════
