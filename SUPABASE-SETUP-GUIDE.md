# Guide de Configuration Supabase pour le Streaming Vidéo

## Étape 1 : Exécuter les Scripts SQL

1. Allez dans votre projet Supabase Dashboard
2. Cliquez sur "SQL Editor" dans la navigation de gauche
3. Cliquez sur "New Query"
4. Copiez tout le contenu de `supabase-video-setup.sql`
5. Collez-le dans l'éditeur SQL
6. Cliquez sur "Run" pour exécuter tous les scripts

✅ **Résultat attendu :** Les tables `video_access_tokens` et `video_analytics` sont créées, la table `lessons` est modifiée, et les politiques RLS sont appliquées.

---

## Étape 2 : Créer les Buckets de Stockage

### 2.1 Créer le bucket `videos-private`

1. Dans Supabase Dashboard, allez dans **Storage**
2. Cliquez sur **"Create a new bucket"**
3. Configurez comme suit :
   - **Name:** `videos-private`
   - **Public bucket:** ❌ **NON** (décoché)
   - **File size limit:** `524288000` (500MB en bytes)
   - **Allowed MIME types:** `video/mp4,video/webm,video/quicktime,video/x-msvideo`
4. Cliquez sur **"Create bucket"**

### 2.2 Créer le bucket `video-thumbnails` (Optionnel)

1. Cliquez sur **"Create a new bucket"**
2. Configurez comme suit :
   - **Name:** `video-thumbnails`
   - **Public bucket:** ✅ **OUI** (coché pour performance)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** `image/jpeg,image/png,image/webp`
3. Cliquez sur **"Create bucket"**

### 2.3 Rendre le bucket `courses` privé (si pas déjà fait)

1. Dans la liste des buckets, trouvez `courses`
2. Cliquez sur les **3 points** (⋮) → **"Edit bucket"**
3. Décochez **"Public bucket"** si coché
4. Cliquez sur **"Save"**

---

## Étape 3 : Configurer les Politiques de Stockage

### 3.1 Politiques pour `videos-private`

1. Dans Storage, cliquez sur le bucket `videos-private`
2. Allez dans l'onglet **"Policies"**
3. Cliquez sur **"New Policy"**

#### Politique 1 : Upload (INSERT)
- **Name:** `Authenticated users can upload videos`
- **Policy definition:** Custom
- **Target roles:** `authenticated`
- **Command:** `INSERT`
- **Using expression (WITH CHECK):**
  ```sql
  bucket_id = 'videos-private' AND auth.role() = 'authenticated'
  ```
- Cliquez sur **"Review"** puis **"Save policy"**

#### Politique 2 : Lecture via Signed URLs (SELECT)
- **Name:** `Service role can read videos`
- **Policy definition:** Custom
- **Target roles:** `authenticated`
- **Command:** `SELECT`
- **Using expression:**
  ```sql
  bucket_id = 'videos-private' AND auth.role() = 'authenticated'
  ```
- Cliquez sur **"Review"** puis **"Save policy"**

> **Note :** L'accès aux vidéos pour les étudiants se fera via signed URLs générées par l'API, pas directement via RLS.

---

## Étape 4 : Vérification

### 4.1 Vérifier les tables SQL

Dans SQL Editor, exécutez :

```sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('video_access_tokens', 'video_analytics');

-- Vérifier les nouvelles colonnes de lessons
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lessons'
AND column_name IN ('storage_path', 'video_duration', 'video_size', 'thumbnail_url', 'processing_status');

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('lessons', 'video_access_tokens', 'video_analytics');
```

✅ **Résultat attendu :**
- 2 tables retournées (video_access_tokens, video_analytics)
- 5 colonnes retournées pour lessons
- Toutes les tables montrent `rowsecurity = true`

### 4.2 Vérifier les buckets Storage

1. Allez dans **Storage**
2. Vous devriez voir :
   - ✅ `videos-private` (Privé, 500MB limit)
   - ✅ `video-thumbnails` (Public, optionnel)
   - ✅ `courses` (Privé)
   - ✅ `avatars` (déjà existant)

### 4.3 Test d'upload (Optionnel)

1. Dans Storage, cliquez sur `videos-private`
2. Essayez d'uploader un fichier vidéo manuellement
3. Vérifiez que l'upload fonctionne
4. Vérifiez que vous ne pouvez PAS accéder à l'URL publique directement

---

## Étape 5 : Variables d'Environnement (Déjà configurées)

Vérifiez que votre `.env.local` contient :

```env
NEXT_PUBLIC_SUPABASE_URL=https://alcizrsvcrxkdgmvdwxn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Étapes Suivantes

Une fois la configuration Supabase terminée :

1. ✅ Implémenter les API endpoints (stream, analytics)
2. ✅ Créer les composants React (player, upload)
3. ✅ Tester le flux end-to-end
4. ✅ Migrer les vidéos existantes (si applicable)

---

## Dépannage

### Problème : "Failed to create bucket"
- **Solution :** Vérifiez les permissions de votre compte Supabase
- Essayez de vous reconnecter au dashboard

### Problème : "Policy creation failed"
- **Solution :** Vérifiez que RLS est activé sur la table
- Essayez de supprimer les anciennes politiques avec le même nom

### Problème : "Cannot upload to bucket"
- **Solution :** Vérifiez que la politique INSERT est créée
- Vérifiez que l'utilisateur est authentifié
- Vérifiez les MIME types acceptés

### Problème : "Signed URL returns 403"
- **Solution :** Vérifiez que le bucket est privé
- Vérifiez que le fichier existe bien dans le bucket
- Vérifiez que la politique SELECT permet l'accès

---

## Support

Si vous rencontrez des problèmes :
1. Consultez la [documentation Supabase Storage](https://supabase.com/docs/guides/storage)
2. Vérifiez les logs dans Supabase Dashboard → Logs
3. Testez avec l'API Supabase directement (via Postman)

---

✅ **Configuration terminée !** Vous pouvez maintenant passer à l'implémentation du code.
