/**
 * Script to verify Supabase storage buckets exist and create them if needed
 * Run with: npx tsx scripts/verify-buckets.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKETS = [
  {
    id: 'avatars',
    name: 'avatars',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  },
  {
    id: 'homework-files',
    name: 'homework-files',
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: null
  },
  {
    id: 'videos-private',
    name: 'videos-private',
    public: false,
    fileSizeLimit: 524288000, // 500MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg']
  },
  {
    id: 'video-thumbnails',
    name: 'video-thumbnails',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
];

async function verifyBuckets() {
  console.log('🔍 Vérification des buckets Supabase...\n');

  try {
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      console.error('❌ Erreur lors de la récupération des buckets:', listError);
      return;
    }

    console.log(`📦 Buckets existants: ${existingBuckets?.length || 0}`);
    existingBuckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'privé'})`);
    });
    console.log('');

    // Check and create missing buckets
    for (const bucket of BUCKETS) {
      const exists = existingBuckets?.find(b => b.id === bucket.id);

      if (exists) {
        console.log(`✅ Bucket "${bucket.id}" existe déjà`);
      } else {
        console.log(`⚠️  Bucket "${bucket.id}" n'existe pas, création...`);

        const { data, error: createError } = await supabase
          .storage
          .createBucket(bucket.id, {
            public: bucket.public,
            fileSizeLimit: bucket.fileSizeLimit,
            allowedMimeTypes: bucket.allowedMimeTypes
          });

        if (createError) {
          console.error(`   ❌ Erreur lors de la création: ${createError.message}`);
        } else {
          console.log(`   ✅ Bucket "${bucket.id}" créé avec succès`);
        }
      }
    }

    console.log('\n📋 Récapitulatif:');
    console.log('   - avatars: Photos de profil (public, 5MB)');
    console.log('   - homework-files: Fichiers de devoirs (privé, 50MB)');
    console.log('   - videos-private: Vidéos de cours (privé, 500MB)');
    console.log('   - video-thumbnails: Miniatures vidéo (public, 5MB)');

    console.log('\n⚠️  Note importante:');
    console.log('   Les politiques RLS (Row Level Security) doivent être configurées');
    console.log('   manuellement dans le dashboard Supabase ou via SQL.');
    console.log('   Référez-vous à supabase-create-buckets.sql pour les politiques.');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

verifyBuckets();
