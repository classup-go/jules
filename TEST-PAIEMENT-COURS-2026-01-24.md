# 🧪 TEST: Paiement d'un Cours Individuel

**Date**: 2026-01-24
**Objectif**: Acheter UN cours spécifique (pas toute la classroom)

---

## ✅ SITUATION ACTUELLE

D'après la requête Supabase:
- ✅ **6 courses** existent dans la table `courses`
- ✅ Chaque course a un `classroom_id` valide
- ✅ Chaque course a un `price` (15€, 20€, 50€)
- ✅ Tous les courses ont `is_published: true`

**Courses disponibles**:
```
1. math intro 2 - 50€ (classroom: terminale 3)
2. mmmmmmmm - 50€ (classroom: terminale 1)
3. pppppppppp - 15€ (classroom: phisique)
4. chimie 1 - 20€ (classroom: 3eme eco 1)
5. cccccccccc - 20€ (classroom: abb 20)
6. svt général - 0€ (classroom: M21 - gratuit)
```

---

## 🎯 FLOW CORRECT

```
1. Étudiant va sur une CLASSROOM (ex: "terminale 3")
   ↓
2. Voit PLUSIEURS COURS dans cette classroom:
   - Course 1: "math intro 2" - 50€
   - Course 2: "Algèbre avancée" - 30€
   - Course 3: "Géométrie" - 40€
   ↓
3. Clique sur "Acheter ce cours - 50€" pour "math intro 2"
   ↓
4. Redirigé vers /checkout?course=7309a915-1e22-4aef-848e-6c2db8e1ca8a
   ↓
5. Paie 50€ pour CE COURS UNIQUEMENT
   ↓
6. Enrollment créé avec:
   - course_id: 7309a915-1e22-4aef-848e-6c2db8e1ca8a
   - classroom_id: 35321ca9-1591-4fd2-96cf-8ddadd4f7490
   ↓
7. Étudiant a accès UNIQUEMENT à "math intro 2"
   (pas aux autres cours de la classroom)
```

---

## 🧪 PROCÉDURE DE TEST

### Étape 1: Ouvrir la Console (F12)

Avant de commencer, ouvrir la console pour voir les logs.

### Étape 2: Aller sur une Classroom

URL de test (classroom "terminale 3"):
```
http://localhost:3000/classroom/35321ca9-1591-4fd2-96cf-8ddadd4f7490
```

**Résultat attendu**:
- ✅ Page affiche "terminale 3"
- ✅ Liste des cours avec "math intro 2 - 50€"
- ✅ Bouton "Acheter ce cours - 50€"

### Étape 3: Cliquer sur "Acheter ce cours"

**Résultat attendu**:
- ✅ Redirection vers `/checkout?course=7309a915-1e22-4aef-848e-6c2db8e1ca8a`
- ✅ Page checkout s'affiche

**Si erreur 404/406**:
→ Vérifier dans la console les logs de l'API
→ Noter le message d'erreur exact

### Étape 4: Page Checkout

**Vérifier que la page affiche**:
- ✅ Titre du cours: "math intro 2"
- ✅ Prix: 50€ (ou équivalent dans votre devise)
- ✅ Nom du professeur
- ✅ Méthodes de paiement disponibles

**Si "Cours non trouvé"**:
```sql
-- Vérifier que le cours existe
SELECT * FROM courses
WHERE id = '7309a915-1e22-4aef-848e-6c2db8e1ca8a';
```

### Étape 5: Sélectionner une Méthode de Paiement

Choisir "Carte bancaire"

### Étape 6: Cliquer sur "Confirmer l'inscription"

**Résultat attendu**:
- ✅ Redirection vers Stripe (page bleue/blanche)
- ✅ Formulaire de paiement Stripe s'affiche

**Si erreur avant Stripe**:
→ Ouvrir la console
→ Chercher les logs de l'appel `/api/checkout`
→ Noter l'erreur

### Étape 7: Payer avec Carte de Test

**Données de test**:
```
Numéro: 4242 4242 4242 4242
Date: 12/25 (ou n'importe quelle date future)
CVC: 123
```

**Résultat attendu**:
- ✅ Paiement accepté
- ✅ Redirection vers `/payment/success?course_id=7309a915-1e22-4aef-848e-6c2db8e1ca8a`

### Étape 8: Page Success

**Vérifier dans la console** les logs:
```
⚠️ No enrollment found, creating it now (webhook did not run)
✅ Enrollment created successfully
```

**Résultat attendu**:
- ✅ Message "Paiement réussi !"
- ✅ Titre du cours: "math intro 2"
- ✅ Bouton "Commencer le cours"

**Si "Transaction introuvable"**:
→ Vérifier les logs console
→ Chercher des erreurs sur la création de l'enrollment

### Étape 9: Vérifier dans la Base de Données

```sql
-- 1. Vérifier que l'enrollment a été créé
SELECT
  e.id,
  e.course_id,
  e.classroom_id,
  e.status,
  e.enrolled_at,
  c.title as course_title,
  cl.title as classroom_title
FROM enrollments e
LEFT JOIN courses c ON c.id = e.course_id
LEFT JOIN classrooms cl ON cl.id = e.classroom_id
WHERE e.course_id = '7309a915-1e22-4aef-848e-6c2db8e1ca8a'
ORDER BY e.enrolled_at DESC
LIMIT 1;
```

