# ⚡ FIX WEBHOOK LOCAL - STRIPE

**Problème**: Transaction introuvable après paiement
**Cause**: Webhook Stripe ne fonctionne pas en local

---

## 🔧 SOLUTION RAPIDE (2 MIN)

### Option 1: Passer à l'étape suivante manuellement

Le paiement a **fonctionné** ! Il suffit d'aller directement à:

**Cliquez sur**: [http://localhost:3000/complete-profile](http://localhost:3000/complete-profile)

---

## 🔧 SOLUTION COMPLÈTE (10 MIN)

Pour que les webhooks fonctionnent en local, installer **Stripe CLI**:

### Étape 1: Installer Stripe CLI

**Windows**:
```bash
# Avec Scoop
scoop install stripe

# OU télécharger: https://github.com/stripe/stripe-cli/releases
```

**Mac**:
```bash
brew install stripe/stripe-cli/stripe
```

### Étape 2: Se connecter

```bash
stripe login
```

### Étape 3: Écouter les webhooks

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

**Résultat**: Vous verrez un `signing secret` qui commence par `whsec_...`

### Étape 4: Ajouter le secret

Dans `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Étape 5: Redémarrer le serveur

```bash
Ctrl+C
npm run dev
```

---

## 🧪 TESTER À NOUVEAU

1. Créer un nouveau compte étudiant
2. Choisir un plan payant
3. Payer avec carte test: `4242 4242 4242 4242`
4. **Vérifier**: Message de succès avec subscription ✅

---

## 📝 ALTERNATIVE: Créer manuellement pour tester

**Dans Supabase SQL Editor**:

```sql
-- Récupérer votre user_id
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Créer la subscription manuellement
INSERT INTO subscriptions (
  user_id,
  plan_type,
  stripe_subscription_id,
  stripe_customer_id,
  current_period_start,
  current_period_end,
  status,
  price_eur,
  price_local,
  currency
)
VALUES (
  'VOTRE_USER_ID',  -- Remplacer par votre user_id
  'essentiel',
  'sub_test_123',
  'cus_test_123',
  NOW(),
  NOW() + INTERVAL '1 month',
  'active',
  19,
  19,
  'EUR'
);

-- Mettre à jour le plan utilisateur
UPDATE users
SET plan = 'essentiel', plan_expires_at = NOW() + INTERVAL '1 month'
WHERE id = 'VOTRE_USER_ID';
```

---

## ✅ POUR CONTINUER MAINTENANT

**Cliquez simplement sur**:

👉 [http://localhost:3000/complete-profile](http://localhost:3000/complete-profile)

Le paiement a fonctionné côté Stripe. C'est juste le webhook local qui n'a pas pu créer l'enregistrement.

---

*En production, les webhooks fonctionneront automatiquement !*
