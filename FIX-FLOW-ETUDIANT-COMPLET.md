# ✅ FIX FLOW ÉTUDIANT - COMPLET

**Date**: 2026-01-24
**Problème**: Après inscription, redirection vers dashboard au lieu de `/complete-profile`
**Statut**: CORRIGÉ

---

## 🐛 PROBLÈME IDENTIFIÉ

### Symptôme
Après l'inscription d'un étudiant :
- ❌ Redirection vers `/student/home` ou `/dashboard`
- ❌ Pas de passage par `/complete-profile`
- ❌ Profil considéré comme complet alors qu'il manque des informations

### Cause Racine
Dans [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx:88-111) :

**Avant (problématique)** :
```typescript
await supabase.from('users').upsert({
  id: data.user.id,
  email: email,
  display_name: displayName,
  role: role,
  country: country,          // ❌ Défini lors de l'inscription
  currency: currency,         // ❌ Défini lors de l'inscription
  // ... autres champs
})

// Redirection
if (role === 'teacher') {
  router.push('/teacher/dashboard')
} else {
  router.push('/student/home')  // ❌ Mauvaise redirection
}
```

**Problème** :
1. `country` et `currency` sont définis lors de l'inscription
2. Le trigger `check_profile_complete()` vérifie ces champs
3. Si `country` et `currency` sont présents, mais `phone` et `education_level` manquent → le trigger devrait mettre `profile_completed = FALSE`
4. Mais la redirection dans le code ignore le middleware et va directement vers `/student/home`

---

## ✅ SOLUTION APPLIQUÉE

### 1. Modification du fichier d'inscription

**Fichier**: [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx:88-121)

**Après (corrigé)** :
```typescript
const profileData: any = {
  id: data.user.id,
  email: email,
  display_name: displayName,
  role: role,
}

// Pour les étudiants : NE PAS définir country/currency ici
// Ils seront remplis dans /complete-profile
if (role === 'teacher') {
  profileData.currency = currency || 'EUR'
  profileData.country = country
  profileData.profile_completed = true  // ✅ Profil complet pour les profs
} else {
  // Étudiant : forcer profile_completed = FALSE
  profileData.profile_completed = false  // ✅ CRITIQUE
}

await supabase.from('users').upsert(profileData)

// Redirection corrigée
if (role === 'teacher') {
  router.push('/teacher/dashboard')
} else {
  router.push('/complete-profile')  // ✅ Bonne redirection
}
```

**Changements clés** :
1. ✅ Pour les étudiants : `profile_completed = false` explicitement
2. ✅ Pour les étudiants : redirection vers `/complete-profile`
3. ✅ Pour les professeurs : `profile_completed = true` (profil complet)
4. ✅ Pour les professeurs : redirection vers `/teacher/dashboard`

---

### 2. Fix SQL du trigger (si nécessaire)

**Fichier**: [FIX-FLOW-INSCRIPTION-ETUDIANT.sql](FIX-FLOW-INSCRIPTION-ETUDIANT.sql)

Ce script :
1. Corrige le trigger `check_profile_complete()` pour vérifier les champs vides
2. Met à jour les profils existants
3. Force `profile_completed = FALSE` pour les étudiants incomplets

**Exécution** (si le problème persiste) :
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de FIX-FLOW-INSCRIPTION-ETUDIANT.sql
```

---

### 3. Middleware (déjà en place)

**Fichier**: [middleware.ts](middleware.ts:67-79)

Le middleware intercepte toutes les requêtes et redirige les étudiants avec `profile_completed = FALSE` vers `/complete-profile`.

```typescript
if (
  profile.role === 'student' &&
  profile.profile_completed === false &&
  !pathname.startsWith('/complete-profile') &&
  !pathname.startsWith('/api') &&
  !pathname.startsWith('/login') &&
  !pathname.startsWith('/register')
) {
  const completeProfileUrl = new URL('/complete-profile', request.url)
  return NextResponse.redirect(completeProfileUrl)
}
```

---

## 🔄 FLOW ÉTUDIANT CORRIGÉ

### Flow Complet (version finale)

```
1. Étudiant va sur /register
   ↓
2. Remplit le formulaire :
   - Rôle : Étudiant
   - Nom, Email, Password
   - (country/currency NON sauvegardés)
   ↓
3. Clic "Créer mon compte"
   ↓
4. Supabase crée le compte
   ↓
5. Code crée le profil :
   {
     id: user.id,
     email, display_name, role: 'student',
     profile_completed: FALSE  // ✅ Forcé à FALSE
   }
   ↓
6. Redirection → /complete-profile  // ✅ Directement
   ↓
7. Page /complete-profile s'affiche
   ↓
8. Étudiant remplit :
   - Pays, Téléphone
   - Devise, Niveau scolaire
   - Type de bac (si applicable)
   ↓
9. Soumission du formulaire
   ↓
10. Update users SET country, phone, currency, education_level
    ↓
11. Trigger met profile_completed = TRUE
    ↓
12. Redirection → /dashboard
    ↓
13. Middleware vérifie profile_completed = TRUE
    ↓
14. Accès autorisé à toutes les pages
```

### Flow Professeur (inchangé)

```
1. Professeur va sur /register
   ↓
2. Remplit le formulaire :
   - Rôle : Professeur
   - Nom, Email, Password
   ↓
3. Code crée le profil :
   {
     id: user.id,
     email, display_name, role: 'teacher',
     currency: 'EUR',
     profile_completed: TRUE  // ✅ Complet par défaut
   }
   ↓
4. Redirection → /teacher/dashboard
   ↓
