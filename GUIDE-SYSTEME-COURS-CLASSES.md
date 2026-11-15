# 📚 Guide Système Cours et Classes - Jules Class Go

## 🎯 Architecture

### Concepts clés

```
┌─────────────────────────────────────────────────┐
│ CLASSROOM (Classe/Groupe d'élèves)              │
│ Ex: "Bac S 2024-2025", "Terminale Maths"       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ├─ COURSE 1: Mathématiques - Fonctions        │
│  │  ├─ Objectifs: [...}                        │
│  │  ├─ Durée: 12 semaines                      │
│  │  ├─ Prérequis: [...]                        │
│  │  └─ Chapitres: [...]                        │
│  │                                              │
│  ├─ COURSE 2: Mathématiques - Dérivées         │
│  │  ├─ Objectifs: [...]                        │
│  │  ├─ Durée: 8 semaines                       │
│  │  └─ Chapitres: [...]                        │
│  │                                              │
│  └─ COURSE 3: Physique - Mécanique             │
│     ├─ Objectifs: [...]                        │
│     └─ Chapitres: [...]                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Tables de base de données

#### 1. **classrooms** - Groupes d'élèves
```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES users(id),
  title TEXT NOT NULL,           -- "Bac S 2024-2025"
  subject TEXT,                  -- "Mathématiques" (général)
  level TEXT,                    -- "Terminale"
  is_public BOOLEAN,
  max_students INTEGER,
  price DECIMAL                  -- Prix d'accès au groupe
);
```

#### 2. **courses** - Contenus pédagogiques (NOUVEAU)
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id), -- ⭐ Lien vers la classe

  -- Informations de base
  title TEXT NOT NULL,                  -- "Fonctions - Niveau Terminale"
  description TEXT,
  thumbnail_url TEXT,

  -- Pédagogie (NOUVEAUTÉ)
  learning_objectives TEXT[],           -- ["Maîtriser...", "Comprendre..."]
  prerequisites TEXT[],                 -- ["Connaître...", "Avoir étudié..."]
  competences TEXT[],                   -- ["Résoudre...", "Analyser..."]

  -- Organisation
  duration_weeks INTEGER DEFAULT 12,
  duration_hours INTEGER,
  total_chapters INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,

  -- Publication
  is_published BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);
```

#### 3. **chapters** - Chapitres du cours
```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id), -- ⭐ Lié au cours, pas à la classe
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER
);
```

---

## 🚀 Flux de travail

### Pour les enseignants

#### 1. Créer une CLASSE (groupe d'élèves)
```
Route: /teacher/classrooms/new (simplifiée)

Champs:
- Nom de la classe: "Bac S 2024-2025"
- Matière générale: "Mathématiques"
- Niveau: "Terminale"
- Nombre max d'élèves: 30
```

#### 2. Créer des COURS pour cette classe
```
Route: /teacher/courses/new (wizard complet)

Étape 1: Sélection de la classe
├─ Sélectionner: "Bac S 2024-2025"
└─ Ou créer une nouvelle classe

Étape 2: Informations du cours
├─ Titre: "Fonctions - Niveau Terminale"
├─ Matière: "Mathématiques"
├─ Niveau: "Terminale"
└─ Description

Étape 3: Objectifs pédagogiques ⭐ NOUVEAU
├─ Objectifs d'apprentissage:
│  ├─ "Maîtriser les fonctions trigonométriques"
│  ├─ "Comprendre les limites et la continuité"
│  └─ "Savoir dériver toute fonction"
├─ Prérequis:
│  ├─ "Connaître les équations du second degré"
│  └─ "Maîtriser les fractions"
└─ Compétences acquises:
   ├─ "Résoudre des équations complexes"
   └─ "Analyser le comportement d'une fonction"

Étape 4: Durée
├─ Durée en semaines: 12
└─ Durée totale en heures: 24h

Étape 5-8: Structure (chapitres, leçons, évaluation, etc.)
```

---

## 📊 Exemples d'utilisation

### Exemple 1: Professeur de Mathématiques