**Résultat attendu**:
```json
{
  "course_id": "7309a915-1e22-4aef-848e-6c2db8e1ca8a",
  "classroom_id": "35321ca9-1591-4fd2-96cf-8ddadd4f7490",
  "status": "active",
  "course_title": "math intro 2",
  "classroom_title": "terminale 3"
}
```

### Étape 10: Cliquer sur "Commencer le cours"

**Résultat attendu**:
- ✅ Redirection vers `/classroom/35321ca9-1591-4fd2-96cf-8ddadd4f7490`
- ✅ Le cours "math intro 2" est accessible
- ✅ Chapitres et leçons visibles

---

## ❌ ERREURS POSSIBLES ET SOLUTIONS

### Erreur 1: "Cours non trouvé" (404) au Checkout

**Diagnostic**:
```sql
SELECT * FROM courses WHERE id = 'COURSE_ID_FROM_URL';
```

**Si le cours n'existe pas**:
→ Le bouton utilise un mauvais ID
→ Vérifier que `course.id` dans la page classroom est correct

**Si le cours existe mais erreur 404**:
→ Problème dans l'API checkout
→ Vérifier les logs de `/api/checkout`

### Erreur 2: "Transaction introuvable" après Paiement

**Cause**: Le webhook ne tourne pas (normal en local)

**Solution**: La page success devrait créer automatiquement l'enrollment

**Vérifier dans la console**:
```
⚠️ No enrollment found, creating it now (webhook did not run)
```

**Si ce log n'apparaît pas**:
→ La logique de fallback ne s'exécute pas
→ Vérifier les erreurs dans la console

**Si erreur lors de la création**:
```
Error creating enrollment: { code: 'XXXXX', message: '...' }
```

**Codes d'erreur courants**:
- `23505` (duplicate) → L'enrollment existe déjà, c'est OK
- `42501` (insufficient privilege) → Problème de RLS policies
- `23503` (foreign key violation) → Le course_id ou classroom_id n'existe pas

### Erreur 3: Enrollment créé avec course_id = null

**Diagnostic**:
```sql
SELECT course_id, classroom_id FROM enrollments
ORDER BY enrolled_at DESC LIMIT 1;
```

**Si `course_id` est null**:
→ La page success utilise le mauvais flow
→ Vérifier que l'URL contient bien `course_id=...`

### Erreur 4: Erreur RLS lors de la Création de l'Enrollment

**Message**: `new row violates row-level security policy`

**Solution**:
```sql
-- Vérifier les policies pour INSERT sur enrollments
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'enrollments' AND cmd = 'INSERT';

-- Si aucune policy n'existe pour les étudiants:
CREATE POLICY "Students can enroll in courses"
  ON enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid());
```

---

## 📊 VÉRIFICATIONS FINALES

### 1. Vérifier le Course ID dans l'URL

Quand vous cliquez sur "Acheter ce cours", l'URL doit ressembler à:
```
http://localhost:3000/checkout?course=7309a915-1e22-4aef-848e-6c2db8e1ca8a
```

**PAS**:
```
http://localhost:3000/checkout?classroom=35321ca9-1591-4fd2-96cf-8ddadd4f7490
```

### 2. Vérifier l'Enrollment dans la BDD

Après paiement, l'enrollment DOIT avoir un `course_id`:
```sql
SELECT course_id, classroom_id, status
FROM enrollments
ORDER BY enrolled_at DESC
LIMIT 1;
```

**Résultat attendu**:
```
course_id: 7309a915-1e22-4aef-848e-6c2db8e1ca8a (PAS NULL!)
classroom_id: 35321ca9-1591-4fd2-96cf-8ddadd4f7490
status: active
```

### 3. Vérifier l'Accès au Cours

L'étudiant devrait avoir accès UNIQUEMENT au cours acheté, pas à tous les cours de la classroom.

---

## 🐛 LOGS À SURVEILLER

### Dans la Console (F12)

**Lors du checkout**:
```
Error fetching course: {...}  ← Si ce log apparaît, noter l'erreur
```

**Lors du success**:
```
⚠️ No enrollment found, creating it now (webhook did not run)
✅ Enrollment created successfully
```

OU

```
Error creating enrollment: {...}  ← Si erreur, noter le code
```

### Dans les Network Requests

Vérifier les appels API:
1. `POST /api/checkout` → Doit retourner 200 avec `{ url: "https://checkout.stripe.com/..." }`
2. Après paiement → Redirect vers `/payment/success?course_id=...`

---

## ✅ CHECKLIST DE SUCCÈS

- [ ] Bouton "Acheter" redirige vers `/checkout?course=COURSE_ID`
- [ ] Page checkout affiche le cours correct avec le bon prix
- [ ] Paiement Stripe fonctionne
- [ ] Redirection vers `/payment/success?course_id=COURSE_ID`
- [ ] Page success affiche "Paiement réussi"
- [ ] Enrollment créé dans la BDD avec `course_id` renseigné (PAS NULL)
- [ ] `classroom_id` aussi renseigné dans l'enrollment
- [ ] Étudiant peut accéder au cours depuis "Commencer le cours"

---

*Testez maintenant et notez à quelle étape ça échoue (si ça échoue) ! 🧪*
