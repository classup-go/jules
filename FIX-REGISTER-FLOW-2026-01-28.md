# ✅ FIX: Flow d'inscription corrigé

**Date**: 28 janvier 2026
**Problème**: Flow d'inscription incorrect - students envoyés directement vers pricing
**Solution**: Tous les utilisateurs passent par complete-profile d'abord

---

## 🔄 NOUVEAU FLOW D'INSCRIPTION

### Pour Students (Élèves):

```
1. /register
   ↓ (inscription réussie)
2. /complete-profile
   ↓ (profil complété)
3. /subscription (pricing)
   ↓
   ├─ Plan GRATUIT → /student/dashboard ✅
   └─ Plan PAYANT → Stripe Checkout → /payment/success → /student/dashboard ✅
```

### Pour Teachers (Professeurs):

```
1. /register
   ↓ (inscription réussie)
2. /complete-profile
   ↓ (profil complété)
3. /teacher/dashboard ✅
```

---

## ✅ FICHIERS MODIFIÉS

### 1. [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx)

**Avant** (ligne 113-119):
```typescript
// Flow différent selon le rôle
if (role === 'student') {
  // Étudiant → Pricing d'abord ❌
  router.push('/subscription')
} else {
  // Professeur → Complete profile d'abord
  router.push('/complete-profile')
}
```

**Après** (ligne 108-112):
```typescript
// Tous les utilisateurs (student ET teacher) passent d'abord par complete-profile
router.push('/complete-profile')
```

**Changement**: Tous les utilisateurs vont maintenant vers `/complete-profile` après inscription.

---

### 2. [src/app/(auth)/complete-profile/page.tsx](src/app/(auth)/complete-profile/page.tsx)

**Avant** (ligne 179-186):
```typescript
if (userRole === 'teacher') {
  router.push('/teacher/pricing')
} else {
  router.push('/student/home') // ❌ Sautait le pricing
}
```

**Après**:
```typescript
if (userRole === 'teacher') {
  router.push('/teacher/dashboard')
} else {
  // Étudiants → Page pricing pour choisir un plan
  router.push('/subscription')
}
```

**Changement**: Students sont maintenant redirigés vers `/subscription` après avoir complété leur profil.

---

**Avant** (ligne 84-91):
```typescript
if (profile?.profile_completed) {
  if (profile.role === 'teacher') {
    router.push('/teacher/dashboard')
  } else {
    router.push('/student/home') // ❌ Page inexistante?
  }
  return
}
```

**Après**:
```typescript
if (profile?.profile_completed) {
  if (profile.role === 'teacher') {
    router.push('/teacher/dashboard')
  } else {
    router.push('/student/dashboard') // ✅ Correct
  }
  return
}
```

**Changement**: Redirection vers `/student/dashboard` au lieu de `/student/home`.

---

### 3. [src/app/(dashboard)/subscription/page.tsx](src/app/(dashboard)/subscription/page.tsx)

**Avant** (ligne 66-70):
```typescript
if (selectedPlan === 'free') {
  // TODO: Mettre à jour le profil utilisateur avec plan = 'free'
  router.push('/complete-profile') // ❌ Boucle infinie!
  return
}
```

**Après**:
```typescript
if (selectedPlan === 'free') {
  // TODO: Mettre à jour le profil utilisateur avec plan = 'free'
  // Rediriger vers le dashboard student
  router.push('/student/dashboard') // ✅ Correct
  return
}
```

**Changement**: Plan gratuit redirige maintenant vers `/student/dashboard` au lieu de créer une boucle.

---

## 🧪 TESTS

### Test 1: Inscription Student avec Plan Gratuit

1. Aller sur `/register`
2. Choisir "Élève"
3. Remplir le formulaire (email, mot de passe 8+ caractères)
4. S'inscrire

**Résultat attendu**:
- ✅ Redirection vers `/complete-profile`

5. Remplir le profil (pays, téléphone, niveau scolaire)
6. Soumettre

