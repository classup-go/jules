# Guide de Configuration des Buckets de Stockage

## 🐛 Problème Résolu

**Erreur originale**: "erreur buckets pour consultation de devoir"

**Cause**: Le composant d'upload utilisait `getPublicUrl()` sur un bucket privé, ce qui ne fonctionne pas. Les buckets privés nécessitent des URLs signées temporaires pour l'accès sécurisé.

## ✅ Solution Implémentée

### 1. **API pour les URLs Signées**
   - Nouveau endpoint: `/api/storage/signed-url`
   - Génère des URLs temporaires sécurisées (valides 1 heure)
   - Nécessite une authentification

### 2. **Composant d'Upload Modifié**
   - Stocke maintenant les **chemins de fichiers** au lieu des URLs complètes
   - Compatible avec les anciennes données (URLs complètes)

### 3. **Nouveau Composant d'Affichage**
   - `HomeworkFileDisplay`: Affiche les fichiers avec URLs signées
   - Génère automatiquement les URLs signées à la demande
   - Gère les erreurs de chargement

### 4. **Pages Mises à Jour**
   - Page de notation professeur: Affiche les fichiers soumis
   - Page de soumission étudiant: Affiche les fichiers et feedbacks

## 📦 Configuration des Buckets Supabase

### Buckets Requis

| Bucket | Type | Taille Max | Usage |
|--------|------|------------|-------|
| `homework-files` | Privé | 50 MB | Devoirs et corrections |
| `videos-private` | Privé | 500 MB | Vidéos de cours |
| `video-thumbnails` | Public | 5 MB | Miniatures vidéo |

### Vérification Automatique

```bash
# Installer les dépendances si nécessaire
npm install tsx

# Vérifier et créer les buckets
npx tsx scripts/verify-buckets.ts
```

### Configuration Manuelle

#### Option 1: Via le Dashboard Supabase

1. Aller sur **Storage** dans le dashboard Supabase
2. Cliquer sur **New bucket**
3. Pour chaque bucket:
   - Nom: `homework-files`, `videos-private`, ou `video-thumbnails`
   - Public: Cocher uniquement pour `video-thumbnails`
   - File size limit: 50MB, 500MB, ou 5MB
   - Allowed MIME types: Laisser vide pour `homework-files`

#### Option 2: Via SQL

Exécuter le fichier SQL dans l'éditeur SQL Supabase:

```bash
# Contenu dans supabase-create-buckets.sql
```

### Politiques RLS (Row Level Security)

Les politiques suivantes doivent être configurées pour `homework-files`:

#### 1. **Upload de fichiers (Students)**
```sql
CREATE POLICY "Students upload homework files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'homework-files'
  AND auth.role() = 'authenticated'
);
```

#### 2. **Lecture des fichiers (Authenticated users)**
```sql
CREATE POLICY "Users read own homework files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'homework-files'
  AND auth.role() = 'authenticated'
);
```

#### 3. **Suppression de fichiers (Own files only)**
```sql
CREATE POLICY "Users delete own homework files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## 🔧 Variables d'Environnement Requises

Pour le script de vérification:

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

**⚠️ IMPORTANT**: La `SUPABASE_SERVICE_ROLE_KEY` doit rester **secrète** et ne jamais être exposée côté client.

## 🧪 Test de la Configuration

### 1. Vérifier les Buckets
```bash
npx tsx scripts/verify-buckets.ts
```

### 2. Tester l'Upload
1. Se connecter en tant qu'étudiant
2. Aller sur un devoir
3. Uploader un fichier
4. Vérifier qu'il apparaît dans la liste

### 3. Tester la Consultation
1. Se connecter en tant que professeur
2. Aller sur les soumissions
3. Cliquer sur une soumission avec fichiers
4. Vérifier que les fichiers sont téléchargeables

## 🐞 Dépannage

### Erreur: "Failed to generate signed URL"

**Causes possibles**:
- Le bucket n'existe pas → Exécuter le script de vérification
- Les politiques RLS bloquent l'accès → Vérifier les politiques
- Le fichier n'existe pas → Vérifier le chemin du fichier

### Erreur: "Bucket not found"

**Solution**:
```bash
npx tsx scripts/verify-buckets.ts
```

Ou créer manuellement via le dashboard Supabase.

### Les anciennes URLs ne fonctionnent plus

**Explication**: Les anciennes données contiennent des URLs publiques pour un bucket privé.

**Solutions**:
1. **Court terme**: Le composant `HomeworkFileDisplay` détecte automatiquement les URLs complètes et les utilise directement
2. **Long terme**: Migrer les données pour stocker uniquement les chemins

### Migration des Données (Optionnel)

Pour migrer les anciennes URLs vers des chemins:

```sql
-- Exemple pour les soumissions
UPDATE submissions
SET submission_files = ARRAY(
  SELECT regexp_replace(url, '.*homework-files/', '', 'g')
  FROM unnest(submission_files) AS url
  WHERE url LIKE '%homework-files%'
)
WHERE array_length(submission_files, 1) > 0;
```

## 📚 Fichiers Modifiés

### Nouveaux Fichiers
- `src/app/api/storage/signed-url/route.ts` - API pour URLs signées
- `src/components/homework/homework-file-display.tsx` - Composant d'affichage
- `scripts/verify-buckets.ts` - Script de vérification
- `STORAGE-BUCKETS-GUIDE.md` - Ce guide

### Fichiers Modifiés
- `src/components/homework/homework-file-upload.tsx` - Stocke les chemins
- `src/app/(dashboard)/teacher/submissions/[id]/grade/page.tsx` - Affichage fichiers
- `src/app/(dashboard)/student/submissions/[id]/page.tsx` - Affichage fichiers

## 🔐 Sécurité

### Bonnes Pratiques
✅ Buckets privés pour les devoirs (confidentialité)
✅ URLs signées avec expiration (1 heure)
✅ Authentication requise pour l'accès
✅ Politiques RLS pour contrôler les permissions
✅ Taille de fichiers limitée

### À Éviter
❌ Utiliser `getPublicUrl()` sur des buckets privés
❌ Stocker des URLs signées dans la base de données (elles expirent)
❌ Donner accès public aux fichiers de devoirs
❌ Partager la `SUPABASE_SERVICE_ROLE_KEY`

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifier la console du navigateur pour les erreurs
2. Vérifier les logs serveur (`npm run dev`)
3. Exécuter le script de vérification
4. Vérifier les politiques RLS dans Supabase
5. Consulter la documentation Supabase Storage
