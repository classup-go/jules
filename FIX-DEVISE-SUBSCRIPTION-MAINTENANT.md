# ⚡ FIX DEVISE & SUBSCRIPTION - MAINTENANT

**Date**: 2026-01-24
**Temps**: 5 minutes

---

## ✅ FIX APPLIQUÉ

### Devise forcée en EUR
**Fichier**: [src/lib/payment/useGeoLocation.ts](src/lib/payment/useGeoLocation.ts)
- Détection automatique **BLOQUÉE**
- Devise par défaut: **EUR** (au lieu de TND)

---

## 🚀 ACTIONS (3 ÉTAPES)

### Étape 1: Vérifier plan_pricing dans Supabase (2 min)

**Dans Supabase SQL Editor**:
```sql
SELECT * FROM plan_pricing;
```

**Si la table est vide**, copier-coller:
```sql
INSERT INTO plan_pricing (plan_type, price_eur, features, active)
VALUES
  ('free', 0, '{"courses": "free_only", "qcm_per_month": 5}'::jsonb, true),
  ('essentiel', 19, '{"courses": "all_online", "qcm": "unlimited"}'::jsonb, true),
  ('premium', 39, '{"courses": "all", "live_sessions": "unlimited"}'::jsonb, true)
ON CONFLICT (plan_type) DO UPDATE
  SET price_eur = EXCLUDED.price_eur;
```

---

### Étape 2: Redémarrer le serveur (1 min)

```bash
Ctrl+C
npm run dev
```

**Attendre** "Ready"

---

### Étape 3: Tester (2 min)

1. **Recharger** `/subscription`
2. **Vérifier**: Prix en **EUR** (0.00 EUR, 19.00 EUR, 39.00 EUR) ✅
3. **Cliquer** sur "Plan Gratuit" → "Continuer gratuitement"
4. **Vérifier**: Pas d'erreur, redirect `/complete-profile` ✅

---

## 🆘 SI TOUJOURS ERREUR 500

### Regarder les logs du terminal serveur

Cherchez:
```
POST /api/subscriptions/create
Error: ...
```

**Erreurs communes**:

#### "Plan non trouvé"
→ Exécuter le SQL de l'Étape 1

#### "Stripe error"
→ Vérifier `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
```

#### "Already has active subscription"
→ Supprimer l'ancien:
```sql
DELETE FROM subscriptions WHERE status = 'active';
```

---

## 📖 DOCUMENTATION COMPLÈTE

[DEBUG-SUBSCRIPTION-ERROR.md](DEBUG-SUBSCRIPTION-ERROR.md)

---

*Exécutez les 3 étapes maintenant !*
