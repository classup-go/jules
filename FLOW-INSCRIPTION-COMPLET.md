# 🔄 FLOW INSCRIPTION COMPLET

**Date**: 2026-01-24
**Statut**: Partiellement implémenté

---

## ✅ PROBLÈME RÉSOLU

**Erreur 404 après complete-profile pour étudiants**

**Correction appliquée** : [src/app/(auth)/complete-profile/page.tsx](src/app/(auth)/complete-profile/page.tsx)

**Avant** :
```typescript
router.push('/dashboard')  // ❌ 404 pour étudiants
```

**Après** :
```typescript
router.push('/student/home')  // ✅ Correct
```

---

## 🎯 FLOW SOUHAITÉ (COMPLET)

### Flow Étudiant

```
1. Inscription (/register)
   - Nom, Email, Password
   - Rôle : Étudiant
   ↓
2. Choix du plan (/pricing ou /plans) ← À IMPLÉMENTER
   - Plan Gratuit (accès limité)
   - Plan Premium (accès complet)
   ↓
3. Paiement (si Premium) ← À IMPLÉMENTER
   - Stripe Checkout
   - Abonnement mensuel/annuel
   ↓
4. Success (/payment/success) ← EXISTE
   - Message de confirmation
   - Résumé du plan choisi
   ↓
5. Complete Profile (/complete-profile) ← EXISTE
   - Pays, Téléphone, Devise
   - Niveau scolaire, Type de bac
   ↓
6. Page d'accueil (/student/home) ← EXISTE
   - Recherche de cours
   - Recommandations
   - Tableau de bord
```

### Flow Professeur

```
1. Inscription (/register)
   - Nom, Email, Password
   - Rôle : Professeur
   ↓
2. Choix du plan (/pricing) ← OPTIONNEL
   - Plan Gratuit (commission plus élevée)
   - Plan Pro (commission réduite)
   ↓
3. Complete Profile (/complete-profile) ← EXISTE
   - Pays, Téléphone, Devise
   ↓
4. Dashboard (/teacher/dashboard) ← EXISTE
   - Créer des classes
   - Ajouter des cours
   - Gérer les étudiants
```

---

## 📊 ÉTAT ACTUEL

### ✅ Fonctionnalités implémentées

1. ✅ Page d'inscription (`/register`)
2. ✅ Page complete-profile (`/complete-profile`)
3. ✅ Redirection selon le rôle :
   - Professeur → `/teacher/dashboard`
   - Étudiant → `/student/home`
4. ✅ Middleware pour profil incomplet
5. ✅ Trigger SQL pour validation

### ❌ Fonctionnalités manquantes

1. ❌ Page de choix du plan (`/pricing`)
2. ❌ Système d'abonnement (Stripe Subscription)
3. ❌ Différenciation Gratuit/Premium
4. ❌ Limitations selon le plan

---

## 🚀 IMPLÉMENTATION À FAIRE

### Phase 1 : Page de choix du plan

**Créer** : `src/app/(auth)/pricing/page.tsx`

**Contenu** :
- Plan Gratuit (Free)
  - Accès à X cours gratuits
  - Fonctionnalités de base
  - Publicités

- Plan Premium (10€/mois ou 100€/an)
  - Accès illimité aux cours
  - Pas de publicités
  - Support prioritaire
  - Certificats

**Boutons** :
- "Commencer gratuitement" → `/complete-profile`
- "S'abonner Premium" → `/checkout?plan=premium`

---

### Phase 2 : Système d'abonnement Stripe

**Créer** : `src/app/api/subscription/route.ts`

**Fonctionnalités** :
- Créer un abonnement Stripe
- Gérer les webhooks d'abonnement
- Mettre à jour le statut Premium

**Table à créer** : `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  stripe_subscription_id TEXT,
  plan_type TEXT, -- 'free', 'premium'
  status TEXT, -- 'active', 'cancelled', 'expired'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Phase 3 : Modifier le flow d'inscription

**Fichier** : `src/app/(auth)/register/page.tsx`

**Modification** :
```typescript
// Après création du compte
if (data.session) {
  // Rediriger vers choix du plan pour les étudiants
  if (role === 'student') {
    router.push('/pricing')  // ← NOUVEAU
  } else {
    router.push('/complete-profile')
  }
}
```

---

### Phase 4 : Middleware pour vérifier le plan

**Fichier** : `middleware.ts`

**Ajouter** :
```typescript
// Vérifier l'abonnement pour les routes premium
if (
  pathname.startsWith('/student/') &&
  !pathname.startsWith('/student/home') &&
  !pathname.startsWith('/student/settings')
) {
  // Vérifier si l'utilisateur a un abonnement actif
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_type')
    .eq('user_id', authUser.id)
    .single()

  if (!subscription || subscription.plan_type === 'free') {
    // Rediriger vers pricing
    return NextResponse.redirect(new URL('/pricing', request.url))
  }
}
```

---

## 🔄 FLOW FINAL (APRÈS IMPLÉMENTATION)

### Étudiant

```
1. Register (/register)
   ↓
2. Pricing (/pricing)
   - Choix : Gratuit ou Premium
   ↓
3a. SI GRATUIT :
   → Complete Profile (/complete-profile)
   → Student Home (/student/home)

3b. SI PREMIUM :
   → Checkout (/checkout?plan=premium)
   → Stripe Payment
   → Success (/payment/success)
   → Complete Profile (/complete-profile)
   → Student Home (/student/home)
```

### Professeur

```
1. Register (/register)
   ↓
2. Complete Profile (/complete-profile)
   ↓
3. Teacher Dashboard (/teacher/dashboard)
```

---

## 📝 FICHIERS À CRÉER

1. ❌ `src/app/(auth)/pricing/page.tsx` - Page de choix du plan
2. ❌ `src/app/api/subscription/create/route.ts` - Créer abonnement
3. ❌ `src/app/api/subscription/cancel/route.ts` - Annuler abonnement
4. ❌ `src/app/api/webhook/stripe-subscription/route.ts` - Webhook abonnements
5. ❌ `migrations/008-subscriptions.sql` - Table subscriptions
6. ❌ `src/components/pricing-card.tsx` - Composant card pricing
7. ❌ `src/lib/subscription.ts` - Utilitaires abonnement

---

## 🧪 TESTS À FAIRE

### Test 1 : Étudiant Gratuit
1. Inscription → Pricing
2. Choisir "Gratuit"
3. Complete Profile
4. Accès à `/student/home`
5. Tentative d'accès à cours premium → Redirect `/pricing`

### Test 2 : Étudiant Premium
1. Inscription → Pricing
2. Choisir "Premium"
3. Paiement Stripe
4. Complete Profile
5. Accès complet aux cours

### Test 3 : Professeur
1. Inscription
2. Complete Profile
3. Accès dashboard
4. Créer cours gratuits/payants

---

## ✅ ACTIONS IMMÉDIATES (DÉJÀ FAIT)

- [x] Corriger redirection étudiant (`/dashboard` → `/student/home`)
- [x] Serveur à redémarrer
- [x] Tester : Étudiant → Complete profile → `/student/home` ✅

---

## 🔜 PROCHAINES ÉTAPES

1. **Créer la page Pricing** (1h)
   - Design des cartes de plans
   - Boutons d'action

2. **Implémenter Stripe Subscriptions** (2h)
   - API routes
   - Webhooks
   - Migration SQL

3. **Modifier le flow d'inscription** (30min)
   - Redirection vers pricing pour étudiants

4. **Ajouter les limitations** (1h)
   - Middleware
   - Vérifications côté client

---

*Flow actuel corrigé - Système d'abonnement à implémenter*