**Résultat attendu**:
- ✅ Redirection vers `/subscription`

7. Choisir "Plan Gratuit"
8. Cliquer "S'abonner"

**Résultat attendu**:
- ✅ Redirection vers `/student/dashboard`
- ✅ Pas de boucle infinie

---

### Test 2: Inscription Student avec Plan Payant

1. Suivre les étapes 1-7 du Test 1
2. Choisir "Plan Essentiel" ou "Plan Premium"
3. Cliquer "S'abonner"

**Résultat attendu**:
- ✅ Redirection vers Stripe Checkout
- ✅ Après paiement: Redirection vers `/payment/success`
- ✅ Ensuite: Redirection vers `/student/dashboard`

---

### Test 3: Inscription Teacher

1. Aller sur `/register`
2. Choisir "Professeur"
3. Remplir le formulaire
4. S'inscrire

**Résultat attendu**:
- ✅ Redirection vers `/complete-profile`

5. Remplir le profil (pays, téléphone)
6. Soumettre

**Résultat attendu**:
- ✅ Redirection vers `/teacher/dashboard`
- ✅ Pas de passage par le pricing

---

### Test 4: Utilisateur avec profil déjà complété

1. Se connecter avec un compte existant où `profile_completed = true`
2. Essayer d'accéder à `/complete-profile`

**Résultat attendu**:
- ✅ Redirection automatique vers:
  - `/teacher/dashboard` (si teacher)
  - `/student/dashboard` (si student)

---

## 📝 TODO RESTANT

### ⚠️ Important: Mettre à jour le profil avec le plan choisi

Dans [src/app/(dashboard)/subscription/page.tsx](src/app/(dashboard)/subscription/page.tsx), ligne 67:

```typescript
// TODO: Mettre à jour le profil utilisateur avec plan = 'free'
```

**À implémenter**:
```typescript
if (selectedPlan === 'free') {
  // Mettre à jour le profil avec le plan gratuit
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase
      .from('users')
      .update({
        subscription_plan: 'free',
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
  }

  router.push('/student/dashboard')
  return
}
```

---

## 🎯 AVANTAGES DU NOUVEAU FLOW

### 1. **Cohérence**
- Tous les utilisateurs passent par les mêmes étapes
- Pas de traitement spécial par rôle au début

### 2. **Complétion du profil garantie**
- Impossible d'accéder au pricing sans avoir complété son profil
- Données utilisateur complètes dès le début

### 3. **Flexibilité**
- Students peuvent choisir entre gratuit et payant
- Pas de compte "bloqué" en attendant le paiement

### 4. **Pas de boucles**
- Chaque étape a une redirection claire
- Pas de retour en arrière inattendu

---

## 🔍 VÉRIFICATIONS POST-FIX

- [x] Register redirige vers complete-profile (pour tous)
- [x] Complete-profile redirige vers subscription (students) ou dashboard (teachers)
- [x] Subscription redirige vers dashboard (plan gratuit)
- [x] Subscription redirige vers Stripe (plan payant)
- [x] Pas de boucle infinie complete-profile ↔ subscription
- [ ] TODO: Implémenter la mise à jour du plan dans la DB

---

## 📊 SCHÉMA VISUEL

### AVANT (incorrect):
```
Register (student)
    ↓
Subscription ❌ (saute complete-profile)
    ↓
Complete-profile ❌ (retour vers subscription = boucle)
```

### APRÈS (correct):
```
Register
    ↓
Complete-profile
    ↓
    ├─ Teacher → Dashboard ✅
    └─ Student → Subscription
                     ↓
                     ├─ Gratuit → Dashboard ✅
                     └─ Payant → Stripe → Dashboard ✅
```

---

**Créé**: 28 janvier 2026
**Status**: ✅ CORRIGÉ
**Testé**: En attente de tests utilisateur
**Impact**: Critique - Améliore l'expérience d'inscription complète