5. Accès direct sans complete-profile
```

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Nouvel étudiant

1. **Aller sur** `/register`
2. **Sélectionner** "Élève"
3. **Remplir** : Nom, Email, Password
4. **Cliquer** "Créer mon compte"
5. **Vérifier** : Redirection vers `/complete-profile`
6. **Remplir** le formulaire complete-profile
7. **Vérifier** : Redirection vers `/dashboard` après soumission

**Résultat attendu** : ✅ Flow complet fonctionne

---

### Test 2 : Nouveau professeur

1. **Aller sur** `/register`
2. **Sélectionner** "Professeur"
3. **Remplir** : Nom, Email, Password
4. **Cliquer** "Créer mon compte"
5. **Vérifier** : Redirection vers `/teacher/dashboard` (pas de complete-profile)

**Résultat attendu** : ✅ Accès direct au dashboard

---

### Test 3 : Étudiant existant (profil incomplet)

1. **Se connecter** avec un compte étudiant existant
2. **Si** `profile_completed = FALSE`
3. **Vérifier** : Redirection automatique vers `/complete-profile`
4. **Essayer** d'aller sur `/dashboard` directement
5. **Vérifier** : Re-redirection vers `/complete-profile` (middleware)

**Résultat attendu** : ✅ Middleware fonctionne

---

## 📊 VÉRIFICATION EN BASE DE DONNÉES

### Vérifier un nouvel étudiant

```sql
-- Après création d'un compte étudiant
SELECT
  id,
  email,
  display_name,
  role,
  country,
  phone,
  currency,
  education_level,
  profile_completed,
  created_at
FROM users
WHERE email = 'nouveau-etudiant@example.com';
```

**Résultat attendu** :
- `role` = 'student'
- `country` = NULL
- `phone` = NULL
- `currency` = NULL (ou 'EUR' par défaut)
- `education_level` = NULL
- `profile_completed` = **FALSE** ← CRITIQUE

---

### Vérifier après complete-profile

```sql
-- Après remplissage du formulaire complete-profile
SELECT
  id,
  email,
  country,
  phone,
  currency,
  education_level,
  bac_type,
  profile_completed
FROM users
WHERE email = 'nouveau-etudiant@example.com';
```

**Résultat attendu** :
- `country` = 'TN' (ou autre)
- `phone` = '+216 XX XXX XXX'
- `currency` = 'TND' (ou autre)
- `education_level` = 'terminal' (ou autre)
- `bac_type` = 'scientifique' (si applicable)
- `profile_completed` = **TRUE** ← CRITIQUE

---

## 🔧 ACTIONS IMMÉDIATES

### Étape 1 : Redémarrer le serveur (OBLIGATOIRE)

Le fichier `register/page.tsx` a été modifié, il faut redémarrer :

```bash
Ctrl+C
npm run dev
# ou
pnpm dev
```

---

### Étape 2 : Tester avec un nouveau compte

1. **Ouvrir** : `http://localhost:3000/register`
2. **Créer** un compte étudiant
3. **Vérifier** : Redirection vers `/complete-profile`

**Si ça ne fonctionne pas** : Exécuter [FIX-FLOW-INSCRIPTION-ETUDIANT.sql](FIX-FLOW-INSCRIPTION-ETUDIANT.sql)

---

### Étape 3 : Corriger les étudiants existants (si nécessaire)

Si des étudiants existants ont `profile_completed = TRUE` mais un profil incomplet :

```sql
-- Dans Supabase SQL Editor
UPDATE users
SET profile_completed = FALSE
WHERE role = 'student'
  AND (
    country IS NULL OR country = ''
    OR phone IS NULL OR phone = ''
    OR currency IS NULL OR currency = ''
    OR education_level IS NULL OR education_level = ''
  );
```

---

## ✅ CHECKLIST FINALE

- [x] Fichier `register/page.tsx` modifié
- [ ] Serveur redémarré
- [ ] Nouveau compte étudiant créé
- [ ] Redirection vers `/complete-profile` confirmée
- [ ] Formulaire complete-profile rempli
- [ ] Redirection vers `/dashboard` après soumission
- [ ] `profile_completed = TRUE` en base
- [ ] Accès normal à toutes les pages
- [ ] Nouveau compte professeur testé (pas de complete-profile)

---

## 📞 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Problème : Redirection vers dashboard

**Vérifier** :
```sql
SELECT profile_completed FROM users WHERE email = 'votre-email@example.com';
```

**Si** `profile_completed = TRUE` :
- Exécuter [FIX-FLOW-INSCRIPTION-ETUDIANT.sql](FIX-FLOW-INSCRIPTION-ETUDIANT.sql)
- Ou forcer manuellement :
  ```sql
  UPDATE users SET profile_completed = FALSE WHERE email = 'votre-email@example.com';
  ```

### Problème : Page complete-profile ne s'affiche pas

**Vérifier** :
1. Le serveur est bien redémarré
2. Le middleware est actif (vérifier les logs serveur)
3. La route `/complete-profile` existe

### Problème : Erreur lors de la soumission

**Vérifier** :
1. Migration 007 exécutée
2. Colonnes `country`, `phone`, `currency`, `education_level` existent
3. Trigger `check_profile_complete` existe

---

## 🎉 RÉSULTAT FINAL

Après ce fix :
- ✅ Nouveaux étudiants → obligés de compléter leur profil
- ✅ Middleware empêche l'accès sans profil complet
- ✅ Nouveaux professeurs → accès direct (pas de complete-profile)
- ✅ Flow cohérent et professionnel

---

*Fix Flow Étudiant - 2026-01-24*
*Redémarrez le serveur et testez !*
