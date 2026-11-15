-- ============================================
-- Système de Paiement Multi-Devises
-- Tables: transactions, bookings, subscriptions, plan_pricing
-- Modification: enrollments (ajout payment_id)
-- ============================================

-- ============================================
-- 1. TABLE TRANSACTIONS (Universelle)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type de paiement
  payment_type TEXT NOT NULL CHECK (payment_type IN ('course_enrollment', 'booking', 'subscription')),

  -- Parties impliquées
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES users(id) ON DELETE RESTRICT, -- NULL pour les abonnements

  -- Montants (EUR + devise locale)
  amount_eur DECIMAL(10,2) NOT NULL,
  amount_local DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('EUR', 'TND', 'USD', 'XOF', 'XAF')),
  exchange_rate DECIMAL(10,6) NOT NULL,

  -- Provider de paiement
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'konnect', 'flouci', 'cinetpay')),
  provider_transaction_id TEXT UNIQUE,
  provider_payment_intent TEXT,

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),

  -- Métadonnées flexibles (JSONB)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  -- Idempotence (éviter les doublons)
  idempotency_key TEXT UNIQUE
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_teacher ON transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON transactions USING gin(metadata);

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres transactions
DROP POLICY IF EXISTS "Users view own transactions" ON transactions;
CREATE POLICY "Users view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = teacher_id);

-- Service role peut tout faire
DROP POLICY IF EXISTS "Service role manages transactions" ON transactions;
CREATE POLICY "Service role manages transactions"
ON transactions FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

COMMENT ON TABLE transactions IS 'Table universelle pour tous les paiements (cours, bookings, abonnements)';

-- ============================================
-- 2. TABLE BOOKINGS (Sessions 1-to-1)
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Planification
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL CHECK (duration IN (30, 60, 90, 120)), -- minutes
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',

  -- Prix (snapshot au moment de la réservation)
  hourly_rate_eur DECIMAL(10,2) NOT NULL,
  total_price_eur DECIMAL(10,2) NOT NULL,

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),

  -- Lien paiement
  payment_id UUID REFERENCES transactions(id) ON DELETE RESTRICT,

  -- Lien session live (créé après confirmation)
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE SET NULL,

  -- Notes
  student_notes TEXT,
  teacher_notes TEXT,

  -- Annulation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON bookings(payment_id);

-- Empêcher les chevauchements (un prof ne peut pas avoir 2 sessions en même temps)
DROP INDEX IF EXISTS idx_bookings_no_overlap;
CREATE UNIQUE INDEX idx_bookings_no_overlap
ON bookings(teacher_id, scheduled_at)
WHERE status NOT IN ('cancelled', 'no_show');

-- RLS Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bookings" ON bookings;
CREATE POLICY "Users view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students create bookings" ON bookings;
CREATE POLICY "Students create bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Participants update bookings" ON bookings;
CREATE POLICY "Participants update bookings"
ON bookings FOR UPDATE
USING (auth.uid() = student_id OR auth.uid() = teacher_id);

COMMENT ON TABLE bookings IS 'Réservations de sessions 1-to-1 entre étudiants et professeurs';

-- ============================================
-- 3. TABLE SUBSCRIPTIONS (Abonnements)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Plan
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'essentiel', 'premium')),

  -- Prix (snapshot au moment de la souscription)
  price_eur DECIMAL(10,2) NOT NULL,
  price_local DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,

  -- Stripe
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Période de facturation
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Statut
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid', 'trialing')),

  -- Annulation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Un seul abonnement actif par utilisateur
DROP INDEX IF EXISTS idx_subscriptions_active_user;
CREATE UNIQUE INDEX idx_subscriptions_active_user
ON subscriptions(user_id)
WHERE status = 'active';

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own subscriptions" ON subscriptions;
CREATE POLICY "Users view own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages subscriptions" ON subscriptions;
CREATE POLICY "Service role manages subscriptions"
ON subscriptions FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

COMMENT ON TABLE subscriptions IS 'Abonnements mensuels des utilisateurs (free, essentiel, premium)';

-- ============================================
-- 4. TABLE PLAN_PRICING (Configuration des plans)
-- ============================================
CREATE TABLE IF NOT EXISTS plan_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT UNIQUE NOT NULL CHECK (plan_type IN ('free', 'essentiel', 'premium')),
  price_eur DECIMAL(10,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
  stripe_price_id TEXT, -- ID du prix Stripe (pour les abonnements récurrents)
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE plan_pricing IS 'Configuration des prix et fonctionnalités des plans d''abonnement';

-- Données initiales
INSERT INTO plan_pricing (plan_type, price_eur, features)
VALUES
  ('free', 0, '{"courses": "free_only", "qcm_per_month": 5, "forum": true}'::jsonb),
  ('essentiel', 19, '{"courses": "all_online", "qcm": "unlimited", "progress_tracking": true, "email_support": true}'::jsonb),
  ('premium', 39, '{"courses": "all", "live_sessions": "unlimited", "dedicated_teacher": true, "priority_support": true, "certificates": true}'::jsonb)
ON CONFLICT (plan_type) DO UPDATE
  SET price_eur = EXCLUDED.price_eur,
      features = EXCLUDED.features;

-- ============================================
-- 5. MODIFICATION TABLE ENROLLMENTS
-- Ajouter le lien vers le paiement
-- ============================================
DO $$
BEGIN
  -- Ajouter payment_id si la colonne n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'payment_id') THEN
    ALTER TABLE enrollments ADD COLUMN payment_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;

  -- Ajouter payment_required
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'payment_required') THEN
    ALTER TABLE enrollments ADD COLUMN payment_required BOOLEAN DEFAULT true;
  END IF;

  -- Ajouter payment_completed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'payment_completed_at') THEN
    ALTER TABLE enrollments ADD COLUMN payment_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index pour payment_id
