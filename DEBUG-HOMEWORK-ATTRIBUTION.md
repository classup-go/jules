# 🔍 Debug : Attribution des Devoirs aux Classes

## Le Problème

Les étudiants ne reçoivent pas les devoirs car :
1. ❌ Ils ne sont pas **inscrits (enrolled)** dans la classe
2. ❌ Le trigger de notification ne fonctionne pas
3. ❌ L'attribution à la classe n'est pas claire lors de la création

## ✅ Solution : Vérification en 3 Étapes

### Étape 1 : Vérifier le Système

**Exécutez dans Supabase SQL Editor :**
📄 `supabase-verify-homework-system.sql`

Ce script va vérifier :
- ✅ Les tables existent
- ✅ Les triggers sont actifs
- ✅ Les enrollments sont configurés
- ✅ Les devoirs sont bien liés aux classes
- ✅ Les notifications sont envoyées

**Lisez les résultats :**
```sql
-- Vous devriez voir :
✅ assignments existe
✅ submissions existe
✅ notifications existe
✅ enrollments existe

-- Et le trigger :
trigger_notify_assignment_published sur assignments
```

---

### Étape 2 : Inscrire un Étudiant à une Classe

**Problème principal** : Les étudiants doivent être **inscrits (enrolled)** dans la classe !

#### ⭐ Option A : Via l'Interface (RECOMMANDÉ - NOUVEAU)

**Interface de gestion des inscriptions** : Une interface complète a été créée pour faciliter l'inscription des étudiants.

1. **En tant que Professeur** :
   - Aller sur la page de la classe : `/teacher/classrooms/CLASSROOM_ID`
   - Cliquer sur l'onglet "👥 Élèves"
   - Cliquer sur le bouton "➕ Inscrire un élève"
   - Sélectionner l'étudiant dans la liste
   - Cliquer sur "✓ Inscrire"
   - ✅ L'étudiant est maintenant inscrit avec status = 'active'

**Avantages** :
- ✅ Interface visuelle intuitive
- ✅ Pas besoin de connaître les IDs
- ✅ Filtre automatique des étudiants déjà inscrits
- ✅ Gestion des erreurs intégrée
- ✅ Possibilité de retirer un étudiant facilement

📖 **Voir le guide complet** : `ENROLLMENT-MANAGEMENT-GUIDE.md`

#### Option B : Via SQL (Avancé)

```sql
-- 1. Trouver votre student_id
SELECT id, email, display_name FROM users WHERE role = 'student';

-- 2. Trouver votre classroom_id
SELECT id, title FROM classrooms;

-- 3. Inscrire l'étudiant
INSERT INTO enrollments (
  student_id,
  classroom_id,
  status,
  enrolled_at
)
VALUES (
  'VOTRE_STUDENT_ID',    -- Remplacer par l'ID de l'étape 1
  'VOTRE_CLASSROOM_ID',  -- Remplacer par l'ID de l'étape 2
  'active',
  NOW()
);
```

---

### Étape 3 : Tester le Workflow Complet

#### Test 1 : Vérifier l'Inscription

```sql
-- Vérifier que l'étudiant est bien inscrit
SELECT
  e.id,
  e.status,
  u.display_name as student_name,
  c.title as classroom_title
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN classrooms c ON c.id = e.classroom_id
WHERE e.student_id = 'VOTRE_STUDENT_ID'
  AND e.status = 'active';

-- Résultat attendu : 1 ligne avec status = 'active'
```

#### Test 2 : Créer et Publier un Devoir

**En tant que Professeur** :

1. Aller sur `/teacher/homework`
2. Cliquer "➕ Créer un devoir"
3. **IMPORTANT** : Vérifier que l'URL contient `?classroom=VOTRE_CLASSROOM_ID`
4. Remplir le formulaire :
   ```
   Titre: TEST - Mon premier devoir
   Description: Ceci est un test
   Type: Texte
   Points: 100
   Note de passage: 60%
   Date limite: [demain]
   ```
5. **Choisir "Publier" (pas "Brouillon")**
6. Cliquer "Créer le devoir"

#### Test 3 : Vérifier les Notifications

```sql
-- Vérifier que la notification a été créée
SELECT
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  u.display_name as recipient_name
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.type = 'assignment_created'
ORDER BY n.created_at DESC
LIMIT 5;

-- Résultat attendu : 1 notification pour chaque étudiant inscrit
```

#### Test 4 : Vérifier côté Étudiant

**En tant qu'Étudiant** :

1. Se connecter avec le compte étudiant
2. Cliquer sur l'icône 🔔 (notifications)
3. **Résultat attendu** : Notification "Nouveau devoir disponible"
4. Aller sur `/student/homework`
5. **Résultat attendu** : Le devoir apparaît avec badge "📝 À faire"
6. Cliquer dessus
7. **Résultat attendu** : Page de soumission s'ouvre

---

## 🐛 Problèmes Fréquents et Solutions

### Problème 1 : "Aucun devoir reçu"

**Causes possibles :**
1. ❌ L'étudiant n'est pas inscrit dans la classe
2. ❌ Le devoir est en "Brouillon" (pas "Publié")
3. ❌ Le trigger ne fonctionne pas

**Solution :**
```sql
-- Vérifier l'inscription
SELECT * FROM enrollments
WHERE student_id = 'VOTRE_STUDENT_ID'
  AND classroom_id = 'CLASSROOM_DU_DEVOIR'
  AND status = 'active';

-- Si vide, créer l'enrollment (voir Étape 2)
```

### Problème 2 : "Le trigger ne se déclenche pas"

