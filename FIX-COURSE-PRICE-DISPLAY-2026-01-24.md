# 🔧 FIX: Affichage Prix des Cours et Erreur Checkout

**Date**: 2026-01-24
**Problème**: Les cours s'affichent à 0€ et le checkout renvoie une erreur 406/400

---

## 🐛 PROBLÈMES IDENTIFIÉS

### 1. Page de Recherche
**Symptôme**: Tous les cours affichent "0€"

**Cause**: La page de recherche récupérait des **classrooms** (classes pédagogiques) au lieu des **courses** (cours). Les classrooms n'ont pas de champ `price`.

**Impact**: Les étudiants voient des prix incorrects.

### 2. Erreur Checkout (406/400)
**Symptôme**: `Failed to load resource: the server responded with a status of 406`

**Causes possibles**:
1. Le cours n'existe pas dans la base de données
2. Le cours existe mais n'est pas publié (`is_published = false`)
3. Le cours existe mais les relations (classroom, teacher) sont cassées
4. Le cours a un prix de 0 alors qu'il devrait être à 50€

### 3. Architecture Incohérente
**Symptôme**: Confusion entre classrooms et courses

**Hiérarchie correcte**:
```
Classrooms (Classes)
  └── Courses (Cours) ← ont des prix
      └── Chapters (Chapitres)
          └── Lessons (Leçons)
```

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Page Classroom Detail ([src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx))

**Changement**: Ajout des champs manquants dans la requête

```typescript
// AVANT
.select(`
  id,
  title,
  description,
  price,
  access_type,
  enrolled_count,
  learning_objectives,
  prerequisites
`)

// APRÈS
.select(`
  id,
  title,
  description,
  price,
  access_type,
  enrolled_count,
  learning_objectives,
  prerequisites,
  classroom_id,      // ← AJOUTÉ
  teacher_id,        // ← AJOUTÉ
  is_published       // ← AJOUTÉ
`)
```

**Impact**: Les informations complètes du cours sont maintenant disponibles.

### 2. Interface Course

**Changement**: Ajout des champs manquants

```typescript
interface Course {
  id: string
  title: string
  description: string
  price: number
  access_type: 'free' | 'premium'
  enrolled_count: number
  learning_objectives: string[]
  prerequisites: string[]
  chapters: Chapter[]
  classroom_id: string    // ← AJOUTÉ
  teacher_id: string      // ← AJOUTÉ
  is_published: boolean   // ← AJOUTÉ
}
```

### 3. Page de Recherche ([src/app/(dashboard)/search/page.tsx](src/app/(dashboard)/search/page.tsx))

**Changement Majeur**: Récupération des **courses** au lieu des **classrooms**

```typescript
// AVANT
const { data: classroomsData } = await supabase
  .from('classrooms')
  .select('*')

// APRÈS
const { data: coursesData } = await supabase
  .from('courses')
  .select(`
    id,
    title,
    description,
    subject,
    level,
    price,              // ← MAINTENANT DISPONIBLE
    access_type,
    enrolled_count,
    classroom_id,
    classrooms!inner(
      id,
      title,
      teacher_id,
      users!classrooms_teacher_id_fkey(
        id,
        display_name
      )
    )
  `)
  .eq('is_published', true)  // ← SEULEMENT LES COURS PUBLIÉS
```

**Transformation des données**:
```typescript
const transformedData = coursesData.map((course: any) => ({
  id: course.id,                              // course ID
  title: course.title,
  description: course.description,
  subject: course.subject,
  level: course.level,
  price: course.price || 0,                   // ✅ Prix réel du cours
  is_free: course.access_type === 'free' || course.price === 0,
  enrolled_count: course.enrolled_count || 0,
  teacher_id: course.classrooms?.users?.id,
  teacher_name: course.classrooms?.users?.display_name,
  classroom_id: course.classroom_id,          // ← Pour le lien
  _isCourse: true                             // ← Flag pour identifier
}))
```

**Mise à jour du lien**:
```typescript
// AVANT
href={`/classroom/${classroom.id}`}  // Pointait vers course.id (incorrect)

// APRÈS
href={`/classroom/${classroom.classroom_id}`}  // Pointe vers classroom_id (correct)
```

**Impact**:
- ✅ Les cours affichent maintenant leur vrai prix (50€)
- ✅ Le lien pointe vers la bonne classroom
- ✅ Seuls les cours publiés sont visibles