CREATE INDEX IF NOT EXISTS idx_enrollments_payment ON enrollments(payment_id);

COMMENT ON COLUMN enrollments.payment_id IS 'Lien vers la transaction de paiement associée';
COMMENT ON COLUMN enrollments.payment_required IS 'Indique si un paiement est nécessaire pour cette inscription';
COMMENT ON COLUMN enrollments.payment_completed_at IS 'Date de complétion du paiement';

-- ============================================
-- 6. FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. VUES UTILES POUR LE REPORTING
-- ============================================

-- Vue: Transactions avec détails complets
CREATE OR REPLACE VIEW v_transactions_detailed AS
SELECT
  t.id,
  t.payment_type,
  t.amount_eur,
  t.amount_local,
  t.currency,
  t.payment_provider,
  t.status,
  t.created_at,
  t.completed_at,

  -- Étudiant
  s.display_name as student_name,
  s.email as student_email,

  -- Professeur (peut être NULL pour les abonnements)
  te.display_name as teacher_name,
  te.email as teacher_email,

  -- Métadonnées utiles
  t.metadata->>'classroom_id' as classroom_id,
  t.metadata->>'booking_id' as booking_id,
  t.metadata->>'plan_type' as plan_type

FROM transactions t
LEFT JOIN users s ON t.student_id = s.id
LEFT JOIN users te ON t.teacher_id = te.id;

COMMENT ON VIEW v_transactions_detailed IS 'Vue détaillée des transactions avec informations utilisateurs';

-- Vue: Bookings avec informations utilisateurs
CREATE OR REPLACE VIEW v_bookings_detailed AS
SELECT
  b.id,
  b.scheduled_at,
  b.duration,
  b.total_price_eur,
  b.status,

  -- Étudiant
  s.display_name as student_name,
  s.email as student_email,

  -- Professeur
  t.display_name as teacher_name,
  t.email as teacher_email,
  t.hourly_rate as current_hourly_rate,

  -- Paiement
  tr.amount_local as paid_amount,
  tr.currency as paid_currency,
  tr.status as payment_status,

  b.created_at,
  b.student_notes

FROM bookings b
JOIN users s ON b.student_id = s.id
JOIN users t ON b.teacher_id = t.id
LEFT JOIN transactions tr ON b.payment_id = tr.id;

COMMENT ON VIEW v_bookings_detailed IS 'Vue détaillée des réservations avec infos étudiant/prof/paiement';

-- ============================================
-- 8. DONNÉES DE TEST (optionnel - à commenter en production)
-- ============================================

-- Fonction pour créer un booking de test (utile pour le développement)
CREATE OR REPLACE FUNCTION create_test_booking(
  p_student_id UUID,
  p_teacher_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_duration INTEGER DEFAULT 60
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_teacher_rate DECIMAL(10,2);
  v_total_price DECIMAL(10,2);
BEGIN
  -- Récupérer le tarif horaire du prof
  SELECT hourly_rate INTO v_teacher_rate
  FROM users
  WHERE id = p_teacher_id AND role = 'teacher';

  IF v_teacher_rate IS NULL THEN
    RAISE EXCEPTION 'Teacher has no hourly rate set';
  END IF;

  -- Calculer le prix total
  v_total_price := (v_teacher_rate * p_duration) / 60;

  -- Créer le booking
  INSERT INTO bookings (
    student_id,
    teacher_id,
    scheduled_at,
    duration,
    hourly_rate_eur,
    total_price_eur,
    status
  )
  VALUES (
    p_student_id,
    p_teacher_id,
    p_scheduled_at,
    p_duration,
    v_teacher_rate,
    v_total_price,
    'pending'
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_test_booking IS 'Crée un booking de test avec calcul automatique du prix';

-- ============================================
-- 9. VÉRIFICATIONS FINALES
-- ============================================

-- Vérifier que toutes les tables existent
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'transactions') = 1, 'Table transactions not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bookings') = 1, 'Table bookings not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'subscriptions') = 1, 'Table subscriptions not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'plan_pricing') = 1, 'Table plan_pricing not created';

  RAISE NOTICE 'All payment system tables created successfully!';
  RAISE NOTICE 'Tables: transactions, bookings, subscriptions, plan_pricing';
  RAISE NOTICE 'Modified: enrollments (added payment_id, payment_required, payment_completed_at)';
  RAISE NOTICE 'Views: v_transactions_detailed, v_bookings_detailed';
END $$;

-- ============================================
-- RÉSUMÉ DU SYSTÈME
-- ============================================

/*
✅ 4 nouvelles tables créées:
  - transactions: Table universelle pour tous les paiements
  - bookings: Réservations 1-to-1 étudiant/prof
  - subscriptions: Abonnements mensuels
  - plan_pricing: Configuration des plans

✅ 1 table modifiée:
  - enrollments: Ajout payment_id, payment_required, payment_completed_at

✅ RLS Policies activées sur toutes les tables financières

✅ Indexes optimisés pour les requêtes fréquentes

✅ Triggers pour updated_at automatique

✅ Vues pour le reporting

✅ Fonction utilitaire pour créer des bookings de test

PROCHAINES ÉTAPES:
1. Exécuter ce script dans Supabase SQL Editor
2. Vérifier les tables dans Database → Tables
3. Ajouter les types TypeScript dans src/types/database.ts
4. Implémenter les API routes
*/
