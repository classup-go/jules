# Fix Rapide: Erreur Buckets Supabase

## 🔴 Problème
Le professeur voit une "erreur buckets" quand il consulte les devoirs soumis.

## ✅ Solution en 2 Minutes

### Option 1: Via le Dashboard Supabase (Recommandé)

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Créer le Bucket `homework-files`**
   - Cliquer sur **Storage** dans le menu latéral
   - Cliquer sur **New bucket**
   - Configuration:
     - **Name**: `homework-files`
     - **Public bucket**: ❌ **DÉCOCHER** (important!)
     - **File size limit**: `52428800` (50 MB)
     - **Allowed MIME types**: Laisser vide
   - Cliquer sur **Create bucket**

3. **Configurer les Politiques RLS**
   - Après création, cliquer sur le bucket `homework-files`
   - Aller dans l'onglet **Policies**
   - Cliquer sur **New Policy**

   **Politique 1 - Upload (Students)**
   ```sql
   CREATE POLICY "Students upload homework files"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'homework-files'
     AND auth.role() = 'authenticated'
   );
   ```

   **Politique 2 - Read (Authenticated)**
   ```sql
   CREATE POLICY "Users read homework files"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'homework-files'
     AND auth.role() = 'authenticated'
   );
   ```

   **Politique 3 - Delete (Own files)**
   ```sql
   CREATE POLICY "Users delete own files"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'homework-files'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

### Option 2: Via SQL (Plus rapide)

1. **Ouvrir l'éditeur SQL**
   - Aller sur https://supabase.com/dashboard
   - Cliquer sur **SQL Editor** dans le menu

2. **Exécuter ce script**
   ```sql
   -- Create homework-files bucket
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'homework-files',
     'homework-files',
     false,
     52428800, -- 50MB
     NULL
   )
   ON CONFLICT (id) DO NOTHING;

   -- Policy: Students upload homework files
   CREATE POLICY IF NOT EXISTS "Students upload homework files"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'homework-files'
     AND auth.role() = 'authenticated'
   );

   -- Policy: Users read homework files
   CREATE POLICY IF NOT EXISTS "Users read homework files"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'homework-files'
     AND auth.role() = 'authenticated'
   );

   -- Policy: Users delete own files
   CREATE POLICY IF NOT EXISTS "Users delete own files"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'homework-files'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

3. **Cliquer sur Run** (ou F5)

## 🧪 Vérification

Après configuration:

1. **Étudiant**: Se connecter et soumettre un devoir avec fichier
2. **Professeur**: Consulter la soumission et vérifier que les fichiers sont visibles
3. **Test téléchargement**: Cliquer sur "Voir le fichier"

## ❓ Dépannage

### Erreur: "Failed to generate signed URL"
- Vérifier que le bucket `homework-files` existe
- Vérifier que les politiques RLS sont bien créées
- Vérifier dans Storage > homework-files > Policies

### Erreur: "Bucket not found"
- Le bucket n'a pas été créé
- Recommencer l'Option 1 ou 2 ci-dessus

### Les fichiers ne s'affichent pas
- Vérifier la console navigateur (F12) pour voir l'erreur exacte
- Vérifier que `NEXT_PUBLIC_SUPABASE_URL` est configuré dans `.env.local`
- Redémarrer le serveur dev: `npm run dev`

## 📝 Variables d'Environnement Requises

Dans `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-key (pour le script uniquement)
```

## 🔄 Après Configuration

Les problèmes suivants seront résolus:
- ✅ Professeur peut voir les fichiers soumis
- ✅ Étudiant peut soumettre des fichiers
- ✅ Étudiant peut voir ses propres soumissions
- ✅ URLs signées générées automatiquement (valides 1h)