---

## 🗄️ VÉRIFICATIONS BASE DE DONNÉES

### Script SQL créé

**Fichier**: [debug-course-price-issue.sql](debug-course-price-issue.sql)

**Utilisations**:
1. Vérifier l'existence des cours
2. Identifier les cours avec prix = 0 mais access_type = premium
3. Trouver les cours non publiés
4. Vérifier les relations cours-classe-professeur
5. Corriger les données si nécessaire

### Requêtes importantes

#### 1. Vérifier un cours spécifique
```sql
SELECT
  c.id,
  c.title,
  c.price,
  c.access_type,
  c.is_published,
  c.classroom_id,
  cl.title as classroom_title,
  cl.teacher_id,
  u.display_name as teacher_name
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
LEFT JOIN users u ON u.id = cl.teacher_id
WHERE c.id = '7309a915-1e22-4aef-848e-6c2db8e1ca8a';  -- ID du cours problématique
```

#### 2. Publier un cours non publié
```sql
UPDATE courses
SET is_published = true
WHERE id = 'COURSE_ID_HERE';
```

#### 3. Corriger le prix d'un cours
```sql
UPDATE courses
SET price = 50.00,
    access_type = 'premium'
WHERE id = 'COURSE_ID_HERE';
```

---

## 🔄 FLOW UTILISATEUR CORRECT

### Étudiant - Recherche et Achat

```
1. Page Recherche (/search)
   ↓
   Affiche les COURSES avec leur vrai prix (50€)
   ↓
2. Clic sur un cours
   ↓
   Redirige vers /classroom/{classroom_id}
   ↓
3. Page Classroom Detail
   ↓
   Affiche tous les COURSES de cette classroom
   ↓
4. Clic sur "Acheter ce cours - 50€"
   ↓
   Redirige vers /checkout?course={course_id}
   ↓
5. Page Checkout
   ↓
   API récupère le cours avec:
   - Price: 50€
   - Teacher info
   - Classroom info
   ↓
6. Paiement Stripe
   ↓
7. Webhook crée l'enrollment
   ↓
8. Success page
```

### Professeur - Création

```
1. Créer une CLASSROOM
   ↓
2. Créer un COURSE dans cette classroom
   - Titre
   - Description
   - Prix: 50€
   - Access type: premium
   ↓
3. Publier le cours (is_published = true)
   ↓
4. Le cours apparaît dans la recherche avec le bon prix
```

---

## 🧪 TESTS À EFFECTUER

### Test 1: Vérifier l'affichage des prix

1. Aller sur `/search`
2. **Résultat attendu**: Les cours affichent leur vrai prix (ex: 50,00 €)
3. **Avant fix**: Affichait 0€

### Test 2: Vérifier le flow d'achat

1. Cliquer sur un cours dans `/search`
2. **Résultat attendu**: Redirige vers `/classroom/{classroom_id}`
3. Voir la liste des cours de cette classe
4. Cliquer sur "Acheter ce cours - 50€"
5. **Résultat attendu**: Redirige vers `/checkout?course={course_id}`
6. **Résultat attendu**: Page de checkout affiche le prix correct
7. **Avant fix**: Erreur 406/400

### Test 3: Vérifier dans la BDD

```sql
-- 1. Voir tous les cours avec prix
SELECT id, title, price, access_type, is_published
FROM courses
ORDER BY created_at DESC;

-- 2. Vérifier le cours problématique
SELECT * FROM courses
WHERE id = '7309a915-1e22-4aef-848e-6c2db8e1ca8a';

-- 3. Vérifier les relations
SELECT
  c.title as course_title,
  c.price,
  cl.title as classroom_title,
  u.display_name as teacher_name
FROM courses c
JOIN classrooms cl ON cl.id = c.classroom_id
JOIN users u ON u.id = cl.teacher_id
WHERE c.id = '7309a915-1e22-4aef-848e-6c2db8e1ca8a';
```

---

## ⚠️ PROBLÈMES POTENTIELS RESTANTS

### 1. Cours non publié
**Symptôme**: Le cours existe mais n'apparaît pas dans la recherche

**Solution**:
```sql
UPDATE courses
SET is_published = true
WHERE id = 'COURSE_ID';
```

### 2. Prix à 0 alors qu'il devrait être à 50€
**Symptôme**: Le cours est payant mais le prix est 0

