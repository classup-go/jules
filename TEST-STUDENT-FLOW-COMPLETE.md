# 🧪 TEST: Flow Student Complet

**Date**: 28 janvier 2026
**Objectif**: Vérifier que le système enrollments/courses/chapters fonctionne correctement
**Prérequis**: Migration enrollments terminée (tous les `course_id` remplis)

---

## ✅ CHECKLIST DE TEST

### Phase 1: Préparation (5 min)

#### [ ] 1.1 Vérifier que la DB est prête

Exécuter dans Supabase SQL Editor:

```sql
-- 1. Vérifier qu'il n'y a pas de course_id NULL
SELECT COUNT(*) as enrollments_sans_course
FROM enrollments
WHERE course_id IS NULL;
-- Résultat attendu: 0

-- 2. Vérifier que les courses existent
SELECT
  COUNT(DISTINCT e.course_id) as courses_enrolled,
  COUNT(DISTINCT c.id) as courses_existants
FROM enrollments e
LEFT JOIN courses c ON c.id = e.course_id;
-- courses_enrolled doit égaler courses_existants

-- 3. Vérifier qu'il y a du contenu
SELECT
  'Contenu disponible' as check_name,
  COUNT(DISTINCT c.id) as courses,
  COUNT(DISTINCT ch.id) as chapters,
  COUNT(DISTINCT l.id) as lessons
FROM courses c
LEFT JOIN chapters ch ON ch.course_id = c.id
LEFT JOIN lessons l ON l.chapter_id = ch.id
WHERE c.id IN (SELECT DISTINCT course_id FROM enrollments);
```

**Résultat attendu**:
- 0 enrollments sans course_id
- chapters > 0 (au moins 1 chapter)
- lessons > 0 (au moins 1 lesson)

**Si chapters = 0**: Les teachers doivent d'abord ajouter du contenu!

---

### Phase 2: Test Connexion & Dashboard (10 min)

#### [ ] 2.1 Se connecter comme student

1. Ouvrir `http://localhost:3000` (ou URL de dev)
2. Se connecter avec un compte **student** qui a des enrollments:
   - Email: `[student email from enrollments]`
   - Mot de passe: `[password]`

**Résultat attendu**:
- ✅ Connexion réussie
- ✅ Redirection vers `/student/dashboard`

**Si erreur**: Vérifier les credentials

---

#### [ ] 2.2 Vérifier le Dashboard

Sur `/student/dashboard`:

**Vérifications**:
- [ ] La page charge sans erreur
- [ ] Au moins 1 cours s'affiche
- [ ] Chaque cours affiche:
  - Titre du cours
  - "X leçons" (pas "0 leçons")
  - Barre de progression
  - Bouton "Continuer"

**Résultat attendu**:
```
┌─────────────────────────────────┐
│ Math 2025                       │
│ 5 leçons • 20% complété         │
│ ▓▓▓░░░░░░░                      │
│ [Continuer →]                   │
└─────────────────────────────────┘
```

**Si "0 leçons"**: Le course n'a pas de chapters/lessons → Teacher doit ajouter du contenu

---

### Phase 3: Test My Courses (10 min)

#### [ ] 3.1 Aller sur My Courses

1. Cliquer sur "Mes Cours" dans la navigation
2. OU aller directement sur `/student/my-courses`

**Résultat attendu**:
- ✅ Page charge sans erreur
- ✅ Liste de tous les cours enrollés
- ✅ Chaque cours affiche:
  - Image de couverture
  - Titre
  - Description
  - "X leçons"
  - Progression en %
  - Bouton "Accéder au cours"

---

#### [ ] 3.2 Cliquer sur un cours

1. Cliquer sur "Accéder au cours" sur n'importe quel cours

**Résultat attendu**:
- ✅ Redirection vers `/learn/[classroomId]`
- ✅ Page du cours s'affiche

---

### Phase 4: Test Page Cours (Learn) (15 min)

#### [ ] 4.1 Vérifier l'affichage des chapitres

Sur `/learn/[classroomId]`:

**Vérifications**:
- [ ] Titre du cours affiché
- [ ] Au moins 1 chapitre s'affiche
- [ ] Chaque chapitre affiche:
  - Numéro du chapitre
  - Titre du chapitre
  - Liste des leçons
  - Score requis (si QCM de validation)

