# 🔧 FIX MIGRATION 007 - ERREUR ENUM currency_type

**Date**: 2026-01-24
**Erreur**: `invalid input value for enum currency_type: "XAF"`

---

## 🐛 PROBLÈME IDENTIFIÉ

La colonne `users.currency` utilise un type ENUM `currency_type` qui ne contient pas toutes les devises nécessaires (notamment XAF).

**Cause** : Migration précédente qui a créé un ENUM avec des valeurs limitées.

---

## ✅ SOLUTION

### Option 1 : Utiliser la migration corrigée (RECOMMANDÉ)

**Fichier** : `migrations/007-complete-profile-fixed.sql`

Cette migration :
1. Détecte si le type ENUM existe
2. Convertit la colonne `currency` en TEXT
3. Ajoute une contrainte CHECK avec toutes les devises

**Exécution** :
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de migrations/007-complete-profile-fixed.sql
```

---

### Option 2 : Fix manuel (si Option 1 échoue)

#### Étape 1 : Vérifier le type actuel
```sql
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'currency';
```

**Si `udt_name` = 'currency_type'** → La colonne utilise un ENUM

---

#### Étape 2 : Convertir en TEXT
```sql
-- Supprimer la contrainte existante si présente
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_currency_valid;

-- Convertir la colonne en TEXT en préservant les valeurs
ALTER TABLE users
  ALTER COLUMN currency TYPE TEXT
  USING currency::TEXT;
```

---

#### Étape 3 : Ajouter la contrainte CHECK
```sql
-- Ajouter la nouvelle contrainte avec toutes les devises
ALTER TABLE users
  ADD CONSTRAINT check_currency_valid
  CHECK (currency IS NULL OR currency IN ('EUR', 'TND', 'XOF', 'XAF', 'MAD', 'DZD', 'USD'));
```

---

#### Étape 4 : Mettre à jour les valeurs NULL
```sql
-- Mettre EUR par défaut pour les valeurs NULL
UPDATE users
SET currency = 'EUR'
WHERE currency IS NULL;
```

---

#### Étape 5 : Ajouter les autres colonnes
```sql
-- country
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;

-- address
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- education_level
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level TEXT;

-- bac_type
ALTER TABLE users ADD COLUMN IF NOT EXISTS bac_type TEXT;

-- profile_completed
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
```

---

#### Étape 6 : Ajouter la contrainte education_level
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_education_level_valid;

ALTER TABLE users
  ADD CONSTRAINT check_education_level_valid
  CHECK (education_level IS NULL OR education_level IN ('college', 'lycee', 'terminal', 'bac', 'university', 'other'));
```

---

#### Étape 7 : Créer les index
```sql
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users(currency);
CREATE INDEX IF NOT EXISTS idx_users_education_level ON users(education_level);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);
```

---

#### Étape 8 : Créer la fonction et le trigger
```sql
-- Fonction
CREATE OR REPLACE FUNCTION check_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    IF NEW.country IS NOT NULL
       AND NEW.phone IS NOT NULL
       AND NEW.currency IS NOT NULL
       AND NEW.education_level IS NOT NULL
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

-- Trigger
DROP TRIGGER IF EXISTS trigger_check_profile_complete ON users;

CREATE TRIGGER trigger_check_profile_complete
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_complete();
```

---

#### Étape 9 : Mettre à jour les profils existants
```sql
-- Professeurs : profil complet par défaut
UPDATE users
SET profile_completed = TRUE
WHERE role = 'teacher';

-- Étudiants : vérifier si profil complet
UPDATE users
SET profile_completed = (
  country IS NOT NULL
  AND phone IS NOT NULL
  AND currency IS NOT NULL
  AND education_level IS NOT NULL
)
WHERE role = 'student';
```

---

