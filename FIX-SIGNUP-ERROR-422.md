# 🔧 FIX: Erreur 422 lors de l'inscription (Signup)

**Date**: 28 janvier 2026
**Erreur**: `POST /auth/v1/signup 422 (Unprocessable Content)`
**Fichier**: [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx:66)

---

## 🔍 CAUSES POSSIBLES

Une erreur 422 de Supabase Auth signup signifie que la requête est rejetée pour une raison de validation. Voici les causes les plus fréquentes:

### 1. ❌ Mot de passe trop faible

**Supabase exige par défaut**:
- Minimum **8 caractères** (pas 6!)
- Peut exiger des critères de complexité additionnels selon la config

**Problème dans le code** (ligne 53):
```typescript
if (password.length < 6) {
  setError('Le mot de passe doit contenir au moins 6 caractères')
  return
}
```

**Fix**: Changer en 8 caractères minimum

---

### 2. ❌ Email déjà utilisé

Supabase peut retourner 422 si l'email existe déjà (selon config).

**Gestion dans le code** (ligne 79):
```typescript
if (signUpError.message.includes('already registered')) {
  setError('Cet email est déjà utilisé. Essayez de vous connecter.')
}
```

---

### 3. ❌ Email confirmation désactivée

Si la confirmation email est requise dans Supabase mais mal configurée.

---

### 4. ❌ Rate limiting

Trop de tentatives d'inscription depuis la même IP.

---

### 5. ❌ Problème de configuration Supabase

Settings auth mal configurés dans le dashboard Supabase.

---

## ✅ SOLUTIONS

### Solution 1: Augmenter le minimum de caractères du mot de passe

Le plus probable! Supabase Auth demande minimum 8 caractères par défaut.

#### Correction dans [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx):

**Ligne 53-56** (avant):
```typescript
if (password.length < 6) {
  setError('Le mot de passe doit contenir au moins 6 caractères')
  return
}
```

**Après**:
```typescript
if (password.length < 8) {
  setError('Le mot de passe doit contenir au moins 8 caractères')
  return
}
```

**Ligne 225** - Placeholder (avant):
```typescript
placeholder="Minimum 6 caractères"
```

**Après**:
```typescript
placeholder="Minimum 8 caractères"
```

**Ligne 246** - Message force mot de passe (mettre à jour):
```typescript
Force : {password.length >= 12 ? '🟢 Fort' : password.length >= 8 ? '🟡 Moyen' : '🔴 Faible'}
```

---

### Solution 2: Améliorer la gestion d'erreur

Afficher le message d'erreur complet de Supabase pour debug:

**Ligne 78-86** (avant):
```typescript
if (signUpError) {
  if (signUpError.message.includes('already registered')) {
    setError('Cet email est déjà utilisé. Essayez de vous connecter.')
  } else {
    setError(signUpError.message)
  }
  setLoading(false)
  return
}
```

**Après** (avec plus de détails):
```typescript
if (signUpError) {
  console.error('Signup error:', signUpError)  // Pour debug

  if (signUpError.message.includes('already registered') ||
      signUpError.message.includes('already been registered')) {
    setError('Cet email est déjà utilisé. Essayez de vous connecter.')
  } else if (signUpError.message.includes('password')) {
    setError('Mot de passe invalide. Utilisez au moins 8 caractères avec majuscules, minuscules et chiffres.')
  } else if (signUpError.message.includes('email')) {
    setError('Adresse email invalide.')
  } else {
    // Afficher le message brut de Supabase pour identifier le problème
    setError(`Erreur: ${signUpError.message}`)
  }
  setLoading(false)
  return
}
```

---

### Solution 3: Vérifier la configuration Supabase Auth

#### Dans Supabase Dashboard:

1. **Aller sur Authentication > Settings**

2. **Vérifier "Auth Providers"**:
   - Email doit être activé
   - "Confirm email" peut être désactivé pour le dev

3. **Vérifier "Email Auth"**:
   - Si "Confirm email" est activé, vérifier que:
     - Email template est configuré
     - SMTP est configuré (si custom)

4. **Vérifier "Password Settings"**:
   - Minimum length: Devrait être 8
   - Require uppercase: Peut être désactivé pour le dev
   - Require lowercase: Peut être désactivé pour le dev
   - Require numbers: Peut être désactivé pour le dev
   - Require special characters: Peut être désactivé pour le dev

5. **Vérifier "Rate Limits"**:
   - Default: 30 signups / heure / IP
   - Si développement local, peut être augmenté

---

### Solution 4: Désactiver la confirmation email (DEV SEULEMENT)

Pour faciliter le développement:

#### Dans Supabase Dashboard:

