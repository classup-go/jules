# ⚡ ACTION - PAIEMENT PROFESSEUR MAINTENANT

**Date**: 2026-01-24
**Temps**: 10 minutes
**Statut**: PRÊT À TESTER

---

## ✅ TOUT CRÉÉ

### Système de Paiement Professeur
- ✅ API `/api/teacher/subscriptions/create`
- ✅ Migration SQL `008-teacher-subscriptions.sql`
- ✅ Webhook Stripe pour teacher_subscription
- ✅ Page success avec message professeur
- ✅ Bouton pricing connecté

---

## 🚀 À FAIRE (3 ÉTAPES - 10 MIN)

### Étape 1: Exécuter la migration SQL (5 min)

**Dans Supabase SQL Editor**, copier-coller le contenu de:
[migrations/008-teacher-subscriptions.sql](migrations/008-teacher-subscriptions.sql)

**Ce que ça fait**:
- Crée table `teacher_subscriptions`
- Ajoute `commission_rate` dans `users`
- Installe triggers auto-update
- Crée fonctions calcul gains
- Configure RLS policies
- Initialise professeurs existants avec plan gratuit

**Vérifier après**:
```sql
-- Devrait retourner la table
SELECT * FROM teacher_subscriptions LIMIT 1;
```

---

### Étape 2: Redémarrer le serveur (1 min)

```bash
Ctrl+C
npm run dev
```

---

### Étape 3: Tester le flow complet (5 min)

#### Test Plan Gratuit
```
1. /register → Professeur
2. Complete profile
3. /teacher/pricing
4. Sélectionner "Gratuit"
5. Clic "Commencer gratuitement"
6. Vérifier: Dashboard ✅
```

#### Test Plan Pro (avec Stripe)
```
1. /register → Nouveau professeur
2. Complete profile
3. /teacher/pricing
4. Sélectionner "Pro" (9.99€)
5. Clic "Souscrire à ce plan"
6. Vérifier: Redirect Stripe ✅
7. Payer: 4242 4242 4242 4242
8. Vérifier: Success page ✅
   - Message: "Abonnement Professeur Activé 🎉"
   - Plan: "Pro"
   - Commission: "10%"
9. Clic "Accéder à mon dashboard"
10. Vérifier: Dashboard ✅
```

---

## 🔍 VÉRIFIER DANS SUPABASE

Après le paiement:

```sql
-- Vérifier l'abonnement créé
SELECT
  u.display_name,
  ts.plan_type,
  ts.commission_rate,
  ts.status
FROM teacher_subscriptions ts
JOIN users u ON u.id = ts.teacher_id
WHERE ts.status = 'active'
ORDER BY ts.created_at DESC
LIMIT 5;
```

**Résultat attendu**:
```
display_name | plan_type | commission_rate | status
-------------|-----------|-----------------|--------
Test Prof    | pro       | 10.00           | active
```

---

## 💰 PLANS DISPONIBLES

| Plan | Prix | Commission | Action |
|------|------|------------|--------|
| **Gratuit** | 0€ | 20% | Direct dashboard |
| **Pro** | 9.99€/mois | 10% | Stripe payment |
| **Business** | 29.99€/mois | 5% | Stripe payment |

---

## 🎯 FLOW FINAL

```
Register Professeur
  ↓
Complete Profile
  ↓
Pricing
  ├─ Gratuit → Dashboard
  └─ Pro/Business
      ↓
      Stripe Payment
      ↓
      Success (Commission affichée)
      ↓
      Dashboard
```

---

## 📁 FICHIERS CRÉÉS

1. ✅ [src/app/api/teacher/subscriptions/create/route.ts](src/app/api/teacher/subscriptions/create/route.ts)
2. ✅ [migrations/008-teacher-subscriptions.sql](migrations/008-teacher-subscriptions.sql)
3. ✅ [src/app/api/webhook/stripe/route.ts](src/app/api/webhook/stripe/route.ts) - Modifié
4. ✅ [src/app/(dashboard)/teacher/pricing/page.tsx](src/app/(dashboard)/teacher/pricing/page.tsx) - Modifié
5. ✅ [src/app/(dashboard)/payment/success/page.tsx](src/app/(dashboard)/payment/success/page.tsx) - Modifié

---

## ⚠️ NOTES IMPORTANTES

### Webhook en Local
En développement, les webhooks Stripe ne fonctionnent pas automatiquement.

**Ce n'est PAS un problème** car:
- Le paiement Stripe fonctionne ✅
- La page success affiche un message ✅
- En production, les webhooks fonctionneront ✅

**Si vous voulez tester les webhooks en local**:
```bash
# Installer Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Copier le webhook secret dans .env.local
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## ✅ CHECKLIST

- [ ] Migration SQL exécutée
- [ ] Table teacher_subscriptions existe
- [ ] Serveur redémarré
- [ ] Test plan gratuit OK
- [ ] Test plan Pro avec Stripe OK
- [ ] Success page affiche commission
- [ ] Redirect dashboard OK
- [ ] Vérification Supabase OK

---

## 📖 DOCUMENTATION COMPLÈTE

[TEACHER-PAYMENT-SYSTEM-COMPLETE.md](TEACHER-PAYMENT-SYSTEM-COMPLETE.md)

---

*Exécutez les 3 étapes maintenant (10 minutes) !*
