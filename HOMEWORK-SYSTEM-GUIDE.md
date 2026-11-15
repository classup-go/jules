# Guide du Système de Devoirs et Notation

## Vue d'ensemble

Le système de devoirs permet aux enseignants de créer des assignments, aux étudiants de soumettre leurs travaux, et aux enseignants de les noter avec des feedbacks détaillés.

---

## ✅ Ce qui a été implémenté

### 1. Base de données (SQL)
- ✅ Table `assignments` - Les devoirs créés par les enseignants
- ✅ Table `submissions` - Les soumissions des étudiants
- ✅ Table `submission_comments` - Commentaires sur les soumissions
- ✅ Table `assignment_rubrics` - Grilles d'évaluation détaillées
- ✅ Table `rubric_grades` - Notes par critère
- ✅ Triggers automatiques (calcul pourcentage, vérification retard)
- ✅ Vues analytiques (statistiques, aperçu étudiant)
- ✅ Politiques RLS complètes

### 2. API Endpoints
- ✅ `GET/POST /api/assignments` - Lister/Créer des devoirs
- ✅ `GET/PATCH/DELETE /api/assignments/[id]` - Gérer un devoir
- ✅ `GET/POST /api/submissions` - Lister/Soumettre
- ✅ `POST /api/submissions/[id]/grade` - Noter une soumission

### 3. Composants
- ✅ `homework-file-upload.tsx` - Upload de fichiers pour devoirs

---

## 📋 Fonctionnalités du système

### Pour les Enseignants

**Créer un devoir :**
- Titre, description, instructions
- Type : fichier, texte, quiz, mixte
- Points maximum et note de passage (60% par défaut)
- Date limite
- Permettre soumissions en retard (avec pénalité)
- Permettre re-soumissions
- Nombre maximum de tentatives
- Fichiers ressources (PDFs, docs)
- Statut : brouillon, publié, fermé
- Grille d'évaluation optionnelle (rubrics)

**Voir les soumissions :**
- Liste de toutes les soumissions par devoir
- Filtrer par étudiant
- Voir le statut (soumis, noté, en retard)
- Télécharger les fichiers soumis

**Noter un devoir :**
- Attribuer une note (0 - max points)
- Calcul automatique du pourcentage
- Statut réussi/échoué automatique
- Ajouter feedback textuel
- Joindre des fichiers de correction
- Noter par critère avec rubric (optionnel)
- Commentaires additionnels

**Statistiques :**
- Nombre total de soumissions
- Nombre noté
- Nombre en retard
- Note moyenne
- Taux de réussite

### Pour les Étudiants

**Voir les devoirs :**
- Liste des devoirs publiés du cours
- Date limite visible
- Points possibles
- Instructions détaillées
- Fichiers ressources téléchargeables
- Statut de sa propre soumission

**Soumettre un devoir :**
- Ajouter du texte
- Joindre jusqu'à 5 fichiers (50MB chacun)
- Vérification de date limite
- Avertissement si en retard
- Voir le nombre de tentatives restantes
- Re-soumettre si autorisé

**Voir sa note :**
- Note obtenue / points maximum
- Pourcentage
- Statut réussi/échoué
- Feedback de l'enseignant
- Fichiers de correction
- Note détaillée par critère (si rubric)
- Indicateur de retard

---

## 🗂️ Structure de la base de données

### Table `assignments`
```sql
- id (UUID)
- classroom_id → référence classrooms
- teacher_id → référence users
- chapter_id → référence chapters (optionnel)
- title (TEXT) *
- description (TEXT)
- instructions (TEXT)
- assignment_type (TEXT) : 'file_upload', 'text', 'quiz', 'mixed'
- max_points (INTEGER) default 100
- passing_grade (INTEGER) default 60
- published_at (TIMESTAMP)
- due_date (TIMESTAMP) *
- late_submission_allowed (BOOLEAN) default true
- late_penalty_percent (INTEGER) default 10
- status (TEXT) : 'draft', 'published', 'closed'
- allow_resubmission (BOOLEAN) default false
- max_attempts (INTEGER) default 1
- resource_urls (TEXT[])
- created_at, updated_at
```

### Table `submissions`
```sql
- id (UUID)
- assignment_id → référence assignments
- student_id → référence users
- submission_text (TEXT)
- submission_files (TEXT[])
- attempt_number (INTEGER)
- submitted_at (TIMESTAMP)
- is_late (BOOLEAN)
- status (TEXT) : 'draft', 'submitted', 'graded', 'returned'
- grade (INTEGER)
- max_points (INTEGER)
- percentage (DECIMAL)
- passed (BOOLEAN)
- feedback_text (TEXT)
- feedback_files (TEXT[])
- graded_by → référence users
- graded_at (TIMESTAMP)
- created_at, updated_at
```

---

## 🔐 Sécurité et Permissions

### Row Level Security (RLS)

**Assignments :**
- Étudiants : Voir uniquement les devoirs publiés des cours où ils sont inscrits
- Enseignants : CRUD complet sur leurs propres devoirs

**Submissions :**
- Étudiants : CRUD sur leurs propres soumissions
- Enseignants : Voir et noter les soumissions de leurs devoirs

**Comments :**
- Étudiants : Voir les commentaires sur leurs soumissions
- Enseignants : CRUD sur les commentaires de leurs devoirs

---

## 📦 Stockage des fichiers

**Bucket : `homework-files` (PRIVÉ)**
- Structure : `{user_id}/{timestamp}_{index}.{ext}`
- Taille max : 50MB par fichier
- 5 fichiers max par soumission
- Types acceptés : Tous (PDFs, images, docs, zip, etc.)

**Politiques de stockage :**
- Upload : Authentifié uniquement
- Lecture : Propriétaire du fichier ou enseignant du devoir

