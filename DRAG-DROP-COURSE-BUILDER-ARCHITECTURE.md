# Architecture Drag & Drop Course Builder

## 🎯 Objectif

Créer un système de gestion de cours intuitif avec drag & drop permettant:
- Réorganiser les chapitres d'un cours
- Réorganiser les leçons dans un chapitre
- Créer/modifier/supprimer des chapitres et leçons
- Visualiser la structure complète du cours
- Sauvegarder automatiquement l'ordre

---

## 📊 Architecture Actuelle

### Base de Données
```sql
classrooms (id, title, subject, level, teacher_id, ...)
├── chapters (id, classroom_id, title, order_index, ...)
│   └── lessons (id, chapter_id, title, type, order_index, ...)
```

**Champs d'ordre existants:**
- `chapters.order_index` - Position du chapitre dans le cours
- `lessons.order_index` - Position de la leçon dans le chapitre

---

## 🎨 Design Proposé

### Interface Utilisateur

```
┌─────────────────────────────────────────────────┐
│ 📚 Gérer le Cours: Mathématiques Terminale     │
├─────────────────────────────────────────────────┤
│                                                 │
│  [+ Nouveau Chapitre]           [💾 Sauvegarder]│
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ⋮⋮ 1. Limites et Continuité          [⚙️] │ │
│  ├───────────────────────────────────────────┤ │
│  │  ⋮ 1.1 Introduction aux limites       [⚙️] │ │
│  │  ⋮ 1.2 Calcul de limites              [⚙️] │ │
│  │  ⋮ 1.3 QCM - Limites                  [⚙️] │ │
│  │  [+ Ajouter une leçon]                    │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ⋮⋮ 2. Dérivées                        [⚙️] │ │
│  ├───────────────────────────────────────────┤ │
│  │  ⋮ 2.1 Définition de la dérivée       [⚙️] │ │
│  │  ⋮ 2.2 Techniques de dérivation       [⚙️] │ │
│  │  [+ Ajouter une leçon]                    │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘

Légende:
⋮⋮ = Poignée de drag pour chapitres
⋮  = Poignée de drag pour leçons
[⚙️] = Menu options (éditer, supprimer, dupliquer)
```

---

## 🛠️ Technologies

### Bibliothèque de Drag & Drop

**Choix: @dnd-kit/core**

Raisons:
- ✅ Moderne et maintenu activement
- ✅ Performant (utilise CSS transforms)
- ✅ Accessible (ARIA, keyboard support)
- ✅ Flexible (supporte multi-conteneurs)
- ✅ Compatible Next.js 14 + React 18
- ✅ TypeScript natif

Alternatives considérées:
- ❌ react-beautiful-dnd (déprécié, pas de support Next.js 14)
- ❌ react-dnd (complexe, vieille API)

**Packages nécessaires:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 📐 Structure des Composants

### Hiérarchie

```
CourseBuilder (page principale)
├── DndContext (contexte global)
│   ├── ChapterList (liste des chapitres)
│   │   ├── SortableContext (chapitres triables)
│   │   │   └── ChapterItem (chapitre draggable)
│   │   │       ├── ChapterHeader (titre + poignée)
│   │   │       └── LessonList (leçons du chapitre)
│   │   │           ├── SortableContext (leçons triables)
│   │   │           │   └── LessonItem (leçon draggable)
│   │   │           │       └── LessonCard (titre + icône + durée)
│   │   │           └── AddLessonButton
│   │   └── AddChapterButton
│   └── DragOverlay (preview pendant le drag)
```

### Composants Clés

**1. CourseBuilder (Page principale)**
```typescript
// src/app/(dashboard)/teacher/courses/[id]/builder/page.tsx
export default function CourseBuilderPage({ params }: { params: { id: string } }) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Gestion du drag & drop
  const handleDragStart = (event) => { ... }
  const handleDragEnd = (event) => { ... }
  const handleDragOver = (event) => { ... }

  // Sauvegarde de l'ordre
  const saveOrder = async () => { ... }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ChapterList chapters={chapters} />
      <DragOverlay>{activeId ? <DragPreview id={activeId} /> : null}</DragOverlay>
    </DndContext>
  )
}
```

**2. ChapterItem (Chapitre draggable)**
```typescript
// src/components/course-builder/ChapterItem.tsx
export function ChapterItem({ chapter }: { chapter: Chapter }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: chapter.id,
  })

  return (
    <div ref={setNodeRef} style={{ transform, transition }}>
      <div className="chapter-header">
        <button {...attributes} {...listeners}>⋮⋮</button>
        <h3>{chapter.title}</h3>
        <ChapterMenu chapterId={chapter.id} />
      </div>
      <LessonList chapterId={chapter.id} lessons={chapter.lessons} />
    </div>
  )
}
```

**3. LessonItem (Leçon draggable)**
```typescript
// src/components/course-builder/LessonItem.tsx
export function LessonItem({ lesson }: { lesson: Lesson }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lesson.id,
    data: { chapterId: lesson.chapter_id }
  })

  return (
    <div ref={setNodeRef} style={{ transform, transition }}>
      <button {...attributes} {...listeners}>⋮</button>
      <LessonIcon type={lesson.type} />
      <span>{lesson.title}</span>
      <span>{lesson.duration_minutes}min</span>
      <LessonMenu lessonId={lesson.id} />
    </div>
  )
}
```

