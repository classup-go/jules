# 🔧 FIX: Teacher Classroom Page - Transition vers Course-based Architecture

**Date**: 28 janvier 2026
**Fichier**: `src/app/(dashboard)/teacher/classrooms/[id]/page.tsx`
**Problème**: Utilise encore `classroom_id` pour gérer les chapters au lieu de `course_id`

---

## 🔍 PROBLÈME IDENTIFIÉ

Le fichier [src/app/(dashboard)/teacher/classrooms/[id]/page.tsx](src/app/(dashboard)/teacher/classrooms/[id]/page.tsx) utilise l'ancienne architecture:

### Lignes problématiques:

1. **Ligne 121-128**: Récupère les chapters par `classroom_id`
```typescript
const { data: chaptersData } = await supabase
  .from('chapters')
  .select(`*,  lessons (*)`)
  .eq('classroom_id', id)  // ❌ Devrait utiliser course_id
```

2. **Ligne 193-201**: Insère un chapter avec `classroom_id`
```typescript
await supabase
  .from('chapters')
  .insert({
    classroom_id: id,  // ❌ Devrait utiliser course_id
    title: newChapterTitle,
    order_index: chapters.length,
    required_score: 75
  })
```

---

## ✅ SOLUTION

### Option A: Correction Minimale (Recommandé)

Modifier le fichier pour qu'il fonctionne avec la nouvelle architecture course-based:

#### 1. Modifier `fetchData()` pour récupérer chapters via courses

```typescript
const fetchData = async () => {
  const supabase = createClient()

  // Get classroom data
  const { data: classroomData } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', id)
    .single()

  if (classroomData) setClassroom(classroomData)

  // Get courses in this classroom
  const { data: coursesData } = await supabase
    .from('courses')
    .select('*')
    .eq('classroom_id', id)
    .order('created_at', { ascending: false })

  if (coursesData) {
    setCourses(coursesData)
  }

  // ✅ NEW: Get chapters via course_id
  const courseIds = coursesData?.map(c => c.id) || []

  const { data: chaptersData } = await supabase
    .from('chapters')
    .select(`
      *,
      lessons (*),
      courses!inner(classroom_id)
    `)
    .in('course_id', courseIds)  // ✅ Utilise course_id
    .order('order_index', { ascending: true })

  if (chaptersData) {
    setChapters(chaptersData.map(ch => ({
      ...ch,
      required_score: ch.required_score || 75,
      lessons: ch.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    })))
  }

  // ... reste du code
}
```

#### 2. Modifier `addChapter()` pour utiliser course_id

```typescript
const addChapter = async () => {
  if (!newChapterTitle.trim()) return

  const supabase = createClient()

  // ✅ Trouver le premier course de cette classroom
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id')
    .eq('classroom_id', id)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!coursesData || coursesData.length === 0) {
    alert('Aucun cours trouvé. Veuillez créer un cours d\'abord.')
    return
  }

  const courseId = coursesData[0].id

  // ✅ Insérer avec course_id
  const { error } = await supabase
    .from('chapters')
    .insert({
      course_id: courseId,  // ✅ Utilise course_id
      title: newChapterTitle,
      order_index: chapters.length,
      required_score: 75
    })

  if (!error) {
    setNewChapterTitle('')
    setShowAddChapter(false)
    fetchData()
  } else {
    alert('Erreur lors de la création du chapitre')
  }
}
```

---

### Option B: Redirection vers Nouveau Système (Si existe)

Si une nouvelle page `/teacher/courses/[id]` existe, rediriger automatiquement:

```typescript
export default function OldClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    // Récupérer le premier course de cette classroom
    const redirectToCourse = async () => {
      const supabase = createClient()
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('classroom_id', id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (coursesData && coursesData.length > 0) {
        router.replace(`/teacher/courses/${coursesData[0].id}`)
      } else {
        // Pas de course, créer un automatiquement
        const { data: newCourse } = await supabase
          .from('courses')
          .insert({
            classroom_id: id,
            title: 'Programme Principal',
            is_published: true
          })
          .select()
          .single()

        if (newCourse) {
          router.replace(`/teacher/courses/${newCourse.id}`)
        }
      }
    }

    redirectToCourse()
  }, [id, router])

  return <div>Redirection...</div>
}
```

---

### Option C: Désactiver complètement (Si obsolète)

Si ce fichier ne doit plus être utilisé:

```typescript
import { redirect } from 'next/navigation'

export default function OldClassroomPage() {
  redirect('/teacher/classes/create')
}
```

---

## 🧪 TESTS APRÈS CORRECTION

### Test 1: Affichage des chapters
1. Aller sur `/teacher/classrooms/[id]`
2. Vérifier que les chapters s'affichent correctement
3. Vérifier que les lessons s'affichent sous chaque chapter

### Test 2: Création d'un chapter
1. Cliquer sur "Ajouter un chapitre"
2. Entrer un titre
3. Vérifier que le chapter est créé avec `course_id` (pas `classroom_id`)

### Test 3: Vérification DB
```sql
-- Vérifier que les nouveaux chapters ont course_id
SELECT id, title, course_id, classroom_id
FROM chapters
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- Résultat attendu: course_id rempli, classroom_id NULL (ou vice-versa selon architecture)
```

---

## 📚 CONTEXTE

### Ancienne Architecture (Obsolète)
```
classrooms → chapters → lessons
```

### Nouvelle Architecture (Actuelle)
```
classrooms → courses → chapters → lessons
```

### Problème
Ce fichier essaie encore d'utiliser l'ancienne architecture directe `classroom → chapter`, mais le schéma DB a changé pour exiger `course → chapter`.

---

## ⚠️ IMPACT

### Avant le fix:
- ❌ Impossible de créer de nouveaux chapters depuis cette page
- ❌ Chapters existants avec `classroom_id` ne s'affichent peut-être pas
- ❌ Incohérence avec le reste de l'application

### Après le fix:
- ✅ Chapters créés correctement avec `course_id`
- ✅ Affichage cohérent des chapters existants
- ✅ Compatible avec le reste de l'architecture

---

## 🎯 RECOMMANDATION

**Je recommande Option A (Correction Minimale)** pour:
1. Maintenir la fonctionnalité existante
2. Minimiser les changements UI
3. Assurer la compatibilité avec le nouveau schéma

**Temps estimé**: 30-45 minutes

---

**Créé**: 28 janvier 2026
**Status**: 🔴 À CORRIGER - Bloque la création de chapters depuis l'interface teacher
**Priorité**: MOYENNE (si teacher utilise cette page) / BASSE (si nouvelle interface existe)
