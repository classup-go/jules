# Fix: Erreur lors de la mise à jour du profil

## 🔴 Problème
Message d'erreur affiché: "Erreur lors de la mise à jour du profil"

## ✅ Solution

### Étape 1: Vérifier les Colonnes de la Table `users`

La table `users` doit avoir toutes les colonnes suivantes:

```sql
-- Vérifier les colonnes existantes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Colonnes requises:**
- `id` (uuid, primary key)
- `email` (text)
- `display_name` (text)
- `role` (text: 'student' ou 'teacher')
- `avatar_url` (text, nullable)
- `bio` (text, nullable) - Pour professeurs
- `phone` (text, nullable)
- `location` (text, nullable)
- `level` (text, nullable) - Pour étudiants
- `experience` (text, nullable) - Pour professeurs
- `subjects` (text[], nullable) - Array pour professeurs
- `created_at` (timestamp)

### Étape 2: Ajouter les Colonnes Manquantes

Si des colonnes manquent, exécuter ce SQL dans Supabase SQL Editor:

```sql
-- Ajouter les colonnes si elles n'existent pas

-- Pour tous les utilisateurs
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Pour les étudiants
ALTER TABLE users
ADD COLUMN IF NOT EXISTS level TEXT;

-- Pour les professeurs
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS subjects TEXT[];
```

### Étape 3: Créer le Bucket `avatars`

Le bucket avatars doit exister pour les photos de profil:

**Option A: Via SQL (Rapide)**

```sql
-- Créer le bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Politiques d'accès
CREATE POLICY IF NOT EXISTS "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Authenticated upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);
```

**Option B: Avec le Script (Automatique)**

```bash
npx tsx scripts/verify-buckets.ts
```

### Étape 4: Tester la Mise à Jour du Profil

1. **Se connecter** sur http://localhost:3001
2. **Aller sur** Profile > Modifier le profil
3. **Modifier** votre nom, téléphone ou ville
4. **Cliquer** sur "Enregistrer"
5. **Vérifier** la console navigateur (F12) pour voir le message d'erreur détaillé

## 🐞 Messages d'Erreur Courants

### "column 'bio' does not exist"
**Solution**: La colonne `bio` n'existe pas dans la table `users`
```sql
ALTER TABLE users ADD COLUMN bio TEXT;
```

### "column 'subjects' does not exist"
**Solution**: La colonne `subjects` n'existe pas
```sql
ALTER TABLE users ADD COLUMN subjects TEXT[];
```

### "column 'level' does not exist"
**Solution**: La colonne `level` n'existe pas
```sql
ALTER TABLE users ADD COLUMN level TEXT;
```

### "new row violates check constraint"
**Solution**: Il y a une contrainte de validation. Vérifier les contraintes:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass;
```

## 🧪 Test Complet

### Pour un Étudiant:
1. Modifier le nom
2. Changer le téléphone
3. Sélectionner un niveau (6ème, Terminale, etc.)
4. Enregistrer ✅

### Pour un Professeur:
1. Modifier le nom
2. Écrire une bio
3. Sélectionner l'expérience
4. Choisir les matières enseignées
5. Enregistrer ✅

## 🔍 Debugging Avancé

### Voir l'Erreur Exacte dans la Console

J'ai ajouté des logs détaillés. Ouvrir la console du navigateur (F12) et chercher:
```
Profile update error: { ... }
```

Le message d'erreur affichera maintenant:
```
Erreur: [message d'erreur détaillé de Supabase]
```

### Vérifier les Permissions RLS

```sql
-- Vérifier les politiques sur la table users
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
```

Les utilisateurs doivent pouvoir mettre à jour leur propre ligne:
```sql
CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);
```

## ✅ Vérification Finale

Après avoir appliqué les corrections:

1. Rafraîchir la page du profil (Ctrl + F5)
2. Modifier quelques informations
3. Cliquer sur "Enregistrer"
4. Message de succès: "Profil mis à jour avec succès !" ✅

## 📞 Si le Problème Persiste

1. Ouvrir la console navigateur (F12)
2. Aller dans l'onglet Console
3. Copier le message d'erreur complet qui commence par "Profile update error:"
4. Vérifier que toutes les colonnes existent avec la bonne syntaxe SQL