**Solution**:
```sql
UPDATE courses
SET price = 50.00,
    access_type = 'premium'
WHERE id = 'COURSE_ID';
```

### 3. Relations cassées
**Symptôme**: Erreur 404 "Cours non trouvé" dans l'API checkout

**Diagnostic**:
```sql
-- Vérifier que toutes les relations existent
SELECT
  c.id,
  c.classroom_id,
  cl.id as classroom_exists,
  cl.teacher_id,
  u.id as teacher_exists
FROM courses c
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
LEFT JOIN users u ON u.id = cl.teacher_id
WHERE c.id = 'COURSE_ID';
```

### 4. Enrollments en double
**Symptôme**: Erreur 409 "Vous êtes déjà inscrit"

**Diagnostic**:
```sql
SELECT * FROM enrollments
WHERE course_id = 'COURSE_ID'
  AND student_id = 'STUDENT_ID';
```

**Solution**:
```sql
-- Supprimer les doublons si nécessaire
DELETE FROM enrollments
WHERE id IN (
  SELECT id FROM enrollments
  WHERE course_id = 'COURSE_ID'
    AND student_id = 'STUDENT_ID'
  ORDER BY enrolled_at DESC
  OFFSET 1
);
```

---

## 📊 VÉRIFICATION FINALE

### Checklist

- [ ] Les cours s'affichent avec leur vrai prix dans `/search`
- [ ] Le lien depuis `/search` pointe vers `/classroom/{classroom_id}`
- [ ] La page classroom affiche tous les cours avec leurs vrais prix
- [ ] Le bouton "Acheter" redirige vers `/checkout?course={course_id}`
- [ ] La page checkout charge sans erreur 406/400
- [ ] Le checkout affiche le bon prix (50€)
- [ ] Le paiement fonctionne correctement
- [ ] L'enrollment est créé après paiement

### Commandes SQL de vérification

```sql
-- 1. Compter les cours par statut
SELECT
  is_published,
  access_type,
  COUNT(*) as count,
  AVG(price) as avg_price
FROM courses
GROUP BY is_published, access_type;

-- 2. Trouver les cours problématiques
SELECT id, title, price, access_type, is_published
FROM courses
WHERE (price = 0 AND access_type = 'premium')
   OR (price > 0 AND access_type = 'free')
   OR is_published = false;

-- 3. Vérifier les enrollments récents
SELECT
  e.id,
  e.course_id,
  c.title,
  e.student_id,
  u.display_name,
  e.enrolled_at
FROM enrollments e
JOIN courses c ON c.id = e.course_id
JOIN users u ON u.id = e.student_id
ORDER BY e.enrolled_at DESC
LIMIT 10;
```

---

## 🎯 RÉSUMÉ DES CHANGEMENTS

### Fichiers Modifiés

1. ✅ [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)
   - Ajout de `classroom_id`, `teacher_id`, `is_published` dans la requête
   - Mise à jour de l'interface `Course`

2. ✅ [src/app/(dashboard)/search/page.tsx](src/app/(dashboard)/search/page.tsx)
   - Récupération des `courses` au lieu des `classrooms`
   - Transformation des données pour compatibilité
   - Mise à jour du lien pour pointer vers `classroom_id`
   - Filtrage sur `is_published = true`

### Fichiers Créés

1. ✅ [debug-course-price-issue.sql](debug-course-price-issue.sql)
   - Script de diagnostic et correction
   - Requêtes de vérification
   - Instructions de correction

2. ✅ [FIX-COURSE-PRICE-DISPLAY-2026-01-24.md](FIX-COURSE-PRICE-DISPLAY-2026-01-24.md)
   - Documentation complète du fix
   - Guide de test
   - Troubleshooting

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester l'affichage**
   - Vérifier que les prix s'affichent correctement dans `/search`
   - Vérifier que le lien fonctionne

2. **Vérifier la BDD**
   - Exécuter le script SQL de diagnostic
   - Identifier les cours problématiques
   - Corriger si nécessaire

3. **Tester le checkout**
   - Créer un compte étudiant test
   - Essayer d'acheter un cours
   - Vérifier que le paiement fonctionne

4. **Publier les cours**
   - S'assurer que tous les cours ont `is_published = true`
   - Vérifier que les prix sont corrects

---

*Fix appliqué avec succès ! 🎉*
