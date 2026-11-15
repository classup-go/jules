# 🚨 Guide d'Accès au Système de Profil Professeur

## ⚠️ Situation Actuelle

Vous dites : "aucun changement, pas de profil cliquable, système pas visible"

**Explication :** Les pages ont été créées mais ne sont **pas encore liées dans les menus existants**.

---

## ✅ Solution : Accéder Directement aux URLs

### Pour PROFESSEUR

#### 1. Compléter son Profil

**URL à taper dans le navigateur :**
```
http://localhost:3001/teacher/profile/complete
```

**Ce que vous DEVEZ voir :**
- Un wizard en 4 étapes
- Titre : "Complétez Votre Profil Professeur"
- Barre de progression en %
- Boutons : "Étape 1: Informations de Base", etc.

**Si vous voyez une page 404 :**
- Le serveur doit être redémarré
- Faites Ctrl+C dans le terminal
- Puis `npm run dev`
- Réessayez l'URL

---

### Pour ÉTUDIANT

#### 2. Rechercher des Professeurs

**URL à taper dans le navigateur :**
```
http://localhost:3001/find-teachers
```

**Ce que vous DEVEZ voir :**
- Titre : "Trouvez Votre Professeur Idéal"
- Barre de recherche avec 🔍
- Bouton "Filtres"
- Message : "0 professeur disponible" (si aucun profil complété)

---

## 🔍 Diagnostic Pas à Pas

### Test 1: Vérifier que les Fichiers Existent

Dans votre terminal Windows :

```bash
dir src\app\(dashboard)\teacher\profile\complete\page.tsx
dir src\app\(dashboard)\find-teachers\page.tsx
dir src\app\(dashboard)\teachers\[id]\page.tsx
```

**Résultat attendu :** Les 3 fichiers doivent exister

---

### Test 2: Redémarrer le Serveur Next.js

**C'est CRUCIAL :**

1. Dans le terminal où tourne `npm run dev`
2. Appuyer sur **Ctrl+C** pour arrêter
3. Attendre que ça s'arrête complètement
4. Taper : `npm run dev`
5. Attendre le message : `✓ Ready in Xs`

---

### Test 3: Vérifier la Base de Données

Dans Supabase SQL Editor :

```sql
-- Test rapide
SELECT COUNT(*) as colonnes_ok
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate');
```

**Résultat attendu :** `colonnes_ok = 4`

**Si 0 :** Le script SQL n'a pas fonctionné. Relancez `supabase-teacher-profile-enhancement.sql`

---

### Test 4: Accéder à la Page de Profil

1. **Ouvrir un nouvel onglet**
2. **Taper exactement :**
   ```
   http://localhost:3001/teacher/profile/complete
   ```
3. **Appuyer sur Entrée**

**Résultats possibles :**

#### ✅ Vous voyez le wizard en 4 étapes
→ **PARFAIT !** Le système fonctionne. Passez à l'étape 5.

#### ❌ Page 404 "Not Found"
→ **Problème :** Serveur pas à jour
→ **Solution :** Redémarrer le serveur (voir Test 2)

#### ❌ Page blanche ou erreur
→ **Problème :** Erreur JavaScript
→ **Solution :** Ouvrir la console (F12) et copier l'erreur

#### ❌ Vous êtes redirigé vers /login
→ **Normal !** Vous n'êtes pas connecté en tant que professeur
→ **Solution :** Se connecter d'abord avec un compte professeur

---

### Test 5: Compléter un Profil (SI le wizard s'affiche)

**Remplir rapidement :**

**Étape 1 :**
```
Nom: Test Prof
Téléphone: 0612345678
Ville: Paris
Bio: Professeur de test
Expérience: 5-10 ans
```
Cliquer "Suivant →"

**Étape 2 :**
- Cocher "Mathématiques"
- Cocher "Terminale"
- Cocher "💻 Cours en ligne"

Cliquer "Suivant →"

**Étape 3 :**
```
Tarif horaire: 30
```
Cliquer "Suivant →"

**Étape 4 :**
(Laisser vide ou ajouter quelque chose)

Cliquer "✓ Enregistrer le Profil"

**Message attendu :** "Profil sauvegardé avec succès !"

---

### Test 6: Vérifier dans la Recherche

1. **Ouvrir un nouvel onglet en navigation privée** (Ctrl+Shift+N)
2. Aller sur `http://localhost:3001`
3. Se connecter en tant qu'**étudiant**
4. **Taper l'URL :**
   ```
   http://localhost:3001/find-teachers
   ```

**Vous DEVEZ voir :**
- "1 professeur disponible"
- Une carte avec "Test Prof"

---

## 🔧 Solutions aux Problèmes Courants

### Problème 1: "Page 404 sur /teacher/profile/complete"

**Cause :** Serveur Next.js pas à jour

