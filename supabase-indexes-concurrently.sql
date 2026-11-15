-- ═══════════════════════════════════════════════════════════════════════════
-- CRÉATION D'INDEXES CONCURRENTLY (Sans Lock)
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ IMPORTANT: Ces commandes doivent être exécutées UNE PAR UNE
-- ⚠️ NE PAS copier-coller tout le fichier d'un coup!
--
-- Pourquoi CONCURRENTLY ?
-- - Pas de lock sur les tables (users peuvent continuer à utiliser l'app)
-- - Prend plus de temps à créer (~2-3x plus long)
-- - Recommandé si vous avez déjà des utilisateurs actifs
--
-- Comment utiliser:
-- 1. Copier UNE commande CREATE INDEX
-- 2. Coller dans Supabase SQL Editor
-- 3. Cliquer "Run"
-- 4. Attendre que ça finisse (5-30 secondes par index)
-- 5. Passer à l'index suivant
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 1/12 - Bookings: Recherche par professeur + date
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_bookings_teacher_scheduled;
CREATE INDEX CONCURRENTLY idx_bookings_teacher_scheduled
ON bookings(teacher_id, scheduled_at)
WHERE status NOT IN ('cancelled', 'no_show');

-- ⏸️ PAUSE - Attendre que l'index soit créé avant de continuer

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 2/12 - Bookings: Recherche par étudiant
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_bookings_student_status;
CREATE INDEX CONCURRENTLY idx_bookings_student_status
ON bookings(student_id, status);

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 3/12 - Transactions: Recherche par étudiant
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_transactions_student_status;
CREATE INDEX CONCURRENTLY idx_transactions_student_status
ON transactions(student_id, status)
WHERE status = 'completed';

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 4/12 - Transactions: Recherche par professeur
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_transactions_teacher_status;
CREATE INDEX CONCURRENTLY idx_transactions_teacher_status
ON transactions(teacher_id, status)
WHERE status = 'completed' AND teacher_id IS NOT NULL;

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 5/12 - Transactions: Par type + date
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_transactions_type_created;
CREATE INDEX CONCURRENTLY idx_transactions_type_created
ON transactions(payment_type, created_at DESC);

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 6/12 - Enrollments: Vérifier accès cours
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_enrollments_student_classroom_active;
CREATE INDEX CONCURRENTLY idx_enrollments_student_classroom_active
ON enrollments(student_id, classroom_id)
WHERE status = 'active';

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 7/12 - Classrooms: Liste des cours publiés
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_classrooms_published_created;
CREATE INDEX CONCURRENTLY idx_classrooms_published_created
ON classrooms(published_at DESC, created_at DESC)
WHERE published_at IS NOT NULL;

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 8/12 - Classrooms: Cours par professeur
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_classrooms_teacher_published;
CREATE INDEX CONCURRENTLY idx_classrooms_teacher_published
ON classrooms(teacher_id, published_at DESC)
WHERE published_at IS NOT NULL;

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 9/12 - Users: Professeurs disponibles
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_users_role_available;
CREATE INDEX CONCURRENTLY idx_users_role_available
ON users(role, is_available)
WHERE role = 'teacher' AND is_available = true;

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 10/12 - Subscriptions: Abonnement actif
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_subscriptions_user_status;
CREATE INDEX CONCURRENTLY idx_subscriptions_user_status
ON subscriptions(user_id, status)
WHERE status = 'active';

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 11/12 - Notifications: Non lues
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_notifications_user_read;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- INDEX 12/12 - Transactions: Optimisation RLS
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_transactions_student_teacher;
CREATE INDEX CONCURRENTLY idx_transactions_student_teacher
ON transactions(student_id, teacher_id);

-- ⏸️ PAUSE

-- ─────────────────────────────────────────────────────────────────────────
-- ✅ TOUS LES INDEXES SONT CRÉÉS!
-- ─────────────────────────────────────────────────────────────────────────

-- Vérifier que tous les indexes existent:
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Doit afficher 12 indexes minimum
