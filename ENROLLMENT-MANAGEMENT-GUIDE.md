# 🎓 Guide de Gestion des Inscriptions (Enrollments)

## ✅ Problème Résolu

**Problème initial** : Les étudiants ne recevaient pas les devoirs publiés par le professeur.

**Cause** : Les étudiants n'étaient pas inscrits (enrolled) dans la classe. Le système de notification ne fonctionnait que pour les étudiants ayant un **enrollment actif**.

**Solution** : Interface complète de gestion des inscriptions permettant aux professeurs d'inscrire facilement les étudiants dans leurs classes.

---

## 🚀 Nouvelles Fonctionnalités

### 1. API Endpoints pour les Inscriptions

#### **GET /api/enrollments?classroomId=xxx**
- Récupère tous les enrollments d'une classe
- Retourne les informations des étudiants inscrits
- Réservé au professeur de la classe

**Exemple de réponse :**
```json
{
  "enrollments": [
    {
      "id": "enrollment-uuid",
      "student_id": "student-uuid",
      "status": "active",
      "enrolled_at": "2026-01-12T...",
      "users": {
        "id": "student-uuid",
        "email": "student@example.com",
        "display_name": "John Doe",
        "avatar_url": null
      }
    }
  ]
}
```

#### **POST /api/enrollments**
- Inscrit un étudiant dans une classe
- Vérifie que l'utilisateur est bien un étudiant
- Évite les doublons (réactive si inactif)

**Body requis :**
```json
{
  "classroomId": "classroom-uuid",
  "studentId": "student-uuid"
}
```

**Réponses possibles :**
- `201` : Inscription réussie
- `409` : Étudiant déjà inscrit
- `400` : Utilisateur n'est pas un étudiant
- `403` : Non autorisé (pas le professeur de la classe)
- `404` : Classe ou étudiant non trouvé

#### **DELETE /api/enrollments/[id]**
- Désactive un enrollment (ne supprime pas, change status à 'inactive')
- Préserve l'historique
- Réservé au professeur de la classe

#### **GET /api/students?classroomId=xxx**
- Liste tous les étudiants disponibles
- Si `classroomId` fourni : exclut les étudiants déjà inscrits (status active)
- Réservé aux enseignants

---

## 📚 Interface Professeur Améliorée

### Page : `/teacher/classrooms/[id]` - Onglet "Élèves"

#### **Nouveautés :**

1. **Bouton "➕ Inscrire un élève"**
   - Situé dans l'en-tête de l'onglet Élèves
   - Ouvre un modal avec la liste des étudiants disponibles

2. **Liste des Étudiants Inscrits**
   - Avatar avec initiale
   - Nom et email
   - Date d'inscription
   - Bouton "💬 Message"
   - **Nouveau** : Bouton "🗑️ Retirer"