---

## 🔄 Logique de Drag & Drop

### Types de Drag Supportés

1. **Chapitre → Chapitre** (réorganiser chapitres)
2. **Leçon → Leçon (même chapitre)** (réorganiser leçons)
3. **Leçon → Leçon (autre chapitre)** (déplacer entre chapitres)

### Algorithme de Réorganisation

**Scénario 1: Réorganiser chapitres**
```typescript
function reorderChapters(chapters: Chapter[], oldIndex: number, newIndex: number) {
  const result = Array.from(chapters)
  const [removed] = result.splice(oldIndex, 1)
  result.splice(newIndex, 0, removed)

  // Recalculer order_index
  return result.map((chapter, index) => ({
    ...chapter,
    order_index: index
  }))
}
```

**Scénario 2: Réorganiser leçons dans un chapitre**
```typescript
function reorderLessons(lessons: Lesson[], oldIndex: number, newIndex: number) {
  const result = Array.from(lessons)
  const [removed] = result.splice(oldIndex, 1)
  result.splice(newIndex, 0, removed)

  return result.map((lesson, index) => ({
    ...lesson,
    order_index: index
  }))
}
```

**Scénario 3: Déplacer leçon vers autre chapitre**
```typescript
function moveLessonToChapter(
  sourceChapter: Chapter,
  targetChapter: Chapter,
  lessonId: string,
  targetIndex: number
) {
  // Retirer de source
  const lesson = sourceChapter.lessons.find(l => l.id === lessonId)
  const newSourceLessons = sourceChapter.lessons
    .filter(l => l.id !== lessonId)
    .map((l, i) => ({ ...l, order_index: i }))

  // Ajouter à target
  const newTargetLessons = [...targetChapter.lessons]
  newTargetLessons.splice(targetIndex, 0, { ...lesson, chapter_id: targetChapter.id })
  const reindexed = newTargetLessons.map((l, i) => ({ ...l, order_index: i }))

  return { newSourceLessons, newTargetLessons }
}
```

---

## 🌐 API Endpoints

### Endpoints à Créer

**1. Réorganiser Chapitres**
```typescript
// PUT /api/chapters/reorder
{
  classroomId: string
  chapters: Array<{ id: string, order_index: number }>
}

Response: { success: true, updated: number }
```

**2. Réorganiser Leçons**
```typescript
// PUT /api/lessons/reorder
{
  chapterId: string
  lessons: Array<{ id: string, order_index: number }>
}

Response: { success: true, updated: number }
```

**3. Déplacer Leçon vers Autre Chapitre**
```typescript
// PUT /api/lessons/[id]/move
{
  lessonId: string
  targetChapterId: string
  targetIndex: number
}

Response: { success: true, lesson: Lesson }
```

**4. Créer Chapitre**
```typescript
// POST /api/chapters
{
  classroomId: string
  title: string
  description?: string
}

Response: { success: true, chapter: Chapter }
```

**5. Créer Leçon**
```typescript
// POST /api/lessons
{
  chapterId: string
  title: string
  type: 'video' | 'pdf' | 'text' | 'qcm' | 'micro_learning'
  duration_minutes: number
}

Response: { success: true, lesson: Lesson }
```

---

## 💾 Stratégie de Sauvegarde

### Approche: Sauvegarde Manuelle avec Auto-save

**Sauvegarde Manuelle:**
- Bouton "Sauvegarder" visible en permanence
- Badge "Non sauvegardé" si changements en attente
- Sauvegarde toutes les modifications d'ordre en batch

**Auto-save (optionnel):**
- Debounce de 2 secondes après chaque drag
- Sauvegarde automatique en arrière-plan
- Notification discrète "Sauvegardé ✓"

**Implémentation:**
```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [isSaving, setIsSaving] = useState(false)

const saveAllChanges = async () => {
  setIsSaving(true)

  // Batch update chapters
  await fetch('/api/chapters/reorder', {
    method: 'PUT',
    body: JSON.stringify({
      classroomId,
      chapters: chapters.map(ch => ({ id: ch.id, order_index: ch.order_index }))
    })
  })

  // Batch update lessons per chapter
  for (const chapter of chapters) {
    await fetch('/api/lessons/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        chapterId: chapter.id,
        lessons: chapter.lessons.map(l => ({ id: l.id, order_index: l.order_index }))
      })
    })
  }

  setHasUnsavedChanges(false)
  setIsSaving(false)
}
```

---

## 🎨 Styles et UX

### Design System

**Chapitres:**
- Background: #ffffff
- Border: 1px solid #e5e7eb
- Border-radius: 12px
- Padding: 16px
- Drag handle: Gris foncé, 2 colonnes de 3 points