**Résultat attendu**:
```
Chapitre 1: Introduction
├─ 📝 Leçon 1: Présentation
├─ 🎥 Leçon 2: Vidéo de démonstration
└─ ✅ QCM de validation (75% requis)

Chapitre 2: Concepts de base
├─ 📝 Leçon 1: Théorie
└─ 📄 Leçon 2: Exercices pratiques
```

**Si "0 chapitres"**:
- Vérifier que l'enrollment a un `course_id` valide
- Vérifier que le course a des chapters

---

#### [ ] 4.2 Vérifier les leçons

Sous chaque chapitre:

**Vérifications**:
- [ ] Au moins 1 leçon visible
- [ ] Icône appropriée selon le type:
  - 📝 = Texte
  - 🎥 = Vidéo
  - 📄 = PDF
  - ✅ = QCM
- [ ] Durée affichée (si disponible)
- [ ] Leçon cliquable

**Si "0 leçons"**: Le chapter n'a pas de lessons → Teacher doit ajouter des lessons

---

#### [ ] 4.3 Ouvrir une leçon

1. Cliquer sur n'importe quelle leçon

**Résultat attendu**:
- ✅ Redirection vers `/lesson/[lessonId]` ou `/quiz/[lessonId]`
- ✅ Page de la leçon s'affiche

---

### Phase 5: Test Leçon (20 min)

#### [ ] 5.1 Leçon de type Texte

Sur `/lesson/[lessonId]` (type: text):

**Vérifications**:
- [ ] Titre de la leçon affiché
- [ ] Contenu textuel s'affiche
- [ ] Bouton "Marquer comme complété"
- [ ] Bouton "Leçon suivante" (si pas dernière leçon)

**Actions**:
1. Lire le contenu
2. Cliquer sur "Marquer comme complété"

**Résultat attendu**:
- ✅ Leçon marquée comme complétée
- ✅ Progression mise à jour
- ✅ Redirection automatique vers leçon suivante (optionnel)

---

#### [ ] 5.2 Leçon de type Vidéo

Sur `/lesson/[lessonId]` (type: video):