1. Aller sur **Authentication > Settings > Auth Providers**
2. Désactiver **"Confirm email"** temporairement
3. Sauvegarder

**⚠️ ATTENTION**: Réactiver en PRODUCTION!

---

### Solution 5: Ajouter plus de validation côté client

Pour éviter d'envoyer des requêtes invalides:

**Ajouter avant le signup** (ligne 63):

```typescript
// Validation email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  setError('Adresse email invalide')
  setLoading(false)
  return
}

// Validation mot de passe renforcée (optionnel)
if (password.length < 8) {
  setError('Le mot de passe doit contenir au moins 8 caractères')
  setLoading(false)
  return
}

// Vérifier force du mot de passe
const hasUpperCase = /[A-Z]/.test(password)
const hasLowerCase = /[a-z]/.test(password)
const hasNumber = /[0-9]/.test(password)

if (!hasUpperCase || !hasLowerCase || !hasNumber) {
  setError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
  setLoading(false)
  return
}
```

---

## 🧪 TEST APRÈS FIX

### Test 1: Mot de passe faible
1. Essayer de s'inscrire avec un mot de passe de 6 caractères
2. **Résultat attendu**: Message d'erreur côté client "Le mot de passe doit contenir au moins 8 caractères"

### Test 2: Mot de passe valide
1. S'inscrire avec un mot de passe de 8+ caractères
2. **Résultat attendu**: Inscription réussie

### Test 3: Email déjà utilisé
1. Essayer de s'inscrire avec un email existant
2. **Résultat attendu**: Message "Cet email est déjà utilisé"

### Test 4: Vérifier les logs console
1. Ouvrir DevTools Console
2. Tenter une inscription
3. **Résultat attendu**: Si erreur, voir le message complet dans console

---

## 🔍 DIAGNOSTIC EN TEMPS RÉEL

Pour identifier exactement quelle validation échoue:

### Ajouter un log temporaire (ligne 66):

```typescript
console.log('Attempting signup with:', {
  email,
  passwordLength: password.length,
  hasUpperCase: /[A-Z]/.test(password),
  hasLowerCase: /[a-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  displayName: displayName,
  role: role
})

const { data, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      display_name: displayName,
      role: role,
    }
  }
})

if (signUpError) {
  console.error('Supabase signup error:', {
    message: signUpError.message,
    status: signUpError.status,
    name: signUpError.name,
    __isAuthError: signUpError.__isAuthError
  })
}
```

**Puis**:
1. Ouvrir DevTools Console (F12)
2. Tenter de s'inscrire
3. Lire l'erreur exacte de Supabase

---

## 📋 CHECKLIST DE FIX

- [ ] Changer minimum password de 6 à 8 caractères (ligne 53)
- [ ] Mettre à jour placeholder "Minimum 8 caractères" (ligne 225)
- [ ] Améliorer gestion d'erreur avec messages spécifiques (ligne 78)
- [ ] Ajouter console.log pour debugging (ligne 66)
- [ ] Vérifier config Supabase Dashboard (Authentication > Settings)
- [ ] Si dev: Désactiver "Confirm email" temporairement
- [ ] Tester avec mot de passe 8+ caractères
- [ ] Vérifier console pour messages d'erreur détaillés

---

## 🚀 FIX RAPIDE (Copy-Paste)

Si vous voulez juste que ça marche rapidement:

### Étape 1: Mettre à jour la validation (ligne 53)

```typescript
if (password.length < 8) {
  setError('Le mot de passe doit contenir au moins 8 caractères')
  return
}
```

### Étape 2: Dans Supabase Dashboard

1. Aller sur **Authentication > Settings**
2. Chercher **"Confirm email"**
3. **Désactiver** temporairement
4. Sauvegarder

### Étape 3: Tester

1. Créer un compte avec un mot de passe de 8+ caractères
2. Devrait fonctionner!

---

## ❌ SI ÇA NE MARCHE TOUJOURS PAS

### Vérifier les variables d'environnement

**.env.local**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://alcizrsvcrxkdgmvdwxn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Vérifier que Supabase est accessible

```bash
# Test dans console navigateur:
fetch('https://alcizrsvcrxkdgmvdwxn.supabase.co/auth/v1/health')
  .then(r => r.json())
  .then(console.log)
```

**Résultat attendu**: `{"version":"...","name":"GoTrue"}`

### Contacter le support

Si vraiment rien ne fonctionne:
1. Noter le message d'erreur exact
2. Prendre un screenshot des settings Auth
3. Vérifier les logs Supabase Dashboard > Logs

---

**Créé**: 28 janvier 2026
**Status**: 🔴 ERREUR ACTIVE
**Priority**: HAUTE - Bloque l'inscription
**Fix estimé**: 5-10 minutes
