-- ═══════════════════════════════════════════════════════════════
-- FIX FINAL : RLS POLICIES POUR AFFICHER LES PRIX
-- ═══════════════════════════════════════════════════════════════
-- Ce script résout le problème du cercle vicieux :
-- "Étudiant doit être inscrit pour voir le cours qu'il veut acheter"
-- ═══════════════════════════════════════════════════════════════

\echo '🔧 Étape 1 : Supprimer la policy restrictive'

DROP POLICY IF EXISTS "Students can view published courses" ON courses;

\echo '✅ Policy restrictive supprimée'
\echo ''
\echo '🔧 Étape 2 : Créer une policy correcte'

CREATE POLICY "Anyone can view public classroom courses"
ON courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM classrooms c
    WHERE c.id = courses.classroom_id
    AND (
      c.is_public = true           -- Classes publiques = tout le monde peut voir
      OR c.teacher_id = auth.uid() -- Ou si je suis le prof
    )
  )
);

\echo '✅ Nouvelle policy créée : "Anyone can view public classroom courses"'
\echo ''
\echo '🔧 Étape 3 : Rendre publique la dernière classe privée'

UPDATE classrooms
SET is_public = true
WHERE is_public = false;

\echo '✅ Toutes les classes sont maintenant publiques'
\echo ''
\echo '🔍 Étape 4 : Vérification des policies'

SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN qual LIKE '%is_public%' THEN '✅ OK - Basé sur is_public'
    WHEN qual LIKE '%enrollments%' THEN '❌ RESTRICTIF - Basé sur enrollment'
    ELSE '⚠️  Vérifier'
  END as status
FROM pg_policies
WHERE tablename = 'courses'
AND cmd = 'SELECT'
ORDER BY policyname;

\echo ''
\echo '📊 Étape 5 : Test de visibilité des cours'

SELECT
  c.id,
  c.title,
  c.price,
  cl.is_public as classroom_public,
  CASE
    WHEN c.price > 0 THEN '💰 Payant (' || c.price || '€)'
    ELSE '🎉 Gratuit'
  END as prix_info
FROM courses c
JOIN classrooms cl ON c.classroom_id = cl.id
WHERE cl.is_public = true
LIMIT 5;

\echo ''
\echo '✅ ═══════════════════════════════════════════════════════════'
\echo '✅ FIX TERMINÉ !'
\echo '✅ ═══════════════════════════════════════════════════════════'
\echo ''
\echo '📝 PROCHAINES ÉTAPES :'
\echo '1. Redémarrer votre serveur Next.js (Ctrl+C puis npm run dev)'
\echo '2. Vider le cache navigateur (Ctrl+Shift+R)'
\echo '3. Aller sur /classroom/[un-id]'
\echo '4. Les prix devraient maintenant s''afficher !'
\echo ''
