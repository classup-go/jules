# 🚀 Démarrage Rapide - Templates de Cours

## ⚡ Installation en 2 Minutes

### Prérequis
- ✅ Compte Supabase configuré
- ✅ Table `users` existante dans votre base de données
- ✅ Application Next.js en cours d'exécution

---

## 📝 Étape 1: Nettoyer les Anciennes Tables (si elles existent)

### Dans Supabase SQL Editor:

1. **Ouvrir** [Supabase Dashboard](https://app.supabase.com) → Votre Projet → **SQL Editor**
2. **Copier** tout le contenu du fichier `supabase-course-template-cleanup.sql`
3. **Coller** dans l'éditeur SQL
4. **Cliquer** sur **"Run"** (ou Ctrl+Enter)

✅ Vous devriez voir: `Nettoyage terminé. Toutes les tables de template de cours ont été supprimées.`

---

## 📦 Étape 2: Créer les Tables

### Dans le même SQL Editor:

1. **Effacer** le contenu précédent
2. **Copier** tout le contenu du fichier `supabase-course-template-create.sql`
3. **Coller** dans l'éditeur SQL
4. **Cliquer** sur **"Run"** (ou Ctrl+Enter)

✅ Vous devriez voir plusieurs messages de succès dont:
```
✅ Toutes les tables ont été créées avec succès !
✅ 10 tables: course_templates, pedagogical_progressions, ...
✅ Row Level Security activé
🚀 Vous pouvez maintenant utiliser le système de templates de cours !
```

---

## 🎓 Étape 3: Tester dans l'Application

### Accéder à l'Interface

1. **Ouvrir** votre navigateur sur http://localhost:3001
2. **Se connecter** en tant que **professeur**
3. **Aller dans** le menu → **Templates de Cours**
4. Vous devriez voir la page d'accueil des templates

### Créer Votre Premier Template

1. **Cliquer** sur **"+ Nouveau Template"**
2. **Remplir** le formulaire :
   ```
   Titre: Mathématiques - Les Fonctions
   Matière: Mathématiques
   Niveau: Terminale
   Durée: 12 semaines
   Description: Cours complet sur les fonctions
   ```
3. **Cliquer** "Étape Suivante" puis "Créer le Template"
4. Vous serez redirigé vers l'éditeur du template

### Ajouter une Progression

1. Dans l'éditeur, **cliquer** sur l'onglet **"Progressions"**
2. **Cliquer** sur **"+ Ajouter une Semaine"**
3. **Remplir** :
   ```
   Semaine: 1
   Titre: Introduction aux Fonctions

   Objectifs:
   - Comprendre la notion de fonction
   - Savoir lire un graphique

   Compétences:
   - Représenter
   - Calculer

   Prérequis:
   - Coordonnées dans un repère
   ```
4. **Cliquer** "Enregistrer"

### Publier le Template

1. **Aller** dans l'onglet **"Vue d'ensemble"**
2. **Cliquer** sur **"📢 Publier le Template"**
3. Le template est maintenant visible aux étudiants !

---

## ✅ Vérification

### Vérifier dans Supabase

Exécutez cette requête SQL pour voir votre template:

```sql
SELECT
  ct.title as template,
  ct.is_published,
  COUNT(pp.id) as nb_progressions
FROM course_templates ct
LEFT JOIN pedagogical_progressions pp ON pp.course_template_id = ct.id
GROUP BY ct.id, ct.title, ct.is_published;
```

Vous devriez voir:
| template | is_published | nb_progressions |
|----------|--------------|-----------------|
| Mathématiques - Les Fonctions | true | 1 |

---

## 📚 Structure des Tables Créées

```
course_templates (template principal)
└── pedagogical_progressions (semaine par semaine)
    ├── lesson_contents (vidéos, textes, PDFs)
    ├── course_summaries (résumés)
    ├── revision_sheets (fiches de révision)
    ├── exercises (exercices corrigés)
    ├── qcm_questions (questions QCM)
    ├── quizzes (quiz complets)
    └── homeworks (devoirs)
        └── homework_exercises (lien avec exercises)
```

**Total: 10 tables interconnectées**

---

## 🎯 Fonctionnalités Disponibles

### ✅ Complètement Implémenté

- ✅ Création de templates
- ✅ Liste et gestion des templates
- ✅ Filtres (Tous/Publiés/Brouillons)
- ✅ Édition des informations générales
- ✅ **Gestion des progressions pédagogiques**
  - Ajout de semaines
  - Objectifs d'apprentissage
  - Compétences visées
  - Prérequis
- ✅ Publication de templates
- ✅ Suppression de templates

### 🚧 À Développer (Placeholders Créés)

Les onglets suivants existent mais affichent un message "En cours de développement":
- 🚧 Leçons (vidéos, textes, PDFs, slides)
- 🚧 Résumés (points clés, concepts importants)
- 🚧 Fiches de révision (mnémotechniques)
- 🚧 Exercices (solutions détaillées)
- 🚧 Quiz et QCM (questions interactives)
- 🚧 Devoirs (grilles d'évaluation)

---

## 🛠️ Fichiers Importants

### Scripts SQL
- `supabase-course-template-cleanup.sql` - Nettoyage des tables
- `supabase-course-template-create.sql` - Création complète
- `supabase-course-template-setup.sql` - Script original (ne pas utiliser)
- `supabase-course-template-setup-fixed.sql` - Version intermédiaire (ne pas utiliser)

### Documentation
- `COURSE-TEMPLATE-GUIDE.md` - Guide complet d'utilisation
- `COURSE-TEMPLATE-IMPLEMENTATION.md` - Documentation technique
- `FIX-COURSE-TEMPLATE-SQL.md` - Guide de résolution d'erreurs
- `QUICK-START-COURSE-TEMPLATES.md` - Ce fichier

### Code TypeScript
- `src/types/course-template.ts` - Types et interfaces
- `src/app/(dashboard)/teacher/course-templates/page.tsx` - Liste des templates
- `src/app/(dashboard)/teacher/course-templates/new/page.tsx` - Création
- `src/app/(dashboard)/teacher/course-templates/[id]/edit/page.tsx` - Éditeur

---

## 🆘 Aide et Dépannage

### Erreur: "table users does not exist"

La table `users` doit exister avant de créer les templates.

**Solution:**
```sql
-- Créer la table users si elle n'existe pas
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Erreur: "column progression_id does not exist"

Les tables existent déjà avec une structure incorrecte.

**Solution:** Suivre les étapes 1 et 2 de ce guide (cleanup + create)

### Le template n'apparaît pas dans la liste

Vérifiez que vous êtes bien connecté avec le même compte qui a créé le template.

**Vérification SQL:**
```sql
SELECT ct.*, u.email
FROM course_templates ct
JOIN users u ON u.id = ct.created_by
ORDER BY ct.created_at DESC;
```

### Impossible d'ajouter une progression

Vérifiez les politiques RLS.

**Vérification SQL:**
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'pedagogical_progressions';
```

---

## 📖 Guides Complémentaires

- **Pour créer un cours complet:** Voir `COURSE-TEMPLATE-GUIDE.md`
- **Pour comprendre l'architecture:** Voir `COURSE-TEMPLATE-IMPLEMENTATION.md`
- **En cas d'erreur SQL:** Voir `FIX-COURSE-TEMPLATE-SQL.md`

---

## 🎉 C'est Tout !

Vous avez maintenant un système de templates de cours **opérationnel** !

**Prochaines étapes suggérées:**
1. Créer 2-3 templates de test
2. Ajouter plusieurs progressions par template
3. Tester la publication
4. Développer les onglets restants (leçons, exercices, etc.)

**Besoin d'aide ?** Consultez les guides dans le dossier du projet.

Bon enseignement ! 🎓✨
