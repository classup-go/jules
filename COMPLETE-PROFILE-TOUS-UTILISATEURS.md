# ✅ COMPLETE PROFILE POUR TOUS LES UTILISATEURS

**Date**: 2026-01-24
**Modification**: Professeurs ET étudiants complètent leur profil
**Statut**: PRÊT À DÉPLOYER

---

## 🎯 CHANGEMENT DEMANDÉ

Les **nouveaux professeurs** doivent aussi compléter leur profil après inscription.

---

## ✅ MODIFICATIONS APPLIQUÉES

### 1. Fichier d'inscription : [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx:88-122)

**Avant** :
```typescript
if (role === 'teacher') {
  profileData.profile_completed = true  // ❌ Complet directement
  router.push('/teacher/dashboard')
} else {
  profileData.profile_completed = false
  router.push('/complete-profile')
}
```

**Après** :
```typescript
// Tous les nouveaux utilisateurs doivent compléter leur profil
profileData.profile_completed = false

// Tous redirigés vers /complete-profile
router.push('/complete-profile')
```

---

### 2. Middleware : [middleware.ts](middleware.ts:67-79)

**Avant** :
```typescript
if (profile.role === 'student' &&  // ❌ Seulement étudiants
    profile.profile_completed === false) {
  redirect('/complete-profile')
}
```

**Après** :
```typescript
// Tous les utilisateurs (étudiants ET professeurs)
if (profile.profile_completed === false) {
  redirect('/complete-profile')
}
```

---

### 3. Page Complete Profile : [src/app/(auth)/complete-profile/page.tsx](src/app/(auth)/complete-profile/page.tsx)

**Ajouts** :
- Détection du rôle utilisateur (`userRole`)
- Champs conditionnels selon le rôle :
  - **Professeurs** : Pays, Téléphone, Devise
  - **Étudiants** : Pays, Téléphone, Devise + Niveau scolaire + Type de bac
- Redirection selon le rôle :
  - **Professeurs** → `/teacher/dashboard`
  - **Étudiants** → `/dashboard`

**Code clé** :
```typescript
const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null)

// Champs spécifiques aux étudiants
{userRole === 'student' && (
  <>
    <div>Niveau scolaire</div>
    <div>Type de bac (si terminal/bac)</div>
  </>
)}

// Validation selon le rôle
if (userRole === 'student') {
  if (!educationLevel) {
    setError('Veuillez sélectionner votre niveau scolaire')
    return
  }
}
```

---

### 4. Migration SQL : [migrations/007-complete-profile-all-users.sql](migrations/007-complete-profile-all-users.sql)

**Nouveau trigger** :
```sql
CREATE OR REPLACE FUNCTION check_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Étudiants : country, phone, currency, education_level obligatoires
  IF NEW.role = 'student' THEN
    IF NEW.country IS NOT NULL AND NEW.country != ''
       AND NEW.phone IS NOT NULL AND NEW.phone != ''
       AND NEW.currency IS NOT NULL AND NEW.currency != ''
       AND NEW.education_level IS NOT NULL AND NEW.education_level != ''
    THEN
      NEW.profile_completed = TRUE;
    ELSE
      NEW.profile_completed = FALSE;
    END IF;

  -- Professeurs : country, phone, currency obligatoires
  ELSIF NEW.role = 'teacher' THEN
    IF NEW.country IS NOT NULL AND NEW.country != ''
       AND NEW.phone IS NOT NULL AND NEW.phone != ''
       AND NEW.currency IS NOT NULL AND NEW.currency != ''
    THEN
      NEW.profile_completed = TRUE;
    ELSE
      NEW.profile_completed = FALSE;
    END IF;

  ELSE
    NEW.profile_completed = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 CHAMPS OBLIGATOIRES PAR RÔLE

### Professeurs
- ✅ Pays
- ✅ Téléphone
- ✅ Devise
- ⏭️ Adresse (optionnelle)

### Étudiants
- ✅ Pays
- ✅ Téléphone
- ✅ Devise
- ✅ Niveau scolaire
- ✅ Type de bac (si terminal/bac)
- ⏭️ Adresse (optionnelle)

---

## 🔄 FLOWS MIS À JOUR

### Flow Étudiant (inchangé)

```
1. Inscription (/register) [rôle: étudiant]
   ↓
2. profileData.profile_completed = FALSE
   ↓
3. Redirect → /complete-profile
   ↓
4. Formulaire avec :
   - Pays, Téléphone, Devise
   - Niveau scolaire, Type de bac
   ↓
5. Soumission
   ↓
6. Trigger met profile_completed = TRUE
   ↓
7. Redirect → /dashboard
```

### Flow Professeur (NOUVEAU)

```
1. Inscription (/register) [rôle: professeur]
   ↓
2. profileData.profile_completed = FALSE  ← CHANGEMENT
   ↓
3. Redirect → /complete-profile  ← CHANGEMENT
   ↓
4. Formulaire avec :
   - Pays, Téléphone, Devise
   - (PAS de niveau scolaire)  ← DIFFÉRENCE
   ↓
5. Soumission
   ↓
6. Trigger met profile_completed = TRUE
   ↓
