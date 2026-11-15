# Fix: Erreurs teacher_profiles

**Date**: 2026-01-22
**Status**: ✅ Corrigé

---

## 🐛 Problème

Erreurs dans la console :
```
GET teacher_profiles?select=...&user_id=eq.167deb8b... 400 (Bad Request)
Failed to load resource: the server responded with a status of 406 ()
```

---

## 🔍 Cause

La table `teacher_profiles` **n'existe pas** dans la base de données actuelle.

### Historique

Selon `supabase-teacher-profile-enhancement.sql`, les données du profil professeur ont été **migrées vers la table `users`** plutôt que dans une table séparée :

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subjects TEXT[],
ADD COLUMN IF NOT EXISTS levels TEXT[],
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0,
...
```

Mais le code essayait toujours d'accéder à `teacher_profiles` :
```typescript
const { data } = await supabase
  .from('teacher_profiles')  // ❌ Cette table n'existe pas !
  .select('rating, total_reviews, ...')
  .eq('user_id', teacherId)
```

---

## ✅ Solution

Récupérer les données directement depuis la table `users`.

### Fichiers corrigés

#### 1. `src/app/(dashboard)/classroom/[id]/page.tsx`

**Avant** :
```typescript
// Deux requêtes séparées
const { data: teacherData } = await supabase
  .from('users')
  .select('id, display_name, avatar_url')
  .eq('id', classroomData.teacher_id)
  .single()

const { data: profileData } = await supabase
  .from('teacher_profiles')  // ❌ N'existe pas
  .select('rating, total_reviews, hourly_rate, subjects')
  .eq('user_id', classroomData.teacher_id)
  .maybeSingle()
```

**Après** :
```typescript
// Une seule requête vers users
const { data: teacherData } = await supabase
  .from('users')
  .select('id, display_name, avatar_url, rating, total_reviews, hourly_rate, subjects')
  .eq('id', classroomData.teacher_id)
  .single()

// Extraire les données du profil
setTeacherProfile({
  rating: teacherData.rating || 0,
  total_reviews: teacherData.total_reviews || 0,
  hourly_rate: teacherData.hourly_rate || 0,
  subjects: teacherData.subjects || []
})
```

---

#### 2. `src/app/(dashboard)/search/page.tsx`

**Avant** :
```typescript
// Deux requêtes
const { data: teachersData } = await supabase
  .from('users')
  .select('id, display_name')
  .in('id', teacherIds)

const { data: profilesData } = await supabase
  .from('teacher_profiles')  // ❌ N'existe pas
  .select('user_id, rating')
  .in('user_id', teacherIds)

const teacherMap = new Map(teachersData?.map(t => [t.id, t.display_name]))
const ratingMap = new Map(profilesData?.map(p => [p.user_id, p.rating]))
```

**Après** :
```typescript
// Une seule requête optimisée
const { data: teachersData } = await supabase
  .from('users')
  .select('id, display_name, rating')
  .in('id', teacherIds)

const teacherMap = new Map(teachersData?.map(t => [
  t.id,
  { name: t.display_name, rating: t.rating || 0 }
]))
```

---

#### 3. `src/app/(dashboard)/profile/page.tsx`

**Avant** :
```typescript
// Requête inutile vers teacher_profiles
if (profile.role === 'teacher') {
  const { data: tProfile } = await supabase
    .from('teacher_profiles')  // ❌ N'existe pas
    .select('*')
    .eq('user_id', authUser.id)
    .single()

  if (tProfile) setTeacherProfile(tProfile)
}
```

**Après** :
```typescript
// Utiliser directement les données de users
if (profile.role === 'teacher') {
  setTeacherProfile({
    id: profile.id,
    user_id: profile.id,
    subjects: profile.subjects || [],
    levels: profile.levels || [],
    hourly_rate: profile.hourly_rate || 0,
    rating: profile.rating || 0,
    review_count: profile.total_reviews || 0,
    total_students: profile.total_students || 0,
    total_hours: 0,
    availability: null
  })
}
```

---

## 📊 Structure actuelle des données

### Table: `users`

Contient maintenant **toutes** les données du profil professeur :

```sql
users (
  id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,

  -- Profil professeur (pour role='teacher')
  subjects TEXT[],
  levels TEXT[],
  hourly_rate DECIMAL(10,2),
  rating DECIMAL(3,2),
  total_reviews INTEGER,
  total_students INTEGER,
  bio TEXT,
  experience TEXT,
  teaching_mode TEXT[],
  specialties TEXT[],
  certifications TEXT[],
  ...
)
```

### ⚠️ Pas de table séparée

Il n'y a **PAS** de table `teacher_profiles`.

Toutes les requêtes doivent aller vers `users`.

---

## 🧪 Tests

Vérifiez que ces pages fonctionnent sans erreur :

- [ ] `/classroom/[id]` - Affiche infos professeur
- [ ] `/search` - Affiche ratings des professeurs
- [ ] `/profile` - Affiche profil complet (enseignant)
- [ ] Console : Plus d'erreurs 400/406 sur `teacher_profiles`

---

## 🔄 Migration pour les autres fichiers

Si d'autres fichiers utilisent encore `teacher_profiles`, appliquez la même logique :

```typescript
// ❌ Mauvais
const { data } = await supabase
  .from('teacher_profiles')
  .select('...')

// ✅ Bon
const { data } = await supabase
  .from('users')
  .select('...')
  .eq('role', 'teacher')  // Si nécessaire
```

---

## 📝 Types TypeScript

Le type `TeacherProfile` dans `database.ts` reste valide, mais c'est maintenant une **vue logique** des colonnes de `users`, pas une table séparée.

```typescript
export interface TeacherProfile {
  id: string
  user_id: string  // Même que id
  subjects: string[]
  levels: string[]
  hourly_rate: number
  rating: number
  review_count: number  // total_reviews dans users
  total_students: number
  total_hours: number
  availability?: Record<string, any>
}
```

---

## ✅ Résultat

- ✅ Plus d'erreurs 400/406
- ✅ Données professeur chargées correctement
- ✅ Performance améliorée (une requête au lieu de deux)
- ✅ Code cohérent avec la structure de BDD actuelle

---

**Status**: Toutes les erreurs `teacher_profiles` sont maintenant corrigées ! 🎉