---

## 🚀 Prochaines étapes d'implémentation

### À FAIRE (UI Components)

1. **Page de création de devoir** (`/teacher/assignments/new`)
   - Formulaire complet avec tous les champs
   - Upload de fichiers ressources
   - Création de grille d'évaluation (optionnel)
   - Prévisualisation avant publication

2. **Page de liste des devoirs enseignant** (`/teacher/assignments`)
   - Liste avec filtres (statut, date)
   - Cartes de devoirs avec statistiques
   - Actions rapides (modifier, supprimer, voir soumissions)

3. **Page de soumissions** (`/teacher/assignments/[id]/submissions`)
   - Liste de toutes les soumissions
   - Filtres et recherche
   - Indicateurs visuels (noté, en retard, etc.)
   - Export des notes (CSV)

4. **Interface de notation** (`/teacher/submissions/[id]/grade`)
   - Affichage du travail soumis
   - Visualisation des fichiers
   - Formulaire de notation
   - Grille d'évaluation si applicable
   - Historique des tentatives

5. **Page de liste des devoirs étudiant** (`/student/assignments`)
   - Liste des devoirs du cours
   - Filtres (à faire, soumis, notés)
   - Indicateurs de date limite
   - Badges de statut

6. **Page de soumission étudiant** (`/student/assignments/[id]/submit`)
   - Instructions claires
   - Zone de texte
   - Upload de fichiers
   - Aperçu avant soumission
   - Confirmation

7. **Page de résultats étudiant** (`/student/submissions/[id]`)
   - Note reçue avec détails
   - Feedback enseignant
   - Fichiers de correction
   - Comparaison avec la moyenne
   - Option de re-soumission si autorisée

---

## 💡 Fonctionnalités Avancées (Phase 2)

### Automatisation
- [ ] Notifications automatiques (nouveau devoir, date limite proche, noté)
- [ ] Rappels par email 24h avant la date limite
- [ ] Notification enseignant : nouvelle soumission

### Analytics
- [ ] Dashboard statistiques avancées enseignant
- [ ] Graphiques de progression étudiant
- [ ] Comparaison avec la classe
- [ ] Identification des étudiants en difficulté

### Collaboration
- [ ] Devoirs en groupe
- [ ] Peer review (évaluation par les pairs)
- [ ] Partage de ressources entre enseignants

### Quiz intégrés
- [ ] Création de quiz dans les devoirs
- [ ] Correction automatique des QCM
- [ ] Banque de questions réutilisables

### Plagiarism Detection
- [ ] Vérification de similitude entre soumissions
- [ ] Intégration avec API externe (Turnitin, Copyscape)

---

## 📝 Exemples d'utilisation

### Créer un devoir (API)
```typescript
const response = await fetch('/api/assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    classroomId: 'classroom-uuid',
    title: 'Dissertation sur la Révolution Française',
    description: 'Rédigez une dissertation de 1000 mots',
    instructions: 'Suivez le plan en 3 parties...',
    assignmentType: 'file_upload',
    maxPoints: 100,
    passingGrade: 70,
    dueDate: '2024-12-31T23:59:59Z',
    lateSubmissionAllowed: true,
    latePenaltyPercent: 10,
    status: 'published',
    resourceUrls: ['https://...guideline.pdf']
  })
});
```

### Soumettre un devoir (API)
```typescript
const response = await fetch('/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assignmentId: 'assignment-uuid',
    submissionText: 'Mon travail...',
    submissionFiles: ['https://...mywork.pdf', 'https://...annexe.docx']
  })
});
```

### Noter une soumission (API)
```typescript
const response = await fetch('/api/submissions/submission-uuid/grade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grade: 85,
    feedbackText: 'Excellent travail ! Quelques points à améliorer...',
    feedbackFiles: ['https://...corrections.pdf'],
    rubricGrades: [
      { rubricId: 'rubric1', pointsEarned: 20, feedback: 'Bonne intro' },
      { rubricId: 'rubric2', pointsEarned: 35, feedback: 'Développement solide' }
    ]
  })
});
```

---

## 🐛 Troubleshooting

### Problème : "Assignment not found"
- Vérifier que l'assignment existe et est publié
- Vérifier l'enrollment de l'étudiant dans le cours

### Problème : "Maximum submission attempts reached"
- Vérifier `max_attempts` dans l'assignment
- Vérifier `allow_resubmission`

### Problème : "Late submissions not allowed"
- Vérifier `late_submission_allowed` dans l'assignment
- Vérifier que la date limite n'est pas dépassée

### Problème : "Failed to upload file"
- Vérifier que le bucket `homework-files` existe
- Vérifier les politiques de stockage
- Vérifier la taille du fichier (<50MB)

---

## ✅ Checklist de déploiement

1. [ ] Exécuter `supabase-homework-setup.sql` dans Supabase SQL Editor
2. [ ] Créer le bucket `homework-files` (PRIVÉ) dans Supabase Storage
3. [ ] Appliquer les politiques de stockage
4. [ ] Tester la création d'un assignment
5. [ ] Tester la soumission d'un devoir
6. [ ] Tester la notation
7. [ ] Vérifier les permissions RLS
8. [ ] Tester avec plusieurs rôles (enseignant, étudiant)
9. [ ] Vérifier les calculs automatiques (pourcentage, retard)
10. [ ] Tester les limites (max fichiers, max tentatives)

---

## 📚 Ressources

- Documentation Supabase : https://supabase.com/docs
- RLS Guide : https://supabase.com/docs/guides/auth/row-level-security
- Storage Guide : https://supabase.com/docs/guides/storage

---

✅ **Le backend du système de devoirs est complet !** Il ne reste plus qu'à créer les interfaces utilisateur pour les enseignants et étudiants.