#### Étape 10 : Configurer les RLS policies
```sql
-- Policy SELECT
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

## 🔍 VÉRIFICATION

Après l'exécution, vérifier que tout fonctionne :

```sql
-- Vérifier les colonnes
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('country', 'address', 'phone', 'currency', 'education_level', 'bac_type', 'profile_completed')
ORDER BY column_name;
```

**Résultat attendu** :
- `currency` doit avoir `data_type = 'text'` (pas 'USER-DEFINED')
- Toutes les colonnes doivent être présentes

```sql
-- Vérifier les contraintes
SELECT
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name IN ('check_currency_valid', 'check_education_level_valid');
```

**Résultat attendu** :
- Contrainte `check_currency_valid` avec les 7 devises
- Contrainte `check_education_level_valid` avec les 6 niveaux

```sql
-- Vérifier les statistiques
SELECT
  role,
  COUNT(*) as total,
  COUNT(CASE WHEN profile_completed = TRUE THEN 1 END) as complets,
  COUNT(CASE WHEN profile_completed = FALSE OR profile_completed IS NULL THEN 1 END) as incomplets
FROM users
GROUP BY role;
```

---

## 🚀 APRÈS LE FIX

Une fois la migration réussie :

1. **Redémarrer le serveur**
   ```bash
   Ctrl+C
   npm run dev
   ```

2. **Tester la page complete-profile**
   - Créer un nouveau compte étudiant
   - Vérifier la redirection vers `/complete-profile`
   - Remplir le formulaire avec une devise (ex: TND, XAF)
   - Vérifier que la soumission fonctionne

3. **Vérifier en base**
   ```sql
   SELECT display_name, country, currency, education_level, profile_completed
   FROM users
   WHERE role = 'student'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

## 📝 NOTES

### Pourquoi ce problème ?

PostgreSQL utilise des types ENUM qui sont rigides. Une fois créés, ils ne peuvent pas être facilement modifiés pour ajouter des valeurs.

**Solution permanente** : Utiliser TEXT avec contrainte CHECK, qui est plus flexible.

### Devises supportées

- EUR (Euro)
- TND (Dinar tunisien)
- XOF (Franc CFA Ouest)
- XAF (Franc CFA Central) ← Cause de l'erreur
- MAD (Dirham marocain)
- DZD (Dinar algérien)
- USD (Dollar américain)

---

## 🆘 SI ÇA NE FONCTIONNE TOUJOURS PAS

### Erreur : "column currency already exists"

**Cause** : La colonne existe déjà

**Solution** : Sauter l'ajout de la colonne, passer directement à la conversion du type

### Erreur : "cannot cast type currency_type to text"

**Cause** : Problème de conversion ENUM → TEXT

**Solution** :
```sql
-- Créer une nouvelle colonne temporaire
ALTER TABLE users ADD COLUMN currency_new TEXT;

-- Copier les valeurs
UPDATE users SET currency_new = currency::TEXT;

-- Supprimer l'ancienne colonne
ALTER TABLE users DROP COLUMN currency;

-- Renommer la nouvelle colonne
ALTER TABLE users RENAME COLUMN currency_new TO currency;

-- Ajouter la contrainte
ALTER TABLE users
  ADD CONSTRAINT check_currency_valid
  CHECK (currency IS NULL OR currency IN ('EUR', 'TND', 'XOF', 'XAF', 'MAD', 'DZD', 'USD'));
```

---

## ✅ CHECKLIST

- [ ] Migration 007-complete-profile-fixed.sql exécutée
- [ ] Colonne `currency` convertie en TEXT
- [ ] Contrainte CHECK ajoutée avec 7 devises
- [ ] Toutes les colonnes créées (7 nouvelles)
- [ ] Trigger `check_profile_complete` créé
- [ ] Profils existants mis à jour
- [ ] RLS policies configurées
- [ ] Vérification : toutes les colonnes présentes
- [ ] Serveur redémarré
- [ ] Test : formulaire complete-profile fonctionne

---

*Fix Migration 007 - 2026-01-24*
