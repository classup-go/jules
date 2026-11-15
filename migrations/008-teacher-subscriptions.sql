-- ============================================
-- MIGRATION 008: TEACHER SUBSCRIPTIONS
-- ============================================
-- Description: Système d'abonnement pour professeurs avec gestion des commissions
-- Date: 2026-01-24
-- ============================================

-- Table teacher_subscriptions
CREATE TABLE IF NOT EXISTS teacher_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence professeur
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type de plan
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'business')),

  -- Commission sur les ventes (en pourcentage)
  commission_rate DECIMAL(5,2) NOT NULL, -- 20.00, 10.00, 5.00

  -- Prix (snapshot au moment de la souscription)
  price_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_local DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Stripe
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Période de facturation
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Statut
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid', 'trialing')),

  -- Annulation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_subscriptions_teacher ON teacher_subscriptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subscriptions_stripe ON teacher_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subscriptions_status ON teacher_subscriptions(status);

-- Un seul abonnement actif par professeur
DROP INDEX IF EXISTS idx_teacher_subscriptions_active_teacher;
CREATE UNIQUE INDEX idx_teacher_subscriptions_active_teacher
ON teacher_subscriptions(teacher_id)
WHERE status = 'active';

-- RLS Policies
ALTER TABLE teacher_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers view own subscriptions" ON teacher_subscriptions;
CREATE POLICY "Teachers view own subscriptions"
ON teacher_subscriptions FOR SELECT
USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Service role manages teacher subscriptions" ON teacher_subscriptions;
CREATE POLICY "Service role manages teacher subscriptions"
ON teacher_subscriptions FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

COMMENT ON TABLE teacher_subscriptions IS 'Abonnements mensuels des professeurs (free, pro, business) avec taux de commission';

-- ============================================
-- Ajouter commission_rate dans users pour cache
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE users
    ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 20.00;
  END IF;
END $$;

COMMENT ON COLUMN users.commission_rate IS 'Taux de commission du professeur (en pourcentage) selon son plan';

-- ============================================
-- Trigger pour mettre à jour commission_rate
-- ============================================
CREATE OR REPLACE FUNCTION update_teacher_commission_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le commission_rate dans users
  UPDATE users
  SET commission_rate = NEW.commission_rate
  WHERE id = NEW.teacher_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_teacher_commission ON teacher_subscriptions;
CREATE TRIGGER trigger_update_teacher_commission
AFTER INSERT OR UPDATE OF commission_rate, status
ON teacher_subscriptions
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION update_teacher_commission_rate();

-- ============================================
-- Fonction pour obtenir le taux de commission d'un professeur
-- ============================================
CREATE OR REPLACE FUNCTION get_teacher_commission_rate(p_teacher_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_commission_rate DECIMAL;
BEGIN
  -- Récupérer depuis users (cache)
  SELECT commission_rate INTO v_commission_rate
  FROM users
  WHERE id = p_teacher_id AND role = 'teacher';

  -- Si pas trouvé, retourner 20% par défaut (plan gratuit)
  RETURN COALESCE(v_commission_rate, 20.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_teacher_commission_rate IS 'Retourne le taux de commission actuel d''un professeur';

-- ============================================
-- Mettre à jour les professeurs existants avec plan gratuit
-- ============================================
INSERT INTO teacher_subscriptions (
  teacher_id,
  plan_type,
  commission_rate,
  price_eur,
  price_local,
  currency,
  status
)
SELECT
  id,
  'free',
  20.00,
  0,
  0,
  COALESCE(currency, 'EUR'),
  'active'
FROM users
WHERE role = 'teacher'
AND id NOT IN (SELECT teacher_id FROM teacher_subscriptions)
ON CONFLICT (teacher_id) WHERE status = 'active' DO NOTHING;

-- ============================================
-- Vue pour les statistiques professeur
-- ============================================
CREATE OR REPLACE VIEW teacher_subscription_stats AS
SELECT
  ts.teacher_id,
  u.display_name as teacher_name,
  u.email as teacher_email,
  ts.plan_type,
  ts.commission_rate,
  ts.status,
  ts.current_period_start,
  ts.current_period_end,
  ts.created_at,
  COUNT(DISTINCT c.id) as total_classes,
  COUNT(DISTINCT co.id) as total_courses,
  COALESCE(SUM(co.enrolled_count), 0) as total_enrollments
FROM teacher_subscriptions ts
JOIN users u ON u.id = ts.teacher_id
LEFT JOIN classrooms c ON c.teacher_id = ts.teacher_id
LEFT JOIN courses co ON co.classroom_id = c.id
GROUP BY
  ts.teacher_id, u.display_name, u.email, ts.plan_type,
  ts.commission_rate, ts.status, ts.current_period_start,
  ts.current_period_end, ts.created_at;

COMMENT ON VIEW teacher_subscription_stats IS 'Vue avec statistiques des abonnements professeurs';

-- ============================================
-- Index sur transactions pour calcul commissions
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_teacher_created
ON transactions(teacher_id, created_at DESC)
WHERE payment_type = 'course_enrollment';

-- ============================================
-- Fonction pour calculer les gains d'un professeur
-- ============================================
CREATE OR REPLACE FUNCTION calculate_teacher_earnings(
  p_teacher_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
  total_sales DECIMAL,
  commission_amount DECIMAL,
  net_earnings DECIMAL,
  transactions_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(t.amount_eur), 0) as total_sales,
    COALESCE(SUM(t.amount_eur * (u.commission_rate / 100)), 0) as commission_amount,
    COALESCE(SUM(t.amount_eur * (1 - u.commission_rate / 100)), 0) as net_earnings,
    COUNT(*)::INTEGER as transactions_count
  FROM transactions t
  JOIN users u ON u.id = p_teacher_id
  WHERE t.teacher_id = p_teacher_id
  AND t.payment_type = 'course_enrollment'
  AND t.status = 'completed'
  AND (p_start_date IS NULL OR t.created_at >= p_start_date)
  AND (p_end_date IS NULL OR t.created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_teacher_earnings IS 'Calcule les gains d''un professeur avec déduction de commission';

-- ============================================
-- Vérification finale
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 008 terminée avec succès';
  RAISE NOTICE 'Table teacher_subscriptions créée';
  RAISE NOTICE 'Triggers et fonctions installés';
  RAISE NOTICE 'Professeurs existants mis à jour avec plan gratuit';
END $$;
