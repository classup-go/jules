-- ============================================================================
-- FIX: Ajouter les colonnes manquantes à enrollments
-- ============================================================================
-- Date: 2026-01-28
-- Problème: enrollments existe mais sans classroom_id et course_id
-- Solution: Ajouter les colonnes manquantes
-- ============================================================================

-- 1. Vérifier la structure actuelle
SELECT 'Structure AVANT modification:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;

-- 2. Ajouter classroom_id si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'classroom_id'
  ) THEN
    ALTER TABLE enrollments
    ADD COLUMN classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_enrollments_classroom ON enrollments(classroom_id);

    RAISE NOTICE '✅ Colonne classroom_id ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne classroom_id existe déjà';
  END IF;
END $$;

-- 3. Ajouter course_id si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE enrollments
    ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

    RAISE NOTICE '✅ Colonne course_id ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne course_id existe déjà';
  END IF;
END $$;

-- 4. Ajouter autres colonnes manquantes
DO $$
BEGIN
  -- payment_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN payment_id UUID;
    RAISE NOTICE '✅ Colonne payment_id ajoutée';
  END IF;

  -- payment_required
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'payment_required'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN payment_required BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne payment_required ajoutée';
  END IF;

  -- payment_completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'payment_completed_at'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN payment_completed_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Colonne payment_completed_at ajoutée';
  END IF;

  -- enrolled_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'enrolled_at'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN enrolled_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Colonne enrolled_at ajoutée';
  END IF;

  -- status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'status'
  ) THEN
    ALTER TABLE enrollments
    ADD COLUMN status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'completed', 'cancelled'));
    RAISE NOTICE '✅ Colonne status ajoutée';
  END IF;

  -- progress
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'progress'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN progress INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Colonne progress ajoutée';
  END IF;
END $$;

-- 5. Vérifier la structure APRÈS modification
SELECT 'Structure APRÈS modification:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;

-- 6. Ajouter contrainte unique si pas déjà présente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'enrollments'
    AND indexname = 'idx_enrollments_student_course_unique'
  ) THEN
    -- Supprimer les doublons avant d'ajouter la contrainte
    DELETE FROM enrollments a USING enrollments b
    WHERE a.id > b.id
    AND a.student_id = b.student_id
    AND a.course_id = b.course_id
    AND a.course_id IS NOT NULL;

    CREATE UNIQUE INDEX idx_enrollments_student_course_unique
    ON enrollments(student_id, course_id)
    WHERE course_id IS NOT NULL;

    RAISE NOTICE '✅ Contrainte unique student_id + course_id ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  Contrainte unique existe déjà';
  END IF;
END $$;

-- 7. RÉSUMÉ
SELECT
  '✅ Colonnes ajoutées avec succès!' as status,
  'Vérifiez la structure ci-dessus' as next_step;
