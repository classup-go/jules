-- Migration: Multi-Currency and Stripe Connect System
-- Description: Adds currency detection, Stripe Connect integration, earnings tracking, and payout management
-- Created: 2026-01-22

-- ============================================
-- 1. UPDATE USERS TABLE - Add Currency & Stripe Connect Fields
-- ============================================

-- Add country and currency fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('EUR', 'TND', 'XOF', 'USD', 'CAD')),
ADD COLUMN IF NOT EXISTS country_auto_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS country_manually_set BOOLEAN DEFAULT false;

-- Add Stripe Connect fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_enabled BOOLEAN DEFAULT false;

-- Add payout configuration fields (for countries without Stripe Connect)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS payout_country TEXT,
ADD COLUMN IF NOT EXISTS minimum_payout_threshold DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_method TEXT;

-- Add metadata field
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_connect_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect
  ON users(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- Initialize existing users with default values
UPDATE users
SET country = 'FR',
    currency = 'EUR',
    country_auto_detected = false
WHERE country IS NULL;

-- ============================================
-- 2. CREATE TEACHER_EARNINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,

  -- Amounts
  gross_amount DECIMAL(10,2) NOT NULL,  -- Total course price
  platform_fee_amount DECIMAL(10,2) NOT NULL,  -- Platform commission
  platform_fee_percentage DECIMAL(5,2) NOT NULL,  -- Percentage applied
  net_amount DECIMAL(10,2) NOT NULL,  -- Net amount for teacher
  currency TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'available', 'paid_out', 'held')),
  available_at TIMESTAMPTZ,  -- When funds become available

  -- Payout link
  payout_id UUID,  -- Will be linked after payouts table is created

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teacher_earnings
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher_status
  ON teacher_earnings(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_available_at
  ON teacher_earnings(available_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_transaction
  ON teacher_earnings(transaction_id);

-- ============================================
-- 3. CREATE TEACHER_PAYOUTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Payout details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  payout_method TEXT NOT NULL,  -- 'stripe_connect' | 'manual'

  -- Stripe Connect
  stripe_payout_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  stripe_connect_account_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Metadata
  earnings_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Error handling
  failure_reason TEXT,
  failure_code TEXT,

  -- Timestamps
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teacher_payouts
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_teacher
  ON teacher_payouts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_status
  ON teacher_payouts(status);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_stripe_payout
  ON teacher_payouts(stripe_payout_id)
  WHERE stripe_payout_id IS NOT NULL;

-- Now add the foreign key constraint for teacher_earnings.payout_id
ALTER TABLE teacher_earnings
ADD CONSTRAINT fk_teacher_earnings_payout
FOREIGN KEY (payout_id) REFERENCES teacher_payouts(id) ON DELETE SET NULL;

-- ============================================
-- 4. CREATE PLATFORM_FEES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fee structure
  fee_type TEXT NOT NULL CHECK (fee_type IN ('percentage', 'flat', 'hybrid')),
  percentage DECIMAL(5,2),  -- Ex: 15.00 for 15%
  flat_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',

  -- Applicability
  applies_to TEXT NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all', 'courses', 'bookings', 'subscriptions')),

  -- Activation
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform fee: 15%
INSERT INTO platform_fees (fee_type, percentage, applies_to, is_active)
VALUES ('percentage', 15.00, 'all', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. CREATE PAYOUT_CONFIG_BY_COUNTRY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payout_config_by_country (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,

  -- Configuration
  minimum_payout_threshold DECIMAL(10,2),
  payout_method TEXT NOT NULL,  -- 'stripe_connect' | 'manual' | 'disabled'
  currency TEXT NOT NULL,

  -- Metadata
  notes TEXT,  -- Ex: "Manual payouts via bank transfer"
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert example configurations
INSERT INTO payout_config_by_country (country_code, minimum_payout_threshold, payout_method, currency, notes) VALUES
('FR', NULL, 'stripe_connect', 'EUR', 'Automatic Stripe Connect payouts available'),
('DE', NULL, 'stripe_connect', 'EUR', 'Automatic Stripe Connect payouts available'),
('ES', NULL, 'stripe_connect', 'EUR', 'Automatic Stripe Connect payouts available'),
('IT', NULL, 'stripe_connect', 'EUR', 'Automatic Stripe Connect payouts available'),
('GB', NULL, 'stripe_connect', 'GBP', 'Automatic Stripe Connect payouts available'),
('US', NULL, 'stripe_connect', 'USD', 'Automatic Stripe Connect payouts available'),
('CA', NULL, 'stripe_connect', 'CAD', 'Automatic Stripe Connect payouts available'),
('TN', 100.00, 'manual', 'TND', 'Manual payouts via bank transfer - minimum 100 TND'),
('SN', 50000, 'manual', 'XOF', 'Manual payouts via bank transfer - minimum 50,000 FCFA')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE teacher_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_config_by_country ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own earnings
DROP POLICY IF EXISTS "Teachers view own earnings" ON teacher_earnings;
CREATE POLICY "Teachers view own earnings"
ON teacher_earnings FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can view their own payouts
DROP POLICY IF EXISTS "Teachers view own payouts" ON teacher_payouts;
CREATE POLICY "Teachers view own payouts"
ON teacher_payouts FOR SELECT
USING (auth.uid() = teacher_id);

-- Teachers can request payouts
DROP POLICY IF EXISTS "Teachers request payouts" ON teacher_payouts;
CREATE POLICY "Teachers request payouts"
ON teacher_payouts FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

-- Public can view platform fees (for transparency)
DROP POLICY IF EXISTS "Public can view platform fees" ON platform_fees;
CREATE POLICY "Public can view platform fees"
ON platform_fees FOR SELECT
USING (is_active = true);

-- Public can view payout config by country
DROP POLICY IF EXISTS "Public can view payout config" ON payout_config_by_country;
CREATE POLICY "Public can view payout config"
ON payout_config_by_country FOR SELECT
USING (true);

-- ============================================
-- 7. MIGRATE EXISTING TRANSACTIONS TO EARNINGS
-- ============================================

-- Create earnings records for existing completed course transactions
INSERT INTO teacher_earnings (
  teacher_id,
  transaction_id,
  gross_amount,
  platform_fee_amount,
  platform_fee_percentage,
  net_amount,
  currency,
  status,
  available_at,
  created_at
)
SELECT
  t.teacher_id,
  t.id,
  t.amount_eur,
  ROUND(t.amount_eur * 0.15, 2) as platform_fee_amount,  -- 15% fee
  15.00,
  ROUND(t.amount_eur * 0.85, 2) as net_amount,  -- 85% for teacher
  COALESCE(t.currency, 'EUR'),
  'available',  -- Existing transactions are past 14-day period
  t.completed_at,
  t.completed_at
FROM transactions t
WHERE t.payment_type = 'course_enrollment'
  AND t.teacher_id IS NOT NULL
  AND t.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM teacher_earnings te WHERE te.transaction_id = t.id
  );

-- ============================================
-- 8. CREATE UPDATED_AT TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for teacher_earnings
DROP TRIGGER IF EXISTS update_teacher_earnings_updated_at ON teacher_earnings;
CREATE TRIGGER update_teacher_earnings_updated_at
  BEFORE UPDATE ON teacher_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payout_config_by_country
DROP TRIGGER IF EXISTS update_payout_config_updated_at ON payout_config_by_country;
CREATE TRIGGER update_payout_config_updated_at
  BEFORE UPDATE ON payout_config_by_country
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created tables: teacher_earnings, teacher_payouts, platform_fees, payout_config_by_country';
  RAISE NOTICE 'Updated users table with currency and Stripe Connect fields';
  RAISE NOTICE 'RLS policies enabled for all new tables';
END $$;