**Vérifications**:
- [ ] Player vidéo s'affiche
- [ ] Vidéo se charge (pas d'erreur 403/404)
- [ ] Contrôles de lecture fonctionnent:
  - Play/Pause
  - Volume
  - Fullscreen
  - Timeline

**Actions**:
1. Lancer la vidéo
2. Regarder au moins quelques secondes
3. Mettre en pause

**Résultat attendu**:
- ✅ Vidéo lit correctement
- ✅ Pas d'erreur CORS ou RLS
- ✅ Progression trackée (si implémenté)

**Si erreur 403**: Problème RLS sur le storage bucket

---

#### [ ] 5.3 Leçon de type PDF

Sur `/lesson/[lessonId]` (type: pdf):

**Vérifications**:
- [ ] Viewer PDF s'affiche
- [ ] PDF se charge correctement
- [ ] Navigation entre pages fonctionne

**Actions**:
1. Faire défiler les pages
2. Zoomer / Dézoomer
3. Télécharger le PDF (si autorisé)

**Résultat attendu**:
- ✅ PDF s'affiche correctement
- ✅ Pas d'erreur de chargement

**Si erreur**: Vérifier RLS sur storage bucket `lesson-pdfs`

---

#### [ ] 5.4 Leçon de type QCM

Sur `/quiz/[lessonId]` (type: qcm):

**Vérifications**:
- [ ] Questions s'affichent
- [ ] Au moins 2 questions
- [ ] Choix multiples pour chaque question
- [ ] Bouton "Soumettre" ou "Question suivante"

**Actions**:
1. Répondre à toutes les questions
2. Soumettre le quiz

**Résultat attendu**:
- ✅ Score calculé et affiché
- ✅ Si score >= required_score: Chapitre débloqué
- ✅ Si score < required_score: Message "Réessayer"

**Formule attendue**:
```
Score = (Réponses correctes / Total questions) × 100
```

**Si QCM de validation (is_chapter_validation = true)**:
- Score >= 75% → Chapitre suivant débloqué
- Score < 75% → Réessayer le QCM

---

### Phase 6: Test Progression (10 min)

#### [ ] 6.1 Vérifier la progression globale

Retour sur `/student/my-courses`:

**Vérifications**:
- [ ] Barre de progression mise à jour
- [ ] Pourcentage reflète les leçons complétées

**Formule attendue**:
```
Progression = (Leçons complétées / Total leçons) × 100
```

---

#### [ ] 6.2 Vérifier la progression par chapitre

Retour sur `/learn/[classroomId]`:

**Vérifications**:
- [ ] Chapitres complétés ont une coche ✅
- [ ] Chapitres verrouillés ont un cadenas 🔒 (si progression linéaire)
- [ ] Chapitre actuel est highlighté

---

### Phase 7: Test Edge Cases (15 min)

#### [ ] 7.1 Student non-enrollé

1. Se déconnecter
2. Se connecter avec un student **non-enrollé**
3. Essayer d'accéder à `/learn/[classroomId]` d'un cours non-acheté

**Résultat attendu**:
- ✅ Erreur 403 "Non autorisé"
- OU: Redirection vers page d'achat

---

#### [ ] 7.2 Cours sans contenu

1. Se connecter avec student enrollé dans un cours vide
2. Aller sur `/learn/[classroomId]`

**Résultat attendu**:
- ✅ Message "Aucun chapitre disponible"
- ✅ Message "Le professeur n'a pas encore ajouté de contenu"

---

#### [ ] 7.3 Enrollment avec course_id NULL

Si un enrollment a `course_id = NULL`:

**Résultat attendu**:
- ❌ Le cours ne devrait PAS s'afficher sur `/student/my-courses`
- OU: Le cours s'affiche mais avec "0 leçons"

**Fix**: Exécuter `scripts/migrate-enrollments-to-courses.sql`

---

## 📊 RÉSUMÉ DES TESTS

| Test | Status | Notes |
|------|--------|-------|
| Connexion student | ⏳ | |
| Dashboard affichage | ⏳ | |
| My Courses liste | ⏳ | |
| Learn page chapters | ⏳ | |
| Learn page lessons | ⏳ | |
| Leçon texte | ⏳ | |
| Leçon vidéo | ⏳ | |
| Leçon PDF | ⏳ | |
| QCM | ⏳ | |
| Progression tracking | ⏳ | |
| Non-enrollé accès refusé | ⏳ | |

---

## ❌ TROUBLESHOOTING

### Problème: "0 leçons" partout

**Cause**: `course_id` NULL dans enrollments OU course n'a pas de chapters

**Fix**:
```sql
-- Vérifier
SELECT e.id, e.course_id, c.title
FROM enrollments e
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.student_id = 'STUDENT_UUID';

-- Si course_id NULL: Migrer
-- Exécuter: scripts/migrate-enrollments-to-courses.sql
```

---

### Problème: Erreur 403 sur vidéos/PDFs

**Cause**: RLS policies bloquent l'accès au storage

**Fix**:
```sql
-- Vérifier les policies storage
SELECT * FROM storage.policies
WHERE bucket_id IN ('lesson-videos', 'lesson-pdfs');

-- Ajouter policy si manquante
-- Voir: FIX-RLS-POLICIES-FINAL.sql
```

---

### Problème: Chapitres vides

**Cause**: Chapters existent mais n'ont pas de lessons

**Fix**: Teacher doit ajouter des lessons via `/teacher/courses/[courseId]`

---

### Problème: QCM ne calcule pas le score

**Cause**: Questions mal configurées OU logic de scoring bugguée

**Fix**:
```sql
-- Vérifier les questions
SELECT
  l.id as lesson_id,
  l.title as lesson_title,
  COUNT(q.id) as questions_count
FROM lessons l
LEFT JOIN qcm_questions q ON q.lesson_id = l.id
WHERE l.type = 'qcm'
GROUP BY l.id, l.title;

-- Chaque leçon QCM doit avoir au moins 1 question
```

---

## ✅ VALIDATION FINALE

Après avoir complété tous les tests:

- [ ] Student peut se connecter
- [ ] Student voit tous ses cours enrollés
- [ ] Student peut accéder aux chapitres et leçons
- [ ] Student peut ouvrir différents types de leçons
- [ ] Student peut passer des QCM
- [ ] Progression trackée correctement
- [ ] Student non-enrollé ne peut PAS accéder au contenu

**Si toutes les cases cochées**: 🎉 Flow student fonctionne correctement!

---

## 📝 RAPPORT DE BUG

Si vous trouvez des bugs pendant les tests, documentez-les ici:

### Bug #1: [Titre du bug]
- **Étape**: [À quelle étape du test]
- **Résultat attendu**: [Ce qui devrait se passer]
- **Résultat réel**: [Ce qui s'est passé]
- **Erreur console**: [Copier l'erreur]
- **Screenshot**: [Si applicable]

---

**Créé**: 28 janvier 2026
**Status**: 🧪 PRÊT POUR TEST
**Temps estimé**: 60-90 minutes pour test complet
