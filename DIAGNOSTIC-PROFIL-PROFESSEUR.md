# 🔍 Diagnostic - Profil Professeur Non Fonctionnel

## 🔴 Problèmes Signalés

1. ❌ Pas de changements visibles
2. ❌ Bouton "voir le profil" non cliquable
3. ❌ Résultats de recherche vides

## 📋 Diagnostic Rapide

### Vérification #1: Le Script SQL a-t-il été exécuté ?

**Test rapide dans Supabase:**

```sql
-- Copier et exécuter cette requête dans Supabase SQL Editor
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate', 'profile_completed');
```

**Résultat attendu:** 5 lignes (subjects, levels, teaching_mode, hourly_rate, profile_completed)

**Si 0 ligne:** ❌ Le script SQL n'a PAS été exécuté
**Si 5 lignes:** ✅ Le script SQL a été exécuté

---

## ✅ Solution: Exécuter le Script SQL

### Étape 1: Ouvrir Supabase

1. Aller sur https://app.supabase.com
2. Sélectionner votre projet
3. Aller dans **SQL Editor** (icône dans le menu de gauche)

### Étape 2: Copier le Script

1. Ouvrir le fichier `supabase-teacher-profile-enhancement.sql`
2. **Sélectionner TOUT le contenu** (Ctrl+A)
3. **Copier** (Ctrl+C)

### Étape 3: Exécuter dans Supabase

1. Dans le SQL Editor, cliquer **"New Query"**
2. **Coller** le contenu du script (Ctrl+V)
3. Cliquer sur **"Run"** (ou Ctrl+Enter)

### Étape 4: Vérifier le Succès

Vous devriez voir en bas:
```
✅ Profil professeur amélioré avec succès !
✅ Nouvelles colonnes ajoutées: phone, address, city, subjects, levels, teaching_mode, hourly_rate, etc.
✅ Table teacher_reviews créée pour les avis
✅ Table teacher_availability créée pour les disponibilités
...
```

---

## 🧪 Tests Après Installation

### Test 1: Vérifier les Colonnes

```sql
SELECT
  id,
  display_name,
  phone,
  city,
  subjects,
  levels,
  teaching_mode,
  hourly_rate,
  profile_completed
FROM users
WHERE role = 'teacher'
LIMIT 1;
```

**Résultat attendu:** Requête réussie (même si pas de résultat)
**Si erreur "column does not exist":** ❌ Script non exécuté

### Test 2: Vérifier les Tables

```sql
-- Vérifier teacher_reviews
SELECT COUNT(*) FROM teacher_reviews;

-- Vérifier teacher_availability
SELECT COUNT(*) FROM teacher_availability;
```

**Résultat attendu:** 0 (les tables sont vides mais existent)
**Si erreur "relation does not exist":** ❌ Script non exécuté

---

## 🌐 Tests dans l'Application

### Test 1: Page de Complétion du Profil

1. Se connecter en tant que **professeur**
2. Aller sur: `http://localhost:3001/teacher/profile/complete`

**Résultat attendu:**
- ✅ Page se charge
- ✅ Wizard en 4 étapes visible
- ✅ Formulaire avec champs : Nom, Téléphone, Ville, Bio, etc.

**Si page vide ou erreur:** Vérifier la console navigateur (F12)

### Test 2: Compléter un Profil

1. Remplir **Étape 1:** Nom, Téléphone, Ville, Bio, Expérience
2. Cliquer **"Suivant"**
3. Remplir **Étape 2:** Sélectionner au moins 1 matière, 1 niveau, 1 mode
4. Cliquer **"Suivant"**
5. Remplir **Étape 3:** Tarif horaire (ex: 30)
6. Cliquer **"Suivant"**
7. **Étape 4:** Ajouter une spécialité ou un diplôme (optionnel)
8. Cliquer **"Enregistrer le Profil"**

**Résultat attendu:**
- ✅ Message "Profil sauvegardé avec succès !"
- ✅ Redirection automatique
- ✅ Indicateur de complétion à 100%

### Test 3: Recherche de Professeurs

1. Se connecter en tant qu'**étudiant** (ou ouvrir en navigation privée)
2. Aller sur: `http://localhost:3001/find-teachers`

**Résultat attendu:**
- ✅ Page se charge
- ✅ Barre de recherche visible
- ✅ Bouton "Filtres" visible
- ✅ Si un profil est complété: 1 carte professeur visible

**Si 0 résultat:**
- Vérifier qu'au moins 1 profil professeur est complété à 100%
- Vérifier dans Supabase:

```sql
SELECT display_name, profile_completed, is_available
FROM users
WHERE role = 'teacher';
```

### Test 4: Profil Public

1. Sur la page de recherche, cliquer sur une **carte professeur**
2. Vérifier que l'URL change: `http://localhost:3001/teachers/[un-uuid]`

**Résultat attendu:**
- ✅ Page de profil se charge
- ✅ Photo, nom, ville visibles
- ✅ Tarif horaire affiché
- ✅ Biographie complète
- ✅ Matières en badges
- ✅ Boutons "Contacter" et "Voir disponibilités"

---

## 🐛 Problèmes Courants

### Problème 1: "Cannot read property 'subjects' of undefined"

**Cause:** Le profil n'a pas les nouvelles colonnes

**Solution:**
1. Exécuter le script SQL
2. Rafraîchir la page (Ctrl+F5)

### Problème 2: Aucun résultat dans la recherche

**Cause:** Aucun profil professeur n'est complété

**Vérification:**
```sql
SELECT COUNT(*)
FROM users
WHERE role = 'teacher'
AND profile_completed = true
AND is_available = true;
```

**Solution:**
- Au moins 1 professeur doit compléter son profil via `/teacher/profile/complete`