```
CLASSE: "Terminale S - Lycée Victor Hugo"
├─ 25 élèves inscrits
├─ Prix: 200€/trimestre
│
├─ COURS 1: "Analyse - Fonctions et dérivées"
│  ├─ Durée: 12 semaines
│  ├─ Objectifs: [Maîtriser les dérivées, ...]
│  ├─ 5 chapitres, 20 leçons
│  └─ Publié ✅
│
├─ COURS 2: "Géométrie - Espace et vecteurs"
│  ├─ Durée: 10 semaines
│  ├─ Objectifs: [Comprendre les vecteurs, ...]
│  ├─ 4 chapitres, 16 leçons
│  └─ Publié ✅
│
└─ COURS 3: "Probabilités"
   ├─ Durée: 8 semaines
   ├─ En cours de création... 🚧
   └─ Non publié
```

### Exemple 2: Professeur de Physique

```
CLASSE: "Prépa MPSI - 2024"
├─ 30 élèves inscrits
│
├─ COURS 1: "Mécanique du point"
├─ COURS 2: "Thermodynamique"
├─ COURS 3: "Électrocinétique"
└─ COURS 4: "Optique géométrique"
```

---

## 🔄 Migration depuis l'ancien système

### Ancien système (problème)
```
classrooms = cours ET classe mélangés ❌
```

### Nouveau système (solution)
```
classrooms = groupes d'élèves ✅
courses = contenus pédagogiques ✅
```

### Étapes de migration

1. **Exécuter le script SQL**
```bash
psql -d jules_db < supabase-courses-system-setup.sql
```

2. **Les anciennes classrooms deviennent des cours**
   - Option A: Migrer automatiquement (script à créer)
   - Option B: Créer manuellement les nouvelles structures

3. **Vérifier les données**
```sql
-- Vérifier que les courses sont bien créés
SELECT c.title as classroom, co.title as course
FROM classrooms c
LEFT JOIN courses co ON co.classroom_id = c.id;
```

---

## 🎓 Avantages du nouveau système

### Pour les enseignants

✅ **Meilleure organisation**
- Une classe = un groupe d'élèves réel
- Plusieurs cours par classe
- Vision claire de ce qui est enseigné

✅ **Richesse pédagogique**
- Objectifs d'apprentissage clairs
- Prérequis définis
- Compétences mesurables

✅ **Réutilisabilité**
- Un même cours peut être cloné pour une autre classe
- Templates de cours réutilisables

### Pour les élèves

✅ **Clarté**
- Savent exactement ce qu'ils vont apprendre (objectifs)
- Connaissent les prérequis avant de s'inscrire
- Voient les compétences qu'ils vont acquérir

✅ **Suivi**
- Progression par cours
- Certification par cours
- Portfolio de compétences

---

## 🛠️ Développement

### Routes

#### Pages enseignant
```
/teacher/classrooms           → Liste des classes (groupes)
/teacher/classrooms/new       → Créer une classe (simple)
/teacher/classrooms/[id]      → Détails d'une classe

/teacher/courses              → Liste de tous les cours
/teacher/courses/new          → Créer un cours (wizard complet)
/teacher/courses/[id]         → Détails d'un cours
/teacher/courses/[id]/edit    → Éditer un cours
```

#### API
```
POST   /api/courses                    → Créer un cours
GET    /api/courses/[id]               → Récupérer un cours
PATCH  /api/courses/[id]               → Mettre à jour un cours
DELETE /api/courses/[id]               → Supprimer un cours
POST   /api/courses/[id]/publish       → Publier un cours
```

### Composants

```
CourseWizard
├─ Step1: Sélection classe + Infos générales
├─ Step2: Objectifs et prérequis ⭐ NOUVEAU
├─ Step3: Structure (chapitres)
├─ Step4: Contenu (leçons)
├─ Step5: Évaluation
├─ Step6: Accès et monétisation
├─ Step7: Prévisualisation
└─ Step8: Publication
```

---

## ✅ Checklist de déploiement

- [x] Créer la table `courses`
- [x] Modifier l'API `/api/courses`
- [x] Ajouter `classroom_id` au schéma de validation
- [x] Modifier `Step1GeneralInfo` pour sélection de classe
- [ ] Exécuter la migration SQL en production
- [ ] Tester le flow complet de création de cours
- [ ] Migrer les anciennes classrooms vers le nouveau système
- [ ] Mettre à jour la documentation utilisateur

---

## 🆘 Support

En cas de problème:

1. Vérifier que la table `courses` existe
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'courses';
```

2. Vérifier les permissions RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'courses';
```

3. Tester manuellement l'insertion
```sql
INSERT INTO courses (classroom_id, title, learning_objectives)
VALUES ('uuid-de-la-classe', 'Test', ARRAY['Objectif 1']);
```

---

**Dernière mise à jour**: 2026-01-20
**Version**: 1.0