**Leçons:**
- Background: #f9fafb
- Border: 1px solid #e5e7eb
- Border-radius: 8px
- Padding: 12px
- Drag handle: Gris clair, 1 colonne de 3 points

**Interactions:**
- Hover: Border bleu (#2b8cee)
- Dragging: Opacity 0.5, scale 1.02
- Drop target: Background bleu clair, border dashed

**Icônes de Leçons:**
- 📹 Video
- 📄 PDF
- 📝 Text
- ✅ QCM
- ⚡ Micro-learning

---

## 🔐 Permissions et Sécurité

### Vérifications Côté Serveur

**Toutes les API routes doivent vérifier:**
1. ✅ Utilisateur est authentifié
2. ✅ Utilisateur est un professeur
3. ✅ Professeur est propriétaire du cours (classroom.teacher_id === user.id)
4. ✅ Chapitres/leçons appartiennent bien au cours
5. ✅ Order_index sont valides (0, 1, 2, 3, ...)

**Exemple:**
```typescript
// api/chapters/reorder/route.ts
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { classroomId, chapters } = await request.json()

  // Vérifier ownership
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('teacher_id')
    .eq('id', classroomId)
    .single()

  if (classroom.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mettre à jour
  for (const chapter of chapters) {
    await supabase
      .from('chapters')
      .update({ order_index: chapter.order_index })
      .eq('id', chapter.id)
  }

  return NextResponse.json({ success: true })
}
```

---

## 📱 Responsive Design

### Desktop (> 1024px)
- Affichage complet avec sidebar
- Drag & drop fluide
- Preview en overlay

### Tablet (768px - 1024px)
- Affichage condensé
- Drag & drop simplifié

### Mobile (< 768px)
- Boutons "↑↓" pour réorganiser (pas de drag)
- Vue en accordéon
- Boutons "Déplacer" avec menu contextuel

---

## 🚀 Plan d'Implémentation

### Phase 1: Setup (30 min)
1. ✅ Installer @dnd-kit packages
2. ✅ Créer structure de dossiers
3. ✅ Créer types TypeScript

### Phase 2: API (1h)
4. ✅ Créer endpoint `/api/chapters/reorder`
5. ✅ Créer endpoint `/api/lessons/reorder`
6. ✅ Créer endpoint `/api/lessons/[id]/move`
7. ✅ Ajouter tests de permissions

### Phase 3: Composants de Base (1h30)
8. ✅ Créer `ChapterItem` draggable
9. ✅ Créer `LessonItem` draggable
10. ✅ Créer `DragOverlay` preview
11. ✅ Créer icônes et styles

### Phase 4: Logique Drag & Drop (2h)
12. ✅ Implémenter handleDragStart
13. ✅ Implémenter handleDragEnd
14. ✅ Implémenter handleDragOver
15. ✅ Gérer multi-conteneurs (chapitres)
16. ✅ Gérer déplacement entre chapitres

### Phase 5: Sauvegarde (30 min)
17. ✅ Implémenter batch save
18. ✅ Ajouter loading states
19. ✅ Ajouter notifications de succès/erreur

### Phase 6: UX Polish (1h)
20. ✅ Ajouter animations
21. ✅ Ajouter confirmation de suppression
22. ✅ Ajouter shortcuts clavier
23. ✅ Responsive mobile

### Phase 7: Tests (30 min)
24. ✅ Tester tous les scénarios de drag
25. ✅ Tester permissions
26. ✅ Tester sauvegarde

**Durée totale estimée: 7 heures**

---

## 📝 Notes Techniques

### Performance

**Optimisations:**
- Utiliser `useMemo` pour les listes triées
- Virtualisation pour >50 leçons (`react-window`)
- Debounce sur auto-save (2s)
- Batch updates (1 requête par chapitre)

### Accessibilité

**Keyboard Navigation:**
- Tab: Naviguer entre items
- Space: Activer drag mode
- Arrow keys: Déplacer item
- Escape: Annuler drag

**Screen Readers:**
- ARIA labels sur drag handles
- Announcements de position ("Chapitre 1 déplacé en position 3")

---

## 🔮 Évolutions Futures

### V2 Features
- 📋 Dupliquer chapitre/leçon
- 📁 Copier/coller entre cours
- 🔍 Recherche/filtre dans la structure
- 📊 Vue arborescente compacte
- 🎨 Templates de structure (ex: "Cours type bac")
- 🔄 Undo/Redo
- 💾 Versions/snapshots du cours
- 👥 Collaboration temps réel (plusieurs profs)

---

## ✅ Checklist de Complétion

Avant de considérer la feature comme terminée:

- [ ] Drag & drop chapitres fonctionne
- [ ] Drag & drop leçons fonctionne
- [ ] Déplacement entre chapitres fonctionne
- [ ] API endpoints créés et sécurisés
- [ ] Sauvegarde batch implémentée
- [ ] Animations fluides
- [ ] Responsive mobile
- [ ] Keyboard accessible
- [ ] Tests manuels OK
- [ ] Documentation utilisateur créée

---

**Date de création:** 2026-01-18
**Architecte:** Claude Code
**Status:** 📐 DESIGN PHASE