### Problème 3: Bouton "Contacter" ne fait rien

**Normal !** Le système de messagerie n'est pas encore implémenté.

**Message actuel:** "Fonctionnalité de messagerie à venir !"

### Problème 4: Page 404 sur `/teacher/profile/complete`

**Cause:** Fichier de route manquant

**Vérification:**
```bash
# Le fichier doit exister
ls src/app/(dashboard)/teacher/profile/complete/page.tsx
```

**Solution:**
Si le fichier n'existe pas, il a été créé dans les messages précédents. Vérifier que tous les fichiers sont présents.

---

## 🔧 Script de Diagnostic Automatique

J'ai créé un script qui vérifie automatiquement tout:

```bash
# Installer les dépendances si nécessaire
npm install

# Lancer le diagnostic
npx tsx scripts/audit-teacher-profile.ts
```

Le script va vérifier:
- ✅ Colonnes de la table users
- ✅ Tables teacher_reviews et teacher_availability
- ✅ Nombre de professeurs
- ✅ Profils complétés
- ✅ Fichiers de routes Next.js
- ✅ Fichiers de types TypeScript

---

## 📊 Vérification Manuelle Complète

### Dans Supabase

```sql
-- 1. Vérifier les colonnes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'phone', 'city', 'bio', 'experience',
  'subjects', 'levels', 'teaching_mode',
  'hourly_rate', 'can_travel', 'rating',
  'profile_completed', 'is_available'
)
ORDER BY column_name;

-- Attendu: 12 lignes

-- 2. Vérifier les tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('teacher_reviews', 'teacher_availability');

-- Attendu: 2 lignes

-- 3. Compter les professeurs
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE profile_completed = true) as complets,
  COUNT(*) FILTER (WHERE is_available = true) as disponibles
FROM users
WHERE role = 'teacher';

-- 4. Voir les profils
SELECT
  display_name,
  city,
  array_length(subjects, 1) as nb_subjects,
  array_length(levels, 1) as nb_levels,
  hourly_rate,
  profile_completed,
  is_available
FROM users
WHERE role = 'teacher';
```

### Dans l'Application

**Console Navigateur (F12):**
- Ouvrir les DevTools
- Onglet Console
- Recharger la page
- Chercher les erreurs en rouge

**Erreurs courantes:**
- `Cannot read property 'subjects' of null` → Profil incomplet
- `404 Not Found` → Route manquante
- `Column does not exist` → Script SQL non exécuté

---

## ✅ Checklist de Validation

Cocher après chaque test réussi:

### Installation
- [ ] Script SQL exécuté dans Supabase
- [ ] Message de succès visible
- [ ] Colonnes créées (vérification SQL)
- [ ] Tables créées (teacher_reviews, teacher_availability)

### Routes
- [ ] `/teacher/profile/complete` accessible
- [ ] `/find-teachers` accessible
- [ ] `/teachers/[id]` accessible

### Fonctionnalités Professeur
- [ ] Wizard de profil en 4 étapes fonctionne
- [ ] Tous les champs sont éditables
- [ ] Sauvegarde réussie
- [ ] Message "Profil sauvegardé avec succès !"
- [ ] Indicateur de complétion monte à 100%

### Fonctionnalités Étudiant
- [ ] Recherche charge la liste
- [ ] Filtres fonctionnent
- [ ] Cartes professeurs s'affichent
- [ ] Clic sur une carte ouvre le profil
- [ ] Profil public complet visible

---

## 💡 Actions Immédiates

### Si RIEN ne fonctionne:

1. **Exécuter le script SQL** (priorité #1)
   - Fichier: `supabase-teacher-profile-enhancement.sql`
   - Dans: Supabase SQL Editor

2. **Vérifier que le serveur tourne**
   ```bash
   npm run dev
   ```

3. **Rafraîchir complètement le navigateur**
   - Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)

4. **Vérifier la console pour erreurs**
   - F12 → Console
   - Chercher les messages en rouge

### Si des erreurs persistent:

```sql
-- Forcer la mise à jour d'un profil pour test
UPDATE users
SET
  phone = '06 12 34 56 78',
  city = 'Paris',
  bio = 'Professeur de mathématiques avec 10 ans d''expérience.',
  experience = '10+ ans',
  subjects = ARRAY['Mathématiques', 'Physique-Chimie'],
  levels = ARRAY['Terminale', 'Licence'],
  teaching_mode = ARRAY['online', 'in_person'],
  hourly_rate = 35.00,
  can_travel = true,
  travel_distance = 15,
  is_available = true,
  profile_completed = true
WHERE role = 'teacher'
LIMIT 1;
```

Puis rafraîchir `/find-teachers` pour voir ce profil apparaître.

---

## 📞 Support

Si après avoir suivi ce guide le système ne fonctionne toujours pas:

1. **Vérifier les logs du serveur**
   ```bash
   # Dans le terminal où tourne npm run dev
   # Chercher les erreurs
   ```

2. **Copier le message d'erreur exact**
   - Console navigateur (F12)
   - Ou terminal serveur

3. **Vérifier la version de Next.js**
   ```bash
   npm list next
   # Doit être >= 14.0.0
   ```

---

## 🎯 Résumé

**Le problème le plus probable:** Le script SQL n'a pas été exécuté.

**La solution:** Exécuter `supabase-teacher-profile-enhancement.sql` dans Supabase SQL Editor.

**Après l'exécution:**
- ✅ Les colonnes existeront
- ✅ Les pages fonctionneront
- ✅ Le système sera opérationnel

**Pour tester:** Compléter un profil professeur, puis rechercher en tant qu'étudiant.

🚀 **Bonne chance !**