7. Redirect → /teacher/dashboard  ← DIFFÉRENCE
```

---

## 🚀 DÉPLOIEMENT (5 minutes)

### Étape 1 : Exécuter la migration SQL (2 min)

**Dans Supabase SQL Editor** :
```sql
-- Copier-coller le contenu de migrations/007-complete-profile-all-users.sql
```

**OU** (si migration 007 déjà exécutée, juste le trigger) :
```sql
-- Copier-coller seulement la section 1 du fichier (fonction + trigger)
```

---

### Étape 2 : Redémarrer le serveur (1 min)

```bash
Ctrl+C
npm run dev
# Attendre "Ready"
```

---

### Étape 3 : Tester (2 min)

#### Test A : Nouveau professeur

1. **Aller sur** `/register`
2. **Sélectionner** "Professeur" 👨‍🏫
3. **Remplir** : Nom, Email, Password
4. **Cliquer** "Créer mon compte"
5. **Vérifier** : Redirection vers `/complete-profile` ✅
6. **Vérifier** : Formulaire SANS "Niveau scolaire" ✅
7. **Remplir** : Pays, Téléphone, Devise
8. **Soumettre**
9. **Vérifier** : Redirection vers `/teacher/dashboard` ✅

#### Test B : Nouvel étudiant

1. **Aller sur** `/register`
2. **Sélectionner** "Élève" 👨‍🎓
3. **Remplir** : Nom, Email, Password
4. **Cliquer** "Créer mon compte"
5. **Vérifier** : Redirection vers `/complete-profile` ✅
6. **Vérifier** : Formulaire AVEC "Niveau scolaire" ✅
7. **Remplir** : Pays, Téléphone, Devise, Niveau scolaire
8. **Soumettre**
9. **Vérifier** : Redirection vers `/dashboard` ✅

---

## 🔍 VÉRIFICATION EN BASE

### Vérifier le trigger

```sql
-- Voir la fonction
SELECT prosrc FROM pg_proc WHERE proname = 'check_profile_complete';
```

**Résultat attendu** : La fonction contient les deux branches IF (student ET teacher)

### Vérifier les profils

```sql
-- Voir tous les utilisateurs
SELECT
  email,
  role,
  country,
  phone,
  currency,
  education_level,
  profile_completed
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu** :
- Professeurs avec `profile_completed = FALSE` si country/phone/currency manquent
- Étudiants avec `profile_completed = FALSE` si country/phone/currency/education_level manquent

---

## 🆘 TROUBLESHOOTING

### Problème : Professeur redirigé en boucle

**Cause** : Le trigger ne fonctionne pas correctement

**Solution** :
```sql
-- Forcer manuellement
UPDATE users
SET profile_completed = FALSE
WHERE role = 'teacher'
  AND (country IS NULL OR phone IS NULL OR currency IS NULL);
```

### Problème : Champs "Niveau scolaire" visibles pour professeur

**Cause** : Le rôle n'est pas chargé correctement

**Solution** : Vérifier dans la console navigateur (F12) :
```javascript
console.log('User role:', userRole)
```

Si `userRole = null`, vérifier la requête Supabase dans `checkAuth()`

### Problème : Erreur "education_level required" pour professeur

**Cause** : Le trigger exige education_level pour les professeurs

**Solution** : Réexécuter la migration 007-complete-profile-all-users.sql

---

## ✅ CHECKLIST FINALE

- [x] Fichier d'inscription modifié (tous → complete-profile)
- [x] Middleware modifié (tous utilisateurs, pas seulement students)
- [x] Page complete-profile modifiée (champs conditionnels selon rôle)
- [x] Migration SQL créée (trigger pour tous les rôles)
- [ ] Migration SQL exécutée dans Supabase
- [ ] Serveur redémarré
- [ ] Test nouveau professeur → complete-profile OK
- [ ] Test formulaire professeur (sans niveau scolaire) OK
- [ ] Test redirection professeur → /teacher/dashboard OK
- [ ] Test nouvel étudiant → complete-profile OK
- [ ] Test formulaire étudiant (avec niveau scolaire) OK
- [ ] Test redirection étudiant → /dashboard OK

---

## 📊 IMPACT

### Avant
- ✅ Étudiants : profil obligatoire
- ❌ Professeurs : accès direct sans profil

### Après
- ✅ Étudiants : profil obligatoire (inchangé)
- ✅ Professeurs : profil obligatoire (NOUVEAU)

### Avantages
1. ✅ Données complètes pour tous les utilisateurs
2. ✅ Meilleure personnalisation
3. ✅ Statistiques plus précises
4. ✅ Communication facilitée (téléphone)
5. ✅ Paiements corrects (devise)

---

## 📝 NOTES

### Différences étudiants / professeurs

| Champ | Étudiant | Professeur |
|-------|----------|------------|
| Pays | ✅ Obligatoire | ✅ Obligatoire |
| Adresse | ⏭️ Optionnel | ⏭️ Optionnel |
| Téléphone | ✅ Obligatoire | ✅ Obligatoire |
| Devise | ✅ Obligatoire | ✅ Obligatoire |
| Niveau scolaire | ✅ Obligatoire | ❌ N/A |
| Type de bac | ✅ Conditionnel | ❌ N/A |

### Redirection après complete-profile

- **Étudiant** → `/dashboard`
- **Professeur** → `/teacher/dashboard`

---

*Système mis à jour - Tous les utilisateurs complètent maintenant leur profil*
*Déployez en suivant les 3 étapes ci-dessus (5 minutes)*
