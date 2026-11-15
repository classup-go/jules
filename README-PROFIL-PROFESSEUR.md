# 🎓 Système de Profil Professeur - Instructions

## 🚨 PROBLÈME ACTUEL

Vous avez signalé que :
- ❌ Pas de changements visibles
- ❌ Bouton "voir le profil" non cliquable
- ❌ Résultats de recherche vides

**Cause probable :** Le script SQL n'a pas encore été exécuté dans Supabase.

---

## ✅ SOLUTION EN 3 ÉTAPES

### Étape 1: Tester l'État Actuel (1 minute)

**Dans Supabase SQL Editor:**

1. Copier le contenu de : `test-teacher-profile-status.sql`
2. Coller dans SQL Editor
3. Exécuter

**Ce que vous verrez:**
- ✅ ou ❌ pour chaque composant
- Message clair indiquant quoi faire

---

### Étape 2: Installer le Système (2 minutes)

**SI le test montre "❌ SYSTÈME NON CONFIGURÉ":**

1. Ouvrir le fichier : `supabase-teacher-profile-enhancement.sql`
2. **TOUT sélectionner** (Ctrl+A)
3. **Copier** (Ctrl+C)
4. Dans Supabase SQL Editor, cliquer **"New Query"**
5. **Coller** (Ctrl+V)
6. Cliquer **"Run"** (ou Ctrl+Enter)

**Résultat attendu:**
```
✅ Profil professeur amélioré avec succès !
✅ Nouvelles colonnes ajoutées: ...
✅ Table teacher_reviews créée ...
```

7. **Relancer le test** (Étape 1) pour vérifier

---

### Étape 3: Créer un Profil de Test (5 minutes)

Une fois le système installé:

1. **Ouvrir** http://localhost:3001
2. **Se connecter** en tant que **professeur**
3. **Aller sur** : `/teacher/profile/complete`

**Remplir les 4 étapes:**

#### ✏️ Étape 1/4 - Informations de Base
```
Nom: Jean Dupont
Téléphone: 06 12 34 56 78
Ville: Paris
Biographie: Professeur de mathématiques avec 10 ans d'expérience. Pédagogie adaptée à chaque élève.
Expérience: 10+ ans
```
→ Cliquer **"Suivant"**

#### 📚 Étape 2/4 - Enseignement
```
Matières: Cocher "Mathématiques" et "Physique-Chimie"
Niveaux: Cocher "Terminale", "Licence"
Modes: Cocher "En ligne" et "Présentiel"
```
→ Cliquer **"Suivant"**

#### 💰 Étape 3/4 - Tarifs
```
Tarif horaire: 35
Peut se déplacer: ✓ (cocher)
Distance: 15
```
→ Cliquer **"Suivant"**

#### 🎓 Étape 4/4 - Qualifications
```
Spécialités: Ajouter "Préparation Bac"
Diplômes: Ajouter "Agrégation Mathématiques"
Langues: (Français déjà présent)
```
→ Cliquer **"✓ Enregistrer le Profil"**

**Message attendu:** "Profil sauvegardé avec succès !"

---

## 🔍 Tester que Ça Fonctionne

### Test 1: Recherche

1. Ouvrir **navigation privée** (Ctrl+Shift+N)
2. Aller sur http://localhost:3001
3. Se connecter en tant qu'**étudiant** (ou créer compte étudiant)
4. Aller sur : `/find-teachers`

**Résultat attendu:**
- ✅ "1 professeur disponible"
- ✅ Une carte avec le profil de "Jean Dupont"
- ✅ Tarif "35€" visible
- ✅ Matières "Mathématiques, Physique-Chimie" visibles

### Test 2: Profil Public

1. Sur la page de recherche, **cliquer** sur la carte "Jean Dupont"
2. Vérifier que l'URL change : `/teachers/[un-id]`

**Résultat attendu:**
- ✅ Page du profil se charge
- ✅ Photo, nom, ville visibles
- ✅ Note et tarif affichés
- ✅ Biographie complète
- ✅ Matières en badges colorés
- ✅ Modes d'enseignement (💻 🏫)
- ✅ Bouton "Contacter" visible

---

## 📁 Fichiers Créés

### Scripts SQL
- `supabase-teacher-profile-enhancement.sql` - **À EXÉCUTER**
- `test-teacher-profile-status.sql` - Test rapide

### Pages Web
- `/teacher/profile/complete` - Complétion de profil (4 étapes)
- `/find-teachers` - Recherche de professeurs
- `/teachers/[id]` - Profil public

