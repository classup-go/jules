# 🐛 DEBUG - ERREUR SUBSCRIPTION

**Date**: 2026-01-24
**Erreur**: 500 Internal Server Error sur `/api/subscriptions/create`

---

## ❌ PROBLÈMES IDENTIFIÉS

### 1. Prix en DT au lieu de EUR
**Cause**: `useGeoLocation` détectait automatiquement le pays (Tunisie)
**Solution**: ✅ Modifié pour forcer EUR (DEFAULT_COUNTRY = 'FR')

### 2. Erreur 500 API Subscription
**Erreur**: "Erreur lors de la création de l'abonnement"
**Fichier**: [src/app/api/subscriptions/create/route.ts](src/app/api/subscriptions/create/route.ts)

---

## 🔍 VÉRIFICATIONS À FAIRE

### Étape 1: Vérifier les logs serveur

Dans votre terminal (où tourne `npm run dev`), cherchez:
```
POST /api/subscriptions/create
Error: ...
```

**Erreurs possibles**:
1. Table `plan_pricing` vide ou n'existe pas
2. Variable d'environnement `STRIPE_SECRET_KEY` manquante
3. Problème de validation dans l'API

---

### Étape 2: Vérifier la table plan_pricing

**Dans Supabase SQL Editor**:
```sql
SELECT * FROM plan_pricing;
```

**Résultat attendu**:
```
plan_type    | price_eur | active
-------------|-----------|-------
free         | 0.00      | true
essentiel    | 19.00     | true
premium      | 39.00     | true
```

**Si vide**, exécuter:
```sql
INSERT INTO plan_pricing (plan_type, price_eur, features, active)
VALUES
  ('free', 0, '{"courses": "free_only", "qcm_per_month": 5, "forum": true}'::jsonb, true),
  ('essentiel', 19, '{"courses": "all_online", "qcm": "unlimited", "progress_tracking": true, "email_support": true}'::jsonb, true),
  ('premium', 39, '{"courses": "all", "live_sessions": "unlimited", "dedicated_teacher": true, "priority_support": true, "certificates": true}'::jsonb, true)
ON CONFLICT (plan_type) DO UPDATE
  SET price_eur = EXCLUDED.price_eur,
      features = EXCLUDED.features,
      active = EXCLUDED.active;
```

---

### Étape 3: Vérifier Stripe

**Fichier**: `.env.local`

Vérifier que ces variables existent:
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 ACTIONS IMMÉDIATES

### 1. Redémarrer le serveur

```bash
Ctrl+C
npm run dev
```

**Pourquoi**: Le changement de `useGeoLocation` nécessite un redémarrage

---

### 2. Vérifier les prix

1. Recharger `/subscription`
2. **Vérifier**: Prix affichés en EUR (0.00 EUR, 19.00 EUR, 39.00 EUR)

---

### 3. Tester l'API directement

**Option A**: Dans la console navigateur (F12):
```javascript
fetch('/api/subscriptions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plan_type: 'essentiel',
    currency: 'EUR',
    exchangeRate: 1
  })
}).then(r => r.json()).then(console.log)
```

**Option B**: Depuis le terminal:
```bash
curl -X POST http://localhost:3000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{"plan_type":"essentiel","currency":"EUR","exchangeRate":1}'
```

---

## 🔧 SOLUTIONS SELON L'ERREUR

### Erreur: "Plan non trouvé" (404)
**Solution**: Table `plan_pricing` vide → Exécuter le SQL ci-dessus

### Erreur: "Vous avez déjà un abonnement actif" (409)
**Solution**: Normal si déjà abonné
```sql
-- Vérifier
SELECT * FROM subscriptions WHERE status = 'active';

-- Si besoin de supprimer pour test
DELETE FROM subscriptions WHERE status = 'active';
```

### Erreur: "Stripe error" (500)
**Causes possibles**:
1. `STRIPE_SECRET_KEY` manquante ou invalide
2. Connexion Stripe impossible
3. Montant invalide (0 ou négatif)

**Solution**:
- Vérifier `.env.local`
- Vérifier que la clé commence par `sk_test_` (mode test)

### Erreur: "Invalid currency" (400)
**Solution**: Vérifier que `currency` est dans: EUR, TND, USD, XOF, XAF

---

## 📊 CODE API SUBSCRIPTION

L'API fait:
1. Vérifier l'utilisateur authentifié
2. Vérifier que le plan existe dans `plan_pricing`
3. Vérifier qu'il n'y a pas déjà un abonnement actif
4. Convertir le prix selon la devise
5. Créer une session Stripe Checkout
6. Retourner l'URL de paiement

**Points de défaillance possibles**:
- Ligne 50-59: Récupération depuis `plan_pricing`
- Ligne 85-116: Création Stripe session

---

## 🧪 TEST RAPIDE

### Test 1: Prix en EUR
1. Recharger `/subscription`
2. **Vérifier**: 0.00 EUR, 19.00 EUR, 39.00 EUR ✅

### Test 2: Plan Gratuit
1. Sélectionner "Plan Gratuit"
2. Cliquer "Continuer gratuitement"
3. **Vérifier**: Redirect `/complete-profile` (pas d'erreur) ✅

### Test 3: Plan Payant (après fix)
1. Sélectionner "Plan Essentiel"
2. Cliquer "Choisir cet Abonnement"
3. **Vérifier**: Pas d'erreur, redirect Stripe ✅

---

## 📋 CHECKLIST DEBUG

- [x] `useGeoLocation` modifié → Force EUR
- [ ] Serveur redémarré
- [ ] Prix affichés en EUR
- [ ] Table `plan_pricing` vérifiée
- [ ] Variables Stripe vérifiées
- [ ] Logs serveur consultés
- [ ] Test plan gratuit OK
- [ ] Test plan payant OK

---

## 🆘 SI TOUJOURS ERREUR

**Partagez**:
1. Les logs du terminal serveur (erreur complète)
2. Le résultat de `SELECT * FROM plan_pricing;`
3. La présence de `STRIPE_SECRET_KEY` dans `.env.local` (juste confirmer, pas la valeur)

---

*Redémarrez le serveur maintenant et testez !*