**Solution :**
```sql
-- Re-créer le trigger (copié du script de vérification)
-- Voir section 9 de supabase-verify-homework-system.sql
```

### Problème 3 : "Notifications pas visibles"

**Vérifier les RLS policies :**
```sql
-- Vérifier que l'utilisateur peut voir ses notifications
SELECT * FROM notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Problème 4 : "L'URL ne contient pas le classroom ID"

**Quand vous créez un devoir depuis `/teacher/homework`** :
- Le bouton "Créer un devoir" utilise la première classe trouvée
- **Solution** : Aller d'abord sur la page de la classe spécifique
  ```
  /teacher/classrooms/CLASSROOM_ID
  ```
  Puis cliquer "Créer un devoir" depuis là

---

## 📊 Dashboard de Vérification

### Requête Rapide : Vue d'Ensemble

```sql
WITH assignment_stats AS (
  SELECT
    a.id,
    a.title,
    a.status,
    c.title as classroom_title,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    COUNT(DISTINCT n.id) as notifications_sent,
    COUNT(DISTINCT s.id) as submissions_received
  FROM assignments a
  JOIN classrooms c ON c.id = a.classroom_id
  LEFT JOIN enrollments e ON e.classroom_id = a.classroom_id AND e.status = 'active'
  LEFT JOIN notifications n ON n.assignment_id = a.id AND n.type = 'assignment_created'
  LEFT JOIN submissions s ON s.assignment_id = a.id
  GROUP BY a.id, a.title, a.status, c.title
)
SELECT
  title as "Devoir",
  status as "Statut",
  classroom_title as "Classe",
  enrolled_students as "Étudiants Inscrits",
  notifications_sent as "Notifications Envoyées",
  submissions_received as "Soumissions Reçues",
  CASE
    WHEN status = 'published' AND notifications_sent = 0 AND enrolled_students > 0 THEN '⚠️ PROBLÈME: Pas de notifications'
    WHEN status = 'published' AND enrolled_students = 0 THEN '⚠️ PROBLÈME: Aucun étudiant inscrit'
    WHEN status = 'published' AND notifications_sent = enrolled_students THEN '✅ OK'
    WHEN status = 'draft' THEN 'ℹ️ Brouillon (normal)'
    ELSE '❓ À vérifier'
  END as "Diagnostic"
FROM assignment_stats
ORDER BY "Diagnostic";
```

---

## 🎯 Checklist de Déploiement

Avant de dire que le système fonctionne, vérifier :

- [ ] Les tables `assignments`, `submissions`, `notifications`, `enrollments` existent
- [ ] Le trigger `trigger_notify_assignment_published` est actif
- [ ] Au moins 1 classroom existe
- [ ] Au moins 1 étudiant est inscrit (`enrollment` avec `status = 'active'`)
- [ ] Créer un devoir en statut "Publié" (pas brouillon)
- [ ] Vérifier que la notification est créée (table `notifications`)
- [ ] Se connecter en tant qu'étudiant et voir la notification
- [ ] Le devoir apparaît dans `/student/homework`
- [ ] L'étudiant peut soumettre le devoir
- [ ] Le professeur reçoit une notification de soumission
- [ ] Le professeur peut noter
- [ ] L'étudiant reçoit une notification de note

---

## 🔧 Script de Test Complet

```sql
-- SCRIPT DE TEST COMPLET
-- Remplacez les IDs par vos vraies données

-- 1. Variables (à remplacer)
DO $$
DECLARE
  v_teacher_id UUID := 'VOTRE_TEACHER_ID';
  v_student_id UUID := 'VOTRE_STUDENT_ID';
  v_classroom_id UUID := 'VOTRE_CLASSROOM_ID';
  v_assignment_id UUID;
BEGIN
  -- 2. Vérifier l'enrollment
  IF NOT EXISTS (
    SELECT 1 FROM enrollments
    WHERE student_id = v_student_id
      AND classroom_id = v_classroom_id
      AND status = 'active'
  ) THEN
    -- Créer l'enrollment
    INSERT INTO enrollments (student_id, classroom_id, status, enrolled_at)
    VALUES (v_student_id, v_classroom_id, 'active', NOW());
    RAISE NOTICE '✅ Enrollment créé';
  ELSE
    RAISE NOTICE '✅ Enrollment déjà existant';
  END IF;

  -- 3. Créer un devoir test
  INSERT INTO assignments (
    classroom_id, teacher_id, title, description,
    max_points, passing_grade, due_date, status
  )
  VALUES (
    v_classroom_id, v_teacher_id,
    'TEST - Devoir automatique',
    'Ceci est un test automatique',
    100, 60,
    NOW() + INTERVAL '7 days',
    'published'
  )
  RETURNING id INTO v_assignment_id;

  RAISE NOTICE '✅ Devoir créé: %', v_assignment_id;

  -- 4. Vérifier les notifications
  PERFORM pg_sleep(1); -- Attendre 1 seconde

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE assignment_id = v_assignment_id
      AND type = 'assignment_created'
  ) THEN
    RAISE NOTICE '✅ Notifications créées !';
  ELSE
    RAISE NOTICE '❌ ERREUR: Aucune notification créée';
  END IF;
END $$;
```

---

## 📞 Support

Si après toutes ces étapes le problème persiste :

1. Exécuter `supabase-verify-homework-system.sql`
2. Copier les résultats
3. Vérifier les logs Supabase Dashboard → Logs
4. Chercher les erreurs dans la console navigateur (F12)

**Le problème est souvent** : Les étudiants ne sont pas inscrits dans la classe ! 🎯