3. **Modal d'Inscription**
   - Liste tous les étudiants non inscrits
   - Filtrage automatique (n'affiche que les disponibles)
   - Bouton "✓ Inscrire" pour chaque étudiant
   - Loading states pendant l'opération
   - Messages d'erreur clairs

4. **Gestion des Enrollments**
   - Compteur d'étudiants actifs en temps réel
   - Calcul des revenus (si classe payante)
   - Synchronisation automatique avec la base de données

---

## 🔄 Workflow Complet

### Pour le Professeur

#### **Étape 1 : Créer une Classe**
1. Aller sur `/teacher/classrooms`
2. Créer une nouvelle classe
3. La classe est créée mais vide (0 élève)

#### **Étape 2 : Inscrire des Étudiants**
1. Ouvrir la classe : `/teacher/classrooms/[id]`
2. Aller dans l'onglet "👥 Élèves"
3. Cliquer sur "➕ Inscrire un élève"
4. Sélectionner les étudiants dans la liste
5. Cliquer sur "✓ Inscrire" pour chacun
6. ✅ **L'enrollment est créé avec status = 'active'**

#### **Étape 3 : Créer un Devoir**
1. Aller sur `/teacher/homework` ou `/teacher/assignments/new?classroom=xxx`
2. Remplir le formulaire
3. **Important** : Vérifier que `classroom_id` est bien défini
4. Publier le devoir (status = 'published')
5. ✅ **Le trigger automatique notifie tous les étudiants inscrits**

#### **Étape 4 : Vérifier les Notifications**
```sql
-- Vérifier dans Supabase SQL Editor
SELECT
  n.id,
  n.user_id,
  u.email as student_email,
  n.title,
  n.created_at
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.type = 'assignment_created'
  AND n.assignment_id = 'VOTRE_ASSIGNMENT_ID'
ORDER BY n.created_at DESC;
```

### Pour l'Étudiant

#### **Étape 1 : Vérifier l'Inscription**
L'étudiant peut voir ses classes inscrites sur son dashboard.

#### **Étape 2 : Recevoir la Notification**
1. Une notification apparaît dans la cloche 🔔
2. Badge rouge avec le nombre de non-lues
3. Notification : "Nouveau devoir disponible"

#### **Étape 3 : Consulter le Devoir**
1. Cliquer sur la notification OU
2. Aller sur `/student/homework`
3. Le devoir apparaît dans la liste

#### **Étape 4 : Soumettre**
1. Cliquer sur "Soumettre →"
2. Remplir le formulaire
3. Valider
4. ✅ **Le professeur reçoit une notification**

---

## 🔍 Diagnostic et Vérification

### Vérifier qu'un Étudiant est Inscrit

```sql
-- Trouver votre student_id
SELECT id, email, display_name, role
FROM users
WHERE email = 'student@example.com';

-- Trouver votre classroom_id
SELECT id, title, teacher_id
FROM classrooms
WHERE title ILIKE '%nom de la classe%';

-- Vérifier l'enrollment
SELECT
  e.id as enrollment_id,
  e.status,
  e.enrolled_at,
  u.display_name as student_name,
  c.title as classroom_title
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN classrooms c ON c.id = e.classroom_id
WHERE e.student_id = 'VOTRE_STUDENT_ID'
  AND e.classroom_id = 'VOTRE_CLASSROOM_ID';

-- Résultat attendu : 1 ligne avec status = 'active'
```

### Vérifier les Notifications Envoyées

```sql
SELECT
  a.title as devoir,
  a.status as devoir_status,
  c.title as classe,
  COUNT(DISTINCT e.student_id) as students_enrolled,
  COUNT(DISTINCT n.id) as notifications_sent
FROM assignments a
JOIN classrooms c ON c.id = a.classroom_id
LEFT JOIN enrollments e ON e.classroom_id = a.classroom_id AND e.status = 'active'
LEFT JOIN notifications n ON n.assignment_id = a.id AND n.type = 'assignment_created'
WHERE a.id = 'VOTRE_ASSIGNMENT_ID'
GROUP BY a.id, a.title, a.status, c.title;
```

**Résultat attendu :**
- `students_enrolled` = nombre d'étudiants inscrits
- `notifications_sent` = même nombre (1 notification par étudiant)

---

## ⚠️ Problèmes Fréquents et Solutions

### Problème 1 : "L'étudiant ne reçoit pas le devoir"

**Diagnostic :**
```sql
-- Vérifier l'enrollment
SELECT * FROM enrollments
WHERE student_id = 'STUDENT_ID'
  AND classroom_id = 'CLASSROOM_ID';
```

**Solutions possibles :**
- ❌ **Pas d'enrollment** → Inscrire l'étudiant via l'interface
- ❌ **status = 'inactive'** → Réinscrire (le POST va réactiver)
- ✅ **status = 'active'** → Vérifier le trigger (voir Problème 2)

### Problème 2 : "Le trigger ne fonctionne pas"

**Diagnostic :**
```sql
-- Vérifier que le trigger existe
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_assignment_published';
```

**Solution :**
Exécuter le script de réparation dans `supabase-verify-homework-system.sql` (section 9).

### Problème 3 : "Erreur 403 lors de l'inscription"

**Cause :** L'utilisateur n'est pas le professeur de cette classe.

**Solution :**
```sql
-- Vérifier le teacher_id
SELECT id, title, teacher_id FROM classrooms WHERE id = 'CLASSROOM_ID';

-- Vérifier l'utilisateur connecté
SELECT auth.uid();

-- Les deux doivent correspondre
```

### Problème 4 : "Tous les étudiants sont déjà inscrits"

**Diagnostic :**
```sql
-- Voir tous les étudiants
SELECT id, email, display_name FROM users WHERE role = 'student';

-- Voir les inscrits dans cette classe
SELECT student_id FROM enrollments
WHERE classroom_id = 'CLASSROOM_ID' AND status = 'active';
```

**Solution :** Créer de nouveaux comptes étudiants pour tester.

---

## 🎯 Tests à Effectuer

### Test 1 : Inscription Basique

1. **En tant que Professeur :**
   - Créer une classe
   - Aller dans l'onglet Élèves
   - Cliquer "➕ Inscrire un élève"
   - ✅ Vérifier que la liste des étudiants apparaît
   - Cliquer "✓ Inscrire" sur un étudiant
   - ✅ Vérifier le message de succès
   - ✅ Vérifier que l'étudiant apparaît dans la liste

2. **Vérifier en base de données :**
```sql
SELECT * FROM enrollments
WHERE classroom_id = 'CLASSROOM_ID'
  AND status = 'active'
ORDER BY enrolled_at DESC
LIMIT 1;
```

### Test 2 : Workflow Devoir Complet

1. **Inscrire un étudiant** (Test 1)
2. **Créer et publier un devoir** dans cette classe
3. **Vérifier la notification** :
```sql
SELECT * FROM notifications
WHERE type = 'assignment_created'
  AND assignment_id = 'ASSIGNMENT_ID'
ORDER BY created_at DESC;
```
4. **Se connecter en tant qu'étudiant**
5. ✅ Vérifier la notification dans la cloche
6. ✅ Vérifier le devoir dans `/student/homework`

### Test 3 : Retirer un Étudiant

1. **En tant que Professeur :**
   - Aller dans l'onglet Élèves
   - Cliquer "🗑️ Retirer" sur un étudiant
   - Confirmer
   - ✅ L'étudiant disparaît de la liste

2. **Vérifier en base de données :**
```sql
SELECT * FROM enrollments
WHERE id = 'ENROLLMENT_ID';
-- status devrait être 'inactive'
```

3. **Créer un nouveau devoir**
4. ✅ L'étudiant retiré ne doit PAS recevoir de notification

### Test 4 : Réinscrire un Étudiant

1. **Retirer un étudiant** (Test 3)
2. **Réinscrire le même étudiant**
3. ✅ Vérifier le message "Inscription réactivée"
4. **Vérifier en base :**
```sql
SELECT * FROM enrollments
WHERE student_id = 'STUDENT_ID'
  AND classroom_id = 'CLASSROOM_ID'
ORDER BY enrolled_at DESC;
-- status = 'active', enrolled_at mis à jour
```

---

## 📊 Architecture Technique

### Tables Impliquées

```sql
-- enrollments (table principale)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  student_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'active', -- 'active' | 'inactive'
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_enrollments_classroom ON enrollments(classroom_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

### Row Level Security (RLS)

```sql
-- Les étudiants voient leurs propres enrollments
CREATE POLICY "Students view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid() = student_id);

-- Les professeurs gèrent les enrollments de leurs classes
CREATE POLICY "Teachers manage classroom enrollments"
ON enrollments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = enrollments.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);
```

### Trigger de Notification

```sql
-- Fonction trigger (déjà existante)
CREATE OR REPLACE FUNCTION notify_assignment_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_count INTEGER := 0;
BEGIN
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status = 'draft') THEN
    -- CRUCIAL : Ne notifier que les étudiants avec enrollment actif
    FOR v_student IN
      SELECT DISTINCT e.student_id
      FROM enrollments e
      WHERE e.classroom_id = NEW.classroom_id
        AND e.status = 'active'  -- ⚠️ TRÈS IMPORTANT
    LOOP
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

    RAISE NOTICE 'Notifications créées: %', v_count;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## 🎉 Résumé

### Avant (Problème)
- ❌ Étudiants créés mais pas inscrits dans les classes
- ❌ Devoirs publiés mais aucune notification envoyée
- ❌ Pas d'interface pour gérer les inscriptions
- ❌ Confusion sur pourquoi les devoirs n'arrivent pas

### Après (Solution)
- ✅ Interface intuitive pour inscrire les étudiants
- ✅ Gestion complète : inscription, retrait, réactivation
- ✅ Workflow clair : Inscrire → Publier devoir → Notification automatique
- ✅ API endpoints sécurisés avec RLS
- ✅ Préservation de l'historique (status inactive au lieu de suppression)
- ✅ Diagnostic facile avec requêtes SQL

---

## 📞 Support

Si les devoirs ne sont toujours pas reçus après inscription :

1. **Vérifier l'enrollment** (requête SQL section Diagnostic)
2. **Vérifier le trigger** (script de vérification)
3. **Consulter les logs Supabase** (Dashboard → Logs)
4. **Tester avec un nouvel étudiant** pour éliminer les problèmes de cache

**Le problème principal est résolu : Les étudiants DOIVENT être inscrits via l'interface professeur pour recevoir les devoirs ! 🎯**