**Solution :**
```bash
# Dans le terminal
Ctrl+C
npm run dev
# Attendre "Ready in..."
# Réessayer l'URL
```

### Problème 2: "Erreur: column does not exist"

**Cause :** Script SQL pas exécuté ou échoué

**Test :**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'subjects';
```

**Si vide :** Relancer `supabase-teacher-profile-enhancement.sql`

### Problème 3: "Rien ne s'affiche sur /find-teachers"

**Cause :** Aucun profil complété

**Solution :**
1. D'abord compléter un profil via `/teacher/profile/complete`
2. Puis vérifier `/find-teachers`

### Problème 4: "Je ne trouve pas les pages dans le menu"

**C'est NORMAL !** Les pages ne sont pas encore liées dans la navigation.

**Vous devez taper les URLs manuellement :**
- Professeur : `/teacher/profile/complete`
- Recherche : `/find-teachers`
- Profil public : `/teachers/[id]` (accès via recherche)

---

## 📋 Checklist de Diagnostic Complet

Cocher au fur et à mesure :

### Serveur
- [ ] Terminal ouvert avec `npm run dev`
- [ ] Message "Ready in..." visible
- [ ] Pas d'erreurs rouges dans le terminal

### Base de Données
- [ ] Script SQL exécuté dans Supabase
- [ ] Message de succès vu
- [ ] Test colonnes = 4 ✅

### Fichiers
- [ ] `teacher/profile/complete/page.tsx` existe
- [ ] `find-teachers/page.tsx` existe
- [ ] `teachers/[id]/page.tsx` existe

### Accès
- [ ] URL `/teacher/profile/complete` affiche le wizard
- [ ] Connexion professeur OK
- [ ] Profil complété et sauvegardé
- [ ] Message "Profil sauvegardé avec succès !"

### Recherche
- [ ] URL `/find-teachers` affiche la page
- [ ] Au moins 1 professeur visible
- [ ] Clic sur carte ouvre profil

---

## 🎯 Test Ultime

**Copiez et exécutez dans Supabase :**

```sql
-- Test complet du système
DO $$
BEGIN
  -- Test colonnes
  IF (SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate')) = 4 THEN
    RAISE NOTICE '✅ Base de données: OK';
  ELSE
    RAISE NOTICE '❌ Base de données: ERREUR - Colonnes manquantes';
  END IF;

  -- Test professeurs
  IF (SELECT COUNT(*) FROM users WHERE role = 'teacher') > 0 THEN
    RAISE NOTICE '✅ Professeurs: % inscrit(s)', (SELECT COUNT(*) FROM users WHERE role = 'teacher');
  ELSE
    RAISE NOTICE '⚠️  Aucun professeur inscrit';
  END IF;

  -- Test profils complétés
  IF (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND profile_completed = true) > 0 THEN
    RAISE NOTICE '✅ Profils complétés: %', (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND profile_completed = true);
  ELSE
    RAISE NOTICE '⚠️  Aucun profil complété - Aller sur /teacher/profile/complete';
  END IF;
END $$;
```

---

## 📞 Si Toujours Aucun Changement

**Faites ceci dans l'ordre :**

1. **Redémarrer le serveur** (Ctrl+C puis npm run dev)

2. **Vérifier la console navigateur** (F12)
   - Onglet Console
   - Chercher les erreurs en rouge
   - Copier le message d'erreur

3. **Tester l'URL directement**
   ```
   http://localhost:3001/teacher/profile/complete
   ```
   - Faire une capture d'écran de ce que vous voyez
   - Noter le message d'erreur exact

4. **Vérifier le terminal serveur**
   - Chercher les erreurs rouges
   - Copier les messages d'erreur

5. **Exécuter le test SQL ci-dessus**
   - Copier le résultat complet

Avec ces informations, je pourrai identifier exactement le problème.

---

## ⚡ Action Immédiate

**MAINTENANT, faites ceci :**

1. **Arrêter le serveur** (Ctrl+C)
2. **Relancer** : `npm run dev`
3. **Attendre** "Ready in..."
4. **Ouvrir** http://localhost:3001/teacher/profile/complete
5. **Me dire** ce que vous voyez exactement

---

## 🎯 Résultat Attendu

Après avoir suivi ce guide, vous DEVEZ voir :

**URL: /teacher/profile/complete**
```
Complétez Votre Profil Professeur
Attirez plus d'élèves en complétant votre profil à 100%

Complétion du profil: 0%

[Étapes 1 2 3 4]

Informations de Base
[Formulaire avec champs]
```

**SI vous ne voyez PAS cela :**
- Copier l'erreur exacte
- Faire une capture d'écran
- Me dire ce qui s'affiche

Je pourrai alors diagnostiquer précisément le problème ! 🔍
