# 🚀 Configuration Rapide - Fix Erreur 403

## ⚡ 3 Étapes Simples

### 1️⃣ Ajouter la Service Role Key

**Aller sur Supabase Dashboard :**
1. Ouvrir votre projet Supabase
2. Settings → API
3. Copier la clé **`service_role`** (⚠️ PAS la clé `anon` !)

**Ajouter dans `.env.local` :**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2️⃣ Redémarrer le Serveur

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

### 3️⃣ Tester

1. Aller sur `/checkout?classroom=...`
2. Cliquer "Confirmer l'inscription"
3. ✅ **Plus d'erreur 403 !**
4. ✅ Redirection vers `/payment/success`

---

## 📋 Checklist

- [ ] Clé service role ajoutée dans `.env.local`
- [ ] Serveur redémarré
- [ ] Test inscription réussi
- [ ] Transaction visible dans Supabase → Tables → transactions
- [ ] Enrollment créé avec `payment_id`

---

## ❓ Problèmes Fréquents

### Erreur: "SUPABASE_SERVICE_ROLE_KEY is not defined"

**Solution** : Vérifier que la clé est bien dans `.env.local` (pas `.env.example`)

### Erreur persiste après ajout de la clé

**Solution** : Redémarrer le serveur Next.js

### Comment vérifier que ça marche ?

**Ouvrir la console browser** :
- ❌ Avant : `Failed to load resource: status 403`
- ✅ Après : Pas d'erreur, redirection réussie

---

## 📚 Plus d'Infos

Voir `FIX-RLS-TRANSACTION-403.md` pour les détails techniques complets.

---

## ✅ Résultat Attendu

```
Utilisateur clique "Confirmer l'inscription"
    ↓
API route /api/enrollment/create
    ↓
Transaction créée (via service role)
    ↓
Enrollment créé avec payment_id
    ↓
Redirection vers /payment/success ✅
```

**Temps estimé** : 2 minutes ⏱️
