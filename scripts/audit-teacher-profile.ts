import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTeacherProfile() {
  console.log('🔍 Audit du Système de Profil Professeur\n');
  console.log('='.repeat(60));

  // 1. Vérifier les colonnes de la table users
  console.log('\n📊 1. VÉRIFICATION DES COLONNES (table users)');
  console.log('-'.repeat(60));

  const columnsToCheck = [
    'phone',
    'address',
    'city',
    'postal_code',
    'bio',
    'experience',
    'subjects',
    'levels',
    'teaching_mode',
    'hourly_rate',
    'can_travel',
    'travel_distance',
    'specialties',
    'certifications',
    'languages',
    'rating',
    'total_reviews',
    'total_students',
    'profile_completed',
    'verified',
    'is_available'
  ];

  let columns = null, columnsError = null;
  try {
    const result = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name IN ('phone', 'city', 'subjects', 'levels', 'teaching_mode', 'hourly_rate', 'rating', 'profile_completed')
      `
    });
    columns = result.data;
    columnsError = result.error;
  } catch (err) {
    columnsError = 'Cannot check columns';
  }

  // Alternative: essayer de faire un SELECT avec les nouvelles colonnes
  const { data: testUser, error: testError } = await supabase
    .from('users')
    .select('id, phone, city, subjects, levels, teaching_mode, hourly_rate, rating, profile_completed')
    .limit(1)
    .single();

  if (testError) {
    console.log('❌ Colonnes manquantes détectées !');
    console.log('   Erreur:', testError.message);
    console.log('\n💡 SOLUTION:');
    console.log('   Exécutez le script SQL: supabase-teacher-profile-enhancement.sql');
  } else {
    console.log('✅ Colonnes présentes dans la table users');
    console.log('   Colonnes vérifiées: phone, city, subjects, levels, teaching_mode, hourly_rate, rating, profile_completed');
  }

  // 2. Vérifier la table teacher_reviews
  console.log('\n📊 2. VÉRIFICATION DE LA TABLE teacher_reviews');
  console.log('-'.repeat(60));

  const { data: reviews, error: reviewsError } = await supabase
    .from('teacher_reviews')
    .select('id')
    .limit(1);

  if (reviewsError) {
    console.log('❌ Table teacher_reviews manquante !');
    console.log('   Erreur:', reviewsError.message);
  } else {
    console.log('✅ Table teacher_reviews existe');
  }

  // 3. Vérifier la table teacher_availability
  console.log('\n📊 3. VÉRIFICATION DE LA TABLE teacher_availability');
  console.log('-'.repeat(60));

  const { data: availability, error: availabilityError } = await supabase
    .from('teacher_availability')
    .select('id')
    .limit(1);

  if (availabilityError) {
    console.log('❌ Table teacher_availability manquante !');
    console.log('   Erreur:', availabilityError.message);
  } else {
    console.log('✅ Table teacher_availability existe');
  }

  // 4. Compter les professeurs
  console.log('\n👥 4. STATISTIQUES DES PROFESSEURS');
  console.log('-'.repeat(60));

  const { count: totalTeachers, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher');

  if (countError) {
    console.log('❌ Erreur lors du comptage:', countError.message);
  } else {
    console.log('📊 Nombre total de professeurs:', totalTeachers || 0);
  }

  // 5. Vérifier les profils complétés
  if (!testError) {
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id, display_name, profile_completed, is_available, subjects, hourly_rate')
      .eq('role', 'teacher');

    if (!teachersError && teachers) {
      const completed = teachers.filter((t: any) => t.profile_completed).length;
      const available = teachers.filter((t: any) => t.is_available).length;
      const withSubjects = teachers.filter((t: any) => t.subjects && t.subjects.length > 0).length;
      const withRate = teachers.filter((t: any) => t.hourly_rate && t.hourly_rate > 0).length;

      console.log('   Profils complétés:', completed, '/', teachers.length);
      console.log('   Disponibles:', available, '/', teachers.length);
      console.log('   Avec matières:', withSubjects, '/', teachers.length);
      console.log('   Avec tarif:', withRate, '/', teachers.length);

      if (completed === 0) {
        console.log('\n⚠️  ATTENTION: Aucun profil professeur complété !');
        console.log('   Les étudiants ne verront aucun résultat dans la recherche.');
      }
    }
  }

  // 6. Vérifier les routes Next.js
  console.log('\n🌐 6. VÉRIFICATION DES ROUTES');
  console.log('-'.repeat(60));

  const routes = [
    { path: 'src/app/(dashboard)/teacher/profile/complete/page.tsx', name: 'Complétion de profil professeur' },
    { path: 'src/app/(dashboard)/find-teachers/page.tsx', name: 'Recherche de professeurs' },
    { path: 'src/app/(dashboard)/teachers/[id]/page.tsx', name: 'Profil public professeur' },
  ];

  const fs = require('fs');
  const path = require('path');

  routes.forEach(route => {
    const fullPath = path.join(process.cwd(), route.path);
    if (fs.existsSync(fullPath)) {
      console.log('✅', route.name);
      console.log('   ', route.path);
    } else {
      console.log('❌', route.name, '- MANQUANT');
      console.log('   ', route.path);
    }
  });

  // 7. Vérifier les types TypeScript
  console.log('\n📝 7. VÉRIFICATION DES TYPES');
  console.log('-'.repeat(60));

  const typePath = path.join(process.cwd(), 'src/types/teacher-profile.ts');
  if (fs.existsSync(typePath)) {
    console.log('✅ Fichier de types teacher-profile.ts existe');
  } else {
    console.log('❌ Fichier de types teacher-profile.ts manquant');
  }

  // 8. Résumé et recommandations
  console.log('\n' + '='.repeat(60));
  console.log('📋 RÉSUMÉ ET RECOMMANDATIONS');
  console.log('='.repeat(60));

  const issues: string[] = [];

  if (testError) {
    issues.push('Les colonnes du profil professeur sont manquantes');
  }
  if (reviewsError) {
    issues.push('La table teacher_reviews est manquante');
  }
  if (availabilityError) {
    issues.push('La table teacher_availability est manquante');
  }

  if (issues.length > 0) {
    console.log('\n❌ PROBLÈMES DÉTECTÉS:\n');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });

    console.log('\n✅ SOLUTION:');
    console.log('\n   1. Ouvrir Supabase Dashboard → SQL Editor');
    console.log('   2. Copier le contenu de: supabase-teacher-profile-enhancement.sql');
    console.log('   3. Coller dans l\'éditeur SQL');
    console.log('   4. Exécuter le script');
    console.log('   5. Relancer cet audit: npm run audit:teacher-profile');
  } else if (totalTeachers === 0 || (teachers && teachers.filter((t: any) => t.profile_completed).length === 0)) {
    console.log('\n⚠️  CONFIGURATION OK mais:');
    console.log('\n   Aucun profil professeur complété.');
    console.log('\n✅ SOLUTION:');
    console.log('\n   1. Se connecter en tant que professeur');
    console.log('   2. Aller sur: http://localhost:3001/teacher/profile/complete');
    console.log('   3. Compléter les 4 étapes du wizard');
    console.log('   4. Les étudiants pourront voir ce profil dans la recherche');
  } else {
    console.log('\n✅ Système de profil professeur: OPÉRATIONNEL');
    console.log('\n📊 État actuel:');
    console.log(`   • ${totalTeachers} professeur(s) inscrit(s)`);
    if (teachers) {
      console.log(`   • ${teachers.filter((t: any) => t.profile_completed).length} profil(s) complété(s)`);
      console.log(`   • ${teachers.filter((t: any) => t.is_available).length} professeur(s) disponible(s)`);
    }
    console.log('\n🚀 URLs disponibles:');
    console.log('   • Professeurs: http://localhost:3001/teacher/profile/complete');
    console.log('   • Étudiants: http://localhost:3001/find-teachers');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Audit terminé\n');
}

// Variables globales pour éviter les erreurs
let teachers: any = null;

auditTeacherProfile().catch(console.error);
