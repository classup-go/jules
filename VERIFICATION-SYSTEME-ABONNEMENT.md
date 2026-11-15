# ✅ VÉRIFICATION SYSTÈME ABONNEMENT

**Date**: 2026-01-24
**Statut**: Système presque complet - Nécessite connexion UI ↔ API

---

## 📊 ÉTAT ACTUEL

### ✅ Backend Complet

#### 1. Database (Supabase)
- ✅ Table `subscriptions` existe ([supabase-payment-system-setup.sql:148](supabase-payment-system-setup.sql#L148))
  - Colonnes: user_id, plan_type, price_eur, price_local, currency, stripe_subscription_id, status, etc.
  - Plans supportés: 'free', 'essentiel', 'premium'
  - RLS policies configurées

- ✅ Table `plan_pricing` existe ([supabase-payment-system-setup.sql:210](supabase-payment-system-setup.sql#L210))
  - Prix configurés:
    - Free: 0 EUR
    - Essentiel: 19 EUR/mois
    - Premium: 39 EUR/mois

#### 2. API Routes
- ✅ `/api/subscriptions/create` ([src/app/api/subscriptions/create/route.ts](src/app/api/subscriptions/create/route.ts))
  - Validation du plan
  - Vérification abonnement existant
  - Conversion de devise
  - Création Stripe Checkout en mode `subscription`
  - Metadata complet

#### 3. Webhook Stripe
- ✅ `/api/webhook/stripe` ([src/app/api/webhook/stripe/route.ts](src/app/api/webhook/stripe/route.ts))
  - Gère `checkout.session.completed` pour subscriptions
  - Gère `invoice.payment_succeeded` (paiements récurrents)
  - Gère `invoice.payment_failed`
  - Gère `customer.subscription.updated`
  - Gère `customer.subscription.deleted`
  - Fonction `handleSubscription()` crée l'enregistrement dans `subscriptions`

---

## ❌ UI Incomplet

### Page Subscription ([src/app/(dashboard)/subscription/page.tsx](src/app/(dashboard)/subscription/page.tsx))

**Problèmes identifiés**:

1. **Bouton non fonctionnel** (ligne 112-114)
   ```tsx
   <button className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-semibold">
     Choisir cet Abonnement
   </button>
   ```
   - ❌ Pas d'onClick handler
   - ❌ Ne fait rien quand on clique

2. **Mismatch Plans ID**
   - UI utilise: `'monthly'`, `'semi-annual'`, `'annual'`
   - API attend: `'essentiel'` ou `'premium'`
   - Prix UI: 6 EUR, 34 EUR, 60 EUR
   - Prix DB: 19 EUR (essentiel), 39 EUR (premium)

3. **Confusion dans l'architecture**
   - La page actuelle semble être un sélecteur de durée (1 mois, 6 mois, 12 mois)
   - L'API attend un sélecteur de plan (Essentiel vs Premium)
   - **Il faut clarifier**: Est-ce qu'on veut:
     - Option A: Plans avec durées différentes (actuel dans UI)
     - Option B: Plans avec fonctionnalités différentes (actuel dans API/DB)

---

## 🔄 FLOW SOUHAITÉ (rappel)

Selon les messages précédents:

```
Register → Complete Profile → Pricing → Payment → Success → Home
```

**Actuellement manquant**:
1. Intégration pricing dans le flow d'inscription
2. Connexion bouton → API
3. Clarification du modèle de pricing

---

## 🛠️ CORRECTIONS NÉCESSAIRES

### Option A: Utiliser le modèle actuel de l'API (RECOMMANDÉ)

**Modifier** `src/app/(dashboard)/subscription/page.tsx`:

1. Remplacer les plans par:
   ```tsx
   const plans = [
     {
       id: 'essentiel',
       name: 'Plan Essentiel',
       price: 19,
       features: [
         'Tous les cours en ligne',
         'QCM illimités',
         'Suivi de progression',
         'Support par email'
       ]
     },
     {
       id: 'premium',
       name: 'Plan Premium',
       price: 39,
       features: [
         'Tous les cours + sessions live',
         'Professeur dédié',
         'Support prioritaire',
         'Certificats'
       ],
       popular: true
     }
   ]
   ```

2. Ajouter un handler pour le bouton:
   ```tsx
   const handleSubscribe = async () => {
     try {
       setLoading(true)
       const response = await fetch('/api/subscriptions/create', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           plan_type: selectedPlan,
           currency: paymentConfig.currency,
           exchangeRate: paymentConfig.exchangeRate
         })
       })

       const data = await response.json()
       if (data.url) {
         window.location.href = data.url // Redirect vers Stripe
       }
     } catch (error) {
       console.error(error)
       alert('Erreur lors de la création de l\'abonnement')
     } finally {
       setLoading(false)
     }
   }
   ```

3. Connecter le bouton:
   ```tsx
   <button
     onClick={handleSubscribe}
     disabled={loading}
     className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-semibold"
   >
     {loading ? 'Chargement...' : 'Choisir cet Abonnement'}
   </button>
   ```

---

### Option B: Ajouter gestion de durée dans l'API

**Modifier** `src/app/api/subscriptions/create/route.ts`:

1. Accepter un paramètre `billing_period`
2. Modifier le prix selon la durée
3. Créer les Price IDs Stripe correspondants

**Plus complexe** - nécessite configuration Stripe supplémentaire.

---

## 📋 PLAN D'ACTION

### Étape 1: Corriger la page Subscription (15 min)
- [ ] Aligner les plans sur l'API (essentiel/premium)
- [ ] Ajouter onClick handler
- [ ] Gérer les états de chargement
- [ ] Gérer les erreurs

### Étape 2: Intégrer dans le flow Register (10 min)
- [ ] Modifier `src/app/(auth)/complete-profile/page.tsx`
- [ ] Après soumission, rediriger vers `/subscription` au lieu de home
- [ ] Ajouter option "Gratuit" pour skip le paiement

### Étape 3: Middleware pour plan (5 min)
- [ ] Vérifier le plan dans `middleware.ts`
- [ ] Rediriger vers `/subscription` si plan = 'free' et accès premium

### Étape 4: Tests (10 min)
- [ ] Test flow complet: Register → Complete → Pricing → Stripe → Success
- [ ] Vérifier création dans `subscriptions` table
- [ ] Vérifier mise à jour du `users.plan`

---

## 🎯 ARCHITECTURE FINALE

### Tables Database
```
users
  - plan: TEXT ('free', 'essentiel', 'premium')
  - plan_expires_at: TIMESTAMP

subscriptions
  - user_id: UUID
  - plan_type: TEXT
  - stripe_subscription_id: TEXT
  - status: TEXT ('active', 'cancelled', etc.)
  - current_period_start/end: TIMESTAMP

plan_pricing
  - plan_type: TEXT
  - price_eur: DECIMAL
  - features: JSONB
```

### Flow Complet
```
1. Register (/register)
   ↓
2. Complete Profile (/complete-profile)
   - Pays, Téléphone, Devise
   - Niveau scolaire (si étudiant)
   ↓
3. Pricing (/subscription)
   - Gratuit (skip payment)
   - Essentiel (19 EUR/mois)
   - Premium (39 EUR/mois)
   ↓
4. Si Gratuit → /student/home
   Si Payant → Stripe Checkout
   ↓
5. Webhook Stripe → Créé subscription
   ↓
6. Success (/payment/success?subscription=true)
   ↓
7. Home (/student/home ou /teacher/dashboard)
```

---

## ✅ CE QUI FONCTIONNE DÉJÀ

1. ✅ Database structure complète
2. ✅ API subscription creation
3. ✅ Webhook handlers pour tous les événements
4. ✅ Stripe checkout en mode subscription
5. ✅ Conversion de devise
6. ✅ Metadata complet
7. ✅ Notifications utilisateur
8. ✅ RLS policies

---

## ❌ CE QUI MANQUE

1. ❌ Bouton subscription non connecté à l'API
2. ❌ Plans UI ≠ Plans API
3. ❌ Integration dans le flow d'inscription
4. ❌ Option "Gratuit" dans l'UI
5. ❌ Middleware pour vérifier le plan

---

## 🚀 PROCHAINE ACTION

**Corriger la page subscription maintenant** pour connecter l'UI à l'API existante.

Voulez-vous que je:
1. ✅ Modifie la page subscription pour utiliser les plans API (essentiel/premium)
2. ✅ Connecte le bouton à l'API
3. ✅ Intègre dans le flow d'inscription

---

*Système backend ✅ - UI à connecter ❌*