### Documentation
- `TEACHER-PROFILE-SYSTEM-GUIDE.md` - Guide complet
- `QUICK-START-TEACHER-PROFILE.md` - Démarrage rapide
- `DIAGNOSTIC-PROFIL-PROFESSEUR.md` - Diagnostic détaillé
- `README-PROFIL-PROFESSEUR.md` - **Ce fichier**

---

## 🐛 Si Ça Ne Marche Toujours Pas

### Problème: Script SQL échoue

**Erreur possible:** `column already exists`

**Solution:** Les colonnes existent déjà partiellement.

```sql
-- Forcer la recréation
-- ⚠️ ATTENTION: Supprimer les données de test d'abord !
DROP TABLE IF EXISTS teacher_availability CASCADE;
DROP TABLE IF EXISTS teacher_reviews CASCADE;

-- Puis relancer: supabase-teacher-profile-enhancement.sql
```

### Problème: Page 404

**Vérifier que le serveur Next.js tourne:**
```bash
npm run dev
```

**Vérifier les fichiers:**
```bash
ls src/app/(dashboard)/teacher/profile/complete/page.tsx
ls src/app/(dashboard)/find-teachers/page.tsx
ls src/app/(dashboard)/teachers/[id]/page.tsx
```

Si un fichier manque, me le signaler.

### Problème: Erreur TypeScript

**Dans le terminal:**
```
Type error: Property 'subjects' does not exist on type 'User'
```

**Solution:**
Le fichier `src/types/teacher-profile.ts` doit exister.

```bash
ls src/types/teacher-profile.ts
```

---

## 📊 Vérification SQL Rapide

```sql
-- Tout en une requête
SELECT
  -- Colonnes
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate', 'profile_completed')) as colonnes_ok,

  -- Tables
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('teacher_reviews', 'teacher_availability')) as tables_ok,

  -- Professeurs
  (SELECT COUNT(*) FROM users WHERE role = 'teacher') as total_profs,
  (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND profile_completed = true) as profils_complets;
```

**Résultats attendus:**
- colonnes_ok: **5**
- tables_ok: **2**
- total_profs: Au moins **1**
- profils_complets: Au moins **1**

---

## ⚡ Installation Express (Copier-Coller)

**Tout en une fois dans Supabase:**

1. Copier **TOUT** le contenu de `supabase-teacher-profile-enhancement.sql`
2. Coller dans SQL Editor
3. Run
4. Attendre le message de succès
5. Tester avec `test-teacher-profile-status.sql`

**Puis créer un profil de test via l'interface web.**

---

## 📞 Besoin d'Aide ?

Si après avoir suivi ces étapes ça ne fonctionne toujours pas :

1. Exécuter `test-teacher-profile-status.sql`
2. Copier le résultat complet
3. Vérifier la console navigateur (F12)
4. Copier les erreurs en rouge

---

## ✅ Checklist Finale

Cocher quand terminé:

### Installation
- [ ] `test-teacher-profile-status.sql` exécuté
- [ ] `supabase-teacher-profile-enhancement.sql` exécuté
- [ ] Message "✅ Profil professeur amélioré avec succès !" visible
- [ ] Re-test montre "✅ SYSTÈME OPÉRATIONNEL"

### Profil Test
- [ ] Accès à `/teacher/profile/complete` OK
- [ ] Étape 1/4 remplie
- [ ] Étape 2/4 remplie
- [ ] Étape 3/4 remplie
- [ ] Étape 4/4 remplie
- [ ] Sauvegarde réussie
- [ ] Indicateur 100% visible

### Recherche
- [ ] `/find-teachers` accessible
- [ ] Au moins 1 carte professeur visible
- [ ] Filtres fonctionnent
- [ ] Clic sur carte ouvre profil
- [ ] Profil public complet

---

## 🎯 Résultat Final Attendu

**Pour les Professeurs:**
- Interface de complétion de profil en 4 étapes
- Indicateur de progression
- Tous les champs requis pour un profil complet

**Pour les Étudiants:**
- Recherche avec filtres (matière, niveau, ville, tarif, etc.)
- Cartes visuelles des professeurs
- Profil public détaillé avec toutes les infos
- Système d'avis (prêt, à utiliser plus tard)

**Base de données:**
- 20+ nouvelles colonnes dans `users`
- 2 nouvelles tables (`teacher_reviews`, `teacher_availability`)
- Triggers automatiques pour notes et complétion

---

🚀 **Bon courage pour la mise en place !**

Le système est robuste et une fois installé, il fonctionnera parfaitement.
