# ⚡ ACTION IMMÉDIATE - PROFESSEURS COMPLÈTENT LEUR PROFIL

**Date**: 2026-01-24
**Temps**: 3 minutes
**Priorité**: HAUTE

---

## ✅ MODIFICATIONS APPLIQUÉES

1. ✅ [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx) - Tous → complete-profile
2. ✅ [middleware.ts](middleware.ts) - Vérifie tous les utilisateurs
3. ✅ [src/app/(auth)/complete-profile/page.tsx](src/app/(auth)/complete-profile/page.tsx) - Champs conditionnels selon rôle

---

## 🚀 À FAIRE MAINTENANT (2 étapes)

### Étape 1 : Exécuter la migration SQL (1 min)

**Dans Supabase SQL Editor** :

Copier-coller le contenu de [migrations/007-complete-profile-all-users.sql](migrations/007-complete-profile-all-users.sql)

**Ce que ça fait** :
- Modifie le trigger `check_profile_complete()`
- Professeurs : `country`, `phone`, `currency` obligatoires
- Étudiants : `country`, `phone`, `currency`, `education_level` obligatoires
- Met à jour tous les profils existants

---

### Étape 2 : Redémarrer le serveur (1 min)

```bash
Ctrl+C
npm run dev
# Attendre "Ready"
```

---

## 🧪 TESTER (2 minutes)

### Test Professeur

1. **Aller sur** `/register`
2. **Sélectionner** "Professeur" 👨‍🏫
3. **Créer** un compte
4. **Vérifier** : Redirection vers `/complete-profile` ✅
5. **Remplir** : Pays, Téléphone, Devise
6. **Soumettre**
7. **Vérifier** : Redirection vers `/teacher/dashboard` ✅

### Test Étudiant

1. **Aller sur** `/register`
2. **Sélectionner** "Élève" 👨‍🎓
3. **Créer** un compte
4. **Vérifier** : Redirection vers `/complete-profile` ✅
5. **Remplir** : Pays, Téléphone, Devise, Niveau scolaire
6. **Soumettre**
7. **Vérifier** : Redirection vers `/dashboard` ✅

---

## 📊 DIFFÉRENCES

### Formulaire Professeur
- ✅ Pays
- ✅ Téléphone
- ✅ Devise
- ❌ PAS de "Niveau scolaire"

### Formulaire Étudiant
- ✅ Pays
- ✅ Téléphone
- ✅ Devise
- ✅ Niveau scolaire
- ✅ Type de bac (si terminal/bac)

---

## ✅ CHECKLIST

- [ ] Migration SQL exécutée
- [ ] Serveur redémarré
- [ ] Test nouveau professeur OK
- [ ] Test nouvel étudiant OK
- [ ] Formulaires adaptés au rôle

---

## 📖 DOCUMENTATION COMPLÈTE

- [COMPLETE-PROFILE-TOUS-UTILISATEURS.md](COMPLETE-PROFILE-TOUS-UTILISATEURS.md) - Documentation détaillée

---

*Exécutez les 2 étapes maintenant (3 minutes)*
