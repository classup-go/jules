-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT D'OPTIMISATION PERFORMANCE - JULES CLASS GO
-- ═══════════════════════════════════════════════════════════════════════════
-- Objectif: Améliorer la capacité de 500 → 1,000+ users simultanés (tier gratuit)
-- Exécution: Copier-coller dans Supabase SQL Editor
-- Durée: ~2-5 minutes (CONCURRENTLY = pas de lock)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. INDEXES CRITIQUES (si pas déjà créés)
-- ─────────────────────────────────────────────────────────────────────────

-- Bookings: Recherche par professeur + date (page booking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_teacher_scheduled
ON bookings(teacher_id, scheduled_at)
WHERE status NOT IN ('cancelled', 'no_show');

-- Bookings: Recherche par étudiant (dashboard étudiant)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_student_status
ON bookings(student_id, status);

-- Transactions: Recherche par étudiant + statut (historique paiements)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_student_status
ON transactions(student_id, status)
WHERE status = 'completed';

-- Transactions: Recherche par teacher (paiements reçus)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_teacher_status
ON transactions(teacher_id, status)
WHERE status = 'completed' AND teacher_id IS NOT NULL;

-- Transactions: Recherche par type de paiement (analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_created
ON transactions(payment_type, created_at DESC);

-- Enrollments: Vérifier si étudiant inscrit (check access)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_classroom_active
ON enrollments(student_id, classroom_id)
WHERE status = 'active';

-- Classrooms: Liste des cours publiés (page /courses)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classrooms_published_created
ON classrooms(published_at DESC, created_at DESC)
WHERE published_at IS NOT NULL;

-- Classrooms: Recherche par professeur (profil prof)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classrooms_teacher_published
ON classrooms(teacher_id, published_at DESC)
WHERE published_at IS NOT NULL;

-- Users: Recherche professeurs disponibles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_available
ON users(role, is_available)
WHERE role = 'teacher' AND is_available = true;

-- Subscriptions: Récupérer l'abonnement actif d'un user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status
ON subscriptions(user_id, status)
WHERE status = 'active';

-- Notifications: Récupérer notifications non lues d'un user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

COMMENT ON INDEX idx_bookings_teacher_scheduled IS 'Performance: Page booking - Afficher disponibilités prof';
COMMENT ON INDEX idx_transactions_student_status IS 'Performance: Dashboard étudiant - Historique paiements';
COMMENT ON INDEX idx_enrollments_student_classroom_active IS 'Performance: Check access cours (RLS)';
COMMENT ON INDEX idx_classrooms_published_created IS 'Performance: Page courses - Liste des cours';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. STATISTIQUES DB (pour query planner)
-- ─────────────────────────────────────────────────────────────────────────

-- Forcer la mise à jour des statistiques pour optimiser les query plans
ANALYZE bookings;
ANALYZE transactions;
ANALYZE enrollments;
ANALYZE classrooms;
ANALYZE users;
ANALYZE subscriptions;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. VUES MATERIALISÉES (pour requêtes analytiques lourdes)
-- ─────────────────────────────────────────────────────────────────────────

-- Vue: Statistiques par professeur (évite calculs répétés)
CREATE MATERIALIZED VIEW IF NOT EXISTS teacher_stats AS
SELECT
  u.id as teacher_id,
  u.display_name,
  u.avatar_url,
  u.hourly_rate,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')) as total_sessions,
  COUNT(DISTINCT e.student_id) as total_students,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as total_reviews,
  SUM(t.amount_eur) FILTER (WHERE t.status = 'completed') as total_earnings_eur
FROM users u
LEFT JOIN bookings b ON b.teacher_id = u.id
LEFT JOIN enrollments e ON e.classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = u.id)
LEFT JOIN reviews r ON r.teacher_id = u.id
LEFT JOIN transactions t ON t.teacher_id = u.id AND t.payment_type = 'booking'
WHERE u.role = 'teacher'
GROUP BY u.id, u.display_name, u.avatar_url, u.hourly_rate;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_stats_teacher_id
ON teacher_stats(teacher_id);

-- Fonction pour rafraîchir la vue (à appeler 1x/heure via cron)
CREATE OR REPLACE FUNCTION refresh_teacher_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY teacher_stats;
END;
$$;

COMMENT ON MATERIALIZED VIEW teacher_stats IS 'Stats enseignants - Refresh 1x/heure';
COMMENT ON FUNCTION refresh_teacher_stats() IS 'Appeler via pg_cron: SELECT cron.schedule(''refresh-teacher-stats'', ''0 * * * *'', ''SELECT refresh_teacher_stats()'')';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. OPTIMISATION DES RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Transactions: Policy optimisée avec indexes
DROP POLICY IF EXISTS "Users view own transactions" ON transactions;

CREATE POLICY "Users view own transactions v2"
ON transactions FOR SELECT
USING (
  auth.uid() = student_id
  OR
  (teacher_id IS NOT NULL AND auth.uid() = teacher_id)
);

-- Bookings: Policy optimisée
DROP POLICY IF EXISTS "Users view own bookings" ON bookings;

CREATE POLICY "Users view own bookings v2"
ON bookings FOR SELECT
USING (
  auth.uid() = student_id
  OR
  auth.uid() = teacher_id
);

-- Enrollments: Policy avec index sur status
DROP POLICY IF EXISTS "Students view own enrollments" ON enrollments;

CREATE POLICY "Students view own enrollments v2"
ON enrollments FOR SELECT
USING (
  auth.uid() = student_id
  AND
  status = 'active'
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. CONFIGURATION DB POUR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────

-- Augmenter le shared_buffers (cache DB en RAM)
-- Note: Nécessite un redémarrage DB (faire via Supabase Dashboard si possible)
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Augmenter le work_mem pour les queries complexes
ALTER DATABASE postgres SET work_mem = '16MB';

-- Activer le query planner pour auto-vacuum
ALTER DATABASE postgres SET autovacuum = on;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. FONCTIONS UTILITAIRES OPTIMISÉES
-- ─────────────────────────────────────────────────────────────────────────

-- Fonction: Incrémenter enrolled_count de manière atomique (évite race conditions)
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

-- Fonction: Décrémenter enrolled_count (si unenroll)
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

-- Fonction: Vérifier disponibilité d'un créneau (évite race condition)
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

COMMENT ON FUNCTION is_slot_available IS 'Vérifier si un créneau est disponible (atomic)';

-- ─────────────────────────────────────────────────────────────────────────
-- 7. TRIGGERS POUR MAINTENIR LES COMPTEURS
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
-- 8. VÉRIFICATION DES OPTIMISATIONS
-- ─────────────────────────────────────────────────────────────────────────

-- Query 1: Vérifier tous les indexes créés
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Query 2: Identifier les tables sans indexes (WARNING)
SELECT
  t.tablename,
  pg_size_pretty(pg_total_relation_size(t.tablename::regclass)) as total_size
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename
HAVING COUNT(i.indexname) = 0
ORDER BY pg_total_relation_size(t.tablename::regclass) DESC;

-- Query 3: Vérifier les slow queries (si pg_stat_statements activé)
-- SELECT
--   query,
--   calls,
--   total_time / 1000 as total_seconds,
--   mean_time / 1000 as avg_seconds,
--   max_time / 1000 as max_seconds
-- FROM pg_stat_statements
-- WHERE mean_time > 1000 -- Plus de 1 seconde
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- Query 4: Taille des tables par ordre décroissant
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
  pg_size_pretty(pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Query 5: Statistiques des connexions
SELECT
  datname,
  count(*) as connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. MONITORING QUERIES (copier dans un dashboard)
-- ─────────────────────────────────────────────────────────────────────────

-- Query: Connexions DB en temps réel
CREATE OR REPLACE VIEW db_connections_monitor AS
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_queries,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_queries,
  max(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- Query: Top 10 tables par taille
CREATE OR REPLACE VIEW db_table_sizes AS
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
  pg_total_relation_size(tablename::regclass) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 10;

-- Query: Transactions récentes par type
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
-- 10. CLEANUP RECOMMANDÉ (optionnel - faire attention!)
-- ─────────────────────────────────────────────────────────────────────────

-- Supprimer les anciennes sessions expirées (>30 jours)
-- DELETE FROM live_sessions
-- WHERE scheduled_at < NOW() - INTERVAL '30 days'
-- AND status IN ('completed', 'cancelled');

-- Archiver les anciennes transactions (>1 an)
-- CREATE TABLE IF NOT EXISTS transactions_archive (LIKE transactions INCLUDING ALL);
-- INSERT INTO transactions_archive SELECT * FROM transactions WHERE created_at < NOW() - INTERVAL '1 year';
-- DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '1 year';

-- ─────────────────────────────────────────────────────────────────────────
-- FIN DU SCRIPT
-- ─────────────────────────────────────────────────────────────────────────

-- Afficher un résumé
SELECT
  '✅ Script d''optimisation exécuté avec succès!' as message,
  NOW() as executed_at,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size;

-- Instructions post-exécution:
-- 1. Vérifier que tous les indexes sont créés (query ci-dessus)
-- 2. Tester la latence des pages critiques (/courses, /book/[id])
-- 3. Monitorer les connexions DB pendant 24h (SELECT * FROM db_connections_monitor)
-- 4. Configurer un cron job pour rafraîchir teacher_stats (1x/heure)
-- 5. Activer pg_stat_statements dans Supabase Dashboard pour monitoring avancé
